import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../errors.js";

const mockPrograms = [
  {
    program_id: "credits.aleo",
    network: "testnet",
    edition: 0,
    deployment_tx_id: "at1deploy",
    deployed_at: "2024-06-03T12:00:00Z",
    created_at: "2024-06-03T12:00:00Z",
  },
];

export async function programRoutes(app: FastifyInstance): Promise<void> {
  app.get("/programs/:programId", async (request, reply) => {
    const { programId } = request.params as { programId: string };
    const program = mockPrograms.find((p) => p.program_id === programId);

    if (!program) {
      throw new NotFoundError("Program", programId);
    }

    return reply.send({ data: program });
  });
}
