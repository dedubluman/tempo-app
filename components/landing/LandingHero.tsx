"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight, Zap, Shield, DollarSign, Layers } from "lucide-react";
import { useMotionSafe } from "@/lib/motion";

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
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const variants = useMotionSafe();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_MOCK_AUTH !== "1") return;
    setMockConnected(
      window.localStorage.getItem("tempo.walletCreated") === "1" &&
        Boolean(window.localStorage.getItem("tempo.lastAddress"))
    );
  }, []);

  const connected = isConnected || mockConnected;

  return (
    <section ref={sectionRef} className="relative overflow-hidden min-h-screen pt-32 pb-20 px-4">
      <motion.div style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}>
        <motion.div
          className="max-w-3xl mx-auto text-center flex flex-col items-center gap-8"
          variants={variants.staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={variants.scaleIn}>
            <Badge variant="brand" size="sm" dot>
              Powered by Tempo Blockchain
            </Badge>
          </motion.div>

          <motion.div variants={variants.fadeUp}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[--text-primary] leading-tight font-[--font-display] tracking-tight">
              Instant Stablecoin Payments.{" "}
              <span
                className="animate-gradient-text bg-gradient-to-r from-[--brand-primary] via-cyan-300 to-[--brand-primary]"
                style={{
                  background: "var(--gradient-flux)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Zero Gas. Zero Passwords.
              </span>
            </h1>
          </motion.div>

          <motion.p
            className="text-lg text-[--text-secondary] max-w-xl leading-relaxed"
            variants={variants.fadeUp}
          >
            Send pathUSD stablecoins instantly with your device passkey. No wallet app. No seed phrases. No gas fees.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
            variants={variants.fadeUp}
          >
            {connected ? (
              <Link href="/app">
                <Button
                  size="lg"
                  className="w-full sm:w-auto animate-glow-pulse"
                  data-testid="hero-dashboard-cta"
                >
                  Go to Dashboard <ArrowRight size={18} />
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                onClick={onAuthClick}
                className="w-full sm:w-auto animate-glow-pulse"
                data-testid="hero-create-cta"
              >
                Create Your Wallet <ArrowRight size={18} />
              </Button>
            )}
            <Link href="/docs">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto bg-[--bg-glass] backdrop-blur-sm border-[--border-glass] hover:border-[--border-glass-hover]"
              >
                Read the Docs
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
            variants={variants.staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {metrics.map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                className="flex items-center gap-1.5 text-sm text-[--text-secondary]"
                variants={variants.fadeUp}
              >
                <Icon size={14} className="text-[--brand-primary]" />
                <span>{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
