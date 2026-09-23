export const METRIC_NAMES = {
  publishFailures: "aleo.ingestion.publish.failures",
  schemaFailures: "aleo.validation.schema.failures",
  dlqSent: "aleo.ingestion.dlq.sent",
  eventsProcessed: "aleo.normalization.events.processed",
  eventsSkipped: "aleo.normalization.events.skipped",
} as const;

export class PipelineMetrics {
  private readonly counters = new Map<string, number>();

  increment(name: string, by = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + by);
  }

  count(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }
}