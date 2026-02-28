import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: Parameters<typeof intlMiddleware>[0]) {
  if (process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === "1") {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except API routes, Next.js internals, and static files
  // CRITICAL: This matcher prevents next-intl from interfering with /api/* routes
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
