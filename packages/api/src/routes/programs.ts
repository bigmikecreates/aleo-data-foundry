import type { FastifyInstance } from "fastify";
import type { ProgramRepository } from "@aleo-foundry/db";
import { NotFoundError } from "../errors.js";

export function programRoutes(programRepository: ProgramRepository) {
  return async function (app: FastifyInstance): Promise<void> {
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
