"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { SessionKeys } from "@/components/SessionKeys";
import { TransferForm } from "@/components/TransferForm";
import { TransactionHistory } from "@/components/TransactionHistory";
import { formatAddress } from "@/lib/utils";

const E2E_MOCK_AUTH = process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === "1";

export default function AppPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  const authBootstrapReady = !E2E_MOCK_AUTH || typeof window !== "undefined";
  const mockAddress =
    E2E_MOCK_AUTH && typeof window !== "undefined" && window.localStorage.getItem("tempo.walletCreated") === "1"
      ? window.localStorage.getItem("tempo.lastAddress") || ""
      : "";
  const hasMockConnection = E2E_MOCK_AUTH && Boolean(mockAddress);
  const effectiveAddress = address ?? (hasMockConnection ? mockAddress : "");

  const shortAddress = useMemo(() => {
    if (!effectiveAddress) return "";
    return formatAddress(effectiveAddress, 6, 4);
  }, [effectiveAddress]);

  useEffect(() => {
    if (authBootstrapReady && !isConnected && !hasMockConnection) {
      router.push("/");
    }
  }, [authBootstrapReady, hasMockConnection, isConnected, router]);

  if (!authBootstrapReady || (!isConnected && !hasMockConnection) || !effectiveAddress) {
    return null;
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(effectiveAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const handleDisconnect = () => {
    if (isConnected) {
      disconnect();
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("tempo.walletCreated");
      window.localStorage.removeItem("tempo.lastAddress");
      window.localStorage.removeItem("wagmi.webAuthn.activeCredential");
      window.localStorage.removeItem("wagmi.webAuthn.lastActiveCredential");
    }
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <div className="mx-auto w-full max-w-5xl space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Tempo Moderato Testnet
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.45rem]">Wallet Dashboard</h1>
          <p className="text-base leading-7 text-slate-600">Send pathUSD with sponsored fees and passkey security.</p>
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            Stablecoin transfers with instant finality
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Account</p>
            <div className="space-y-2">
              <p className="font-mono text-base font-medium text-slate-800" title={effectiveAddress}>
                {shortAddress}
              </p>
              <p className="text-sm text-slate-600">Stay signed in to keep reconnecting with this address.</p>
            </div>

            <button
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
              onClick={handleDisconnect}
              type="button"
            >
              Disconnect Wallet
            </button>
            <p className="text-xs text-slate-500">Disconnect logs you out and clears the active session on this device.</p>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] lg:col-span-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Receive</p>
              <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">Wallet Address</span>
            </div>
            <p className="font-mono text-sm text-slate-900 break-all rounded-xl border border-slate-200 bg-white px-3 py-3" title={effectiveAddress}>
              {effectiveAddress}
            </p>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                className="h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
                onClick={() => void handleCopyAddress()}
                type="button"
              >
                {copied ? "Copied Address" : "Copy Address"}
              </button>
              <span className="text-xs text-slate-500 break-all">{shortAddress}</span>
            </div>
            <p className="text-xs text-slate-600">
              This is your wallet address. Send tokens here from MetaMask or faucet.
            </p>
            <a
              href="https://docs.tempo.xyz/quickstart/faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              Get testnet tokens
            </a>
          </section>

          <SessionKeys />

          <div className="lg:col-span-4">
            <BalanceDisplay />
          </div>

          <div className="lg:col-span-12">
            <TransferForm />
          </div>

          <section className="lg:col-span-12">
            <TransactionHistory />
          </section>
        </div>
      </div>
    </main>
  );
}
