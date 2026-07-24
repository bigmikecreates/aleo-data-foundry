# System Contract — Implementation Plan

## Approach

Define all schemas and interfaces in `packages/shared`, then write tests that validate the schemas against known fixture data. No external dependencies beyond Zod.

## Architecture Decisions

1. **Zod as schema source of truth** — Types are derived from Zod schemas via `z.infer<>`, not maintained separately. This ensures types and validation are always in sync.

2. **Three-tier separation in single package** — All three data model tiers live in `packages/shared/src/schemas/`. Separated by directory, not by package. Premature package splitting adds complexity without benefit.

3. **Config-driven network selection** — A single `NetworkConfig` type with `network: "testnet" | "mainnet"` determines API base URLs and topic prefixes. No if/else chains per network.

4. **Deterministic messageId** — Hash of (network, entityType, naturalKey) for idempotency. Uses Node.js crypto for SHA-256.

5. **ChainSource as interface, not class** — Pure TypeScript interface. Implementations (ProvableApiSource, SnarkOsRestSource) are concrete classes in their own packages.

## File Layout

```
packages/shared/src/
├── schemas/
│   ├── source.ts          # Tier 1: Provable API response shapes
│   ├── canonical.ts       # Tier 2: Internal canonical events
│   └── serving.ts         # Tier 3: Postgres-optimized models
├── types.ts               # Re-exported Zod inferred types
├── config.ts              # NetworkConfig, SourceConfig
├── chain-source.ts        # ChainSource interface
├── topics.ts              # Topic naming convention
├── checkpoint.ts          # Checkpoint schema
├── message-id.ts          # Deterministic messageId generation
└── index.ts               # Public API barrel
```

## Tasks

1. Create Zod schemas for Tier 1 (source events)
2. Create Zod schemas for Tier 2 (canonical events)
3. Create Zod schemas for Tier 3 (serving models)
4. Create config types
5. Create ChainSource interface
6. Create topic naming utility
7. Create checkpoint schema
8. Create messageId utility
9. Create barrel export (index.ts)
10. Write tests for all schemas with fixture data
11. Write tests for messageId generation
12. Write tests for topic naming
13. Run full test suite — debug until green
