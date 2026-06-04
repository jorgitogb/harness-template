# harness-init

A single command that bootstraps a Spec-Driven + Test-Driven AI dev workspace on top of any project.

```sh
npx @jorgegb/harness-init
```

---

## What it does

- Detects your tech stack (Node, Python, Go, Rust, or generic)
- Works on new **or** existing projects
- Writes all harness files to disk (JSON, Markdown, Bash — never binary)
- Generates opencode agents (leader, spec-author, implementer, reviewer)
- Optionally adds TDD discipline, ground rules, and a starter feature list
- Asks before overwriting anything — never silently destructive

---

## Features

- **Spec-Driven Development (SDD)** — requirements (EARS notation) → design → tasks → code. Human approval required between spec and implementation.
- **Test-Driven Development (TDD)** — implementer follows red-green-refactor for every task. Reviewer checks traceability from requirement to test.
- **Agent roster** — 4 default roles (leader, spec-author, implementer, reviewer), 3 optional extras (security-auditor, doc-writer, perf-analyzer), fully customizable.
- **Ground rules** — pre-selected defaults like "one feature at a time" and "no done without green tests", compiled into agent permissions.
- **Human in the loop** — immutable gate: no spec → code transition without explicit human approval.
- **Stack-aware** — generates correct `init.sh` checks, `.gitignore` entries, and conventions for your language.

---

## Quick start

```sh
# New project
mkdir my-project && cd my-project
npx @jorgegb/harness-init

# Existing project
cd existing-repo
npx @jorgegb/harness-init
```

Follow the interactive prompts. The installer detects your stack, asks what you want enabled, and writes all files.

---

## Non-interactive mode

```sh
npx @jorgegb/harness-init \
  --cli opencode \
  --stack node \
  --sdd --tdd --best-practices \
  --agents leader,spec-author,implementer,reviewer \
  --rules default \
  --name my-cool-project \
  --yes
```

---

## What gets generated

```
your-project/
├── AGENTS.md              # Entry point for AI agents
├── CHECKPOINTS.md         # Objective evaluation criteria
├── feature_list.json      # Task list (pending → spec_ready → in_progress → done)
├── init.sh                # Environment verification script
├── ground-rules.md        # Selected ground rules
├── specs/                 # Per-feature specs (EARS requirements + design + tasks)
├── progress/
│   ├── current.md         # Live session state
│   └── history.md         # Append-only session log
├── docs/
│   ├── architecture.md    # What "good" means in this project
│   ├── conventions.md     # Style and naming rules
│   ├── specs.md           # SDD protocol
│   ├── tdd.md             # TDD protocol
│   └── verification.md    # How to prove your work
├── .opencode/
│   └── agent/
│       ├── leader.md
│       ├── spec-author.md
│       ├── implementer.md
│       └── reviewer.md
└── opencode.jsonc
```

---

## How it works

1. The installer runs `./init.sh` logic checks against your environment
2. AI agents read `AGENTS.md` as their entry point
3. The leader orchestrates: decomposes tasks, launches sub-agents
4. The spec-author writes requirements in EARS notation
5. **You review and approve the spec** — this gate cannot be skipped
6. The implementer writes code and tests (red-green-refactor)
7. The reviewer checks traceability and completeness
8. You run `./init.sh` again to verify everything is green

---

## Security

This project takes security seriously. The installer runs fully offline (no network requests), never executes `postinstall` scripts, and writes no files outside the target directory.

See [SECURITY.md](SECURITY.md) for the full threat model and how to report vulnerabilities.

---

## License

MIT

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Acknowledgments

Built on the principles from [harness-sdd](https://github.com/betta-tech/harness-sdd) by betta-tech.
