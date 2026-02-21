"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft } from "@phosphor-icons/react";
import { formatUnits } from "viem";
import { AddressAvatar } from "@/components/ui/AddressAvatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { PATHUSD_DECIMALS } from "@/lib/constants";
import type { LocalTransferHistoryEntry } from "@/lib/transactionHistoryStore";

interface ActivityItemProps {
  tx: LocalTransferHistoryEntry;
  className?: string;
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActivityItem({ tx, className }: ActivityItemProps) {
  const isSent = tx.direction === "sent";
  const formattedAmount = formatUnits(tx.amount, PATHUSD_DECIMALS);
  const shortHash = `${tx.transactionHash.slice(0, 8)}…${tx.transactionHash.slice(-6)}`;

  return (
    <Link
      href={`/tx/${tx.transactionHash}`}
      data-testid={`activity-item-${tx.transactionHash}`}
      className={cn(
        "flex items-center gap-3 p-3 rounded-[--radius-lg]",
        "hover:bg-[--bg-subtle] transition-colors group",
        className
      )}
    >
      <div className="relative flex-shrink-0">
        <AddressAvatar address={tx.counterparty} size="md" />
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center",
          isSent ? "bg-[--status-info-bg] text-[--status-info-text]" : "bg-[--status-success-bg] text-[--status-success-text]"
        )}>
          {isSent ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-[--text-primary] font-medium truncate font-mono">
            {`${tx.counterparty.slice(0, 6)}…${tx.counterparty.slice(-4)}`}
          </span>
          <span className={cn(
            "text-sm font-semibold tabular-nums flex-shrink-0",
            isSent ? "text-[--text-primary]" : "text-[--status-success-text]"
          )}>
            {isSent ? "-" : "+"}{formattedAmount} <span className="text-[--text-muted] font-normal text-xs">USD</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-[--text-muted] font-mono truncate">{shortHash}</span>
          <span className="text-xs text-[--text-muted] flex-shrink-0">{formatRelativeTime(tx.createdAtMs)}</span>
        </div>
      </div>
    </Link>
  );
}
