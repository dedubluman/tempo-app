import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock IndexedDB (not available in jsdom by default)
vi.stubGlobal("indexedDB", {
  open: vi.fn(() => ({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: vi.fn(),
      objectStoreNames: { contains: vi.fn(() => false) },
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => ({ onsuccess: null, onerror: null })),
          put: vi.fn(() => ({ onsuccess: null, onerror: null })),
          getAll: vi.fn(() => ({ onsuccess: null, onerror: null })),
        })),
      })),
    },
  })),
});

// Setup localStorage mock
const localStorageMock = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  };
})();
vi.stubGlobal("localStorage", localStorageMock);

// Mock crypto.subtle for hashing
vi.stubGlobal("crypto", {
  subtle: {
    digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32))),
  },
});

import {
  getBackupCredentialMetadata,
  saveBackupCredentialMetadata,
  hasBackupCredentialMetadata,
} from "@/lib/passkeyRegistry";

describe("passkeyRegistry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it("getBackupCredentialMetadata returns empty array when no backups stored", () => {
    localStorageMock.getItem.mockReturnValue(null);
    const result = getBackupCredentialMetadata("0xabc");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("saveBackupCredentialMetadata stores metadata in localStorage", async () => {
    await saveBackupCredentialMetadata("cred123", "0xabc", "Backup Device");
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it("hasBackupCredentialMetadata returns false when no backups stored", () => {
    localStorageMock.getItem.mockReturnValue(null);
    const result = hasBackupCredentialMetadata("0xabc");
    expect(result).toBe(false);
  });
});
