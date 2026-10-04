---
"@jorgegb/harness-init": minor
---

`init.sh` now checks requirement ↔ test traceability mechanically. Tests tag requirements as `<feature>/R<n>` (in the test name or a comment). A `done` feature fails if any requirement in its `requirements.md` has no tagged test, and any feature fails if a tag points to a requirement that does not exist; untested requirements on an `in_progress` feature are warnings. Agent prompts, TDD and verification docs, and CHECKPOINTS describe the tag format.
