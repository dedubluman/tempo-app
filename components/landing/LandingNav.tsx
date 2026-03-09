"use client";

import { useState } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { useAccount } from "wagmi";
import { List, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { FluxusLogo } from "@/components/ui/FluxusLogo";
import { useMagneticHover } from "@/lib/motion";

interface LandingNavProps {
  onAuthClick?: () => void;
}

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "Docs", href: "/docs", isRoute: true },
];

function NavLink({
  href,
  isRoute,
  children,
}: {
  href: string;
  isRoute?: boolean;
  children: React.ReactNode;
}) {
  const inner = (
    <span className="relative py-1 group/link">
      {children}
      <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-[--brand-primary] transition-transform duration-300 group-hover/link:scale-x-100" />
    </span>
  );

  if (isRoute) {
    return (
      <Link
        href={href}
        className="text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
      >
        {inner}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className="text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors"
    >
      {inner}
    </a>
  );
}

export function LandingNav({ onAuthClick }: LandingNavProps) {
  const { isConnected } = useAccount();
  const [mockConnected] = useState(() => {
    if (process.env.NEXT_PUBLIC_E2E_MOCK_AUTH !== "1") return false;
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem("tempo.walletCreated") === "1" &&
      Boolean(window.localStorage.getItem("tempo.lastAddress"))
    );
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const connected = isConnected || mockConnected;

  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 100], [0.6, 0.85]);
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  const magnetic = useMagneticHover(0.15);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        className="fixed top-0 inset-x-0 z-30 backdrop-blur-xl"
        style={{
          backgroundColor: `rgba(10, 15, 13, ${bgOpacity.get()})`,
        }}
      >
        <motion.div
          className="absolute bottom-0 inset-x-0 h-px bg-[--border-glass]"
          style={{ opacity: borderOpacity }}
        />

        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo — left */}
          <FluxusLogo size="sm" showText />

          {/* Links — center (desktop) */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                href={link.href}
                isRoute={link.isRoute}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* CTA — right */}
          <div className="flex items-center gap-3">
            {connected ? (
              <Link href="/app">
                <motion.div style={{ x: magnetic.x, y: magnetic.y }} {...magnetic.handlers}>
                  <Button size="sm" data-testid="nav-dashboard-cta">
                    Go to Dashboard
                  </Button>
                </motion.div>
              </Link>
            ) : (
              <motion.div style={{ x: magnetic.x, y: magnetic.y }} {...magnetic.handlers}>
                <Button
                  size="sm"
                  onClick={onAuthClick}
                  data-testid="nav-launch-cta"
                >
                  Launch App
                </Button>
              </motion.div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-[--text-secondary] hover:text-[--text-primary] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={20} /> : <List size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile slide-in panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 top-16 z-20 md:hidden bg-[--bg-base]/95 backdrop-blur-xl border-t border-[--border-glass]"
          >
            <nav className="flex flex-col gap-1 p-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-base text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-glass] rounded-[--radius-lg] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
