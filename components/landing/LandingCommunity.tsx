import Link from "next/link";
import { Github, BookOpen, Globe } from "lucide-react";

const links = [
  { icon: Github, label: "GitHub", href: "https://github.com/dedubluman/tempo-app", external: true },
  { icon: BookOpen, label: "Docs", href: "/docs", external: false },
  { icon: Globe, label: "Tempo Network", href: "https://tempo.xyz", external: true },
];

export function LandingCommunity() {
  return (
    <section className="py-20 px-4 bg-[--bg-subtle]">
      <div className="max-w-3xl mx-auto text-center flex flex-col gap-8">
        <h2 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">
          Part of the Tempo ecosystem
        </h2>
        <p className="text-[--text-secondary]">
          Fluxus is an open-source application built on the Tempo testnet. Explore the code, read the docs, or connect with the Tempo community.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {links.map(({ icon: Icon, label, href, external }) =>
            external ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-[--radius-lg] border border-[--border-default] bg-[--bg-surface] text-sm text-[--text-primary] font-medium hover:bg-[--bg-elevated] transition-colors"
              >
                <Icon size={16} />
                {label}
              </a>
            ) : (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[--radius-lg] border border-[--border-default] bg-[--bg-surface] text-sm text-[--text-primary] font-medium hover:bg-[--bg-elevated] transition-colors"
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  );
}
