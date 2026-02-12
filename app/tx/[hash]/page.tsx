"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { decodeFunctionData, formatUnits, hexToString, isHash } from "viem";
import { useTransaction, useTransactionReceipt } from "wagmi";
import { TxStatus } from "@/components/TxStatus";
import { pathUsdAbi } from "@/lib/abi";
import { EXPLORER_URL, PATHUSD_ADDRESS, PATHUSD_DECIMALS } from "@/lib/constants";

type PageProps = {
  params: Promise<{ hash: string }>;
};

export default function TxDetailPage({ params }: PageProps) {
  const data = use(params);
  const hash = data.hash;

  if (!isHash(hash)) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <p className="text-xl font-semibold tracking-tight text-rose-800">Invalid transaction hash</p>
            <p className="text-sm text-rose-700">
              Hash must start with <code>0x</code> and have 66 characters.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="inline-flex h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              Go to Wallet
            </Link>
            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition-all duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              Open Explorer Home
            </a>
          </div>
        </div>
      </main>
    );
  }

  return <TxDetailView hash={hash} />;
}

function TxDetailView({ hash }: { hash: `0x${string}` }) {
  const { data: tx, isLoading: txLoading } = useTransaction({ hash });
  const { data: receipt, isLoading: receiptLoading, isError } = useTransactionReceipt({ hash });

  const decoded = useMemo(() => {
    if (!tx?.to || tx.to.toLowerCase() !== PATHUSD_ADDRESS.toLowerCase() || !tx.input) {
      return { amount: undefined, memo: undefined };
    }

    try {
      const parsed = decodeFunctionData({
        abi: pathUsdAbi,
        data: tx.input,
      });

      if (parsed.functionName !== "transferWithMemo") {
        return { amount: undefined, memo: undefined };
      }

      const [, amountRaw, memoRaw] = parsed.args;
      const memo = hexToString(memoRaw as `0x${string}`, { size: 32 }).replace(/\0+$/g, "");
      return {
        amount: `${formatUnits(amountRaw as bigint, PATHUSD_DECIMALS)} pathUSD`,
        memo,
      };
    } catch {
      return { amount: undefined, memo: undefined };
    }
  }, [tx]);

  const status: "success" | "pending" | "failed" = receipt
    ? receipt.status === "success"
      ? "success"
      : "failed"
    : "pending";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        {txLoading || receiptLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            Loading transaction...
          </div>
        ) : isError ? (
          <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p className="font-semibold text-rose-800">Transaction not found.</p>
            <p>Verify the hash or open the explorer for recent activity.</p>
          </div>
        ) : (
          <TxStatus
            hash={hash}
            status={status}
            blockNumber={receipt?.blockNumber ? receipt.blockNumber.toString() : undefined}
            amount={decoded.amount}
            memo={decoded.memo}
          />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app"
            className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition-all duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
          >
            Back to Wallet
          </Link>
          <a
            href={`${EXPLORER_URL}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
          >
            Open in Explorer
          </a>
        </div>
      </div>
    </main>
  );
}
