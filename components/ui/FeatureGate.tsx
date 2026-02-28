/**
 * FeatureGate component for conditional rendering based on feature flags.
 * Renders children only if the specified feature flag is enabled.
 */

import { ReactNode } from "react";
import { FeatureFlag, isFeatureEnabled } from "@/lib/featureFlags";

interface FeatureGateProps {
  /** The feature flag to check */
  flag: FeatureFlag;
  /** Content to render if feature is enabled */
  children: ReactNode;
  /** Optional fallback content to render if feature is disabled */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on feature flag status.
 *
 * @example
 * ```tsx
 * <FeatureGate flag={FeatureFlag.PASSKEY_RECOVERY}>
 *   <PasskeyRecoveryButton />
 * </FeatureGate>
 * ```
 *
 * @example With fallback
 * ```tsx
 * <FeatureGate
 *   flag={FeatureFlag.NFC_PAYMENT}
 *   fallback={<p>NFC payments coming soon</p>}
 * >
 *   <NFCPaymentForm />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  flag,
  children,
  fallback = null,
}: FeatureGateProps) {
  const isEnabled = isFeatureEnabled(flag);

  if (isEnabled) {
    return children;
  }

  return fallback;
}
