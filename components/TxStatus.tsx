"use client";

import { useMemo, useState } from "react";

type TxStatusProps = {
  hash: string;
  status: "success" | "pending" | "failed";
  blockNumber?: string;
  amount?: string;
  memo?: string;
};

const statusStyle: Record<TxStatusProps["status"], string> = {
  success: "bg-[--status-success-bg] text-[--status-success-text] border border-[--status-success-border]",
  pending: "bg-[--status-warning-bg] text-[--status-warning-text] border border-[--status-warning-border]",
  failed: "bg-[--status-error-bg] text-[--status-error-text] border border-[--status-error-border]",
};

export function TxStatus({ hash, status, blockNumber, amount, memo }: TxStatusProps) {
  const [copied, setCopied] = useState(false);
  const shortHash = useMemo(() => `${hash.slice(0, 10)}...${hash.slice(-8)}`, [hash]);

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-[--border-default] bg-[--bg-surface] p-4 sm:p-6 shadow-[--shadow-sm]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">Transaction Result</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusStyle[status]}`}>
          {status}
        </span>
      </div>

      <div className="space-y-3 border-t border-[--border-default] pt-4 text-sm text-[--text-secondary]">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[--text-tertiary]">Hash</p>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <p className="rounded-lg border border-[--border-default] bg-[--bg-elevated] px-2.5 py-1 font-mono text-sm text-[--text-secondary]" title={hash}>
              {shortHash}
            </p>
            <button
              type="button"
              onClick={() => void copyHash()}
              className="inline-flex h-11 items-center rounded-lg border border-[--border-default] px-3 text-sm font-medium text-[--text-tertiary] transition-colors duration-150 hover:bg-[--bg-subtle] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand-primary]/60 focus-visible:ring-offset-2"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <p className="text-sm text-[--text-secondary]">
          <span className="font-medium">Block:</span> {blockNumber ?? "-"}
        </p>
        <p className="text-xl font-semibold tracking-tight text-[--text-primary]">
          <span className="text-sm font-medium text-[--text-tertiary]">Amount:</span> {" "}
          {amount ?? "-"}
        </p>
        <p className="break-words">
          <span className="font-medium">Memo:</span> {memo && memo.length > 0 ? memo : "-"}
        </p>
      </div>
    </div>
  );
}
