/** Button/Badge variant */
export type Variant = "primary" | "secondary" | "ghost" | "danger";

/** Component size */
export type Size = "sm" | "md" | "lg";

/** Transaction/session status */
export type Status = "pending" | "confirmed" | "failed";

/** Transfer flow step machine */
export type TransferStep = "edit" | "confirm" | "sending" | "result";

/** Theme preference */
export type Theme = "light" | "dark" | "system";

/** Transfer mode */
export type TransferMode = "single" | "batch";

/** Batch transfer row */
export interface BatchRow {
  id: string;
  recipient: string;
  amount: string;
  memo: string;
}

/** Transaction direction */
export type TxDirection = "sent" | "received";
