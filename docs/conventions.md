# Conventions

> Style, naming, and formatting rules for this project.

## Language

# Conventions (Node / TypeScript)

> Style, naming, and formatting rules for Node.js and TypeScript projects.

## Formatting

- Use Prettier for auto-formatting.
- Indent with 2 spaces.
- Single quotes for strings.
- Trailing commas in multi-line collections.
- No semicolons (Prettier default).

## Naming

- Functions and variables: `camelCase`.
- Classes and types: `PascalCase`.
- Interfaces: `PascalCase` (no `I` prefix).
- Constants: `UPPER_SNAKE_CASE` for true constants, `camelCase` for module-level.
- Files: `kebab-case.ts` (e.g., `user-service.ts`).

## TypeScript

- Strict mode enabled.
- Use `type` over `interface` for simple shapes.
- Prefer `unknown` over `any`.
- Use `satisfies` for type narrowing where possible.
- Explicit return types for exported functions.

## Imports

- Group: external → internal → relative. One blank line between groups.
- Use `import type` for type-only imports.
- Sort alphabetically within each group.

## Errors

- Use custom error classes extending `Error`.
- Catch specific errors, not `try/catch` with `any`.
- Use Result types or error objects, not thrown exceptions in business logic.

## Testing

- Use Vitest or Jest as the test runner.
- Test file names: `<module>.test.ts`.
- Test function names: `describe('ModuleName') / it('should <behavior>')`.
- Use `vi.fn()` or `jest.fn()` for mocks.
- Use `tmp` directory for filesystem tests.

## Git

- Conventional commits: `feat(module): description`.
- Branch naming: `feat/description`, `fix/description`.


## Formatting

- Indent with spaces (2 for YAML/JSON, 4 for Python, 2 for TypeScript).
- Trailing commas in multi-line arrays and objects.
- Single quotes for strings in Python, double quotes in TypeScript.
- No semicolons in TypeScript (Prettier default).

## Comments

- One-line comments for "why", not "what".
- No comment blocks longer than 3 lines.
- TODO format: `// TODO(username): description — ticket/issue`.

## Imports

- Group: stdlib → external → internal. One blank line between groups.
- No wildcard imports.
- Sort alphabetically within each group.

## Git

- Conventional commits: `<type>(<scope>): <subject>`.
- Types: feat, fix, docs, refactor, test, chore, perf, ci, build.
- Max 72 characters in the subject line.
- No commits directly to `main`. Use branches and PRs.

## Tests

- One assertion per test where possible.
- Test names describe behavior: `should <expected> when <condition>`.
- Use temp directories, not mocks, for filesystem tests.
- Clean up after tests (temp dirs, env vars).
