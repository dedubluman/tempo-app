"use client";

import { useAccount, useReadContract } from "wagmi";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS } from "@/lib/constants";
import { pathUsdAbi } from "@/lib/abi";
import { formatUnits } from "viem";

export function BalanceDisplay() {
  const { address } = useAccount();

  const { data: balance, isLoading, isError, refetch } = useReadContract({
    address: PATHUSD_ADDRESS,
    abi: pathUsdAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  if (!address) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Available Balance
          </p>
          <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
            pathUSD
          </span>
        </div>
        <p className="text-base text-slate-600">Loading balance...</p>
        <div className="h-2 w-24 animate-pulse rounded-full bg-slate-200" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Available Balance
          </p>
          <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
            RPC Error
          </span>
        </div>
        <p className="text-base text-rose-700">Unable to load balance right now.</p>
        <button
          className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
          onClick={() => refetch()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  const formattedFull = balance ? formatUnits(balance, PATHUSD_DECIMALS) : "0";
  const [whole, fraction = "00"] = formattedFull.split(".");
  const twoDecimals = `${whole}.${fraction.padEnd(2, "0").slice(0, 2)}`;

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Available Balance
        </p>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">pathUSD</span>
          <button
            className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            onClick={() => refetch()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>
      <p className="font-mono text-4xl font-semibold tracking-tight text-slate-900 sm:text-[2.75rem]">{twoDecimals}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-mono">Raw: {formattedFull} pathUSD</span>
        <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 font-medium text-teal-700">
          6 decimals
        </span>
      </div>
      <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">Sponsored gas keeps transfers at $0 for users.</p>
    </div>
  );
}
