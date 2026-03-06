import { cn } from "@/lib/cn";

type Status = "pending" | "success" | "failed" | "scheduled" | "streaming";
type StatusBadgeSize = "sm" | "md";

type StatusBadgeProps = {
  status: Status;
  size?: StatusBadgeSize;
};

const STATUS_LABELS: Record<Status, string> = {
  pending: "Pending",
  success: "Success",
  failed: "Failed",
  scheduled: "Scheduled",
  streaming: "Streaming",
};

const STATUS_CLASSES: Record<Status, string> = {
  pending:
    "bg-[--status-warning-bg] text-[--status-warning-text] border-[--status-warning-border]",
  success:
    "bg-[--status-success-bg] text-[--status-success-text] border-[--status-success-border]",
  failed:
    "bg-[--status-error-bg] text-[--status-error-text] border-[--status-error-border]",
  scheduled:
    "bg-[--status-info-bg] text-[--status-info-text] border-[--status-info-border]",
  streaming:
    "bg-[--brand-subtle] text-[--brand-primary] border-[--border-focus]",
};

const SIZE_CLASSES: Record<StatusBadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const hasDot = status === "pending" || status === "streaming";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        STATUS_CLASSES[status],
        SIZE_CLASSES[size],
      )}
    >
      {hasDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 animate-dot-pulse" />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}
