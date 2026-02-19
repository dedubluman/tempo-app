"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useBlockNumber, usePublicClient, useReadContract, useSendCallsSync } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { encodeFunctionData, formatUnits, getAddress, isAddress, pad, parseUnits, stringToHex } from "viem";
import type { Address } from "viem";
import { PATHUSD_ADDRESS, PATHUSD_DECIMALS, EXPLORER_URL } from "@/lib/constants";
import { pathUsdAbi } from "@/lib/abi";
import {
  applySessionSpend,
  clearSessionAuthorization,
  getAccessAccountForSession,
  getSessionForBatch,
  getSessionForTransfer,
} from "@/lib/sessionManager";
import { addTransferHistoryEntries } from "@/lib/transactionHistoryStore";
import type { TransferMode, TransferStep, BatchRow } from "@/types/ui";

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

function createBatchRow(): BatchRecipientRow {
  return {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}`,
    recipient: "",
    amount: "",
    memo: "",
    recipientError: "",
    amountError: "",
    memoError: "",
  };
}

export interface UseTransferFlowReturn {
  step: TransferStep;
  mode: TransferMode;
  setMode: (m: TransferMode) => void;

  recipient: string;
  setRecipient: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  memo: string;
  setMemo: (v: string) => void;
  recipientError: string;
  amountError: string;
  memoError: string;

  balance: bigint | undefined;
  formattedBalance: string;
  isBalanceLoading: boolean;

  rows: BatchRecipientRow[];
  addRow: () => void;
  removeRow: (id: string) => void;
  updateRow: (id: string, patch: Partial<BatchRecipientRow>) => void;
  handleBatchMaxAmount: (id: string) => void;
  batchTotalFormatted: string;
  batchFormError: string;
  batchHasNewAddress: boolean;

  confirming: boolean;
  batchConfirming: boolean;

  memoByteLength: number;
  memoRemaining: number;

  isSubmitting: boolean;
  isBatchSubmitting: boolean;

  txHash: string | undefined;
  batchHash: string | undefined;
  isSuccess: boolean;
  isBatchSuccess: boolean;
  txErrorMessage: string;
  batchErrorMessage: string;

  explorerUrl: (hash: string) => string;

  copiedHash: boolean;
  copiedBatchHash: boolean;
  handleCopyHash: () => Promise<void>;
  handleCopyBatchHash: () => Promise<void>;

  maxDisabled: boolean;
  setMax: () => void;

  handleSubmit: (e: React.FormEvent) => void;
  handleConfirmTransfer: () => Promise<void>;
  handleConfirmBatchTransfer: () => Promise<void>;
  reset: () => void;
}

export function useTransferFlow(): UseTransferFlowReturn {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [mode, setMode] = useState<TransferMode>("single");
  const [step, setStep] = useState<TransferStep>("edit");

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [recipientError, setRecipientError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [memoError, setMemoError] = useState("");

  const [rows, setRows] = useState<BatchRecipientRow[]>([createBatchRow()]);
  const [batchFormError, setBatchFormError] = useState("");
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [batchHasNewAddress, setBatchHasNewAddress] = useState(false);

  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedBatchHash, setCopiedBatchHash] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const { data: blockNumber } = useBlockNumber({
    watch: true,
    query: { enabled: !!address },
  });

  const {
    data: balance,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: PATHUSD_ADDRESS,
    abi: pathUsdAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const {
    mutateAsync: transferSync,
    data: transferResult,
    isPending,
    error: transferError,
    reset: resetTransfer,
  } = Hooks.token.useTransferSync();

  const {
    mutateAsync: sendCallsSync,
    data: batchResult,
    isPending: isBatchPending,
    error: batchError,
    reset: resetBatch,
  } = useSendCallsSync();

  useEffect(() => {
    if (!address || blockNumber === undefined) return;
    void refetchBalance();
  }, [address, blockNumber, refetchBalance]);

  const formattedBalance = balance ? formatUnits(balance, PATHUSD_DECIMALS) : "0";
  const maxDisabled = isPending || isBatchPending || isBalanceLoading || !balance || formattedBalance === "0";

  const memoByteLength = new TextEncoder().encode(memo).length;
  const memoRemaining = 32 - memoByteLength;

  const txHash = transferResult?.receipt.transactionHash;
  const batchHash = batchResult?.receipts?.[0]?.transactionHash;
  const isSuccess = Boolean(txHash);
  const isBatchSuccess = Boolean(batchHash);

  const batchTotalInUnits = useMemo(() => {
    return rows.reduce((sum, row) => {
      if (!row.amount) return sum;
      try { return sum + parseUnits(row.amount, PATHUSD_DECIMALS); }
      catch { return sum; }
    }, BigInt(0));
  }, [rows]);

  const batchTotalFormatted = useMemo(
    () => formatUnits(batchTotalInUnits, PATHUSD_DECIMALS),
    [batchTotalInUnits]
  );

  const txErrorMessage = useMemo(() => {
    if (!transferError) return "";
    const raw = transferError.message.split("\n")[0];
    const n = transferError.message.toLowerCase();
    if (n.includes("user rejected") || n.includes("user denied") || n.includes("rejected"))
      return "Transfer cancelled in passkey confirmation. Review the details and approve to send.";
    if (n.includes("insufficient funds") || n.includes("insufficient balance") || n.includes("gas") || n.includes("fee") || n.includes("sponsor"))
      return "Transaction sponsorship failed. Try a smaller amount. If the recipient is a new address, fund your wallet with native testnet tokens and retry.";
    if (n.includes("network") || n.includes("timeout") || n.includes("rpc") || n.includes("fetch"))
      return "Network is slow. Please try again. If it keeps failing, check Tempo RPC connectivity and retry.";
    if (n.includes("execution reverted"))
      return "Transfer reverted on-chain. Confirm recipient address, amount, and that you are using the current receive address.";
    return raw;
  }, [transferError]);

  const batchErrorMessage = useMemo(() => {
    if (!batchError) return "";
    const raw = batchError.message.split("\n")[0];
    const n = batchError.message.toLowerCase();
    if (n.includes("user rejected") || n.includes("user denied") || n.includes("rejected"))
      return "Batch send cancelled in passkey confirmation. Review recipients and approve to continue.";
    if (n.includes("insufficient funds") || n.includes("insufficient balance") || n.includes("gas") || n.includes("fee") || n.includes("sponsor"))
      return "Transaction sponsorship failed. Try a smaller amount. If recipients are new wallets, fund with native testnet tokens and retry.";
    if (n.includes("network") || n.includes("timeout") || n.includes("rpc") || n.includes("fetch"))
      return "Network is slow. Please try again. If it keeps failing, check Tempo RPC connectivity and retry.";
    if (n.includes("execution reverted"))
      return "Batch transaction reverted on-chain. Confirm all recipient addresses, amounts, and memo lengths before retrying.";
    return raw;
  }, [batchError]);

  const validateRecipient = useCallback((value: string): boolean => {
    if (!value) { setRecipientError("Recipient address required"); return false; }
    if (!isAddress(value)) { setRecipientError("Invalid address format"); return false; }
    const checksummed = getAddress(value);
    if (checksummed === "0x0000000000000000000000000000000000000000") { setRecipientError("Cannot send to zero address"); return false; }
    if (address && checksummed === getAddress(address)) { setRecipientError("Cannot send to your own address"); return false; }
    setRecipientError(""); return true;
  }, [address]);

  const validateAmount = useCallback((value: string): boolean => {
    if (!value) { setAmountError("Amount required"); return false; }
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) { setAmountError("Amount must be greater than 0"); return false; }
    const decimalPart = value.split(".")[1];
    if (decimalPart && decimalPart.length > PATHUSD_DECIMALS) { setAmountError(`Max ${PATHUSD_DECIMALS} decimal places`); return false; }
    try {
      if (balance) {
        const amountInUnits = parseUnits(value, PATHUSD_DECIMALS);
        if (amountInUnits > balance) {
          setAmountError(`Insufficient balance. You need ${formatUnits(amountInUnits, PATHUSD_DECIMALS)} pathUSD but have ${formatUnits(balance, PATHUSD_DECIMALS)}.`);
          return false;
        }
      }
    } catch { setAmountError("Invalid amount format"); return false; }
    setAmountError(""); return true;
  }, [balance]);

  const validateMemo = useCallback((value: string): boolean => {
    const byteLength = new TextEncoder().encode(value).length;
    if (byteLength > 32) { setMemoError("Memo exceeds 32 bytes"); return false; }
    setMemoError(""); return true;
  }, []);

  const validateBatchRecipient = (value: string): string => {
    if (!value) return "Recipient address required";
    if (!isAddress(value)) return "Invalid address format";
    const checksummed = getAddress(value);
    if (checksummed === "0x0000000000000000000000000000000000000000") return "Cannot send to zero address";
    if (address && checksummed === getAddress(address)) return "Cannot send to your own address";
    return "";
  };

  const validateBatchAmount = (value: string): string => {
    if (!value) return "Amount required";
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return "Amount must be greater than 0";
    const decimalPart = value.split(".")[1];
    if (decimalPart && decimalPart.length > PATHUSD_DECIMALS) return `Max ${PATHUSD_DECIMALS} decimal places`;
    try { parseUnits(value, PATHUSD_DECIMALS); } catch { return "Invalid amount format"; }
    return "";
  };

  const validateBatchMemo = (value: string): string => {
    const byteLength = new TextEncoder().encode(value).length;
    return byteLength > 32 ? "Memo exceeds 32 bytes" : "";
  };

  const updateRow = useCallback((id: string, patch: Partial<BatchRecipientRow>) => {
    setRows((prev) => prev.map((row) => row.id === id ? { ...row, ...patch } : row));
  }, []);

  const addRow = useCallback(() => {
    if (rows.length >= MAX_BATCH_RECIPIENTS) return;
    setRows((prev) => [...prev, createBatchRow()]);
  }, [rows.length]);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createBatchRow()];
    });
  }, []);

  const handleBatchMaxAmount = useCallback((id: string) => {
    const available = balance ?? BigInt(0);
    const allocated = rows.reduce((sum, row) => {
      if (row.id === id || !row.amount) return sum;
      try { return sum + parseUnits(row.amount, PATHUSD_DECIMALS); }
      catch { return sum; }
    }, BigInt(0));
    const remaining = available > allocated ? available - allocated : BigInt(0);
    const normalized = formatUnits(remaining, PATHUSD_DECIMALS);
    updateRow(id, { amount: normalized, amountError: validateBatchAmount(normalized) });
  }, [balance, rows, updateRow]);

  const validateBatchRows = () => {
    let hasError = false;
    const nextRows = rows.map((row) => {
      const re = validateBatchRecipient(row.recipient);
      const ae = validateBatchAmount(row.amount);
      const me = validateBatchMemo(row.memo);
      if (re || ae || me) hasError = true;
      return { ...row, recipientError: re, amountError: ae, memoError: me };
    });
    setRows(nextRows);

    let computedTotal = BigInt(0);
    for (const row of nextRows) {
      if (row.amountError || !row.amount) continue;
      try { computedTotal += parseUnits(row.amount, PATHUSD_DECIMALS); }
      catch { hasError = true; }
    }

    if (computedTotal === BigInt(0)) {
      hasError = true;
      setBatchFormError("Add at least one valid recipient amount.");
      return { hasError: true, normalizedRows: nextRows };
    }

    if (balance && computedTotal > balance) {
      hasError = true;
      setBatchFormError(`Insufficient balance. You need ${formatUnits(computedTotal, PATHUSD_DECIMALS)} pathUSD but have ${formatUnits(balance, PATHUSD_DECIMALS)}.`);
      return { hasError: true, normalizedRows: nextRows };
    }

    setBatchFormError("");
    return { hasError, normalizedRows: nextRows };
  };

  const detectNewAddresses = async (batchRows: BatchRecipientRow[]) => {
    if (!publicClient) return false;
    const uniqueRecipients = Array.from(
      new Set(batchRows.map((r) => r.recipient).filter((r) => r && isAddress(r)).map((r) => getAddress(r as Address)))
    );
    if (uniqueRecipients.length === 0) return false;
    try {
      const nonces = await Promise.all(
        uniqueRecipients.map((r) => publicClient.getTransactionCount({ address: r }))
      );
      return nonces.some((n) => n === 0);
    } catch { return false; }
  };

  const handleBatchSubmit = async () => {
    const { hasError, normalizedRows } = validateBatchRows();
    if (hasError) return;
    const hasNewAddress = await detectNewAddresses(normalizedRows);
    setBatchHasNewAddress(hasNewAddress);
    setBatchConfirming(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "batch") { void handleBatchSubmit(); return; }
    const recipientOk = validateRecipient(recipient);
    const amountOk = validateAmount(amount);
    const memoOk = validateMemo(memo);
    if (!recipientOk || !amountOk || !memoOk) return;

    const checksummedRecipient = getAddress(recipient);
    const amountInUnits = parseUnits(amount, PATHUSD_DECIMALS);
    const matchedSession = getSessionForTransfer({ recipient: checksummedRecipient, amount: amountInUnits });

    if (matchedSession) { void executeSingleTransfer(matchedSession); return; }
    setConfirming(true);
  };

  const executeSingleTransfer = async (sessionId: ReturnType<typeof getSessionForTransfer> | null) => {
    const checksummedRecipient = getAddress(recipient);
    const amountInUnits = parseUnits(amount, PATHUSD_DECIMALS);
    const memoBytes32 = memo ? pad(stringToHex(memo), { size: 32 }) : pad("0x", { size: 32 });
    const baseRequest = { token: PATHUSD_ADDRESS, to: checksummedRecipient, amount: amountInUnits, memo: memoBytes32 } as const;

    try {
      let transactionHash: `0x${string}` | undefined;
      if (sessionId) {
        const accessAccount = getAccessAccountForSession(sessionId);
        const request = { ...baseRequest, account: accessAccount, ...(sessionId.keyAuthorization ? { keyAuthorization: sessionId.keyAuthorization } : {}) };
        try {
          const response = await transferSync(request);
          transactionHash = response?.receipt?.transactionHash;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (sessionId.keyAuthorization && message.includes("KeyAlreadyExists")) {
            clearSessionAuthorization(sessionId.id);
            const response = await transferSync({ ...baseRequest, account: accessAccount });
            transactionHash = response?.receipt?.transactionHash;
          } else { throw error; }
        }
        applySessionSpend(sessionId.id, amountInUnits);
        if (sessionId.keyAuthorization) clearSessionAuthorization(sessionId.id);
      } else {
        const response = await transferSync(baseRequest);
        transactionHash = response?.receipt?.transactionHash;
      }

      if (address && transactionHash) {
        addTransferHistoryEntries([{
          id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`,
          transactionHash,
          counterparty: checksummedRecipient,
          amount: amountInUnits,
          direction: "sent",
          createdAtMs: Date.now(),
        }]);
      }
      await refetchBalance();
      window.setTimeout(() => { void refetchBalance(); }, 1200);
    } catch { setConfirming(false); }
  };

  const handleConfirmTransfer = async () => { await executeSingleTransfer(null); };

  const handleConfirmBatchTransfer = async () => {
    try {
      const calls = rows.map((row) => {
        const checksummedRecipient = getAddress(row.recipient);
        const amountInUnits = parseUnits(row.amount, PATHUSD_DECIMALS);
        const hasMemo = row.memo.trim().length > 0;
        const data = encodeFunctionData({
          abi: pathUsdAbi,
          functionName: hasMemo ? "transferWithMemo" : "transfer",
          args: hasMemo ? [checksummedRecipient, amountInUnits, pad(stringToHex(row.memo), { size: 32 })] : [checksummedRecipient, amountInUnits],
        });
        return { to: PATHUSD_ADDRESS, data };
      });

      const totalAmount = rows.reduce((sum, row) => sum + parseUnits(row.amount, PATHUSD_DECIMALS), BigInt(0));
      const batchSession = getSessionForBatch({ recipients: rows.map((r) => r.recipient), amount: totalAmount });

      let transactionHash: `0x${string}` | undefined;

      if (batchSession) {
        const accessAccount = getAccessAccountForSession(batchSession);
        const request = { calls, forceAtomic: true, account: accessAccount, ...(batchSession.keyAuthorization ? { keyAuthorization: batchSession.keyAuthorization } : {}) };
        try {
          const response = await sendCallsSync(request);
          transactionHash = response?.receipts?.[0]?.transactionHash;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (batchSession.keyAuthorization && message.includes("KeyAlreadyExists")) {
            clearSessionAuthorization(batchSession.id);
            const response = await sendCallsSync({ calls, forceAtomic: true, account: accessAccount });
            transactionHash = response?.receipts?.[0]?.transactionHash;
          } else { throw error; }
        }
        applySessionSpend(batchSession.id, totalAmount);
        if (batchSession.keyAuthorization) clearSessionAuthorization(batchSession.id);
      } else {
        const response = await sendCallsSync({ calls, forceAtomic: true });
        transactionHash = response?.receipts?.[0]?.transactionHash;
      }

      if (address && transactionHash) {
        addTransferHistoryEntries(rows.map((row, index) => ({
          id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${index}`,
          transactionHash: transactionHash!,
          counterparty: getAddress(row.recipient),
          amount: parseUnits(row.amount, PATHUSD_DECIMALS),
          direction: "sent" as const,
          createdAtMs: Date.now(),
        })));
      }

      await refetchBalance();
      window.setTimeout(() => { void refetchBalance(); }, 1200);
    } catch { setBatchConfirming(false); }
  };

  const reset = useCallback(() => {
    setConfirming(false);
    setStep("edit");
    setRecipient(""); setAmount(""); setMemo("");
    setRecipientError(""); setAmountError(""); setMemoError("");
    resetTransfer();
    setBatchConfirming(false);
    setRows([createBatchRow()]);
    setBatchFormError("");
    setBatchHasNewAddress(false);
    resetBatch();
  }, [resetTransfer, resetBatch]);

  const setMax = useCallback(() => {
    setAmount(formattedBalance);
    validateAmount(formattedBalance);
  }, [formattedBalance, validateAmount]);

  const handleCopyHash = useCallback(async () => {
    if (!txHash) return;
    try { await navigator.clipboard.writeText(txHash); setCopiedHash(true); window.setTimeout(() => setCopiedHash(false), 1200); }
    catch { setCopiedHash(false); }
  }, [txHash]);

  const handleCopyBatchHash = useCallback(async () => {
    if (!batchHash) return;
    try { await navigator.clipboard.writeText(batchHash); setCopiedBatchHash(true); window.setTimeout(() => setCopiedBatchHash(false), 1200); }
    catch { setCopiedBatchHash(false); }
  }, [batchHash]);

  const explorerUrl = useCallback((hash: string) => `${EXPLORER_URL}/tx/${hash}`, []);

  return {
    step, mode, setMode,
    recipient, setRecipient, amount, setAmount, memo, setMemo,
    recipientError, amountError, memoError,
    balance, formattedBalance, isBalanceLoading,
    rows, addRow, removeRow, updateRow, handleBatchMaxAmount,
    batchTotalFormatted, batchFormError, batchHasNewAddress,
    confirming, batchConfirming,
    memoByteLength, memoRemaining,
    isSubmitting: isPending,
    isBatchSubmitting: isBatchPending,
    txHash, batchHash, isSuccess, isBatchSuccess,
    txErrorMessage, batchErrorMessage,
    explorerUrl,
    copiedHash, copiedBatchHash, handleCopyHash, handleCopyBatchHash,
    maxDisabled, setMax,
    handleSubmit, handleConfirmTransfer, handleConfirmBatchTransfer,
    reset,
  };
}
