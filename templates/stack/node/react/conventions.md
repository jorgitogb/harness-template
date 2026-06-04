# Conventions (React)

> Component patterns, hooks, testing, and project structure for React applications.

## Components

- One component per file, file named after the component (`PascalCase.tsx`).
- Use `tsx` extension for any file containing JSX.
- Prefer named exports over default exports.
- Keep components small — extract sub-components when logic branches.
- Co-locate styles, tests, and component-specific types in the same directory.

## Props

- Define props with `type` (not `interface`) and export if shared.
- Destructure props at the function signature level.
- Use `children: React.ReactNode` when accepting children.
- Group related props into an object type for clarity.

## Hooks

- Call hooks at the top level, never inside loops or conditionals.
- Custom hooks use the `use` prefix: `useAuth`, `useFetch`.
- One hook per custom-hook file unless they share state.
- Avoid inline logic — extract complex effects to custom hooks.

## State

- Prefer `useState` for local UI state.
- Use `useReducer` for complex state transitions.
- Context is for low-frequency global state (auth, theme), not rapid UI updates.
- External state (Zustand, Jotai) for cross-cutting concerns.

## JSX

- Self-close tags when there are no children.
- Use the `<>` fragment shorthand over importing Fragment.
- Always provide a `key` prop in lists.
- Conditional rendering: ternary for two branches, `&&` for single branch.

## Styling

- CSS Modules (`.module.css`) for scoped component styles.
- Tailwind CSS as utility classes when configured.
- Avoid inline `style` for anything beyond dynamic values.
- Keep color values in a shared theme or config.

## Testing

- Use `vitest` + `@testing-library/react`.
- Test file: `ComponentName.test.tsx` next to the component.
- Test behavior, not implementation — query by role/text, not class names.
- Use `userEvent` over `fireEvent` for user interactions.
- Render in a wrapper when context providers are needed.

## Performance

- `React.memo` for pure presentational components rendered frequently.
- `useMemo` / `useCallback` only when profiling shows a problem.
- Code-split with `React.lazy` + `Suspense` for route-level chunks.

## Git

- Conventional commits: `feat(ui): add Button component`.
- Branch naming: `feat/button-styles`, `fix/login-redirect`.
