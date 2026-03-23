---
name: api-design
description: REST API design patterns including resource naming, status codes, pagination, filtering, error responses, and versioning for production APIs.
origin: ECC
---

# API Design Patterns

Conventions and best practices for designing consistent, developer-friendly REST APIs.

## When to Activate

- Designing new API endpoints
- Reviewing existing API contracts
- Adding pagination, filtering, or sorting
- Implementing error handling for APIs
- Building public or partner-facing APIs

## Resource Design

### URL Structure

```
GET    /api/sales                   # List resources
GET    /api/sales/:id               # Get single resource
POST   /api/sales                   # Create resource
PUT    /api/sales/:id               # Replace resource
PATCH  /api/sales/:id               # Update resource
DELETE /api/sales/:id               # Delete resource

# Sub-resources for relationships
GET    /api/users/:id/sales
POST   /api/auth/refresh
```

### Naming Rules

```
# GOOD
/api/team-members          # kebab-case for multi-word resources
/api/sales?status=active   # query params for filtering
/api/users/123/deals       # nested resources for ownership

# BAD
/api/getSales              # verb in URL
/api/sale                  # singular (use plural)
/api/team_members          # snake_case in URLs
```

## HTTP Methods and Status Codes

```
# Success
200 OK                    — GET, PUT, PATCH (with response body)
201 Created               — POST (include Location header)
204 No Content            — DELETE, PUT (no response body)

# Client Errors
400 Bad Request           — Validation failure, malformed JSON
401 Unauthorized          — Missing or invalid authentication
403 Forbidden             — Authenticated but not authorized
404 Not Found             — Resource doesn't exist
409 Conflict              — Duplicate entry, state conflict
429 Too Many Requests     — Rate limit exceeded

# Server Errors
500 Internal Server Error — Unexpected failure (never expose details)
503 Service Unavailable   — Temporary overload
```

## Response Format

### Success Response

```json
{
  "data": {
    "id": "abc-123",
    "amount": 5000,
    "created_at": "2026-03-22T10:30:00Z"
  }
}
```

### Collection Response (with Pagination)

```json
{
  "data": [{ "id": "abc-123" }, { "id": "def-456" }],
  "meta": { "total": 42, "page": 1, "per_page": 20, "total_pages": 3 }
}
```

### Error Response

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "field": "amount", "message": "Must be a positive number", "code": "invalid_format" }
    ]
  }
}
```

## Authentication and Authorization

```typescript
// Bearer token in Authorization header (Clerk JWT)
// GET /api/sales
// Authorization: Bearer eyJhbGciOiJSUzI1NiIs...

// Authorization pattern
app.get('/api/sales', async (c) => {
  const userId = c.get('userId') // set by auth middleware
  const sale = await getSale(saleId)
  if (sale.userId !== userId) return c.json({ error: { code: 'forbidden' } }, 403)
  return c.json({ data: sale })
})
```

## Rate Limiting

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000

# When exceeded
HTTP/1.1 429 Too Many Requests
Retry-After: 60
{ "error": { "code": "rate_limit_exceeded", "message": "Try again in 60 seconds." } }
```

## Input Validation (Zod)

```typescript
import { z } from 'zod'

const CreateSaleSchema = z.object({
  amount: z.number().positive(),
  date: z.string().datetime(),
  type: z.enum(['flat', 'flat_plus_down', 'front_back_percent']),
})

app.post('/api/sales', async (c) => {
  const body = await c.req.json()
  const parsed = CreateSaleSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({
      error: {
        code: 'validation_error',
        message: 'Request validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      },
    }, 422)
  }
  // proceed with parsed.data
})
```

## API Design Checklist

- [ ] Resource URL follows naming conventions (plural, kebab-case, no verbs)
- [ ] Correct HTTP method used
- [ ] Appropriate status codes returned (not 200 for everything)
- [ ] Input validated with Zod schema
- [ ] Error responses follow standard format with codes and messages
- [ ] Authentication required (Clerk JWT verified)
- [ ] Authorization checked (user owns the resource)
- [ ] Response does not leak internal details (stack traces, file paths)
