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
import { runBackfill, BACKFILL_DEFAULT_CONCURRENCY } from "./backfill.js";
import { createBlockPublisher } from "./publish-block.js";

function usage(): string {
  return [
    "Usage: tsx packages/ingestor/src/backfill-main.ts <startHeight> [endHeight] [--concurrency N] [--retries N]",
    "",
    "  startHeight   inclusive first height to ingest",
    "  endHeight     inclusive last height (defaults to chain head)",
    "  --concurrency N  parallel fetches (default " + BACKFILL_DEFAULT_CONCURRENCY + ")",
    "  --retries N      per-block fetch retries (default 3)",
  ].join("\n");
}

function parseArgs(
  args: string[],
): { start?: number; end?: number; flags: Record<string, number> } {
  const flags: Record<string, number> = {};
  const positions: number[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      const value = Number(args[i + 1]);
      if (Number.isNaN(value)) {
        throw new Error(`Expected a number after --${name}`);
      }
      flags[name] = value;
      i++;
    } else {
      positions.push(Number(arg));
    }
  }

  return { start: positions[0], end: positions[1], flags };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (
    parsed.start === undefined ||
    !Number.isInteger(parsed.start) ||
    parsed.start < 0
  ) {
    console.error(usage());
    process.exit(1);
  }
  if (parsed.end !== undefined && !Number.isInteger(parsed.end)) {
    console.error(`Invalid endHeight: ${parsed.end}`);
    process.exit(1);
  }

  const env = loadEnv();
  const networkConfig =
    env.NETWORK === "testnet" ? TESTNET_CONFIG : MAINNET_CONFIG;
  const network: Network = env.NETWORK;

  const kafka = createKafkaClient({
    brokers: env.KAFKA_BROKERS.split(",")
      .map((b) => b.trim())
      .filter(Boolean),
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

  const source = new ProvableApiSource(networkConfig);
  await mkdir(env.CHECKPOINT_DIR, { recursive: true });

  const rangeEnd = parsed.end ?? (await source.getLatestHeight());
  const fileName = parsed.end === undefined
    ? `backfill-${parsed.start}-open.json`
    : `backfill-${parsed.start}-${parsed.end}.json`;
  const checkpointStore = new CheckpointStore(
    join(env.CHECKPOINT_DIR, fileName),
  );

  const concurrency = parsed.flags.concurrency ?? BACKFILL_DEFAULT_CONCURRENCY;
  const retries = parsed.flags.retries;

  console.log(
    `Backfill heights [${parsed.start}..${rangeEnd}] on ${env.NETWORK} (concurrency=${concurrency})`,
  );

  process.on("SIGINT", () => {
    console.log("\nBackfill interrupted — checkpoint persisted, rerun to resume.");
    publisher.disconnect().then(() => process.exit(0));
  });

  const finalHeight = await runBackfill({
    source,
    checkpointStore,
    network,
    start: parsed.start,
    end: parsed.end,
    maxConcurrency: concurrency,
    maxBlockRetries: retries,
    onBlock: createBlockPublisher(publisher, network),
    onProgress: ({ completed, total, currentHeight }) => {
      if (completed % 100 === 0 || completed === total) {
        console.log(`[backfill] ${completed}/${total} blocks (height ${currentHeight})`);
      }
    },
  });

  console.log(`Backfill complete at height ${finalHeight}`);
  await publisher.disconnect();
  await dlq.disconnect();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});