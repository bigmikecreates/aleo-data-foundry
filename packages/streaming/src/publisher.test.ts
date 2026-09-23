import { describe, it, expect, beforeEach } from "vitest";
import { EventPublisher } from "./publisher.js";
import { DlqProducer } from "./dlq.js";
import { DLQ_REASONS } from "./dlq.js";
import { PipelineMetrics, METRIC_NAMES } from "./metrics.js";
import type { ProducerLike, ProducerMessage } from "./kafka.js";

class FakeProducer implements ProducerLike {
  sent: { topic: string; messages: ProducerMessage[] }[] = [];
  shouldFail = false;

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async send(topic: string, messages: ProducerMessage[]): Promise<void> {
    if (this.shouldFail) throw new Error("broker unavailable");
    this.sent.push({ topic, messages });
  }
}

describe("EventPublisher", () => {
  let producer: FakeProducer;
  let publisher: EventPublisher;

  beforeEach(() => {
    producer = new FakeProducer();
    publisher = new EventPublisher(producer, { network: "testnet" });
  });

  it("publishes raw events to the matching raw topic", async () => {
    const id = await publisher.publish({
      entity: "blocks",
      variant: "raw",
      naturalKey: "1:b1",
      payload: { block_hash: "b1" },
    });

    expect(producer.sent).toHaveLength(1);
    expect(producer.sent[0].topic).toBe("aleo.blocks.raw.v1");
    expect(producer.sent[0].messages[0].key).toBe(id);
  });

  it("publishes normalized events to the matching normalized topic", async () => {
    await publisher.publish({
      entity: "transactions",
      variant: "normalized",
      naturalKey: "at1tx",
      payload: { tx_id: "at1tx" },
    });

    expect(producer.sent[0].topic).toBe("aleo.transactions.normalized.v1");
  });

  it("uses the deterministic messageId as the partition key", async () => {
    const idA = await publisher.publish({
      entity: "blocks",
      variant: "raw",
      naturalKey: "1:b1",
      payload: {},
    });
    const idB = await publisher.publish({
      entity: "blocks",
      variant: "raw",
      naturalKey: "1:b1",
      payload: {},
    });

    expect(idA).toBe(idB);
    expect(producer.sent[0].messages[0].key).toBe(idA);
    expect(producer.sent[1].messages[0].key).toBe(idA);
  });

  it("encodes a schema-versioned envelope with the payload", async () => {
    await publisher.publish({
      entity: "blocks",
      variant: "raw",
      naturalKey: "1:b1",
      payload: { block_hash: "b1" },
    });

    const parsed = JSON.parse(producer.sent[0].messages[0].value) as Record<string, unknown>;
    expect(parsed.schema_version).toBe(1);
    expect(parsed.entity).toBe("blocks");
    expect(parsed.variant).toBe("raw");
    expect(parsed.network).toBe("testnet");
    expect(parsed.payload).toEqual({ block_hash: "b1" });
  });

  it("routes failed publishes to the DLQ and records a publish failure", async () => {
    const dlqProducer = new FakeProducer();
    const dlq = new DlqProducer(dlqProducer);
    const metrics = new PipelineMetrics();
    publisher = new EventPublisher(producer, {
      network: "testnet",
      metrics,
      dlq,
    });
    producer.shouldFail = true;

    await expect(
      publisher.publish({
        entity: "blocks",
        variant: "raw",
        naturalKey: "1:b1",
        payload: {},
      }),
    ).resolves.toBeTruthy();

    expect(metrics.count(METRIC_NAMES.publishFailures)).toBe(1);
    expect(dlqProducer.sent).toHaveLength(1);
    expect(dlqProducer.sent[0].topic).toBe("aleo.ingestion.dlq.v1");
    const entry = JSON.parse(dlqProducer.sent[0].messages[0].value) as {
      reason: string;
      original_topic: string;
      error: string;
    };
    expect(entry.reason).toBe(DLQ_REASONS.publishFailed);
    expect(entry.original_topic).toBe("aleo.blocks.raw.v1");
    expect(entry.error).toContain("broker unavailable");
  });

  it("rethrows publish failures when no DLQ is configured", async () => {
    producer.shouldFail = true;

    await expect(
      publisher.publish({
        entity: "blocks",
        variant: "raw",
        naturalKey: "1:b1",
        payload: {},
      }),
    ).rejects.toThrow("broker unavailable");
  });
});