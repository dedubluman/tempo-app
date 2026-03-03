import posthog from "posthog-js";

let isInitialized = false;

/**
 * Initialize PostHog analytics with DNT (Do Not Track) check.
 * Respects navigator.doNotTrack === '1' and skips initialization if set.
 */
export function initAnalytics(): void {
  if (isInitialized) return;

  // Check if Do Not Track is enabled
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") {
    console.warn("[Analytics] Do Not Track enabled, skipping PostHog initialization");
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !host) {
    console.warn("[Analytics] Missing NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_HOST");
    return;
  }

  posthog.init(apiKey, {
    api_host: host,
    person_profiles: "identified_only",
    // Respect user privacy settings
    respect_dnt: true,
    // Don't track if DNT is enabled
    loaded: (ph) => {
      if (navigator.doNotTrack === "1") {
        ph.opt_out_capturing();
      }
    },
  });

  isInitialized = true;
}

/**
 * Track a custom event with optional properties.
 * Skips tracking if DNT is enabled or PostHog is not initialized.
 */
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>
): void {
  if (!isInitialized || navigator.doNotTrack === "1") {
    return;
  }

  posthog.capture(name, properties);
}

/**
 * Identify a user by wallet address (hashed for privacy).
 * Never tracks raw addresses.
 */
export function identifyUser(address: string): void {
  if (!isInitialized || navigator.doNotTrack === "1") {
    return;
  }

  // Hash the address for privacy (simple approach: use first 8 chars + last 4)
  const hashedId = `${address.slice(0, 8)}...${address.slice(-4)}`;

  posthog.identify(hashedId, {
    wallet_address_prefix: address.slice(0, 8),
  });
}
