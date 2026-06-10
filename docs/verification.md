# Verification

> How to prove that your work is correct and complete.

## Before you declare done

1. Run `./init.sh`. All blocks must be `[OK]`. If any `[FAIL]`, fix before proceeding.
2. Check `CHECKPOINTS.md` C1–C7. Every box must be checked.
3. Verify traceability: every `R<n>` in your spec maps to at least one test.

## Verification steps

### For the implementer

- Run the full test suite: `if [ -f "package.json" ]; then
  if pnpm test 2>&1; then
    ok "All tests pass"
  else
    fail "Some tests failed"
    EXIT_CODE=1
  fi
else
  warn "No package.json — skipping tests"
fi`
- Verify every task in `tasks.md` is marked `[x]`.
- Document the traceability map in `progress/impl_<feature>.md`.

### For the reviewer

- Walk through `CHECKPOINTS.md` C1–C7.
- Verify every `R<n>` in `requirements.md` has a matching test.
- Verify every test in `tests/` maps to an `R<n>`.
- Verify all tasks in `tasks.md` are checked.
- Write the review report to `progress/review_<feature>.md`.

### For the human

- Read the spec in `specs/<feature>/`.
- Read the review report in `progress/review_<feature>.md`.
- Run `./init.sh` yourself.
- If satisfied, mark the feature as `done` in `feature_list.json`.

## What "done" means

- All tests pass.
- All tasks are checked.
- All requirements have traceability.
- The reviewer has approved.
- The human has verified.
- `progress/current.md` is clean.
- `progress/history.md` has the session summary.
