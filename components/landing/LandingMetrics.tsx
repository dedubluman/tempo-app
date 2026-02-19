const metrics = [
  { value: "< 0.5s", label: "Transaction Finality", sublabel: "Faster than a credit card swipe" },
  { value: "$0", label: "Gas Fees", sublabel: "Sponsored for all transfers" },
  { value: "6", label: "Decimal Precision", sublabel: "pathUSD stablecoin accuracy" },
  { value: "100%", label: "Passkey Auth", sublabel: "No passwords, no seed phrases" },
];

export function LandingMetrics() {
  return (
    <section className="py-16 px-4 border-y border-[--border-subtle]">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {metrics.map(({ value, label, sublabel }) => (
          <div key={label} className="flex flex-col gap-1 text-center md:text-left">
            <span className="text-3xl font-bold text-[--brand-primary] font-[--font-display]">{value}</span>
            <span className="text-sm font-semibold text-[--text-primary]">{label}</span>
            <span className="text-xs text-[--text-muted]">{sublabel}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
