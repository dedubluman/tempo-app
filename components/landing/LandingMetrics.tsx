"use client"

import { motion } from "framer-motion"
import { useCountUp } from "@/hooks/useCountUp"
import { useMotionSafe } from "@/lib/motion"

const metrics = [
  { value: "< 0.5s", label: "Transaction Finality", sublabel: "Faster than a credit card swipe" },
  { value: "$0", label: "Gas Fees", sublabel: "Sponsored for all transfers" },
  { value: "6", label: "Decimal Precision", sublabel: "pathUSD stablecoin accuracy" },
  { value: "100%", label: "Passkey Auth", sublabel: "No passwords, no seed phrases" },
]

interface MetricItemProps {
  value: string
  label: string
  sublabel: string
}

function MetricItem({ value, label, sublabel }: MetricItemProps) {
  const { ref, displayValue } = useCountUp({ raw: value })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="flex flex-col gap-1 text-center md:text-left"
    >
      <span
        ref={ref as React.RefObject<HTMLSpanElement>}
        className="text-3xl font-bold text-[--brand-primary] font-[--font-display]"
      >
        {displayValue}
      </span>
      <span className="text-sm font-semibold text-[--text-primary]">{label}</span>
      <span className="text-xs text-[--text-muted]">{sublabel}</span>
    </motion.div>
  )
}

export function LandingMetrics() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ staggerChildren: 0.07, delayChildren: 0.1 }}
      viewport={{ once: true, amount: 0.2 }}
      className="py-16 px-4 border-y border-[--border-subtle]"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <MetricItem key={metric.label} {...metric} />
        ))}
      </div>
    </motion.section>
  )
}
