import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  resetCollaborationLiveDraftsForTests,
  upsertCollaborationLiveDraft,
} from "../src/runtime/collaboration-live-drafts";
import { createCollaborationRoomHelpers } from "../src/ui/server-collaboration-room";
import {
  buildMentionAliases,
  defaultCollaborationRoomState,
  preferredMentionAlias,
  resolveCollaborationDispatchTargets,
  sanitizeUploadFileName,
} from "../src/runtime/collaboration-room";

const execFileAsync = promisify(execFile);
const collaborationRoomModuleHref = pathToFileURL(
  join(process.cwd(), "src", "runtime", "collaboration-room.ts"),
).href;
const serverCollaborationRoomModuleHref = pathToFileURL(
  join(process.cwd(), "src", "ui", "server-collaboration-room.ts"),
).href;
const openclawChatRoomsModuleHref = pathToFileURL(
  join(process.cwd(), "src", "runtime", "openclaw-chat-rooms.ts"),
).href;
const tsxLoaderHref = pathToFileURL(join(process.cwd(), "node_modules", "tsx", "dist", "loader.mjs")).href;

function createRoomHelpersForSmoke(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  });
}

async function runCollaborationRoomModuleForTest(tempRoot: string, source: string): Promise<string> {
  const result = await execFileAsync(
    "node",
    ["--input-type=module", "--import", tsxLoaderHref, "-e", source],
    {
      cwd: tempRoot,
      env: process.env,
    },
  );
  return result.stdout.trim();
}

test("collaboration routing defaults to the primary controller and still honors explicit @ mentions", () => {
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

  assert.deepEqual(
    resolveCollaborationDispatchTargets({
      message: "@Alice, please sync with @bob.",
      participants,
      primaryAgentId: "jarvis",
    }),
    ["alice", "bob"],
  );

  assert.deepEqual(
    resolveCollaborationDispatchTargets({
      message: "Please @Alice sync with @bob on this task.",
      participants,
      primaryAgentId: "jarvis",
    }),
    ["alice", "bob"],
  );
});

