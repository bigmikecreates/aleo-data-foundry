# ADR-0004: Upsert-based idempotent persistence

- **Status:** Accepted (Sprints 5-7)
- **Date:** 2026-09-23

## Context
Ingestion is at-least-once; a block may be reprocessed (retries, restarts, streaming
re-delivery). Duplicate writes would corrupt counts and break foreign keys.

## Decision
Every repository writes with `INSERT ... ON CONFLICT ... DO UPDATE` (upsert),
keyed on natural primary keys:
- `blocks(height)`, `transactions(tx_id)`, `transitions(transition_id)`
- `programs(program_id)`, `mapping_changes(tx_id, transition_id, index_in_transition)`
- `fees(tx_id)` — requires the `UNIQUE` constraint added inline in migration `001`
  (ADR-0005 keeps migrations in sync).

## Consequences
- Re-processing a block is a no-op update, preserving an invariant "latest write wins".
- Idempotency is enforced at the DB rather than in application code.
- Every upsert target needs a unique constraint — a migration constraint applied
  at review time, as the fee `UNIQUE` case shows.

## Alternatives considered
Pre-check SELECT then INSERT (rejected: TOCTOU), app-level de-dup map (rejected: loses on restart).