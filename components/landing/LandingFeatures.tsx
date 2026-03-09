"use client";

import { motion } from "framer-motion";
import {
  PaperPlaneTilt,
  QrCode,
  ClockCounterClockwise,
  Key,
  ArrowsLeftRight,
  LinkSimple,
  Fire,
  Timer,
  Robot,
  ChartPieSlice,
  Storefront,
  Broadcast,
} from "@phosphor-icons/react";
import { useMotionSafe, useSpotlightBorder } from "@/lib/motion";

const coreFeatures = [
  {
    icon: PaperPlaneTilt,
    title: "Instant Send",
    description:
      "Transfer pathUSD stablecoins to any Tempo address in under a second. Single or batch — up to 10 recipients at once.",
  },
  {
    icon: QrCode,
    title: "Easy Receive",
    description:
      "Share your wallet address or QR code. Funds arrive instantly with 6-decimal precision and zero fees.",
  },
  {
    icon: ClockCounterClockwise,
    title: "Activity Feed",
    description:
      "Track every transfer with a clear activity timeline. View transaction details on the Tempo explorer.",
  },
  {
    icon: Key,
    title: "Session Keys",
    description:
      "Authorize spending policies for seamless transfers within defined limits — no passkey prompt every time.",
  },
];

const advancedFeatures = [
  {
    icon: ArrowsLeftRight,
    title: "Stablecoin Swap",
    description:
      "Swap between pathUSD, AlphaUSD, BetaUSD and ThetaUSD instantly via the enshrined DEX with atomic execution.",
  },
  {
    icon: LinkSimple,
    title: "Payment Requests",
    description:
      "Create shareable payment links with pre-filled amount and memo. Recipients pay with a single tap.",
  },
  {
    icon: Fire,
    title: "Token Forge",
    description:
      "Create your own TIP-20 stablecoin, mint supply, attach compliance policies, and list on the DEX — no code required.",
  },
  {
    icon: Timer,
    title: "Scheduled Payments",
    description:
      "Set up time-locked transfers with validAfter/validBefore windows. Payments execute automatically when the window opens.",
  },
  {
    icon: Robot,
    title: "AI Agent Wallet",
    description:
      "Connect any OpenAI-compatible LLM to execute payments via natural language. Built-in sanitization and spend limits.",
  },
  {
    icon: ChartPieSlice,
    title: "Multi-Token Portfolio",
    description:
      "View balances across all four Tempo stablecoins in a single dashboard powered by Multicall3 batch queries.",
  },
  {
    icon: Storefront,
    title: "QR POS Terminal",
    description:
      "Turn any device into a point-of-sale terminal. Display QR codes, detect incoming payments in real-time.",
  },
  {
    icon: Broadcast,
    title: "Streaming Payments",
    description:
      "Send micro-payments every 5 seconds with real on-chain transactions. Track progress with a live streaming dashboard.",
  },
];

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  const variants = useMotionSafe();
  const { onMouseMove, onMouseLeave, spotlightBackground } =
    useSpotlightBorder();

  return (
    <motion.div
      variants={variants.fadeUp}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative rounded-[--radius-xl] border p-5 flex flex-col gap-3 cursor-default
        bg-[--bg-glass] backdrop-blur-md border-[--border-glass]
        shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
        transition-colors duration-200
        hover:border-[--border-glass-hover] hover:bg-[--bg-glass-hover]"
    >
      {/* Spotlight overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[--radius-xl] opacity-15"
        style={{ background: spotlightBackground }}
      />

      <div className="w-10 h-10 rounded-[--radius-lg] bg-[--brand-subtle] flex items-center justify-center text-[--brand-primary]">
        <Icon size={20} />
      </div>
      <h3 className="font-semibold text-[--text-primary]">{title}</h3>
      <p className="text-sm text-[--text-secondary] leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

export function LandingFeatures() {
  const variants = useMotionSafe();

  return (
    <>
      <motion.section
        id="features"
        variants={variants.staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="py-20 px-4"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={variants.fadeUp} className="text-center mb-12">
            <h2
              className="text-3xl font-bold text-[--text-primary] font-[--font-display] mb-3"
              style={{ textWrap: "balance" }}
            >
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-[--text-secondary] max-w-xl mx-auto">
              A focused wallet built for fast stablecoin payments on Tempo.
            </p>
          </motion.div>

          {/* Asymmetric bento: 2fr 1fr / 1fr 2fr alternating */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="sm:col-span-2">
              <FeatureCard {...coreFeatures[0]} />
            </div>
            <div className="sm:col-span-1">
              <FeatureCard {...coreFeatures[1]} />
            </div>
            <div className="sm:col-span-1">
              <FeatureCard {...coreFeatures[2]} />
            </div>
            <div className="sm:col-span-2">
              <FeatureCard {...coreFeatures[3]} />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        id="advanced-features"
        variants={variants.staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        className="pb-20 px-4"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={variants.fadeUp} className="text-center mb-12">
            <h2
              className="text-3xl font-bold text-[--text-primary] font-[--font-display] mb-3"
              style={{ textWrap: "balance" }}
            >
              Powered by Tempo
            </h2>
            <p className="text-[--text-secondary] max-w-xl mx-auto">
              Eight advanced features showcasing every Tempo blockchain
              primitive — DEX, Factory, TIP-403, scheduled transactions, and
              more.
            </p>
          </motion.div>

          {/* Asymmetric bento for advanced features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="sm:col-span-2">
              <FeatureCard {...advancedFeatures[0]} />
            </div>
            <div className="sm:col-span-1">
              <FeatureCard {...advancedFeatures[1]} />
            </div>
            <div className="sm:col-span-1">
              <FeatureCard {...advancedFeatures[2]} />
            </div>
            <div className="sm:col-span-2">
              <FeatureCard {...advancedFeatures[3]} />
            </div>
            <div className="sm:col-span-2">
              <FeatureCard {...advancedFeatures[4]} />
            </div>
            <div className="sm:col-span-1">
              <FeatureCard {...advancedFeatures[5]} />
            </div>
            <div className="sm:col-span-1">
              <FeatureCard {...advancedFeatures[6]} />
            </div>
            <div className="sm:col-span-2">
              <FeatureCard {...advancedFeatures[7]} />
            </div>
          </div>
        </div>
      </motion.section>
    </>
  );
}
