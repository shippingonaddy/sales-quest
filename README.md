# Sales Quest

A full-stack TypeScript SaaS app for tracking sales commissions, XP, streaks, and bonuses — with per-user persistent storage on the backend.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Hono.js |
| Auth | Clerk (JWT verified server-side) |
| Storage | JSON files on Railway persistent volume |
| Deployment | Railway |

## Local Development

```bash
bun install          # install dependencies
bun run dev          # frontend (5173) + backend (3001) in parallel
bun run dev:server   # backend only
bun run dev:client   # frontend only
```

Copy `.env.example` to `.env` and fill in your Clerk credentials before running.

## Production

```bash
bun run build   # type-check + Vite build → dist/
bun run start   # serves dist/ + API on $PORT (default 3001)
```

Deployed on Railway. Build: `bun install && bun run build`. Start: `bun run start`. The Hono server serves both the static `dist/` files and `/api/*` routes from a single process.

## Architecture

```
Browser
  └── React (src/)
        └── /api/* requests
              └── Hono server (server/)
                    ├── Clerk JWT middleware (every route)
                    └── File I/O → /data/sales-quest/<userId>/
```

In development, Vite proxies `/api/*` → `http://localhost:3001`.
In production, Hono serves everything from one process on `$PORT`.

## Data Storage

All data lives on a Railway persistent volume mounted at `/data/sales-quest/`. Each user gets their own subdirectory keyed by Clerk `userId`:

```
/data/sales-quest/<userId>/
  current.json          # current month's sales
  settings.json         # commission settings
  archive/
    YYYY-MM.json        # past months
  bonuses/
    YYYY-MM.json        # monthly bonuses
```

Writes are atomic (write to temp file → rename) to prevent corruption. `userId` always comes from the verified Clerk JWT — never from the request body.

## Project Structure

```
sales-quest-app/
├── src/
│   ├── pages/
│   │   └── SalesQuest.tsx   # main app component (~1600 lines)
│   ├── lib/
│   │   ├── constants.ts     # shared constants and defaults
│   │   ├── theme.ts         # color/glass card helpers
│   │   ├── date.ts          # date/streak utilities
│   │   ├── commission.ts    # commission/XP calculations
│   │   └── api-client.ts   # API endpoint reference
│   ├── types/
│   │   └── index.ts         # shared TypeScript types
│   ├── App.tsx              # ClerkProvider root
│   └── main.tsx             # entry point
├── server/
│   ├── index.ts             # Hono server entry
│   └── api/
│       └── sales-quest.ts   # all API route handlers
├── bun.lock                 # committed — pins exact package versions
├── railway.toml             # build/start commands for Railway
└── vite.config.ts           # Vite config (includes React dedupe)
```

## API

All routes require a valid Clerk JWT (`Authorization: Bearer <token>`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sales-quest?action=list_months` | List all months with data |
| GET | `/api/sales-quest?month=YYYY-MM` | Get a specific month |
| GET | `/api/sales-quest` | Get current month |
| POST | `/api/sales-quest` | Save current month |
| GET | `/api/sales-quest?action=total_commission` | All-time aggregate |
| GET | `/health` | Health check |

## Environment Variables

| Variable | Where set | Purpose |
|----------|-----------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Railway (build-time) | Baked into frontend bundle by Vite |
| `CLERK_SECRET_KEY` | Railway (runtime) | Backend JWT verification |
| `PORT` | Railway (runtime) | Server port (default 3001) |
| `DATA_DIR` | Railway (runtime) | Storage path (default `./data`) |

`VITE_*` vars must be set in Railway before deploying — Vite bakes them into the bundle at build time.

## Key Business Logic

- **Commission types**: `flat`, `flat_plus_down`, `front_back_percent`
- **XP**: 50 per deal, 25 per split, 25 per streak day
- **Levels**: `floor(XP / 100) + 1`
- **Streaks**: exclude Sundays and Wednesdays (non-work days)
- **Conflict resolution**: `lastModifiedTime` with 60s clock skew tolerance

Backend is canonical for commission and streak calculations. Frontend XP and badges are derived/cosmetic.
