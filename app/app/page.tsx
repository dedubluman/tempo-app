"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { TransferForm } from "@/components/TransferForm";
import { TransactionHistory } from "@/components/TransactionHistory";
import { formatAddress } from "@/lib/utils";

export default function AppPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  const shortAddress = useMemo(() => {
    if (!address) return "";
    return formatAddress(address, 6, 4);
  }, [address]);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  if (!isConnected || !address) {
    return null;
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 lg:py-16">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Tempo Moderato Testnet
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-[2.45rem]">Wallet Dashboard</h1>
          <p className="text-base leading-7 text-slate-600">Send pathUSD with sponsored fees and passkey security.</p>
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            Stablecoin transfers with instant finality
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Account</p>
            <div className="space-y-2">
              <p className="font-mono text-base font-medium text-slate-800" title={address}>
                {shortAddress}
              </p>
              <p className="text-sm text-slate-600">Stay signed in to keep reconnecting with this address.</p>
            </div>

            <button
              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
              onClick={() => disconnect()}
              type="button"
            >
              Disconnect Wallet
            </button>
            <p className="text-xs text-slate-500">Disconnect logs you out and clears the active session on this device.</p>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] lg:col-span-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Receive</p>
              <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">Wallet Address</span>
            </div>
            <p className="font-mono text-sm text-slate-900 break-all rounded-xl border border-slate-200 bg-white px-3 py-3" title={address}>
              {address}
            </p>
            <div className="flex items-center gap-3">
              <button
                className="h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
                onClick={() => void handleCopyAddress()}
                type="button"
              >
                {copied ? "Copied Address" : "Copy Address"}
              </button>
              <span className="text-xs text-slate-500">{shortAddress}</span>
            </div>
            <p className="text-xs text-slate-600">
              This is your wallet address. Send tokens here from MetaMask or faucet.
            </p>
            <a
              href="https://docs.tempo.xyz/quickstart/faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              Get testnet tokens
            </a>
          </section>

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
