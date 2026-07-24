import { describe, it, expect } from "vitest";
import {
  normalizeBlock,
  normalizeTransaction,
  normalizeTransition,
  normalizeFee,
  normalizeDeployment,
  normalizeMappingChange,
} from "./normalizer.js";
import { NormalizationError } from "./errors.js";
import type {
  ProvableBlockResponse,
  ProvableBlockTransaction,
  ProvableTransition,
  ProvableFee,
  ProvableTransactionBody,
  ProvableFinalizeAction,
} from "@aleo-foundry/shared";

const mockBlock: ProvableBlockResponse = {
  block_hash: "ab17upp",
  previous_hash: "ab1h8ws",
  header: {
    previous_state_root: "sr1abc",
    transactions_root: "field123",
    finalize_root: "field456",
    ratifications_root: "field789",
    solutions_root: "0field",
    subdag_root: "field000",
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

describe("normalizeBlock", () => {
  it("normalizes a valid block", () => {
    const result = normalizeBlock("testnet", 12345, mockBlock);
    expect(result.version).toBe(1);
    expect(result.network).toBe("testnet");
    expect(result.height).toBe(12345);
    expect(result.blockHash).toBe("ab17upp");
    expect(result.previousHash).toBe("ab1h8ws");
    expect(result.transactionsCount).toBe(0);
    expect(result.abortedTransactionsCount).toBe(0);
  });

  it("converts unix timestamp to ISO 8601", () => {
    const result = normalizeBlock("testnet", 1, mockBlock);
    expect(result.timestamp).toBe("2024-06-02T11:36:49.000Z");
  });

  it("counts aborted transactions", () => {
    const block = { ...mockBlock, aborted_transaction_ids: ["tx1", "tx2"] };
    const result = normalizeBlock("testnet", 1, block);
    expect(result.abortedTransactionsCount).toBe(2);
  });
});

describe("normalizeTransaction", () => {
  const mockTx: ProvableBlockTransaction = {
    status: "accepted",
    type: "execute",
    index: 0,
    transaction: {
      type: "execute",
      id: "at1tx",
      execution: {
        transitions: [],
        global_state_root: "sr1abc",
        proof: "proof",
      },
    },
  };

  it("normalizes a valid transaction", () => {
    const result = normalizeTransaction("testnet", 1, "ab17upp", mockTx);
    expect(result.version).toBe(1);
    expect(result.txId).toBe("at1tx");
    expect(result.type).toBe("execute");
    expect(result.status).toBe("accepted");
    expect(result.indexInBlock).toBe(0);
  });

  it("maps rejected status", () => {
    const tx = { ...mockTx, status: "rejected" };
    const result = normalizeTransaction("testnet", 1, "ab17upp", tx);
    expect(result.status).toBe("rejected");
  });

  it("maps deploy type", () => {
    const tx = { ...mockTx, transaction: { ...mockTx.transaction, type: "deploy" } };
    const result = normalizeTransaction("testnet", 1, "ab17upp", tx);
    expect(result.type).toBe("deploy");
  });

  it("extracts global state root from fee-only body", () => {
    const tx: ProvableBlockTransaction = {
      status: "accepted",
      type: "fee",
      index: 0,
      transaction: {
        type: "fee",
        id: "at1fee",
        fee: {
          transition: {
            id: "au1fee",
            program: "credits.aleo",
            function: "fee_public",
            inputs: [],
            outputs: [],
            tpk: "tpk",
            tcm: "tcm",
          },
          global_state_root: "sr1fee",
          proof: "proof",
        },
      },
    };
    const result = normalizeTransaction("testnet", 1, "ab17upp", tx);
    expect(result.globalStateRoot).toBe("sr1fee");
  });

  it("defaults global state root to empty when no execution or fee", () => {
    const tx: ProvableBlockTransaction = {
      status: "accepted",
      type: "deploy",
      index: 0,
      transaction: {
        type: "deploy",
        id: "at1deploy",
      },
    };
    const result = normalizeTransaction("testnet", 1, "ab17upp", tx);
    expect(result.globalStateRoot).toBe("");
  });
});

describe("normalizeTransition", () => {
  const mockTransition: ProvableTransition = {
    id: "au1tr",
    program: "credits.aleo",
    function: "transfer_public",
    inputs: [{ type: "public", id: "field1", value: "1u64" }],
    outputs: [{ type: "future", id: "field2", value: "{ program_id: credits.aleo }" }],
    tpk: "tpk123",
    tcm: "tcm456",
  };

  it("normalizes a valid transition", () => {
    const result = normalizeTransition("testnet", "at1tx", mockTransition);
    expect(result.version).toBe(1);
    expect(result.transitionId).toBe("au1tr");
    expect(result.programId).toBe("credits.aleo");
    expect(result.functionName).toBe("transfer_public");
    expect(result.inputs).toHaveLength(1);
    expect(result.outputs).toHaveLength(1);
  });

  it("handles empty inputs and outputs", () => {
    const transition = { ...mockTransition, inputs: [], outputs: [] };
    const result = normalizeTransition("testnet", "at1tx", transition);
    expect(result.inputs).toHaveLength(0);
    expect(result.outputs).toHaveLength(0);
  });
});

describe("normalizeFee", () => {
  const mockFee: ProvableFee = {
    transition: {
      id: "au1fee",
      program: "credits.aleo",
      function: "fee_public",
      inputs: [
        { type: "public", id: "field1", value: "aleo1q6qstg" },
        { type: "public", id: "field2", value: "100000u64" },
      ],
      outputs: [],
      tpk: "tpk",
      tcm: "tcm",
    },
    global_state_root: "sr1abc",
    proof: "proof",
  };

  it("normalizes a valid fee", () => {
    const result = normalizeFee("testnet", "at1tx", mockFee);
    expect(result.version).toBe(1);
    expect(result.payer).toBe("aleo1q6qstg");
    expect(result.amount).toBe(100000);
    expect(result.globalStateRoot).toBe("sr1abc");
  });

  it("parses u64 amount format", () => {
    const fee = {
      ...mockFee,
      transition: {
        ...mockFee.transition,
        inputs: [
          { type: "public", id: "f1", value: "aleo1q6qstg" },
          { type: "public", id: "f2", value: "250000u64" },
        ],
      },
    };
    const result = normalizeFee("testnet", "at1tx", fee);
    expect(result.amount).toBe(250000);
  });

  it("defaults to 0 for non-u64 amount format", () => {
    const fee = {
      ...mockFee,
      transition: {
        ...mockFee.transition,
        inputs: [
          { type: "public", id: "f1", value: "aleo1q6qstg" },
          { type: "public", id: "f2", value: "not_a_number" },
        ],
      },
    };
    const result = normalizeFee("testnet", "at1tx", fee);
    expect(result.amount).toBe(0);
  });

  it("defaults payer and amount for empty inputs", () => {
    const fee = {
      ...mockFee,
      transition: {
        ...mockFee.transition,
        inputs: [],
      },
    };
    const result = normalizeFee("testnet", "at1tx", fee);
    expect(result.payer).toBe("");
    expect(result.amount).toBe(0);
  });
});

describe("normalizeDeployment", () => {
  it("normalizes a valid deployment", () => {
    const body: ProvableTransactionBody = {
      type: "deploy",
      id: "at1deploy",
      deploy: {
        program_id: "my_program.aleo",
        edition: 0,
      },
    };
    const result = normalizeDeployment("testnet", "at1deploy", "2024-06-03T12:00:00Z", body);
    expect(result).not.toBeNull();
    expect(result?.programId).toBe("my_program.aleo");
    expect(result?.edition).toBe(0);
  });

  it("returns null for non-deploy type", () => {
    const body: ProvableTransactionBody = {
      type: "execute",
      id: "at1tx",
    };
    const result = normalizeDeployment("testnet", "at1tx", "2024-06-03T12:00:00Z", body);
    expect(result).toBeNull();
  });

  it("returns null for missing deploy data", () => {
    const body: ProvableTransactionBody = {
      type: "deploy",
      id: "at1deploy",
    };
    const result = normalizeDeployment("testnet", "at1deploy", "2024-06-03T12:00:00Z", body);
    expect(result).toBeNull();
  });

  it("returns null for deploy with missing programId", () => {
    const body: ProvableTransactionBody = {
      type: "deploy",
      id: "at1deploy",
      deploy: { edition: 0 },
    };
    const result = normalizeDeployment("testnet", "at1deploy", "2024-06-03T12:00:00Z", body);
    expect(result).toBeNull();
  });
});

describe("normalizeMappingChange", () => {
  it("normalizes a set action", () => {
    const action: ProvableFinalizeAction = {
      type: "set",
      mapping_id: "mapping123",
      index: 0,
      key_id: "key123",
      value_id: "val123",
    };
    const result = normalizeMappingChange("testnet", "at1tx", "au1tr", "credits.aleo", action);
    expect(result.version).toBe(1);
    expect(result.action).toBe("set");
    expect(result.mappingId).toBe("mapping123");
    expect(result.indexInTransition).toBe(0);
  });

  it("normalizes a remove action", () => {
    const action: ProvableFinalizeAction = {
      type: "remove",
      mapping_id: "mapping123",
      index: 1,
      key_id: "key123",
      value_id: "val123",
    };
    const result = normalizeMappingChange("testnet", "at1tx", "au1tr", "credits.aleo", action);
    expect(result.action).toBe("remove");
  });

  it("defaults unknown action type to remove", () => {
    const action: ProvableFinalizeAction = {
      type: "unknown",
      mapping_id: "mapping123",
      index: 0,
      key_id: "key123",
      value_id: "val123",
    };
    const result = normalizeMappingChange("testnet", "at1tx", "au1tr", "credits.aleo", action);
    expect(result.action).toBe("remove");
  });
});

describe("NormalizationError", () => {
  it("has correct name and properties", () => {
    const error = new NormalizationError("block", "invalid data", { height: 123 });
    expect(error.name).toBe("NormalizationError");
    expect(error.entityType).toBe("block");
    expect(error.message).toBe("invalid data");
    expect(error.context).toEqual({ height: 123 });
  });

  it("is an instance of Error", () => {
    const error = new NormalizationError("tx", "test");
    expect(error).toBeInstanceOf(Error);
  });
});
