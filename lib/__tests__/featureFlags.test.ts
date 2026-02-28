import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FeatureFlag, isFeatureEnabled } from "@/lib/featureFlags";

describe("isFeatureEnabled", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns true for ANALYTICS by default (existing feature)", () => {
    delete process.env.NEXT_PUBLIC_FF_ANALYTICS;
    expect(isFeatureEnabled(FeatureFlag.ANALYTICS)).toBe(true);
  });

  it("returns false for PASSKEY_RECOVERY by default (new feature)", () => {
    delete process.env.NEXT_PUBLIC_FF_PASSKEY_RECOVERY;
    expect(isFeatureEnabled(FeatureFlag.PASSKEY_RECOVERY)).toBe(false);
  });

  it("returns false for OFFLINE_MODE by default", () => {
    delete process.env.NEXT_PUBLIC_FF_OFFLINE_MODE;
    expect(isFeatureEnabled(FeatureFlag.OFFLINE_MODE)).toBe(false);
  });

  it('returns true when env var is "1"', () => {
    process.env.NEXT_PUBLIC_FF_PASSKEY_RECOVERY = "1";
    expect(isFeatureEnabled(FeatureFlag.PASSKEY_RECOVERY)).toBe(true);
  });

  it('returns true when env var is "true"', () => {
    process.env.NEXT_PUBLIC_FF_OFFLINE_MODE = "true";
    expect(isFeatureEnabled(FeatureFlag.OFFLINE_MODE)).toBe(true);
  });

  it('returns false when env var is "0"', () => {
    process.env.NEXT_PUBLIC_FF_ANALYTICS = "0";
    expect(isFeatureEnabled(FeatureFlag.ANALYTICS)).toBe(false);
  });

  it('returns false when env var is "false"', () => {
    process.env.NEXT_PUBLIC_FF_ANALYTICS = "false";
    expect(isFeatureEnabled(FeatureFlag.ANALYTICS)).toBe(false);
  });

  it("all flags have valid enum entries", () => {
    const flags = Object.values(FeatureFlag);
    expect(flags.length).toBeGreaterThanOrEqual(6);
    flags.forEach((flag) => {
      // Should not throw
      const result = isFeatureEnabled(flag);
      expect(typeof result).toBe("boolean");
    });
  });
});
