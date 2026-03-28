# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🚨 EMERGENCY GUARDRAILS — READ FIRST EVERY SESSION

These rules exist because a full working day was lost on March 26 2026. Follow them without exception.

### If the app is broken in production (black screen, error, blank page):
1. Check Railway logs via MCP FIRST — `mcp__railway__get-logs`
2. Check Railway variables via MCP — `mcp__railway__list-variables`
3. Check if `bun.lock` is committed — `git ls-files bun.lock`
4. Check if `VITE_CLERK_PUBLISHABLE_KEY` is set correctly in Railway (not a placeholder)
5. Do NOT touch any code until you know the exact cause
6. Do NOT make more than one change at a time
7. Report findings to the user. Wait for instruction.

### If bun.lock is missing from the repo:
STOP everything. Run `bun install` locally to generate it, commit it, deploy. That is the fix. Do not attempt workarounds (nixpacks.toml patches, --force flags, version pins). Just generate the lockfile.

### Before every deploy:
- Confirm `bun.lock` is committed: `git ls-files bun.lock`
- Confirm `VITE_CLERK_PUBLISHABLE_KEY` in Railway is NOT a placeholder
- Confirm `index.html` has no `process.env` references
- Confirm `vite.config.ts` has `resolve: { dedupe: ['react', 'react-dom'] }`

### When something is missing — get the real thing:
- Missing `bun.lock`? → Install bun, run `bun install`. Not: patch nixpacks, pin versions, add flags.
- Missing env var? → Set the real value. Not: hardcode fallbacks or add workaround scripts.
- Missing tool? → Ask the user to install it. Not: find a 5-step workaround.
- One real fix is always better than five clever patches. Workarounds compound into disasters.

### Never do autonomously:
- Delete or modify `bun.lock`
- Change package versions in `package.json`
- Add or remove Railway environment variables without showing the user what you're changing
- Make multiple infrastructure changes in one step

---

## KNOWN FAILURE PATTERNS — READ BEFORE EVERY COMMIT

Five patterns that have caused or risk causing production outages. Check each before committing.

### 1. REACT #310 — Hooks after conditional returns
`useMemo`, `useCallback`, `useEffect`, and all other hooks must **never** appear after conditional early returns (auth guards, loading checks). Always place every hook before:
```
if (!clerkLoaded) return ...
if (!isAuthenticated) return ...
```
Violated once on March 26 2026 — caused a full production black screen.

### 2. CLERK SCOPE — Auth code is off-limits without permission
Never modify `clerkUser` prop types, `useUser`, `useAuth`, `getToken`, or any Clerk initialization code without explicit user permission. Type changes ripple into the entire auth flow.

### 3. TYPESCRIPT BEFORE PUSH — Zero errors required
Run `bunx tsc --noEmit` before every single commit. Never push with TypeScript errors. Railway will build successfully but serve a broken cached bundle with no obvious error in logs.

### 4. HOOK EXTRACTION RISK — Check dep arrays after refactoring
When moving functions to `lib/` files, check whether any extracted function is referenced inside a hook dependency array. Stable module-level exports do not belong in dep arrays — removing them from deps is correct, not a bug.

### 5. RAILWAY CACHE — Verify the bundle actually changed
The JS bundle filename must change between deploys to confirm Railway rebuilt from new code. If the filename in the deployed `dist/` is identical to the previous deploy, Railway served a cached image and the changes did not deploy. A `reason: "redeploy"` deployment entry is the signal — only `reason: "deploy"` means a fresh build.

---


## Commands

```bash
bun run dev          # Run frontend + backend in parallel (development)
bun run dev:server   # Backend only (port 3001)
bun run dev:client   # Frontend only (port 5173)
bun run build        # Type check + Vite production build
bun run preview      # Preview production build locally
bun run start        # Start production server
```

There are no test commands configured.

## Architecture

Full-stack TypeScript app: React frontend + Hono backend, both served by Bun.

**Frontend** (`src/`): Nearly all logic lives in a single monolithic component at `src/pages/SalesQuest.tsx` (~1,664 lines). The `components/`, `hooks/`, `lib/`, and `types/` directories exist but are empty. The app uses Clerk for auth, Tailwind for styling, and communicates with the backend via `/api/*` routes (proxied by Vite in dev).

**Backend** (`server/`): Hono server at `server/index.ts` with all API routes in `server/api/sales-quest.ts`. Persists data as JSON files under `/data/sales-quest/<userId>/`:
- `current.json` — current month's sales
- `archive/YYYY-MM.json` — past months
- `bonuses/YYYY-MM.json` — monthly bonuses
- `settings.json` — commission settings

