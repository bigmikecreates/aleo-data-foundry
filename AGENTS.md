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
1. Create GitHub Issue with sprint checklist (`gh issue create`)
2. Create sprint branch: `sprint/N-description`
3. Follow SpecKit artifacts (spec.md, plan.md, tasks.md)
4. Implement tasks in dependency order
5. Run `/speckit.converge` to verify completeness
6. Run `pnpm test` — debug and fix until green
7. Run consistency review (see below)
8. Present manual review checklist to user
9. Commit, push, create PR with `Closes #N` to link issue
10. Squash merge PR → main (issue auto-closes)

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

Present to user at sprint end with step-by-step instructions. Each component must have:
- **Specific file paths** to review
- **Line numbers** for key logic
- **Concrete verification steps** (not just "review X")
- **What "correct" looks like** for each component

### Template

```markdown
## Sprint N Review Checklist — Manual Review Instructions

### Step 1: Verify Tests Pass
```bash
pnpm test
```
Expected: X tests pass across Y test files

### Step 2: Verify TypeScript Compilation
```bash
pnpm lint
```
Expected: No errors

### Step 3: Review [Component Name]
**File:** `packages/X/src/Y.ts`

Open the file and verify:
- [ ] Line 15-20: Function `foo` accepts `Bar` type and returns `Baz`
- [ ] Line 45: Error handling catches `Qux` and throws `Error`
- [ ] Line 67-80: Transformation maps `input.fieldA` → `output.fieldB`

**Test coverage:** `packages/X/src/Y.test.ts`
- [ ] Test 1: Positive case — valid input produces expected output
- [ ] Test 2: Negative case — invalid input throws/rejects
- [ ] Test 3: Edge case — empty/null input handled gracefully

### Step 4: Review [Next Component]
...

### What Was Fixed
| # | Fix | Files Changed |
|---|---|---|
| 1 | Description | file.ts:line |
```

### Rules
1. **Line numbers are mandatory** — point to exact code locations
2. **Field mappings must be explicit** — "input.X → output.Y" not just "maps fields"
3. **Test cases must be named** — "Positive case: X" not just "has tests"
4. **Edge cases must be listed** — empty input, null, invalid data
5. **"What Was Fixed" must include file:line** — not just file names

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
