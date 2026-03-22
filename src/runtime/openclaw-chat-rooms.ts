import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import type { SessionsHistoryResponse } from "../contracts/openclaw-tools";
import { resolveOpenClawHomePath } from "./current-agent-catalog";

const CHAT_TRANSCRIPT_EXTENSION = ".jsonl";
const CHAT_TRANSCRIPT_READ_BYTES = 96 * 1024;
const CHAT_HISTORY_TAIL_LINE_MULTIPLIER = 4;
const CHAT_HISTORY_TAIL_MIN_LINES = 48;
const CHAT_HISTORY_TAIL_CHUNK_BYTES = 32 * 1024;
const CHAT_HISTORY_LIMIT_MAX = 200;
const DEFAULT_CHAT_ROOM_TITLE = "New chat";

export interface OpenClawChatRoomSummary {
  roomId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  transcriptPath: string;
  active: boolean;
}

export interface OpenClawChatRoomDeleteResult {
  deletedRoomId: string;
  fallbackRoomId?: string;
}

interface TranscriptSummaryDraft {
  roomId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  transcriptPath: string;
}

interface SessionStoreRecord {
  sessionId?: string;
  updatedAt?: number;
  sessionFile?: string;
  chatType?: string;
  lastChannel?: string;
  origin?: {
    provider?: string;
    surface?: string;
    chatType?: string;
  };
}

type SessionStoreShape = Record<string, SessionStoreRecord>;

export async function listOpenClawChatRooms(input: {
  agentId: string;
  workspaceRoot: string;
  openclawHomeDir?: string;
  createIfEmpty?: boolean;
}): Promise<OpenClawChatRoomSummary[]> {
  const sessionsDir = resolveAgentSessionsDir(input.agentId, input.openclawHomeDir);
  await mkdir(sessionsDir, { recursive: true });
  let roomIds = await listTranscriptRoomIds(sessionsDir);

  if (roomIds.length === 0 && input.createIfEmpty !== false) {
    const created = await createOpenClawChatRoom(input);
    roomIds = [created.roomId];
  }

  const activeRoomId = await loadActiveOpenClawChatRoomId(input);
  const summaries = await Promise.all(
    roomIds.map(async (roomId) => {
      const summary = await readTranscriptSummary(resolveTranscriptPath(sessionsDir, roomId));
      return {
        ...summary,
        active: summary.roomId === activeRoomId,
      };
    }),
  );

  return summaries.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    if (updatedDiff !== 0) return updatedDiff;
    return a.title.localeCompare(b.title);
  });
}

export async function createOpenClawChatRoom(input: {
  agentId: string;
  workspaceRoot: string;
  openclawHomeDir?: string;
  title?: string;
  roomId?: string;
  activate?: boolean;
}): Promise<OpenClawChatRoomSummary> {
  const requestedRoomId = String(input.roomId || "").trim();
  const normalizedRequestedRoomId = requestedRoomId ? normalizeTranscriptRoomId(requestedRoomId) : undefined;
  if (requestedRoomId && !normalizedRequestedRoomId) {
    throw new Error("A valid roomId is required when provided.");
  }

  const roomId = normalizedRequestedRoomId ?? randomUUID();
  const now = new Date().toISOString();
  const sessionsDir = resolveAgentSessionsDir(input.agentId, input.openclawHomeDir);
  const transcriptPath = resolveTranscriptPath(sessionsDir, roomId);
  await mkdir(sessionsDir, { recursive: true });
  const title = normalizeTranscriptTitle(input.title) ?? DEFAULT_CHAT_ROOM_TITLE;
  const existingTranscript = await stat(transcriptPath).catch(() => undefined);
  if (!existingTranscript?.isFile()) {
    await writeFile(
      transcriptPath,
      `${JSON.stringify({
        type: "session",
        version: 3,
        id: roomId,
        timestamp: now,
        cwd: input.workspaceRoot,
      })}\n`,
      "utf8",
    );
  }
  if (input.activate !== false) {
    await activateOpenClawChatRoom({
      agentId: input.agentId,
      roomId,
      openclawHomeDir: input.openclawHomeDir,
    });
  }
  const summary = existingTranscript?.isFile()
    ? await readTranscriptSummary(transcriptPath)
    : {
        roomId,
        title,
        createdAt: now,
        updatedAt: now,
        transcriptPath,
      };
  return {
    ...summary,
    title: summary.title || title,
    active: input.activate !== false,
  };
}

