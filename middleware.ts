import { NextRequest, NextResponse } from "next/server";

const DEFAULT_LOCALE_PREFIX = "/en";

function getCanonicalPath(pathname: string): string | null {
  if (pathname === DEFAULT_LOCALE_PREFIX) {
    return "/";
  }

  if (pathname.startsWith(`${DEFAULT_LOCALE_PREFIX}/`)) {
    return pathname.slice(DEFAULT_LOCALE_PREFIX.length) || "/";
  }

  return null;
}

export default function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_E2E_MOCK_AUTH === "1") {
    return NextResponse.next();
  }

  const canonicalPath = getCanonicalPath(request.nextUrl.pathname);
  if (!canonicalPath) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = canonicalPath;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
