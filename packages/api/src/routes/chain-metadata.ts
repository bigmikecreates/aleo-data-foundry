import type { FastifyInstance } from "fastify";
import type { ChainMetadataRepository } from "@aleo-foundry/db";
import { NotFoundError } from "../errors.js";

export function chainMetadataRoutes(
  chainMetadataRepository: ChainMetadataRepository,
) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get("/chain-metadata/:network", async (request, reply) => {
      const { network } = request.params as { network: string };
      const metadata = await chainMetadataRepository.findByNetwork(network);

      if (!metadata) {
        throw new NotFoundError("ChainMetadata", network);
      }

      return reply.send({ data: metadata });
    });
  };
}
