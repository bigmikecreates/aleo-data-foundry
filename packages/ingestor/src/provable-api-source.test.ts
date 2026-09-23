import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── getLatestHeight ────────────────────────────────────────

  it("getLatestHeight returns a number", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve("12345"),
    }));

    const source = new ProvableApiSource(mockConfig);
    const height = await source.getLatestHeight();
    expect(height).toBe(12345);
  });

  it("getLatestHeight calls correct URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve("42"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const source = new ProvableApiSource(mockConfig);
    await source.getLatestHeight();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.provable.com/v2/testnet/height",
      expect.any(Object),
    );
  });

  // ─── getBlock ───────────────────────────────────────────────

  it("getBlock returns a parsed block", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBlock),
    }));

    const source = new ProvableApiSource(mockConfig);
    const block = await source.getBlock(12345);
    expect(block.block_hash).toBe(mockBlock.block_hash);
  });

  it("getBlock accepts string height (hash lookup)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBlock),
    }));

    const source = new ProvableApiSource(mockConfig);
    const block = await source.getBlock("some_hash");
    expect(block.block_hash).toBe(mockBlock.block_hash);
  });

  it("getBlock calls correct URL with height", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBlock),
    });
    vi.stubGlobal("fetch", fetchMock);

    const source = new ProvableApiSource(mockConfig);
    await source.getBlock(999);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.provable.com/v2/testnet/block/999",
      expect.any(Object),
    );
  });

  // ─── getBlockTransactions ───────────────────────────────────

  it("getBlockTransactions returns parsed transactions", async () => {
    const txResponse = {
      type: "execute",
      id: "tx123",
      execution: {
        transitions: [{
          id: "tr123",
          program: "credits.aleo",
          function: "transfer_private",
          inputs: [{ type: "private", id: "in1", value: "100u64" }],
          outputs: [{ type: "private", id: "out1", value: "100u64" }],
          tpk: "tpk123",
          tcm: "tcm123",
        }],
        global_state_root: "gsr123",
        proof: "proof123",
      },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transactions: [txResponse] }),
    }));

    const source = new ProvableApiSource(mockConfig);
    const txs = await source.getBlockTransactions(12345);

    expect(txs).toHaveLength(1);
    expect(txs[0].id).toBe("tx123");
  });

  it("getBlockTransactions handles empty transactions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transactions: [] }),
    }));

    const source = new ProvableApiSource(mockConfig);
    const txs = await source.getBlockTransactions(12345);

    expect(txs).toHaveLength(0);
  });

  it("getBlockTransactions handles multiple transactions", async () => {
    const tx1 = { type: "execute", id: "tx1" };
    const tx2 = { type: "deploy", id: "tx2", deploy: {} };
    const tx3 = { type: "execute", id: "tx3" };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transactions: [tx1, tx2, tx3] }),
    }));

    const source = new ProvableApiSource(mockConfig);
    const txs = await source.getBlockTransactions(12345);

    expect(txs).toHaveLength(3);
    expect(txs[0].id).toBe("tx1");
    expect(txs[1].id).toBe("tx2");
    expect(txs[2].id).toBe("tx3");
  });

  it("getBlockTransactions throws on invalid transaction", async () => {
    const invalidTx = { invalid: true };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transactions: [invalidTx] }),
    }));

    const source = new ProvableApiSource(mockConfig);
    await expect(source.getBlockTransactions(12345)).rejects.toThrow(ApiError);
  });

  it("getBlockTransactions calls correct URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ transactions: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const source = new ProvableApiSource(mockConfig);
    await source.getBlockTransactions(42);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.provable.com/v2/testnet/block/42/transactions",
      expect.any(Object),
    );
  });

  // ─── getTransaction ─────────────────────────────────────────

  it("getTransaction returns parsed transaction", async () => {
    const tx = {
      type: "execute",
      id: "tx456",
      execution: {
        transitions: [],
        global_state_root: "gsr",
        proof: "proof",
      },
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(tx),
    }));

    const source = new ProvableApiSource(mockConfig);
    const result = await source.getTransaction("tx456");

    expect(result.id).toBe("tx456");
  });

  it("getTransaction calls correct URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ type: "execute", id: "abc" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const source = new ProvableApiSource(mockConfig);
    await source.getTransaction("abc");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.provable.com/v2/testnet/transaction/abc",
      expect.any(Object),
    );
  });

  it("getTransaction throws on invalid response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ missing: "fields" }),
    }));

    const source = new ProvableApiSource(mockConfig);
    await expect(source.getTransaction("bad")).rejects.toThrow(ApiError);
  });

  // ─── getProgram ─────────────────────────────────────────────

  it("getProgram returns raw data", async () => {
    const programData = { id: "credits.aleo" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(programData),
    }));

    const source = new ProvableApiSource(mockConfig);
    const result = await source.getProgram("credits.aleo");

    expect(result).toEqual(programData);
  });

  it("getProgram calls correct URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const source = new ProvableApiSource(mockConfig);
    await source.getProgram("token.aleo");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.provable.com/v2/testnet/program/token.aleo",
      expect.any(Object),
    );
  });

  // ─── Error handling ─────────────────────────────────────────

  it("throws ApiError on 4xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const source = new ProvableApiSource(mockConfig);
    await expect(source.getBlock(999)).rejects.toThrow(ApiError);
  });

  it("throws ApiError with correct status code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const source = new ProvableApiSource(mockConfig);
    try {
      await source.getBlock(999);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(404);
    }
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
  }, 10000);

  it("gives up after max retries on persistent 5xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }));

    const source = new ProvableApiSource(mockConfig);
    await expect(source.getBlock(1)).rejects.toThrow(ApiError);
  }, 10000);

  it("does not retry on 400-level errors", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({ ok: false, status: 422 });
    }));

    const source = new ProvableApiSource(mockConfig);
    await expect(source.getBlock(1)).rejects.toThrow(ApiError);
    expect(callCount).toBe(1);
  });

  it("retries on network errors", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 2) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve("999"),
      });
    }));

    const source = new ProvableApiSource(mockConfig);
    const height = await source.getLatestHeight();
    expect(height).toBe(999);
    expect(callCount).toBe(2);
  }, 10000);

  it("retries on 429 rate limit errors", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 429 });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve("500"),
      });
    }));

    const source = new ProvableApiSource(mockConfig);
    const height = await source.getLatestHeight();

    expect(height).toBe(500);
    expect(callCount).toBe(2);
  }, 10000);

  it("retries multiple times on persistent 429 then gives up", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    }));

    const source = new ProvableApiSource(mockConfig);
    await expect(source.getLatestHeight()).rejects.toThrow(ApiError);
  }, 10000);

  // ─── Mainnet config ─────────────────────────────────────────

  it("works with mainnet config", async () => {
    const mainnetConfig: NetworkConfig = {
      network: "mainnet",
      apiBaseUrl: "https://api.provable.com/v2/mainnet",
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerDay: 100_000,
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve("50000"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const source = new ProvableApiSource(mainnetConfig);
    const height = await source.getLatestHeight();

    expect(height).toBe(50000);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.provable.com/v2/mainnet/height",
      expect.any(Object),
    );
  });
});
