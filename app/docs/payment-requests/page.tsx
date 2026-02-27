export const metadata = { title: "Payment Requests — Fluxus Docs" };

export default function PaymentRequestsDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">Payment Requests</h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Create shareable payment links with a pre-filled recipient, amount, token, and memo. Send the link to anyone — they open it, confirm with their passkey, and the payment is done.
      </p>

      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-[--text-primary]">How to Create a Request</h2>
        {[
          { step: "1", title: "Set the amount", body: "Enter the amount you want to receive and select which stablecoin (pathUSD, AlphaUSD, BetaUSD, or ThetaUSD)." },
          { step: "2", title: "Add a memo (optional)", body: "Include a reference like an invoice number or description. This is stored on-chain as a 32-byte transfer memo." },
          { step: "3", title: "Generate the link", body: "Click Generate Link to create a shareable URL. The link encodes your address, amount, token, and memo as URL parameters." },
          { step: "4", title: "Share and receive", body: "Send the link via any messaging app. When the payer opens it, they see a pre-filled payment form and can pay with one tap." },
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
          <li><strong className="text-[--text-primary]">Transfer with Memo</strong> — 32-byte on-chain memo for invoice/reference IDs</li>
          <li><strong className="text-[--text-primary]">Multi-Token Support</strong> — Request any of the 4 registered TIP-20 stablecoins</li>
          <li><strong className="text-[--text-primary]">Fee Sponsorship</strong> — Payer pays $0 gas — fees are sponsored</li>
        </ul>
      </div>

      <div className="rounded-[--radius-xl] border border-[--status-info-border] bg-[--status-info-bg] p-4">
        <p className="text-sm text-[--status-info-text]">
          <strong>Privacy note:</strong> Payment links are client-side only — no data is stored on any server. The link itself contains all the information needed.
        </p>
      </div>
    </div>
  );
}
