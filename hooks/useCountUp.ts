"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "framer-motion"

interface ParsedValue {
  prefix: string
  value: number
  suffix: string
}

function parseRaw(raw: string): ParsedValue {
  // Match: optional prefix (non-digit, non-dot chars), number (with dot), optional suffix
  const match = raw.match(/^([^0-9.]*)([0-9]+(?:\.[0-9]+)?)(.*)$/)
  if (!match) return { prefix: "", value: 0, suffix: raw }
  return {
    prefix: match[1] ?? "",
    value: parseFloat(match[2] ?? "0"),
    suffix: match[3] ?? "",
  }
}

export interface UseCountUpOptions {
  raw: string
  duration?: number
}

export function useCountUp({ raw, duration = 1.5 }: UseCountUpOptions) {
  const ref = useRef<HTMLElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const [displayValue, setDisplayValue] = useState(raw)

  useEffect(() => {
    if (!isInView) return

    const { prefix, value, suffix } = parseRaw(raw)

    // Instant display for reduced motion or zero values
    if (prefersReducedMotion || value === 0) {
      setDisplayValue(raw)
      return
    }

    const startTime = performance.now()
    const startValue = 0
    let rafId: number

    function animate(currentTime: number) {
      const elapsed = (currentTime - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue + (value - startValue) * eased

      // Format: match decimals from original value
      const decimals = raw.includes(".") ? (raw.split(".")[1]?.replace(/[^0-9]/g, "").length ?? 1) : 0
      setDisplayValue(`${prefix}${current.toFixed(decimals)}${suffix}`)

      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      } else {
        setDisplayValue(raw) // snap to exact original
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [isInView, raw, duration, prefersReducedMotion])

  return { ref, displayValue }
}
