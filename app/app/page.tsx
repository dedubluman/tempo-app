"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { TransferForm } from "@/components/TransferForm";

export default function AppPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  const shortAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
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
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
                  onClick={() => void handleCopyAddress()}
                  type="button"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <span className="text-xs text-slate-500">{address.slice(0, 10)}...</span>
              </div>
            </div>

            <button
              className="h-11 w-full rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
              onClick={() => disconnect()}
              type="button"
            >
              Disconnect
            </button>
          </section>

          <div className="lg:col-span-8">
            <BalanceDisplay />
          </div>

          <div className="lg:col-span-12">
            <TransferForm />
          </div>
        </div>
      </div>
    </main>
  );
}
