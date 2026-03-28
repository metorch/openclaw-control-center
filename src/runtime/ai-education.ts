import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import * as YAML from "yaml";
import { startSerialIntervalLoop, type SerialIntervalLoopHandle } from "./serial-interval-loop";

export const AI_EDUCATION_STATE_PATH = resolveAiEducationStatePath();
export const AI_EDUCATION_HOSTED_BASE_URL = "https://open.maic.chat";
export const AI_EDUCATION_SELF_HOSTED_DEFAULT_BASE_URL = "http://127.0.0.1:3000";
export const AI_EDUCATION_OPENMAIC_CONFIG_FILE = "server-providers.yml";
export const AI_EDUCATION_LLM_PROVIDER_PRESETS = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "qwen",
  "kimi",
  "minimax",
  "glm",
  "siliconflow",
  "doubao",
  "grok",
  "custom_openai_compatible",
] as const;

const EMPTY_CAPABILITIES = {
  webSearch: false,
  imageGeneration: false,
  videoGeneration: false,
  tts: false,
} as const;
const AI_EDUCATION_BACKGROUND_REFRESH_INTERVAL_MS = 15_000;
const AI_EDUCATION_BACKGROUND_HEALTH_MAX_AGE_MS = 60_000;

export type AiEducationMode = "hosted" | "self_hosted";
export type AiEducationHealthStatus = "unknown" | "ok" | "error";
export type AiEducationJobStatus = "idle" | "queued" | "running" | "succeeded" | "failed";
export type AiEducationPdfProvider = "unpdf" | "mineru";
export type AiEducationPdfVerificationStatus = "unknown" | "ok" | "error" | "skipped";
export type AiEducationConfigSyncStatus = "idle" | "pending_restart" | "synced" | "error";
export type AiEducationLlmProviderPreset = (typeof AI_EDUCATION_LLM_PROVIDER_PRESETS)[number];

export interface AiEducationCapabilities {
  webSearch: boolean;
  imageGeneration: boolean;
  videoGeneration: boolean;
  tts: boolean;
}

export interface AiEducationPdfVerificationState {
  status: AiEducationPdfVerificationStatus;
  checkedAt?: string;
  message?: string;
}

export interface AiEducationObservedServerProviders {
  checkedAt?: string;
  providers: Record<string, Record<string, unknown>>;
  tts: Record<string, Record<string, unknown>>;
  asr: Record<string, Record<string, unknown>>;
  pdf: Record<string, Record<string, unknown>>;
  image: Record<string, Record<string, unknown>>;
  video: Record<string, Record<string, unknown>>;
  webSearch: Record<string, Record<string, unknown>>;
}

export interface AiEducationConfigSyncState {
  status: AiEducationConfigSyncStatus;
  updatedAt?: string;
  message?: string;
}

export interface AiEducationHealthState {
  status: AiEducationHealthStatus;
  checkedAt?: string;
  baseUrl: string;
  message?: string;
  version?: string;
  capabilities: AiEducationCapabilities;
  pdfProviderVerification: AiEducationPdfVerificationState;
}

export interface AiEducationJobState {
  jobId?: string;
  requirement?: string;
  status: AiEducationJobStatus;
  step?: string;
  progress?: number;
  message?: string;
  pollUrl?: string;
  pollIntervalMs?: number;
  scenesGenerated?: number;
  totalScenes?: number;
  classroomId?: string;
  classroomUrl?: string;
  error?: string;
  updatedAt?: string;
}

interface AiEducationStoredConfig {
  mode: AiEducationMode;
  baseUrl: string;
  repoDir: string;
  accessCode: string;
  llmProviderPreset: AiEducationLlmProviderPreset;
  llmModel: string;
  llmApiKey: string;
  llmBaseUrl: string;
  pdfProvider: AiEducationPdfProvider;
  pdfApiKey: string;
  pdfBaseUrl: string;
}

interface AiEducationStoredState {
  version: 1;
  updatedAt: string;
  config: AiEducationStoredConfig;
  health: AiEducationHealthState;
  latestJob: AiEducationJobState;
  openmaicConfigSync: AiEducationConfigSyncState;
  observedServerProviders: AiEducationObservedServerProviders;
}

export interface AiEducationPublicConfig {
  mode: AiEducationMode;
  baseUrl: string;
  repoDir: string;
  accessCodeConfigured: boolean;
  accessCodeHint?: string;
  llmProviderPreset: AiEducationLlmProviderPreset;
  llmModel: string;
  llmApiKeyConfigured: boolean;
  llmBaseUrl: string;
  pdfProvider: AiEducationPdfProvider;
  pdfApiKeyConfigured: boolean;
  pdfBaseUrl: string;
}

export interface AiEducationPublicState {
  version: 1;
  updatedAt: string;
  config: AiEducationPublicConfig;
  health: AiEducationHealthState;
  latestJob: AiEducationJobState;
  openmaicConfigSync: AiEducationConfigSyncState;
  observedServerProviders: AiEducationObservedServerProviders;
  launchUrl?: string;
  embedUrl?: string;
  ready: boolean;
  embedBlockedReason?: string;
}

export interface AiEducationLoadResult {
  path: string;
  state: AiEducationPublicState;
  issues: string[];
}

export interface ApplyAiEducationOpenMaicConfigResult extends AiEducationLoadResult {
  syncStatus: AiEducationConfigSyncStatus;
  configPath?: string;
}

export interface PatchAiEducationConfigInput {
  mode?: AiEducationMode;
  baseUrl?: string;
  repoDir?: string;
  accessCode?: string;
  clearAccessCode?: boolean;
  llmProviderPreset?: AiEducationLlmProviderPreset;
  llmModel?: string;
  llmApiKey?: string;
  clearLlmApiKey?: boolean;
  llmBaseUrl?: string;
  pdfProvider?: AiEducationPdfProvider;
  pdfApiKey?: string;
  clearPdfApiKey?: boolean;
  pdfBaseUrl?: string;
}

