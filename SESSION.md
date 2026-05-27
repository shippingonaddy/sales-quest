# SESSION.md — Current Build State
# Overwrite at END of every session. Read at START of every session.

---

## Last Updated
2026-05-26 — data migration attempted, reverted to last working build

## What Was Attempted Today
- server/lib/auth.ts — replaced Clerk JWKS with jose HS256 JWT verification + added createSupabaseServerClient using per-request JWT
- server/lib/repository.ts — replaced all filesystem I/O with Supabase Postgres queries (getSettings, saveSettings, getMonthData, upsertMonthData, listMonths, getBonuses, saveBonus, deleteBonus, getAllMonthSales, calculateStreak)
- server/api/sales-quest.ts — rewired all routes to call new Supabase repository functions, removed fs/path imports
- api/sales-quest.ts — new file: Vercel Edge Function entry point (export const runtime = 'edge', handle() from hono/vercel)
- vercel.json — added rewrites block to route /api/sales-quest to Edge Function; later removed invalid functions runtime block
- src/App.tsx — replaced magic link auth with email+password sign-in form
- tsconfig.json — added api/**/* to include array

## What Is Broken
- Edge Function returns FUNCTION_INVOCATION_FAILED (HTTP 500) on every request
- Symptom: app loads and auth works, but all API calls fail — sales board empty after login
- Likely cause: SUPABASE_JWT_SECRET env var on Vercel is either missing or set to wrong value (local .env had UUID-format value that may not match real Supabase JWT secret)
- auth.ts throws at module load time if SUPABASE_JWT_SECRET is missing — function never handles any request
- Last clean commit: 35a2198 feat: replace Clerk with Supabase Auth

## What Was Reverted
- All commits after 35a2198 were force-reverted (git reset --hard 35a2198 && git push --force)
- Reverted: api/sales-quest.ts, server/lib/auth.ts, server/lib/repository.ts, server/api/sales-quest.ts, vercel.json, src/App.tsx, tsconfig.json
- Reason: Edge Function crashed on every request, could not isolate env var value from Vercel API (token scope blocked decryption)

## Next Task
Re-apply the data migration starting with server/lib/auth.ts — use adminClient.auth.getUser(token) with SUPABASE_SECRET_KEY instead of jose + SUPABASE_JWT_SECRET. This removes the broken env var dependency entirely. Verify SUPABASE_SECRET_KEY is set in Vercel before starting.

## tsc Status
- PASSING — zero errors (no output)

## Git Status
- 35a2198 feat: replace Clerk with Supabase Auth
- dd19586 docs: mark Phase 2 complete in CLAUDE.md with implementation log
- 80146da refactor: wire TanStack Query reads and mutations in SalesQuest.tsx (Phase 2)
- 0a7c6e4 refactor: add QueryClientProvider to src/App.tsx (Phase 2)
- f6a6c31 refactor: add useSalesMutations hooks to src/hooks/useSalesMutations.ts (Phase 2)
