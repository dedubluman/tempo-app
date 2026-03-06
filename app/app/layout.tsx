"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ComponentType, ReactNode } from "react";
import {
  House,
  ChartPieSlice,
  ArrowsLeftRight,
  LinkSimple,
  Hammer,
  Clock,
  Robot,
  Storefront,
  Waves,
} from "@phosphor-icons/react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{
    size?: number;
    weight?: "duotone" | "regular" | "fill";
  }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Home", icon: House },
  { href: "/app/portfolio", label: "Portfolio", icon: ChartPieSlice },
  { href: "/app/swap", label: "Swap", icon: ArrowsLeftRight },
  { href: "/app/request", label: "Request", icon: LinkSimple },
  { href: "/app/forge", label: "Forge", icon: Hammer },
  { href: "/app/schedule", label: "Schedule", icon: Clock },
  { href: "/app/agent", label: "Agent", icon: Robot },
  { href: "/app/pos", label: "POS", icon: Storefront },
  { href: "/app/stream", label: "Stream", icon: Waves },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen">
      <div className="mx-auto flex w-full max-w-[1200px] md:gap-6 md:px-4 md:py-6">
        <aside className="hidden md:block md:w-64 md:shrink-0">
          <nav
            role="navigation"
            className="sticky top-6 rounded-[--radius-xl] border border-[--border-glass] bg-[--bg-glass] p-2 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          >
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="relative flex items-center gap-2.5 rounded-[--radius-md] px-4 py-2.5 text-sm text-[--text-secondary] hover:bg-[--bg-subtle] hover:text-[--text-primary]"
                    >
                      {active ? (
                        <motion.span
                          layoutId="app-nav-indicator"
                          className="absolute inset-y-1 left-0 w-1 rounded-full bg-[--brand-primary]"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 34,
                          }}
                        />
                      ) : null}
                      <Icon size={18} weight={active ? "duotone" : "regular"} />
                      <span className={active ? "text-[--text-primary]" : ""}>
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <nav
        role="navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[--bg-glass] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
      >
        <div className="overflow-x-auto px-2">
          <ul className="flex min-w-max items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="relative flex min-w-[88px] flex-col items-center gap-1 rounded-[--radius-md] px-2 py-1.5 text-[11px] text-[--text-secondary]"
                  >
                    {active ? (
                      <motion.span
                        layoutId="app-mobile-nav-indicator"
                        className="absolute left-2 right-2 top-0 h-0.5 rounded-full bg-[--brand-primary]"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    ) : null}
                    <Icon size={18} weight={active ? "duotone" : "regular"} />
                    <span className={active ? "text-[--text-primary]" : ""}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </div>
  );
}
