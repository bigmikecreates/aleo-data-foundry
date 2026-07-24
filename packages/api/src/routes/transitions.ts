import type { FastifyInstance } from "fastify";
import type { TransitionRepository } from "@aleo-foundry/db";
import { NotFoundError } from "../errors.js";
import { encodeCursor, decodeCursor, parseLimit } from "../utils.js";

export function transitionRoutes(transitionRepository: TransitionRepository) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get("/transitions", async (request, reply) => {
      const { limit: rawLimit, cursor: rawCursor } = request.query as {
        limit?: unknown;
        cursor?: string;
      };

      const limit = parseLimit(rawLimit);
      const decodedCursor = rawCursor ? decodeCursor(rawCursor) : undefined;

      const rows = await transitionRepository.findAll(limit + 1, decodedCursor);
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor =
        hasMore && data.length > 0
          ? encodeCursor(data[data.length - 1].transition_id)
          : null;

      return reply.send({
        data,
        meta: { cursor: nextCursor, hasMore },
      });
    });

    app.get("/transitions/:transitionId", async (request, reply) => {
      const { transitionId } = request.params as { transitionId: string };
      const transition =
        await transitionRepository.findByTransitionId(transitionId);

      if (!transition) {
        throw new NotFoundError("Transition", transitionId);
      }

      return reply.send({ data: transition });
    });
  };
}
