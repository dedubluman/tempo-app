export default function TxLoadingPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 sm:p-6">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          Loading transaction...
        </div>
      </div>
    </main>
  );
}
