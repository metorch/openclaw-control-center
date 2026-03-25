export const COLLABORATION_AGENT_FILE_BLOCK_START = "[[openclaw-files]]";
export const COLLABORATION_AGENT_FILE_BLOCK_END = "[[/openclaw-files]]";

const FILE_LINE_PREFIXES = ["file:", "files:", "path:", "paths:", "saved to:", "created:", "output:"];

export interface ParsedCollaborationAgentArtifacts {
  cleanReplyText: string;
  declaredPaths: string[];
  hintedPaths: string[];
}

const TOOL_ARTIFACT_PATH_KEYS = new Set([
  "file_path",
  "filepath",
  "output_path",
  "outputpath",
  "saved_path",
  "savedpath",
  "target_file",
  "targetfile",
  "output_file",
  "outputfile",
]);
const DIRECT_PATH_TOOL_NAMES = new Set(["write"]);

export function parseCollaborationAgentArtifacts(replyText: string): ParsedCollaborationAgentArtifacts {
  const raw = replyText.replace(/\r/g, "");
  const declaredPaths: string[] = [];
  const blockPattern = /\[\[openclaw-files\]\]([\s\S]*?)\[\[\/openclaw-files\]\]/gi;
  const visibleReplyText = raw
    .replace(blockPattern, (_match, body: string) => {
      for (const line of body.split("\n")) {
        const normalized = normalizePathCandidate(line);
        if (normalized) declaredPaths.push(normalized);
      }
      return "";
    })
    .replace(/^\[\[reply_to_current\]\]\s*/i, "")
    .trim();

  return {
    cleanReplyText: stripArtifactHintLines(visibleReplyText),
    declaredPaths: dedupe(declaredPaths),
    hintedPaths: extractHintedPaths(visibleReplyText),
  };
}

