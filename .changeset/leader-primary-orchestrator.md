---
"@jorgegb/harness-init": patch
---

Make the opencode `leader` a primary agent and the default agent, with a `task` allowlist (selected harness sub-agents plus `explore`) so it can actually launch sub-agents. Falls back to `build` as default when the leader is not selected.
