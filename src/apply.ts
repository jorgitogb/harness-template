import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { FileAction } from "./plan.js";

export interface ApplyResult {
  written: string[];
  skipped: string[];
  appended: string[];
  errors: string[];
}

function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function applyPlan(
  actions: FileAction[],
  cwd: string,
  onConflict?: (path: string, existingContent: string, newContent: string) => Promise<"overwrite" | "skip">
): Promise<ApplyResult> {
  const result: ApplyResult = { written: [], skipped: [], appended: [], errors: [] };

  return (async () => {
    for (const action of actions) {
      const fullPath = join(cwd, action.path);

      if (action.exists === "skip") {
        if (onConflict) {
          const existing = readFileSync(fullPath, "utf-8");
          const decision = await onConflict(action.path, existing, action.content);
          if (decision === "skip") {
            result.skipped.push(action.path);
            continue;
          }
        } else {
          result.skipped.push(action.path);
          continue;
        }
      }

      try {
        ensureDir(fullPath);

        if (action.mode === "append" && existsSync(fullPath)) {
          const existing = readFileSync(fullPath, "utf-8");
          writeFileSync(fullPath, existing + "\n" + action.content, "utf-8");
          result.appended.push(action.path);
        } else {
          writeFileSync(fullPath, action.content, "utf-8");
          result.written.push(action.path);
        }
      } catch (err) {
        result.errors.push(`${action.path}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return result;
  })();
}

export function printResult(result: ApplyResult): void {
  console.log("");
  if (result.written.length > 0) {
    console.log("Written:");
    for (const f of result.written) {
      console.log(`  + ${f}`);
    }
  }
  if (result.appended.length > 0) {
    console.log("Appended:");
    for (const f of result.appended) {
      console.log(`  ~ ${f}`);
    }
  }
  if (result.skipped.length > 0) {
    console.log("Skipped (already exists):");
    for (const f of result.skipped) {
      console.log(`  - ${f}`);
    }
  }
  if (result.errors.length > 0) {
    console.log("Errors:");
    for (const e of result.errors) {
      console.log(`  ! ${e}`);
    }
  }
  console.log("");
}
