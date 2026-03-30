import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { isPrimaryOperatorAgentId } from "./operator-display";
import { parseCollaborationAgentArtifacts } from "./collaboration-agent-artifacts";
import { parseStageResultEnvelopeFromReply } from "./collaboration-stage-results";

// Collaboration rooms are the canonical room store for control-center group chat.
// OpenClaw transcripts remain optional sidecars for primary-agent compatibility
// and transcript backfill.

const RUNTIME_DIR = join(process.cwd(), "runtime");
const COLLABORATION_ROOM_DIR = join(RUNTIME_DIR, "collaboration-room");
const COLLABORATION_ROOM_LEGACY_PATH = join(COLLABORATION_ROOM_DIR, "room.json");
const COLLABORATION_ROOMS_INDEX_PATH = join(COLLABORATION_ROOM_DIR, "rooms.json");
const COLLABORATION_ROOMS_DIR = join(COLLABORATION_ROOM_DIR, "rooms");
const TEXT_ATTACHMENT_PREVIEW_MAX_BYTES = 256 * 1024;
const TEXT_ATTACHMENT_PREVIEW_MAX_CHARS = 2400;
const COLLABORATION_ROOM_MAX_EVENTS = 1200;
const COLLABORATION_ROOM_TITLE_MAX_CHARS = 80;
const PROJECT_ID_REGEX = /^[A-Za-z0-9._:-]+$/;

export const DEFAULT_COLLABORATION_ROOM_ID = "global";
export const DEFAULT_COLLABORATION_ROOM_TITLE = "Collaboration room";
export const COLLABORATION_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const COLLABORATION_ATTACHMENTS_PER_MESSAGE_MAX = 5;

export type CollaborationRoomEventType =
  | "user_message"
  | "attachment"
  | "dispatch_started"
  | "dispatch_failed"
  | "dispatch_fallback"
  | "agent_reply"
  | "system_note";

export type CollaborationAttachmentKind = "image" | "text" | "file";

export interface CollaborationAttachmentRecord {
  attachmentId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storedPath: string;
  relativeStoredPath: string;
  sourceLocalPath?: string;
  kind: CollaborationAttachmentKind;
  uploadedAt: string;
  uploadedBy: "user" | "agent" | "system";
  referencedAt?: string;
  previewText?: string;
}

export interface CollaborationRoomEvent {
  sequence: number;
  eventId: string;
  type: CollaborationRoomEventType;
  createdAt: string;
  authorRole: "user" | "agent" | "system";
  agentId?: string;
  sourceEventId?: string;
  message?: string;
  targetAgentIds?: string[];
  fallbackAgentId?: string;
  attachmentIds?: string[];
  relatedSessionId?: string;
  relatedSessionKey?: string;
  failureReason?: string;
  detail?: string;
}

export interface CollaborationSessionBinding {
  agentId: string;
  sessionId: string;
  sessionKey?: string;
  updatedAt: string;
}

export type CollaborationRoomTitleMode = "manual" | "auto";

export interface ProjectTaskDispatchRecord {
  taskId: string;
  projectId: string;
  stage: string;
  ownerAgentId: string;
  title: string;
  goal: string;
  definitionOfDone: string[];
  requiredContextRefs: string[];
  expectedArtifacts: string[];
  createdAt: string;
  createdBy: "jarvis";
}

export interface CollaborationTaskReceipt {
  taskId: string;
  projectId: string;
  reviewState?: "awaiting_review" | "approved" | "rejected";
  lastResultState?: "in_progress" | "awaiting_review" | "blocked" | "failed";
  waitingFor?: "jarvis_review" | "user_confirmation";
  manualOutcome?: "done" | "follow_up" | "error";
  manualOutcomeAt?: string;
  manualOutcomeBy?: string;
  manualOutcomeNote?: string;
  lastReportedAt: string;
  lastReportedBy: string;
  taskTitle?: string;
  stage?: string;
  summary?: string;
  blockers?: string[];
  recentOutput?: string;
}

export interface CollaborationRoomState {
  version: 3;
  roomId: string;
  title: string;
  titleMode: CollaborationRoomTitleMode;
  projectId?: string;
  createdAt: string;
  lastSequence: number;
  events: CollaborationRoomEvent[];
  attachments: CollaborationAttachmentRecord[];
  sessionBindings: CollaborationSessionBinding[];
  dispatchRecords: ProjectTaskDispatchRecord[];
  taskReceipts: CollaborationTaskReceipt[];
  updatedAt: string;
}

export interface CollaborationRoomSummary {
  roomId: string;
  title: string;
  titleMode: CollaborationRoomTitleMode;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  lastSequence: number;
  eventCount: number;
}

// Shared room content lives in per-room state. These view-state fields remain
// only for legacy compatibility and should not drive current UI selection or
// unread math.
interface CollaborationRoomsIndexState {
  version: 2;
  activeRoomId?: string;
  roomReadCursors?: Record<string, number>;
  rooms: CollaborationRoomSummary[];
}

export interface CollaborationRoomMutationResult<T> {
  value: T;
  state: CollaborationRoomState;
}

export interface CollaborationAttachmentUploadInput {
  roomId?: string;
  fileName: string;
  contentType?: string;
  content: Buffer;
  uploadedBy?: CollaborationAttachmentRecord["uploadedBy"];
  sourceLocalPath?: string;
}

export interface CollaborationParticipantMention {
  agentId: string;
  displayName: string;
  aliases: string[];
}

let collaborationRoomWriteChain: Promise<void> = Promise.resolve();
let collaborationRoomInitPromise: Promise<void> | undefined;
const roomSubscribers = new Map<string, Set<() => void>>();
let allCollaborationRoomsCache:
  | {
      key: string;
      value: CollaborationRoomState[];
    }
  | undefined;
let allCollaborationRoomsInFlight:
  | {
      key: string;
      value: Promise<CollaborationRoomState[]>;
    }
  | undefined;

export function defaultCollaborationRoomState(input?: {
  roomId?: string;
  title?: string;
  titleMode?: CollaborationRoomTitleMode;
  projectId?: string;
  now?: string;
}): CollaborationRoomState {
  const now = input?.now ?? new Date().toISOString();
  return {
    version: 3,
    roomId: normalizeRoomId(input?.roomId) ?? DEFAULT_COLLABORATION_ROOM_ID,
    title: normalizeRoomTitle(input?.title) ?? DEFAULT_COLLABORATION_ROOM_TITLE,
    titleMode: normalizeRoomTitleMode(input?.titleMode),
    projectId: normalizeProjectId(input?.projectId),
    createdAt: now,
    lastSequence: 0,
    events: [],
    attachments: [],
    sessionBindings: [],
    dispatchRecords: [],
    taskReceipts: [],
    updatedAt: now,
  };
}

export async function listCollaborationRooms(): Promise<CollaborationRoomSummary[]> {
  await ensureCollaborationRoomsReady();
  const index = await loadCollaborationRoomsIndex();
  return [...index.rooms].sort(compareRoomSummaryRecency);
}

export async function loadActiveCollaborationRoomId(): Promise<string | undefined> {
  const index = await loadCollaborationRoomsIndex();
  return normalizeRoomId(index.activeRoomId);
}

export async function setActiveCollaborationRoomId(roomId: string): Promise<string> {
  const normalizedRoomId = normalizeRoomId(roomId);
  if (!normalizedRoomId) {
    throw new Error("A valid roomId is required.");
  }

  return mutateCollaborationRoomStore(async () => {
    const index = await loadCollaborationRoomsIndex();
    await writeCollaborationRoomsIndex({
      ...index,
      activeRoomId: normalizedRoomId,
    });
    return normalizedRoomId;
  });
}

