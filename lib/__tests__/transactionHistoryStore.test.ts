import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LocalTransferHistoryEntry } from "@/lib/transactionHistoryStore";

const mockAddEntries = vi.fn();
const mockGetEntries = vi.fn((): LocalTransferHistoryEntry[] => []);

vi.mock("@/lib/store", () => ({
  useTxHistoryStore: Object.assign(
    vi.fn(() => ({ entries: mockGetEntries(), addEntries: mockAddEntries })),
    {
      subscribe: vi.fn(() => vi.fn()),
      getState: vi.fn(() => ({
        entries: mockGetEntries(),
        addEntries: mockAddEntries,
      })),
    },
  ),
}));

import {
  addTransferHistoryEntries,
  getTransferHistorySnapshot,
  subscribeTransferHistory,
} from "@/lib/transactionHistoryStore";

describe("transactionHistoryStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEntries.mockReturnValue([]);
  });

  it("addTransferHistoryEntries does nothing with empty array", () => {
    addTransferHistoryEntries([]);
    expect(mockAddEntries).not.toHaveBeenCalled();
  });

  it("addTransferHistoryEntries calls store with entries", () => {
    const entry = {
      id: "1",
      transactionHash: "0xabc" as `0x${string}`,
      counterparty: "0xdef" as `0x${string}`,
      amount: BigInt(1000000),
      direction: "sent" as const,
      createdAtMs: Date.now(),
    };
    addTransferHistoryEntries([entry]);
    expect(mockAddEntries).toHaveBeenCalledWith([entry]);
  });

  it("getTransferHistorySnapshot returns current entries", () => {
    const entries = [
      {
        id: "1",
        transactionHash: "0xabc" as `0x${string}`,
        counterparty: "0xdef" as `0x${string}`,
        amount: BigInt(1000000),
        direction: "sent" as const,
        createdAtMs: 1000,
      },
    ];
    mockGetEntries.mockReturnValue(entries);
    const result = getTransferHistorySnapshot();
    expect(result).toEqual(entries);
  });

  it("subscribeTransferHistory returns unsubscribe function", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTransferHistory(listener);
    expect(typeof unsubscribe).toBe("function");
  });
});
