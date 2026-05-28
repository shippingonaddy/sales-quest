# SOLVED.md — Known Bug Registry
# grep this BEFORE touching any related code
# Format: grep "keyword" SOLVED.md

---

## [RACE] React StrictMode Double-Save
- **File:** Any component using useEffect to save data on mount
- **Symptom:** Data saved twice in dev, race condition on write
- **Fix:** useRef flag (hasRun.current) prevents double-fire
- **Keywords:** strictmode, double, race, useeffect, save, mount

---

## [DATA] N+1 Fetch Problem
- **Symptom:** Waterfall of individual fetches instead of batch
- **Fix:** Batch query at the route level, not component level
- **Keywords:** n+1, fetch, waterfall, performance, query

---

## [TZ] Timezone Propagation (14 call sites)
- **Files:** 14 call sites — see commit phase0-baseline-v2
- **Symptom:** Dates display wrong for non-UTC users
- **Fix:** ALL dates go through toUserTz() helper — no raw new Date()
- **Keywords:** timezone, date, utc, toUserTz, new Date

---

## [UI] React Error #310 — Hooks After Conditional Returns
- **Symptom:** Black screen, hooks called after Clerk/Supabase auth early return
- **Date:** March 26 2026 — lost full working day
- **Fix:** ALL hooks must appear before any conditional early return
- **Keywords:** error 310, hooks, auth, conditional, black screen, useMemo

---

## [ENV] process.env in Vite
- **Symptom:** Environment variables undefined at runtime, blank page before React loads
- **Fix:** Always import.meta.env — NEVER process.env in Vite
- **Keywords:** process.env, import.meta, env, undefined, vite

---

## [BUILD] Vite React Dedupe Missing
- **Symptom:** Duplicate React instances, hooks violation, black screen
- **Fix:** vite.config.ts must have resolve: { dedupe: ['react', 'react-dom'] }
- **Keywords:** vite, dedupe, react, duplicate, hooks, black screen

---

## [DEPLOY] Vercel Stale Bundle
- **Symptom:** Code changes don't appear after deploy
- **Fix:** Confirm JS bundle filename changed between deploys — same filename = cached build
- **Keywords:** vercel, deploy, cache, bundle, stale

---

## [ENV] Env Var Name Mismatch
- **Symptom:** Frontend env var reads undefined despite being set
- **Fix:** Vite only exposes VITE_* prefixed vars to frontend — always use VITE_ prefix
- **Keywords:** env, vite, prefix, undefined, mismatch

---

## [HOOKS] Hook Extraction Dep Array Risk
- **Symptom:** Spurious refetches or missing updates after refactor
- **Fix:** When moving functions to lib/, check if they appear in any hook dep array. Stable module-level exports do not belong in dep arrays.
- **Keywords:** dep array, useEffect, dependency, refactor, lib, extract

---

## [DEPLOY] Vercel Edge Function — Wrong Runtime Declaration (non-Next.js)
- **File:** `api/sales-quest.ts`
- **Symptom:** `FUNCTION_INVOCATION_FAILED` — `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/api/sales-quest' imported from /var/task/api/sales-quest.js`
- **Root cause:** `export const runtime = 'edge'` is **Next.js App Router only**. Vercel ignores it for non-Next.js projects and runs the function as a Node.js serverless function (AWS Lambda, `/var/task/`). Serverless functions are NOT bundled with esbuild — files are uploaded as-is. `server/` directory is not in `/var/task/`, so relative imports crash at runtime.
- **Fix:** Use the Vercel-native declaration: `export const config = { runtime: 'edge' }`. This triggers esbuild bundling, which inlines all relative imports at build time.
- **Wrong:** `export const runtime = 'edge'`
- **Correct:** `export const config = { runtime: 'edge' }`
- **Keywords:** edge function, runtime, vercel, ERR_MODULE_NOT_FOUND, /var/task, serverless, esbuild, bundling, FUNCTION_INVOCATION_FAILED

---

