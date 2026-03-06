import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rateLimiter";
import { callGemini } from "@/lib/ai/geminiClient";
import {
  sanitizeInput,
  detectPromptInjection,
  validateAddress,
  validateAmount,
  validateToken,
} from "@/lib/ai/validation";
import { AgentErrorType } from "@/lib/ai/types";
import type {
  ParsedIntent,
  AgentApiRequest,
  AgentErrorResponse,
} from "@/lib/ai/types";

const MAX_BODY_BYTES = 4 * 1024;

// 30 requests per minute, in-memory sliding window
const rateLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000 });

function errorResponse(
  error: string,
  errorType: AgentErrorType,
  status: number,
  retryAfter?: number,
): NextResponse {
  const body: AgentErrorResponse = {
    action: "unknown",
    error,
    errorType,
    retryAfter,
  };
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    if (!rateLimiter.canProceed()) {
      const retryAfter = Math.ceil(rateLimiter.resetIn() / 1000);
      return errorResponse(
        "Too many requests. Please wait a moment.",
        AgentErrorType.RATE_LIMITED,
        429,
        retryAfter,
      );
    }
    rateLimiter.record();

    // 2. Body size check
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return errorResponse(
        "Request too large",
        AgentErrorType.EMPTY_INPUT,
        413,
      );
    }

    const body = (await request.json()) as AgentApiRequest;

    if (!body.message) {
      return errorResponse(
        "Missing required field: message",
        AgentErrorType.EMPTY_INPUT,
        400,
      );
    }

    // 3. Input sanitization
    const sanitized = sanitizeInput(body.message);
    if (!sanitized) {
      return errorResponse(
        "Empty message after sanitization",
        AgentErrorType.EMPTY_INPUT,
        400,
      );
    }

    // 4. Prompt injection detection
    if (detectPromptInjection(sanitized)) {
      return errorResponse(
        "Your message was blocked by security filters. Please rephrase your payment request.",
        AgentErrorType.INJECTION_DETECTED,
        400,
      );
    }

    // 4b. Reject explicit negative amounts in user input
    if (/-\s*\d/.test(sanitized)) {
      return errorResponse(
        "Amount must be positive",
        AgentErrorType.INVALID_AMOUNT,
        400,
      );
    }

    // 5. Call Gemini API (with retry)
    let parsed: ParsedIntent;
    try {
      parsed = await callGemini(sanitized);
    } catch (error) {
      const err = error as Error & { errorType?: AgentErrorType };
      const errorType = err.errorType ?? AgentErrorType.AI_API_ERROR;
      const status = errorType === AgentErrorType.AI_TIMEOUT ? 504 : 502;
      return errorResponse(
        err.message || "AI processing failed",
        errorType,
        status,
      );
    }

    // 6. Validate parsed intent
    if (parsed.action === "transfer") {
      // Address validation
      if (parsed.recipient) {
        const addrResult = validateAddress(parsed.recipient);
        if (!addrResult.isValid) {
          return errorResponse(
            addrResult.error!,
            AgentErrorType.INVALID_ADDRESS,
            200,
          );
        }
        parsed.recipient = addrResult.normalized;
      } else {
        return errorResponse(
          "Could not determine a valid recipient address.",
          AgentErrorType.INVALID_ADDRESS,
          200,
        );
      }

      // Amount validation
      if (parsed.amount) {
        const amountResult = validateAmount(parsed.amount);
        if (!amountResult.isValid) {
          return errorResponse(
            amountResult.error!,
            AgentErrorType.INVALID_AMOUNT,
            200,
          );
        }
      } else {
        return errorResponse(
          "Could not determine a valid amount.",
          AgentErrorType.INVALID_AMOUNT,
          200,
        );
      }

      // Token validation
      const tokenSymbol = parsed.token || "pathUSD";
      const tokenInfo = validateToken(tokenSymbol);
      if (!tokenInfo) {
        return errorResponse(
          `Unknown token: "${tokenSymbol}". Available: pathUSD, AlphaUSD, BetaUSD, ThetaUSD`,
          AgentErrorType.INVALID_TOKEN,
          200,
        );
      }
      parsed.token = tokenInfo.symbol;
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, AgentErrorType.AI_API_ERROR, 500);
  }
}
