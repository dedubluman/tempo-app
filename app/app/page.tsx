"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { motion } from "framer-motion";
import { useMotionSafe } from "@/lib/motion";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { SessionKeys } from "@/components/SessionKeys";
import { TransferForm } from "@/components/TransferForm";
import { TransactionHistory } from "@/components/TransactionHistory";
import { formatAddress } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AddressAvatar } from "@/components/ui/AddressAvatar";
import { Copy, Check, LogOut, ExternalLink, Zap } from "lucide-react";
import Link from "next/link";

const E2E_MOCK_AUTH = process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === "1";

export default function AppPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  const variants = useMotionSafe();

  const authBootstrapReady = !E2E_MOCK_AUTH || typeof window !== "undefined";
  const mockAddress =
    E2E_MOCK_AUTH && typeof window !== "undefined" && window.localStorage.getItem("tempo.walletCreated") === "1"
      ? window.localStorage.getItem("tempo.lastAddress") || ""
      : "";
  const hasMockConnection = E2E_MOCK_AUTH && Boolean(mockAddress);
  const effectiveAddress = address ?? (hasMockConnection ? mockAddress : "");

  const shortAddress = useMemo(() => {
    if (!effectiveAddress) return "";
    return formatAddress(effectiveAddress, 6, 4);
  }, [effectiveAddress]);

  useEffect(() => {
    if (authBootstrapReady && !isConnected && !hasMockConnection) {
      router.push("/");
    }
  }, [authBootstrapReady, hasMockConnection, isConnected, router]);

  if (!authBootstrapReady || (!isConnected && !hasMockConnection) || !effectiveAddress) {
    return null;
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(effectiveAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (_) {
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
    <div className="min-h-screen bg-[--bg-base]">
      <header className="border-b border-[--border-subtle] bg-[--bg-surface]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[--radius-md] flex items-center justify-center" style={{ background: "var(--gradient-flux)" }}>
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-[--text-primary] font-[--font-display]">Fluxus</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="brand" size="sm" data-testid="network-badge">Tempo Testnet</Badge>
            {effectiveAddress && (
              <AddressAvatar address={effectiveAddress} size="sm" />
            )}
          </div>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] as [number, number, number, number] }}
        className="max-w-6xl mx-auto px-4 py-6 sm:py-8 pb-24 md:pb-8"
      >
        <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[--text-primary] font-[--font-display]" data-testid="dashboard-heading">Wallet Dashboard</h1>
            <Badge variant="brand" size="sm">Stablecoin transfers with instant finality</Badge>
          </div>
          <p className="text-sm text-[--text-secondary] mt-1">Send pathUSD with sponsored fees and passkey security.</p>
        </div>

        <motion.div
          variants={variants.staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:gap-5 lg:grid-cols-12"
        >
          <motion.div variants={variants.fadeUp} className="lg:col-span-4 space-y-4">
            <Card variant="elevated" data-testid="account-card">
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {effectiveAddress && <AddressAvatar address={effectiveAddress} size="lg" />}
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium text-[--text-primary] truncate" title={effectiveAddress}>
                      {shortAddress}
                    </p>
                    <p className="text-xs text-[--text-muted]">Active wallet</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleCopyAddress()}
                    data-testid="copy-address-btn"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy Address"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    data-testid="disconnect-btn"
                  >
                    <LogOut size={14} />
                    Disconnect Wallet
                  </Button>
                  <p className="text-xs text-[--text-muted]">Disconnect logs you out and clears the active session.</p>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" data-testid="receive-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Receive</CardTitle>
                  <Badge variant="success" size="sm">Wallet Address</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-mono text-xs text-[--text-secondary] break-all bg-[--bg-subtle] rounded-[--radius-md] p-3 select-all" title={effectiveAddress}>
                  {effectiveAddress}
                </p>
                {shortAddress && (
                  <p className="font-mono text-xs text-[--text-muted]">{shortAddress}</p>
                )}
                <a
                  href="https://docs.tempo.xyz/quickstart/faucet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[--brand-primary] hover:underline"
                >
                  <ExternalLink size={12} />
                  Get testnet tokens
                </a>
              </CardContent>
            </Card>

            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
            >
              <Card variant="elevated">
                <CardHeader><CardTitle>Balance</CardTitle></CardHeader>
                <CardContent>
                  <BalanceDisplay />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div variants={variants.fadeUp} className="lg:col-span-8 space-y-4">
            <Card variant="elevated" data-testid="transfer-card">
              <CardHeader><CardTitle>Send</CardTitle></CardHeader>
              <CardContent>
                <TransferForm />
              </CardContent>
            </Card>

            <Card variant="elevated" data-testid="session-keys-card">
              <CardHeader><CardTitle>Session Keys</CardTitle></CardHeader>
              <CardContent>
                <SessionKeys />
              </CardContent>
            </Card>

            <Card variant="elevated" data-testid="activity-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Activity</CardTitle>
                  <Link href="/docs/transaction-history" className="text-xs text-[--brand-primary] hover:underline">View all</Link>
                </div>
              </CardHeader>
              <CardContent>
                <TransactionHistory />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-[--border-subtle] bg-[--bg-surface]/90 backdrop-blur-md z-20" data-testid="bottom-nav">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
          <Link href="/app" className="flex flex-col items-center gap-0.5 text-[--brand-primary]" data-testid="nav-home">
            <Zap size={20} />
            <span className="text-[10px] font-medium">Wallet</span>
          </Link>
          <Link href="/docs" className="flex flex-col items-center gap-0.5 text-[--text-muted]" data-testid="nav-docs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span className="text-[10px] font-medium">Docs</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
