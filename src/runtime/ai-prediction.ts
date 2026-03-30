import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { startSerialIntervalLoop, type SerialIntervalLoopHandle } from "./serial-interval-loop";

export const AI_PREDICTION_STATE_PATH = resolveAiPredictionStatePath();
export const AI_PREDICTION_FRONTEND_DEFAULT_BASE_URL = "http://127.0.0.1:3002";
export const AI_PREDICTION_BACKEND_DEFAULT_BASE_URL = "http://127.0.0.1:5002";
export const AI_PREDICTION_DEFAULT_REPO_DIR = "C:\\Users\\45441\\.openclaw\\workspace\\projects\\features\\MiroFish";
export const AI_PREDICTION_DEMO_URL = "https://666ghj.github.io/mirofish-demo/";
const AI_PREDICTION_DEFAULT_ENV_FILE = ".env";
const AI_PREDICTION_BACKGROUND_REFRESH_INTERVAL_MS = 15_000;
const AI_PREDICTION_BACKGROUND_HEALTH_MAX_AGE_MS = 60_000;

let aiPredictionBackgroundRefreshLoop: SerialIntervalLoopHandle | undefined;

export type AiPredictionHealthStatus = "unknown" | "ok" | "error";

export interface AiPredictionEndpointCheck {
  ok: boolean;
  checkedUrl: string;
  statusCode?: number;
  message?: string;
}

interface AiPredictionStoredConfig {
  frontendBaseUrl: string;
  backendBaseUrl: string;
  repoDir: string;
}

interface AiPredictionStoredState {
  version: 1;
  updatedAt: string;
  config: AiPredictionStoredConfig;
  health: AiPredictionHealthState;
}

export interface AiPredictionHealthState {
  status: AiPredictionHealthStatus;
  checkedAt?: string;
  frontend: AiPredictionEndpointCheck;
  backend: AiPredictionEndpointCheck;
  message?: string;
}

export interface AiPredictionPublicState {
  version: 1;
  updatedAt: string;
  config: {
    frontendBaseUrl: string;
    backendBaseUrl: string;
    repoDir: string;
  };
  health: AiPredictionHealthState;
  launchUrl: string;
  embedUrl: string;
  ready: boolean;
  embedBlockedReason?: string;
  externalOpenUrl: string;
  demoUrl: string;
}

export interface AiPredictionLoadResult {
  path: string;
  state: AiPredictionPublicState;
  issues: string[];
}

export interface PatchAiPredictionConfigInput {
  frontendBaseUrl?: string;
  backendBaseUrl?: string;
  repoDir?: string;
}

export function getAiPredictionStatePath(): string {
  return resolveAiPredictionStatePath();
}

export function defaultAiPredictionPublicState(now = new Date().toISOString()): AiPredictionPublicState {
  return toPublicAiPredictionState(defaultStoredAiPredictionState(now));
}

export async function loadAiPredictionState(): Promise<AiPredictionLoadResult> {
  const stored = await loadStoredAiPredictionState();
  if (shouldRefreshAiPredictionHealth(stored.state)) {
    return await checkAiPredictionHealth();
  }
  await syncAiPredictionProjectEnv(stored.state.config);
  return {
    path: getAiPredictionStatePath(),
    state: toPublicAiPredictionState(stored.state),
    issues: stored.issues,
  };
}

export function ensureAiPredictionBackgroundRefreshLoop(): void {
  if (aiPredictionBackgroundRefreshLoop) {
    return;
  }
  aiPredictionBackgroundRefreshLoop = startSerialIntervalLoop({
    intervalMs: AI_PREDICTION_BACKGROUND_REFRESH_INTERVAL_MS,
    runOnce: async () => {
      await refreshAiPredictionStateInBackground();
    },
  });
}

