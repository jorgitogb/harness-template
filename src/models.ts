import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadTemplate } from "./render.js";

export type ModelProfileName = "none" | "free" | "gwdg" | "mixed";

export const MODEL_PROFILES: ModelProfileName[] = ["none", "free", "gwdg", "mixed"];

/** Roles that always get a model: opencode's primary agents plus small_model. */
export const BASE_ROLES = ["build", "plan", "small"];

export const PROFILE_PATH = ".opencode/models.json";
export const ROUTING_PATH = ".opencode/opencode.json";

export interface LiveSource {
  url: string;
  apiKeyEnv: string;
}

export interface ModelProfile {
  $comment?: string;
  profile: string;
  /** Role -> ordered model candidates, `provider/model-id`. First available wins. */
  roles: Record<string, string[]>;
  /** Providers whose model list is fetched live (OpenAI-compatible /models) instead of trusted from `opencode models`. */
  live?: Record<string, LiveSource>;
}

export interface RoleResolution {
  role: string;
  chosen: string | null;
  /** Candidates ranked before `chosen` that were not available. */
  skipped: string[];
}

export function loadProfileTemplate(name: Exclude<ModelProfileName, "none">): ModelProfile {
  return JSON.parse(loadTemplate(`models/${name}.json`)) as ModelProfile;
}

/** Keep only the roles relevant to the selected agents. */
export function selectRoles(profile: ModelProfile, agents: string[]): ModelProfile {
  const wanted = new Set([...BASE_ROLES, ...agents]);
  const roles = Object.fromEntries(Object.entries(profile.roles).filter(([role]) => wanted.has(role)));
  return { ...profile, roles };
}

/** Routing as declared, assuming every first choice is available (used offline at init time). */
export function preferredResolutions(profile: ModelProfile): RoleResolution[] {
  return Object.entries(profile.roles).map(([role, candidates]) => ({
    role,
    chosen: candidates[0] ?? null,
    skipped: [],
  }));
}

export function resolveRoles(profile: ModelProfile, available: Set<string>): RoleResolution[] {
  return Object.entries(profile.roles).map(([role, candidates]) => {
    const idx = candidates.findIndex((m) => available.has(m));
    return {
      role,
      chosen: idx === -1 ? null : (candidates[idx] ?? null),
      skipped: idx === -1 ? [...candidates] : candidates.slice(0, idx),
    };
  });
}

type RoutingConfig = Record<string, unknown> & { agent?: Record<string, Record<string, unknown>> };

/**
 * Merge resolved models into an opencode config object. Only `small_model` and
 * `agent.<role>.model` are touched; everything else in `existing` is preserved.
 * Roles with no available model are left as they were.
 */
export function buildRoutingConfig(resolutions: RoleResolution[], existing: RoutingConfig = {}): RoutingConfig {
  const config: RoutingConfig = { $schema: "https://opencode.ai/config.json", ...existing };
  const agent = { ...(config.agent ?? {}) };
  for (const { role, chosen } of resolutions) {
    if (!chosen) continue;
    if (role === "small") {
      config.small_model = chosen;
    } else {
      agent[role] = { ...(agent[role] ?? {}), model: chosen };
    }
  }
  if (Object.keys(agent).length > 0) config.agent = agent;
  return config;
}

export function renderRoutingConfig(resolutions: RoleResolution[], existing?: RoutingConfig): string {
  return JSON.stringify(buildRoutingConfig(resolutions, existing), null, 2) + "\n";
}

/** Parse `opencode models` stdout: one `provider/model-id` per line, ignoring log noise. */
export function parseOpencodeModels(stdout: string): Set<string> {
  const ids = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[\w.-]+\/\S+$/.test(l));
  return new Set(ids);
}

/** Parse an OpenAI-compatible `/models` response into `provider/model-id` ids. */
export function parseOpenAIModelList(body: unknown, provider: string): string[] {
  const data = (body as { data?: Array<{ id?: unknown; status?: unknown }> })?.data;
  if (!Array.isArray(data)) throw new Error("unexpected /models response: missing data[]");
  return data
    .filter((m) => typeof m.id === "string" && (m.status === undefined || m.status === "ready"))
    .map((m) => `${provider}/${m.id as string}`);
}

