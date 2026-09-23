import { z } from "zod";
import { DLQ_TOPIC } from "@aleo-foundry/shared";
import type { ProducerLike } from "./kafka.js";
import { METRIC_NAMES, type PipelineMetrics } from "./metrics.js";

export const DLQ_REASONS = {
  schemaValidationFailed: "schema_validation_failed",
  publishFailed: "publish_failed",
  writeFailed: "write_failed",
} as const;
export type DlqReason = (typeof DLQ_REASONS)[keyof typeof DLQ_REASONS];

export const DlqEntrySchema = z.object({
  original_topic: z.string().min(1),
  message_id: z.string().optional(),
  reason: z.string().min(1),
  error: z.string().optional(),
  original_value: z.string().optional(),
  timestamp: z.string().datetime(),
});
export type DlqEntry = z.infer<typeof DlqEntrySchema>;

export type DlqEntryInput = Omit<DlqEntry, "timestamp">;

export class DlqProducer {
  constructor(
    private readonly producer: ProducerLike,
    private readonly metrics?: PipelineMetrics,
  ) {}

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async send(entry: DlqEntryInput): Promise<void> {
    const full: DlqEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    DlqEntrySchema.parse(full);

    await this.producer.send(DLQ_TOPIC, [
      {
        key: entry.message_id ?? entry.original_topic,
        value: JSON.stringify(full),
      },
    ]);
    this.metrics?.increment(METRIC_NAMES.dlqSent);
  }
}