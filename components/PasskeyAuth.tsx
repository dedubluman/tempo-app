"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { connect as connectAccount } from "@wagmi/core";
import { useAccount, useDisconnect } from "wagmi";
import { config } from "@/lib/config";

export function PasskeyAuth() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [supportsWebAuthn, setSupportsWebAuthn] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const shortAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }, [address]);

  const passkeyConnector = useMemo(
    () => config.connectors.find((connector) => connector.id === "webAuthn"),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setSupportsWebAuthn(window.PublicKeyCredential !== undefined);
  }, []);

  useEffect(() => {
    if (isConnected) {
      router.push("/app");
    }
  }, [isConnected, router]);

  const handleConnect = async (mode: "sign-up" | "sign-in") => {
    if (!passkeyConnector) {
      setAuthMessage("Passkey connector unavailable.");
      return;
    }

    setAuthMessage(null);
    setIsPending(true);

    try {
      await connectAccount(config, {
        connector: passkeyConnector,
        capabilities: { type: mode },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("NotAllowedError")) {
        setAuthMessage("Authentication cancelled");
      } else if (error instanceof Error) {
        setAuthMessage(error.message);
      } else {
        setAuthMessage("Authentication failed");
      }
    } finally {
      setIsPending(false);
    }
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
    return (
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Active Wallet</p>
          <p className="font-mono text-sm font-medium text-slate-700" title={address}>
            {shortAddress}
          </p>
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
      <div className="space-y-3">
        <button
          className="h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.2)] transition-all duration-200 hover:bg-slate-800 active:translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
          disabled={isPending}
          onClick={() => void handleConnect("sign-up")}
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
          Sign In
        </button>
      </div>

      <div className="border-t border-slate-200/80 pt-3">
        <p className="text-xs text-slate-500">Your passkey is stored for this domain only.</p>
      </div>

      {authMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {authMessage}
        </p>
      ) : null}
    </div>
  );
}
