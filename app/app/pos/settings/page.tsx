"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gear, FloppyDisk } from "@phosphor-icons/react";
import { isAddress } from "viem";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useMerchantStore } from "@/lib/merchantStore";
import { FeatureGate } from "@/components/ui/FeatureGate";
import { FeatureFlag } from "@/lib/featureFlags";

export default function PosSettingsPage() {
  const splitConfig = useMerchantStore((s) => s.splitConfig);
  const setSplitConfig = useMerchantStore((s) => s.setSplitConfig);

  const [enabled, setEnabled] = useState(splitConfig.enabled);
  const [taxPercent, setTaxPercent] = useState(String(splitConfig.taxPercent));
  const [taxWallet, setTaxWallet] = useState(splitConfig.taxWallet);
  const [tipPercent, setTipPercent] = useState(String(splitConfig.tipPercent));
  const [tipWallet, setTipWallet] = useState(splitConfig.tipWallet);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const netPercent = 100 - (Number(taxPercent) || 0) - (Number(tipPercent) || 0);

  const handleSave = () => {
    setError("");
    const tax = Number(taxPercent) || 0;
    const tip = Number(tipPercent) || 0;

    if (enabled) {
      if (tax + tip > 99) {
        setError("Tax + Tip cannot exceed 99%");
        return;
      }
      if (tax > 0 && !isAddress(taxWallet)) {
        setError("Enter a valid tax wallet address");
        return;
      }
      if (tip > 0 && !isAddress(tipWallet)) {
        setError("Enter a valid tip wallet address");
        return;
      }
    }

    setSplitConfig({
      enabled,
      taxPercent: tax,
      taxWallet: enabled ? taxWallet : "",
      tipPercent: tip,
      tipWallet: enabled ? tipWallet : "",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/app/pos" className="flex items-center gap-1 text-sm text-[--text-secondary] hover:text-[--text-primary]">
          <ArrowLeft size={16} />
          Back to POS
        </Link>
      </div>

      <h1 className="mb-6 font-[--font-display] text-2xl text-[--text-primary]">
        <Gear size={24} className="mr-2 inline-block" weight="duotone" />
        POS Settings
      </h1>

      <FeatureGate flag={FeatureFlag.ATOMIC_SPLIT}>
        <Card variant="elevated" className="mb-5">
          <CardHeader>
            <CardTitle>Split Payment Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              <span className="text-sm text-[--text-primary]">Enable atomic split payments</span>
            </label>

            {enabled && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Tax %"
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    placeholder="0"
                  />
                  <Input
                    label="Tax Wallet"
                    value={taxWallet}
                    onChange={(e) => setTaxWallet(e.target.value)}
                    placeholder="0x..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Tip %"
                    type="number"
                    value={tipPercent}
                    onChange={(e) => setTipPercent(e.target.value)}
                    placeholder="0"
                  />
                  <Input
                    label="Tip Wallet"
                    value={tipWallet}
                    onChange={(e) => setTipWallet(e.target.value)}
                    placeholder="0x..."
                  />
                </div>

                <div className="rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] px-3 py-2 text-sm">
                  <span className="text-[--text-secondary]">Net to merchant: </span>
                  <span className="font-mono font-bold text-[--text-primary]">{netPercent}%</span>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-[--status-error-text]">{error}</p>
            )}

            <Button type="button" onClick={handleSave}>
              <FloppyDisk size={14} />
              {saved ? "Saved!" : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </FeatureGate>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/app/pos/history" className="block text-sm text-amber-400 underline">
            View Receipt History
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
