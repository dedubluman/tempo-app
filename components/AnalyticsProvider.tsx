"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

/**
 * AnalyticsProvider initializes PostHog on client mount.
 * Respects DNT (Do Not Track) header and skips initialization if enabled.
 */
export function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  useEffect(() => {
    initAnalytics();
  }, []);

  return children;
}
