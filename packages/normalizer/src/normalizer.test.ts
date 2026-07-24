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

// ─── normalizeBlock ──────────────────────────────────────────────

describe("normalizeBlock", () => {
  it("normalizes a valid block", () => {
    const { canonical, serving } = normalizeBlock("testnet", 12345, mockBlock);
    expect(canonical.version).toBe(1);
    expect(canonical.network).toBe("testnet");
    expect(canonical.height).toBe(12345);
    expect(canonical.blockHash).toBe("ab17upp");
    expect(canonical.previousHash).toBe("ab1h8ws");
    expect(canonical.transactionsCount).toBe(0);
    expect(canonical.abortedTransactionsCount).toBe(0);
  });

  it("produces correct serving model", () => {
    const { serving } = normalizeBlock("testnet", 12345, mockBlock);
    expect(serving.height).toBe(12345);
    expect(serving.block_hash).toBe("ab17upp");
    expect(serving.previous_hash).toBe("ab1h8ws");
    expect(serving.network).toBe("testnet");
    expect(serving.transactions_count).toBe(0);
    expect(serving.aborted_transactions_count).toBe(0);
    expect(serving.created_at).toBeDefined();
    expect(new Date(serving.created_at).toISOString()).toBe(serving.created_at);
  });

  it("converts unix timestamp to ISO 8601", () => {
    const { canonical, serving } = normalizeBlock("testnet", 1, mockBlock);
    expect(canonical.timestamp).toBe("2024-06-02T11:36:49.000Z");
    expect(serving.timestamp).toBe("2024-06-02T11:36:49.000Z");
  });

  it("counts aborted transactions", () => {
    const block = { ...mockBlock, aborted_transaction_ids: ["tx1", "tx2"] };
    const { canonical, serving } = normalizeBlock("testnet", 1, block);
    expect(canonical.abortedTransactionsCount).toBe(2);
    expect(serving.aborted_transactions_count).toBe(2);
  });

  it("defaults aborted count to 0 when field is missing", () => {
    const block = { ...mockBlock };
    delete block.aborted_transaction_ids;
    const { canonical, serving } = normalizeBlock("testnet", 1, block);
    expect(canonical.abortedTransactionsCount).toBe(0);
    expect(serving.aborted_transactions_count).toBe(0);
  });

  it("serving mirrors canonical data correctly", () => {
    const { canonical, serving } = normalizeBlock("mainnet", 999, mockBlock);
    expect(serving.network).toBe(canonical.network);
    expect(serving.height).toBe(canonical.height);
    expect(serving.transactions_count).toBe(canonical.transactionsCount);
    expect(serving.aborted_transactions_count).toBe(canonical.abortedTransactionsCount);
    expect(serving.coinbase_target).toBe(canonical.coinbaseTarget);
    expect(serving.proof_target).toBe(canonical.proofTarget);
    expect(serving.round).toBe(canonical.round);
    expect(serving.transactions_root).toBe(canonical.transactionsRoot);
    expect(serving.previous_state_root).toBe(canonical.previousStateRoot);
  });
});

