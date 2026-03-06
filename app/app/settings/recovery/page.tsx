"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { connect as connectAccount, getAccount } from "@wagmi/core";
import { useAccount } from "wagmi";
import { config } from "@/lib/config";
import { FeatureFlag, isFeatureEnabled } from "@/lib/featureFlags";
import {
  getActiveCredentialId,
  getBackupCredentialMetadata,
  saveBackupCredentialMetadata,
  saveServerWalletMapping,
  saveWalletMapping,
  type BackupCredentialMetadata,
} from "@/lib/passkeyRegistry";
import { formatAddress } from "@/lib/utils";

type EnrollmentStep = 1 | 2 | 3 | 4 | 5;

const PASSKEY_RECOVERY_ENABLED = isFeatureEnabled(FeatureFlag.PASSKEY_RECOVERY);
const E2E_MOCK_AUTH = process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === "1";
const WALLET_CREATED_FLAG = "tempo.walletCreated";
const LAST_ADDRESS_KEY = "tempo.lastAddress";

export default function RecoverySettingsPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<EnrollmentStep>(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] =
    useState<BackupCredentialMetadata | null>(null);
  const [existingBackups, setExistingBackups] = useState<
    BackupCredentialMetadata[]
  >([]);

  const mockAddress =
    E2E_MOCK_AUTH &&
    typeof window !== "undefined" &&
    window.localStorage.getItem(WALLET_CREATED_FLAG) === "1"
      ? window.localStorage.getItem(LAST_ADDRESS_KEY) || ""
      : "";
  const effectiveAddress =
    address ?? (mockAddress ? (mockAddress as `0x${string}`) : undefined);
  const hasActiveWallet =
    (isConnected && Boolean(address)) || Boolean(mockAddress);

  const passkeyConnector = useMemo(
    () => config.connectors.find((connector) => connector.id === "webAuthn"),
    [],
  );

  useEffect(() => {
    if (!effectiveAddress) {
      setExistingBackups([]);
      return;
    }

    setExistingBackups(getBackupCredentialMetadata(effectiveAddress));
  }, [effectiveAddress]);

  const handleRegisterBackup = async () => {
    if (!effectiveAddress) {
      return;
    }

    setError(null);
    setIsRegistering(true);

    const targetAddress = effectiveAddress;

    try {
      let credentialId: string | null = null;

      if (E2E_MOCK_AUTH) {
        credentialId = `mock-backup-${Date.now()}`;
      } else {
        if (!passkeyConnector) {
          setError("Passkey connector unavailable.");
          return;
        }

        await connectAccount(config, {
          connector: passkeyConnector,
          capabilities: { type: "sign-up" },
        });

        const connectedAddress = getAccount(config).address;
        if (
          !connectedAddress ||
          connectedAddress.toLowerCase() !== targetAddress.toLowerCase()
        ) {
          setError(
            "Backup passkey was not linked to the current wallet. Use the same account and try again.",
          );
          return;
        }

        credentialId = getActiveCredentialId();
      }

      if (!credentialId) {
        setError(
          "Backup passkey created but credential metadata could not be read.",
        );
        return;
      }

      await saveWalletMapping(credentialId, targetAddress);
      await saveServerWalletMapping(credentialId, targetAddress);
      await saveBackupCredentialMetadata(
        credentialId,
        targetAddress,
        "Backup device",
      );

      const backupRecords = getBackupCredentialMetadata(targetAddress);
      setExistingBackups(backupRecords);

      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(credentialId),
      );
      const credentialHash = btoa(
        String.fromCharCode(...new Uint8Array(hash)),
      ).slice(0, 16);
      setSavedRecord({
        credentialHash,
        accountAddress: targetAddress.toLowerCase(),
        label: "Backup device",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setStep(4);
    } catch (registrationError) {
      const message =
        registrationError instanceof Error
          ? registrationError.message.split("\n")[0]
          : "Backup registration failed.";
      setError(message);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!PASSKEY_RECOVERY_ENABLED) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <section className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
            Passkey Recovery
          </p>
          <h1 className="mt-2 text-xl font-semibold text-[--text-primary]">
            Feature not enabled
          </h1>
          <p className="mt-2 text-sm text-[--text-secondary]">
            Enable <code>NEXT_PUBLIC_FF_PASSKEY_RECOVERY=1</code> to use backup
            enrollment.
          </p>
        </section>
      </main>
    );
  }

  if (!hasActiveWallet || !effectiveAddress) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
        <section className="rounded-2xl border border-[--status-warning-border] bg-[--status-warning-bg] p-5 sm:p-6 text-[--status-warning-text]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">
            Passkey Recovery
          </p>
          <h1 className="mt-2 text-xl font-semibold">
            Connect your wallet first
          </h1>
          <p className="mt-2 text-sm">
            Backup enrollment requires an active session for your primary
            wallet.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-current px-4 text-sm font-semibold"
          >
            Go to sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main
      className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:py-10"
      data-testid="recovery-enrollment-page"
    >
      <section className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
          Passkey Recovery
        </p>
        <h1 className="mt-2 text-xl font-semibold text-[--text-primary]">
          Backup Passkey Enrollment
        </h1>
        <p className="mt-2 text-sm text-[--text-secondary]">
          Wallet{" "}
          <span className="font-mono">
            {formatAddress(effectiveAddress, 8, 6)}
          </span>
        </p>
      </section>

      <section
        className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6"
        data-testid="recovery-step-1"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
          Step 1
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[--text-primary]">
          Why a backup matters
        </h2>
        <p className="mt-2 text-sm text-[--text-secondary]">
          If your primary device is lost and no backup passkey exists, you can
          permanently lose wallet access and funds.
        </p>
        {step === 1 ? (
          <button
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-[--brand-primary] px-4 text-sm font-semibold text-[--text-inverse]"
            onClick={() => setStep(2)}
            type="button"
          >
            Continue
          </button>
        ) : null}
      </section>

      {step >= 2 ? (
        <section
          className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6"
          data-testid="recovery-step-2"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
            Step 2
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[--text-primary]">
            Prepare your backup device
          </h2>
          <p className="mt-2 text-sm text-[--text-secondary]">
            Use a second trusted authenticator such as a laptop passkey or
            hardware key before continuing.
          </p>
          {step === 2 ? (
            <button
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-[--brand-primary] px-4 text-sm font-semibold text-[--text-inverse]"
              onClick={() => setStep(3)}
              type="button"
            >
              Backup device is ready
            </button>
          ) : null}
        </section>
      ) : null}

      {step >= 3 ? (
        <section
          className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6"
          data-testid="recovery-step-3"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
            Step 3
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[--text-primary]">
            Register second passkey
          </h2>
          <p className="mt-2 text-sm text-[--text-secondary]">
            This uses the <span className="font-mono">webAuthn</span> connector
            and must resolve to your current wallet address.
          </p>
          <button
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-[--brand-primary] px-4 text-sm font-semibold text-[--text-inverse] disabled:opacity-60"
            disabled={isRegistering || (!passkeyConnector && !E2E_MOCK_AUTH)}
            onClick={() => void handleRegisterBackup()}
            type="button"
            data-testid="register-backup-passkey"
          >
            {isRegistering
              ? "Waiting for backup passkey..."
              : "Register Backup Passkey"}
          </button>
          {error ? (
            <p className="mt-3 rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}

      {step >= 4 ? (
        <section
          className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6"
          data-testid="recovery-step-4"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
            Step 4
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[--text-primary]">
            Backup metadata stored
          </h2>
          <p className="mt-2 text-sm text-[--text-secondary]">
            Backup credential metadata is saved in{" "}
            <span className="font-mono">passkeyRegistry</span> for this account.
          </p>
          <p className="mt-2 text-xs text-[--text-tertiary]">
            {savedRecord
              ? `Credential hash prefix: ${savedRecord.credentialHash}`
              : "Credential metadata saved for this wallet."}
          </p>
          <button
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-[--brand-primary] px-4 text-sm font-semibold text-[--text-inverse]"
            onClick={() => setStep(5)}
            type="button"
          >
            Continue to confirmation
          </button>
        </section>
      ) : null}

      {step >= 5 ? (
        <section
          className="rounded-2xl border border-[--status-success-border] bg-[--status-success-bg] p-5 sm:p-6"
          data-testid="recovery-step-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--status-success-text]">
            Step 5
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[--status-success-text]">
            Backup setup complete
          </h2>
          <p className="mt-2 text-sm text-[--status-success-text]">
            You can now test recovery by opening recovery mode on a device
            without the primary credential.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/recover"
              className="inline-flex h-11 items-center rounded-xl bg-[--brand-primary] px-4 text-sm font-semibold text-[--text-inverse]"
              data-testid="open-recovery-test"
            >
              Run Recovery Test
            </Link>
            <Link
              href="/app"
              className="inline-flex h-11 items-center rounded-xl border border-[--border-default] px-4 text-sm font-semibold text-[--text-primary]"
            >
              Back to app
            </Link>
          </div>
        </section>
      ) : null}

      <section
        className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-5 sm:p-6"
        data-testid="existing-backup-list"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--text-tertiary]">
          Registered backups
        </p>
        {existingBackups.length === 0 ? (
          <p className="mt-2 text-sm text-[--text-secondary]">
            No backup metadata saved yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-[--text-secondary]">
            {existingBackups.map((record) => (
              <li
                key={record.credentialHash}
                className="rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 py-2"
              >
                <p className="font-mono text-xs">{record.credentialHash}</p>
                <p className="text-xs">{record.label ?? "Backup credential"}</p>
                <p className="text-xs">
                  Saved {new Date(record.updatedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
