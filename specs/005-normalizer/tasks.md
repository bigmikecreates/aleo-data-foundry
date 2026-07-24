# Normalizer Implementation — Tasks

## Task 1: Verify Shared Exports

**Depends on:** None
**Verify:** All Tier 1/2/3 schemas are exported from `@aleo-foundry/shared`

## Task 2: normalizeBlock

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 1
**Input:** `ProvableBlockResponse`
**Output:** `{ canonical: CanonicalBlock, serving: BlockRow }`

## Task 3: normalizeTransaction

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 1
**Input:** `ProvableTransactionResponse`
**Output:** `{ canonical: CanonicalTransaction, serving: TransactionRow }`

## Task 4: normalizeTransition

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 1
**Input:** `ProvableTransition`
**Output:** `{ canonical: CanonicalTransition, serving: TransitionRow }`

## Task 5: normalizeFee

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 1
**Input:** `ProvableFee`
**Output:** `{ canonical: CanonicalFee, serving: FeeRow }`

## Task 6: normalizeDeployment

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 1
**Input:** `ProvableDeployment | undefined`
**Output:** `{ canonical: CanonicalDeployment, serving: ProgramRow } | null`

## Task 7: normalizeMappingChange

**File:** `packages/normalizer/src/normalizer.ts`
**Depends on:** Task 1
**Input:** `ProvableFinalizeAction`
**Output:** `{ canonical: CanonicalMappingChange, serving: MappingChangeRow }`

## Task 8: Unit Tests

**File:** `packages/normalizer/src/normalizer.test.ts`
**Depends on:** Tasks 2-7
**Test each transform with:**
- Positive case: valid input
- Edge case: missing optional fields
- Edge case: undefined deployment

## Task 9: Full Test Suite

**Command:** `pnpm test`
**Depends on:** Task 8
