import type { FastifyInstance } from "fastify";
import type { FeeRepository } from "@aleo-foundry/db";
import { encodeCursor, decodeCursor, parseLimit } from "../utils.js";

export function feeRoutes(feeRepository: FeeRepository) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get("/fees", async (request, reply) => {
      const { limit: rawLimit, cursor: rawCursor } = request.query as {
        limit?: unknown;
        cursor?: string;
      };

      const limit = parseLimit(rawLimit);
      const decodedCursor = rawCursor
        ? BigInt(decodeCursor(rawCursor))
        : undefined;

      const rows = await feeRepository.findAll(limit + 1, decodedCursor);
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor =
        hasMore && data.length > 0
          ? encodeCursor(data[data.length - 1].id)
          : null;

      return reply.send({
        data,
        meta: { cursor: nextCursor, hasMore },
      });
    });
  };
}
