import type { FastifyRequest } from "fastify";
import { UnauthorizedError } from "../errors.js";

const BEARER_PREFIX = "Bearer ";

export function extractBearerKey(
  authorization: string | undefined,
): string | undefined {
  if (!authorization || !authorization.startsWith(BEARER_PREFIX)) return undefined;
  const key = authorization.slice(BEARER_PREFIX.length).trim();
  return key.length > 0 ? key : undefined;
}

export type AuthGuardHook = (request: FastifyRequest) => Promise<void>;

export function createAuthGuard(apiKeys: string[]): AuthGuardHook {
  return async (request) => {
    if (request.url.startsWith("/health")) return;
    const key = extractBearerKey(request.headers.authorization);
    if (!key || !apiKeys.includes(key)) {
      throw new UnauthorizedError("Missing or invalid API key");
    }
  };
}