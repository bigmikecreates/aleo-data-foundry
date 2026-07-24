import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    return reply.send({
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
    });
  });
}
