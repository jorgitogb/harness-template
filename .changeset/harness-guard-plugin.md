---
"@jorgegb/harness-init": minor
---

Generate an opencode `harness-guard` plugin (`.opencode/plugins/harness-guard.js`) when SDD is on with the harness spec layer. It blocks edits to project code unless the `in_progress` feature's spec is approved and unchanged (or the feature has `"sdd": false`), blocks writing `APPROVED` or running `harness-init approve` through any tool including bash, and runs `./init.sh` when a session that edited code goes idle. On failure it asks a top-level agent to fix it, at most twice, and sub-agents get a toast. Start opencode with `HARNESS_GUARD=off` to bypass it.
