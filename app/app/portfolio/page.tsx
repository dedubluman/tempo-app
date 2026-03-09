"use client";

import { useMemo } from "react";
import { ArrowsClockwise, ArrowSquareOut } from "@phosphor-icons/react";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { Skeleton } from "@/components/ui/Skeleton";

const TOKEN_ACCENT_STYLE: Record<string, string> = {
  pathUSD: "from-emerald-400 to-emerald-600",
  AlphaUSD: "from-blue-500 to-indigo-600",
  BetaUSD: "from-emerald-500 to-teal-600",
  ThetaUSD: "from-violet-500 to-purple-600",
};

function tokenGradient(symbol: string): string {
  return TOKEN_ACCENT_STYLE[symbol] ?? "from-zinc-500 to-zinc-600";
}

export default function PortfolioPage() {
  const { balances, isLoading, error, refetch } = useTokenBalances();

  const totalValue = useMemo(
    () => balances.reduce((total, item) => total + Number(item.formatted), 0),
    [balances],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28 md:pb-10">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-[--font-display] text-2xl font-bold text-[--text-primary] tracking-tight">
            Portfolio
          </h1>
          <p className="mt-1 text-sm text-[--text-secondary]">
            All Tempo stablecoin balances
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex h-9 items-center gap-1.5 rounded-[--radius-md] border border-[--border-glass] bg-[--bg-glass] px-3 text-sm text-[--text-secondary] transition-all hover:border-[--border-glass-hover] hover:text-[--text-primary] active:scale-95"
        >
          <ArrowsClockwise size={13} />
          Refresh
        </button>
      </div>

      {/* Total Value — no card boxing, breathes freely */}
      <div className="mb-8 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
          Total Portfolio Value
        </p>
        <div className="relative" aria-live="polite">
          <div
            className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-15"
            style={{
              background:
                "radial-gradient(ellipse at 20% 50%, #34d399 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          {isLoading ? (
            <Skeleton variant="text" height={52} width={160} />
          ) : (
            <p
              className="font-mono font-bold tracking-tighter text-[--text-primary]"
              style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
            >
              ${totalValue.toFixed(2)}
            </p>
          )}
        </div>
        <p className="text-xs text-[--text-tertiary]">
          USD equivalent across all stablecoins
        </p>
      </div>

      {error && (
        <p className="mb-6 rounded-[--radius-md] border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-sm text-[--status-error-text]">
          Failed to load balances. Try refreshing.
        </p>
      )}

      {/* Token list — 2-col asymmetric on md+ (featured + secondary) */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 md:gap-6">
        {isLoading
          ? [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 border-b border-[--border-glass]"
              >
                <Skeleton variant="circle" width={40} height={40} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton variant="text" width={100} />
                  <Skeleton variant="text" width={60} />
                </div>
                <Skeleton variant="text" width={80} />
              </div>
            ))
          : balances.map((entry) => (
              <div
                key={entry.token.address}
                className="flex items-center gap-4 py-3 border-b border-[--border-glass] group"
              >
                {/* Token avatar */}
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${tokenGradient(entry.token.symbol)}`}
                >
                  {entry.token.symbol.slice(0, 1).toUpperCase()}
                </div>

                {/* Token info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[--text-primary]">
                    {entry.token.name}
                  </p>
                  <p className="text-xs text-[--text-tertiary]">
                    {entry.token.symbol}
                  </p>
                </div>

                {/* Balance */}
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-base font-semibold text-[--text-primary]">
                    {entry.formatted}
                  </p>
                  <p className="text-[10px] text-[--text-tertiary]">
                    ${Number(entry.formatted).toFixed(2)}
                  </p>
                </div>

                {/* Faucet link */}
                <a
                  href="https://docs.tempo.xyz/quickstart/faucet?tab-1=fund-an-address"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[--text-tertiary] hover:text-[--brand-primary] p-1 flex-shrink-0"
                  aria-label="Get from faucet"
                >
                  <ArrowSquareOut size={13} />
                </a>
              </div>
            ))}
      </div>
    </div>
  );
}
