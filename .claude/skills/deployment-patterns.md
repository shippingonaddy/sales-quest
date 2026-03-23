---
name: deployment-patterns
description: Production deployment workflows, CI/CD, health checks, rollback strategy, and Railway-specific deployment patterns.
origin: ECC
---

# Deployment Patterns

Production deployment workflows and CI/CD best practices.

## When to Activate

- Setting up or modifying CI/CD pipelines
- Planning a production release
- Implementing health checks
- Configuring Railway deployments
- Preparing environment-specific settings

## Railway Deployment

This project deploys on Railway via `railway.toml`.

```bash
# Build: bun install && bun run build
# Start: bun run start (NODE_ENV=production bun run server/index.ts)

# Useful Railway CLI commands
railway status
railway logs
railway up
railway environment
```

### Key Deployment Configuration

```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "bun install && bun run build"

[deploy]
startCommand = "bun run start"
healthcheckPath = "/health"
restartPolicyType = "ON_FAILURE"
```

## Health Checks

```typescript
// Hono health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', uptime: process.uptime() })
})

// Detailed health check
app.get('/health/detailed', async (c) => {
  const dataDir = process.env.DATA_DIR || './data'
  const canWrite = await checkDataDir(dataDir)

  return c.json({
    status: canWrite ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: { dataDir: canWrite ? 'ok' : 'error' }
  }, canWrite ? 200 : 503)
})
```

## Environment Configuration

```bash
# All config via environment variables
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
PORT=3001
DATA_DIR=/data/sales-quest
NODE_ENV=production
```

### Configuration Validation

```typescript
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATA_DIR: z.string().default('./data'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  CLERK_SECRET_KEY: z.string().optional(),
})

export const env = envSchema.parse(process.env)
```

## Production Readiness Checklist

### Application
- [ ] All TypeScript compiles without errors (`bun run build`)
- [ ] No hardcoded secrets in code or config files
- [ ] Health check endpoint returns meaningful status
- [ ] Error handling covers edge cases
- [ ] Atomic writes used for file persistence (temp file → rename)

### Infrastructure
- [ ] Environment variables set in Railway dashboard
- [ ] DATA_DIR points to persistent storage volume
- [ ] PORT matches Railway's expected port

### Security
- [ ] CORS configured for allowed origins only
- [ ] Clerk JWT verification working in production
- [ ] No sensitive data in logs

### Operations
- [ ] Rollback plan: redeploy previous commit via Railway dashboard
- [ ] Railway logs monitored after deploy

## Rollback Strategy

```bash
# Railway: redeploy previous deployment from dashboard
# Or via CLI:
railway up --detach  # deploy and detach

# If data corruption: restore from archive/<YYYY-MM>.json backups
```

## Deployment Strategies

### Rolling (Railway default)
Railway replaces instances gradually — zero downtime for most changes.

**Requires**: backward-compatible API changes while old + new run simultaneously.

### Checklist Before Deploying

- [ ] `bun run build` passes locally
- [ ] Environment variables verified in Railway
- [ ] No breaking changes to `/api/*` routes (clients may cache)
- [ ] `DATA_DIR` volume is mounted and writable
- [ ] Health check endpoint accessible after deploy
