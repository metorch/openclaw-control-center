import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadCurrentAgentCatalog, resolveOpenClawHomePath } from "./current-agent-catalog";

export type OfficeSessionPresenceStatus = "connected" | "partial" | "not_connected";

export interface OfficeSessionPresenceSnapshot {
  status: OfficeSessionPresenceStatus;
  sourcePath: string;
  detail: string;
  activeSessionsByAgent: Map<string, number>;
  totalActiveSessions: number;
}

type SessionStoreCandidate = {
  agentId: string;
  path: string;
  source: "runtime_home" | "workspace";
};

const ACTIVE_SESSION_STATES = new Set([
  "running",
  "active",
  "busy",
  "blocked",
  "waiting_approval",
  "working",
  "in_progress",
  "processing",
  "thinking",
  "executing",
  "streaming",
]);
const INACTIVE_SESSION_STATES = new Set([
  "idle",
  "inactive",
  "error",
  "failed",
  "stopped",
  "stopping",
  "closed",
  "done",
  "completed",
  "complete",
  "paused",
  "aborted",
  "terminated",
  "cancelled",
  "canceled",
]);
const ACTIVE_RECENCY_WINDOWS_MS = resolveActiveRecencyWindowsMs();

export async function loadBestEffortOfficeSessionPresence(): Promise<OfficeSessionPresenceSnapshot> {
  const openclawHome = resolveOpenClawHomePath();
  const agentsPath = join(openclawHome, "agents");
  const sourcePath = `${join(agentsPath, "*/sessions/sessions.json")} | <configured workspace>/sessions/sessions.json`;
  const currentCatalog = await loadCurrentAgentCatalog();
  const configuredEntries = currentCatalog.entries.filter((entry) => entry.agentId.trim().length > 0);
  const configuredAgentKeys = new Set(configuredEntries.map((entry) => normalizeAgentKey(entry.agentId)));

  let agentDirs: string[] = [];
  let runtimeDirReadable = true;
  try {
    const entries = await readdir(agentsPath, { withFileTypes: true });
    agentDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (!isFsNotFound(error)) {
      runtimeDirReadable = false;
    } else {
      agentDirs = [];
    }
  }

  const storeCandidates = buildSessionStoreCandidates({
    agentsPath,
    runtimeAgentDirs: agentDirs,
    configuredEntries,
  });

  if (storeCandidates.length === 0) {
    return {
      status: runtimeDirReadable ? "not_connected" : "partial",
      sourcePath,
      detail:
        configuredAgentKeys.size > 0
          ? "No session-store candidates were found for the current configured agents."
          : runtimeDirReadable
            ? "Runtime agent directory is empty."
            : "Runtime agent directory exists but could not be read cleanly.",
      activeSessionsByAgent: new Map(),
      totalActiveSessions: 0,
    };
  }

  const recordsByAgent = new Map<string, Record<string, unknown>[]>();
  let parsedStores = 0;
  let parseErrors = 0;
  const connectedSources = new Set<SessionStoreCandidate["source"]>();

  for (const candidate of storeCandidates) {
    try {
      const parsed = JSON.parse(await readFile(candidate.path, "utf8")) as unknown;
      parsedStores += 1;
      const records = extractSessionRecords(parsed);
      const current = recordsByAgent.get(candidate.agentId) ?? [];
      recordsByAgent.set(candidate.agentId, mergeSessionRecords(current, records));
      connectedSources.add(candidate.source);
    } catch (error) {
      if (isFsNotFound(error)) continue;
      parseErrors += 1;
    }
  }

  const selectedWindowMs = ACTIVE_RECENCY_WINDOWS_MS[0] ?? 45 * 60 * 1000;
  const nowMs = Date.now();
  const selectedActiveByAgent = deriveActiveSessionsByAgent(recordsByAgent, selectedWindowMs, nowMs);
  const totalActiveSessions = [...selectedActiveByAgent.values()].reduce((sum, value) => sum + value, 0);

  if (parsedStores === 0 && parseErrors === 0) {
    return {
      status: runtimeDirReadable ? "not_connected" : "partial",
      sourcePath,
      detail:
        configuredAgentKeys.size > 0
          ? "No session stores were found for the current configured agents in runtime-home or workspace locations."
          : "No runtime session stores found.",
      activeSessionsByAgent: selectedActiveByAgent,
      totalActiveSessions,
    };
  }

  const status: OfficeSessionPresenceStatus = parseErrors > 0 || !runtimeDirReadable ? "partial" : "connected";
  return {
    status,
    sourcePath,
    detail:
      `Derived ${totalActiveSessions} active session(s) from ${parsedStores} session store(s)` +
      ` using state + ${Math.round(selectedWindowMs / 60000)}m recency window.` +
      (configuredAgentKeys.size > 0 ? ` Filtered to ${configuredAgentKeys.size} configured current agent(s).` : "") +
      (connectedSources.size > 0
        ? ` Sources: ${[...connectedSources]
            .map((source) => (source === "workspace" ? "workspace" : "runtime-home"))
            .join(", ")}.`
        : "") +
      (!runtimeDirReadable ? " Runtime-home directory could not be read cleanly." : "") +
      (parseErrors > 0 ? ` ${parseErrors} store(s) could not be parsed.` : ""),
    activeSessionsByAgent: selectedActiveByAgent,
    totalActiveSessions,
  };
}

