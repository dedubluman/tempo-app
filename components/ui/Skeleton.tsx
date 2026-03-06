"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circle" | "card";
  width?: string | number;
  height?: string | number;
}

function Skeleton({
  className,
  variant = "text",
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: "h-4 w-full rounded-[--radius-sm]",
    circle: "w-10 h-10 rounded-full",
    card: "w-full h-24 rounded-[--radius-lg]",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[--bg-elevated] motion-reduce:animate-none",
        variantClasses[variant],
        className,
      )}
      style={{
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        ...style,
      }}
      {...props}
    >
      <span
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent animate-shimmer"
        aria-hidden="true"
      />
    </div>
  );
}

export { Skeleton };
