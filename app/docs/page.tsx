import Link from "next/link";

export const metadata = { title: "Docs — Fluxus" };

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display] mb-3">Fluxus Documentation</h1>
        <p className="text-[--text-secondary] leading-relaxed">
          Fluxus is a passwordless P2P stablecoin wallet built on the Tempo testnet. It uses WebAuthn passkeys for authentication and sponsors all gas fees so you pay nothing to transfer.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { href: "/docs/getting-started", title: "Getting Started", desc: "Create your wallet and make your first transfer in under 2 minutes." },
          { href: "/docs/send-receive", title: "Send & Receive", desc: "How to send single and batch transfers, and how to receive pathUSD." },
          { href: "/docs/session-keys", title: "Session Keys", desc: "Authorize spending policies for seamless transfers without passkey prompts." },
          { href: "/docs/transaction-history", title: "Transaction History", desc: "Track your on-chain activity and view transaction details on the explorer." },
          { href: "/docs/security", title: "Security", desc: "How passkeys, sponsored gas, and Tempo blockchain keep your funds safe." },
        ].map(({ href, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="block p-4 rounded-[--radius-xl] border border-[--border-glass] bg-[--bg-glass] backdrop-blur-md hover:bg-[--bg-glass-hover] hover:border-[--border-glass-hover] transition-colors"
          >
            <h2 className="font-semibold text-[--text-primary] mb-1">{title}</h2>
            <p className="text-sm text-[--text-secondary]">{desc}</p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold text-[--text-primary] font-[--font-display] mb-4">Advanced Features</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { href: "/docs/swap", title: "Stablecoin Swap", desc: "Swap between four stablecoins instantly via the enshrined DEX." },
            { href: "/docs/payment-requests", title: "Payment Requests", desc: "Create shareable payment links with pre-filled amount and memo." },
            { href: "/docs/token-forge", title: "Token Forge", desc: "Create your own TIP-20 stablecoin with compliance policies and DEX listing." },
            { href: "/docs/scheduled-payments", title: "Scheduled Payments", desc: "Set up time-locked transfers with validAfter/validBefore windows." },
            { href: "/docs/ai-agent", title: "AI Agent Wallet", desc: "Connect an LLM to execute payments via natural language commands." },
            { href: "/docs/portfolio", title: "Portfolio", desc: "View balances across all Tempo stablecoins in a unified dashboard." },
            { href: "/docs/pos-terminal", title: "POS Terminal", desc: "Turn any device into a point-of-sale terminal with QR code payments." },
            { href: "/docs/streaming", title: "Streaming Payments", desc: "Send micro-payments every 5 seconds with real on-chain transactions." },
          ].map(({ href, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="block p-4 rounded-[--radius-xl] border border-[--border-glass] bg-[--bg-glass] backdrop-blur-md hover:bg-[--bg-glass-hover] hover:border-[--border-glass-hover] transition-colors"
            >
              <h2 className="font-semibold text-[--text-primary] mb-1">{title}</h2>
              <p className="text-sm text-[--text-secondary]">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-[--radius-xl] border border-[--border-glass] bg-[--bg-glass] backdrop-blur-md p-5">
        <h2 className="font-semibold text-[--text-primary] mb-2">About Tempo Testnet</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Fluxus runs on the Tempo Moderato Testnet (Chain ID: 42431). All transfers use pathUSD — a 6-decimal stablecoin predeployed on Tempo. Gas fees are sponsored by the Tempo fee sponsorship system — you never pay gas.
        </p>
      </div>
    </div>
  );
}