Auth: Clerk JWT tokens verified on the backend using JWKS (cached 1 hour). Atomic writes (temp file → rename) prevent data corruption.

**In development**, Vite proxies `/api/*` → `http://localhost:3001`.
**In production**, the Hono server also serves the `dist/` static files.

## Key Business Logic

**Commission types** (configured per user in settings): `flat`, `flat_plus_down`, `front_back_percent`

**Gamification**: XP (50/deal, 25/split, 25/streak day), levels (`floor(XP/100)+1`), badges. Streaks exclude Sundays and Wednesdays (non-work days).

**Timezone**: Intended to use Chicago timezone, but current frontend code uses raw `new Date()` with no timezone forcing — dates use the user's local clock. Known bug.

**Conflict resolution**: `lastModifiedTime` timestamps with 60-second clock skew tolerance detect write conflicts.

**Local mode**: `isLocalMode` is hardcoded `false` and never set. Extensive `isLocalMode` branching throughout `SalesQuest.tsx` is dead code in production — the feature was started but not completed.

## Environment Variables

See `.env.example`. Required:
- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — Clerk authentication
- `PORT` — server port (default 3001)
- `DATA_DIR` — data storage path (default `./data`)

## Deployment

Deployed on Railway via `railway.toml`. Build: `bun install && bun run build`. Start: `bun run start`.

Railway MCP server configured in `.mcp.json` — provides `railway logs`, `railway status`, `railway up` via Claude.

### CRITICAL: Deployment rules — do not violate

**Bun IS installed locally.** Run `bun install` locally to generate `bun.lock`. Always commit `bun.lock` — it pins exact package versions and tells nixpacks to use the bun runtime on Railway. Without it, Railway installs latest versions which causes version drift and production crashes.

**bun.lock is the lockfile — keep it committed.** If packages need updating: run `bun install` locally, commit the updated `bun.lock`, deploy. Never delete `bun.lock` from the repo.

**`@clerk/clerk-react` version:** Currently locked in `bun.lock`. Do not manually edit `bun.lock`. To change Clerk version: update `package.json`, run `bun install` locally, commit new `bun.lock`.

**`index.html` must not contain `process.env`:** `process` does not exist in browsers — it throws `ReferenceError` before React loads, causing a blank page. Clerk key is read via `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY` in `App.tsx`. Do not add script blocks to `index.html` that reference Node globals.

**Vite must dedupe React:** `vite.config.ts` must have `resolve: { dedupe: ['react', 'react-dom'] }`. Without this, Clerk and the app bundle separate React instances, causing React error #310 (hooks violation black screen).

**If a Railway build fails:** Report the exact error and ask the user what to do. Do not attempt to fix deployment failures by modifying `package.json`, `bun.lock`, or other infrastructure files autonomously — this caused a cascade of broken commits in March 2026 that took hours to undo.

**To deploy:** The user runs `railway up` from their own terminal. Claude can use the Railway MCP (`mcp__railway__list-deployments`, `mcp__railway__get-logs`) to check status and diagnose — but cannot push code.

**Railway `reason: "redeploy"` = stale image.** When Railway shows `reason: "redeploy"`, it is reusing an old cached image — new code is NOT deployed. Only `reason: "deploy"` means a fresh build from current code.

**If the app breaks in production:** Check Railway deployment status and logs via MCP first. Do not modify source code as a first response to a deployment issue.

### March 26 2026 incident post-mortem

What broke: blank screen + React error #310 in production.
Root causes (in order):
1. `bun.lock` not committed → Railway installed latest Clerk on every build → version drift
2. `process.env` in `index.html` → crashed browser before React loaded
3. No `resolve.dedupe` in Vite → duplicate React instances → Clerk hooks failed

What made it worse: Claude treated "Bun is NOT installed locally" as a permanent constraint and spent the session chasing Clerk version numbers instead of asking the user to install bun. The fix was always `bun install` → commit `bun.lock`.

Time lost: full working day. Do not repeat this.

---

## Coding Standards

### Immutability (CRITICAL)
ALWAYS create new objects with spread, NEVER mutate directly:
```typescript
const updated = { ...deal, amount: newAmount }   // ✅
deal.amount = newAmount                           // ❌
```

