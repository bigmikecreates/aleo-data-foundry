import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseClient } from "./client.js";

export async function migrate(client: DatabaseClient): Promise<void> {
  const migrationPath = join(
    import.meta.dirname,
    "../migrations/001_initial_schema.sql",
  );
  const sql = readFileSync(migrationPath, "utf-8");
  await client.query(sql);
}
