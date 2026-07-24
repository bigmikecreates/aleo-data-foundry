import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../errors.js";

const mockBlocks = [
  {
    height: 12345,
    block_hash: "ab17upp",
    previous_hash: "ab1h8ws",
    network: "testnet",
    timestamp: "2024-06-03T12:00:00Z",
    coinbase_target: "4294967295",
    proof_target: "4294967295",
    last_coinbase_target: "4294967295",
    last_coinbase_ratio: "1000000",
    round: "5925654",
    transactions_root: "field123",
    previous_state_root: "sr1abc",
    transactions_count: 3,
    aborted_transactions_count: 0,
    created_at: "2024-06-03T12:00:00Z",
  },
];

export async function blockRoutes(app: FastifyInstance): Promise<void> {
  app.get("/blocks", async (request, reply) => {
    const { limit = 20, cursor } = request.query as {
      limit?: number;
      cursor?: string;
    };

    const startIndex = cursor ? parseInt(cursor, 10) : 0;
    const sliced = mockBlocks.slice(startIndex, startIndex + limit);

    return reply.send({
      data: sliced,
      meta: {
        cursor:
          startIndex + limit < mockBlocks.length
            ? String(startIndex + limit)
            : null,
        hasMore: startIndex + limit < mockBlocks.length,
      },
    });
  });

  app.get("/blocks/:height", async (request, reply) => {
    const { height } = request.params as { height: string };
    const block = mockBlocks.find((b) => b.height === Number(height));

    if (!block) {
      throw new NotFoundError("Block", height);
    }

    return reply.send({ data: block });
  });
}