### TypeScript Rules
- No `any` — use specific types or `unknown` for untrusted input
- Explicit return types on all exported functions
- Use `interface` for object shapes, `type` for unions
- No `console.log` in production — use structured logging
- Validate env vars exist at startup, not at use-time

### File Limits
- Functions: under 50 lines
- Files: 200-400 lines typical, 800 lines max
- Nesting: no deeper than 4 levels — use early returns

### Async/Await
```typescript
// ✅ Parallel when independent
const [settings, currentMonth] = await Promise.all([fetchSettings(userId), fetchCurrentMonth(userId)])
// ❌ Sequential when unnecessary
const settings = await fetchSettings(userId)
const currentMonth = await fetchCurrentMonth(userId)
```

### Error Handling
Always handle errors explicitly. Never swallow errors silently. Generic messages to client, detailed errors in server logs only.

---

## Security Requirements

All code must pass these checks before commit:

- **Secrets**: No hardcoded API keys, tokens, or passwords — all in environment variables
- **Input validation**: All user inputs validated with Zod at API boundaries
- **Path traversal**: File paths constructed from validated inputs only; userId comes from Clerk JWT, never from request body
- **Authentication**: Every `/api/*` route verifies Clerk JWT before any data access
- **Authorization**: `userId` always from verified token — users can only access their own data
- **Error messages**: No stack traces, file paths, or sensitive data exposed to clients
- **Logging**: No commission amounts, user details, or tokens in logs

### Clerk JWT pattern
```typescript
// ✅ userId always from token, never from user input
app.use('/api/*', authMiddleware)  // sets c.get('userId')
app.get('/api/sales', async (c) => {
  const userId = c.get('userId')  // safe
  // ...
})
```

---

## API Design

RESTful conventions for all `/api/*` routes:

- URLs: plural nouns, kebab-case, no verbs (`/api/sales`, not `/api/getSales`)
- Status codes: 200 (success), 201 (created), 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limit), 500 (server error)
- Response format: `{ success: boolean, data?: T, error?: string }`
- Validate with Zod, return 422 with field-level details on failure

---

## Agent Delegation

Delegate immediately (without waiting for user prompt) when:

| Situation | Agent |
|-----------|-------|
| Code just written/modified | `typescript-reviewer` |

Use parallel task execution for independent operations.

---

## Known Tech Debt (do not worsen)

`SalesQuest.tsx` is a 1,636-line monolith. The empty `components/`, `hooks/`, `lib/`, `types/` directories are the intended split targets — do not add more logic to the monolith.

Active issues to be aware of when touching data fetching or state:

- **N+1 fetch for all-time totals**: `calculateTotalCommission` calls `list_months` then fetches every month individually. Do not add more call sites — needs a backend aggregate endpoint.
- **`getAuthHeaders` dependency loop**: `getToken` from Clerk is a new reference each render, making `getAuthHeaders` unstable, which cascades into `useEffect` dependency arrays and can cause spurious refetches. When adding new effects that need auth, use a ref pattern or exclude `getToken` from deps.
- **Sequential load chain**: `list_months` must resolve before `selectedMonth` is set, which gates the main data `useEffect`. Both have retry logic but no timeout on the first step — avoid adding more sequential dependencies to this chain.
- **`alert()` for user feedback**: 5 places use native `alert()`. New code should not add more — a toast/notification system is the intended replacement.
- **`glassCard` / `hexToRgb`** are called inline in JSX on every render. Do not add more call sites until they are memoized at module level.

---

## Reference Skills

Detailed patterns are in `.claude/skills/`:

| Skill | When to use |
|-------|-------------|
| `bun-runtime.md` | Bun APIs, `bun test`, migration from Node |
| `frontend-patterns.md` | React hooks, composition, performance, forms |
| `backend-patterns.md` | Hono routes, middleware, service layer, file I/O |
| `api-design.md` | REST design, status codes, pagination, Zod validation |
| `deployment-patterns.md` | Railway CI/CD, health checks, rollback |
| `coding-standards.md` | Naming, immutability, file organization |
| `security-review.md` | Auth patterns, Clerk JWT, path traversal, pre-deploy checklist |

Full rules: `.claude/rules/common.md` and `.claude/rules/typescript.md`

Agent definition: `.claude/agents/typescript-reviewer.md`

---

## ARCHITECTURE PLAN — SOURCE OF TRUTH

This is the locked refactor plan. Do not deviate from it. Do not implement phases out of order. Do not add logic to `SalesQuest.tsx` — it is the extraction target.

---

