"use client";

export type LocalTransferDirection = "sent" | "received";

export type LocalTransferHistoryEntry = {
  id: string;
  transactionHash: `0x${string}`;
  counterparty: `0x${string}`;
  amount: bigint;
  direction: LocalTransferDirection;
  createdAtMs: number;
};

type SerializedEntry = {
  id: string;
  transactionHash: `0x${string}`;
  counterparty: `0x${string}`;
  amount: string;
  direction: LocalTransferDirection;
  createdAtMs: number;
};

type HistorySnapshot = {
  entries: LocalTransferHistoryEntry[];
};

const STORAGE_KEY = "tempo.transferHistory.v1";
const MAX_ENTRIES = 100;

let store: HistorySnapshot = { entries: [] };
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function toSerialized(entry: LocalTransferHistoryEntry): SerializedEntry {
  return {
    ...entry,
    amount: entry.amount.toString(),
  };
}

function fromSerialized(entry: SerializedEntry): LocalTransferHistoryEntry {
  return {
    ...entry,
    amount: BigInt(entry.amount),
  };
}

function persist(nextEntries: LocalTransferHistoryEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = nextEntries.map(toSerialized);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function hydrateIfNeeded() {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  hydrated = true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as SerializedEntry[];
    store = {
      entries: parsed.map(fromSerialized),
    };
  } catch {
    store = { entries: [] };
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function subscribeTransferHistory(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTransferHistorySnapshot() {
  hydrateIfNeeded();
  return store;
}

export function addTransferHistoryEntries(entries: LocalTransferHistoryEntry[]) {
  hydrateIfNeeded();

  if (entries.length === 0) {
    return;
  }

  const seen = new Set(
    store.entries.map((entry) => `${entry.transactionHash}-${entry.counterparty}-${entry.amount.toString()}-${entry.direction}`),
  );

  const merged = [...store.entries];
  for (const entry of entries) {
    const key = `${entry.transactionHash}-${entry.counterparty}-${entry.amount.toString()}-${entry.direction}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(entry);
  }

  merged.sort((a, b) => b.createdAtMs - a.createdAtMs);

  store = {
    entries: merged.slice(0, MAX_ENTRIES),
  };

  persist(store.entries);
  emit();
}
