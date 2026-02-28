"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { migrateSessionToMultiToken } from "@/lib/sessionManager";
import type { TokenBalance } from "@/types/token";
import type { SessionRecord } from "@/lib/sessionManager";
import type { LocalTransferHistoryEntry } from "@/lib/transactionHistoryStore";

// ============================================================================
// TYPES
// ============================================================================

export type Theme = "light" | "dark" | "system";

// Wallet Slice
export interface WalletState {
  address: `0x${string}` | null;
  isConnected: boolean;
  activeCredentialId: string | null;
  lastActiveCredentialId: string | null;
  walletCreated: boolean;
  lastAddress: string | null;
  setAddress: (address: `0x${string}` | null) => void;
  setIsConnected: (connected: boolean) => void;
  setActiveCredentialId: (id: string | null) => void;
  setLastActiveCredentialId: (id: string | null) => void;
  setWalletCreated: (created: boolean) => void;
  setLastAddress: (address: string | null) => void;
  reset: () => void;
}

// Balance Slice
export interface BalanceState {
  balances: TokenBalance[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  setBalances: (balances: TokenBalance[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markFetched: () => void;
  reset: () => void;
}

// Session Slice
export interface SessionState {
  sessions: SessionRecord[];
  setSessions: (sessions: SessionRecord[]) => void;
  addSession: (session: SessionRecord) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<SessionRecord>) => void;
  clearAllSessions: () => void;
  reset: () => void;
}

// Transaction History Slice
export interface TxHistoryState {
  entries: LocalTransferHistoryEntry[];
  setEntries: (entries: LocalTransferHistoryEntry[]) => void;
  addEntries: (entries: LocalTransferHistoryEntry[]) => void;
  reset: () => void;
}

// UI Slice
export interface UIState {
  theme: Theme;
  selectedTokenAddress: `0x${string}` | null;
  activeFeature: "transfer" | "session" | "history" | "settings" | null;
  setTheme: (theme: Theme) => void;
  setSelectedToken: (address: `0x${string}` | null) => void;
  setActiveFeature: (feature: UIState["activeFeature"]) => void;
  reset: () => void;
}

// Combined Store
export interface AppStore {
  wallet: WalletState;
  balance: BalanceState;
  session: SessionState;
  txHistory: TxHistoryState;
  ui: UIState;
}

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

const OLD_KEYS = [
  "tempo.walletCreated",
  "tempo.lastAddress",
  "tempo.sessionStore.v1",
  "tempo.transferHistory.v1",
  "fluxus-theme",
  "wagmi.webAuthn.activeCredential",
  "wagmi.webAuthn.lastActiveCredential",
] as const;

function migrateOldLocalStorage() {
  if (typeof window === "undefined") return;

  try {
    // Migrate wallet data
    const walletCreated = window.localStorage.getItem("tempo.walletCreated");
    const lastAddress = window.localStorage.getItem("tempo.lastAddress");
    
    if (walletCreated || lastAddress) {
      const walletData = {
        walletCreated: walletCreated === "1",
        lastAddress: lastAddress || null,
        address: null,
        isConnected: false,
        activeCredentialId: window.localStorage.getItem("wagmi.webAuthn.activeCredential"),
        lastActiveCredentialId: window.localStorage.getItem("wagmi.webAuthn.lastActiveCredential"),
      };
      window.localStorage.setItem("fluxus-wallet-storage", JSON.stringify({ state: walletData }));
    }

    // Migrate sessions
    const sessionsRaw = window.localStorage.getItem("tempo.sessionStore.v1");
    if (sessionsRaw) {
      try {
        const sessions = JSON.parse(sessionsRaw);
        window.localStorage.setItem(
          "fluxus-session-storage",
          JSON.stringify({ state: { sessions: Array.isArray(sessions) ? sessions.map((s: any) => ({
            ...s,
            spendLimit: s.spendLimit,
            spent: s.spent,
            keyAuthorization: null,
          })) : [] } })
        );
      } catch {
        // Ignore parse errors
      }
    }

    // Migrate transaction history
    const txHistoryRaw = window.localStorage.getItem("tempo.transferHistory.v1");
    if (txHistoryRaw) {
      try {
        const entries = JSON.parse(txHistoryRaw);
        window.localStorage.setItem(
          "fluxus-txhistory-storage",
          JSON.stringify({ state: { entries: Array.isArray(entries) ? entries.map((e: any) => ({
            ...e,
            amount: e.amount,
          })) : [] } })
        );
      } catch {
        // Ignore parse errors
      }
    }

    // Migrate theme
    const theme = window.localStorage.getItem("fluxus-theme");
    if (theme && (theme === "light" || theme === "dark" || theme === "system")) {
      window.localStorage.setItem(
        "fluxus-ui-storage",
        JSON.stringify({ state: { theme, selectedTokenAddress: null, activeFeature: null } })
      );
    }

    // Delete old keys after successful migration
    OLD_KEYS.forEach((key) => {
      window.localStorage.removeItem(key);
    });

    console.log("[Zustand Migration] Old localStorage keys migrated and removed");
  } catch (error) {
    console.error("[Zustand Migration] Failed to migrate:", error);
  }
}

// Run migration once on module load
if (typeof window !== "undefined") {
  migrateOldLocalStorage();
}

// ============================================================================
// BROADCAST CHANNEL SYNC
// ============================================================================

const CHANNEL_NAME = "fluxus-store-sync";
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
}

function broadcastStoreUpdate(storeName: string, state: any) {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ storeName, state, timestamp: Date.now() });
  }
}