export async function patchAiPredictionConfig(
  input: PatchAiPredictionConfigInput,
): Promise<AiPredictionLoadResult> {
  const current = await loadStoredAiPredictionState();
  const now = new Date().toISOString();
  const nextConfig: AiPredictionStoredConfig = {
    frontendBaseUrl: normalizeHttpUrl(
      input.frontendBaseUrl ?? current.state.config.frontendBaseUrl,
      AI_PREDICTION_FRONTEND_DEFAULT_BASE_URL,
    ),
    backendBaseUrl: normalizeHttpUrl(
      input.backendBaseUrl ?? current.state.config.backendBaseUrl,
      AI_PREDICTION_BACKEND_DEFAULT_BASE_URL,
    ),
    repoDir: normalizeOptionalPath(input.repoDir ?? current.state.config.repoDir),
  };
  const healthChanged =
    nextConfig.frontendBaseUrl !== current.state.config.frontendBaseUrl ||
    nextConfig.backendBaseUrl !== current.state.config.backendBaseUrl;
  const nextState: AiPredictionStoredState = {
    ...current.state,
    updatedAt: now,
    config: nextConfig,
    health: healthChanged ? defaultPredictionHealthState(nextConfig, now) : current.state.health,
  };
  await syncAiPredictionProjectEnv(nextState.config);
  await writeStoredAiPredictionState(nextState);
  return {
    path: getAiPredictionStatePath(),
    state: toPublicAiPredictionState(nextState),
    issues: current.issues,
  };
}

export async function checkAiPredictionHealth(): Promise<AiPredictionLoadResult> {
  const current = await loadStoredAiPredictionState();
  const now = new Date().toISOString();
  await syncAiPredictionProjectEnv(current.state.config);
  const [frontend, backend] = await Promise.all([
    requestPredictionEndpoint(current.state.config.frontendBaseUrl),
    requestPredictionEndpoint(joinUrl(current.state.config.backendBaseUrl, "/health")),
  ]);
  const ok = frontend.ok && backend.ok;
  const nextState: AiPredictionStoredState = {
    ...current.state,
    updatedAt: now,
    health: {
      status: ok ? "ok" : "error",
      checkedAt: now,
      frontend,
      backend,
      message: ok
        ? "MiroFish frontend and backend are reachable."
        : buildPredictionHealthMessage(frontend, backend),
    },
  };
  await writeStoredAiPredictionState(nextState);
  return {
    path: getAiPredictionStatePath(),
    state: toPublicAiPredictionState(nextState),
    issues: current.issues,
  };
}

function resolveAiPredictionStatePath(): string {
  const override = process.env.OPENCLAW_AI_PREDICTION_STATE_PATH?.trim();
  if (override) {
    return override;
  }
  return join(process.cwd(), "runtime", "ai-prediction.json");
}

function defaultStoredAiPredictionState(now = new Date().toISOString()): AiPredictionStoredState {
  const config = {
    frontendBaseUrl: AI_PREDICTION_FRONTEND_DEFAULT_BASE_URL,
    backendBaseUrl: AI_PREDICTION_BACKEND_DEFAULT_BASE_URL,
    repoDir: AI_PREDICTION_DEFAULT_REPO_DIR,
  };
  return {
    version: 1,
    updatedAt: now,
    config,
    health: defaultPredictionHealthState(config, now),
  };
}

async function refreshAiPredictionStateInBackground(): Promise<void> {
  const current = await loadStoredAiPredictionState();
  if (shouldRefreshAiPredictionHealth(current.state)) {
    await checkAiPredictionHealth();
  }
}

function shouldRefreshAiPredictionHealth(state: AiPredictionStoredState): boolean {
  if (!state.config.frontendBaseUrl.trim()) {
    return false;
  }
  if (state.health.status === "unknown") {
    return true;
  }
  const checkedAtMs = Date.parse(state.health.checkedAt || "");
  if (!Number.isFinite(checkedAtMs)) {
    return true;
  }
  return Date.now() - checkedAtMs >= AI_PREDICTION_BACKGROUND_HEALTH_MAX_AGE_MS;
}

function defaultPredictionHealthState(
  config: AiPredictionStoredConfig,
  now: string,
): AiPredictionHealthState {
  return {
    status: "unknown",
    checkedAt: now,
    frontend: {
      ok: false,
      checkedUrl: config.frontendBaseUrl,
      message: "Frontend health has not been checked yet.",
    },
    backend: {
      ok: false,
      checkedUrl: joinUrl(config.backendBaseUrl, "/health"),
      message: "Backend health has not been checked yet.",
    },
    message: "Run a health check after starting MiroFish.",
  };
}

