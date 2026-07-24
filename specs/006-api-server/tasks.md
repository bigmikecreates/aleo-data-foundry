# API Server — Tasks

## Task 1: Fastify App Setup

**File:** `packages/api/src/server.ts`
**Depends on:** None
**Setup:** Fastify with `DatabaseClient` injection

## Task 2: Health Check

**File:** `packages/api/src/routes/health.ts`
**Depends on:** Task 1
**Endpoint:** `GET /health`

## Task 3: Block Endpoints

**File:** `packages/api/src/routes/blocks.ts`
**Depends on:** Task 1
**Endpoints:** `GET /blocks`, `GET /blocks/:height`

## Task 4: Transaction Endpoints

**File:** `packages/api/src/routes/transactions.ts`
**Depends on:** Task 1
**Endpoint:** `GET /transactions/:tx_id`

## Task 5: Transition Endpoints

**File:** `packages/api/src/routes/transitions.ts`
**Depends on:** Task 1
**Endpoint:** `GET /transitions/:id`

## Task 6: Program Endpoints

**File:** `packages/api/src/routes/programs.ts`
**Depends on:** Task 1
**Endpoint:** `GET /programs/:id`

## Task 7: Mapping Change Endpoints

**File:** `packages/api/src/routes/mapping-changes.ts`
**Depends on:** Task 1
**Endpoint:** `GET /mapping-changes`

## Task 8: Fee Endpoints

**File:** `packages/api/src/routes/fees.ts`
**Depends on:** Task 1
**Endpoint:** `GET /fees`

## Task 9: Chain Metadata Endpoints

**File:** `packages/api/src/routes/chain-metadata.ts`
**Depends on:** Task 1
**Endpoint:** `GET /chain-metadata/:network`

## Task 10: Error Handler Middleware

**File:** `packages/api/src/middleware/error-handler.ts`
**Depends on:** Task 1
**Handle:** NotFoundError → 404, ValidationError → 400

## Task 11: ETag Middleware

**File:** `packages/api/src/middleware/etag.ts`
**Depends on:** Task 1
**Generate:** SHA-256 truncated ETag from response body

## Task 12: Unit Tests

**File:** `packages/api/src/api.test.ts`
**Depends on:** Tasks 2-11
**Test each endpoint with mocked DB**

## Task 13: Full Test Suite

**Command:** `pnpm test`
**Depends on:** Task 12
