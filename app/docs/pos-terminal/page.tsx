export const metadata = { title: "POS Terminal — Fluxus Docs" };

export default function POSTerminalDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">QR POS Terminal</h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Turn any device into a point-of-sale terminal. Enter an amount on the keypad, display a QR code for the customer, and detect incoming payments in real-time.
      </p>

      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-[--text-primary]">How to Accept Payments</h2>
        {[
          { step: "1", title: "Enter amount", body: "Use the on-screen keypad to enter the payment amount. Select which stablecoin to accept (pathUSD by default)." },
          { step: "2", title: "Display QR code", body: "A QR code is generated containing a payment link with your address, amount, and token pre-filled. Show this to the customer." },
          { step: "3", title: "Customer scans and pays", body: "The customer scans the QR code with their Fluxus wallet (or any compatible wallet). They confirm the payment with their passkey." },
          { step: "4", title: "Payment detected", body: "The terminal automatically detects the incoming payment and displays a success confirmation. No manual verification needed." },
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
          <li><strong className="text-[--text-primary]">Sub-second Finality</strong> — Payment confirmed in under 0.5 seconds</li>
          <li><strong className="text-[--text-primary]">Fee Sponsorship</strong> — Customer pays $0 gas, making it a true zero-fee POS</li>
          <li><strong className="text-[--text-primary]">Multi-Token</strong> — Accept any of the 4 registered TIP-20 stablecoins</li>
          <li><strong className="text-[--text-primary]">Payment Request Links</strong> — QR code encodes a standard Fluxus payment URL</li>
        </ul>
      </div>

      <div className="rounded-[--radius-xl] border border-[--status-info-border] bg-[--status-info-bg] p-4">
        <p className="text-sm text-[--status-info-text]">
          <strong>Merchant mode:</strong> The POS terminal is receive-only. It cannot send payments — only display QR codes and detect incoming transfers to your address.
        </p>
      </div>
    </div>
  );
}
