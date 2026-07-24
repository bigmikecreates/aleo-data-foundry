import { z } from "zod";
import { NetworkSchema, TransactionTypeSchema, TransactionStatusSchema, MappingActionSchema } from "./canonical.js";

// ─── Block Row ───────────────────────────────────────────────────

export const BlockRowSchema = z.object({
  height: z.number().int().nonnegative(),
  block_hash: z.string(),
  previous_hash: z.string(),
  network: NetworkSchema,
  timestamp: z.string().datetime(),
  coinbase_target: z.string(),
  proof_target: z.string(),
  last_coinbase_target: z.string(),
  last_coinbase_ratio: z.string(),
  round: z.string(),
  transactions_root: z.string(),
  previous_state_root: z.string(),
  transactions_count: z.number().int().nonnegative(),
  aborted_transactions_count: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});
export type BlockRow = z.infer<typeof BlockRowSchema>;

// ─── Transaction Row ─────────────────────────────────────────────

export const TransactionRowSchema = z.object({
  tx_id: z.string(),
  block_height: z.number().int().nonnegative(),
  block_hash: z.string(),
  network: NetworkSchema,
  type: TransactionTypeSchema,
  status: TransactionStatusSchema,
  index_in_block: z.number().int().nonnegative(),
  global_state_root: z.string(),
  created_at: z.string().datetime(),
});
export type TransactionRow = z.infer<typeof TransactionRowSchema>;

// ─── Transition Row ──────────────────────────────────────────────

export const TransitionRowSchema = z.object({
  transition_id: z.string(),
  tx_id: z.string(),
  program_id: z.string(),
  function_name: z.string(),
  inputs_json: z.string(),
  outputs_json: z.string(),
  tpk: z.string(),
  tcm: z.string(),
  created_at: z.string().datetime(),
});
export type TransitionRow = z.infer<typeof TransitionRowSchema>;

// ─── Program Row ─────────────────────────────────────────────────

export const ProgramRowSchema = z.object({
  program_id: z.string(),
  network: NetworkSchema,
  edition: z.number().int().nonnegative(),
  deployment_tx_id: z.string(),
  deployed_at: z.string().datetime(),
  created_at: z.string().datetime(),
});
export type ProgramRow = z.infer<typeof ProgramRowSchema>;

// ─── Mapping Change Row ──────────────────────────────────────────

export const MappingChangeRowSchema = z.object({
  id: z.number().int().positive(),
  tx_id: z.string(),
  transition_id: z.string(),
  program_id: z.string(),
  mapping_name: z.string(),
  mapping_id: z.string(),
  action: MappingActionSchema,
  key_id: z.string(),
  value_id: z.string(),
  index_in_transition: z.number().int().nonnegative(),
  network: NetworkSchema,
  created_at: z.string().datetime(),
});
export type MappingChangeRow = z.infer<typeof MappingChangeRowSchema>;

// ─── Fee Row ─────────────────────────────────────────────────────

export const FeeRowSchema = z.object({
  tx_id: z.string(),
  transition_id: z.string(),
  payer: z.string(),
  amount: z.number().int().nonnegative(),
  global_state_root: z.string(),
  network: NetworkSchema,
  created_at: z.string().datetime(),
});
export type FeeRow = z.infer<typeof FeeRowSchema>;

// ─── Chain Metadata Row ──────────────────────────────────────────

export const ChainMetadataRowSchema = z.object({
  network: NetworkSchema,
  latest_height: z.number().int().nonnegative(),
  latest_hash: z.string(),
  updated_at: z.string().datetime(),
});
export type ChainMetadataRow = z.infer<typeof ChainMetadataRowSchema>;

// ─── Deploy Row ──────────────────────────────────────────────────

export const DeployRowSchema = z.object({
  tx_id: z.string(),
  program_id: z.string(),
  edition: z.number().int().nonnegative(),
  network: NetworkSchema,
  deployed_at: z.string().datetime(),
  created_at: z.string().datetime(),
});
export type DeployRow = z.infer<typeof DeployRowSchema>;
