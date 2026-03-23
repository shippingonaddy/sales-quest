# Common Rules

Always-on guidelines for this project.

## Coding Style

- **Immutability (CRITICAL)**: ALWAYS create new objects with spread (`{...obj, key: value}`), NEVER mutate existing ones directly
- Files: 200-400 lines typical, 800 lines max. Prefer focused files over monolithic ones.
- Functions: under 50 lines. No nesting deeper than 4 levels.
- ALWAYS handle errors explicitly at every level
- ALWAYS validate at system boundaries (user input, API responses, file reads)
- No hardcoded values — use named constants

## Git Workflow

Commit message format: `<type>: <description>`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

- Review complete diff before committing, not just latest change
- Push new branches with `-u` flag

## Testing

- 80% minimum test coverage
- Required: unit tests (functions/components), integration tests (API endpoints), E2E tests (critical flows)
- TDD workflow: Write test (RED) → Write minimal implementation (GREEN) → Refactor (IMPROVE)
- Use `bun test` as test runner

## Security (Mandatory Pre-Commit)

- No hardcoded secrets (API keys, passwords, tokens)
- All user inputs validated
- Path traversal prevention for file-based storage
- Authentication verified on every API route
- Error messages must not expose sensitive information
- Rate limiting on all public endpoints

## Performance

- Use `Promise.all()` for independent async operations (never sequential when parallel is possible)
- Memoize expensive React computations with `useMemo`
- Memoize callbacks passed to children with `useCallback`
- Select only needed data (avoid reading entire files when a subset suffices)

## Patterns

- Repository pattern for data access (abstract file I/O behind a service)
- Consistent API response format: `{ success: boolean, data?: T, error?: string }`
- Use `unknown` instead of `any` for untrusted external data

## Agent Delegation

Delegate immediately (no user prompt needed) when:
- Complex new feature → use **planner** agent
- Code just written/modified → use **typescript-reviewer** agent
- Security concern found → use **security-reviewer** agent
- Build fails → use **build-error-resolver** agent

ALWAYS use parallel task execution for independent operations.
