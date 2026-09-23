# API — Specification

## Overview

Implement the REST API package for serving Aleo blockchain data via HTTP endpoints. This is the Tier 3 serving layer that reads from Postgres and serves to clients.

## Context

The API serves mobile privacy wallets. Mobile clients have specific constraints (see `specs/000-system-contract/spec.md` § Mobile API Constraints):
- Cursor-based pagination (no offset)
- Maximum 100KB response size
- ETag caching
- Amounts as strings (not numbers)

## Endpoints

### Blocks
- `GET /blocks` — List blocks with cursor pagination
  - Query params: `limit` (default 20, max 100), `cursor` (opaque)
  - Returns: `BlockRow[]` with pagination cursor

- `GET /blocks/:height` — Get block by height
  - Returns: `BlockRow` with nested transactions

### Transactions
- `GET /transactions/:txId` — Get transaction by ID
  - Returns: `TransactionRow` with nested transitions

### Transitions
- `GET /transitions/:transitionId` — Get transition by ID
  - Returns: `TransitionRow`

### Programs
- `GET /programs/:programId` — Get program by ID
  - Returns: `ProgramRow`

### Health
- `GET /health` — Health check
  - Returns: `{ status: "ok", timestamp: string }`

## Response Format

All responses follow this structure:
```json
{
  "data": <payload>,
  "meta": {
    "cursor": "<opaque_cursor_or_null>",
    "hasMore": true|false
  }
}
```

## Error Format

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Block not found"
  }
}
```

## Caching

- All responses include `ETag` header
- Clients can use `If-None-Match` to avoid re-downloading unchanged data
- Return `304 Not Modified` when ETag matches

## Out of Scope

- Postgres schema (Phase 1b)
- Authentication (Phase 2)
- Rate limiting on API (handled by reverse proxy)
- WebSocket streaming (Phase 3)
