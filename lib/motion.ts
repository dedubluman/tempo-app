"use client"

import {
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
  animate,
  type Variants,
} from "framer-motion"
import { useRef, useEffect } from "react"
import type { MouseEvent } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariantGroup {
  fadeUp: Variants
  fadeIn: Variants
  scaleIn: Variants
  slideInLeft: Variants
  slideInRight: Variants
  staggerContainer: Variants
  staggerItem: Variants
}

// ─── Spring Configs ───────────────────────────────────────────────────────────

/** Fast, responsive spring — good for interactions */
export const snappy = { stiffness: 300, damping: 30 } as const

/** Smooth, relaxed spring — good for page transitions */
export const gentle = { stiffness: 100, damping: 20 } as const

/** Energetic spring with visible overshoot */
export const bouncy = { stiffness: 200, damping: 15 } as const

// ─── Layout Helpers ───────────────────────────────────────────────────────────

export const sharedLayoutTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
}

/**
 * Returns props for shared element (layout) transitions.
 * Usage: <motion.div {...makeLayoutProps("hero-image")} />
 */
export function makeLayoutProps(id: string) {
  return {
    layoutId: id,
    layout: true as const,
    transition: sharedLayoutTransition,
  }
}

// ─── Landing Variants — rich, cinematic spring/stagger ────────────────────────

export const landingVariants: VariantGroup = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.82 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
    },
  },
  slideInLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  },
  slideInRight: {
    hidden: { opacity: 0, x: 60 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  },
  staggerContainer: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  },
  staggerItem: {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  },
}

// ─── Dashboard Variants — moderate, fluid ─────────────────────────────────────

export const dashboardVariants: VariantGroup = {
  fadeUp: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
    },
  },
  slideInLeft: {
    hidden: { opacity: 0, x: -24 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
  slideInRight: {
    hidden: { opacity: 0, x: 24 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
  staggerContainer: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  },
  staggerItem: {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
}

// ─── Docs Variants — minimal, low-motion ──────────────────────────────────────

export const docsVariants: VariantGroup = {
  fadeUp: {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.97 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
  slideInLeft: {
    hidden: { opacity: 0, x: -12 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
  slideInRight: {
    hidden: { opacity: 0, x: 12 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
  staggerContainer: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04, delayChildren: 0 } },
  },
  staggerItem: {
    hidden: { opacity: 0, y: 4 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
    },
  },
}

// ─── No-op variants for prefers-reduced-motion ────────────────────────────────

const noopVariants: VariantGroup = {
  fadeUp: { hidden: {}, visible: {} },
  fadeIn: { hidden: {}, visible: {} },
  scaleIn: { hidden: {}, visible: {} },
  slideInLeft: { hidden: {}, visible: {} },
  slideInRight: { hidden: {}, visible: {} },
  staggerContainer: { hidden: {}, visible: {} },
  staggerItem: { hidden: {}, visible: {} },
}

// ─── calculateTilt ────────────────────────────────────────────────────────────
// Preserved — consumed by LandingFeatures.tsx

export function calculateTilt(
  mouseX: number,
  mouseY: number,
  rect: DOMRect,
  maxDeg = 8
): { rotateX: number; rotateY: number } {
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const relX = (mouseX - centerX) / (rect.width / 2)
  const relY = (mouseY - centerY) / (rect.height / 2)
  return {
    rotateX: -relY * maxDeg,
    rotateY: relX * maxDeg,
  }
}

// ─── useMotionSafe ────────────────────────────────────────────────────────────
// Returns landing-context variants, or no-ops when prefers-reduced-motion.
// Backward-compat: .fadeUp / .staggerContainer / .scaleIn always present.

export function useMotionSafe(): VariantGroup {
  const prefersReducedMotion = useReducedMotion()
  return prefersReducedMotion ? noopVariants : landingVariants
}

// ─── useScrollReveal ──────────────────────────────────────────────────────────
// Drives opacity + y via useScroll + useTransform against a target element.
// Usage: const { ref, opacity, y } = useScrollReveal()
//        <motion.div ref={ref} style={{ opacity, y }} />

export function useScrollReveal(threshold = 0.3) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const opacity = useTransform(scrollYProgress, [0, threshold], [0, 1])
  const y = useTransform(scrollYProgress, [0, threshold], [24, 0])
  return { ref, opacity, y, scrollYProgress }
}

// ─── useCountUpAnimation ──────────────────────────────────────────────────────
// Counts from 0 → target when element enters view.
// Usage: const { ref, value } = useCountUpAnimation(1234)
//        <motion.span ref={ref}>{useTransform(value, Math.round)}</motion.span>

export function useCountUpAnimation(target: number, duration = 1.5) {
  const value = useMotionValue(0)
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    const controls = animate(value, target, {
      duration,
      ease: [0, 0, 0.2, 1] as [number, number, number, number],
    })
    return () => controls.stop()
  }, [isInView, target, duration, value])

  return { ref, value }
}

// ─── useMagneticHover ─────────────────────────────────────────────────────────
// Tracks cursor offset from element center → spring-animated translate.
// Uses useMotionValue + useTransform (no useState).
// Usage: const { x, y, handlers } = useMagneticHover()
//        <motion.button style={{ x, y }} {...handlers} />

export function useMagneticHover(strength = 0.35) {
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  // useTransform maps raw pixel delta → scaled delta
  const scaledX = useTransform(rawX, (v) => v * strength)
  const scaledY = useTransform(rawY, (v) => v * strength)

  // Spring smoothing on top of transformed values
  const x = useSpring(scaledX, gentle)
  const y = useSpring(scaledY, gentle)

  const handlers = {
    onMouseMove(e: MouseEvent<HTMLElement>) {
      const rect = e.currentTarget.getBoundingClientRect()
      rawX.set(e.clientX - rect.left - rect.width / 2)
      rawY.set(e.clientY - rect.top - rect.height / 2)
    },
    onMouseLeave() {
      rawX.set(0)
      rawY.set(0)
    },
  }

  return { x, y, handlers }
}
