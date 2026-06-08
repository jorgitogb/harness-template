# Linear Integration

This project uses Linear for task tracking with the Linear MCP server.

## Setup

1. Go to **Settings > API** in Linear: https://linear.app/settings/api
2. Create a personal API key and copy it.
3. Create a `.env` file in the project root (or copy from `.env.example`):
   ```
   LINEAR_API_KEY=your-key-here
   ```
4. The Linear MCP server is already configured in `opencode.jsonc`. It uses `mcp-remote` to connect to `https://mcp.linear.app/mcp`.

## How agents interact with Linear

- **Read issues:** Agents query Linear via the MCP server to find pending features.
- **Transition status:** Agents use Linear MCP to move issues through `pending` → `in_progress` → `done`.
- **Local mirror:** `feature_list.json` is kept in sync with Linear for local tooling consistency.

## Disk artifacts (always kept)

Even with an external backend, agents always write these files to disk:

| File | Purpose |
|---|---|
| `progress/current.md` | Active session state |
| `progress/history.md` | Append-only log of past sessions |
| `specs/<name>/` | Requirements, design, tasks (SDD artifacts) |
| `feature_list.json` | Local mirror of issue status |