## [DEPLOY] Hono + Vercel Edge — SUPERSEDED, see entry below (non-Next.js)
- **NOTE: This entry was written before production testing. It is factually wrong. Do not follow it. Kept for history only.**
- **Symptom:** Using `hono/vercel` adapter with `handle()` breaks or is unnecessary
- **Root cause:** `hono/vercel` with `handle()` is for **Next.js API Routes** only. For a plain Vercel Edge Function, Vercel calls the default export directly.
- **Fix:** `export default app` — no adapter wrapper needed. Just `export const config = { runtime: 'edge' }` + `export default app`.
- **Keywords:** hono, vercel, handle, adapter, next.js, edge, export default

---

## [DEPLOY] Hono + Vercel Edge Function — Full Diagnosis and Fix (non-Next.js, confirmed 2026-05-27)
- **File:** `api/sales-quest.ts`
- **Date:** 2026-05-27 — three bugs in sequence, each hiding the next
- **Keywords:** edge function, hono, handle, vercel, 404, 500, did not return a response, ERR_MODULE_NOT_FOUND, subrouter, route, path, FUNCTION_INVOCATION_FAILED, /var/task, config, runtime

### How to get the actual error (do this first, every time)
The browser response body and `x-vercel-error` header are useless — they only say `FUNCTION_INVOCATION_FAILED`. Run this:
```bash
npx vercel@latest logs https://sales-quest-app-ci4d.vercel.app \
  --token=<your-vercel-token>
```
Output format:
```
TIME         HOST                             LEVEL                    STATUS  MESSAGE
19:18:08.12  sales-quest-app-ci4d.vercel.app  error  ε GET /api/...   500     Error: The Edge Function did n…
```
The `ε` prefix = Vercel confirmed this is running as an Edge Function (not Node.js serverless).
No `ε` prefix = still running as Node.js serverless — Bug 1 is not fixed.

---

### Bug 1 — Wrong runtime declaration → ERR_MODULE_NOT_FOUND
**HTTP status:** 500  
**x-vercel-error header:** `FUNCTION_INVOCATION_FAILED`  
**Exact error from `vercel logs`:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/api/sales-quest'
imported from /var/task/api/sales-quest.js
    at finalizeResolution (node:internal/modules/esm/resolve:281:11)
    at moduleResolve (node:internal/modules/esm/resolve:871:10)
    ...
    code: 'ERR_MODULE_NOT_FOUND',
    url: 'file:///var/task/server/api/sales-quest'
Node.js process exited with exit status: 1.
```
**Why:** `/var/task/` is the AWS Lambda (Node.js serverless) filesystem. `export const runtime = 'edge'` is a Next.js App Router convention — Vercel ignores it for non-Next.js projects and runs the function as plain Node.js serverless. Serverless functions are uploaded as-is (no esbuild bundling). The `server/` directory is never uploaded, so the relative import fails.  
**File:** `api/sales-quest.ts` line 3  
**Before:**
```ts
import app from '../server/api/sales-quest'

export const runtime = 'edge'

export default app
```
**After (commit 0538332):**
```ts
import app from '../server/api/sales-quest'

export const config = { runtime: 'edge' }

export default app
```
**Why the fix works:** `export const config = { runtime: 'edge' }` is Vercel's native Edge Function declaration for non-Next.js projects. It triggers esbuild bundling at deploy time, which inlines all relative imports — including `../server/api/sales-quest` — into a single file. `/var/task/` disappears; the Edge runtime has everything it needs.

---

### Bug 2 — Raw Hono app not callable → "did not return a Response"
**HTTP status:** 500  
**x-vercel-error header:** `FUNCTION_INVOCATION_FAILED`  
**Exact error from `vercel logs`** (ε prefix confirms Edge runtime is now active):
```
19:18:08.12  sales-quest-app-ci4d.vercel.app  error  ε GET /api/sales-quest  500  Error: The Edge Function did n…
```
Full message: `Error: The Edge Function did not return a Response.`  
**Why:** Vercel's Edge runtime calls the default export as `fn(request, context)`. A Hono `app` instance is not a plain function — it's an object. Vercel can't invoke it directly, returns nothing, Edge runtime throws.  
**File:** `api/sales-quest.ts` line 5  
**Before:**
```ts
import app from '../server/api/sales-quest'

export const config = { runtime: 'edge' }

export default app
```
**After (commit 3e467bf):**
```ts
import { handle } from 'hono/vercel'
import app from '../server/api/sales-quest'

export const config = { runtime: 'edge' }

