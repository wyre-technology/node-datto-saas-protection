/**
 * Rate limiting for the Datto SaaS Protection API.
 *
 * Datto SaaS Protection enforces 60 requests per 60-second window per API key.
 * Exceeding the limit returns 429 with a Retry-After header.
 *
 * In addition to the sliding-window rate limit, this limiter caps the number
 * of concurrent in-flight requests (default 4) to be defensive about server
 * load.
 */

import type { RateLimitConfig } from './config.js';

/**
 * Sliding-window + concurrency-capped rate limiter.
 */
export class RateLimiter {
  private readonly config: RateLimitConfig;
  private requestTimestamps: number[] = [];
  private inFlight: number = 0;
  private waiters: Array<() => void> = [];

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Wait until it's safe to make another request.
   *
   * Acquires a concurrency slot AND respects the sliding-window rate. The
   * caller MUST invoke {@link release} once the request completes.
   */
  async waitForSlot(): Promise<void> {
    if (!this.config.enabled) {
      this.inFlight += 1;
      return;
    }

    // Concurrency gate
    if (this.inFlight >= this.config.maxConcurrency) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.inFlight += 1;

    this.pruneOldTimestamps();

    const currentRate = this.requestTimestamps.length / this.config.maxRequests;

    if (currentRate >= this.config.throttleThreshold) {
      const delayMs = Math.min(
        1000 * (currentRate - this.config.throttleThreshold + 0.1) * 10,
        5000
      );
      await this.sleep(delayMs);
    }

    if (this.requestTimestamps.length >= this.config.maxRequests) {
      const oldest = this.requestTimestamps[0];
      if (oldest !== undefined) {
        const waitTime = oldest + this.config.windowMs - Date.now();
        if (waitTime > 0) await this.sleep(waitTime);
      }
    }
  }

  /** Release a previously-acquired concurrency slot. */
  release(): void {
    if (this.inFlight > 0) this.inFlight -= 1;
    const next = this.waiters.shift();
    if (next) next();
  }

  /** Record that a request was made. */
  recordRequest(): void {
    if (!this.config.enabled) return;
    this.requestTimestamps.push(Date.now());
  }

  /** Current usage as fraction of the limit. */
  getCurrentRate(): number {
    this.pruneOldTimestamps();
    return this.requestTimestamps.length / this.config.maxRequests;
  }

  /** Remaining requests in the current window. */
  getRemainingRequests(): number {
    this.pruneOldTimestamps();
    return Math.max(0, this.config.maxRequests - this.requestTimestamps.length);
  }

  /** Compute exponential backoff delay capped at 30s. */
  calculateRetryDelay(retryCount: number, retryAfterSeconds?: number): number {
    if (retryAfterSeconds != null && retryAfterSeconds > 0) {
      return Math.min(retryAfterSeconds * 1000, 30_000);
    }
    return Math.min(this.config.retryAfterMs * Math.pow(2, retryCount), 30_000);
  }

  /** Whether another retry is allowed. */
  shouldRetry(retryCount: number): boolean {
    return retryCount < this.config.maxRetries;
  }

  private pruneOldTimestamps(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > cutoff);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
