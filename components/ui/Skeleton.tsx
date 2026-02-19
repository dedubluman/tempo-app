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
        "bg-[--bg-elevated] animate-pulse motion-reduce:animate-none",
        variantClasses[variant],
        className
      )}
      style={{
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        ...style,
      }}
      {...props}
    />
  );
}

export { Skeleton };
