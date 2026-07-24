import type { FastifyInstance } from "fastify";
import type { TransactionRepository } from "@aleo-foundry/db";
import { NotFoundError } from "../errors.js";
import { encodeCursor, decodeCursor, parseLimit } from "../utils.js";

export function transactionRoutes(transactionRepository: TransactionRepository) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get("/transactions", async (request, reply) => {
      const { limit: rawLimit, cursor: rawCursor } = request.query as {
        limit?: unknown;
        cursor?: string;
      };

      const limit = parseLimit(rawLimit);
      const decodedCursor = rawCursor ? decodeCursor(rawCursor) : undefined;

      const rows = await transactionRepository.findAll(limit + 1, decodedCursor);
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor =
        hasMore && data.length > 0
          ? encodeCursor(data[data.length - 1].tx_id)
          : null;

      return reply.send({
        data,
        meta: { cursor: nextCursor, hasMore },
      });
    });

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
