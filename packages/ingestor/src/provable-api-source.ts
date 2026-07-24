import type { ChainSource, NetworkConfig } from "@aleo-foundry/shared";
import {
  ProvableBlockResponseSchema,
  ProvableTransactionResponseSchema,
  type ProvableBlockResponse,
  type ProvableTransactionResponse,
} from "@aleo-foundry/shared";
import { RateLimiter } from "./rate-limiter.js";
import { ApiError } from "./errors.js";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

export class ProvableApiSource implements ChainSource {
  private readonly baseUrl: string;
  private readonly network: string;
  private readonly rateLimiter: RateLimiter;

  constructor(config: NetworkConfig) {
    this.baseUrl = config.apiBaseUrl;
    this.network = config.network;
    this.rateLimiter = new RateLimiter({
      requestsPerSecond: config.rateLimit.requestsPerSecond,
      requestsPerDay: config.rateLimit.requestsPerDay,
    });
  }

  async getLatestHeight(): Promise<number> {
    const data = await this.request(`/height`);
    return Number(data);
  }

  async getBlock(heightOrHash: number | string): Promise<ProvableBlockResponse> {
    const data = await this.request(`/block/${heightOrHash}`);
    const result = ProvableBlockResponseSchema.safeParse(data);
    if (!result.success) {
      throw new ApiError(500, `Invalid block response: ${result.error.message}`);
    }
    return result.data;
  }

  async getBlockTransactions(height: number): Promise<ProvableTransactionResponse[]> {
    const data = await this.request(`/block/${height}/transactions`);
    const txs = (data as { transactions: unknown[] }).transactions;
    return txs.map((tx) => {
      const result = ProvableTransactionResponseSchema.safeParse(tx);
      if (!result.success) {
        throw new ApiError(500, `Invalid transaction: ${result.error.message}`);
      }
      return result.data;
    });
  }

  async getTransaction(txId: string): Promise<ProvableTransactionResponse> {
    const data = await this.request(`/transaction/${txId}`);
    const result = ProvableTransactionResponseSchema.safeParse(data);
    if (!result.success) {
      throw new ApiError(500, `Invalid transaction: ${result.error.message}`);
    }
    return result.data;
  }

  async getProgram(programId: string): Promise<unknown> {
    return this.request(`/program/${programId}`);
  }

  private async request(path: string): Promise<unknown> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await this.rateLimiter.acquire();

      try {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url);

        if (response.status === 429) {
          throw new ApiError(429, "Rate limited by upstream");
        }

        if (!response.ok) {
          throw new ApiError(response.status, `API error: ${response.status}`);
        }

        return response.json();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof ApiError && error.status < 500) {
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
