---
"@jorgegb/harness-init": minor
---

Add a file-based human approval gate. `npx @jorgegb/harness-init approve <feature>` writes `specs/<feature>/APPROVED` with a SHA-256 of the spec (task checkboxes ignored), the approver and a timestamp. The generated `init.sh` fails for `in_progress`/`done` features with no approval or a spec that changed after approval. Agents are denied writing `APPROVED` and running the approve command, and the leader now waits for the file instead of a chat message.
