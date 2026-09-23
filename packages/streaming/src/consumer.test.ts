import { describe, it, expect, beforeEach, vi } from "vitest";
import { IngestionConsumer } from "./consumer.js";
import type { EntityWriter } from "./consumer.js";
import { DlqProducer } from "./dlq.js";
import { DLQ_REASONS } from "./dlq.js";
import { PipelineMetrics, METRIC_NAMES } from "./metrics.js";
import { createEnvelope, encodeEnvelope } from "./envelope.js";
import { NORMALIZED_TOPICS } from "@aleo-foundry/shared";
import type {
  ConsumerLike,
  ConsumedMessage,
  ProducerLike,
  ProducerMessage,
} from "./kafka.js";

class FakeProducer implements ProducerLike {
  sent: { topic: string; messages: ProducerMessage[] }[] = [];

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async send(topic: string, messages: ProducerMessage[]): Promise<void> {
    this.sent.push({ topic, messages });
  }
}

class FakeConsumer implements ConsumerLike {
  connected = false;
  subscribed: string[] = [];
  commits: { topic: string; partition: number; offset: string }[] = [];

  async connect(): Promise<void> {
    this.connected = true;
  }
  async disconnect(): Promise<void> {
    this.connected = false;
  }
  async subscribe(topics: string[]): Promise<void> {
    this.subscribed = topics;
  }
  async run(_handler: (msg: ConsumedMessage) => Promise<void>): Promise<void> {}
  async commitOffsets(
    topic: string,
    partition: number,
    offset: string,
  ): Promise<void> {
    this.commits.push({ topic, partition, offset });
  }
}

const VALID_BLOCK = {
  height: 1,
  block_hash: "b1",
  previous_hash: "b0",
  network: "testnet",
  timestamp: "2024-06-03T12:00:00.000Z",
  coinbase_target: "1",
  proof_target: "1",
  last_coinbase_target: "1",
  last_coinbase_ratio: "1",
  round: "1",
  transactions_root: "t",
  previous_state_root: "p",
  transactions_count: 0,
  aborted_transactions_count: 0,
  created_at: "2024-06-03T12:00:00.000Z",
};

function blocksEnvelope(payload: unknown): string {
  return encodeEnvelope(
    createEnvelope("blocks", "normalized", "testnet", "msg1", payload),
  );
}

function buildConsumer(
  writer: EntityWriter,
): {
  consumer: FakeConsumer;
  producer: FakeProducer;
  dlq: DlqProducer;
  metrics: PipelineMetrics;
  ingestion: IngestionConsumer;
} {
  const consumer = new FakeConsumer();
  const producer = new FakeProducer();
  const metrics = new PipelineMetrics();
  const dlq = new DlqProducer(producer, metrics);
  const ingestion = new IngestionConsumer(consumer, writer, { dlq, metrics });
  return { consumer, producer, dlq, metrics, ingestion };
}

function message(
  topic: string,
  offset: string,
  value: string | null,
): ConsumedMessage {
  return { topic, partition: 0, offset, value };
}

