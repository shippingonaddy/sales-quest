# CLAUDE.md — Sales Quest
# READ THIS ENTIRE FILE BEFORE TOUCHING ANY CODE

---

## 🚨 EMERGENCY GUARDRAILS — READ FIRST

- If the app is broken: **diagnose before touching code**. Read logs, check env vars, grep SOLVED.md first.
- Never make more than one change at a time
- Never touch auth code without explicit user confirmation
- Report findings and wait for instruction before acting

---

## 🚫 NEVER

- `rm`, `git reset --hard`, `drop`, `truncate`, or any destructive command without explicit confirmation
- `process.env` — always `import.meta.env` (Vite project)
- `localStorage` or `sessionStorage` in artifacts
- Add any Clerk references — Clerk is being removed, do not touch or re-add
- Add any Railway references — Railway is gone, Vercel is the deploy target
- Commit without `bunx tsc --noEmit` passing zero errors
- Modify more than one system at a time (auth, DB, UI = separate tasks)
- Add logic to `SalesQuest.tsx` — it is the extraction target, not the destination
- Push with TypeScript errors — Vercel may serve a broken cached bundle with no obvious error
- Use `new Date()` directly — always use `toUserTz()` helper
- Place hook calls after conditional early returns (causes React error #310)
- Modify `useAuth`, `useUser`, or any Supabase auth initialization without explicit user permission
- Hardcode API keys, tokens, or secrets — all go in environment variables
- Assume any unspecified implementation detail (providers, services, libraries) — stop and ask first
- Expose stack traces or file paths to the client
- Use `alert()` for user feedback — use the toast system

---

## ✅ ALWAYS

- Read SOLVED.md before starting any task
- Read SESSION.md to load current state
- Grep the specific file before editing it
- Run `bunx tsc --noEmit` after every single change
- Commit working state before starting a new feature
- Prefix all terminal commands: `cd /Users/arturogodoy/Documents/sales-quest-app &&`
- Use Supabase for auth, DB, and storage — everything
- Update SESSION.md at the end of every task
- Validate all user inputs with Zod at API boundaries
- Use parallel `Promise.all` for independent async calls
- Handle errors explicitly — never swallow silently
- One task at a time. Finish it. Commit. Then next.

---

## 📦 Stack

| Layer | Technology |
|---|---|
| Frontend | React/TSX + Vite |
| Backend | Hono + Bun |
| Auth | Supabase Auth (replacing Clerk) |
| Database | Supabase Postgres (replacing flat JSON files) |
| Deploy | Vercel (frontend live, backend migration in progress) |
| Runtime | Vercel Edge Functions (target) |

**Currently deployed:** `sales-quest-app-ci4d.vercel.app`
**GitHub:** `shippingonaddy/sales-quest-app` → `main` branch → auto-deploys to Vercel

---

## 🔑 Role System (planned — not built yet)

- `rep` role → Quest board (XP, streaks, gamified lead queue)
- `dealer_principal` role → Compliance dashboard (ADA accommodation logs)
- Same codebase, Supabase RLS + `profiles.role` gates the view
- Wire roles to Supabase from day one — never Clerk

---

## 📋 Phase Status

| Phase | Status | Description |
|---|---|---|
| Phase 0 | ✅ Complete | Types, constants, utilities extracted from monolith |
| Phase 1 | ✅ Complete | Backend repository layer extracted |
| Phase 2 | ✅ Complete | TanStack Query wired |
| Phase 3 | 🔄 Planned | Component extraction from SalesQuest.tsx |
| Auth Migration | 🔄 In Progress | Clerk → Supabase Auth |
| Data Migration | ⏳ Pending | Flat JSON → Supabase Postgres |
| Backend Migration | ⏳ Pending | Long-running Hono → Vercel Edge Functions |

**Last known clean commit:** `29e1990` fix: move editingInitialData useMemo before early returns

---

## ⚠️ Known Failure Patterns — Check Before Every Commit

### 1. React Error #310 — Hooks after conditional returns
All hooks (`useMemo`, `useCallback`, `useEffect`, etc.) must appear **before** any conditional early returns. Violated once on March 26 2026 — caused full production black screen.
```tsx
// ✅ hooks first
const value = useMemo(() => ..., [])
if (!session) return null

// ❌ hooks after guard
if (!session) return null
const value = useMemo(() => ..., [])
```

### 2. process.env in Vite
`process` does not exist in browsers. Always `import.meta.env.VITE_*`. A `process.env` in `index.html` crashes before React loads.

### 3. Vite must dedupe React
`vite.config.ts` must keep `resolve: { dedupe: ['react', 'react-dom'] }`. Without it, duplicate React instances cause hook violations.

### 4. TypeScript before push
`bunx tsc --noEmit` must exit zero before every commit. Vercel may build successfully but serve a broken cached bundle with no obvious error.

### 5. Hook extraction dep arrays
When moving functions to `lib/` files, verify they are not referenced inside hook dependency arrays. Stable module-level exports do not belong in dep arrays.

### 6. Env var name mismatch
Always use `VITE_` prefix for any frontend env var. Verify `.env.example` matches actual usage after any env var change.

---

## 🐛 Known Tech Debt — Do Not Worsen

- **`SalesQuest.tsx` is a ~1,294-line monolith** — Phase 3 extracts it. Do not add logic here.
- **N+1 fetch for all-time totals** — `calculateTotalCommission` fetches every month individually. Do not add more call sites.
- **Sequential load chain** — `list_months` must resolve before main data fetch. Do not add more sequential dependencies.
- **`alert()` in 5 places** — Do not add more. Toast system is the replacement.
- **`glassCard` / `hexToRgb` called inline in JSX** — Do not add more call sites until memoized.
- **`dist/` committed to repo** — Carry-over from Railway. Remove from git once Vercel build pipeline is confirmed stable.
- **`isLocalMode` is dead code** — Hardcoded `false`, never set. Do not build on top of it.

---

## 📁 File Structure

```
sales-quest-app/
├── server/
│   ├── api/sales-quest.ts       ← API route handlers
│   ├── lib/auth.ts              ← JWT verification (migrating to Supabase)
│   ├── lib/repository.ts        ← Data access layer (migrating to Supabase)
│   ├── lib/types.ts             ← Server types + Zod schemas
│   └── index.ts                 ← Hono server entry
├── src/
│   ├── hooks/
│   │   ├── useAuthHeaders.ts    ← Auth token helper (migrating to Supabase)
│   │   ├── useSalesMutations.ts ← TanStack Query mutations
│   │   └── useSalesQueries.ts   ← TanStack Query queries
│   ├── lib/
│   │   ├── api-client.ts        ← Typed fetcher functions
│   │   ├── commission.ts        ← Commission calculation logic
│   │   ├── constants.ts         ← App constants
│   │   ├── date.ts              ← Date utilities
│   │   ├── react-query.ts       ← QueryClient singleton
│   │   └── theme.ts             ← Color tokens + glass utilities
│   ├── pages/SalesQuest.tsx     ← Main component (extraction target)
│   ├── types/index.ts           ← Shared TypeScript types
│   ├── App.tsx                  ← Auth provider + router (Clerk → Supabase)
│   └── main.tsx                 ← Entry point
```

---

## 🔧 Commands

```bash
bun run dev          # Frontend + backend in parallel
bun run dev:server   # Backend only (port 3001)
bun run dev:client   # Frontend only (port 5173)
bun run build        # Type check + Vite production build
bun run preview      # Preview production build locally
bun run start        # Start production server
bunx tsc --noEmit    # Type check only — run after every change
```

---

## 🌍 Environment Variables

```
# Supabase (replacing Clerk)
# Use NEW key format: sb_publishable_xxx and sb_secret_xxx
# Get from Supabase Dashboard → Settings → API Keys → API Keys tab
# Legacy anon/service_role keys work until end of 2026 but use new keys
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=        # replaces anon key (sb_publishable_xxx)
SUPABASE_SECRET_KEY=                  # replaces service_role key (sb_secret_xxx)

# Server
PORT=3001
NODE_ENV=development
```

**Do not add Clerk vars. Do not add Railway vars.**

---

## 📐 Coding Standards

### Immutability
```typescript
const updated = { ...deal, amount: newAmount }  // ✅
deal.amount = newAmount                          // ❌
```

### TypeScript
- No `any` — use specific types or `unknown` for untrusted input
- Explicit return types on all exported functions
- `interface` for object shapes, `type` for unions
- No `console.log` in production
- Validate env vars at startup, not at use-time

### File Limits
- Functions: under 50 lines
- Files: 200–400 lines typical, 800 max
- Nesting: max 4 levels — use early returns

### Async
```typescript
// ✅ parallel when independent
const [settings, month] = await Promise.all([fetchSettings(userId), fetchMonth(userId)])
// ❌ sequential when unnecessary
const settings = await fetchSettings(userId)
const month = await fetchMonth(userId)
```

---

## 🔐 Security

- All `/api/*` routes verify Supabase JWT before any data access
- `userId` always from verified token — never from request body
- All user inputs validated with Zod at API boundaries
- File paths constructed from validated inputs only
- No secrets, tokens, or stack traces exposed to clients
- No commission amounts or user details in logs