export async function deleteOpenClawChatRoom(input: {
  agentId: string;
  roomId: string;
  workspaceRoot: string;
  openclawHomeDir?: string;
  ensureFallback?: boolean;
}): Promise<OpenClawChatRoomDeleteResult> {
  const roomId = normalizeTranscriptRoomId(input.roomId);
  if (!roomId) {
    throw new Error("A valid roomId is required.");
  }

  const sessionsDir = resolveAgentSessionsDir(input.agentId, input.openclawHomeDir);
  await rm(resolveTranscriptPath(sessionsDir, roomId), { force: true });

  let roomIds = await listTranscriptRoomIds(sessionsDir);
  let fallbackRoomId = roomIds[0];
  if (!fallbackRoomId && input.ensureFallback !== false) {
    fallbackRoomId = (
      await createOpenClawChatRoom({
        agentId: input.agentId,
        workspaceRoot: input.workspaceRoot,
        openclawHomeDir: input.openclawHomeDir,
      })
    ).roomId;
  } else {
    const activeRoomId = await loadActiveOpenClawChatRoomId({
      agentId: input.agentId,
      workspaceRoot: input.workspaceRoot,
      openclawHomeDir: input.openclawHomeDir,
    });
    if (activeRoomId === roomId) {
      await activateOpenClawChatRoom({
        agentId: input.agentId,
        roomId: fallbackRoomId,
        openclawHomeDir: input.openclawHomeDir,
      });
    }
  }

  return {
    deletedRoomId: roomId,
    fallbackRoomId,
  };
}

export async function activateOpenClawChatRoom(input: {
  agentId: string;
  roomId: string;
  openclawHomeDir?: string;
}): Promise<void> {
  const roomId = normalizeTranscriptRoomId(input.roomId);
  if (!roomId) {
    throw new Error("A valid roomId is required.");
  }

  const sessionsDir = resolveAgentSessionsDir(input.agentId, input.openclawHomeDir);
  const transcriptPath = resolveTranscriptPath(sessionsDir, roomId);
  const transcriptFile = await stat(transcriptPath).catch(() => undefined);
  if (!transcriptFile?.isFile()) {
    throw new Error("Chat room transcript not found.");
  }

  const storePath = resolveAgentSessionsStorePath(input.agentId, input.openclawHomeDir);
  const store = await readSessionStore(storePath);
  const sessionKey = resolvePrimarySessionStoreKey(input.agentId, store);
  const existing = store[sessionKey] ?? {};
  store[sessionKey] = {
    ...existing,
    updatedAt: Math.max(Number(existing.updatedAt || 0), Date.now()),
    sessionFile: transcriptPath,
    chatType: existing.chatType ?? "direct",
    lastChannel: existing.lastChannel ?? "webchat",
    origin: {
      provider: existing.origin?.provider ?? "webchat",
      surface: existing.origin?.surface ?? "webchat",
      chatType: existing.origin?.chatType ?? existing.chatType ?? "direct",
    },
  };
  await writeSessionStore(storePath, store);
}

export async function loadActiveOpenClawChatRoomId(input: {
  agentId: string;
  workspaceRoot: string;
  openclawHomeDir?: string;
}): Promise<string | undefined> {
  const storePath = resolveAgentSessionsStorePath(input.agentId, input.openclawHomeDir);
  const store = await readSessionStore(storePath);
  const sessionKey = resolvePrimarySessionStoreKey(input.agentId, store);
  const activeTranscript = store[sessionKey]?.sessionFile?.trim();
  const activeRoomId = normalizeTranscriptRoomId(activeTranscript ? basename(activeTranscript, extname(activeTranscript)) : "");
  if (activeRoomId) return activeRoomId;

  const roomIds = await listTranscriptRoomIds(resolveAgentSessionsDir(input.agentId, input.openclawHomeDir));
  return roomIds[0];
}

