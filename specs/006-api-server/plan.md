# API Server — Plan

## Approach

Create a Fastify app with route plugins for each resource. Inject `DatabaseClient` via Fastify's dependency injection.

## File Layout

```
packages/api/src/
├── server.ts              # Fastify app setup
├── routes/
│   ├── health.ts          # GET /health
│   ├── blocks.ts          # GET /blocks, GET /blocks/:height
│   ├── transactions.ts    # GET /transactions/:tx_id
│   ├── transitions.ts     # GET /transitions/:id
│   ├── programs.ts        # GET /programs/:id
│   ├── mapping-changes.ts # GET /mapping-changes
│   ├── fees.ts            # GET /fees
│   └── chain-metadata.ts  # GET /chain-metadata/:network
├── middleware/
│   ├── error-handler.ts   # Error formatting
│   └── etag.ts            # ETag generation
├── errors.ts              # NotFoundError, ValidationError
├── api.test.ts            # Unit tests
└── index.ts               # Barrel export
```

## Dependencies

- `fastify` — HTTP framework
- `@aleo-foundry/db` — Database repositories
- `@aleo-foundry/shared` — Schemas for validation

## Tasks

1. Create Fastify app with DB injection
2. Implement health check endpoint
3. Implement block endpoints
4. Implement transaction endpoints
5. Implement transition endpoints
6. Implement program endpoints
7. Implement mapping change endpoints
8. Implement fee endpoints
9. Implement chain metadata endpoints
10. Implement error handler middleware
11. Implement ETag middleware
12. Write unit tests
13. Run full test suite
