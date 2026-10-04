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
  --models mixed \
  --spec-layer openspec \
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

## Model routing (opencode)

Give each agent role the model that suits it, with fallbacks for when a model disappears.

```sh
npx @jorgegb/harness-init --models mixed      # free | gwdg | mixed | none (default)
npx @jorgegb/harness-init models check        # which model each role would use right now
npx @jorgegb/harness-init models sync         # write the resolved models
```

| Profile | Use it for |
|---|---|
| `free` | OpenCode Zen free models first. Free models may log prompts, so don't use this on confidential code. |
| `gwdg` | GWDG SAIA (academic cloud) only. Use this for confidential code. |
| `mixed` | Zen for planning, specs and docs; GWDG for roles that read or write code. |

The generator writes two files:

- `.opencode/models.json`: the profile you edit. Each role (`build`, `plan`, `small`, plus each selected agent) has an ordered list of candidate models, and the first available one is used.
- `.opencode/opencode.json`: the resolved `agent.<role>.model` and `small_model` values. opencode merges this file over `opencode.jsonc`. `models sync` only changes these keys and leaves the rest of the file alone.

`models check` and `models sync` read the model list from `opencode models --refresh`. For providers listed under `"live"` in the profile, they also query the provider's `/models` endpoint directly (GWDG SAIA: `SAIA_API_KEY`), because `opencode models` only shows the models declared in your config. These two commands are the only part of harness-init that uses the network.

`saia/*` models need a provider named `saia` in your **global** `~/.config/opencode/opencode.json`, with `baseURL` `https://chat-ai.academiccloud.de/v1` and `apiKey` `{env:SAIA_API_KEY}`. Keys never go into the repo.

## Spec layer

`--spec-layer openspec` (the default when `./openspec` exists) keeps specs in [OpenSpec](https://github.com/Fission-AI/OpenSpec) instead of `specs/` + `feature_list.json`. The agents, the human approval gate and TDD stay the same. `docs/specs.md` maps harness concepts to OpenSpec changes, and `init.sh` runs `openspec validate --all`.

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