// ─── normalizeTransaction ────────────────────────────────────────

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
    const { canonical, serving } = normalizeTransaction("testnet", 1, "ab17upp", mockTx);
    expect(canonical.version).toBe(1);
    expect(canonical.txId).toBe("at1tx");
    expect(canonical.type).toBe("execute");
    expect(canonical.status).toBe("accepted");
    expect(canonical.indexInBlock).toBe(0);
  });

  it("produces correct serving model", () => {
    const { serving } = normalizeTransaction("testnet", 1, "ab17upp", mockTx);
    expect(serving.tx_id).toBe("at1tx");
    expect(serving.block_height).toBe(1);
    expect(serving.block_hash).toBe("ab17upp");
    expect(serving.network).toBe("testnet");
    expect(serving.type).toBe("execute");
    expect(serving.status).toBe("accepted");
    expect(serving.index_in_block).toBe(0);
    expect(serving.global_state_root).toBe("sr1abc");
    expect(serving.created_at).toBeDefined();
  });

  it("maps rejected status", () => {
    const tx = { ...mockTx, status: "rejected" };
    const { canonical, serving } = normalizeTransaction("testnet", 1, "ab17upp", tx);
    expect(canonical.status).toBe("rejected");
    expect(serving.status).toBe("rejected");
  });

  it("maps deploy type", () => {
    const tx = { ...mockTx, transaction: { ...mockTx.transaction, type: "deploy" } };
    const { canonical, serving } = normalizeTransaction("testnet", 1, "ab17upp", tx);
    expect(canonical.type).toBe("deploy");
    expect(serving.type).toBe("deploy");
  });

  it("maps fee type", () => {
    const tx = { ...mockTx, transaction: { ...mockTx.transaction, type: "fee" } };
    const { canonical, serving } = normalizeTransaction("testnet", 1, "ab17upp", tx);
    expect(canonical.type).toBe("fee");
    expect(serving.type).toBe("fee");
  });

  it("defaults unknown type to execute", () => {
    const tx = { ...mockTx, transaction: { ...mockTx.transaction, type: "unknown" } };
    const { canonical } = normalizeTransaction("testnet", 1, "ab17upp", tx);
    expect(canonical.type).toBe("execute");
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
    const { canonical, serving } = normalizeTransaction("testnet", 1, "ab17upp", tx);
    expect(canonical.globalStateRoot).toBe("sr1fee");
    expect(serving.global_state_root).toBe("sr1fee");
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
    const { canonical, serving } = normalizeTransaction("testnet", 1, "ab17upp", tx);
    expect(canonical.globalStateRoot).toBe("");
    expect(serving.global_state_root).toBe("");
  });

  it("serving mirrors canonical data", () => {
    const { canonical, serving } = normalizeTransaction("mainnet", 42, "hash123", mockTx);
    expect(serving.tx_id).toBe(canonical.txId);
    expect(serving.block_height).toBe(canonical.blockHeight);
    expect(serving.block_hash).toBe(canonical.blockHash);
    expect(serving.network).toBe(canonical.network);
    expect(serving.type).toBe(canonical.type);
    expect(serving.status).toBe(canonical.status);
    expect(serving.index_in_block).toBe(canonical.indexInBlock);
    expect(serving.global_state_root).toBe(canonical.globalStateRoot);
  });
});

// ─── normalizeTransition ─────────────────────────────────────────

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
    const { canonical, serving } = normalizeTransition("testnet", "at1tx", mockTransition);
    expect(canonical.version).toBe(1);
    expect(canonical.transitionId).toBe("au1tr");
    expect(canonical.programId).toBe("credits.aleo");
    expect(canonical.functionName).toBe("transfer_public");
    expect(canonical.inputs).toHaveLength(1);
    expect(canonical.outputs).toHaveLength(1);
  });

  it("produces correct serving model", () => {
    const { serving } = normalizeTransition("testnet", "at1tx", mockTransition);
    expect(serving.transition_id).toBe("au1tr");
    expect(serving.tx_id).toBe("at1tx");
    expect(serving.program_id).toBe("credits.aleo");
    expect(serving.function_name).toBe("transfer_public");
    expect(serving.tpk).toBe("tpk123");
    expect(serving.tcm).toBe("tcm456");
    expect(serving.created_at).toBeDefined();
  });

  it("stringifies inputs and outputs as JSON", () => {
    const { serving } = normalizeTransition("testnet", "at1tx", mockTransition);
    expect(typeof serving.inputs_json).toBe("string");
    expect(typeof serving.outputs_json).toBe("string");
    const parsedInputs = JSON.parse(serving.inputs_json);
    expect(parsedInputs).toHaveLength(1);
    expect(parsedInputs[0].type).toBe("public");
    const parsedOutputs = JSON.parse(serving.outputs_json);
    expect(parsedOutputs).toHaveLength(1);
    expect(parsedOutputs[0].type).toBe("future");
  });

  it("handles empty inputs and outputs", () => {
    const transition = { ...mockTransition, inputs: [], outputs: [] };
    const { canonical, serving } = normalizeTransition("testnet", "at1tx", transition);
    expect(canonical.inputs).toHaveLength(0);
    expect(canonical.outputs).toHaveLength(0);
    expect(serving.inputs_json).toBe("[]");
    expect(serving.outputs_json).toBe("[]");
  });

  it("serving mirrors canonical data", () => {
    const { canonical, serving } = normalizeTransition("testnet", "at1tx", mockTransition);
    expect(serving.transition_id).toBe(canonical.transitionId);
    expect(serving.tx_id).toBe(canonical.txId);
    expect(serving.program_id).toBe(canonical.programId);
    expect(serving.function_name).toBe(canonical.functionName);
    expect(serving.tpk).toBe(canonical.tpk);
    expect(serving.tcm).toBe(canonical.tcm);
  });
});

