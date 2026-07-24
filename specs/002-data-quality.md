# Data Quality — Specification

## Overview

Define the validation, monitoring, and quality checks that ensure data integrity throughout the pipeline.

## Quality Dimensions

### 1. Completeness

**Goal:** Every block on-chain is ingested and normalized.

Checks:
- Block height sequence has no gaps (height N followed by N+1)
- Every transaction in a block is ingested
- Every transition in a transaction is ingested
- Checkpoint height matches chain head minus a known lag

Implementation:
- Ingestor tracks `lastIngestedHeight` in checkpoint
- After each batch, verify sequence continuity
- Alert if gap detected (missing blocks)

### 2. Consistency

**Goal:** Related data across entities is referentially consistent.

Checks:
- Every `TransactionRow.block_height` has a corresponding `BlockRow`
- Every `TransitionRow.tx_id` has a corresponding `TransactionRow`
- Block hash in transaction response matches stored block hash
- State roots are consistent across block and transaction responses

Implementation:
- Foreign key constraints in Postgres (enforced at DB level)
- Post-normalization validation: verify block hash matches
- Periodic consistency scan: orphaned transactions, missing transitions

### 3. Freshness

**Goal:** Data is available within acceptable latency of chain head.

Checks:
- Ingestion lag = chain_head_height - last_ingested_height
- Normalization lag = last_ingested_height - last_normalized_height
- API lag = last_normalized_height - last_served_height

Thresholds:
- Ingestion lag < 10 blocks (< 10 seconds at ~1 block/sec)
- Normalization lag < 5 blocks
- API serving lag < 1 block

Implementation:
- Metrics exported via OpenTelemetry
- Alert if lag exceeds threshold for > 5 minutes

### 4. Accuracy

**Goal:** Normalized data faithfully represents source data.

Checks:
- Schema validation at every boundary (Zod parse)
- Round-trip test: source → canonical → serving matches source
- No data loss in normalization (field count, value preservation)

Implementation:
- Zod schemas as validation gates
- Sampling-based accuracy checks: pick random blocks, verify normalization
- Automated regression tests with fixture data

### 5. Uniqueness

**Goal:** No duplicate records.

Checks:
- Primary keys are unique (block height, tx_id, transition_id)
- Idempotent writes (upsert, not insert)
- messageId prevents duplicate processing

Implementation:
- PostgreSQL `ON CONFLICT` upsert for all writes
- messageId check before processing each event
- Duplicate detection metric: count of skipped (already-processed) events

## Validation Layers

### Layer 1: Schema Validation (Runtime)
- Every inbound message parsed through Zod schema
- Invalid messages rejected with structured error log
- Invalid messages sent to DLQ for investigation

### Layer 2: Referential Integrity (Database)
- Foreign key constraints enforce entity relationships
- NOT NULL constraints on required fields
- CHECK constraints on enums and value ranges

### Layer 3: Pipeline Validation (Post-Batch)
- Sequence continuity check after each ingestion batch
- Consistency check: transaction count matches block metadata
- Freshness check: lag metrics within thresholds

### Layer 4: Periodic Audit (Scheduled)
- Daily: compare ingested block count against chain head
- Weekly: sample 100 random blocks, verify full data chain
- Monthly: orphaned record cleanup, index optimization

## Alerting Rules

| Condition | Severity | Action |
|---|---|---|
| Ingestion lag > 10 blocks for 5 min | Warning | Page on-call |
| Ingestion lag > 50 blocks for 5 min | Critical | Page on-call |
| Schema validation failure rate > 1% | Warning | Investigate DLQ |
| Schema validation failure rate > 5% | Critical | Halt ingestion, investigate |
| Foreign key violation | Critical | Halt pipeline, investigate |
| Block height gap detected | Warning | Backfill missing blocks |
| API response latency p99 > 500ms | Warning | Investigate query performance |

## Data Quality Metrics (OpenTelemetry)

- `aleo.ingestion.blocks.ingested` — counter of ingested blocks
- `aleo.ingestion.blocks.gap_detected` — counter of detected gaps
- `aleo.normalization.events.processed` — counter of normalized events
- `aleo.normalization.events.skipped` — counter of idempotent skips
- `aleo.normalization.events.failed` — counter of failed normalizations
- `aleo.validation.schema.failures` — counter of schema validation failures
- `aleo.ingestion.lag.blocks` — gauge of ingestion lag in blocks
- `aleo.normalization.lag.blocks` — gauge of normalization lag in blocks
