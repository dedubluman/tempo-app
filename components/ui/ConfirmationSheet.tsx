"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface ConfirmationSheetProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "default" | "danger";
}

export function ConfirmationSheet({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmationSheetProps) {
  return (
    <BottomSheet open={open} onClose={onCancel} title={title}>
      <div className="flex flex-col gap-5">
        <p className="text-sm text-[--text-secondary] leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            data-testid="confirmation-cancel"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            data-testid="confirmation-confirm"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
