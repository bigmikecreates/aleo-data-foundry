import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../errors.js";

const mockTransitions = [
  {
    transition_id: "au1tr",
    tx_id: "at1tx",
    program_id: "credits.aleo",
    function_name: "transfer_public",
    inputs_json: "[]",
    outputs_json: "[]",
    tpk: "tpk123",
    tcm: "tcm456",
    created_at: "2024-06-03T12:00:00Z",
  },
];

export async function transitionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/transitions/:transitionId", async (request, reply) => {
    const { transitionId } = request.params as { transitionId: string };
    const transition = mockTransitions.find(
      (t) => t.transition_id === transitionId,
    );

    if (!transition) {
      throw new NotFoundError("Transition", transitionId);
    }

    return reply.send({ data: transition });
  });
}
