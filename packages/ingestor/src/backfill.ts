import type { ChainSource, Network } from "@aleo-foundry/shared";
import { createCheckpoint } from "@aleo-foundry/shared";
import { CheckpointStore } from "./checkpoint-store.js";
import type { RateLimiter } from "./rate-limiter.js";
import { ParallelBlockFetcher } from "./parallel-block-fetcher.js";
import type { BlockCallback, BlockData } from "./poller.js";

export interface BackfillOptions {
  source: ChainSource;
  checkpointStore: CheckpointStore;
  network: Network;
  /** First height to ingest (inclusive). */
  start: number;
  /** Last height to ingest (inclusive); defaults to the chain head. */
  end?: number;
  maxConcurrency?: number;
  maxBlockRetries?: number;
  rateLimit?: RateLimiter;
  onBlock: BlockCallback;
  onProgress?: (progress: BackfillProgress) => void;
}

export interface BackfillProgress {
  completed: number;
  total: number;
  currentHeight: number;
}

export const BACKFILL_DEFAULT_CONCURRENCY = 4;

/**
 * Ingest a historical [start, end] range with bounded-concurrency fetching.
 * Progress is persisted to the supplied CheckpointStore after every block, so
 * an interrupted run resumes from the last completed height on the next call.
 * A `data`-null result (skip after retries) is not checkpointed and is
 * reported through progress only.
 */
export async function runBackfill(options: BackfillOptions): Promise<number> {
  if (!Number.isInteger(options.start) || options.start < 0) {
    throw new Error("start must be a non-negative integer");
  }

  const end = options.end ?? (await options.source.getLatestHeight());
  if (!Number.isInteger(end) || end < 0) {
    throw new Error("end (or chain head) must be a non-negative integer");
  }
  if (end < options.start) {
    throw new Error(
      `Invalid range: start (${options.start}) exceeds end (${end})`,
    );
  }

  const checkpoint = await options.checkpointStore.load();
  const resumeFrom = checkpoint ? checkpoint.lastHeight + 1 : options.start;

  if (resumeFrom > end) {
    return end; // Range already ingested
  }

  const fetcher = new ParallelBlockFetcher(options.source, {
    maxConcurrency: options.maxConcurrency ?? BACKFILL_DEFAULT_CONCURRENCY,
    maxBlockRetries: options.maxBlockRetries,
    rateLimit: options.rateLimit,
  });

  const total = end - resumeFrom + 1;
  let completed = 0;
  let lastCompletedHeight = resumeFrom - 1;

  await fetcher.fetchRange(resumeFrom, end, async (result) => {
    completed++;

    if (result.data === null) {
      lastCompletedHeight = result.height;
      options.onProgress?.({
        completed,
        total,
        currentHeight: result.height,
      });
      return;
    }

    const { height, data } = result;
    const blockData: BlockData = {
      height,
      block: data.block,
      transactions: data.transactions,
    };
    await options.onBlock(blockData);

    const cp = createCheckpoint(
      "backfill",
      options.network,
      height,
      data.block.block_hash,
    );
    await options.checkpointStore.save(cp);

    lastCompletedHeight = height;
    options.onProgress?.({
      completed,
      total,
      currentHeight: height,
    });
  });

  return lastCompletedHeight;
}