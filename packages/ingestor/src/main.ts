import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadEnv, TESTNET_CONFIG, MAINNET_CONFIG } from "@aleo-foundry/shared";
import type { Network, ProvableFinalizeAction } from "@aleo-foundry/shared";
import {
  normalizeBlock,
  normalizeTransaction,
  normalizeTransition,
  normalizeFee,
  normalizeDeployment,
  normalizeMappingChange,
} from "@aleo-foundry/normalizer";
import {
  createKafkaClient,
  createKafkaProducer,
  PipelineMetrics,
  DlqProducer,
  EventPublisher,
} from "@aleo-foundry/streaming";
import type { PublishEventInput } from "@aleo-foundry/streaming";
import { ProvableApiSource } from "./provable-api-source.js";
import { CheckpointStore } from "./checkpoint-store.js";
import { Poller } from "./poller.js";

async function main() {
  const env = loadEnv();
  const networkConfig = env.NETWORK === "testnet" ? TESTNET_CONFIG : MAINNET_CONFIG;
  const network: Network = env.NETWORK;

  console.log(`Starting ingestor for ${env.NETWORK}`);

  const kafka = createKafkaClient({
    brokers: env.KAFKA_BROKERS.split(",").map((b) => b.trim()).filter(Boolean),
    clientId: env.KAFKA_CLIENT_ID,
  });
  const metrics = new PipelineMetrics();
  const dlq = new DlqProducer(createKafkaProducer(kafka), metrics);
  const publisher = new EventPublisher(createKafkaProducer(kafka), {
    network,
    metrics,
    dlq,
  });
  await publisher.connect();

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
    const blockKey = `${height}:${blockHash}`;

    await publisher.publish({
      entity: "blocks",
      variant: "raw",
      naturalKey: blockKey,
      payload: block,
    });

    const blockResult = normalizeBlock(network, height, block);
    await publisher.publish({
      entity: "blocks",
      variant: "normalized",
      naturalKey: blockKey,
      payload: blockResult.serving,
    });

    const blockTxs = block.transactions;
    for (const blockTx of blockTxs) {
      const body = blockTx.transaction;
      const txId = body.id;

      await publisher.publish({
        entity: "transactions",
        variant: "raw",
        naturalKey: txId,
        payload: blockTx,
      });

      const txResult = normalizeTransaction(network, height, blockHash, blockTx);
      await publisher.publish({
        entity: "transactions",
        variant: "normalized",
        naturalKey: txId,
        payload: txResult.serving,
      });

      if (body.execution) {
        for (const transition of body.execution.transitions) {
          await publisher.publish({
            entity: "transitions",
            variant: "raw",
            naturalKey: transition.id,
            payload: transition,
          });

          const transResult = normalizeTransition(network, txId, transition);
          await publisher.publish({
            entity: "transitions",
            variant: "normalized",
            naturalKey: transition.id,
            payload: transResult.serving,
          });
        }
      }

      if (body.type === "deploy" && body.deploy !== undefined) {
        const deployResult = normalizeDeployment(
          network,
          txId,
          blockResult.serving.timestamp,
          body,
        );
        if (deployResult) {
          const programId = deployResult.serving.program_id;
          await publisher.publish({
            entity: "deployments",
            variant: "raw",
            naturalKey: txId,
            payload: { tx_id: txId, deployment: body.deploy },
          });
          await publisher.publish({
            entity: "programs",
            variant: "raw",
            naturalKey: programId,
            payload: body.deploy,
          });
          await publisher.publish({
            entity: "deployments",
            variant: "normalized",
            naturalKey: `${txId}:${programId}`,
            payload: deployResult.serving,
          });
          await publisher.publish({
            entity: "programs",
            variant: "normalized",
            naturalKey: programId,
            payload: deployResult.serving,
          });
        }
      }

      if (body.fee) {
        await publisher.publish({
          entity: "fees",
          variant: "raw",
          naturalKey: `${txId}:${body.fee.transition.id}`,
          payload: body.fee,
        });

        const feeResult = normalizeFee(network, txId, body.fee);
        await publisher.publish({
          entity: "fees",
          variant: "normalized",
          naturalKey: `${txId}:${feeResult.serving.transition_id}`,
          payload: feeResult.serving,
        });
      }
    }

    const txResponses = data.transactions;
    for (const tx of txResponses) {
      if (tx.finalize && tx.finalize.length > 0) {
        const txId = tx.id;
        for (const action of tx.finalize as ProvableFinalizeAction[]) {
          const programId = action.mapping_id?.split("/")[0] ?? "";
          const transitionId = `${txId}:${action.index}`;
          const naturalKey = `${txId}:${action.index}`;

          await publisher.publish({
            entity: "mapping-changes",
            variant: "raw",
            naturalKey,
            payload: { tx_id: txId, transition_id: transitionId, action },
          });

          const changeResult = normalizeMappingChange(
            network,
            txId,
            transitionId,
            programId,
            action,
          );
          await publisher.publish({
            entity: "mapping-changes",
            variant: "normalized",
            naturalKey,
            payload: changeResult.serving,
          });
        }
      }
    }

    const now = new Date().toISOString();
    await publisher.publish({
      entity: "chain-metadata",
      variant: "raw",
      naturalKey: network,
      payload: {
        network,
        latest_height: height,
        latest_hash: blockHash,
      },
    });
    await publisher.publish({
      entity: "chain-metadata",
      variant: "normalized",
      naturalKey: network,
      payload: {
        network,
        latest_height: height,
        latest_hash: blockHash,
        updated_at: now,
      },
    });

    console.log(`Published block ${height} events to Kafka`);
  });

  console.log("Starting polling...");
  await poller.start();

  const shutdown = async () => {
    console.log("\nShutting down...");
    poller.stop();
    await publisher.disconnect();
    await dlq.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Ingestor failed:", err);
  process.exit(1);
});