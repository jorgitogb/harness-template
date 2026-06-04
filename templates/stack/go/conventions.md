# Conventions (Go)

> Style, naming, and formatting rules for Go projects.

## Formatting

- Use `gofmt` or `goimports` for auto-formatting.
- Tabs for indentation (enforced by `gofmt`).
- Line length: no hard limit, but keep under 100 characters where possible.

## Naming

- Unexported: `camelCase`.
- Exported: `PascalCase`.
- Interfaces: `PascalCase` with `-er` suffix where possible (e.g., `Reader`, `Writer`).
- Files: `snake_case.go`.
- Packages: short, lowercase, single-word.

## Types

- Prefer structs over interfaces for concrete types.
- Define interfaces where they are consumed, not where they are implemented.
- Use `error` as the last return value for fallible functions.

## Errors

- Return errors, never panic (except in `init()` or truly unrecoverable cases).
- Use `fmt.Errorf` with `%w` for wrapping.
- Check errors immediately after the call.
- Define sentinel errors with `var ErrXxx = errors.New("...")`.

## Docstrings

- Package-level `doc.go` or comment above `package` declaration.
- Exported functions and types have a comment starting with the name.
- Unexported functions: comment only if the purpose is non-obvious.

## Testing

- Use the standard `testing` package.
- Test file names: `<module>_test.go`.
- Test function names: `TestXxx(t *testing.T)`.
- Use `t.TempDir()` for filesystem tests.
- Use `t.Helper()` in test helper functions.

## Git

- Conventional commits: `feat(package): description`.
- Branch naming: `feat/description`, `fix/description`.
