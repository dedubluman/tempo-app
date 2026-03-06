"use client";

import * as React from "react";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon: Icon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-4 py-12 px-4",
        className,
      )}
    >
      <div className="w-12 h-12 rounded-[--radius-2xl] bg-[--bg-surface] border border-[--border-glass] flex items-center justify-center text-[--brand-primary]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <IconComponent size={20} weight="duotone" />
      </div>
      <p className="text-[--text-primary] font-semibold text-base">{title}</p>
      {description && (
        <p className="text-[--text-secondary] text-sm max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 text-[--brand-contrast] px-4 py-2 rounded-[--radius-md] text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "var(--gradient-btn-primary)" }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export { EmptyState };
