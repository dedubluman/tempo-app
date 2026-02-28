"use client";

import { getConnectorClient } from "@wagmi/core";
import type { KeyAuthorization } from "ox/tempo";
import { generatePrivateKey } from "viem/accounts";
import { Account } from "viem/tempo";
import { getAddress, isAddress, parseUnits } from "viem";
import { config } from "@/lib/config";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS } from "@/lib/constants";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { useSessionStore } from "@/lib/store";

export type SessionDuration = 15 | 60 | 1440;

export type SessionPolicy = {
  durationMinutes: SessionDuration;
  spendLimits: Map<`0x${string}`, bigint>;
  allowedRecipients: string[];
};

export type SessionRecord = {
  id: string;
  rootAddress: `0x${string}`;
  accessPrivateKey: `0x${string}`;
  accessKeyAddress: `0x${string}`;
  createdAtMs: number;
  expiresAtSec: number;
  spendLimits: Map<`0x${string}`, bigint>;
  spent: Map<`0x${string}`, bigint>;
  allowedRecipients: string[];
  keyAuthorization: KeyAuthorization.Signed | null;
};

type SessionSnapshot = {
  sessions: SessionRecord[];
};

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function normalizeRecipients(recipients: string[]) {
  return Array.from(
    new Set(
      recipients
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && isAddress(item))
        .map((item) => getAddress(item)),
    ),
  );
}

function remainingSpend(session: SessionRecord, token: `0x${string}`) {
  const limit = session.spendLimits.get(token) || BigInt(0);
  const spent = session.spent.get(token) || BigInt(0);
  if (spent >= limit) {
    return BigInt(0);
  }
  return limit - spent;
}

export function subscribeSessions(listener: () => void) {
  // Subscribe to Zustand store changes
  return useSessionStore.subscribe(listener);
}

export function getSessionSnapshot(): SessionSnapshot {
  return { sessions: useSessionStore.getState().sessions };
}

export async function createSession(policy: SessionPolicy) {
  if (policy.spendLimits.size === 0) {
    throw new Error("At least one token spend limit is required.");
  }

  const connectorClient = await getConnectorClient(config);
  const rootAccount = connectorClient.account as unknown as {
    address: `0x${string}`;
    signKeyAuthorization?: (
      key: { accessKeyAddress: `0x${string}`; keyType: string },
      parameters: { expiry: number; limits: { token: `0x${string}`; limit: bigint }[] },
    ) => Promise<KeyAuthorization.Signed>;
  };

  if (!rootAccount?.signKeyAuthorization) {
    throw new Error("Connected account does not support Access Key authorization.");
  }

  const accessPrivateKey = generatePrivateKey();
  const accessAccount = Account.fromSecp256k1(accessPrivateKey, { access: rootAccount.address });
  const expiry = nowSec() + policy.durationMinutes * 60;
  const keyAuthorization = await rootAccount.signKeyAuthorization(
    {
      accessKeyAddress: accessAccount.accessKeyAddress,
      keyType: accessAccount.keyType,
    },
    {
      expiry,
      limits: Array.from(policy.spendLimits.entries()).map(([token, limit]) => ({ token, limit })),
    },
  );

  const session: SessionRecord = {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
    rootAddress: getAddress(rootAccount.address),
    accessPrivateKey,
    accessKeyAddress: getAddress(accessAccount.accessKeyAddress),
    createdAtMs: Date.now(),
    expiresAtSec: expiry,
    spendLimits: new Map(policy.spendLimits),
    spent: new Map(Array.from(policy.spendLimits.keys()).map(token => [token, BigInt(0)])),
    allowedRecipients: normalizeRecipients(policy.allowedRecipients),
    keyAuthorization,
  };

  useSessionStore.getState().addSession(session);
  return session;
}

export function revokeSession(sessionId: string) {
  useSessionStore.getState().removeSession(sessionId);
}

export function revokeAllSessions() {
  useSessionStore.getState().clearAllSessions();
}

export function cleanupExpiredSessions() {
  const current = nowSec();
  const sessions = useSessionStore.getState().sessions;
  const next = sessions.filter((session) => session.expiresAtSec > current);
  const removedCount = sessions.length - next.length;
  if (removedCount > 0) {
    useSessionStore.getState().setSessions(next);
  }
  return removedCount;
}

export function clearSessionAuthorization(sessionId: string) {
  const session = useSessionStore.getState().sessions.find((s) => s.id === sessionId);
  if (session?.keyAuthorization) {
    useSessionStore.getState().updateSession(sessionId, { keyAuthorization: null });
  }
}

