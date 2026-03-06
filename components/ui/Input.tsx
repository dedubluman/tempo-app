"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  "data-testid"?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftElement,
      rightElement,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm text-[--text-primary] font-semibold"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftElement && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] flex items-center">
              {leftElement}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-10 rounded-[--radius-md] border bg-[--bg-surface] text-[--text-primary]",
              "px-3 outline-none transition-all duration-[--duration-fast]",
              "placeholder:text-[--text-muted]",
              "focus-visible:border-[--border-focus] focus-visible:ring-2 focus-visible:ring-[--brand-primary]/20 focus-visible:bg-[--bg-elevated] focus-visible:shadow-[0_0_0_3px_rgba(251,191,36,0.08)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              leftElement && "pl-10",
              rightElement && "pr-10",
              error
                ? "border-[--status-error-border] ring-2 ring-[--status-error-bg]"
                : "border-[--border-default]",
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] flex items-center">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-sm text-[--status-error-text]"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-sm text-[--text-muted]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
