# ADR-0006: In-process pipeline today, streaming (Redpanda) later

- **Status:** Accepted (Sprints 1-7); superseded by ADR when Sprint 10 lands
- **Date:** 2026-09-23

## Context
The constitution lists Redpanda (KafkaJS) in the Phase 0-1 stack, and
`packages/shared/src/topics.ts` defines the full topic convention
(`aleo.{entity}.{variant}.v1`, plus `aleo.ingestion.dlq.v1`). Yet nothing publishes:
the ingestor normalizes and writes directly to Postgres in-process.

## Decision
Ship the in-process pipeline first: `ProvableApiSource` → `Poller` →
`normalizer` → repositories, all inside `packages/ingestor/src/main.ts`
(ADR-0001 schemas and ADR-0004 upserts make it idempotent). Streaming
(Sprint 10: publisher → topics → consumer → Postgres, with DLQ) is a deliberate
later step, sequenced after observability (Sprint 12) so DLQ/failure rates are
visible.

## Consequences
- Minimal Phase 1 complexity; no broker dependency to operate.
- The write path lives today in one process — the scheduled Sprint 10 consumer
  replaces the block of `main.ts` that calls the repositories.
- Topic conventions already exist and are stable for when the publisher lands.

## Alternatives considered
Streaming in Phase 1 (rejected: more moving parts without observability to justify it).