export function getSessionById(sessionId: string) {
  return useSessionStore.getState().sessions.find((session) => session.id === sessionId);
}

// Overload signatures for backward compatibility
export function applySessionSpend(sessionId: string, amount: bigint): void;
export function applySessionSpend(sessionId: string, token: `0x${string}`, amount: bigint): void;
export function applySessionSpend(sessionId: string, tokenOrAmount: `0x${string}` | bigint, amount?: bigint): void {
  const session = useSessionStore.getState().sessions.find((s) => s.id === sessionId);
  if (!session) return;
  
  // Detect if called with old 2-arg signature (sessionId, amount) or new 3-arg (sessionId, token, amount)
  let token: `0x${string}`;
  let spendAmount: bigint;
  
  if (typeof tokenOrAmount === 'bigint') {
    // Old signature: applySessionSpend(sessionId, amount)
    token = PATHUSD_ADDRESS;
    spendAmount = tokenOrAmount;
  } else {
    // New signature: applySessionSpend(sessionId, token, amount)
    token = tokenOrAmount;
    spendAmount = amount!;
  }
  
  const currentSpent = session.spent.get(token) || BigInt(0);
  const newSpent = new Map(session.spent);
  newSpent.set(token, currentSpent + spendAmount);
  useSessionStore.getState().updateSession(sessionId, { spent: newSpent });
}

// Overload signatures for backward compatibility
export function getSessionForTransfer(parameters: { recipient: string; amount: bigint }): SessionRecord | undefined;
export function getSessionForTransfer(parameters: { recipient: string; token: `0x${string}`; amount: bigint }): SessionRecord | undefined;
export function getSessionForTransfer(parameters: { recipient: string; token?: `0x${string}`; amount: bigint }): SessionRecord | undefined {
  const recipient = getAddress(parameters.recipient);
  const token = parameters.token || PATHUSD_ADDRESS;
  const current = nowSec();

  return useSessionStore.getState().sessions.find((session) => {
    if (session.expiresAtSec <= current) {
      return false;
    }
    const hasRecipientPolicy = session.allowedRecipients.length > 0;
    if (hasRecipientPolicy && !session.allowedRecipients.includes(recipient)) {
      return false;
    }
    return remainingSpend(session, token) > parameters.amount;
  });
}

// Overload signatures for backward compatibility
export function getSessionForBatch(parameters: { recipients: string[]; amount: bigint }): SessionRecord | undefined;
export function getSessionForBatch(parameters: { recipients: string[]; token: `0x${string}`; amount: bigint }): SessionRecord | undefined;
export function getSessionForBatch(parameters: { recipients: string[]; token?: `0x${string}`; amount: bigint }): SessionRecord | undefined {
  const current = nowSec();
  const recipients = parameters.recipients.map((item) => getAddress(item));
  const token = parameters.token || PATHUSD_ADDRESS;

  return useSessionStore.getState().sessions.find((session) => {
    if (session.expiresAtSec <= current) {
      return false;
    }
    if (remainingSpend(session, token) <= parameters.amount) {
      return false;
    }
    const hasRecipientPolicy = session.allowedRecipients.length > 0;
    if (!hasRecipientPolicy) {
      return true;
    }
    return recipients.every((recipient) => session.allowedRecipients.includes(recipient));
  });
}

export function getAccessAccountForSession(session: SessionRecord) {
  return Account.fromSecp256k1(session.accessPrivateKey, { access: session.rootAddress });
}

export function getSessionRemainingSpend(session: SessionRecord, token?: `0x${string}`) {
  return remainingSpend(session, token || PATHUSD_ADDRESS);
}

export function parseSpendLimitFromInput(value: string, decimals: number = PATHUSD_DECIMALS) {
  return parseUnits(value, decimals);
}

// Migration helper: convert old single-token sessions to multi-token format
export function migrateSessionToMultiToken(session: any): SessionRecord {
  // If already migrated (has Map), return as-is
  if (session.spendLimits instanceof Map && session.spent instanceof Map) {
    return session as SessionRecord;
  }

  // Old format: { spendLimit: bigint, spent: bigint }
  const spendLimits = new Map<`0x${string}`, bigint>();
  const spent = new Map<`0x${string}`, bigint>();

  if (typeof session.spendLimit === 'bigint') {
    spendLimits.set(PATHUSD_ADDRESS, session.spendLimit);
  }
  if (typeof session.spent === 'bigint') {
    spent.set(PATHUSD_ADDRESS, session.spent);
  }

  return {
    ...session,
    spendLimits,
    spent,
  };
}
