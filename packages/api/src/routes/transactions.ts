import type { FastifyInstance } from "fastify";
import type { TransactionRepository } from "@aleo-foundry/db";
import { NotFoundError } from "../errors.js";

export function transactionRoutes(transactionRepository: TransactionRepository) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get("/transactions/:txId", async (request, reply) => {
      const { txId } = request.params as { txId: string };
      const tx = await transactionRepository.findByTxId(txId);

      if (!tx) {
        throw new NotFoundError("Transaction", txId);
      }

      return reply.send({ data: tx });
    });
  };
}
