import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[--bg-base] flex items-center justify-center px-4">
      <div className="max-w-md w-full flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-[--radius-2xl] bg-[--bg-elevated] flex items-center justify-center text-[--text-muted]">
          <SearchX size={28} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[--text-primary] font-[--font-display]">Page not found</h1>
          <p className="text-sm text-[--text-secondary]">The page you are looking for does not exist or has moved.</p>
        </div>
        <Link
          href="/app"
          className="inline-flex h-10 items-center justify-center px-5 rounded-[--radius-md] font-medium text-sm text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--gradient-btn-primary)" }}
          data-testid="notfound-home"
        >
          Go to Wallet
        </Link>
      </div>
    </main>
  );
}
