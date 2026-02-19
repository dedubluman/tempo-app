"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const cardVariants = cva("rounded-[--radius-xl] overflow-hidden", {
  variants: {
    variant: {
      flat: "bg-[--bg-surface]",
      elevated: "bg-[--bg-surface] shadow-[--shadow-md]",
      outlined: "bg-transparent border border-[--border-default]",
      brand: "bg-[--bg-surface] ring-1 ring-[--brand-primary]/40",
      glass:
        "bg-[--bg-surface]/60 backdrop-blur-md border border-[--border-subtle]",
    },
  },
  defaultVariants: {
    variant: "flat",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, children, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-5 py-4 border-b border-[--border-subtle]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-[--text-primary] font-semibold text-base", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-5 py-4 border-t border-[--border-subtle] flex items-center justify-between",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardContent, CardFooter, cardVariants };
