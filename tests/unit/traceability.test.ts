import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { approveSpec } from "../../src/approve.js";
import { loadTemplate } from "../../src/render.js";

const TMP = join(import.meta.dirname, "../tmp-trace");

function write(path: string, content: string) {
  mkdirSync(dirname(join(TMP, path)), { recursive: true });
  writeFileSync(join(TMP, path), content);
}

function setFeature(status: string) {
  write("feature_list.json", JSON.stringify({ features: [{ id: 1, name: "login", sdd: true, status }] }));
}

/** Approved feature `login` with R1..R3 (R2 is referenced twice in the text, which must not matter). */
function approvedFeature(status: "in_progress" | "done") {
  write("specs/login/requirements.md", "## R1\nWHEN ...\n\n## R2\nIF ... (see R1)\n\n## R3\nWHILE ...\n");
  write("specs/login/design.md", "# Design\n");
  write("specs/login/tasks.md", "- [ ] T1 Covers: R1, R2, R3\n");
  setFeature("spec_ready");
  approveSpec(TMP, "login", "Ada");
  setFeature(status);
}

function runSpecCheck(rigor?: string): { ok: boolean; output: string } {
  const script = `ok() { echo "[OK] $1"; }\nfail() { echo "[FAIL] $1"; }\nEXIT_CODE=0\n${loadTemplate("shared/init.spec-check.harness.sh")}\nexit $EXIT_CODE`;
  const env = { ...process.env, ...(rigor ? { HARNESS_RIGOR: rigor } : {}) };
  try {
    return { ok: true, output: execFileSync("bash", ["-c", script], { cwd: TMP, encoding: "utf-8", env }) };
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

describe("init.sh traceability — done features", () => {
  it("passes when every requirement is tagged in a test", () => {
    approvedFeature("done");
    write("tests/login.test.ts", 'it("login/R1: logs in", () => {});\nit("login/R2 login/R3: rejects", () => {});\n');
    expect(runSpecCheck()).toMatchObject({ ok: true });
  });

  it("fails and names requirements without a test", () => {
    approvedFeature("done");
    write("tests/login.test.ts", 'it("login/R1: logs in", () => {});\n');
    const { ok, output } = runSpecCheck();
    expect(ok).toBe(false);
    expect(output).toContain("login: R2, R3 have no test tagged login/R<n>");
  });

  it("fails on a test tag for a requirement that does not exist", () => {
    approvedFeature("done");
    write("tests/login.test.ts", 'it("login/R1 login/R2 login/R3", () => {});\nit("login/R9: ghost", () => {});\n');
    const { ok, output } = runSpecCheck();
    expect(ok).toBe(false);
    expect(output).toContain("login/R9");
    expect(output).toContain("not in specs/login/requirements.md");
  });

  it.each([
    ["tests/test_login.py", "# login/R1 login/R2 login/R3\n"],
    ["pkg/login/login_test.go", "// login/R1 login/R2 login/R3\n"],
    ["src/components/Login.spec.tsx", "// login/R1 login/R2 login/R3\n"],
    ["test/login_spec.rb", "# login/R1 login/R2 login/R3\n"],
  ])("recognises %s as a test file", (path, content) => {
    approvedFeature("done");
    write(path, content);
    expect(runSpecCheck().ok).toBe(true);
  });

  it("ignores tags outside test files and in excluded folders", () => {
    approvedFeature("done");
    write("src/login.ts", "// login/R1 login/R2 login/R3\n");
    write("node_modules/x/tests/a.test.js", "// login/R1 login/R2 login/R3\n");
    write("specs/login/notes.test.md", "login/R1 login/R2 login/R3\n");
    expect(runSpecCheck().ok).toBe(false);
  });

  it("does not count a tag for a feature with a longer name", () => {
    approvedFeature("done");
    write("tests/a.test.ts", "// xlogin/R1 login2/R2 login/R3\n");
    expect(runSpecCheck().output).toContain("login: R1, R2 have no test");
  });
});

describe("init.sh traceability — in_progress features", () => {
  it("only warns about untested requirements while work is ongoing", () => {
    approvedFeature("in_progress");
    write("tests/login.test.ts", 'it("login/R1", () => {});\n');
    const { ok, output } = runSpecCheck();
    expect(ok).toBe(true);
    expect(output).toContain("[WARN]");
    expect(output).toContain("login: R2, R3 have no test");
  });

  it("still fails on tags for requirements that do not exist", () => {
    approvedFeature("in_progress");
    write("tests/login.test.ts", 'it("login/R4", () => {});\n');
    expect(runSpecCheck().ok).toBe(false);
  });
});

describe("init.sh — rigor levels", () => {
  it("light: missing approval is a warning, not a failure", () => {
    write("specs/login/requirements.md", "## R1\n");
    write("specs/login/design.md", "# D\n");
    write("specs/login/tasks.md", "- [ ] T1\n");
    setFeature("in_progress");
    expect(runSpecCheck("standard").ok).toBe(false);
    const { ok, output } = runSpecCheck("light");
    expect(ok).toBe(true);
    expect(output).toContain("[WARN]");
    expect(output).toContain("not approved");
  });

  it("light: traceability gaps on done features are warnings", () => {
    approvedFeature("done");
    expect(runSpecCheck("light").ok).toBe(true);
  });

  it("strict behaves like standard for the spec check", () => {
    approvedFeature("done");
    expect(runSpecCheck("strict").ok).toBe(false);
  });
});
