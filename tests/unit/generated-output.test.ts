import { describe, it, expect } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildPlan, type Answers, type Rigor, type SpecLayer, type TaskBackend } from "../../src/plan.js";
import type { Cli, Framework, Stack } from "../../src/detect.js";
import { loadTemplate } from "../../src/render.js";

const TMP = join(import.meta.dirname, "../tmp-generated");

const FRAMEWORKS: Record<Stack, Framework[]> = {
  node: ["none", "react", "astro", "next"],
  python: ["none", "fastapi", "django", "flask"],
  go: ["none"],
  rust: ["none"],
  generic: ["none"],
};

function answers(overrides: Partial<Answers>): Answers {
  return {
    cli: "opencode",
    stack: "node",
    framework: "none",
    taskBackend: "json",
    sdd: true,
    tdd: true,
    bestPractices: true,
    agents: ["leader", "spec-author", "implementer", "reviewer", "security-auditor", "doc-writer", "perf-analyzer"],
    specNotation: "ears",
    rules: [],
    projectName: "demo",
    projectDescription: "",
    seedDemo: true,
    initialCommit: false,
    force: false,
    learningMode: true,
    linearProjectId: "PRJ",
    notionDatabaseId: "DB",
    notionApiKey: "",
    ...overrides,
  };
}

const combos: Array<[string, Partial<Answers>]> = [];
for (const stack of Object.keys(FRAMEWORKS) as Stack[]) {
  for (const framework of FRAMEWORKS[stack]) {
    combos.push([`${stack}/${framework}`, { stack, framework }]);
  }
}
for (const taskBackend of ["linear", "notion"] as TaskBackend[]) combos.push([`backend ${taskBackend}`, { taskBackend }]);
for (const specLayer of ["openspec"] as SpecLayer[]) combos.push([`spec layer ${specLayer}`, { specLayer }]);
for (const rigor of ["light", "strict"] as Rigor[]) combos.push([`rigor ${rigor}`, { rigor }]);
for (const cli of ["claude", "codex"] as Cli[]) combos.push([`cli ${cli}`, { cli }]);
combos.push(["models mixed", { models: "mixed" }]);

function plan(overrides: Partial<Answers>) {
  mkdirSync(TMP, { recursive: true });
  try {
    return buildPlan(answers(overrides), TMP);
  } finally {
    rmSync(TMP, { recursive: true, force: true });
  }
}

/** Headings repeated under the same parent, ignoring fenced code blocks. */
function duplicateHeadings(markdown: string): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  const path: string[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) inFence = !inFence;
    const m = !inFence && /^(#{1,6})\s+(.*)$/.exec(line);
    if (!m) continue;
    const level = m[1]!.length;
    path.length = level - 1;
    path[level - 1] = m[2]!.trim();
    const key = path.join(" > ");
    if (seen.has(key)) dupes.push(key);
    seen.add(key);
  }
  return dupes;
}

describe.each(combos)("generated output — %s", (_label, overrides) => {
  const files = plan(overrides);

  it("leaves no {{PLACEHOLDER}} unrendered", () => {
    for (const f of files) {
      expect(f.content.match(/\{\{[A-Z_]+\}\}/g), f.path).toBeNull();
    }
  });

  it("never renders undefined or [object Object] into docs and scripts", () => {
    for (const f of files.filter((f) => !f.path.endsWith(".js"))) {
      expect(f.content, f.path).not.toMatch(/undefined|\[object Object\]/);
    }
  });

  it("has no duplicate sections in conventions.md", () => {
    const conventions = files.find((f) => f.path === "docs/conventions.md")!.content;
    expect(duplicateHeadings(conventions)).toEqual([]);
  });
});

describe("shared docs stay language-agnostic", () => {
  const LANGUAGE_SPECIFIC = /TypeScript|Python|Prettier|snake_case|camelCase|kebab-case|semicolon/;

  it.each(["shared/docs/architecture.md.tmpl", "shared/docs/conventions.md.tmpl", "shared/docs/tdd.md.tmpl"])(
    "%s leaves language rules to the stack conventions",
    (template) => {
      expect(loadTemplate(template)).not.toMatch(LANGUAGE_SPECIFIC);
    },
  );

  it("architecture.md does not prescribe an error style that contradicts a stack", () => {
    expect(loadTemplate("shared/docs/architecture.md.tmpl")).not.toMatch(/never throw|never raise/i);
  });

  it("generated conventions.md has exactly one Git section", () => {
    for (const [stack, frameworks] of Object.entries(FRAMEWORKS) as Array<[Stack, Framework[]]>) {
      for (const framework of frameworks) {
        const conventions = plan({ stack, framework }).find((f) => f.path === "docs/conventions.md")!.content;
        expect(conventions.match(/^#+ Git\s*$/gm), `${stack}/${framework}`).toHaveLength(1);
      }
    }
  });
});
