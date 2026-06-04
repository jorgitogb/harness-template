# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x | Yes |
| < 0.1 | No |

## Reporting a vulnerability

If you discover a security vulnerability in `harness-init`, please report it responsibly.

**Email:** me@jorgegb.dev

**What to include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Response timeline:**
- Acknowledgment within 48 hours
- Initial assessment within 7 days
- Fix or mitigation within 90 days

**What NOT to do:**
- Do not open a public GitHub issue for security vulnerabilities
- Do not exploit the vulnerability beyond what's needed to demonstrate it

## Scope

This policy covers the `harness-init` CLI tool and the templates it generates. It does not cover:
- The AI agents or LLMs that consume the generated files
- Third-party dependencies (report those to their respective maintainers)
- Projects that use the generated harness (those are the user's responsibility)

## Security measures

The following measures are in place to protect users:

- **No postinstall scripts** — the npm package never runs arbitrary code on install
- **No network requests** — the installer works fully offline
- **No eval/dynamic code execution** — templates are rendered via string substitution, not code evaluation
- **Path validation** — all output paths are validated against traversal attacks
- **Dependency auditing** — CI runs `npm audit --audit-level=high` and `osv-scanner` on every push
- **Provenance signing** — npm publish uses OIDC provenance for supply chain integrity
- **Minimal dependencies** — only `@clack/prompts`, `diff`, and `mustache` are used at runtime

## Threat model

See [docs/threat-model.md](docs/threat-model.md) for the full four-surface threat model.

## Acknowledgments

Thanks to the open source community for establishing responsible disclosure practices.
