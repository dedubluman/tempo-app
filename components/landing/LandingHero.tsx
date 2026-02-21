"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight, Lightning, Shield, CurrencyDollar, Stack } from "@phosphor-icons/react";
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
            <h1 className="text-4xl md:text-6xl tracking-tighter leading-none font-bold text-[--text-primary]">
              Instant Stablecoin{" "}
              <br className="hidden md:block" />
              Payments.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #fbbf24, #fcd34d)",
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
            className="text-base text-[--text-secondary] leading-relaxed max-w-[65ch]"
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
                className="w-full sm:w-auto border border-[--border-default] hover:border-[--border-glass-hover]"
              >
                Read the Docs
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="flex flex-wrap items-start gap-4 pt-4"
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

        {/* Right column — ambient visual (2/5) */}
        <motion.div
          className="hidden md:flex md:col-span-2 items-center justify-center relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.4 }}
        >
          <div className="relative w-full aspect-square max-w-md">

            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-20"
              style={{
                background:
                  "radial-gradient(circle, #fbbf24 0%, transparent 70%)",
              }}
            />

            <div
              className="absolute inset-[15%] rounded-full blur-2xl opacity-30"
              style={{
                background:
                  "radial-gradient(circle, #fcd34d 0%, transparent 60%)",
              }}
            />

            <div
              className="absolute inset-[35%] rounded-full blur-xl opacity-40"
              style={{
                background:
                  "radial-gradient(circle, #fbbf24 0%, #fcd34d 50%, transparent 80%)",
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
