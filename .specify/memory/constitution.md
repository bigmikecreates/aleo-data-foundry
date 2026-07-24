# Aleo Data Foundry — Constitution

## Principles

1. **Minimal overengineering** — Build only what specs require. No abstractions until there's a concrete need.
2. **Spec-driven development** — Every feature starts with a spec, not code.
3. **Test-first** — TDD with Vitest. Tests must pass before code is considered done.
4. **Type safety** — TypeScript strict mode. Zod validation at system boundaries. No `any` types.
5. **Simplicity over cleverness** — Readable code beats clever code. Simple solutions beat complex ones.
6. **Explicit over implicit** — Configuration, data flow, and error handling should be obvious.
7. **Minimal dependencies** — Justify every new package. Prefer stdlib or existing dependencies.
8. **Config-driven** — Network (testnet/mainnet) is a config value, not a code path split.

## Tech Stack (Fixed for Phase 0-1)

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js >= 20
- **Package Manager:** pnpm
- **Validation:** Zod
- **Testing:** Vitest
- **API:** Fastify (Phase 1a)
- **Streaming:** Redpanda (KafkaJS client)
- **Database:** PostgreSQL
- **Monorepo:** pnpm workspaces

## Quality Standards

- All code must pass `pnpm test` before merge
- Test files co-located with source: `src/foo.ts` → `src/foo.test.ts`
- No hardcoded values — use config or environment variables
- Error messages must be actionable
- Public APIs must have Zod schemas
