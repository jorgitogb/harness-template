import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, chmodSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { render } from "../../src/render.js";
import { join } from "node:path";
import { approveSpec } from "../../src/approve.js";
// @ts-expect-error — plain JS plugin shipped as a template
import { HarnessGuard } from "../../templates/opencode/plugins/harness-guard.js";

const TMP = join(import.meta.dirname, "../tmp-guard");

type Call = { kind: string; args: any };

function fakeClient(parents: Record<string, string | undefined> = {}) {
  const calls: Call[] = [];
  return {
    calls,
    client: {
      app: { log: async (args: any) => void calls.push({ kind: "log", args }) },
      tui: { showToast: async (args: any) => void calls.push({ kind: "toast", args }) },
      session: {
        get: async ({ path }: any) => ({ data: { id: path.id, parentID: parents[path.id] } }),
        prompt: async (args: any) => void calls.push({ kind: "prompt", args }),
      },
    },
  };
}

async function guard(parents: Record<string, string | undefined> = {}) {
  const fake = fakeClient(parents);
  const hooks = await HarnessGuard({ directory: TMP, worktree: TMP, client: fake.client, project: {}, $: undefined });
  const before = (tool: string, args: any, sessionID = "s1") =>
    hooks["tool.execute.before"]({ tool, sessionID, callID: "c" }, { args });
  const after = (tool: string, args: any, sessionID = "s1") =>
    hooks["tool.execute.after"]({ tool, sessionID, callID: "c", args }, { title: "", output: "", metadata: {} });
  const idle = (sessionID = "s1") => hooks.event({ event: { type: "session.idle", properties: { sessionID } } });
  return { before, after, idle, calls: fake.calls };
}

function feature(status: string, sdd = true) {
  writeFileSync(join(TMP, "feature_list.json"), JSON.stringify({ features: [{ id: 1, name: "login", sdd, status }] }));
}

function spec() {
  const dir = join(TMP, "specs/login");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "requirements.md"), "- R1: login\n");
  writeFileSync(join(dir, "design.md"), "# Design\n");
  writeFileSync(join(dir, "tasks.md"), "- [ ] T1\n");
}

function approvedFeature() {
  spec();
  feature("spec_ready");
  approveSpec(TMP, "login", "Ada");
  feature("in_progress");
}

function initScript(exitCode: number) {
  writeFileSync(join(TMP, "init.sh"), `#!/usr/bin/env bash\necho "[FAIL]  tests red"\nexit ${exitCode}\n`);
  chmodSync(join(TMP, "init.sh"), 0o755);
}

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  delete process.env.HARNESS_GUARD;
});

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  delete process.env.HARNESS_GUARD;
});

describe("harness-guard — code edit gate", () => {
  it("blocks code edits when no feature is in_progress", async () => {
    feature("pending");
    const { before } = await guard();
    await expect(before("edit", { filePath: "src/app.ts" })).rejects.toThrow(/no feature is in_progress/);
  });

  it.each(["specs/login/requirements.md", "progress/current.md", "docs/architecture.md", "feature_list.json", "README.md", "openspec/changes/x/proposal.md"])(
    "always allows non-code path %s",
    async (filePath) => {
      feature("pending");
      const { before } = await guard();
      await expect(before("write", { filePath })).resolves.toBeUndefined();
    },
  );

  it("tells a blocked agent to stop and ask the human instead of working around the gate", async () => {
    feature("pending");
    const { before } = await guard();
    const error = await before("edit", { filePath: "src/app.ts" }).catch((e: Error) => e);
    expect(error.message).toContain("Stop and tell the human");
    expect(error.message).toMatch(/do not create features, write specs or change feature status/i);
  });

  it("blocks code edits for an in_progress feature whose spec is not approved", async () => {
    spec();
    feature("in_progress");
    const { before } = await guard();
    await expect(before("edit", { filePath: "src/app.ts" })).rejects.toThrow(/harness-init approve login/);
  });

  it("allows code edits for an approved in_progress feature (hash matches approve.ts)", async () => {
    approvedFeature();
    const { before } = await guard();
    await expect(before("edit", { filePath: "src/app.ts" })).resolves.toBeUndefined();
    await expect(before("write", { filePath: join(TMP, "tests/app.test.ts") })).resolves.toBeUndefined();
  });

  it("still allows code edits after tasks are ticked", async () => {
    approvedFeature();
    writeFileSync(join(TMP, "specs/login/tasks.md"), "- [x] T1\n");
    const { before } = await guard();
    await expect(before("edit", { filePath: "src/app.ts" })).resolves.toBeUndefined();
  });

  it("blocks code edits once the spec changed after approval", async () => {
    approvedFeature();
    writeFileSync(join(TMP, "specs/login/requirements.md"), "- R1: login\n- R2: sneaky\n");
    const { before } = await guard();
    await expect(before("edit", { filePath: "src/app.ts" })).rejects.toThrow(/changed after approval/);
  });

  it("allows code edits for an in_progress feature with sdd: false", async () => {
    feature("in_progress", false);
    const { before } = await guard();
    await expect(before("edit", { filePath: "src/app.ts" })).resolves.toBeUndefined();
  });

  it("checks every path in an apply_patch, including move targets", async () => {
    feature("pending");
    const { before } = await guard();
    const patch = "*** Begin Patch\n*** Update File: docs/a.md\n*** Move to: src/a.ts\n@@\n-x\n+y\n*** End Patch";
    await expect(before("apply_patch", { patchText: patch })).rejects.toThrow(/src\/a\.ts/);
  });

  it("is disabled when the human starts opencode with HARNESS_GUARD=off", async () => {
    feature("pending");
    process.env.HARNESS_GUARD = "off";
    const { before } = await guard();
    await expect(before("edit", { filePath: "src/app.ts" })).resolves.toBeUndefined();
  });
});

