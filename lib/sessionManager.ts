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

let store: SessionSnapshot = {
  sessions: [],
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
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
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionSnapshot() {
  return store;
}

export async function createSession(policy: SessionPolicy) {
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

  store = {
    sessions: [session, ...store.sessions],
  };
  emit();
  return session;
}

export function revokeSession(sessionId: string) {
  const next = store.sessions.filter((session) => session.id !== sessionId);
  if (next.length === store.sessions.length) {
    return;
  }
  store = {
    sessions: next,
  };
  emit();
}

export function revokeAllSessions() {
  if (store.sessions.length === 0) {
    return;
  }
  store = {
    sessions: [],
  };
  emit();
}

export function cleanupExpiredSessions() {
  const current = nowSec();
  const next = store.sessions.filter((session) => session.expiresAtSec > current);
  const removedCount = store.sessions.length - next.length;
  if (next.length === store.sessions.length) {
    return 0;
  }
  store = {
    sessions: next,
  };
  emit();
  return removedCount;
}

export function clearSessionAuthorization(sessionId: string) {
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
  store = {
    sessions: nextSessions,
  };
  if (changed) {
    emit();
  }
}

export function getSessionById(sessionId: string) {
  return store.sessions.find((session) => session.id === sessionId);
}

export function applySessionSpend(sessionId: string, amount: bigint) {
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
  store = {
    sessions: nextSessions,
  };
  if (changed) {
    emit();
  }
}

export function getSessionForTransfer(parameters: { recipient: string; amount: bigint }) {
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
    return remainingSpend(session) >= parameters.amount;
  });
}

export function getSessionForBatch(parameters: { recipients: string[]; amount: bigint }) {
  const current = nowSec();
  const recipients = parameters.recipients.map((item) => getAddress(item));

  return store.sessions.find((session) => {
    if (session.expiresAtSec <= current) {
      return false;
    }
    if (remainingSpend(session) < parameters.amount) {
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
