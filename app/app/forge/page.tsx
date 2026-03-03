"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Copy, Hammer, ShieldCheck, Coins, ListDashes } from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EXPLORER_URL, PATHUSD_ADDRESS } from "@/lib/constants";
import { useCustomTokenStore } from "@/lib/store";
import { dismissToast, showError, showLoading, showSuccess } from "@/lib/toast";

type StepStatus = "idle" | "pending" | "success" | "failed";

interface StepResult {
  status: StepStatus;
  txHash?: string;
  error?: string;
}

function prettyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected")) {
    return "Action cancelled in passkey confirmation.";
  }
  if (lower.includes("insufficient") || lower.includes("sponsor") || lower.includes("fee")) {
    return "Insufficient balance or fee sponsorship issue.";
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("rpc")) {
    return "Network is slow. Please retry in a moment.";
  }
  return message.split("\n")[0] || "Operation failed";
}

function TxLink({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="space-y-2 rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] p-3">
      <p className="inline-flex items-center gap-1.5 text-sm text-[--status-success-text]">
        <CheckCircle size={14} /> Transaction confirmed
      </p>
      <p className="break-all font-mono text-xs text-[--text-secondary]">{hash}</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => void handleCopy()}>
          <Copy size={12} />
          {copied ? "Copied" : "Copy"}
        </Button>
        <Link
          href={`${EXPLORER_URL}/tx/${hash}`}
          target="_blank"
          className="inline-flex h-8 items-center rounded-[--radius-md] border border-[--border-default] px-3 text-xs text-[--text-primary] hover:bg-[--bg-elevated]"
        >
          View on Explorer
        </Link>
      </div>
    </div>
  );
}

const STEPS = [
  { label: "Create Token", icon: Hammer },
  { label: "Mint Supply", icon: Coins },
  { label: "Add Policy", icon: ShieldCheck },
  { label: "DEX Listing", icon: ListDashes },
] as const;

