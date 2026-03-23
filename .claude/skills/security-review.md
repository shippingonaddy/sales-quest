---
name: security-review
description: Use when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing sensitive features. Security checklist and patterns for Clerk auth + Hono backend.
origin: ECC
---

# Security Review

Ensures all code follows security best practices and identifies potential vulnerabilities.

## When to Activate

- Implementing authentication or authorization (Clerk)
- Handling user input or file uploads
- Creating new API endpoints (Hono routes)
- Working with secrets or credentials
- Storing or transmitting sensitive data
- Integrating third-party APIs

## Security Checklist

### 1. Secrets Management

```typescript
// ❌ NEVER hardcode secrets
const clerkSecret = "sk_live_xxxxx"

// ✅ ALWAYS use environment variables
const clerkSecret = process.env.CLERK_SECRET_KEY
if (!clerkSecret) throw new Error('CLERK_SECRET_KEY not configured')
```

- [ ] No hardcoded API keys, tokens, or passwords
- [ ] All secrets in environment variables
- [ ] `.env` in .gitignore
- [ ] Production secrets in Railway dashboard (not in code)

### 2. Input Validation (Zod)

```typescript
import { z } from 'zod'

const SaleSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['flat', 'flat_plus_down', 'front_back_percent']),
  date: z.string().datetime(),
})

app.post('/api/sales', async (c) => {
  const body = await c.req.json()
  const parsed = SaleSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.errors }, 400)
  }
  // use parsed.data safely
})
```

- [ ] All user inputs validated with schemas before use
- [ ] No direct use of user input in file paths
- [ ] Error messages don't leak sensitive info (file paths, stack traces)

### 3. Path Traversal Prevention (File-Based Storage)

```typescript
// ❌ DANGEROUS: User controls file path
const filePath = path.join(dataDir, req.params.userId, 'current.json')

// ✅ SAFE: Sanitize userId (Clerk sub is already safe, but still validate)
function sanitizeUserId(userId: string): string {
  if (!/^user_[a-zA-Z0-9]+$/.test(userId)) throw new Error('Invalid userId')
  return userId
}
const safePath = path.join(dataDir, sanitizeUserId(userId), 'current.json')
```

- [ ] File paths constructed from validated inputs only
- [ ] No path traversal possible (`../` sequences)
- [ ] User IDs come from verified Clerk JWT, not user input

### 4. Authentication (Clerk JWT)

```typescript
// Verify Clerk JWT using JWKS
async function verifyClerkToken(token: string): Promise<{ sub: string }> {
  const JWKS = createRemoteJWKSet(new URL('https://api.clerk.dev/v1/jwks'))
  const { payload } = await jwtVerify(token, JWKS)
  return { sub: payload.sub as string }
}

// Always verify before any data access
app.use('/api/*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const user = await verifyClerkToken(token)
    c.set('userId', user.sub)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
```

- [ ] Every `/api/*` route requires valid Clerk JWT
- [ ] `userId` always comes from verified token, never from request body/params
- [ ] Users can only access their own data (verify ownership)

### 5. Authorization (User Data Isolation)

```typescript
// ✅ Always verify user owns the resource
app.get('/api/sales/:month', async (c) => {
  const userId = c.get('userId')  // from Clerk token, not user input
  const month = c.req.param('month')

  // userId from token ensures data isolation
  const filePath = path.join(DATA_DIR, userId, `archive/${month}.json`)
  // ...
})
```

- [ ] Each user's data in separate directory (`/data/sales-quest/<userId>/`)
- [ ] No cross-user data access possible
- [ ] Admin endpoints (if any) protected separately

### 6. Error Messages

```typescript
// ❌ WRONG: Leaks internal paths and stack traces
catch (error) {
  return c.json({ error: error.message, stack: error.stack }, 500)
}

// ✅ CORRECT: Generic message to client, details in server logs
catch (error) {
  console.error('Internal error:', error)
  return c.json({ error: 'An error occurred. Please try again.' }, 500)
}
```

- [ ] No stack traces exposed to clients
- [ ] No internal file paths in error responses
- [ ] Detailed errors only in server logs

### 7. Sensitive Data in Logs

```typescript
// ❌ WRONG
console.log('User data:', { userId, commissionSettings, dealAmounts })

// ✅ CORRECT: Log only what's needed for debugging
console.log('Sale saved', { userId: userId.substring(0, 8) + '...', month })
```

- [ ] No commission amounts or personal data in logs
- [ ] No full user IDs in logs (truncate if needed)

### 8. Conflict Resolution (lastModifiedTime)

```typescript
// Safe: 60-second clock skew tolerance already implemented
// Ensure conflict detection can't be bypassed via manipulated timestamps
if (clientTimestamp > serverTimestamp + CLOCK_SKEW_TOLERANCE_MS) {
  return c.json({ error: 'Conflict detected', serverData }, 409)
}
```

## Pre-Deployment Security Checklist

- [ ] **Secrets**: No hardcoded secrets, all in Railway env vars
- [ ] **Input Validation**: All user inputs validated with Zod
- [ ] **Path Traversal**: File paths constructed from validated inputs only
- [ ] **Authentication**: Every API route verifies Clerk JWT
- [ ] **Authorization**: Users can only access their own data
- [ ] **Error Handling**: No sensitive data in client error responses
- [ ] **Logging**: No sensitive data logged
- [ ] **CORS**: Configured for allowed origins only

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Clerk Security](https://clerk.com/docs/security)
- [Hono Security](https://hono.dev/)
