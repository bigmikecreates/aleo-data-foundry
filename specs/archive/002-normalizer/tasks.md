# Normalizer — Tasks

## Task 1: Error Types

**File:** `packages/normalizer/src/errors.ts`
**Depends on:** None

Define `NormalizationError` with context (entity type, raw data snippet).

## Task 2: Block Normalization

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 1

`normalizeBlock(network, height, block)` → `CanonicalBlock`

## Task 3: Transaction Normalization

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 2

`normalizeTransaction(network, height, blockHash, blockTx)` → `CanonicalTransaction`

## Task 4: Transition Normalization

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 3

`normalizeTransition(network, txId, transition)` → `CanonicalTransition`

## Task 5: Fee Normalization

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 3

`normalizeFee(network, txId, fee)` → `CanonicalFee`

## Task 6: Deployment Normalization

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 3

`normalizeDeployment(network, txId, timestamp, body)` → `CanonicalDeployment | null`

## Task 7: Mapping Change Normalization

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 4

`normalizeMappingChange(network, txId, transitionId, programId, action)` → `CanonicalMappingChange`

## Task 8: Tests

**File:** `packages/normalizer/src/normalizer.test.ts`
**Depends on:** Tasks 2-7

Test each normalization function with fixture data.

## Task 9: Full Test Suite

**Command:** `pnpm test`
**Depends on:** Task 8
