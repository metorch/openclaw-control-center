import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const FEATURE_CONTROL_PATH = join(process.cwd(), "runtime", "feature-control.json");
export const FEATURE_CONTROL_KEYS = ["geo", "education", "prediction"] as const;

export type FeatureControlKey = (typeof FEATURE_CONTROL_KEYS)[number];

export interface FeatureControlEntry {
  aiTakeoverEnabled: boolean;
  mode: "operator_only" | "openclaw_ai_scoped";
  updatedAt: string;
}

export interface FeatureControlState {
  version: 1;
  updatedAt: string;
  features: Record<FeatureControlKey, FeatureControlEntry>;
}

export interface FeatureControlLoadResult {
  path: string;
  state: FeatureControlState;
  issues: string[];
}

export function defaultFeatureControlState(now = new Date().toISOString()): FeatureControlState {
  return {
    version: 1,
    updatedAt: now,
    features: {
      geo: {
        aiTakeoverEnabled: false,
        mode: "operator_only",
        updatedAt: now,
      },
      education: {
        aiTakeoverEnabled: false,
        mode: "operator_only",
        updatedAt: now,
      },
      prediction: {
        aiTakeoverEnabled: false,
        mode: "operator_only",
        updatedAt: now,
      },
    },
  };
}

export function isFeatureControlKey(input: string): input is FeatureControlKey {
  return FEATURE_CONTROL_KEYS.includes(input as FeatureControlKey);
}

export async function loadFeatureControlState(): Promise<FeatureControlLoadResult> {
  try {
    const raw = await readFile(FEATURE_CONTROL_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeFeatureControlState(parsed);
    if (normalized.issues.length > 0) {
      await writeFeatureControlState(normalized.state);
    }
    return {
      path: FEATURE_CONTROL_PATH,
      state: normalized.state,
      issues: normalized.issues,
    };
  } catch (error) {
    const fallback = defaultFeatureControlState();
    const reason = error instanceof Error ? error.message : "unable to read feature control state";
    await writeFeatureControlState(fallback);
    return {
      path: FEATURE_CONTROL_PATH,
      state: fallback,
      issues: [`feature control fallback applied: ${reason}`],
    };
  }
}

export async function saveFeatureControlState(state: FeatureControlState): Promise<FeatureControlLoadResult> {
  const normalized = normalizeFeatureControlState(state);
  await writeFeatureControlState(normalized.state);
  return {
    path: FEATURE_CONTROL_PATH,
    state: normalized.state,
    issues: normalized.issues,
  };
}

export async function patchFeatureControl(input: {
  feature: FeatureControlKey;
  aiTakeoverEnabled: boolean;
}): Promise<FeatureControlLoadResult> {
  const current = await loadFeatureControlState();
  const now = new Date().toISOString();
  const next: FeatureControlState = {
    ...current.state,
    updatedAt: now,
    features: {
      ...current.state.features,
      [input.feature]: {
        aiTakeoverEnabled: input.aiTakeoverEnabled,
        mode: input.aiTakeoverEnabled ? "openclaw_ai_scoped" : "operator_only",
        updatedAt: now,
      },
    },
  };
  return await saveFeatureControlState(next);
}

function normalizeFeatureControlState(input: unknown): { state: FeatureControlState; issues: string[] } {
  const now = new Date().toISOString();
  const defaults = defaultFeatureControlState(now);
  const issues: string[] = [];
  const root = asObject(input);
  if (!root) {
    issues.push("feature control state must be a JSON object");
    return {
      state: defaults,
      issues,
    };
  }

  const features = asObject(root.features);
  if (!features) {
    issues.push("features must be an object");
  }

  const normalizedFeatures = FEATURE_CONTROL_KEYS.reduce(
    (acc, key) => {
      const entry = normalizeFeatureControlEntry(features?.[key], key, issues, now);
      acc[key] = entry;
      return acc;
    },
    {} as Record<FeatureControlKey, FeatureControlEntry>,
  );

  let updatedAt = now;
  if (typeof root.updatedAt === "string" && !Number.isNaN(Date.parse(root.updatedAt))) {
    updatedAt = new Date(root.updatedAt).toISOString();
  } else if (root.updatedAt !== undefined) {
    issues.push("updatedAt must be an ISO-8601 timestamp");
  }

  return {
    state: {
      version: 1,
      updatedAt,
      features: normalizedFeatures,
    },
    issues,
  };
}

function normalizeFeatureControlEntry(
  input: unknown,
  key: FeatureControlKey,
  issues: string[],
  now: string,
): FeatureControlEntry {
  const fallback = defaultFeatureControlState(now).features[key];
  const entry = asObject(input);
  if (!entry) {
    if (input !== undefined) {
      issues.push(`features.${key} must be an object`);
    }
    return fallback;
  }

  let aiTakeoverEnabled = fallback.aiTakeoverEnabled;
  if (entry.aiTakeoverEnabled !== undefined) {
    if (typeof entry.aiTakeoverEnabled === "boolean") {
      aiTakeoverEnabled = entry.aiTakeoverEnabled;
    } else {
      issues.push(`features.${key}.aiTakeoverEnabled must be a boolean`);
    }
  }

  let updatedAt = fallback.updatedAt;
  if (typeof entry.updatedAt === "string" && !Number.isNaN(Date.parse(entry.updatedAt))) {
    updatedAt = new Date(entry.updatedAt).toISOString();
  } else if (entry.updatedAt !== undefined) {
    issues.push(`features.${key}.updatedAt must be an ISO-8601 timestamp`);
  }

  return {
    aiTakeoverEnabled,
    mode: aiTakeoverEnabled ? "openclaw_ai_scoped" : "operator_only",
    updatedAt,
  };
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

async function writeFeatureControlState(state: FeatureControlState): Promise<void> {
  await mkdir(join(process.cwd(), "runtime"), { recursive: true });
  await writeFile(FEATURE_CONTROL_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
