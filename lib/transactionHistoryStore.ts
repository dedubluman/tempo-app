"use client";

import { useTxHistoryStore } from "@/lib/store";

export type LocalTransferDirection = "sent" | "received";

export type LocalTransferHistoryEntry = {
  id: string;
  transactionHash: `0x${string}`;
  counterparty: `0x${string}`;
  amount: bigint;
  direction: LocalTransferDirection;
  createdAtMs: number;
};

export function subscribeTransferHistory(listener: () => void) {
  // Subscribe to Zustand store changes
  return useTxHistoryStore.subscribe(listener);
}

export function getTransferHistorySnapshot(): LocalTransferHistoryEntry[] {
  return useTxHistoryStore.getState().entries;
}

export function addTransferHistoryEntries(entries: LocalTransferHistoryEntry[]) {
  if (entries.length === 0) {
    return;
  }

  useTxHistoryStore.getState().addEntries(entries);
}
