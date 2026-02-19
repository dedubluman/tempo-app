"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium border",
  {
    variants: {
      variant: {
        success:
          "bg-[--status-success-bg] border-[--status-success-border] text-[--status-success-text]",
        error:
          "bg-[--status-error-bg] border-[--status-error-border] text-[--status-error-text]",
        warning:
          "bg-[--status-warning-bg] border-[--status-warning-border] text-[--status-warning-text]",
        info:
          "bg-[--status-info-bg] border-[--status-info-border] text-[--status-info-text]",
        neutral:
          "bg-[--bg-subtle] border-[--border-default] text-[--text-secondary]",
        brand:
          "bg-[--brand-subtle] border-[--brand-primary] text-[--brand-primary]",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-1",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

function Badge({
  className,
  variant,
  size,
  dot,
  pulse,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full bg-current flex-shrink-0",
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
