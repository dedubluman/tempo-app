"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  cleanupExpiredSessions,
  createSession,
  getSessionRemainingSpend,
  getSessionSnapshot,
  parseSpendLimitFromInput,
  revokeSession,
  subscribeSessions,
  type SessionDuration,
} from "@/lib/sessionManager";
import { formatUnits, isAddress } from "viem";
import { PATHUSD_DECIMALS } from "@/lib/constants";

const DURATION_OPTIONS: { label: string; value: SessionDuration }[] = [
  { label: "15 min", value: 15 },
  { label: "1 hour", value: 60 },
  { label: "24 hours", value: 1440 },
];

function formatCountdown(secondsLeft: number) {
  if (secondsLeft <= 0) return "Expired";
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function parseRecipientInput(input: string) {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

export function SessionKeys() {
  const snapshot = useSyncExternalStore(subscribeSessions, getSessionSnapshot, getSessionSnapshot);
  const [nowSec, setNowSec] = useState(Math.floor(Date.now() / 1000));

  const [duration, setDuration] = useState<SessionDuration>(60);
  const [spendLimitInput, setSpendLimitInput] = useState("50");
  const [allowedRecipientsInput, setAllowedRecipientsInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiredSessionNotice, setExpiredSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    const removedOnLoad = cleanupExpiredSessions();
    if (removedOnLoad > 0) {
      setExpiredSessionNotice("Your session has expired. Please sign again.");
    }

    const interval = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
      const removed = cleanupExpiredSessions();
      if (removed > 0) {
        setExpiredSessionNotice("Your session has expired. Please sign again.");
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const activeSessions = useMemo(() => snapshot.sessions, [snapshot.sessions]);

  const handleCreateSession = async () => {
    setError(null);
    setExpiredSessionNotice(null);

    let spendLimit: bigint;
    try {
      spendLimit = parseSpendLimitFromInput(spendLimitInput);
    } catch {
      setError("Enter a valid spend limit with up to 6 decimals.");
      return;
    }

    if (spendLimit <= BigInt(0)) {
      setError("Spend limit must be greater than 0.");
      return;
    }

    const recipients = parseRecipientInput(allowedRecipientsInput);
    const invalidRecipient = recipients.find((recipient) => !isAddress(recipient));
    if (invalidRecipient) {
      setError(`Invalid recipient in allowlist: ${invalidRecipient}`);
      return;
    }

    setIsCreating(true);
    try {
      await createSession({
        durationMinutes: duration,
        spendLimit,
        allowedRecipients: recipients,
      });
      setAllowedRecipientsInput("");
    } catch (sessionError) {
      const message = sessionError instanceof Error ? sessionError.message : "Failed to create session.";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[--border-default] bg-[--bg-surface] p-4 sm:p-6 shadow-[--shadow-sm] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[--shadow-lg] lg:col-span-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">Session Keys</p>
        <span className="inline-flex rounded-full bg-[--brand-subtle] px-2.5 py-1 text-xs font-medium text-[--brand-primary]">
          Quick Send
        </span>
      </div>

      <div className="space-y-3 border-t border-[--border-default] pt-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[--text-tertiary]">Duration</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDuration(option.value)}
                  className={`h-11 rounded-lg border text-xs font-semibold transition-colors duration-150 ${
                  duration === option.value
                    ? "border-[--brand-primary] bg-[--brand-primary] text-[--text-inverse]"
                    : "border-[--border-default] bg-[--bg-elevated] text-[--text-secondary] hover:bg-[--bg-subtle]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="session-limit" className="text-xs font-semibold uppercase tracking-[0.18em] text-[--text-tertiary]">
            Spend Limit (pathUSD)
          </label>
          <input
            id="session-limit"
            type="text"
            inputMode="decimal"
            value={spendLimitInput}
            onChange={(event) => setSpendLimitInput(event.target.value)}
            className="h-11 w-full rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand-primary]/40"
            placeholder="50"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="session-recipients" className="text-xs font-semibold uppercase tracking-[0.18em] text-[--text-tertiary]">
            Allowed Recipients (optional)
          </label>
          <textarea
            id="session-recipients"
            rows={2}
            value={allowedRecipientsInput}
            onChange={(event) => setAllowedRecipientsInput(event.target.value)}
            className="w-full rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand-primary]/40"
            placeholder="0xabc...,0xdef..."
          />
          <p className="text-[11px] text-[--text-tertiary]">Comma-separated addresses. Empty means any recipient.</p>
        </div>

        {error ? (
          <p className="rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">{error}</p>
        ) : null}

        {expiredSessionNotice ? (
          <p className="rounded-lg border border-[--status-warning-border] bg-[--status-warning-bg] px-3 py-2 text-xs text-[--status-warning-text]">{expiredSessionNotice}</p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleCreateSession()}
          disabled={isCreating}
            className="h-11 w-full rounded-xl px-4 text-sm font-semibold text-[--text-inverse] transition-colors duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "var(--gradient-btn-primary)" }}
        >
          {isCreating ? "Creating Session..." : "Create Session"}
        </button>
        {isCreating ? <p className="text-xs text-[--text-tertiary]">Preparing Access Key authorization. Keep your passkey prompt open.</p> : null}
      </div>

      <div className="space-y-2 border-t border-[--border-default] pt-4">
        {activeSessions.length === 0 ? (
          <p className="text-xs text-[--text-tertiary]">No active sessions. Transfers require passkey confirmation.</p>
        ) : (
          activeSessions.map((session) => {
            const secondsLeft = Math.max(session.expiresAtSec - nowSec, 0);
            const remaining = getSessionRemainingSpend(session);
            return (
              <div key={session.id} className="space-y-2 rounded-xl border border-[--border-default] bg-[--bg-elevated] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[--text-tertiary]">Active Session</p>
                  <button
                    type="button"
                    onClick={() => revokeSession(session.id)}
                    className="inline-flex h-11 items-center rounded-lg border border-[--border-default] px-3 text-sm font-medium text-[--text-secondary] transition-colors duration-150 hover:bg-[--bg-subtle]"
                  >
                    Revoke
                  </button>
                </div>
                <p className="text-xs text-[--text-tertiary]">Expires in: {formatCountdown(secondsLeft)}</p>
                <p className="text-xs text-[--text-tertiary]">
                  Spend remaining: {formatUnits(remaining, PATHUSD_DECIMALS)} pathUSD
                </p>
                {session.allowedRecipients.length > 0 ? (
                  <p className="text-xs text-[--text-tertiary]">Allowed recipients: {session.allowedRecipients.length}</p>
                ) : (
                  <p className="text-xs text-[--text-tertiary]">Allowed recipients: any</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
