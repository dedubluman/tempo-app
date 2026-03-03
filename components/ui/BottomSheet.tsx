"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const prefersReducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const sheetTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 350, damping: 35 };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetTransition}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className={cn(
              "fixed bottom-0 inset-x-0 z-50",
              "bg-[--bg-glass] backdrop-blur-xl border border-[--border-glass]",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_-20px_60px_-15px_rgba(0,0,0,0.5)]",
              "rounded-t-[--radius-3xl]",
              "md:max-w-[480px] md:mx-auto",
              className
            )}
          >
            <div className="w-12 h-1 bg-[--border-glass] rounded-full mx-auto mt-3 mb-2 cursor-grab active:cursor-grabbing" />

            {title && (
              <div className="px-5 pb-4 border-b border-[--border-glass]">
                <h2 className="text-[--text-primary] font-semibold text-lg">{title}</h2>
              </div>
            )}

            <div className="px-5 py-4 overflow-y-auto max-h-[80vh]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { BottomSheet };
