"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  CurrencyDollar,
  Globe,
  Code,
} from "@phosphor-icons/react";
import { useMotionSafe, useSpotlightBorder } from "@/lib/motion";

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Passkey Security",
    description:
      "WebAuthn passkeys are cryptographically bound to your device. No passwords to steal, no seed phrases to lose.",
  },
  {
    icon: CurrencyDollar,
    title: "Sponsored Gas",
    description:
      "Every transfer is gas-sponsored by the Tempo fee sponsorship system. You never pay transaction fees.",
  },
  {
    icon: Globe,
    title: "Tempo Blockchain",
    description:
      "Built on Tempo — an EVM-compatible chain with native stablecoin support, sub-second finality, and passkey auth.",
  },
  {
    icon: Code,
    title: "Open Source",
    description:
      "Fluxus is fully open source. Inspect the code, verify the logic, and contribute on GitHub.",
  },
];

function SecurityCard({
  icon: Icon,
  title,
  description,
  featured,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  featured?: boolean;
}) {
  const variants = useMotionSafe();
  const { onMouseMove, onMouseLeave, spotlightBackground } =
    useSpotlightBorder();

  return (
    <motion.div
      variants={variants.fadeUp}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`relative flex gap-4 p-5 rounded-[--radius-xl] border border-[--border-glass] bg-[--bg-glass] backdrop-blur-md transition-colors hover:border-[--border-glass-hover] ${featured ? "sm:col-span-2" : ""}`}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[--radius-xl] opacity-15"
        style={{ background: spotlightBackground }}
      />

      <div className="w-10 h-10 rounded-[--radius-lg] bg-[--brand-subtle] flex items-center justify-center text-[--brand-primary] flex-shrink-0">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="font-semibold text-[--text-primary] mb-1">{title}</h3>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

export function LandingSecurity() {
  const variants = useMotionSafe();

  return (
    <motion.section
      id="security"
      variants={variants.staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      className="py-20 px-4 relative"
    >
      {/* Dark gradient background for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(10, 15, 13, 0.6) 30%, rgba(10, 15, 13, 0.6) 70%, transparent 100%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto">
        <motion.div variants={variants.fadeUp} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[--text-primary] font-[--font-display] mb-3">
            Built for trust
          </h2>
          <p className="text-[--text-secondary] max-w-lg mx-auto">
            Security and transparency are non-negotiable. Here&apos;s what
            protects your funds.
          </p>
        </motion.div>

        {/* Asymmetric: first item spans full width, rest in 2-col + 1-col pattern */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <SecurityCard {...trustItems[0]} featured />
          {trustItems.slice(1).map((item) => (
            <SecurityCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
