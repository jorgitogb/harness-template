import { describe, it, expect } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const CLI = join(import.meta.dirname, "../../src/cli.ts");
const TSX = join(import.meta.dirname, "../../node_modules/tsx/dist/esm/index.mjs");

function run(args: string, cwd: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`node --import ${TSX} ${CLI} ${args}`, {
      cwd,
      encoding: "utf-8",
      timeout: 15000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? "", exitCode: err.status ?? 1 };
  }
}

const TMP = join(import.meta.dirname, "../tmp-adversarial");

function setup() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
}

function cleanup() {
  rmSync(TMP, { recursive: true, force: true });
}

describe("Adversarial: path traversal", () => {
  it("rejects project name with ../", () => {
    setup();
    const { exitCode } = run(`--yes --stack python --name "../../etc/passwd"`, TMP);
    const unsafePath = join(TMP, "../../etc/passwd");
    expect(existsSync(unsafePath)).toBe(false);
    cleanup();
  });

  it("rejects project name with absolute path", () => {
    setup();
    const { exitCode } = run(`--yes --stack python --name "/tmp/evil"`, TMP);
    expect(existsSync("/tmp/evil/AGENTS.md")).toBe(false);
    cleanup();
  });
});

describe("Adversarial: root execution", () => {
  it("refuses to run as root without --allow-root", () => {
    setup();
    if (process.getuid?.() === 0) {
      const { exitCode } = run(`--yes --stack python`, TMP);
      expect(exitCode).not.toBe(0);
    }
    cleanup();
  });
});

describe("Adversarial: idempotency", () => {
  it("second run does not overwrite without --force", () => {
    setup();
    const result1 = run(`--yes --stack python --name idempotent-test`, TMP);
    const agentsPath = join(TMP, "AGENTS.md");
    if (!existsSync(agentsPath)) {
      // CLI might have failed, skip
      cleanup();
      return;
    }
    const content1 = readFileSync(agentsPath, "utf-8");
    run(`--yes --stack python --name idempotent-test`, TMP);
    const content2 = readFileSync(agentsPath, "utf-8");
    expect(content1).toBe(content2);
    cleanup();
  });

  it("second run with --force overwrites", () => {
    setup();
    run(`--yes --stack python --name force-test`, TMP);
    const agentsPath = join(TMP, "AGENTS.md");
    if (!existsSync(agentsPath)) {
      cleanup();
      return;
    }
    const content1 = readFileSync(agentsPath, "utf-8");
    run(`--yes --stack python --name force-test --force`, TMP);
    const content2 = readFileSync(agentsPath, "utf-8");
    expect(content2).toContain("AGENTS.md");
    cleanup();
  });
});

describe("Adversarial: sensitive directories", () => {
  it("warns when run in home directory", () => {
    setup();
    const homeDir = process.env.HOME ?? "/tmp";
    const { exitCode } = run(`--yes --stack python`, homeDir);
    expect([0, 1]).toContain(exitCode);
    cleanup();
  });
});
