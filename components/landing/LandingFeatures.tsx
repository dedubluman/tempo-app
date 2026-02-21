"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { Send, QrCode, History, Key } from "lucide-react"
import { calculateTilt, useMotionSafe } from "@/lib/motion"

const features = [
  { icon: Send, title: "Instant Send", description: "Transfer pathUSD stablecoins to any Tempo address in under a second. Single or batch — up to 10 recipients at once." },
  { icon: QrCode, title: "Easy Receive", description: "Share your wallet address or QR code. Funds arrive instantly with 6-decimal precision and zero fees." },
  { icon: History, title: "Activity Feed", description: "Track every transfer with a clear activity timeline. View transaction details on the Tempo explorer." },
  { icon: Key, title: "Session Keys", description: "Authorize spending policies for seamless transfers within defined limits — no passkey prompt every time." },
]

interface FeatureCardProps {
  icon: React.ElementType
  title: string
  description: string
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  const variants = useMotionSafe()
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isTouch || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const { rotateX: rx, rotateY: ry } = calculateTilt(e.clientX, e.clientY, rect, 8)
    setRotateX(rx)
    setRotateY(ry)
  }

  function handleMouseLeave() {
    setRotateX(0)
    setRotateY(0)
    setIsHovered(false)
  }

  return (
    <motion.div
      ref={cardRef}
      variants={variants.fadeUp}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => setIsTouch(true)}
      animate={{ rotateX, rotateY }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        transformStyle: "preserve-3d",
        willChange: isHovered ? "transform" : "auto",
        WebkitBackfaceVisibility: "hidden",
      }}
      className={`rounded-[--radius-xl] border p-5 flex flex-col gap-3 cursor-default
        bg-[--bg-glass] backdrop-blur-md border-[--border-glass]
        shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
        transition-colors duration-200
        hover:border-[--border-glass-hover] hover:bg-[--bg-glass-hover]
        ${isHovered ? "animate-glow-pulse" : ""}
      `}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.2 }}
        className="w-10 h-10 rounded-[--radius-lg] bg-[--brand-subtle] flex items-center justify-center text-[--brand-primary]"
      >
        <Icon size={20} />
      </motion.div>
      <h3 className="font-semibold text-[--text-primary]">{title}</h3>
      <p className="text-sm text-[--text-secondary] leading-relaxed">{description}</p>
    </motion.div>
  )
}

export function LandingFeatures() {
  const variants = useMotionSafe()

  return (
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
          <h2 className="text-3xl font-bold text-[--text-primary] font-[--font-display] mb-3">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-[--text-secondary] max-w-xl mx-auto">
            A focused wallet built for fast stablecoin payments on Tempo.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </motion.section>
  )
}
