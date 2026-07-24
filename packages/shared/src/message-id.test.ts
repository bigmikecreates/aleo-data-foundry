import { describe, it, expect } from "vitest";
import { messageId } from "./message-id.js";

describe("messageId", () => {
  it("returns a 16-character hex string", () => {
    const id = messageId("testnet", "block", "12345:abc123");
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic — same inputs produce same output", () => {
    const id1 = messageId("testnet", "block", "12345:abc123");
    const id2 = messageId("testnet", "block", "12345:abc123");
    expect(id1).toBe(id2);
  });

  it("different inputs produce different outputs", () => {
    const id1 = messageId("testnet", "block", "12345:abc123");
    const id2 = messageId("testnet", "block", "12346:abc123");
    const id3 = messageId("mainnet", "block", "12345:abc123");
    const id4 = messageId("testnet", "transaction", "12345:abc123");

    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).not.toBe(id4);
  });

  it("works with empty-ish keys", () => {
    const id = messageId("testnet", "block", "0:");
    expect(id).toHaveLength(16);
  });
});
