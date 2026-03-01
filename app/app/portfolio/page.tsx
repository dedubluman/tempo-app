"use client";

import { useMemo } from "react";
import { ArrowsClockwise, ArrowSquareOut } from "@phosphor-icons/react";
import { useTokenBalances } from "@/hooks/useTokenBalances";

const TOKEN_ACCENT: Record<string, string> = {
  pathUSD: "bg-amber-500/80",
  AlphaUSD: "bg-blue-500/80",
  BetaUSD: "bg-emerald-500/80",
  ThetaUSD: "bg-violet-500/80",
};

function tokenAccent(symbol: string): string {
  return TOKEN_ACCENT[symbol] ?? "bg-zinc-500/80";
}

export default function PortfolioPage() {
  const { balances, isLoading, error, refetch } = useTokenBalances();

  const totalValue = useMemo(
    () => balances.reduce((total, item) => total + Number(item.formatted), 0),
    [balances],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[--font-display] text-2xl text-[--text-primary]">Portfolio</h1>
          <p className="mt-1 text-sm text-[--text-secondary]">All Tempo stablecoin balances in one place.</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex h-10 items-center gap-2 rounded-[--radius-md] border border-[--border-default] px-3 text-sm text-[--text-secondary] hover:bg-[--bg-subtle]"
        >
          <ArrowsClockwise size={14} />
          Refresh
        </button>
      </div>

      <section className="mb-4 rounded-[--radius-xl] border border-[--border-subtle] bg-[--bg-surface] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[--text-tertiary]">Total Value</p>
        <p className="mt-2 font-[--font-display] text-3xl text-[--text-primary]">${totalValue.toFixed(6)}</p>
      </section>

      {error ? (
        <p className="mb-4 rounded-[--radius-md] border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-sm text-[--status-error-text]">
          Failed to load balances. Try refreshing.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {balances.map((entry) => (
          <article key={entry.token.address} className="rounded-[--radius-xl] border border-[--border-subtle] bg-[--bg-surface] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${tokenAccent(entry.token.symbol)}`}
                >
                  {entry.token.symbol.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-[--text-primary]">{entry.token.name}</p>
                  <p className="text-xs text-[--text-secondary]">{entry.token.symbol}</p>
                </div>
              </div>
              <span className="rounded-full bg-[--brand-subtle] px-2 py-0.5 text-[11px] text-[--brand-primary]">6d</span>
            </div>

            <p className="font-mono text-2xl text-[--text-primary]">{isLoading ? "..." : entry.formatted}</p>
            <p className="mt-1 text-xs text-[--text-tertiary]">USD Value: ${isLoading ? "..." : Number(entry.formatted).toFixed(6)}</p>

            <a
              href="https://docs.tempo.xyz/quickstart/faucet?tab-1=fund-an-address"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[--brand-subtle] text-[--brand-primary] font-medium hover:bg-[--brand-primary] hover:text-[--bg-base] transition-colors"
            >
              <ArrowSquareOut size={12} />
              Get from Faucet
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}
