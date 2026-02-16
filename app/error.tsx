"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-6">
          <p className="text-xl font-semibold tracking-tight text-rose-800">Page failed to load</p>
          <p className="text-sm text-rose-700">{error.message || "Unexpected error while loading this page."}</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 sm:w-auto"
          >
            Try Again
          </button>
          <Link
            href="/app"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition-all duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 sm:w-auto"
          >
            Go to Wallet
          </Link>
        </div>
      </div>
    </main>
  );
}
