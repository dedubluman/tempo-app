"use client";

import { Moon, Sun, Desktop } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useTheme, type Theme } from "./ThemeProvider";

const CYCLE: Theme[] = ["light", "dark", "system"];
const LABELS: Record<Theme, string> = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System mode",
};
const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Desktop,
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  function handleClick() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setTheme(next);
  }

  const Icon = ICONS[theme];
  const label = LABELS[theme];

  return (
    <button
      onClick={handleClick}
      aria-label={`Switch theme (current: ${label})`}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-[--radius-md]",
        "border border-[--border-glass] bg-[--bg-glass] backdrop-blur-sm",
        "text-[--text-secondary] transition-all duration-[--duration-fast]",
        "hover:border-[--border-glass-hover] hover:text-[--brand-primary]",
        "hover:shadow-[0_0_12px_rgba(52,211,153,0.12)] active:scale-95",
        className,
      )}
      data-testid="theme-toggle"
    >
      <motion.span
        key={theme}
        initial={{ rotate: -20, opacity: 0, scale: 0.8 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex items-center justify-center"
      >
        <Icon size={18} aria-hidden="true" />
      </motion.span>
    </button>
  );
}
