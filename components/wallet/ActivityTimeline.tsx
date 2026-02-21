"use client";

import { ClockCounterClockwise } from "@phosphor-icons/react";
import { ActivityItem } from "./ActivityItem";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LocalTransferHistoryEntry } from "@/lib/transactionHistoryStore";

interface ActivityTimelineProps {
  transactions: LocalTransferHistoryEntry[];
  className?: string;
}

function getDateLabel(ms: number): string {
  const date = new Date(ms);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ActivityTimeline({ transactions, className }: ActivityTimelineProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={ClockCounterClockwise}
        title="No activity yet"
        description="Your transactions will appear here after your first transfer."
        className={className}
      />
    );
  }

  const grouped: Record<string, LocalTransferHistoryEntry[]> = {};
  for (const tx of transactions) {
    const label = getDateLabel(tx.createdAtMs);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(tx);
  }

  return (
    <div className={className}>
      {Object.entries(grouped).map(([dateLabel, txs]) => (
        <div key={dateLabel} className="mb-4">
          <p className="text-xs text-[--text-muted] font-medium px-3 mb-1">{dateLabel}</p>
          <div className="flex flex-col gap-0.5">
            {txs.map((tx) => (
              <ActivityItem key={tx.id} tx={tx} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
