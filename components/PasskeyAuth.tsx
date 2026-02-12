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

const WALLET_CREATED_FLAG = "tempo.walletCreated";
const LAST_ADDRESS_KEY = "tempo.lastAddress";
const ACTIVE_CREDENTIAL_KEY = "wagmi.webAuthn.activeCredential";

const SIGN_IN_HELP =
  "Use the same passkey to keep using your existing wallet address.";
const CREATE_WARNING =
  "Create Wallet registers a new passkey credential and creates a NEW wallet address.";

export function PasskeyAuth() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [supportsWebAuthn, setSupportsWebAuthn] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [hasWalletHistory, setHasWalletHistory] = useState(false);
  const [mappedAddress, setMappedAddress] = useState<string | null>(null);

  const shortAddress = useMemo(() => {
    if (!address) return "";
    return formatAddress(address, 8, 6);
  }, [address]);

  const passkeyConnector = useMemo(
    () => config.connectors.find((connector) => connector.id === "webAuthn"),
    [],
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      if (typeof window === "undefined") {
        return;
      }

      setSupportsWebAuthn(window.PublicKeyCredential !== undefined);

      const walletCreated = window.localStorage.getItem(WALLET_CREATED_FLAG) === "1";
      const hasCredentialInStorage =
        window.localStorage.getItem("wagmi.webAuthn.activeCredential") !== null ||
        window.localStorage.getItem("wagmi.webAuthn.lastActiveCredential") !== null;
      const hasKeyManagerEntries = Object.keys(window.localStorage).some((key) =>
        key.startsWith("wagmi.keyManager."),
      );

      let hasRegistryHistory = false;
      let hasServerRegistryHistory = false;
      let restoredAddress: string | null = null;

      try {
        hasRegistryHistory = await hasAnyWalletMappings();
        hasServerRegistryHistory = await hasAnyServerWalletMappings();

        const credentialId = getActiveCredentialId();
        if (credentialId) {
          const serverAddress = await getServerMappedAddress(credentialId);
          restoredAddress = serverAddress || (await getMappedAddress(credentialId));
        }
      } catch {
        hasRegistryHistory = false;
        hasServerRegistryHistory = false;
        restoredAddress = null;
      }

      if (!active) {
        return;
      }

      if (restoredAddress) {
        setMappedAddress(restoredAddress);
        try {
          if (!window.localStorage.getItem(LAST_ADDRESS_KEY)) {
            window.localStorage.setItem(LAST_ADDRESS_KEY, restoredAddress);
          }
        } catch {
          // Ignore storage failures in restricted environments.
        }
      }

      setHasWalletHistory(
        walletCreated ||
          hasCredentialInStorage ||
          hasKeyManagerEntries ||
          hasRegistryHistory ||
          hasServerRegistryHistory ||
          Boolean(restoredAddress),
      );
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const connectedAddress = address;

    if (!isConnected || !connectedAddress) {
      return;
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(WALLET_CREATED_FLAG, "1");
        window.localStorage.setItem(LAST_ADDRESS_KEY, connectedAddress);
      } catch {
        // Ignore storage failures in restricted environments.
      }

      const activeCredential = getActiveCredentialId();
      if (activeCredential) {
        void saveWalletMapping(activeCredential, connectedAddress);
        void saveServerWalletMapping(activeCredential, connectedAddress);
      }
    }

    setMappedAddress(connectedAddress);
    setHasWalletHistory(true);
    router.push("/app");
  }, [address, isConnected, router]);

  const getErrorMessage = (mode: "sign-up" | "sign-in", error: unknown) => {
    if (!(error instanceof Error)) {
      return "Authentication failed. Try again.";
    }

    const message = error.message;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("notallowederror")) {
      return mode === "sign-in"
        ? "Passkey request was cancelled. Tap Sign In again and select your original passkey."
        : "Passkey creation was cancelled. No wallet was created.";
    }

    if (lowerMessage.includes("publickey not found") || lowerMessage.includes("credential not found")) {
      return "This device cannot find the saved key for that passkey. If storage was cleared, use your original device or create a new wallet address.";
    }

    if (lowerMessage.includes("invalidstateerror")) {
      return "That passkey is already registered on this device. Use Sign In to reconnect your wallet.";
    }

    return message.split("\n")[0];
  };

  const handleConnect = async (mode: "sign-up" | "sign-in") => {
    if (!passkeyConnector) {
      setAuthMessage("Passkey connector unavailable.");
      return;
    }

    setAuthMessage(null);
    setIsPending(true);

    if (mode === "sign-in" && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(ACTIVE_CREDENTIAL_KEY);
      } catch {
        // Ignore storage failures in restricted environments.
      }
    }

    try {
      await connectAccount(config, {
        connector: passkeyConnector,
        capabilities: { type: mode },
      });

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(WALLET_CREATED_FLAG, "1");
        } catch {
          // Ignore storage failures in restricted environments.
        }
      }

      if (mode === "sign-up") {
        setHasWalletHistory(true);
      }
    } catch (error) {
      setAuthMessage(getErrorMessage(mode, error));
    } finally {
      setIsPending(false);
    }
  };

  const handleCreateWallet = async () => {
    let existingAddress = mappedAddress;

    if (typeof window !== "undefined") {
      if (!existingAddress) {
        existingAddress = window.localStorage.getItem(LAST_ADDRESS_KEY);
      }

      if (!existingAddress) {
        const activeCredential = getActiveCredentialId();
        if (activeCredential) {
          try {
            const serverAddress = await getServerMappedAddress(activeCredential);
            existingAddress = serverAddress || (await getMappedAddress(activeCredential));
          } catch {
            existingAddress = null;
          }
        }
      }

      const accepted = window.confirm(
        existingAddress
          ? `Current wallet ${formatAddress(existingAddress, 8, 6)} is available. Press Cancel to keep it and continue with Sign In. Press OK only to create a NEW address.`
          : "Create Wallet always creates a NEW wallet address. Continue only if you want a different address.",
      );

      if (!accepted) {
        if (existingAddress) {
          await handleConnect("sign-in");
        }
        return;
      }
    }

    await handleConnect("sign-up");
  };

  if (!supportsWebAuthn) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
        Unsupported browser, use Chrome/Safari.
      </div>
    );
  }

  if (!passkeyConnector) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
        Passkey connector unavailable.
      </div>
    );
  }

  if (isConnected && address) {
    const lastAddress =
      typeof window !== "undefined" ? window.localStorage.getItem(LAST_ADDRESS_KEY) : null;

    return (
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Active Wallet</p>
          <p className="font-mono text-sm font-medium text-slate-700" title={address}>
            {shortAddress}
          </p>
          <p className="font-mono text-xs text-slate-500" title={address}>
            {address}
          </p>
          {lastAddress && lastAddress.toLowerCase() !== address.toLowerCase() ? (
            <p className="text-xs text-amber-700">
              You are connected with a different address than your last session.
            </p>
          ) : null}
        </div>
        <button
          className="h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.2)] transition-all duration-200 hover:bg-slate-800 active:translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
          onClick={() => disconnect()}
          type="button"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {hasWalletHistory ? "Welcome back" : "New wallet setup"}
        </p>
        <p className="text-sm text-slate-700">
          {hasWalletHistory ? SIGN_IN_HELP : "Create Wallet once, then use Sign In for future sessions."}
        </p>
      </div>

      {hasWalletHistory ? (
        <div className="space-y-3">
          <button
            className="h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.2)] transition-all duration-200 hover:bg-slate-800 active:translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            disabled={isPending}
            onClick={() => void handleConnect("sign-in")}
            type="button"
          >
            {isPending ? "Waiting for passkey..." : "Sign In"}
          </button>
          <button
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 active:translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            disabled={isPending}
            onClick={() => void handleCreateWallet()}
            type="button"
          >
            Create New Wallet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            className="h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.2)] transition-all duration-200 hover:bg-slate-800 active:translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            disabled={isPending}
            onClick={() => void handleCreateWallet()}
            type="button"
          >
            {isPending ? "Waiting for passkey..." : "Create Wallet"}
          </button>
          <button
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 active:translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            disabled={isPending}
            onClick={() => void handleConnect("sign-in")}
            type="button"
          >
            I Already Have a Wallet
          </button>
        </div>
      )}

      <div className="space-y-2 border-t border-slate-200/80 pt-3">
        <p className="text-xs text-slate-500">Your passkey is stored for this domain only.</p>
        {hasWalletHistory ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {CREATE_WARNING}
          </p>
        ) : null}
      </div>

      {authMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {authMessage}
        </p>
      ) : null}
    </div>
  );
}
