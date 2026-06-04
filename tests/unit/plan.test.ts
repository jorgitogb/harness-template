import { describe, it, expect } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildPlan, type Answers } from "../../src/plan.js";
import { applyPlan } from "../../src/apply.js";

const TMP = join(import.meta.dirname, "../tmp-plan");

function baseAnswers(overrides: Partial<Answers> = {}): Answers {
  return {
    cli: "opencode",
    stack: "python",
    framework: "none",
    taskBackend: "json",
    sdd: true,
    tdd: true,
    bestPractices: true,
    agents: ["leader", "spec-author", "implementer", "reviewer"],
    specNotation: "ears",
    rules: ["human-approval-gate"],
    projectName: "test-project",
    projectDescription: "A test",
    seedDemo: false,
    initialCommit: false,
    force: false,
    learningMode: false,
    ...overrides,
  };
}

describe("buildPlan", () => {
  it("creates a plan with default answers", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers(), TMP);
    expect(plan.length).toBeGreaterThan(0);
    const paths = plan.map((f) => f.path);
    expect(paths).toContain("AGENTS.md");
    expect(paths).toContain("init.sh");
    expect(paths).toContain("feature_list.json");
    expect(paths).toContain("opencode.jsonc");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes learning.md when learningMode is true", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ learningMode: true }), TMP);
    const paths = plan.map((f) => f.path);
    expect(paths).toContain("docs/learning.md");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("excludes learning.md when learningMode is false", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ learningMode: false }), TMP);
    const paths = plan.map((f) => f.path);
    expect(paths).not.toContain("docs/learning.md");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("excludes specs.md when sdd is false", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ sdd: false }), TMP);
    const paths = plan.map((f) => f.path);
    expect(paths).not.toContain("docs/specs.md");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("excludes tdd.md when tdd is false", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ tdd: false }), TMP);
    const paths = plan.map((f) => f.path);
    expect(paths).not.toContain("docs/tdd.md");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes only selected agents", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ agents: ["leader"] }), TMP);
    const paths = plan.map((f) => f.path);
    expect(paths).toContain(".opencode/agent/leader.md");
    expect(paths).not.toContain(".opencode/agent/implementer.md");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("marks existing files as skip when force is false", async () => {
    mkdirSync(TMP, { recursive: true });
    const plan1 = buildPlan(baseAnswers(), TMP);
    // Apply first plan to create files
    await applyPlan(plan1, TMP);
    // Build second plan — should skip existing
    const plan2 = buildPlan(baseAnswers(), TMP);
    expect(plan2.length).toBe(0);
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes React conventions in conventions.md when framework=react", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "node", framework: "react" }), TMP);
    const conventionsFile = plan.find((f) => f.path === "docs/conventions.md");
    expect(conventionsFile).toBeDefined();
    expect(conventionsFile!.content).toContain("Prettier");
    expect(conventionsFile!.content).toContain("Components");
    expect(conventionsFile!.content).toContain("PascalCase");
    expect(conventionsFile!.content).toContain("@testing-library/react");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes Astro conventions in conventions.md when framework=astro", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "node", framework: "astro" }), TMP);
    const conventionsFile = plan.find((f) => f.path === "docs/conventions.md");
    expect(conventionsFile).toBeDefined();
    expect(conventionsFile!.content).toContain("Prettier");
    expect(conventionsFile!.content).toContain(".astro");
    expect(conventionsFile!.content).toContain("Islands");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes React init checks when framework=react", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "node", framework: "react" }), TMP);
    const initShFile = plan.find((f) => f.path === "init.sh");
    expect(initShFile).toBeDefined();
    expect(initShFile!.content).toContain("npx tsc");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes Astro init checks when framework=astro", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "node", framework: "astro" }), TMP);
    const initShFile = plan.find((f) => f.path === "init.sh");
    expect(initShFile).toBeDefined();
    expect(initShFile!.content).toContain("astro");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes React gitignore entries when framework=react", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "node", framework: "react" }), TMP);
    const gitignoreFile = plan.find((f) => f.path === ".gitignore");
    expect(gitignoreFile).toBeDefined();
    expect(gitignoreFile!.content).toContain("build/");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes Astro gitignore entries when framework=astro", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "node", framework: "astro" }), TMP);
    const gitignoreFile = plan.find((f) => f.path === ".gitignore");
    expect(gitignoreFile).toBeDefined();
    expect(gitignoreFile!.content).toContain("dist/");
    expect(gitignoreFile!.content).toContain(".astro/");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes demo spec files when seedDemo is true", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ seedDemo: true }), TMP);
    const paths = plan.map((f) => f.path);
    expect(paths).toContain("specs/hello_harness/requirements.md");
    expect(paths).toContain("specs/hello_harness/design.md");
    expect(paths).toContain("specs/hello_harness/tasks.md");
    const featureListFile = plan.find((f) => f.path === "feature_list.json");
    expect(featureListFile).toBeDefined();
    expect(featureListFile!.content).toContain("hello_harness");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("excludes demo spec files when seedDemo is false", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ seedDemo: false }), TMP);
    const paths = plan.map((f) => f.path);
    expect(paths).not.toContain("specs/hello_harness/requirements.md");
    expect(paths).not.toContain("specs/hello_harness/design.md");
    expect(paths).not.toContain("specs/hello_harness/tasks.md");
    const featureListFile = plan.find((f) => f.path === "feature_list.json");
    expect(featureListFile).toBeDefined();
    expect(featureListFile!.content).not.toContain("hello_harness");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes json task-backend note in AGENTS.md", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ taskBackend: "json" }), TMP);
    const agentsFile = plan.find((f) => f.path === "AGENTS.md");
    expect(agentsFile).toBeDefined();
    expect(agentsFile!.content).toContain("Source of truth: local feature_list.json");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes linear task-backend note in AGENTS.md", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ taskBackend: "linear" }), TMP);
    const agentsFile = plan.find((f) => f.path === "AGENTS.md");
    expect(agentsFile).toBeDefined();
    expect(agentsFile!.content).toContain("Source of truth: Linear");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes notion task-backend note in AGENTS.md", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ taskBackend: "notion" }), TMP);
    const agentsFile = plan.find((f) => f.path === "AGENTS.md");
    expect(agentsFile).toBeDefined();
    expect(agentsFile!.content).toContain("Source of truth: Notion");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes FastAPI conventions when framework=fastapi", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "python", framework: "fastapi" }), TMP);
    const conventionsFile = plan.find((f) => f.path === "docs/conventions.md");
    expect(conventionsFile).toBeDefined();
    expect(conventionsFile!.content).toContain("PEP 8");
    expect(conventionsFile!.content).toContain("APIRouter");
    expect(conventionsFile!.content).toContain("Pydantic");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes Django conventions when framework=django", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "python", framework: "django" }), TMP);
    const conventionsFile = plan.find((f) => f.path === "docs/conventions.md");
    expect(conventionsFile).toBeDefined();
    expect(conventionsFile!.content).toContain("PEP 8");
    expect(conventionsFile!.content).toContain("Django");
    expect(conventionsFile!.content).toContain("models.py");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes Flask conventions when framework=flask", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "python", framework: "flask" }), TMP);
    const conventionsFile = plan.find((f) => f.path === "docs/conventions.md");
    expect(conventionsFile).toBeDefined();
    expect(conventionsFile!.content).toContain("PEP 8");
    expect(conventionsFile!.content).toContain("Flask");
    expect(conventionsFile!.content).toContain("create_app");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes FastAPI init checks when framework=fastapi", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "python", framework: "fastapi" }), TMP);
    const initShFile = plan.find((f) => f.path === "init.sh");
    expect(initShFile).toBeDefined();
    expect(initShFile!.content).toContain("fastapi");
    expect(initShFile!.content).toContain("uvicorn");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes Django init checks when framework=django", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "python", framework: "django" }), TMP);
    const initShFile = plan.find((f) => f.path === "init.sh");
    expect(initShFile).toBeDefined();
    expect(initShFile!.content).toContain("django");
    expect(initShFile!.content).toContain("manage.py");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes Flask init checks when framework=flask", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "python", framework: "flask" }), TMP);
    const initShFile = plan.find((f) => f.path === "init.sh");
    expect(initShFile).toBeDefined();
    expect(initShFile!.content).toContain("flask");
    expect(initShFile!.content).toContain("create_app");
    rmSync(TMP, { recursive: true, force: true });
  });

  it("includes Python framework gitignore entries", () => {
    mkdirSync(TMP, { recursive: true });
    const plan = buildPlan(baseAnswers({ stack: "python", framework: "django" }), TMP);
    const gitignoreFile = plan.find((f) => f.path === ".gitignore");
    expect(gitignoreFile).toBeDefined();
    expect(gitignoreFile!.content).toContain("db.sqlite3");
    rmSync(TMP, { recursive: true, force: true });
  });
});
