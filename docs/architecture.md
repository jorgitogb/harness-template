# Architecture

> What "good work" means in this project.

## Structure

- `src/` — Production code. One module per file. Keep files focused.
- `tests/` — Automated tests. One test file per module.
- `specs/` — Per-feature specifications (requirements, design, tasks).
- `progress/` — Session state and history.
- `docs/` — Project documentation.

## Principles

- **State on disk, not in chat.** Agents write results to files. The human reads from disk, never from agent text responses.
- **One feature at a time.** The team focuses on one change. No parallel features in the same session.
- **Specs before code.** The spec-author writes the spec. The human approves it. Then the implementer writes code.
- **Tests are mandatory.** No task is `done` without passing tests.
- **Traceability.** Every test maps to a requirement. Every requirement has at least one test.

## Naming

- Files: `snake_case` for Python, `kebab-case` for Node/TypeScript.
- Functions: `camelCase` for TypeScript, `snake_case` for Python/Go.
- Classes: `PascalCase` everywhere.
- Constants: `UPPER_SNAKE_CASE` everywhere.

## Error handling

- Return error objects, never throw in business logic.
- CLI entry points catch and format errors for humans.
- Log errors to stderr, output to stdout.

## Dependencies

- Minimal. No framework unless the project already uses one.
- No new dependency without a justification in `docs/adr/`.
