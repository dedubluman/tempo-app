export const metadata = { title: "Scheduled Payments — Fluxus Docs" };

export default function ScheduledPaymentsDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">
        Scheduled Payments
      </h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Set up time-locked transfers that can only execute within a specific
        window. Use validAfter and validBefore timestamps to schedule payments
        for the future — the transaction is signed now but only valid during
        your chosen time window.
      </p>

      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-[--text-primary]">
          How to Schedule
        </h2>
        {[
          {
            step: "1",
            title: "Set recipient and amount",
            body: "Enter the recipient address, amount, and select the stablecoin. Works with all four registered tokens.",
          },
          {
            step: "2",
            title: "Choose time window",
            body: "Set the earliest execution time (validAfter) and deadline (validBefore). The payment can only execute between these two timestamps.",
          },
          {
            step: "3",
            title: "Sign and queue",
            body: "Confirm with your passkey. The signed transaction is queued locally with a countdown timer showing when the execution window opens.",
          },
          {
            step: "4",
            title: "Auto-execute",
            body: "When the validAfter time arrives, the transaction is broadcast automatically. A live countdown shows progress. If the window closes before execution, the transaction expires safely.",
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
            <strong className="text-[--text-primary]">
              validAfter / validBefore
            </strong>{" "}
            — Tempo Transaction time-validity fields for scheduled execution
          </li>
          <li>
            <strong className="text-[--text-primary]">
              Session Key Delegation
            </strong>{" "}
            — Deferred execution without repeated passkey prompts
          </li>
          <li>
            <strong className="text-[--text-primary]">2D Nonces</strong> —
            Random nonce keys prevent nonce conflicts with concurrent
            transactions
          </li>
          <li>
            <strong className="text-[--text-primary]">Fee Sponsorship</strong> —
            Scheduled payments are gasless for the sender
          </li>
        </ul>
      </div>

      <div className="rounded-[--radius-xl] border border-[--status-info-border] bg-[--status-info-bg] p-4">
        <p className="text-sm text-[--status-info-text]">
          <strong>Note:</strong> Keep the browser tab open for auto-execution.
          If the tab is closed, you can manually execute queued payments when
          you return — as long as the time window is still open.
        </p>
      </div>
    </div>
  );
}
