"use client"

import { motion } from "framer-motion"
import { KeyRound, Wallet, Zap } from "lucide-react"
import { useMotionSafe } from "@/lib/motion"

const steps = [
  {
    icon: KeyRound,
    step: "01",
    title: "Create Your Wallet",
    description: "Register a passkey on your device. No app download, no seed phrase, no password. Your device is your key.",
  },
  {
    icon: Wallet,
    step: "02",
    title: "Receive Stablecoins",
    description: "Share your wallet address to receive pathUSD or other Tempo stablecoins. Funded from any compatible source.",
  },
  {
    icon: Zap,
    step: "03",
    title: "Send Instantly",
    description: "Enter a recipient and amount. Confirm with your passkey. Done — finalized on-chain in under half a second.",
  },
]

export function LandingHowItWorks() {
  const variants = useMotionSafe()

  return (
    <motion.section
      id="how-it-works"
      variants={variants.staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      className="py-20 px-4 bg-[--bg-subtle]"
    >
      <div className="max-w-5xl mx-auto">
        <motion.div variants={variants.fadeUp} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[--text-primary] font-[--font-display] mb-3">
            Up and running in 60 seconds
          </h2>
          <p className="text-[--text-secondary]">No apps, no exchanges, no friction.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map(({ icon: Icon, step, title, description }) => (
            <motion.div key={step} variants={variants.fadeUp} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[--radius-xl] flex items-center justify-center flex-shrink-0" style={{ background: "var(--gradient-flux)" }}>
                  <Icon size={22} className="text-white" />
                </div>
                <span className="text-2xl font-bold text-[--text-muted] font-[--font-display]">{step}</span>
              </div>
              <h3 className="font-semibold text-[--text-primary] text-lg">{title}</h3>
              <p className="text-sm text-[--text-secondary] leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
