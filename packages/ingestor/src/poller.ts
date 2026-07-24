import type {
  ChainSource,
  ProvableBlockResponse,
  ProvableTransactionResponse,
} from "@aleo-foundry/shared";
import { createCheckpoint } from "@aleo-foundry/shared";
import { CheckpointStore } from "./checkpoint-store.js";
import { ApiError, RateLimitError } from "./errors.js";

// ─── Types ────────────────────────────────────────────────────────

export interface BlockData {
  height: number;
  block: ProvableBlockResponse;
  transactions: ProvableTransactionResponse[];
}

export type BlockCallback = (data: BlockData) => Promise<void>;

export interface PollerConfig {
  /** Network identifier for checkpoint (testnet/mainnet). */
  network: "testnet" | "mainnet";
  /** Source identifier for checkpoint. */
  source: string;
  /** Milliseconds between polling cycles. */
  pollingIntervalMs: number;
  /** Maximum retries for a single block before skipping. */
  maxBlockRetries?: number;
  /** Starting height if no checkpoint exists (default: 0 = genesis). */
  startHeight?: number;
}

// ─── Poller ───────────────────────────────────────────────────────

const DEFAULT_MAX_BLOCK_RETRIES = 3;
const RETRY_BASE_MS = 1000;

export class Poller {
  private readonly source: ChainSource;
  private readonly checkpointStore: CheckpointStore;
  private readonly config: Required<PollerConfig>;
  private readonly onBlock: BlockCallback;
  private abortController: AbortController | null = null;

  constructor(
    source: ChainSource,
    checkpointStore: CheckpointStore,
    config: PollerConfig,
    onBlock: BlockCallback,
  ) {
    this.source = source;
    this.checkpointStore = checkpointStore;
    this.config = {
      maxBlockRetries: DEFAULT_MAX_BLOCK_RETRIES,
      startHeight: 0,
      ...config,
    };
    this.onBlock = onBlock;
  }

  /**
   * Run a single ingestion cycle: catch up from checkpoint to chain head.
   * Returns the final height processed, or null if nothing was processed.
   */
  async runOnce(): Promise<number | null> {
    const checkpoint = await this.checkpointStore.load();
    const startHeight = checkpoint
      ? checkpoint.lastHeight + 1
      : this.config.startHeight;

    const latestHeight = await this.source.getLatestHeight();

    if (startHeight > latestHeight) {
      return null; // Already caught up
    }

    let lastProcessedHeight = startHeight - 1;

    for (let height = startHeight; height <= latestHeight; height++) {
      const block = await this.fetchBlockWithRetry(height);
      if (!block) {
        // Skip block after max retries
        continue;
      }

      const { block: blockResponse, transactions } = block;

      await this.onBlock({ height, block: blockResponse, transactions });

      const cp = createCheckpoint(
        this.config.source,
        this.config.network,
        height,
        blockResponse.block_hash,
      );
      await this.checkpointStore.save(cp);

      lastProcessedHeight = height;
    }

    return lastProcessedHeight >= startHeight ? lastProcessedHeight : null;
  }

  /**
   * Start continuous polling. Resolves when stopped via stop().
   */
  async start(): Promise<void> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    while (!signal.aborted) {
      try {
        await this.runOnce();
      } catch (error) {
        // RateLimitError: wait longer before retrying
        if (error instanceof RateLimitError) {
          const waitMs = Math.min(
            this.config.pollingIntervalMs * 6,
            60_000,
          );
          await this.sleep(waitMs, signal);
          continue;
        }

        // ApiError with non-retryable status: throw
        if (error instanceof ApiError && error.status < 500) {
          throw error;
        }
      }

      await this.sleep(this.config.pollingIntervalMs, signal);
    }
  }

  /** Stop a running poller. */
  stop(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  private async fetchBlockWithRetry(
    height: number,
  ): Promise<{ block: ProvableBlockResponse; transactions: ProvableTransactionResponse[] } | null> {
    const maxRetries = this.config.maxBlockRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const block = await this.source.getBlock(height);
        const transactions = await this.source.getBlockTransactions(height);
        return { block, transactions };
      } catch (error) {
        // Don't retry client errors (4xx)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          if (error.status === 404) {
            return null; // Block doesn't exist yet
          }
          throw error; // Other 4xx: rethrow
        }

        if (error instanceof RateLimitError) {
          throw error; // Let the outer loop handle rate limits
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

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      }
    });
  }
}
