# SESSION.md — Current Build State
# Overwrite at END of every session. Read at START of every session.

---

## Last Updated
May 25 2026 — Clerk → Supabase Auth migration starting

## Current Phase
Auth Migration — Clerk → Supabase Auth

## What Was Just Completed
- Full repo audit: Clerk confirmed active across 6 files, Railway refs in toml/.mcp.json/docs
- Vercel connected to GitHub (sales-quest-app-ci4d.vercel.app), auto-deploys from main
- CLAUDE.md rewritten: Vercel + Supabase stack, all Railway/Clerk rules stripped
- SOLVED.md and SESSION.md created at project root
- tsc clean: zero errors confirmed

## What Is Broken / In Progress
- App shows "Loading authentication..." on Vercel — Clerk env vars intentionally not set, migrating away
- No Supabase dependency installed yet
- Backend still uses flat JSON file storage on local disk (data migration comes after auth)
- server/lib/auth.ts still has Clerk JWKS hardcoded to sunny-spider-24.clerk.accounts.dev

## Do NOT Touch Until Auth Migration Complete
- src/pages/SalesQuest.tsx business logic
- src/hooks/useSalesMutations.ts
- src/hooks/useSalesQueries.ts
- src/lib/* (commission, date, theme, constants)
- server/lib/repository.ts
- server/api/sales-quest.ts

## Next Task (single item)
Replace Clerk with Supabase Auth — one file at a time in this order:
1. Install @supabase/supabase-js
2. src/App.tsx — swap ClerkProvider for Supabase session provider
3. src/hooks/useAuthHeaders.ts — swap useAuth for Supabase session token
4. src/pages/SalesQuest.tsx — swap useAuth/useUser/UserButton/RedirectToSignIn
5. server/lib/auth.ts — swap JWKS verifier for Supabase JWT verification
6. server/index.ts + server/api/sales-quest.ts — swap X-Clerk-Token header

## tsc Status
- [x] PASSING — confirmed clean before migration start

## Vercel
- URL: sales-quest-app-ci4d.vercel.app
- Source: github.com/shippingonaddy/sales-quest-app → main
- Push to main = auto deploy
- Required env vars to add in Vercel dashboard before first Supabase deploy:
  VITE_SUPABASE_URL
  VITE_SUPABASE_PUBLISHABLE_KEY
  SUPABASE_SECRET_KEY
