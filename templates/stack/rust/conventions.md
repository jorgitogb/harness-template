# Conventions (Rust)

> Style, naming, and formatting rules for Rust projects.

## Formatting

- Use `rustfmt` for auto-formatting.
- Default settings (4-space indent, 100 char line width).
- Use `clippy` for linting.

## Naming

- Functions and variables: `snake_case`.
- Types and traits: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Modules: `snake_case`.
- Files: `snake_case.rs`.

## Types

- Use `Result<T, E>` for fallible operations.
- Use `Option<T>` for nullable values.
- Prefer `impl Trait` over concrete types in function signatures where possible.
- Use `#[derive]` macros for common trait implementations.

## Errors

- Define custom error types with `thiserror`.
- Use `anyhow` for application-level error handling.
- Never use `unwrap()` in production code (use in tests and examples).
- Use `?` operator for error propagation.

## Docstrings

- Use `///` for doc comments on public items.
- Include examples in doc comments where non-obvious.
- Use `//!` for module-level documentation.

## Testing

- Use the built-in `#[test]` attribute.
- Test module: `#[cfg(test)] mod tests { ... }`.
- Use `tempfile` crate for filesystem tests.
- Use `assert_eq!`, `assert_ne!`, `assert!` macros.

## Git

- Conventional commits: `feat(module): description`.
- Branch naming: `feat/description`, `fix/description`.
