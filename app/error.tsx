"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Warning } from "@phosphor-icons/react";

type ErrorPageProps = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="min-h-screen bg-[--bg-base] flex items-center justify-center px-4">
      <div className="max-w-md w-full flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-[--radius-2xl] bg-[--status-error-bg] flex items-center justify-center text-[--status-error-text]">
          <Warning size={28} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[--text-primary] font-[--font-display]">Something went wrong</h1>
          <p className="text-sm text-[--text-secondary]">{error.message || "An unexpected error occurred while loading this page."}</p>
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="secondary" className="flex-1" onClick={() => reset()} data-testid="error-retry">Try Again</Button>
          <Link href="/app" className="flex-1">
            <Button className="w-full" data-testid="error-home">Go to Wallet</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
