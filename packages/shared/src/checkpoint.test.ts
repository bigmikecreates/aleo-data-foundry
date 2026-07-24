import { describe, it, expect } from "vitest";
import { CheckpointSchema, createCheckpoint } from "./checkpoint.js";

describe("CheckpointSchema", () => {
  it("parses a valid checkpoint", () => {
    const result = CheckpointSchema.safeParse({
      source: "provable-api",
      network: "testnet",
      lastHeight: 12345,
      lastHash: "ab17upp",
      updatedAt: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty source", () => {
    const result = CheckpointSchema.safeParse({
      source: "",
      network: "testnet",
      lastHeight: 12345,
      lastHash: "ab17upp",
      updatedAt: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid network", () => {
    const result = CheckpointSchema.safeParse({
      source: "provable-api",
      network: "devnet",
      lastHeight: 12345,
      lastHash: "ab17upp",
      updatedAt: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCheckpoint", () => {
  it("creates a checkpoint with current timestamp", () => {
    const cp = createCheckpoint("provable-api", "testnet", 12345, "ab17upp");
    expect(cp.source).toBe("provable-api");
    expect(cp.network).toBe("testnet");
    expect(cp.lastHeight).toBe(12345);
    expect(cp.lastHash).toBe("ab17upp");
    expect(cp.updatedAt).toBeDefined();
    // Should be a valid ISO timestamp
    expect(new Date(cp.updatedAt).toISOString()).toBe(cp.updatedAt);
  });

  it("creates a checkpoint that passes schema validation", () => {
    const cp = createCheckpoint("snarkos-node", "mainnet", 0, "genesis_hash");
    const result = CheckpointSchema.safeParse(cp);
    expect(result.success).toBe(true);
  });
});
