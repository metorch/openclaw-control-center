import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TaskState } from "../types";

export const UI_PREFERENCES_PATH = join(process.cwd(), "runtime", "ui-preferences.json");
const UI_TASK_CARD_ORDER_MAX_ITEMS = 200;
const UI_TASK_CARD_ID_MAX_LENGTH = 160;

export type UiQuickFilter = "all" | "attention" | TaskState;
export type UiLanguage = "en" | "zh";
export const UI_QUICK_FILTERS: UiQuickFilter[] = [
  "all",
  "attention",
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export interface UiPreferencesTaskFilters {
  status?: TaskState;
  owner?: string;
  project?: string;
}

export interface UiPreferencesCollaborationChat {
  expanded: boolean;
  autoRefresh: boolean;
  // Viewer-scoped collaboration room state.
  // Shared collaboration content still lives in collaboration-room storage,
  // but the selected room and read cursors belong to the current UI viewer.
  activeRoomId: string;
  lastReadSequence: number;
  roomReadCursors: Record<string, number>;
}

export interface UiPreferences {
  language: UiLanguage;
  compactStatusStrip: boolean;
  quickFilter: UiQuickFilter;
  taskFilters: UiPreferencesTaskFilters;
  taskCardOrder: string[];
  localMutationUnlock: boolean;
  collaborationChat: UiPreferencesCollaborationChat;
  updatedAt: string;
}

export interface UiPreferencesLoadResult {
  path: string;
  preferences: UiPreferences;
  issues: string[];
}

export function defaultUiPreferences(now = new Date().toISOString()): UiPreferences {
  return {
    language: "zh",
    compactStatusStrip: true,
    quickFilter: "all",
    taskFilters: {},
    taskCardOrder: [],
    localMutationUnlock: false,
    collaborationChat: {
      expanded: false,
      autoRefresh: true,
      activeRoomId: "global",
      lastReadSequence: 0,
      roomReadCursors: {
        global: 0,
      },
    },
    updatedAt: now,
  };
}

export async function loadUiPreferences(): Promise<UiPreferencesLoadResult> {
  let parsed: unknown;
  let issues: string[] = [];

  try {
    const raw = await readFile(UI_PREFERENCES_PATH, "utf8");
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    const fallback = defaultUiPreferences();
    const reason = error instanceof Error ? error.message : "unable to read preference file";
    issues = [`preferences fallback applied: ${reason}`];
    await writeUiPreferences(fallback);
    return {
      path: UI_PREFERENCES_PATH,
      preferences: fallback,
      issues,
    };
  }

  const normalized = normalizeUiPreferences(parsed);
  if (normalized.issues.length > 0) {
    await writeUiPreferences(normalized.preferences);
  }

  return {
    path: UI_PREFERENCES_PATH,
    preferences: normalized.preferences,
    issues: normalized.issues,
  };
}

export async function saveUiPreferences(preferences: UiPreferences): Promise<UiPreferencesLoadResult> {
  const normalized = normalizeUiPreferences(preferences);
  await writeUiPreferences(normalized.preferences);
  return {
    path: UI_PREFERENCES_PATH,
    preferences: normalized.preferences,
    issues: normalized.issues,
  };
}

export function isUiQuickFilter(input: string): input is UiQuickFilter {
  return UI_QUICK_FILTERS.includes(input as UiQuickFilter);
}

export function isUiLanguage(input: string): input is UiLanguage {
  return input === "en" || input === "zh";
}

function normalizeUiPreferences(input: unknown): { preferences: UiPreferences; issues: string[] } {
  const now = new Date().toISOString();
  const base = defaultUiPreferences(now);
  const issues: string[] = [];

  const obj = asObject(input);
  if (!obj) {
    issues.push("preferences must be a JSON object");
    return { preferences: base, issues };
  }

  let compactStatusStrip = base.compactStatusStrip;
  let language = base.language;

  if (typeof obj.language === "string") {
    const normalizedLanguage = obj.language.trim().toLowerCase();
    if (isUiLanguage(normalizedLanguage)) {
      language = normalizedLanguage;
    } else {
      issues.push("language must be one of: en, zh");
    }
  } else if (obj.language !== undefined) {
    issues.push("language must be a string");
  }

  if (obj.compactStatusStrip !== undefined) {
    if (typeof obj.compactStatusStrip === "boolean") {
      compactStatusStrip = obj.compactStatusStrip;
    } else {
      issues.push("compactStatusStrip must be a boolean");
    }
  }

  let quickFilter = base.quickFilter;
  if (typeof obj.quickFilter === "string") {
    const trimmed = obj.quickFilter.trim();
    if (isUiQuickFilter(trimmed)) {
      quickFilter = trimmed;
    } else {
      issues.push("quickFilter must be one of: all, attention, todo, in_progress, blocked, done");
    }
  } else if (obj.quickFilter !== undefined) {
    issues.push("quickFilter must be a string");
  }

  const taskFilters = normalizeTaskFilters(obj.taskFilters, issues);
  if (taskFilters.status === undefined && isTaskState(quickFilter)) {
    taskFilters.status = quickFilter;
  }
  const taskCardOrder = normalizeTaskCardOrder(obj.taskCardOrder, issues);
  const localMutationUnlock = normalizeLocalMutationUnlock(obj.localMutationUnlock, issues);
  const collaborationChat = normalizeCollaborationChat(obj.collaborationChat, issues);

  let updatedAt = now;
  if (typeof obj.updatedAt === "string" && !Number.isNaN(Date.parse(obj.updatedAt))) {
    updatedAt = new Date(obj.updatedAt).toISOString();
  } else if (obj.updatedAt !== undefined) {
    issues.push("updatedAt must be an ISO-8601 timestamp");
  }

  return {
    preferences: {
      language,
        compactStatusStrip,
        quickFilter,
        taskFilters,
        taskCardOrder,
        localMutationUnlock,
        collaborationChat,
        updatedAt,
      },
    issues,
  };
}

function normalizeTaskFilters(
  input: unknown,
  issues: string[],
): UiPreferencesTaskFilters {
  const out: UiPreferencesTaskFilters = {};

  if (input === undefined) return out;
  const obj = asObject(input);
  if (!obj) {
    issues.push("taskFilters must be an object");
    return out;
  }

  if (typeof obj.status === "string") {
    const status = obj.status.trim();
    if (!status) {
      out.status = undefined;
    } else if (isTaskState(status)) {
      out.status = status;
    } else {
      issues.push("taskFilters.status must be one of: todo, in_progress, blocked, done");
    }
  } else if (obj.status !== undefined) {
    issues.push("taskFilters.status must be a string");
  }

  const owner = normalizeOptionalString(obj.owner, "taskFilters.owner", 80, issues);
  if (owner) out.owner = owner;

  const project = normalizeOptionalString(obj.project, "taskFilters.project", 120, issues);
  if (project) out.project = project;

  return out;
}

function normalizeCollaborationChat(
  input: unknown,
  issues: string[],
): UiPreferencesCollaborationChat {
  const base = defaultUiPreferences().collaborationChat;
  if (input === undefined) return base;

  const obj = asObject(input);
  if (!obj) {
    issues.push("collaborationChat must be an object");
    return base;
  }

  let expanded = base.expanded;
  if (obj.expanded !== undefined) {
    if (typeof obj.expanded === "boolean") {
      expanded = obj.expanded;
    } else {
      issues.push("collaborationChat.expanded must be a boolean");
    }
  }

  let autoRefresh = base.autoRefresh;
  if (obj.autoRefresh !== undefined) {
    if (typeof obj.autoRefresh === "boolean") {
      autoRefresh = obj.autoRefresh;
    } else {
      issues.push("collaborationChat.autoRefresh must be a boolean");
    }
  }

  let activeRoomId = base.activeRoomId;
  if (obj.activeRoomId !== undefined) {
    if (typeof obj.activeRoomId === "string" && obj.activeRoomId.trim() !== "") {
      activeRoomId = obj.activeRoomId.trim().slice(0, 120);
    } else {
      issues.push("collaborationChat.activeRoomId must be a non-empty string");
    }
  }

  let lastReadSequence = base.lastReadSequence;
  if (obj.lastReadSequence !== undefined) {
    if (typeof obj.lastReadSequence === "number" && Number.isInteger(obj.lastReadSequence) && obj.lastReadSequence >= 0) {
      lastReadSequence = obj.lastReadSequence;
    } else {
      issues.push("collaborationChat.lastReadSequence must be a non-negative integer");
    }
  }

  const roomReadCursors = normalizeRoomReadCursors(obj.roomReadCursors, issues, activeRoomId, lastReadSequence);
  if (!(activeRoomId in roomReadCursors)) {
    roomReadCursors[activeRoomId] = lastReadSequence;
  }

  return {
    expanded,
    autoRefresh,
    activeRoomId,
    lastReadSequence,
    roomReadCursors,
  };
}

function normalizeRoomReadCursors(
  input: unknown,
  issues: string[],
  activeRoomId: string,
  lastReadSequence: number,
): Record<string, number> {
  const out: Record<string, number> = {
    [activeRoomId]: lastReadSequence,
  };
  if (input === undefined) return out;
  const obj = asObject(input);
  if (!obj) {
    issues.push("collaborationChat.roomReadCursors must be an object");
    return out;
  }

  for (const [key, value] of Object.entries(obj)) {
    const roomId = key.trim();
    if (!roomId) continue;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      issues.push(`collaborationChat.roomReadCursors.${roomId} must be a non-negative integer`);
      continue;
    }
    out[roomId.slice(0, 120)] = value;
  }

  return out;
}

