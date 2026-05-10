---
name: tradeview
description: Use when working on the TradeView trading dashboard — communication style, coding conventions, and the architectural patterns this codebase has settled on (Next 14 App Router + Supabase Auth + Whop subscription gate + Yahoo Finance + localStorage→Supabase sync).
---

# TradeView project conventions

## Communication

- The user is solo, mobile-first, non-deeply-technical. Use plain words, no jargon unless the term is unavoidable. They'll ask "how do I X" — give exact UI navigation paths (`Vercel → Settings → Environment Variables`), not abstract instructions.
- They trust recommendations. When there are 2-3 viable approaches, present them with tradeoffs in 2-3 sentences and let them pick. Don't dump 8 options.
- They want things to work, not theoretical correctness. Default to "ship a working slice, iterate" over "design the perfect system first".
- Their messages will sometimes have typos and skip capitalization. That's signal, not noise — answer the actual question.
- Confirm before destructive or expensive actions (force-pushes, deletions, env var removals). They'll say "go ahead" if they want you to proceed.

## Project shape

Single Next.js 14 App Router app, deployed to Vercel at `trading-application-eight.vercel.app`, Git repo `thomasd230320/Trading-application`. **All trading logic lives in this one repo** — they previously had three Vercel projects and consolidated. Don't suggest splitting into multiple repos.

Stack:
- **Next 14.2** App Router, TypeScript strict, React 18
- **Tailwind 3** for styling, dark theme (`bg-[#030712]` background)
- **Supabase** for auth (anon key) and signal history (service role)
- **Whop API v2** for subscription verification (optional via env var)
- **Yahoo Finance** via `yahoo-finance2` for live OHLCV
- **lightweight-charts** for the price charts
- **technicalindicators** for RSI/MACD/Bollinger/MA

## Modules and where they live

| Path | Purpose |
|---|---|
| `lib/strategy.ts` | `getRecommendation(symbol, riskPercent)` — picks one strategy per symbol via backtest score, filters by risk-tier drawdown ceiling. Returns `Recommendation`. |
| `lib/backtest.ts` | `backtestAllStrategies(symbol)` — runs RSI/MACD/Bollinger/MA Crossover over the 90-day OHLCV, returns trades, win rate, total return, max DD, score. |
| `lib/positions.ts` | Position type + localStorage helpers + open/closed P&L math. **Will move to Supabase tables in PR 2.** |
| `lib/scanner.ts` | `SCAN_UNIVERSE` (26 symbols) for the Action Plan opportunity scanner. |
| `lib/whop.ts` | `checkActiveMembership(email)` — Whop v2 memberships lookup. Field-name-tolerant (`product`/`plan` and `_id` variants). `WHOP_DEBUG=1` surfaces detail inline. |
| `lib/auth/{client,server,middleware}.ts` | @supabase/ssr clients. Each one no-ops gracefully if env vars are missing (`isAuthConfigured()` check). |
| `lib/supabase.ts` | Service role client for server-only signal_history inserts — separate from user auth. |
| `lib/hooks/useMarketData.ts` | Polling hook for `/api/market-data`. Accepts custom `pollInterval`; watchlist polls 5s, scanner polls 30s. |
| `app/api/market-data/route.ts` | Single endpoint for both watchlist and scanner. Symbol regex validation, 30 cap. |
| `middleware.ts` + `lib/auth/middleware.ts` | Edge gate: redirects unauthenticated to `/login?next=…`, bounces authed users out of `/login`. |
| `components/{ActionPanel,PositionsPanel,UserCard,Navbar,...}.tsx` | UI. ActionPanel does scanner-based recommendations + take-trade. PositionsPanel does live P&L. Navbar hides on `/login`. |

## Frontend conventions

- **Server components by default** for routes; client components (`'use client'`) only for things that need state, refs, or browser APIs.
- **Server actions for forms** — but use `useFormState` + `useFormStatus`, NOT `useTransition` + direct invocation. The latter breaks `redirect()` and produces "Unexpected token '<', '<!DOCTYPE'..." JSON-parse errors. This is a real footgun we already hit.
- **localStorage for client-only state** with explicit key naming: `tradeview.<feature>.v1`. Always have a hydration `useEffect` + a separate `useEffect` to write back. Never write before hydration completes.
- **Memoize backtests** via `useMemo` keyed on `lastBarKey` (symbol + last bar time) so they only recompute when new bars arrive.
- **Tailwind, no CSS modules.** Color palette: emerald (BUY/positive), red (SELL/negative), amber (warning), blue (info/chosen), gray-900/800/700 for surfaces.
- **Number formatting**: prices ≥ $1000 use locale string + 0 decimals; ≥ $1 use 2 decimals; < $1 use 4. Percentages always include sign for P&L (`+1.23%` / `-1.23%`).
- **No emoji in UI text** unless the user explicitly asks.

