import type { FastifyInstance } from "fastify";
import type { BlockRepository } from "@aleo-foundry/db";
import { NotFoundError } from "../errors.js";
import { encodeCursor, decodeCursor, parseLimit } from "../utils.js";

export function blockRoutes(blockRepository: BlockRepository) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get("/blocks", async (request, reply) => {
      const { limit: rawLimit, cursor: rawCursor } = request.query as {
        limit?: unknown;
        cursor?: string;
      };

      const limit = parseLimit(rawLimit);
      const decodedCursor = rawCursor ? Number(decodeCursor(rawCursor)) : undefined;

      const rows = await blockRepository.findAll(limit + 1, decodedCursor);
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor =
        hasMore && data.length > 0
          ? encodeCursor(data[data.length - 1].height)
          : null;

      return reply.send({
        data,
        meta: { cursor: nextCursor, hasMore },
      });
    });

    app.get("/blocks/:height", async (request, reply) => {
      const { height } = request.params as { height: string };
      const block = await blockRepository.findByHeight(Number(height));

      if (!block) {
        throw new NotFoundError("Block", height);
      }

      return reply.send({ data: block });
    });
  };
}
