import { loadEnv, parseDatabaseUrl } from "@aleo-foundry/shared";
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
  createKafkaClient,
  createKafkaProducer,
  createKafkaConsumer,
  PipelineMetrics,
  DlqProducer,
  IngestionConsumer,
} from "@aleo-foundry/streaming";
import { createNormalizedEntityWriter } from "./entity-writer.js";

async function main() {
  const env = loadEnv();
  const dbConfig = parseDatabaseUrl(env.DATABASE_URL);

  console.log(`Connecting to Postgres at ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
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
  const writer = createNormalizedEntityWriter({
    blockRepository: repos.blockRepository,
    transactionRepository: repos.transactionRepository,
    transitionRepository: repos.transitionRepository,
    programRepository: repos.programRepository,
    feeRepository: repos.feeRepository,
    mappingChangeRepository: repos.mappingChangeRepository,
    chainMetadataRepository: repos.chainMetadataRepository,
  });

  const kafka = createKafkaClient({
    brokers: env.KAFKA_BROKERS.split(",").map((b) => b.trim()).filter(Boolean),
    clientId: env.KAFKA_CLIENT_ID,
  });
  const metrics = new PipelineMetrics();
  const dlq = new DlqProducer(createKafkaProducer(kafka), metrics);
  const consumer = new IngestionConsumer(
    createKafkaConsumer(kafka, { groupId: env.KAFKA_CONSUMER_GROUP }),
    writer,
    { dlq, metrics },
  );

  await dlq.connect();
  console.log("Starting normalized-event consumer...");
  await consumer.start();

  const shutdown = async () => {
    console.log("\nShutting down...");
    await consumer.stop();
    await dlq.disconnect();
    await client.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Consumer failed:", err);
  process.exit(1);
});