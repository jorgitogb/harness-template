import * as p from "@clack/prompts";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import { join } from "node:path";

/** Written next to the spec by a human; init.sh refuses in_progress/done features without a matching one. */
export const APPROVAL_FILE = "APPROVED";

export const SPEC_FILES = ["requirements.md", "design.md", "tasks.md"] as const;

const APPROVABLE_STATUSES = ["spec_ready", "in_progress"];

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export type ApproveResult = { ok: true; path: string; hash: string } | { ok: false; error: string };

/**
 * Hash of the spec as approved. Task checkboxes are normalised so ticking
 * tasks does not invalidate the approval; any other change does.
 * Must stay byte-for-byte identical to the Python in init.spec-check.harness.sh.
 */
export function specHash(specDir: string): string {
  const hash = createHash("sha256");
  for (const file of SPEC_FILES) {
    let text = readFileSync(join(specDir, file), "utf-8").replaceAll("\r\n", "\n");
    if (file === "tasks.md") {
      text = text.replace(/^(\s*[-*]\s+)\[[xX]\]/gm, "$1[ ]");
    }
    hash.update(`${file}\0${text}\0`);
  }
  return hash.digest("hex");
}

function featureStatus(cwd: string, name: string): string | undefined {
  const path = join(cwd, "feature_list.json");
  if (!existsSync(path)) return undefined;
  const data = JSON.parse(readFileSync(path, "utf-8")) as { features?: Array<{ name?: string; status?: string }> };
  return data.features?.find((f) => f.name === name)?.status;
}

export function approveSpec(cwd: string, name: string, approver: string, now: Date = new Date()): ApproveResult {
  if (!SAFE_NAME.test(name)) {
    return { ok: false, error: `Invalid feature name "${name}". Use letters, digits, "-" and "_".` };
  }
  const specDir = join(cwd, "specs", name);
  const missing = SPEC_FILES.filter((f) => !existsSync(join(specDir, f)));
  if (missing.length > 0) {
    return { ok: false, error: `specs/${name}/ is missing ${missing.join(", ")}` };
  }

  let status: string | undefined;
  try {
    status = featureStatus(cwd, name);
  } catch (err) {
    return { ok: false, error: `Cannot read feature_list.json: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (status !== undefined && !APPROVABLE_STATUSES.includes(status)) {
    return { ok: false, error: `Feature "${name}" is ${status}; only ${APPROVABLE_STATUSES.join(" or ")} features can be approved.` };
  }

  const hash = specHash(specDir);
  const path = join(specDir, APPROVAL_FILE);
  writeFileSync(
    path,
    [
      `# Written by \`npx @jorgegb/harness-init approve ${name}\`. Do not edit by hand.`,
      `# Any change to requirements.md, design.md or tasks.md (except ticking tasks) invalidates it.`,
      `sha256: ${hash}`,
      `approved_by: ${approver}`,
      `approved_at: ${now.toISOString()}`,
      "",
    ].join("\n"),
    "utf-8",
  );
  return { ok: true, path, hash };
}

function currentApprover(cwd: string): string {
  try {
    const name = execFileSync("git", ["config", "user.name"], { cwd, encoding: "utf-8" }).trim();
    if (name) return name;
  } catch {
    // not a git repo or no user.name — fall back to the OS user
  }
  return userInfo().username;
}

/** `harness-init approve <feature> [--yes]` — the human's explicit sign-off on a spec. */
export async function runApproveCommand(args: string[], cwd: string): Promise<number> {
  const name = args.find((a) => !a.startsWith("-"));
  if (!name) {
    console.error("Usage: npx @jorgegb/harness-init approve <feature> [--yes]");
    return 1;
  }

  if (!args.includes("--yes")) {
    if (!process.stdin.isTTY) {
      console.error("Error: approval must be confirmed interactively (or pass --yes).");
      return 1;
    }
    const confirmed = await p.confirm({
      message: `Approve specs/${name}/ (requirements, design, tasks) for implementation?`,
      initialValue: false,
    });
    if (p.isCancel(confirmed) || !confirmed) {
      console.log("Not approved.");
      return 1;
    }
  }

  const result = approveSpec(cwd, name, currentApprover(cwd));
  if (!result.ok) {
    console.error(`Error: ${result.error}`);
    return 1;
  }
  console.log(`Approved specs/${name}/ (sha256 ${result.hash.slice(0, 12)}…). Tell the leader to continue.`);
  return 0;
}
