export const metadata = { title: "Send & Receive — Fluxus Docs" };

export default function SendReceivePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">Send &amp; Receive</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">Single Transfer</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Enter a recipient Tempo address and a pathUSD amount. Optionally add a memo (up to 32 bytes). Click Send, confirm with your passkey, and the transfer finalizes on-chain instantly.
        </p>
        <ul className="space-y-1 text-sm text-[--text-secondary] list-disc list-inside">
          <li>Recipient must be a valid Tempo/EVM address (0x...)</li>
          <li>Amount must be greater than 0 and not exceed your balance</li>
          <li>Memo is optional and capped at 32 bytes</li>
          <li>Use the &ldquo;Max&rdquo; button to fill in your full available balance</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">Batch Transfer</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Switch to Batch mode to send to multiple recipients in a single transaction. Add up to 10 recipient rows. The total must not exceed your balance. All transfers execute atomically — either all succeed or all fail.
        </p>
        <ul className="space-y-1 text-sm text-[--text-secondary] list-disc list-inside">
          <li>Click &ldquo;Batch Send&rdquo; to switch modes</li>
          <li>Add rows with &ldquo;Add Recipient&rdquo; (max 10)</li>
          <li>Remove rows with the remove button on each row</li>
          <li>Total is shown at the bottom of the form</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">Receiving pathUSD</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Your wallet address is shown on the dashboard. Copy it and share it with senders. You can also use the Tempo testnet faucet to fund your wallet with test tokens.
        </p>
      </section>

      <div className="rounded-[--radius-xl] border border-[--status-warning-border] bg-[--status-warning-bg] p-4">
        <p className="text-sm text-[--status-warning-text]">
          <strong>Note:</strong> pathUSD uses 6 decimal places. Maximum precision is 6 decimal digits. Amounts with more decimals will be rejected.
        </p>
      </div>
    </div>
  );
}
