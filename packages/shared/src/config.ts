import { z } from "zod";
import { NetworkSchema } from "./schemas/canonical.js";

// ─── Network Config ──────────────────────────────────────────────

export const PROVABLE_API_BASE_URLS: Record<string, string> = {
  testnet: "https://api.provable.com/v2/testnet",
  mainnet: "https://api.provable.com/v2/mainnet",
};

export const NetworkConfigSchema = z.object({
  network: NetworkSchema,
  apiBaseUrl: z.string().url(),
  rateLimit: z.object({
    requestsPerSecond: z.number().int().positive(),
    requestsPerDay: z.number().int().positive(),
  }),
});
export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;

// ─── Default Configs ─────────────────────────────────────────────

export const TESTNET_CONFIG: NetworkConfig = {
  network: "testnet",
  apiBaseUrl: PROVABLE_API_BASE_URLS.testnet,
  rateLimit: {
    requestsPerSecond: 5,
    requestsPerDay: 100_000,
  },
};

export const MAINNET_CONFIG: NetworkConfig = {
  network: "mainnet",
  apiBaseUrl: PROVABLE_API_BASE_URLS.mainnet,
  rateLimit: {
    requestsPerSecond: 5,
    requestsPerDay: 100_000,
  },
};

// ─── Ingestor Config ─────────────────────────────────────────────

export const IngestorConfigSchema = z.object({
  network: NetworkConfigSchema,
  pollingIntervalMs: z.number().int().positive().default(1000),
  checkpointSource: z.string().default("provable-api"),
});
export type IngestorConfig = z.infer<typeof IngestorConfigSchema>;
