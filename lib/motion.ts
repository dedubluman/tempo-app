"use client"

import { useReducedMotion } from "framer-motion"

// fadeUp: scroll entrance temel variant
export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] } }
}

// staggerContainer: list parent variant — max staggerChildren 0.08s
export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } }
}

// scaleIn: badge and icon entrance
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } }
}

// glowTransition: hover glow motion config
export const glowTransition = { duration: 0.25, ease: [0, 0, 0.2, 1] }

// calculateTilt: mouse position → tilt degrees (max ±8°)
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

// useMotionSafe: returns empty variants when prefers-reduced-motion is active
export function useMotionSafe() {
  const prefersReducedMotion = useReducedMotion()
  if (prefersReducedMotion) {
    return {
      fadeUp: { hidden: {}, visible: {} },
      staggerContainer: { hidden: {}, visible: {} },
      scaleIn: { hidden: {}, visible: {} },
    }
  }
  return { fadeUp, staggerContainer, scaleIn }
}
