import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { Stack, Cli, Framework } from "./detect.js";
import type { RenderVars } from "./render.js";
import { renderTemplate, getStackVars, loadTemplate } from "./render.js";
import { agentPermissions, permissionYaml } from "./permissions.js";
import {
  type ModelProfileName,
  loadProfileTemplate,
  selectRoles,
  preferredResolutions,
  renderRoutingConfig,
  PROFILE_PATH,
  ROUTING_PATH,
} from "./models.js";

export type TaskBackend = "json" | "linear" | "notion";
export type SpecLayer = "harness" | "openspec";

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
  /** Per-role model routing profile. Defaults to "none" (inherit the user's global model). */
  models?: ModelProfileName;
  /** Where specs live. Defaults to "harness" (specs/ + feature_list.json). */
  specLayer?: SpecLayer;
}

export interface FileAction {
  path: string;
  content: string;
  exists: "create" | "overwrite" | "skip";
  mode: "normal" | "append";
}

const SHARED_AGENTS = ["leader", "spec-author", "implementer", "reviewer"];
const EXTRA_AGENTS = ["security-auditor", "doc-writer", "perf-analyzer"];

interface AgentMeta {
  name: string;
  description: string;
  mode: "primary" | "subagent";
}

const ALL_AGENT_META: AgentMeta[] = [
  {
    name: "leader",
    description: "Orchestrator. Decomposes tasks and launches sub-agents. NEVER writes code.",
    mode: "primary",
  },
  {
    name: "spec-author",
    description: "Writes specifications: requirements (EARS), design, and tasks.",
    mode: "subagent",
  },
  {
    name: "implementer",
    description: "Writes code and tests following red-green-refactor.",
    mode: "subagent",
  },
  {
    name: "reviewer",
    description: "Validates traceability and task completion. Produces review reports.",
    mode: "subagent",
  },
  {
    name: "security-auditor",
    description: "Performs security audits and identifies vulnerabilities.",
    mode: "subagent",
  },
  {
    name: "doc-writer",
    description: "Writes and maintains project documentation.",
    mode: "subagent",
  },
  {
    name: "perf-analyzer",
    description: "Analyzes performance implications and suggests optimizations.",
    mode: "subagent",
  },
];

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
      ',\n  "mcp": {\n    "linear": {\n      "type": "local",\n      "command": ["npx", "-y", "mcp-remote", "https://mcp.linear.app/mcp"],\n      "environment": {\n        "LINEAR_API_KEY": "${LINEAR_API_KEY}"\n      }\n    }\n  }',
    notion:
      ',\n  "mcp": {\n    "notion": {\n      "type": "local",\n      "command": ["npx", "-y", "mcp-remote", "https://mcp.notion.com/mcp"]\n    }\n  }',
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
  const backendStartupRead: Record<TaskBackend, string> = {
    json: "Read `feature_list.json` and `progress/current.md`.",
    linear: "Read `feature_list.json` (local mirror) and `progress/current.md`. Then query Linear via Linear MCP for the first `pending` issue with `\"sdd\": true`.",
    notion: "Read `feature_list.json` (local mirror) and `progress/current.md`. Then check Notion for the first `pending` feature with `\"sdd\": true`.",
  };
  const backendFeatureSource: Record<TaskBackend, string> = {
    json: "Look at the status of the first non-done / non-blocked feature in `feature_list.json`.",
    linear: "Query Linear via Linear MCP for the first `pending` issue with `\"sdd\": true` (then sync status to `feature_list.json` as local mirror).",
    notion: "Check Notion for the first `pending` feature with `\"sdd\": true` (then sync status to `feature_list.json` as local mirror).",
  };
  const backendTransitionInProgress: Record<TaskBackend, string> = {
    json: "Change the status to `in_progress` in `feature_list.json`.",
    linear: "Transition the Linear issue to `In Progress` via Linear MCP, then update `feature_list.json` to match.",
    notion: "Update the Notion task status to `In Progress`, then update `feature_list.json` to match.",
  };
  const backendSpecReady: Record<TaskBackend, string> = {
    json: "Change the feature status to `spec_ready` in `feature_list.json`.",
    linear: "Transition the Linear issue to `spec_ready` via Linear MCP, then update `feature_list.json` to match.",
    notion: "Update the Notion task status to `spec_ready`, then update `feature_list.json` to match.",
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
  const permissions = agentPermissionsFor(answers);
  const selectedAgentEntries = ALL_AGENT_META
    .filter((a) => shouldIncludeAgent(a.name, answers.agents))
    .map((a) => {
      const promptRef = `{file:./.opencode/agent/${a.name}.md}`;
      const permission = permissions[a.name];
      return `    "${a.name}": {\n      "description": ${JSON.stringify(a.description)},\n      "mode": "${a.mode}",\n      "prompt": ${JSON.stringify(promptRef)},\n      "permission": ${JSON.stringify(permission)}\n    }`;
    })
    .join(",\n");
  const agentDefinitions = selectedAgentEntries ? ",\n" + selectedAgentEntries : "";

  const openspec = answers.specLayer === "openspec";
  const baseFiles = [
    "AGENTS.md",
    ...(openspec ? [] : ["feature_list.json"]),
    "progress/current.md",
    "docs/architecture.md",
    "docs/conventions.md",
    "docs/specs.md",
    "docs/tdd.md",
    "docs/verification.md",
    "CHECKPOINTS.md",
    "ground-rules.md",
  ];
  const specLayerAgentNotes = openspec
    ? `
> **Spec layer: OpenSpec.** This project keeps specs in \`openspec/\`, not \`specs/\` + \`feature_list.json\`.
> Wherever this prompt mentions them, use the mapping in \`docs/specs.md\`: a feature is a change in
> \`openspec/changes/<change>/\` (\`proposal.md\`, \`design.md\`, \`tasks.md\`, \`specs/<capability>/spec.md\`);
> requirements are \`### Requirement:\` blocks with \`#### Scenario:\` cases. Use \`/opsx-propose\`, \`/opsx-apply\`
> and \`/opsx-archive\`, and \`openspec validate <change> --strict\` before handing a spec to the human.
`
    : "";
  const specLayerProjectNotes = openspec
    ? `## 0. Spec layer: OpenSpec

Specs live in \`openspec/\` (living specs in \`openspec/specs/\`, in-flight work in \`openspec/changes/\`).
Where this file or the agents mention \`feature_list.json\` or \`specs/<feature>/\`, read \`docs/specs.md\`
for the OpenSpec equivalent. The human approval gate still applies between \`/opsx-propose\` and \`/opsx-apply\`.

---

`
    : "";

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
    BACKEND_STARTUP_READ: backendStartupRead[answers.taskBackend],
    BACKEND_FEATURE_SOURCE: backendFeatureSource[answers.taskBackend],
    BACKEND_TRANSITION_INPROGRESS: backendTransitionInProgress[answers.taskBackend],
    BACKEND_SPEC_READY: backendSpecReady[answers.taskBackend],
    AGENT_DEFINITIONS: agentDefinitions,
    DEFAULT_AGENT: shouldIncludeAgent("leader", answers.agents) ? "leader" : "build",
    LINEAR_PROJECT_ID: answers.linearProjectId,
    NOTION_DATABASE_ID: answers.notionDatabaseId,
    NOTION_API_KEY: answers.notionApiKey,
    BASE_FILES: baseFiles.join(" "),
    SPEC_CHECK: loadTemplate(`shared/init.spec-check.${openspec ? "openspec" : "harness"}.sh`).trimEnd(),
    SPEC_LAYER_NOTES: specLayerAgentNotes,
    SPEC_LAYER_PROJECT_NOTES: specLayerProjectNotes,
    ...stackVars,
  };
}

