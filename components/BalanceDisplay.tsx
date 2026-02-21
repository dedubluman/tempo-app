"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS } from "@/lib/constants";
import { pathUsdAbi } from "@/lib/abi";
import { formatUnits, getAddress, isAddress, parseUnits } from "viem";

const E2E_MOCK_AUTH = process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === "1";

export function BalanceDisplay() {
  const { address } = useAccount();
  const mockAddress =
    E2E_MOCK_AUTH && typeof window !== "undefined" && window.localStorage.getItem("tempo.walletCreated") === "1"
      ? window.localStorage.getItem("tempo.lastAddress") || ""
      : "";
  const normalizedMockAddress = isAddress(mockAddress.toLowerCase()) ? getAddress(mockAddress.toLowerCase()) : undefined;

  const normalizedAddress = address && isAddress(address) ? getAddress(address) : undefined;
  const effectiveAddress: `0x${string}` | undefined = normalizedAddress ?? (E2E_MOCK_AUTH ? normalizedMockAddress : undefined);
  const forcedError =
    E2E_MOCK_AUTH &&
    typeof window !== "undefined" &&
    window.localStorage.getItem("tempo.mockBalanceError") === "1";
  const forcedBalance =
    E2E_MOCK_AUTH && typeof window !== "undefined"
      ? (() => {
          const raw = window.localStorage.getItem("tempo.mockBalanceValue");
          if (!raw) {
            return undefined;
          }

          try {
            return parseUnits(raw, PATHUSD_DECIMALS);
          } catch {
            return undefined;
          }
        })()
      : undefined;
  const hasForcedBalance = forcedBalance !== undefined;

  const { data: balance, isLoading, isFetching, isError, isRefetchError, refetch } = useReadContract({
    address: PATHUSD_ADDRESS,
    abi: pathUsdAbi,
    functionName: "balanceOf",
    args: effectiveAddress ? [effectiveAddress] : undefined,
    query: {
      enabled: !!effectiveAddress,
      refetchOnWindowFocus: false,
    },
  });

  const [showRefreshing, setShowRefreshing] = useState(false);

  useEffect(() => {
    let timeoutId = 0;

    if (!isFetching) {
      timeoutId = window.setTimeout(() => {
        setShowRefreshing(false);
      }, 0);
    } else {
      timeoutId = window.setTimeout(() => {
        setShowRefreshing(true);
      }, 450);
    }

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isFetching]);

  useEffect(() => {
    const handleFocus = () => {
      void refetch();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetch]);

  if (!effectiveAddress) {
    return null;
  }

  if (!hasForcedBalance && isLoading) {
    return (
      <div className="space-y-5 rounded-2xl border border-[--border-default] bg-[--bg-surface] p-4 sm:p-6 shadow-[--shadow-sm] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[--shadow-lg]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
            Available Balance
          </p>
          <span className="inline-flex rounded-full bg-[--bg-elevated] px-2.5 py-1 text-xs font-medium text-[--text-secondary]">
            Loading
          </span>
        </div>
        <div className="space-y-2">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-[--bg-elevated] sm:w-52" />
          <div className="h-3 w-36 animate-pulse rounded-full bg-[--bg-elevated]" />
        </div>
        <p className="text-sm text-[--text-tertiary]">Reading your latest on-chain balance...</p>
      </div>
    );
  }

  if (!hasForcedBalance && (forcedError || isError || isRefetchError)) {
    return (
      <div className="space-y-5 rounded-2xl border border-[--border-default] bg-[--bg-surface] p-4 sm:p-6 shadow-[--shadow-sm] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[--shadow-lg]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
            Available Balance
          </p>
          <span className="inline-flex rounded-full bg-[--status-error-bg] px-2.5 py-1 text-xs font-medium text-[--status-error-text]">
            RPC Error
          </span>
        </div>
        <p className="text-base text-[--status-error-text]">Network is slow. Please try again. We could not load your latest balance.</p>
        <button
          className="inline-flex h-11 items-center rounded-lg border border-[--border-default] px-3 text-sm font-medium text-[--text-secondary] transition-colors duration-150 hover:bg-[--bg-subtle] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand-primary]/60 focus-visible:ring-offset-2"
          onClick={() => refetch()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  const resolvedBalance = hasForcedBalance ? forcedBalance : balance;
  const formattedFull = resolvedBalance ? formatUnits(resolvedBalance, PATHUSD_DECIMALS) : "0";
  const [whole, fraction = "00"] = formattedFull.split(".");
  const twoDecimals = `${whole}.${fraction.padEnd(2, "0").slice(0, 2)}`;
  const isZeroBalance = !balance || formattedFull === "0";

  return (
      <div className="space-y-5 rounded-2xl border border-[--border-default] bg-[--bg-surface] p-4 sm:p-6 shadow-[--shadow-sm] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[--shadow-lg]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
          Available Balance
        </p>
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          <span className="inline-flex rounded-full bg-[--brand-subtle] px-2.5 py-1 text-xs font-medium text-[--brand-primary]">pathUSD</span>
          <span
            className={`inline-flex min-h-6 items-center justify-center rounded-full px-2 py-1 text-xs font-medium ${
              showRefreshing ? "bg-[--bg-elevated] text-[--text-tertiary]" : "invisible"
            }`}
          >
            Refreshing
          </span>
          <button
            className="inline-flex h-11 shrink-0 items-center rounded-lg border border-[--border-default] px-3 text-sm font-medium text-[--text-tertiary] transition-colors duration-150 hover:bg-[--bg-subtle] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand-primary]/60 focus-visible:ring-offset-2"
            onClick={() => refetch()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>
      <p className="font-mono text-3xl font-semibold tracking-tight text-[--text-primary] sm:text-4xl lg:text-[2.75rem]">{twoDecimals}</p>
      <div className="flex flex-col gap-2 text-xs text-[--text-tertiary] sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono whitespace-nowrap overflow-hidden text-ellipsis">Raw: {formattedFull} pathUSD</span>
        <span className="inline-flex flex-shrink-0 whitespace-nowrap rounded-full bg-[--brand-subtle] px-2.5 py-1 font-medium text-[--brand-primary]">
          6 decimals
        </span>
      </div>
      {isZeroBalance ? (
        <p className="text-sm text-[--text-tertiary]">
          No funds yet. Get testnet tokens from the faucet to start.{" "}
          <a
            href="https://docs.tempo.xyz/quickstart/faucet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1.5 rounded-lg bg-[--brand-subtle] text-[--brand-primary] font-medium hover:bg-[--brand-primary] hover:text-[--bg-base] transition-colors"
          >
            Open faucet
          </a>
          .
        </p>
      ) : null}
      <p className="border-t border-[--border-default] pt-3 text-sm text-[--text-tertiary]">Sponsored gas keeps transfers at $0 for users.</p>
    </div>
  );
}
