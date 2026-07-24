import { z } from "zod";
import { NetworkSchema } from "./schemas/canonical.js";

// ─── Checkpoint Schema ───────────────────────────────────────────

export const CheckpointSchema = z.object({
  source: z.string().min(1),
  network: NetworkSchema,
  lastHeight: z.number().int().nonnegative(),
  lastHash: z.string().min(1),
  updatedAt: z.string().datetime(),
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;

// ─── Checkpoint Factory ──────────────────────────────────────────

export function createCheckpoint(
  source: string,
  network: z.infer<typeof NetworkSchema>,
  height: number,
  hash: string,
): Checkpoint {
  return {
    source,
    network,
    lastHeight: height,
    lastHash: hash,
    updatedAt: new Date().toISOString(),
  };
}
