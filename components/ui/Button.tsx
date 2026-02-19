"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all rounded-[--radius-md] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--border-focus]",
  {
    variants: {
      variant: {
        primary:
          "text-white hover:opacity-90 active:opacity-80",
        secondary:
          "bg-[--bg-surface] border border-[--border-default] text-[--text-primary] hover:bg-[--bg-elevated] active:bg-[--bg-overlay]",
        ghost:
          "bg-transparent text-[--text-secondary] hover:bg-[--bg-subtle] active:bg-[--bg-elevated]",
        danger:
          "bg-[--status-error-bg] text-[--status-error-text] border border-[--status-error-border] hover:opacity-90 active:opacity-80",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  "data-testid"?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading, disabled, children, style, ...props },
    ref
  ) => {
    const isPrimary = variant === "primary" || variant === undefined;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={
          isPrimary
            ? { background: "var(--gradient-btn-primary)", ...style }
            : style
        }
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