export default handle(app)
```
**Why the fix works:** `handle(app)` from `hono/vercel` wraps the Hono app in a plain function with the signature `(request: Request, context) => Response | Promise<Response>`. Vercel can call it. `hono/vercel` is confirmed present at `node_modules/hono/dist/adapter/vercel/`.  
**Grep to verify adapter exists before using it:**
```bash
ls node_modules/hono/dist/adapter/vercel/
```

---

### Bug 3 — Hono routes don't match full path → 404
**HTTP status:** 404  
**Vercel logs:** No error text — function ran, Hono found no matching route, returned 404 normally.  
**Why:** Vercel passes the FULL request URL path to the Edge Function — `/api/sales-quest`, not `/`. The salesQuestApi subrouter defines its routes at `'/'` and `'/'` (GET/POST). Hono tried to match `/api/sales-quest` against `/` — no match — 404.  
**How diagnosed:** Grepped `server/index.ts` and found line 17:
```ts
app.route('/api/sales-quest', salesQuestApi)
```
The local Hono server already mounts the subrouter at `/api/sales-quest` to strip the prefix. The Edge Function wrapper was not doing the same thing.  
**File:** `api/sales-quest.ts`  
**Before:**
```ts
import { handle } from 'hono/vercel'
import app from '../server/api/sales-quest'

export const config = { runtime: 'edge' }

export default handle(app)
```
**After (commit e1365a7):**
```ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import salesQuestApi from '../server/api/sales-quest'

// Mirror server/index.ts: mount the subrouter at the same path Vercel routes to it.
// Hono receives the full path (/api/sales-quest) from Vercel; without this wrapper
// the subrouter's routes (defined at '/') never match.
const app = new Hono()
app.route('/api/sales-quest', salesQuestApi)

export const config = { runtime: 'edge' }
export default handle(app)
```
**Why the fix works:** The parent Hono app mounts salesQuestApi at `/api/sales-quest`. Hono strips that prefix before matching against the subrouter's routes. `app.get('/')` in the subrouter now correctly matches incoming requests to `/api/sales-quest`.  
**Key grep — always check this first when debugging path issues:**
```bash
grep -n "route\|sales-quest" server/index.ts
```
Expected output: `17:app.route('/api/sales-quest', salesQuestApi)` — the Edge Function wrapper must mirror this mount path exactly.

---

### What to grep when this breaks again
```bash
grep "ERR_MODULE_NOT_FOUND" SOLVED.md     # → Bug 1 (wrong runtime declaration)
grep "did not return a Response" SOLVED.md # → Bug 2 (wrong export shape)
grep "hono.*404\|404.*hono" SOLVED.md     # → Bug 3 (path not mounted)
grep "ε\|epsilon\|edge function" SOLVED.md # → this entry
```
And always run `vercel logs` first — the browser error is never enough.

---

## [AUTH] Supabase JWT Verification — Drop jose, Use adminClient.auth.getUser()
- **Files:** `server/lib/auth.ts`
- **Symptom:** Module crashes at startup: `Missing required env vars` or `invalid signature` from jose HS256 verification
- **Root cause:** `SUPABASE_JWT_SECRET` is easy to misconfigure (wrong format, wrong env var name). jose HS256 verification is fragile and adds a dependency.
- **Fix:** Use `adminClient.auth.getUser(token)` — the Supabase admin client verifies the token server-side. No `SUPABASE_JWT_SECRET` needed. Never import `jose`.
- **Pattern:**
  ```ts
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error } = await adminClient.auth.getUser(token)
  if (error || !user) return null
  return user.id
  ```
- **Keywords:** jose, jwt, supabase, auth, getUser, adminClient, SUPABASE_JWT_SECRET, HS256, invalid signature

---

## [DEPLOY] Vercel Token Scope — Team Projects Need Correct Token
- **Symptom:** Vercel API calls fail with scope/permission errors even with a valid token
- **Root cause:** Tokens scoped to a personal account cannot access projects under a team (`shippingonaddys-projects`). Must use a token with the correct team scope.
- **Fix:** Generate a new token in Vercel dashboard scoped to the correct team. Store in SESSION.md for the session.
- **Keywords:** vercel, token, scope, team, permission, API, vcp_

---
