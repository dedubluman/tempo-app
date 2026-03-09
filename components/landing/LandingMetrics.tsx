"use client";

import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import { useMotionSafe } from "@/lib/motion";

const metrics = [
  {
    value: "< 0.5s",
    label: "Transaction Finality",
    sublabel: "Faster than a credit card swipe",
  },
  { value: "$0", label: "Gas Fees", sublabel: "Sponsored for all transfers" },
  {
    value: "6",
    label: "Decimal Precision",
    sublabel: "pathUSD stablecoin accuracy",
  },
  {
    value: "100%",
    label: "Passkey Auth",
    sublabel: "No passwords, no seed phrases",
  },
];

interface MetricItemProps {
  value: string;
  label: string;
  sublabel: string;
  featured?: boolean;
}

function MetricItem({ value, label, sublabel, featured }: MetricItemProps) {
  const { ref, displayValue } = useCountUp({ raw: value });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className={`flex flex-col gap-1 p-5 rounded-[--radius-xl] border border-[--border-glass] bg-[--bg-glass] backdrop-blur-md ${featured ? "md:col-span-2" : ""}`}
    >
      <span
        ref={ref as React.RefObject<HTMLSpanElement>}
        className="text-3xl md:text-5xl font-bold text-[--brand-primary] font-mono"
      >
        {displayValue}
      </span>
      <span className="text-sm font-semibold text-[--text-primary]" style={{ textWrap: "balance" }}>
        {label}
      </span>
      <span className="text-xs text-[--text-muted]" style={{ textWrap: "balance" }}>
        {sublabel}
      </span>
    </motion.div>
  );
}

export function LandingMetrics() {
  const variants = useMotionSafe();

  return (
    <motion.section
      variants={variants.staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className="relative py-16 px-4"
    >
      {/* Subtle emerald radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(52, 211, 153, 0.06) 0%, transparent 70%)",
        }}
      />

      {/* Asymmetric grid: first item spans 2 cols on desktop, rest 1 each */}
      <div className="relative max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((metric, i) => (
          <MetricItem key={metric.label} {...metric} featured={i === 0} />
        ))}
      </div>
    </motion.section>
  );
}
