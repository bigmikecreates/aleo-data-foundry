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
import { buildServer } from "./server.js";

async function main() {
  const env = loadEnv();
  const dbConfig = parseDatabaseUrl(env.DATABASE_URL);

  console.log(`Connecting to Postgres at ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  const client = new DatabaseClient(dbConfig);

  console.log("Running migrations...");
  await migrate(client);
  console.log("Migrations complete.");

  const ctx = {
    blockRepository: new BlockRepository(client),
    transactionRepository: new TransactionRepository(client),
    transitionRepository: new TransitionRepository(client),
    programRepository: new ProgramRepository(client),
    mappingChangeRepository: new MappingChangeRepository(client),
    feeRepository: new FeeRepository(client),
    chainMetadataRepository: new ChainMetadataRepository(client),
  };

  const app = await buildServer(ctx);
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  console.log(`API server listening on http://0.0.0.0:${env.API_PORT}`);

  const shutdown = async () => {
    console.log("\nShutting down...");
    await app.close();
    await client.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start API server:", err);
  process.exit(1);
});
