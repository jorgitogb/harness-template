# AGENTS.md — Navigation map for AI agents

> This file is the entry point for any agent working in this repository.
> It is NOT a rule bible — it is a map. Read only what you need when you need it.

---

## Project identity

- **Name:** @jorgegb/harness-init
- **Stack:** Node.jsundefined

---

## 1. Before you start (mandatory)

1. Run `./init.sh` and verify it ends without errors. If it fails, stop and fix the environment before touching code.
2. Read `progress/current.md` to understand the state from the last session.
3. Read `feature_list.json`. Every new feature with `"sdd": true` goes through Spec-Driven Development — see `docs/specs.md` and section 4 of this file.
4. Read `docs/specs.md` before touching any spec or feature with `sdd: true`.

## 2. Repository map

- `feature_list.json` — Task list by status. Source of truth: Linear. Sync changes to feature_list.json. Always read first.
- `progress/current.md` — Active session state. Always read first.
- `progress/history.md` — Append-only log of past sessions. Read for historical context.
- `specs/<feature>/` — `requirements.md` + `design.md` + `tasks.md`. Read before implementing any `sdd: true` feature.
- `docs/architecture.md` — What "good work" means in this project. Read before implementing.
- `docs/conventions.md` — Style, naming, error handling rules. Read before writing code.
- `docs/specs.md` — SDD protocol: EARS notation, the 3 files, human approval gate. Read before drafting or reviewing specs.
- `docs/tdd.md` — TDD protocol: red-green-refactor, how tests relate to specs.
- `docs/verification.md` — How to verify your work. Read before marking a task `done`.
- `ground-rules.md` — Non-negotiable rules for this project.
- `CHECKPOINTS.md` — Objective criteria for "correct final state".
- `.opencode/agent/` — Agent definitions (leader, spec-author, implementer, reviewer).
- `src/` — Application code.
- `tests/` — Automated tests.

## 3. Hard rules (non-negotiable)

- **One feature at a time.** Do not mix changes from multiple tasks in the same session.
- **Never mark a task `done` without green tests.** Run `./init.sh` and verify the test block passes 100%.
- **Never skip the spec phase.** Every feature with `"sdd": true` must pass through `spec_author` and get human approval before touching code.
- **Never skip the human approval gate.** The leader stops the flow at `spec_ready` and waits.
- **Document your work** in `progress/current.md` as you go, not at the end.
- **Leave the repository clean** before closing the session (see section 5).
- **If you don't know something, check `docs/`** before inventing an answer.

## 4. Workflow (SDD)

```
pending → [spec_author] → spec_ready → HUMAN → in_progress → [implementer → reviewer] → done
```

1. The leader queries Linear via Linear MCP for the first issue with status `pending` and `"sdd": true`.
2. The leader launches `spec_author`, which creates `specs/<name>/{requirements,design,tasks}.md` and marks status as `spec_ready`.
3. **Pause.** The human reviews the spec in `specs/<name>/` and approves (or asks for changes).
4. Once approved, the leader transitions the feature to `in_progress` (in the backend) and launches `implementer`.
5. The implementer executes `tasks.md` one by one, marking them `[x]`.
6. The reviewer verifies `R<n>` ↔ test traceability and complete tasks; approves or rejects.
7. If approved, the feature is marked `done` and the summary moves to `progress/history.md`.

## 5. Session close (lifecycle)

Before ending:

1. Run `./init.sh` — all green.
2. If the task is finished: transition the issue to `Done` via Linear MCP, then update `feature_list.json`.
3. Move the summary from `progress/current.md` to the end of `progress/history.md`.
4. Empty `progress/current.md`, leaving only the template.
5. No temporary files, no debug `print()`, no TODOs without context.

## 6. If you get stuck

- Re-read the relevant section in `docs/`.
- If the tool does not do what you expect, do NOT invent a workaround: document the blocker in `progress/current.md` and stop the session.

# OpenCode instructions

> This file is appended to the generated `AGENTS.md` when the target CLI is opencode.

---

## OpenCode-specific notes

- Agent definitions live in `.opencode/agent/`. Each agent has a `.md` file with YAML frontmatter.
- The `opencode.jsonc` in the project root declares all agents with their permissions.
- Use `@leader`, `@spec-author`, `@implementer`, `@reviewer` to invoke agents directly.
- The `build` agent is the default primary agent. Switch to `plan` for read-only analysis.
- Agent permissions are enforced by opencode. The leader cannot edit `src/` or `tests/`.
- Use `Tab` to cycle between primary agents during a session.
- Use `session_child_first` / `session_child_cycle` / `session_parent` to navigate between parent and child sessions.

## Session management

- `/wrap` — End session. Writes note: what was done, current progress. Closes child sessions.
- `/resume` — Resume project from a previous session. Restores context from saved summary.

## Recommended tools

- **Context7** — Fetch live library/framework docs.
  Add to `opencode.jsonc`: `"mcp": { "context7": { "type": "local", "command": ["npx", "@opencontext7/mcp-server"] } }`
- **Engram** — Persistent memory across sessions. Built into opencode.
