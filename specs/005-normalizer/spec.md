# Normalizer Implementation — Specification

## Overview

Implement the normalizer transformation logic to convert raw Provable API responses into canonical and serving models. This is the core transformation layer that makes blockchain data queryable.

## Context

The normalizer sits between the ingestor (raw data) and the database (serving models). It transforms data across three tiers:

1. **Tier 1 (Source):** Raw Provable API responses
2. **Tier 2 (Canonical):** Network-aware internal representations
3. **Tier 3 (Serving):** Postgres-optimized row models

## Transformation Functions

### normalizeBlock
- **Input:** `ProvableBlockResponse` (Tier 1)
- **Output:** `CanonicalBlock` (Tier 2) + `BlockRow` (Tier 3)
- **Key mappings:**
  - `block.header.metadata.height` → `height`
  - `block.header.metadata.block_hash` → `blockHash`
  - `block.header.metadata.timestamp` → `timestamp`
  - `block.transactions` → `transactions_count`

### normalizeTransaction
- **Input:** `ProvableTransactionResponse` (Tier 1)
- **Output:** `CanonicalTransaction` (Tier 2) + `TransactionRow` (Tier 3)
- **Key mappings:**
  - `type` → `type` (execute/deploy/fee)
  - `status` → `status` (accepted/rejected)
  - `transaction.id` → `txId`

### normalizeTransition
- **Input:** `ProvableTransition` (Tier 1)
- **Output:** `CanonicalTransition` (Tier 2) + `TransitionRow` (Tier 3)
- **Key mappings:**
  - `transition.id` → `transitionId`
  - `transition.program` → `programId`
  - `transition.function` → `functionName`
  - `transition.inputs` → `inputs` (stringified JSON)
  - `transition.outputs` → `outputs` (stringified JSON)

### normalizeFee
- **Input:** `ProvableFee` (Tier 1)
- **Output:** `CanonicalFee` (Tier 2) + `FeeRow` (Tier 3)
- **Key mappings:**
  - `fee.payer` → `payer`
  - `fee.amount` → `amount`
  - `fee.global_state_root` → `globalStateRoot`

### normalizeDeployment
- **Input:** `ProvableDeployment` (Tier 1)
- **Output:** `CanonicalDeployment` (Tier 2) + `ProgramRow` (Tier 3)
- **Key mappings:**
  - `deployment.program_id` → `programId`
  - `deployment.edition` → `edition`

### normalizeMappingChange
- **Input:** `ProvableFinalizeAction` (Tier 1)
- **Output:** `CanonicalMappingChange` (Tier 2) + `MappingChangeRow` (Tier 3)
- **Key mappings:**
  - `action.operation` → `action` (set/remove)
  - `action.mapping` → `mappingId`
  - `action.key` → `keyId`
  - `action.value` → `valueId`

## Validation Rules

- All transformations must preserve data integrity
- Missing optional fields use defaults (e.g., `edition: 0`)
- Unknown action types default to `"remove"`
- Deploy data that is `undefined` returns `null`

## Out of Scope

- Kafka/Redpanda integration (Phase 2)
- Idempotency checks (handled by ingestor)
- Batch transformations (single-item transforms only)
