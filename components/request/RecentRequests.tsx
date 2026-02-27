"use client";

import Link from "next/link";
import { Copy, QrCode } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

export type RequestHistoryEntry = {
  id: string;
  to: string;
  amount: string;
  token: string;
  memo: string;
  url: string;
  createdAtMs: number;
};

type RecentRequestsProps = {
  entries: RequestHistoryEntry[];
  onCopy: (url: string) => Promise<void>;
};

function formatDate(value: number): string {
  return new Date(value).toLocaleString();
}

function shortAddress(value: string): string {
  if (value.length < 12) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function RecentRequests({ entries, onCopy }: RecentRequestsProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] px-3 py-2 text-sm text-[--text-secondary]">
        No requests yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <article
          key={entry.id}
          className="rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-surface] px-3 py-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[--text-primary]">
              {entry.amount} {entry.token}
            </p>
            <span className="text-xs text-[--text-secondary]">{formatDate(entry.createdAtMs)}</span>
          </div>
          <p className="mt-1 text-xs text-[--text-secondary]">To: {shortAddress(entry.to)}</p>
          {entry.memo ? <p className="mt-1 text-xs text-[--text-secondary]">Memo: {entry.memo}</p> : null}
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => void onCopy(entry.url)}>
              <Copy size={12} />
              Copy
            </Button>
            <Link
              href={entry.url}
              target="_blank"
              className="inline-flex h-8 items-center gap-1.5 rounded-[--radius-md] border border-[--border-default] px-3 text-xs text-[--text-primary] hover:bg-[--bg-subtle]"
            >
              <QrCode size={12} />
              Open
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
