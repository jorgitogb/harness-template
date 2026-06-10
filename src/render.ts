import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Framework } from "./detect.js";

const TEMPLATES_DIR = join(import.meta.dirname, "../templates");

export interface RenderVars {
  PROJECT_NAME: string;
  PROJECT_DESCRIPTION: string;
  STACK_DISPLAY: string;
  FRAMEWORK_DISPLAY: string;
  STACK_CONVENTIONS: string;
  RUNTIME_CHECKS: string;
  TEST_COMMAND: string;
  TASK_BACKEND_NOTE: string;
  MCP_SERVERS: string;
  BACKEND_WORKFLOW: string;
  BACKEND_CLOSE: string;
  AGENT_BACKEND_NOTES: string;
  BACKEND_STARTUP_READ: string;
  BACKEND_FEATURE_SOURCE: string;
  BACKEND_TRANSITION_INPROGRESS: string;
  BACKEND_SPEC_READY: string;
  AGENT_DEFINITIONS: string;
  LINEAR_PROJECT_ID: string;
  NOTION_DATABASE_ID: string;
  NOTION_API_KEY: string;
  [key: string]: string;
}

export function loadTemplate(relativePath: string): string {
  const full = join(TEMPLATES_DIR, relativePath);
  return readFileSync(full, "utf-8");
}

export function render(template: string, vars: RenderVars): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export function renderTemplate(relativePath: string, vars: RenderVars): string {
  const raw = loadTemplate(relativePath);
  return render(raw, vars);
}

function loadFrameworkTemplate(stack: string, framework: Framework, filename: string): string | null {
  if (framework === "none") return null;
  try {
    return loadTemplate(`stack/${stack}/${framework}/${filename}`);
  } catch {
    return null;
  }
}

export function getStackVars(stack: string, framework: Framework = "none"): Pick<RenderVars, "STACK_CONVENTIONS" | "RUNTIME_CHECKS" | "TEST_COMMAND"> {
  const checks = loadTemplate(`stack/${stack}/init.checks.sh`);
  const conventions = loadTemplate(`stack/${stack}/conventions.md`);

  const testCommands: Record<string, string> = {
    python: 'if command -v pytest >/dev/null 2>&1; then\n  if pytest -q 2>&1; then\n    ok "All tests pass"\n  else\n    fail "Some tests failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "pytest not installed — skipping tests"\nfi',
    node: 'if [ -f "package.json" ]; then\n  if pnpm test 2>&1; then\n    ok "All tests pass"\n  else\n    fail "Some tests failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "No package.json — skipping tests"\nfi',
    go: 'if go test ./... 2>&1; then\n  ok "All tests pass"\nelse\n  fail "Some tests failed"\n  EXIT_CODE=1\nfi',
    rust: 'if cargo test 2>&1; then\n  ok "All tests pass"\nelse\n  fail "Some tests failed"\n  EXIT_CODE=1\nfi',
    generic: 'warn "No test command configured — add your test runner here"',
  };

  let finalConventions = conventions;
  let finalChecks = checks;
  let finalTestCommand = testCommands[stack] ?? 'warn "No test command configured — add your test runner here"';

  const fwConventions = loadFrameworkTemplate(stack, framework, "conventions.md");
  if (fwConventions) {
    finalConventions = conventions + "\n\n" + fwConventions;
  }

  const fwChecks = loadFrameworkTemplate(stack, framework, "init.checks.sh");
  if (fwChecks) {
    finalChecks = checks + "\n" + fwChecks;
  }

  const frameworkTestCommands: Record<Framework, string> = {
    astro: 'if command -v pnpm >/dev/null 2>&1 && pnpm astro --version >/dev/null 2>&1; then\n  if pnpm astro check 2>&1; then\n    ok "Astro type checks pass"\n  else\n    fail "Astro type checks failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "astro CLI not found — skipping type check"\nfi\n\nif [ -f "package.json" ]; then\n  if pnpm test 2>&1; then\n    ok "All tests pass"\n  else\n    fail "Some tests failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "No package.json — skipping tests"\nfi',
    react: 'if [ -f "package.json" ]; then\n  if pnpm test 2>&1; then\n    ok "All tests pass"\n  else\n    fail "Some tests failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "No package.json — skipping tests"\nfi',
    next: 'if [ -f "package.json" ]; then\n  if pnpm test 2>&1; then\n    ok "All tests pass"\n  else\n    fail "Some tests failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "No package.json — skipping tests"\nfi',
    fastapi: 'if command -v pytest >/dev/null 2>&1; then\n  if pytest -q 2>&1; then\n    ok "All tests pass"\n  else\n    fail "Some tests failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "pytest not installed — skipping tests"\nfi',
    django: 'if command -v pytest >/dev/null 2>&1; then\n  if pytest -q 2>&1; then\n    ok "All tests pass"\n  else\n    fail "Some tests failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "pytest not installed — skipping tests"\nfi',
    flask: 'if command -v pytest >/dev/null 2>&1; then\n  if pytest -q 2>&1; then\n    ok "All tests pass"\n  else\n    fail "Some tests failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "pytest not installed — skipping tests"\nfi',
    none: finalTestCommand,
  };

  if (framework !== "none" && frameworkTestCommands[framework]) {
    finalTestCommand = frameworkTestCommands[framework];
  }

  return {
    STACK_CONVENTIONS: finalConventions,
    RUNTIME_CHECKS: finalChecks,
    TEST_COMMAND: finalTestCommand,
  };
}
