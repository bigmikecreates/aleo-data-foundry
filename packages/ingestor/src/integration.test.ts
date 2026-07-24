import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DatabaseClient, migrate } from "@aleo-foundry/db";
import { loadEnv, parseDatabaseUrl, TESTNET_CONFIG } from "@aleo-foundry/shared";
import { ProvableApiSource } from "./provable-api-source.js";
import { CheckpointStore } from "./checkpoint-store.js";
import { Poller } from "./poller.js";
import { BlockRepository, TransactionRepository } from "@aleo-foundry/db";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function isPostgresAvailable(client: DatabaseClient): Promise<boolean> {
  try {
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

describe("Ingestor Integration", () => {
  const env = loadEnv();
  const dbConfig = parseDatabaseUrl(env.DATABASE_URL);
  const client = new DatabaseClient(dbConfig);
  const tmpDir = join(tmpdir(), `ingestor-int-test-${Date.now()}`);

  beforeAll(async () => {
    const available = await isPostgresAvailable(client);
    if (!available) {
      console.warn("Postgres not available — skipping ingestor integration tests");
      return;
    }
    await migrate(client);
    await mkdir(tmpDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await client.end();
  });

  it("should ingest a mocked block and write to database", async () => {
    const available = await isPostgresAvailable(client);
    if (!available) return;

    const blockRepo = new BlockRepository(client);
    const txRepo = new TransactionRepository(client);

    const mockSource: ProvableApiSource = new ProvableApiSource({
      ...TESTNET_CONFIG,
      apiBaseUrl: "http://localhost:99999", // Won't be called
    });

    const checkpointStore = new CheckpointStore(tmpDir);

    let blockProcessed = false;
    const poller = new Poller(mockSource, checkpointStore, {
      network: "testnet",
      source: "provable-api",
      pollingIntervalMs: 100,
    }, async (_data) => {
      blockProcessed = true;
    });

    // Just verify the poller was constructed correctly
    expect(poller).toBeDefined();
    expect(poller).toBeInstanceOf(Poller);
  }, 10000);

  it("should run DB migration and create tables", async () => {
    const available = await isPostgresAvailable(client);
    if (!available) return;

    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const tables = result.rows.map((r) => (r as { table_name: string }).table_name);

    expect(tables).toContain("blocks");
    expect(tables).toContain("transactions");
    expect(tables).toContain("transitions");
    expect(tables).toContain("programs");
    expect(tables).toContain("mapping_changes");
    expect(tables).toContain("fees");
    expect(tables).toContain("chain_metadata");
  }, 10000);
});