describe("IngestionConsumer", () => {
  it("start() connects, subscribes to every normalized topic, and runs", async () => {
    const { consumer, ingestion } = buildConsumer({ write: vi.fn() });

    await ingestion.start();

    expect(consumer.connected).toBe(true);
    expect(consumer.subscribed).toHaveLength(
      Object.keys(NORMALIZED_TOPICS).length,
    );
    expect(consumer.subscribed).toContain(NORMALIZED_TOPICS.blocks);
    expect(consumer.subscribed).toContain(NORMALIZED_TOPICS["chain-metadata"]);
  });

  it("writes a valid message and commits its offset", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const { consumer, metrics, ingestion } = buildConsumer({ write });
    const value = blocksEnvelope(VALID_BLOCK);

    const outcome = await ingestion.processMessage(
      message(NORMALIZED_TOPICS.blocks, "7", value),
    );

    expect(outcome).toBe("written");
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith("blocks", VALID_BLOCK);
    expect(consumer.commits).toEqual([
      { topic: NORMALIZED_TOPICS.blocks, partition: 0, offset: "7" },
    ]);
    expect(metrics.count(METRIC_NAMES.eventsProcessed)).toBe(1);
  });

  it("sends invalid JSON to the DLQ and commits", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const { producer, consumer, metrics, ingestion } = buildConsumer({ write });

    const outcome = await ingestion.processMessage(
      message(NORMALIZED_TOPICS.blocks, "3", "not-json"),
    );

    expect(outcome).toBe("dlq_envelope_invalid");
    expect(write).not.toHaveBeenCalled();
    expect(producer.sent).toHaveLength(1);
    expect(producer.sent[0].topic).toBe("aleo.ingestion.dlq.v1");
    const entry = JSON.parse(producer.sent[0].messages[0].value) as {
      reason: string;
      error: string;
    };
    expect(entry.reason).toBe(DLQ_REASONS.schemaValidationFailed);
    expect(entry.error).toContain("Envelope parse failed");
    expect(consumer.commits).toHaveLength(1);
    expect(metrics.count(METRIC_NAMES.schemaFailures)).toBe(1);
  });

  it("sends a schema-invalid payload to the DLQ and commits", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const { producer, consumer, metrics, ingestion } = buildConsumer({ write });

    const outcome = await ingestion.processMessage(
      message(
        NORMALIZED_TOPICS.blocks,
        "4",
        blocksEnvelope({ height: "nope" }),
      ),
    );

    expect(outcome).toBe("dlq_payload_invalid");
    expect(write).not.toHaveBeenCalled();
    const entry = JSON.parse(producer.sent[0].messages[0].value) as {
      reason: string;
    };
    expect(entry.reason).toBe(DLQ_REASONS.schemaValidationFailed);
    expect(consumer.commits).toHaveLength(1);
    expect(metrics.count(METRIC_NAMES.schemaFailures)).toBe(1);
  });

  it("retries on foreign-key violations, then succeeds", async () => {
    let calls = 0;
    const write = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 3) {
        throw Object.assign(new Error("fk miss"), { code: "23503" });
      }
    });
    const { consumer, ingestion } = buildConsumerWithRetry(write);
    const value = blocksEnvelope(VALID_BLOCK);

    const outcome = await ingestion.processMessage(
      message(NORMALIZED_TOPICS.blocks, "5", value),
    );

    expect(outcome).toBe("written");
    expect(calls).toBe(3);
    expect(consumer.commits).toHaveLength(1);
  });

  it("dead-letters after exhausted foreign-key retries", async () => {
    const write = vi.fn().mockImplementation(() => {
      throw Object.assign(new Error("fk miss always"), { code: "23503" });
    });
    const { producer, consumer, metrics, ingestion } = buildConsumerWithRetry(write);
    const value = blocksEnvelope(VALID_BLOCK);

    const outcome = await ingestion.processMessage(
      message(NORMALIZED_TOPICS.blocks, "6", value),
    );

    expect(outcome).toBe("dlq_write_failed");
    expect(write).toHaveBeenCalledTimes(4);
    expect(producer.sent).toHaveLength(1);
    const entry = JSON.parse(producer.sent[0].messages[0].value) as {
      reason: string;
      error: string;
    };
    expect(entry.reason).toBe(DLQ_REASONS.writeFailed);
    expect(entry.error).toContain("(FK=true)");
    expect(consumer.commits).toHaveLength(1);
    expect(metrics.count(METRIC_NAMES.eventsProcessed)).toBe(0);
  });

  it("dead-letters immediately on non-FK write errors", async () => {
    const write = vi.fn().mockRejectedValue(new Error("db down"));
    const { producer, consumer, ingestion } = buildConsumer({ write });

    const outcome = await ingestion.processMessage(
      message(NORMALIZED_TOPICS.blocks, "8", blocksEnvelope(VALID_BLOCK)),
    );

    expect(outcome).toBe("dlq_write_failed");
    expect(write).toHaveBeenCalledTimes(1);
    expect(producer.sent).toHaveLength(1);
    expect(consumer.commits).toHaveLength(1);
  });
});

function buildConsumerWithRetry(write: EntityWriter["write"]): {
  consumer: FakeConsumer;
  producer: FakeProducer;
  dlq: DlqProducer;
  metrics: PipelineMetrics;
  ingestion: IngestionConsumer;
} {
  const consumer = new FakeConsumer();
  const producer = new FakeProducer();
  const metrics = new PipelineMetrics();
  const dlq = new DlqProducer(producer, metrics);
  const ingestion = new IngestionConsumer(consumer, { write }, {
    dlq,
    metrics,
    writeRetry: { maxRetries: 3, baseDelayMs: 1 },
  });
  return { consumer, producer, dlq, metrics, ingestion };
}