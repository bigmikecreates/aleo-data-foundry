# ADR-0002: Deterministic messageId for idempotent delivery

- **Status:** Accepted (Sprints 1-7)
- **Date:** 2026-09-23

## Context
Delivery across the pipeline is at-least-once; consumers must be idempotent. Without
a stable event identity, re-delivery would create duplicates, and non-deterministic
IDs (e.g. random UUIDs) would defeat de-duplication.

## Decision
`messageId = sha256(network:entityType:naturalKey)` truncated to 16 hex chars
(`packages/shared/src/message-id.ts`). The same event always derives the same ID,
regardless of how many times it passes through the pipeline. Used as partition key
for future streaming (ADR-0006).

## Consequences
- Idempotent consumers can detect and skip already-processed events.
- Natural keys must be stable (e.g. `tx_id`, `block_height`, `transition_id`).
- 64-bit strength is sufficient for de-duplication (no cryptographic need).

## Alternatives considered
Random UUIDs (rejected: not deterministic), full SHA-256 (rejected: wasteful).