# Postgres Integration — Implementation Plan

## Approach

Create a new `packages/db` package with:
1. SQL migration files
2. Repository classes for each table
3. Tests using a test database (or mocked pg client)

## File Layout

```
packages/db/
├── migrations/
│   └── 001_initial_schema.sql
├── src/
│   ├── client.ts              # Database connection
│   ├── repositories/
│   │   ├── block-repository.ts
│   │   ├── transaction-repository.ts
│   │   ├── transition-repository.ts
│   │   ├── program-repository.ts
│   │   ├── mapping-change-repository.ts
│   │   ├── fee-repository.ts
│   │   └── chain-metadata-repository.ts
│   ├── index.ts               # Barrel export
│   └── *.test.ts              # Tests
├── package.json
└── tsconfig.json
```

## Dependencies

- `pg` — PostgreSQL client
- `@types/pg` — TypeScript types

## Tasks

1. Create packages/db with package.json and tsconfig.json
2. Write initial migration SQL
3. Implement database client
4. Implement block repository
5. Implement transaction repository
6. Implement transition repository
7. Implement program repository
8. Implement mapping change repository
9. Implement fee repository
10. Implement chain metadata repository
11. Write tests for all repositories
12. Run full test suite
