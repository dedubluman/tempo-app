"use client";

import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { FluxusLogo } from "@/components/ui/FluxusLogo";
import type { ReactNode } from "react";

const docLinks = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/send-receive", label: "Send & Receive" },
  { href: "/docs/session-keys", label: "Session Keys" },
  { href: "/docs/transaction-history", label: "Transaction History" },
  { href: "/docs/security", label: "Security" },
  { href: "/docs/swap", label: "Stablecoin Swap" },
  { href: "/docs/payment-requests", label: "Payment Requests" },
  { href: "/docs/token-forge", label: "Token Forge" },
  { href: "/docs/scheduled-payments", label: "Scheduled Payments" },
  { href: "/docs/ai-agent", label: "AI Agent Wallet" },
  { href: "/docs/portfolio", label: "Portfolio" },
  { href: "/docs/pos-terminal", label: "POS Terminal" },
  { href: "/docs/streaming", label: "Streaming Payments" },
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[--bg-base]">
      <header className="border-b border-[--border-glass] bg-[--bg-glass] backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 mr-4">
            <FluxusLogo size="sm" showText />
          </Link>
          <CaretRight size={14} className="text-[--text-muted]" />
          <span className="text-sm text-[--text-secondary] font-medium">
            Docs
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
        <aside className="w-52 flex-shrink-0 hidden md:block">
          <nav className="sticky top-24 flex flex-col gap-1">
            {docLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-[--text-secondary] hover:text-[--text-primary] px-3 py-2 rounded-[--radius-md] hover:bg-[--bg-glass-hover] transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 max-w-2xl">{children}</main>
      </div>
    </div>
  );
}
