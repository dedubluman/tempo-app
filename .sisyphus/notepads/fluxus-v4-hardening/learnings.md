# Task 6: next-intl i18n Infrastructure

## Summary

Successfully installed and configured next-intl for the Fluxus app with API route compatibility.

## What Was Done

1. Installed `next-intl` package (v3.x)
2. Created i18n configuration:
   - `i18n/request.ts`: Server-side request configuration with default locale "en"
   - `i18n/routing.ts`: Routing configuration with `localePrefix: "as-needed"`
   - `messages/en.json`: 193-line structured translation file with strings from all app routes
3. Created `middleware.ts` with critical matcher pattern: `["/((?!api|_next|_vercel|.*\\..*).*)""]`
4. Updated `next.config.ts` to use `createNextIntlPlugin()`
5. Updated `app/layout.tsx`:
   - Made layout async
   - Added `NextIntlClientProvider` wrapper
   - Integrated with `getMessages()` server-side
6. Replaced 11 representative strings in `app/app/page.tsx` as POC:
   - Dashboard heading, network badge, account/receive/balance/send titles
   - Copy/Copied/Disconnect button text
   - Bottom nav labels (Wallet, Docs)

## Key Patterns

### Middleware Matcher (CRITICAL)

```typescript
export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

This pattern excludes:

- `/api/*` routes (prevents SSRF/breakage)
- `/_next/*` (Next.js internals)
- `/_vercel/*` (Vercel internals)
- Static files with extensions

### Server-Side Layout Pattern

```typescript
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function RootLayout({ children }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {/* ... */}
    </NextIntlClientProvider>
  );
}
```

### Client Component Usage

```typescript
import { useTranslations } from "next-intl";

export default function Component() {
  const t = useTranslations();
  return <h1>{t("dashboard.heading")}</h1>;
}
```

## Verification

- ✓ `tsc --noEmit`: 0 errors
- ✓ `next build`: Success (32 routes compiled)
- ✓ `/api/sponsor`: Responds correctly (200 with RPC error from upstream)
- ✓ `/api/agent`: Responds correctly (validation error as expected)
- ✓ `/api/passkey-mappings`: Responds correctly (empty response)
- ✓ Middleware matcher successfully excludes API routes

## Next Steps for Future Tasks

- T18 (a11y): Use translation keys for aria-label attributes
- Add locale switcher UI when multi-language support is needed
- Extract remaining hardcoded strings (only infrastructure + POC done)
- Consider using `getTranslations()` in Server Components for better performance

## Evidence

- `.sisyphus/evidence/task-6-api-routes-ok.txt`: curl tests showing all API routes functional

---
