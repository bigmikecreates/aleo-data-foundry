import type {
  ChainSource,
  ProvableBlockResponse,
  ProvableTransactionResponse,
} from "@aleo-foundry/shared";
import { ApiError, RateLimitError } from "./errors.js";
import type { RateLimiter } from "./rate-limiter.js";

export interface BlockFetchResult {
  height: number;
  data: {
    block: ProvableBlockResponse;
    transactions: ProvableTransactionResponse[];
  } | null;
}

export interface ParallelBlockFetcherConfig {
  /** Maximum number of heights fetched concurrently. */
  maxConcurrency: number;
  /** Maximum retries per block/transactions fetch (default: 3). */
  maxBlockRetries?: number;
  /** Optional shared rate limiter applied to every upstream request. */
  rateLimit?: RateLimiter;
}

export const DEFAULT_MAX_BLOCK_RETRIES = 3;
const RETRY_BASE_MS = 1000;

/**
 * Fetch a contiguous height range with bounded concurrency while delivering
 * results strictly in height order. Writes (checkpoints, downstream callbacks)
 * therefore stay sequential even though fetches run in parallel.
 */
export class ParallelBlockFetcher {
  private readonly source: ChainSource;
  private readonly config: Required<
    Omit<ParallelBlockFetcherConfig, "rateLimit">
  > & { rateLimit?: RateLimiter };

  constructor(source: ChainSource, config: ParallelBlockFetcherConfig) {
    if (!Number.isInteger(config.maxConcurrency) || config.maxConcurrency < 1) {
      throw new Error("maxConcurrency must be a positive integer");
    }
    this.source = source;
    this.config = {
      maxBlockRetries:
        config.maxBlockRetries ?? DEFAULT_MAX_BLOCK_RETRIES,
      maxConcurrency: config.maxConcurrency,
      rateLimit: config.rateLimit,
    };
  }

  /**
   * Fetch every height in [startHeight, latestHeight]. `onResult` is invoked
   * once per height in ascending order; a `data` of null means the height was
   * skipped after retries were exhausted. Throws on non-retryable 4xx or
   * RateLimitError, or if `onResult` itself throws. Returns the last delivered
   * height (startHeight - 1 if nothing was delivered).
   */
  async fetchRange(
    startHeight: number,
    latestHeight: number,
    onResult: (result: BlockFetchResult) => Promise<void>,
  ): Promise<number> {
    if (startHeight > latestHeight) {
      return startHeight - 1;
    }

    const buffer = new Map<number, BlockFetchResult>();
    let nextDispatch = startHeight;
    let lastDelivered = startHeight - 1;
    let rejected: Error | null = null;
    let emitChain: Promise<void> = Promise.resolve();

    const emit = async (): Promise<void> => {
      while (rejected === null && buffer.has(lastDelivered + 1)) {
        const height = lastDelivered + 1;
        const result = buffer.get(height)!;
        buffer.delete(height);
        lastDelivered = height;
        try {
          await onResult(result);
        } catch (error) {
          rejected = error instanceof Error ? error : new Error(String(error));
          throw rejected;
        }
      }
    };

    const requestEmit = (): Promise<void> => {
      emitChain = emitChain.then(emit, emit);
      return emitChain;
    };

    const worker = async (): Promise<void> => {
      while (rejected === null) {
        const height = nextDispatch;
        nextDispatch++;
        if (height > latestHeight) {
          return;
        }

        let result: BlockFetchResult;
        try {
          result = { height, data: await this.fetchHeight(height) };
        } catch (error) {
          rejected = error instanceof Error ? error : new Error(String(error));
          return;
        }

        buffer.set(height, result);
        try {
          await requestEmit();
        } catch {
          return;
        }
      }
    };

    const workerCount = Math.min(
      this.config.maxConcurrency,
      latestHeight - startHeight + 1,
    );
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);

    if (rejected !== null) {
      throw rejected;
    }
    return lastDelivered;
  }

  private async fetchHeight(
    height: number,
  ): Promise<{
    block: ProvableBlockResponse;
    transactions: ProvableTransactionResponse[];
  } | null> {
    const block = await this.fetchBlock(height);
    if (block === null) {
      return null;
    }

    const transactions = await this.fetchTransactions(height);
    return { block, transactions };
  }

  private async fetchBlock(
    height: number,
  ): Promise<ProvableBlockResponse | null> {
    const maxRetries = this.config.maxBlockRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await this.config.rateLimit?.acquire();

      try {
        return await this.source.getBlock(height);
      } catch (error) {
        // Don't retry client errors (4xx)
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          if (error.status === 404) {
            return null; // Block doesn't exist yet
          }
          throw error; // Other 4xx: rethrow
        }

        if (error instanceof RateLimitError) {
          throw error;
        }

        // Exponential backoff for 5xx and network errors
        if (attempt < maxRetries) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Max retries exhausted — skip this block
    return null;
  }

  private async fetchTransactions(
    height: number,
  ): Promise<ProvableTransactionResponse[]> {
    const maxRetries = this.config.maxBlockRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await this.config.rateLimit?.acquire();

      try {
        return await this.source.getBlockTransactions(height);
      } catch (error) {
        // Don't retry client errors (4xx)
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          if (error.status === 404) {
            return []; // No transactions for this block
          }
          throw error; // Other 4xx: rethrow
        }

        if (error instanceof RateLimitError) {
          throw error;
        }

        // Exponential backoff for 5xx and network errors
        if (attempt < maxRetries) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error; // Max retries exhausted — fail the block
        }
      }
    }

    throw new Error(`Failed to fetch transactions for block ${height}`);
  }
}