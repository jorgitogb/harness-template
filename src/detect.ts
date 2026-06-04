import { existsSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

export type Stack = "python" | "node" | "go" | "rust" | "generic";

export type Framework = "none" | "react" | "astro" | "next" | "fastapi" | "django" | "flask";

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
  // Check Node.js frameworks first (package.json)
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if ("astro" in deps) return "astro";
      if ("next" in deps) return "next";
      if ("react" in deps) return "react";
    } catch {
      // ignore
    }
  }

  // Check Python frameworks (pyproject.toml, requirements.txt)
  const pythonFiles = ["pyproject.toml", "requirements.txt", "requirements.in", "setup.cfg"];
  let pythonDeps = "";
  for (const f of pythonFiles) {
    const fPath = join(cwd, f);
    if (existsSync(fPath)) {
      try {
        pythonDeps += "\n" + readFileSync(fPath, "utf-8");
      } catch {
        // ignore
      }
    }
  }
  if (pythonDeps) {
    const lower = pythonDeps.toLowerCase();
    if (/\bdjango\b/.test(lower)) return "django";
    if (/\bfastapi\b/.test(lower)) return "fastapi";
    if (/\bflask\b/.test(lower)) return "flask";
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
