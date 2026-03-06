"use client";

import { useEffect } from "react";
import { FeatureGate } from "@/components/ui/FeatureGate";
import { FeatureFlag } from "@/lib/featureFlags";
import { useOfflineStore } from "@/lib/store";

export function OfflineBanner() {
  const isOnline = useOfflineStore((state) => state.isOnline);
  const setIsOnline = useOfflineStore((state) => state.setIsOnline);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);

  if (isOnline) {
    return null;
  }

  return (
    <FeatureGate flag={FeatureFlag.OFFLINE_MODE}>
      <div
        role="alert"
        aria-live="assertive"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[--brand-primary]/35 bg-[--brand-primary]/95 px-4 py-3 text-center text-sm font-medium text-[--brand-contrast] shadow-lg backdrop-blur-sm"
      >
        You are offline. Transactions will be sent when connection is restored.
      </div>
    </FeatureGate>
  );
}
