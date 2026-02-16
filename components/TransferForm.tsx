"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useBlockNumber, usePublicClient, useReadContract, useSendCallsSync } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { encodeFunctionData, formatUnits, getAddress, isAddress, pad, parseUnits, stringToHex } from "viem";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS, EXPLORER_URL } from "@/lib/constants";
import { pathUsdAbi } from "@/lib/abi";
import {
  applySessionSpend,
  clearSessionAuthorization,
  getAccessAccountForSession,
  getSessionForBatch,
  getSessionForTransfer,
} from "@/lib/sessionManager";
import Link from "next/link";

type TransferMode = "single" | "batch";

type BatchRecipientRow = {
  id: string;
  recipient: string;
  amount: string;
  memo: string;
  recipientError: string;
  amountError: string;
  memoError: string;
};

const MAX_BATCH_RECIPIENTS = 10;

function createBatchRecipientRow(): BatchRecipientRow {
  return {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
    recipient: "",
    amount: "",
    memo: "",
    recipientError: "",
    amountError: "",
    memoError: "",
  };
}

export function TransferForm() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [mode, setMode] = useState<TransferMode>("single");

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [recipientError, setRecipientError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [memoError, setMemoError] = useState("");

  const [batchRows, setBatchRows] = useState<BatchRecipientRow[]>([createBatchRecipientRow()]);
  const [batchFormError, setBatchFormError] = useState("");
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [batchHasNewAddress, setBatchHasNewAddress] = useState(false);

  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedBatchHash, setCopiedBatchHash] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const { data: blockNumber } = useBlockNumber({
    watch: true,
    query: {
      enabled: !!address,
    },
  });

  const { data: balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useReadContract({
    address: PATHUSD_ADDRESS,
    abi: pathUsdAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const {
    mutateAsync: transferSync,
    data: transferResult,
    isPending,
    error: transferError,
    reset,
  } = Hooks.token.useTransferSync();

  const {
    mutateAsync: sendCallsSync,
    data: batchResult,
    isPending: isBatchPending,
    error: batchError,
    reset: resetBatch,
  } = useSendCallsSync();

  const validateRecipient = (value: string): boolean => {
    if (!value) {
      setRecipientError("Recipient address required");
      return false;
    }
    if (!isAddress(value)) {
      setRecipientError("Invalid address format");
      return false;
    }
    const checksummed = getAddress(value);
    if (checksummed === "0x0000000000000000000000000000000000000000") {
      setRecipientError("Cannot send to zero address");
      return false;
    }
    if (address && checksummed === getAddress(address)) {
      setRecipientError("Cannot send to your own address");
      return false;
    }
    setRecipientError("");
    return true;
  };

  const validateAmount = (value: string): boolean => {
    if (!value) {
      setAmountError("Amount required");
      return false;
    }
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      setAmountError("Amount must be greater than 0");
      return false;
    }
    const decimalPart = value.split(".")[1];
    if (decimalPart && decimalPart.length > PATHUSD_DECIMALS) {
      setAmountError(`Max ${PATHUSD_DECIMALS} decimal places`);
      return false;
    }
    try {
      if (balance) {
        const amountInUnits = parseUnits(value, PATHUSD_DECIMALS);
        if (amountInUnits > balance) {
          const needed = formatUnits(amountInUnits, PATHUSD_DECIMALS);
          const available = formatUnits(balance, PATHUSD_DECIMALS);
          setAmountError(`Insufficient balance. You need ${needed} pathUSD but have ${available}.`);
          return false;
        }
      }
    } catch {
      setAmountError("Invalid amount format");
      return false;
    }
    setAmountError("");
    return true;
  };

  const validateMemo = (value: string): boolean => {
    const byteLength = new TextEncoder().encode(value).length;
    if (byteLength > 32) {
      setMemoError("Memo exceeds 32 bytes");
      return false;
    }
    setMemoError("");
    return true;
  };

  const validateBatchRecipient = (value: string): string => {
    if (!value) {
      return "Recipient address required";
    }
    if (!isAddress(value)) {
      return "Invalid address format";
    }
    const checksummed = getAddress(value);
    if (checksummed === "0x0000000000000000000000000000000000000000") {
      return "Cannot send to zero address";
    }
    if (address && checksummed === getAddress(address)) {
      return "Cannot send to your own address";
    }
    return "";
  };

  const validateBatchAmount = (value: string): string => {
    if (!value) {
      return "Amount required";
    }

    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return "Amount must be greater than 0";
    }

    const decimalPart = value.split(".")[1];
    if (decimalPart && decimalPart.length > PATHUSD_DECIMALS) {
      return `Max ${PATHUSD_DECIMALS} decimal places`;
    }

    try {
      parseUnits(value, PATHUSD_DECIMALS);
    } catch {
      return "Invalid amount format";
    }

    return "";
  };

  const validateBatchMemo = (value: string): string => {
    const byteLength = new TextEncoder().encode(value).length;
    if (byteLength > 32) {
      return "Memo exceeds 32 bytes";
    }
    return "";
  };

  const hash = transferResult?.receipt.transactionHash;
  const batchHash = batchResult?.receipts?.[0]?.transactionHash;
  const isSuccess = Boolean(hash);
  const isBatchSuccess = Boolean(batchHash);
  const memoByteLength = new TextEncoder().encode(memo).length;
  const memoRemaining = 32 - memoByteLength;
  const formattedBalance = balance ? formatUnits(balance, PATHUSD_DECIMALS) : "0";
  const maxDisabled = isPending || isBatchPending || isBalanceLoading || !balance || formattedBalance === "0";
  const isPendingAny = isPending || isBatchPending;

  const shortHash = useMemo(() => (hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : ""), [hash]);
  const shortBatchHash = useMemo(() => (batchHash ? `${batchHash.slice(0, 10)}...${batchHash.slice(-8)}` : ""), [batchHash]);

  const batchTotalInUnits = useMemo(() => {
    return batchRows.reduce((sum, row) => {
      if (!row.amount) {
        return sum;
      }
      try {
        return sum + parseUnits(row.amount, PATHUSD_DECIMALS);
      } catch {
        return sum;
      }
    }, BigInt(0));
  }, [batchRows]);

  const batchTotalFormatted = useMemo(() => formatUnits(batchTotalInUnits, PATHUSD_DECIMALS), [batchTotalInUnits]);
  const batchEstimatedFee = useMemo(() => {
    if (!batchHasNewAddress) {
      return null;
    }
    const estimated = parseUnits("0.001", PATHUSD_DECIMALS) * BigInt(Math.max(batchRows.length, 1));
    return formatUnits(estimated, PATHUSD_DECIMALS);
  }, [batchHasNewAddress, batchRows.length]);

  const singleTransferErrorMessage = useMemo(() => {
    if (!transferError) {
      return "";
    }

    const rawMessage = transferError.message.split("\n")[0];
    const normalized = transferError.message.toLowerCase();

    if (normalized.includes("user rejected") || normalized.includes("user denied") || normalized.includes("rejected")) {
      return "Transfer cancelled in passkey confirmation. Review the details and approve to send.";
    }

    if (
      normalized.includes("insufficient funds") ||
      normalized.includes("insufficient balance") ||
      normalized.includes("gas") ||
      normalized.includes("fee") ||
      normalized.includes("sponsor")
    ) {
      return "Transaction sponsorship failed. Try a smaller amount. If the recipient is a new address, fund your wallet with native testnet tokens and retry.";
    }

    if (
      normalized.includes("network") ||
      normalized.includes("timeout") ||
      normalized.includes("rpc") ||
      normalized.includes("fetch")
    ) {
      return "Network is slow. Please try again. If it keeps failing, check Tempo RPC connectivity and retry.";
    }

    if (normalized.includes("execution reverted")) {
      return "Transfer reverted on-chain. Confirm recipient address, amount, and that you are using the current receive address.";
    }

    return rawMessage;
  }, [transferError]);

  const batchTransferErrorMessage = useMemo(() => {
    if (!batchError) {
      return "";
    }

    const rawMessage = batchError.message.split("\n")[0];
    const normalized = batchError.message.toLowerCase();

    if (normalized.includes("user rejected") || normalized.includes("user denied") || normalized.includes("rejected")) {
      return "Batch send cancelled in passkey confirmation. Review recipients and approve to continue.";
    }

    if (
      normalized.includes("insufficient funds") ||
      normalized.includes("insufficient balance") ||
      normalized.includes("gas") ||
      normalized.includes("fee") ||
      normalized.includes("sponsor")
    ) {
      return "Transaction sponsorship failed. Try a smaller amount. If recipients are new wallets, fund with native testnet tokens and retry.";
    }

    if (
      normalized.includes("network") ||
      normalized.includes("timeout") ||
      normalized.includes("rpc") ||
      normalized.includes("fetch")
    ) {
      return "Network is slow. Please try again. If it keeps failing, check Tempo RPC connectivity and retry.";
    }

    if (normalized.includes("execution reverted")) {
      return "Batch transaction reverted on-chain. Confirm all recipient addresses, amounts, and memo lengths before retrying.";
    }

    return rawMessage;
  }, [batchError]);

  const inputBaseClass =
    "h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-1";

  useEffect(() => {
    if (!address || blockNumber === undefined) {
      return;
    }

    void refetchBalance();
  }, [address, blockNumber, refetchBalance]);

  const updateBatchRow = (id: string, patch: Partial<BatchRecipientRow>) => {
    setBatchRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const validateBatchRows = () => {
    let hasError = false;

    const nextRows = batchRows.map((row) => {
      const recipientError = validateBatchRecipient(row.recipient);
      const amountError = validateBatchAmount(row.amount);
      const memoError = validateBatchMemo(row.memo);
      if (recipientError || amountError || memoError) {
        hasError = true;
      }
      return {
        ...row,
        recipientError,
        amountError,
        memoError,
      };
    });

    setBatchRows(nextRows);

    let computedTotal = BigInt(0);
    for (const row of nextRows) {
      if (row.amountError || !row.amount) {
        continue;
      }
      try {
        computedTotal += parseUnits(row.amount, PATHUSD_DECIMALS);
      } catch {
        hasError = true;
      }
    }

    if (computedTotal === BigInt(0)) {
      hasError = true;
      setBatchFormError("Add at least one valid recipient amount.");
      return { hasError: true, normalizedRows: nextRows };
    }

    if (balance && computedTotal > balance) {
      hasError = true;
      const needed = formatUnits(computedTotal, PATHUSD_DECIMALS);
      const available = formatUnits(balance, PATHUSD_DECIMALS);
      setBatchFormError(`Insufficient balance. You need ${needed} pathUSD but have ${available}.`);
      return { hasError: true, normalizedRows: nextRows };
    }

    setBatchFormError("");
    return { hasError, normalizedRows: nextRows };
  };

  const detectNewAddresses = async (rows: BatchRecipientRow[]) => {
    if (!publicClient) {
      return false;
    }

    const uniqueRecipients = Array.from(
      new Set(rows.map((row) => row.recipient).filter((item) => item && isAddress(item)).map((item) => getAddress(item))),
    );

    if (uniqueRecipients.length === 0) {
      return false;
    }

    try {
      const nonces = await Promise.all(
        uniqueRecipients.map((recipientAddress) => publicClient.getTransactionCount({ address: recipientAddress })),
      );
      return nonces.some((nonce) => nonce === 0);
    } catch {
      return false;
    }
  };

  const handleBatchSubmit = async () => {
    const { hasError, normalizedRows } = validateBatchRows();
    if (hasError) {
      return;
    }

    const hasNewAddress = await detectNewAddresses(normalizedRows);
    setBatchHasNewAddress(hasNewAddress);
    setBatchConfirming(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "batch") {
      void handleBatchSubmit();
      return;
    }

    const isRecipientValid = validateRecipient(recipient);
    const isAmountValid = validateAmount(amount);
    const isMemoValid = validateMemo(memo);

    if (!isRecipientValid || !isAmountValid || !isMemoValid) {
      return;
    }

    const checksummedRecipient = getAddress(recipient);
    const amountInUnits = parseUnits(amount, PATHUSD_DECIMALS);
    const matchedSession = getSessionForTransfer({
      recipient: checksummedRecipient,
      amount: amountInUnits,
    });

    if (matchedSession) {
      void executeSingleTransfer(matchedSession);
      return;
    }

    setConfirming(true);
  };

  const executeSingleTransfer = async (sessionId: ReturnType<typeof getSessionForTransfer> | null) => {
    const checksummedRecipient = getAddress(recipient);
    const amountInUnits = parseUnits(amount, PATHUSD_DECIMALS);
    const memoBytes32 = memo ? pad(stringToHex(memo), { size: 32 }) : pad("0x", { size: 32 });

    const baseRequest = {
      token: PATHUSD_ADDRESS,
      to: checksummedRecipient,
      amount: amountInUnits,
      memo: memoBytes32,
    } as const;

    try {
      if (sessionId) {
        const accessAccount = getAccessAccountForSession(sessionId);
        const request = {
          ...baseRequest,
          account: accessAccount,
          ...(sessionId.keyAuthorization ? { keyAuthorization: sessionId.keyAuthorization } : {}),
        };

        try {
          await transferSync(request);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (sessionId.keyAuthorization && message.includes("KeyAlreadyExists")) {
            clearSessionAuthorization(sessionId.id);
            await transferSync({
              ...baseRequest,
              account: accessAccount,
            });
          } else {
            throw error;
          }
        }

        applySessionSpend(sessionId.id, amountInUnits);
        if (sessionId.keyAuthorization) {
          clearSessionAuthorization(sessionId.id);
        }
      } else {
        await transferSync(baseRequest);
      }

      await refetchBalance();
      window.setTimeout(() => {
        void refetchBalance();
      }, 1200);
    } catch {
      setConfirming(false);
    }
  };

  const handleConfirmTransfer = async () => {
    await executeSingleTransfer(null);
  };

  const handleConfirmBatchTransfer = async () => {
    try {
      const calls = batchRows.map((row) => {
        const checksummedRecipient = getAddress(row.recipient);
        const amountInUnits = parseUnits(row.amount, PATHUSD_DECIMALS);
        const hasMemo = row.memo.trim().length > 0;

        const data = encodeFunctionData({
          abi: pathUsdAbi,
          functionName: hasMemo ? "transferWithMemo" : "transfer",
          args: hasMemo
            ? [checksummedRecipient, amountInUnits, pad(stringToHex(row.memo), { size: 32 })]
            : [checksummedRecipient, amountInUnits],
        });

        return {
          to: PATHUSD_ADDRESS,
          data,
        };
      });

      const totalAmount = batchRows.reduce((sum, row) => sum + parseUnits(row.amount, PATHUSD_DECIMALS), BigInt(0));
      const batchSession = getSessionForBatch({
        recipients: batchRows.map((row) => row.recipient),
        amount: totalAmount,
      });

      if (batchSession) {
        const accessAccount = getAccessAccountForSession(batchSession);
        const request = {
          calls,
          forceAtomic: true,
          account: accessAccount,
          ...(batchSession.keyAuthorization ? { keyAuthorization: batchSession.keyAuthorization } : {}),
        };

        try {
          await sendCallsSync(request);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (batchSession.keyAuthorization && message.includes("KeyAlreadyExists")) {
            clearSessionAuthorization(batchSession.id);
            await sendCallsSync({
              calls,
              forceAtomic: true,
              account: accessAccount,
            });
          } else {
            throw error;
          }
        }

        applySessionSpend(batchSession.id, totalAmount);
        if (batchSession.keyAuthorization) {
          clearSessionAuthorization(batchSession.id);
        }
      } else {
        await sendCallsSync({
          calls,
          forceAtomic: true,
        });
      }

      await refetchBalance();
      window.setTimeout(() => {
        void refetchBalance();
      }, 1200);
    } catch {
      setBatchConfirming(false);
    }
  };

  const handleReset = () => {
    setConfirming(false);
    setRecipient("");
    setAmount("");
    setMemo("");
    setRecipientError("");
    setAmountError("");
    setMemoError("");
    reset();

    setBatchConfirming(false);
    setBatchRows([createBatchRecipientRow()]);
    setBatchFormError("");
    setBatchHasNewAddress(false);
    resetBatch();
  };

  const handleCopyHash = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      window.setTimeout(() => setCopiedHash(false), 1200);
    } catch {
      setCopiedHash(false);
    }
  };

  const handleCopyBatchHash = async () => {
    if (!batchHash) {
      return;
    }

    try {
      await navigator.clipboard.writeText(batchHash);
      setCopiedBatchHash(true);
      window.setTimeout(() => setCopiedBatchHash(false), 1200);
    } catch {
      setCopiedBatchHash(false);
    }
  };

  const handleMaxAmount = () => {
    setAmount(formattedBalance);
    validateAmount(formattedBalance);
  };

  const handleBatchMaxAmount = (id: string) => {
    const available = balance ? balance : BigInt(0);
    const allocated = batchRows.reduce((sum, row) => {
      if (row.id === id || !row.amount) {
        return sum;
      }
      try {
        return sum + parseUnits(row.amount, PATHUSD_DECIMALS);
      } catch {
        return sum;
      }
    }, BigInt(0));

    const remaining = available > allocated ? available - allocated : BigInt(0);
    const normalized = formatUnits(remaining, PATHUSD_DECIMALS);
    updateBatchRow(id, {
      amount: normalized,
      amountError: validateBatchAmount(normalized),
    });
  };

  const addBatchRow = () => {
    if (batchRows.length >= MAX_BATCH_RECIPIENTS) {
      return;
    }

    setBatchRows((prev) => [...prev, createBatchRecipientRow()]);
  };

  const removeBatchRow = (id: string) => {
    setBatchRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createBatchRecipientRow()];
    });
  };

  if (isBatchSuccess && batchHash) {
    return (
      <div className="space-y-5 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-emerald-100/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Batch Transfer Successful</p>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Transaction</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm text-emerald-800" title={batchHash}>
                {shortBatchHash}
              </p>
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-800 transition-colors duration-150 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
                onClick={() => void handleCopyBatchHash()}
              >
                {copiedBatchHash ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <p className="text-xs text-emerald-800">
            {batchRows.length} recipient{batchRows.length > 1 ? "s" : ""} • Total {batchTotalFormatted} pathUSD
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/tx/${batchHash}`}
               className="inline-flex h-11 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-800 transition-colors duration-150 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              View Details
            </Link>
            <a
              href={`${EXPLORER_URL}/tx/${batchHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-800 transition-colors duration-150 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              Explorer
            </a>
          </div>
        </div>
        <button
          className="h-11 w-full rounded-xl border border-emerald-300 bg-white text-sm font-semibold text-emerald-800 transition-all duration-200 hover:bg-emerald-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
          onClick={handleReset}
          type="button"
        >
          Send Another
        </button>
      </div>
    );
  }

  if (isSuccess && hash) {
    return (
      <div className="space-y-5 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-emerald-100/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Transfer Successful</p>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">Transaction</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm text-emerald-800" title={hash}>
                {shortHash}
              </p>
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-800 transition-colors duration-150 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
                onClick={() => void handleCopyHash()}
              >
                {copiedHash ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/tx/${hash}`}
              className="inline-flex h-11 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-800 transition-colors duration-150 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              View Details
            </Link>
            <a
              href={`${EXPLORER_URL}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-800 transition-colors duration-150 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            >
              Explorer
            </a>
          </div>
        </div>
        <button
          className="h-11 w-full rounded-xl border border-emerald-300 bg-white text-sm font-semibold text-emerald-800 transition-all duration-200 hover:bg-emerald-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
          onClick={handleReset}
          type="button"
        >
          Send Another
        </button>
      </div>
    );
  }

  if (batchConfirming) {
    return (
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Confirm Batch Send</p>
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Review required</span>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-700">
          {batchRows.map((row, index) => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recipient {index + 1}</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-900">{row.recipient}</p>
              <p className="mt-2 font-mono text-sm text-slate-900">{row.amount} pathUSD</p>
              <p className="mt-1 text-xs text-slate-600">Memo: {row.memo || "-"}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p className="font-medium text-slate-900">{batchRows.length} recipients</p>
          <p>Total: {batchTotalFormatted} pathUSD</p>
        </div>

        {batchHasNewAddress && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Sending to new addresses costs more. Estimated fee: {batchEstimatedFee ?? "0.001"} pathUSD.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            disabled={isPendingAny}
            onClick={() => void handleConfirmBatchTransfer()}
          >
            {isPendingAny ? "Processing..." : "Confirm & Send Batch"}
          </button>
          <button
            type="button"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            disabled={isPendingAny}
            onClick={() => setBatchConfirming(false)}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Confirm Transfer</p>
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Review required</span>
        </div>
        <div className="space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recipient</p>
            <p className="mt-1 break-all rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900">
              {recipient}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Amount</p>
            <p className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900">
              {amount} pathUSD
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Memo</p>
            <p className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">{memo || "-"}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            disabled={isPendingAny}
            onClick={() => void handleConfirmTransfer()}
          >
            {isPendingAny ? "Processing..." : "Confirm & Send"}
          </button>
          <button
            type="button"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
            disabled={isPendingAny}
            onClick={() => setConfirming(false)}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Send pathUSD</p>
        <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">Gas sponsored</span>
      </div>

      <div className="grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setMode("single");
            setBatchConfirming(false);
            setBatchFormError("");
          }}
          className={`h-11 rounded-xl border text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 ${
            mode === "single"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Single Send
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("batch");
            setConfirming(false);
          }}
          className={`h-11 rounded-xl border text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 ${
            mode === "batch"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Batch Send
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2 md:gap-5">
        {mode === "single" ? (
          <>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="recipient" className="text-sm font-medium text-slate-900">
                Recipient Address
              </label>
              <input
                id="recipient"
                type="text"
                className={`${inputBaseClass} ${recipientError ? "border-rose-300 focus-visible:ring-rose-300/50" : "border-slate-300"}`}
                placeholder="0x..."
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  validateRecipient(e.target.value);
                }}
                disabled={isPendingAny}
              />
              {recipientError && <p className="text-xs text-rose-700">{recipientError}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="amount" className="text-sm font-medium text-slate-900">
                  Amount
                </label>
                <button
                  type="button"
                  onClick={handleMaxAmount}
                  disabled={maxDisabled}
                  className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
                >
                  Max
                </button>
              </div>
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                className={`${inputBaseClass} ${amountError ? "border-rose-300 focus-visible:ring-rose-300/50" : "border-slate-300"}`}
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const input = e.target.value;
                  const [whole, fractional = ""] = input.split(".");
                  const normalized =
                    fractional.length > PATHUSD_DECIMALS ? `${whole}.${fractional.slice(0, PATHUSD_DECIMALS)}` : input;
                  setAmount(normalized);
                  validateAmount(normalized);
                }}
                disabled={isPendingAny}
              />
              {amountError && <p className="text-xs text-rose-700">{amountError}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="memo" className="text-sm font-medium text-slate-900">
                Memo (optional)
              </label>
              <input
                id="memo"
                type="text"
                className={`${inputBaseClass} ${memoError ? "border-rose-300 focus-visible:ring-rose-300/50" : "border-slate-300"}`}
                placeholder="Payment for..."
                value={memo}
                onChange={(e) => {
                  setMemo(e.target.value);
                  validateMemo(e.target.value);
                }}
                disabled={isPendingAny}
              />
              <p className={`text-xs ${memoRemaining < 0 ? "text-rose-700" : memoRemaining <= 6 ? "text-amber-700" : "text-slate-500"}`}>
                {memoByteLength}/32 bytes
              </p>
              {memoError && <p className="text-xs text-rose-700">{memoError}</p>}
            </div>

            {transferError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 md:col-span-2">
                {singleTransferErrorMessage}
              </p>
            )}

            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 md:col-span-2"
              disabled={isPendingAny}
            >
              {isPendingAny ? "Processing..." : "Send"}
            </button>
            <p className="text-xs text-slate-500 md:col-span-2">Network fees are sponsored during testnet usage.</p>
          </>
        ) : (
          <>
            <div className="space-y-3 md:col-span-2">
              {batchRows.map((row, index) => {
                const memoBytes = new TextEncoder().encode(row.memo).length;
                const memoRemainingForRow = 32 - memoBytes;

                return (
                  <div key={row.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recipient {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeBatchRow(row.id)}
                        className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
                        disabled={batchRows.length === 1 || isPendingAny}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                      <div className="space-y-1">
                        <label htmlFor={`batch-recipient-${row.id}`} className="text-sm font-medium text-slate-900">
                          Recipient Address
                        </label>
                        <input
                          id={`batch-recipient-${row.id}`}
                          type="text"
                          className={`${inputBaseClass} break-all ${row.recipientError ? "border-rose-300 focus-visible:ring-rose-300/50" : "border-slate-300"}`}
                          placeholder="0x..."
                          value={row.recipient}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateBatchRow(row.id, {
                              recipient: value,
                              recipientError: validateBatchRecipient(value),
                            });
                          }}
                          disabled={isPendingAny}
                        />
                        {row.recipientError && <p className="text-xs text-rose-700">{row.recipientError}</p>}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <label htmlFor={`batch-amount-${row.id}`} className="text-sm font-medium text-slate-900">
                            Amount
                          </label>
                          <button
                            type="button"
                            onClick={() => handleBatchMaxAmount(row.id)}
                            disabled={maxDisabled}
                            className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
                          >
                            Max
                          </button>
                        </div>
                        <input
                          id={`batch-amount-${row.id}`}
                          type="text"
                          inputMode="decimal"
                          className={`${inputBaseClass} ${row.amountError ? "border-rose-300 focus-visible:ring-rose-300/50" : "border-slate-300"}`}
                          placeholder="0.00"
                          value={row.amount}
                          onChange={(e) => {
                            const input = e.target.value;
                            const [whole, fractional = ""] = input.split(".");
                            const normalized =
                              fractional.length > PATHUSD_DECIMALS
                                ? `${whole}.${fractional.slice(0, PATHUSD_DECIMALS)}`
                                : input;
                            updateBatchRow(row.id, {
                              amount: normalized,
                              amountError: validateBatchAmount(normalized),
                            });
                          }}
                          disabled={isPendingAny}
                        />
                        {row.amountError && <p className="text-xs text-rose-700">{row.amountError}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`batch-memo-${row.id}`} className="text-sm font-medium text-slate-900">
                        Memo (optional)
                      </label>
                      <input
                        id={`batch-memo-${row.id}`}
                        type="text"
                        className={`${inputBaseClass} ${row.memoError ? "border-rose-300 focus-visible:ring-rose-300/50" : "border-slate-300"}`}
                        placeholder="Payment for..."
                        value={row.memo}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateBatchRow(row.id, {
                            memo: value,
                            memoError: validateBatchMemo(value),
                          });
                        }}
                        disabled={isPendingAny}
                      />
                      <p
                        className={`text-xs ${
                          memoRemainingForRow < 0
                            ? "text-rose-700"
                            : memoRemainingForRow <= 6
                              ? "text-amber-700"
                              : "text-slate-500"
                        }`}
                      >
                        {memoBytes}/32 bytes
                      </p>
                      {row.memoError && <p className="text-xs text-rose-700">{row.memoError}</p>}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addBatchRow}
                disabled={batchRows.length >= MAX_BATCH_RECIPIENTS || isPendingAny}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
              >
                Add Recipient
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 md:col-span-2">
              <p className="font-medium text-slate-900">{batchRows.length} recipients</p>
              <p>Total: {batchTotalFormatted} pathUSD</p>
            </div>

            {batchFormError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 md:col-span-2">
                {batchFormError}
              </p>
            )}

            {batchError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 md:col-span-2">
                {batchTransferErrorMessage}
              </p>
            )}

            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 md:col-span-2"
              disabled={isPendingAny}
            >
              {isPendingAny ? "Processing..." : "Review Batch"}
            </button>
            <p className="text-xs text-slate-500 md:col-span-2">
              Batch uses native Tempo atomic calls. Network fees remain sponsored during testnet usage.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
