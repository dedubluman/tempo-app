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
            className="block p-4 rounded-[--radius-xl] border border-[--border-default] bg-[--bg-surface] hover:bg-[--bg-elevated] transition-colors"
          >
            <h2 className="font-semibold text-[--text-primary] mb-1">{title}</h2>
            <p className="text-sm text-[--text-secondary]">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-[--radius-xl] border border-[--border-subtle] bg-[--bg-subtle] p-5">
        <h2 className="font-semibold text-[--text-primary] mb-2">About Tempo Testnet</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Fluxus runs on the Tempo Moderato Testnet (Chain ID: 42431). All transfers use pathUSD — a 6-decimal stablecoin predeployed on Tempo. Gas fees are sponsored by the Tempo fee sponsorship system — you never pay gas.
        </p>
      </div>
    </div>
  );
}
