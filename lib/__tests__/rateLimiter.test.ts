import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "@/lib/rateLimiter";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.remaining()).toBe(3);
  });

  it("blocks requests at the limit", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });
    limiter.record();
    limiter.record();
    expect(limiter.canProceed()).toBe(false);
    expect(limiter.remaining()).toBe(0);
  });

  it("slides window - old entries expire", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 10_000 });
    limiter.record();
    limiter.record();
    expect(limiter.canProceed()).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(11_000);

    expect(limiter.canProceed()).toBe(true);
    expect(limiter.remaining()).toBe(2);
  });

  it("resetIn returns correct time until slot opens", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 30_000 });
    limiter.record();
    expect(limiter.canProceed()).toBe(false);

    vi.advanceTimersByTime(10_000);
    const resetMs = limiter.resetIn();
    expect(resetMs).toBe(20_000);
  });

  it("resetIn returns 0 when under limit", () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 });
    expect(limiter.resetIn()).toBe(0);
  });

  it("remaining decrements correctly", () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 });
    expect(limiter.remaining()).toBe(5);
    limiter.record();
    expect(limiter.remaining()).toBe(4);
    limiter.record();
    limiter.record();
    expect(limiter.remaining()).toBe(2);
  });
});
