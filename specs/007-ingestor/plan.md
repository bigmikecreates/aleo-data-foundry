# Ingestor Implementation — Plan

## Approach

Create `ProvableApiSource` implementing `ChainSource`, add rate limiter, checkpoint store, and polling loop.

## File Layout

```
packages/ingestor/src/
├── provable-api-source.ts     # ChainSource implementation
├── rate-limiter.ts            # Token bucket rate limiter
├── checkpoint-store.ts        # File-based checkpoint persistence
├── poller.ts                  # Main polling loop
├── errors.ts                  # Custom error types
├── ingestor.test.ts           # Unit tests
└── index.ts                   # Barrel export
```

## Dependencies

- `node-fetch` or built-in `fetch` — HTTP client
- `@aleo-foundry/shared` — Config, ChainSource interface, schemas

## Tasks

1. Implement ProvableApiSource
2. Implement rate limiter
3. Implement checkpoint store
4. Implement polling loop
5. Write unit tests
6. Run full test suite
