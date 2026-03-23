# TypeScript/JavaScript Rules

Extends common rules for TypeScript/React projects.

Applies to: `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.jsx`

## Types and Interfaces

- Use `interface` for object shapes that may be extended or implemented
- Use `type` for unions, utility types, and function signatures
- No `any` — use `unknown` for untrusted input, then narrow it
- Explicit return types on all exported functions
- React components: named prop interfaces, not `React.FC`

```typescript
// ✅ GOOD
interface DealProps {
  deal: Deal
  onSave: (deal: Deal) => void
}

export function DealCard({ deal, onSave }: DealProps) {}

// ❌ BAD
export const DealCard: React.FC<any> = (props) => {}
```

## Immutable Updates (TypeScript)

```typescript
// ✅ Always spread
const updated = { ...deal, amount: newAmount }
const updatedList = [...deals, newDeal]
const filtered = deals.filter(d => d.id !== id)

// ❌ Never mutate
deal.amount = newAmount
deals.push(newDeal)
```

## Error Handling (TypeScript)

```typescript
// ✅ Narrow unknown errors
try {
  await saveDeal(deal)
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error('Save failed:', message)
}
```

## Validation

- Use Zod for all schema-based validation
- Validate at API boundaries, not deep inside business logic
- `z.safeParse()` for user-facing errors, `.parse()` for internal assertions

## Logging

- No `console.log` statements in production code
- Use structured logging: `console.error(JSON.stringify({ level: 'error', message, context }))`
- Never log sensitive data (amounts, user details, tokens)

## Patterns

- API response format: `{ success: boolean, data?: T, error?: string }`
- Custom hooks: always prefix with `use`, return named values (not arrays when >2 values)
- Async functions: always `await` Promises, never fire-and-forget without error handling

## Security (TypeScript-Specific)

- Secrets always from `process.env.*`, never hardcoded
- Validate env vars exist at startup, not at use-time
- File paths: construct from validated/sanitized inputs only

## Testing

- E2E tests: use **Playwright** for critical user flows
- Unit tests: use `bun test` with Jest-like API
- Test naming: describe behavior, not implementation (`'returns empty array when no deals match'`)

## Hooks (PostToolUse suggestions)

After editing `.ts`/`.tsx` files, verify:
- TypeScript still compiles (`bun run build`)
- No new `console.log` introduced
- Immutability preserved
