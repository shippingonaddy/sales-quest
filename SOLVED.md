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


