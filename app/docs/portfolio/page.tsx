export const metadata = { title: "Portfolio — Fluxus Docs" };

export default function PortfolioDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">Multi-Token Portfolio</h1>

      <p className="text-[--text-secondary] leading-relaxed">
        View your balances across all four Tempo stablecoins in a single dashboard. Balances are fetched in one call using the Multicall3 contract for maximum efficiency.
      </p>

      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-[--text-primary]">Features</h2>
        {[
          { step: "1", title: "Unified balance view", body: "See pathUSD, AlphaUSD, BetaUSD, and ThetaUSD balances at a glance. Each token shows its balance formatted to 6 decimal places." },
          { step: "2", title: "Batch balance fetching", body: "All 4 token balances are fetched in a single Multicall3 aggregate3 call — one RPC round-trip instead of four." },
          { step: "3", title: "Quick actions", body: "Navigate directly to Swap, Send, or Request from any token card. The selected token is carried over to the target feature." },
        ].map(({ step, title, body }) => (
          <div key={step} className="flex gap-4">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm text-white" style={{ background: "var(--gradient-flux)" }}>
              {step}
            </div>
            <div>
              <h3 className="font-semibold text-[--text-primary] mb-1">{title}</h3>
              <p className="text-sm text-[--text-secondary] leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-[--text-primary] mb-3">Tempo Primitives Used</h2>
        <ul className="space-y-2 text-sm text-[--text-secondary]">
          <li><strong className="text-[--text-primary]">Multicall3</strong> — Batch balanceOf queries in a single aggregate3 call at 0xcA11...CA11</li>
          <li><strong className="text-[--text-primary]">TIP-20 balanceOf</strong> — Standard balance queries (not eth_getBalance — Tempo has no native token)</li>
          <li><strong className="text-[--text-primary]">Multi-Token Registry</strong> — 4 predeployed stablecoins with 6-decimal precision</li>
        </ul>
      </div>

      <div className="rounded-[--radius-xl] border border-[--status-info-border] bg-[--status-info-bg] p-4">
        <p className="text-sm text-[--status-info-text]">
          <strong>Why Multicall3?</strong> Instead of making 4 separate RPC calls (one per token), the portfolio uses Multicall3 to batch all balance queries into a single call. This reduces latency and RPC load.
        </p>
      </div>
    </div>
  );
}
