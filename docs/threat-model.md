# Threat model

This document describes the security surfaces of `harness-init` and the mitigations in place.

## Surface A — Outbound (this repo attacks users)

**Risk:** A malicious contributor injects code into the npm package that runs when a user installs or runs `harness-init`.

**Mitigations:**
- No `postinstall` script. The npm package never runs arbitrary code on install.
- No `eval`, `new Function`, or dynamic `require` anywhere in the codebase.
- Templates are bundled in the npm tarball, never fetched at runtime (no network).
- All dependencies are pinned and locked. CI runs `npm audit --audit-level=high` and `osv-scanner`.
- Publish with `npm publish --provenance` (OIDC-signed, free on npm).

## Surface B — Inbound (malicious user input exploits the installer)

**Risk:** A user crafts input (project name, description, feature list) that exploits path traversal, template injection, or shell injection.

**Mitigations:**
- Path validation: every derived path is `path.join(target, ...)`. Paths containing `..` or absolute paths are rejected.
- Template rendering uses a non-evaluating mustache-style engine. All user-provided strings are string-substituted, never parsed as code.
- No `child_process` of any user-controlled value.
- Refuse to run as `uid 0` unless `--allow-root` is explicitly set.
- Refuse to run in sensitive directories (`/`, `$HOME`, `~/.ssh`, `~/.aws`, `~/.config`) unless `--force` is set.

## Surface C — Lateral (generated init.sh does bad things)

**Risk:** The generated `init.sh` contains commands that damage the user's project.

**Mitigations:**
- The installer **never runs** `init.sh` for the user. It is generated and left for the user to read and run manually.
- `init.sh` contains a clear header: "Read this before running — it runs tests and validates the harness."
- A CI test asserts that generated `init.sh` contains no `curl ... | sh`, `wget ... | bash`, or `eval $()` patterns before writing.
- `init.sh` only runs validation commands (test suites, file existence checks). It never modifies files.

## Surface D — Supply chain (dep hijack)

**Risk:** A dependency (`@clack/prompts`, `diff`, `mustache`) is compromised.

**Mitigations:**
- Minimal runtime dependencies (3 total).
- `package-lock.json` committed and used in CI.
- Dependabot configured for weekly updates.
- CI fails on any `high` or `critical` advisory.
- SBOM generated per release and attached to GitHub releases.

## Audit checklist

This checklist is run before each release:

- [ ] `npm audit --audit-level=high` passes
- [ ] `osv-scanner` reports no high/critical vulnerabilities
- [ ] No `postinstall` scripts in `package.json`
- [ ] No `eval`/`new Function` in source (grep)
- [ ] No network calls in source (grep)
- [ ] `npm publish --provenance` used
- [ ] SBOM attached to GitHub release
- [ ] Adversarial e2e tests pass
