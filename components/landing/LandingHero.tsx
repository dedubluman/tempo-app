"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight, Zap, Shield, DollarSign, Layers } from "lucide-react";

interface LandingHeroProps {
  onAuthClick?: () => void;
}

const metrics = [
  { icon: Zap, label: "0.5s finality" },
  { icon: DollarSign, label: "$0 gas fees" },
  { icon: Layers, label: "6-decimal precision" },
  { icon: Shield, label: "Passkey secured" },
];

export function LandingHero({ onAuthClick }: LandingHeroProps) {
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
    <section className="pt-32 pb-20 px-4">
      <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
        <Badge variant="brand" size="sm" dot>
          Powered by Tempo Blockchain
        </Badge>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[--text-primary] leading-tight font-[--font-display] tracking-tight">
          Instant Stablecoin Payments.{" "}
          <span style={{ background: "var(--gradient-flux)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Zero Gas. Zero Passwords.
          </span>
        </h1>

        <p className="text-lg text-[--text-secondary] max-w-xl leading-relaxed">
          Send pathUSD stablecoins instantly with your device passkey. No wallet app. No seed phrases. No gas fees.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {connected ? (
            <Link href="/app">
              <Button size="lg" className="w-full sm:w-auto" data-testid="hero-dashboard-cta">
                Go to Dashboard <ArrowRight size={18} />
              </Button>
            </Link>
          ) : (
            <Button size="lg" onClick={onAuthClick} className="w-full sm:w-auto" data-testid="hero-create-cta">
              Create Your Wallet <ArrowRight size={18} />
            </Button>
          )}
          <Link href="/docs">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              Read the Docs
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {metrics.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-sm text-[--text-secondary]">
              <Icon size={14} className="text-[--brand-primary]" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