// ============================================================================
// WALLET SLICE
// ============================================================================

const initialWalletState = {
  address: null,
  isConnected: false,
  activeCredentialId: null,
  lastActiveCredentialId: null,
  walletCreated: false,
  lastAddress: null,
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      ...initialWalletState,
      setAddress: (address) => {
        set({ address });
        broadcastStoreUpdate("wallet", get());
      },
      setIsConnected: (connected) => {
        set({ isConnected: connected });
        broadcastStoreUpdate("wallet", get());
      },
      setActiveCredentialId: (id) => {
        set({ activeCredentialId: id });
        broadcastStoreUpdate("wallet", get());
      },
      setLastActiveCredentialId: (id) => {
        set({ lastActiveCredentialId: id });
        broadcastStoreUpdate("wallet", get());
      },
      setWalletCreated: (created) => {
        set({ walletCreated: created });
        broadcastStoreUpdate("wallet", get());
      },
      setLastAddress: (address) => {
        set({ lastAddress: address });
        broadcastStoreUpdate("wallet", get());
      },
      reset: () => {
        set(initialWalletState);
        broadcastStoreUpdate("wallet", get());
      },
    }),
    {
      name: "fluxus-wallet-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Listen for cross-tab updates
if (broadcastChannel) {
  broadcastChannel.addEventListener("message", (event) => {
    if (event.data.storeName === "wallet") {
      useWalletStore.setState(event.data.state, true);
    }
  });
}

// ============================================================================
// BALANCE SLICE
// ============================================================================

const initialBalanceState = {
  balances: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,
};

export const useBalanceStore = create<BalanceState>()(
  persist(
    (set, get) => ({
      ...initialBalanceState,
      setBalances: (balances) => {
        set({ balances, error: null });
        broadcastStoreUpdate("balance", get());
      },
      setIsLoading: (loading) => {
        set({ isLoading: loading });
        broadcastStoreUpdate("balance", get());
      },
      setError: (error) => {
        set({ error });
        broadcastStoreUpdate("balance", get());
      },
      markFetched: () => {
        set({ lastFetchedAt: Date.now() });
        broadcastStoreUpdate("balance", get());
      },
      reset: () => {
        set(initialBalanceState);
        broadcastStoreUpdate("balance", get());
      },
    }),
    {
      name: "fluxus-balance-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Don't persist loading/error states
        balances: state.balances,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);

if (broadcastChannel) {
  broadcastChannel.addEventListener("message", (event) => {
    if (event.data.storeName === "balance") {
      useBalanceStore.setState(event.data.state, true);
    }
  });
}

// ============================================================================
// SESSION SLICE
// ============================================================================

const initialSessionState = {
  sessions: [],
};

// Custom serializer for sessions (bigint handling)
// Custom serializer for sessions (bigint and Map handling)
const sessionStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try {
      const parsed = JSON.parse(str);
      if (parsed.state?.sessions) {
        parsed.state.sessions = parsed.state.sessions.map((s: any) => {
          // Migrate old format if needed
          const migrated = migrateSessionToMultiToken(s);
          
          // Convert serialized maps back to Map instances
          const spendLimits = new Map<`0x${string}`, bigint>();
          const spent = new Map<`0x${string}`, bigint>();
          
          if (Array.isArray(migrated.spendLimits)) {
            for (const [token, limit] of migrated.spendLimits) {
              spendLimits.set(token as `0x${string}`, typeof limit === 'string' ? BigInt(limit) : limit);
            }
          } else if (migrated.spendLimits instanceof Map) {
            for (const [token, limit] of migrated.spendLimits.entries()) {
              spendLimits.set(token, typeof limit === 'string' ? BigInt(limit) : limit);
            }
          }
          
          if (Array.isArray(migrated.spent)) {
            for (const [token, amount] of migrated.spent) {
              spent.set(token as `0x${string}`, typeof amount === 'string' ? BigInt(amount) : amount);
            }
          } else if (migrated.spent instanceof Map) {
            for (const [token, amount] of migrated.spent.entries()) {
              spent.set(token, typeof amount === 'string' ? BigInt(amount) : amount);
            }
          }
          
          return {
            ...migrated,
            spendLimits,
            spent,
            keyAuthorization: null,
          };
        });
      }
      return JSON.stringify(parsed);
    } catch {
      return str;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state?.sessions) {
        parsed.state.sessions = parsed.state.sessions.map((s: any) => ({
          ...s,
          // Convert Map → Array of [key, value] tuples with bigint → string
          spendLimits: s.spendLimits instanceof Map
            ? Array.from(s.spendLimits.entries()).map((entry: any) => [entry[0], typeof entry[1] === 'bigint' ? entry[1].toString() : entry[1]])
            : s.spendLimits,
          spent: s.spent instanceof Map
            ? Array.from(s.spent.entries()).map((entry: any) => [entry[0], typeof entry[1] === 'bigint' ? entry[1].toString() : entry[1]])
            : s.spent,
          keyAuthorization: null,
        }));
      }
      localStorage.setItem(name, JSON.stringify(parsed));
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      ...initialSessionState,
      setSessions: (sessions) => {
        set({ sessions });
        broadcastStoreUpdate("session", get());
      },
      addSession: (session) => {
        set((state) => ({ sessions: [session, ...state.sessions] }));
        broadcastStoreUpdate("session", get());
      },
      removeSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));
        broadcastStoreUpdate("session", get());
      },
      updateSession: (sessionId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, ...updates } : s
          ),
        }));
        broadcastStoreUpdate("session", get());
      },
      clearAllSessions: () => {
        set({ sessions: [] });
        broadcastStoreUpdate("session", get());
      },
      reset: () => {
        set(initialSessionState);
        broadcastStoreUpdate("session", get());
      },
    }),
    {
      name: "fluxus-session-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

if (broadcastChannel) {
  broadcastChannel.addEventListener("message", (event) => {
    if (event.data.storeName === "session") {
      useSessionStore.setState(event.data.state, true);
    }
  });
}

// ============================================================================
// TRANSACTION HISTORY SLICE
// ============================================================================

const initialTxHistoryState = {
  entries: [],
};

const MAX_ENTRIES = 100;

// Custom serializer for tx history (bigint handling)
const txHistoryStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try {
      const parsed = JSON.parse(str);
      if (parsed.state?.entries) {
        parsed.state.entries = parsed.state.entries.map((e: any) => ({
          ...e,
          amount: typeof e.amount === "string" ? BigInt(e.amount) : e.amount,
        }));
      }
      return JSON.stringify(parsed);
    } catch {
      return str;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state?.entries) {
        parsed.state.entries = parsed.state.entries.map((e: any) => ({
          ...e,
          amount: typeof e.amount === "bigint" ? e.amount.toString() : e.amount,
        }));
      }
      localStorage.setItem(name, JSON.stringify(parsed));
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useTxHistoryStore = create<TxHistoryState>()(
  persist(
    (set, get) => ({
      ...initialTxHistoryState,
      setEntries: (entries) => {
        set({ entries: entries.slice(0, MAX_ENTRIES) });
        broadcastStoreUpdate("txHistory", get());
      },
      addEntries: (newEntries) => {
        set((state) => {
          const seen = new Set(
            state.entries.map(
              (e) =>
                `${e.transactionHash}-${e.counterparty}-${e.amount.toString()}-${e.direction}`
            )
          );

          const merged = [...state.entries];
          for (const entry of newEntries) {
            const key = `${entry.transactionHash}-${entry.counterparty}-${entry.amount.toString()}-${entry.direction}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(entry);
            }
          }

          merged.sort((a, b) => b.createdAtMs - a.createdAtMs);

          return { entries: merged.slice(0, MAX_ENTRIES) };
        });
        broadcastStoreUpdate("txHistory", get());
      },
      reset: () => {
        set(initialTxHistoryState);
        broadcastStoreUpdate("txHistory", get());
      },
    }),
    {
      name: "fluxus-txhistory-storage",
      storage: createJSONStorage(() => txHistoryStorage),
    }
  )
);

if (broadcastChannel) {
  broadcastChannel.addEventListener("message", (event) => {
    if (event.data.storeName === "txHistory") {
      useTxHistoryStore.setState(event.data.state, true);
    }
  });
}

// ============================================================================
// UI SLICE
// ============================================================================

const initialUIState = {
  theme: "system" as Theme,
  selectedTokenAddress: null,
  activeFeature: null,
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...initialUIState,
      setTheme: (theme) => {
        set({ theme });
        broadcastStoreUpdate("ui", get());
      },
      setSelectedToken: (address) => {
        set({ selectedTokenAddress: address });
        broadcastStoreUpdate("ui", get());
      },
      setActiveFeature: (feature) => {
        set({ activeFeature: feature });
        broadcastStoreUpdate("ui", get());
      },
      reset: () => {
        set(initialUIState);
        broadcastStoreUpdate("ui", get());
      },
    }),
    {
      name: "fluxus-ui-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

if (broadcastChannel) {
  broadcastChannel.addEventListener("message", (event) => {
    if (event.data.storeName === "ui") {
      useUIStore.setState(event.data.state, true);
    }
  });
}

// ============================================================================
// GLOBAL RESET
// ============================================================================

export function resetAllStores() {
  useWalletStore.getState().reset();
  useBalanceStore.getState().reset();
  useSessionStore.getState().reset();
  useTxHistoryStore.getState().reset();
  useUIStore.getState().reset();
}
