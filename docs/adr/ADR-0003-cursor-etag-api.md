# ADR-0003: Cursor pagination and ETag caching for the mobile API

- **Status:** Accepted (Sprints 4-7)
- **Date:** 2026-09-23

## Context
The API serves mobile privacy wallets on constrained/offline networks. Offset
pagination is unstable under concurrent writes, oversized pages waste bandwidth,
and uncached responses are costly for repeated syncs.

## Decision
- **Cursor pagination:** opaque base64url cursors (`packages/api/src/utils.ts`),
  default 20 items, max 100; no offsets.
- **ETag caching:** SHA-256 ETag over the response body; `If-None-Match` returns
  304 (`packages/api/src/middleware/etag.ts`).
- BigInt → string serialization in a `preSerialization` hook so clients stay
  parse-safe.

## Consequences
- Stable page boundaries under new blocks; cheap re-syncs for wallets.
- Queries are index-backed (`WHERE id < $cursor ORDER BY id DESC LIMIT $n`).
- Slight complexity cost of opaque cursor encode/decode.

## Alternatives considered
Offset/limit (rejected: unstable), timestamps as cursors (rejected: collisions).