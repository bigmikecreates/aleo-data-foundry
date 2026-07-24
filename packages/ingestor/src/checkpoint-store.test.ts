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

  it("returns null for missing file", async () => {
    const store = new CheckpointStore(join(tmpDir, "nonexistent.json"));
    const result = await store.load();
    expect(result).toBeNull();
  });

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
});
