import type {
  ProvableBlockResponse,
  ProvableBlockTransaction,
  ProvableTransition,
  ProvableFee,
  ProvableTransactionBody,
  ProvableFinalizeAction,
} from "@aleo-foundry/shared";
import type {
  Network,
  CanonicalBlock,
  CanonicalTransaction,
  CanonicalTransition,
  CanonicalFee,
  CanonicalDeployment,
  CanonicalMappingChange,
} from "@aleo-foundry/shared";

export function normalizeBlock(
  network: Network,
  height: number,
  block: ProvableBlockResponse,
): CanonicalBlock {
  return {
    version: 1,
    network,
    height,
    blockHash: block.block_hash,
    previousHash: block.previous_hash,
    timestamp: unixToIso(Number(block.header.metadata.timestamp)),
    coinbaseTarget: block.header.metadata.coinbase_target,
    proofTarget: block.header.metadata.proof_target,
    lastCoinbaseTarget: block.header.metadata.last_coinbase_target,
    lastCoinbaseRatio: block.header.metadata.last_coinbase_ratio,
    round: block.header.metadata.round,
    transactionsRoot: block.header.transactions_root,
    previousStateRoot: block.header.previous_state_root,
    transactionsCount: block.transactions.length,
    abortedTransactionsCount: block.aborted_transaction_ids?.length ?? 0,
  };
}

export function normalizeTransaction(
  network: Network,
  height: number,
  blockHash: string,
  blockTx: ProvableBlockTransaction,
): CanonicalTransaction {
  const txType = mapTransactionType(blockTx.transaction.type);
  const txStatus = mapTransactionStatus(blockTx.status);

  return {
    version: 1,
    network,
    blockHeight: height,
    blockHash,
    txId: blockTx.transaction.id,
    indexInBlock: blockTx.index,
    type: txType,
    status: txStatus,
    globalStateRoot: extractGlobalStateRoot(blockTx.transaction),
  };
}

export function normalizeTransition(
  network: Network,
  txId: string,
  transition: ProvableTransition,
): CanonicalTransition {
  return {
    version: 1,
    network,
    txId,
    transitionId: transition.id,
    programId: transition.program,
    functionName: transition.function,
    inputs: transition.inputs,
    outputs: transition.outputs,
    tpk: transition.tpk,
    tcm: transition.tcm,
  };
}

export function normalizeFee(
  network: Network,
  txId: string,
  fee: ProvableFee,
): CanonicalFee {
  const payer = fee.transition.inputs[0]?.value ?? "";
  const amountStr = fee.transition.inputs[1]?.value ?? "0";
  const amount = parseU64Amount(amountStr);

  return {
    version: 1,
    network,
    txId,
    transitionId: fee.transition.id,
    payer,
    amount,
    globalStateRoot: fee.global_state_root,
  };
}

export function normalizeDeployment(
  network: Network,
  txId: string,
  timestamp: string,
  body: ProvableTransactionBody,
): CanonicalDeployment | null {
  if (body.type !== "deploy") return null;

  const deploy = body.deploy as Record<string, unknown> | undefined;
  if (!deploy) return null;

  const programId = deploy.program_id as string | undefined;
  const edition = deploy.edition as number | undefined;
  if (!programId || edition === undefined) return null;

  return {
    version: 1,
    network,
    txId,
    programId,
    edition,
    timestamp,
  };
}

export function normalizeMappingChange(
  network: Network,
  txId: string,
  transitionId: string,
  programId: string,
  action: ProvableFinalizeAction,
): CanonicalMappingChange {
  return {
    version: 1,
    network,
    txId,
    transitionId,
    programId,
    mappingId: action.mapping_id,
    mappingName: "",
    action: action.type === "set" ? "set" : "remove",
    keyId: action.key_id,
    valueId: action.value_id,
    indexInTransition: action.index,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function unixToIso(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

function mapTransactionType(type: string): "execute" | "deploy" | "fee" {
  if (type === "deploy") return "deploy";
  if (type === "fee") return "fee";
  return "execute";
}

function mapTransactionStatus(status: string): "accepted" | "rejected" {
  if (status === "rejected") return "rejected";
  return "accepted";
}

function extractGlobalStateRoot(body: ProvableTransactionBody): string {
  if (body.execution) return body.execution.global_state_root;
  if (body.fee) return body.fee.global_state_root;
  return "";
}

function parseU64Amount(value: string): number {
  const match = value.match(/^(\d+)u64$/);
  if (match) return Number(match[1]);
  return Number(value) || 0;
}
