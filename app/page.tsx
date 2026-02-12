"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { PasskeyAuth } from "@/components/PasskeyAuth";

export default function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [hasWalletHistory] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const hasCredentialInStorage =
      window.localStorage.getItem("wagmi.webAuthn.activeCredential") !== null ||
      window.localStorage.getItem("wagmi.webAuthn.lastActiveCredential") !== null;
    const hasKeyManagerEntries = Object.keys(window.localStorage).some((key) =>
      key.startsWith("wagmi.keyManager."),
    );
    const walletCreated = window.localStorage.getItem("tempo.walletCreated") === "1";

    return hasCredentialInStorage || hasKeyManagerEntries || walletCreated;
  });

  useEffect(() => {
    if (isConnected) {
      router.push("/app");
    }
  }, [isConnected, router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-6 py-16">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/25 blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-teal-300/20 blur-2xl" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Tempo Moderato Testnet
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-[2.65rem]">
            Passkey P2P Wallet
          </h1>
          <p className="mx-auto max-w-sm text-base leading-7 text-slate-600">
            Sign in with biometrics and send pathUSD with gas sponsorship.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 backdrop-blur">
              Passkey-only auth
            </span>
            <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
              Gas sponsored
            </span>
          </div>
        </div>
        <PasskeyAuth />
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {hasWalletHistory ? "Returning user" : "First-time setup"}
          </p>
          <p className="mt-1">
            {hasWalletHistory
              ? "Use Sign In with your existing passkey to reconnect the same address."
              : "Create Wallet once to generate your address, then use Sign In for future sessions."}
          </p>
        </div>
      </div>
    </main>
  );
}
