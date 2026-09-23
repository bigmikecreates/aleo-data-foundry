import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { unlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBackfill } from "./backfill.js";
import { CheckpointStore } from "./checkpoint-store.js";
import type {
  ChainSource,
  ProvableBlockResponse,
} from "@aleo-foundry/shared";

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

function blockAt(height: number): ProvableBlockResponse {
  return { ...mockBlock, block_hash: `hash_${height}` };
}

function createSource(overrides: Partial<ChainSource> = {}): ChainSource {
  return {
    getLatestHeight: vi.fn().mockResolvedValue(0),
    getBlock: vi.fn().mockImplementation((h: number) =>
      Promise.resolve(blockAt(h)),
    ),
    getBlockTransactions: vi.fn().mockResolvedValue([]),
    getTransaction: vi.fn().mockResolvedValue(mockBlock as any),
    getProgram: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("runBackfill", () => {
  const tmpDir = join(tmpdir(), "backfill-test");
  const filePath = join(tmpDir, "range.json");

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

  it("ingests a full range in order and checkpoints to the end", async () => {
    const source = createSource({
      getLatestHeight: vi.fn().mockResolvedValue(100),
      getBlock: vi.fn().mockImplementation((h: number) =>
        Promise.resolve(blockAt(h)),
      ),
    });
    const store = new CheckpointStore(filePath);
    const heights: number[] = [];

    const finalHeight = await runBackfill({
      source,
      checkpointStore: store,
      network: "testnet",
      start: 5,
      end: 7,
      maxConcurrency: 2,
      onBlock: async (data) => {
        heights.push(data.height);
      },
    });

    expect(heights).toEqual([5, 6, 7]);
    expect(finalHeight).toBe(7);
    const checkpoint = await store.load();
    expect(checkpoint!.lastHeight).toBe(7);
    expect(checkpoint!.lastHash).toBe("hash_7");
    expect(checkpoint!.network).toBe("testnet");
  });

  it("defaults end to the chain head", async () => {
    const source = createSource({
      getLatestHeight: vi.fn().mockResolvedValue(9),
    });
    const store = new CheckpointStore(filePath);
    const heights: number[] = [];

    const finalHeight = await runBackfill({
      source,
      checkpointStore: store,
      network: "testnet",
      start: 7,
      maxConcurrency: 2,
      onBlock: async (data) => {
        heights.push(data.height);
      },
    });

    expect(heights).toEqual([7, 8, 9]);
    expect(finalHeight).toBe(9);
  });

  it("resumes from a saved checkpoint within the range", async () => {
    const store = new CheckpointStore(filePath);
    await store.save({
      source: "backfill",
      network: "testnet",
      lastHeight: 6,
      lastHash: "hash_6",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    const source = createSource();
    const heights: number[] = [];

    const finalHeight = await runBackfill({
      source,
      checkpointStore: store,
      network: "testnet",
      start: 5,
      end: 8,
      maxConcurrency: 2,
      onBlock: async (data) => {
        heights.push(data.height);
      },
    });

    expect(heights).toEqual([7, 8]);
    expect(finalHeight).toBe(8);
  });

  it("resumes after an interrupted run (partial checkpoint)", async () => {
    const source = createSource();
    const store = new CheckpointStore(filePath);

    const firstHeights: number[] = [];
    await expect(
      runBackfill({
        source,
        checkpointStore: store,
        network: "testnet",
        start: 5,
        end: 8,
        maxConcurrency: 3,
        onBlock: async (data) => {
          firstHeights.push(data.height);
          if (data.height === 7) {
            throw new Error("interrupted");
          }
        },
      }),
    ).rejects.toThrow("interrupted");

    expect(firstHeights).toEqual([5, 6, 7]);
    const checkpoint = await store.load();
    expect(checkpoint!.lastHeight).toBe(6);

    const secondHeights: number[] = [];
    const finalHeight = await runBackfill({
      source,
      checkpointStore: store,
      network: "testnet",
      start: 5,
      end: 8,
      maxConcurrency: 3,
      onBlock: async (data) => {
        secondHeights.push(data.height);
      },
    });

    expect(secondHeights).toEqual([7, 8]);
    expect(finalHeight).toBe(8);
  });

  it("no-ops when the range is already fully checkpointed", async () => {
    const store = new CheckpointStore(filePath);
    await store.save({
      source: "backfill",
      network: "testnet",
      lastHeight: 8,
      lastHash: "hash_8",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    const source = createSource();
    const onBlock = vi.fn();

    const finalHeight = await runBackfill({
      source,
      checkpointStore: store,
      network: "testnet",
      start: 5,
      end: 8,
      onBlock,
    });

    expect(finalHeight).toBe(8);
    expect(onBlock).not.toHaveBeenCalled();
  });

  it("reports progress for every height", async () => {
    const source = createSource();
    const store = new CheckpointStore(filePath);
    const progress: { completed: number; total: number }[] = [];

    await runBackfill({
      source,
      checkpointStore: store,
      network: "testnet",
      start: 2,
      end: 4,
      maxConcurrency: 2,
      onBlock: async () => {},
      onProgress: (p) => progress.push(p),
    });

    expect(progress).toEqual([
      { completed: 1, total: 3, currentHeight: 2 },
      { completed: 2, total: 3, currentHeight: 3 },
      { completed: 3, total: 3, currentHeight: 4 },
    ]);
  });

  it("rejects a range where start exceeds end", async () => {
    const source = createSource();
    const store = new CheckpointStore(filePath);

    await expect(
      runBackfill({
        source,
        checkpointStore: store,
        network: "testnet",
        start: 10,
        end: 5,
        maxConcurrency: 2,
        onBlock: async () => {},
      }),
    ).rejects.toThrow("start (10) exceeds end (5)");
  });

  it("applies bounded concurrency", async () => {
    let inflight = 0;
    let peak = 0;
    const source = createSource({
      getBlock: vi.fn().mockImplementation(async (h: number) => {
        inflight++;
        peak = Math.max(peak, inflight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inflight--;
        return blockAt(h);
      }),
    });
    const store = new CheckpointStore(filePath);

    await runBackfill({
      source,
      checkpointStore: store,
      network: "testnet",
      start: 0,
      end: 20,
      maxConcurrency: 3,
      maxBlockRetries: 1,
      onBlock: async () => {},
    });

    expect(peak).toBeLessThanOrEqual(3);
  });
});