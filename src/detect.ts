import { existsSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

export type Stack = "python" | "node" | "go" | "rust" | "generic";

export type Framework = "none" | "react" | "astro" | "next";

export type Cli = "opencode" | "claude" | "codex";

export interface DetectResult {
  stack: Stack;
  framework: Framework;
  cli: Cli | null;
  harnessExists: boolean;
  projectName: string;
  isGitRepo: boolean;
}

export function detectStack(cwd: string): Stack {
  if (existsSync(join(cwd, "pyproject.toml")) || existsSync(join(cwd, "requirements.txt")) || existsSync(join(cwd, "setup.py"))) {
    return "python";
  }
  if (existsSync(join(cwd, "package.json"))) {
    return "node";
  }
  if (existsSync(join(cwd, "go.mod"))) {
    return "go";
  }
  if (existsSync(join(cwd, "Cargo.toml"))) {
    return "rust";
  }
  return "generic";
}

export function detectCli(cwd: string): Cli | null {
  if (existsSync(join(cwd, "opencode.json")) || existsSync(join(cwd, "opencode.jsonc")) || existsSync(join(cwd, ".opencode"))) {
    return "opencode";
  }
  if (existsSync(join(cwd, ".claude"))) {
    return "claude";
  }
  return null;
}

export function detectHarness(cwd: string): boolean {
  const indicators = [
    "AGENTS.md",
    "feature_list.json",
    "init.sh",
    "CHECKPOINTS.md",
    "ground-rules.md",
  ];
  return indicators.every((f) => existsSync(join(cwd, f)));
}

export function detectProjectName(cwd: string): string {
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.name) return pkg.name;
    } catch {
      // ignore
    }
  }
  return basename(cwd);
}

export function detectGitRepo(cwd: string): boolean {
  return existsSync(join(cwd, ".git"));
}

export function detectFramework(cwd: string): Framework {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return "none";
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if ("astro" in deps) return "astro";
    if ("next" in deps) return "next";
    if ("react" in deps) return "react";
  } catch {
    // ignore
  }
  return "none";
}

export function detect(cwd: string): DetectResult {
  return {
    stack: detectStack(cwd),
    framework: detectFramework(cwd),
    cli: detectCli(cwd),
    harnessExists: detectHarness(cwd),
    projectName: detectProjectName(cwd),
    isGitRepo: detectGitRepo(cwd),
  };
}
