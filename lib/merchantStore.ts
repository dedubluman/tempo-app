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

export interface SplitConfig {
  enabled: boolean;
  taxPercent: number;
  taxWallet: string;
  tipPercent: number;
  tipWallet: string;
}

interface MerchantStore {
  receipts: MerchantReceipt[];
  addReceipt: (receipt: Omit<MerchantReceipt, "id" | "timestamp">) => void;
  clearReceipts: () => void;
  splitConfig: SplitConfig;
  setSplitConfig: (config: SplitConfig) => void;
}

export const useMerchantStore = create<MerchantStore>()(
  persist(
    (set) => ({
      receipts: [],
      splitConfig: { enabled: false, taxPercent: 0, taxWallet: "", tipPercent: 0, tipWallet: "" },

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

      setSplitConfig: (config) => set({ splitConfig: config }),
    }),
    {
      name: "fluxus-merchant-receipts",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
