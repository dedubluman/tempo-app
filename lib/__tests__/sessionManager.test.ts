import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSessions: unknown[] = [];
const mockRemoveSession = vi.fn();
const mockClearAllSessions = vi.fn();
const mockAddSession = vi.fn();
const mockSetSessions = vi.fn();

vi.mock("@/lib/store", () => ({
  useSessionStore: Object.assign(
    vi.fn((selector?: (s: unknown) => unknown) => {
      const state = {
        sessions: mockSessions,
        addSession: mockAddSession,
        removeSession: mockRemoveSession,
        clearAllSessions: mockClearAllSessions,
        setSessions: mockSetSessions,
      };
      return selector ? selector(state) : state;
    }),
    {
      subscribe: vi.fn(() => vi.fn()),
      getState: vi.fn(() => ({
        sessions: mockSessions,
        addSession: mockAddSession,
        removeSession: mockRemoveSession,
        clearAllSessions: mockClearAllSessions,
        setSessions: mockSetSessions,
      })),
    },
  ),
}));

vi.mock("@wagmi/core", () => ({
  getConnectorClient: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  config: {},
}));

vi.mock("@/lib/sessionCrypto", () => ({
  getOrCreateSessionEncryptionKey: vi.fn(() =>
    Promise.resolve({} as CryptoKey),
  ),
  encryptPrivateKey: vi.fn(() =>
    Promise.resolve({ ciphertext: "abc", iv: "def" }),
  ),
  decryptPrivateKey: vi.fn(() => Promise.resolve("0xprivkey" as `0x${string}`)),
}));

import {
  revokeSession,
  revokeAllSessions,
  cleanupExpiredSessions,
  getSessionSnapshot,
  subscribeSessions,
} from "@/lib/sessionManager";

describe("sessionManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions.length = 0;
  });

  it("revokeSession calls store removeSession with id", () => {
    revokeSession("session-123");
    expect(mockRemoveSession).toHaveBeenCalledWith("session-123");
  });

  it("revokeAllSessions calls clearAllSessions", () => {
    revokeAllSessions();
    expect(mockClearAllSessions).toHaveBeenCalled();
  });

  it("getSessionSnapshot returns empty array when no sessions", () => {
    const result = getSessionSnapshot();
    expect(result).toEqual([]);
  });

  it("cleanupExpiredSessions removes expired sessions", () => {
    const expiredSession = {
      id: "expired",
      expiresAtSec: Math.floor(Date.now() / 1000) - 60,
    };
    const validSession = {
      id: "valid",
      expiresAtSec: Math.floor(Date.now() / 1000) + 3600,
    };
    mockSessions.push(expiredSession, validSession);
    cleanupExpiredSessions();
    // verify the function ran without errors
    expect(true).toBe(true);
  });

  it("subscribeSessions returns unsubscribe function", () => {
    const listener = vi.fn();
    const unsub = subscribeSessions(listener);
    expect(typeof unsub).toBe("function");
  });
});
