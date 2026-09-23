import { NORMALIZED_TOPICS } from "@aleo-foundry/shared";
import type { TopicEntity } from "@aleo-foundry/shared";
import type { ConsumerLike, ConsumedMessage } from "./kafka.js";
import type { DlqProducer } from "./dlq.js";
import { DLQ_REASONS } from "./dlq.js";
import { METRIC_NAMES, type PipelineMetrics } from "./metrics.js";
import { parseEnvelope, parseNormalizedPayload } from "./envelope.js";
import { errorMessage, isForeignKeyViolation, withBoundedRetry } from "./retry.js";

export interface EntityWriter {
  write(entity: TopicEntity, payload: unknown): Promise<void>;
}

export interface IngestionConsumerOptions {
  dlq: DlqProducer;
  metrics: PipelineMetrics;
  writeRetry?: {
    maxRetries: number;
    baseDelayMs: number;
  };
}

export const DEFAULT_WRITE_RETRY = { maxRetries: 3, baseDelayMs: 250 };

const NORMALIZED_TOPIC_SET = Object.values(NORMALIZED_TOPICS);

export type MessageOutcome =
  | "written"
  | "dlq_envelope_invalid"
  | "dlq_payload_invalid"
  | "dlq_write_failed";

export class IngestionConsumer {
  constructor(
    private readonly consumer: ConsumerLike,
    private readonly writer: EntityWriter,
    private readonly options: IngestionConsumerOptions,
  ) {}

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe(NORMALIZED_TOPIC_SET);
    await this.consumer.run(async (message) => {
      await this.processMessage(message);
    });
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }

  async processMessage(message: ConsumedMessage): Promise<MessageOutcome> {
    const { topic, partition, offset, value } = message;

    let envelope;
    try {
      envelope = parseEnvelope(value);
    } catch (error) {
      await this.options.dlq.send({
        original_topic: topic,
        reason: DLQ_REASONS.schemaValidationFailed,
        error: `Envelope parse failed (${errorMessage(error)})`,
        original_value:
          value === null
            ? undefined
            : typeof value === "string"
              ? value
              : value.toString("utf8"),
      });
      this.options.metrics.increment(METRIC_NAMES.schemaFailures);
      await this.commit(topic, partition, offset);
      return "dlq_envelope_invalid";
    }

    try {
      parseNormalizedPayload(envelope.entity, envelope.payload);
    } catch (error) {
      await this.options.dlq.send({
        original_topic: topic,
        message_id: envelope.message_id,
        reason: DLQ_REASONS.schemaValidationFailed,
        error: errorMessage(error),
      });
      this.options.metrics.increment(METRIC_NAMES.schemaFailures);
      await this.commit(topic, partition, offset);
      return "dlq_payload_invalid";
    }

    try {
      await withBoundedRetry(
        () => this.writer.write(envelope.entity, envelope.payload),
        this.options.writeRetry?.maxRetries ?? DEFAULT_WRITE_RETRY.maxRetries,
        this.options.writeRetry?.baseDelayMs ?? DEFAULT_WRITE_RETRY.baseDelayMs,
      );
      this.options.metrics.increment(METRIC_NAMES.eventsProcessed);
    } catch (error) {
      await this.options.dlq.send({
        original_topic: topic,
        message_id: envelope.message_id,
        reason: DLQ_REASONS.writeFailed,
        error: `Write failed (FK=${isForeignKeyViolation(error)}): ${errorMessage(error)}`,
      });
      await this.commit(topic, partition, offset);
      return "dlq_write_failed";
    }

    await this.commit(topic, partition, offset);
    return "written";
  }

  private async commit(
    topic: string,
    partition: number,
    offset: string,
  ): Promise<void> {
    await this.consumer.commitOffsets(topic, partition, offset);
  }
}