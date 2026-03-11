export class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  public constructor(
    private readonly capacity: number,
    private readonly refillTokensPerSecond: number,
    initialTokens: number = capacity,
  ) {
    this.tokens = Math.min(capacity, Math.max(0, initialTokens));
    this.lastRefillMs = Date.now();
  }

  private refill(nowMs: number) {
    if (nowMs <= this.lastRefillMs) return;

    const elapsedMs = nowMs - this.lastRefillMs;
    const refill = (elapsedMs / 1000) * this.refillTokensPerSecond;
    if (refill <= 0) return;

    this.tokens = Math.min(this.capacity, this.tokens + refill);
    this.lastRefillMs = nowMs;
  }

  public getAvailableTokens(nowMs: number = Date.now()): number {
    this.refill(nowMs);
    return this.tokens;
  }

  public estimateWaitMs(cost: number, nowMs: number = Date.now()): number {
    if (cost <= 0) return 0;
    this.refill(nowMs);

    if (this.tokens >= cost) return 0;
    const deficit = cost - this.tokens;
    const seconds = deficit / this.refillTokensPerSecond;
    return Math.ceil(seconds * 1000);
  }

  public tryConsume(cost: number, nowMs: number = Date.now()): boolean {
    if (cost <= 0) return true;
    this.refill(nowMs);

    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  public async waitAndConsume(
    cost: number,
    signal?: AbortSignal,
  ): Promise<void> {
    while (true) {
      if (signal?.aborted) throw new Error("Aborted");

      const now = Date.now();
      if (this.tryConsume(cost, now)) return;

      const waitMs = Math.min(
        1000,
        Math.max(50, this.estimateWaitMs(cost, now)),
      );

      await new Promise<void>((resolve, reject) => {
        let onAbort: (() => void) | null = null;

        const t = setTimeout(() => {
          if (signal && onAbort) {
            signal.removeEventListener("abort", onAbort);
          }
          resolve();
        }, waitMs);

        if (signal) {
          onAbort = () => {
            clearTimeout(t);
            reject(new Error("Aborted"));
          };

          if (signal.aborted) {
            clearTimeout(t);
            reject(new Error("Aborted"));
            return;
          }

          signal.addEventListener("abort", onAbort);
        }
      });
    }
  }
}