export async function readOpenClawChatRoomHistory(input: {
  agentId: string;
  roomId: string;
  openclawHomeDir?: string;
  limit?: number;
}): Promise<SessionsHistoryResponse | undefined> {
  const roomId = normalizeTranscriptRoomId(input.roomId);
  if (!roomId) return undefined;

  const transcriptPath = resolveTranscriptPath(resolveAgentSessionsDir(input.agentId, input.openclawHomeDir), roomId);
  const limit = normalizeHistoryLimit(input.limit);
  const targetLineCount = Math.max(limit * CHAT_HISTORY_TAIL_LINE_MULTIPLIER, CHAT_HISTORY_TAIL_MIN_LINES);

  try {
    const raw = await readRecentTranscriptHistoryChunk(transcriptPath, targetLineCount);
    return normalizeTranscriptHistoryChunk(raw, targetLineCount);
  } catch {
    try {
      const raw = await readFile(transcriptPath, "utf8");
      return normalizeTranscriptHistoryChunk(raw, targetLineCount);
    } catch {
      return undefined;
    }
  }
}

export function normalizeTranscriptRoomId(input: string | undefined): string | undefined {
  const value = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "");
  return /^[0-9a-f-]{8,64}$/.test(value) ? value : undefined;
}

async function listTranscriptRoomIds(sessionsDir: string): Promise<string[]> {
  const items = await readdir(sessionsDir, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const item of items) {
    if (!item.isFile() || extname(item.name).toLowerCase() !== CHAT_TRANSCRIPT_EXTENSION) continue;
    const roomId = normalizeTranscriptRoomId(basename(item.name, CHAT_TRANSCRIPT_EXTENSION));
    if (!roomId) continue;
    out.push(roomId);
  }
  return out;
}

async function readTranscriptSummary(transcriptPath: string): Promise<TranscriptSummaryDraft> {
  const transcriptFile = await stat(transcriptPath);
  const roomId = normalizeTranscriptRoomId(basename(transcriptPath, extname(transcriptPath))) ?? randomUUID();
  const createdAtFallback = transcriptFile.birthtime.toISOString();
  const updatedAt = transcriptFile.mtime.toISOString();
  const previewText = await readTranscriptPreviewChunk(transcriptPath);
  const lines = previewText.split(/\r?\n/).filter((line) => line.trim() !== "");
  let createdAt = createdAtFallback;
  let title = "";

  for (const line of lines) {
    const entry = safeJsonParse(line);
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    if (record.type === "session" && typeof record.timestamp === "string" && !Number.isNaN(Date.parse(record.timestamp))) {
      createdAt = new Date(record.timestamp).toISOString();
      continue;
    }
    if (record.type !== "message") continue;
    const message = asObject(record.message);
    if (!message || message.role !== "user") continue;
    const candidate = extractFirstTextContent(message.content);
    title = normalizeTranscriptTitle(deriveTranscriptTitle(candidate)) ?? "";
    if (title) break;
  }

  return {
    roomId,
    title: title || DEFAULT_CHAT_ROOM_TITLE,
    createdAt,
    updatedAt,
    transcriptPath,
  };
}