### Phase 0 — Mechanical extraction (types, constants, utilities)

**Scope:** Pure mechanical moves. Zero behavior changes. Zero runtime logic changes. TypeScript must compile after every step. No backend files touched.

**Files to create:**
```
src/types/index.ts
src/lib/constants.ts
src/lib/theme.ts
src/lib/date.ts
src/lib/commission.ts
src/lib/api-client.ts   ← shell only in Phase 0
```

**File to edit:**
```
src/pages/SalesQuest.tsx   ← imports replace inline declarations; nothing else changes
```

---

#### Step 1 — `src/types/index.ts`

Extract verbatim from SalesQuest.tsx:

| Item | Current line(s) |
|------|----------------|
| `ToastVariant` | 11 |
| `Toast` | 12 |
| `CommissionSnapshot` | 43–50 |
| `Sale` | 52–66 |
| `Bonus` | 68–73 |
| `GameState` | 75–80 |
| `CommissionSettings` | 82–92 |
| `Screen` | 94 |

SalesQuest.tsx import:
```ts
import type { CommissionSnapshot, Sale, Bonus, GameState, CommissionSettings, Screen, ToastVariant, Toast } from "../types";
```

Commit: `refactor: extract types to src/types/index.ts (Phase 0)`

---

#### Step 2 — `src/lib/constants.ts`

Extract verbatim from SalesQuest.tsx:

| Item | Current line(s) |
|------|----------------|
| `XP_PER_LEVEL` | 98 |
| `API_ENDPOINT` | 99 |
| `RETRY_DELAYS` | 100 |
| `SETTINGS_KEY` | 101 |
| `BONUS_KEY` | 102 |
| `DEFAULT_SETTINGS` | 104–114 |

Imports: `CommissionSettings` from `../types`.

SalesQuest.tsx import:
```ts
import { XP_PER_LEVEL, API_ENDPOINT, RETRY_DELAYS, SETTINGS_KEY, BONUS_KEY, DEFAULT_SETTINGS } from "../lib/constants";
```

Commit: `refactor: extract constants to src/lib/constants.ts (Phase 0)`

---

#### Step 3 — `src/lib/theme.ts`

Extract verbatim (two non-contiguous blocks):

| Item | Current line(s) |
|------|----------------|
| `C` (color tokens) | 117–126 |
| `_hexRgbCache` | 351 |
| `hexToRgb()` | 352–361 |
| `RGB` | 364 |
| `glassCard()` | 366–374 |
| `GLASS` | 377 |

No external imports needed — pure math and string manipulation.

SalesQuest.tsx import:
```ts
import { C, RGB, GLASS, glassCard, hexToRgb } from "../lib/theme";
```

Commit: `refactor: extract theme tokens to src/lib/theme.ts (Phase 0)`

---

#### Step 4 — `src/lib/date.ts`

Extract verbatim:

| Item | Current line(s) |
|------|----------------|
| `getLocalDateString()` | 130–133 |
| `getCurrentMonth()` | 135 |
| `getEmptyState()` | 137–140 |
| `getYesterday()` | 179–182 |
| `isWorkDay()` | 184–187 |
| `getPrevWorkDay()` | 189–194 |
| `calculateLocalStreakFromSales()` | 196–224 |
| `getLocalDateStringFromDate()` | 226–228 |
| `buildLocalStateFromSales()` | 230–242 |
| `formatMonth()` | 244–249 |
| `groupSalesByDate()` | 330–347 |

Imports: `Sale`, `GameState` from `../types`.

`getLocalDateStringFromDate`, `isWorkDay`, `getPrevWorkDay` are only used internally by other date functions — they do not appear in the SalesQuest.tsx import but must be exported for tsc.

SalesQuest.tsx import:
```ts
import {
  getLocalDateString, getCurrentMonth, getEmptyState,
  getYesterday, formatMonth, groupSalesByDate,
  buildLocalStateFromSales, calculateLocalStreakFromSales,
} from "../lib/date";
```

Commit: `refactor: extract date utilities to src/lib/date.ts (Phase 0)`

---

#### Step 5 — `src/lib/commission.ts`

Extract verbatim:

| Item | Current line(s) |
|------|----------------|
| `computeBase()` | 253–260 |
| `getSaleCommission()` | 262–268 |
| `calculateRevenue()` | 270–271 |
| `createSnapshot()` | 273–276 |
| `getPayPeriodRange()` | 280–300 |
| `calculateXP()` | 305–309 |
| `getLevel()` | 311 |
| `getXPProgress()` | 312 |
| `getXPRemaining()` | 313 |
| `badges` array | 317–326 |

