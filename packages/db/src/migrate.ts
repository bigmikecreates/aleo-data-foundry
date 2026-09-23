import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseClient } from "./client.js";

interface AppliedMigration {
  name: string;
  checksum: string;
}

const MIGRATIONS_TABLE = "_migrations";

/**
 * Apply pending SQL migrations, recording each applied file's checksum.
 * Already-applied migrations are skipped so repeated starts are safe.
 */
export async function migrate(client: DatabaseClient): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = join(__dirname, "../migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  await createMigrationsTable(client);
  const applied = await loadApplied(client);

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    const checksum = checksumOf(sql);
    const record = applied.find((m) => m.name === file);

    if (record) {
      if (record.checksum !== checksum) {
        throw new Error(
          `Migration ${file} has been applied with a different checksum. ` +
            "Refusing to reapply; the database is out of sync with the migration file.",
        );
      }
      continue; // Already applied
    }

    await applyMigration(client, file, sql, checksum);
  }
}

async function createMigrationsTable(client: DatabaseClient): Promise<void> {
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (` +
      "name VARCHAR(255) PRIMARY KEY, " +
      "checksum VARCHAR(64) NOT NULL, " +
      "applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
}

async function loadApplied(client: DatabaseClient): Promise<AppliedMigration[]> {
  const result = await client.query<AppliedMigration>(
    `SELECT name, checksum FROM ${MIGRATIONS_TABLE}`,
  );
  return result.rows;
}

function checksumOf(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

/**
 * Apply a single migration inside one database transaction. The migration SQL
 * and the tracking insert are sent as one multi-statement query; if any
 * statement fails, the pg Pool discards the connection so nothing commits.
 * Names/checksums are controlled values (filenames, hex), escaped defensively.
 */
async function applyMigration(
  client: DatabaseClient,
  name: string,
  sql: string,
  checksum: string,
): Promise<void> {
  const escapedName = name.replaceAll("'", "''");
  await client.query(
    `BEGIN;\n${sql}\nINSERT INTO ${MIGRATIONS_TABLE} (name, checksum) VALUES ('${escapedName}', '${checksum}');\nCOMMIT;`,
  );
}