## Backend conventions

- **Single API route per resource**, return JSON with consistent shape (`{ timestamp, symbols: [...], error? }` for market data).
- **Promise.allSettled** for parallel symbol fetches so one bad symbol doesn't kill the response — failed symbols go in a `failures` array.
- **Yahoo cache TTLs** are deliberate: quotes 4.5s, history 60s. Don't bypass without a reason.
- **Env-var-driven feature flags**. Big features (Supabase Auth, Whop gate) check their env vars and no-op if unset, so a fresh deploy doesn't crash. Pattern: `isFeatureConfigured()` helper + early-return.
- **Server actions return `{ error?, notice? }`** via the `useFormState` channel. Don't throw — wrap the body in try/catch, detect `NEXT_REDIRECT` (via `err.digest?.startsWith('NEXT_REDIRECT')`) and re-throw it; everything else gets `console.error`'d and returned as a clean error string.
- **Supabase service role key never reaches the browser**. `lib/supabase.ts` is server-only. The browser uses the anon key via `lib/auth/client.ts`.

## Auth + subscription gate

The pattern, top to bottom:
1. `middleware.ts` redirects unauthenticated users to `/login` (skipped if `NEXT_PUBLIC_SUPABASE_*` vars are unset, so dev still works).
2. Login server action runs `checkActiveMembership(email)` **before** `signInWithPassword`. If `WHOP_API_KEY` is unset, the check passes through. If set, the user must have an active (or `trialing` / `completed` / `paid`) Whop membership matching `WHOP_PRODUCT_ID` (or any membership if that var is unset).
3. On success, `revalidatePath('/', 'layout')` then `redirect(next)`.

When extending auth (e.g., adding magic links, OAuth providers), keep the env-var-optional pattern. Don't make new features hard-required at deploy time.

## Risk tiers

`maxAllowedDrawdown(riskPercent)`:
- `≤ 25%` → 12% DD cap (Conservative)
- `≤ 50%` → 30% DD cap (Moderate)
- `> 50%` → uncapped (Aggressive)

Don't change these thresholds without asking — they were tuned with the user across multiple iterations.

## Anti-patterns

- **Don't** rebase via `git stash; git reset --hard; git stash pop` if there are tracked file edits. Use `git rebase` or `git pull --rebase` instead. The stash/reset pattern lost work twice in our session.
- **Don't** assume API response shapes from memory. Whop's v2 returns `product` / `plan`, not `product_id` / `plan_id`. Either read the docs first, or write the integration field-name-tolerant from the start (collect all plausible field names into an array and check membership).
- **Don't** ship 5 PRs for one feature. The auth wall took #11, #12, #13, #14, #15 because each PR was missing something the next caught. Future feature work: build defensively in one PR (try/catch + diagnostics + tolerant parsing) so the first deploy works.
- **Don't** create planning/decision/analysis files. The user doesn't read them.
- **Don't** invent comments. Code is self-documenting; only add a comment when the *why* is non-obvious.

## Deployment gotchas the user has hit

- **Wrong Supabase URL value**: copying the dashboard URL (`https://supabase.com/dashboard/project/<ref>`) instead of the API URL (`https://<ref>.supabase.co`). When debugging auth failures, first check the externally-called URL in Vercel logs.
- **Anon vs service role key confusion**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be the `anon` `public` key. The `service_role` key is for `SUPABASE_SERVICE_ROLE_KEY` only.
- **Env var changes need a redeploy**: Vercel doesn't auto-pick-up env var edits. Always remind to redeploy after changing.
- **Email confirmation default**: Supabase has it ON by default. Tell the user to disable it in Supabase → Authentication → Providers → Email if they don't want the extra step.

## Working with the live deployment

- Local dev frequently fails Yahoo Finance fetches (sandbox rate-limit / cookie issue). Don't treat `502 Upstream data unavailable` from `localhost:3000/api/market-data` as a regression — production has different egress and works fine.
- Always verify changes against `https://trading-application-eight.vercel.app` after a merge. The Vercel deploy takes ~30-60s.
