import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFile, unlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Poller, type BlockData } from "./poller.js";
import { CheckpointStore } from "./checkpoint-store.js";
import { ApiError, RateLimitError } from "./errors.js";
import type {
  ChainSource,
  ProvableBlockResponse,
  ProvableTransactionResponse,
} from "@aleo-foundry/shared";

// ─── Mock Data ────────────────────────────────────────────────────

const mockBlock = {
  block_hash: "ab17uppp4gpxysdduzexch5gekkg09lxsdsswmpllxp0028sv2xvczsc2zv99",
  previous_hash: "ab1h8wss9hvagjafrmqpfael2ka8sp9ujhlwm3cxy7dj90xpn2905zsjgfg94",
  header: {
    previous_state_root: "sr1fthuyd9qhswzlkd6f9jxsqpjdj6j4nfnzx02z6x4uj9wpefn4qqqatzzpk",
    transactions_root: "5921516920880609316862456430090842775173766057023337047347451140512518961075field",
    finalize_root: "6782937905510142338894567209948077657217225961237793603538433212746202312880field",
    ratifications_root: "4710405186992022735262004958522644990224161834463249249031636047654518734485field",
    solutions_root: "0field",
    subdag_root: "2786039085244220585595328072521002856783567900190360046892230183363703801925field",
    metadata: {
      network: 3,
      round: "5925654",
      coinbase_target: "4294967295",
      proof_target: "4294967295",
      last_coinbase_target: "4294967295",
      last_coinbase_ratio: "1000000",
      timestamp: "1717328209",
    },
  },
  transactions: [],
};

function makeBlockWithHeight(height: number): ProvableBlockResponse {
  return { ...mockBlock, block_hash: `hash_for_${height}` };
}

