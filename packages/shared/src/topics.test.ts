import { describe, it, expect } from "vitest";
import { topicName, RAW_TOPICS, NORMALIZED_TOPICS, DLQ_TOPIC } from "./topics.js";

describe("topicName", () => {
  it("generates correct topic name for raw blocks", () => {
    expect(topicName("blocks", "raw")).toBe("aleo.blocks.raw.v1");
  });

  it("generates correct topic name for normalized transactions", () => {
    expect(topicName("transactions", "normalized")).toBe(
      "aleo.transactions.normalized.v1",
    );
  });

  it("generates correct topic name for raw transitions", () => {
    expect(topicName("transitions", "raw")).toBe("aleo.transitions.raw.v1");
  });

  it("generates correct topic name for normalized programs", () => {
    expect(topicName("programs", "normalized")).toBe(
      "aleo.programs.normalized.v1",
    );
  });
});

describe("RAW_TOPICS", () => {
  it("has all expected raw topics", () => {
    expect(RAW_TOPICS.blocks).toBe("aleo.blocks.raw.v1");
    expect(RAW_TOPICS.transactions).toBe("aleo.transactions.raw.v1");
    expect(RAW_TOPICS.transitions).toBe("aleo.transitions.raw.v1");
    expect(RAW_TOPICS.programs).toBe("aleo.programs.raw.v1");
    expect(RAW_TOPICS.deployments).toBe("aleo.deployments.raw.v1");
    expect(RAW_TOPICS.fees).toBe("aleo.fees.raw.v1");
    expect(RAW_TOPICS["mapping-changes"]).toBe("aleo.mapping-changes.raw.v1");
    expect(RAW_TOPICS["chain-metadata"]).toBe("aleo.chain-metadata.raw.v1");
  });
});

describe("NORMALIZED_TOPICS", () => {
  it("has all expected normalized topics", () => {
    expect(NORMALIZED_TOPICS.blocks).toBe("aleo.blocks.normalized.v1");
    expect(NORMALIZED_TOPICS.transactions).toBe(
      "aleo.transactions.normalized.v1",
    );
    expect(NORMALIZED_TOPICS.transitions).toBe(
      "aleo.transitions.normalized.v1",
    );
    expect(NORMALIZED_TOPICS.programs).toBe("aleo.programs.normalized.v1");
    expect(NORMALIZED_TOPICS.deployments).toBe(
      "aleo.deployments.normalized.v1",
    );
    expect(NORMALIZED_TOPICS.fees).toBe("aleo.fees.normalized.v1");
    expect(NORMALIZED_TOPICS["mapping-changes"]).toBe(
      "aleo.mapping-changes.normalized.v1",
    );
    expect(NORMALIZED_TOPICS["chain-metadata"]).toBe(
      "aleo.chain-metadata.normalized.v1",
    );
  });
});

describe("DLQ_TOPIC", () => {
  it("has correct DLQ topic name", () => {
    expect(DLQ_TOPIC).toBe("aleo.ingestion.dlq.v1");
  });
});
