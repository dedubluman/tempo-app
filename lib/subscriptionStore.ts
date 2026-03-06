"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type SubscriptionFrequency = "daily" | "weekly" | "monthly";

export interface Subscription {
  id: string;
  recipient: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  frequency: SubscriptionFrequency;
  nextPaymentAt: number; // Unix timestamp (ms)
  createdAt: number;
  active: boolean;
  totalPaid: string;
  paymentCount: number;
}

interface SubscriptionStore {
  subscriptions: Subscription[];
  addSubscription: (
    sub: Omit<Subscription, "id" | "createdAt" | "totalPaid" | "paymentCount">,
  ) => void;
  cancelSubscription: (id: string) => void;
  recordPayment: (id: string, amount: string) => void;
  clearAll: () => void;
}

function getNextPaymentTime(frequency: SubscriptionFrequency): number {
  const now = Date.now();
  switch (frequency) {
    case "daily":
      return now + 24 * 60 * 60 * 1000;
    case "weekly":
      return now + 7 * 24 * 60 * 60 * 1000;
    case "monthly":
      return now + 30 * 24 * 60 * 60 * 1000;
  }
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set) => ({
      subscriptions: [],

      addSubscription: (sub) =>
        set((state) => ({
          subscriptions: [
            ...state.subscriptions,
            {
              ...sub,
              id: crypto.randomUUID(),
              createdAt: Date.now(),
              totalPaid: "0",
              paymentCount: 0,
            },
          ],
        })),

      cancelSubscription: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((s) =>
            s.id === id ? { ...s, active: false } : s,
          ),
        })),

      recordPayment: (id, amount) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((s) => {
            if (s.id !== id) return s;
            return {
              ...s,
              paymentCount: s.paymentCount + 1,
              totalPaid: String(Number(s.totalPaid) + Number(amount)),
              nextPaymentAt: getNextPaymentTime(s.frequency),
            };
          }),
        })),

      clearAll: () => set({ subscriptions: [] }),
    }),
    {
      name: "fluxus-subscriptions",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
