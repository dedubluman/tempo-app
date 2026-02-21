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
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 py-12 px-4",
        className
      )}
    >
      <div className="w-12 h-12 rounded-[--radius-xl] bg-[--bg-subtle] flex items-center justify-center text-[--text-tertiary]">
        <Icon size={20} weight="regular" />
      </div>
      <p className="text-[--text-primary] font-semibold text-base">{title}</p>
      {description && (
        <p className="text-[--text-secondary] text-sm max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 bg-[--brand-primary] text-white px-4 py-2 rounded-[--radius-md] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export { EmptyState };
