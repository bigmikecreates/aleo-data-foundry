import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://foundry:foundry@localhost:5432/aleo_foundry"),
  NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  POLLING_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  CHECKPOINT_DIR: z.string().default("./checkpoints"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_KEYS: z.string().default(""),
  BLOCK_STREAM_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = EnvSchema.parse(process.env);
  return cachedEnv;
}

export function parseDatabaseUrl(url: string): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
  };
}
