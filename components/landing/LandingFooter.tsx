"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FluxusLogo } from "@/components/ui/FluxusLogo";
import { useMotionSafe } from "@/lib/motion";

const productLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
];

const developerLinks = [
  { label: "Docs", href: "/docs", isRoute: true },
  {
    label: "GitHub",
    href: "https://github.com/dedubluman/tempo-app",
    external: true,
  },
  { label: "Explorer", href: "https://explore.tempo.xyz", external: true },
  { label: "Tempo Network", href: "https://tempo.xyz", external: true },
];

const legalLinks = [
  { label: "Terms", href: "#terms" },
  { label: "Privacy", href: "#privacy" },
  { label: "Cookies", href: "#cookies" },
];

export function LandingFooter() {
  const variants = useMotionSafe();

  return (
    <motion.footer
      variants={variants.fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      className="border-t border-[--border-subtle] py-12 px-4"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand column */}
        <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
          <FluxusLogo size="sm" showText />
          <p className="text-xs text-[--text-muted] max-w-[24ch]">
            Stablecoin-native payments on Tempo blockchain.
          </p>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[--text-muted] px-2 py-1 rounded-full border border-[--border-glass] bg-[--bg-glass] w-fit">
            Open source · Testnet only
          </span>
        </div>

        {/* Product column */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider mb-1">
            Product
          </span>
          {productLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm text-[--text-secondary] hover:text-[--brand-primary] transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Developer column */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider mb-1">
            Developers
          </span>
          {developerLinks.map(({ label, href, isRoute, external }) =>
            isRoute ? (
              <Link
                key={label}
                href={href}
                className="text-sm text-[--text-secondary] hover:text-[--brand-primary] transition-colors"
              >
                {label}
              </Link>
            ) : (
              <a
                key={label}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="text-sm text-[--text-secondary] hover:text-[--brand-primary] transition-colors"
              >
                {label}
              </a>
            ),
          )}
        </div>

        {/* Legal column */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider mb-1">
            Legal
          </span>
          {legalLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm text-[--text-secondary] hover:text-[--brand-primary] transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-[--border-subtle] text-center">
        <p className="text-xs text-[--text-muted]">
          © {new Date().getFullYear()} Fluxus. Built on Tempo.
        </p>
      </div>
    </motion.footer>
  );
}