// ─── normalizeFee ────────────────────────────────────────────────

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
    const { canonical, serving } = normalizeFee("testnet", "at1tx", mockFee);
    expect(canonical.version).toBe(1);
    expect(canonical.payer).toBe("aleo1q6qstg");
    expect(canonical.amount).toBe(100000);
    expect(canonical.globalStateRoot).toBe("sr1abc");
  });

  it("produces correct serving model", () => {
    const { serving } = normalizeFee("testnet", "at1tx", mockFee);
    expect(serving.tx_id).toBe("at1tx");
    expect(serving.transition_id).toBe("au1fee");
    expect(serving.payer).toBe("aleo1q6qstg");
    expect(serving.amount).toBe(100000);
    expect(serving.global_state_root).toBe("sr1abc");
    expect(serving.network).toBe("testnet");
    expect(serving.created_at).toBeDefined();
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
    const { canonical, serving } = normalizeFee("testnet", "at1tx", fee);
    expect(canonical.amount).toBe(250000);
    expect(serving.amount).toBe(250000);
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
    const { canonical, serving } = normalizeFee("testnet", "at1tx", fee);
    expect(canonical.amount).toBe(0);
    expect(serving.amount).toBe(0);
  });

  it("defaults payer and amount for empty inputs", () => {
    const fee = {
      ...mockFee,
      transition: {
        ...mockFee.transition,
        inputs: [],
      },
    };
    const { canonical, serving } = normalizeFee("testnet", "at1tx", fee);
    expect(canonical.payer).toBe("");
    expect(canonical.amount).toBe(0);
    expect(serving.payer).toBe("");
    expect(serving.amount).toBe(0);
  });

  it("serving mirrors canonical data", () => {
    const { canonical, serving } = normalizeFee("mainnet", "at1tx", mockFee);
    expect(serving.tx_id).toBe(canonical.txId);
    expect(serving.transition_id).toBe(canonical.transitionId);
    expect(serving.payer).toBe(canonical.payer);
    expect(serving.amount).toBe(canonical.amount);
    expect(serving.global_state_root).toBe(canonical.globalStateRoot);
    expect(serving.network).toBe(canonical.network);
  });
});

// ─── normalizeDeployment ─────────────────────────────────────────

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
    expect(result?.canonical.programId).toBe("my_program.aleo");
    expect(result?.canonical.edition).toBe(0);
  });

  it("produces correct serving model", () => {
    const body: ProvableTransactionBody = {
      type: "deploy",
      id: "at1deploy",
      deploy: {
        program_id: "my_program.aleo",
        edition: 2,
      },
    };
    const result = normalizeDeployment("testnet", "at1deploy", "2024-06-03T12:00:00Z", body);
    expect(result).not.toBeNull();
    expect(result?.serving.program_id).toBe("my_program.aleo");
    expect(result?.serving.edition).toBe(2);
    expect(result?.serving.network).toBe("testnet");
    expect(result?.serving.deployment_tx_id).toBe("at1deploy");
    expect(result?.serving.deployed_at).toBe("2024-06-03T12:00:00Z");
    expect(result?.serving.created_at).toBeDefined();
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

  it("returns null for deploy with missing edition", () => {
    const body: ProvableTransactionBody = {
      type: "deploy",
      id: "at1deploy",
      deploy: { program_id: "my_program.aleo" },
    };
    const result = normalizeDeployment("testnet", "at1deploy", "2024-06-03T12:00:00Z", body);
    expect(result).toBeNull();
  });

  it("serving mirrors canonical data", () => {
    const body: ProvableTransactionBody = {
      type: "deploy",
      id: "at1deploy",
      deploy: {
        program_id: "my_program.aleo",
        edition: 3,
      },
    };
    const result = normalizeDeployment("mainnet", "at1deploy", "2024-06-03T12:00:00Z", body);
    expect(result).not.toBeNull();
    expect(result?.serving.program_id).toBe(result?.canonical.programId);
    expect(result?.serving.edition).toBe(result?.canonical.edition);
    expect(result?.serving.network).toBe(result?.canonical.network);
    expect(result?.serving.deployment_tx_id).toBe(result?.canonical.txId);
  });
});

