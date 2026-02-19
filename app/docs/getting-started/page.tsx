export const metadata = { title: "Getting Started — Fluxus Docs" };

export default function GettingStartedPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">Getting Started</h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Fluxus requires no app download, no seed phrase, and no gas fees. Here is how to get started in under two minutes.
      </p>

      <div className="space-y-5">
        {[
          {
            step: "1",
            title: "Open the app",
            body: "Navigate to the Fluxus landing page and click \"Create Your Wallet\". Your browser will prompt you to create a passkey — this uses WebAuthn, the same standard used for Face ID and fingerprint login.",
          },
          {
            step: "2",
            title: "Create your passkey",
            body: "Confirm the passkey creation with your device biometrics or PIN. A new Tempo wallet address is generated and linked to your passkey. This address is unique and persists as long as your passkey does.",
          },
          {
            step: "3",
            title: "Fund your wallet",
            body: "Copy your wallet address from the dashboard and use the Tempo testnet faucet to get pathUSD tokens. You can also receive tokens from another Fluxus user.",
          },
          {
            step: "4",
            title: "Send your first transfer",
            body: "Enter a recipient address and amount, then click Send. Confirm with your passkey. The transfer finalizes on-chain in under 0.5 seconds — and costs you $0 in gas.",
          },
        ].map(({ step, title, body }) => (
          <div key={step} className="flex gap-4">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm text-white" style={{ background: "var(--gradient-flux)" }}>
              {step}
            </div>
            <div>
              <h2 className="font-semibold text-[--text-primary] mb-1">{title}</h2>
              <p className="text-sm text-[--text-secondary] leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[--radius-xl] border border-[--status-info-border] bg-[--status-info-bg] p-4">
        <p className="text-sm text-[--status-info-text]">
          <strong>Returning user?</strong> Use &ldquo;Sign In&rdquo; instead of &ldquo;Create Wallet&rdquo; to reconnect your existing address. Creating a new wallet generates a new address.
        </p>
      </div>
    </div>
  );
}
