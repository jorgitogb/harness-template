---
"@jorgegb/harness-init": minor
---

Add `--rigor light|standard|strict` (default `standard`, also asked in the wizard). `light` turns gate failures in `init.sh` (missing or stale approval, untraced requirements) into warnings, skips the guard plugin, and lets the leader proceed on a chat approval. `strict` ignores `HARNESS_GUARD=off` and lets the implementer and leader run only verification commands. The level is recorded in `AGENTS.md` and exported as `HARNESS_RIGOR` by `init.sh`.
