# API — Tasks

## Task 1: Install Fastify

**File:** `packages/api/package.json`
**Depends on:** None

Add `fastify` dependency.

## Task 2: Error Types

**File:** `packages/api/src/errors.ts`
**Depends on:** None

Define `NotFoundError`, `ValidationError`.

## Task 3: Error Handler

**File:** `packages/api/src/middleware/error-handler.ts`
**Depends on:** Task 2

Format errors as `{ error: { code, message } }`.

## Task 4: ETag Middleware

**File:** `packages/api/src/middleware/etag.ts`
**Depends on:** None

Generate ETag from response body, handle `If-None-Match`.

## Task 5: Health Endpoint

**File:** `packages/api/src/routes/health.ts`
**Depends on:** None

`GET /health` → `{ status: "ok", timestamp }`.

## Task 6: Block Endpoints

**File:** `packages/api/src/routes/blocks.ts`
**Depends on:** Tasks 3-4

- `GET /blocks` — list with cursor pagination
- `GET /blocks/:height` — get by height

## Task 7: Transaction Endpoints

**File:** `packages/api/src/routes/transactions.ts`
**Depends on:** Tasks 3-4

- `GET /transactions/:txId` — get by ID

## Task 8: Transition Endpoints

**File:** `packages/api/src/routes/transitions.ts`
**Depends on:** Tasks 3-4

- `GET /transitions/:transitionId` — get by ID

## Task 9: Program Endpoints

**File:** `packages/api/src/routes/programs.ts`
**Depends on:** Tasks 3-4

- `GET /programs/:programId` — get by ID

## Task 10: Tests

**File:** `packages/api/src/*.test.ts`
**Depends on:** Tasks 5-9

Test each endpoint with mock data.

## Task 11: Full Test Suite

**Command:** `pnpm test`
**Depends on:** Task 10
