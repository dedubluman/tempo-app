import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  hasAnyPasskeyMappings,
  isPasskeyRegistryReady,
  resolvePasskeyMapping,
  upsertPasskeyMapping,
} from "@/lib/server/passkeyMappingDatabase";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const MAX_BODY_BYTES = 4 * 1024;

type ActionPayload =
  | { action: "hasAny" }
  | { action: "resolve"; credentialId: string }
  | { action: "upsert"; credentialId: string; address: string };

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return "unknown";
  }
  return forwardedFor.split(",")[0]?.trim() || "unknown";
}

function enforceRateLimit(ip: string): { limited: false } | { limited: true; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (!existing || now >= existing.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false };
  }

  if (existing.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { limited: true, retryAfterSeconds };
  }

  existing.count += 1;
  rateLimitStore.set(ip, existing);
  return { limited: false };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseActionPayload(value: unknown): ActionPayload | null {
  if (!isObject(value) || typeof value.action !== "string") {
    return null;
  }

  if (value.action === "hasAny") {
    return { action: "hasAny" };
  }

  if (value.action === "resolve") {
    if (typeof value.credentialId !== "string" || value.credentialId.length < 8 || value.credentialId.length > 4096) {
      return null;
    }
    return {
      action: "resolve",
      credentialId: value.credentialId,
    };
  }

  if (value.action === "upsert") {
    if (
      typeof value.credentialId !== "string" ||
      value.credentialId.length < 8 ||
      value.credentialId.length > 4096 ||
      typeof value.address !== "string" ||
      !isAddress(value.address)
    ) {
      return null;
    }

    return {
      action: "upsert",
      credentialId: value.credentialId,
      address: value.address,
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = enforceRateLimit(ip);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please retry later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  if (!isPasskeyRegistryReady()) {
    return NextResponse.json(
      { error: "Passkey registry is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body too large." },
      { status: 413 },
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const payload = parseActionPayload(parsedBody);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;

  if (payload.action === "hasAny") {
    return NextResponse.json({ hasAny: hasAnyPasskeyMappings() }, { status: 200 });
  }

  if (payload.action === "resolve") {
    const result = resolvePasskeyMapping({
      origin,
      credentialId: payload.credentialId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Failed to resolve passkey mapping." },
        { status: 500 },
      );
    }

    return NextResponse.json({ address: result.address }, { status: 200 });
  }

  const result = upsertPasskeyMapping({
    origin,
    credentialId: payload.credentialId,
    address: payload.address,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to persist passkey mapping." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
