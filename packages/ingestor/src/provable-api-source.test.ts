import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProvableApiSource } from "./provable-api-source.js";
import { ApiError } from "./errors.js";
import type { NetworkConfig } from "@aleo-foundry/shared";

const mockConfig: NetworkConfig = {
  network: "testnet",
  apiBaseUrl: "https://api.provable.com/v2/testnet",
  rateLimit: {
    requestsPerSecond: 5,
    requestsPerDay: 100_000,
  },
};

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

describe("ProvableApiSource", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getLatestHeight returns a number", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve("12345"),
    }));

    const source = new ProvableApiSource(mockConfig);
    const height = await source.getLatestHeight();
    expect(height).toBe(12345);
  });

  it("getBlock returns a parsed block", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBlock),
    }));

    const source = new ProvableApiSource(mockConfig);
    const block = await source.getBlock(12345);
    expect(block.block_hash).toBe(mockBlock.block_hash);
  });

  it("throws ApiError on 4xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const source = new ProvableApiSource(mockConfig);
    await expect(source.getBlock(999)).rejects.toThrow(ApiError);
  });

  it("retries on 5xx", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve("12345"),
      });
    }));

    const source = new ProvableApiSource(mockConfig);
    const height = await source.getLatestHeight();
    expect(height).toBe(12345);
    expect(callCount).toBe(3);
  });
});
