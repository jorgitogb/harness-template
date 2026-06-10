# @jorgegb/harness-init

## 0.5.2

### Patch Changes

- Fix double prompt for AGENTS.md when re-running harness-init

  When AGENTS.md already existed, the append action triggered a second conflict prompt
  because both the normal write and the append were marked as `exists: "skip"`.
  Append actions now always get `exists: "create"` so they proceed without prompting.

## 0.5.1

### Patch Changes

- Fix Linear integration — agents now use Linear MCP for task tracking instead of ignoring it

  When task-backend=linear was selected, agent templates (leader.md, spec-author.md) had hardcoded feature_list.json references in their main workflow instructions, causing agents to ignore Linear entirely. Added backend-aware template variables (BACKEND_STARTUP_READ, BACKEND_FEATURE_SOURCE, BACKEND_TRANSITION_INPROGRESS, BACKEND_SPEC_READY) so agents query Linear MCP for pending issues and transition status via Linear.

## 0.5.0

### Minor Changes

- feat: add Linear project ID and Notion database support with MCP integration and backend verification

  - Add Linear Project ID prompt and --linear-project-id CLI flag
  - Add Notion Database ID + API Key prompts and --notion-database-id/--notion-api-key CLI flags
  - Add Notion MCP server config (mcp-remote https://mcp.notion.com/mcp)
  - Add notion.md.tmpl documentation with setup guide
  - Update .env.example.tmpl with LINEAR_PROJECT_ID, NOTION_API_KEY, NOTION_ISSUES_DATABASE_ID
  - Add backend verification steps to agent templates
  - Agents now verify project/database exists before creating issues

## 0.4.0

### Minor Changes

- feat: add stack/framework identity to AGENTS.md and conflict prompt on re-init

  feat: make task backend (json/linear/notion) drive AGENTS.md workflow and agent templates

## 0.3.1

### Patch Changes

- [`3e8f260`](https://github.com/jorgitogb/harness-template/commit/3e8f260594dc3ae16af62d25f6c562bb50cc4c23) Thanks [@jorgitogb](https://github.com/jorgitogb)! - Switch Python init checks from pip to uv, Node init checks from npm/npx to pnpm

## 0.3.0

### Minor Changes

- Add --task-backend CLI option (json|linear|notion) with AGENTS.md note

  Fix agent and ground-rules multiselect defaults (use initialValues instead of per-option initial)

  Add Context7 + Engram recommended tools to opencode AGENTS.md appendix

  Add end-of-run CTA: review files + contribution link

  Implement --seed-demo (hello_harness demo feature)

## 0.2.3

### Patch Changes

- fix: set execute permission on init.sh after writing

  Generated init.sh was missing +x permission, causing
  "permission denied: ./init.sh" on Unix systems.

## 0.2.2

### Patch Changes

- fix: include stack .gitignore templates in npm package

  npm automatically excludes all .gitignore files from published packages.
  Renamed stack template .gitignore files to .gitignore.txt so they are
  included in the tarball, and updated loadTemplate calls accordingly.

## 0.2.1

### Patch Changes

- [`5f7cbc7`](https://github.com/jorgitogb/harness-template/commit/5f7cbc79f2f2415475b91fee2cb9eac6d0f2c37c) Thanks [@jorgitogb](https://github.com/jorgitogb)! - Fix repository URL in package.json to point to correct GitHub org (jorgitogb).

## 0.2.0

### Minor Changes

- [`2292113`](https://github.com/jorgitogb/harness-template/commit/2292113948b3242f10e87b307ac880567682dc88) Thanks [@jorgitogb](https://github.com/jorgitogb)! - Initial release of harness-init CLI with opencode adapter, SDD/TDD support, learning mode, and stack detection for Python, Node, Go, Rust, and generic projects.
