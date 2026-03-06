export const metadata = { title: "Stablecoin Swap — Fluxus Docs" };

export default function SwapDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">
        Stablecoin Swap
      </h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Swap between pathUSD, AlphaUSD, BetaUSD, and ThetaUSD using the
        enshrined Stablecoin DEX built into the Tempo protocol. All swaps are
        atomic — approve and swap execute in a single transaction.
      </p>

      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-[--text-primary]">
          How to Swap
        </h2>
        {[
          {
            step: "1",
            title: "Select tokens",
            body: "Choose the token you want to sell (From) and the token you want to receive (To). The swap interface shows your current balance for the selected token.",
          },
          {
            step: "2",
            title: "Enter amount",
            body: "Type the amount you want to swap. A live quote shows the estimated output amount. Slippage protection is applied automatically (0.5% tolerance).",
          },
          {
            step: "3",
            title: "Confirm swap",
            body: "Click Swap and confirm with your passkey. The approve and swap calls execute atomically in a single Tempo Transaction — if either fails, both revert.",
          },
          {
            step: "4",
            title: "View result",
            body: "After confirmation, your updated balances appear immediately. Click the transaction hash to verify on the Tempo explorer.",
          },
        ].map(({ step, title, body }) => (
          <div key={step} className="flex gap-4">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm text-white"
              style={{ background: "var(--gradient-flux)" }}
            >
              {step}
            </div>
            <div>
              <h3 className="font-semibold text-[--text-primary] mb-1">
                {title}
              </h3>
              <p className="text-sm text-[--text-secondary] leading-relaxed">
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-[--text-primary] mb-3">
          Tempo Primitives Used
        </h2>
        <ul className="space-y-2 text-sm text-[--text-secondary]">
          <li>
            <strong className="text-[--text-primary]">Enshrined DEX</strong> —
            Protocol-level stablecoin-to-stablecoin exchange at 0xdec0...0000
          </li>
          <li>
            <strong className="text-[--text-primary]">Atomic Batch</strong> —
            approve + swap in a single forceAtomic transaction
          </li>
          <li>
            <strong className="text-[--text-primary]">Fee Sponsorship</strong> —
            All swap gas fees are sponsored, costing you $0
          </li>
        </ul>
      </div>

      <div className="rounded-[--radius-xl] border border-[--status-info-border] bg-[--status-info-bg] p-4">
        <p className="text-sm text-[--status-info-text]">
          <strong>Note:</strong> All TIP-20 stablecoins use 6 decimal places.
          The swap interface handles precision automatically — what you see is
          what you get.
        </p>
      </div>
    </div>
  );
}