function agentPermissionsFor(answers: Answers) {
  return agentPermissions({
    stack: answers.stack,
    framework: answers.framework,
    specLayer: answers.specLayer ?? "harness",
    agents: answers.agents,
  });
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
    const actionExists = mode === "append" ? "create" : alreadyExists ? (answers.force ? "overwrite" : "skip") : "create";
    return {
      path,
      content,
      exists: actionExists,
      mode,
    };
  };

  // --- Shared harness files ---
  files.push(action(resolve("AGENTS.md"), renderTemplate("shared/AGENTS.md.tmpl", vars)));
  files.push(action(resolve("CHECKPOINTS.md"), renderTemplate("shared/CHECKPOINTS.md.tmpl", vars)));
  files.push(action(resolve("init.sh"), renderTemplate("shared/init.sh.tmpl", vars)));
  const openspec = answers.specLayer === "openspec";
  if (!openspec) {
    files.push(action(resolve("feature_list.json"), renderTemplate("shared/feature_list.json.tmpl", vars)));
  }
  files.push(action(resolve("progress/current.md"), renderTemplate("shared/progress/current.md.tmpl", vars)));
  files.push(action(resolve("progress/history.md"), renderTemplate("shared/progress/history.md.tmpl", vars)));

  // --- Ground rules ---
  if (answers.bestPractices) {
    files.push(action(resolve("ground-rules.md"), renderTemplate("shared/ground-rules.md.tmpl", vars)));
  }

  // --- Specs placeholder ---
  if (!openspec) {
    files.push(action(resolve("specs/.gitkeep"), loadTemplate("shared/specs/.gitkeep")));
  }

  // --- Demo feature ---
  if (answers.seedDemo && !openspec) {
    const name = "hello_harness";
    files.push(action(resolve(`specs/${name}/requirements.md`), renderTemplate(`shared/demo/${name}/requirements.md.tmpl`, vars)));
    files.push(action(resolve(`specs/${name}/design.md`), renderTemplate(`shared/demo/${name}/design.md.tmpl`, vars)));
    files.push(action(resolve(`specs/${name}/tasks.md`), renderTemplate(`shared/demo/${name}/tasks.md.tmpl`, vars)));
  }

  // --- Docs ---
  files.push(action(resolve("docs/architecture.md"), renderTemplate("shared/docs/architecture.md.tmpl", vars)));
  files.push(action(resolve("docs/conventions.md"), renderTemplate("shared/docs/conventions.md.tmpl", vars)));

  if (answers.sdd) {
    const specsDoc = openspec ? "shared/docs/specs.openspec.md.tmpl" : "shared/docs/specs.md.tmpl";
    files.push(action(resolve("docs/specs.md"), renderTemplate(specsDoc, vars)));
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
  // Frontmatter permissions come from the same source as opencode.jsonc so the two cannot drift.
  const permissions = agentPermissionsFor(answers);
  const agentFile = (agent: string, template: string) =>
    action(resolve(`.opencode/agent/${agent}.md`), renderTemplate(template, { ...vars, AGENT_PERMISSION: permissionYaml(permissions[agent]!) }));
  for (const agent of SHARED_AGENTS) {
    if (shouldIncludeAgent(agent, answers.agents)) {
      files.push(agentFile(agent, `shared/agents/${agent}.md`));
    }
  }
  for (const agent of EXTRA_AGENTS) {
    if (shouldIncludeAgent(agent, answers.agents)) {
      files.push(agentFile(agent, `shared/agents/extras/${agent}.md`));
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
    files.push(action(resolve("AGENTS.md"), renderTemplate("opencode/AGENTS.md.append.tmpl", vars), "append"));

    // Enforces the approval gate in-process; the gate is defined by specs/ + feature_list.json, so harness layer only.
    if (answers.sdd && answers.specLayer !== "openspec") {
      files.push(action(resolve(".opencode/plugins/harness-guard.js"), loadTemplate("opencode/plugins/harness-guard.js")));
    }

    if (answers.models && answers.models !== "none") {
      const profile = selectRoles(loadProfileTemplate(answers.models), answers.agents);
      files.push(action(resolve(PROFILE_PATH), JSON.stringify(profile, null, 2) + "\n"));
      files.push(action(resolve(ROUTING_PATH), renderRoutingConfig(preferredResolutions(profile), readRouting(cwd))));
    }
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

/** Existing `.opencode/opencode.json`, so model routing merges into it instead of clobbering it. */
function readRouting(cwd: string): Record<string, unknown> | undefined {
  const path = join(cwd, ROUTING_PATH);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
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
