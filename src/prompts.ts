import * as p from "@clack/prompts";
import type { Stack, Cli, Framework } from "./detect.js";
import type { Answers, TaskBackend } from "./plan.js";

const ALL_AGENTS = [
  { name: "leader", label: "leader — orchestrates, never edits code", initial: true },
  { name: "spec-author", label: "spec-author — writes requirements, design, tasks", initial: true },
  { name: "implementer", label: "implementer — writes code & tests (red-green-refactor)", initial: true },
  { name: "reviewer", label: "reviewer — checks traceability & completion", initial: true },
  { name: "security-auditor", label: "security-auditor — identifies vulnerabilities", initial: false },
  { name: "doc-writer", label: "doc-writer — writes and maintains docs", initial: false },
  { name: "perf-analyzer", label: "perf-analyzer — analyzes performance implications", initial: false },
];

const ALL_RULES = [
  { name: "human-approval-gate", label: "human-approval-gate — immutable, always on", initial: true, immutable: true },
  { name: "one-feature-at-a-time", label: "one-feature-at-a-time — max 1 in_progress", initial: true },
  { name: "no-done-without-green-tests", label: "no-done-without-green-tests", initial: true },
  { name: "approved-spec-before-code", label: "approved-spec-before-code", initial: true },
  { name: "progress-on-disk", label: "progress-on-disk — artifacts in files, not chat", initial: true },
  { name: "conventional-commits", label: "conventional-commits", initial: true },
  { name: "no-new-deps-without-adr", label: "no-new-deps-without-adr", initial: true },
  { name: "document-exports", label: "document-exports", initial: true },
];

export async function promptWizard(detected: {
  stack: Stack;
  framework: Framework;
  cli: Cli | null;
  harnessExists: boolean;
  projectName: string;
}): Promise<Answers> {
  p.intro("harness-init — bootstrap an AI dev workspace");

  if (detected.harnessExists) {
    p.log.warn("Existing harness detected. Conflicts will be prompted file-by-file.");
  }

  // CLI
  const cli = await p.select({
    message: "Which AI CLI should this harness target?",
    options: [
      { value: "opencode" as Cli, label: "opencode (fully supported)" },
      { value: "claude" as Cli, label: "Claude Code (stub — coming soon)" },
      { value: "codex" as Cli, label: "Codex CLI (stub — coming soon)" },
    ],
    initialValue: detected.cli ?? "opencode",
  });
  if (p.isCancel(cli)) process.exit(0);

  // Stack
  const stackOptions: Array<{ value: Stack; label: string }> = [
    { value: "python", label: "Python" },
    { value: "node", label: "Node / TypeScript" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "generic", label: "Generic / Polyglot" },
  ];
  const stack = await p.select({
    message: "Tech stack?",
    options: stackOptions,
    initialValue: detected.stack,
  });
  if (p.isCancel(stack)) process.exit(0);

  // Framework (only when stack is Node or Python)
  let framework: Framework = "none";
  if (stack === "node") {
    const frameworkSelect = await p.select({
      message: "Which framework?",
      options: [
        { value: "none" as Framework, label: "None (generic Node / TypeScript)" },
        { value: "react" as Framework, label: "React" },
        { value: "astro" as Framework, label: "Astro" },
        { value: "next" as Framework, label: "Next.js" },
      ],
      initialValue: detected.framework || "none",
    });
    if (p.isCancel(frameworkSelect)) process.exit(0);
    framework = frameworkSelect;
  } else if (stack === "python") {
    const frameworkSelect = await p.select({
      message: "Which framework?",
      options: [
        { value: "none" as Framework, label: "None (generic Python)" },
        { value: "fastapi" as Framework, label: "FastAPI" },
        { value: "django" as Framework, label: "Django" },
        { value: "flask" as Framework, label: "Flask" },
      ],
      initialValue: detected.framework || "none",
    });
    if (p.isCancel(frameworkSelect)) process.exit(0);
    framework = frameworkSelect;
  }

  // Features
  const sdd = await p.confirm({
    message: "Enable Spec-Driven Development (SDD)?",
    initialValue: true,
  });
  if (p.isCancel(sdd)) process.exit(0);

  const tdd = await p.confirm({
    message: "Enable Test-Driven Development (TDD)?",
    initialValue: true,
  });
  if (p.isCancel(tdd)) process.exit(0);

  const bestPractices = await p.confirm({
    message: "Enable best-practices checks in init.sh?",
    initialValue: true,
  });
  if (p.isCancel(bestPractices)) process.exit(0);

  // Task backend
  const taskBackend = await p.select({
    message: "Task tracking backend?",
    options: [
      { value: "json" as TaskBackend, label: "Local JSON (feature_list.json + progress/)" },
      { value: "linear" as TaskBackend, label: "Linear (MCP)" },
      { value: "notion" as TaskBackend, label: "Notion (external — doc only for now)" },
    ],
    initialValue: "json" as TaskBackend,
  });
  if (p.isCancel(taskBackend)) process.exit(0);

  // Learning mode
  const learningMode = await p.confirm({
    message: "Enable learning mode? (agents explain decisions step-by-step)",
    initialValue: false,
  });
  if (p.isCancel(learningMode)) process.exit(0);

  // Spec notation
  const specNotation = await p.select({
    message: "Spec notation style?",
    options: [
      { value: "ears", label: "EARS (Easy Approach to Requirements Syntax) — recommended" },
      { value: "user-story", label: "User-Story — As a <role> I want <action> so that <benefit>" },
      { value: "gherkin", label: "Gherkin — Given/When/Then" },
      { value: "free-form", label: "Free-form — plain markdown checklists" },
    ],
    initialValue: "ears",
  });
  if (p.isCancel(specNotation)) process.exit(0);

  // Agents
  const agentChoices = await p.multiselect({
    message: "Select agent roles:",
    options: ALL_AGENTS.map((a) => ({
      value: a.name,
      label: a.label,
    })),
    initialValues: ALL_AGENTS.filter((a) => a.initial).map((a) => a.name),
    required: true,
  });
  if (p.isCancel(agentChoices)) process.exit(0);

  // Ground rules
  const ruleChoices = await p.multiselect({
    message: "Select ground rules:",
    options: ALL_RULES.map((r) => ({
      value: r.name,
      label: r.label,
    })),
    initialValues: ALL_RULES.filter((r) => r.initial).map((r) => r.name),
    required: true,
  });
  if (p.isCancel(ruleChoices)) process.exit(0);

  // Project name
  const projectName = await p.text({
    message: "Project name?",
    defaultValue: detected.projectName,
    placeholder: detected.projectName,
  });
  if (p.isCancel(projectName)) process.exit(0);

  // Project description
  const projectDescription = await p.text({
    message: "One-line description?",
    defaultValue: "",
    placeholder: "A short description of what this project does",
  });
  if (p.isCancel(projectDescription)) process.exit(0);

  // Task backend specific prompts
  let linearProjectId = "";
  let notionDatabaseId = "";
  let notionApiKey = "";

  if (taskBackend === "linear") {
    const projectId = await p.text({
      message: "Linear Project ID? (create in Linear UI first, then paste ID here)",
      defaultValue: "",
      placeholder: "e.g. 12345678-abcd-1234-abcd-1234567890ab",
      validate: (value) => (value ? undefined : "Project ID is required for Linear backend"),
    });
    if (p.isCancel(projectId)) process.exit(0);
    linearProjectId = projectId;
  } else if (taskBackend === "notion") {
    const apiKey = await p.text({
      message: "Notion API Key? (create integration at notion.so/my-integrations)",
      defaultValue: "",
      placeholder: "ntn_...",
      validate: (value) => (value ? undefined : "API Key is required for Notion backend"),
    });
    if (p.isCancel(apiKey)) process.exit(0);
    notionApiKey = apiKey;

    const dbId = await p.text({
      message: "Notion Issues Database ID? (create a database in Notion first, then paste ID)",
      defaultValue: "",
      placeholder: "e.g. 12345678abcd1234abcd1234567890ab",
      validate: (value) => (value ? undefined : "Database ID is required for Notion backend"),
    });
    if (p.isCancel(dbId)) process.exit(0);
    notionDatabaseId = dbId;
  }

  // Seed demo
  const seedDemo = await p.confirm({
    message: "Seed with a demo feature (hello_harness)?",
    initialValue: false,
  });
  if (p.isCancel(seedDemo)) process.exit(0);

  // Initial commit
  const initialCommit = await p.confirm({
    message: "Create initial commit after writing files?",
    initialValue: false,
  });
  if (p.isCancel(initialCommit)) process.exit(0);

  p.outro("Configuration complete.");

  return {
    cli,
    stack,
    framework,
    taskBackend,
    sdd,
    tdd,
    bestPractices,
    agents: agentChoices as string[],
    specNotation,
    rules: ruleChoices as string[],
    projectName,
    projectDescription,
    seedDemo,
    initialCommit,
    force: false,
    learningMode,
    linearProjectId,
    notionDatabaseId,
    notionApiKey,
  };
}

