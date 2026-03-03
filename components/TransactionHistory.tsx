"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { motion } from "framer-motion";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS, EXPLORER_URL } from "@/lib/constants";
import { pathUsdAbi } from "@/lib/abi";
import { formatAddress } from "@/lib/utils";
import { getTransferHistorySnapshot, subscribeTransferHistory } from "@/lib/transactionHistoryStore";
import { useMotionSafe } from "@/lib/motion";
import { ArrowSquareOut, ArrowUp, ArrowDown, ClockCountdown, Warning } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

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
  const localEntries = useSyncExternalStore(subscribeTransferHistory, getTransferHistorySnapshot, getTransferHistorySnapshot);
  const variants = useMotionSafe();

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
    const localLogs: TransferLog[] = localEntries
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

    for (const entry of [...remoteLogs, ...localLogs]) {
      const key = `${entry.transactionHash}-${entry.args.from.toLowerCase()}-${entry.args.to.toLowerCase()}-${entry.args.value.toString()}`;
      if (!deduped.has(key)) {
        deduped.set(key, entry);
      }
    }

    return Array.from(deduped.values()).slice(0, 20);
  }, [address, localEntries, logs]);

  if (!address) {
    return null;
  }

  if (isLoading && localEntries.length === 0) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton variant="circle" width={36} height={36} />
            <div className="flex-1 space-y-1.5">
              <Skeleton variant="text" width={140} />
              <Skeleton variant="text" width={90} />
            </div>
            <Skeleton variant="text" width={60} />
          </div>
        ))}
      </div>
    );
  }

  if (isError && localEntries.length === 0) {
    return (
      <div className="py-6 text-center space-y-3">
        <Warning size={20} className="mx-auto text-[--status-error-text]" />
        <p className="text-sm text-[--status-error-text]">Could not load history. Network may be slow.</p>
        <button
          onClick={() => void refetch()}
          className="inline-flex h-9 items-center rounded-[--radius-md] border border-[--border-default] px-3 text-sm font-medium text-[--brand-primary] transition-colors hover:bg-[--bg-subtle]"
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!mergedLogs || mergedLogs.length === 0) {
    return (
      <EmptyState
        icon={ClockCountdown}
        title="No activity yet"
        description="Your transfer history will appear here once you send or receive pathUSD."
      />
    );
  }

  return (
    <motion.div
      variants={variants.staggerContainer}
      initial="hidden"
      animate="visible"
      className="divide-y divide-[--border-glass]"
    >
      {mergedLogs.map((log) => {
        const isOutbound = log.args.from.toLowerCase() === address.toLowerCase();
        const counterparty = isOutbound ? log.args.to : log.args.from;
        const formattedAmount = formatUnits(log.args.value, PATHUSD_DECIMALS);

        return (
          <motion.div
            key={`${log.transactionHash}-${log.blockNumber}`}
            variants={variants.fadeUp}
            className="flex items-center gap-3 py-3 group"
          >
            {/* Direction icon */}
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                isOutbound
                  ? "bg-[--status-error-bg] text-[--status-error-text]"
                  : "bg-[--status-success-bg] text-[--status-success-text]"
              }`}
            >
              {isOutbound ? <ArrowUp size={14} weight="bold" /> : <ArrowDown size={14} weight="bold" />}
            </div>

            {/* Counterparty */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[--text-primary]">
                {isOutbound ? "Sent" : "Received"}
              </p>
              <p className="text-xs font-mono text-[--text-tertiary] truncate">
                {formatAddress(counterparty, 6, 4)}
              </p>
            </div>

            {/* Amount + link */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-[--text-primary]">
                  {isOutbound ? "-" : "+"}{formattedAmount}
                </p>
                <p className="text-[10px] text-[--text-tertiary]">pathUSD</p>
              </div>
              <a
                href={`${EXPLORER_URL}/tx/${log.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[--text-tertiary] hover:text-[--brand-primary] p-1"
                aria-label="View on explorer"
              >
                <ArrowSquareOut size={13} />
              </a>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
