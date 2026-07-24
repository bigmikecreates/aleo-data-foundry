import { z } from "zod";

// ─── Block Header ────────────────────────────────────────────────

const ProvableBlockMetadataSchema = z.object({
  network: z.number(),
  round: z.string(),
  coinbase_target: z.string(),
  proof_target: z.string(),
  last_coinbase_target: z.string(),
  last_coinbase_ratio: z.string(),
  timestamp: z.string(),
});

const ProvableBlockHeaderSchema = z.object({
  previous_state_root: z.string(),
  transactions_root: z.string(),
  finalize_root: z.string(),
  ratifications_root: z.string(),
  solutions_root: z.string(),
  subdag_root: z.string(),
  metadata: ProvableBlockMetadataSchema,
});

// ─── Transaction Types ───────────────────────────────────────────

const ProvableInputSchema = z.object({
  type: z.string(),
  id: z.string(),
  value: z.string(),
});

const ProvableOutputSchema = z.object({
  type: z.string(),
  id: z.string(),
  value: z.string(),
});

const ProvableTransitionSchema = z.object({
  id: z.string(),
  program: z.string(),
  function: z.string(),
  inputs: z.array(ProvableInputSchema),
  outputs: z.array(ProvableOutputSchema),
  tpk: z.string(),
  tcm: z.string(),
  scm: z.string().optional(),
});

const ProvableExecutionSchema = z.object({
  transitions: z.array(ProvableTransitionSchema),
  global_state_root: z.string(),
  proof: z.string(),
});

const ProvableFeeTransitionSchema = z.object({
  id: z.string(),
  program: z.string(),
  function: z.string(),
  inputs: z.array(ProvableInputSchema),
  outputs: z.array(ProvableOutputSchema),
  tpk: z.string(),
  tcm: z.string(),
  scm: z.string().optional(),
});

const ProvableFeeSchema = z.object({
  transition: ProvableFeeTransitionSchema,
  global_state_root: z.string(),
  proof: z.string(),
});

const ProvableFinalizeActionSchema = z.object({
  type: z.string(),
  mapping_id: z.string(),
  index: z.number(),
  key_id: z.string(),
  value_id: z.string(),
});

const ProvableTransactionBodySchema = z.object({
  type: z.string(),
  id: z.string(),
  execution: ProvableExecutionSchema.optional(),
  fee: ProvableFeeSchema.optional(),
  deploy: z.unknown().optional(),
});

// ─── Block-Level Transaction ─────────────────────────────────────

const ProvableBlockTransactionSchema = z.object({
  status: z.string(),
  type: z.string(),
  index: z.number(),
  transaction: ProvableTransactionBodySchema,
});

// ─── Ratification ────────────────────────────────────────────────

const ProvableRatificationSchema = z.object({
  type: z.string(),
  id: z.string().optional(),
  amount: z.number().optional(),
});

// ─── Full Block Response ─────────────────────────────────────────

export const ProvableBlockResponseSchema = z.object({
  block_hash: z.string(),
  previous_hash: z.string(),
  header: ProvableBlockHeaderSchema,
  transactions: z.array(ProvableBlockTransactionSchema),
  aborted_transaction_ids: z.array(z.string()).optional(),
  ratifications: z.array(ProvableRatificationSchema).optional(),
});

// ─── Transaction Response ────────────────────────────────────────

export const ProvableTransactionResponseSchema = z.object({
  type: z.string(),
  id: z.string(),
  execution: ProvableExecutionSchema.optional(),
  fee: ProvableFeeSchema.optional(),
  deploy: z.unknown().optional(),
  finalize: z.array(ProvableFinalizeActionSchema).optional(),
});

// ─── Block Transactions Response ─────────────────────────────────

export const ProvableBlockTransactionsResponseSchema = z.object({
  transactions: z.array(ProvableBlockTransactionSchema),
});

// ─── Type exports ───────────────────────────────────────────────

export type ProvableBlockResponse = z.infer<typeof ProvableBlockResponseSchema>;
export type ProvableTransactionResponse = z.infer<typeof ProvableTransactionResponseSchema>;
export type ProvableBlockTransactionsResponse = z.infer<typeof ProvableBlockTransactionsResponseSchema>;

// ─── Sub-schema type exports ─────────────────────────────────────

export type ProvableBlockHeader = z.infer<typeof ProvableBlockHeaderSchema>;
export type ProvableBlockMetadata = z.infer<typeof ProvableBlockMetadataSchema>;
export type ProvableBlockTransaction = z.infer<typeof ProvableBlockTransactionSchema>;
export type ProvableTransactionBody = z.infer<typeof ProvableTransactionBodySchema>;
export type ProvableExecution = z.infer<typeof ProvableExecutionSchema>;
export type ProvableTransition = z.infer<typeof ProvableTransitionSchema>;
export type ProvableFee = z.infer<typeof ProvableFeeSchema>;
export type ProvableFeeTransition = z.infer<typeof ProvableFeeTransitionSchema>;
export type ProvableInput = z.infer<typeof ProvableInputSchema>;
export type ProvableOutput = z.infer<typeof ProvableOutputSchema>;
export type ProvableFinalizeAction = z.infer<typeof ProvableFinalizeActionSchema>;

// ─── Re-export sub-schemas for testing ───────────────────────────

export {
  ProvableBlockHeaderSchema,
  ProvableBlockMetadataSchema,
  ProvableBlockTransactionSchema,
  ProvableTransactionBodySchema,
  ProvableExecutionSchema,
  ProvableTransitionSchema,
  ProvableFeeSchema,
  ProvableFeeTransitionSchema,
  ProvableInputSchema,
  ProvableOutputSchema,
  ProvableFinalizeActionSchema,
};
