"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

interface BalanceCardProps {
  balance: bigint | undefined;
  formattedBalance: string;
  isLoading: boolean;
  isError?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function BalanceCard({
  balance,
  formattedBalance,
  isLoading,
  isError,
  onRefresh,
  className,
}: BalanceCardProps) {
  return (
    <div className={cn("rounded-[--radius-2xl] bg-[--bg-surface] p-6", className)}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-[--text-secondary] font-medium">Balance</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-[--text-tertiary] hover:text-[--text-secondary] transition-colors p-1 -mr-1"
            aria-label="Refresh balance"
            data-testid="balance-refresh"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {isLoading ? (
        <Skeleton variant="text" height={48} className="w-48 mb-3" />
      ) : isError ? (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[--status-error-text] text-base">Failed to load</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-[--brand-primary] hover:underline"
              data-testid="balance-retry"
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-bold text-[--text-primary] font-[--font-display] tabular-nums">
            {formattedBalance}
          </span>
          <span className="text-base text-[--text-secondary] font-medium">pathUSD</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Badge variant="success" size="sm" dot>
          Gas: $0 (sponsored)
        </Badge>
        {!isLoading && balance === BigInt(0) && (
          <span className="text-xs text-[--text-muted]">Fund your wallet to get started</span>
        )}
      </div>
    </div>
  );
}