export function buildCollaborationAgentArtifactInstruction(
  projectRoot: string,
  preferredArtifactsDir?: string,
): string {
  const resolvedProjectRoot = String(projectRoot || "").trim();
  const resolvedPreferredArtifactsDir =
    String(preferredArtifactsDir || "").trim() || resolvedProjectRoot;
  return [
    "If you create or update files for the user, actually write them inside the current collaboration project before replying.",
    resolvedProjectRoot ? `Current collaboration project root: ${resolvedProjectRoot}.` : "",
    resolvedPreferredArtifactsDir
      ? `Preferred save location for new deliverables: ${resolvedPreferredArtifactsDir}.`
      : "",
    "Do not create or update deliverables outside this project root, and do not save them to the global workspace root.",
    "When files were created or updated, append this exact footer at the very end of your reply. Do not wrap it in a code fence:",
    COLLABORATION_AGENT_FILE_BLOCK_START,
    "relative/or/absolute/path/to/file",
    COLLABORATION_AGENT_FILE_BLOCK_END,
    "The control center will hide that footer from the user and attach the files automatically.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function extractCollaborationAgentArtifactPathsFromRawJson(input: unknown): string[] {
  const matches: string[] = [];
  const visited = new Set<object>();

  const visit = (value: unknown, key?: string, toolName?: string): void => {
    if (typeof value === "string") {
      const normalizedKey = String(key || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
      if (
        TOOL_ARTIFACT_PATH_KEYS.has(normalizedKey) ||
        (normalizedKey === "path" && DIRECT_PATH_TOOL_NAMES.has(String(toolName || "").trim().toLowerCase()))
      ) {
        const candidate = normalizePathCandidate(value);
        if (candidate) matches.push(candidate);
      }
      if (key === "partialJson") {
        try {
          visit(JSON.parse(value) as unknown, undefined, toolName);
        } catch {
          // Ignore invalid nested JSON snippets.
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) visit(item, key, toolName);
      return;
    }

    if (!value || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);

    const objectValue = value as Record<string, unknown>;
    const nextToolName =
      (typeof objectValue.name === "string" && objectValue.name.trim()) ||
      (typeof objectValue.toolName === "string" && objectValue.toolName.trim()) ||
      toolName;

    for (const [entryKey, entryValue] of Object.entries(value)) {
      visit(entryValue, entryKey, nextToolName);
    }
  };

  visit(input);
  return dedupe(matches);
}

export function isMachineOnlyCollaborationText(value: string): boolean {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  if (/^no_reply$/i.test(trimmed)) return true;
  if (!/^[\[{]/.test(trimmed)) return false;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return looksLikeMachinePayloadRoot(parsed) || looksLikeGatewayStreamEnvelopeRoot(parsed);
  } catch {
    if (/"payloads"\s*:\s*\[/i.test(trimmed) && /"meta"\s*:/i.test(trimmed)) {
      return true;
    }
    return (
      /"runId"\s*:\s*"/i.test(trimmed) &&
      /"sessionKey"\s*:\s*"/i.test(trimmed) &&
      /"state"\s*:\s*"(?:started|delta|final|complete|completed|aborted|error)"/i.test(trimmed) &&
      !/"(?:text|replyText|message|content)"\s*:\s*"/i.test(trimmed)
    );
  }
}

function extractHintedPaths(replyText: string): string[] {
  const matches: string[] = [];
  for (const rawLine of replyText.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (FILE_LINE_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
      const candidate = normalizePathCandidate(line.slice(line.indexOf(":") + 1));
      if (candidate) matches.push(candidate);
      continue;
    }
    const pathMatch = line.match(/([A-Za-z]:[\\/][^\s"'<>|]+|\.{0,2}[\\/][^\s"'<>|]+|\/[^\s"'<>|]+)\.[A-Za-z0-9]{1,12}/g);
    if (!pathMatch) continue;
    for (const item of pathMatch) {
      const candidate = normalizePathCandidate(item);
      if (candidate) matches.push(candidate);
    }
  }
  return dedupe(matches);
}

function looksLikeMachinePayloadRoot(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const objectValue = input as Record<string, unknown>;
  return Boolean(
    Array.isArray(objectValue.payloads) ||
      (objectValue.meta && typeof objectValue.meta === "object") ||
      (objectValue.systemPromptReport && typeof objectValue.systemPromptReport === "object") ||
      (objectValue.agentMeta && typeof objectValue.agentMeta === "object"),
  );
}

function looksLikeGatewayStreamEnvelopeRoot(input: unknown): boolean {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const objectValue = input as Record<string, unknown>;
  const state = typeof objectValue.state === "string" ? objectValue.state.trim().toLowerCase() : "";
  if (!/^(?:started|delta|final|complete|completed|aborted|error)$/.test(state)) {
    return false;
  }
  const sessionKey = typeof objectValue.sessionKey === "string" ? objectValue.sessionKey.trim() : "";
  const runId = typeof objectValue.runId === "string" ? objectValue.runId.trim() : "";
  const seq =
    typeof objectValue.seq === "number"
      ? objectValue.seq
      : typeof objectValue.seq === "string"
        ? Number(objectValue.seq)
        : NaN;
  const hasTransportIdentity = Boolean(sessionKey) && (Boolean(runId) || Number.isFinite(seq));
  if (!hasTransportIdentity) {
    return false;
  }
  return ![
    objectValue.text,
    objectValue.replyText,
    objectValue.message,
    objectValue.content,
  ].some((value) => typeof value === "string" && value.trim() !== "");
}

function stripArtifactHintLines(replyText: string): string {
  const keptLines = replyText
    .split("\n")
    .filter((line) => !isStandaloneArtifactHintLine(line))
    .join("\n");
  return keptLines.replace(/\n{3,}/g, "\n\n").trim();
}

function isStandaloneArtifactHintLine(input: string): boolean {
  const line = String(input || "").trim();
  if (!line) return false;

  const lower = line.toLowerCase();
  if (FILE_LINE_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    const candidate = normalizePathCandidate(line.slice(line.indexOf(":") + 1));
    return Boolean(candidate);
  }

  const unwrapped = line
    .replace(/^[-*]\s*/, "")
    .trim()
    .replace(/^`+|`+$/g, "")
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "")
    .trim();
  const candidate = isStandalonePathCandidate(unwrapped) ? normalizePathCandidate(unwrapped) : undefined;
  return Boolean(candidate && candidate === unwrapped);
}

function isStandalonePathCandidate(input: string): boolean {
  return /^(?:[A-Za-z]:[\\/]|\\\\|\/|\.{1,2}[\\/]).+\.[A-Za-z0-9]{1,12}$/.test(String(input || "").trim());
}

function normalizePathCandidate(input: string): string | undefined {
  let normalized = String(input || "")
    .trim()
    .replace(/^[-*]\s*/, "")
    .replace(/^`+|`+$/g, "")
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "")
    .trim();
  normalized = normalized.replace(/\\\\/g, "\\").replace(/\\\//g, "/").trim();
  if (!normalized) return undefined;
  if (/^https?:\/\//i.test(normalized)) return undefined;
  if (!/[\\/]/.test(normalized) && !/\.[A-Za-z0-9]{1,12}$/.test(normalized)) return undefined;
  return normalized;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(value.trim());
  }
  return output;
}
