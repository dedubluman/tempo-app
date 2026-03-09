"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { motion } from "framer-motion";
import { useMotionSafe } from "@/lib/motion";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { TransferForm } from "@/components/TransferForm";
import { TransactionHistory } from "@/components/TransactionHistory";
import { formatAddress } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AddressAvatar } from "@/components/ui/AddressAvatar";
import {
  Copy,
  Check,
  SignOut,
  ArrowSquareOut,
  PaperPlaneTilt,
  QrCode,
  ArrowsLeftRight,
  HandCoins,
} from "@phosphor-icons/react";
import Link from "next/link";

const E2E_MOCK_AUTH = process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === "1";

// Quick action button for the action grid
function ActionButton({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-12 w-12 items-center justify-center rounded-[--radius-xl] bg-[--bg-surface] border border-[--border-glass] text-[--brand-primary] transition-all duration-[--duration-fast] group-hover:bg-[--brand-primary]/10 group-hover:border-[--border-glass-hover] group-hover:shadow-[0_0_16px_rgba(52,211,153,0.15)] group-active:scale-95">
        <Icon size={22} weight="duotone" />
      </div>
      <span className="text-xs font-semibold text-[--text-secondary] group-hover:text-[--text-primary] transition-colors duration-[--duration-fast]">
        {label}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group flex flex-col items-center p-3 rounded-[--radius-xl] transition-all duration-150 hover:bg-[--bg-surface] hover:-translate-y-0.5 active:scale-[0.98]"
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center p-3 rounded-[--radius-xl] transition-all duration-150 hover:bg-[--bg-surface] hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {inner}
    </button>
  );
}

export default function AppPage() {
  const t = useTranslations();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const hasRedirectedRef = useRef(false);
  const variants = useMotionSafe();

  const authBootstrapReady = !E2E_MOCK_AUTH || typeof window !== "undefined";
  const mockAddress = (() => {
    if (!E2E_MOCK_AUTH || typeof window === "undefined") return "";
    const legacyCreated = window.localStorage.getItem("tempo.walletCreated");
    const legacyAddress = window.localStorage.getItem("tempo.lastAddress");
    if (legacyCreated === "1" && legacyAddress) return legacyAddress;
    try {
      const stored = window.localStorage.getItem("fluxus-wallet-storage");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.walletCreated && parsed?.state?.lastAddress) {
          return parsed.state.lastAddress as string;
        }
      }
    } catch {
      /* ignore */
    }
    return "";
  })();
  const hasMockConnection = E2E_MOCK_AUTH && Boolean(mockAddress);
  const effectiveAddress = address ?? (hasMockConnection ? mockAddress : "");

  const shortAddress = useMemo(() => {
    if (!effectiveAddress) return "";
    return formatAddress(effectiveAddress, 6, 4);
  }, [effectiveAddress]);

  useEffect(() => {
    if (isConnected || hasMockConnection) {
      hasRedirectedRef.current = false;
      return;
    }

    if (!authBootstrapReady || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    router.push("/");
  }, [authBootstrapReady, hasMockConnection, isConnected, router]);

  if (
    !authBootstrapReady ||
    (!isConnected && !hasMockConnection) ||
    !effectiveAddress
  ) {
    return null;
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(effectiveAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const handleDisconnect = () => {
    if (isConnected) {
      disconnect();
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("tempo.walletCreated");
      window.localStorage.removeItem("tempo.lastAddress");
      window.localStorage.removeItem("wagmi.webAuthn.activeCredential");
      window.localStorage.removeItem("wagmi.webAuthn.lastActiveCredential");
    }
    router.push("/");
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.3,
        ease: [0, 0, 0.2, 1] as [number, number, number, number],
      }}
      className="max-w-3xl mx-auto px-4 py-8 pb-28 md:pb-10"
    >
      <motion.div
        variants={variants.staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Balance Hero — T15 */}
        <motion.section variants={variants.fadeUp} className="space-y-6">
          {/* Address row */}
          <div className="flex items-center gap-3">
            {effectiveAddress && (
              <AddressAvatar address={effectiveAddress} size="sm" />
            )}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="font-mono text-sm text-[--text-secondary] truncate"
                title={effectiveAddress}
              >
                {shortAddress}
              </span>
              <button
                onClick={() => void handleCopyAddress()}
                className="text-[--text-tertiary] hover:text-[--brand-primary] transition-colors p-1 rounded"
                data-testid="copy-address-btn"
                aria-label="Copy address"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge
                variant="brand"
                size="sm"
                dot
                pulse
                data-testid="network-badge"
              >
                {t("common.network")}
              </Badge>
              <a
                href={`https://explore.tempo.xyz/address/${effectiveAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[--text-tertiary] hover:text-[--brand-primary] transition-colors p-1 rounded"
                aria-label="View on explorer"
              >
                <ArrowSquareOut size={13} />
              </a>
              <button
                onClick={handleDisconnect}
                className="text-[--text-tertiary] hover:text-[--status-error-text] transition-colors p-1 rounded"
                data-testid="disconnect-btn"
                aria-label={t("common.disconnect")}
              >
                <SignOut size={13} />
              </button>
            </div>
          </div>

          {/* Balance */}
          <BalanceDisplay />

          {/* Action Grid — T16 */}
          <div
            className="grid grid-cols-4 gap-1 bg-[--bg-glass] rounded-[--radius-2xl] border border-[--border-glass] p-2"
            role="toolbar"
            aria-label="Quick actions"
          >
            <ActionButton
              icon={PaperPlaneTilt}
              label="Send"
              onClick={() => setShowSend((v) => !v)}
            />
            <ActionButton icon={QrCode} label="Receive" href="/app/request" />
            <ActionButton
              icon={ArrowsLeftRight}
              label="Swap"
              href="/app/swap"
            />
            <ActionButton
              icon={HandCoins}
              label="Request"
              href="/app/request"
            />
          </div>
        </motion.section>

        {/* Send form — shown when Send action is clicked */}
        {showSend && (
          <motion.section
            variants={variants.fadeUp}
            initial="hidden"
            animate="visible"
          >
            <Card variant="elevated" data-testid="transfer-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("dashboard.send.title")}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSend(false)}
                    className="h-7 w-7 p-0"
                    aria-label="Close send form"
                  >
                    &times;
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <TransferForm />
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* Activity Feed — T17 */}
        <motion.section variants={variants.fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-[0.12em]">
              Activity
            </h2>
            <Link
              href="/docs/transaction-history"
              className="text-xs text-[--brand-primary] hover:underline font-medium"
            >
              View all
            </Link>
          </div>
          <TransactionHistory />
        </motion.section>
      </motion.div>
    </motion.main>
  );
}
