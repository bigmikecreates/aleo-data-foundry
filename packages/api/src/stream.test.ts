import { describe, it, expect } from "vitest";
import type { AddressInfo } from "node:net";
import { buildServer } from "./server.js";
import { createBlockStream, encodeBlockEvent } from "./stream.js";
import { extractBearerKey } from "./middleware/auth.js";
import type {
  BlockRepository,
  ChainMetadataRepository,
} from "@aleo-foundry/db";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function createMetaRepo(latest: number): ChainMetadataRepository {
  return {
    async upsert() {
      throw new Error("Not implemented in tests");
    },
    async findByNetwork(_network: string) {
      return {
        network: "testnet",
        latest_height: latest,
        latest_hash: "ab123",
        updated_at: "2024-06-03T12:00:00.000Z",
      };
    },
  } as unknown as ChainMetadataRepository;
}

function createBlockRepo(maxHeight: number): BlockRepository {
  return {
    async insert() {
      throw new Error("Not implemented in tests");
    },
    async findByHeight(height: number) {
      if (height < 1 || height > maxHeight) return null;
      return { height, block_hash: `b${height}` };
    },
    async findAll(limit: number, _cursor?: number) {
      return [];
    },
  } as unknown as BlockRepository;
}

describe("extractBearerKey", () => {
  it("extracts a Bearer token", () => {
    expect(extractBearerKey("Bearer abc123")).toBe("abc123");
  });

  it("returns undefined for non-Bearer header", () => {
    expect(extractBearerKey("Basic dXNlcjpwYXNz")).toBeUndefined();
  });

  it("returns undefined for empty header", () => {
    expect(extractBearerKey(undefined)).toBeUndefined();
  });

  it("returns undefined for empty token", () => {
    expect(extractBearerKey("Bearer   ")).toBeUndefined();
  });
});

describe("encodeBlockEvent", () => {
  it("serializes bigint fields to strings", () => {
    const event = encodeBlockEvent(
      { height: 7, details: { amount: 10n } },
      7,
    );

    expect(event).toContain("event: block");
    expect(event).toContain("id: 7");
    expect(event).toContain('"details":{"amount":"10"}');
  });
});

describe("createBlockStream", () => {
  it("emits the latest block on connect, then new blocks", async () => {
    let latest = 3;
    const chunks: string[] = [];
    const metaRepo = {
      async findByNetwork(): Promise<{ latest_height: number } | null> {
        return { latest_height: latest };
      },
    } as unknown as ChainMetadataRepository;
    const blockRepo = {
      async findByHeight(height: number) {
        return height >= 1 && height <= latest ? { height } : null;
      },
    } as unknown as BlockRepository;

    const stop = createBlockStream({
      network: "testnet",
      chainMetadataRepository: metaRepo,
      blockRepository: blockRepo,
      intervalMs: 5,
      write: (chunk) => chunks.push(chunk),
    });

    await sleep(20);
    latest = 4;
    await sleep(15);
    stop();

    const all = chunks.join("");
    expect(all).toContain("event: block");
    expect(all).toContain('"height":3');
    expect(all).toContain('"height":4');
    expect(all).toContain("id: 3");
  });

  it("resumes from Last-Event-ID cursor without replaying", async () => {
    const chunks: string[] = [];
    const metaRepo = createMetaRepo(5);
    const blockRepo = createBlockRepo(5);

    const stop = createBlockStream({
      network: "testnet",
      chainMetadataRepository: metaRepo,
      blockRepository: blockRepo,
      intervalMs: 5,
      initialCursor: 3,
      write: (chunk) => chunks.push(chunk),
    });

    await sleep(15);
    stop();

    const all = chunks.join("");
    expect(all).not.toContain('"height":3');
    expect(all).toContain('"height":4');
    expect(all).toContain('"height":5');
  });

  it("emits nothing when no chain metadata exists", async () => {
    const chunks: string[] = [];
    const metaRepo = {
      async findByNetwork(): Promise<null> {
        return null;
      },
    } as unknown as ChainMetadataRepository;

    const stop = createBlockStream({
      network: "testnet",
      chainMetadataRepository: metaRepo,
      blockRepository: createBlockRepo(5),
      intervalMs: 5,
      write: (chunk) => chunks.push(chunk),
    });

    await sleep(20);
    stop();

    expect(chunks).toEqual([]);
  });

  it("stops ticking after cancel is called", async () => {
    const chunks: string[] = [];
    const metaRepo = createMetaRepo(10);

    const stop = createBlockStream({
      network: "testnet",
      chainMetadataRepository: metaRepo,
      blockRepository: createBlockRepo(10),
      intervalMs: 5,
      write: (chunk) => chunks.push(chunk),
    });

    await sleep(3);
    const countAfterStart = chunks.length;
    stop();
    await sleep(20);

    expect(chunks.length).toBe(countAfterStart);
  });
});

describe("GET /stream/blocks route", () => {
  it("streams block events over real HTTP and requires auth", async () => {
    const app = await buildServer({
      blockRepository: createBlockRepo(4) as BlockRepository,
      transactionRepository: {} as never,
      transitionRepository: {} as never,
      programRepository: {} as never,
      mappingChangeRepository: {} as never,
      feeRepository: {} as never,
      chainMetadataRepository: createMetaRepo(4),
      apiKeys: ["route-key"],
      streamIntervalMs: 10,
    });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const port = (app.server.address() as AddressInfo).port;

    try {
      const noAuth = await fetch(
        `http://127.0.0.1:${port}/stream/blocks?network=testnet`,
      );
      expect(noAuth.status).toBe(401);

      const ctrl = new AbortController();
      const res = await fetch(
        `http://127.0.0.1:${port}/stream/blocks?network=testnet`,
        {
          headers: { authorization: "Bearer route-key" },
          signal: ctrl.signal,
        },
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";
      const deadline = Date.now() + 3000;
      while (!text.includes("event: block") && Date.now() < deadline) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      ctrl.abort();

      expect(text).toContain("event: block");
      expect(text).toContain('"height":4');
    } finally {
      await app.close();
    }
  }, 10000);
});