export async function loadCollaborationRoomReadCursor(roomId: string): Promise<number> {
  const normalizedRoomId = normalizeRoomId(roomId);
  if (!normalizedRoomId) {
    return 0;
  }
  const index = await loadCollaborationRoomsIndex();
  const cursor = index.roomReadCursors?.[normalizedRoomId] ?? 0;
  return Number.isInteger(cursor) && cursor >= 0 ? cursor : 0;
}

export async function setCollaborationRoomReadCursor(roomId: string, sequence: number): Promise<number> {
  const normalizedRoomId = normalizeRoomId(roomId);
  const normalizedSequence = Number.isInteger(sequence) && sequence >= 0 ? sequence : 0;
  if (!normalizedRoomId) {
    throw new Error("A valid roomId is required.");
  }

  return mutateCollaborationRoomStore(async () => {
    const index = await loadCollaborationRoomsIndex();
    const existingCursor = index.roomReadCursors?.[normalizedRoomId] ?? 0;
    const nextSequence = Math.max(
      normalizedSequence,
      Number.isInteger(existingCursor) ? existingCursor : 0,
    );
    await writeCollaborationRoomsIndex({
      ...index,
      roomReadCursors: {
        ...(index.roomReadCursors ?? {}),
        [normalizedRoomId]: nextSequence,
      },
    });
    return nextSequence;
  });
}

export async function loadAllCollaborationRooms(): Promise<CollaborationRoomState[]> {
  const summaries = await listCollaborationRooms();
  const cacheKey = summaries
    .map((summary) => `${summary.roomId}:${summary.updatedAt}:${summary.lastSequence}:${summary.eventCount}`)
    .join("|");
  if (allCollaborationRoomsCache?.key === cacheKey) {
    return allCollaborationRoomsCache.value;
  }
  if (allCollaborationRoomsInFlight?.key === cacheKey) {
    return allCollaborationRoomsInFlight.value;
  }

  const nextValue = Promise.all(summaries.map((summary) => loadCollaborationRoom(summary.roomId))).then((rooms) =>
    rooms.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
  );
  allCollaborationRoomsInFlight = {
    key: cacheKey,
    value: nextValue,
  };
  try {
    const value = await nextValue;
    allCollaborationRoomsCache = {
      key: cacheKey,
      value,
    };
    return value;
  } finally {
    if (allCollaborationRoomsInFlight?.key === cacheKey) {
      allCollaborationRoomsInFlight = undefined;
    }
  }
}

export async function createCollaborationRoom(input?: {
  roomId?: string;
  title?: string;
  titleMode?: CollaborationRoomTitleMode;
  projectId?: string;
}): Promise<CollaborationRoomSummary> {
  return mutateCollaborationRoomStore(async () => {
    const index = await loadCollaborationRoomsIndex();
    const roomId = normalizeRoomId(input?.roomId) ?? buildGeneratedCollaborationRoomId();
    if (index.rooms.some((item) => item.roomId === roomId)) {
      throw new Error("Collaboration room already exists.");
    }
    const title =
      normalizeRoomTitle(input?.title) ??
      (index.rooms.length === 0 ? DEFAULT_COLLABORATION_ROOM_TITLE : `Chat ${index.rooms.length + 1}`);
    const state = defaultCollaborationRoomState({
      roomId,
      title,
      titleMode: input?.titleMode ?? (input?.title?.trim() ? "manual" : "auto"),
      projectId: input?.projectId,
    });
    await writeCollaborationRoomState(state);
    const summary = buildCollaborationRoomSummary(state);
    await writeCollaborationRoomsIndex({
      ...mergeCollaborationRoomSummary(index, summary),
      activeRoomId: roomId,
      roomReadCursors: {
        ...(index.roomReadCursors ?? {}),
        [roomId]: 0,
      },
    });
    return summary;
  });
}

export async function deleteCollaborationRoom(roomId: string): Promise<{
  deletedRoomId: string;
  fallbackRoomId: string;
}> {
  const normalizedRoomId = normalizeRoomId(roomId);
  if (!normalizedRoomId) {
    throw new Error("A valid roomId is required.");
  }

  return mutateCollaborationRoomStore(async () => {
    const index = await loadCollaborationRoomsIndex();
    const existing = index.rooms.find((item) => item.roomId === normalizedRoomId);
    if (!existing) {
      throw new Error("Collaboration room not found.");
    }

    const remaining = index.rooms.filter((item) => item.roomId !== normalizedRoomId);
    await rm(resolveCollaborationRoomDir(normalizedRoomId), { recursive: true, force: true }).catch(() => undefined);

    if (remaining.length === 0) {
      const fallbackState = defaultCollaborationRoomState({
        roomId: DEFAULT_COLLABORATION_ROOM_ID,
        title: DEFAULT_COLLABORATION_ROOM_TITLE,
      });
      await writeCollaborationRoomState(fallbackState);
      await writeCollaborationRoomsIndex({
        version: 2,
        activeRoomId: fallbackState.roomId,
        roomReadCursors: {
          [fallbackState.roomId]: 0,
        },
        rooms: [buildCollaborationRoomSummary(fallbackState)],
      });
      return {
        deletedRoomId: normalizedRoomId,
        fallbackRoomId: fallbackState.roomId,
      };
    }

    const nextIndex = {
      version: 2 as const,
      activeRoomId:
        normalizeRoomId(index.activeRoomId) === normalizedRoomId || !normalizeRoomId(index.activeRoomId)
          ? resolveFallbackActiveRoomId(remaining)
          : normalizeRoomId(index.activeRoomId),
      roomReadCursors: Object.fromEntries(
        Object.entries(index.roomReadCursors ?? {}).filter(([key]) => key !== normalizedRoomId),
      ),
      rooms: [...remaining].sort(compareRoomSummaryRecency),
    };
    await writeCollaborationRoomsIndex(nextIndex);
    return {
      deletedRoomId: normalizedRoomId,
      fallbackRoomId: nextIndex.rooms[0]?.roomId ?? DEFAULT_COLLABORATION_ROOM_ID,
    };
  });
}

export async function loadCollaborationRoom(roomId = DEFAULT_COLLABORATION_ROOM_ID): Promise<CollaborationRoomState> {
  const normalizedRoomId = normalizeRoomId(roomId) ?? DEFAULT_COLLABORATION_ROOM_ID;
  const existing = await loadExistingCollaborationRoom(normalizedRoomId);
  if (existing) return existing;
  const summary = await ensureCollaborationRoomSummary(normalizedRoomId);
  return readPersistedCollaborationRoom(normalizedRoomId, summary);
}

export async function loadExistingCollaborationRoom(
  roomId = DEFAULT_COLLABORATION_ROOM_ID,
): Promise<CollaborationRoomState | undefined> {
  await ensureCollaborationRoomsReady();
  const normalizedRoomId = normalizeRoomId(roomId) ?? DEFAULT_COLLABORATION_ROOM_ID;
  const index = await loadCollaborationRoomsIndex();
  const summary = index.rooms.find((item) => item.roomId === normalizedRoomId);
  if (!summary) {
    const recovered = await readCollaborationRoomStateFromDisk(normalizedRoomId);
    if (!recovered) return undefined;
    await writeCollaborationRoomsIndex(
      mergeCollaborationRoomSummary(index, buildCollaborationRoomSummary(recovered)),
    );
    return recovered;
  }
  return readPersistedCollaborationRoom(normalizedRoomId, summary);
}

