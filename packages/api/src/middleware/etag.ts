import { createHash } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

export function generateETag(body: unknown): string {
  const content = JSON.stringify(body);
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export async function etagHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const ifNoneMatch = request.headers["if-none-match"] as string | undefined;

  reply.raw.on("finish", () => {
    const body = reply.raw.getHeader("x-etag-body");
    if (body) {
      const etag = generateETag(body);
      reply.header("ETag", `"${etag}"`);

      if (ifNoneMatch === `"${etag}"`) {
        reply.status(304).send();
      }
    }
  });
}