async function readTranscriptPreviewChunk(path: string): Promise<string> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(CHAT_TRANSCRIPT_READ_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, CHAT_TRANSCRIPT_READ_BYTES, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

async function readRecentTranscriptHistoryChunk(transcriptPath: string, targetLineCount: number): Promise<string> {
  const handle = await open(transcriptPath, "r");
  try {
    const { size } = await handle.stat();
    if (size <= 0) return "";

    let position = size;
    let newlineCount = 0;
    const chunks: Buffer[] = [];

    while (position > 0 && newlineCount < targetLineCount) {
      const bytesToRead = Math.min(CHAT_HISTORY_TAIL_CHUNK_BYTES, position);
      position -= bytesToRead;

      const buffer = Buffer.allocUnsafe(bytesToRead);
      const { bytesRead } = await handle.read(buffer, 0, bytesToRead, position);
      if (bytesRead <= 0) break;

      const chunk = bytesRead === bytesToRead ? buffer : buffer.subarray(0, bytesRead);
      chunks.push(chunk);
      newlineCount += countLineFeeds(chunk);
    }

    if (chunks.length === 0) return "";

    const raw = Buffer.concat(chunks.reverse()).toString("utf8");
    if (position <= 0) return raw;

    const firstLineBreak = raw.indexOf("\n");
    return firstLineBreak >= 0 ? raw.slice(firstLineBreak + 1) : raw;
  } finally {
    await handle.close();
  }
}

function countLineFeeds(buffer: Uint8Array): number {
  let count = 0;
  for (const byte of buffer) {
    if (byte === 0x0a) count += 1;
  }
  return count;
}

function normalizeTranscriptHistoryChunk(raw: string, rawLineLimit: number): SessionsHistoryResponse {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length === 0) return { rawText: "" };

  const recentLines = lines.slice(-Math.max(1, rawLineLimit));
  const history = recentLines.map((line) => {
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch {
      return line;
    }
  });

  return {
    json: { history },
    rawText: recentLines.join("\n"),
  };
}

function normalizeHistoryLimit(input: number | undefined): number {
  if (typeof input !== "number" || !Number.isFinite(input)) return 80;
  return Math.max(1, Math.min(CHAT_HISTORY_LIMIT_MAX, Math.trunc(input)));
}

function deriveTranscriptTitle(input: string): string {
  const lines = String(input || "").split(/\r?\n/);
  const cleaned: string[] = [];
  let inCodeFence = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;
    if (line === "Sender (untrusted metadata):") continue;
    cleaned.push(line.replace(/^\[[^\]]+\]\s*/, "").trim());
  }

  return cleaned.find(Boolean) ?? "";
}

function normalizeTranscriptTitle(input: string | undefined): string | undefined {
  const value = String(input || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return value ? value.slice(0, 80) : undefined;
}

function extractFirstTextContent(input: unknown): string {
  if (!Array.isArray(input)) return "";
  const parts: string[] = [];
  for (const item of input) {
    const obj = asObject(item);
    if (!obj || obj.type !== "text" || typeof obj.text !== "string") continue;
    parts.push(obj.text);
  }
  return parts.join("\n").trim();
}

function resolveAgentSessionsDir(agentId: string, openclawHomeDir = resolveOpenClawHomePath()): string {
  return join(openclawHomeDir, "agents", agentId, "sessions");
}

function resolveAgentSessionsStorePath(agentId: string, openclawHomeDir = resolveOpenClawHomePath()): string {
  return join(resolveAgentSessionsDir(agentId, openclawHomeDir), "sessions.json");
}

function resolveTranscriptPath(sessionsDir: string, roomId: string): string {
  return join(sessionsDir, `${roomId}${CHAT_TRANSCRIPT_EXTENSION}`);
}

async function readSessionStore(path: string): Promise<SessionStoreShape> {
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
    const obj = asObject(raw);
    return obj ? (obj as SessionStoreShape) : {};
  } catch {
    return {};
  }
}

async function writeSessionStore(path: string, store: SessionStoreShape): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function resolvePrimarySessionStoreKey(agentId: string, store: SessionStoreShape): string {
  const preferred = `agent:${agentId}:main`;
  if (store[preferred]) return preferred;

  const candidate = Object.keys(store).find((key) => key.startsWith(`agent:${agentId}:`) && !key.includes(":cron:"));
  return candidate ?? preferred;
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return undefined;
  }
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}
