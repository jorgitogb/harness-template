import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { Stack, Cli, Framework } from "./detect.js";
import type { RenderVars } from "./render.js";
import { renderTemplate, getStackVars, loadTemplate } from "./render.js";

export interface Answers {
  cli: Cli;
  stack: Stack;
  framework: Framework;
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
}

export interface FileAction {
  path: string;
  content: string;
  exists: "create" | "overwrite" | "skip";
  mode: "normal" | "append";
}

const SHARED_AGENTS = ["leader", "spec-author", "implementer", "reviewer"];
const EXTRA_AGENTS = ["security-auditor", "doc-writer", "perf-analyzer"];

function buildRenderVars(answers: Answers): RenderVars {
  const stackVars = getStackVars(answers.stack, answers.framework);
  const demoEntry = JSON.stringify({
    name: "hello_harness",
    description: "A starter feature that validates the SDD pipeline works end-to-end",
    sdd: true,
    status: "pending",
  }, null, 2);
  return {
    PROJECT_NAME: answers.projectName,
    PROJECT_DESCRIPTION: answers.projectDescription,
    DEMO_FEATURE: answers.seedDemo ? demoEntry : "",
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
      files.push(action(resolve(`.opencode/agent/${agent}.md`), loadTemplate(`shared/agents/${agent}.md`)));
    }
  }
  for (const agent of EXTRA_AGENTS) {
    if (shouldIncludeAgent(agent, answers.agents)) {
      files.push(action(resolve(`.opencode/agent/${agent}.md`), loadTemplate(`shared/agents/extras/${agent}.md`)));
    }
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

  return files.filter((f) => f.exists !== "skip");
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
