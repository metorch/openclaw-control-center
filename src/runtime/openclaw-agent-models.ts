import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { humanizeOperatorDisplayName } from "./operator-display";
import { resolveOpenClawConfigPath } from "./current-agent-catalog";

export interface OpenClawModelOption {
  value: string;
  label: string;
}

export interface OpenClawAgentModelRecord {
  agentId: string;
  displayName: string;
  model: string;
  fallbackModel?: string;
  workspace: string;
  toolsProfile: string;
  modelOptions: OpenClawModelOption[];
  configPath: string;
}

export interface OpenClawAgentModelSnapshot {
  records: OpenClawAgentModelRecord[];
  modelOptions: OpenClawModelOption[];
  configPath: string;
  fallbackStatePath: string;
}

export interface OpenClawAgentModelUpdateInput {
  model: string;
  fallbackModel?: string;
}

export interface OpenClawAgentModelSwapResult extends OpenClawAgentModelRecord {
  previousModel: string;
  previousFallbackModel?: string;
}

export class OpenClawAgentModelConfigError extends Error {
  code: "NOT_FOUND" | "INVALID_CONFIG" | "INVALID_MODEL" | "INVALID_AGENT";

  constructor(
    code: "NOT_FOUND" | "INVALID_CONFIG" | "INVALID_MODEL" | "INVALID_AGENT",
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

export function collectOpenClawModelOptions(
  configRoot: unknown,
  currentModels: string[] = [],
): OpenClawModelOption[] {
  const merged = new Map<string, OpenClawModelOption>();
  const register = (value: string | undefined, label: string | undefined) => {
    const normalized = value?.trim();
    if (!normalized || merged.has(normalized)) {
      return;
    }
    merged.set(normalized, {
      value: normalized,
      label: label?.trim() ? label.trim() : normalized,
    });
  };

  const root = asObject(configRoot);
  const agentsRoot = asObject(root?.agents);
  const defaults = asObject(agentsRoot?.defaults);
  const defaultModel = asString(asObject(defaults?.model)?.primary);
  register(defaultModel, defaultModel);

  const configuredModels = asObject(defaults?.models);
  for (const [key, rawValue] of Object.entries(configuredModels ?? {})) {
    const modelConfig = asObject(rawValue);
    const alias = asString(modelConfig?.alias);
    register(key, alias ? `${alias} 路 ${key}` : key);
  }

  const providers = asObject(asObject(root?.models)?.providers);
  for (const [providerKey, rawProvider] of Object.entries(providers ?? {})) {
    const provider = asObject(rawProvider);
    for (const rawModel of asArray(provider?.models)) {
      const model = asObject(rawModel);
      const modelId = asString(model?.id)?.trim();
      if (!modelId) {
        continue;
      }
      const name = asString(model?.name)?.trim();
      const value = `${providerKey}/${modelId}`;
      register(value, name ? `${name} 路 ${value}` : value);
    }
  }

  for (const currentModel of currentModels) {
    register(currentModel, currentModel);
  }

  return [...merged.values()].sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"));
}

export function resolveOpenClawAgentModelOverridesPath(
  configPath = resolveOpenClawConfigPath(),
): string {
  return join(dirname(configPath), "runtime", "openclaw-agent-model-overrides.json");
}

export async function loadOpenClawAgentModelSnapshot(
  configPath = resolveOpenClawConfigPath(),
): Promise<OpenClawAgentModelSnapshot> {
  const state = await loadOpenClawAgentModelsState(configPath);
  return {
    records: state.list.map((entry) =>
      buildOpenClawAgentModelRecord(entry, state.modelOptions, state.configPath, state.fallbackModels),
    ),
    modelOptions: state.modelOptions,
    configPath: state.configPath,
    fallbackStatePath: state.fallbackStatePath,
  };
}

export async function loadOpenClawAgentModelRecord(
  agentId: string,
  configPath = resolveOpenClawConfigPath(),
): Promise<OpenClawAgentModelRecord | undefined> {
  const state = await loadOpenClawAgentModelsState(configPath);
  const entry = findOpenClawAgentEntry(state.list, agentId);
  if (!entry) {
    return undefined;
  }
  return buildOpenClawAgentModelRecord(
    entry,
    state.modelOptions,
    state.configPath,
    state.fallbackModels,
  );
}

export async function updateOpenClawAgentModelRecord(
  agentId: string,
  input: OpenClawAgentModelUpdateInput,
  configPath = resolveOpenClawConfigPath(),
): Promise<OpenClawAgentModelRecord | undefined> {
  const state = await loadOpenClawAgentModelsState(configPath);
  const entry = findOpenClawAgentEntry(state.list, agentId);
  if (!entry) {
    return undefined;
  }

  const nextModel = normalizeModelValue(input.model);
  const nextFallbackModel = normalizeOptionalModelValue(input.fallbackModel);
  validateConfiguredModelValue(state.modelOptions, nextModel);
  if (nextFallbackModel) {
    validateConfiguredModelValue(state.modelOptions, nextFallbackModel);
  }

  entry.model = nextModel;
  setFallbackModelForEntry(state.fallbackModels, entry, nextFallbackModel);

  await saveOpenClawAgentModelsState(state);
  return buildOpenClawAgentModelRecord(
    entry,
    state.modelOptions,
    state.configPath,
    state.fallbackModels,
  );
}

export async function swapOpenClawAgentToFallbackModel(
  agentId: string,
  configPath = resolveOpenClawConfigPath(),
): Promise<OpenClawAgentModelSwapResult | undefined> {
  const state = await loadOpenClawAgentModelsState(configPath);
  const entry = findOpenClawAgentEntry(state.list, agentId);
  if (!entry) {
    return undefined;
  }

  const currentModel = normalizeModelValue(asString(entry.model));
  const fallbackModel = getFallbackModelForEntry(state.fallbackModels, entry);
  if (!fallbackModel || fallbackModel === currentModel) {
    return undefined;
  }

  validateConfiguredModelValue(state.modelOptions, currentModel);
  validateConfiguredModelValue(state.modelOptions, fallbackModel);

  entry.model = fallbackModel;
  setFallbackModelForEntry(state.fallbackModels, entry, currentModel);

  await saveOpenClawAgentModelsState(state);

  const updated = buildOpenClawAgentModelRecord(
    entry,
    state.modelOptions,
    state.configPath,
    state.fallbackModels,
  );
  return {
    ...updated,
    previousModel: currentModel,
    previousFallbackModel: fallbackModel,
  };
}

async function loadOpenClawAgentModelsState(configPath: string): Promise<{
  root: Record<string, unknown>;
  configPath: string;
  fallbackStatePath: string;
  list: Record<string, unknown>[];
  fallbackModels: Map<string, string>;
  modelOptions: OpenClawModelOption[];
}> {
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch (error) {
    if (isFsNotFound(error)) {
      throw new OpenClawAgentModelConfigError("NOT_FOUND", "openclaw.json not found.");
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new OpenClawAgentModelConfigError("INVALID_CONFIG", "openclaw.json could not be parsed.");
  }

  const root = asObject(parsed);
  if (!root) {
    throw new OpenClawAgentModelConfigError("INVALID_CONFIG", "openclaw.json root must be an object.");
  }
  const agentsRoot = asObject(root.agents);
  const list = asArray(agentsRoot?.list)
    .map((item) => asObject(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
  const fallbackStatePath = resolveOpenClawAgentModelOverridesPath(configPath);
  const fallbackModels = await readOpenClawAgentModelOverridesState(fallbackStatePath);

  let configChanged = false;
  let fallbackChanged = false;
  const activeAgentKeys = new Set<string>();

  for (const entry of list) {
    const agentKey = getEntryLookupKey(entry);
    if (!agentKey) {
      continue;
    }
    activeAgentKeys.add(agentKey);
    const legacyFallbackModel = normalizeOptionalModelValue(asString(entry.fallbackModel));
    if ("fallbackModel" in entry) {
      delete entry.fallbackModel;
      configChanged = true;
    }
    if (legacyFallbackModel && fallbackModels.get(agentKey) !== legacyFallbackModel) {
      fallbackModels.set(agentKey, legacyFallbackModel);
      fallbackChanged = true;
    }
  }

  for (const existingKey of [...fallbackModels.keys()]) {
    if (activeAgentKeys.has(existingKey)) {
      continue;
    }
    fallbackModels.delete(existingKey);
    fallbackChanged = true;
  }

  if (configChanged) {
    await writeOpenClawConfigState(configPath, root);
  }
  if (fallbackChanged) {
    await writeOpenClawAgentModelOverridesState(fallbackStatePath, fallbackModels);
  }

  const currentModels = list.flatMap((item) => {
    const primary = asString(item.model)?.trim();
    const fallback = getFallbackModelForEntry(fallbackModels, item);
    return [primary, fallback].filter((value): value is string => Boolean(value));
  });

  return {
    root,
    configPath,
    fallbackStatePath,
    list,
    fallbackModels,
    modelOptions: collectOpenClawModelOptions(root, currentModels),
  };
}

async function saveOpenClawAgentModelsState(state: {
  root: Record<string, unknown>;
  configPath: string;
  fallbackStatePath: string;
  fallbackModels: Map<string, string>;
}): Promise<void> {
  await writeOpenClawConfigState(state.configPath, state.root);
  await writeOpenClawAgentModelOverridesState(state.fallbackStatePath, state.fallbackModels);
}

function findOpenClawAgentEntry(
  list: Record<string, unknown>[],
  agentId: string,
): Record<string, unknown> | undefined {
  const normalizedAgentId = normalizeLookupKey(agentId);
  return list.find((item) => getEntryLookupKey(item) === normalizedAgentId);
}

function buildOpenClawAgentModelRecord(
  entry: Record<string, unknown>,
  modelOptions: OpenClawModelOption[],
  configPath: string,
  fallbackModels: ReadonlyMap<string, string>,
): OpenClawAgentModelRecord {
  const rawId = asString(entry.id)?.trim() ?? asString(entry.name)?.trim() ?? "";
  const identity = asObject(entry.identity);
  const tools = asObject(entry.tools);
  const model = normalizeModelValue(asString(entry.model));
  return {
    agentId: rawId,
    displayName:
      humanizeOperatorDisplayName(
        asString(entry.name)?.trim() || asString(identity?.name)?.trim() || rawId,
      ) || rawId,
    model,
    fallbackModel: getFallbackModelForEntry(fallbackModels, entry),
    workspace: asString(entry.workspace)?.trim() || "unlisted",
    toolsProfile: asString(tools?.profile)?.trim() || "default",
    modelOptions,
    configPath,
  };
}

async function readOpenClawAgentModelOverridesState(
  fallbackStatePath: string,
): Promise<Map<string, string>> {
  let raw: string;
  try {
    raw = await readFile(fallbackStatePath, "utf8");
  } catch (error) {
    if (isFsNotFound(error)) {
      return new Map<string, string>();
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return new Map<string, string>();
  }

  const root = asObject(parsed);
  const agentsRoot = asObject(root?.agents);
  const fallbackModels = new Map<string, string>();
  for (const [rawAgentId, rawEntry] of Object.entries(agentsRoot ?? {})) {
    const agentKey = normalizeLookupKey(rawAgentId);
    const value =
      normalizeOptionalModelValue(asString(rawEntry)) ??
      normalizeOptionalModelValue(asString(asObject(rawEntry)?.fallbackModel));
    if (!agentKey || !value) {
      continue;
    }
    fallbackModels.set(agentKey, value);
  }
  return fallbackModels;
}

async function writeOpenClawAgentModelOverridesState(
  fallbackStatePath: string,
  fallbackModels: ReadonlyMap<string, string>,
): Promise<void> {
  if (fallbackModels.size === 0) {
    try {
      await unlink(fallbackStatePath);
    } catch (error) {
      if (!isFsNotFound(error)) {
        throw error;
      }
    }
    return;
  }

  await mkdir(dirname(fallbackStatePath), { recursive: true });
  const agents = Object.fromEntries(
    [...fallbackModels.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "en"))
      .map(([agentId, fallbackModel]) => [agentId, { fallbackModel }]),
  );
  await writeFile(
    fallbackStatePath,
    `${JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        agents,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function writeOpenClawConfigState(configPath: string, root: Record<string, unknown>): Promise<void> {
  await writeFile(configPath, `${JSON.stringify(root, null, 2)}\n`, "utf8");
}

function getFallbackModelForEntry(
  fallbackModels: ReadonlyMap<string, string>,
  entry: Record<string, unknown>,
): string | undefined {
  const agentKey = getEntryLookupKey(entry);
  return agentKey ? normalizeOptionalModelValue(fallbackModels.get(agentKey)) : undefined;
}

function setFallbackModelForEntry(
  fallbackModels: Map<string, string>,
  entry: Record<string, unknown>,
  fallbackModel: string | undefined,
): void {
  const agentKey = getEntryLookupKey(entry);
  if (!agentKey) {
    return;
  }
  if (fallbackModel) {
    fallbackModels.set(agentKey, fallbackModel);
    return;
  }
  fallbackModels.delete(agentKey);
}

function getEntryLookupKey(entry: Record<string, unknown>): string {
  const rawId = asString(entry.id)?.trim() ?? asString(entry.name)?.trim() ?? "";
  return normalizeLookupKey(rawId);
}

function validateConfiguredModelValue(
  modelOptions: OpenClawModelOption[],
  value: string,
): void {
  const allowed = new Set(modelOptions.map((item) => item.value));
  if (!allowed.has(value)) {
    throw new OpenClawAgentModelConfigError(
      "INVALID_MODEL",
      "model must be one of the configured OpenClaw models.",
    );
  }
}

function normalizeModelValue(input: string | undefined): string {
  const normalized = String(input || "").trim();
  if (!normalized) {
    throw new OpenClawAgentModelConfigError("INVALID_MODEL", "model is required.");
  }
  return normalized;
}

function normalizeOptionalModelValue(input: string | undefined): string | undefined {
  const normalized = String(input || "").trim();
  return normalized || undefined;
}

function normalizeLookupKey(input: string | undefined): string {
  return String(input || "").trim().toLowerCase();
}

function asArray(input: unknown): unknown[] {
  return Array.isArray(input) ? input : [];
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

function asString(input: unknown): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function isFsNotFound(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string" &&
      (error as { code: string }).code === "ENOENT",
  );
}
