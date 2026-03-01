import type { Metadata } from "next";

export const metadata: Metadata = { title: "AI Agent Wallet — Fluxus Docs" };

export default function AIAgentDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">AI Agent Wallet</h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Execute payments using natural language. The AI agent — powered by Google Gemini — parses your intent, validates the action through multiple security layers, and presents it for your confirmation before executing on-chain.
      </p>

      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-[--text-primary]">How to Use</h2>
        {[
          { step: "1", title: "Open AI Agent", body: "Navigate to the Agent page. No API key configuration needed — the AI is powered by server-side Gemini integration." },
          { step: "2", title: "Describe your intent", body: "Type a natural language command like \"Send 5 pathUSD to 0xabc...\" or \"Transfer 10 AlphaUSD to 0x...\". The AI parses amount, token, recipient, and memo." },
          { step: "3", title: "Review the action", body: "The agent extracts a structured payment action and displays it in a confirmation card. Verify the recipient, amount, and token before confirming." },
          { step: "4", title: "Confirm and execute", body: "Click Confirm to sign with your passkey. The payment executes on-chain with sponsored gas. The agent never auto-executes — human confirmation is always required." },
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
          <li><strong className="text-[--text-primary]">Prompt Injection Detection</strong> — Messages are scanned for known injection patterns before AI processing</li>
          <li><strong className="text-[--text-primary]">Input Sanitization</strong> — HTML tags, control characters, and system markers are stripped server-side</li>
          <li><strong className="text-[--text-primary]">Address Validation</strong> — Recipient addresses are verified with checksum and checked against a blacklist</li>
          <li><strong className="text-[--text-primary]">Amount Limits</strong> — Transfers are capped at 1,000,000 tokens per action</li>
          <li><strong className="text-[--text-primary]">Token Whitelist</strong> — Only registered stablecoin addresses are accepted</li>
          <li><strong className="text-[--text-primary]">Rate Limiting</strong> — 30 requests per minute to prevent abuse</li>
          <li><strong className="text-[--text-primary]">Human Confirmation</strong> — Every transaction requires explicit passkey confirmation</li>
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-[--text-primary] mb-3">Chat History</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Your conversation history is stored locally in your browser and persists across page refreshes. Use the trash icon to clear the history at any time. No conversation data is stored on our servers.
        </p>
      </div>
    </div>
  );
}
