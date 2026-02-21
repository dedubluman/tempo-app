"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Zap } from "lucide-react"
import { useMotionSafe } from "@/lib/motion"

export function LandingFooter() {
  const variants = useMotionSafe()

  return (
    <motion.footer
      variants={variants.fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      className="border-t border-[--border-subtle] py-10 px-4"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[--radius-sm] flex items-center justify-center" style={{ background: "var(--gradient-flux)" }}>
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-[--text-primary] font-[--font-display]">Fluxus</span>
          <span className="text-xs text-[--text-muted] ml-2">Tempo Testnet</span>
        </div>

        <nav className="flex flex-wrap gap-5 text-sm text-[--text-secondary]">
          <Link href="/docs" className="hover:text-[--text-primary] transition-colors">Docs</Link>
          <a href="https://github.com/dedubluman/tempo-app" target="_blank" rel="noopener noreferrer" className="hover:text-[--text-primary] transition-colors">GitHub</a>
          <a href="https://tempo.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-[--text-primary] transition-colors">Tempo Network</a>
          <a href="https://explore.tempo.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-[--text-primary] transition-colors">Explorer</a>
        </nav>

        <p className="text-xs text-[--text-muted]">
          Open source · Testnet only · Not financial advice
        </p>
      </div>
    </motion.footer>
  )
}
