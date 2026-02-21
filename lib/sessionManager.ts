"use client";

import { getConnectorClient } from "@wagmi/core";
import type { KeyAuthorization } from "ox/tempo";
import { generatePrivateKey } from "viem/accounts";
import { Account } from "viem/tempo";
import { getAddress, isAddress, parseUnits } from "viem";
import { config } from "@/lib/config";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS } from "@/lib/constants";

export type SessionDuration = 15 | 60 | 1440;

export type SessionPolicy = {
  durationMinutes: SessionDuration;
  spendLimit: bigint;
  allowedRecipients: string[];
};

export type SessionRecord = {
  id: string;
  rootAddress: `0x${string}`;
  accessPrivateKey: `0x${string}`;
  accessKeyAddress: `0x${string}`;
  createdAtMs: number;
  expiresAtSec: number;
  spendLimit: bigint;
  spent: bigint;
  allowedRecipients: string[];
  keyAuthorization: KeyAuthorization.Signed | null;
};

type SessionSnapshot = {
  sessions: SessionRecord[];
};

type SerializedSessionRecord = Omit<SessionRecord, "spendLimit" | "spent" | "keyAuthorization"> & {
  spendLimit: string;
  spent: string;
  keyAuthorization: null;
};

let store: SessionSnapshot = {
  sessions: [],
};

let hydrated = false;
const STORAGE_KEY = "tempo.sessionStore.v1";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function serializeSession(session: SessionRecord): SerializedSessionRecord {
  return {
    ...session,
    spendLimit: session.spendLimit.toString(),
    spent: session.spent.toString(),
    keyAuthorization: null,
  };
}

function deserializeSession(session: SerializedSessionRecord): SessionRecord {
  return {
    ...session,
    spendLimit: BigInt(session.spendLimit),
    spent: BigInt(session.spent),
    keyAuthorization: null,
  };
}

function persistSessions(snapshot: SessionSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload = snapshot.sessions.map(serializeSession);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function hydrateSessionsIfNeeded() {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  hydrated = true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as SerializedSessionRecord[];
    store = {
      sessions: parsed.map(deserializeSession),
    };
  } catch {
    store = { sessions: [] };
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function updateStore(next: SessionSnapshot) {
  store = next;
  persistSessions(next);
  emit();
}

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

function remainingSpend(session: SessionRecord) {
  if (session.spent >= session.spendLimit) {
    return BigInt(0);
  }
  return session.spendLimit - session.spent;
}

export function subscribeSessions(listener: () => void) {
  hydrateSessionsIfNeeded();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionSnapshot() {
  hydrateSessionsIfNeeded();
  return store;
}

export async function createSession(policy: SessionPolicy) {
  hydrateSessionsIfNeeded();

  if (policy.spendLimit <= BigInt(0)) {
    throw new Error("Spend limit must be greater than 0.");
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
      limits: [{ token: PATHUSD_ADDRESS, limit: policy.spendLimit }],
    },
  );

  const session: SessionRecord = {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
    rootAddress: getAddress(rootAccount.address),
    accessPrivateKey,
    accessKeyAddress: getAddress(accessAccount.accessKeyAddress),
    createdAtMs: Date.now(),
    expiresAtSec: expiry,
    spendLimit: policy.spendLimit,
    spent: BigInt(0),
    allowedRecipients: normalizeRecipients(policy.allowedRecipients),
    keyAuthorization,
  };

  updateStore({
    sessions: [session, ...store.sessions],
  });
  return session;
}

export function revokeSession(sessionId: string) {
  hydrateSessionsIfNeeded();
  const next = store.sessions.filter((session) => session.id !== sessionId);
  if (next.length === store.sessions.length) {
    return;
  }
  updateStore({
    sessions: next,
  });
}

export function revokeAllSessions() {
  hydrateSessionsIfNeeded();
  if (store.sessions.length === 0) {
    return;
  }
  updateStore({
    sessions: [],
  });
}

export function cleanupExpiredSessions() {
  hydrateSessionsIfNeeded();
  const current = nowSec();
  const next = store.sessions.filter((session) => session.expiresAtSec > current);
  const removedCount = store.sessions.length - next.length;
  if (next.length === store.sessions.length) {
    return 0;
  }
  updateStore({
    sessions: next,
  });
  return removedCount;
}

export function clearSessionAuthorization(sessionId: string) {
  hydrateSessionsIfNeeded();
  let changed = false;
  const nextSessions = store.sessions.map((session) => {
    if (session.id !== sessionId || !session.keyAuthorization) {
      return session;
    }
    changed = true;
    return {
      ...session,
      keyAuthorization: null,
    };
  });
  if (!changed) {
    return;
  }
  updateStore({
    sessions: nextSessions,
  });
}

export function getSessionById(sessionId: string) {
  hydrateSessionsIfNeeded();
  return store.sessions.find((session) => session.id === sessionId);
}

export function applySessionSpend(sessionId: string, amount: bigint) {
  hydrateSessionsIfNeeded();
  let changed = false;
  const nextSessions = store.sessions.map((session) => {
    if (session.id !== sessionId) {
      return session;
    }
    changed = true;
    return {
      ...session,
      spent: session.spent + amount,
    };
  });
  if (!changed) {
    return;
  }
  updateStore({
    sessions: nextSessions,
  });
}

export function getSessionForTransfer(parameters: { recipient: string; amount: bigint }) {
  hydrateSessionsIfNeeded();
  const recipient = getAddress(parameters.recipient);
  const current = nowSec();

  return store.sessions.find((session) => {
    if (session.expiresAtSec <= current) {
      return false;
    }
    const hasRecipientPolicy = session.allowedRecipients.length > 0;
    if (hasRecipientPolicy && !session.allowedRecipients.includes(recipient)) {
      return false;
    }
    return remainingSpend(session) > parameters.amount;
  });
}

export function getSessionForBatch(parameters: { recipients: string[]; amount: bigint }) {
  hydrateSessionsIfNeeded();
  const current = nowSec();
  const recipients = parameters.recipients.map((item) => getAddress(item));

  return store.sessions.find((session) => {
    if (session.expiresAtSec <= current) {
      return false;
    }
    if (remainingSpend(session) <= parameters.amount) {
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

export function getSessionRemainingSpend(session: SessionRecord) {
  return remainingSpend(session);
}

export function parseSpendLimitFromInput(value: string) {
  return parseUnits(value, PATHUSD_DECIMALS);
}
