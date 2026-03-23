---
name: coding-standards
description: Universal coding standards for TypeScript/React projects — naming, immutability, error handling, file organization, and code quality principles.
origin: ECC
---

# Coding Standards

Universal coding standards applicable across all projects.

## When to Activate

- Starting a new module or feature
- Reviewing code for quality and maintainability
- Refactoring existing code to follow conventions
- Enforcing naming, formatting, or structural consistency

## Code Quality Principles

1. **Readability First** — Code is read more than written. Clear names, consistent formatting.
2. **KISS** — Simplest solution that works. No premature optimization.
3. **DRY** — Extract common logic. Avoid copy-paste.
4. **YAGNI** — Don't build features before they're needed. Add complexity only when required.

## TypeScript/JavaScript Standards

### Variable Naming

```typescript
// ✅ GOOD
const dealSearchQuery = 'johnson'
const isUserAuthenticated = true
const totalCommission = 1000

// ❌ BAD
const q = 'johnson'
const flag = true
const x = 1000
```

### Function Naming

```typescript
// ✅ GOOD: Verb-noun pattern
async function fetchDealData(dealId: string) {}
function calculateCommission(deal: Deal): number {}
function isValidAmount(amount: number): boolean {}

// ❌ BAD
async function deal(id: string) {}
function commission(d: Deal) {}
```

### Immutability (CRITICAL)

```typescript
// ✅ ALWAYS use spread operator
const updatedDeal = { ...deal, amount: newAmount }
const updatedDeals = [...deals, newDeal]

// ❌ NEVER mutate directly
deal.amount = newAmount   // BAD
deals.push(newDeal)       // BAD
```

### Error Handling

```typescript
// ✅ GOOD
async function fetchData(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    return await response.json()
  } catch (error) {
    console.error('Fetch failed:', error)
    throw new Error('Failed to fetch data')
  }
}

// ❌ BAD: No error handling
async function fetchData(url: string) {
  return (await fetch(url)).json()
}
```

### Async/Await Best Practices

```typescript
// ✅ GOOD: Parallel when independent
const [settings, currentMonth] = await Promise.all([
  fetchSettings(userId),
  fetchCurrentMonth(userId)
])

// ❌ BAD: Sequential when unnecessary
const settings = await fetchSettings(userId)
const currentMonth = await fetchCurrentMonth(userId)
```

### Type Safety

```typescript
// ✅ GOOD: Proper types, no 'any'
interface Deal {
  id: string
  amount: number
  type: 'flat' | 'flat_plus_down' | 'front_back_percent'
  date: string
}

function getDeal(id: string): Promise<Deal> {}

// ❌ BAD
function getDeal(id: any): Promise<any> {}
```

## React Best Practices

```typescript
// ✅ Functional component with typed props
interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}

export function Button({ children, onClick, disabled = false }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{children}</button>
}

// ✅ Functional state updates
setCount(prev => prev + 1)  // not setCount(count + 1)

// ✅ Clear conditional rendering
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{data && <DataDisplay data={data} />}
```

## File Organization

```
src/
├── pages/          # Page-level components
├── components/     # Reusable React components
│   ├── ui/        # Generic UI components
│   └── forms/     # Form components
├── hooks/          # Custom React hooks
├── lib/            # Utilities and configs
└── types/          # TypeScript types

server/
├── index.ts        # Hono server entry
└── api/            # Route handlers
```

### File Limits

- Functions: under 50 lines
- Files: 200-400 lines typical, 800 max
- Nesting: no deeper than 4 levels

### Magic Numbers → Named Constants

```typescript
// ❌ BAD
if (retryCount > 3) {}
setTimeout(callback, 500)

// ✅ GOOD
const MAX_RETRIES = 3
const DEBOUNCE_DELAY_MS = 500
if (retryCount > MAX_RETRIES) {}
setTimeout(callback, DEBOUNCE_DELAY_MS)
```

## Code Smell Detection

- Long functions (>50 lines) → split
- Deep nesting (>4 levels) → early returns
- Duplicate code (>3 repetitions) → extract function
- `any` types → use specific types or `unknown`
- `console.log` in production → use structured logger

**Remember**: Code quality is not negotiable. Clear, maintainable code enables rapid development.
