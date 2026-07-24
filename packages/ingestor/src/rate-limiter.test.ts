import { describe, it, expect, vi, afterEach } from "vitest";
import { RateLimiter } from "./rate-limiter.js";
import { RateLimitError } from "./errors.js";

describe("RateLimiter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Basic acquisition ──────────────────────────────────────

  it("acquires a slot within rate limit", async () => {
    const limiter = new RateLimiter({
      requestsPerSecond: 5,
      requestsPerDay: 100_000,
    });
    await limiter.acquire();
    // Should not throw
  });

  it("acquires multiple slots within rate limit", async () => {
    const limiter = new RateLimiter({
      requestsPerSecond: 5,
      requestsPerDay: 100_000,
    });
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    // All 5 should succeed
  });

  // ─── Daily quota ────────────────────────────────────────────

  it("blocks when daily quota exhausted", async () => {
    const limiter = new RateLimiter({
      requestsPerSecond: 100,
      requestsPerDay: 3,
    });
    for (let i = 0; i < 3; i++) {
      await limiter.acquire();
    }
    await expect(limiter.acquire()).rejects.toThrow(RateLimitError);
  });

  it("throws RateLimitError with descriptive message", async () => {
    const limiter = new RateLimiter({
      requestsPerSecond: 100,
      requestsPerDay: 2,
    });
    await limiter.acquire();
    await limiter.acquire();

    try {
      await limiter.acquire();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as Error).message).toContain("Daily quota exhausted");
      expect((error as Error).message).toContain("2/2");
    }
  });

  // ─── Daily reset ────────────────────────────────────────────

  it("resets daily count after 24 hours", async () => {
    const limiter = new RateLimiter({
      requestsPerSecond: 100,
      requestsPerDay: 2,
    });
    await limiter.acquire();
    await limiter.acquire();

    // Simulate day rollover
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 86_400_001);

    // Should not throw after day reset
    await limiter.acquire();
  });

  // ─── Per-second rate limiting ───────────────────────────────

  it("waits when per-second limit is reached", async () => {
    const limiter = new RateLimiter({
      requestsPerSecond: 2,
      requestsPerDay: 100_000,
    });

    // Exhaust burst
    await limiter.acquire();
    await limiter.acquire();

    // This should wait but eventually succeed
    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;

    // Should have waited approximately 1 second
    expect(elapsed).toBeGreaterThanOrEqual(500);
  });

  // ─── Standard config ────────────────────────────────────────

  it("works with standard 5 req/s, 100k/day config", async () => {
    const limiter = new RateLimiter({
      requestsPerSecond: 5,
      requestsPerDay: 100_000,
    });

    // Acquire 5 quickly (burst)
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }

    // 6th should wait
    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});
