interface RateLimiterConfig {
  maxRequests: number; // e.g., 10
  windowMs: number; // e.g., 60_000 (1 minute)
}

export function createRateLimiter(config: RateLimiterConfig) {
  const { maxRequests, windowMs } = config;
  const timestamps: number[] = [];

  function prune(now: number): void {
    const cutoff = now - windowMs;
    while (timestamps.length > 0 && timestamps[0]! <= cutoff) {
      timestamps.shift();
    }
  }

  return {
    canProceed(): boolean {
      const now = Date.now();
      prune(now);
      return timestamps.length < maxRequests;
    },

    record(): void {
      timestamps.push(Date.now());
    },

    remaining(): number {
      const now = Date.now();
      prune(now);
      return Math.max(0, maxRequests - timestamps.length);
    },

    resetIn(): number {
      const now = Date.now();
      prune(now);
      if (timestamps.length < maxRequests) return 0;
      const oldest = timestamps[0];
      if (oldest === undefined) return 0;
      return Math.max(0, oldest + windowMs - now);
    },
  };
}
