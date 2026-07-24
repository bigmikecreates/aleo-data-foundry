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
  BlockRow,
  TransactionRow,
  TransitionRow,
  FeeRow,
  ProgramRow,
  MappingChangeRow,
} from "@aleo-foundry/shared";

export type TransformResult<T2, T3> = { canonical: T2; serving: T3 };

export function normalizeBlock(
  network: Network,
  height: number,
  block: ProvableBlockResponse,
): TransformResult<CanonicalBlock, BlockRow> {
  const now = new Date().toISOString();

  const canonical: CanonicalBlock = {
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

  const serving: BlockRow = {
    height,
    block_hash: block.block_hash,
    previous_hash: block.previous_hash,
    network,
    timestamp: canonical.timestamp,
    coinbase_target: block.header.metadata.coinbase_target,
    proof_target: block.header.metadata.proof_target,
    last_coinbase_target: block.header.metadata.last_coinbase_target,
    last_coinbase_ratio: block.header.metadata.last_coinbase_ratio,
    round: block.header.metadata.round,
    transactions_root: block.header.transactions_root,
    previous_state_root: block.header.previous_state_root,
    transactions_count: canonical.transactionsCount,
    aborted_transactions_count: canonical.abortedTransactionsCount,
    created_at: now,
  };

  return { canonical, serving };
}

export function normalizeTransaction(
  network: Network,
  height: number,
  blockHash: string,
  blockTx: ProvableBlockTransaction,
): TransformResult<CanonicalTransaction, TransactionRow> {
  const now = new Date().toISOString();
  const txType = mapTransactionType(blockTx.transaction.type);
  const txStatus = mapTransactionStatus(blockTx.status);

  const canonical: CanonicalTransaction = {
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

  const serving: TransactionRow = {
    tx_id: blockTx.transaction.id,
    block_height: height,
    block_hash: blockHash,
    network,
    type: txType,
    status: txStatus,
    index_in_block: blockTx.index,
    global_state_root: canonical.globalStateRoot,
    created_at: now,
  };

  return { canonical, serving };
}

export function normalizeTransition(
  network: Network,
  txId: string,
  transition: ProvableTransition,
): TransformResult<CanonicalTransition, TransitionRow> {
  const now = new Date().toISOString();

  const canonical: CanonicalTransition = {
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

  const serving: TransitionRow = {
    transition_id: transition.id,
    tx_id: txId,
    program_id: transition.program,
    function_name: transition.function,
    inputs_json: JSON.stringify(transition.inputs),
    outputs_json: JSON.stringify(transition.outputs),
    tpk: transition.tpk,
    tcm: transition.tcm,
    created_at: now,
  };

  return { canonical, serving };
}

export function normalizeFee(
  network: Network,
  txId: string,
  fee: ProvableFee,
): TransformResult<CanonicalFee, FeeRow> {
  const now = new Date().toISOString();
  const payer = fee.transition.inputs[0]?.value ?? "";
  const amountStr = fee.transition.inputs[1]?.value ?? "0";
  const amount = parseU64Amount(amountStr);

  const canonical: CanonicalFee = {
    version: 1,
    network,
    txId,
    transitionId: fee.transition.id,
    payer,
    amount,
    globalStateRoot: fee.global_state_root,
  };

  const serving: FeeRow = {
    tx_id: txId,
    transition_id: fee.transition.id,
    payer,
    amount,
    global_state_root: fee.global_state_root,
    network,
    created_at: now,
  };

  return { canonical, serving };
}

export function normalizeDeployment(
  network: Network,
  txId: string,
  timestamp: string,
  body: ProvableTransactionBody,
): TransformResult<CanonicalDeployment, ProgramRow> | null {
  if (body.type !== "deploy") return null;

  const deploy = body.deploy as Record<string, unknown> | undefined;
  if (!deploy) return null;

  const programId = deploy.program_id as string | undefined;
  const edition = deploy.edition as number | undefined;
  if (!programId || edition === undefined) return null;

  const now = new Date().toISOString();

  const canonical: CanonicalDeployment = {
    version: 1,
    network,
    txId,
    programId,
    edition,
    timestamp,
  };

  const serving: ProgramRow = {
    program_id: programId,
    network,
    edition,
    deployment_tx_id: txId,
    deployed_at: timestamp,
    created_at: now,
  };

  return { canonical, serving };
}

export function normalizeMappingChange(
  network: Network,
  txId: string,
  transitionId: string,
  programId: string,
  action: ProvableFinalizeAction,
): TransformResult<CanonicalMappingChange, MappingChangeRow> {
  const now = new Date().toISOString();

  const canonical: CanonicalMappingChange = {
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

  const serving: MappingChangeRow = {
    id: 1,
    tx_id: txId,
    transition_id: transitionId,
    program_id: programId,
    mapping_name: "",
    mapping_id: action.mapping_id,
    action: canonical.action,
    key_id: action.key_id,
    value_id: action.value_id,
    index_in_transition: action.index,
    network,
    created_at: now,
  };

  return { canonical, serving };
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
