import Fastify from "fastify";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRoutes } from "./routes/health.js";
import { blockRoutes } from "./routes/blocks.js";
import { transactionRoutes } from "./routes/transactions.js";
import { transitionRoutes } from "./routes/transitions.js";
import { programRoutes } from "./routes/programs.js";

export async function buildServer() {
  const app = Fastify({ logger: false });

  app.setErrorHandler(errorHandler);

  await app.register(healthRoutes);
  await app.register(blockRoutes);
  await app.register(transactionRoutes);
  await app.register(transitionRoutes);
  await app.register(programRoutes);

  return app;
}
