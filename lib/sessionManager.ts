"use client";

import { getConnectorClient } from "@wagmi/core";
import type { KeyAuthorization } from "ox/tempo";
import { generatePrivateKey } from "viem/accounts";
import { Account } from "viem/tempo";
import { getAddress, isAddress, parseUnits } from "viem";
import { config } from "@/lib/config";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS } from "@/lib/constants";
import { useSessionStore } from "@/lib/store";

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
  // Subscribe to Zustand store changes
  return useSessionStore.subscribe(listener);
}

export function getSessionSnapshot(): SessionSnapshot {
  return { sessions: useSessionStore.getState().sessions };
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

export function applySessionSpend(sessionId: string, amount: bigint) {
  const session = useSessionStore.getState().sessions.find((s) => s.id === sessionId);
  if (session) {
    useSessionStore.getState().updateSession(sessionId, { spent: session.spent + amount });
  }
}

export function getSessionForTransfer(parameters: { recipient: string; amount: bigint }) {
  const recipient = getAddress(parameters.recipient);
  const current = nowSec();

  return useSessionStore.getState().sessions.find((session) => {
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
  const current = nowSec();
  const recipients = parameters.recipients.map((item) => getAddress(item));

  return useSessionStore.getState().sessions.find((session) => {
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
