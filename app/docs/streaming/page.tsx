export const metadata = { title: "Streaming Payments — Fluxus Docs" };

export default function StreamingDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">
        Streaming Payments
      </h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Send micro-payments every 5 seconds as real on-chain transactions. Set a
        total amount and duration, then watch as funds stream to the recipient
        with a live progress tracker.
      </p>

      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-[--text-primary]">
          How to Stream
        </h2>
        {[
          {
            step: "1",
            title: "Set parameters",
            body: "Enter the recipient address, total amount, token, and stream duration. The interface calculates the per-tick amount (total / number of 5-second intervals).",
          },
          {
            step: "2",
            title: "Start stream",
            body: "Click Start Stream and confirm with your passkey. The first micro-payment is sent immediately, then subsequent payments fire every 5 seconds.",
          },
          {
            step: "3",
            title: "Monitor progress",
            body: "A live progress bar shows how much has been streamed vs. remaining. Each tick shows the transaction hash for on-chain verification.",
          },
          {
            step: "4",
            title: "Complete or cancel",
            body: "The stream completes automatically when the total amount is reached. You can cancel at any time — funds already sent are final, but remaining ticks stop.",
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
            <strong className="text-[--text-primary]">Sub-cent Fees</strong> —
            Each 5-second micro-payment costs ~$0.001, making high-frequency
            streaming viable
          </li>
          <li>
            <strong className="text-[--text-primary]">
              Dedicated Payment Lanes
            </strong>{" "}
            — Reserved blockspace ensures streaming transactions are never
            congested
          </li>
          <li>
            <strong className="text-[--text-primary]">Fee Sponsorship</strong> —
            All micro-payment gas fees are sponsored
          </li>
          <li>
            <strong className="text-[--text-primary]">
              Transfer with Memo
            </strong>{" "}
            — Each tick includes a memo like &ldquo;stream-tick-3/12&rdquo; for
            reconciliation
          </li>
        </ul>
      </div>

      <div className="rounded-[--radius-xl] border border-[--status-info-border] bg-[--status-info-bg] p-4">
        <p className="text-sm text-[--status-info-text]">
          <strong>Keep the tab open:</strong> Streaming requires the browser tab
          to remain active. Each 5-second tick sends a real on-chain transaction
          signed with your session key.
        </p>
      </div>
    </div>
  );
}