async function readPersistedCollaborationRoom(
  roomId: string,
  summary: CollaborationRoomSummary,
): Promise<CollaborationRoomState> {
  const persisted = await readCollaborationRoomStateFromDisk(roomId, summary);
  if (persisted) return persisted;
  const fallback = defaultCollaborationRoomState({
    roomId,
    title: summary.title,
    now: summary.createdAt,
  });
  fallback.updatedAt = summary.updatedAt;
  fallback.lastSequence = summary.lastSequence;
  return fallback;
}

export async function saveCollaborationRoom(state: CollaborationRoomState): Promise<string> {
  const normalized = normalizeCollaborationRoom(state, {
    roomId: state.roomId,
    title: state.title,
    titleMode: state.titleMode,
    projectId: state.projectId,
    createdAt: state.createdAt,
  });
  await ensureCollaborationRoomsReady();
  await writeCollaborationRoomState(normalized);
  const index = await loadCollaborationRoomsIndex();
  const nextIndex = mergeCollaborationRoomSummary(index, buildCollaborationRoomSummary(normalized));
  const existingCursor = nextIndex.roomReadCursors?.[normalized.roomId] ?? 0;
  await writeCollaborationRoomsIndex({
    ...nextIndex,
    activeRoomId: normalizeRoomId(nextIndex.activeRoomId) ?? normalized.roomId,
    roomReadCursors: {
      ...(nextIndex.roomReadCursors ?? {}),
      [normalized.roomId]:
        Number.isInteger(existingCursor) && existingCursor >= 0
          ? existingCursor
          : 0,
    },
  });
  notifyCollaborationRoomSubscribers(normalized.roomId);
  return resolveCollaborationRoomStatePath(normalized.roomId);
}

export function subscribeCollaborationRoomMutations(
  roomId: string,
  listener: () => void,
): () => void {
  const normalizedRoomId = normalizeRoomId(roomId);
  if (!normalizedRoomId) {
    return () => undefined;
  }
  const listeners = roomSubscribers.get(normalizedRoomId) ?? new Set<() => void>();
  listeners.add(listener);
  roomSubscribers.set(normalizedRoomId, listeners);
  return () => {
    const current = roomSubscribers.get(normalizedRoomId);
    if (!current) {
      return;
    }
    current.delete(listener);
    if (current.size === 0) {
      roomSubscribers.delete(normalizedRoomId);
    }
  };
}

export async function createCollaborationAttachment(
  input: CollaborationAttachmentUploadInput,
): Promise<CollaborationAttachmentRecord> {
  const roomId = normalizeRoomId(input.roomId) ?? DEFAULT_COLLABORATION_ROOM_ID;
  const normalizedFileName = sanitizeUploadFileName(input.fileName);
  if (!normalizedFileName) {
    throw new Error("A valid fileName is required.");
  }
  if (input.content.byteLength <= 0) {
    throw new Error("Attachment content is empty.");
  }
  if (input.content.byteLength > COLLABORATION_ATTACHMENT_MAX_BYTES) {
    throw new Error(`Attachment exceeds the ${COLLABORATION_ATTACHMENT_MAX_BYTES} byte limit.`);
  }

  const now = new Date().toISOString();
  const attachmentId = randomUUID();
  const extension = extname(normalizedFileName).slice(0, 16);
  const relativeStoredPath = `${attachmentId}${extension || ""}`;
  const storedPath = join(resolveCollaborationRoomAttachmentsDir(roomId), relativeStoredPath);
  const contentType = normalizeContentType(input.contentType);
  const kind = resolveAttachmentKind(normalizedFileName, contentType);
  const previewText =
    kind === "text" ? buildTextAttachmentPreview(input.content, normalizedFileName, contentType) : undefined;

  await mkdir(resolveCollaborationRoomAttachmentsDir(roomId), { recursive: true });
  await writeFile(storedPath, input.content);

  return mutateCollaborationRoom(roomId, async (state) => {
    const nextAttachment: CollaborationAttachmentRecord = {
      attachmentId,
      fileName: normalizedFileName,
      contentType,
      sizeBytes: input.content.byteLength,
      storedPath,
      relativeStoredPath,
      sourceLocalPath: normalizeStoredSourcePath(input.sourceLocalPath),
      kind,
      uploadedAt: now,
      uploadedBy: input.uploadedBy ?? "user",
      previewText,
    };
    state.attachments.push(nextAttachment);
    state.updatedAt = now;
    return nextAttachment;
  }).then((result) => result.value);
}

export async function createCollaborationAttachmentFromFile(input: {
  roomId?: string;
  sourcePath: string;
  fileName?: string;
  contentType?: string;
  uploadedBy?: CollaborationAttachmentRecord["uploadedBy"];
}): Promise<CollaborationAttachmentRecord> {
  const sourcePath = normalizeStoredSourcePath(input.sourcePath);
  if (!sourcePath) {
    throw new Error("A valid sourcePath is required.");
  }
  const fileName = sanitizeUploadFileName(input.fileName ?? basename(sourcePath));
  if (!fileName) {
    throw new Error("Could not derive a valid file name from sourcePath.");
  }
  const content = await readFile(sourcePath);
  return createCollaborationAttachment({
    roomId: input.roomId,
    fileName,
    contentType: input.contentType ?? inferAttachmentContentType(fileName),
    content,
    uploadedBy: input.uploadedBy ?? "agent",
    sourceLocalPath: sourcePath,
  });
}

export async function readCollaborationAttachment(
  attachmentId: string,
  roomId?: string,
): Promise<{ attachment: CollaborationAttachmentRecord; content: Buffer; roomId: string } | undefined> {
  const normalizedId = normalizeId(attachmentId);
  if (!normalizedId) return undefined;

  if (roomId?.trim()) {
    return readCollaborationAttachmentFromRoom(normalizedId, roomId);
  }

  const rooms = await listCollaborationRooms();
  for (const room of rooms) {
    const found = await readCollaborationAttachmentFromRoom(normalizedId, room.roomId);
    if (found) return found;
  }
  return undefined;
}

export async function getCollaborationAttachmentRecords(
  roomId: string,
  attachmentIds: string[],
): Promise<CollaborationAttachmentRecord[]> {
  if (attachmentIds.length === 0) return [];
  const wanted = new Set(attachmentIds.map((item) => normalizeId(item)).filter(Boolean));
  const state = await loadCollaborationRoom(roomId);
  return state.attachments.filter((item) => wanted.has(item.attachmentId));
}

export async function appendCollaborationRoomEvents(
  roomId: string,
  events: Array<Omit<CollaborationRoomEvent, "sequence" | "createdAt"> & { createdAt?: string }>,
): Promise<CollaborationRoomEvent[]> {
  return mutateCollaborationRoom(roomId, async (state) => {
    const createdAt = new Date().toISOString();
    const nextEvents = events
      .map((event) => {
        state.lastSequence += 1;
        return normalizeEvent({
          ...event,
          createdAt: event.createdAt ?? createdAt,
          sequence: state.lastSequence,
        });
      })
      .filter((event): event is CollaborationRoomEvent => Boolean(event));
    state.events.push(...nextEvents);
    if (state.events.length > COLLABORATION_ROOM_MAX_EVENTS) {
      state.events.splice(0, state.events.length - COLLABORATION_ROOM_MAX_EVENTS);
    }
    state.updatedAt = nextEvents.at(-1)?.createdAt ?? createdAt;
    return nextEvents;
  }).then((result) => result.value);
}

