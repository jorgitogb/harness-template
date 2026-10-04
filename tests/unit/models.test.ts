import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type ModelProfile,
  type AvailabilityDeps,
  MODEL_PROFILES,
  loadProfileTemplate,
  selectRoles,
  resolveRoles,
  buildRoutingConfig,
  parseOpencodeModels,
  parseOpenAIModelList,
  listAvailableModels,
  runModelsCommand,
  PROFILE_PATH,
  ROUTING_PATH,
} from "../../src/models.js";

const TMP = join(import.meta.dirname, "../tmp-models");

const profile: ModelProfile = {
  profile: "test",
  roles: {
    build: ["opencode/a", "saia/b"],
    small: ["opencode/tiny"],
    reviewer: ["saia/c", "saia/d"],
  },
  live: { saia: { url: "https://example.test/v1/models", apiKeyEnv: "SAIA_API_KEY" } },
};

function deps(overrides: Partial<AvailabilityDeps> = {}): AvailabilityDeps {
  return {
    runOpencodeModels: () => "opencode/a\nopencode/tiny\nsaia/b\nsaia/c\n",
    fetchJson: async () => ({ data: [{ id: "b", status: "ready" }, { id: "d", status: "ready" }] }),
    env: { SAIA_API_KEY: "k" },
    ...overrides,
  };
}

describe("profile templates", () => {
  it.each(MODEL_PROFILES.filter((p) => p !== "none") as Array<"free" | "gwdg" | "mixed">)(
    "%s covers every agent role with provider/model ids",
    (name) => {
      const p = loadProfileTemplate(name);
      for (const role of ["build", "plan", "small", "leader", "spec-author", "implementer", "reviewer", "security-auditor", "doc-writer", "perf-analyzer"]) {
        expect(p.roles[role]?.length, role).toBeGreaterThan(0);
        for (const m of p.roles[role]!) expect(m).toMatch(/^[\w.-]+\/\S+$/);
      }
    },
  );

  it("gwdg profile only uses GWDG SAIA models", () => {
    const all = Object.values(loadProfileTemplate("gwdg").roles).flat();
    expect(all.every((m) => m.startsWith("saia/"))).toBe(true);
  });

  it("reviewer uses a different first choice than implementer", () => {
    for (const name of ["free", "gwdg", "mixed"] as const) {
      const p = loadProfileTemplate(name);
      expect(p.roles.reviewer![0]).not.toBe(p.roles.implementer![0]);
    }
  });
});

describe("selectRoles", () => {
  it("keeps base roles and selected agents only", () => {
    const selected = selectRoles(loadProfileTemplate("mixed"), ["leader", "implementer"]);
    expect(Object.keys(selected.roles).sort()).toEqual(["build", "implementer", "leader", "plan", "small"]);
  });
});

describe("resolveRoles", () => {
  it("picks the first available candidate and records skipped ones", () => {
    const res = resolveRoles(profile, new Set(["saia/b", "opencode/tiny", "saia/d"]));
    expect(res).toEqual([
      { role: "build", chosen: "saia/b", skipped: ["opencode/a"] },
      { role: "small", chosen: "opencode/tiny", skipped: [] },
      { role: "reviewer", chosen: "saia/d", skipped: ["saia/c"] },
    ]);
  });

  it("returns null when nothing is available", () => {
    const [build] = resolveRoles(profile, new Set());
    expect(build).toEqual({ role: "build", chosen: null, skipped: ["opencode/a", "saia/b"] });
  });
});

describe("buildRoutingConfig", () => {
  it("maps small to small_model and other roles to agent.<role>.model", () => {
    const cfg = buildRoutingConfig([
      { role: "small", chosen: "opencode/tiny", skipped: [] },
      { role: "build", chosen: "saia/b", skipped: [] },
    ]);
    expect(cfg.small_model).toBe("opencode/tiny");
    expect(cfg.agent).toEqual({ build: { model: "saia/b" } });
  });

  it("preserves unrelated config and agent fields, and leaves missing roles untouched", () => {
    const cfg = buildRoutingConfig(
      [
        { role: "build", chosen: "saia/b", skipped: [] },
        { role: "reviewer", chosen: null, skipped: ["saia/c"] },
      ],
      { theme: "dark", agent: { build: { temperature: 0.2, model: "old/x" }, reviewer: { model: "keep/me" } } },
    );
    expect(cfg.theme).toBe("dark");
    expect(cfg.agent).toEqual({ build: { temperature: 0.2, model: "saia/b" }, reviewer: { model: "keep/me" } });
  });
});

