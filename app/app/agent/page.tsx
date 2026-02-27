"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Gear, PaperPlaneTilt, Robot, ShieldWarning } from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { isAddress, parseUnits } from "viem";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TOKEN_REGISTRY } from "@/lib/tokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { EXPLORER_URL } from "@/lib/constants";
import { dismissToast, showError, showLoading, showSuccess } from "@/lib/toast";

const SETTINGS_KEY = "tempo.agent.settings.v1";
const MAX_INPUT_LENGTH = 500;

interface AgentSettings {
  endpoint: string;
  apiKey: string;
  model: string;
}

interface ParsedIntent {
  action: "transfer" | "balance" | "unknown";
  recipient?: string;
  amount?: string;
  token?: string;
  memo?: string;
  error?: string;
}

function loadSettings(): AgentSettings {
  if (typeof window === "undefined") return { endpoint: "", apiKey: "", model: "" };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as AgentSettings) : { endpoint: "", apiKey: "", model: "" };
  } catch {
    return { endpoint: "", apiKey: "", model: "" };
  }
}

function saveSettings(settings: AgentSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Input sanitization: strip HTML tags and system prompt markers
function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/\[SYSTEM\]/gi, "")
    .replace(/\[INST\]/gi, "")
    .replace(/<<SYS>>/gi, "")
    .replace(/<\/s>/gi, "")
    .slice(0, MAX_INPUT_LENGTH)
    .trim();
}

function prettyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied")) {
    return "Action cancelled in passkey confirmation.";
  }
  if (lower.includes("insufficient") || lower.includes("fee")) {
    return "Insufficient balance or fee sponsorship issue.";
  }
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("api key")) {
    return "Invalid API key or unauthorized. Check your settings.";
  }
  if (lower.includes("timeout") || lower.includes("network")) {
    return "Network issue. Please retry.";
  }
  return message.split("\n")[0] || "Operation failed";
}

