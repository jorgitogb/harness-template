# Spec-Driven Development (SDD)

> This project follows a Kiro-style flow: requirements → design → tasks → code.
> Code is not written until the spec is approved by a human.

## Structure

Every new feature with `"sdd": true` in `feature_list.json` gets its own directory as soon as it leaves `pending`:

```
specs/<feature-name>/
├── requirements.md   # WHAT is needed (EARS notation)
├── design.md         # HOW it will be built (technical decisions)
└── tasks.md          # STEPS to implement (executable checklist)
```

The `<feature-name>` matches the `name` field in `feature_list.json`.

## Feature states

| State | Meaning |
|-------|---------|
| `pending` | No spec yet. The spec-author is the first to act. |
| `spec_ready` | Spec drafted. Waiting for human approval. Do NOT touch code. |
| `in_progress` | Spec approved. Implementer working. |
| `done` | Code green, reviewer approved, session closed. |
| `blocked` | Stuck. Reason documented in `progress/current.md`. |

## The human approval gate

The automated flow stops once: when the spec-author finishes its three files, marks the feature `spec_ready`, and stops. The human reads `specs/<feature>/` and says "approved" (or asks for changes).

Only then does the leader transition `spec_ready → in_progress` and launch the implementer.

```
pending → [spec_author] → spec_ready → HUMAN → in_progress → [implementer → reviewer] → done
```

## requirements.md — EARS notation

Requirements use **EARS** (Easy Approach to Requirements Syntax). Each requirement is a numbered paragraph using one of five patterns:

| Pattern | Template |
|---------|----------|
| **Ubiquitous** | `The system MUST <action>.` |
| **Event** | `WHEN <trigger>, the system MUST <action>.` |
| **State** | `WHILE <state>, the system MUST <action>.` |
| **Optional** | `WHERE <feature>, the system MUST <action>.` |
| **Undesired** | `IF <undesired event> THEN the system MUST <action>.` |

Rules:
- Every requirement has a stable ID: `R1`, `R2`, ...
- Every requirement MUST be verifiable by at least one concrete test.
- Do not mix multiple `MUST` in one requirement. Split them.
- No soft verbs ("should", "could", "supports"). Only `MUST` / `MUST NOT`.

Example:

```
## R1
WHEN the user runs `python -m src.cli recent`, the system MUST
print up to 5 notes sorted by `created_at` descending.

## R2
IF the flag `--limit` receives a value <= 0 THEN the system MUST
print an error message to stderr and exit with code != 0.
```

## design.md — Technical decisions

Captured before touching code:

- What files are created or modified.
- What new signatures appear (functions, classes, commands).
- What exceptions are reused or added.
- What alternative was rejected and why (at least one).

Do not reinvent from first principles. Reference `docs/architecture.md` and `docs/conventions.md`.

## tasks.md — Executable checklist

Discrete steps in order, each with a checkbox. Each task references at least one `R<n>`:

```
- [ ] T1 — Add `cmd_recent` in `src/cli.py`. Covers: R1, R3.
- [ ] T2 — Register subparser `recent` with flag `--limit`. Covers: R1, R2.
- [ ] T3 — Add `test_recent_default_limit` in `tests/test_cli.py`. Covers: R1.
- [ ] T4 — Add `test_recent_invalid_limit` in `tests/test_cli.py`. Covers: R2.
```

The implementer marks `[x]` on each task as it completes. The reviewer rejects if any `[ ]` remain without documented justification.

## Traceability (hard rule)

- Every test in `tests/` must map to an `R<n>` in its spec.
- Every `R<n>` must have at least one concrete test.
- The reviewer checks this correspondence explicitly and rejects if missing.

The implementer documents the mapping in `progress/impl_<name>.md`:

```
## Traceability
- R1 → `test_recent_default_limit`
- R2 → `test_recent_invalid_limit`
- R3 → `test_recent_custom_limit`
```

## When SDD does NOT apply

Features with `"sdd": false` or without the `sdd` field do not have a spec. SDD only applies going forward.
