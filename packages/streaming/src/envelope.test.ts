import { describe, it, expect } from "vitest";
import {
  createEnvelope,
  encodeEnvelope,
  parseEnvelope,
  parseNormalizedPayload,
  EnvelopeParseError,
} from "./envelope.js";
import { messageId } from "@aleo-foundry/shared";

const BLOCK_ROW = {
  height: 1,
  block_hash: "b1",
  previous_hash: "b0",
  network: "testnet",
  timestamp: "2024-06-03T12:00:00.000Z",
  coinbase_target: "1",
  proof_target: "1",
  last_coinbase_target: "1",
  last_coinbase_ratio: "1",
  round: "1",
  transactions_root: "t",
  previous_state_root: "p",
  transactions_count: 0,
  aborted_transactions_count: 0,
  created_at: "2024-06-03T12:00:00.000Z",
};

describe("createEnvelope / encodeEnvelope", () => {
  it("includes schema version, entity, variant, network and payload", () => {
    const envelope = createEnvelope(
      "blocks",
      "normalized",
      "testnet",
      "abc123",
      BLOCK_ROW,
      "2024-06-03T12:00:00.000Z",
    );

    expect(envelope.schema_version).toBe(1);
    expect(envelope.entity).toBe("blocks");
    expect(envelope.variant).toBe("normalized");
    expect(envelope.network).toBe("testnet");
    expect(envelope.message_id).toBe("abc123");
    expect(envelope.payload).toEqual(BLOCK_ROW);
  });

  it("round-trips through JSON", () => {
    const envelope = createEnvelope("blocks", "raw", "testnet", "id", { x: 1 });
    const parsed = parseEnvelope(encodeEnvelope(envelope));
    expect(parsed).toEqual(envelope);
  });
});

describe("parseEnvelope", () => {
  it("parses a valid envelope", () => {
    const envelope = createEnvelope("blocks", "raw", "testnet", "id", { x: 1 });
    const parsed = parseEnvelope(JSON.stringify(envelope));
    expect(parsed).toMatchObject({ entity: "blocks", message_id: "id" });
  });

  it("rejects invalid JSON", () => {
    expect(() => parseEnvelope("not json")).toThrow(EnvelopeParseError);
  });

  it("rejects an empty message", () => {
    expect(() => parseEnvelope(null)).toThrow(EnvelopeParseError);
  });

  it("rejects an envelope with a missing schema version", () => {
    const raw = JSON.stringify({
      entity: "blocks",
      variant: "raw",
      network: "testnet",
      message_id: "id",
      event_timestamp: new Date().toISOString(),
      payload: {},
    });
    expect(() => parseEnvelope(raw)).toThrow(EnvelopeParseError);
  });

  it("rejects an envelope with an unknown entity", () => {
    const raw = JSON.stringify({
      schema_version: 1,
      entity: "widgets",
      variant: "raw",
      network: "testnet",
      message_id: "id",
      event_timestamp: new Date().toISOString(),
      payload: {},
    });
    expect(() => parseEnvelope(raw)).toThrow(EnvelopeParseError);
  });

  it("accepts a Buffer value", () => {
    const envelope = createEnvelope("blocks", "raw", "testnet", "id", {});
    const parsed = parseEnvelope(Buffer.from(JSON.stringify(envelope)));
    expect(parsed.message_id).toBe("id");
  });
});

describe("parseNormalizedPayload", () => {
  it("validates a block row payload", () => {
    const parsed = parseNormalizedPayload("blocks", BLOCK_ROW);
    expect(parsed).toMatchObject({ height: 1, block_hash: "b1" });
  });

  it("validates a chain-metadata payload", () => {
    const parsed = parseNormalizedPayload("chain-metadata", {
      network: "testnet",
      latest_height: 10,
      latest_hash: "h",
      updated_at: "2024-06-03T12:00:00.000Z",
    });
    expect(parsed).toMatchObject({ latest_height: 10 });
  });

  it("validates a deployments payload as a program row", () => {
    const parsed = parseNormalizedPayload("deployments", {
      program_id: "credits.aleo",
      network: "testnet",
      edition: 1,
      deployment_tx_id: "at1tx",
      deployed_at: "2024-06-03T12:00:00.000Z",
      created_at: "2024-06-03T12:00:00.000Z",
    });
    expect(parsed).toMatchObject({ program_id: "credits.aleo" });
  });

  it("rejects payloads that fail the entity schema", () => {
    expect(() =>
      parseNormalizedPayload("blocks", { height: "not-a-number" }),
    ).toThrow();
  });
});

describe("messageId partition key determinism", () => {
  it("produces the same id for the same natural key", () => {
    expect(messageId("testnet", "blocks", "1:b1")).toBe(
      messageId("testnet", "blocks", "1:b1"),
    );
  });

  it("produces different ids for different natural keys", () => {
    expect(messageId("testnet", "blocks", "1:b1")).not.toBe(
      messageId("testnet", "blocks", "2:b2"),
    );
  });
});