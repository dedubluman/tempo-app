"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-[--duration-fast] ease-[--ease-out] rounded-[--radius-md] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--border-focus] focus-visible:ring-offset-2 focus-visible:ring-offset-[--bg-base] active:scale-[0.98] active:translate-y-0 hover:-translate-y-0.5 relative overflow-hidden",
  {
    variants: {
      variant: {
        primary:
          "bg-[--brand-primary] text-[--brand-contrast] hover:bg-[--brand-hover] active:bg-[--brand-active] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-brand)]",
        secondary:
          "bg-[--bg-surface] border border-[--border-default] text-[--text-primary] hover:bg-[--bg-elevated] hover:border-[--border-strong] active:bg-[--bg-overlay]",
        ghost:
          "bg-transparent text-[--text-secondary] hover:bg-[--bg-subtle] hover:text-[--text-primary] active:bg-[--bg-elevated]",
        danger:
          "bg-[--status-error-bg] text-[--status-error-text] border border-[--status-error-border] hover:bg-[--status-error-border] active:opacity-80",
      },
      size: {
        sm: "h-8 px-4 py-2 text-sm",
        md: "h-10 px-6 text-base",
        lg: "h-12 px-8 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  "data-testid"?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading, disabled, children, style, ...props },
    ref,
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
        className={cn(
          buttonVariants({ variant, size }),
          loading && "text-transparent pointer-events-none",
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit">
            <div className="relative w-[50%] h-1.5 bg-current/20 rounded-full overflow-hidden">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        )}
        <span className={cn(loading && "opacity-0")}>{children}</span>
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
