"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const MAX_RECEIPTS = 100;

export interface MerchantReceipt {
  id: string;
  amount: string;
  token: string;
  tokenAddress: string;
  sender: string;
  txHash: string;
  timestamp: number;
  memo: string;
}

interface MerchantStore {
  receipts: MerchantReceipt[];
  addReceipt: (receipt: Omit<MerchantReceipt, "id" | "timestamp">) => void;
  clearReceipts: () => void;
}

export const useMerchantStore = create<MerchantStore>()(
  persist(
    (set) => ({
      receipts: [],

      addReceipt: (receipt) =>
        set((state) => {
          const entry: MerchantReceipt = {
            ...receipt,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          };
          const updated = [entry, ...state.receipts].slice(0, MAX_RECEIPTS);
          return { receipts: updated };
        }),

      clearReceipts: () => set({ receipts: [] }),
    }),
    {
      name: "fluxus-merchant-receipts",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
