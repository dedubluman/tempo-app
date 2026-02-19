"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { connect as connectAccount } from "@wagmi/core";
import { useAccount, useDisconnect } from "wagmi";
import { config } from "@/lib/config";
import {
  getActiveCredentialId,
  getMappedAddress,
  getServerMappedAddress,
  hasAnyServerWalletMappings,
  hasAnyWalletMappings,
  saveServerWalletMapping,
  saveWalletMapping,
} from "@/lib/passkeyRegistry";
import { formatAddress } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ConfirmationSheet } from "@/components/ui/ConfirmationSheet";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, KeyRound } from "lucide-react";

const WALLET_CREATED_FLAG = "tempo.walletCreated";
const LAST_ADDRESS_KEY = "tempo.lastAddress";
const ACTIVE_CREDENTIAL_KEY = "wagmi.webAuthn.activeCredential";

interface AuthSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthSheet({ open, onClose, onSuccess }: AuthSheetProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [supportsWebAuthn, setSupportsWebAuthn] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [hasWalletHistory, setHasWalletHistory] = useState(false);
  const [mappedAddress, setMappedAddress] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const passkeyConnector = useMemo(
    () => config.connectors.find((c) => c.id === "webAuthn"),
    []
  );

  useEffect(() => {
    if (!open) return;
    let active = true;

    const bootstrap = async () => {
      if (typeof window === "undefined") return;
      setSupportsWebAuthn(window.PublicKeyCredential !== undefined);

      const walletCreated = window.localStorage.getItem(WALLET_CREATED_FLAG) === "1";
      const hasCredential = window.localStorage.getItem("wagmi.webAuthn.activeCredential") !== null
        || window.localStorage.getItem("wagmi.webAuthn.lastActiveCredential") !== null;
      const hasKeyManager = Object.keys(window.localStorage).some((k) => k.startsWith("wagmi.keyManager."));

      let hasRegistry = false;
      let hasServerRegistry = false;
      let restoredAddress: string | null = null;

      try {
        hasRegistry = await hasAnyWalletMappings();
        hasServerRegistry = await hasAnyServerWalletMappings();
        const credentialId = getActiveCredentialId();
        if (credentialId) {
          const serverAddress = await getServerMappedAddress(credentialId);
          restoredAddress = serverAddress || (await getMappedAddress(credentialId));
        }
      } catch {
        hasRegistry = false;
        hasServerRegistry = false;
      }

      if (!active) return;

      if (restoredAddress) {
        setMappedAddress(restoredAddress);
        try {
          if (!window.localStorage.getItem(LAST_ADDRESS_KEY)) {
            window.localStorage.setItem(LAST_ADDRESS_KEY, restoredAddress);
          }
        } catch (_) {}
      }

      setHasWalletHistory(
        walletCreated || hasCredential || hasKeyManager || hasRegistry || hasServerRegistry || Boolean(restoredAddress)
      );
    };

    void bootstrap();
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!isConnected || !address) return;
    try {
      window.localStorage.setItem(WALLET_CREATED_FLAG, "1");
      window.localStorage.setItem(LAST_ADDRESS_KEY, address);
    } catch (_) {}

    setMappedAddress(address);
    setHasWalletHistory(true);

    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/app");
    }
  }, [address, isConnected, router, onSuccess]);

  const getErrorMessage = (mode: "sign-up" | "sign-in", error: unknown) => {
    if (!(error instanceof Error)) return "Authentication failed. Try again.";
    const message = error.message;
    const lower = message.toLowerCase();
    if (lower.includes("notallowederror"))
      return mode === "sign-in"
        ? "Passkey request was cancelled. Tap Sign In again and select your original passkey."
        : "Passkey creation was cancelled. No wallet was created.";
    if (lower.includes("publickey not found") || lower.includes("credential not found"))
      return "This device cannot find the saved key. If storage was cleared, use your original device or create a new wallet.";
    if (lower.includes("invalidstateerror"))
      return "That passkey is already registered. Use Sign In to reconnect your wallet.";
    return message.split("\n")[0];
  };

  const handleConnect = async (mode: "sign-up" | "sign-in") => {
    if (!passkeyConnector) { setAuthMessage("Passkey connector unavailable."); return; }
    setAuthMessage(null);
    setIsPending(true);

    if (mode === "sign-in" && typeof window !== "undefined") {
      try { window.localStorage.removeItem(ACTIVE_CREDENTIAL_KEY); } catch (_) {}
    }

    try {
      await connectAccount(config, { connector: passkeyConnector, capabilities: { type: mode } });
      try { window.localStorage.setItem(WALLET_CREATED_FLAG, "1"); } catch (_) {}
      if (mode === "sign-up") setHasWalletHistory(true);
    } catch (error) {
      setAuthMessage(getErrorMessage(mode, error));
    } finally {
      setIsPending(false);
    }
  };

  const handleCreateWallet = async () => {
    let existingAddress = mappedAddress;
    if (typeof window !== "undefined") {
      if (!existingAddress) existingAddress = window.localStorage.getItem(LAST_ADDRESS_KEY);
      if (!existingAddress) {
        const credentialId = getActiveCredentialId();
        if (credentialId) {
          try {
            const serverAddress = await getServerMappedAddress(credentialId);
            existingAddress = serverAddress || (await getMappedAddress(credentialId));
          } catch { existingAddress = null; }
        }
      }
    }

    const msg = existingAddress
      ? `Current wallet ${formatAddress(existingAddress, 8, 6)} is available. Cancel to keep it and Sign In instead. OK to create a NEW address.`
      : "Create Wallet always creates a NEW wallet address. Continue only if you want a different address.";

    setConfirmMessage(msg);
    setPendingAction(() => async () => {
      await handleConnect("sign-up");
    });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    if (pendingAction) await pendingAction();
  };

  const handleConfirmCancel = async () => {
    setConfirmOpen(false);
    if (mappedAddress) await handleConnect("sign-in");
  };

  if (!supportsWebAuthn) {
    return (
      <BottomSheet open={open} onClose={onClose} title="Connect Wallet">
        <p className="text-sm text-[--status-warning-text] bg-[--status-warning-bg] rounded-[--radius-md] px-3 py-2">
          Unsupported browser. Use Chrome or Safari.
        </p>
      </BottomSheet>
    );
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Connect Wallet">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-12 h-12 rounded-[--radius-xl] flex items-center justify-center" style={{ background: "var(--gradient-flux)" }}>
              <KeyRound size={22} className="text-white" />
            </div>
            <p className="text-[--text-secondary] text-sm text-center">
              {hasWalletHistory ? "Welcome back. Use your passkey to continue." : "Create a new wallet secured by your device passkey."}
            </p>
          </div>

          {isConnected && address ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[--text-secondary]">Connected as <span className="font-mono">{formatAddress(address, 8, 6)}</span></p>
              <Button variant="secondary" onClick={() => disconnect()} data-testid="auth-signout">Sign Out</Button>
            </div>
          ) : hasWalletHistory ? (
            <div className="flex flex-col gap-3">
              <Button loading={isPending} onClick={() => void handleConnect("sign-in")} data-testid="auth-signin">
                {isPending ? "Waiting for passkey…" : "Sign In"}
              </Button>
              <Button variant="secondary" disabled={isPending} onClick={() => void handleCreateWallet()} data-testid="auth-create-new">
                Create New Wallet
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button loading={isPending} onClick={() => void handleCreateWallet()} data-testid="auth-create">
                {isPending ? "Waiting for passkey…" : "Create Wallet"}
              </Button>
              <Button variant="secondary" disabled={isPending} onClick={() => void handleConnect("sign-in")} data-testid="auth-have-wallet">
                I Already Have a Wallet
              </Button>
            </div>
          )}

          {authMessage && (
            <p className="text-sm text-[--status-error-text] bg-[--status-error-bg] rounded-[--radius-md] px-3 py-2">
              {authMessage}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-[--text-muted] border-t border-[--border-subtle] pt-3">
            <ShieldCheck size={13} className="flex-shrink-0" />
            <span>Your passkey is stored for this domain only. No passwords needed.</span>
          </div>
        </div>
      </BottomSheet>

      <ConfirmationSheet
        open={confirmOpen}
        title="Create New Wallet?"
        message={confirmMessage}
        confirmLabel="Create New"
        cancelLabel={mappedAddress ? "Sign In Instead" : "Cancel"}
        onConfirm={() => void handleConfirm()}
        onCancel={() => void handleConfirmCancel()}
        variant="danger"
      />
    </>
  );
}
