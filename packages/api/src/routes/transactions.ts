import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../errors.js";

const mockTransactions = [
  {
    tx_id: "at1tx",
    block_height: 12345,
    block_hash: "ab17upp",
    network: "testnet",
    type: "execute",
    status: "accepted",
    index_in_block: 0,
    global_state_root: "sr1abc",
    created_at: "2024-06-03T12:00:00Z",
  },
];

export async function transactionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/transactions/:txId", async (request, reply) => {
    const { txId } = request.params as { txId: string };
    const tx = mockTransactions.find((t) => t.tx_id === txId);

    if (!tx) {
      throw new NotFoundError("Transaction", txId);
    }

    return reply.send({ data: tx });
  });
}
