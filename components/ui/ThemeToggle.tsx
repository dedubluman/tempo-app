"use client";

import { Moon, Sun, Monitor } from "lucide-react";
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
  system: Monitor,
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
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-[--text-secondary] transition-colors hover:bg-[--bg-subtle] hover:text-[--text-primary] ${className ?? ""}`}
      data-testid="theme-toggle"
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
