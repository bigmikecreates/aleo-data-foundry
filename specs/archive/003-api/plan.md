# API — Implementation Plan

## Approach

Use Fastify for the HTTP server with lightweight route handlers. Each endpoint returns Tier 3 serving models from `@aleo-foundry/shared`. For now, use in-memory mock data (Postgres integration in Phase 1b).

## File Layout

```
packages/api/src/
├── server.ts              # Fastify server setup
├── routes/
│   ├── blocks.ts          # Block endpoints
│   ├── transactions.ts    # Transaction endpoints
│   ├── transitions.ts     # Transition endpoints
│   ├── programs.ts        # Program endpoints
│   └── health.ts          # Health check
├── middleware/
│   ├── error-handler.ts   # Error response formatting
│   └── etag.ts            # ETag generation/validation
├── errors.ts              # API error types
├── index.ts               # Barrel export
└── *.test.ts              # Tests
```

## Dependencies

- `fastify` — HTTP server
- `@aleo-foundry/shared` — Schemas and types

## Tasks

1. Install Fastify dependency
2. Create error types (NotFoundError, ValidationError)
3. Implement error handler middleware
4. Implement ETag middleware
5. Implement health endpoint
6. Implement block endpoints
7. Implement transaction endpoints
8. Implement transition endpoints
9. Implement program endpoints
10. Write tests for all endpoints
11. Run full test suite
