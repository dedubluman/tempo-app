"use client";

import { motion } from "framer-motion";
import { Key, Wallet, Lightning } from "@phosphor-icons/react";
import { useMotionSafe } from "@/lib/motion";

const steps = [
  {
    icon: Key,
    step: "01",
    title: "Create Your Wallet",
    description:
      "Register a passkey on your device. No app download, no seed phrase, no password. Your device is your key.",
  },
  {
    icon: Wallet,
    step: "02",
    title: "Receive Stablecoins",
    description:
      "Share your wallet address to receive pathUSD or other Tempo stablecoins. Funded from any compatible source.",
  },
  {
    icon: Lightning,
    step: "03",
    title: "Send Instantly",
    description:
      "Enter a recipient and amount. Confirm with your passkey. Done — finalized on-chain in under half a second.",
  },
];

export function LandingHowItWorks() {
  const variants = useMotionSafe();

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
          <p className="text-[--text-secondary]">
            No apps, no exchanges, no friction.
          </p>
        </motion.div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden md:grid md:grid-cols-3 gap-0 relative">
          {/* Animated connecting line */}
          <motion.div
            className="absolute top-[2.25rem] left-[16.67%] right-[16.67%] h-px bg-[--border-glass]"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ originX: 0 }}
          >
            <div
              className="absolute inset-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, var(--brand-primary), var(--brand-hover), var(--brand-primary))",
                opacity: 0.5,
              }}
            />
          </motion.div>

          {steps.map(({ icon: Icon, step, title, description }, i) => (
            <motion.div
              key={step}
              variants={variants.fadeUp}
              className="flex flex-col items-center text-center gap-4 px-6"
            >
              {/* Step circle */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 0.2 + i * 0.15,
                }}
                className="relative z-10 w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center border-2 border-[--brand-primary] bg-[--bg-base]"
              >
                <Icon
                  size={24}
                  className="text-[--brand-primary]"
                  weight="duotone"
                />
              </motion.div>

              <span className="text-xs font-mono text-[--text-muted] uppercase tracking-widest">
                Step {step}
              </span>
              <h3 className="font-semibold text-[--text-primary] text-lg">
                {title}
              </h3>
              <p className="text-sm text-[--text-secondary] leading-relaxed">
                {description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden flex flex-col gap-0 relative">
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0 left-6 w-px bg-[--border-glass]" />

          {steps.map(({ icon: Icon, step, title, description }) => (
            <motion.div
              key={step}
              variants={variants.fadeUp}
              className="flex gap-5 pl-0 py-4"
            >
              {/* Step circle */}
              <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 border-[--brand-primary] bg-[--bg-base]">
                <Icon
                  size={20}
                  className="text-[--brand-primary]"
                  weight="duotone"
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <span className="text-xs font-mono text-[--text-muted] uppercase tracking-widest">
                  Step {step}
                </span>
                <h3 className="font-semibold text-[--text-primary]">
                  {title}
                </h3>
                <p className="text-sm text-[--text-secondary] leading-relaxed">
                  {description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
