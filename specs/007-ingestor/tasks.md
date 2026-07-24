# Ingestor Implementation — Tasks

## Task 1: ProvableApiSource

**File:** `packages/ingestor/src/provable-api-source.ts`
**Depends on:** None
**Implement:** `ChainSource` interface with HTTP calls

## Task 2: Rate Limiter

**File:** `packages/ingestor/src/rate-limiter.ts`
**Depends on:** None
**Implement:** Token bucket with 5 req/s, 100k/day limits

## Task 3: Checkpoint Store

**File:** `packages/ingestor/src/checkpoint-store.ts`
**Depends on:** None
**Implement:** File-based JSON persistence

## Task 4: Polling Loop

**File:** `packages/ingestor/src/poller.ts`
**Depends on:** Tasks 1-3
**Implement:** Main ingestion loop with retry logic

## Task 5: Unit Tests

**File:** `packages/ingestor/src/ingestor.test.ts`
**Depends on:** Tasks 1-4
**Test each component with mocked HTTP**

## Task 6: Full Test Suite

**Command:** `pnpm test`
**Depends on:** Task 5
