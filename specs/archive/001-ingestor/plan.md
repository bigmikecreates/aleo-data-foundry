# Ingestor — Implementation Plan

## Approach

Build the ingestor package with three core components: ProvableApiSource, RateLimiter, and CheckpointStore. Each component is independently testable with mocked dependencies.

## Architecture Decisions

1. **Native fetch** — No external HTTP client. Node.js 20+ has built-in fetch.
2. **Token bucket rate limiter** — Simple, predictable, no external deps.
3. **File-based checkpoints** — JSON files for Phase 1. Postgres later.
4. **Dependency injection** — RateLimiter and CheckpointStore injected into ProvableApiSource for testability.

## File Layout

```
packages/ingestor/src/
├── provable-api-source.ts       # ChainSource implementation
├── provable-api-source.test.ts  # Tests with mocked fetch
├── rate-limiter.ts              # Token bucket rate limiter
├── rate-limiter.test.ts         # Tests
├── checkpoint-store.ts          # File-based checkpoint persistence
├── checkpoint-store.test.ts     # Tests
├── errors.ts                    # Custom error types
└── index.ts                     # Barrel export
```

## Tasks

1. Create error types (RateLimitError, ApiError)
2. Implement RateLimiter with token bucket
3. Implement CheckpointStore with file persistence
4. Implement ProvableApiSource with fetch + rate limiting
5. Write tests for RateLimiter
6. Write tests for CheckpointStore
7. Write tests for ProvableApiSource (mocked fetch)
8. Run full test suite