// ─── normalizeMappingChange ──────────────────────────────────────

describe("normalizeMappingChange", () => {
  it("normalizes a set action", () => {
    const action: ProvableFinalizeAction = {
      type: "set",
      mapping_id: "mapping123",
      index: 0,
      key_id: "key123",
      value_id: "val123",
    };
    const { canonical, serving } = normalizeMappingChange(
      "testnet", "at1tx", "au1tr", "credits.aleo", action,
    );
    expect(canonical.version).toBe(1);
    expect(canonical.action).toBe("set");
    expect(canonical.mappingId).toBe("mapping123");
    expect(canonical.indexInTransition).toBe(0);
  });

  it("produces correct serving model", () => {
    const action: ProvableFinalizeAction = {
      type: "set",
      mapping_id: "mapping123",
      index: 0,
      key_id: "key123",
      value_id: "val123",
    };
    const { serving } = normalizeMappingChange(
      "testnet", "at1tx", "au1tr", "credits.aleo", action,
    );
    expect(serving.tx_id).toBe("at1tx");
    expect(serving.transition_id).toBe("au1tr");
    expect(serving.program_id).toBe("credits.aleo");
    expect(serving.mapping_id).toBe("mapping123");
    expect(serving.action).toBe("set");
    expect(serving.key_id).toBe("key123");
    expect(serving.value_id).toBe("val123");
    expect(serving.index_in_transition).toBe(0);
    expect(serving.network).toBe("testnet");
    expect(serving.created_at).toBeDefined();
  });

  it("normalizes a remove action", () => {
    const action: ProvableFinalizeAction = {
      type: "remove",
      mapping_id: "mapping123",
      index: 1,
      key_id: "key123",
      value_id: "val123",
    };
    const { canonical, serving } = normalizeMappingChange(
      "testnet", "at1tx", "au1tr", "credits.aleo", action,
    );
    expect(canonical.action).toBe("remove");
    expect(serving.action).toBe("remove");
  });

  it("defaults unknown action type to remove", () => {
    const action: ProvableFinalizeAction = {
      type: "unknown",
      mapping_id: "mapping123",
      index: 0,
      key_id: "key123",
      value_id: "val123",
    };
    const { canonical, serving } = normalizeMappingChange(
      "testnet", "at1tx", "au1tr", "credits.aleo", action,
    );
    expect(canonical.action).toBe("remove");
    expect(serving.action).toBe("remove");
  });

  it("serving mirrors canonical data", () => {
    const action: ProvableFinalizeAction = {
      type: "set",
      mapping_id: "mapping456",
      index: 3,
      key_id: "key456",
      value_id: "val456",
    };
    const { canonical, serving } = normalizeMappingChange(
      "mainnet", "at1tx", "au1tr", "program.aleo", action,
    );
    expect(serving.tx_id).toBe(canonical.txId);
    expect(serving.transition_id).toBe(canonical.transitionId);
    expect(serving.program_id).toBe(canonical.programId);
    expect(serving.mapping_id).toBe(canonical.mappingId);
    expect(serving.action).toBe(canonical.action);
    expect(serving.key_id).toBe(canonical.keyId);
    expect(serving.value_id).toBe(canonical.valueId);
    expect(serving.index_in_transition).toBe(canonical.indexInTransition);
    expect(serving.network).toBe(canonical.network);
  });
});

// ─── NormalizationError ──────────────────────────────────────────

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

  it("works without context", () => {
    const error = new NormalizationError("fee", "bad data");
    expect(error.context).toBeUndefined();
  });
});
