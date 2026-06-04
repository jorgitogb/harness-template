import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { detectStack, detectCli, detectHarness, detectProjectName, detectGitRepo, detect } from "../../src/detect.js";

const TMP = join(import.meta.dirname, "../tmp-detect");

function setup(files: string[]) {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  for (const f of files) {
    const full = join(TMP, f);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, "");
  }
}

function cleanup() {
  rmSync(TMP, { recursive: true, force: true });
}

describe("detectStack", () => {
  it("detects Python from pyproject.toml", () => {
    setup(["pyproject.toml"]);
    expect(detectStack(TMP)).toBe("python");
    cleanup();
  });

  it("detects Python from requirements.txt", () => {
    setup(["requirements.txt"]);
    expect(detectStack(TMP)).toBe("python");
    cleanup();
  });

  it("detects Node from package.json", () => {
    setup(["package.json"]);
    expect(detectStack(TMP)).toBe("node");
    cleanup();
  });

  it("detects Go from go.mod", () => {
    setup(["go.mod"]);
    expect(detectStack(TMP)).toBe("go");
    cleanup();
  });

  it("detects Rust from Cargo.toml", () => {
    setup(["Cargo.toml"]);
    expect(detectStack(TMP)).toBe("rust");
    cleanup();
  });

  it("defaults to generic when no indicators found", () => {
    setup([]);
    expect(detectStack(TMP)).toBe("generic");
    cleanup();
  });
});

describe("detectCli", () => {
  it("detects opencode from opencode.json", () => {
    setup(["opencode.json"]);
    expect(detectCli(TMP)).toBe("opencode");
    cleanup();
  });

  it("detects opencode from .opencode dir", () => {
    setup([".opencode/agent/leader.md"]);
    expect(detectCli(TMP)).toBe("opencode");
    cleanup();
  });

  it("detects claude from .claude dir", () => {
    setup([".claude/settings.json"]);
    expect(detectCli(TMP)).toBe("claude");
    cleanup();
  });

  it("returns null when no CLI detected", () => {
    setup([]);
    expect(detectCli(TMP)).toBeNull();
    cleanup();
  });
});

describe("detectHarness", () => {
  it("returns true when all indicators exist", () => {
    setup(["AGENTS.md", "feature_list.json", "init.sh", "CHECKPOINTS.md", "ground-rules.md"]);
    expect(detectHarness(TMP)).toBe(true);
    cleanup();
  });

  it("returns false when any indicator is missing", () => {
    setup(["AGENTS.md", "feature_list.json"]);
    expect(detectHarness(TMP)).toBe(false);
    cleanup();
  });
});

describe("detectProjectName", () => {
  it("reads name from package.json", () => {
    setup(["package.json"]);
    writeFileSync(join(TMP, "package.json"), JSON.stringify({ name: "my-app" }));
    expect(detectProjectName(TMP)).toBe("my-app");
    cleanup();
  });

  it("falls back to directory name", () => {
    setup([]);
    expect(detectProjectName(TMP)).toBe("tmp-detect");
    cleanup();
  });
});

describe("detectGitRepo", () => {
  it("returns true when .git exists", () => {
    setup([".git"]);
    expect(detectGitRepo(TMP)).toBe(true);
    cleanup();
  });

  it("returns false when .git missing", () => {
    setup([]);
    expect(detectGitRepo(TMP)).toBe(false);
    cleanup();
  });
});

describe("detect (full)", () => {
  it("returns complete detection result", () => {
    setup(["package.json", ".git"]);
    writeFileSync(join(TMP, "package.json"), JSON.stringify({ name: "test-app" }));
    const result = detect(TMP);
    expect(result.stack).toBe("node");
    expect(result.projectName).toBe("test-app");
    expect(result.isGitRepo).toBe(true);
    expect(result.harnessExists).toBe(false);
    cleanup();
  });
});
