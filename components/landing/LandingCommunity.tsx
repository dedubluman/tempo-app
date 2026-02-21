"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Github, BookOpen, Globe } from "lucide-react"
import { useMotionSafe } from "@/lib/motion"

const links = [
  { icon: Github, label: "GitHub", href: "https://github.com/dedubluman/tempo-app", external: true },
  { icon: BookOpen, label: "Docs", href: "/docs", external: false },
  { icon: Globe, label: "Tempo Network", href: "https://tempo.xyz", external: true },
]

export function LandingCommunity() {
  const variants = useMotionSafe()

  return (
    <motion.section
      variants={variants.staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      className="py-20 px-4 bg-[--bg-subtle]"
    >
      <div className="max-w-3xl mx-auto text-center flex flex-col gap-8">
        <motion.h2 variants={variants.fadeUp} className="text-3xl font-bold text-[--text-primary] font-[--font-display]">
          Part of the Tempo ecosystem
        </motion.h2>
        <motion.p variants={variants.fadeUp} className="text-[--text-secondary]">
          Fluxus is an open-source application built on the Tempo testnet. Explore the code, read the docs, or connect with the Tempo community.
        </motion.p>
        <motion.div variants={variants.staggerContainer} className="flex flex-wrap items-center justify-center gap-4">
          {links.map(({ icon: Icon, label, href, external }) =>
            external ? (
              <motion.a
                key={label}
                variants={variants.fadeUp}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-[--radius-lg] border border-[--border-glass] bg-[--bg-glass] backdrop-blur-md text-sm text-[--text-primary] font-medium hover:border-[--border-glass-hover] hover:bg-[--bg-glass-hover] transition-colors"
              >
                <Icon size={16} />
                {label}
              </motion.a>
            ) : (
              <motion.div key={label} variants={variants.fadeUp}>
                <Link
                  href={href}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[--radius-lg] border border-[--border-glass] bg-[--bg-glass] backdrop-blur-md text-sm text-[--text-primary] font-medium hover:border-[--border-glass-hover] hover:bg-[--bg-glass-hover] transition-colors"
                >
                  <Icon size={16} />
                  {label}
                </Link>
              </motion.div>
            )
          )}
        </motion.div>
      </div>
    </motion.section>
  )
}