export async function upsertCollaborationRoomMetadata(
  roomId: string,
  input: {
    title?: string;
    titleMode?: CollaborationRoomTitleMode;
    projectId?: string;
  },
): Promise<CollaborationRoomState> {
  return mutateCollaborationRoom(roomId, async (state) => {
    const now = new Date().toISOString();
    const nextTitle = normalizeRoomTitle(input.title);
    const nextProjectId = normalizeProjectId(input.projectId);
    if (nextTitle) {
      state.title = nextTitle;
    }
    state.titleMode = normalizeRoomTitleMode(input.titleMode ?? state.titleMode);
    if (nextProjectId) {
      state.projectId = nextProjectId;
    }
    state.updatedAt = now;
    return state;
  }).then((result) => result.state);
}

export async function upsertCollaborationDispatchRecord(
  roomId: string,
  record: ProjectTaskDispatchRecord,
): Promise<ProjectTaskDispatchRecord> {
  return mutateCollaborationRoom(roomId, async (state) => {
    const normalized = normalizeDispatchRecord(record);
    if (!normalized) {
      throw new Error("A valid project task dispatch record is required.");
    }
    const index = state.dispatchRecords.findIndex(
      (item) => item.taskId === normalized.taskId && item.projectId === normalized.projectId,
    );
    if (index >= 0) {
      state.dispatchRecords[index] = normalized;
    } else {
      state.dispatchRecords.push(normalized);
    }
    state.dispatchRecords.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    state.updatedAt = normalized.createdAt;
    return normalized;
  }).then((result) => result.value);
}

export async function upsertCollaborationTaskReceipt(
  roomId: string,
  receipt: CollaborationTaskReceipt,
): Promise<CollaborationTaskReceipt> {
  return mutateCollaborationRoom(roomId, async (state) => {
    const normalized = normalizeTaskReceipt(receipt);
    if (!normalized) {
      throw new Error("A valid collaboration task receipt is required.");
    }
    const index = state.taskReceipts.findIndex(
      (item) => item.taskId === normalized.taskId && item.projectId === normalized.projectId,
    );
    if (index >= 0) {
      state.taskReceipts[index] = normalized;
    } else {
      state.taskReceipts.push(normalized);
    }
    state.taskReceipts.sort((a, b) => Date.parse(b.lastReportedAt) - Date.parse(a.lastReportedAt));
    state.updatedAt = normalized.lastReportedAt;
    return normalized;
  }).then((result) => result.value);
}

export async function markCollaborationAttachmentsReferenced(
  roomId: string,
  attachmentIds: string[],
  referencedAt = new Date().toISOString(),
): Promise<void> {
  const wanted = new Set(attachmentIds.map((item) => normalizeId(item)).filter(Boolean));
  if (wanted.size === 0) return;

  await mutateCollaborationRoom(roomId, async (state) => {
    for (const attachment of state.attachments) {
      if (!wanted.has(attachment.attachmentId)) continue;
      attachment.referencedAt = referencedAt;
    }
    state.updatedAt = referencedAt;
  });
}

export async function getCollaborationSessionBinding(
  roomId: string,
  agentId: string,
): Promise<CollaborationSessionBinding | undefined> {
  const key = normalizeMentionAlias(agentId);
  if (!key) return undefined;
  const state = await loadCollaborationRoom(roomId);
  return state.sessionBindings.find((binding) => normalizeMentionAlias(binding.agentId) === key);
}

export async function setCollaborationSessionBinding(
  roomId: string,
  agentId: string,
  sessionId: string,
  sessionKey?: string,
): Promise<CollaborationSessionBinding> {
  const normalizedAgentId = normalizeId(agentId);
  const normalizedSessionId = normalizeId(sessionId);
  if (!normalizedAgentId || !normalizedSessionId) {
    throw new Error("agentId and sessionId are required for session binding.");
  }
  const normalizedSessionKey = normalizeId(sessionKey);

  return mutateCollaborationRoom(roomId, async (state) => {
    const now = new Date().toISOString();
    const existing = state.sessionBindings.find(
      (binding) => normalizeMentionAlias(binding.agentId) === normalizeMentionAlias(normalizedAgentId),
    );
    if (existing) {
      existing.sessionId = normalizedSessionId;
      existing.sessionKey = normalizedSessionKey;
      existing.updatedAt = now;
      state.updatedAt = now;
      return existing;
    }
    const next: CollaborationSessionBinding = {
      agentId: normalizedAgentId,
      sessionId: normalizedSessionId,
      sessionKey: normalizedSessionKey,
      updatedAt: now,
    };
    state.sessionBindings.push(next);
    state.updatedAt = now;
    return next;
  }).then((result) => result.value);
}

export function buildMentionAliases(agentId: string, displayName: string): string[] {
  const normalizedAgentId = normalizeMentionAlias(agentId);
  const compactDisplayAlias = normalizeMentionAlias(displayName);
  const displayTokens = String(displayName || "")
    .split(/[^\p{L}\p{N}._:-]+/u)
    .map((item) => normalizeMentionAlias(item))
    .filter((item): item is string => Boolean(item));
  const preferDisplayAlias =
    Boolean(compactDisplayAlias) &&
    compactDisplayAlias !== normalizedAgentId &&
    (isPrimaryOperatorAgentId(agentId) || displayTokens.length === 1);
  const seeds = [
    ...(preferDisplayAlias ? [displayName] : []),
    agentId,
    displayName,
    displayName.replace(/[^\p{L}\p{N}]+/gu, " "),
    displayName.replace(/[^\p{L}\p{N}]+/gu, ""),
  ];
  const aliases = new Set<string>();
  for (const seed of seeds) {
    const normalized = normalizeMentionAlias(seed);
    if (normalized) aliases.add(normalized);
    for (const token of String(seed)
      .split(/[^\p{L}\p{N}._:-]+/u)
      .map((item) => normalizeMentionAlias(item))) {
      if (token) aliases.add(token);
    }
  }
  return [...aliases];
}

export function preferredMentionAlias(
  agentId: string,
  displayName: string,
  aliases: string[] = [],
): string {
  const orderedAliases = aliases
    .map((alias) => normalizeMentionAlias(alias))
    .filter((alias): alias is string => Boolean(alias));
  if (orderedAliases.length > 0) return orderedAliases[0];
  return normalizeMentionAlias(displayName) || normalizeMentionAlias(agentId) || agentId.trim();
}

export function parseMentionedAgentIds(
  message: string,
  participants: CollaborationParticipantMention[],
): string[] {
  const directMentions = new Set<string>();
  const mentionRegex = /@([^\s@]+)/gu;
  const aliasToAgentId = buildMentionAliasLookup(participants);

  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(message)) !== null) {
    const normalized = normalizeMentionAlias(match[1] ?? "");
    if (!normalized) continue;
    const agentId = aliasToAgentId.get(normalized);
    if (agentId) directMentions.add(agentId);
  }

  return [...directMentions];
}

function buildMentionAliasLookup(
  participants: CollaborationParticipantMention[],
): Map<string, string> {
  const aliasToAgentId = new Map<string, string>();
  for (const participant of participants) {
    const aliases = participant.aliases.length > 0
      ? participant.aliases
      : buildMentionAliases(participant.agentId, participant.displayName);
    for (const alias of aliases) {
      const normalized = normalizeMentionAlias(alias);
      if (normalized && !aliasToAgentId.has(normalized)) {
        aliasToAgentId.set(normalized, participant.agentId);
      }
    }
  }
  return aliasToAgentId;
}

