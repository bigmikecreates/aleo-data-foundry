import { describe, it, expect } from "vitest";
import {
  CanonicalBlockSchema,
  CanonicalTransactionSchema,
  CanonicalTransitionSchema,
  CanonicalDeploymentSchema,
  CanonicalFeeSchema,
  CanonicalMappingChangeSchema,
  CanonicalChainMetadataSchema,
  NetworkSchema,
  TransactionTypeSchema,
  TransactionStatusSchema,
  MappingActionSchema,
} from "./canonical.js";

describe("Enum schemas", () => {
  it("NetworkSchema accepts testnet and mainnet", () => {
    expect(NetworkSchema.parse("testnet")).toBe("testnet");
    expect(NetworkSchema.parse("mainnet")).toBe("mainnet");
    expect(() => NetworkSchema.parse("devnet")).toThrow();
  });

  it("TransactionTypeSchema accepts execute, deploy, fee", () => {
    expect(TransactionTypeSchema.parse("execute")).toBe("execute");
    expect(TransactionTypeSchema.parse("deploy")).toBe("deploy");
    expect(TransactionTypeSchema.parse("fee")).toBe("fee");
    expect(() => TransactionTypeSchema.parse("transfer")).toThrow();
  });

  it("TransactionStatusSchema accepts accepted and rejected", () => {
    expect(TransactionStatusSchema.parse("accepted")).toBe("accepted");
    expect(TransactionStatusSchema.parse("rejected")).toBe("rejected");
    expect(() => TransactionStatusSchema.parse("pending")).toThrow();
  });

  it("MappingActionSchema accepts set and remove", () => {
    expect(MappingActionSchema.parse("set")).toBe("set");
    expect(MappingActionSchema.parse("remove")).toBe("remove");
    expect(() => MappingActionSchema.parse("create")).toThrow();
  });
});

