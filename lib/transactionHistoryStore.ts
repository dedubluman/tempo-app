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

type HistorySnapshot = {
  entries: LocalTransferHistoryEntry[];
};

export function subscribeTransferHistory(listener: () => void) {
  // Subscribe to Zustand store changes
  return useTxHistoryStore.subscribe(listener);
}

export function getTransferHistorySnapshot(): HistorySnapshot {
  return { entries: useTxHistoryStore.getState().entries };
}

export function addTransferHistoryEntries(entries: LocalTransferHistoryEntry[]) {
  if (entries.length === 0) {
    return;
  }

  useTxHistoryStore.getState().addEntries(entries);
}
