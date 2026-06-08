import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { Stack, Cli, Framework } from "./detect.js";
import type { RenderVars } from "./render.js";
import { renderTemplate, getStackVars, loadTemplate } from "./render.js";

export type TaskBackend = "json" | "linear" | "notion";

export interface Answers {
  cli: Cli;
  stack: Stack;
  framework: Framework;
  taskBackend: TaskBackend;
  sdd: boolean;
  tdd: boolean;
  bestPractices: boolean;
  agents: string[];
  specNotation: string;
  rules: string[];
  projectName: string;
  projectDescription: string;
  seedDemo: boolean;
  initialCommit: boolean;
  force: boolean;
  learningMode: boolean;
  linearProjectId: string;
  notionDatabaseId: string;
  notionApiKey: string;
}

export interface FileAction {
  path: string;
  content: string;
  exists: "create" | "overwrite" | "skip";
  mode: "normal" | "append";
}

const SHARED_AGENTS = ["leader", "spec-author", "implementer", "reviewer"];
const EXTRA_AGENTS = ["security-auditor", "doc-writer", "perf-analyzer"];

function displayStack(stack: Stack): string {
  const labels: Record<Stack, string> = {
    python: "Python",
    node: "Node.js",
    go: "Go",
    rust: "Rust",
    generic: "Generic",
  };
  return labels[stack];
}

function displayFramework(framework: Framework): string {
  const labels: Record<Framework, string> = {
    astro: " / Astro",
    react: " / React",
    next: " / Next.js",
    fastapi: " / FastAPI",
    django: " / Django",
    flask: " / Flask",
    none: "",
  };
  return labels[framework];
}

function buildRenderVars(answers: Answers): RenderVars {
  const stackVars = getStackVars(answers.stack, answers.framework);
  const demoEntry = JSON.stringify({
    name: "hello_harness",
    description: "A starter feature that validates the SDD pipeline works end-to-end",
    sdd: true,
    status: "pending",
  }, null, 2);
  const taskBackendNotes: Record<TaskBackend, string> = {
    json: "Source of truth: local feature_list.json",
    linear: "Source of truth: Linear. Sync changes to feature_list.json",
    notion: "Source of truth: Notion. Sync changes to feature_list.json",
  };
  const mcpServers: Record<TaskBackend, string> = {
    json: "",
    linear:
      ',\n  "mcpServers": {\n    "linear": {\n      "command": "npx",\n      "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]\n    }\n  }',
    notion:
      ',\n  "mcpServers": {\n    "notion": {\n      "command": "npx",\n      "args": ["-y", "mcp-remote", "https://mcp.notion.com/mcp"]\n    }\n  }',
  };
  const backendWorkflow: Record<TaskBackend, string> = {
    json: "The leader detects the first `pending` feature with `\"sdd\": true`.",
    linear: "The leader queries Linear via Linear MCP for the first issue with status `pending` and `\"sdd\": true`.",
    notion: "The leader checks Notion for the first pending feature with `\"sdd\": true`.",
  };
  const backendClose: Record<TaskBackend, string> = {
    json: "If the task is finished: mark `status: \"done\"` in `feature_list.json`.",
    linear: "If the task is finished: transition the issue to `Done` via Linear MCP, then update `feature_list.json`.",
    notion: "If the task is finished: mark the task as done in Notion, then update `feature_list.json`.",
  };
  const agentBackendNotes: Record<TaskBackend, string> = {
    json: "",
    linear: `## Backend: Linear

This project uses Linear for task tracking. The local \`feature_list.json\` is a synced mirror.

- Use Linear MCP to read and transition issue status.
- After every Linear change, update \`feature_list.json\` to keep local tooling consistent.
- Set \`LINEAR_API_KEY\` in your environment (see \`docs/linear.md\`).
- Project ID: \`${answers.linearProjectId || "SET_IN_ENV"}\` — verify it exists via \`list_projects\` before creating issues.

## Backend verification (run before creating issues)

1. Check \`LINEAR_PROJECT_ID\` is set in \`.env\`
2. Call \`list_projects\` via Linear MCP → verify the project ID exists
3. If missing: STOP and ask human to create project in Linear UI + update \`.env\`
`,
    notion: `## Backend: Notion

This project uses Notion for task tracking. The local \`feature_list.json\` is a synced mirror.

- Check Notion for issue status.
- Update status in Notion after changes.
- Keep \`feature_list.json\` in sync for local tooling.
- Set \`NOTION_API_KEY\` in your environment (see \`docs/notion.md\`).
- Issues Database ID: \`${answers.notionDatabaseId || "SET_IN_ENV"}\` — verify it exists via \`retrieve_database\` before creating issues.

## Backend verification (run before creating issues)

1. Check \`NOTION_API_KEY\` and \`NOTION_ISSUES_DATABASE_ID\` are set in \`.env\`
2. Call \`retrieve_database\` via Notion MCP with the database ID → verify it exists
3. Verify database has required properties: Title, Status, Priority, Assignee, Labels, SDD
4. If missing: STOP and ask human to create database in Notion + share with integration + update \`.env\`
`,
  };
  return {
    PROJECT_NAME: answers.projectName,
    PROJECT_DESCRIPTION: answers.projectDescription,
    STACK_DISPLAY: displayStack(answers.stack),
    FRAMEWORK_DISPLAY: displayFramework(answers.framework),
    DEMO_FEATURE: answers.seedDemo ? demoEntry : "",
    TASK_BACKEND_NOTE: taskBackendNotes[answers.taskBackend],
    MCP_SERVERS: mcpServers[answers.taskBackend],
    BACKEND_WORKFLOW: backendWorkflow[answers.taskBackend],
    BACKEND_CLOSE: backendClose[answers.taskBackend],
    AGENT_BACKEND_NOTES: agentBackendNotes[answers.taskBackend],
    LINEAR_PROJECT_ID: answers.linearProjectId,
    NOTION_DATABASE_ID: answers.notionDatabaseId,
    NOTION_API_KEY: answers.notionApiKey,
    ...stackVars,
  };
}

