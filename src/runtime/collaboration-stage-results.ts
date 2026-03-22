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

const STAGE_RESULT_TAG_REGEX = /<stage_result\b[^>]*>\s*([\s\S]*?)\s*<\\?\/stage_result>/giu;

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
    const xmlEnvelope = parseXmlStageResultEnvelope(String(last?.[0] || ""), fallback);
    if (xmlEnvelope) {
      return {
        cleanReplyText: stripStageResultTags(text).trim(),
        envelope: xmlEnvelope,
      };
    }
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

function parseXmlStageResultEnvelope(
  fragment: string,
  fallback: {
    taskId?: string;
    projectId?: string;
    agentId: string;
    reportedAt?: string;
  },
): StageResultEnvelope | undefined {
  const openingMatch = /<stage_result\b([^>]*)>/i.exec(fragment);
  const attributes = openingMatch?.[1] ?? "";
  const resultState = readXmlAttribute(attributes, "resultState");
  const taskId = readXmlAttribute(attributes, "taskId") ?? readXmlTag(fragment, "taskId");
  const projectId = readXmlAttribute(attributes, "projectId") ?? readXmlTag(fragment, "projectId");
  const agentId = readXmlAttribute(attributes, "agentId") ?? readXmlTag(fragment, "agentId");
  const reportedAt = readXmlAttribute(attributes, "reportedAt") ?? readXmlTag(fragment, "reportedAt");
  const summary = readXmlTag(fragment, "summary");
  const artifacts = parseXmlArtifacts(fragment);
  const completionChecklist = readXmlTagList(fragment, "check") ;
  const blockers = readXmlTagList(fragment, "blocker");
  const notes = readXmlTagList(fragment, "note");
  const nextSuggestion = readXmlTag(fragment, "nextSuggestion") ?? readXmlTag(fragment, "next_suggestion");

  return normalizeStageResultEnvelope(
    {
      taskId,
      projectId,
      agentId,
      resultState,
      summary,
      artifacts,
      completionChecklist: completionChecklist.length > 0 ? completionChecklist : notes,
      blockers,
      nextSuggestion,
      reportedAt,
    },
    fallback,
  );
}

function parseXmlArtifacts(fragment: string): StageResultArtifact[] {
  const artifacts: StageResultArtifact[] = [];
  const seen = new Set<string>();
  const pattern = /<artifact\b([^>]*)\/?>/gi;
  for (const match of fragment.matchAll(pattern)) {
    const attributes = match[1] ?? "";
    const location = readXmlAttribute(attributes, "location") ?? readXmlAttribute(attributes, "path");
    if (!location) continue;
    const normalizedLocation = boundedString(decodeXmlText(location), 2_000);
    if (!normalizedLocation) continue;
    const key = normalizedLocation.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    artifacts.push({
      label: boundedString(decodeXmlText(readXmlAttribute(attributes, "label")), 160),
      location: normalizedLocation,
    });
  }
  return artifacts;
}

function readXmlTag(fragment: string, tagName: string): string | undefined {
  const match = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i").exec(fragment);
  if (!match?.[1]) return undefined;
  return decodeXmlText(match[1]);
}

function readXmlTagList(fragment: string, tagName: string): string[] {
  const values: string[] = [];
  const seen = new Set<string>();
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  for (const match of fragment.matchAll(pattern)) {
    const decoded = boundedString(decodeXmlText(match[1]), 1_200);
    if (!decoded) continue;
    const key = decoded.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(decoded);
  }
  return values;
}

function readXmlAttribute(fragment: string, attributeName: string): string | undefined {
  const match = new RegExp(`${attributeName}\\s*=\\s*"([^"]*)"`, "i").exec(fragment);
  if (match?.[1]) return match[1];
  const singleQuoted = new RegExp(`${attributeName}\\s*=\\s*'([^']*)'`, "i").exec(fragment);
  return singleQuoted?.[1];
}

function decodeXmlText(input: string | undefined): string | undefined {
  if (typeof input !== "string") return undefined;
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
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
  if (typeof input !== "string") {
    return undefined;
  }
  switch (input.trim().toLowerCase()) {
    case "in_progress":
    case "in progress":
      return "in_progress";
    case "awaiting_review":
    case "awaiting review":
      return "awaiting_review";
    case "blocked":
      return "blocked";
    case "failed":
      return "failed";
    case "completed":
    case "complete":
    case "done":
    case "finished":
      return "awaiting_review";
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