export default function ForgePage() {
  const { address } = useAccount();
  const addCustomToken = useCustomTokenStore((state) => state.addCustomToken);
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Create Token
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [createResult, setCreateResult] = useState<StepResult>({ status: "idle" });
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);

  // Step 2: Mint
  const [mintAmount, setMintAmount] = useState("");
  const [mintResult, setMintResult] = useState<StepResult>({ status: "idle" });

  // Step 3: Policy
  const [policyType, setPolicyType] = useState<"whitelist" | "blacklist">("whitelist");
  const [policyAddresses, setPolicyAddresses] = useState("");
  const [policyResult, setPolicyResult] = useState<StepResult>({ status: "idle" });
  const [policyId, setPolicyId] = useState<string | null>(null);

  // Hooks
  const { mutateAsync: createTokenSync, isPending: isCreating } = Hooks.token.useCreateSync();
  const { mutateAsync: grantRolesSync, isPending: isGranting } = Hooks.token.useGrantRolesSync();
  const { mutateAsync: mintSync, isPending: isMinting } = Hooks.token.useMintSync();
  const { mutateAsync: createPolicySync, isPending: isCreatingPolicy } = Hooks.policy.useCreateSync();
  const { mutateAsync: changePolicySync, isPending: isAttachingPolicy } = Hooks.token.useChangeTransferPolicySync();

  const handleCreate = async () => {
    if (!tokenName.trim() || !tokenSymbol.trim()) {
      setCreateResult({ status: "failed", error: "Token name and symbol are required." });
      return;
    }
    setCreateResult({ status: "pending" });
    const loadingId = showLoading("Creating TIP-20 token...");
    try {
      const response = await createTokenSync({
        name: tokenName.trim(),
        symbol: tokenSymbol.trim(),
        currency: "USD",
        quoteToken: PATHUSD_ADDRESS,
      });
      const hash = response?.receipt?.transactionHash;
      const addr = response?.token;
      if (!hash || !addr) {
        throw new Error("Token created but transaction details missing.");
      }
      setTokenAddress(addr);
      addCustomToken({
        address: addr,
        name: tokenName.trim(),
        symbol: tokenSymbol.trim(),
        decimals: 6,
        createdAt: Date.now(),
      });
      setCreateResult({ status: "success", txHash: hash });
      setCurrentStep(1);
      showSuccess("Token created", `${tokenSymbol.trim()} at ${addr.slice(0, 10)}...`);
    } catch (error) {
      const pretty = prettyError(error);
      setCreateResult({ status: "failed", error: pretty });
      showError("Token creation failed", pretty);
    } finally {
      dismissToast(loadingId);
    }
  };

  const handleMint = async () => {
    if (!tokenAddress || !address) return;
    const amount = mintAmount.trim();
    if (!amount || Number.parseFloat(amount) <= 0) {
      setMintResult({ status: "failed", error: "Enter a valid mint amount." });
      return;
    }
    setMintResult({ status: "pending" });
    const loadingId = showLoading("Granting issuer role & minting...");
    try {
      // Grant ISSUER_ROLE first (creator has DEFAULT_ADMIN_ROLE but not ISSUER_ROLE)
      await grantRolesSync({
        token: tokenAddress as `0x${string}`,
        roles: ["issuer"],
        to: address,
      });
      // Mint tokens
      const response = await mintSync({
        token: tokenAddress as `0x${string}`,
        to: address,
        amount: parseUnits(amount, 6),
      });
      const hash = response?.receipt?.transactionHash;
      if (!hash) {
        throw new Error("Mint completed but transaction hash missing.");
      }
      setMintResult({ status: "success", txHash: hash });
      setCurrentStep(2);
      showSuccess("Tokens minted", `${amount} tokens minted to your address`);
    } catch (error) {
      const pretty = prettyError(error);
      setMintResult({ status: "failed", error: pretty });
      showError("Minting failed", pretty);
    } finally {
      dismissToast(loadingId);
    }
  };

  const handlePolicy = async () => {
    if (!tokenAddress) return;
    const addressList = policyAddresses
      .split(/[,\n]/)
      .map((a) => a.trim())
      .filter((a) => a.startsWith("0x") && a.length === 42);
    if (addressList.length === 0) {
      setPolicyResult({ status: "failed", error: "Add at least one valid address (0x...)." });
      return;
    }
    setPolicyResult({ status: "pending" });
    const loadingId = showLoading("Creating and attaching policy...");
    try {
      // Create policy
      const policyResponse = await createPolicySync({
        type: policyType,
        addresses: addressList as `0x${string}`[],
      });
      const createdPolicyId = policyResponse?.policyId;
      if (!createdPolicyId && createdPolicyId !== BigInt(0)) {
        throw new Error("Policy created but ID not returned.");
      }
      setPolicyId(createdPolicyId.toString());

      // Attach policy to token
      const attachResponse = await changePolicySync({
        token: tokenAddress as `0x${string}`,
        policyId: createdPolicyId,
      });
      const hash = attachResponse?.receipt?.transactionHash;
      if (!hash) {
        throw new Error("Policy attached but transaction hash missing.");
      }
      setPolicyResult({ status: "success", txHash: hash });
      setCurrentStep(3);
      showSuccess("Policy attached", `${policyType} policy #${createdPolicyId} applied`);
    } catch (error) {
      const pretty = prettyError(error);
      setPolicyResult({ status: "failed", error: pretty });
      showError("Policy creation failed", pretty);
    } finally {
      dismissToast(loadingId);
    }
  };

  const handleSkipPolicy = () => {
    setPolicyResult({ status: "success" });
    setCurrentStep(3);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28 md:pb-10">
      <div className="mb-6">
        <h1 className="font-[--font-display] text-2xl font-bold tracking-tight text-[--text-primary]">Token Forge</h1>
        <p className="mt-1 text-sm text-[--text-secondary]">
          Create a TIP-20 token, mint supply, apply compliance, and list on DEX.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center gap-2 overflow-x-auto">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={step.label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`hidden h-px w-6 sm:block ${done ? "bg-amber-500" : "bg-[--border-subtle]"}`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  done
                    ? "bg-amber-500/15 text-amber-400"
                    : active
                      ? "border border-amber-500/40 bg-[--bg-surface] text-[--text-primary]"
                      : "bg-[--bg-subtle] text-[--text-tertiary]"
                }`}
              >
                {done ? <CheckCircle size={14} weight="fill" /> : <Icon size={14} />}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-5">
        {/* Main Wizard Panel */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{STEPS[currentStep]?.label ?? "Complete"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Create Token */}
            {currentStep === 0 && (
              <>
                <Input
                  label="Token Name"
                  placeholder="e.g. My Stablecoin"
                  value={tokenName}
                  onChange={(e) => {
                    setTokenName(e.target.value);
                    setCreateResult({ status: "idle" });
                  }}
                  disabled={isCreating}
                />
                <Input
                  label="Token Symbol"
                  placeholder="e.g. MUSD"
                  value={tokenSymbol}
                  onChange={(e) => {
                    setTokenSymbol(e.target.value);
                    setCreateResult({ status: "idle" });
                  }}
                  disabled={isCreating}
                />
                <div className="rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] px-3 py-2">
                  <p className="text-xs text-[--text-secondary]">Currency: <span className="font-medium text-[--text-primary]">USD</span></p>
                  <p className="text-xs text-[--text-secondary]">Quote token: <span className="font-medium text-[--text-primary]">pathUSD</span> (auto-listed on DEX)</p>
                </div>
                {createResult.error && (
                  <p className="rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
                    {createResult.error}
                  </p>
                )}
                {createResult.txHash && <TxLink hash={createResult.txHash} />}
                <Button type="button" onClick={() => void handleCreate()} loading={isCreating} disabled={isCreating || !tokenName.trim() || !tokenSymbol.trim()}>
                  {isCreating ? "Creating Token..." : "Create Token"}
                </Button>
              </>
            )}

            {/* Step 2: Mint Supply */}
            {currentStep === 1 && (
              <>
                <div className="rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] px-3 py-2">
                  <p className="text-xs text-[--text-secondary]">Token: <span className="break-all font-mono font-medium text-[--text-primary]">{tokenAddress}</span></p>
                </div>
                <Input
                  label="Mint Amount"
                  placeholder="e.g. 1000"
                  type="number"
                  value={mintAmount}
                  onChange={(e) => {
                    setMintAmount(e.target.value);
                    setMintResult({ status: "idle" });
                  }}
                  disabled={isMinting || isGranting}
                  helperText="Amount in whole tokens (6 decimal precision)"
                />
                {mintResult.error && (
                  <p className="rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
                    {mintResult.error}
                  </p>
                )}
                {mintResult.txHash && <TxLink hash={mintResult.txHash} />}
                <Button
                  type="button"
                  onClick={() => void handleMint()}
                  loading={isMinting || isGranting}
                  disabled={isMinting || isGranting || !mintAmount.trim() || Number.parseFloat(mintAmount) <= 0}
                >
                  {isGranting ? "Granting Issuer Role..." : isMinting ? "Minting..." : "Grant Role & Mint"}
                </Button>
              </>
            )}

            {/* Step 3: Add Policy */}
            {currentStep === 2 && (
              <>
                <div className="rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] px-3 py-2">
                  <p className="text-xs text-[--text-secondary]">Token: <span className="break-all font-mono font-medium text-[--text-primary]">{tokenAddress}</span></p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-[--text-tertiary]">Policy Type</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPolicyType("whitelist")}
                      className={`rounded-[--radius-md] border px-4 py-2 text-sm transition-colors ${
                        policyType === "whitelist"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                          : "border-[--border-default] text-[--text-secondary] hover:bg-[--bg-subtle]"
                      }`}
                    >
                      Whitelist
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolicyType("blacklist")}
                      className={`rounded-[--radius-md] border px-4 py-2 text-sm transition-colors ${
                        policyType === "blacklist"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                          : "border-[--border-default] text-[--text-secondary] hover:bg-[--bg-subtle]"
                      }`}
                    >
                      Blacklist
                    </button>
                  </div>
                </div>
                <Input
                  label="Addresses (one per line or comma-separated)"
                  placeholder="0x1234...abcd"
                  value={policyAddresses}
                  onChange={(e) => {
                    setPolicyAddresses(e.target.value);
                    setPolicyResult({ status: "idle" });
                  }}
                  disabled={isCreatingPolicy || isAttachingPolicy}
                  helperText={address ? `Tip: include your own address (${address.slice(0, 6)}...${address.slice(-4)}) to maintain access` : undefined}
                />
                {policyResult.error && (
                  <p className="rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
                    {policyResult.error}
                  </p>
                )}
                {policyResult.txHash && <TxLink hash={policyResult.txHash} />}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void handlePolicy()}
                    loading={isCreatingPolicy || isAttachingPolicy}
                    disabled={isCreatingPolicy || isAttachingPolicy || !policyAddresses.trim()}
                  >
                    {isCreatingPolicy ? "Creating Policy..." : isAttachingPolicy ? "Attaching..." : "Create & Attach Policy"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleSkipPolicy} disabled={isCreatingPolicy || isAttachingPolicy}>
                    Skip
                  </Button>
                </div>
              </>
            )}

            {/* Step 4: DEX Listing (Informational) */}
            {currentStep === 3 && (
              <>
                <div className="rounded-[--radius-md] border border-[--status-success-border] bg-[--status-success-bg] px-4 py-3">
                  <p className="font-medium text-[--status-success-text]">Token is live on the Stablecoin DEX!</p>
                  <p className="mt-1 text-xs text-[--status-success-text]/80">
                    Your token was auto-listed when you set pathUSD as the quote token during creation.
                  </p>
                </div>
                <div className="space-y-3 rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[--text-tertiary]">Token Summary</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[--text-secondary]">Name</span>
                      <span className="text-sm font-medium text-[--text-primary]">{tokenName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[--text-secondary]">Symbol</span>
                      <span className="text-sm font-medium text-[--text-primary]">{tokenSymbol}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[--text-secondary]">Address</span>
                      <span className="break-all font-mono text-xs text-[--text-primary]">{tokenAddress}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[--text-secondary]">Supply</span>
                      <span className="text-sm font-medium text-[--text-primary]">{mintAmount || "0"} tokens</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[--text-secondary]">Policy</span>
                      <span className="text-sm font-medium text-[--text-primary]">
                        {policyId ? `${policyType} #${policyId}` : "None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[--text-secondary]">DEX</span>
                      <StatusBadge status="success" />
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCurrentStep(0);
                    setTokenName("");
                    setTokenSymbol("");
                    setMintAmount("");
                    setPolicyAddresses("");
                    setTokenAddress(null);
                    setPolicyId(null);
                    setCreateResult({ status: "idle" });
                    setMintResult({ status: "idle" });
                    setPolicyResult({ status: "idle" });
                  }}
                >
                  Create Another Token
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Panel */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Forge Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Step</span>
              <span className="text-sm font-medium text-[--text-primary]">{currentStep + 1} / 4</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Currency</span>
              <span className="text-sm text-[--text-primary]">USD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Decimals</span>
              <span className="text-sm text-[--text-primary]">6</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">DEX Pair</span>
              <span className="text-sm text-[--text-primary]">pathUSD</span>
            </div>
            <div className="rounded-[--radius-md] border border-[--status-success-border] bg-[--status-success-bg] px-3 py-2 text-xs text-[--status-success-text]">
              Gas is sponsored and paid in stablecoin.
            </div>
            {tokenAddress && (
              <div className="space-y-2 rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] p-3">
                <p className="text-xs text-[--text-tertiary]">Created Token</p>
                <p className="break-all font-mono text-xs text-[--text-primary]">{tokenAddress}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
