export type StageResultState = "in_progress" | "awaiting_review" | "blocked" | "failed";

export interface StageResultArtifact {
  label?: string;
  location: string;
}

export interface StageResultEnvelope {
  taskId: string;
  projectId: string;
  agentId: string;
  resultState: StageResultState;
  summary: string;
  artifacts: StageResultArtifact[];
  completionChecklist: string[];
  blockers: string[];
  nextSuggestion?: string;
  reportedAt: string;
}

export interface ParsedStageResultEnvelope {
  cleanReplyText: string;
  envelope?: StageResultEnvelope;
}

const STAGE_RESULT_TAG_REGEX = /<stage_result>\s*([\s\S]*?)\s*<\/stage_result>/giu;

export function parseStageResultEnvelopeFromReply(
  replyText: string,
  fallback: {
    taskId?: string;
    projectId?: string;
    agentId: string;
    reportedAt?: string;
  },
): ParsedStageResultEnvelope {
  const text = String(replyText || "");
  const matches = [...text.matchAll(STAGE_RESULT_TAG_REGEX)];
  if (matches.length === 0) {
    return {
      cleanReplyText: text.trim(),
    };
  }

  const last = matches.at(-1);
  const jsonPayload = String(last?.[1] || "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonPayload);
  } catch {
    return {
      cleanReplyText: stripStageResultTags(text).trim(),
    };
  }

  const envelope = normalizeStageResultEnvelope(parsed, fallback);
  return {
    cleanReplyText: stripStageResultTags(text).trim(),
    envelope,
  };
}

export function normalizeStageResultEnvelope(
  input: unknown,
  fallback: {
    taskId?: string;
    projectId?: string;
    agentId: string;
    reportedAt?: string;
  },
): StageResultEnvelope | undefined {
  const obj = asObject(input);
  if (!obj) return undefined;

  const taskId = boundedString(obj.taskId, 240) ?? boundedString(fallback.taskId, 240);
  const projectId = boundedString(obj.projectId, 240) ?? boundedString(fallback.projectId, 240);
  const agentId = boundedString(obj.agentId, 240) ?? boundedString(fallback.agentId, 240);
  const resultState = normalizeStageResultState(obj.resultState);
  const summary = boundedString(obj.summary, 4_000);
  const artifacts = normalizeArtifacts(obj.artifacts);
  const completionChecklist = normalizeStringList(obj.completionChecklist, 200);
  const blockers = normalizeStringList(obj.blockers, 200);
  const nextSuggestion = boundedString(obj.nextSuggestion, 1_200);
  const reportedAt = asIsoString(obj.reportedAt) ?? asIsoString(fallback.reportedAt) ?? new Date().toISOString();

  if (!taskId || !projectId || !agentId || !resultState || !summary) {
    return undefined;
  }

  return {
    taskId,
    projectId,
    agentId,
    resultState,
    summary,
    artifacts,
    completionChecklist,
    blockers,
    nextSuggestion,
    reportedAt,
  };
}

export function buildStageResultEnvelopeTemplate(input: {
  taskId: string;
  projectId: string;
  agentId: string;
}): string {
  return JSON.stringify(
    {
      taskId: input.taskId,
      projectId: input.projectId,
      agentId: input.agentId,
      resultState: "in_progress",
      summary: "Brief status update",
      artifacts: [],
      completionChecklist: [],
      blockers: [],
      nextSuggestion: "",
    },
    null,
    2,
  );
}

function stripStageResultTags(value: string): string {
  return value.replace(STAGE_RESULT_TAG_REGEX, "").replace(/\n{3,}/g, "\n\n");
}

function normalizeArtifacts(input: unknown): StageResultArtifact[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const artifacts: StageResultArtifact[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      const location = boundedString(item, 2_000);
      if (!location) continue;
      const key = location.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      artifacts.push({ location });
      continue;
    }
    const obj = asObject(item);
    if (!obj) continue;
    const location = boundedString(obj.location, 2_000) ?? boundedString(obj.path, 2_000);
    if (!location) continue;
    const key = location.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    artifacts.push({
      label: boundedString(obj.label, 160),
      location,
    });
  }
  return artifacts;
}

function normalizeStringList(input: unknown, maxLength: number): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const values: string[] = [];
  for (const item of input) {
    const normalized = boundedString(item, maxLength);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(normalized);
  }
  return values;
}

function normalizeStageResultState(input: unknown): StageResultState | undefined {
  switch (input) {
    case "in_progress":
    case "awaiting_review":
    case "blocked":
    case "failed":
      return input;
    default:
      return undefined;
  }
}

function boundedString(input: unknown, maxLength: number): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function asIsoString(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}
