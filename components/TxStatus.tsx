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
  success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  failed: "bg-rose-100 text-rose-800 border border-rose-200",
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
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Transaction Result</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusStyle[status]}`}>
          {status}
        </span>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-800">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Hash</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-sm text-slate-800" title={hash}>
              {shortHash}
            </p>
            <button
              type="button"
              onClick={() => void copyHash()}
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-700">
          <span className="font-medium">Block:</span> {blockNumber ?? "-"}
        </p>
        <p className="text-xl font-semibold tracking-tight text-slate-900">
          <span className="text-sm font-medium text-slate-600">Amount:</span> {" "}
          {amount ?? "-"}
        </p>
        <p className="break-words">
          <span className="font-medium">Memo:</span> {memo && memo.length > 0 ? memo : "-"}
        </p>
      </div>
    </div>
  );
}
