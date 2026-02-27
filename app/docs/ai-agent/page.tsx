export const metadata = { title: "AI Agent Wallet — Fluxus Docs" };

export default function AIAgentDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">AI Agent Wallet</h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Connect any OpenAI-compatible LLM to your wallet and execute payments using natural language. The agent parses your intent, validates the action, and presents it for your confirmation — with built-in sanitization to prevent prompt injection.
      </p>

      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-[--text-primary]">How to Use</h2>
        {[
          { step: "1", title: "Configure API key", body: "Enter your OpenAI-compatible API endpoint and key. The key is stored locally in your browser and sent only to your configured endpoint — never to Fluxus servers." },
          { step: "2", title: "Describe your intent", body: "Type a natural language command like \"Send 5 pathUSD to 0xabc...\" or \"Transfer 10 AlphaUSD to alice.tempo\". The AI parses amount, token, recipient, and memo." },
          { step: "3", title: "Review the action", body: "The agent extracts a structured payment action and displays it for review. Verify the recipient, amount, and token before confirming." },
          { step: "4", title: "Confirm and execute", body: "Click Confirm to sign with your passkey. The payment executes on-chain. The agent never auto-executes — human confirmation is always required." },
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
          <li><strong className="text-[--text-primary]">Agentic Commerce</strong> — LLM-driven payment intent parsing and execution</li>
          <li><strong className="text-[--text-primary]">Multi-Token</strong> — Agent understands all 4 registered stablecoins</li>
          <li><strong className="text-[--text-primary]">Transfer with Memo</strong> — Agent extracts memo from natural language</li>
          <li><strong className="text-[--text-primary]">Fee Sponsorship</strong> — Agent-initiated payments are gasless</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-[--text-primary] mb-3">Security</h2>
        <ul className="space-y-2 text-sm text-[--text-secondary]">
          <li>Input sanitized server-side to prevent prompt injection</li>
          <li>Amount capped at 1000 tokens per action</li>
          <li>Only registered token addresses accepted</li>
          <li>Human confirmation required for every transaction</li>
          <li>API key stored in browser only — never sent to Fluxus</li>
        </ul>
      </div>
    </div>
  );
}