function normalizeTaskCardOrder(input: unknown, issues: string[]): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    issues.push("taskCardOrder must be an array");
    return [];
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of input.entries()) {
    if (typeof entry !== "string") {
      issues.push(`taskCardOrder[${index}] must be a string`);
      continue;
    }

    const trimmed = entry.trim();
    if (!trimmed) continue;
    if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
      issues.push(`taskCardOrder[${index}] contains control characters`);
      continue;
    }
    if (trimmed.length > UI_TASK_CARD_ID_MAX_LENGTH) {
      issues.push(`taskCardOrder[${index}] must be <= ${UI_TASK_CARD_ID_MAX_LENGTH} characters`);
      continue;
    }
    if (seen.has(trimmed)) continue;

    out.push(trimmed);
    seen.add(trimmed);
    if (out.length >= UI_TASK_CARD_ORDER_MAX_ITEMS) {
      issues.push(`taskCardOrder must contain <= ${UI_TASK_CARD_ORDER_MAX_ITEMS} items`);
      break;
    }
  }

  return out;
}

function normalizeLocalMutationUnlock(input: unknown, issues: string[]): boolean {
  const defaults = defaultUiPreferences().localMutationUnlock;
  if (input === undefined) return defaults;
  if (typeof input !== "boolean") {
    issues.push("localMutationUnlock must be a boolean");
    return defaults;
  }
  return input;
}

function normalizeOptionalString(
  input: unknown,
  label: string,
  maxLength: number,
  issues: string[],
): string | undefined {
  if (input === undefined) return undefined;
  if (typeof input !== "string") {
    issues.push(`${label} must be a string`);
    return undefined;
  }

  const trimmed = input.trim();
  if (!trimmed) return undefined;

  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    issues.push(`${label} contains control characters`);
    return undefined;
  }

  if (trimmed.length > maxLength) {
    issues.push(`${label} must be <= ${maxLength} characters`);
    return undefined;
  }

  return trimmed;
}

function isTaskState(input: string): input is TaskState {
  return input === "todo" || input === "in_progress" || input === "blocked" || input === "done";
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

async function writeUiPreferences(preferences: UiPreferences): Promise<void> {
  await mkdir(join(process.cwd(), "runtime"), { recursive: true });
  await writeFile(UI_PREFERENCES_PATH, `${JSON.stringify(preferences, null, 2)}\n`, "utf8");
}
