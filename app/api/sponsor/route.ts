import { NextRequest, NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const MAX_BODY_BYTES = 10 * 1024;
const sponsorUrl = process.env.NEXT_PUBLIC_FEE_SPONSOR_URL || 'https://sponsor.moderato.tempo.xyz';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (!forwardedFor) {
    return 'unknown';
  }
  return forwardedFor.split(',')[0]?.trim() || 'unknown';
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

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = enforceRateLimit(ip);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please retry later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    if (typeof payload.jsonrpc !== 'string' && typeof payload.method !== 'string') {
      return NextResponse.json(
        { error: 'Request must include jsonrpc or method field' },
        { status: 400 },
      );
    }

    const response = await fetch(sponsorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Fee sponsorship unavailable, try again' },
      { status: 503 },
    );
  }
}
