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
    : { type: "spring" as const, stiffness: 400, damping: 40 };

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
            className="fixed inset-0 bg-black/85 z-40"
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
              "bg-[--bg-surface] rounded-t-[--radius-3xl]",
              "shadow-[--shadow-xl]",
              "md:max-w-[480px] md:mx-auto",
              className
            )}
          >
            <div className="w-10 h-1 bg-[--border-default] rounded-full mx-auto mt-3 mb-2" />

            {title && (
              <div className="px-5 pb-4 border-b border-[--border-subtle]">
                <h2 className="text-[--text-primary] font-semibold text-base">{title}</h2>
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
