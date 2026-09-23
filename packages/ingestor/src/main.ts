import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadEnv, TESTNET_CONFIG, MAINNET_CONFIG } from "@aleo-foundry/shared";
import type { Network } from "@aleo-foundry/shared";
import {
  createKafkaClient,
  createKafkaProducer,
  PipelineMetrics,
  DlqProducer,
  EventPublisher,
} from "@aleo-foundry/streaming";
import { ProvableApiSource } from "./provable-api-source.js";
import { CheckpointStore } from "./checkpoint-store.js";
import { Poller } from "./poller.js";
import { createBlockPublisher } from "./publish-block.js";

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
    maxConcurrency: env.INGESTOR_MAX_CONCURRENCY,
  }, createBlockPublisher(publisher, network));

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