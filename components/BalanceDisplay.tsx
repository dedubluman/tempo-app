"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS } from "@/lib/constants";
import { pathUsdAbi } from "@/lib/abi";
import { formatUnits, getAddress, isAddress, parseUnits } from "viem";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

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
  const refetchRef = useRef(refetch);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

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
      void refetchRef.current();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  if (!effectiveAddress) {
    return null;
  }

  if (!hasForcedBalance && isLoading) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
          Available Balance
        </p>
        <Skeleton variant="text" height={56} width={200} />
        <Skeleton variant="text" height={16} width={120} />
      </div>
    );
  }

  if (!hasForcedBalance && (forcedError || isError || isRefetchError)) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
          Available Balance
        </p>
        <p className="text-sm text-[--status-error-text]">Could not load balance. Network may be slow.</p>
        <button
          className="inline-flex h-9 items-center rounded-[--radius-md] border border-[--border-default] px-3 text-sm font-medium text-[--text-secondary] transition-colors hover:bg-[--bg-subtle]"
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
          Available Balance
        </p>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-[--brand-subtle] px-2.5 py-0.5 text-xs font-semibold text-[--brand-primary]">
            pathUSD
          </span>
          {showRefreshing && (
            <span className="text-xs text-[--text-tertiary]">Refreshing</span>
          )}
          <button
            className="inline-flex h-7 w-7 items-center justify-center rounded-[--radius-md] text-[--text-tertiary] transition-all hover:bg-[--bg-subtle] hover:text-[--text-secondary] active:scale-95"
            onClick={() => refetch()}
            type="button"
            aria-label="Refresh balance"
          >
            <ArrowClockwise size={14} className={cn(showRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Large balance display — no card wrapping, breathes freely */}
      <div className="relative" aria-live="polite">
        {/* Ambient glow behind number */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-20"
          style={{ background: "radial-gradient(ellipse at 30% 50%, #fbbf24 0%, transparent 70%)" }}
          aria-hidden="true"
        />
        <p
          className="font-mono font-bold tracking-tighter text-[--text-primary] leading-none"
          style={{ fontSize: "clamp(2.5rem, 6vw, 3.75rem)" }}
          data-testid="balance-amount"
        >
          {twoDecimals}
        </p>
      </div>

      {isZeroBalance && (
        <p className="text-sm text-[--text-secondary]">
          No funds yet.{" "}
          <a
            href="https://docs.tempo.xyz/quickstart/faucet?tab-1=fund-an-address"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[--brand-primary] font-medium hover:underline"
          >
            Get testnet tokens
          </a>
        </p>
      )}
    </div>
  );
}
