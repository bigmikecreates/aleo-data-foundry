import { RateLimitError } from "./errors.js";

export interface RateLimiterConfig {
  requestsPerSecond: number;
  requestsPerDay: number;
}

export class RateLimiter {
  private readonly requestsPerSecond: number;
  private readonly requestsPerDay: number;
  private tokens: number;
  private readonly timestamps: number[] = [];
  private dayCount = 0;
  private dayStart = Date.now();

  constructor(config: RateLimiterConfig) {
    this.requestsPerSecond = config.requestsPerSecond;
    this.requestsPerDay = config.requestsPerDay;
    this.tokens = config.requestsPerSecond;
  }

  async acquire(): Promise<void> {
    this.resetDayIfNeeded();
    this.resetTokensIfNeeded();

    if (this.dayCount >= this.requestsPerDay) {
      throw new RateLimitError(
        `Daily quota exhausted: ${this.dayCount}/${this.requestsPerDay}`,
      );
    }

    if (this.tokens <= 0) {
      const oldest = this.timestamps[0];
      const waitMs = 1000 - (Date.now() - oldest);
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      this.resetTokensIfNeeded();
    }

    this.tokens--;
    this.dayCount++;
    this.timestamps.push(Date.now());
    this.pruneTimestamps();
  }

  private resetDayIfNeeded(): void {
    const now = Date.now();
    if (now - this.dayStart >= 86_400_000) {
      this.dayStart = now;
      this.dayCount = 0;
    }
  }

  private resetTokensIfNeeded(): void {
    const now = Date.now();
    const recent = this.timestamps.filter((t) => now - t < 1000);
    this.timestamps.splice(0, this.timestamps.length - recent.length);
    this.tokens = this.requestsPerSecond - recent.length;
  }

  private pruneTimestamps(): void {
    const now = Date.now();
    while (this.timestamps.length > 0 && now - this.timestamps[0] >= 1000) {
      this.timestamps.shift();
    }
  }
}
