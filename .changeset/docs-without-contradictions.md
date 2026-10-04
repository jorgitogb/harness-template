---
"@jorgegb/harness-init": patch
---

Generated docs no longer contradict themselves. Language-specific rules (naming, quotes, error style, imports) now live only in the stack and framework conventions, which nest under their own headings in `docs/conventions.md`; Git, comment and test-tag rules appear once, project-wide. `architecture.md` no longer says "never throw", which contradicted the Python, Rust and FastAPI conventions, and `tdd.md` defers test naming to the conventions. A new test renders every option combination and fails on unrendered placeholders, `undefined`, or duplicate sections.
