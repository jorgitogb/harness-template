# Conventions (Python)

> Style, naming, and formatting rules for Python projects.

## Formatting

- Follow PEP 8.
- Use `black` or `ruff format` for auto-formatting.
- Indent with 4 spaces.
- Line length: 88 characters (black default).
- Trailing commas in multi-line collections.

## Naming

- Functions and variables: `snake_case`.
- Classes: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Private members: `_leading_underscore`.
- Modules: `snake_case.py`.

## Type hints

- Required for all public function signatures.
- Use `from __future__ import annotations` for forward references.
- Prefer `str | int` over `Union[str, int]` (Python 3.10+).

## Imports

- Group: stdlib → third-party → local. One blank line between groups.
- Use `from X import Y` over `import X` when using fewer than 3 names.
- No wildcard imports.

## Docstrings

- Google-style docstrings for all public functions and classes.
- One-line docstrings for simple functions.
- Multi-line docstrings with Args, Returns, Raises sections.

## Errors

- Define custom exceptions in `exceptions.py`.
- Raise specific exceptions, never bare `raise`.
- Use `try/except` sparingly; prefer explicit checks.

## Testing

- Use `pytest` as the test runner.
- Test file names: `test_<module>.py`.
- Test function names: `test_<behavior>`.
- Use `tmp_path` fixture for filesystem tests.
- Mock only external services; test real logic.

## Git

- Conventional commits: `feat(module): description`.
- Branch naming: `feat/description`, `fix/description`.
