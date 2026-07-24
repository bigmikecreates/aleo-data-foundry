import { describe, it, expect } from "vitest";
import { RateLimiter } from "./rate-limiter.js";
import { RateLimitError } from "./errors.js";

describe("RateLimiter", () => {
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
});
