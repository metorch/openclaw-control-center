import assert from "node:assert/strict";
import test from "node:test";
import { createCollaborationRoomHelpers } from "../src/ui/server-collaboration-room";
import {
  buildMentionAliases,
  defaultCollaborationRoomState,
  preferredMentionAlias,
  resolveCollaborationDispatchTargets,
  sanitizeUploadFileName,
} from "../src/runtime/collaboration-room";

function createRoomHelpersForSmoke() {
  return createCollaborationRoomHelpers({
    buildCollaborationRoomApiEvent: () => ({}),
    buildSessionDetailHref: () => "",
    createRequestValidationError: (message: string) => new Error(message),
    deriveAgentAnimalIdentity: () => ({ accent: "#0f766e", imageHref: "" }),
    getOpenClawHomeDir: () => "",
    getSearchLimitMax: () => 20,
    getOpenClawWorkspaceRoot: () => "",
    humanizeOperatorLabel: (value: string) => value,
    loadCachedStaffRecentActivity: async () => new Map(),
    normalizeAgentIdCandidate: (value: string) => {
      const trimmed = String(value ?? "").trim().toLowerCase();
      return trimmed ? trimmed : undefined;
    },
    normalizeSessionHistoryMessages: () => [],
    normalizeLookupKey: (value: string) => String(value ?? "").trim().toLowerCase(),
    pickLatestSessionActivityTimestamp: (...values: Array<string | undefined>) => values.find(Boolean),
    pickUiText: (_language: string, english: string) => english,
    resolveConfiguredWorkspaceRoot: () => "",
    resolveStaffStatusDotTone: () => "idle",
    safeTruncate: (value: string, max = Number.MAX_SAFE_INTEGER) => String(value ?? "").slice(0, max),
    staffCurrentWorkLabel: () => ({ label: "Current task", value: "Idle" }),
    staffStatusDotLabel: () => "Idle",
    toSortableMs: (value: string) => {
      const parsed = Date.parse(value ?? "");
      return Number.isNaN(parsed) ? 0 : parsed;
    },
  });
}

test("collaboration routing defaults to primary and only targets explicit @ mentions", () => {
  const participants = [
    {
      agentId: "jarvis",
      displayName: "Jarvis",
      aliases: buildMentionAliases("jarvis", "Jarvis"),
    },
    {
      agentId: "alice",
      displayName: "Alice",
      aliases: buildMentionAliases("alice", "Alice"),
    },
    {
      agentId: "bob",
      displayName: "Bob",
      aliases: buildMentionAliases("bob", "Bob"),
    },
  ];

  assert.deepEqual(
    resolveCollaborationDispatchTargets({
      message: "Please summarize the latest docs update.",
      participants,
      primaryAgentId: "jarvis",
    }),
    ["jarvis"],
  );

  assert.deepEqual(
    resolveCollaborationDispatchTargets({
      message: "@Alice please work with @bob on this task.",
      participants,
      primaryAgentId: "jarvis",
    }),
    ["alice", "bob"],
  );

  assert.deepEqual(
    resolveCollaborationDispatchTargets({
      message: "@Jarvis can you take this one?",
      participants,
      primaryAgentId: "jarvis",
    }),
    ["jarvis"],
  );
});

test("collaboration attachment filenames are sanitized for storage", () => {
  assert.equal(sanitizeUploadFileName(" ..\\Quarterly Report?.md "), "Quarterly Report-.md");
  assert.equal(sanitizeUploadFileName("notes/../../team:sync.txt"), "team-sync.txt");
  assert.equal(sanitizeUploadFileName(""), "");
});

test("primary controller prefers user-facing mention alias while preserving raw id", () => {
  const aliases = buildMentionAliases("main", "Jarvis");
  assert.equal(aliases[0], "jarvis");
  assert(aliases.includes("main"));
  assert.equal(preferredMentionAlias("main", "Jarvis", aliases), "jarvis");
});

test("collaboration room state keeps project binding and empty collaboration receipts by default", () => {
  const state = defaultCollaborationRoomState({
    roomId: "room-alpha",
    title: "Alpha room",
    titleMode: "manual",
    projectId: "proj-alpha",
    now: "2026-03-18T09:00:00.000Z",
  });

  assert.equal(state.roomId, "room-alpha");
  assert.equal(state.title, "Alpha room");
  assert.equal(state.titleMode, "manual");
  assert.equal(state.projectId, "proj-alpha");
  assert.deepEqual(state.dispatchRecords, []);
  assert.deepEqual(state.taskReceipts, []);
});

test("participant display text collapses raw relay prompts into short user-facing text", () => {
  const helpers = createRoomHelpersForSmoke();

  const text = helpers.sanitizeCollaborationDisplayText(
    "You are Jarvis in the OpenClaw collaboration room.\nPrimary controller: Jarvis (main).\nCurrent user message:\n请帮我检查一下报错\n\nAttachments:\n- none\nReply to the user as this agent.",
    "en",
  );

  assert.equal(text, "请帮我检查一下报错");
});