function parseLeadingDispatchMentionedAgentIds(
  message: string,
  participants: CollaborationParticipantMention[],
): string[] {
  const firstNonEmptyLine = String(message || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstNonEmptyLine) {
    return [];
  }

  // User-side direct dispatch is opt-in: only a leading mention prefix counts.
  const dispatchPrefix = firstNonEmptyLine
    .replace(/^(?:[-*+>]+|\d+[.)])+[\s\t]*/u, "")
    .replace(/^(?:(?:please|pls|kindly|请|麻烦|劳烦)\s+)+/iu, "")
    .trimStart();
  if (!dispatchPrefix.startsWith("@")) {
    return [];
  }

  return parseMentionedAgentIds(message, participants);
}

export function resolveCollaborationDispatchTargets(input: {
  message: string;
  participants: CollaborationParticipantMention[];
  primaryAgentId: string;
}): string[] {
  const mentioned = parseLeadingDispatchMentionedAgentIds(input.message, input.participants);
  if (mentioned.length === 0) {
    const preferredPrimary = input.participants.find((participant) => {
      const agentId = participant.agentId?.trim();
      if (!agentId) {
        return false;
      }
      if (agentId.toLowerCase() === String(input.primaryAgentId || "").trim().toLowerCase()) {
        return true;
      }
      return isPrimaryOperatorAgentId(agentId) && isPrimaryOperatorAgentId(input.primaryAgentId);
    })?.agentId?.trim();
    if (preferredPrimary) {
      return [preferredPrimary];
    }
    const fallbackPrimary = String(input.primaryAgentId || "").trim();
    if (fallbackPrimary) {
      return [fallbackPrimary];
    }
    const firstParticipant = input.participants
      .map((participant) => participant.agentId?.trim())
      .find((agentId): agentId is string => Boolean(agentId));
    return firstParticipant ? [firstParticipant] : [];
  }
  return mentioned;
}

export function sanitizeUploadFileName(fileName: string): string {
  const base = basename(String(fileName || "").trim())
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "";
  return base.slice(0, 180);
}

export function normalizeMentionAlias(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[.,!?;:，。！？；：、》」』】）]+$/gu, "")
    .replace(/[^\p{L}\p{N}._:-]+/gu, "");
}

function normalizeCollaborationRoom(
  input: unknown,
  fallback?: {
    roomId?: string;
    title?: string;
    titleMode?: CollaborationRoomTitleMode;
    projectId?: string;
    createdAt?: string;
  },
): CollaborationRoomState {
  const obj = asObject(input);
  const now = new Date().toISOString();
  const roomId = normalizeRoomId(asString(obj?.roomId) ?? fallback?.roomId) ?? DEFAULT_COLLABORATION_ROOM_ID;
  const title = normalizeRoomTitle(asString(obj?.title) ?? fallback?.title) ?? DEFAULT_COLLABORATION_ROOM_TITLE;
  const titleMode = normalizeRoomTitleMode(asString(obj?.titleMode) ?? fallback?.titleMode);
  const projectId = normalizeProjectId(asString(obj?.projectId) ?? fallback?.projectId);
  const attachments = asArray(obj?.attachments)
    .map((item) => normalizeAttachment(item))
    .filter((item): item is CollaborationAttachmentRecord => Boolean(item));
  const events = asArray(obj?.events)
    .map((item) => normalizeEvent(item))
    .filter((item): item is CollaborationRoomEvent => Boolean(item))
    .sort((a, b) => a.sequence - b.sequence);
  const sessionBindings = asArray(obj?.sessionBindings)
    .map((item) => normalizeSessionBinding(item))
    .filter((item): item is CollaborationSessionBinding => Boolean(item));
  const dispatchRecords = asArray(obj?.dispatchRecords)
    .map((item) => normalizeDispatchRecord(item))
    .filter((item): item is ProjectTaskDispatchRecord => Boolean(item))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const taskReceipts = asArray(obj?.taskReceipts)
    .map((item) => normalizeTaskReceipt(item))
    .filter((item): item is CollaborationTaskReceipt => Boolean(item))
    .sort((a, b) => taskReceiptActivitySortValue(b) - taskReceiptActivitySortValue(a));
  const createdAt =
    asIsoString(obj?.createdAt) ??
    fallback?.createdAt ??
    events[0]?.createdAt ??
    attachments[0]?.uploadedAt ??
    asIsoString(obj?.updatedAt) ??
    now;

  return {
    version: 3,
    roomId,
    title,
    titleMode,
    projectId,
    createdAt,
    lastSequence: Math.max(asInteger(obj?.lastSequence) ?? 0, events.at(-1)?.sequence ?? 0),
    events,
    attachments,
    sessionBindings,
    dispatchRecords,
    taskReceipts,
    updatedAt: asIsoString(obj?.updatedAt) ?? events.at(-1)?.createdAt ?? createdAt,
  };
}

function normalizeAttachment(input: unknown): CollaborationAttachmentRecord | null {
  const obj = asObject(input);
  if (!obj) return null;
  const attachmentId = normalizeId(obj.attachmentId);
  const fileName = sanitizeUploadFileName(asString(obj.fileName) ?? "");
  const storedPath = asString(obj.storedPath);
  const relativeStoredPath = asString(obj.relativeStoredPath);
  const contentType = normalizeContentType(asString(obj.contentType));
  const sizeBytes = asInteger(obj.sizeBytes);
  const uploadedAt = asIsoString(obj.uploadedAt);
  const uploadedBy = normalizeUploadedBy(asString(obj.uploadedBy));
  if (!attachmentId || !fileName || !storedPath || !relativeStoredPath || !uploadedAt || sizeBytes === undefined) {
    return null;
  }
  return {
    attachmentId,
    fileName,
    contentType,
    sizeBytes,
    storedPath,
    relativeStoredPath,
    sourceLocalPath: normalizeStoredSourcePath(asString(obj.sourceLocalPath)),
    kind: resolveAttachmentKind(fileName, contentType, asString(obj.kind)),
    uploadedAt,
    uploadedBy,
    referencedAt: asIsoString(obj.referencedAt),
    previewText: trimPreviewText(asString(obj.previewText)),
  };
}

function normalizeEvent(input: unknown): CollaborationRoomEvent | null {
  const obj = asObject(input);
  if (!obj) return null;
  const eventId = normalizeId(obj.eventId);
  const type = normalizeEventType(asString(obj.type));
  const sequence = asInteger(obj.sequence);
  const createdAt = asIsoString(obj.createdAt);
  const authorRole = normalizeAuthorRole(asString(obj.authorRole));
  if (!eventId || !type || sequence === undefined || !createdAt) return null;

  return {
    sequence,
    eventId,
    type,
    createdAt,
    authorRole,
    agentId: normalizeId(obj.agentId),
    sourceEventId: normalizeId(obj.sourceEventId),
    message: normalizeEventMessage(type, asString(obj.message), normalizeId(obj.agentId)),
    targetAgentIds: asArray(obj.targetAgentIds)
      .map((item) => normalizeId(item))
      .filter((item): item is string => Boolean(item)),
    fallbackAgentId: normalizeId(obj.fallbackAgentId),
    attachmentIds: asArray(obj.attachmentIds)
      .map((item) => normalizeId(item))
      .filter((item): item is string => Boolean(item)),
    relatedSessionId: normalizeId(obj.relatedSessionId),
    relatedSessionKey: normalizeId(obj.relatedSessionKey),
    failureReason: trimText(asString(obj.failureReason), 1600),
    detail: trimText(asString(obj.detail), 1600),
  };
}

