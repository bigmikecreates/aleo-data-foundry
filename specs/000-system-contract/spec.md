# System Contract — Specification

## Overview

Define the data model contracts for Aleo Data Foundry: the guarantees, schemas, and interfaces that govern how blockchain data flows through the system.

## Context

Aleo Data Foundry ingests blockchain data from the Aleo network, normalizes it into canonical representations, stores it in Postgres, and serves it via REST APIs. The system must handle:

- Blocks (header, metadata, state roots)
- Transactions (execute, deploy, fee)
- Transitions (inputs, outputs, program calls)
- Program deployments (editions)
- Program executions (function calls)
- Fee transitions
- Public mapping changes (finalize actions)
- Chain metadata (height, hash, timestamps)
- Ingestion checkpoints (resumability)

## Data Model Tiers

### Tier 1: Source Events

Raw payloads from upstream sources. These mirror the API response shapes exactly — no transformation, no normalization. Used for:
- Debugging and replay
- Archival (Phase 4)
- Source reconciliation

Source types:
- `ProvableBlockResponse` — from Provable API `GET /v2/{network}/block/:height_or_hash`
- `ProvableTransactionResponse` — from Provable API `GET /v2/{network}/transaction/:tx_id`
- `ProvableBlockTransactionsResponse` — from Provable API `GET /v2/{network}/block/:height/transactions`

### Tier 2: Canonical Events

Internal versioned representations. Source-agnostic, network-aware. Used for:
- Normalization
- Kafka topics (raw and normalized)
- Interchange between components

Entity types:
- `CanonicalBlock`
- `CanonicalTransaction`
- `CanonicalTransition`
- `CanonicalDeployment`
- `CanonicalExecution`
- `CanonicalFee`
- `CanonicalMappingChange`
- `CanonicalChainMetadata`

### Tier 3: Serving Models

Postgres-optimized representations for API queries. Denormalized where needed for read performance.

Entity types:
- `BlockRow`
- `TransactionRow`
- `TransitionRow`
- `ProgramRow`
- `MappingChangeRow`

## Delivery Semantics

- **At-least-once delivery** — Messages may be delivered more than once
- **Idempotent consumers** — Processing the same message twice produces the same result
- **Explicit schema versioning** — Every message carries a `schemaVersion` field

## Idempotency Strategy

Each canonical event has a deterministic `messageId` derived from:
- Network name
- Entity type
- Natural key (e.g., block height + hash, tx ID, transition ID)

This ensures replaying the same event is a no-op.

## Schema Evolution

### Versioning Strategy

Every canonical schema includes a `version: 1` literal. This is the schema version, not an application version.

**Rules:**
- Schema version is bumped when the shape of a canonical event changes (field added, removed, or retyped)
- Schema version is NOT bumped for additive-only changes (new optional fields)
- Backward compatibility: consumers must ignore unknown fields and tolerate missing optional fields

### Version Lifecycle

1. **Draft** — New schema version defined in code, not yet deployed
2. **Active** — Schema version is produced and consumed in production
3. **Deprecated** — Old version still consumed but no longer produced
4. **Retired** — Old version no longer consumed; migration window closed

### Migration Strategy

When a schema version changes:

1. New version is added alongside old version in code
2. Producers emit new version; consumers accept both old and new
3. Backfill job re-normalizes historical data to new version (if needed)
4. After migration window, old version is removed from consumers
5. Old version schema is retained in code for archival replay

### Topic Versioning

Topic names include the schema version: `aleo.blocks.raw.v1`. When schema version bumps:
- Old topic (`v1`) remains for replay/archival
- New topic (`v2`) is created for new data
- Consumers subscribe to both during migration

### Consumer Compatibility Rules

- Consumers MUST NOT hardcode field paths — use destructuring with defaults
- Consumers MUST ignore unknown fields (forward compatibility)
- Consumers MUST tolerate missing optional fields (backward compatibility)
- Consumers MUST log a warning when encountering an unexpected schema version

## Mobile API Constraints

The API serves mobile privacy wallets. Mobile clients have specific constraints:

### Payload Size
- Responses must be compact — no unnecessary nested data
- Use field selection (sparse fieldsets) where possible
- Maximum response size target: 100KB per response

### Pagination
- Cursor-based pagination only (no offset)
- Default page size: 20 items
- Maximum page size: 100 items
- Cursor must be opaque (URL-safe base64 encoded)

### Selective Disclosure
- Wallets fetch only data they can decrypt
- Private transitions are returned as encrypted blobs
- Public transitions are returned in full
- Clients can filter by program_id to reduce payload

### Offline Support
- API responses include `ETag` headers for cache validation
- Clients can use `If-None-Match` to avoid re-downloading unchanged data
- Block heights are monotonically increasing — safe for gap detection

### Response Format
- All timestamps in ISO 8601 UTC
- All amounts as strings (not numbers) to avoid precision loss
- All IDs as strings (not numbers) for portability

## Scope — What This Sprint Defines

1. Zod schemas for all three tiers
2. TypeScript types derived from Zod
3. `ChainSource` interface
4. Topic naming convention
5. Checkpoint schema
6. Config types (network, API URLs, rate limits)

## Out of Scope (Future Sprints)

- Kafka message envelope format (Phase 3)
- Postgres schema (Phase 1a Sprint 3)
- REST API contracts (Phase 1a Sprint 4)
- OpenAPI spec (Phase 1a Sprint 4)
- Privacy model details (see specs/009-privacy-model.md)

- Data quality checks (see specs/010-data-quality.md)