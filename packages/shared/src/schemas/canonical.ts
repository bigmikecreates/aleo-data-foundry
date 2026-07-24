import { z } from "zod";

// ─── Shared Enums ────────────────────────────────────────────────

export const NetworkSchema = z.enum(["testnet", "mainnet"]);
export type Network = z.infer<typeof NetworkSchema>;

export const TransactionTypeSchema = z.enum(["execute", "deploy", "fee"]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const TransactionStatusSchema = z.enum(["accepted", "rejected"]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export const MappingActionSchema = z.enum(["set", "remove"]);
export type MappingAction = z.infer<typeof MappingActionSchema>;

// ─── Canonical Block ─────────────────────────────────────────────

export const CanonicalBlockSchema = z.object({
  version: z.literal(1),
  network: NetworkSchema,
  height: z.number().int().nonnegative(),
  blockHash: z.string(),
  previousHash: z.string(),
  timestamp: z.string().datetime(),
  coinbaseTarget: z.string(),
  proofTarget: z.string(),
  lastCoinbaseTarget: z.string(),
  lastCoinbaseRatio: z.string(),
  round: z.string(),
  transactionsRoot: z.string(),
  previousStateRoot: z.string(),
  transactionsCount: z.number().int().nonnegative(),
  abortedTransactionsCount: z.number().int().nonnegative(),
});
export type CanonicalBlock = z.infer<typeof CanonicalBlockSchema>;

// ─── Canonical Transaction ───────────────────────────────────────

export const CanonicalTransactionSchema = z.object({
  version: z.literal(1),
  network: NetworkSchema,
  blockHeight: z.number().int().nonnegative(),
  blockHash: z.string(),
  txId: z.string(),
  indexInBlock: z.number().int().nonnegative(),
  type: TransactionTypeSchema,
  status: TransactionStatusSchema,
  globalStateRoot: z.string(),
});
export type CanonicalTransaction = z.infer<typeof CanonicalTransactionSchema>;

// ─── Canonical Transition ────────────────────────────────────────

export const TransitionInputSchema = z.object({
  type: z.string(),
  id: z.string(),
  value: z.string(),
});
export type TransitionInput = z.infer<typeof TransitionInputSchema>;

export const TransitionOutputSchema = z.object({
  type: z.string(),
  id: z.string(),
  value: z.string(),
});
export type TransitionOutput = z.infer<typeof TransitionOutputSchema>;

export const CanonicalTransitionSchema = z.object({
  version: z.literal(1),
  network: NetworkSchema,
  txId: z.string(),
  transitionId: z.string(),
  programId: z.string(),
  functionName: z.string(),
  inputs: z.array(TransitionInputSchema),
  outputs: z.array(TransitionOutputSchema),
  tpk: z.string(),
  tcm: z.string(),
});
export type CanonicalTransition = z.infer<typeof CanonicalTransitionSchema>;

// ─── Canonical Deployment ────────────────────────────────────────

export const CanonicalDeploymentSchema = z.object({
  version: z.literal(1),
  network: NetworkSchema,
  txId: z.string(),
  programId: z.string(),
  edition: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
});
export type CanonicalDeployment = z.infer<typeof CanonicalDeploymentSchema>;

// ─── Canonical Fee ───────────────────────────────────────────────

export const CanonicalFeeSchema = z.object({
  version: z.literal(1),
  network: NetworkSchema,
  txId: z.string(),
  transitionId: z.string(),
  payer: z.string(),
  amount: z.number().int().nonnegative(),
  globalStateRoot: z.string(),
});
export type CanonicalFee = z.infer<typeof CanonicalFeeSchema>;

// ─── Canonical Mapping Change ────────────────────────────────────

export const CanonicalMappingChangeSchema = z.object({
  version: z.literal(1),
  network: NetworkSchema,
  txId: z.string(),
  transitionId: z.string(),
  programId: z.string(),
  mappingName: z.string(),
  mappingId: z.string(),
  action: MappingActionSchema,
  keyId: z.string(),
  valueId: z.string(),
  indexInTransition: z.number().int().nonnegative(),
});
export type CanonicalMappingChange = z.infer<typeof CanonicalMappingChangeSchema>;

// ─── Canonical Chain Metadata ────────────────────────────────────

export const CanonicalChainMetadataSchema = z.object({
  version: z.literal(1),
  network: NetworkSchema,
  latestHeight: z.number().int().nonnegative(),
  latestHash: z.string(),
  timestamp: z.string().datetime(),
});
export type CanonicalChainMetadata = z.infer<typeof CanonicalChainMetadataSchema>;
