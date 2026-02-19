import { Send, QrCode, History, Key } from "lucide-react";

const features = [
  {
    icon: Send,
    title: "Instant Send",
    description: "Transfer pathUSD stablecoins to any Tempo address in under a second. Single or batch — up to 10 recipients at once.",
  },
  {
    icon: QrCode,
    title: "Easy Receive",
    description: "Share your wallet address or QR code. Funds arrive instantly with 6-decimal precision and zero fees.",
  },
  {
    icon: History,
    title: "Activity Feed",
    description: "Track every transfer with a clear activity timeline. View transaction details on the Tempo explorer.",
  },
  {
    icon: Key,
    title: "Session Keys",
    description: "Authorize spending policies for seamless transfers within defined limits — no passkey prompt every time.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[--text-primary] font-[--font-display] mb-3">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-[--text-secondary] max-w-xl mx-auto">
            A focused wallet built for fast stablecoin payments on Tempo.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-[--radius-xl] border border-[--border-subtle] bg-[--bg-surface] p-5 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-[--radius-lg] bg-[--brand-subtle] flex items-center justify-center text-[--brand-primary]">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-[--text-primary]">{title}</h3>
              <p className="text-sm text-[--text-secondary] leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
