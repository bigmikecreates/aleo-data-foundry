export {
  EventEnvelopeSchema,
  EnvelopeParseError,
  createEnvelope,
  encodeEnvelope,
  parseEnvelope,
  parseNormalizedPayload,
} from "./envelope.js";
export type { EventEnvelope, NormalizedEntityPayload } from "./envelope.js";

export {
  METRIC_NAMES,
  PipelineMetrics,
} from "./metrics.js";

export {
  errorMessage,
  isForeignKeyViolation,
  withBoundedRetry,
} from "./retry.js";

export {
  createKafkaClient,
  createKafkaProducer,
  createKafkaConsumer,
} from "./kafka.js";
export type {
  KafkaClientOptions,
  ProducerLike,
  ProducerMessage,
  ConsumerLike,
  ConsumedMessage,
  ConsumerMessageHandler,
} from "./kafka.js";

export {
  EventPublisher,
} from "./publisher.js";
export type { PublishEventInput } from "./publisher.js";

export {
  DlqProducer,
  DLQ_REASONS,
  DlqEntrySchema,
} from "./dlq.js";
export type { DlqEntry, DlqEntryInput, DlqReason } from "./dlq.js";

export {
  IngestionConsumer,
  DEFAULT_WRITE_RETRY,
} from "./consumer.js";
export type {
  EntityWriter,
  IngestionConsumerOptions,
  MessageOutcome,
} from "./consumer.js";