# Normalizer — Implementation Plan

## Approach

Pure transformation functions that take Tier 1 inputs and return Tier 2 outputs. No side effects, no I/O. Easy to test, easy to reason about.

## File Layout

```
packages/normalizer/src/
├── normalizer.ts          # Core transformation functions
├── normalizer.test.ts     # Tests with fixture data
├── errors.ts              # NormalizationError
└── index.ts               # Barrel export
```

## Tasks

1. Create NormalizationError type
2. Implement block normalization (block → canonical block)
3. Implement transaction normalization (block tx → canonical tx)
4. Implement transition normalization (transition → canonical transition)
5. Implement fee normalization (fee → canonical fee)
6. Implement deployment normalization (deploy → canonical deployment)
7. Implement mapping change normalization (finalize action → canonical mapping change)
8. Write tests for all normalization paths
9. Run full test suite
