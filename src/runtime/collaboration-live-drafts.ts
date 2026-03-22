export type CollaborationLiveDraftState = "started" | "delta" | "final" | "error";

export interface CollaborationLiveDraft {
  roomId: string;
  sourceEventId: string;
  agentId: string;
  agentDisplayName?: string;
  runId?: string;
  sessionKey?: string;
  createdAt: string;
  updatedAt: string;
  text?: string;
  state: CollaborationLiveDraftState;
  errorMessage?: string;
}

const liveDrafts = new Map<string, CollaborationLiveDraft>();
const roomSubscribers = new Map<string, Set<() => void>>();

export function upsertCollaborationLiveDraft(input: CollaborationLiveDraft): CollaborationLiveDraft {
  const key = buildCollaborationLiveDraftKey(input);
  const current = liveDrafts.get(key);
  const next: CollaborationLiveDraft = {
    ...current,
    ...input,
    roomId: input.roomId,
    sourceEventId: input.sourceEventId,
    agentId: input.agentId,
    createdAt: current?.createdAt || input.createdAt,
    updatedAt: input.updatedAt,
    text: input.text ?? current?.text,
    state: input.state,
  };
  liveDrafts.set(key, next);
  notifyCollaborationLiveDraftSubscribers(input.roomId);
  return next;
}

export function clearCollaborationLiveDraft(input: {
  roomId: string;
  sourceEventId: string;
  agentId: string;
}): boolean {
  const key = buildCollaborationLiveDraftKey(input);
  const deleted = liveDrafts.delete(key);
  if (deleted) {
    notifyCollaborationLiveDraftSubscribers(input.roomId);
  }
  return deleted;
}

export function listCollaborationLiveDrafts(roomId: string): CollaborationLiveDraft[] {
  const normalizedRoomId = normalizeKey(roomId);
  return [...liveDrafts.values()]
    .filter((draft) => normalizeKey(draft.roomId) === normalizedRoomId)
    .sort((left, right) => {
      const updatedDiff = Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
      if (updatedDiff !== 0) {
        return updatedDiff;
      }
      const createdDiff = Date.parse(left.createdAt) - Date.parse(right.createdAt);
      if (createdDiff !== 0) {
        return createdDiff;
      }
      return buildCollaborationLiveDraftKey(left).localeCompare(buildCollaborationLiveDraftKey(right));
    });
}

export function subscribeCollaborationLiveDrafts(
  roomId: string,
  listener: () => void,
): () => void {
  const normalizedRoomId = normalizeKey(roomId);
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

export function resetCollaborationLiveDraftsForTests(): void {
  liveDrafts.clear();
  roomSubscribers.clear();
}

function buildCollaborationLiveDraftKey(input: {
  roomId: string;
  sourceEventId: string;
  agentId: string;
}): string {
  return [input.roomId, input.sourceEventId, input.agentId]
    .map((value) => normalizeKey(value))
    .join("|");
}

function notifyCollaborationLiveDraftSubscribers(roomId: string): void {
  const listeners = roomSubscribers.get(normalizeKey(roomId));
  if (!listeners || listeners.size === 0) {
    return;
  }
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // Ignore subscriber failures so draft updates keep flowing.
    }
  }
}

function normalizeKey(value: string | undefined): string {
  return String(value || "").trim().toLowerCase();
}
