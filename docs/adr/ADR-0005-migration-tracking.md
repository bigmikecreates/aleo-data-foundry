# ADR-0005: Migration tracking with _migrations

- **Status:** Accepted (Sprint 7)
- **Date:** 2026-09-23

## Context
`packages/db/src/migrate.ts` originally re-ran every `.sql` file on each startup
with no record of what had run. It was safe only while every migration was
idempotent (`CREATE TABLE/INDEX IF NOT EXISTS`); any future non-idempotent migration
(column add, data backfill, drop) would break restarts.

## Decision
- A `_migrations(name, checksum, applied_at)` table records each applied file.
- Only pending migrations run; each is applied inside one DB transaction
  (`BEGIN; …; INSERT INTO _migrations; COMMIT;` as a single query — on failure the
  pg Pool discards the connection, so nothing commits).
- A checksum (`sha256` of file contents) mismatch on an already-applied migration
  refuses to run, surfacing file/database drift loudly.

## Consequences
- Repeated ingestor starts are safe (the ingestor runs `migrate()` at boot).
- DB ↔ file drift is detected instead of silently diverging.
- Existing pre-Sprint-7 databases lack `_migrations`; recreate them once so
  schema matches code (`CREATE TABLE IF NOT EXISTS` will not alter existing tables).

## Alternatives considered
Versioned-number migrations in app code (rejected: less portable), no tracking (rejected: unsafe).