describe("parsers", () => {
  it("parseOpencodeModels ignores non-model lines", () => {
    expect([...parseOpencodeModels("Refreshing cache...\nopencode/big-pickle\n\nsaia/qwen3.5-397b-a17b\n")]).toEqual([
      "opencode/big-pickle",
      "saia/qwen3.5-397b-a17b",
    ]);
  });

  it("parseOpenAIModelList prefixes provider and drops non-ready models", () => {
    const body = { data: [{ id: "x", status: "ready" }, { id: "y", status: "offline" }, { id: "z" }] };
    expect(parseOpenAIModelList(body, "saia")).toEqual(["saia/x", "saia/z"]);
  });

  it("parseOpenAIModelList rejects malformed bodies", () => {
    expect(() => parseOpenAIModelList({ error: "nope" }, "saia")).toThrow();
  });
});

describe("listAvailableModels", () => {
  it("replaces a live provider's models with the live list", async () => {
    const { available, notes } = await listAvailableModels(profile, deps());
    expect([...available].sort()).toEqual(["opencode/a", "opencode/tiny", "saia/b", "saia/d"]);
    expect(notes).toEqual([]);
  });

  it("falls back to opencode's list when the API key is missing", async () => {
    const { available, notes } = await listAvailableModels(profile, deps({ env: {} }));
    expect(available.has("saia/c")).toBe(true);
    expect(notes[0]).toContain("SAIA_API_KEY not set");
  });

  it("falls back to opencode's list when the live fetch fails", async () => {
    const { available, notes } = await listAvailableModels(
      profile,
      deps({ fetchJson: async () => { throw new Error("HTTP 401"); } }),
    );
    expect(available.has("saia/c")).toBe(true);
    expect(notes[0]).toContain("HTTP 401");
  });

  it("still uses live providers when opencode is not installed", async () => {
    const { available, notes } = await listAvailableModels(
      profile,
      deps({ runOpencodeModels: () => { throw new Error("ENOENT"); } }),
    );
    expect([...available].sort()).toEqual(["saia/b", "saia/d"]);
    expect(notes[0]).toContain("ENOENT");
  });
});

describe("runModelsCommand", () => {
  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function setup(existingRouting?: object) {
    mkdirSync(join(TMP, ".opencode"), { recursive: true });
    writeFileSync(join(TMP, PROFILE_PATH), JSON.stringify(profile));
    if (existingRouting) writeFileSync(join(TMP, ROUTING_PATH), JSON.stringify(existingRouting));
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  }

  it("check reports without writing", async () => {
    setup();
    expect(await runModelsCommand(["check"], TMP, deps())).toBe(0);
    expect(() => readFileSync(join(TMP, ROUTING_PATH))).toThrow();
  });

  it("sync writes resolved models and keeps existing config", async () => {
    setup({ theme: "dark" });
    expect(await runModelsCommand(["sync"], TMP, deps())).toBe(0);
    const written = JSON.parse(readFileSync(join(TMP, ROUTING_PATH), "utf-8"));
    expect(written.theme).toBe("dark");
    expect(written.small_model).toBe("opencode/tiny");
    expect(written.agent.build.model).toBe("opencode/a");
    expect(written.agent.reviewer.model).toBe("saia/d");
  });

  it("exits 1 when a role has no available model", async () => {
    setup();
    expect(await runModelsCommand(["check"], TMP, deps({ runOpencodeModels: () => "", env: {} }))).toBe(1);
  });

  it("exits 1 without a profile", async () => {
    mkdirSync(TMP, { recursive: true });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await runModelsCommand(["check"], TMP, deps())).toBe(1);
  });
});
