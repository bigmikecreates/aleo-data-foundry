# API Server — Specification

## Overview

Implement a Fastify REST API server for serving blockchain data from Postgres. This is the HTTP layer that mobile privacy wallets consume.

## Context

The API server sits between the database (Postgres) and the client (mobile app). It provides RESTful endpoints for querying blockchain data.

## Endpoints

### Health
- **GET /health** → `{ status: "ok", timestamp: string }`

### Blocks
- **GET /blocks** → paginated list of blocks
  - Query params: `limit` (default 20), `cursor` (opaque)
  - Response: `{ data: BlockRow[], meta: { cursor, hasMore } }`
- **GET /blocks/:height** → single block
  - Response: `{ data: BlockRow }`

### Transactions
- **GET /transactions/:tx_id** → single transaction
  - Response: `{ data: TransactionRow }`

### Transitions
- **GET /transitions/:id** → single transition
  - Response: `{ data: TransitionRow }`

### Programs
- **GET /programs/:id** → single program
  - Response: `{ data: ProgramRow }`

### Mapping Changes
- **GET /mapping-changes** → paginated list
  - Query params: `limit` (default 20), `cursor` (opaque)
  - Response: `{ data: MappingChangeRow[], meta: { cursor, hasMore } }`

### Fees
- **GET /fees** → paginated list
  - Query params: `limit` (default 20), `cursor` (opaque)
  - Response: `{ data: FeeRow[], meta: { cursor, hasMore } }`

### Chain Metadata
- **GET /chain-metadata/:network** → chain head for network
  - Response: `{ data: ChainMetadataRow }`

## Response Format

### Success
```json
{
  "data": { ... }
}
```

### List
```json
{
  "data": [ ... ],
  "meta": {
    "cursor": "opaque-string",
    "hasMore": true
  }
}
```

### Error
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Block not found"
  }
}
```

## Middleware

### Error Handler
- Catches `NotFoundError` → 404
- Catches `ValidationError` → 400
- Returns consistent error format

### ETag
- Generates ETag from response body (SHA-256 truncated)
- Supports `If-None-Match` → 304 Not Modified

## Mobile Constraints
- Max response size: 100KB
- Default page size: 20 items
- Cursor-based pagination (no offsets)

## Out of Scope

- Authentication (Phase 2)
- Rate limiting (handled by reverse proxy)
- WebSocket/SSE (Phase 2)
