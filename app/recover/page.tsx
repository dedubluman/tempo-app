"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { connect as connectAccount } from "@wagmi/core";
import { parseUnits } from "viem";
import { config } from "@/lib/config";
import { PATHUSD_DECIMALS } from "@/lib/constants";
import { FeatureFlag, isFeatureEnabled } from "@/lib/featureFlags";
import { createSession } from "@/lib/sessionManager";

const PASSKEY_RECOVERY_ENABLED = isFeatureEnabled(FeatureFlag.PASSKEY_RECOVERY);
const E2E_MOCK_AUTH = process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === "1";
const ACTIVE_CREDENTIAL_KEY = "wagmi.webAuthn.activeCredential";
const LAST_ACTIVE_CREDENTIAL_KEY = "wagmi.webAuthn.lastActiveCredential";
const WALLET_CREATED_FLAG = "tempo.walletCreated";
const LAST_ADDRESS_KEY = "tempo.lastAddress";

function hasActiveCredentialOnDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(
      window.localStorage.getItem(ACTIVE_CREDENTIAL_KEY) ||
        window.localStorage.getItem(LAST_ACTIVE_CREDENTIAL_KEY),
    );
  } catch {
    return false;
  }
}

function hasSessionKeysOnDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem("fluxus-session-storage");
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw) as { state?: { sessions?: unknown[] } };
    return Array.isArray(parsed.state?.sessions) && parsed.state.sessions.length > 0;
  } catch {
    return false;
  }
}

export default function RecoverPage() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const passkeyConnector = useMemo(
    () => config.connectors.find((connector) => connector.id === "webAuthn"),
    [],
  );

  const hasLocalCredential = hasActiveCredentialOnDevice();
  const hasLocalSession = hasSessionKeysOnDevice();
  const recoveryNeeded = !hasLocalCredential || !hasLocalSession;

  const handleRecover = async () => {
    if (!passkeyConnector && !E2E_MOCK_AUTH) {
      setError("Passkey connector unavailable.");
      return;
    }

    setError(null);
    setResult(null);
    setIsRecovering(true);

    try {
      if (E2E_MOCK_AUTH) {
        const fallbackAddress = typeof window !== "undefined" ? window.localStorage.getItem(LAST_ADDRESS_KEY) : null;
        if (fallbackAddress && typeof window !== "undefined") {
          window.localStorage.setItem(WALLET_CREATED_FLAG, "1");
          window.localStorage.setItem(LAST_ADDRESS_KEY, fallbackAddress);
          window.localStorage.setItem(
            "fluxus-session-storage",
            JSON.stringify({
              state: {
                sessions: [
                  {
                    id: `mock-session-${Date.now()}`,
                    rootAddress: fallbackAddress,
                    accessPrivateKey: "0x",
                    accessKeyAddress: fallbackAddress,
                    createdAtMs: Date.now(),
                    expiresAtSec: Math.floor(Date.now() / 1000) + 3600,
                    spendLimit: "25000000",
                    spent: "0",
                    allowedRecipients: [],
                    keyAuthorization: null,
                  },
                ],
              },
            }),
          );
        }
      } else {
        if (!passkeyConnector) {
          setError("Passkey connector unavailable.");
          return;
        }
        await connectAccount(config, {
          connector: passkeyConnector,
          capabilities: { type: "sign-in" },
        });

        await createSession({
          durationMinutes: 60,
          spendLimits: new Map([["0x20c0000000000000000000000000000000000000" as `0x${string}`, parseUnits("25", PATHUSD_DECIMALS)]]),
          allowedRecipients: [],
        });
      }

      setResult("Recovery complete. New session keys were created.");
      window.location.assign("/app");
    } catch (recoverError) {
      const message =
        recoverError instanceof Error
          ? recoverError.message.split("\n")[0]
          : "Recovery failed. Please retry with your backup passkey.";
      setError(message);
    } finally {
      setIsRecovering(false);
    }
  };

  if (!PASSKEY_RECOVERY_ENABLED) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
        <section className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">Account Recovery</p>
          <h1 className="mt-2 text-xl font-semibold text-[--text-primary]">Feature not enabled</h1>
          <p className="mt-2 text-sm text-[--text-secondary]">
            Enable <code>NEXT_PUBLIC_FF_PASSKEY_RECOVERY=1</code> to open recovery flow.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8 sm:py-10" data-testid="recovery-flow-page">
      <section className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">Account Recovery</p>
        <h1 className="mt-2 text-xl font-semibold text-[--text-primary]">Recover access on this device</h1>
        <p className="mt-2 text-sm text-[--text-secondary]">
          Authenticate with any registered passkey, then new session keys will be created automatically.
        </p>
      </section>

      <section className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6" data-testid="recovery-status">
        <p className="text-sm text-[--text-secondary]">
          Active credential on device: <span className="font-semibold">{hasLocalCredential ? "Yes" : "No"}</span>
        </p>
        <p className="mt-1 text-sm text-[--text-secondary]">
          Session keys on device: <span className="font-semibold">{hasLocalSession ? "Yes" : "No"}</span>
        </p>
        <p className="mt-3 text-sm text-[--text-secondary]">
          {recoveryNeeded
            ? "No active credential or session detected. Start recovery with your backup passkey."
            : "This device already has active credentials and session keys. Recovery is optional."}
        </p>
      </section>

      <section className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6">
        <button
          className="inline-flex h-11 items-center rounded-xl bg-[--brand-primary] px-4 text-sm font-semibold text-[--text-inverse] disabled:opacity-60"
          disabled={isRecovering}
          onClick={() => void handleRecover()}
          type="button"
          data-testid="recover-with-passkey"
        >
          {isRecovering ? "Authenticating..." : "Recover with Passkey"}
        </button>

        {error ? (
          <p className="mt-3 rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
            {error}
          </p>
        ) : null}

        {result ? (
          <p className="mt-3 rounded-lg border border-[--status-success-border] bg-[--status-success-bg] px-3 py-2 text-xs text-[--status-success-text]">
            {result}
          </p>
        ) : null}

        <Link href="/" className="mt-3 inline-flex text-sm text-[--brand-primary] hover:underline">
          Back to landing
        </Link>
      </section>
    </main>
  );
}
