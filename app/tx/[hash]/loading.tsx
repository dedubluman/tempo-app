export default function TxLoadingPage() {
  return (
    <main className="min-h-screen bg-[--bg-base] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3 rounded-2xl border border-[--border-default] bg-[--bg-elevated] p-4 text-sm text-[--text-tertiary] sm:p-6">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[--border-default] border-t-[--text-secondary]" />
          Loading transaction...
        </div>
      </div>
    </main>
  );
}
