#!/usr/bin/env node

import * as p from "@clack/prompts";
import { detect } from "./detect.js";
import { buildPlan, type Answers } from "./plan.js";
import { applyPlan, printResult } from "./apply.js";
import { promptWizard, parseArgs } from "./prompts.js";

const VERSION = "0.1.0";

const rawArgs = process.argv.slice(2);

if (rawArgs.includes("--version") || rawArgs.includes("-v")) {
  console.log(`harness-init v${VERSION}`);
  process.exit(0);
}

if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  console.log(`
harness-init v${VERSION}

Bootstrap an AI dev workspace with SDD, TDD, and agent roles.

Usage:
  npx @jorgegb/harness-init [options]

Options:
  --cli <name>          Target AI CLI (opencode, claude, codex) [default: opencode]
  --stack <name>        Tech stack (python, node, go, rust, generic) [default: auto-detect]
  --framework <name>    Framework when stack=node|python (react, astro, next, fastapi, django, flask, none) [default: auto-detect]
  --sdd / --no-sdd      Enable Spec-Driven Development [default: true]
  --task-backend <val>  Task backend (json, linear, notion) [default: json]
  --tdd / --no-tdd      Enable Test-Driven Development [default: true]
  --best-practices      Enable best-practices checks in init.sh [default: true]
  --learning / --no-learning  Learning mode (step-by-step explanations) [default: false]
  --agents <list>       Comma-separated agent names [default: leader,spec-author,implementer,reviewer]
  --rules <list|default> Ground rules selection [default: default]
  --name <name>         Project name [default: directory name]
  --yes                 Non-interactive mode, accept all defaults
  --force               Overwrite existing files without prompting
  --allow-root          Allow running as root
  --version, -v         Show version
  --help, -h            Show this help

Examples:
  npx @jorgegb/harness-init
  npx @jorgegb/harness-init --cli opencode --stack python --sdd --tdd
  npx @jorgegb/harness-init --yes --name my-project
`);
  process.exit(0);
}

// Root check
if (process.getuid?.() === 0 && !rawArgs.includes("--allow-root")) {
  console.error("Error: Do not run as root. Use --allow-root to override.");
  process.exit(1);
}

const cwd = process.cwd();
const detected = detect(cwd);
const isNonInteractive = rawArgs.includes("--yes");
const cliArgs = parseArgs(process.argv);

let answers: Answers;

if (isNonInteractive) {
  // Fill in defaults for non-interactive mode
  answers = {
    cli: cliArgs.cli ?? detected.cli ?? "opencode",
    stack: cliArgs.stack ?? detected.stack,
    framework: cliArgs.framework ?? detected.framework,
    taskBackend: cliArgs.taskBackend ?? "json",
    sdd: cliArgs.sdd ?? true,
    tdd: cliArgs.tdd ?? true,
    bestPractices: cliArgs.bestPractices ?? true,
    agents: cliArgs.agents ?? ["leader", "spec-author", "implementer", "reviewer"],
    specNotation: "ears",
    rules: cliArgs.rules ?? ["human-approval-gate", "one-feature-at-a-time", "no-done-without-green-tests", "approved-spec-before-code", "progress-on-disk"],
    projectName: cliArgs.projectName ?? detected.projectName,
    projectDescription: cliArgs.projectDescription ?? "",
    seedDemo: false,
    initialCommit: false,
    force: cliArgs.force ?? false,
    learningMode: cliArgs.learningMode ?? false,
  };
} else {
  answers = await promptWizard(detected);
  // Merge CLI overrides
  if (cliArgs.force) answers.force = true;
}

// Build and apply plan
const plan = buildPlan(answers, cwd);

console.log(`\nPlan: ${plan.length} files to process\n`);

let overwriteAll = false;
let skipAll = false;

const result = await applyPlan(plan, cwd, async (path, _existing, _fresh) => {
  if (answers.force || overwriteAll) return "overwrite";
  if (skipAll) return "skip";

  if (isNonInteractive) {
    console.log(`  [skip] ${path} (exists, use --force to overwrite)`);
    return "skip";
  }

  const decision = await p.select({
    message: `"${path}" already exists. What to do?`,
    options: [
      { value: "overwrite" as const, label: "Overwrite" },
      { value: "skip" as const, label: "Skip" },
      { value: "overwrite-all" as const, label: "Overwrite all" },
      { value: "skip-all" as const, label: "Skip all" },
    ],
  });
  if (p.isCancel(decision)) process.exit(0);

  if (decision === "overwrite-all") {
    overwriteAll = true;
    return "overwrite";
  }
  if (decision === "skip-all") {
    skipAll = true;
    return "skip";
  }
  return decision;
});

printResult(result);

if (result.errors.length > 0) {
  console.error("Some files failed to write. Check the errors above.");
  process.exit(1);
}

console.log("\nDone. Run `./init.sh` to verify your environment.");
console.log("Review the generated files above.");
console.log("Have ideas or feature requests? → https://github.com/jorgitogb/harness-template/issues/new");
