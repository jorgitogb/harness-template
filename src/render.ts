import { readFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATES_DIR = join(import.meta.dirname, "../templates");

export interface RenderVars {
  PROJECT_NAME: string;
  PROJECT_DESCRIPTION: string;
  STACK_CONVENTIONS: string;
  RUNTIME_CHECKS: string;
  TEST_COMMAND: string;
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

export function getStackVars(stack: string): Pick<RenderVars, "STACK_CONVENTIONS" | "RUNTIME_CHECKS" | "TEST_COMMAND"> {
  const checks = loadTemplate(`stack/${stack}/init.checks.sh`);
  const conventions = loadTemplate(`stack/${stack}/conventions.md`);

  const testCommands: Record<string, string> = {
    python: 'if command -v pytest >/dev/null 2>&1; then\n  if pytest -q 2>&1; then\n    ok "All tests pass"\n  else\n    fail "Some tests failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "pytest not installed — skipping tests"\nfi',
    node: 'if [ -f "package.json" ]; then\n  if npm test 2>&1; then\n    ok "All tests pass"\n  else\n    fail "Some tests failed"\n    EXIT_CODE=1\n  fi\nelse\n  warn "No package.json — skipping tests"\nfi',
    go: 'if go test ./... 2>&1; then\n  ok "All tests pass"\nelse\n  fail "Some tests failed"\n  EXIT_CODE=1\nfi',
    rust: 'if cargo test 2>&1; then\n  ok "All tests pass"\nelse\n  fail "Some tests failed"\n  EXIT_CODE=1\nfi',
    generic: 'warn "No test command configured — add your test runner here"',
  };

  const testCommand = testCommands[stack] ?? 'warn "No test command configured — add your test runner here"';

  return {
    STACK_CONVENTIONS: conventions,
    RUNTIME_CHECKS: checks,
    TEST_COMMAND: testCommand,
  };
}
