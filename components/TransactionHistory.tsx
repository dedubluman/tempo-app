"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS, EXPLORER_URL } from "@/lib/constants";
import { pathUsdAbi } from "@/lib/abi";
import { formatAddress } from "@/lib/utils";
import { getTransferHistorySnapshot, subscribeTransferHistory } from "@/lib/transactionHistoryStore";

interface TransferLog {
  transactionHash: string;
  blockNumber?: bigint;
  args: {
    from: string;
    to: string;
    value: bigint;
  };
}

export function TransactionHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const localSnapshot = useSyncExternalStore(subscribeTransferHistory, getTransferHistorySnapshot, getTransferHistorySnapshot);

  const { data: logs, isLoading, isError, refetch } = useQuery({
    queryKey: ["transferHistory", address],
    queryFn: async () => {
      if (!address || !publicClient) {
        return [];
      }

      const transferEvent = pathUsdAbi.find((item) => item.type === "event" && item.name === "Transfer");
      
      if (!transferEvent) {
        throw new Error("Transfer event not found in ABI");
      }

      try {
        const outboundLogs = await publicClient.getLogs({
          address: PATHUSD_ADDRESS,
          event: transferEvent,
          args: {
            from: address,
          },
          fromBlock: "earliest",
          toBlock: "latest",
        });

        const inboundLogs = await publicClient.getLogs({
          address: PATHUSD_ADDRESS,
          event: transferEvent,
          args: {
            to: address,
          },
          fromBlock: "earliest",
          toBlock: "latest",
        });

        const allLogs = [...outboundLogs, ...inboundLogs];
        const sortedLogs = allLogs.sort((a, b) => Number((b.blockNumber ?? BigInt(0)) - (a.blockNumber ?? BigInt(0))));

        return sortedLogs.slice(0, 20) as TransferLog[];
      } catch {
        return [];
      }
    },
    enabled: !!address && !!publicClient,
    staleTime: 30000,
  });

  const mergedLogs = useMemo(() => {
    if (!address) {
      return [] as TransferLog[];
    }

    const normalizedAddress = address.toLowerCase();
    const localLogs: TransferLog[] = localSnapshot.entries
      .map((entry) => {
        const isSent = entry.direction === "sent";
        return {
          transactionHash: entry.transactionHash,
          blockNumber: undefined,
          args: {
            from: isSent ? address : entry.counterparty,
            to: isSent ? entry.counterparty : address,
            value: entry.amount,
          },
        };
      })
      .filter((entry) => entry.args.from.toLowerCase() === normalizedAddress || entry.args.to.toLowerCase() === normalizedAddress);

    const remoteLogs = logs ?? [];
    const deduped = new Map<string, TransferLog>();

    for (const entry of [...localLogs, ...remoteLogs]) {
      const key = `${entry.transactionHash}-${entry.args.from.toLowerCase()}-${entry.args.to.toLowerCase()}-${entry.args.value.toString()}`;
      if (!deduped.has(key)) {
        deduped.set(key, entry);
      }
    }

    return Array.from(deduped.values()).slice(0, 20);
  }, [address, localSnapshot.entries, logs]);

  if (!address) {
    return null;
  }

  if (isLoading && localSnapshot.entries.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Transaction History
        </p>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2 rounded-xl border border-slate-200 bg-white p-4">
              <div className="h-4 w-20 rounded bg-slate-200"></div>
              <div className="h-3 w-32 rounded bg-slate-100"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError && localSnapshot.entries.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Transaction History
        </p>
        <div className="space-y-3 py-8 text-center">
          <p className="text-sm text-rose-600">Network is slow. Please try again. We could not load your transaction history.</p>
          <button
            onClick={() => void refetch()}
            className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-teal-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            type="button"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!mergedLogs || mergedLogs.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Transaction History
        </p>
        <div className="space-y-2 py-8 text-center">
          <p className="text-sm text-slate-600">No transactions yet</p>
          <p className="text-xs text-slate-500">Your transfer history will appear here</p>
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Transaction History
        </p>
        <a
          href={`${EXPLORER_URL}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-teal-600 transition-colors hover:text-teal-700"
        >
          View All
        </a>
      </div>

      <div className="space-y-2">
        {mergedLogs.map((log) => {
          const isOutbound = log.args.from.toLowerCase() === address.toLowerCase();
          const counterparty = isOutbound ? log.args.to : log.args.from;
          const formattedAmount = formatUnits(log.args.value, PATHUSD_DECIMALS);

          return (
            <div
              key={`${log.transactionHash}-${log.blockNumber}`}
              className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex w-full flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center sm:gap-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isOutbound
                      ? "bg-rose-50 text-rose-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isOutbound ? "Sent" : "Received"}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-sm font-medium text-slate-800">
                    {formatAddress(counterparty, 6, 4)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {log.blockNumber ? `Block ${log.blockNumber.toString()}` : "Pending confirmation"}
                  </p>
                </div>
              </div>

               <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-slate-900">
                    {formattedAmount}
                  </p>
                  <p className="text-xs text-slate-500">pathUSD</p>
                </div>
                <a
                  href={`${EXPLORER_URL}/tx/${log.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                   className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
                >
                  View
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