function shouldIncludeAgent(agentName: string, selectedAgents: string[]): boolean {
  return selectedAgents.includes(agentName);
}

export function buildPlan(answers: Answers, cwd: string): FileAction[] {
  const vars = buildRenderVars(answers);
  const files: FileAction[] = [];

  const exists = (p: string) => existsSync(join(cwd, p));
  const resolve = (relative: string) => relative;

  const action = (path: string, content: string, mode: "normal" | "append" = "normal"): FileAction => {
    const alreadyExists = exists(path);
    return {
      path,
      content,
      exists: alreadyExists ? (answers.force ? "overwrite" : "skip") : "create",
      mode,
    };
  };

  // --- Shared harness files ---
  files.push(action(resolve("AGENTS.md"), renderTemplate("shared/AGENTS.md.tmpl", vars)));
  files.push(action(resolve("CHECKPOINTS.md"), renderTemplate("shared/CHECKPOINTS.md.tmpl", vars)));
  files.push(action(resolve("init.sh"), renderTemplate("shared/init.sh.tmpl", vars)));
  files.push(action(resolve("feature_list.json"), renderTemplate("shared/feature_list.json.tmpl", vars)));
  files.push(action(resolve("progress/current.md"), renderTemplate("shared/progress/current.md.tmpl", vars)));
  files.push(action(resolve("progress/history.md"), renderTemplate("shared/progress/history.md.tmpl", vars)));

  // --- Ground rules ---
  if (answers.bestPractices) {
    files.push(action(resolve("ground-rules.md"), renderTemplate("shared/ground-rules.md.tmpl", vars)));
  }

  // --- Specs placeholder ---
  files.push(action(resolve("specs/.gitkeep"), loadTemplate("shared/specs/.gitkeep")));

  // --- Demo feature ---
  if (answers.seedDemo) {
    const name = "hello_harness";
    files.push(action(resolve(`specs/${name}/requirements.md`), renderTemplate(`shared/demo/${name}/requirements.md.tmpl`, vars)));
    files.push(action(resolve(`specs/${name}/design.md`), renderTemplate(`shared/demo/${name}/design.md.tmpl`, vars)));
    files.push(action(resolve(`specs/${name}/tasks.md`), renderTemplate(`shared/demo/${name}/tasks.md.tmpl`, vars)));
  }

  // --- Docs ---
  files.push(action(resolve("docs/architecture.md"), renderTemplate("shared/docs/architecture.md.tmpl", vars)));
  files.push(action(resolve("docs/conventions.md"), renderTemplate("shared/docs/conventions.md.tmpl", vars)));

  if (answers.sdd) {
    files.push(action(resolve("docs/specs.md"), renderTemplate("shared/docs/specs.md.tmpl", vars)));
  }
  if (answers.tdd) {
    files.push(action(resolve("docs/tdd.md"), renderTemplate("shared/docs/tdd.md.tmpl", vars)));
  }
  files.push(action(resolve("docs/verification.md"), renderTemplate("shared/docs/verification.md.tmpl", vars)));

  // --- Learning mode ---
  if (answers.learningMode) {
    files.push(action(resolve("docs/learning.md"), renderTemplate("shared/docs/learning.md.tmpl", vars)));
  }

  // --- Agents ---
  for (const agent of SHARED_AGENTS) {
    if (shouldIncludeAgent(agent, answers.agents)) {
      files.push(action(resolve(`.opencode/agent/${agent}.md`), renderTemplate(`shared/agents/${agent}.md`, vars)));
    }
  }
  for (const agent of EXTRA_AGENTS) {
    if (shouldIncludeAgent(agent, answers.agents)) {
      files.push(action(resolve(`.opencode/agent/${agent}.md`), renderTemplate(`shared/agents/extras/${agent}.md`, vars)));
    }
  }

  // --- Backend-specific files ---
  if (answers.taskBackend !== "json") {
    files.push(action(resolve(".env.example"), renderTemplate("shared/.env.example.tmpl", vars)));
  }
  if (answers.taskBackend === "linear") {
    files.push(action(resolve("docs/linear.md"), renderTemplate("shared/docs/linear.md.tmpl", vars)));
  }
  if (answers.taskBackend === "notion") {
    files.push(action(resolve("docs/notion.md"), renderTemplate("shared/docs/notion.md.tmpl", vars)));
  }

  // --- OpenCode adapter ---
  if (answers.cli === "opencode") {
    files.push(action(resolve("opencode.jsonc"), renderTemplate("opencode/opencode.jsonc.tmpl", vars)));
    files.push(action(resolve("AGENTS.md"), loadTemplate("opencode/AGENTS.md.append.tmpl"), "append"));
  }

  // --- Stack-specific ---
  let stackGitignore = loadTemplate(`stack/${answers.stack}/.gitignore.txt`);
  if (answers.framework !== "none") {
    try {
      const fwGitignore = loadTemplate(`stack/${answers.stack}/${answers.framework}/.gitignore.txt`);
      stackGitignore = stackGitignore + "\n" + fwGitignore;
    } catch {
      // framework .gitignore is optional
    }
  }
  const gitignoreContent = exists(".gitignore")
    ? mergeGitignore(readFileSync(join(cwd, ".gitignore"), "utf-8"), stackGitignore)
    : stackGitignore;
  files.push(action(resolve(".gitignore"), gitignoreContent));

  return files;
}

function mergeGitignore(existing: string, additions: string): string {
  const existingLines = new Set(existing.split("\n").map((l) => l.trim()).filter(Boolean));
  const newLines = additions.split("\n").map((l) => l.trim()).filter(Boolean);
  const merged = [...existingLines];
  for (const line of newLines) {
    if (!existingLines.has(line)) {
      merged.push(line);
    }
  }
  return merged.join("\n") + "\n";
}
