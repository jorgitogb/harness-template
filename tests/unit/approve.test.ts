import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { approveSpec, specHash, APPROVAL_FILE } from "../../src/approve.js";
import { loadTemplate } from "../../src/render.js";

const TMP = join(import.meta.dirname, "../tmp-approve");
const SPEC = join(TMP, "specs/login");

const REQUIREMENTS = "# Requirements\n\n- R1: WHEN the user submits valid credentials THE SYSTEM SHALL log them in.\n";
const DESIGN = "# Design\n\nSession cookie.\n";
const TASKS = "# Tasks\n\n- [ ] T1 (R1): write login test\n- [ ] T2 (R1): implement login\n";

function writeSpec(files: Partial<Record<"requirements.md" | "design.md" | "tasks.md", string>> = {}) {
  mkdirSync(SPEC, { recursive: true });
  writeFileSync(join(SPEC, "requirements.md"), files["requirements.md"] ?? REQUIREMENTS);
  writeFileSync(join(SPEC, "design.md"), files["design.md"] ?? DESIGN);
  writeFileSync(join(SPEC, "tasks.md"), files["tasks.md"] ?? TASKS);
}

function writeFeatures(status: string) {
  writeFileSync(
    join(TMP, "feature_list.json"),
    JSON.stringify({ features: [{ id: 1, name: "login", sdd: true, status }] }),
  );
}

/** Run the init.sh spec-check block exactly as generated projects do. */
function runSpecCheck(): { ok: boolean; output: string } {
  const script = `ok() { echo "[OK] $1"; }\nfail() { echo "[FAIL] $1"; }\nEXIT_CODE=0\n${loadTemplate("shared/init.spec-check.harness.sh")}\nexit $EXIT_CODE`;
  try {
    return { ok: true, output: execFileSync("bash", ["-c", script], { cwd: TMP, encoding: "utf-8" }) };
  } catch (err: any) {
    return { ok: false, output: String(err.stdout ?? "") };
  }
}

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe("specHash", () => {
  it("ignores task checkboxes so the implementer can tick tasks", () => {
    writeSpec();
    const before = specHash(SPEC);
    writeFileSync(join(SPEC, "tasks.md"), TASKS.replace("- [ ] T1", "- [x] T1").replace("- [ ] T2", "- [X] T2"));
    expect(specHash(SPEC)).toBe(before);
  });

  it("ignores CRLF line endings", () => {
    writeSpec();
    const before = specHash(SPEC);
    writeSpec({ "requirements.md": REQUIREMENTS.replaceAll("\n", "\r\n") });
    expect(specHash(SPEC)).toBe(before);
  });

  it.each(["requirements.md", "design.md", "tasks.md"] as const)("changes when %s text changes", (file) => {
    writeSpec();
    const before = specHash(SPEC);
    writeFileSync(join(SPEC, file), readFileSync(join(SPEC, file), "utf-8") + "\nOne more line.\n");
    expect(specHash(SPEC)).not.toBe(before);
  });
});

describe("approveSpec", () => {
  it("writes the approval file with hash, approver and date", () => {
    writeSpec();
    writeFeatures("spec_ready");
    const result = approveSpec(TMP, "login", "Ada", new Date("2026-10-04T10:00:00Z"));
    expect(result.ok).toBe(true);
    const content = readFileSync(join(SPEC, APPROVAL_FILE), "utf-8");
    expect(content).toContain(`sha256: ${specHash(SPEC)}`);
    expect(content).toContain("approved_by: Ada");
    expect(content).toContain("approved_at: 2026-10-04T10:00:00.000Z");
  });

  it("allows re-approval of an in_progress feature after a spec change", () => {
    writeSpec();
    writeFeatures("in_progress");
    expect(approveSpec(TMP, "login", "Ada").ok).toBe(true);
  });

  it.each(["pending", "done", "blocked"])("refuses a feature in %s", (status) => {
    writeSpec();
    writeFeatures(status);
    const result = approveSpec(TMP, "login", "Ada");
    expect(result.ok).toBe(false);
    expect(existsSync(join(SPEC, APPROVAL_FILE))).toBe(false);
  });

  it("refuses when a spec file is missing", () => {
    writeSpec();
    rmSync(join(SPEC, "design.md"));
    const result = approveSpec(TMP, "login", "Ada");
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.error).toContain("design.md");
  });

  it.each(["../etc", "a/b", "", "login name"])("rejects unsafe feature name %j", (name) => {
    expect(approveSpec(TMP, name, "Ada").ok).toBe(false);
  });
});

describe("init.sh spec check — approval gate", () => {
  it("does not require approval while the feature is spec_ready", () => {
    writeSpec();
    writeFeatures("spec_ready");
    expect(runSpecCheck().ok).toBe(true);
  });

  it("fails an in_progress feature without an approval file", () => {
    writeSpec();
    writeFeatures("in_progress");
    const { ok, output } = runSpecCheck();
    expect(ok).toBe(false);
    expect(output).toContain("not approved");
    expect(output).toContain("harness-init approve login");
  });

  it("passes an approved in_progress feature (Node and Python hashes agree)", () => {
    writeSpec();
    writeFeatures("spec_ready");
    approveSpec(TMP, "login", "Ada");
    writeFeatures("in_progress");
    expect(runSpecCheck()).toMatchObject({ ok: true });
  });

  it("still passes after the implementer ticks tasks", () => {
    writeSpec();
    writeFeatures("spec_ready");
    approveSpec(TMP, "login", "Ada");
    writeFeatures("done");
    writeFileSync(join(SPEC, "tasks.md"), TASKS.replaceAll("- [ ]", "- [x]"));
    expect(runSpecCheck().ok).toBe(true);
  });

  it("fails when the spec changed after approval", () => {
    writeSpec();
    writeFeatures("spec_ready");
    approveSpec(TMP, "login", "Ada");
    writeFeatures("in_progress");
    writeFileSync(join(SPEC, "requirements.md"), REQUIREMENTS + "- R2: THE SYSTEM SHALL also do something new.\n");
    const { ok, output } = runSpecCheck();
    expect(ok).toBe(false);
    expect(output).toContain("changed after approval");
  });
});
