# ADR-0007: Redpanda streaming pipeline (publisher, consumer, DLQ)

- **Status:** Accepted (Sprint 10); supersedes ADR-0006
- **Date:** 2026-09-23

## Context
ADR-0006 deferred streaming and shipped an in-process write path. Sprint 10 lands
the constitution's streaming stack: `ProvableApiSource` → `Poller` → publisher →
topics → consumer → Postgres, replacing the repositories block in
`packages/ingestor/src/main.ts`.

Postgres enforces FK ordering (`transactions.block_height → blocks`,
`transitions/fees/mapping_changes.tx_id → transactions`). Per-entity topics
consume at independent partitions, so a dependent record can arrive before its
anchor.

## Decision
- `@aleo-foundry/streaming` owns Kafka concerns: envelope (schema-versioned JSON),
  `EventPublisher` (raw + normalized topics), `IngestionConsumer`, `DlqProducer`.
- The ingestor normalizes and **publishes** both raw and normalized events under
  topic names from `packages/shared/src/topics.ts`. Deterministic `messageId`
  (network:entity:naturalKey) is the Kafka partition key. Deploys publish
  `programs` + `deployments` rows (idempotent upserts make the duplicate write
  safe); every entity type in the topic matrix is published.
- A new entry point (`consumer-main.ts`) consumes the eight normalized topics and
  writes via the existing ON CONFLICT repositories (ADR-0004) — re-consume safe.
  Manual offset commits after each handled message give at-least-once delivery.
- Ordering: bounded exponential-backoff retry on FK violation (23503), then DLQ.
  `chain-metadata` is only upserted forward (never regresses `latest_height`).
- DLQ: `aleo.ingestion.dlq.v1` entries (original topic, messageId, reason, error)
  are non-blocking — invalid or unrecoverable events never halt the pipeline.
- Metrics are in-process counters (names follow `specs/010-data-quality.md`);
  OpenTelemetry export is deferred to Sprint 12.

## Consequences
- The write path and ingest path are decoupled and can scale independently.
- Cross-topic ordering is handled via FK-retry rather than global ordering, which
  keeps per-entity topics intact (needed for external subscribers).
- Broker (Redpanda) is now required for ingestion; `docker-compose.yml` runs it,
  defaults are wired via `.env.example`.

## Alternatives considered
- Composite single-topic event per block (rejected: breaks the per-entity topic
  convention).
- Cross-topic strict ordering (rejected: requires buffering with unbounded state).