describe("harness-guard — strict rigor", () => {
  it("ignores HARNESS_GUARD=off when rendered with the escape hatch disabled", async () => {
    feature("pending");
    process.env.HARNESS_GUARD = "off";
    const source = readFileSync(join(import.meta.dirname, "../../templates/opencode/plugins/harness-guard.js"), "utf-8");
    const strictPath = join(TMP, "harness-guard.strict.mjs");
    writeFileSync(strictPath, render(source, { GUARD_ESCAPE_HATCH: "disabled" } as any));
    const { HarnessGuard: StrictGuard } = await import(pathToFileURL(strictPath).href);
    const hooks = await StrictGuard({ directory: TMP, worktree: TMP, client: fakeClient().client, project: {} });
    await expect(
      hooks["tool.execute.before"]({ tool: "edit", sessionID: "s", callID: "c" }, { args: { filePath: "src/app.ts" } }),
    ).rejects.toThrow(/no feature is in_progress/);
  });
});

describe("harness-guard — approval protection", () => {
  it("never lets an agent write an approval file, even for an approved feature", async () => {
    approvedFeature();
    const { before } = await guard();
    await expect(before("write", { filePath: "specs/login/APPROVED" })).rejects.toThrow(/Only a human can approve/);
  });

  it.each([
    "npx @jorgegb/harness-init approve login --yes",
    "echo 'sha256: abc' > specs/login/APPROVED",
    "cp /tmp/x specs/login/APPROVED",
    "tee specs/login/APPROVED < /tmp/x",
  ])("blocks bash: %s", async (command) => {
    const { before } = await guard();
    await expect(before("bash", { command })).rejects.toThrow(/Only a human can approve/);
  });

  it("allows reading an approval file from bash", async () => {
    const { before } = await guard();
    await expect(before("bash", { command: "cat specs/login/APPROVED" })).resolves.toBeUndefined();
  });
});

describe("harness-guard — init.sh on idle", () => {
  it("does nothing when the session did not edit code", async () => {
    approvedFeature();
    initScript(1);
    const { idle, calls } = await guard();
    await idle();
    expect(calls.filter((c) => c.kind === "prompt")).toHaveLength(0);
  });

  it("asks a top-level session to fix a failing init.sh, with the output tail", async () => {
    approvedFeature();
    initScript(1);
    const { after, idle, calls } = await guard();
    await after("edit", { filePath: "src/app.ts" });
    await idle();
    const prompts = calls.filter((c) => c.kind === "prompt");
    expect(prompts).toHaveLength(1);
    expect(prompts[0]!.args.path.id).toBe("s1");
    expect(prompts[0]!.args.body.parts[0].text).toContain("tests red");
  });

  it("strips terminal colour codes from the init.sh output it sends", async () => {
    approvedFeature();
    writeFileSync(join(TMP, "init.sh"), '#!/usr/bin/env bash\nprintf "\\033[0;31m[FAIL]\\033[0m  tests red\\n"\nexit 1\n');
    chmodSync(join(TMP, "init.sh"), 0o755);
    const { after, idle, calls } = await guard();
    await after("edit", { filePath: "src/app.ts" });
    await idle();
    const text: string = calls.find((c) => c.kind === "prompt")!.args.body.parts[0].text;
    expect(text).toContain("[FAIL]  tests red");
    expect(text).not.toContain("\u001b");
  });

  it("gives up after two attempts and leaves it to the human", async () => {
    approvedFeature();
    initScript(1);
    const { after, idle, calls } = await guard();
    for (let i = 0; i < 4; i++) {
      await after("edit", { filePath: "src/app.ts" });
      await idle();
    }
    expect(calls.filter((c) => c.kind === "prompt")).toHaveLength(2);
    expect(calls.some((c) => c.kind === "toast" && /human/i.test(c.args.body.message))).toBe(true);
  });

  it("only shows a toast for sub-agent sessions", async () => {
    approvedFeature();
    initScript(1);
    const { after, idle, calls } = await guard({ child: "s1" });
    await after("edit", { filePath: "src/app.ts" }, "child");
    await idle("child");
    expect(calls.filter((c) => c.kind === "prompt")).toHaveLength(0);
    expect(calls.some((c) => c.kind === "toast")).toBe(true);
  });

  it("does not prompt when init.sh passes", async () => {
    approvedFeature();
    initScript(0);
    const { after, idle, calls } = await guard();
    await after("edit", { filePath: "src/app.ts" });
    await idle();
    expect(calls.filter((c) => c.kind === "prompt")).toHaveLength(0);
  });
});
