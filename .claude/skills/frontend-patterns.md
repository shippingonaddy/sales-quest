---
name: frontend-patterns
description: Frontend development patterns for React, state management, performance optimization, custom hooks, and UI best practices.
origin: ECC
---

# Frontend Development Patterns

Modern frontend patterns for React and performant user interfaces.

## When to Activate

- Building React components (composition, props, rendering)
- Managing state (useState, useReducer, Context)
- Implementing data fetching hooks
- Optimizing performance (memoization, virtualization, code splitting)
- Working with forms (validation, controlled inputs, Zod schemas)
- Building accessible, responsive UI patterns

## Component Patterns

### Composition Over Inheritance

```typescript
interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'outlined'
}

export function Card({ children, variant = 'default' }: CardProps) {
  return <div className={`card card-${variant}`}>{children}</div>
}
```

### Compound Components

```typescript
const TabsContext = createContext<TabsContextValue | undefined>(undefined)

export function Tabs({ children, defaultTab }: { children: React.ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}
```

## Custom Hooks Patterns

### Async Data Fetching Hook

```typescript
export function useQuery<T>(key: string, fetcher: () => Promise<T>, options?: UseQueryOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
      options?.onSuccess?.(result)
    } catch (err) {
      const error = err as Error
      setError(error)
      options?.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [fetcher, options])

  useEffect(() => {
    if (options?.enabled !== false) refetch()
  }, [key, refetch, options?.enabled])

  return { data, error, loading, refetch }
}
```

### Debounce Hook

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}
```

## State Management Patterns

### Context + Reducer Pattern

```typescript
type Action =
  | { type: 'SET_DATA'; payload: Deal[] }
  | { type: 'SET_LOADING'; payload: boolean }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DATA': return { ...state, data: action.payload }
    case 'SET_LOADING': return { ...state, loading: action.payload }
    default: return state
  }
}
```

## Performance Optimization

```typescript
// useMemo for expensive computations
const sortedDeals = useMemo(() => [...deals].sort((a, b) => b.amount - a.amount), [deals])

// useCallback for functions passed to children
const handleSearch = useCallback((query: string) => setSearchQuery(query), [])

// React.memo for pure components
export const DealCard = React.memo<DealCardProps>(({ deal }) => (
  <div className="deal-card"><h3>{deal.name}</h3></div>
))

// Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'))
```

## Error Boundary Pattern

```typescript
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}
```

## Accessibility Patterns

```typescript
// Keyboard navigation
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown': setActiveIndex(i => Math.min(i + 1, options.length - 1)); break
    case 'ArrowUp': setActiveIndex(i => Math.max(i - 1, 0)); break
    case 'Enter': onSelect(options[activeIndex]); break
    case 'Escape': setIsOpen(false); break
  }
}
```

**Remember**: Choose patterns that fit your project complexity. Don't over-engineer.