function buildSessionStoreCandidates(input: {
  agentsPath: string;
  runtimeAgentDirs: string[];
  configuredEntries: Awaited<ReturnType<typeof loadCurrentAgentCatalog>>["entries"];
}): SessionStoreCandidate[] {
  const output: SessionStoreCandidate[] = [];
  const seen = new Set<string>();
  const append = (candidate: SessionStoreCandidate): void => {
    const key = `${normalizeAgentKey(candidate.agentId)}::${candidate.path.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push(candidate);
  };

  if (input.configuredEntries.length > 0) {
    for (const entry of input.configuredEntries) {
      const agentId = entry.agentId.trim();
      if (!agentId) continue;
      append({
        agentId,
        path: join(input.agentsPath, agentId, "sessions", "sessions.json"),
        source: "runtime_home",
      });
      const workspace = entry.workspace?.trim();
      if (workspace) {
        append({
          agentId,
          path: join(workspace, "sessions", "sessions.json"),
          source: "workspace",
        });
      }
    }
    return output;
  }

  for (const agentId of input.runtimeAgentDirs) {
    const normalized = agentId.trim();
    if (!normalized) continue;
    append({
      agentId: normalized,
      path: join(input.agentsPath, normalized, "sessions", "sessions.json"),
      source: "runtime_home",
    });
  }

  return output;
}

function mergeSessionRecords(
  existing: Record<string, unknown>[],
  incoming: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (incoming.length === 0) return existing;
  const output = existing.slice();
  const seen = new Set(output.map((item) => sessionRecordIdentity(item)));
  for (const record of incoming) {
    const identity = sessionRecordIdentity(record);
    if (seen.has(identity)) continue;
    seen.add(identity);
    output.push(record);
  }
  return output;
}

function sessionRecordIdentity(item: Record<string, unknown>): string {
  return (
    asString(item.sessionKey)?.trim() ||
    asString(item.sessionId)?.trim() ||
    asString(item.key)?.trim() ||
    asString(item.sessionFile)?.trim() ||
    JSON.stringify(item)
  );
}

function deriveActiveSessionsByAgent(
  recordsByAgent: Map<string, Record<string, unknown>[]>,
  recencyWindowMs: number,
  nowMs: number,
): Map<string, number> {
  const activeByAgent = new Map<string, number>();
  for (const [agentId, records] of recordsByAgent.entries()) {
    let active = 0;
    for (const item of records) {
      if (isSessionActive(item, recencyWindowMs, nowMs)) active += 1;
    }
    if (active > 0) activeByAgent.set(agentId, active);
  }
  return activeByAgent;
}

function isSessionActive(item: Record<string, unknown>, recencyWindowMs: number, nowMs: number): boolean {
  const explicitActive = readExplicitActiveFlag(item);
  if (typeof explicitActive === "boolean") return explicitActive;

  const explicitState = readSessionState(item);
  if (explicitState) {
    if (ACTIVE_SESSION_STATES.has(explicitState)) return true;
    if (INACTIVE_SESSION_STATES.has(explicitState)) return false;
  }

  if (isPassiveSessionTranscriptBinding(item)) return false;

  const updatedAtMs = readUpdatedAtMs(item);
  if (!Number.isFinite(updatedAtMs)) return false;
  return nowMs - updatedAtMs <= recencyWindowMs;
}

function isPassiveSessionTranscriptBinding(item: Record<string, unknown>): boolean {
  const sessionFile = asString(item.sessionFile)?.trim();
  if (!sessionFile) return false;
  return true;
}

function readSessionState(item: Record<string, unknown>): string | undefined {
  const direct =
    asString(item.state) ??
    asString(item.status) ??
    asString(item.runState) ??
    asString(item.lifecycleState);
  if (direct) return direct.trim().toLowerCase();

  const acp = asObject(item.acp);
  const acpState = asString(acp?.state);
  return acpState ? acpState.trim().toLowerCase() : undefined;
}

function readExplicitActiveFlag(item: Record<string, unknown>): boolean | undefined {
  const direct = asBoolean(item.active) ?? asBoolean(item.isActive);
  if (typeof direct === "boolean") return direct;

  const acp = asObject(item.acp);
  const acpActive = asBoolean(acp?.active) ?? asBoolean(acp?.isActive);
  return typeof acpActive === "boolean" ? acpActive : undefined;
}

function readUpdatedAtMs(item: Record<string, unknown>): number {
  const candidates = [
    item.updatedAt,
    item.lastActivityAt,
    item.createdAt,
    asObject(item.acp)?.lastActivityAt,
    asObject(item.acp)?.updatedAt,
    asObject(item.acp)?.createdAt,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return normalizeEpochMs(candidate);
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const trimmed = candidate.trim();
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const parsedNumeric = Number(trimmed);
        if (Number.isFinite(parsedNumeric)) return normalizeEpochMs(parsedNumeric);
      }

      const parsedDate = Date.parse(trimmed);
      if (!Number.isNaN(parsedDate)) return parsedDate;
    }
  }

  return Number.NaN;
}

function normalizeEpochMs(value: number): number {
  const abs = Math.abs(value);
  if (abs >= 1e14) return value / 1000;
  if (abs > 0 && abs < 1e12) return value * 1000;
  return value;
}

function extractSessionRecords(parsed: unknown): Record<string, unknown>[] {
  const direct = normalizeRecordCollection(parsed).filter(looksLikeSessionRecord);
  if (direct.length > 0) return direct;

  const root = asObject(parsed);
  if (!root) return [];

  const topLevelCollections = [
    normalizeRecordCollection(root.sessions),
    normalizeRecordCollection(root.items),
    normalizeRecordCollection(root.records),
  ];
  for (const collection of topLevelCollections) {
    const records = collection.filter(looksLikeSessionRecord);
    if (records.length > 0) return records;
  }

  const data = asObject(root.data);
  if (data) {
    const nestedCollections = [
      normalizeRecordCollection(data.sessions),
      normalizeRecordCollection(data.items),
      normalizeRecordCollection(data.records),
    ];
    for (const collection of nestedCollections) {
      const records = collection.filter(looksLikeSessionRecord);
      if (records.length > 0) return records;
    }
  }

  return [];
}

function normalizeRecordCollection(input: unknown): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => asObject(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  const object = asObject(input);
  if (!object) return [];
  return Object.values(object)
    .map((item) => asObject(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
}

function looksLikeSessionRecord(item: Record<string, unknown>): boolean {
  if (
    asString(item.sessionId) ||
    asString(item.sessionKey) ||
    asString(item.key) ||
    asString(item.sessionFile)
  ) {
    return true;
  }
  if (asObject(item.acp) || asObject(item.origin) || asObject(item.deliveryContext)) return true;
  if (readSessionState(item)) return true;
  return false;
}

function resolveActiveRecencyWindowsMs(): number[] {
  const fallbackMinutes = [45, 180, 720, 1440];
  const rawMinutes = process.env.OFFICE_SESSION_ACTIVE_WINDOW_MINUTES;
  if (!rawMinutes) return fallbackMinutes.map((minutes) => minutes * 60 * 1000);

  const parsedMinutes = rawMinutes
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.max(1, Math.trunc(item)));

  if (parsedMinutes.length === 0) return fallbackMinutes.map((minutes) => minutes * 60 * 1000);

  const deduped: number[] = [];
  for (const minutes of parsedMinutes) {
    if (!deduped.includes(minutes)) deduped.push(minutes);
  }
  return deduped.map((minutes) => minutes * 60 * 1000);
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

function normalizeAgentKey(input: string): string {
  return input.trim().toLowerCase();
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

function asString(input: unknown): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function asBoolean(input: unknown): boolean | undefined {
  return typeof input === "boolean" ? input : undefined;
}
