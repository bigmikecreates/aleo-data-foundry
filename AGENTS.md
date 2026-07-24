# Agent Instructions — Aleo Data Foundry

## Test-First Development

1. Before marking any task complete, run `pnpm test`
2. If tests fail:
   - Read the error output carefully
   - Identify the root cause
   - Plan the fix
   - Implement the fix
   - Re-run tests
   - Repeat until all tests pass
3. Never commit code with failing tests
4. Test files are co-located: `src/foo.ts` has `src/foo.test.ts`

## Sprint Workflow

Each sprint follows:
1. Work from the sprint's GitHub Issue
2. Follow SpecKit artifacts (spec.md, plan.md, tasks.md)
3. Implement tasks in dependency order
4. Run `/speckit.converge` to verify completeness
5. Run `pnpm test` — debug and fix until green
6. Run consistency review (see below)
7. Present manual review checklist to user

## Sprint-End Review

After all tasks are complete and tests pass, perform a consistency review:

1. Run `pnpm test` — must pass
2. Run `pnpm lint` (tsc --noEmit) — must pass
3. Review all schema files for field name consistency across tiers
4. Review all test files for consistency with schema changes
5. Check type exports are complete
6. Check barrel exports in `index.ts`
7. Fix any issues found
8. Repeat steps 1-7 until zero inconsistencies
9. Present manual review checklist with "What Was Fixed" section

## Branch Protection

- No direct pushes to `main`
- Work on sprint branch: `sprint/N-description`
- Create PR from sprint branch → squash merge to main
- Branch protection will be enforced once repo is public

## Manual Review Checklist

Present to user at sprint end with step-by-step instructions:

### Step 1: Verify Tests Pass
```bash
pnpm test
```
Expected: All tests pass

### Step 2: Verify TypeScript Compilation
```bash
pnpm lint
```
Expected: No errors

### Step 3: Review Schema Consistency
- [ ] All Tier 1 (source) schemas have corresponding type exports
- [ ] All Tier 2 (canonical) schemas have consistent field naming
- [ ] All Tier 3 (serving) schemas match canonical field names (snake_case)
- [ ] No duplicate field names across schema tiers

### Step 4: Review Test Coverage
- [ ] Each schema has at least one positive test
- [ ] Each schema has at least one negative test (where applicable)
- [ ] New schemas have corresponding tests

### Step 5: Review Barrel Exports
- [ ] `packages/shared/src/index.ts` exports all public APIs
- [ ] No internal implementation details leaked

### Step 6: Review Config
- [ ] `tsconfig.json` files are consistent
- [ ] `package.json` files have correct dependencies
- [ ] No redundant dependencies

## Code Quality

- TypeScript strict mode
- Zod validation at system boundaries
- No `any` types
- Minimal dependencies — justify every new package

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run a specific package's tests
pnpm --filter @aleo-foundry/shared test
```