describe("CanonicalBlockSchema", () => {
  const validBlock = {
    version: 1 as const,
    network: "testnet" as const,
    height: 12345,
    blockHash: "ab17uppp4gpxysdduzexch5gekkg09lxsdsswmpllxp0028sv2xvczsc2zv99",
    previousHash:
      "ab1h8wss9hvagjafrmqpfael2ka8sp9ujhlwm3cxy7dj90xpn2905zsjgfg94",
    timestamp: "2024-06-03T12:00:00Z",
    coinbaseTarget: "4294967295",
    proofTarget: "4294967295",
    lastCoinbaseTarget: "4294967295",
    lastCoinbaseRatio: "1000000",
    round: "5925654",
    transactionsRoot:
      "5921516920880609316862456430090842775173766057023337047347451140512518961075field",
    previousStateRoot:
      "sr1fthuyd9qhswzlkd6f9jxsqpjdj6j4nfnzx02z6x4uj9wpefn4qqqatzzpk",
    transactionsCount: 3,
    abortedTransactionsCount: 0,
  };

  it("parses a valid canonical block", () => {
    const result = CanonicalBlockSchema.safeParse(validBlock);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
      expect(result.data.height).toBe(12345);
      expect(result.data.network).toBe("testnet");
    }
  });

  it("rejects negative height", () => {
    const invalid = { ...validBlock, height: -1 };
    expect(CanonicalBlockSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid version", () => {
    const invalid = { ...validBlock, version: 2 };
    expect(CanonicalBlockSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid timestamp format", () => {
    const invalid = { ...validBlock, timestamp: "not-a-date" };
    expect(CanonicalBlockSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("CanonicalTransactionSchema", () => {
  const validTx = {
    version: 1 as const,
    network: "testnet" as const,
    blockHeight: 12345,
    blockHash: "ab17upp",
    txId: "at1qf0rdpte850dp2nfqfwcr6qsz7akhdltfww4vgqe89z0yehquuzs5qy30j",
    indexInBlock: 0,
    type: "execute" as const,
    status: "accepted" as const,
    globalStateRoot: "sr1fthuyd9qhswzlkd6f9jxsqpjdj6j4nfnzx02z6x4uj9wpefn4qqqatzzpk",
  };

  it("parses a valid canonical transaction", () => {
    const result = CanonicalTransactionSchema.safeParse(validTx);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.txId).toBe(validTx.txId);
      expect(result.data.type).toBe("execute");
    }
  });

  it("rejects invalid type", () => {
    const invalid = { ...validTx, type: "transfer" };
    expect(CanonicalTransactionSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("CanonicalTransitionSchema", () => {
  const validTransition = {
    version: 1 as const,
    network: "testnet" as const,
    txId: "at1qf0rdpte850dp2nfqfwcr6qsz7akhdltfww4vgqe89z0yehquuzs5qy30j",
    transitionId: "au1dqqmksxh0rajrzc0nup6lmkcswy3jgrus63mqmwehc35edrzeqzswl832d",
    programId: "credits.aleo",
    functionName: "transfer_public",
    inputs: [
      { type: "public", id: "field123", value: "aleo1q6qstg" },
    ],
    outputs: [
      { type: "future", id: "field456", value: "{ program_id: credits.aleo }" },
    ],
    tpk: "7561112813805817986030837166078003059098785717182101238376337363731705904827group",
    tcm: "5238475629103847562910384756291038475629103847562910384756291038475629103847field",
  };

  it("parses a valid canonical transition", () => {
    const result = CanonicalTransitionSchema.safeParse(validTransition);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.programId).toBe("credits.aleo");
      expect(result.data.functionName).toBe("transfer_public");
      expect(result.data.inputs).toHaveLength(1);
      expect(result.data.outputs).toHaveLength(1);
    }
  });

  it("rejects invalid version", () => {
    const invalid = { ...validTransition, version: 2 };
    expect(CanonicalTransitionSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("CanonicalDeploymentSchema", () => {
  it("parses a valid deployment", () => {
    const result = CanonicalDeploymentSchema.safeParse({
      version: 1,
      network: "testnet",
      txId: "at1deploy",
      programId: "my_program.aleo",
      edition: 0,
      timestamp: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative edition", () => {
    const result = CanonicalDeploymentSchema.safeParse({
      version: 1,
      network: "testnet",
      txId: "at1deploy",
      programId: "my_program.aleo",
      edition: -1,
      timestamp: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("CanonicalFeeSchema", () => {
  it("parses a valid fee", () => {
    const result = CanonicalFeeSchema.safeParse({
      version: 1,
      network: "mainnet",
      txId: "at1fee",
      transitionId: "au1fee",
      payer: "aleo1q6qstg",
      amount: 100000,
      globalStateRoot: "sr1abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(100000);
    }
  });

  it("rejects negative amount", () => {
    const result = CanonicalFeeSchema.safeParse({
      version: 1,
      network: "mainnet",
      txId: "at1fee",
      transitionId: "au1fee",
      payer: "aleo1q6qstg",
      amount: -1,
      globalStateRoot: "sr1abc",
    });
    expect(result.success).toBe(false);
  });
});

describe("CanonicalMappingChangeSchema", () => {
  it("parses a valid mapping change", () => {
    const result = CanonicalMappingChangeSchema.safeParse({
      version: 1,
      network: "testnet",
      txId: "at1tx",
      transitionId: "au1tr",
      programId: "credits.aleo",
      mappingName: "account",
      mappingId: "mapping123",
      action: "set",
      keyId: "key123",
      valueId: "val123",
      indexInTransition: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = CanonicalMappingChangeSchema.safeParse({
      version: 1,
      network: "testnet",
      txId: "at1tx",
      transitionId: "au1tr",
      programId: "credits.aleo",
      mappingName: "account",
      mappingId: "mapping123",
      action: "delete",
      keyId: "key123",
      valueId: "val123",
      indexInTransition: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("CanonicalChainMetadataSchema", () => {
  it("parses valid metadata", () => {
    const result = CanonicalChainMetadataSchema.safeParse({
      version: 1,
      network: "mainnet",
      latestHeight: 1000000,
      latestHash: "ab17upp",
      timestamp: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative latestHeight", () => {
    const result = CanonicalChainMetadataSchema.safeParse({
      version: 1,
      network: "mainnet",
      latestHeight: -1,
      latestHash: "ab17upp",
      timestamp: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});
