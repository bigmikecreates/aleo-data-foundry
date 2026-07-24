import { describe, it, expect } from "vitest";
import {
  BlockRowSchema,
  TransactionRowSchema,
  TransitionRowSchema,
  ProgramRowSchema,
  MappingChangeRowSchema,
  FeeRowSchema,
  ChainMetadataRowSchema,
  DeployRowSchema,
} from "./serving.js";

describe("BlockRowSchema", () => {
  it("parses a valid block row", () => {
    const result = BlockRowSchema.safeParse({
      height: 12345,
      block_hash: "ab17upp",
      previous_hash: "ab1h8ws",
      network: "testnet",
      timestamp: "2024-06-03T12:00:00Z",
      coinbase_target: "4294967295",
      proof_target: "4294967295",
      last_coinbase_target: "4294967295",
      last_coinbase_ratio: "1000000",
      round: "5925654",
      transactions_root: "field123",
      previous_state_root: "sr1abc",
      transactions_count: 3,
      aborted_transactions_count: 0,
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative height", () => {
    const result = BlockRowSchema.safeParse({
      height: -1,
      block_hash: "ab17upp",
      previous_hash: "ab1h8ws",
      network: "testnet",
      timestamp: "2024-06-03T12:00:00Z",
      coinbase_target: "4294967295",
      proof_target: "4294967295",
      last_coinbase_target: "4294967295",
      last_coinbase_ratio: "1000000",
      round: "5925654",
      transactions_root: "field123",
      previous_state_root: "sr1abc",
      transactions_count: 3,
      aborted_transactions_count: 0,
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("TransactionRowSchema", () => {
  it("parses a valid transaction row", () => {
    const result = TransactionRowSchema.safeParse({
      tx_id: "at1qf0rdpte850dp2nfqfwcr6qsz7akhdltfww4vgqe89z0yehquuzs5qy30j",
      block_height: 12345,
      block_hash: "ab17upp",
      network: "testnet",
      type: "execute",
      status: "accepted",
      index_in_block: 0,
      global_state_root: "sr1abc",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = TransactionRowSchema.safeParse({
      tx_id: "at1tx",
      block_height: 12345,
      block_hash: "ab17upp",
      network: "testnet",
      type: "transfer",
      status: "accepted",
      index_in_block: 0,
      global_state_root: "sr1abc",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("TransitionRowSchema", () => {
  it("parses a valid transition row", () => {
    const result = TransitionRowSchema.safeParse({
      transition_id: "au1dqqmks",
      tx_id: "at1qf0rdp",
      program_id: "credits.aleo",
      function_name: "transfer_public",
      inputs_json: "[]",
      outputs_json: "[]",
      tpk: "756111group",
      tcm: "523847field",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = TransitionRowSchema.safeParse({
      transition_id: "au1dqqmks",
    });
    expect(result.success).toBe(false);
  });
});

describe("ProgramRowSchema", () => {
  it("parses a valid program row", () => {
    const result = ProgramRowSchema.safeParse({
      program_id: "credits.aleo",
      network: "mainnet",
      edition: 0,
      deployment_tx_id: "at1deploy",
      deployed_at: "2024-06-03T12:00:00Z",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative edition", () => {
    const result = ProgramRowSchema.safeParse({
      program_id: "credits.aleo",
      network: "mainnet",
      edition: -1,
      deployment_tx_id: "at1deploy",
      deployed_at: "2024-06-03T12:00:00Z",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("MappingChangeRowSchema", () => {
  it("parses a valid mapping change row", () => {
    const result = MappingChangeRowSchema.safeParse({
      id: 1,
      tx_id: "at1tx",
      transition_id: "au1tr",
      program_id: "credits.aleo",
      mapping_name: "account",
      mapping_id: "mapping123",
      action: "set",
      key_id: "key123",
      value_id: "val123",
      index_in_transition: 0,
      network: "testnet",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = MappingChangeRowSchema.safeParse({
      id: 1,
      tx_id: "at1tx",
      transition_id: "au1tr",
      program_id: "credits.aleo",
      mapping_name: "account",
      mapping_id: "mapping123",
      action: "delete",
      key_id: "key123",
      value_id: "val123",
      index_in_transition: 0,
      network: "testnet",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("FeeRowSchema", () => {
  it("parses a valid fee row", () => {
    const result = FeeRowSchema.safeParse({
      tx_id: "at1fee",
      transition_id: "au1fee",
      payer: "aleo1q6qstg",
      amount: 100000,
      global_state_root: "sr1abc",
      network: "testnet",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = FeeRowSchema.safeParse({
      tx_id: "at1fee",
      transition_id: "au1fee",
      payer: "aleo1q6qstg",
      amount: -1,
      global_state_root: "sr1abc",
      network: "testnet",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("ChainMetadataRowSchema", () => {
  it("parses valid chain metadata", () => {
    const result = ChainMetadataRowSchema.safeParse({
      network: "mainnet",
      latest_height: 1000000,
      latest_hash: "ab17upp",
      updated_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative latest_height", () => {
    const result = ChainMetadataRowSchema.safeParse({
      network: "mainnet",
      latest_height: -1,
      latest_hash: "ab17upp",
      updated_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("DeployRowSchema", () => {
  it("parses a valid deploy row", () => {
    const result = DeployRowSchema.safeParse({
      tx_id: "at1deploy",
      program_id: "my_program.aleo",
      edition: 0,
      network: "testnet",
      deployed_at: "2024-06-03T12:00:00Z",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative edition", () => {
    const result = DeployRowSchema.safeParse({
      tx_id: "at1deploy",
      program_id: "my_program.aleo",
      edition: -1,
      network: "testnet",
      deployed_at: "2024-06-03T12:00:00Z",
      created_at: "2024-06-03T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});
