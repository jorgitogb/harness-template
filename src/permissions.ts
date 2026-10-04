import type { Framework, Stack } from "./detect.js";
import type { Rigor, SpecLayer } from "./plan.js";

export type Action = "allow" | "ask" | "deny";

/** opencode permission value: shorthand, or ordered pattern → action rules (last match wins). */
export type Permission = Action | Record<string, Action>;

export type AgentPermission = Record<string, Permission>;

export interface PermissionInput {
  stack: Stack;
  framework: Framework;
  specLayer: SpecLayer;
  rigor?: Rigor;
  agents: string[];
}

const AGENT_ORDER = ["leader", "spec-author", "implementer", "reviewer", "security-auditor", "doc-writer", "perf-analyzer"];

/** opencode's built-in read-only explorer, used by the leader for complex tasks. */
const BUILTIN_SUBAGENTS = ["explore"];

/** Files that define the process itself. Only the human (or the leader, for status) changes them. */
const HARNESS_CONTROL_FILES = [
  "feature_list.json",
  "init.sh",
  "ground-rules.md",
  "CHECKPOINTS.md",
  "AGENTS.md",
  "opencode.jsonc",
  ".opencode/**",
];

const STACK_VERIFY_COMMANDS: Record<Stack, string[]> = {
  node: ["pnpm test", "pnpm typecheck", "pnpm lint"],
  python: ["pytest", "python -m pytest", "uv run pytest"],
  go: ["go test", "go vet", "go build"],
  rust: ["cargo test", "cargo check", "cargo clippy", "cargo build"],
  generic: [],
};

const FRAMEWORK_VERIFY_COMMANDS: Partial<Record<Framework, string[]>> = {
  astro: ["pnpm astro check"],
};

/** Spec approval is the human's act: agents may neither write the file nor run the command. */
const APPROVAL_EDIT_RULES: Record<string, Action> = { "specs/*/APPROVED": "deny" };
const APPROVAL_BASH_RULES: Record<string, Action> = { "*harness-init approve*": "deny" };

/** Append the approval-gate denies last so no earlier allow can override them. */
function withApprovalGate(permission: AgentPermission): AgentPermission {
  const deny = (value: Permission | undefined, rules: Record<string, Action>): Permission | undefined => {
    if (value === undefined || value === "deny") return value;
    return typeof value === "string" ? { "*": value, ...rules } : { ...value, ...rules };
  };
  return { ...permission, edit: deny(permission.edit, APPROVAL_EDIT_RULES)!, bash: deny(permission.bash, APPROVAL_BASH_RULES)! };
}

const READ_ONLY_GIT = ["git status", "git diff", "git log", "git show"];

/** Each command with and without arguments, since `cmd *` does not match a bare `cmd`. */
function commandRules(commands: string[], action: Action): Record<string, Action> {
  return Object.fromEntries(commands.flatMap((c) => [[c, action], [`${c} *`, action]]));
}

function verifyCommands(stack: Stack, framework: Framework): string[] {
  return ["./init.sh", ...STACK_VERIFY_COMMANDS[stack], ...(FRAMEWORK_VERIFY_COMMANDS[framework] ?? []), ...READ_ONLY_GIT];
}

/** The implementer may tick tasks but not rewrite the approved spec it is implementing. */
function specRules(specLayer: SpecLayer): Record<string, Action> {
  return specLayer === "openspec"
    ? { "openspec/**": "deny", "openspec/changes/*/tasks.md": "allow" }
    : { "specs/**": "deny", "specs/*/tasks.md": "allow" };
}

function leaderTask(agents: string[]): Record<string, Action> {
  const allowed = [...BUILTIN_SUBAGENTS, ...AGENT_ORDER.filter((a) => a !== "leader" && agents.includes(a))];
  return { "*": "deny", ...Object.fromEntries(allowed.map((a) => [a, "allow" as const])) };
}

/** Permissions for the selected agents. Rule order matters: broad rules first, exceptions last. */
export function agentPermissions(input: PermissionInput): Record<string, AgentPermission> {
  const verify = verifyCommands(input.stack, input.framework);
  const noCodeEdits: Permission = { "src/**": "deny", "tests/**": "deny" };

  // Strict: anything that is not a verification command is denied instead of asked.
  const otherCommands: Action = input.rigor === "strict" ? "deny" : "ask";
  const leaderBash: Permission =
    input.rigor === "strict" ? { "*": "deny", ...commandRules(["./init.sh", ...READ_ONLY_GIT], "allow") } : "ask";

  const all: Record<string, AgentPermission> = {
    leader: { edit: noCodeEdits, bash: leaderBash, task: leaderTask(input.agents) },
    "spec-author": { edit: noCodeEdits, bash: "deny" },
    implementer: {
      edit: {
        "*": "allow",
        ...specRules(input.specLayer),
        ...Object.fromEntries(HARNESS_CONTROL_FILES.map((f) => [f, "deny" as const])),
      },
      bash: { "*": otherCommands, ...commandRules(verify, "allow"), ...commandRules(["git push"], "deny") },
    },
    reviewer: {
      edit: { "*": "deny", "progress/**": "allow" },
      bash: { "*": "deny", ...commandRules(verify, "allow") },
    },
    "security-auditor": { edit: "deny", bash: "deny" },
    "doc-writer": { edit: noCodeEdits, bash: "deny" },
    "perf-analyzer": { edit: "deny", bash: "deny" },
  };

  return Object.fromEntries(AGENT_ORDER.filter((a) => input.agents.includes(a)).map((a) => [a, withApprovalGate(all[a]!)]));
}

/** Render as the `permission:` block of an opencode agent's YAML frontmatter. */
export function permissionYaml(permission: AgentPermission): string {
  const lines = ["permission:"];
  for (const [tool, value] of Object.entries(permission)) {
    if (typeof value === "string") {
      lines.push(`  ${tool}: ${value}`);
      continue;
    }
    lines.push(`  ${tool}:`);
    for (const [pattern, action] of Object.entries(value)) {
      lines.push(`    ${JSON.stringify(pattern)}: ${action}`);
    }
  }
  return lines.join("\n");
}
