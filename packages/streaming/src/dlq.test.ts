import { describe, it, expect, beforeEach } from "vitest";
import { DlqProducer, DLQ_REASONS, DlqEntrySchema } from "./dlq.js";
import { PipelineMetrics, METRIC_NAMES } from "./metrics.js";
import type { ProducerLike, ProducerMessage } from "./kafka.js";

class FakeProducer implements ProducerLike {
  sent: { topic: string; messages: ProducerMessage[] }[] = [];

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async send(topic: string, messages: ProducerMessage[]): Promise<void> {
    this.sent.push({ topic, messages });
  }
}

describe("DlqProducer", () => {
  let producer: FakeProducer;
  let dlq: DlqProducer;

  beforeEach(() => {
    producer = new FakeProducer();
    dlq = new DlqProducer(producer);
  });

  it("publishes structured entries to the DLQ topic", async () => {
    await dlq.send({
      original_topic: "aleo.blocks.normalized.v1",
      message_id: "abc123",
      reason: DLQ_REASONS.schemaValidationFailed,
      error: "parse failed",
    });

    expect(producer.sent).toHaveLength(1);
    expect(producer.sent[0].topic).toBe("aleo.ingestion.dlq.v1");
    expect(producer.sent[0].messages[0].key).toBe("abc123");

    const parsed = JSON.parse(producer.sent[0].messages[0].value);
    expect(DlqEntrySchema.safeParse(parsed).success).toBe(true);
    expect(parsed.reason).toBe(DLQ_REASONS.schemaValidationFailed);
    expect(parsed.original_topic).toBe("aleo.blocks.normalized.v1");
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("uses the original topic as key when no message id is present", async () => {
    await dlq.send({
      original_topic: "aleo.ingestion.weird.v1",
      reason: DLQ_REASONS.schemaValidationFailed,
    });

    expect(producer.sent[0].messages[0].key).toBe("aleo.ingestion.weird.v1");
  });

  it("rejects entries missing required fields", async () => {
    await expect(
      dlq.send({ reason: DLQ_REASONS.writeFailed } as never),
    ).rejects.toThrow();
  });

  it("increments the DLQ metric when supplied", async () => {
    const metrics = new PipelineMetrics();
    const withMetrics = new DlqProducer(producer, metrics);

    await withMetrics.send({
      original_topic: "aleo.blocks.normalized.v1",
      reason: DLQ_REASONS.writeFailed,
    });

    expect(metrics.count(METRIC_NAMES.dlqSent)).toBe(1);
  });
});