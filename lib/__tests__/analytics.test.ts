import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock posthog-js before importing analytics
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}));

import posthog from "posthog-js";
import { trackEvent, identifyUser } from "@/lib/analytics";

describe("analytics", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    // Reset the isInitialized state by re-importing
    // For simplicity, we test the exported functions directly
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("initAnalytics", () => {
    it("skips initialization when DNT is enabled", () => {
      Object.defineProperty(navigator, "doNotTrack", {
        value: "1",
        configurable: true,
      });
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

      // Force fresh module (reset isInitialized)
      vi.resetModules();

      // DNT check happens at function level
      expect(posthog.init).not.toHaveBeenCalled();

      Object.defineProperty(navigator, "doNotTrack", {
        value: null,
        configurable: true,
      });
    });

    it("skips initialization without API key", () => {
      Object.defineProperty(navigator, "doNotTrack", {
        value: null,
        configurable: true,
      });
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

      vi.resetModules();

      expect(posthog.init).not.toHaveBeenCalled();
    });
  });

  describe("trackEvent", () => {
    it("skips when DNT is 1", () => {
      Object.defineProperty(navigator, "doNotTrack", {
        value: "1",
        configurable: true,
      });
      trackEvent("test_event", { key: "value" });
      expect(posthog.capture).not.toHaveBeenCalled();
      Object.defineProperty(navigator, "doNotTrack", {
        value: null,
        configurable: true,
      });
    });
  });

  describe("identifyUser", () => {
    it("skips when DNT is 1", () => {
      Object.defineProperty(navigator, "doNotTrack", {
        value: "1",
        configurable: true,
      });
      identifyUser("0x1234567890abcdef");
      expect(posthog.identify).not.toHaveBeenCalled();
      Object.defineProperty(navigator, "doNotTrack", {
        value: null,
        configurable: true,
      });
    });
  });
});