Imports:
- `Sale`, `CommissionSettings`, `CommissionSnapshot`, `GameState` from `../types`
- `DEFAULT_SETTINGS`, `XP_PER_LEVEL` from `./constants`
- `C` from `./theme` — `badges` uses color tokens

SalesQuest.tsx import:
```ts
import {
  computeBase, getSaleCommission, calculateRevenue, createSnapshot,
  getPayPeriodRange, calculateXP, getLevel, getXPProgress, getXPRemaining,
  badges,
} from "../lib/commission";
```

Commit: `refactor: extract commission logic to src/lib/commission.ts (Phase 0)`

---

#### Step 6 — `src/lib/api-client.ts` (shell only)

```ts
// src/lib/api-client.ts
// Phase 0: shell only. Fetch calls remain in SalesQuest.tsx until Phase 2 (TanStack Query).
// This file is the landing zone for the HTTP client layer.
export { API_ENDPOINT } from "./constants";
```

No edits to SalesQuest.tsx. No behavior change.

Commit: `refactor: add api-client shell (Phase 0)`

---

#### Dependency order (do not reorder steps)

```
Step 1  types/index.ts         ← no dependencies
Step 2  lib/constants.ts       ← depends on types (Step 1)
Step 3  lib/theme.ts           ← no dependencies
Step 4  lib/date.ts            ← depends on types (Step 1)
Step 5  lib/commission.ts      ← depends on types (1), constants (2), theme (3)
Step 6  lib/api-client.ts      ← depends on constants (2)
```

---

#### What stays in SalesQuest.tsx — and why

| Item | Reason |
|------|--------|
| `useToast` hook + `ToastContainer` | Hook coupled to component state; extract to `src/components/ui/Toast.tsx` in Phase 3 |
| `loadSettings`, `saveSettingsToStorage`, `loadBonusesFromStorage`, `saveBonusesToStorage` | localStorage reads tied to component init; move when settings go to TanStack Query in Phase 2 |
| `Background`, `Drawer`, `SwipeSaleCard`, `AddBonusModal`, `SaleModal`, `SettingsScreen` | Sub-components — Phase 3 |
| `DrawerProps`, `SwipeSaleCardProps`, `AddBonusModalProps`, `SaleModalProps`, `SettingsScreenProps` | Stay with their components until Phase 3 extracts them |
| All `useEffect` fetch calls | Phase 2 (TanStack Query) |
| `saveToCloud`, `getAuthHeaders`, `tokenRef` | Phase 2 |

---

#### Hooks safety check — run after every step that edits SalesQuest.tsx

```bash
bunx tsc --noEmit
grep -n "if (!clerkLoaded)\|if (!isAuthenticated)" src/pages/SalesQuest.tsx
```

Confirm:
1. tsc exits with zero errors
2. The two early returns are still present at their expected lines
3. No `use` hook call appears after either early return

Phase 0 only touches top-of-file declarations — the hooks block inside the component is never touched. Verify anyway, every step.

---

### Phase 1 — Backend repository layer (planned, not yet designed)

- Extract auth middleware to `server/lib/auth.ts`
- Extract file I/O to `server/lib/repository.ts`
- Split API routes into separate route files
- Add aggregate endpoint for all-time totals

### Phase 2 — TanStack Query (planned, not yet designed)

- Install `@tanstack/react-query`
- Add `src/lib/react-query.ts` config (mirrors bulletproof-react pattern)
- Migrate `useEffect` fetch calls to `useQuery` / `useMutation` hooks
- Move fetch calls out of SalesQuest.tsx into `src/features/sales/api/`
- Adopt bulletproof-react query key pattern: `['sales', { month }]`, `['settings']`, `['bonuses', { month }]`

### Phase 3 — Component extraction (planned, not yet designed)

- Extract `Background` → `src/components/ui/Background.tsx`
- Extract `Drawer` → `src/components/ui/Drawer.tsx`
- Extract `SwipeSaleCard` → `src/components/sales/SwipeSaleCard.tsx`
- Extract `AddBonusModal` → `src/components/bonuses/AddBonusModal.tsx`
- Extract `SaleModal` → `src/components/sales/SaleModal.tsx`
- Extract `SettingsScreen` → `src/components/settings/SettingsScreen.tsx`
- Extract `ToastContainer` + `useToast` → `src/components/ui/Toast.tsx`
