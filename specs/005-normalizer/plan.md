# Normalizer Implementation — Plan

## Approach

Create 6 transformation functions in `packages/normalizer/src/normalizer.ts`, each handling one entity type. Each function returns both canonical and serving models.

## File Layout

```
packages/normalizer/src/
├── normalizer.ts        # 6 transformation functions
├── normalizer.test.ts   # Unit tests
├── errors.ts            # NormalizationError
└── index.ts             # Barrel export
```

## Dependencies

- `@aleo-foundry/shared` — Tier 1, 2, 3 schemas
- No external libraries needed

## Tasks

1. Verify shared package exports all needed schemas
2. Implement `normalizeBlock()`
3. Implement `normalizeTransaction()`
4. Implement `normalizeTransition()`
5. Implement `normalizeFee()`
6. Implement `normalizeDeployment()`
7. Implement `normalizeMappingChange()`
8. Write unit tests for all transforms
9. Run full test suite
