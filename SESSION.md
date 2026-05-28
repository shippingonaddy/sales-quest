# SESSION.md — Current Build State
# Overwrite at END of every session. Read at START of every session.

---

## Last Updated
2026-05-28 — Edge Function fully operational. Backend confirmed working end-to-end.

## Current Phase
Data Migration — COMPLETE. Backend wired to Supabase Postgres and confirmed working in production.

---

## Git Log (last 5)
```
d2de835 docs: add grep-before-edit and grep-SOLVED rules to ALWAYS section
e1365a7 fix: mount subrouter at /api/sales-quest in Edge Function wrapper
3e467bf fix: wrap Hono app with handle() for Vercel Edge Function compatibility
0538332 fix: use Vercel-native Edge Function config declaration
586a60d fix: add vercel.json with explicit build config for Vite + Edge Function
```

## tsc Status
- PASSING — zero errors on d2de835

---

## What Is Deployed (main = d2de835 on Vercel — CONFIRMED WORKING)

**Frontend:** Supabase email+password auth works. Sign in / sign up functional.

**Backend:** CONFIRMED operational. API returns correct responses. Auth, DB reads, and DB writes all working end-to-end against Supabase Postgres.

---

## Edge Function Repair Log (this session — do not repeat these bugs)

Three separate bugs in `api/sales-quest.ts`, fixed in sequence:

### Bug 1 — Wrong runtime declaration (commit 0538332)
`export const runtime = 'edge'` is Next.js App Router only. Vercel ran the function
as Node.js serverless (AWS Lambda, `/var/task/`). Serverless does not bundle with esbuild,
so `server/` directory was missing → `ERR_MODULE_NOT_FOUND`.
**Fix:** `export const config = { runtime: 'edge' }` — Vercel-native Edge declaration.

### Bug 2 — Raw Hono app not a valid Edge Function handler (commit 3e467bf)
`export default app` exports the Hono instance. Vercel calls the default export as
`fn(request, context)`. A Hono app is not directly callable in that signature.
**Symptom:** "The Edge Function did not return a Response" (confirmed via `vercel logs`).
**Fix:** `import { handle } from 'hono/vercel'` → `export default handle(app)`.

### Bug 3 — Hono routes didn't match full path (commit e1365a7)
Vercel passes the FULL request path (`/api/sales-quest`) to the Edge Function.
The subrouter's routes are defined at `/`. Without mounting, Hono tried to match
`/api/sales-quest` against `/` → no match → 404.
`server/index.ts` already does `app.route('/api/sales-quest', salesQuestApi)` for local dev.
**Fix:** Wrap in a parent Hono app that mirrors server/index.ts exactly.

---

## Current File State

### api/sales-quest.ts (current — should be correct)
```ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import salesQuestApi from '../server/api/sales-quest'

const app = new Hono()
app.route('/api/sales-quest', salesQuestApi)

export const config = { runtime: 'edge' }
export default handle(app)
```

### vercel.json (correct)
```json
{
  "buildCommand": "bunx vite build",
  "outputDirectory": "dist"
}
```

### server/lib/auth.ts (correct)
- Reads: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
- Uses adminClient.auth.getUser(token) — no jose, no SUPABASE_JWT_SECRET
- Throws at module load if any env var missing

### server/lib/repository.ts (correct — Supabase Postgres)
- getSettings / saveSettings
- getMonthData / upsertMonthData / listMonths
- getBonuses / saveBonus / deleteBonus
- getAllMonthSales / calculateStreak
- No filesystem I/O

### server/api/sales-quest.ts (correct)
- Routes defined at '/' and '/' (GET/POST)
- All routes use createSupabaseServerClient(extractToken(c))
- export default app

---

## Supabase Project
- URL: https://dswahknycqlvhredxqpy.supabase.co
- Tables: monthly_data, bonuses, settings — all exist with RLS (own rows policy)
- Site URL: https://sales-quest-app-ci4d.vercel.app (correct)
- Email confirmation: must be DISABLED for email+password signup
  (Supabase → Authentication → Providers → Email → Confirm email → OFF)

## Vercel
- URL: sales-quest-app-ci4d.vercel.app
- Project ID: prj_4Yp003CmWmkzBZkAjxkgWCELaL5g
- Repo: github.com/shippingonaddy/sales-quest → main → auto-deploys
- Working Vercel token: <redacted — team-scoped token, get from Vercel dashboard → Account Settings → Tokens>
- Env vars set in Vercel (sensitive — confirmed present):
  VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_JWT_SECRET

## Do NOT Touch
- src/pages/SalesQuest.tsx
- src/hooks/useSalesMutations.ts
- src/hooks/useSalesQueries.ts
- src/lib/* (commission, date, theme, constants)

## Next Task
Phase 3 — Component extraction from SalesQuest.tsx (1,294-line monolith).
Do NOT add logic to SalesQuest.tsx. Extract only. One component at a time, commit after each.
