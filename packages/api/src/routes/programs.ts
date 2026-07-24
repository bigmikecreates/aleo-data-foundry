import type { FastifyInstance } from "fastify";
import type { ProgramRepository } from "@aleo-foundry/db";
import { NotFoundError } from "../errors.js";
import { encodeCursor, decodeCursor, parseLimit } from "../utils.js";

export function programRoutes(programRepository: ProgramRepository) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get("/programs", async (request, reply) => {
      const { limit: rawLimit, cursor: rawCursor } = request.query as {
        limit?: unknown;
        cursor?: string;
      };

      const limit = parseLimit(rawLimit);
      const decodedCursor = rawCursor ? decodeCursor(rawCursor) : undefined;

      const rows = await programRepository.findAll(limit + 1, decodedCursor);
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor =
        hasMore && data.length > 0
          ? encodeCursor(data[data.length - 1].program_id)
          : null;

      return reply.send({
        data,
        meta: { cursor: nextCursor, hasMore },
      });
    });

    app.get("/programs/:programId", async (request, reply) => {
      const { programId } = request.params as { programId: string };
      const program = await programRepository.findByProgramId(programId);

      if (!program) {
        throw new NotFoundError("Program", programId);
      }

      return reply.send({ data: program });
    });
  };
}
