import { messageId, RAW_TOPICS, NORMALIZED_TOPICS } from "@aleo-foundry/shared";
import type { TopicEntity, TopicVariant, Network } from "@aleo-foundry/shared";
import type { ProducerLike } from "./kafka.js";
import type { DlqProducer } from "./dlq.js";
import { DLQ_REASONS } from "./dlq.js";
import { METRIC_NAMES, type PipelineMetrics } from "./metrics.js";
import { createEnvelope, encodeEnvelope } from "./envelope.js";
import { errorMessage } from "./retry.js";

export interface PublishEventInput {
  entity: TopicEntity;
  variant: TopicVariant;
  naturalKey: string;
  payload: unknown;
}

export class EventPublisher {
  constructor(
    private readonly producer: ProducerLike,
    private readonly options: {
      network: Network;
      metrics?: PipelineMetrics;
      dlq?: DlqProducer;
    },
  ) {}

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish(input: PublishEventInput): Promise<string> {
    const id = messageId(this.options.network, input.entity, input.naturalKey);
    const topic =
      input.variant === "raw"
        ? RAW_TOPICS[input.entity]
        : NORMALIZED_TOPICS[input.entity];

    const envelope = createEnvelope(
      input.entity,
      input.variant,
      this.options.network,
      id,
      input.payload,
    );

    try {
      await this.producer.send(topic, [{ key: id, value: encodeEnvelope(envelope) }]);
    } catch (error) {
      this.options.metrics?.increment(METRIC_NAMES.publishFailures);
      if (this.options.dlq) {
        await this.options.dlq.send({
          original_topic: topic,
          message_id: id,
          reason: DLQ_REASONS.publishFailed,
          error: errorMessage(error),
          original_value: encodeEnvelope(envelope),
        });
      } else {
        throw error;
      }
    }

    return id;
  }
}