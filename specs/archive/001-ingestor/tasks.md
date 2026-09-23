# Ingestor — Tasks

## Task 1: Error Types

**File:** `packages/ingestor/src/errors.ts`
**Depends on:** None

Define custom error types:
- `RateLimitError` — thrown when rate limit is exhausted
- `ApiError` — thrown on non-retryable API errors

## Task 2: Rate Limiter

**File:** `packages/ingestor/src/rate-limiter.ts`
**Depends on:** Task 1

Implement token bucket rate limiter:
- Configurable requests per second and per day
- `acquire()` method that blocks until slot available
- Throws `RateLimitError` when daily quota exhausted

## Task 3: Checkpoint Store

**File:** `packages/ingestor/src/checkpoint-store.ts`
**Depends on:** None

Implement file-based checkpoint persistence:
- `load()` — read checkpoint from file, return null if not exists
- `save(checkpoint)` — write checkpoint to file atomically
- Uses `CheckpointSchema` from `@aleo-foundry/shared`

## Task 4: ProvableApiSource

**File:** `packages/ingestor/src/provable-api-source.ts`
**Depends on:** Tasks 1-3

Implement `ChainSource` interface:
- Inject RateLimiter and config
- Make HTTP calls via native fetch
- Apply rate limiting before each request
- Handle errors with retry logic

## Task 5: Rate Limiter Tests

**File:** `packages/ingestor/src/rate-limiter.test.ts`
**Depends on:** Task 2

Test:
- Acquires slot within rate limit
- Blocks when rate exceeded
- Throws RateLimitError on daily quota

## Task 6: Checkpoint Store Tests

**File:** `packages/ingestor/src/checkpoint-store.test.ts`
**Depends on:** Task 3

Test:
- Saves and loads checkpoint
- Returns null for missing file
- Handles corrupted file gracefully

## Task 7: ProvableApiSource Tests

**File:** `packages/ingestor/src/provable-api-source.test.ts`
**Depends on:** Task 4

Test with mocked fetch:
- getLatestHeight returns number
- getBlock returns ProvableBlockResponse
- getBlockTransactions returns array
- getTransaction returns ProvableTransactionResponse
- Throws on API error
- Retries on 5xx
- Throws RateLimitError on 429

## Task 8: Full Test Suite

**Command:** `pnpm test`
**Depends on:** Tasks 5-7

Run all tests. Debug failures. Repeat until green.
