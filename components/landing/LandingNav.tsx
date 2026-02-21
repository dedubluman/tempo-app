"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Zap } from "lucide-react";

interface LandingNavProps {
  onAuthClick?: () => void;
}

export function LandingNav({ onAuthClick }: LandingNavProps) {
  const { isConnected } = useAccount();
  const [mockConnected, setMockConnected] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_MOCK_AUTH !== "1") return;
    setMockConnected(
      window.localStorage.getItem("tempo.walletCreated") === "1" &&
        Boolean(window.localStorage.getItem("tempo.lastAddress"))
    );
  }, []);

  const connected = isConnected || mockConnected;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
      className="fixed top-0 inset-x-0 z-30 border-b border-white/10 backdrop-blur-md bg-[--bg-base]/80"
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[--radius-md] flex items-center justify-center" style={{ background: "var(--gradient-flux)" }}>
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-[--text-primary] text-lg font-[--font-display]">Fluxus</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-[--text-secondary]">
          <a href="#features" className="hover:text-[--text-primary] transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-[--text-primary] transition-colors">How It Works</a>
          <a href="#security" className="hover:text-[--text-primary] transition-colors">Security</a>
          <Link href="/docs" className="hover:text-[--text-primary] transition-colors">Docs</Link>
        </div>

        {connected ? (
          <Link href="/app">
            <Button size="sm" data-testid="nav-dashboard-cta">Go to Dashboard</Button>
          </Link>
        ) : (
          <Button size="sm" onClick={onAuthClick} data-testid="nav-launch-cta">Launch App</Button>
        )}
      </div>
    </motion.nav>
  );
}
