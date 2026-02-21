"use client";

import { Check, X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { TransferStep } from "@/types/ui";

const STEPS: { key: TransferStep; label: string }[] = [
  { key: "edit", label: "Details" },
  { key: "confirm", label: "Review" },
  { key: "sending", label: "Sending" },
  { key: "result", label: "Done" },
];

const STEP_ORDER: TransferStep[] = ["edit", "confirm", "sending", "result"];

interface TransferStepperProps {
  currentStep: TransferStep;
  status?: "pending" | "success" | "error";
  className?: string;
}

export function TransferStepper({ currentStep, status = "pending", className }: TransferStepperProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className={cn("flex items-center w-full", className)} aria-label="Transfer progress">
      {STEPS.map((step, index) => {
        const stepIndex = STEP_ORDER.indexOf(step.key);
        const isCompleted = stepIndex < currentIndex;
        const isCurrent = step.key === currentStep;
        const isError = isCurrent && status === "error";
        const isSuccess = step.key === "result" && status === "success";

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all",
                  isError && "border-[--status-error-border] bg-[--status-error-bg] text-[--status-error-text]",
                  isSuccess && "border-[--status-success-border] bg-[--status-success-bg] text-[--status-success-text]",
                  isCompleted && !isError && !isSuccess && "border-[--status-success-border] bg-[--status-success-bg] text-[--status-success-text]",
                  isCurrent && !isError && !isSuccess && "border-[--brand-primary] bg-[--brand-subtle] text-[--brand-primary] animate-pulse",
                  !isCurrent && !isCompleted && "border-[--border-default] bg-[--bg-subtle] text-[--text-muted]"
                )}
              >
                {isError ? <X size={12} /> : isCompleted || isSuccess ? <Check size={12} /> : index + 1}
              </div>
              <span className={cn(
                "text-[10px] font-medium hidden sm:block",
                isCurrent ? "text-[--text-primary]" : "text-[--text-muted]"
              )}>
                {step.label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-1 transition-all",
                stepIndex < currentIndex
                  ? "bg-[--status-success-border]"
                  : "bg-[--border-default]"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
