import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { loadEnv, parseDatabaseUrl } from "@aleo-foundry/shared";
import { DatabaseClient, migrate, BlockRepository, TransactionRepository, TransitionRepository, ProgramRepository, MappingChangeRepository, FeeRepository, ChainMetadataRepository } from "@aleo-foundry/db";
import { buildServer } from "./server.js";

async function isPostgresAvailable(client: DatabaseClient): Promise<boolean> {
  try {
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

describe("API Integration", () => {
  const env = loadEnv();
  const dbConfig = parseDatabaseUrl(env.DATABASE_URL);
  const client = new DatabaseClient(dbConfig);
  let app: FastifyInstance;

  beforeAll(async () => {
    const available = await isPostgresAvailable(client);
    if (!available) {
      console.warn("Postgres not available — skipping API integration tests");
      return;
    }
    await migrate(client);

    const ctx = {
      blockRepository: new BlockRepository(client),
      transactionRepository: new TransactionRepository(client),
      transitionRepository: new TransitionRepository(client),
      programRepository: new ProgramRepository(client),
      mappingChangeRepository: new MappingChangeRepository(client),
      feeRepository: new FeeRepository(client),
      chainMetadataRepository: new ChainMetadataRepository(client),
    };

    app = await buildServer(ctx);
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    await client.end();
  });

  it("GET /health returns ok", async () => {
    const available = await isPostgresAvailable(client);
    if (!available) return;

    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe("ok");
  }, 10000);

  it("GET /blocks returns empty list initially", async () => {
    const available = await isPostgresAvailable(client);
    if (!available) return;

    const response = await app.inject({ method: "GET", url: "/blocks" });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toEqual([]);
  }, 10000);

  it("GET /blocks/:height returns 404 for missing block", async () => {
    const available = await isPostgresAvailable(client);
    if (!available) return;

    const response = await app.inject({ method: "GET", url: "/blocks/999999" });
    expect(response.statusCode).toBe(404);
  }, 10000);

  it("GET /chain-metadata/:network returns 404 for missing metadata", async () => {
    const available = await isPostgresAvailable(client);
    if (!available) return;

    const response = await app.inject({ method: "GET", url: "/chain-metadata/testnet" });
    expect(response.statusCode).toBe(404);
  }, 10000);
});
