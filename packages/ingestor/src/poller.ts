import type {
  ChainSource,
  ProvableBlockResponse,
  ProvableTransactionResponse,
} from "@aleo-foundry/shared";
import { createCheckpoint } from "@aleo-foundry/shared";
import { CheckpointStore } from "./checkpoint-store.js";
import { ApiError, RateLimitError } from "./errors.js";
import {
  ParallelBlockFetcher,
  DEFAULT_MAX_BLOCK_RETRIES,
} from "./parallel-block-fetcher.js";

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
  /** Heights fetched concurrently per cycle (default: 1 = sequential). */
  maxConcurrency?: number;
}

// ─── Poller ───────────────────────────────────────────────────────

export class Poller {
  private readonly source: ChainSource;
  private readonly checkpointStore: CheckpointStore;
  private readonly config: Required<PollerConfig>;
  private readonly onBlock: BlockCallback;
  private readonly fetcher: ParallelBlockFetcher;
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
      maxConcurrency: 1,
      ...config,
    };
    this.onBlock = onBlock;
    this.fetcher = new ParallelBlockFetcher(source, {
      maxConcurrency: this.config.maxConcurrency,
      maxBlockRetries: this.config.maxBlockRetries,
    });
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

    await this.fetcher.fetchRange(startHeight, latestHeight, async (result) => {
      if (result.data === null) {
        // Skipped after retries exhausted — do not advance the checkpoint
        return;
      }

      const { height, data } = result;

      await this.onBlock({
        height,
        block: data.block,
        transactions: data.transactions,
      });

      const cp = createCheckpoint(
        this.config.source,
        this.config.network,
        height,
        data.block.block_hash,
      );
      await this.checkpointStore.save(cp);

      lastProcessedHeight = height;
    });

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
