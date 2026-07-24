import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { errorHandler } from "./middleware/error-handler.js";
import { etagOnSend } from "./middleware/etag.js";
import { healthRoutes } from "./routes/health.js";
import { blockRoutes } from "./routes/blocks.js";
import { transactionRoutes } from "./routes/transactions.js";
import { transitionRoutes } from "./routes/transitions.js";
import { programRoutes } from "./routes/programs.js";
import { mappingChangeRoutes } from "./routes/mapping-changes.js";
import { feeRoutes } from "./routes/fees.js";
import { chainMetadataRoutes } from "./routes/chain-metadata.js";
import type {
  BlockRepository,
  TransactionRepository,
  TransitionRepository,
  ProgramRepository,
  MappingChangeRepository,
  FeeRepository,
  ChainMetadataRepository,
} from "@aleo-foundry/db";

export interface AppContext {
  blockRepository: BlockRepository;
  transactionRepository: TransactionRepository;
  transitionRepository: TransitionRepository;
  programRepository: ProgramRepository;
  mappingChangeRepository: MappingChangeRepository;
  feeRepository: FeeRepository;
  chainMetadataRepository: ChainMetadataRepository;
}

/**
 * Recursively convert BigInt values to strings for JSON serialization.
 */
function serializePayload(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializePayload);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serializePayload(val);
    }
    return result;
  }
  return value;
}

export async function buildServer(ctx: AppContext): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.setErrorHandler(errorHandler);

  // Recursively serialize BigInt to string before JSON encoding
  app.addHook("preSerialization", async (_request, _reply, payload) => {
    return serializePayload(payload);
  });

  app.addHook("onSend", etagOnSend);

  await app.register(healthRoutes);
  await app.register(blockRoutes(ctx.blockRepository));
  await app.register(transactionRoutes(ctx.transactionRepository));
  await app.register(transitionRoutes(ctx.transitionRepository));
  await app.register(programRoutes(ctx.programRepository));
  await app.register(mappingChangeRoutes(ctx.mappingChangeRepository));
  await app.register(feeRoutes(ctx.feeRepository));
  await app.register(chainMetadataRoutes(ctx.chainMetadataRepository));

  return app;
}
