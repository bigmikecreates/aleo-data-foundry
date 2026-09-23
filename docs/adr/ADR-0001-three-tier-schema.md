# ADR-0001: Three-tier data model in a single shared package

- **Status:** Accepted (Sprints 1-7)
- **Date:** 2026-09-23

## Context
Data flows through three representations: raw source events (Provable API),
canonical internal events, and Postgres serving rows. Early instinct was to split
each tier into its own package to mirror the pipeline.

## Decision
All three tiers live in `packages/shared/src/schemas/` (`source.ts`, `canonical.ts`,
`serving.ts`), separated by file, not by package. Types are derived from Zod schemas
via `z.infer<>` so they can never drift from runtime validation.

## Consequences
- One package to version and ship; no cross-package schema churn.
- Premature package splitting avoided (constitution: minimal overengineering).
- Schemas become source of truth; DB repositories hand-declare rows but Zod guards
  the system boundary.

## Alternatives considered
Per-tier packages (rejected: added complexity without benefit at this scale).