export interface AvailabilityDeps {
  runOpencodeModels: () => string;
  fetchJson: (url: string, apiKey: string) => Promise<unknown>;
  env: NodeJS.ProcessEnv;
}

const defaultDeps: AvailabilityDeps = {
  runOpencodeModels: () =>
    execFileSync("opencode", ["models", "--refresh"], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }),
  fetchJson: async (url, apiKey) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  env: process.env,
};

export async function listAvailableModels(
  profile: ModelProfile,
  deps: AvailabilityDeps = defaultDeps,
): Promise<{ available: Set<string>; notes: string[] }> {
  const notes: string[] = [];
  let available = new Set<string>();
  try {
    available = parseOpencodeModels(deps.runOpencodeModels());
  } catch (e) {
    notes.push(`could not run \`opencode models\` (${(e as Error).message}); only live providers are checked`);
  }

  for (const [provider, source] of Object.entries(profile.live ?? {})) {
    const key = deps.env[source.apiKeyEnv];
    if (!key) {
      notes.push(`${source.apiKeyEnv} not set; trusting \`opencode models\` for ${provider}`);
      continue;
    }
    try {
      const live = parseOpenAIModelList(await deps.fetchJson(source.url, key), provider);
      available = new Set([...available].filter((m) => !m.startsWith(`${provider}/`)));
      for (const m of live) available.add(m);
    } catch (e) {
      notes.push(`live model list for ${provider} failed (${(e as Error).message}); trusting \`opencode models\``);
    }
  }
  return { available, notes };
}

export function formatResolutions(resolutions: RoleResolution[]): string {
  const width = Math.max(...resolutions.map((r) => r.role.length));
  return resolutions
    .map(({ role, chosen, skipped }) => {
      const status = chosen ? (skipped.length ? "fallback" : "ok") : "MISSING";
      const detail = skipped.length ? `  (unavailable: ${skipped.join(", ")})` : "";
      return `  ${role.padEnd(width)}  ${status.padEnd(8)}  ${chosen ?? "-"}${detail}`;
    })
    .join("\n");
}

const MODELS_USAGE = `Usage:
  npx @jorgegb/harness-init models check   Report which model each role would use
  npx @jorgegb/harness-init models sync    Write the resolved models to ${ROUTING_PATH}

Reads the role -> candidates profile from ${PROFILE_PATH}.
Availability comes from \`opencode models --refresh\`, plus a live /models query for
providers listed under "live" in the profile (when their API key env var is set).`;

/** Entry point for `harness-init models <check|sync>`. Returns the process exit code. */
export async function runModelsCommand(args: string[], cwd: string, deps?: AvailabilityDeps): Promise<number> {
  const sub = args[0];
  if (sub !== "check" && sub !== "sync") {
    console.log(MODELS_USAGE);
    return sub === undefined || sub === "--help" || sub === "-h" ? 0 : 1;
  }

  const profilePath = join(cwd, PROFILE_PATH);
  if (!existsSync(profilePath)) {
    console.error(`No ${PROFILE_PATH} found. Run harness-init with --models free|gwdg|mixed first.`);
    return 1;
  }
  const profile = JSON.parse(readFileSync(profilePath, "utf-8")) as ModelProfile;
  const { available, notes } = await listAvailableModels(profile, deps);
  for (const n of notes) console.warn(`  [warn] ${n}`);

  const resolutions = resolveRoles(profile, available);
  console.log(`\nModel routing (profile: ${profile.profile})\n`);
  console.log(formatResolutions(resolutions));
  const missing = resolutions.filter((r) => !r.chosen);

  if (sub === "sync") {
    const routingPath = join(cwd, ROUTING_PATH);
    const existing = existsSync(routingPath) ? (JSON.parse(readFileSync(routingPath, "utf-8")) as RoutingConfig) : {};
    mkdirSync(dirname(routingPath), { recursive: true });
    writeFileSync(routingPath, renderRoutingConfig(resolutions, existing));
    console.log(`\nWrote ${ROUTING_PATH}`);
  }

  if (missing.length > 0) {
    console.error(`\n${missing.length} role(s) have no available model: ${missing.map((r) => r.role).join(", ")}`);
    return 1;
  }
  return 0;
}
