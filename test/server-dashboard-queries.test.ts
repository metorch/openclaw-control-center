import assert from "node:assert/strict";
import test from "node:test";
import { defaultUiPreferences } from "../src/runtime/ui-preferences";
import { createDashboardQueryHelpers } from "../src/ui/server-dashboard-queries";

class TestValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "TestValidationError";
    this.statusCode = statusCode;
  }
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

const helpers = createDashboardQueryHelpers({
  RequestValidationError: TestValidationError,
  assertAllowedQueryParams: () => {},
  asObject,
  badge: () => "",
  commanderExceptionsFeed: () => ({ items: [] }),
  dashboardSearchScopes: ["tasks", "projects", "sessions", "alerts"],
  dashboardSections: ["overview", "team", "collaboration"],
  escapeHtml: (value: string) => value,
  hasAnyQueryKey: () => false,
  isUiLanguage: (value: string) => value === "en" || value === "zh",
  isUiQuickFilter: (value: string) =>
    ["all", "attention", "todo", "in_progress", "blocked", "done"].includes(value),
  legacyDashboardRouteAnchor: {},
  legacyDashboardRouteSection: {},
  listTasks: () => [],
  matchesQuickFilter: () => true,
  normalizeOptionalPatchString: (value: unknown) => {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).trim();
    return normalized || undefined;
  },
  normalizeQueryString: (value: string | null | undefined) => {
    const normalized = String(value ?? "").trim();
    return normalized || undefined;
  },
  normalizeTaskCardOrderPatch: () => [],
  normalizeCollaborationRoomId: (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || undefined,
  pickUiText: (_language: string, english: string) => english,
  projectStates: ["planned", "active", "blocked", "done"],
  projectTitleMap: () => new Map(),
  readPositiveIntQuery: (_value: string | null | undefined, _label: string, fallback: number) => fallback,
  searchLimitMax: 20,
  searchScopeLabel: (scope: string) => scope,
  sessionStates: ["idle", "running", "blocked", "waiting_approval", "error"],
  taskStates: ["todo", "in_progress", "blocked", "done"],
});

test("mergeUiPreferencesPatch keeps canonical collaboration room ids for local-only rooms", () => {
  const merged = helpers.mergeUiPreferencesPatch(defaultUiPreferences(), {
    collaborationChat: {
      activeRoomId: "room_local.demo",
      lastReadSequence: 7,
      roomReadCursors: {
        "room_local.demo": 7,
        "secondary-room": 3,
      },
    },
  });

  assert.equal(merged.collaborationChat.activeRoomId, "room_local.demo");
  assert.deepEqual(merged.collaborationChat.roomReadCursors, {
    "room_local.demo": 7,
    "secondary-room": 3,
  });
});
