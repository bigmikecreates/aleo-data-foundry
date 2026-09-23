# ADR-0008: Bounded-concurrency block fetching + historical backfill

- **Status:** Accepted (Sprint 11)
- **Date:** 2026-09-23

## Context
The catch-up loop ingested one height per cycle step, leaving throughput on the
table against a rate-limited upstream (5 req/s, 100k/day) and making historical
re-ingestion impractical. Sprints 10 made writes already decoupled (streaming),
so parallel fetch no longer contends with an in-process DB write path.

## Decision
- `ParallelBlockFetcher` (`packages/ingestor/src/parallel-block-fetcher.ts`)
  fetches a contiguous height range with a bounded worker pool
  (`maxConcurrency`, default 1) and an ordered emitter: results land in a
  buffer and are delivered strictly ascending via a serialized emit chain, so
  checkpoint/write ordering never depends on fetch completion order.
- Per-height semantics are preserved verbatim from the Poller: 5xx retry with
  exponential backoff then skip; 404 = doesn't exist (block skip, tx `[]`);
  other 4xx and `RateLimitError` abort the batch with the first error.
- `Poller` (live catch-up) now delegates fetching to the fetcher; `PollerConfig`
  gains `maxConcurrency`, wired from `INGESTOR_MAX_CONCURRENCY`.
- `runBackfill` (`packages/ingestor/src/backfill.ts`) ingests a `[start, end]`
  range (end defaults to chain head) using the fetcher, checkpointing per block
  so interrupted runs resume from `lastHeight + 1` on the next invocation.
  Checkpoints use `source: "backfill"` and live in per-range files
  (`backfill-<start>-<end>.json` / `backfill-<start>-open.json`).
- Publishing reuses the exact event stream of the live Poller via
  `createBlockPublisher` (`publish-block.ts`) — no duplicated normalization
  logic between live and backfill paths.
- Upstream limits are respected by the source's internal rate limiter; an
  optional shared `RateLimiter` can additionally be supplied to the fetcher.

## Consequences
- Catch-up and backfill can exploit available headroom without violating the
  5 req/s / 100k/day contract (bounded workers × rate limiter).
- Ordering guarantees (checkpoint monotonicity, FK order in consumers) are
  unchanged from the sequential path.
- A batch aborts (non-retryable 4xx, rate-limit exhaustion, publish error)
  rather than proceeding with gaps; skipped 5xx heights are retried on the next
  resume and reported via progress only.

## Alternatives considered
- p-limit-style external dependency (rejected: trivial to implement, minimal
  dependency rule).
- Deliver-out-of-order runs with buffered writers (rejected: couples ordering
  to downstream, complicates checkpoint semantics).