test("instructional @ mentions in user prompts no longer bypass the primary controller", () => {
  const participants = [
    {
      agentId: "jarvis",
      displayName: "Jarvis",
      aliases: buildMentionAliases("jarvis", "Jarvis"),
    },
    {
      agentId: "qa",
      displayName: "QA",
      aliases: buildMentionAliases("qa", "QA"),
    },
    {
      agentId: "architect",
      displayName: "Architect",
      aliases: buildMentionAliases("architect", "Architect"),
    },
  ];

  assert.deepEqual(
    resolveCollaborationDispatchTargets({
      message: [
        "Jarvis, please run a coordination test.",
        "Line 1: Received.",
        "Line 2: @qa reply with 1 only.",
      ].join("\n"),
      participants,
      primaryAgentId: "jarvis",
    }),
    ["jarvis"],
  );

  assert.deepEqual(
    resolveCollaborationDispatchTargets({
      message: "Please reply with exactly this example: @architect please draft the plan.",
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

test("visible collaboration messages preserve line breaks after hidden payload cleanup", () => {
  const helpers = createRoomHelpersForSmoke();
  const message = [
    "[[reply_to_current]] First line.",
    "",
    "Second line.",
    "",
    '<stage_result resultState="awaiting_review">',
    "  <summary>Checkpoint ready.</summary>",
    "</stage_result>",
  ].join("\n");

  assert.equal(
    helpers.sanitizeCollaborationDisplayText(message, "en", "", 1200, true),
    "First line.\nSecond line.",
  );

  const transcriptReply = helpers.buildCollaborationTranscriptBackfillEvent({
    sequence: 1,
    language: "en",
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    message: {
      role: "assistant",
      kind: "message",
      timestamp: "2026-03-23T09:00:00.000Z",
      sourceSessionKey: "agent:main:thread:collab-room-multiline",
      content: message,
    },
  });

  assert.equal(transcriptReply?.message, "First line.\nSecond line.");
  assert.match(String(transcriptReply?.messageHtml || ""), /First line\.<br \/>Second line\./);
});

test("participant display text collapses raw relay prompts into short user-facing text", () => {
  const helpers = createRoomHelpersForSmoke();

  const text = helpers.sanitizeCollaborationDisplayText(
    "You are Jarvis in the OpenClaw collaboration room.\nPrimary controller: Jarvis (main).\nCurrent user message:\n请帮我检查一下报错\n\nAttachments:\n- none\nReply to the user as this agent.",
    "en",
  );

  assert.equal(text, "请帮我检查一下报错");
});
test("display sanitizer hides reply control tokens and stage_result payloads", () => {
  const helpers = createRoomHelpersForSmoke();

  const text = helpers.sanitizeCollaborationDisplayText(
    [
      "[[reply_to_current]] HTML 已生成，可以直接打开。",
      "",
      '<stage_result resultState="awaiting_review">',
      "  <summary>HTML 已生成。</summary>",
      '  <artifact path="C:/workspace/demo/weather.html" />',
      "</stage_result>",
    ].join("\n"),
    "zh",
  );

  assert.equal(text, "HTML 已生成，可以直接打开。");
});

test("agent reply descriptions prefer explicit detail over raw reply payloads", () => {
  const helpers = createRoomHelpersForSmoke();

  const described = helpers.describeCollaborationRoomEvent(
    {
      type: "agent_reply",
      agentId: "jarvis",
      message: [
        "[[reply_to_current]] Weather page is ready.",
        "",
        '<stage_result resultState="awaiting_review">',
        "  <summary>Weather page generated.</summary>",
        '  <artifact path="C:/workspace/demo/weather.html" />',
        "</stage_result>",
      ].join("\n"),
      detail: "Jarvis replied in 4s and attached 1 file: weather.html.",
      attachmentIds: ["att-weather"],
    },
    "en",
    undefined,
    new Map(),
  );

  assert.equal(described.detail, "Jarvis replied in 4s and attached 1 file: weather.html.");
});

test("agent reply descriptions no longer echo hidden control payloads when no explicit detail exists", () => {
  const helpers = createRoomHelpersForSmoke();

  const described = helpers.describeCollaborationRoomEvent(
    {
      type: "agent_reply",
      agentId: "jarvis",
      message: [
        "[[reply_to_current]] Weather page is ready.",
        "",
        '<stage_result resultState="awaiting_review">',
        "  <summary>Weather page generated.</summary>",
        '  <artifact path="C:/workspace/demo/weather.html" />',
        "</stage_result>",
      ].join("\n"),
    },
    "en",
    undefined,
    new Map(),
  );

  assert.equal(described.detail, "Agent reply captured.");
});

test("room stream signature changes when visible timeline or participant state changes", () => {
  const helpers = createRoomHelpersForSmoke();
  const baseRoomView = {
    roomId: "room-stream",
    updatedAt: "2026-03-23T01:00:00.000Z",
    lastSequence: 4,
    returnedCount: 4,
    project: {
      projectId: "proj-stream",
      summary: "Waiting for worker confirmation.",
      openTaskCount: 2,
    },
    rooms: [
      {
        roomId: "room-stream",
        updatedAt: "2026-03-23T01:00:00.000Z",
        lastSequence: 4,
        active: true,
      },
    ],
    participants: [
      {
        agentId: "main",
        executionState: "in_progress",
        lastHeartbeatAt: "2026-03-23T01:00:00.000Z",
        currentTaskId: "task-main",
        recentOutput: "Waiting for Architect.",
      },
      {
        agentId: "architect",
        executionState: "in_progress",
        lastHeartbeatAt: "2026-03-23T01:00:01.000Z",
        currentTaskId: "task-architect",
        recentOutput: "1",
      },
    ],
    events: [
      {
        sequence: 3,
        eventId: "evt-3",
        type: "agent_reply",
        agentId: "main",
        createdAt: "2026-03-23T01:00:00.000Z",
        message: "@architect reply with 1",
      },
      {
        sequence: 4,
        eventId: "evt-4",
        type: "agent_reply",
        agentId: "architect",
        createdAt: "2026-03-23T01:00:01.000Z",
        message: "1",
      },
    ],
  };

  const baseSignature = helpers.buildCollaborationRoomStreamSignature(baseRoomView);
  const sameSignature = helpers.buildCollaborationRoomStreamSignature({
    ...baseRoomView,
    rooms: [...baseRoomView.rooms],
    participants: baseRoomView.participants.map((participant) => ({ ...participant })),
    events: baseRoomView.events.map((event) => ({ ...event })),
  });
  const changedEventSignature = helpers.buildCollaborationRoomStreamSignature({
    ...baseRoomView,
    lastSequence: 5,
    updatedAt: "2026-03-23T01:00:02.000Z",
    events: [
      ...baseRoomView.events,
      {
        sequence: 5,
        eventId: "evt-5",
        type: "agent_reply",
        agentId: "main",
        createdAt: "2026-03-23T01:00:02.000Z",
        message: "Architect replied with 1. Summary complete.",
      },
    ],
  });
  const changedParticipantSignature = helpers.buildCollaborationRoomStreamSignature({
    ...baseRoomView,
    participants: [
      {
        ...baseRoomView.participants[0],
        recentOutput: "Architect replied with 1. Summary complete.",
      },
      baseRoomView.participants[1],
    ],
  });

  assert.equal(baseSignature, sameSignature);
  assert.notEqual(baseSignature, changedEventSignature);
  assert.notEqual(baseSignature, changedParticipantSignature);
});

test("live draft events project upstream stream text into the shared room timeline", () => {
  resetCollaborationLiveDraftsForTests();
  try {
    const helpers = createRoomHelpersForSmoke();
    upsertCollaborationLiveDraft({
      roomId: "room-live",
      sourceEventId: "evt-user-1",
      agentId: "qa",
      agentDisplayName: "QA",
      runId: "run-qa-1",
      sessionKey: "agent:qa:thread:collab-room-live",
      createdAt: "2026-03-23T08:00:00.000Z",
      updatedAt: "2026-03-23T08:00:03.000Z",
      text: "QA is checking the shared deck now.",
      state: "delta",
    });

    const projected = helpers.buildCollaborationLiveDraftEvents({
      roomId: "room-live",
      directory: {
        entries: [
          {
            agentId: "qa",
            displayName: "QA",
            aliases: buildMentionAliases("qa", "QA"),
          },
        ],
      },
      language: "en",
      visibleTimeline: [
        {
          sequence: 4,
          eventId: "evt-user-1",
          type: "user_message",
          createdAt: "2026-03-23T08:00:00.000Z",
          authorRole: "user",
          message: "Please verify the slides.",
        },
      ],
      baseSequence: 4,
    });

    assert.equal(projected.length, 1);
    assert.equal(projected[0]?.sequence, 5);
    assert.equal(projected[0]?.agentId, "qa");
    assert.equal(projected[0]?.message, "QA is checking the shared deck now.");
    assert.equal(projected[0]?.pending, true);
    assert.equal(projected[0]?.liveDraft, true);
    assert.equal(projected[0]?.relatedSessionKey, "agent:qa:thread:collab-room-live");
  } finally {
    resetCollaborationLiveDraftsForTests();
  }
});

test("live draft events deduplicate against the later canonical local reply from the same employee", () => {
  resetCollaborationLiveDraftsForTests();
  try {
    const helpers = createRoomHelpersForSmoke();
    upsertCollaborationLiveDraft({
      roomId: "room-live-dedupe",
      sourceEventId: "evt-user-1",
      agentId: "jarvis",
      agentDisplayName: "Jarvis",
      runId: "run-jarvis-1",
      sessionKey: "agent:jarvis:thread:collab-room-live-dedupe",
      createdAt: "2026-03-23T08:05:00.000Z",
      updatedAt: "2026-03-23T08:05:02.000Z",
      text: "Team summary is ready.",
      state: "final",
    });

    const projected = helpers.buildCollaborationLiveDraftEvents({
      roomId: "room-live-dedupe",
      directory: {
        entries: [
          {
            agentId: "jarvis",
            displayName: "Jarvis",
            aliases: buildMentionAliases("jarvis", "Jarvis"),
          },
        ],
      },
      language: "en",
      visibleTimeline: [
        {
          sequence: 7,
          eventId: "evt-local-jarvis",
          type: "agent_reply",
          createdAt: "2026-03-23T08:05:08.000Z",
          authorRole: "agent",
          agentId: "jarvis",
          agentDisplayName: "Jarvis",
          message: "Team summary is ready.",
          detail: "Jarvis replied",
          targetAgentIds: [],
          targetDisplayNames: [],
          attachmentIds: [],
          attachments: [],
        },
      ],
      baseSequence: 7,
    });

    assert.deepEqual(projected, []);
  } finally {
    resetCollaborationLiveDraftsForTests();
  }
});

test("room query falls back to the active transcript room when the requested room no longer exists", async () => {
  const openclawHome = await mkdtemp(join(tmpdir(), "collab-room-selection-"));
  const workspaceRoot = join(openclawHome, "workspace");
  const sessionsDir = join(openclawHome, "agents", "main", "sessions");
  const staleRoomId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const activeRoomId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const secondaryRoomId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  const writeTranscript = async (roomId: string, text: string, timestamp: string) => {
    await writeFile(
      join(sessionsDir, `${roomId}.jsonl`),
      [
        JSON.stringify({
          type: "session",
          version: 3,
          id: roomId,
          timestamp,
          cwd: workspaceRoot,
        }),
        JSON.stringify({
          type: "message",
          timestamp,
          message: {
            role: "user",
            content: [{ type: "text", text }],
            timestamp,
          },
        }),
      ].join("\n"),
      "utf8",
    );
  };

  try {
    await mkdir(sessionsDir, { recursive: true });
    await writeTranscript(activeRoomId, "Keep this room active", "2026-03-19T10:00:00.000Z");
    await writeTranscript(secondaryRoomId, "Secondary room", "2026-03-19T09:00:00.000Z");
    await writeFile(
      join(sessionsDir, "sessions.json"),
      `${JSON.stringify(
        {
          "agent:main:main": {
            updatedAt: Date.now(),
            sessionFile: join(sessionsDir, `${activeRoomId}.jsonl`),
            chatType: "direct",
            lastChannel: "webchat",
            origin: {
              provider: "webchat",
              surface: "webchat",
              chatType: "direct",
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const helpers = createRoomHelpersForSmoke({
      getOpenClawHomeDir: () => openclawHome,
      getOpenClawWorkspaceRoot: () => workspaceRoot,
    });
    const directory = { primaryAgentId: "main" };

    assert.equal(await helpers.normalizeCollaborationRoomIdQuery(staleRoomId, directory), activeRoomId);
    assert.equal(await helpers.normalizeCollaborationRoomIdQuery(undefined, directory), activeRoomId);
  } finally {
    await rm(openclawHome, { recursive: true, force: true });
  }
});

test("room query ignores legacy shared local active room state and keeps room activation viewer-scoped", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-room-local-active-"));

  try {
    const output = await runCollaborationRoomModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const roomHelpersMod = unwrap(await import(${JSON.stringify(serverCollaborationRoomModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const { mkdir, writeFile } = await import("node:fs/promises");
        const { join } = await import("node:path");

        const helpers = roomHelpersMod.createCollaborationRoomHelpers({
          buildCollaborationRoomApiEvent: () => ({}),
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message) => new Error(message),
          deriveAgentAnimalIdentity: () => ({ accent: "#0f766e", imageHref: "" }),
          getOpenClawHomeDir: () => process.cwd(),
          getSearchLimitMax: () => 20,
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          humanizeOperatorLabel: (value) => value,
          loadCachedStaffRecentActivity: async () => new Map(),
          normalizeAgentIdCandidate: (value) => {
            const trimmed = String(value ?? "").trim().toLowerCase();
            return trimmed ? trimmed : undefined;
          },
          normalizeSessionHistoryMessages: () => [],
          normalizeLookupKey: (value) => String(value ?? "").trim().toLowerCase(),
          pickLatestSessionActivityTimestamp: (...values) => values.find(Boolean),
          pickUiText: (_language, english) => english,
          resolveConfiguredWorkspaceRoot: () => "",
          resolveStaffStatusDotTone: () => "idle",
          safeTruncate: (value, max = Number.MAX_SAFE_INTEGER) => String(value ?? "").slice(0, max),
          staffCurrentWorkLabel: () => ({ label: "Current task", value: "Idle" }),
          staffStatusDotLabel: () => "Idle",
          toSortableMs: (value) => {
            const parsed = Date.parse(value ?? "");
            return Number.isNaN(parsed) ? 0 : parsed;
          },
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const sessionsDir = join(process.cwd(), "agents", "main", "sessions");
        const transcriptRoomId = "44444444-4444-4444-8444-444444444444";
        const localActiveRoomId = "55555555-5555-4555-8555-555555555555";
        await collaborationRoom.createCollaborationRoom({
          roomId: transcriptRoomId,
          title: "Transcript-backed room",
          titleMode: "manual",
          projectId: "proj-transcript",
        });
        await collaborationRoom.createCollaborationRoom({
          roomId: localActiveRoomId,
          title: "Canonical active room",
          titleMode: "manual",
          projectId: "proj-local-active",
        });
        await collaborationRoom.setActiveCollaborationRoomId(localActiveRoomId);
        await mkdir(sessionsDir, { recursive: true });
        await writeFile(
          join(sessionsDir, transcriptRoomId + ".jsonl"),
          [
            JSON.stringify({
              type: "session",
              version: 3,
              id: transcriptRoomId,
              timestamp: "2026-03-22T03:00:00.000Z",
              cwd: workspaceRoot,
            }),
            JSON.stringify({
              type: "message",
              timestamp: "2026-03-22T03:00:01.000Z",
              message: {
                role: "user",
                content: [{ type: "text", text: "Transcript-backed history" }],
                timestamp: "2026-03-22T03:00:01.000Z",
              },
            }),
          ].join("\\n"),
          "utf8",
        );
        await writeFile(
          join(sessionsDir, "sessions.json"),
          JSON.stringify(
            {
              "agent:main:main": {
                updatedAt: Date.now(),
                sessionFile: join(sessionsDir, transcriptRoomId + ".jsonl"),
                chatType: "direct",
                lastChannel: "webchat",
                origin: {
                  provider: "webchat",
                  surface: "webchat",
                  chatType: "direct",
                },
              },
            },
            null,
            2,
          ) + "\\n",
          "utf8",
        );

        const directory = {
          primaryAgentId: "main",
          primaryDisplayName: "Jarvis",
          entries: [{ agentId: "main", displayName: "Jarvis", aliases: ["main", "jarvis"], primary: true }],
        };
        const selectedRoomId = await helpers.normalizeCollaborationRoomIdQuery(undefined, directory);
        const rooms = await helpers.listCollaborationTranscriptRooms(directory);
        process.stdout.write(JSON.stringify({
          selectedRoomId,
          activeFlags: rooms.map((room) => ({ roomId: room.roomId, active: room.active })),
        }));
      `,
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.selectedRoomId, "44444444-4444-4444-8444-444444444444");
    assert.equal(
      parsed.activeFlags.find((room: { roomId: string; active: boolean }) => room.roomId === "55555555-5555-4555-8555-555555555555")?.active,
      false,
    );
    assert.equal(
      parsed.activeFlags.find((room: { roomId: string; active: boolean }) => room.roomId === "44444444-4444-4444-8444-444444444444")?.active,
      false,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("collaboration room unread counts follow the caller read cursor instead of persisting shared read state", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-room-read-cursor-"));

  try {
    const output = await runCollaborationRoomModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const roomHelpersMod = unwrap(await import(${JSON.stringify(serverCollaborationRoomModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const { join } = await import("node:path");

        const helpers = roomHelpersMod.createCollaborationRoomHelpers({
          buildCollaborationRoomApiEvent: (event) => ({
            ...event,
            label: event.type,
            detail: event.detail || event.message || "",
            targetDisplayNames: [],
            fallbackDisplayName: undefined,
            attachments: [],
            messageHtml: undefined,
            detailHtml: undefined,
            relatedSessionHref: undefined,
            syncControlMessage: false,
          }),
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message) => new Error(message),
          deriveAgentAnimalIdentity: () => ({ accent: "#0f766e", imageHref: "" }),
          getOpenClawHomeDir: () => process.cwd(),
          getSearchLimitMax: () => 20,
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          humanizeOperatorLabel: (value) => value,
          loadCachedStaffRecentActivity: async () => new Map(),
          normalizeAgentIdCandidate: (value) => {
            const trimmed = String(value ?? "").trim().toLowerCase();
            return trimmed ? trimmed : undefined;
          },
          normalizeSessionHistoryMessages: () => [],
          normalizeLookupKey: (value) => String(value ?? "").trim().toLowerCase(),
          pickLatestSessionActivityTimestamp: (...values) => values.find(Boolean),
          pickUiText: (_language, english) => english,
          resolveConfiguredWorkspaceRoot: () => "",
          resolveStaffStatusDotTone: () => "idle",
          safeTruncate: (value, max = Number.MAX_SAFE_INTEGER) => String(value ?? "").slice(0, max),
          staffCurrentWorkLabel: () => ({ label: "Current task", value: "Idle" }),
          staffStatusDotLabel: () => "Idle",
          toSortableMs: (value) => {
            const parsed = Date.parse(value ?? "");
            return Number.isNaN(parsed) ? 0 : parsed;
          },
        });

        const room = await collaborationRoom.createCollaborationRoom({
          roomId: "room-read-cursor",
          title: "Read cursor room",
          titleMode: "manual",
          projectId: "proj-read-cursor",
        });
        await collaborationRoom.appendCollaborationRoomEvents(room.roomId, [
          {
            eventId: "evt-1",
            type: "user_message",
            authorRole: "user",
            message: "First collaboration update.",
          },
          {
            eventId: "evt-2",
            type: "user_message",
            authorRole: "user",
            message: "Second collaboration update.",
          },
        ]);
        await collaborationRoom.setCollaborationRoomReadCursor(room.roomId, 1);
        const directory = {
          primaryAgentId: "main",
          primaryDisplayName: "Jarvis",
          entries: [
            {
              agentId: "main",
              displayName: "Jarvis",
              aliases: ["main", "jarvis"],
              primary: true,
              identity: { accent: "#0f766e", imageHref: "" },
            },
          ],
        };
        const staleClientView = await helpers.buildCollaborationRoomApiView({
          roomId: room.roomId,
          language: "en",
          afterSequence: 0,
          limit: 20,
          readSequence: 0,
          directory,
          primaryAgentId: directory.primaryAgentId,
          primaryDisplayName: directory.primaryDisplayName,
        });
        const advancedView = await helpers.buildCollaborationRoomApiView({
          roomId: room.roomId,
          language: "en",
          afterSequence: 0,
          limit: 20,
          readSequence: 2,
          directory,
          primaryAgentId: directory.primaryAgentId,
          primaryDisplayName: directory.primaryDisplayName,
        });
        const storedCursor = await collaborationRoom.loadCollaborationRoomReadCursor(room.roomId);
        const repeatedStaleView = await helpers.buildCollaborationRoomApiView({
          roomId: room.roomId,
          language: "en",
          afterSequence: 0,
          limit: 20,
          readSequence: 0,
          directory,
          primaryAgentId: directory.primaryAgentId,
          primaryDisplayName: directory.primaryDisplayName,
        });
        process.stdout.write(JSON.stringify({
          staleClientReadSequence: staleClientView.readSequence,
          staleClientUnreadCount: staleClientView.unreadCount,
          advancedReadSequence: advancedView.readSequence,
          advancedUnreadCount: advancedView.unreadCount,
          storedCursor,
          repeatedStaleReadSequence: repeatedStaleView.readSequence,
          repeatedStaleUnreadCount: repeatedStaleView.unreadCount,
        }));
      `,
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.staleClientReadSequence, 0);
    assert.equal(parsed.staleClientUnreadCount, 2);
    assert.equal(parsed.advancedReadSequence, 2);
    assert.equal(parsed.advancedUnreadCount, 0);
    assert.equal(parsed.storedCursor, 1);
    assert.equal(parsed.repeatedStaleReadSequence, 0);
    assert.equal(parsed.repeatedStaleUnreadCount, 2);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("collaboration chat boot preferences prefer cached ui room state over legacy shared local room state", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-chat-boot-state-"));

  try {
    const output = await runCollaborationRoomModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const roomHelpersMod = unwrap(await import(${JSON.stringify(serverCollaborationRoomModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const { join } = await import("node:path");

        const helpers = roomHelpersMod.createCollaborationRoomHelpers({
          buildCollaborationRoomApiEvent: (event) => ({
            ...event,
            label: event.type,
            detail: event.detail || event.message || "",
            targetDisplayNames: [],
            fallbackDisplayName: undefined,
            attachments: [],
            messageHtml: undefined,
            detailHtml: undefined,
            relatedSessionHref: undefined,
            syncControlMessage: false,
          }),
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message) => new Error(message),
          deriveAgentAnimalIdentity: () => ({ accent: "#0f766e", imageHref: "" }),
          getOpenClawHomeDir: () => process.cwd(),
          getSearchLimitMax: () => 20,
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          humanizeOperatorLabel: (value) => value,
          loadCachedStaffRecentActivity: async () => new Map(),
          normalizeAgentIdCandidate: (value) => {
            const trimmed = String(value ?? "").trim().toLowerCase();
            return trimmed ? trimmed : undefined;
          },
          normalizeSessionHistoryMessages: () => [],
          normalizeLookupKey: (value) => String(value ?? "").trim().toLowerCase(),
          pickLatestSessionActivityTimestamp: (...values) => values.find(Boolean),
          pickUiText: (_language, english) => english,
          resolveConfiguredWorkspaceRoot: () => "",
          resolveStaffStatusDotTone: () => "idle",
          safeTruncate: (value, max = Number.MAX_SAFE_INTEGER) => String(value ?? "").slice(0, max),
          staffCurrentWorkLabel: () => ({ label: "Current task", value: "Idle" }),
          staffStatusDotLabel: () => "Idle",
          toSortableMs: (value) => {
            const parsed = Date.parse(value ?? "");
            return Number.isNaN(parsed) ? 0 : parsed;
          },
        });

        const cachedRoomId = "room-cached-only";
        const localActiveRoomId = "room-local-active";
        await collaborationRoom.createCollaborationRoom({
          roomId: cachedRoomId,
          title: "Cached room",
          titleMode: "manual",
          projectId: "proj-cached",
        });
        await collaborationRoom.createCollaborationRoom({
          roomId: localActiveRoomId,
          title: "Canonical active room",
          titleMode: "manual",
          projectId: "proj-active",
        });
        await collaborationRoom.setActiveCollaborationRoomId(localActiveRoomId);
        await collaborationRoom.setCollaborationRoomReadCursor(localActiveRoomId, 4);

        const directory = {
          primaryAgentId: "main",
          primaryDisplayName: "Jarvis",
          entries: [
            {
              agentId: "main",
              displayName: "Jarvis",
              aliases: ["main", "jarvis"],
              primary: true,
              identity: { accent: "#0f766e", imageHref: "" },
            },
          ],
        };
        const boot = await helpers.buildCollaborationChatBootPreferences({
          preferences: {
            expanded: true,
            autoRefresh: false,
            activeRoomId: cachedRoomId,
            lastReadSequence: 9,
            roomReadCursors: {
              [cachedRoomId]: 9,
              [localActiveRoomId]: 2,
            },
          },
          directory,
        });
        process.stdout.write(JSON.stringify(boot));
      `,
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.expanded, true);
    assert.equal(parsed.autoRefresh, false);
    assert.equal(parsed.activeRoomId, "room-cached-only");
    assert.equal(parsed.lastReadSequence, 9);
    assert.equal(parsed.roomReadCursors["room-local-active"], 2);
    assert.equal(parsed.roomReadCursors["room-cached-only"], 9);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("collaboration room list is local-first and keeps transcript-only rooms as compatibility entries", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-room-local-first-"));

  try {
    const output = await runCollaborationRoomModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const roomHelpersMod = unwrap(await import(${JSON.stringify(serverCollaborationRoomModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const openclawChatRooms = unwrap(await import(${JSON.stringify(openclawChatRoomsModuleHref)}));
        const { join } = await import("node:path");

        const helpers = roomHelpersMod.createCollaborationRoomHelpers({
          buildCollaborationRoomApiEvent: (event) => ({
            ...event,
            label: event.type,
            detail: event.detail || event.message || "",
            targetDisplayNames: [],
            fallbackDisplayName: undefined,
            attachments: [],
            messageHtml: undefined,
            detailHtml: undefined,
            relatedSessionHref: undefined,
            syncControlMessage: false,
          }),
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message) => new Error(message),
          deriveAgentAnimalIdentity: () => ({ accent: "#0f766e", imageHref: "" }),
          getOpenClawHomeDir: () => process.cwd(),
          getSearchLimitMax: () => 20,
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          humanizeOperatorLabel: (value) => value,
          loadCachedStaffRecentActivity: async () => new Map(),
          normalizeAgentIdCandidate: (value) => {
            const trimmed = String(value ?? "").trim().toLowerCase();
            return trimmed ? trimmed : undefined;
          },
          normalizeSessionHistoryMessages: () => [],
          normalizeLookupKey: (value) => String(value ?? "").trim().toLowerCase(),
          pickLatestSessionActivityTimestamp: (...values) => values.find(Boolean),
          pickUiText: (_language, english) => english,
          resolveConfiguredWorkspaceRoot: () => "",
          resolveStaffStatusDotTone: () => "idle",
          safeTruncate: (value, max = Number.MAX_SAFE_INTEGER) => String(value ?? "").slice(0, max),
          staffCurrentWorkLabel: () => ({ label: "Current task", value: "Idle" }),
          staffStatusDotLabel: () => "Idle",
          toSortableMs: (value) => {
            const parsed = Date.parse(value ?? "");
            return Number.isNaN(parsed) ? 0 : parsed;
          },
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const localRoom = await collaborationRoom.createCollaborationRoom({
          roomId: "11111111-1111-4111-8111-111111111111",
          title: "Canonical local room",
          titleMode: "manual",
          projectId: "proj-local",
        });
        await collaborationRoom.appendCollaborationRoomEvents(localRoom.roomId, [
          {
            eventId: "evt-local",
            type: "system_note",
            authorRole: "system",
            message: "Local collaboration state updated.",
            detail: "Local collaboration state updated.",
          },
        ]);
        const transcriptOnlyRoom = await openclawChatRooms.createOpenClawChatRoom({
          agentId: "main",
          roomId: "22222222-2222-4222-8222-222222222222",
          workspaceRoot,
          openclawHomeDir: process.cwd(),
          title: "Legacy transcript room",
        });
        const rooms = await helpers.listCollaborationTranscriptRooms({
          primaryAgentId: "main",
          primaryDisplayName: "Jarvis",
          entries: [{ agentId: "main", displayName: "Jarvis", aliases: ["main", "jarvis"], primary: true }],
        });
        process.stdout.write(JSON.stringify({
          roomIds: rooms.map((room) => room.roomId),
          localIndex: rooms.findIndex((room) => room.roomId === localRoom.roomId),
          transcriptOnlyIndex: rooms.findIndex((room) => room.roomId === transcriptOnlyRoom.roomId),
          localTitle: rooms.find((room) => room.roomId === localRoom.roomId)?.title ?? null,
          transcriptTitle: rooms.find((room) => room.roomId === transcriptOnlyRoom.roomId)?.title ?? null,
        }));
      `,
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.roomIds[0], "11111111-1111-4111-8111-111111111111");
    assert.equal(parsed.localIndex, 0);
    assert(parsed.transcriptOnlyIndex > parsed.localIndex);
    assert.equal(parsed.localTitle, "Canonical local room");
    assert.equal(typeof parsed.transcriptTitle, "string");
    assert(parsed.transcriptTitle.length > 0);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("local-only collaboration rooms resolve and load without a Jarvis transcript", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-room-local-only-"));

  try {
    const output = await runCollaborationRoomModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const roomHelpersMod = unwrap(await import(${JSON.stringify(serverCollaborationRoomModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const { join } = await import("node:path");

        const helpers = roomHelpersMod.createCollaborationRoomHelpers({
          buildCollaborationRoomApiEvent: (event) => ({
            ...event,
            label: event.type,
            detail: event.detail || event.message || "",
            targetDisplayNames: [],
            fallbackDisplayName: undefined,
            attachments: [],
            messageHtml: undefined,
            detailHtml: undefined,
            relatedSessionHref: undefined,
            syncControlMessage: false,
          }),
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message) => new Error(message),
          deriveAgentAnimalIdentity: () => ({ accent: "#0f766e", imageHref: "" }),
          getOpenClawHomeDir: () => process.cwd(),
          getSearchLimitMax: () => 20,
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          humanizeOperatorLabel: (value) => value,
          loadCachedStaffRecentActivity: async () => new Map(),
          normalizeAgentIdCandidate: (value) => {
            const trimmed = String(value ?? "").trim().toLowerCase();
            return trimmed ? trimmed : undefined;
          },
          normalizeSessionHistoryMessages: () => [],
          normalizeLookupKey: (value) => String(value ?? "").trim().toLowerCase(),
          pickLatestSessionActivityTimestamp: (...values) => values.find(Boolean),
          pickUiText: (_language, english) => english,
          resolveConfiguredWorkspaceRoot: () => "",
          resolveStaffStatusDotTone: () => "idle",
          safeTruncate: (value, max = Number.MAX_SAFE_INTEGER) => String(value ?? "").slice(0, max),
          staffCurrentWorkLabel: () => ({ label: "Current task", value: "Idle" }),
          staffStatusDotLabel: () => "Idle",
          toSortableMs: (value) => {
            const parsed = Date.parse(value ?? "");
            return Number.isNaN(parsed) ? 0 : parsed;
          },
        });

        const room = await collaborationRoom.createCollaborationRoom({
          roomId: "room-local-only",
          title: "Local only room",
          titleMode: "manual",
          projectId: "proj-local-only",
        });
        await collaborationRoom.appendCollaborationRoomEvents(room.roomId, [
          {
            eventId: "evt-user",
            type: "user_message",
            authorRole: "user",
            message: "Keep this room local-first.",
          },
        ]);
        const directory = {
          primaryAgentId: "main",
          primaryDisplayName: "Jarvis",
          entries: [
            {
              agentId: "main",
              displayName: "Jarvis",
              aliases: ["main", "jarvis"],
              primary: true,
              identity: { accent: "#0f766e", imageHref: "" },
            },
          ],
        };
        const selectedRoomId = await helpers.normalizeCollaborationRoomIdQuery(room.roomId, directory);
        const roomView = await helpers.buildCollaborationRoomApiView({
          roomId: room.roomId,
          language: "en",
          afterSequence: 0,
          limit: 20,
          readSequence: 0,
          directory,
          primaryAgentId: directory.primaryAgentId,
          primaryDisplayName: directory.primaryDisplayName,
        });
        process.stdout.write(JSON.stringify({
          selectedRoomId,
          roomViewId: roomView.roomId,
          eventTypes: roomView.events.map((event) => event.type),
          listedRoomIds: roomView.rooms.map((item) => item.roomId),
        }));
      `,
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.selectedRoomId, "room-local-only");
    assert.equal(parsed.roomViewId, "room-local-only");
    assert.deepEqual(parsed.eventTypes, ["user_message"]);
    assert(parsed.listedRoomIds.includes("room-local-only"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("legacy transcript-backed rooms still load and bootstrap local metadata", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-room-legacy-transcript-"));

  try {
    const output = await runCollaborationRoomModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const roomHelpersMod = unwrap(await import(${JSON.stringify(serverCollaborationRoomModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const { mkdir, writeFile } = await import("node:fs/promises");
        const { join } = await import("node:path");

        const helpers = roomHelpersMod.createCollaborationRoomHelpers({
          buildCollaborationRoomApiEvent: (event) => ({
            ...event,
            label: event.type,
            detail: event.detail || event.message || "",
            targetDisplayNames: [],
            fallbackDisplayName: undefined,
            attachments: [],
            messageHtml: undefined,
            detailHtml: undefined,
            relatedSessionHref: undefined,
            syncControlMessage: false,
          }),
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message) => new Error(message),
          deriveAgentAnimalIdentity: () => ({ accent: "#0f766e", imageHref: "" }),
          getOpenClawHomeDir: () => process.cwd(),
          getSearchLimitMax: () => 20,
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          humanizeOperatorLabel: (value) => value,
          loadCachedStaffRecentActivity: async () => new Map(),
          normalizeAgentIdCandidate: (value) => {
            const trimmed = String(value ?? "").trim().toLowerCase();
            return trimmed ? trimmed : undefined;
          },
          normalizeSessionHistoryMessages: (history) =>
            Array.isArray(history?.json?.history)
              ? history.json.history
                  .filter((entry) => entry?.type === "message" && typeof entry?.message?.role === "string")
                  .map((entry) => ({
                    role: entry.message.role,
                    content: Array.isArray(entry.message.content)
                      ? entry.message.content.map((item) => item?.text || "").join(" ").trim()
                      : "",
                    timestamp: entry.timestamp,
                    kind: "message",
                    sourceSessionKey: entry.sourceSessionKey,
                    author: entry.author,
                  }))
              : [],
          normalizeLookupKey: (value) => String(value ?? "").trim().toLowerCase(),
          pickLatestSessionActivityTimestamp: (...values) => values.find(Boolean),
          pickUiText: (_language, english) => english,
          resolveConfiguredWorkspaceRoot: () => "",
          resolveStaffStatusDotTone: () => "idle",
          safeTruncate: (value, max = Number.MAX_SAFE_INTEGER) => String(value ?? "").slice(0, max),
          staffCurrentWorkLabel: () => ({ label: "Current task", value: "Idle" }),
          staffStatusDotLabel: () => "Idle",
          toSortableMs: (value) => {
            const parsed = Date.parse(value ?? "");
            return Number.isNaN(parsed) ? 0 : parsed;
          },
        });

        const roomId = "33333333-3333-4333-8333-333333333333";
        const workspaceRoot = join(process.cwd(), "workspace");
        const sessionsDir = join(process.cwd(), "agents", "main", "sessions");
        await mkdir(sessionsDir, { recursive: true });
        await writeFile(
          join(sessionsDir, roomId + ".jsonl"),
          [
            JSON.stringify({
              type: "session",
              version: 3,
              id: roomId,
              timestamp: "2026-03-22T02:00:00.000Z",
              cwd: workspaceRoot,
            }),
            JSON.stringify({
              type: "message",
              timestamp: "2026-03-22T02:00:01.000Z",
              message: {
                role: "user",
                content: [{ type: "text", text: "Keep the legacy transcript visible." }],
                timestamp: "2026-03-22T02:00:01.000Z",
              },
            }),
          ].join("\\n"),
          "utf8",
        );
        const directory = {
          primaryAgentId: "main",
          primaryDisplayName: "Jarvis",
          entries: [
            {
              agentId: "main",
              displayName: "Jarvis",
              aliases: ["main", "jarvis"],
              primary: true,
              identity: { accent: "#0f766e", imageHref: "" },
            },
          ],
        };
        const roomView = await helpers.buildCollaborationRoomApiView({
          roomId,
          language: "en",
          afterSequence: 0,
          limit: 20,
          readSequence: 0,
          directory,
          primaryAgentId: directory.primaryAgentId,
          primaryDisplayName: directory.primaryDisplayName,
        });
        const bootstrapped = await collaborationRoom.loadExistingCollaborationRoom(roomId);
        process.stdout.write(JSON.stringify({
          roomViewId: roomView.roomId,
          eventTypes: roomView.events.map((event) => event.type),
          firstMessage: roomView.events[0]?.message ?? null,
          bootstrapped: Boolean(bootstrapped),
          bootstrappedProjectId: bootstrapped?.projectId ?? null,
        }));
      `,
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.roomViewId, "33333333-3333-4333-8333-333333333333");
    assert.deepEqual(parsed.eventTypes, ["user_message"]);
    assert.equal(parsed.firstMessage, "Keep the legacy transcript visible.");
    assert.equal(parsed.bootstrapped, true);
    assert.equal(typeof parsed.bootstrappedProjectId, "string");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("stale collaboration receipts with attached deliverables do not degrade to a red stale state", () => {
  const helpers = createRoomHelpersForSmoke();
  const executionState = helpers.deriveCollaborationExecutionStateForSmoke({
    dispatch: {
      taskId: "task-weather",
      projectId: "proj-weather",
      createdAt: "2026-03-18T15:44:18.455Z",
    },
    receipt: {
      taskId: "task-weather",
      projectId: "proj-weather",
      lastResultState: "in_progress",
      lastReportedAt: "2026-03-18T15:44:43.929Z",
      lastReportedBy: "main",
    },
    task: {
      taskId: "task-weather",
      projectId: "proj-weather",
      status: "in_progress",
      updatedAt: "2026-03-18T15:44:43.906Z",
    },
    replyEvent: {
      agentId: "main",
      createdAt: "2026-03-18T15:44:43.925Z",
      attachmentIds: ["att-weather"],
      message: [
        "给你，HTML 文件直接附上了，打开就能看。",
        "",
        "<stage_result>",
        JSON.stringify({
          taskId: "task-weather",
          projectId: "proj-weather",
          agentId: "main",
          resultState: "in_progress",
          summary: "已直接附上天气 HTML 文件。",
          artifacts: [{ location: "C:\\Users\\demo\\weather.html" }],
          completionChecklist: ["HTML 文件已生成"],
          blockers: [],
          nextSuggestion: "",
          reportedAt: "2026-03-18T15:44:43.925Z",
        }),
        "</stage_result>",
      ].join("\n"),
    },
  });

  assert.equal(executionState, "done");
});

test("expired failed collaboration receipts no longer keep participants in a red failed state", () => {
  const realDateNow = Date.now;
  Date.now = () => new Date("2026-03-20T10:00:00.000Z").getTime();

  try {
    const helpers = createRoomHelpersForSmoke();
    const executionState = helpers.deriveCollaborationExecutionStateForSmoke({
      dispatch: {
        taskId: "task-legacy",
        projectId: "proj-legacy",
        createdAt: "2026-03-19T00:00:00.000Z",
      },
      receipt: {
        taskId: "task-legacy",
        projectId: "proj-legacy",
        lastResultState: "failed",
        lastReportedAt: "2026-03-19T00:30:00.000Z",
        lastReportedBy: "main",
      },
      task: {
        taskId: "task-legacy",
        projectId: "proj-legacy",
        status: "in_progress",
        updatedAt: "2026-03-19T00:30:00.000Z",
      },
    });

    assert.equal(executionState, "idle");
  } finally {
    Date.now = realDateNow;
  }
});

test("long-abandoned stale collaboration receipts no longer keep participants in a red stale state", () => {
  const realDateNow = Date.now;
  Date.now = () => new Date("2026-03-20T10:00:00.000Z").getTime();

  try {
    const helpers = createRoomHelpersForSmoke();
    const executionState = helpers.deriveCollaborationExecutionStateForSmoke({
      dispatch: {
        taskId: "task-legacy-stale",
        projectId: "proj-legacy",
        createdAt: "2026-03-19T00:00:00.000Z",
      },
      receipt: {
        taskId: "task-legacy-stale",
        projectId: "proj-legacy",
        lastResultState: "in_progress",
        lastReportedAt: "2026-03-19T00:30:00.000Z",
        lastReportedBy: "main",
      },
      task: {
        taskId: "task-legacy-stale",
        projectId: "proj-legacy",
        status: "in_progress",
        updatedAt: "2026-03-19T00:30:00.000Z",
      },
    });

    assert.equal(executionState, "idle");
  } finally {
    Date.now = realDateNow;
  }
});

test("transcript merge filters internal recovery prompts and deduplicates cleaned agent replies", () => {
  const helpers = createRoomHelpersForSmoke();

  const localReply = {
    sequence: 1,
    eventId: "local-reply",
    type: "agent_reply",
    createdAt: "2026-03-20T08:02:37.900Z",
    authorRole: "agent",
    agentId: "jarvis",
    agentDisplayName: "Jarvis",
    label: "Jarvis replied",
    message: "HTML 已经做好，可以直接打开查看。",
    detail: "",
    targetAgentIds: [],
    targetDisplayNames: [],
    attachmentIds: ["att-1"],
    attachments: [{ attachmentId: "att-1", fileName: "chengdu-apr4-weather.html" }],
  };

  const transcriptPrompt = helpers.buildCollaborationTranscriptBackfillEvent({
    sequence: 1,
    language: "zh",
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    message: {
      role: "user",
      kind: "message",
      timestamp: "2026-03-20T08:02:37.700Z",
      content: "[[internal_wake_resume]]\nInternal recovery wake.\nEmployee: Jarvis (main)\nCurrent stage: delivery\nCurrent task: HTML\nDo not treat this as a new user request.\n",
    },
  });
  const transcriptReply = helpers.buildCollaborationTranscriptBackfillEvent({
    sequence: 2,
    language: "zh",
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    message: {
      role: "assistant",
      kind: "message",
      timestamp: "2026-03-20T08:02:37.844Z",
      content: [
        "[[reply_to_current]] HTML 已经做好，可以直接打开查看。",
        "",
        '<stage_result resultState="awaiting_review">',
        "  <summary>HTML 已生成。</summary>",
        '  <artifact path="C:/workspace/demo/weather.html" />',
        "</stage_result>",
      ].join("\n"),
    },
  });

  assert.equal(transcriptReply?.message, "HTML 已经做好，可以直接打开查看。");

  const merged = helpers.mergeCollaborationRoomApiEvents({
    lastLocalSequence: 1,
    localEvents: [localReply],
    transcriptEvents: [transcriptPrompt, transcriptReply].filter(Boolean),
  });

  assert.equal(merged.events.length, 1);
  assert.equal(merged.events[0]?.eventId, "local-reply");
  assert.equal(merged.events[0]?.attachments?.length ?? 0, 1);
});

test("visible timeline filter hides heartbeat recovery noise without hiding real worker replies", () => {
  const helpers = createRoomHelpersForSmoke();

  const filtered = helpers.filterVisibleCollaborationApiEvents([
    {
      sequence: 1,
      eventId: "heartbeat-note",
      type: "system_note",
      createdAt: "2026-03-22T12:02:28.060Z",
      authorRole: "system",
      agentId: "qa",
      detail: 'Heart rate monitor resumed QA on stage "delivery".',
    },
    {
      sequence: 2,
      eventId: "heartbeat-ok",
      type: "agent_reply",
      createdAt: "2026-03-22T12:02:28.060Z",
      authorRole: "agent",
      agentId: "qa",
      message: "HEARTBEAT_OK",
      detail: "Recovered after 8 minute(s) without a normal heartbeat.",
    },
    {
      sequence: 3,
      eventId: "qa-real-reply",
      type: "agent_reply",
      createdAt: "2026-03-22T12:02:29.000Z",
      authorRole: "agent",
      agentId: "qa",
      message: "QA: Reviewable.",
      detail: "",
    },
  ]);

  assert.deepEqual(
    filtered.map((event: { eventId: string }) => event.eventId),
    ["qa-real-reply"],
  );
});

test("visible timeline filter hides machine-only agent payload noise", () => {
  const helpers = createRoomHelpersForSmoke();
  const payloadOnlyReply = JSON.stringify({
    payloads: [],
    meta: {
      agentMeta: { model: "gpt-5.4" },
      systemPromptReport: { sessionKey: "agent:main:main" },
    },
  });

  const filtered = helpers.filterVisibleCollaborationApiEvents([
    {
      sequence: 1,
      eventId: "payload-json",
      type: "agent_reply",
      createdAt: "2026-03-22T14:24:14.138Z",
      authorRole: "agent",
      agentId: "main",
      message: payloadOnlyReply,
      detail: "Jarvis replied in 114s.",
    },
    {
      sequence: 2,
      eventId: "no-reply",
      type: "agent_reply",
      createdAt: "2026-03-22T14:24:44.721Z",
      authorRole: "agent",
      agentId: "main",
      message: "NO_REPLY",
      detail: "",
    },
    {
      sequence: 3,
      eventId: "real-reply",
      type: "agent_reply",
      createdAt: "2026-03-22T14:24:58.860Z",
      authorRole: "agent",
      agentId: "main",
      message: "QA=1, Architect=1 — both confirmations received.",
      detail: "",
    },
  ]);

  assert.deepEqual(
    filtered.map((event: { eventId: string }) => event.eventId),
    ["real-reply"],
  );
});

test("transcript backfill drops tool events so shared chat stays focused on visible conversation", () => {
  const helpers = createRoomHelpersForSmoke();

  const toolEvent = helpers.buildCollaborationTranscriptBackfillEvent({
    sequence: 1,
    language: "zh",
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    message: {
      role: "tool",
      kind: "tool_event",
      timestamp: "2026-03-22T13:44:48.180Z",
      toolName: "tool",
      content: "open-tasks.json updated",
    },
  });

  assert.equal(toolEvent, null);
});

test("transcript merge drops room-scoped transcript user prompts once local canonical messages exist", () => {
  const helpers = createRoomHelpersForSmoke();
  const localUser = {
    sequence: 1,
    eventId: "local-user",
    type: "user_message",
    createdAt: "2026-03-22T14:22:19.977Z",
    authorRole: "user",
    message: "Kick off the room.",
    detail: "Jarvis",
    targetAgentIds: ["jarvis"],
    targetDisplayNames: ["Jarvis"],
    attachmentIds: [],
    attachments: [],
  };
  const transcriptPrompt = helpers.buildCollaborationTranscriptBackfillEvent({
    sequence: 1,
    language: "en",
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    message: {
      role: "user",
      kind: "message",
      timestamp: "2026-03-22T14:23:25.150Z",
      sourceSessionKey: "agent:main:thread:collab-room-alpha",
      content: "Retry the same coordination turn with the same room context.",
    },
  });
  const transcriptReply = helpers.buildCollaborationTranscriptBackfillEvent({
    sequence: 2,
    language: "en",
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    message: {
      role: "assistant",
      kind: "message",
      timestamp: "2026-03-22T14:23:58.860Z",
      sourceSessionKey: "agent:main:thread:collab-room-alpha",
      content: "QA=1, Architect=1 — both confirmations received.",
    },
  });

  const merged = helpers.mergeCollaborationRoomApiEvents({
    lastLocalSequence: 1,
    localEvents: [localUser],
    transcriptEvents: [transcriptPrompt, transcriptReply].filter(Boolean),
  });

  assert.deepEqual(
    merged.events.map((event: { eventId: string; type: string }) => ({
      eventId: event.eventId,
      type: event.type,
    })),
    [
      { eventId: "local-user", type: "user_message" },
      { eventId: "transcript:2:message", type: "agent_reply" },
    ],
  );
});

test("transcript merge tolerates transcript user prompts without a related session key", () => {
  const helpers = createRoomHelpersForSmoke();
  const localUser = {
    sequence: 1,
    eventId: "local-user",
    type: "user_message",
    createdAt: "2026-03-22T14:22:19.977Z",
    authorRole: "user",
    message: "Kick off the room.",
    detail: "Jarvis",
    targetAgentIds: ["jarvis"],
    targetDisplayNames: ["Jarvis"],
    attachmentIds: [],
    attachments: [],
  };
  const transcriptPrompt = {
    sequence: 1,
    eventId: "transcript-user-without-session",
    type: "user_message",
    createdAt: "2026-03-22T14:23:25.150Z",
    authorRole: "user",
    message: "Retry the same coordination turn with the same room context.",
  };
  const transcriptReply = {
    sequence: 2,
    eventId: "transcript-reply",
    type: "agent_reply",
    createdAt: "2026-03-22T14:23:58.860Z",
    authorRole: "agent",
    agentId: "jarvis",
    message: "QA=1, Architect=1 — both confirmations received.",
  };

  const merged = helpers.mergeCollaborationRoomApiEvents({
    lastLocalSequence: 1,
    localEvents: [localUser],
    transcriptEvents: [transcriptPrompt, transcriptReply],
  });

  assert.deepEqual(
    merged.events.map((event: { eventId: string; type: string }) => ({
      eventId: event.eventId,
      type: event.type,
    })),
    [
      { eventId: "local-user", type: "user_message" },
      { eventId: "transcript-user-without-session", type: "user_message" },
      { eventId: "transcript-reply", type: "agent_reply" },
    ],
  );
});

test("live session backfill projects the latest room-scoped worker reply into the shared timeline", async () => {
  const helpers = createRoomHelpersForSmoke({
    normalizeSessionHistoryMessages: (response: { messages?: unknown[] }, limit: number) =>
      Array.isArray(response?.messages) ? response.messages.slice(-limit) : [],
  });

  const liveEvents = await helpers.buildCollaborationLiveSessionBackfillEvents({
    client: {
      sessionsHistory: async () => ({
        messages: [
          {
            role: "user",
            kind: "message",
            timestamp: "2026-03-22T11:53:39.254Z",
            content: [
              "<openclaw_coordination>",
              "roomId: room-alpha",
              "projectId: proj-alpha",
              "taskId: task-qa",
              "</openclaw_coordination>",
              "",
              "User request:",
              "@qa Please reply in this room.",
            ].join("\n"),
          },
          {
            role: "assistant",
            kind: "message",
            timestamp: "2026-03-22T11:54:13.867Z",
            content: "[[reply_to_current]] QA has completed the verification pass.",
          },
        ],
      }),
    },
    state: {
      events: [
        {
          sequence: 1,
          eventId: "dispatch-qa",
          type: "dispatch_started",
          createdAt: "2026-03-22T11:53:39.254Z",
          authorRole: "system",
          agentId: "qa",
          relatedSessionKey: "agent:qa:thread:collab-room-alpha",
        },
      ],
      sessionBindings: [],
    },
    roomId: "room-alpha",
    directory: {
      entries: [
        {
          agentId: "jarvis",
          displayName: "Jarvis",
          aliases: buildMentionAliases("jarvis", "Jarvis"),
        },
        {
          agentId: "qa",
          displayName: "QA",
          aliases: buildMentionAliases("qa", "QA"),
        },
      ],
    },
    transcriptEvents: [],
    visibleTimeline: [],
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    language: "en",
    limit: 20,
    baseSequence: 5,
  });

  assert.equal(liveEvents.length, 1);
  assert.equal(liveEvents[0]?.agentId, "qa");
  assert.equal(liveEvents[0]?.message, "QA has completed the verification pass.");
  assert.equal(liveEvents[0]?.liveSessionBackfill, true);
  assert.equal(liveEvents[0]?.relatedSessionKey, "agent:qa:thread:collab-room-alpha");
});

test("pending draft fallback appears only when a current-room dispatch has no visible reply yet", () => {
  const helpers = createRoomHelpersForSmoke();
  const baseInput = {
    state: {
      events: [
        {
          sequence: 1,
          eventId: "dispatch-qa",
          type: "dispatch_started",
          createdAt: "2026-03-22T11:53:39.254Z",
          authorRole: "system",
          agentId: "qa",
          sourceEventId: "source-qa",
          targetAgentIds: ["qa"],
          relatedSessionKey: "agent:qa:thread:collab-room-alpha",
        },
      ],
    },
    roomId: "room-alpha",
    directory: {
      entries: [
        {
          agentId: "qa",
          displayName: "QA",
          aliases: buildMentionAliases("qa", "QA"),
        },
      ],
    },
    language: "en",
    baseSequence: 10,
  };

  const pending = helpers.buildCollaborationPendingDraftEvents({
    ...baseInput,
    currentEvents: [],
  });
  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.pending, true);
  assert.match(String(pending[0]?.message || ""), /Working/);

  const noPending = helpers.buildCollaborationPendingDraftEvents({
    ...baseInput,
    currentEvents: [
      {
        sequence: 10,
        eventId: "system-note-without-agent",
        type: "system_note",
        createdAt: "2026-03-22T11:54:00.000Z",
        authorRole: "system",
      },
      {
        sequence: 11,
        eventId: "qa-reply",
        type: "agent_reply",
        createdAt: "2026-03-22T11:54:13.867Z",
        authorRole: "agent",
        agentId: "qa",
        sourceEventId: "source-qa",
      },
    ],
  });
  assert.equal(noPending.length, 0);

  const noPendingDuringLiveDraft = helpers.buildCollaborationPendingDraftEvents({
    ...baseInput,
    currentEvents: [
      {
        sequence: 11,
        eventId: "qa-live-draft",
        type: "agent_reply",
        createdAt: "2026-03-22T11:54:05.000Z",
        authorRole: "agent",
        agentId: "qa",
        sourceEventId: "source-qa",
        pending: true,
        liveDraft: true,
      },
    ],
  });
  assert.equal(noPendingDuringLiveDraft.length, 0);
});

test("transcript-first merge keeps different employee replies visible and only deduplicates exact local equivalents", () => {
  const helpers = createRoomHelpersForSmoke();
  const transcriptJarvis = {
    sequence: 1,
    eventId: "transcript-jarvis",
    type: "agent_reply",
    createdAt: "2026-03-20T08:02:37.844Z",
    authorRole: "agent",
    agentId: "jarvis",
    agentDisplayName: "Jarvis",
    label: "Jarvis replied",
    message: "Status ready.",
    detail: "",
    targetAgentIds: [],
    targetDisplayNames: [],
    attachmentIds: [],
    attachments: [],
    syncControlMessage: true,
  };
  const transcriptQa = {
    sequence: 2,
    eventId: "transcript-qa",
    type: "agent_reply",
    createdAt: "2026-03-20T08:02:39.000Z",
    authorRole: "agent",
    agentId: "qa",
    agentDisplayName: "QA",
    label: "QA replied",
    message: "Status ready.",
    detail: "",
    targetAgentIds: [],
    targetDisplayNames: [],
    attachmentIds: [],
    attachments: [],
    syncControlMessage: true,
  };

  const transcriptFirst = helpers.mergeCollaborationRoomApiEvents({
    lastLocalSequence: 0,
    localEvents: [],
    transcriptEvents: [transcriptJarvis, transcriptQa],
  });

  assert.deepEqual(
    transcriptFirst.events.map((event: { eventId: string; agentId?: string }) => ({
      eventId: event.eventId,
      agentId: event.agentId,
    })),
    [
      { eventId: "transcript-jarvis", agentId: "jarvis" },
      { eventId: "transcript-qa", agentId: "qa" },
    ],
  );

  const mergedAfterLocal = helpers.mergeCollaborationRoomApiEvents({
    lastLocalSequence: 1,
    localEvents: [
      {
        ...transcriptJarvis,
        eventId: "local-jarvis",
        sequence: 1,
        syncControlMessage: false,
      },
    ],
    transcriptEvents: [transcriptJarvis, transcriptQa],
  });

  assert.deepEqual(
    mergedAfterLocal.events.map((event: { eventId: string; agentId?: string }) => ({
      eventId: event.eventId,
      agentId: event.agentId,
    })),
    [
      { eventId: "local-jarvis", agentId: "jarvis" },
      { eventId: "transcript-qa", agentId: "qa" },
    ],
  );
});

test("transcript sync-control reply deduplicates against later canonical local reply within extended skew window", () => {
  const helpers = createRoomHelpersForSmoke();
  const transcriptReply = {
    sequence: 1,
    eventId: "transcript-jarvis",
    type: "agent_reply",
    createdAt: "2026-03-22T13:45:18.133Z",
    authorRole: "agent",
    agentId: "jarvis",
    agentDisplayName: "Jarvis",
    label: "Jarvis replied",
    message: "I coordinated the team and I'm ready to continue.",
    detail: "",
    targetAgentIds: [],
    targetDisplayNames: [],
    attachmentIds: [],
    attachments: [],
    syncControlMessage: true,
  };

  const localReply = {
    ...transcriptReply,
    eventId: "local-jarvis",
    sequence: 1,
    createdAt: "2026-03-22T13:45:41.015Z",
    syncControlMessage: false,
  };

  const merged = helpers.mergeCollaborationRoomApiEvents({
    lastLocalSequence: 1,
    localEvents: [localReply],
    transcriptEvents: [transcriptReply],
  });

  assert.deepEqual(
    merged.events.map((event: { eventId: string; agentId?: string; createdAt: string }) => ({
      eventId: event.eventId,
      agentId: event.agentId,
      createdAt: event.createdAt,
    })),
    [
      {
        eventId: "local-jarvis",
        agentId: "jarvis",
        createdAt: "2026-03-22T13:45:41.015Z",
      },
    ],
  );
});

test("transcript backfill preserves the actual agent identity when author metadata points at another employee", () => {
  const helpers = createRoomHelpersForSmoke();

  const transcriptReply = helpers.buildCollaborationTranscriptBackfillEvent({
    sequence: 1,
    language: "en",
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    directory: {
      entries: [
        {
          agentId: "jarvis",
          displayName: "Jarvis",
          aliases: buildMentionAliases("jarvis", "Jarvis"),
        },
        {
          agentId: "qa",
          displayName: "QA",
          aliases: buildMentionAliases("qa", "QA"),
        },
      ],
    },
    message: {
      role: "assistant",
      author: "qa",
      sourceSessionKey: "agent:qa:main",
      kind: "message",
      timestamp: "2026-03-20T08:02:37.844Z",
      content: "[[reply_to_current]] QA has completed the verification pass.",
    },
  });

  assert.equal(transcriptReply?.agentId, "qa");
  assert.equal(transcriptReply?.agentDisplayName, "QA");
  assert.equal(transcriptReply?.label, "QA replied");
  assert.equal(transcriptReply?.message, "QA has completed the verification pass.");
});

test("loading a disk-backed collaboration room without an index entry preserves its history", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-room-recover-"));
  const roomId = "12345678-1234-4234-8234-1234567890ab";
  const roomDir = join(tempRoot, "runtime", "collaboration-room", "rooms", roomId);
  const roomPath = join(roomDir, "room.json");

  try {
    await mkdir(roomDir, { recursive: true });
    await writeFile(
      roomPath,
      `${JSON.stringify(
        {
          version: 3,
          roomId,
          title: "Recovered planning room",
          titleMode: "manual",
          projectId: "proj-recovered",
          createdAt: "2026-03-20T05:43:21.971Z",
          lastSequence: 1,
          events: [
            {
              sequence: 1,
              eventId: "evt-recovered",
              type: "agent_reply",
              createdAt: "2026-03-20T05:45:00.000Z",
              authorRole: "agent",
              agentId: "jarvis",
              message: "Recovered answer",
            },
          ],
          attachments: [],
          sessionBindings: [],
          dispatchRecords: [],
          taskReceipts: [],
          updatedAt: "2026-03-20T05:45:00.000Z",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const output = await runCollaborationRoomModuleForTest(
      tempRoot,
      `
        const mod = await import(${JSON.stringify(collaborationRoomModuleHref)});
        const api = mod.default ?? mod["module.exports"] ?? mod;
        const rooms = await api.listCollaborationRooms();
        const recovered = await api.loadCollaborationRoom(${JSON.stringify(roomId)});
        process.stdout.write(JSON.stringify({ rooms, recovered }));
      `,
    );
    const parsed = JSON.parse(output) as {
      rooms: Array<{ roomId: string; title: string; eventCount: number }>;
      recovered: { title: string; events: Array<{ message?: string }> };
    };
    const rooms = parsed.rooms;
    const recoveredSummary = rooms.find((room) => room.roomId === roomId);
    assert(recoveredSummary);
    assert.equal(recoveredSummary.title, "Recovered planning room");
    assert.equal(recoveredSummary.eventCount, 1);

    const recovered = parsed.recovered;
    assert.equal(recovered.title, "Recovered planning room");
    assert.equal(recovered.events.length, 1);
    assert.equal(recovered.events[0]?.message, "Recovered answer");

    const persisted = JSON.parse(await readFile(roomPath, "utf8")) as { title?: string; events?: Array<{ message?: string }> };
    assert.equal(persisted.title, "Recovered planning room");
    assert.equal(persisted.events?.length, 1);
    assert.equal(persisted.events?.[0]?.message, "Recovered answer");

    const index = JSON.parse(await readFile(join(tempRoot, "runtime", "collaboration-room", "rooms.json"), "utf8")) as {
      rooms?: Array<{ roomId?: string; title?: string; eventCount?: number }>;
    };
    const indexedRoom = index.rooms?.find((room) => room.roomId === roomId);
    assert(indexedRoom);
    assert.equal(indexedRoom?.title, "Recovered planning room");
    assert.equal(indexedRoom?.eventCount, 1);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("loading collaboration rooms heals a partial index from room files on disk", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-room-index-heal-"));
  const runtimeDir = join(tempRoot, "runtime", "collaboration-room");
  const roomsDir = join(runtimeDir, "rooms");
  const indexedRoomId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const missingRoomId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  try {
    await mkdir(join(roomsDir, indexedRoomId), { recursive: true });
    await mkdir(join(roomsDir, missingRoomId), { recursive: true });
    await writeFile(
      join(roomsDir, indexedRoomId, "room.json"),
      `${JSON.stringify(
        {
          version: 3,
          roomId: indexedRoomId,
          title: "Indexed room",
          titleMode: "manual",
          createdAt: "2026-03-19T10:00:00.000Z",
          lastSequence: 0,
          events: [],
          attachments: [],
          sessionBindings: [],
          dispatchRecords: [],
          taskReceipts: [],
          updatedAt: "2026-03-19T10:00:00.000Z",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(
      join(roomsDir, missingRoomId, "room.json"),
      `${JSON.stringify(
        {
          version: 3,
          roomId: missingRoomId,
          title: "Recovered from disk",
          titleMode: "manual",
          createdAt: "2026-03-20T09:00:00.000Z",
          lastSequence: 2,
          events: [
            {
              sequence: 1,
              eventId: "evt-1",
              type: "user_message",
              createdAt: "2026-03-20T09:00:00.000Z",
              authorRole: "user",
              message: "hello",
            },
            {
              sequence: 2,
              eventId: "evt-2",
              type: "agent_reply",
              createdAt: "2026-03-20T09:01:00.000Z",
              authorRole: "agent",
              agentId: "jarvis",
              message: "world",
            },
          ],
          attachments: [],
          sessionBindings: [],
          dispatchRecords: [],
          taskReceipts: [],
          updatedAt: "2026-03-20T09:01:00.000Z",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await mkdir(runtimeDir, { recursive: true });
    await writeFile(
      join(runtimeDir, "rooms.json"),
      `${JSON.stringify(
        {
          version: 2,
          rooms: [
            {
              roomId: indexedRoomId,
              title: "Indexed room",
              titleMode: "manual",
              createdAt: "2026-03-19T10:00:00.000Z",
              updatedAt: "2026-03-19T10:00:00.000Z",
              lastSequence: 0,
              eventCount: 0,
            },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const output = await runCollaborationRoomModuleForTest(
      tempRoot,
      `
        const mod = await import(${JSON.stringify(collaborationRoomModuleHref)});
        const api = mod.default ?? mod["module.exports"] ?? mod;
        const rooms = await api.listCollaborationRooms();
        process.stdout.write(JSON.stringify(rooms));
      `,
    );
    const rooms = JSON.parse(output) as Array<{ roomId: string }>;
    assert.deepEqual(
      rooms.map((room) => room.roomId),
      [missingRoomId, indexedRoomId],
    );

    const healedIndex = JSON.parse(await readFile(join(runtimeDir, "rooms.json"), "utf8")) as {
      rooms?: Array<{ roomId?: string; title?: string; eventCount?: number }>;
    };
    const healedRoom = healedIndex.rooms?.find((room) => room.roomId === missingRoomId);
    assert(healedRoom);
    assert.equal(healedRoom?.title, "Recovered from disk");
    assert.equal(healedRoom?.eventCount, 2);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
