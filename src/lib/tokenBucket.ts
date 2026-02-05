export class TokenBucket {
  private tokens: number
  private lastRefillMs: number

  public constructor(
    private readonly capacity: number,
    private readonly refillTokensPerSecond: number,
    initialTokens: number = capacity
  ) {
    this.tokens = Math.min(capacity, Math.max(0, initialTokens))
    this.lastRefillMs = Date.now()
  }

  private refill(nowMs: number) {
    if (nowMs <= this.lastRefillMs) return

    const elapsedMs = nowMs - this.lastRefillMs
    const refill = (elapsedMs / 1000) * this.refillTokensPerSecond
    if (refill <= 0) return

    this.tokens = Math.min(this.capacity, this.tokens + refill)
    this.lastRefillMs = nowMs
  }

  public getAvailableTokens(nowMs: number = Date.now()): number {
    this.refill(nowMs)
    return this.tokens
  }

  public estimateWaitMs(cost: number, nowMs: number = Date.now()): number {
    if (cost <= 0) return 0
    this.refill(nowMs)

    if (this.tokens >= cost) return 0
    const deficit = cost - this.tokens
    const seconds = deficit / this.refillTokensPerSecond
    return Math.ceil(seconds * 1000)
  }

  public tryConsume(cost: number, nowMs: number = Date.now()): boolean {
    if (cost <= 0) return true
    this.refill(nowMs)

    if (this.tokens < cost) return false
    this.tokens -= cost
    return true
  }

  public async waitAndConsume(cost: number, signal?: AbortSignal): Promise<void> {
    while (true) {
      if (signal?.aborted) throw new Error('Aborted')

      const now = Date.now()
      if (this.tryConsume(cost, now)) return

      const waitMs = Math.min(1000, Math.max(50, this.estimateWaitMs(cost, now)))
      
      // Create a new AbortController for each wait iteration to prevent listener accumulation
      const waitController = new AbortController()
      const combinedSignal = signal ? 
        AbortSignal.any([signal, waitController.signal]) : 
        waitController.signal
      
      try {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => {
            waitController.abort()
            resolve()
          }, waitMs)
          
          const onAbort = () => {
            clearTimeout(t)
            reject(new Error('Aborted'))
          }
          
          combinedSignal.addEventListener('abort', onAbort, { once: true })
        })
      } catch (error) {
        if (signal?.aborted) throw error
        // If our own controller aborted, just continue the loop
      }
    }
  }
}
