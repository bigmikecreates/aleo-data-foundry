import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadEnv, parseDatabaseUrl, TESTNET_CONFIG, MAINNET_CONFIG } from "@aleo-foundry/shared";
import type { Network, ProvableFinalizeAction } from "@aleo-foundry/shared";
import {
  DatabaseClient,
  BlockRepository,
  TransactionRepository,
  TransitionRepository,
  ProgramRepository,
  MappingChangeRepository,
  FeeRepository,
  ChainMetadataRepository,
  migrate,
} from "@aleo-foundry/db";
import {
  normalizeBlock,
  normalizeTransaction,
  normalizeTransition,
  normalizeFee,
  normalizeDeployment,
  normalizeMappingChange,
} from "@aleo-foundry/normalizer";
import { ProvableApiSource } from "./provable-api-source.js";
import { CheckpointStore } from "./checkpoint-store.js";
import { Poller } from "./poller.js";

async function main() {
  const env = loadEnv();
  const dbConfig = parseDatabaseUrl(env.DATABASE_URL);
  const networkConfig = env.NETWORK === "testnet" ? TESTNET_CONFIG : MAINNET_CONFIG;
  const network: Network = env.NETWORK;

  console.log(`Starting ingestor for ${env.NETWORK}`);

  // Database
  const client = new DatabaseClient(dbConfig);
  console.log("Running migrations...");
  await migrate(client);
  console.log("Migrations complete.");

  const repos = {
    blockRepository: new BlockRepository(client),
    transactionRepository: new TransactionRepository(client),
    transitionRepository: new TransitionRepository(client),
    programRepository: new ProgramRepository(client),
    mappingChangeRepository: new MappingChangeRepository(client),
    feeRepository: new FeeRepository(client),
    chainMetadataRepository: new ChainMetadataRepository(client),
  };

  // Ingestor
  const source = new ProvableApiSource(networkConfig);
  await mkdir(env.CHECKPOINT_DIR, { recursive: true });
  const checkpointStore = new CheckpointStore(join(env.CHECKPOINT_DIR, "checkpoint.json"));

  const poller = new Poller(source, checkpointStore, {
    network: env.NETWORK,
    source: "provable-api",
    pollingIntervalMs: env.POLLING_INTERVAL_MS,
  }, async (data) => {
    const { height, block } = data;
    const blockHash = block.block_hash;

    // Normalize and insert block
    const blockResult = normalizeBlock(network, height, block);
    await repos.blockRepository.insert(blockResult.serving);

    // Process block-level transactions (ProvableBlockTransaction[] — wrapped
    // with status/type/index, already present on the block response)
    const blockTxs = block.transactions;
    for (const blockTx of blockTxs) {
      const body = blockTx.transaction;
      const txId = body.id;

      // Normalize and insert transaction
      const txResult = normalizeTransaction(network, height, blockHash, blockTx);
      await repos.transactionRepository.insert(txResult.serving);

      // Process execution transitions
      if (body.execution) {
        for (const transition of body.execution.transitions) {
          const transResult = normalizeTransition(network, txId, transition);
          await repos.transitionRepository.insert(transResult.serving);
        }
      }

      // Process deployments
      if (body.type === "deploy") {
        const deployResult = normalizeDeployment(network, txId, blockResult.serving.timestamp, body);
        if (deployResult) {
          await repos.programRepository.insert(deployResult.serving);
        }
      }

      // Process fees
      if (body.fee) {
        const feeResult = normalizeFee(network, txId, body.fee);
        await repos.feeRepository.insert(feeResult.serving);
      }
    }

    // Process transaction-level finalize actions (mapping changes)
    // from the Poller's separate transaction responses
    const txResponses = data.transactions;
    for (const tx of txResponses) {
      if (tx.finalize && tx.finalize.length > 0) {
        const txId = tx.id;
        const blockTx = blockTxs.find((bt) => bt.transaction.id === txId);
        const indexInBlock = blockTx?.index ?? 0;

        for (const action of tx.finalize as ProvableFinalizeAction[]) {
          const programId = action.mapping_id?.split("/")[0] ?? "";
          const transitionId = `${txId}:${action.index}`;
          const changeResult = normalizeMappingChange(network, txId, transitionId, programId, action);
          await repos.mappingChangeRepository.insert(changeResult.serving);
        }
      }
    }

    // Update chain metadata
    await repos.chainMetadataRepository.upsert({
      network: env.NETWORK,
      latest_height: height,
      latest_hash: blockHash,
    });

    console.log(`Processed block ${height}`);
  });

  console.log("Starting polling...");
  await poller.start();
}

main().catch((err) => {
  console.error("Ingestor failed:", err);
  process.exit(1);
});
