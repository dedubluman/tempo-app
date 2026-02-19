export const metadata = { title: "Transaction History — Fluxus Docs" };

export default function TransactionHistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">Transaction History</h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Fluxus keeps a local record of all transfers you make and receives on-chain transfer events for your wallet address. Your activity feed shows both sent and received transfers.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">Local history</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Transfers you submit through Fluxus are immediately recorded in local storage with their transaction hash, counterparty address, amount, and direction. This data persists in your browser across sessions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">On-chain history</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Fluxus also queries the Tempo blockchain for Transfer events involving your wallet address. This means received transfers are shown even if you did not send them through Fluxus.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">Transaction detail page</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Click any activity item to view the transaction detail page at <code className="text-[--brand-primary] bg-[--bg-subtle] px-1 rounded text-xs">/tx/[hash]</code>. This shows the decoded transfer parameters, status, and a link to the Tempo explorer for full on-chain detail.
        </p>
      </section>

      <div className="rounded-[--radius-xl] border border-[--border-subtle] bg-[--bg-subtle] p-4">
        <p className="text-sm text-[--text-secondary]">
          <strong>Note:</strong> Local history is stored in your browser. Clearing browser data will remove local transfer records, but on-chain transfers are permanently recorded on the Tempo blockchain and can be viewed on the explorer.
        </p>
      </div>
    </div>
  );
}
