export interface ParsedIntent {
  action: "transfer" | "balance" | "unknown";
  recipient?: string;
  amount?: string;
  token?: string;
  memo?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  intent?: ParsedIntent;
  txHash?: string;
  timestamp: number;
}

export enum AgentErrorType {
  RATE_LIMITED = "RATE_LIMITED",
  INJECTION_DETECTED = "INJECTION_DETECTED",
  INVALID_ADDRESS = "INVALID_ADDRESS",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  INVALID_TOKEN = "INVALID_TOKEN",
  AI_PARSE_FAILED = "AI_PARSE_FAILED",
  AI_API_ERROR = "AI_API_ERROR",
  AI_TIMEOUT = "AI_TIMEOUT",
  EMPTY_INPUT = "EMPTY_INPUT",
  VALIDATION_FAILED = "VALIDATION_FAILED",
}

export interface AgentErrorResponse {
  action: "unknown";
  error: string;
  errorType: AgentErrorType;
  retryAfter?: number;
}

export interface AgentError {
  type: AgentErrorType;
  message: string;
  userMessage: string;
  recoverable: boolean;
  retryAfter?: number;
}

export interface AgentApiRequest {
  message: string;
}