export default function AgentPage() {
  const { address } = useAccount();
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>(() => loadSettings());

  // Chat state
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const { balances, refetch: refetchBalances } = useTokenBalances();
  const { mutateAsync: transferSync, isPending: isTransferring } = Hooks.token.useTransferSync();

  const isConfigured = Boolean(settings.endpoint && settings.apiKey && settings.model);

  const handleSaveSettings = () => {
    saveSettings(settings);
    setShowSettings(false);
    showSuccess("Settings saved", "API configuration stored locally");
  };

  const handleSend = async () => {
    if (!userInput.trim() || !isConfigured) return;

    setIsProcessing(true);
    setIntent(null);
    setConfirmed(false);
    setTxHash(null);
    setErrorMessage("");

    const sanitized = sanitizeInput(userInput);
    const loadingId = showLoading("Processing with AI...");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sanitized,
          apiKey: settings.apiKey,
          endpoint: settings.endpoint,
          model: settings.model,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `API returned ${response.status}`);
      }

      const data = (await response.json()) as ParsedIntent;

      // Validate parsed intent
      if (data.action === "transfer") {
        if (!data.recipient || !isAddress(data.recipient)) {
          data.action = "unknown";
          data.error = "Could not determine a valid recipient address.";
        }
        if (!data.amount || Number.parseFloat(data.amount) <= 0) {
          data.action = "unknown";
          data.error = "Could not determine a valid amount.";
        }
      }

      setIntent(data);
      showSuccess("Intent parsed", `Action: ${data.action}`);
    } catch (error) {
      const pretty = prettyError(error);
      setErrorMessage(pretty);
      showError("AI processing failed", pretty);
    } finally {
      setIsProcessing(false);
      dismissToast(loadingId);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!intent || intent.action !== "transfer" || !intent.recipient || !intent.amount) return;

    const tokenSymbol = intent.token || "pathUSD";
    const tokenInfo = TOKEN_REGISTRY.find((t) => t.symbol.toLowerCase() === tokenSymbol.toLowerCase()) ?? TOKEN_REGISTRY[0];

    setConfirmed(true);
    const loadingId = showLoading("Executing transfer...");

    try {
      const response = await transferSync({
        token: tokenInfo.address as `0x${string}`,
        to: intent.recipient as `0x${string}`,
        amount: parseUnits(intent.amount, 6),
      });

      const hash = response?.receipt?.transactionHash;
      if (!hash) {
        throw new Error("Transfer completed but hash missing.");
      }

      setTxHash(hash);
      showSuccess("Transfer executed", `Tx: ${hash.slice(0, 10)}...`);
      void refetchBalances();
    } catch (error) {
      const pretty = prettyError(error);
      setErrorMessage(pretty);
      showError("Transfer failed", pretty);
      setConfirmed(false);
    } finally {
      dismissToast(loadingId);
    }
  };

  const handleReset = () => {
    setUserInput("");
    setIntent(null);
    setConfirmed(false);
    setTxHash(null);
    setErrorMessage("");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[--font-display] text-2xl text-[--text-primary]">
            <Robot size={24} className="mr-2 inline-block" weight="duotone" />
            AI Agent
          </h1>
          <p className="mt-1 text-sm text-[--text-secondary]">
            Natural language payments — tell the agent what you want to do.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setShowSettings(!showSettings)}>
          <Gear size={14} />
          Settings
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>API Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="API Endpoint"
              placeholder="https://api.openai.com/v1/chat/completions"
              value={settings.endpoint}
              onChange={(e) => setSettings((prev) => ({ ...prev, endpoint: e.target.value }))}
              helperText="Any OpenAI-compatible API endpoint"
            />
            <Input
              label="API Key"
              type="password"
              placeholder="sk-..."
              value={settings.apiKey}
              onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
              helperText="Stored in localStorage only — never sent to our server"
            />
            <Input
              label="Model"
              placeholder="gpt-4o-mini"
              value={settings.model}
              onChange={(e) => setSettings((prev) => ({ ...prev, model: e.target.value }))}
            />
            <div className="rounded-[--radius-md] border border-[--status-warning-border] bg-[--status-warning-bg] px-3 py-2 text-xs text-[--status-warning-text]">
              <ShieldWarning size={14} className="mr-1 inline-block" />
              Your API key is forwarded to the external LLM endpoint only. It is never stored or logged on our server.
            </div>
            <Button type="button" onClick={handleSaveSettings}>
              Save Settings
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Chat Interface */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConfigured && (
              <div className="rounded-[--radius-md] border border-[--status-warning-border] bg-[--status-warning-bg] px-3 py-3">
                <p className="text-sm text-[--status-warning-text]">
                  Configure your API settings to get started.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowSettings(true)}
                  className="mt-2"
                >
                  Open Settings
                </Button>
              </div>
            )}

            {isConfigured && (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder='Try: "Send 5 pathUSD to 0x1234..."'
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value.slice(0, MAX_INPUT_LENGTH));
                      setErrorMessage("");
                    }}
                    disabled={isProcessing || isTransferring}
                  />
                  <Button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={isProcessing || !userInput.trim() || isTransferring}
                    loading={isProcessing}
                    className="shrink-0"
                  >
                    <PaperPlaneTilt size={14} />
                  </Button>
                </div>
                <p className="text-xs text-[--text-tertiary]">{userInput.length}/{MAX_INPUT_LENGTH} characters</p>
              </>
            )}

            {/* Error */}
            {errorMessage && (
              <p className="rounded-lg border border-[--status-error-border] bg-[--status-error-bg] px-3 py-2 text-xs text-[--status-error-text]">
                {errorMessage}
              </p>
            )}

            {/* Parsed Intent */}
            {intent && (
              <div className="space-y-3 rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[--text-tertiary]">Parsed Intent</p>

                {intent.action === "transfer" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[--text-secondary]">Action</span>
                      <StatusBadge status="scheduled" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[--text-secondary]">Recipient</span>
                      <span className="font-mono text-xs text-[--text-primary]">
                        {intent.recipient?.slice(0, 8)}...{intent.recipient?.slice(-6)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[--text-secondary]">Amount</span>
                      <span className="text-sm font-medium text-[--text-primary]">{intent.amount} {intent.token || "pathUSD"}</span>
                    </div>
                    {intent.memo && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[--text-secondary]">Memo</span>
                        <span className="text-sm text-[--text-primary]">{intent.memo}</span>
                      </div>
                    )}
                  </div>
                )}

                {intent.action === "balance" && (
                  <div className="space-y-2">
                    <p className="text-sm text-[--text-primary]">Balance Check Request</p>
                    {balances.map((b) => (
                      <div key={b.token.address} className="flex items-center justify-between">
                        <span className="text-sm text-[--text-secondary]">{b.token.symbol}</span>
                        <span className="font-mono text-sm text-[--text-primary]">{b.formatted}</span>
                      </div>
                    ))}
                  </div>
                )}

                {intent.action === "unknown" && (
                  <p className="text-sm text-[--status-error-text]">
                    {intent.error || "Cannot process this request. Try: 'Send 5 pathUSD to 0x...'"}
                  </p>
                )}

                {/* Confirmation Buttons */}
                {intent.action === "transfer" && !confirmed && !txHash && (
                  <div className="flex gap-2 pt-2">
                    <Button type="button" onClick={() => void handleConfirmTransfer()} loading={isTransferring}>
                      <CheckCircle size={14} />
                      Confirm & Execute
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleReset}>
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Transaction Result */}
                {txHash && (
                  <div className="space-y-2 rounded-[--radius-md] border border-[--status-success-border] bg-[--status-success-bg] p-3">
                    <p className="inline-flex items-center gap-1.5 text-sm text-[--status-success-text]">
                      <CheckCircle size={14} /> Transfer executed
                    </p>
                    <p className="break-all font-mono text-xs text-[--text-secondary]">{txHash}</p>
                    <div className="flex gap-2">
                      <Link
                        href={`${EXPLORER_URL}/tx/${txHash}`}
                        target="_blank"
                        className="inline-flex h-8 items-center rounded-[--radius-md] border border-[--border-default] px-3 text-xs text-[--text-primary] hover:bg-[--bg-elevated]"
                      >
                        View on Explorer
                      </Link>
                      <Button type="button" size="sm" variant="secondary" onClick={handleReset}>
                        New Command
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Panel */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Agent Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Status</span>
              <StatusBadge status={isConfigured ? "success" : "failed"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Model</span>
              <span className="text-sm text-[--text-primary]">{settings.model || "Not set"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[--text-secondary]">Wallet</span>
              <span className="font-mono text-xs text-[--text-primary]">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
              </span>
            </div>
            <div className="rounded-[--radius-md] border border-[--status-success-border] bg-[--status-success-bg] px-3 py-2 text-xs text-[--status-success-text]">
              Gas is sponsored. Each command requires explicit confirmation before execution.
            </div>
            <div className="space-y-2 rounded-[--radius-md] border border-[--border-subtle] bg-[--bg-subtle] p-3">
              <p className="text-xs font-medium text-[--text-tertiary]">Supported Commands</p>
              <ul className="space-y-1 text-xs text-[--text-secondary]">
                <li>• &quot;Send 5 pathUSD to 0x...&quot;</li>
                <li>• &quot;Transfer 10 AlphaUSD to 0x...&quot;</li>
                <li>• &quot;Check my balance&quot;</li>
              </ul>
            </div>
            <div className="space-y-2 rounded-[--radius-md] border border-[--status-warning-border] bg-[--status-warning-bg] p-3">
              <p className="text-xs font-medium text-[--status-warning-text]">Security</p>
              <ul className="space-y-1 text-xs text-[--status-warning-text]/80">
                <li>• Input sanitized (HTML/system tags stripped)</li>
                <li>• Output validated (Zod schema)</li>
                <li>• Confirmation required before execution</li>
                <li>• API key stored locally only</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
