import { createHash } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Generate a truncated SHA-256 ETag from a string body.
 */
export function generateETag(body: string): string {
  return createHash("sha256").update(body).digest("hex").slice(0, 16);
}

/**
 * Fastify onSend hook that sets ETag headers and handles If-None-Match (304).
 */
export async function etagOnSend(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: string,
): Promise<string> {
  const contentType = reply.getHeader("content-type");
  if (!contentType || !String(contentType).includes("application/json")) {
    return payload;
  }

  const etag = generateETag(payload);
  reply.header("ETag", `"${etag}"`);

  const ifNoneMatch = request.headers["if-none-match"] as string | undefined;
  if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
    reply.code(304);
    return "";
  }

  return payload;
}
