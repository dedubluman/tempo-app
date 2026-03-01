import { isAddress, getAddress } from "viem";
import { getTokenBySymbol } from "@/lib/tokens";
import type { TokenInfo } from "@/types/token";

const MAX_INPUT_LENGTH = 500;

// --- Input Sanitization ---

export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // HTML tags
    .replace(/[\x00-\x1F\x7F]/g, "") // Control characters
    .replace(/\\x[0-9a-fA-F]{2}/g, "") // Hex escape sequences
    .replace(/%[0-9a-fA-F]{2}/g, "") // URL encoding
    .replace(/\[SYSTEM\]/gi, "")
    .replace(/\[INST\]/gi, "")
    .replace(/<<SYS>>/gi, "")
    .replace(/<\/s>/gi, "")
    .slice(0, MAX_INPUT_LENGTH)
    .trim();
}

// --- Prompt Injection Detection ---

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|system)\s+instructions?/i,
  /forget\s+(previous|all|system)\s+instructions?/i,
  /disregard\s+(previous|all|system)\s+instructions?/i,
  /override\s+(previous|all|system)\s+instructions?/i,
  /system\s*:\s*/i,
  /you\s+are\s+now/i,
  /new\s+role\s*:/i,
  /act\s+as\s+/i,
  /pretend\s+to\s+be/i,
  /jailbreak/i,
  /DAN\s+mode/i,
];

export function detectPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

// --- Address Validation ---

const BLACKLISTED_ADDRESSES = new Set([
  "0x0000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000dead",
]);

interface AddressValidationResult {
  isValid: boolean;
  normalized?: `0x${string}`;
  error?: string;
}

export function validateAddress(address: string): AddressValidationResult {
  if (!isAddress(address)) {
    return { isValid: false, error: "Invalid address format" };
  }

  try {
    const normalized = getAddress(address);

    if (BLACKLISTED_ADDRESSES.has(normalized.toLowerCase())) {
      return { isValid: false, error: "This address is blocked for security reasons" };
    }

    return { isValid: true, normalized };
  } catch {
    return { isValid: false, error: "Address checksum error" };
  }
}

// --- Amount Validation ---

const MAX_TRANSFER_AMOUNT = 1_000_000;

interface AmountValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateAmount(amount: string): AmountValidationResult {
  if (!/^\d+\.?\d*$/.test(amount)) {
    return { isValid: false, error: "Invalid amount format" };
  }

  const num = parseFloat(amount);

  if (num <= 0) {
    return { isValid: false, error: "Amount must be positive" };
  }

  if (num > MAX_TRANSFER_AMOUNT) {
    return { isValid: false, error: `Maximum transfer amount is ${MAX_TRANSFER_AMOUNT.toLocaleString()}` };
  }

  return { isValid: true };
}

// --- Token Validation ---

const TOKEN_ALIASES: Record<string, string> = {
  pathusd: "pathUSD",
  path: "pathUSD",
  alphausd: "AlphaUSD",
  alpha: "AlphaUSD",
  betausd: "BetaUSD",
  beta: "BetaUSD",
  thetausd: "ThetaUSD",
  theta: "ThetaUSD",
};

export function validateToken(tokenSymbol: string): TokenInfo | null {
  const resolved = TOKEN_ALIASES[tokenSymbol.toLowerCase()] ?? tokenSymbol;
  return getTokenBySymbol(resolved) ?? null;
}