export function parseArgs(argv: string[]): Partial<Answers> {
  const args: Partial<Answers> = {};
  const raw = argv.slice(2);

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    switch (arg) {
      case "--cli":
        args.cli = raw[++i] as Cli;
        break;
      case "--stack":
        args.stack = raw[++i] as Stack;
        break;
      case "--framework":
        args.framework = raw[++i] as Framework;
        break;
      case "--task-backend":
        args.taskBackend = raw[++i] as TaskBackend;
        break;
      case "--linear-project-id":
        args.linearProjectId = raw[++i];
        break;
      case "--notion-database-id":
        args.notionDatabaseId = raw[++i];
        break;
      case "--notion-api-key":
        args.notionApiKey = raw[++i];
        break;
      case "--sdd":
        args.sdd = true;
        break;
      case "--no-sdd":
        args.sdd = false;
        break;
      case "--tdd":
        args.tdd = true;
        break;
      case "--no-tdd":
        args.tdd = false;
        break;
      case "--best-practices":
        args.bestPractices = true;
        break;
      case "--no-best-practices":
        args.bestPractices = false;
        break;
      case "--learning":
        args.learningMode = true;
        break;
      case "--no-learning":
        args.learningMode = false;
        break;
      case "--agents":
        args.agents = raw[++i]?.split(",") ?? [];
        break;
      case "--rules":
        args.rules = raw[++i]?.split(",") ?? [];
        break;
      case "--name":
        args.projectName = raw[++i];
        break;
      case "--yes":
        // defaults will be filled in later
        break;
      case "--force":
        args.force = true;
        break;
    }
  }

  return args;
}
