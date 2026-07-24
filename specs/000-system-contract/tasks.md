# System Contract — Tasks

## Task 1: Tier 1 Source Schemas

**File:** `packages/shared/src/schemas/source.ts`
**Depends on:** None

Define Zod schemas mirroring Provable API response shapes:
- `ProvableBlockResponseSchema`
- `ProvableTransactionResponseSchema`
- `ProvableBlockTransactionsResponseSchema`

## Task 2: Tier 2 Canonical Schemas

**File:** `packages/shared/src/schemas/canonical.ts`
**Depends on:** Task 1

Define Zod schemas for internal canonical events:
- `CanonicalBlockSchema`
- `CanonicalTransactionSchema`
- `CanonicalTransitionSchema`
- `CanonicalDeploymentSchema`
- `CanonicalFeeSchema`
- `CanonicalMappingChangeSchema`
- `CanonicalChainMetadataSchema`

## Task 3: Tier 3 Serving Schemas

**File:** `packages/shared/src/schemas/serving.ts`
**Depends on:** Task 2

Define Zod schemas for Postgres-optimized models:
- `BlockRowSchema`
- `TransactionRowSchema`
- `TransitionRowSchema`
- `ProgramRowSchema`
- `MappingChangeRowSchema`

## Task 4: Config Types

**File:** `packages/shared/src/config.ts`
**Depends on:** None

Define:
- `NetworkConfig` — network name, API base URL, rate limit
- `IngestorConfig` — source selection, polling interval, checkpoint location

## Task 5: ChainSource Interface

**File:** `packages/shared/src/chain-source.ts`
**Depends on:** Task 1

Define `ChainSource` interface with methods matching Provable API endpoints.

## Task 6: Topic Naming

**File:** `packages/shared/src/topics.ts`
**Depends on:** None

Implement topic name generation: `aleo.{entity}.raw.v1`, `aleo.{entity}.normalized.v1`

## Task 7: Checkpoint Schema

**File:** `packages/shared/src/checkpoint.ts`
**Depends on:** None

Define `CheckpointSchema` — source, network, lastHeight, lastHash, updatedAt.

## Task 8: MessageId Utility

**File:** `packages/shared/src/message-id.ts`
**Depends on:** None

Implement deterministic messageId: SHA-256 of (network + entityType + naturalKey).

## Task 9: Barrel Export

**File:** `packages/shared/src/index.ts`
**Depends on:** Tasks 1-8

Re-export all public types and schemas.

## Task 10: Schema Tests

**File:** `packages/shared/src/schemas/source.test.ts`, `canonical.test.ts`, `serving.test.ts`
**Depends on:** Tasks 1-3

Test each schema with fixture data. Validate round-trip (parse → output matches input).

## Task 11: MessageId Tests

**File:** `packages/shared/src/message-id.test.ts`
**Depends on:** Task 8

Test deterministic output, different inputs produce different IDs, same input produces same ID.

## Task 12: Topic Tests

**File:** `packages/shared/src/topics.test.ts`
**Depends on:** Task 6

Test topic naming convention.

## Task 13: Full Test Suite

**Command:** `pnpm test`
**Depends on:** Tasks 10-12

Run all tests. Debug failures. Repeat until green.
