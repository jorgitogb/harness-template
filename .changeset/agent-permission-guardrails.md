---
"@jorgegb/harness-init": minor
---

Tighten generated opencode agent permissions. The implementer can no longer edit approved specs (only `tasks.md`) or harness control files (`feature_list.json`, `init.sh`, `ground-rules.md`, `CHECKPOINTS.md`, `AGENTS.md`, `opencode.jsonc`, `.opencode/**`); stack verification commands and read-only git run without asking, other commands ask, and `git push` is denied. The reviewer can run `./init.sh`, test commands and read-only git, and can write only to `progress/`. Agent frontmatter and `opencode.jsonc` are now generated from one source.
