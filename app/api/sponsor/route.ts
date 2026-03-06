import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const MAX_BODY_BYTES = 10 * 1024;
const sponsorUrl =
  process.env.FEE_SPONSOR_URL || "https://sponsor.moderato.tempo.xyz";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// Initialize Redis client (conditional)
let kv: Redis | null = null;

if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  kv = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
} else {
  console.warn(
    "[Rate Limit] KV_REST_API_URL not configured — running in-memory mode (will reset on cold start)",
  );
}

// Fallback in-memory store (used when KV not configured)
const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return "unknown";
  }
  return forwardedFor.split(",")[0]?.trim() || "unknown";
}

async function enforceRateLimit(
  ip: string,
): Promise<
  | { limited: false; remaining: number; resetAt: number }
  | { limited: true; retryAfterSeconds: number; resetAt: number }
> {
  const now = Date.now();

  if (kv) {
    // Use persistent Redis storage
    const key = `ratelimit:${ip}`;
    const existing = await kv.get<RateLimitEntry>(key);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + WINDOW_MS;
      await kv.set(key, { count: 1, resetAt }, { ex: 60 });
      return { limited: false, remaining: MAX_REQUESTS - 1, resetAt };
    }

    if (existing.count >= MAX_REQUESTS) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      );
      return { limited: true, retryAfterSeconds, resetAt: existing.resetAt };
    }

    const updated = { count: existing.count + 1, resetAt: existing.resetAt };
    const ttl = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    await kv.set(key, updated, { ex: ttl });
    return {
      limited: false,
      remaining: MAX_REQUESTS - updated.count,
      resetAt: updated.resetAt,
    };
  } else {
    // Fallback to in-memory (resets on cold start)
    const existing = rateLimitStore.get(ip);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + WINDOW_MS;
      rateLimitStore.set(ip, { count: 1, resetAt });
      return { limited: false, remaining: MAX_REQUESTS - 1, resetAt };
    }

    if (existing.count >= MAX_REQUESTS) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      );
      return { limited: true, retryAfterSeconds, resetAt: existing.resetAt };
    }

    existing.count += 1;
    rateLimitStore.set(ip, existing);
    return {
      limited: false,
      remaining: MAX_REQUESTS - existing.count,
      resetAt: existing.resetAt,
    };
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await enforceRateLimit(ip);

  const remaining = rateLimit.limited ? 0 : rateLimit.remaining;
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(MAX_REQUESTS),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
  };

  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please retry later." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    if (
      typeof payload.jsonrpc !== "string" &&
      typeof payload.method !== "string"
    ) {
      return NextResponse.json(
        { error: "Request must include jsonrpc or method field" },
        { status: 400 },
      );
    }

    const response = await fetch(sponsorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: rateLimitHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Fee sponsorship unavailable, try again" },
      { status: 503 },
    );
  }
}