function normalizeSessionBinding(input: unknown): CollaborationSessionBinding | null {
  const obj = asObject(input);
  if (!obj) return null;
  const agentId = normalizeId(obj.agentId);
  const sessionId = normalizeId(obj.sessionId);
  const updatedAt = asIsoString(obj.updatedAt);
  if (!agentId || !sessionId || !updatedAt) return null;
  return {
    agentId,
    sessionId,
    sessionKey: normalizeId(obj.sessionKey),
    updatedAt,
  };
}

function normalizeDispatchRecord(input: unknown): ProjectTaskDispatchRecord | null {
  const obj = asObject(input);
  if (!obj) return null;
  const taskId = normalizeId(obj.taskId);
  const projectId = normalizeProjectId(asString(obj.projectId));
  const stage = trimText(asString(obj.stage), 120);
  const ownerAgentId = normalizeId(obj.ownerAgentId);
  const title = trimText(asString(obj.title), 240);
  const goal = trimText(asString(obj.goal), 4_000);
  const createdAt = asIsoString(obj.createdAt);
  if (!taskId || !projectId || !stage || !ownerAgentId || !title || !goal || !createdAt) {
    return null;
  }

  return {
    taskId,
    projectId,
    stage,
    ownerAgentId,
    title,
    goal,
    definitionOfDone: asArray(obj.definitionOfDone)
      .map((item) => trimText(asString(item), 240))
      .filter((item): item is string => Boolean(item)),
    requiredContextRefs: asArray(obj.requiredContextRefs)
      .map((item) => trimText(asString(item), 1_600))
      .filter((item): item is string => Boolean(item)),
    expectedArtifacts: asArray(obj.expectedArtifacts)
      .map((item) => trimText(asString(item), 1_600))
      .filter((item): item is string => Boolean(item)),
    createdAt,
    createdBy: "jarvis",
  };
}

function normalizeTaskReceipt(input: unknown): CollaborationTaskReceipt | null {
  const obj = asObject(input);
  if (!obj) return null;
  const taskId = normalizeId(obj.taskId);
  const projectId = normalizeProjectId(asString(obj.projectId));
  const lastReportedAt = asIsoString(obj.lastReportedAt);
  const lastReportedBy = normalizeId(obj.lastReportedBy);
  if (!taskId || !projectId || !lastReportedAt || !lastReportedBy) {
    return null;
  }

  const reviewState =
    obj.reviewState === "awaiting_review" || obj.reviewState === "approved" || obj.reviewState === "rejected"
      ? obj.reviewState
      : undefined;
  const lastResultState =
    obj.lastResultState === "in_progress" ||
    obj.lastResultState === "awaiting_review" ||
    obj.lastResultState === "blocked" ||
    obj.lastResultState === "failed"
      ? obj.lastResultState
      : undefined;
  const waitingFor =
    obj.waitingFor === "jarvis_review" || obj.waitingFor === "user_confirmation"
      ? obj.waitingFor
      : undefined;
  const manualOutcome =
    obj.manualOutcome === "done" || obj.manualOutcome === "follow_up" || obj.manualOutcome === "error"
      ? obj.manualOutcome
      : undefined;
  const manualOutcomeAt = asIsoString(obj.manualOutcomeAt);
  const manualOutcomeBy = trimText(asString(obj.manualOutcomeBy), 120);
  const manualOutcomeNote = trimText(asString(obj.manualOutcomeNote), 600);

  return {
    taskId,
    projectId,
    reviewState,
    lastResultState,
    waitingFor,
    manualOutcome,
    manualOutcomeAt,
    manualOutcomeBy,
    manualOutcomeNote,
    lastReportedAt,
    lastReportedBy,
    taskTitle: trimText(asString(obj.taskTitle), 240),
    stage: trimText(asString(obj.stage), 120),
    summary: trimText(asString(obj.summary), 4_000),
    blockers: asArray(obj.blockers)
      .map((item) => trimText(asString(item), 240))
      .filter((item): item is string => Boolean(item)),
    recentOutput: trimText(asString(obj.recentOutput), 4_000),
  };
}

function taskReceiptActivitySortValue(receipt: CollaborationTaskReceipt | null | undefined): number {
  const manualOutcomeAt = Date.parse(String(receipt?.manualOutcomeAt || ""));
  const lastReportedAt = Date.parse(String(receipt?.lastReportedAt || ""));
  return Math.max(Number.isFinite(manualOutcomeAt) ? manualOutcomeAt : 0, Number.isFinite(lastReportedAt) ? lastReportedAt : 0);
}

function normalizeUploadedBy(input: string | undefined): CollaborationAttachmentRecord["uploadedBy"] {
  if (input === "agent" || input === "system") return input;
  return "user";
}

function normalizeAuthorRole(
  input: string | undefined,
): CollaborationRoomEvent["authorRole"] {
  if (input === "agent" || input === "system") return input;
  return "user";
}

function normalizeEventType(input: string | undefined): CollaborationRoomEventType | undefined {
  switch (input) {
    case "user_message":
    case "attachment":
    case "dispatch_started":
    case "dispatch_failed":
    case "dispatch_fallback":
    case "agent_reply":
    case "system_note":
      return input;
    default:
      return undefined;
  }
}

function resolveAttachmentKind(
  fileName: string,
  contentType: string,
  explicit?: string,
): CollaborationAttachmentKind {
  if (explicit === "image" || explicit === "text" || explicit === "file") return explicit;
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("text/")) return "text";
  const extension = extname(fileName).toLowerCase();
  if (
    [
      ".md",
      ".markdown",
      ".txt",
      ".json",
      ".yml",
      ".yaml",
      ".csv",
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".py",
      ".html",
      ".htm",
      ".css",
      ".svg",
      ".xml",
    ].includes(extension)
  ) {
    return "text";
  }
  return "file";
}

function inferAttachmentContentType(fileName: string): string {
  switch (extname(fileName).toLowerCase()) {
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".md":
    case ".markdown":
      return "text/markdown; charset=utf-8";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".csv":
      return "text/csv; charset=utf-8";
    case ".yml":
    case ".yaml":
      return "application/yaml; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".jsx":
      return "text/jsx; charset=utf-8";
    case ".ts":
      return "text/typescript; charset=utf-8";
    case ".tsx":
      return "text/tsx; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".xml":
      return "application/xml; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".pdf":
      return "application/pdf";
    case ".ppt":
      return "application/vnd.ms-powerpoint";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
}

function buildTextAttachmentPreview(content: Buffer, fileName: string, contentType: string): string | undefined {
  const kind = resolveAttachmentKind(fileName, contentType);
  if (kind !== "text" || content.byteLength > TEXT_ATTACHMENT_PREVIEW_MAX_BYTES) return undefined;
  return trimPreviewText(content.toString("utf8"));
}

function trimPreviewText(input: string | undefined): string | undefined {
  const trimmed = String(input || "").trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, TEXT_ATTACHMENT_PREVIEW_MAX_CHARS);
}

function normalizeContentType(input: string | undefined): string {
  const trimmed = String(input || "").trim().toLowerCase();
  if (!trimmed) return "application/octet-stream";
  return trimmed.slice(0, 160);
}

function normalizeStoredSourcePath(input: string | undefined): string | undefined {
  const trimmed = String(input || "").trim();
  return trimmed ? trimmed.slice(0, 2000) : undefined;
}

function trimText(input: string | undefined, maxLength: number): string | undefined {
  const value = String(input || "").trim();
  if (!value) return undefined;
  return value.slice(0, maxLength);
}

