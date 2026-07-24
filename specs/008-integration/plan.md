# Integration — Plan

## File Layout

```
docker-compose.yml
.env.example
packages/shared/src/env.ts
packages/db/src/migrate.ts
packages/api/src/main.ts
packages/ingestor/src/main.ts
packages/api/src/integration.test.ts
packages/ingestor/src/integration.test.ts
package.json (modified)
```

## Tasks

1. Add docker-compose.yml
2. Add .env.example
3. Add env.ts config loading
4. Add migrate.ts
5. Add api/src/main.ts
6. Add ingestor/src/main.ts
7. Add npm scripts
8. Add integration tests
9. Run full test suite
10. Run lint