async function loadStoredAiPredictionState(): Promise<{ state: AiPredictionStoredState; issues: string[] }> {
  try {
    const raw = await readFile(getAiPredictionStatePath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeStoredAiPredictionState(parsed);
    if (normalized.issues.length > 0) {
      await writeStoredAiPredictionState(normalized.state);
    }
    return normalized;
  } catch (error) {
    const fallback = defaultStoredAiPredictionState();
    const reason = error instanceof Error ? error.message : "unable to read ai prediction state";
    await writeStoredAiPredictionState(fallback);
    return {
      state: fallback,
      issues: [`ai prediction fallback applied: ${reason}`],
    };
  }
}

function normalizeStoredAiPredictionState(
  input: unknown,
): { state: AiPredictionStoredState; issues: string[] } {
  const now = new Date().toISOString();
  const defaults = defaultStoredAiPredictionState(now);
  const issues: string[] = [];
  const root = asObject(input);
  if (!root) {
    issues.push("ai prediction state must be a JSON object");
    return { state: defaults, issues };
  }
  const configRoot = asObject(root.config);
  const healthRoot = asObject(root.health);
  const config: AiPredictionStoredConfig = {
    frontendBaseUrl: normalizeHttpUrl(
      asString(configRoot?.frontendBaseUrl) ?? defaults.config.frontendBaseUrl,
      defaults.config.frontendBaseUrl,
    ),
    backendBaseUrl: normalizeHttpUrl(
      asString(configRoot?.backendBaseUrl) ?? defaults.config.backendBaseUrl,
      defaults.config.backendBaseUrl,
    ),
    repoDir: normalizeOptionalPath(asString(configRoot?.repoDir) ?? defaults.config.repoDir),
  };
  const health: AiPredictionHealthState = {
    status: normalizePredictionHealthStatus(asString(healthRoot?.status) ?? defaults.health.status),
    checkedAt: normalizeTimestamp(asString(healthRoot?.checkedAt)) || defaults.health.checkedAt,
    frontend: normalizeEndpointCheck(
      healthRoot?.frontend,
      config.frontendBaseUrl,
      "Frontend health has not been checked yet.",
    ),
    backend: normalizeEndpointCheck(
      healthRoot?.backend,
      joinUrl(config.backendBaseUrl, "/health"),
      "Backend health has not been checked yet.",
    ),
    message: asString(healthRoot?.message) || defaults.health.message,
  };
  return {
    state: {
      version: 1,
      updatedAt: normalizeTimestamp(asString(root.updatedAt)) || now,
      config,
      health,
    },
    issues,
  };
}

function toPublicAiPredictionState(input: AiPredictionStoredState): AiPredictionPublicState {
  const launchUrl = normalizeHttpUrl(input.config.frontendBaseUrl, AI_PREDICTION_FRONTEND_DEFAULT_BASE_URL);
  const ready = input.health.frontend.ok;
  const embedBlockedReason = input.health.frontend.ok
    ? ""
    : input.health.message || "MiroFish is not ready to embed yet.";
  return {
    version: 1,
    updatedAt: input.updatedAt,
    config: {
      frontendBaseUrl: launchUrl,
      backendBaseUrl: normalizeHttpUrl(
        input.config.backendBaseUrl,
        AI_PREDICTION_BACKEND_DEFAULT_BASE_URL,
      ),
      repoDir: input.config.repoDir,
    },
    health: {
      status: input.health.status,
      checkedAt: input.health.checkedAt,
      frontend: input.health.frontend,
      backend: input.health.backend,
      message: input.health.message,
    },
    launchUrl,
    embedUrl: launchUrl,
    ready,
    embedBlockedReason,
    externalOpenUrl: launchUrl,
    demoUrl: AI_PREDICTION_DEMO_URL,
  };
}

function normalizeEndpointCheck(
  input: unknown,
  fallbackUrl: string,
  fallbackMessage: string,
): AiPredictionEndpointCheck {
  const root = asObject(input);
  return {
    ok: root?.ok === true,
    checkedUrl: normalizeHttpUrl(asString(root?.checkedUrl) ?? fallbackUrl, fallbackUrl),
    statusCode:
      typeof root?.statusCode === "number" && Number.isFinite(root.statusCode)
        ? root.statusCode
        : undefined,
    message: asString(root?.message) || fallbackMessage,
  };
}

function normalizePredictionHealthStatus(value: string): AiPredictionHealthStatus {
  return value === "ok" || value === "error" ? value : "unknown";
}

function normalizeTimestamp(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

function asObject(input: unknown): Record<string, any> | undefined {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, any>)
    : undefined;
}

function asString(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeOptionalPath(input: string): string {
  return String(input || "").trim();
}

function normalizeHttpUrl(input: string, fallback: string): string {
  const candidate = String(input || "").trim() || fallback;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${normalizeHttpUrl(baseUrl, baseUrl).replace(/\/$/, "")}${path}`;
}

async function requestPredictionEndpoint(url: string): Promise<AiPredictionEndpointCheck> {
  try {
    const response = await fetch(url, { method: "GET" });
    const bodyText = await response.text().catch(() => "");
    return {
      ok: response.ok,
      checkedUrl: url,
      statusCode: response.status,
      message: response.ok
        ? bodyText.slice(0, 200) || "ok"
        : bodyText.slice(0, 240) || response.statusText,
    };
  } catch (error) {
    return {
      ok: false,
      checkedUrl: url,
      message: error instanceof Error ? error.message : "request failed",
    };
  }
}

function buildPredictionHealthMessage(
  frontend: AiPredictionEndpointCheck,
  backend: AiPredictionEndpointCheck,
): string {
  const parts: string[] = [];
  if (!frontend.ok) {
    parts.push(`Frontend is not reachable at ${frontend.checkedUrl}. ${frontend.message || ""}`.trim());
  }
  if (!backend.ok) {
    parts.push(`Backend health is not reachable at ${backend.checkedUrl}. ${backend.message || ""}`.trim());
  }
  return parts.join(" ");
}

async function syncAiPredictionProjectEnv(config: AiPredictionStoredConfig): Promise<void> {
  const repoDir = normalizeOptionalPath(config.repoDir);
  if (!repoDir) {
    return;
  }
  const envPath = join(repoDir, AI_PREDICTION_DEFAULT_ENV_FILE);
  const inherited = await resolveInheritedAiPredictionEnv();
  const current = await readKeyValueEnvFile(envPath);
  const nextValues = {
    ...current,
    FLASK_PORT: String(extractPort(config.backendBaseUrl, 5002)),
    VITE_API_BASE_URL: normalizeHttpUrl(config.backendBaseUrl, AI_PREDICTION_BACKEND_DEFAULT_BASE_URL),
    MIROFISH_FRONTEND_PORT: String(extractPort(config.frontendBaseUrl, 3002)),
  } as Record<string, string>;
  if (inherited.llmApiKey) nextValues.LLM_API_KEY = inherited.llmApiKey;
  if (inherited.llmBaseUrl) nextValues.LLM_BASE_URL = inherited.llmBaseUrl;
  if (inherited.llmModel) nextValues.LLM_MODEL_NAME = inherited.llmModel;
  if (inherited.zepApiKey) nextValues.ZEP_API_KEY = inherited.zepApiKey;
  const serialized = serializeKeyValueEnvFile(nextValues);
  await mkdir(dirname(envPath), { recursive: true });
  await writeFile(envPath, serialized, "utf8");
}

async function resolveInheritedAiPredictionEnv(): Promise<{
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
  zepApiKey: string;
}> {
  const aiEducationPath = join(process.cwd(), "runtime", "ai-education.json");
  try {
    const raw = await readFile(aiEducationPath, "utf8");
    const parsed = JSON.parse(raw) as { config?: Record<string, unknown> };
    const config = asObject(parsed?.config);
    return {
      llmApiKey: asString(config?.llmApiKey),
      llmBaseUrl: asString(config?.llmBaseUrl),
      llmModel: asString(config?.llmModel),
      zepApiKey: process.env.ZEP_API_KEY?.trim() || "",
    };
  } catch {
    return {
      llmApiKey: process.env.LLM_API_KEY?.trim() || "",
      llmBaseUrl: process.env.LLM_BASE_URL?.trim() || "",
      llmModel: process.env.LLM_MODEL_NAME?.trim() || "",
      zepApiKey: process.env.ZEP_API_KEY?.trim() || "",
    };
  }
}

async function readKeyValueEnvFile(path: string): Promise<Record<string, string>> {
  try {
    const raw = await readFile(path, "utf8");
    const values: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (key) {
        values[key] = value;
      }
    }
    return values;
  } catch {
    return {};
  }
}

function serializeKeyValueEnvFile(values: Record<string, string>): string {
  return `${Object.entries(values)
    .filter(([, value]) => String(value || "").trim() !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

function extractPort(url: string, fallback: number): number {
  try {
    const parsed = new URL(url);
    return parsed.port ? Number(parsed.port) : fallback;
  } catch {
    return fallback;
  }
}

async function writeStoredAiPredictionState(state: AiPredictionStoredState): Promise<void> {
  await mkdir(dirname(getAiPredictionStatePath()), { recursive: true });
  await writeFile(getAiPredictionStatePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