function normalizeEventMessage(
  type: CollaborationRoomEventType,
  message: string | undefined,
  agentId: string | undefined,
): string | undefined {
  const trimmed = trimText(message, 12_000);
  if (!trimmed) return undefined;
  if (type !== "agent_reply") {
    return trimmed;
  }
  const visibleReply = extractVisibleAgentReplyText(trimmed, agentId);
  return trimText(visibleReply || trimmed, 12_000);
}

export function extractVisibleAgentReplyText(replyText: string, agentId: string | undefined): string {
  const parsedArtifacts = parseCollaborationAgentArtifacts(replyText);
  const parsedStageResult = parseStageResultEnvelopeFromReply(parsedArtifacts.cleanReplyText, {
    agentId: agentId || "agent",
  });
  return (
    parsedStageResult.cleanReplyText.trim() ||
    parsedArtifacts.cleanReplyText.trim() ||
    String(replyText || "").trim()
  );
}

function normalizeRoomId(input: string | undefined): string | undefined {
  const value = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return value ? value.slice(0, 120) : undefined;
}

export function normalizeCollaborationRoomId(input: string | undefined): string | undefined {
  return normalizeRoomId(input);
}

function normalizeRoomTitle(input: string | undefined): string | undefined {
  const value = String(input || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return value ? value.slice(0, COLLABORATION_ROOM_TITLE_MAX_CHARS) : undefined;
}

function normalizeRoomTitleMode(input: unknown): CollaborationRoomTitleMode {
  return input === "manual" ? "manual" : "auto";
}

function normalizeProjectId(input: string | undefined): string | undefined {
  const value = String(input || "").trim();
  if (!value || !PROJECT_ID_REGEX.test(value)) {
    return undefined;
  }
  return value.slice(0, 100);
}

function normalizeId(input: unknown): string | undefined {
  const value = asString(input)?.trim();
  if (!value) return undefined;
  return value.slice(0, 240);
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

function asArray(input: unknown): unknown[] {
  return Array.isArray(input) ? input : [];
}

function asString(input: unknown): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function asInteger(input: unknown): number | undefined {
  return typeof input === "number" && Number.isInteger(input) && input >= 0 ? input : undefined;
}

function asIsoString(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}

function buildGeneratedCollaborationRoomId(): string {
  return `room-${randomUUID().slice(0, 8)}`;
}

function resolveCollaborationRoomDir(roomId: string): string {
  return join(COLLABORATION_ROOMS_DIR, roomId);
}

function resolveCollaborationRoomStatePath(roomId: string): string {
  return join(resolveCollaborationRoomDir(roomId), "room.json");
}

function resolveCollaborationRoomAttachmentsDir(roomId: string): string {
  return join(resolveCollaborationRoomDir(roomId), "attachments");
}

function compareRoomSummaryRecency(a: CollaborationRoomSummary, b: CollaborationRoomSummary): number {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;
  const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return a.title.localeCompare(b.title);
}

function resolveFallbackActiveRoomId(rooms: CollaborationRoomSummary[]): string {
  return rooms[0]?.roomId ?? DEFAULT_COLLABORATION_ROOM_ID;
}

function buildCollaborationRoomSummary(state: CollaborationRoomState): CollaborationRoomSummary {
  return {
    roomId: state.roomId,
    title: state.title,
    titleMode: state.titleMode,
    projectId: state.projectId,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    lastSequence: state.lastSequence,
    eventCount: state.events.length,
  };
}

function normalizeCollaborationRoomsIndex(input: unknown): CollaborationRoomsIndexState {
  const obj = asObject(input);
  const rooms = asArray(obj?.rooms)
    .map((item) => normalizeCollaborationRoomSummary(item))
    .filter((item): item is CollaborationRoomSummary => Boolean(item))
    .sort(compareRoomSummaryRecency);
  const activeRoomId = normalizeRoomId(asString(obj?.activeRoomId));
  const roomReadCursors = normalizeCollaborationRoomReadCursors(obj?.roomReadCursors);

  return {
    version: 2,
    activeRoomId,
    roomReadCursors,
    rooms,
  };
}

function collaborationRoomsIndexEquals(
  left: CollaborationRoomsIndexState | undefined,
  right: CollaborationRoomsIndexState | undefined,
): boolean {
  return JSON.stringify(normalizeCollaborationRoomsIndex(left ?? { version: 2, rooms: [] })) ===
    JSON.stringify(normalizeCollaborationRoomsIndex(right ?? { version: 2, rooms: [] }));
}

function normalizeCollaborationRoomSummary(input: unknown): CollaborationRoomSummary | null {
  const obj = asObject(input);
  if (!obj) return null;
  const roomId = normalizeRoomId(asString(obj.roomId));
  const title = normalizeRoomTitle(asString(obj.title));
  const titleMode = normalizeRoomTitleMode(asString(obj.titleMode));
  const projectId = normalizeProjectId(asString(obj.projectId));
  const createdAt = asIsoString(obj.createdAt);
  const updatedAt = asIsoString(obj.updatedAt);
  const lastSequence = asInteger(obj.lastSequence) ?? 0;
  const eventCount = asInteger(obj.eventCount) ?? 0;
  if (!roomId || !title || !createdAt || !updatedAt) return null;
  return {
    roomId,
    title,
    titleMode,
    projectId,
    createdAt,
    updatedAt,
    lastSequence,
    eventCount,
  };
}

function mergeCollaborationRoomSummary(
  index: CollaborationRoomsIndexState,
  summary: CollaborationRoomSummary,
): CollaborationRoomsIndexState {
  const nextRooms = index.rooms.filter((item) => item.roomId !== summary.roomId);
  nextRooms.push(summary);
  nextRooms.sort(compareRoomSummaryRecency);
  return {
    version: 2,
    activeRoomId: normalizeRoomId(index.activeRoomId),
    roomReadCursors: normalizeCollaborationRoomReadCursors(index.roomReadCursors),
    rooms: nextRooms,
  };
}

function normalizeCollaborationRoomReadCursors(input: unknown): Record<string, number> {
  const obj = asObject(input);
  if (!obj) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(obj)) {
    const roomId = normalizeRoomId(key);
    const cursor = asInteger(value);
    if (!roomId || cursor === undefined || cursor < 0) {
      continue;
    }
    out[roomId] = cursor;
  }
  return out;
}

async function ensureCollaborationRoomsReady(): Promise<void> {
  if (!collaborationRoomInitPromise) {
    collaborationRoomInitPromise = initializeCollaborationRooms();
  }
  return collaborationRoomInitPromise;
}

async function initializeCollaborationRooms(): Promise<void> {
  await mkdir(COLLABORATION_ROOM_DIR, { recursive: true });
  await mkdir(COLLABORATION_ROOMS_DIR, { recursive: true });

  const persistedIndex = await readCollaborationRoomsIndexFile();
  const recoveredIndex = await recoverCollaborationRoomsIndex(persistedIndex);
  if (recoveredIndex.rooms.length > 0) {
    if (!collaborationRoomsIndexEquals(persistedIndex, recoveredIndex)) {
      await writeCollaborationRoomsIndex(recoveredIndex);
    }
    return;
  }

  const legacy = await loadLegacyCollaborationRoom();
  const bootstrapped = legacy ?? defaultCollaborationRoomState({
    roomId: DEFAULT_COLLABORATION_ROOM_ID,
    title: DEFAULT_COLLABORATION_ROOM_TITLE,
  });
  await writeCollaborationRoomState(bootstrapped);
  await writeCollaborationRoomsIndex({
    version: 2,
    roomReadCursors: {},
    rooms: [buildCollaborationRoomSummary(bootstrapped)],
  });
}

async function loadLegacyCollaborationRoom(): Promise<CollaborationRoomState | undefined> {
  try {
    const raw = await readFile(COLLABORATION_ROOM_LEGACY_PATH, "utf8");
    return normalizeCollaborationRoom(JSON.parse(raw) as unknown, {
      roomId: DEFAULT_COLLABORATION_ROOM_ID,
      title: DEFAULT_COLLABORATION_ROOM_TITLE,
    });
  } catch {
    return undefined;
  }
}

async function loadCollaborationRoomsIndex(): Promise<CollaborationRoomsIndexState> {
  await ensureCollaborationRoomsReady();
  const persistedIndex = await readCollaborationRoomsIndexFile();
  const recoveredIndex = await recoverCollaborationRoomsIndex(persistedIndex);
  if (recoveredIndex.rooms.length > 0) {
    if (!collaborationRoomsIndexEquals(persistedIndex, recoveredIndex)) {
      await writeCollaborationRoomsIndex(recoveredIndex);
    }
    return recoveredIndex;
  }

  const fallbackState = defaultCollaborationRoomState({
    roomId: DEFAULT_COLLABORATION_ROOM_ID,
    title: DEFAULT_COLLABORATION_ROOM_TITLE,
  });
  await writeCollaborationRoomState(fallbackState);
  const fallbackIndex = {
    version: 2 as const,
    roomReadCursors: {},
    rooms: [buildCollaborationRoomSummary(fallbackState)],
  };
  await writeCollaborationRoomsIndex(fallbackIndex);
  return fallbackIndex;
}

async function ensureCollaborationRoomSummary(roomId: string): Promise<CollaborationRoomSummary> {
  const index = await loadCollaborationRoomsIndex();
  const existing = index.rooms.find((item) => item.roomId === roomId);
  if (existing) return existing;

  const recovered = await readCollaborationRoomStateFromDisk(roomId);
  if (recovered) {
    const nextIndex = mergeCollaborationRoomSummary(index, buildCollaborationRoomSummary(recovered));
    await writeCollaborationRoomsIndex(nextIndex);
    return nextIndex.rooms.find((item) => item.roomId === roomId) ?? buildCollaborationRoomSummary(recovered);
  }

  const fallbackState = defaultCollaborationRoomState({
    roomId,
    title: roomId === DEFAULT_COLLABORATION_ROOM_ID ? DEFAULT_COLLABORATION_ROOM_TITLE : "New chat",
  });
  await writeCollaborationRoomState(fallbackState);
  const nextIndex = mergeCollaborationRoomSummary(index, buildCollaborationRoomSummary(fallbackState));
  await writeCollaborationRoomsIndex(nextIndex);
  return nextIndex.rooms.find((item) => item.roomId === roomId) ?? buildCollaborationRoomSummary(fallbackState);
}

async function writeCollaborationRoomsIndex(index: CollaborationRoomsIndexState): Promise<void> {
  await mkdir(COLLABORATION_ROOM_DIR, { recursive: true });
  await writeFile(
    COLLABORATION_ROOMS_INDEX_PATH,
    `${JSON.stringify(normalizeCollaborationRoomsIndex(index), null, 2)}\n`,
    "utf8",
  );
}

async function writeCollaborationRoomState(state: CollaborationRoomState): Promise<void> {
  const normalized = normalizeCollaborationRoom(state, {
    roomId: state.roomId,
    title: state.title,
    createdAt: state.createdAt,
  });
  await mkdir(resolveCollaborationRoomDir(normalized.roomId), { recursive: true });
  await writeFile(resolveCollaborationRoomStatePath(normalized.roomId), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

async function readCollaborationRoomsIndexFile(): Promise<CollaborationRoomsIndexState | undefined> {
  try {
    const raw = await readFile(COLLABORATION_ROOMS_INDEX_PATH, "utf8");
    return normalizeCollaborationRoomsIndex(JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

async function recoverCollaborationRoomsIndex(
  seed: CollaborationRoomsIndexState | undefined,
): Promise<CollaborationRoomsIndexState> {
  let recovered = normalizeCollaborationRoomsIndex(seed ?? { version: 2, rooms: [] });
  const discovered = await discoverCollaborationRoomSummariesFromDisk();
  for (const summary of discovered) {
    recovered = mergeCollaborationRoomSummary(recovered, summary);
  }
  return recovered;
}

async function discoverCollaborationRoomSummariesFromDisk(): Promise<CollaborationRoomSummary[]> {
  try {
    const entries = await readdir(COLLABORATION_ROOMS_DIR, { withFileTypes: true });
    const states = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readCollaborationRoomStateFromDisk(entry.name)),
    );
    return states
      .filter((state): state is CollaborationRoomState => Boolean(state))
      .map((state) => buildCollaborationRoomSummary(state))
      .sort(compareRoomSummaryRecency);
  } catch {
    return [];
  }
}

async function readCollaborationRoomStateFromDisk(
  roomId: string,
  summary?: Pick<CollaborationRoomSummary, "title" | "titleMode" | "projectId" | "createdAt">,
): Promise<CollaborationRoomState | undefined> {
  const normalizedRoomId = normalizeRoomId(roomId);
  if (!normalizedRoomId) return undefined;
  try {
    const raw = await readFile(resolveCollaborationRoomStatePath(normalizedRoomId), "utf8");
    return normalizeCollaborationRoom(JSON.parse(raw) as unknown, {
      roomId: normalizedRoomId,
      title:
        summary?.title ??
        (normalizedRoomId === DEFAULT_COLLABORATION_ROOM_ID ? DEFAULT_COLLABORATION_ROOM_TITLE : "New chat"),
      titleMode: summary?.titleMode,
      projectId: summary?.projectId,
      createdAt: summary?.createdAt,
    });
  } catch {
    return undefined;
  }
}

async function readCollaborationAttachmentFromRoom(
  attachmentId: string,
  roomId: string,
): Promise<{ attachment: CollaborationAttachmentRecord; content: Buffer; roomId: string } | undefined> {
  const normalizedRoomId = normalizeRoomId(roomId) ?? DEFAULT_COLLABORATION_ROOM_ID;
  const state = await loadCollaborationRoom(normalizedRoomId);
  const attachment = state.attachments.find((item) => item.attachmentId === attachmentId);
  if (!attachment) return undefined;

  try {
    const content = await readFile(attachment.storedPath);
    return { attachment, content, roomId: normalizedRoomId };
  } catch {
    return undefined;
  }
}

function mutateCollaborationRoom<T>(
  roomId: string,
  mutator: (state: CollaborationRoomState) => Promise<T> | T,
): Promise<CollaborationRoomMutationResult<T>> {
  const run = async (): Promise<CollaborationRoomMutationResult<T>> => {
    const state = await loadCollaborationRoom(roomId);
    const value = await mutator(state);
    await saveCollaborationRoom(state);
    return { value, state };
  };

  const next = collaborationRoomWriteChain.then(run, run);
  collaborationRoomWriteChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function mutateCollaborationRoomStore<T>(mutator: () => Promise<T> | T): Promise<T> {
  const run = async (): Promise<T> => {
    await ensureCollaborationRoomsReady();
    return await mutator();
  };

  const next = collaborationRoomWriteChain.then(run, run);
  collaborationRoomWriteChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function notifyCollaborationRoomSubscribers(roomId: string): void {
  const normalizedRoomId = normalizeRoomId(roomId);
  if (!normalizedRoomId) {
    return;
  }
  const listeners = roomSubscribers.get(normalizedRoomId);
  if (!listeners || listeners.size === 0) {
    return;
  }
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Ignore subscriber failures so room updates continue propagating.
    }
  }
}
