import { describe, it, expect, vi } from "vitest";
import {
  ParallelBlockFetcher,
  type BlockFetchResult,
} from "./parallel-block-fetcher.js";
import { RateLimiter } from "./rate-limiter.js";
import { ApiError, RateLimitError } from "./errors.js";
import type {
  ChainSource,
  ProvableBlockResponse,
  ProvableTransactionResponse,
} from "@aleo-foundry/shared";

const mockBlock = {
  block_hash: "ab17uppp4gpxysdduzexch5gekkg09lxsdsswmpllxp0028sv2xvczsc2zv99",
  previous_hash: "ab1h8wss9hvagjafrmqpfael2ka8sp9ujhlwm3cxy7dj90xpn2905zsjgfg94",
  header: {
    previous_state_root:
      "sr1fthuyd9qhswzlkd6f9jxsqpjdj6j4nfnzx02z6x4uj9wpefn4qqqatzzpk",
    transactions_root:
      "5921516920880609316862456430090842775173766057023337047347451140512518961075field",
    finalize_root:
      "6782937905510142338894567209948077657217225961237793603538433212746202312880field",
    ratifications_root:
      "4710405186992022735262004958522644990224161834463249249031636047654518734485field",
    solutions_root: "0field",
    subdag_root:
      "2786039085244220585595328072521002856783567900190360046892230183363703801925field",
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
    getTransaction: vi
      .fn()
      .mockResolvedValue(mockBlock as unknown as ProvableTransactionResponse),
    getProgram: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function blockWithDelay(delayMs: number) {
  return (h: number): Promise<ProvableBlockResponse> =>
    new Promise((resolve) =>
      setTimeout(() => resolve(blockAt(h)), delayMs),
    );
}

describe("ParallelBlockFetcher", () => {
  it("delivers results strictly in height order despite out-of-order fetch completion", async () => {
    const source = createSource({
      getBlock: (h: number) =>
        h === 0
          ? blockWithDelay(30)(h)
          : blockWithDelay(5)(h),
    });

    const fetcher = new ParallelBlockFetcher(source, {
      maxConcurrency: 4,
      maxBlockRetries: 1,
    });
    const heights: number[] = [];

    await fetcher.fetchRange(0, 5, async (result) => {
      heights.push(result.height);
    });

    expect(heights).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("never exceeds the configured concurrency under a slow handler", async () => {
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

    const fetcher = new ParallelBlockFetcher(source, {
      maxConcurrency: 2,
      maxBlockRetries: 1,
    });
    const emitted: number[] = [];

    await fetcher.fetchRange(0, 8, async (result) => {
      emitted.push(result.height);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(peak).toBeLessThanOrEqual(2);
    expect(emitted).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("skips a height after exhausting 5xx retries and continues", async () => {
    const source = createSource({
      getBlock: vi.fn().mockImplementation((h: number) => {
        if (h === 2) {
          return Promise.reject(new ApiError(500, "boom"));
        }
        return Promise.resolve(blockAt(h));
      }),
    });

    const fetcher = new ParallelBlockFetcher(source, {
      maxConcurrency: 2,
      maxBlockRetries: 1,
    });
    const results: BlockFetchResult[] = [];

    await fetcher.fetchRange(0, 3, async (result) => {
      results.push(result);
    });

    expect(results).toHaveLength(4);
    expect(results[2].height).toBe(2);
    expect(results[2].data).toBeNull();
    expect(results[0].data?.block.block_hash).toBe("hash_0");
  });

  it("treats 404 as a block that does not exist (null)", async () => {
    const source = createSource({
      getBlock: vi.fn().mockRejectedValue(new ApiError(404, "Not found")),
    });

    const fetcher = new ParallelBlockFetcher(source, {
      maxConcurrency: 3,
      maxBlockRetries: 1,
    });
    const results: BlockFetchResult[] = [];

    await fetcher.fetchRange(0, 1, async (result) => {
      results.push(result);
    });

    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.data).toBeNull();
    }
  });

  it("treats transactions 404 as an empty list", async () => {
    const source = createSource({
      getBlockTransactions: vi
        .fn()
        .mockRejectedValue(new ApiError(404, "Not found")),
    });

    const fetcher = new ParallelBlockFetcher(source, {
      maxConcurrency: 2,
      maxBlockRetries: 1,
    });
    const results: BlockFetchResult[] = [];

    await fetcher.fetchRange(0, 1, async (result) => {
      results.push(result);
    });

    expect(results[0].data?.transactions).toEqual([]);
  });

  it("rejects the whole batch on a non-retryable 4xx", async () => {
    const source = createSource({
      getBlock: vi.fn().mockImplementation((h: number) => {
        if (h === 3) {
          return Promise.reject(new ApiError(403, "Forbidden"));
        }
        return Promise.resolve(blockAt(h));
      }),
    });

    const fetcher = new ParallelBlockFetcher(source, {
      maxConcurrency: 3,
      maxBlockRetries: 1,
    });

    await expect(fetcher.fetchRange(0, 3, async () => {})).rejects.toThrow(
      ApiError,
    );
  });

  it("propagates RateLimitError", async () => {
    const source = createSource({
      getBlock: vi
        .fn()
        .mockRejectedValue(new RateLimitError("daily quota exhausted")),
    });

    const fetcher = new ParallelBlockFetcher(source, {
      maxConcurrency: 2,
      maxBlockRetries: 1,
    });

    await expect(fetcher.fetchRange(0, 1, async () => {})).rejects.toThrow(
      RateLimitError,
    );
  });

  it("applies the shared rate limiter to every request", async () => {
    const limiter = new RateLimiter({
      requestsPerSecond: 100,
      requestsPerDay: 100000,
    });
    const spy = vi.spyOn(limiter, "acquire");

    const source = createSource();
    const fetcher = new ParallelBlockFetcher(source, {
      maxConcurrency: 2,
      maxBlockRetries: 1,
      rateLimit: limiter,
    });

    await fetcher.fetchRange(0, 4, async () => {});

    // 5 heights x 2 requests (block + transactions) = 10 acquires
    expect(spy).toHaveBeenCalledTimes(10);
  });

  it("propagates onResult errors and aborts remaining deliveries", async () => {
    const source = createSource();
    const fetcher = new ParallelBlockFetcher(source, {
      maxConcurrency: 4,
      maxBlockRetries: 1,
    });
    const delivered: number[] = [];

    await expect(
      fetcher.fetchRange(0, 5, async (result) => {
        delivered.push(result.height);
        if (result.height === 1) {
          throw new Error("publish failed");
        }
      }),
    ).rejects.toThrow("publish failed");

    // No deliveries past the failure point
    expect(delivered.includes(2)).toBe(false);
  });

  it("returns start-1 when the range is empty", async () => {
    const source = createSource();
    const fetcher = new ParallelBlockFetcher(source, { maxConcurrency: 2 });

    let onResultCalled = false;
    const last = await fetcher.fetchRange(5, 3, async () => {
      onResultCalled = true;
    });

    expect(last).toBe(4);
    expect(onResultCalled).toBe(false);
  });

  it("rejects invalid concurrency", () => {
    expect(
      () => new ParallelBlockFetcher(createSource(), { maxConcurrency: 0 }),
    ).toThrow();
    expect(
      () => new ParallelBlockFetcher(createSource(), { maxConcurrency: 1.5 }),
    ).toThrow();
  });
});