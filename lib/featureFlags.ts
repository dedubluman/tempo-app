/**
 * Feature flag system for Fluxus V4.
 * Reads from NEXT_PUBLIC_FF_{FLAG_NAME} environment variables.
 * Defaults: existing features ON, new features OFF.
 */

export enum FeatureFlag {
  // Existing features (default: ON)
  ANALYTICS = "ANALYTICS",

  // New features (default: OFF)
  PASSKEY_RECOVERY = "PASSKEY_RECOVERY",
  OFFLINE_MODE = "OFFLINE_MODE",
  NFC_PAYMENT = "NFC_PAYMENT",
  STREAMING_SUBSCRIPTIONS = "STREAMING_SUBSCRIPTIONS",
  ATOMIC_SPLIT = "ATOMIC_SPLIT",
}

/**
 * Default feature flag states.
 * Existing features: true (enabled by default)
 * New features: false (disabled by default)
 */
const FEATURE_DEFAULTS: Record<FeatureFlag, boolean> = {
  [FeatureFlag.ANALYTICS]: true,
  [FeatureFlag.PASSKEY_RECOVERY]: false,
  [FeatureFlag.OFFLINE_MODE]: false,
  [FeatureFlag.NFC_PAYMENT]: false,
  [FeatureFlag.STREAMING_SUBSCRIPTIONS]: false,
  [FeatureFlag.ATOMIC_SPLIT]: false,
};

/**
 * Check if a feature flag is enabled.
 * Reads from process.env.NEXT_PUBLIC_FF_{FLAG_NAME}
 * Falls back to FEATURE_DEFAULTS if env var not set.
 *
 * @param flag - The feature flag to check
 * @returns true if feature is enabled, false otherwise
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envValues: Record<FeatureFlag, string | undefined> = {
    [FeatureFlag.ANALYTICS]: process.env.NEXT_PUBLIC_FF_ANALYTICS,
    [FeatureFlag.PASSKEY_RECOVERY]: process.env.NEXT_PUBLIC_FF_PASSKEY_RECOVERY,
    [FeatureFlag.OFFLINE_MODE]: process.env.NEXT_PUBLIC_FF_OFFLINE_MODE,
    [FeatureFlag.NFC_PAYMENT]: process.env.NEXT_PUBLIC_FF_NFC_PAYMENT,
    [FeatureFlag.STREAMING_SUBSCRIPTIONS]:
      process.env.NEXT_PUBLIC_FF_STREAMING_SUBSCRIPTIONS,
    [FeatureFlag.ATOMIC_SPLIT]: process.env.NEXT_PUBLIC_FF_ATOMIC_SPLIT,
  };
  const envValue = envValues[flag];

  // If env var is explicitly set, use it
  if (envValue !== undefined) {
    return envValue === "1" || envValue === "true";
  }

  // Otherwise use default
  return FEATURE_DEFAULTS[flag];
}
