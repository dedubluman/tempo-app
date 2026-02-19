import { ShieldCheck, DollarSign, Globe, Code } from "lucide-react";

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Passkey Security",
    description: "WebAuthn passkeys are cryptographically bound to your device. No passwords to steal, no seed phrases to lose.",
  },
  {
    icon: DollarSign,
    title: "Sponsored Gas",
    description: "Every transfer is gas-sponsored by the Tempo fee sponsorship system. You never pay transaction fees.",
  },
  {
    icon: Globe,
    title: "Tempo Blockchain",
    description: "Built on Tempo — an EVM-compatible chain with native stablecoin support, sub-second finality, and passkey auth.",
  },
  {
    icon: Code,
    title: "Open Source",
    description: "Fluxus is fully open source. Inspect the code, verify the logic, and contribute on GitHub.",
  },
];

export function LandingSecurity() {
  return (
    <section id="security" className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[--text-primary] font-[--font-display] mb-3">
            Built for trust
          </h2>
          <p className="text-[--text-secondary] max-w-lg mx-auto">
            Security and transparency are non-negotiable. Here&apos;s what protects your funds.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {trustItems.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4 p-5 rounded-[--radius-xl] border border-[--border-subtle] bg-[--bg-surface]">
              <div className="w-10 h-10 rounded-[--radius-lg] bg-[--brand-subtle] flex items-center justify-center text-[--brand-primary] flex-shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-[--text-primary] mb-1">{title}</h3>
                <p className="text-sm text-[--text-secondary] leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
