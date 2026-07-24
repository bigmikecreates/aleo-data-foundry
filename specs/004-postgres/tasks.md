# Postgres Integration — Tasks

## Task 1: Create Package

**File:** `packages/db/package.json`, `packages/db/tsconfig.json`
**Depends on:** None

Create new package with pg dependency.

## Task 2: Initial Migration

**File:** `packages/db/migrations/001_initial_schema.sql`
**Depends on:** Task 1

Write CREATE TABLE statements for all 7 tables.

## Task 3: Database Client

**File:** `packages/db/src/client.ts`
**Depends on:** Task 1

Wrap pg.Pool with typed query methods.

## Task 4: Block Repository

**File:** `packages/db/src/repositories/block-repository.ts`
**Depends on:** Task 3

- `insert(block)` — upsert
- `findByHeight(height)` — query
- `findAll(limit, cursor)` — paginated query

## Task 5: Transaction Repository

**File:** `packages/db/src/repositories/transaction-repository.ts`
**Depends on:** Task 3

- `insert(tx)` — upsert
- `findByTxId(txId)` — query
- `findAll(limit, cursor)` — paginated query

## Task 6: Transition Repository

**File:** `packages/db/src/repositories/transition-repository.ts`
**Depends on:** Task 3

- `insert(transition)` — upsert
- `findByTransitionId(id)` — query

## Task 7: Program Repository

**File:** `packages/db/src/repositories/program-repository.ts`
**Depends on:** Task 3

- `insert(program)` — upsert
- `findByProgramId(id)` — query

## Task 8: Mapping Change Repository

**File:** `packages/db/src/repositories/mapping-change-repository.ts`
**Depends on:** Task 3

- `insert(change)` — insert
- `findAll(limit, cursor)` — paginated query

## Task 9: Fee Repository

**File:** `packages/db/src/repositories/fee-repository.ts`
**Depends on:** Task 3

- `insert(fee)` — insert
- `findByTxId(txId)` — query

## Task 10: Chain Metadata Repository

**File:** `packages/db/src/repositories/chain-metadata-repository.ts`
**Depends on:** Task 3

- `upsert(metadata)` — upsert
- `findByNetwork(network)` — query

## Task 11: Tests

**File:** `packages/db/src/*.test.ts`
**Depends on:** Tasks 4-10

Test each repository with mocked pg client.

## Task 12: Full Test Suite

**Command:** `pnpm test`
**Depends on:** Task 11
