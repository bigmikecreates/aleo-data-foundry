import type { FastifyInstance } from "fastify";
import type { TransitionRepository } from "@aleo-foundry/db";
import { NotFoundError } from "../errors.js";

export function transitionRoutes(transitionRepository: TransitionRepository) {
  return async function (app: FastifyInstance): Promise<void> {
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
