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

### Never do autonomously:
- Delete or modify `bun.lock`
- Change package versions in `package.json`
- Add or remove Railway environment variables without showing the user what you're changing
- Make multiple infrastructure changes in one step

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
