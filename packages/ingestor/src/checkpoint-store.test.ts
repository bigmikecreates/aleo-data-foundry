import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CheckpointStore } from "./checkpoint-store.js";

describe("CheckpointStore", () => {
  const tmpDir = join(tmpdir(), "checkpoint-store-test");
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
  });

  // ─── Load ───────────────────────────────────────────────────

  it("returns null for missing file", async () => {
    const store = new CheckpointStore(join(tmpDir, "nonexistent.json"));
    const result = await store.load();
    expect(result).toBeNull();
  });

  it("returns null for corrupted file", async () => {
    const store = new CheckpointStore(filePath);
    await writeFile(filePath, "not valid json {{{", "utf-8");
    const result = await store.load();
    expect(result).toBeNull();
  });

  it("returns null for invalid checkpoint schema", async () => {
    const store = new CheckpointStore(filePath);
    await writeFile(filePath, JSON.stringify({ invalid: true }), "utf-8");
    const result = await store.load();
    expect(result).toBeNull();
  });

  it("returns null for partial checkpoint (missing required fields)", async () => {
    const store = new CheckpointStore(filePath);
    await writeFile(
      filePath,
      JSON.stringify({ source: "test", network: "testnet" }),
      "utf-8",
    );
    const result = await store.load();
    expect(result).toBeNull();
  });

  it("rejects invalid network name", async () => {
    const store = new CheckpointStore(filePath);
    await writeFile(
      filePath,
      JSON.stringify({
        source: "provable-api",
        network: "devnet",
        lastHeight: 100,
        lastHash: "abc",
        updatedAt: "2024-01-01T00:00:00Z",
      }),
      "utf-8",
    );
    const result = await store.load();
    expect(result).toBeNull();
  });

  it("rejects negative height", async () => {
    const store = new CheckpointStore(filePath);
    await writeFile(
      filePath,
      JSON.stringify({
        source: "provable-api",
        network: "testnet",
        lastHeight: -1,
        lastHash: "abc",
        updatedAt: "2024-01-01T00:00:00Z",
      }),
      "utf-8",
    );
    const result = await store.load();
    expect(result).toBeNull();
  });

  // ─── Save and Load ──────────────────────────────────────────

  it("saves and loads checkpoint", async () => {
    const store = new CheckpointStore(filePath);
    const checkpoint = {
      source: "provable-api",
      network: "testnet" as const,
      lastHeight: 12345,
      lastHash: "ab17upp",
      updatedAt: "2024-06-03T12:00:00Z",
    };

    await store.save(checkpoint);
    const loaded = await store.load();

    expect(loaded).toEqual(checkpoint);
  });

  it("overwrites existing checkpoint", async () => {
    const store = new CheckpointStore(filePath);

    await store.save({
      source: "provable-api",
      network: "testnet",
      lastHeight: 100,
      lastHash: "hash1",
      updatedAt: "2024-06-03T12:00:00Z",
    });

    await store.save({
      source: "provable-api",
      network: "testnet",
      lastHeight: 200,
      lastHash: "hash2",
      updatedAt: "2024-06-03T13:00:00Z",
    });

    const loaded = await store.load();
    expect(loaded?.lastHeight).toBe(200);
    expect(loaded?.lastHash).toBe("hash2");
  });

  it("creates parent directories if they don't exist", async () => {
    const nestedPath = join(tmpDir, "deep", "nested", "checkpoint.json");
    const store = new CheckpointStore(nestedPath);

    await store.save({
      source: "provable-api",
      network: "mainnet",
      lastHeight: 500,
      lastHash: "hash500",
      updatedAt: "2024-06-03T12:00:00Z",
    });

    const loaded = await store.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.lastHeight).toBe(500);
    expect(loaded?.network).toBe("mainnet");
  });

  it("saves valid JSON to disk", async () => {
    const store = new CheckpointStore(filePath);

    await store.save({
      source: "provable-api",
      network: "testnet",
      lastHeight: 42,
      lastHash: "hash42",
      updatedAt: "2024-06-03T12:00:00Z",
    });

    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);

    expect(parsed.source).toBe("provable-api");
    expect(parsed.network).toBe("testnet");
    expect(parsed.lastHeight).toBe(42);
    expect(parsed.lastHash).toBe("hash42");
  });

  it("handles mainnet checkpoints", async () => {
    const store = new CheckpointStore(filePath);

    await store.save({
      source: "provable-api",
      network: "mainnet",
      lastHeight: 999999,
      lastHash: "mainnet_hash",
      updatedAt: "2024-06-03T12:00:00Z",
    });

    const loaded = await store.load();
    expect(loaded?.network).toBe("mainnet");
    expect(loaded?.lastHeight).toBe(999999);
  });
});
