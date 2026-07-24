import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("Health", () => {
  it("GET /health returns ok", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});

describe("Blocks", () => {
  it("GET /blocks returns block list", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/blocks",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.meta).toBeDefined();
    expect(body.meta.hasMore).toBe(false);
  });

  it("GET /blocks/:height returns block", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/blocks/12345",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.height).toBe(12345);
    expect(body.data.block_hash).toBe("ab17upp");
  });

  it("GET /blocks/:height returns 404 for unknown height", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/blocks/99999",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("Transactions", () => {
  it("GET /transactions/:txId returns transaction", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/transactions/at1tx",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.tx_id).toBe("at1tx");
    expect(body.data.type).toBe("execute");
  });

  it("GET /transactions/:txId returns 404 for unknown txId", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/transactions/at1unknown",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("Transitions", () => {
  it("GET /transitions/:transitionId returns transition", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/transitions/au1tr",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.transition_id).toBe("au1tr");
    expect(body.data.program_id).toBe("credits.aleo");
  });

  it("GET /transitions/:transitionId returns 404 for unknown id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/transitions/au1unknown",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("Programs", () => {
  it("GET /programs/:programId returns program", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/programs/credits.aleo",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.program_id).toBe("credits.aleo");
    expect(body.data.edition).toBe(0);
  });

  it("GET /programs/:programId returns 404 for unknown program", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/programs/unknown.aleo",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("Error Format", () => {
  it("returns consistent error format", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/blocks/99999",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBeDefined();
  });
});
