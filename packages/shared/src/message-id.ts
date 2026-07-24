import { createHash } from "node:crypto";
import type { Network } from "./schemas/canonical.js";

/**
 * Generate a deterministic messageId for idempotent processing.
 *
 * Format: sha256(network:entityType:naturalKey) truncated to 16 hex chars
 *
 * Examples:
 *   messageId("testnet", "block", "12345:ab17up...")
 *   messageId("mainnet", "transaction", "at1qf0...")
 */
export function messageId(
  network: Network,
  entityType: string,
  naturalKey: string,
): string {
  const input = `${network}:${entityType}:${naturalKey}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}
