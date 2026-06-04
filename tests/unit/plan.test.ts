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
});
