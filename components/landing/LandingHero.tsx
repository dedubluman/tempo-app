"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowRight,
  Lightning,
  Shield,
  CurrencyDollar,
  Stack,
  CheckCircle,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";

interface LandingHeroProps {
  onAuthClick?: () => void;
}

const metrics = [
  { icon: Lightning, label: "0.5s finality" },
  { icon: CurrencyDollar, label: "$0 gas fees" },
  { icon: Stack, label: "6-decimal precision" },
  { icon: Shield, label: "Passkey secured" },
];

export function LandingHero({ onAuthClick }: LandingHeroProps) {
  const { isConnected } = useAccount();
  const [mockConnected] = useState(() => {
    if (process.env.NEXT_PUBLIC_E2E_MOCK_AUTH !== "1") return false;
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem("tempo.walletCreated") === "1" &&
      Boolean(window.localStorage.getItem("tempo.lastAddress"))
    );
  });
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const variants = useMotionSafe();

  const connected = isConnected || mockConnected;

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden min-h-[100dvh] px-4 py-8 md:py-0"
    >
      <motion.div
        style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
        className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8 items-center min-h-[100dvh]"
      >
        {/* Left column — text (3/5) */}
        <motion.div
          className="md:col-span-3 flex flex-col gap-6 w-full"
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
            <h1 className="text-5xl md:text-7xl tracking-tighter leading-[0.9] font-bold text-[--text-primary]">
              Instant <br className="hidden md:block" />
              Stablecoin <br className="hidden md:block" />
              <span className="text-[--brand-primary]">Payments.</span>
            </h1>
            <h2 className="mt-3 text-2xl md:text-3xl tracking-tight font-semibold text-[--text-secondary]">
              Zero Gas. Zero Passwords.
            </h2>
          </motion.div>

          <motion.p
            className="text-base text-[--text-secondary] leading-relaxed max-w-[52ch]"
            variants={variants.fadeUp}
          >
            Send pathUSD stablecoins instantly with your device passkey. No
            wallet app. No seed phrases. No gas fees.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2"
            variants={variants.fadeUp}
          >
            {connected ? (
              <Link href="/app">
                <Button
                  size="lg"
                  className="w-full sm:w-auto active:scale-[0.98] transition-transform"
                  data-testid="hero-dashboard-cta"
                >
                  Go to Dashboard <ArrowRight size={18} weight="bold" />
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                onClick={onAuthClick}
                className="w-full sm:w-auto active:scale-[0.98] transition-transform"
                data-testid="hero-create-cta"
              >
                Create Your Wallet <ArrowRight size={18} weight="bold" />
              </Button>
            )}
            <Link href="/docs">
              <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto border border-[--border-glass] hover:border-[--border-glass-hover] hover:bg-[--bg-glass]"
              >
                Read the Docs
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="flex flex-wrap items-start gap-3 pt-2"
            variants={variants.staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {metrics.map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[--border-glass] bg-[--bg-glass] backdrop-blur-md text-xs text-[--text-secondary]"
                variants={variants.fadeUp}
              >
                <Icon size={12} className="text-[--brand-primary]" />
                <span>{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right column — floating glassmorphism cards (2/5) */}
        <motion.div
          className="hidden md:flex md:col-span-2 items-center justify-center relative"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0, 0, 0.2, 1] }}
        >
          {/* Ambient glow */}
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-25"
            style={{
              background:
                "radial-gradient(circle, var(--brand-primary) 0%, transparent 65%)",
            }}
          />

          <div className="relative w-full max-w-[300px] space-y-3">
            {/* Card 1 — Transfer confirmed */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="p-4 rounded-2xl border border-[--border-glass] bg-[--bg-glass] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[--text-muted]">
                  Transfer sent
                </span>
                <CheckCircle
                  size={14}
                  className="text-[--status-success-text]"
                  weight="fill"
                />
              </div>
              <p className="font-mono text-2xl font-bold text-[--text-primary]">
                25.00
              </p>
              <p className="text-xs text-[--text-muted] mt-0.5">pathUSD</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-[--status-success-text]">
                  Confirmed in 0.4s
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--status-success-bg] text-[--status-success-text] border border-[--status-success-border]">
                  Success
                </span>
              </div>
            </motion.div>

            {/* Card 2 — Gas fee */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{
                duration: 3.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.8,
              }}
              className="ml-8 p-4 rounded-2xl border border-[--border-glass] bg-[--bg-glass] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[--text-muted]">
                  Gas fee
                </span>
                <ArrowUpRight size={12} className="text-[--brand-primary]" />
              </div>
              <p className="font-mono text-2xl font-bold text-[--brand-primary]">
                $0.00
              </p>
              <p className="text-xs text-[--text-muted] mt-0.5">
                Sponsored by Tempo
              </p>
            </motion.div>

            {/* Card 3 — Passkey */}
            <motion.div
              animate={{ y: [0, -9, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.6,
              }}
              className="mr-4 p-4 rounded-2xl border border-[--border-glass] bg-[--bg-glass] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[--text-muted]">
                  Auth
                </span>
                <Shield size={12} className="text-[--brand-primary]" />
              </div>
              <p className="text-sm font-semibold text-[--text-primary]">
                Passkey verified
              </p>
              <p className="text-xs text-[--text-muted] mt-0.5">
                No password needed
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