export interface StartAiEducationJobInput {
  requirement: string;
  language?: "zh-CN" | "en-US";
  enableWebSearch?: boolean;
  enableImageGeneration?: boolean;
  enableVideoGeneration?: boolean;
  enableTTS?: boolean;
  agentMode?: "default" | "generate";
}

let persistAiEducationStateQueue: Promise<void> = Promise.resolve();
let aiEducationBackgroundRefreshLoop: SerialIntervalLoopHandle | undefined;

export function ensureAiEducationBackgroundRefreshLoop(): void {
  if (aiEducationBackgroundRefreshLoop) {
    return;
  }
  aiEducationBackgroundRefreshLoop = startSerialIntervalLoop({
    intervalMs: AI_EDUCATION_BACKGROUND_REFRESH_INTERVAL_MS,
    runOnce: async () => {
      await refreshAiEducationStateInBackground();
    },
  });
}

function resolveAiEducationStatePath(): string {
  const override = process.env.OPENCLAW_AI_EDUCATION_STATE_PATH?.trim();
  if (override) {
    return override;
  }
  return join(process.cwd(), "runtime", "ai-education.json");
}

export function getAiEducationStatePath(): string {
  return resolveAiEducationStatePath();
}

export function defaultAiEducationPublicState(now = new Date().toISOString()): AiEducationPublicState {
  return toPublicAiEducationState(defaultStoredAiEducationState(now));
}

export async function loadAiEducationState(): Promise<AiEducationLoadResult> {
  const stored = await loadStoredAiEducationState();
  return {
    path: getAiEducationStatePath(),
    state: toPublicAiEducationState(stored.state),
    issues: stored.issues,
  };
}

export async function patchAiEducationConfig(input: PatchAiEducationConfigInput): Promise<AiEducationLoadResult> {
  const current = await loadStoredAiEducationState();
  const now = new Date().toISOString();
  const currentConfig = current.state.config;
  const nextMode = input.mode ?? currentConfig.mode;
  const nextBaseUrl = normalizeBaseUrl(nextMode, input.baseUrl ?? currentConfig.baseUrl);
  const nextRepoDir =
    typeof input.repoDir === "string" ? normalizeOptionalPath(input.repoDir) : currentConfig.repoDir;
  let nextAccessCode = currentConfig.accessCode;
  if (input.clearAccessCode === true) {
    nextAccessCode = "";
  } else if (typeof input.accessCode === "string" && input.accessCode.trim()) {
    nextAccessCode = input.accessCode.trim();
  }
  let nextLlmApiKey = currentConfig.llmApiKey;
  if (input.clearLlmApiKey === true) {
    nextLlmApiKey = "";
  } else if (typeof input.llmApiKey === "string" && input.llmApiKey.trim()) {
    nextLlmApiKey = input.llmApiKey.trim();
  }
  let nextPdfApiKey = currentConfig.pdfApiKey;
  if (input.clearPdfApiKey === true) {
    nextPdfApiKey = "";
  } else if (typeof input.pdfApiKey === "string" && input.pdfApiKey.trim()) {
    nextPdfApiKey = input.pdfApiKey.trim();
  }

  const nextConfig: AiEducationStoredConfig = {
    mode: nextMode,
    baseUrl: nextBaseUrl,
    repoDir: nextRepoDir,
    accessCode: nextAccessCode,
    llmProviderPreset: normalizeLlmProviderPreset(input.llmProviderPreset ?? currentConfig.llmProviderPreset),
    llmModel: normalizeInlineValue(input.llmModel ?? currentConfig.llmModel),
    llmApiKey: nextLlmApiKey,
    llmBaseUrl: normalizeOptionalHttpUrl(input.llmBaseUrl ?? currentConfig.llmBaseUrl),
    pdfProvider: normalizePdfProvider(input.pdfProvider ?? currentConfig.pdfProvider),
    pdfApiKey: nextPdfApiKey,
    pdfBaseUrl: normalizeOptionalHttpUrl(input.pdfBaseUrl ?? currentConfig.pdfBaseUrl),
  };

  const connectionChanged =
    nextConfig.mode !== currentConfig.mode ||
    nextConfig.baseUrl !== currentConfig.baseUrl ||
    nextConfig.accessCode !== currentConfig.accessCode;
  const openmaicConfigChanged =
    nextConfig.repoDir !== currentConfig.repoDir ||
    nextConfig.llmProviderPreset !== currentConfig.llmProviderPreset ||
    nextConfig.llmModel !== currentConfig.llmModel ||
    nextConfig.llmApiKey !== currentConfig.llmApiKey ||
    nextConfig.llmBaseUrl !== currentConfig.llmBaseUrl ||
    nextConfig.pdfProvider !== currentConfig.pdfProvider ||
    nextConfig.pdfApiKey !== currentConfig.pdfApiKey ||
    nextConfig.pdfBaseUrl !== currentConfig.pdfBaseUrl;

  const nextState: AiEducationStoredState = {
    ...current.state,
    updatedAt: now,
    config: nextConfig,
    health: connectionChanged
      ? defaultHealthState(nextBaseUrl, now)
      : {
          ...current.state.health,
          baseUrl: nextBaseUrl,
        },
    openmaicConfigSync: openmaicConfigChanged
      ? {
          status: "idle",
          updatedAt: now,
          message: "Local OpenMAIC provider settings changed. Write them to server-providers.yml to apply.",
        }
      : current.state.openmaicConfigSync,
  };
  await writeStoredAiEducationState(nextState);
  return {
    path: getAiEducationStatePath(),
    state: toPublicAiEducationState(nextState),
    issues: current.issues,
  };
}

