---
name: backend-patterns
description: Backend architecture patterns, API design, error handling, middleware, and server-side best practices for Hono/Node.js backends.
origin: ECC
---

# Backend Development Patterns

Backend architecture patterns and best practices for scalable server-side applications.

## When to Activate

- Designing REST API endpoints (Hono routes)
- Implementing service or handler layers
- Adding caching or optimization
- Setting up error handling and validation for APIs
- Building middleware (auth, logging, rate limiting)
- Working with file-based storage (JSON persistence)

## API Design Patterns

### RESTful API Structure (Hono)

```typescript
// Resource-based URLs
app.get('/api/sales', authMiddleware, async (c) => { /* list */ })
app.get('/api/sales/:id', authMiddleware, async (c) => { /* get one */ })
app.post('/api/sales', authMiddleware, async (c) => { /* create */ })
app.patch('/api/sales/:id', authMiddleware, async (c) => { /* update */ })
app.delete('/api/sales/:id', authMiddleware, async (c) => { /* delete */ })
```

### Middleware Pattern (Hono)

```typescript
export async function authMiddleware(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const user = await verifyClerkToken(token)
    c.set('userId', user.sub)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
}
```

### Service Layer Pattern

```typescript
class SalesService {
  constructor(private dataDir: string) {}

  async getCurrentMonth(userId: string) {
    const filePath = path.join(this.dataDir, userId, 'current.json')
    try {
      const file = Bun.file(filePath)
      return await file.json()
    } catch {
      return { deals: [], month: getCurrentMonth() }
    }
  }

  async saveSale(userId: string, sale: Sale) {
    const filePath = path.join(this.dataDir, userId, 'current.json')
    const tempPath = filePath + '.tmp'
    await Bun.write(tempPath, JSON.stringify(sale, null, 2))
    await rename(tempPath, filePath) // atomic write
  }
}
```

## Error Handling Patterns

### Centralized Error Handler

```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
  }
}

export function errorHandler(error: unknown, c: Context): Response {
  if (error instanceof ApiError) {
    return c.json({ success: false, error: error.message }, error.statusCode)
  }
  if (error instanceof z.ZodError) {
    return c.json({ success: false, error: 'Validation failed', details: error.errors }, 400)
  }
  console.error('Unexpected error:', error)
  return c.json({ success: false, error: 'Internal server error' }, 500)
}
```

### Retry with Exponential Backoff

```typescript
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }
  }
  throw lastError!
}
```

## Rate Limiting

```typescript
class RateLimiter {
  private requests = new Map<string, number[]>()

  check(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const requests = (this.requests.get(identifier) || []).filter(t => now - t < windowMs)
    if (requests.length >= maxRequests) return false
    requests.push(now)
    this.requests.set(identifier, requests)
    return true
  }
}
```

## Logging & Monitoring

```typescript
class Logger {
  log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context }))
  }
  info(msg: string, ctx?: Record<string, unknown>) { this.log('info', msg, ctx) }
  error(msg: string, error: Error, ctx?: Record<string, unknown>) {
    this.log('error', msg, { ...ctx, error: error.message })
  }
}
```

**Remember**: Backend patterns enable scalable, maintainable server-side applications. Choose patterns that fit your complexity level.
