# Fluxus (`tempo-app`)

[![CI](https://github.com/barik/Tempo_Project/actions/workflows/ci.yml/badge.svg)](https://github.com/barik/Tempo_Project/actions/workflows/ci.yml)

Fluxus is the end-user product shipped from the `tempo-app` package in this repo: a Tempo-native, stablecoin-first payments app built with Next.js App Router. It combines passkey authentication, sponsored fees, AI-assisted transfers, request links, POS flows, scheduled payments, swap, portfolio views, and a docs surface for the Tempo developer experience.

## Tech stack

- Next.js 16 App Router + React 19 + TypeScript 5
- Tailwind CSS v4 + Framer Motion
- Zustand + TanStack Query
- viem + wagmi with Tempo fee sponsorship transport
- Vitest for unit tests and Playwright for E2E

## Core product areas

- `/` - landing page
- `/app` - authenticated dashboard shell
- `/app/agent` - AI payment assistant backed by Gemini
- `/app/forge` - token forge flow
- `/app/portfolio` - token portfolio view
- `/app/pos` - POS and receipt workflows
- `/app/request` - payment request links
- `/app/schedule` - scheduled payments
- `/app/stream` - streaming payments flow
- `/app/swap` - stablecoin swap flow
- `/docs` - product and developer documentation

## Prerequisites

- Node.js 20+
- npm (the repo uses `package-lock.json`)
- Tempo RPC access to `https://rpc.moderato.tempo.xyz`

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000` for regular development.

## Required environment variables

Minimum production setup:

```bash
GEMINI_API_KEY
PASSKEY_REGISTRY_SECRET
```

Useful additional variables:

```bash
NEXT_PUBLIC_TEMPO_RPC_URL
NEXT_PUBLIC_TEMPO_RPC_FALLBACK
FEE_SPONSOR_URL
KV_REST_API_URL
KV_REST_API_TOKEN
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
```

Notes:

- Keep `.env.local` inside `tempo-app/`, not the repo root
- `FEE_SPONSOR_URL` falls back to `https://sponsor.moderato.tempo.xyz`
- `PASSKEY_MAPPING_DB_PATH` defaults to `.data/passkey-mappings.sqlite`; on Vercel this filesystem is ephemeral

## Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run test:unit
npm run test:unit:watch
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:list
```

## Testing and verification

- `npm run test:unit` runs Vitest against `lib/__tests__/` and `hooks/__tests__/`
- `npm run test:e2e` runs Playwright against `tests/e2e/`
- Local E2E uses port `3100` and sets `NEXT_PUBLIC_E2E_MOCK_AUTH=1` through Playwright's web server config
- Never enable `NEXT_PUBLIC_E2E_MOCK_AUTH=1` in production
- CI runs lint -> typecheck -> build -> Vitest -> Playwright, but the Vitest step currently uses `continue-on-error: true`

## Feature flags

Default flags from `.env.example`:

```bash
NEXT_PUBLIC_FF_ANALYTICS=1
NEXT_PUBLIC_FF_PASSKEY_RECOVERY=0
NEXT_PUBLIC_FF_OFFLINE_MODE=0
NEXT_PUBLIC_FF_NFC_PAYMENT=0
NEXT_PUBLIC_FF_STREAMING_SUBSCRIPTIONS=0
NEXT_PUBLIC_FF_ATOMIC_SPLIT=0
```

Feature flags are read via `lib/featureFlags.ts`. If you add a new flag, update both `lib/featureFlags.ts` and `.env.example`.

## Deployment notes

- Deploy target is Vercel with zero-config Next.js detection
- `vercel.json` is intentionally absent
- `.husky/` is absent, so there is no pre-commit safety net
- Required server features depend on Vercel env vars, not local `.env.local`

## Tempo-specific constraints

- TIP-20 tokens use 6 decimals, not 18
- Query balances with `balanceOf()`, not native token balance APIs
- Passkeys are domain-bound; localhost registrations do not carry over to production
- Fee sponsorship is part of the happy path, especially for first-time recipients

## Additional repo docs

- `../README.md` - repo overview
- `../CLAUDE.md` - project rules and verification expectations
- `../CODEBASE.md` - auto-generated inventory; useful as a reference map, not as the canonical contributor guide