export async function checkAiEducationHealth(): Promise<AiEducationLoadResult> {
  const current = await loadStoredAiEducationState();
  const nextState = await updateAiEducationHealth(current.state);
  return {
    path: getAiEducationStatePath(),
    state: toPublicAiEducationState(nextState),
    issues: current.issues,
  };
}

export async function applyAiEducationOpenMaicConfig(): Promise<ApplyAiEducationOpenMaicConfigResult> {
  const current = await loadStoredAiEducationState();
  const now = new Date().toISOString();
  const validation = await validateOpenMaicRepoDir(current.state.config.repoDir);

  if (!validation.ok) {
    const nextState: AiEducationStoredState = {
      ...current.state,
      updatedAt: now,
      openmaicConfigSync: {
        status: "error",
        updatedAt: now,
        message: validation.message,
      },
    };
    await writeStoredAiEducationState(nextState);
    return {
      path: getAiEducationStatePath(),
      state: toPublicAiEducationState(nextState),
      issues: current.issues,
      syncStatus: "error",
    };
  }

  const desired = buildDesiredOpenMaicConfig(current.state.config);
  if (!desired.ok) {
    const nextState: AiEducationStoredState = {
      ...current.state,
      updatedAt: now,
      openmaicConfigSync: {
        status: "error",
        updatedAt: now,
        message: desired.message,
      },
    };
    await writeStoredAiEducationState(nextState);
    return {
      path: getAiEducationStatePath(),
      state: toPublicAiEducationState(nextState),
      issues: current.issues,
      syncStatus: "error",
      configPath: validation.configPath,
    };
  }

  try {
    const raw = await readFile(validation.configPath, "utf8").catch((error) => {
      const code =
        error && typeof error === "object" ? (error as { code?: string }).code : undefined;
      if (code === "ENOENT") {
        return "";
      }
      throw error;
    });
    const existingRoot = normalizeYamlRoot(raw);
    const nextRoot = mergeOpenMaicServerProvidersConfig(existingRoot, desired);
    await mkdir(dirname(validation.configPath), { recursive: true });
    await writeFile(validation.configPath, `${YAML.stringify(nextRoot)}\n`, "utf8");

    const observed = await fetchObservedServerProviders(current.state).catch(() => undefined);
    const syncStatus =
      observed && matchesDesiredOpenMaicConfig(current.state.config, observed)
        ? "synced"
        : "pending_restart";
    const nextState: AiEducationStoredState = {
      ...current.state,
      updatedAt: now,
      observedServerProviders: observed ?? current.state.observedServerProviders,
      openmaicConfigSync: {
        status: syncStatus,
        updatedAt: now,
        message:
          syncStatus === "synced"
            ? `OpenMAIC config is written to ${validation.configPath} and the current runtime already reflects the selected provider settings.`
            : `OpenMAIC config is written to ${validation.configPath}. Restart the OpenMAIC service so cached server providers reload.`,
      },
    };
    await writeStoredAiEducationState(nextState);
    return {
      path: getAiEducationStatePath(),
      state: toPublicAiEducationState(nextState),
      issues: current.issues,
      syncStatus,
      configPath: validation.configPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write OpenMAIC server-providers.yml.";
    const nextState: AiEducationStoredState = {
      ...current.state,
      updatedAt: now,
      openmaicConfigSync: {
        status: "error",
        updatedAt: now,
        message,
      },
    };
    await writeStoredAiEducationState(nextState);
    return {
      path: getAiEducationStatePath(),
      state: toPublicAiEducationState(nextState),
      issues: current.issues,
      syncStatus: "error",
      configPath: validation.configPath,
    };
  }
}

export async function startAiEducationJob(input: StartAiEducationJobInput): Promise<AiEducationLoadResult> {
  const current = await loadStoredAiEducationState();
  const capabilities = await resolveAiEducationCapabilities(current.state);
  const requestBody: Record<string, unknown> = { requirement: input.requirement };
  if (input.language === "zh-CN" || input.language === "en-US") {
    requestBody.language = input.language;
  }
  if (input.agentMode === "default" || input.agentMode === "generate") {
    requestBody.agentMode = input.agentMode;
  }
  if (input.enableWebSearch === true && capabilities.webSearch) requestBody.enableWebSearch = true;
  if (input.enableImageGeneration === true && capabilities.imageGeneration) requestBody.enableImageGeneration = true;
  if (input.enableVideoGeneration === true && capabilities.videoGeneration) requestBody.enableVideoGeneration = true;
  if (input.enableTTS === true && capabilities.tts) requestBody.enableTTS = true;

  const payload = await requestAiEducationJson(current.state, "/api/generate-classroom", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const nextState: AiEducationStoredState = {
    ...current.state,
    updatedAt: new Date().toISOString(),
    latestJob: normalizeAiEducationJobPayload(payload.body, {
      baseUrl: current.state.config.baseUrl,
      requirement: input.requirement,
    }),
  };
  await writeStoredAiEducationState(nextState);
  return {
    path: getAiEducationStatePath(),
    state: toPublicAiEducationState(nextState),
    issues: current.issues,
  };
}

export async function refreshAiEducationJob(jobId?: string): Promise<AiEducationLoadResult> {
  const current = await loadStoredAiEducationState();
  const nextJobId = jobId?.trim() || current.state.latestJob.jobId;
  if (!nextJobId) {
    return {
      path: getAiEducationStatePath(),
      state: toPublicAiEducationState(current.state),
      issues: current.issues,
    };
  }
  const pollUrl =
    current.state.latestJob.pollUrl && current.state.latestJob.jobId === nextJobId
      ? current.state.latestJob.pollUrl
      : new URL(`/api/generate-classroom/${encodeURIComponent(nextJobId)}`, current.state.config.baseUrl).toString();
  const payload = await requestAiEducationJson(current.state, pollUrl, { method: "GET" });
  const nextState: AiEducationStoredState = {
    ...current.state,
    updatedAt: new Date().toISOString(),
    latestJob: normalizeAiEducationJobPayload(payload.body, {
      baseUrl: current.state.config.baseUrl,
      fallbackJobId: nextJobId,
      requirement: current.state.latestJob.requirement,
    }),
  };
  await writeStoredAiEducationState(nextState);
  return {
    path: getAiEducationStatePath(),
    state: toPublicAiEducationState(nextState),
    issues: current.issues,
  };
}

async function refreshAiEducationStateInBackground(): Promise<void> {
  const current = await loadStoredAiEducationState();
  const status = current.state.latestJob.status;
  if ((status === "queued" || status === "running") && current.state.latestJob.jobId) {
    await refreshAiEducationJob(current.state.latestJob.jobId);
    return;
  }
  if (shouldRefreshAiEducationHealthInBackground(current.state)) {
    await checkAiEducationHealth();
  }
}

function shouldRefreshAiEducationHealthInBackground(state: AiEducationStoredState): boolean {
  if (!state.config.baseUrl.trim()) {
    return false;
  }
  if (state.openmaicConfigSync.status === "pending_restart") {
    return true;
  }
  if (state.health.status === "unknown") {
    return true;
  }
  const checkedAtMs = Date.parse(state.health.checkedAt || "");
  if (!Number.isFinite(checkedAtMs)) {
    return true;
  }
  return Date.now() - checkedAtMs >= AI_EDUCATION_BACKGROUND_HEALTH_MAX_AGE_MS;
}

function defaultStoredAiEducationState(now = new Date().toISOString()): AiEducationStoredState {
  return {
    version: 1,
    updatedAt: now,
    config: {
      mode: "self_hosted",
      baseUrl: AI_EDUCATION_SELF_HOSTED_DEFAULT_BASE_URL,
      repoDir: "",
      accessCode: "",
      llmProviderPreset: "openai",
      llmModel: "",
      llmApiKey: "",
      llmBaseUrl: "",
      pdfProvider: "unpdf",
      pdfApiKey: "",
      pdfBaseUrl: "",
    },
    health: defaultHealthState(AI_EDUCATION_SELF_HOSTED_DEFAULT_BASE_URL, now),
    latestJob: {
      status: "idle",
      updatedAt: now,
    },
    openmaicConfigSync: {
      status: "idle",
      updatedAt: now,
      message: "OpenMAIC provider settings have not been written from AI Education yet.",
    },
    observedServerProviders: defaultObservedServerProviders(now),
  };
}

function defaultHealthState(baseUrl: string, now: string): AiEducationHealthState {
  return {
    status: "unknown",
    checkedAt: undefined,
    baseUrl,
    message: undefined,
    version: undefined,
    capabilities: {
      ...EMPTY_CAPABILITIES,
    },
    pdfProviderVerification: {
      status: "unknown",
      checkedAt: now,
      message: "No PDF provider verification has been recorded yet.",
    },
  };
}

function defaultObservedServerProviders(now?: string): AiEducationObservedServerProviders {
  return {
    checkedAt: now,
    providers: {},
    tts: {},
    asr: {},
    pdf: {},
    image: {},
    video: {},
    webSearch: {},
  };
}

async function loadStoredAiEducationState(): Promise<{ state: AiEducationStoredState; issues: string[] }> {
  try {
    const raw = await readFile(getAiEducationStatePath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeStoredAiEducationState(parsed);
    if (normalized.issues.length > 0) {
      await writeStoredAiEducationState(normalized.state);
    }
    return normalized;
  } catch (error) {
    const fallback = defaultStoredAiEducationState();
    const reason = error instanceof Error ? error.message : "unable to read ai education state";
    await writeStoredAiEducationState(fallback);
    return {
      state: fallback,
      issues: [`ai education fallback applied: ${reason}`],
    };
  }
}

function normalizeStoredAiEducationState(input: unknown): { state: AiEducationStoredState; issues: string[] } {
  const now = new Date().toISOString();
  const defaults = defaultStoredAiEducationState(now);
  const issues: string[] = [];
  const root = asObject(input);
  if (!root) {
    issues.push("ai education state must be a JSON object");
    return {
      state: defaults,
      issues,
    };
  }

  const configRoot = asObject(root.config);
  const rawMode = asString(configRoot?.mode);
  const mode = rawMode === "hosted" || rawMode === "self_hosted" ? rawMode : defaults.config.mode;
  if (rawMode && rawMode !== mode) {
    issues.push("config.mode must be hosted or self_hosted");
  }
  const baseUrl = normalizeBaseUrl(mode, asString(configRoot?.baseUrl) ?? defaults.config.baseUrl);
  const repoDir = normalizeOptionalPath(asString(configRoot?.repoDir) ?? defaults.config.repoDir);
  const accessCode = asString(configRoot?.accessCode) ?? "";

  let updatedAt = now;
  if (typeof root.updatedAt === "string" && !Number.isNaN(Date.parse(root.updatedAt))) {
    updatedAt = new Date(root.updatedAt).toISOString();
  } else if (root.updatedAt !== undefined) {
    issues.push("updatedAt must be an ISO-8601 timestamp");
  }

  const healthRoot = asObject(root.health);
  const health: AiEducationHealthState = {
    status: normalizeHealthStatus(healthRoot?.status),
    checkedAt: normalizeOptionalIsoTimestamp(healthRoot?.checkedAt),
    baseUrl: normalizeBaseUrl(mode, asString(healthRoot?.baseUrl) ?? baseUrl),
    message: asString(healthRoot?.message),
    version: asString(healthRoot?.version),
    capabilities: normalizeCapabilities(healthRoot?.capabilities),
    pdfProviderVerification: normalizePdfVerificationState(healthRoot?.pdfProviderVerification, updatedAt),
  };

  const latestJobRoot = asObject(root.latestJob);
  const latestJob: AiEducationJobState = {
    jobId: asString(latestJobRoot?.jobId),
    requirement: asString(latestJobRoot?.requirement),
    status: normalizeJobStatus(latestJobRoot?.status),
    step: asString(latestJobRoot?.step),
    progress: asFiniteNumber(latestJobRoot?.progress),
    message: asString(latestJobRoot?.message),
    pollUrl: asString(latestJobRoot?.pollUrl),
    pollIntervalMs: asFiniteNumber(latestJobRoot?.pollIntervalMs),
    scenesGenerated: asFiniteNumber(latestJobRoot?.scenesGenerated),
    totalScenes: asFiniteNumber(latestJobRoot?.totalScenes),
    classroomId: asString(latestJobRoot?.classroomId),
    classroomUrl: asString(latestJobRoot?.classroomUrl),
    error: asString(latestJobRoot?.error),
    updatedAt: normalizeOptionalIsoTimestamp(latestJobRoot?.updatedAt) ?? updatedAt,
  };

  const openmaicConfigSyncRoot = asObject(root.openmaicConfigSync);
  const openmaicConfigSync: AiEducationConfigSyncState = {
    status: normalizeConfigSyncStatus(openmaicConfigSyncRoot?.status),
    updatedAt: normalizeOptionalIsoTimestamp(openmaicConfigSyncRoot?.updatedAt) ?? updatedAt,
    message: asString(openmaicConfigSyncRoot?.message) ?? defaults.openmaicConfigSync.message,
  };

  return {
    state: {
      version: 1,
      updatedAt,
      config: {
        mode,
        baseUrl,
        repoDir,
        accessCode,
        llmProviderPreset: normalizeLlmProviderPreset(
          asString(configRoot?.llmProviderPreset) ?? defaults.config.llmProviderPreset,
        ),
        llmModel: normalizeInlineValue(asString(configRoot?.llmModel) ?? defaults.config.llmModel),
        llmApiKey: asString(configRoot?.llmApiKey) ?? "",
        llmBaseUrl: normalizeOptionalHttpUrl(asString(configRoot?.llmBaseUrl) ?? defaults.config.llmBaseUrl),
        pdfProvider: normalizePdfProvider(asString(configRoot?.pdfProvider) ?? defaults.config.pdfProvider),
        pdfApiKey: asString(configRoot?.pdfApiKey) ?? "",
        pdfBaseUrl: normalizeOptionalHttpUrl(asString(configRoot?.pdfBaseUrl) ?? defaults.config.pdfBaseUrl),
      },
      health,
      latestJob,
      openmaicConfigSync,
      observedServerProviders: normalizeObservedServerProviders(root.observedServerProviders, updatedAt),
    },
    issues,
  };
}

function toPublicAiEducationState(input: AiEducationStoredState): AiEducationPublicState {
  const healthMatchesConfig =
    input.health.baseUrl === input.config.baseUrl &&
    (input.health.status === "ok" || input.health.status === "error");
  const launchUrl = normalizeLaunchUrl(input.config.baseUrl);
  const embedUrl = launchUrl;
  let ready = Boolean(embedUrl);
  let embedBlockedReason: string | undefined;

  if (!launchUrl) {
    ready = false;
    embedBlockedReason = "OpenMAIC launch URL is not configured yet.";
  } else if (healthMatchesConfig && input.health.status === "error") {
    ready = false;
    embedBlockedReason = input.health.message || "OpenMAIC health check is failing for the current address.";
  }

  return {
    version: 1,
    updatedAt: input.updatedAt,
    config: {
      mode: input.config.mode,
      baseUrl: input.config.baseUrl,
      repoDir: input.config.repoDir,
      accessCodeConfigured: Boolean(input.config.accessCode),
      accessCodeHint: maskAccessCode(input.config.accessCode),
      llmProviderPreset: input.config.llmProviderPreset,
      llmModel: input.config.llmModel,
      llmApiKeyConfigured: Boolean(input.config.llmApiKey),
      llmBaseUrl: input.config.llmBaseUrl,
      pdfProvider: input.config.pdfProvider,
      pdfApiKeyConfigured: Boolean(input.config.pdfApiKey),
      pdfBaseUrl: input.config.pdfBaseUrl,
    },
    health: {
      ...input.health,
      capabilities: {
        ...EMPTY_CAPABILITIES,
        ...input.health.capabilities,
      },
      pdfProviderVerification: {
        ...input.health.pdfProviderVerification,
      },
    },
    latestJob: {
      ...input.latestJob,
    },
    openmaicConfigSync: {
      ...input.openmaicConfigSync,
    },
    observedServerProviders: {
      ...input.observedServerProviders,
      providers: { ...input.observedServerProviders.providers },
      tts: { ...input.observedServerProviders.tts },
      asr: { ...input.observedServerProviders.asr },
      pdf: { ...input.observedServerProviders.pdf },
      image: { ...input.observedServerProviders.image },
      video: { ...input.observedServerProviders.video },
      webSearch: { ...input.observedServerProviders.webSearch },
    },
    launchUrl,
    embedUrl,
    ready,
    embedBlockedReason,
  };
}

async function updateAiEducationHealth(input: AiEducationStoredState): Promise<AiEducationStoredState> {
  const now = new Date().toISOString();
  try {
    const healthPayload = await requestAiEducationJson(input, "/api/health", {
      method: "GET",
    });
    const healthBody = asObject(healthPayload.body) ?? {};
    const observedServerProviders = await fetchObservedServerProviders(input).catch(() =>
      defaultObservedServerProviders(now),
    );
    const pdfProviderVerification = await verifyPdfProvider(input, now);
    const providerCount = Object.keys(observedServerProviders.providers).length;
    const providerMessage =
      providerCount > 0
        ? `${providerCount} server-configured provider(s) observed.`
        : "No server-configured providers were returned by /api/server-providers.";
    const pdfMessage = pdfProviderVerification.message || "No PDF provider verification recorded.";

    const nextState: AiEducationStoredState = {
      ...input,
      updatedAt: now,
      health: {
        status: "ok",
        checkedAt: now,
        baseUrl: input.config.baseUrl,
        message: `OpenMAIC is reachable. ${providerMessage} ${pdfMessage}`.trim(),
        version: asString(healthBody.version),
        capabilities: normalizeCapabilities(healthBody.capabilities),
        pdfProviderVerification,
      },
      observedServerProviders,
      openmaicConfigSync: reconcileConfigSyncAfterObservation(
        input.openmaicConfigSync,
        input.config,
        observedServerProviders,
        now,
      ),
    };
    await writeStoredAiEducationState(nextState);
    return nextState;
  } catch (error) {
    const nextState: AiEducationStoredState = {
      ...input,
      updatedAt: now,
      health: {
        status: "error",
        checkedAt: now,
        baseUrl: input.config.baseUrl,
        message: normalizeHealthErrorMessage(input, error),
        version: undefined,
        capabilities: {
          ...EMPTY_CAPABILITIES,
        },
        pdfProviderVerification: {
          status: input.config.pdfProvider === "mineru" ? "error" : "skipped",
          checkedAt: now,
          message:
            input.config.pdfProvider === "mineru"
              ? "MinerU verification was skipped because OpenMAIC is not reachable."
              : "Using built-in unpdf parser.",
        },
      },
    };
    await writeStoredAiEducationState(nextState);
    return nextState;
  }
}

async function resolveAiEducationCapabilities(input: AiEducationStoredState): Promise<AiEducationCapabilities> {
  const healthy =
    input.health.status === "ok" &&
    input.health.baseUrl === input.config.baseUrl &&
    typeof input.health.checkedAt === "string";
  if (healthy) {
    return {
      ...EMPTY_CAPABILITIES,
      ...input.health.capabilities,
    };
  }
  const nextState = await updateAiEducationHealth(input);
  if (nextState.health.status === "ok") {
    return {
      ...EMPTY_CAPABILITIES,
      ...nextState.health.capabilities,
    };
  }
  return {
    ...EMPTY_CAPABILITIES,
  };
}

async function requestAiEducationJson(
  input: AiEducationStoredState,
  pathOrUrl: string,
  init: RequestInit,
): Promise<{ body: unknown; response: Response }> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }
  if (input.config.mode === "hosted" && input.config.accessCode) {
    headers.set("authorization", `Bearer ${input.config.accessCode}`);
  }

  const url =
    /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : new URL(pathOrUrl, input.config.baseUrl).toString();
  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body = await readResponseBody(response);
  if (!response.ok) {
    throw new Error(extractAiEducationErrorMessage(body, response));
  }
  return {
    body,
    response,
  };
}

async function fetchObservedServerProviders(
  input: AiEducationStoredState,
): Promise<AiEducationObservedServerProviders> {
  const payload = await requestAiEducationJson(input, "/api/server-providers", {
    method: "GET",
  });
  return normalizeObservedServerProviders(payload.body, new Date().toISOString());
}

async function verifyPdfProvider(
  input: AiEducationStoredState,
  now: string,
): Promise<AiEducationPdfVerificationState> {
  if (input.config.pdfProvider !== "mineru") {
    return {
      status: "skipped",
      checkedAt: now,
      message: "Using built-in unpdf parser.",
    };
  }
  if (!input.config.pdfBaseUrl) {
    return {
      status: "error",
      checkedAt: now,
      message: "MinerU base URL is required before verification can run.",
    };
  }
  try {
    const payload = await requestAiEducationJson(input, "/api/verify-pdf-provider", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        providerId: "mineru",
        baseUrl: input.config.pdfBaseUrl,
        apiKey: input.config.pdfApiKey || undefined,
      }),
    });
    const root = asObject(payload.body) ?? {};
    const data = asObject(root.data);
    return {
      status: "ok",
      checkedAt: now,
      message: asString(data?.message) ?? asString(root.message) ?? "MinerU verification succeeded.",
    };
  } catch (error) {
    return {
      status: "error",
      checkedAt: now,
      message: error instanceof Error ? error.message : "MinerU verification failed.",
    };
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (/application\/json/i.test(contentType)) {
    return await response.json().catch(() => null);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractAiEducationErrorMessage(body: unknown, response: Response): string {
  const root = asObject(body);
  const data = asObject(root?.data);
  const details = asString(root?.details) ?? asString(data?.details);
  const errorMessage = asString(root?.error) ?? asString(data?.error);
  const message = asString(root?.message) ?? asString(data?.message);
  const combined = [errorMessage, message, details].filter(Boolean).join(" ");
  if (combined) {
    return combined.trim();
  }
  if (typeof body === "string" && body.trim()) {
    return body.trim();
  }
  return `OpenMAIC request failed with HTTP ${response.status}.`;
}

function normalizeAiEducationJobPayload(
  body: unknown,
  input: {
    baseUrl: string;
    fallbackJobId?: string;
    requirement?: string;
  },
): AiEducationJobState {
  const root = asObject(body) ?? {};
  const result = asObject(root.result);
  const classroomId = asString(result?.classroomId) ?? asString(root.classroomId);
  const classroomUrl =
    asString(result?.url) ??
    asString(root.url) ??
    (classroomId ? new URL(`/classroom/${encodeURIComponent(classroomId)}`, input.baseUrl).toString() : undefined);
  return {
    jobId: asString(root.jobId) ?? input.fallbackJobId,
    requirement: input.requirement,
    status: normalizeJobStatus(root.status),
    step: asString(root.step),
    progress: asFiniteNumber(root.progress),
    message: asString(root.message),
    pollUrl: asString(root.pollUrl),
    pollIntervalMs: asFiniteNumber(root.pollIntervalMs),
    scenesGenerated: asFiniteNumber(root.scenesGenerated),
    totalScenes: asFiniteNumber(root.totalScenes),
    classroomId,
    classroomUrl,
    error: normalizeJobError(root.error),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeJobError(input: unknown): string | undefined {
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed || undefined;
  }
  const root = asObject(input);
  return asString(root?.message) ?? asString(root?.details) ?? asString(root?.error);
}

function buildDesiredOpenMaicConfig(
  config: AiEducationStoredConfig,
): { ok: true; providerId: string; providerEntry: Record<string, unknown>; pdfEntry?: Record<string, unknown> } | { ok: false; message: string } {
  if (!config.llmModel) {
    return { ok: false, message: "LLM model is required before writing OpenMAIC provider config." };
  }
  if (!config.llmApiKey) {
    return { ok: false, message: "LLM API key is required before writing OpenMAIC provider config." };
  }
  if (config.llmProviderPreset === "custom_openai_compatible" && !config.llmBaseUrl) {
    return { ok: false, message: "Custom OpenAI-compatible mode requires a Base URL." };
  }
  if (config.pdfProvider === "mineru" && !config.pdfBaseUrl) {
    return { ok: false, message: "MinerU mode requires a Base URL before it can be written to OpenMAIC." };
  }

  const providerEntry: Record<string, unknown> = {
    apiKey: config.llmApiKey,
    models: [config.llmModel],
  };
  if (config.llmBaseUrl) {
    providerEntry.baseUrl = config.llmBaseUrl;
  }
  return {
    ok: true,
    providerId: resolveManagedProviderId(config.llmProviderPreset),
    providerEntry,
    pdfEntry:
      config.pdfProvider === "mineru"
        ? {
            baseUrl: config.pdfBaseUrl,
            ...(config.pdfApiKey ? { apiKey: config.pdfApiKey } : {}),
          }
        : undefined,
  };
}

async function validateOpenMaicRepoDir(
  repoDir: string,
): Promise<{ ok: true; repoDir: string; configPath: string } | { ok: false; message: string; configPath?: string }> {
  const normalizedRepoDir = normalizeOptionalPath(repoDir);
  if (!normalizedRepoDir) {
    return {
      ok: false,
      message: "OpenMAIC repoDir is required before writing provider config.",
    };
  }

  const packageJsonPath = join(normalizedRepoDir, "package.json");
  const appPagePath = join(normalizedRepoDir, "app", "page.tsx");
  const providerConfigPath = join(normalizedRepoDir, "lib", "server", "provider-config.ts");
  const configPath = join(normalizedRepoDir, AI_EDUCATION_OPENMAIC_CONFIG_FILE);

  try {
    await access(packageJsonPath, fsConstants.R_OK);
    await access(appPagePath, fsConstants.R_OK);
    await access(providerConfigPath, fsConstants.R_OK);
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as { name?: string };
    if (packageJson?.name !== "openmaic") {
      return {
        ok: false,
        message: `repoDir does not look like an OpenMAIC checkout: expected package.json name "openmaic" at ${packageJsonPath}.`,
        configPath,
      };
    }
    return {
      ok: true,
      repoDir: normalizedRepoDir,
      configPath,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? `repoDir validation failed: ${error.message}` : "repoDir validation failed.",
      configPath,
    };
  }
}

function normalizeYamlRoot(raw: string): Record<string, unknown> {
  if (!raw.trim()) {
    return {};
  }
  return asObject(YAML.parse(raw)) ?? {};
}

function mergeOpenMaicServerProvidersConfig(
  existingRoot: Record<string, unknown>,
  desired: { providerId: string; providerEntry: Record<string, unknown>; pdfEntry?: Record<string, unknown> },
): Record<string, unknown> {
  const nextRoot: Record<string, unknown> = {
    ...existingRoot,
  };
  const existingProviders = asObject(existingRoot.providers) ?? {};
  nextRoot.providers = {
    ...existingProviders,
    [desired.providerId]: {
      ...(asObject(existingProviders[desired.providerId]) ?? {}),
      ...desired.providerEntry,
    },
  };

  const currentPdf = asObject(existingRoot.pdf) ?? {};
  const nextPdf = {
    ...currentPdf,
  };
  if (desired.pdfEntry) {
    nextPdf.mineru = {
      ...(asObject(currentPdf.mineru) ?? {}),
      ...desired.pdfEntry,
    };
  } else {
    delete nextPdf.mineru;
  }
  if (Object.keys(nextPdf).length > 0) {
    nextRoot.pdf = nextPdf;
  } else {
    delete nextRoot.pdf;
  }
  return nextRoot;
}

function resolveManagedProviderId(preset: AiEducationLlmProviderPreset): string {
  return preset === "custom_openai_compatible" ? "openai" : preset;
}

function matchesDesiredOpenMaicConfig(
  config: AiEducationStoredConfig,
  observed: AiEducationObservedServerProviders,
): boolean {
  const providerId = resolveManagedProviderId(config.llmProviderPreset);
  const observedProvider = asObject(observed.providers[providerId]);
  const llmModels = Array.isArray(observedProvider?.models)
    ? observedProvider.models.filter((item): item is string => typeof item === "string")
    : [];
  const expectedBaseUrl = normalizeOptionalHttpUrl(config.llmBaseUrl);
  const observedBaseUrl = normalizeOptionalHttpUrl(asString(observedProvider?.baseUrl));
  const llmMatches =
    Boolean(observedProvider) &&
    (!config.llmModel || llmModels.includes(config.llmModel)) &&
    (!expectedBaseUrl || expectedBaseUrl === observedBaseUrl);
  if (!llmMatches) {
    return false;
  }

  if (config.pdfProvider === "mineru") {
    const observedMineru = asObject(observed.pdf.mineru);
    return (
      Boolean(observedMineru) &&
      normalizeOptionalHttpUrl(config.pdfBaseUrl) === normalizeOptionalHttpUrl(asString(observedMineru?.baseUrl))
    );
  }
  return !("mineru" in observed.pdf);
}

function reconcileConfigSyncAfterObservation(
  current: AiEducationConfigSyncState,
  config: AiEducationStoredConfig,
  observed: AiEducationObservedServerProviders,
  now: string,
): AiEducationConfigSyncState {
  if (current.status !== "pending_restart" && current.status !== "synced") {
    return current;
  }
  const synced = matchesDesiredOpenMaicConfig(config, observed);
  return {
    status: synced ? "synced" : "pending_restart",
    updatedAt: now,
    message: synced
      ? "The running OpenMAIC process now reflects the provider settings written from AI Education."
      : "The written provider settings are still not reflected by the running OpenMAIC process. Restart OpenMAIC to reload server providers.",
  };
}

function maskAccessCode(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  const suffix = trimmed.slice(-4);
  return `${trimmed.slice(0, Math.min(3, trimmed.length))}***${suffix}`;
}

function normalizeBaseUrl(mode: AiEducationMode, input: string): string {
  if (mode === "hosted") {
    return AI_EDUCATION_HOSTED_BASE_URL;
  }
  const normalized = normalizeOptionalHttpUrl(input);
  return normalized || AI_EDUCATION_SELF_HOSTED_DEFAULT_BASE_URL;
}

function normalizeLaunchUrl(input: string): string | undefined {
  return normalizeOptionalHttpUrl(input);
}

function normalizeOptionalHttpUrl(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function normalizeOptionalPath(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }
  const trimmed = input.trim();
  return trimmed ? resolve(trimmed) : "";
}

function normalizeInlineValue(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeHealthErrorMessage(input: AiEducationStoredState, error: unknown): string {
  const fallback = error instanceof Error ? error.message : "Failed to reach OpenMAIC.";
  if (
    input.config.mode === "self_hosted" &&
    input.config.baseUrl === AI_EDUCATION_SELF_HOSTED_DEFAULT_BASE_URL &&
    /fetch failed|ECONNREFUSED|Failed to fetch|refused/i.test(fallback)
  ) {
    return `Local OpenMAIC is not reachable at ${AI_EDUCATION_SELF_HOSTED_DEFAULT_BASE_URL}. Start the local OpenMAIC service or switch to hosted OpenMAIC.`;
  }
  return fallback;
}

function normalizeHealthStatus(input: unknown): AiEducationHealthStatus {
  return input === "ok" || input === "error" ? input : "unknown";
}

function normalizeJobStatus(input: unknown): AiEducationJobStatus {
  if (input === "queued" || input === "running" || input === "succeeded" || input === "failed") {
    return input;
  }
  return "idle";
}

function normalizeConfigSyncStatus(input: unknown): AiEducationConfigSyncStatus {
  return input === "pending_restart" || input === "synced" || input === "error" ? input : "idle";
}

function normalizePdfProvider(input: unknown): AiEducationPdfProvider {
  return input === "mineru" ? "mineru" : "unpdf";
}

function normalizeLlmProviderPreset(input: unknown): AiEducationLlmProviderPreset {
  return AI_EDUCATION_LLM_PROVIDER_PRESETS.includes(input as AiEducationLlmProviderPreset)
    ? (input as AiEducationLlmProviderPreset)
    : "openai";
}

function normalizeCapabilities(input: unknown): AiEducationCapabilities {
  const root = asObject(input);
  return {
    webSearch: root?.webSearch === true,
    imageGeneration: root?.imageGeneration === true,
    videoGeneration: root?.videoGeneration === true,
    tts: root?.tts === true,
  };
}

function normalizePdfVerificationState(input: unknown, fallbackTime: string): AiEducationPdfVerificationState {
  const root = asObject(input);
  return {
    status:
      root?.status === "ok" || root?.status === "error" || root?.status === "skipped"
        ? root.status
        : "unknown",
    checkedAt: normalizeOptionalIsoTimestamp(root?.checkedAt) ?? fallbackTime,
    message: asString(root?.message),
  };
}

function normalizeObservedServerProviders(
  input: unknown,
  fallbackTime: string,
): AiEducationObservedServerProviders {
  const root = asObject(input) ?? {};
  return {
    checkedAt: normalizeOptionalIsoTimestamp(root.checkedAt) ?? fallbackTime,
    providers: normalizeObservedProviderSection(root.providers),
    tts: normalizeObservedProviderSection(root.tts),
    asr: normalizeObservedProviderSection(root.asr),
    pdf: normalizeObservedProviderSection(root.pdf),
    image: normalizeObservedProviderSection(root.image),
    video: normalizeObservedProviderSection(root.video),
    webSearch: normalizeObservedProviderSection(root.webSearch),
  };
}

function normalizeObservedProviderSection(input: unknown): Record<string, Record<string, unknown>> {
  const root = asObject(input);
  if (!root) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(root)
      .map(([key, value]) => [key, asObject(value) ?? {}])
      .filter(([key]) => Boolean(key)),
  );
}

function normalizeOptionalIsoTimestamp(input: unknown): string | undefined {
  if (typeof input !== "string" || Number.isNaN(Date.parse(input))) {
    return undefined;
  }
  return new Date(input).toISOString();
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

function asString(input: unknown): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  const trimmed = input.trim();
  return trimmed || undefined;
}

function asFiniteNumber(input: unknown): number | undefined {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return undefined;
  }
  return input;
}

async function writeStoredAiEducationState(state: AiEducationStoredState): Promise<void> {
  const nextPath = getAiEducationStatePath();
  persistAiEducationStateQueue = persistAiEducationStateQueue.then(async () => {
    await mkdir(dirname(nextPath), { recursive: true });
    await writeFile(nextPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  });
  await persistAiEducationStateQueue;
}
