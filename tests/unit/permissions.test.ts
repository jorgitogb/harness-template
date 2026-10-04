import { describe, it, expect } from "vitest";
import { agentPermissions, permissionYaml, type Permission } from "../../src/permissions.js";

const ALL = ["leader", "spec-author", "implementer", "reviewer", "security-auditor", "doc-writer", "perf-analyzer"];

function perms(overrides: Partial<Parameters<typeof agentPermissions>[0]> = {}) {
  return agentPermissions({ stack: "node", framework: "none", specLayer: "harness", agents: ALL, ...overrides });
}

/** Same last-matching-rule-wins evaluation opencode applies; `*` matches anything, missing → ask. */
function evaluate(rules: Permission | undefined, target: string): string {
  if (rules === undefined) return "ask";
  if (typeof rules === "string") return rules;
  let result = "ask";
  for (const [pattern, action] of Object.entries(rules)) {
    const re = new RegExp("^" + pattern.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
    if (re.test(target)) result = action;
  }
  return result;
}

describe("agentPermissions — implementer", () => {
  it("can edit production code, tests and progress notes", () => {
    const { edit } = perms().implementer!;
    for (const path of ["src/app.ts", "tests/unit/app.test.ts", "progress/impl_x.md"]) {
      expect(evaluate(edit, path)).toBe("allow");
    }
  });

  it("can tick tasks.md but not rewrite requirements or design", () => {
    const { edit } = perms().implementer!;
    expect(evaluate(edit, "specs/login/tasks.md")).toBe("allow");
    expect(evaluate(edit, "specs/login/requirements.md")).toBe("deny");
    expect(evaluate(edit, "specs/login/design.md")).toBe("deny");
  });

  it("cannot edit harness control files", () => {
    const { edit } = perms().implementer!;
    for (const path of ["feature_list.json", "init.sh", "ground-rules.md", "CHECKPOINTS.md", "AGENTS.md", "opencode.jsonc", ".opencode/agent/reviewer.md"]) {
      expect(evaluate(edit, path)).toBe("deny");
    }
  });

  it("protects openspec proposals and specs but allows tasks.md under the openspec layer", () => {
    const { edit } = perms({ specLayer: "openspec" }).implementer!;
    expect(evaluate(edit, "openspec/changes/add-login/tasks.md")).toBe("allow");
    expect(evaluate(edit, "openspec/changes/add-login/proposal.md")).toBe("deny");
    expect(evaluate(edit, "openspec/specs/auth/spec.md")).toBe("deny");
  });

  it("runs the stack's verification commands without asking", () => {
    const { bash } = perms().implementer!;
    for (const cmd of ["pnpm test", "pnpm test tests/unit/a.test.ts", "pnpm typecheck", "./init.sh", "git status", "git diff --stat"]) {
      expect(evaluate(bash, cmd)).toBe("allow");
    }
  });

  it("asks before any other command and never pushes", () => {
    const { bash } = perms().implementer!;
    expect(evaluate(bash, "pnpm add left-pad")).toBe("ask");
    expect(evaluate(bash, "curl https://example.com")).toBe("ask");
    expect(evaluate(bash, "git push")).toBe("deny");
    expect(evaluate(bash, "git push --force origin main")).toBe("deny");
  });

  it("uses stack-specific test commands", () => {
    expect(evaluate(perms({ stack: "python" }).implementer!.bash, "pytest -q")).toBe("allow");
    expect(evaluate(perms({ stack: "go" }).implementer!.bash, "go test ./...")).toBe("allow");
    expect(evaluate(perms({ stack: "rust" }).implementer!.bash, "cargo test")).toBe("allow");
    expect(evaluate(perms({ stack: "node", framework: "astro" }).implementer!.bash, "pnpm astro check")).toBe("allow");
    expect(evaluate(perms({ stack: "python" }).implementer!.bash, "pnpm test")).toBe("ask");
  });
});

describe("agentPermissions — reviewer", () => {
  it("can run tests and read-only git, nothing else", () => {
    const { bash } = perms().reviewer!;
    for (const cmd of ["pnpm test", "./init.sh", "git log --oneline", "git diff HEAD~1"]) {
      expect(evaluate(bash, cmd)).toBe("allow");
    }
    for (const cmd of ["rm -rf src", "git commit -m x", "git push", "pnpm add x"]) {
      expect(evaluate(bash, cmd)).toBe("deny");
    }
  });

  it("can only write its review into progress/", () => {
    const { edit } = perms().reviewer!;
    expect(evaluate(edit, "progress/review_login.md")).toBe("allow");
    for (const path of ["src/app.ts", "tests/app.test.ts", "specs/login/tasks.md", "feature_list.json"]) {
      expect(evaluate(edit, path)).toBe("deny");
    }
  });
});

describe("agentPermissions — leader", () => {
  it("keeps its task allowlist with the deny-all first", () => {
    const task = perms({ agents: ["leader", "implementer"] }).leader!.task as Record<string, string>;
    expect(task).toEqual({ "*": "deny", explore: "allow", implementer: "allow" });
  });

  it("only returns selected agents", () => {
    expect(Object.keys(perms({ agents: ["leader", "reviewer"] }))).toEqual(["leader", "reviewer"]);
  });
});

describe("agentPermissions — approval gate", () => {
  it("no agent can write a spec approval file", () => {
    for (const [agent, p] of Object.entries(perms())) {
      expect(evaluate(p.edit, "specs/login/APPROVED"), agent).toBe("deny");
    }
  });

  it("no agent can run the approve command", () => {
    for (const cmd of ["npx @jorgegb/harness-init approve login", "pnpm dlx @jorgegb/harness-init approve login --yes"]) {
      for (const [agent, p] of Object.entries(perms())) {
        expect(evaluate(p.bash, cmd), `${agent}: ${cmd}`).toBe("deny");
      }
    }
  });

  it("the leader still asks for other commands", () => {
    expect(evaluate(perms().leader!.bash, "git status")).toBe("ask");
  });
});

describe("permissionYaml", () => {
  it("renders shorthand and pattern rules as frontmatter, preserving order", () => {
    expect(permissionYaml({ edit: "deny", bash: { "*": "deny", "git log": "allow" } })).toBe(
      'permission:\n  edit: deny\n  bash:\n    "*": deny\n    "git log": allow',
    );
  });
});