function createMockSource(
  overrides: Partial<ChainSource> = {},
): ChainSource {
  return {
    getLatestHeight: vi.fn().mockResolvedValue(0),
    getBlock: vi.fn().mockResolvedValue(mockBlock),
    getBlockTransactions: vi.fn().mockResolvedValue([]),
    getTransaction: vi.fn().mockResolvedValue(mockBlock as any),
    getProgram: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe("Poller", () => {
  const tmpDir = join(tmpdir(), "poller-test");
  const filePath = join(tmpDir, "checkpoint.json");

  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await unlink(filePath);
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  describe("runOnce", () => {
    it("does nothing when already caught up", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(5),
      });
      const store = new CheckpointStore(filePath);
      const callback = vi.fn();

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 1000,
        startHeight: 10, // start > latest
      }, callback);

      const result = await poller.runOnce();

      expect(result).toBeNull();
      expect(callback).not.toHaveBeenCalled();
    });

    it("fetches blocks from startHeight when no checkpoint", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(2),
        getBlock: vi.fn().mockImplementation((h: number) =>
          Promise.resolve(makeBlockWithHeight(h)),
        ),
      });
      const store = new CheckpointStore(filePath);

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 1000,
        startHeight: 0,
      }, vi.fn());

      const result = await poller.runOnce();

      expect(result).toBe(2);
      // Block 0, 1, 2 = 3 blocks
      expect(source.getBlock).toHaveBeenCalledTimes(3);
    });

    it("resumes from checkpoint", async () => {
      const store = new CheckpointStore(filePath);
      await store.save({
        source: "provable-api",
        network: "testnet",
        lastHeight: 5,
        lastHash: "prev_hash",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(7),
        getBlock: vi.fn().mockImplementation((h: number) =>
          Promise.resolve(makeBlockWithHeight(h)),
        ),
      });

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 1000,
      }, vi.fn());

      const result = await poller.runOnce();

      expect(result).toBe(7);
      // Should fetch heights 6, 7
      expect(source.getBlock).toHaveBeenCalledTimes(2);
      expect(source.getBlock).toHaveBeenCalledWith(6);
      expect(source.getBlock).toHaveBeenCalledWith(7);
    });

    it("calls onBlock with correct data", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(1),
        getBlock: vi.fn().mockImplementation((h: number) =>
          Promise.resolve(makeBlockWithHeight(h)),
        ),
      });
      const store = new CheckpointStore(filePath);
      const blocks: BlockData[] = [];

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 1000,
        startHeight: 0,
      }, async (data) => {
        blocks.push(data);
      });

      await poller.runOnce();

      expect(blocks).toHaveLength(2);
      expect(blocks[0].height).toBe(0);
      expect(blocks[1].height).toBe(1);
    });

    it("saves checkpoint after each block", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(2),
        getBlock: vi.fn().mockImplementation((h: number) =>
          Promise.resolve(makeBlockWithHeight(h)),
        ),
      });
      const store = new CheckpointStore(filePath);

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 1000,
        startHeight: 0,
      }, vi.fn());

      await poller.runOnce();

      const checkpoint = await store.load();
      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.lastHeight).toBe(2);
      expect(checkpoint!.network).toBe("testnet");
      expect(checkpoint!.source).toBe("provable-api");
    });

    it("skips block after max retries on 5xx errors", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(2),
        getBlock: vi.fn().mockImplementation((h: number) => {
          if (h === 1) {
            return Promise.reject(new ApiError(500, "Server error"));
          }
          return Promise.resolve(makeBlockWithHeight(h));
        }),
        getBlockTransactions: vi.fn().mockImplementation((h: number) => {
          if (h === 1) {
            return Promise.reject(new ApiError(500, "Server error"));
          }
          return Promise.resolve([]);
        }),
      });
      const store = new CheckpointStore(filePath);
      const blocks: number[] = [];

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 100,
        startHeight: 0,
        maxBlockRetries: 1,
      }, async (data) => {
        blocks.push(data.height);
      });

      await poller.runOnce();

      // Should process block 0 and 2, skip block 1
      expect(blocks).toEqual([0, 2]);
    });

    it("throws on non-retryable 4xx errors (not 404)", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(1),
        getBlock: vi.fn().mockRejectedValue(new ApiError(403, "Forbidden")),
      });
      const store = new CheckpointStore(filePath);

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 1000,
        startHeight: 0,
      }, vi.fn());

      await expect(poller.runOnce()).rejects.toThrow(ApiError);
    });

    it("skips block on 404 without throwing", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(1),
        getBlock: vi.fn().mockImplementation((h: number) => {
          if (h === 0) {
            return Promise.resolve(makeBlockWithHeight(h));
          }
          return Promise.reject(new ApiError(404, "Not found"));
        }),
      });
      const store = new CheckpointStore(filePath);
      const blocks: number[] = [];

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 1000,
        startHeight: 0,
      }, async (data) => {
        blocks.push(data.height);
      });

      await poller.runOnce();

      expect(blocks).toEqual([0]);
    });

    it("retries on 5xx before skipping", async () => {
      let callCount = 0;
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(1),
        getBlock: vi.fn().mockImplementation((h: number) => {
          callCount++;
          if (callCount <= 2) {
            return Promise.reject(new ApiError(500, "Server error"));
          }
          return Promise.resolve(makeBlockWithHeight(h));
        }),
        getBlockTransactions: vi.fn().mockResolvedValue([]),
      });
      const store = new CheckpointStore(filePath);
      const blocks: number[] = [];

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 100,
        startHeight: 0,
        maxBlockRetries: 3,
      }, async (data) => {
        blocks.push(data.height);
      });

      await poller.runOnce();

      // Should succeed after 2 retries
      expect(blocks).toEqual([0, 1]);
    });

    it("retries transactions fetch on 5xx before success", async () => {
      let txCalls = 0;
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(0),
        getBlock: vi.fn().mockResolvedValue(makeBlockWithHeight(0)),
        getBlockTransactions: vi.fn().mockImplementation(() => {
          txCalls++;
          if (txCalls <= 2) {
            return Promise.reject(new ApiError(500, "Server error"));
          }
          return Promise.resolve([]);
        }),
      });
      const store = new CheckpointStore(filePath);
      const blocks: number[] = [];

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 100,
        startHeight: 0,
        maxBlockRetries: 3,
      }, async (data) => {
        blocks.push(data.height);
      });

      await poller.runOnce();

      // Succeeds after 2 retries
      expect(blocks).toEqual([0]);
      expect(txCalls).toBe(3);
    });

    it("rethrows when transactions fetch is exhausted instead of marking block processed", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(2),
        getBlock: vi.fn().mockImplementation((h: number) =>
          Promise.resolve(makeBlockWithHeight(h)),
        ),
        getBlockTransactions: vi.fn().mockRejectedValue(
          new ApiError(500, "Server error"),
        ),
      });
      const store = new CheckpointStore(filePath);

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 100,
        startHeight: 0,
        maxBlockRetries: 1,
      }, vi.fn());

      await expect(poller.runOnce()).rejects.toThrow(ApiError);

      // Block must not be marked processed
      const checkpoint = await store.load();
      expect(checkpoint).toBeNull();
    });

    it("treats block transactions 404 as empty", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(0),
        getBlock: vi.fn().mockResolvedValue(makeBlockWithHeight(0)),
        getBlockTransactions: vi.fn().mockRejectedValue(
          new ApiError(404, "Not found"),
        ),
      });
      const store = new CheckpointStore(filePath);
      const data: BlockData[] = [];

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 100,
        startHeight: 0,
      }, async (blockData) => {
        data.push(blockData);
      });

      await poller.runOnce();

      expect(data).toHaveLength(1);
      expect(data[0].transactions).toEqual([]);
    });
  });

  describe("start/stop", () => {
    it("can be stopped gracefully", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockResolvedValue(0),
      });
      const store = new CheckpointStore(filePath);

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 50,
      }, vi.fn());

      let started = false;
      const pollPromise = poller.start().then(() => {
        started = true;
      });

      // Let it run for a bit
      await new Promise((resolve) => setTimeout(resolve, 150));
      poller.stop();
      await pollPromise;

      expect(started).toBe(true);
    });

    it("throws on non-retryable errors during start", async () => {
      const source = createMockSource({
        getLatestHeight: vi.fn().mockRejectedValue(
          new ApiError(401, "Unauthorized"),
        ),
      });
      const store = new CheckpointStore(filePath);

      const poller = new Poller(source, store, {
        network: "testnet",
        source: "provable-api",
        pollingIntervalMs: 100,
      }, vi.fn());

      await expect(poller.start()).rejects.toThrow(ApiError);
    });
  });
});
