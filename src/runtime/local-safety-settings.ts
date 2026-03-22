import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  APPROVAL_ACTIONS_ENABLED,
  IMPORT_MUTATION_ENABLED,
  IMPORT_MUTATION_DRY_RUN,
  LOCAL_API_TOKEN,
  LOCAL_TOKEN_AUTH_REQUIRED,
  READONLY_MODE,
} from "../config";
import { normalizeToken } from "./local-token-auth";

export interface LocalSafetySettingsValues {
  readonlyMode: boolean;
  localTokenAuthRequired: boolean;
  importMutationEnabled: boolean;
  importMutationDryRun: boolean;
  approvalActionsEnabled: boolean;
  localApiToken: string;
}

export interface WriteLocalSafetySettingsInput {
  envPath?: string;
  values: LocalSafetySettingsValues;
}

export interface WriteLocalSafetySettingsResult {
  envPath: string;
  changed: boolean;
  content: string;
}

const LOCAL_SAFETY_ENV_KEYS = [
  "READONLY_MODE",
  "LOCAL_TOKEN_AUTH_REQUIRED",
  "IMPORT_MUTATION_ENABLED",
  "IMPORT_MUTATION_DRY_RUN",
  "APPROVAL_ACTIONS_ENABLED",
  "LOCAL_API_TOKEN",
] as const;

export function readCurrentLocalSafetySettings(): LocalSafetySettingsValues {
  return {
    readonlyMode: READONLY_MODE,
    localTokenAuthRequired: LOCAL_TOKEN_AUTH_REQUIRED,
    importMutationEnabled: IMPORT_MUTATION_ENABLED,
    importMutationDryRun: IMPORT_MUTATION_DRY_RUN,
    approvalActionsEnabled: APPROVAL_ACTIONS_ENABLED,
    localApiToken: LOCAL_API_TOKEN,
  };
}

export function resolveLocalSafetyEnvPath(): string {
  return join(process.cwd(), ".env");
}

export function normalizeLocalSafetyToken(value: string | null | undefined): string {
  if (value == null) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  const normalized = normalizeToken(trimmed);
  if (!normalized) {
    throw new Error("LOCAL_API_TOKEN is invalid. Use 1-256 visible characters without control characters.");
  }
  return normalized;
}

export function renderLocalSafetyEnvText(
  source: string,
  values: LocalSafetySettingsValues,
): string {
  let next = String(source || "");
  next = upsertEnvKey(next, "READONLY_MODE", values.readonlyMode ? "true" : "false");
  next = upsertEnvKey(
    next,
    "LOCAL_TOKEN_AUTH_REQUIRED",
    values.localTokenAuthRequired ? "true" : "false",
  );
  next = upsertEnvKey(
    next,
    "IMPORT_MUTATION_ENABLED",
    values.importMutationEnabled ? "true" : "false",
  );
  next = upsertEnvKey(
    next,
    "IMPORT_MUTATION_DRY_RUN",
    values.importMutationDryRun ? "true" : "false",
  );
  next = upsertEnvKey(
    next,
    "APPROVAL_ACTIONS_ENABLED",
    values.approvalActionsEnabled ? "true" : "false",
  );
  next = upsertEnvKey(next, "LOCAL_API_TOKEN", values.localApiToken);
  return next.endsWith("\n") ? next : `${next}\n`;
}

export async function writeLocalSafetySettings(
  input: WriteLocalSafetySettingsInput,
): Promise<WriteLocalSafetySettingsResult> {
  const envPath = input.envPath?.trim() || resolveLocalSafetyEnvPath();
  const previous = await readFile(envPath, "utf8").catch(() => "");
  const content = renderLocalSafetyEnvText(previous, input.values);
  const changed = content !== previous;
  if (changed) {
    await writeFile(envPath, content, "utf8");
  }
  return {
    envPath,
    changed,
    content,
  };
}

function upsertEnvKey(source: string, key: (typeof LOCAL_SAFETY_ENV_KEYS)[number], value: string): string {
  const normalizedSource = String(source || "").replace(/\r\n/g, "\n");
  const rendered = `${key}=${serializeEnvValue(value)}`;
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${escapeRegex(key)}\\s*=.*$`, "gm");
  if (pattern.test(normalizedSource)) {
    return normalizedSource.replace(pattern, rendered);
  }
  if (!normalizedSource.trim()) {
    return `${rendered}\n`;
  }
  return `${normalizedSource.replace(/\n*$/, "\n")}${rendered}\n`;
}

function serializeEnvValue(value: string): string {
  if (!value) return "";
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
