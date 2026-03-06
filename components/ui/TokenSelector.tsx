"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { cn } from "@/lib/cn";
import type { TokenInfo } from "@/types/token";

type TokenSelectorProps = {
  selectedToken: TokenInfo;
  onSelect: (token: TokenInfo) => void;
  tokens?: TokenInfo[];
  className?: string;
};

const TOKEN_ACCENT: Record<string, string> = {
  pathUSD: "bg-amber-500/80",
  AlphaUSD: "bg-blue-500/80",
  BetaUSD: "bg-emerald-500/80",
  ThetaUSD: "bg-violet-500/80",
};

function tokenAccent(symbol: string): string {
  return TOKEN_ACCENT[symbol] ?? "bg-zinc-500/80";
}

export function TokenSelector({
  selectedToken,
  onSelect,
  tokens = TOKEN_REGISTRY,
  className,
}: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const label = useMemo(
    () => `${selectedToken.name} (${selectedToken.symbol})`,
    [selectedToken],
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between rounded-[--radius-md] border border-[--border-default] bg-[--bg-surface] px-3 text-sm text-[--text-primary] transition-all duration-[--duration-fast] hover:border-[--border-strong] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand-primary]/20"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white",
              tokenAccent(selectedToken.symbol),
            )}
          >
            {selectedToken.symbol.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate">{label}</span>
        </span>
        <CaretDown
          size={14}
          className={cn(
            "transition-transform",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-[--radius-xl] border border-[--border-glass] bg-[--bg-glass] backdrop-blur-xl p-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)]">
          {tokens.map((token) => (
            <button
              key={token.address}
              type="button"
              onClick={() => {
                onSelect(token);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-[--radius-sm] px-2 py-2 text-left text-sm text-[--text-primary] hover:bg-[--bg-subtle]"
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                  tokenAccent(token.symbol),
                )}
              >
                {token.symbol.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate">{token.name}</span>
                <span className="text-xs text-[--text-secondary]">
                  {token.symbol}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
