import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildSessionLinkAttrs, extractCollaborationRoomIdFromSessionKey } from "../src/ui/server-session-room-links";
import { createInsightRenderers } from "../src/ui/server-insight-panels";
import { createTaskPageRenderers } from "../src/ui/server-task-pages";
import { createTeamPanelRenderers } from "../src/ui/server-team-panels";

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

test("room-scoped collaboration session keys resolve to collaboration room ids", () => {
  assert.equal(
    extractCollaborationRoomIdFromSessionKey("agent:jarvis:thread:collab-room-alpha"),
    "room-alpha",
  );
  assert.equal(
    extractCollaborationRoomIdFromSessionKey("agent:main:thread:collab-57e12313-8d6c-47e2-af3e-296aad378ff5"),
    "57e12313-8d6c-47e2-af3e-296aad378ff5",
  );
  assert.equal(extractCollaborationRoomIdFromSessionKey("agent:main:main"), undefined);
});

test("session link attrs add collaboration room hooks only for room-scoped sessions", () => {
  const collabAttrs = buildSessionLinkAttrs({
    sessionKey: "agent:jarvis:thread:collab-room-alpha",
    language: "zh",
    buildSessionDetailHref: (sessionKey: string) => `/details/sessions/${encodeURIComponent(sessionKey)}`,
    escapeHtml,
    source: "test-surface",
  });
  const regularAttrs = buildSessionLinkAttrs({
    sessionKey: "agent:jarvis:main",
    language: "zh",
    buildSessionDetailHref: (sessionKey: string) => `/details/sessions/${encodeURIComponent(sessionKey)}`,
    escapeHtml,
    source: "test-surface",
  });

  assert.match(collabAttrs, /data-collaboration-room-open="room-alpha"/);
  assert.match(collabAttrs, /data-collaboration-room-source="test-surface"/);
  assert.doesNotMatch(regularAttrs, /data-collaboration-room-open=/);
});

test("context pressure rows open collaboration rooms for room-scoped sessions", () => {
  const renderers = createInsightRenderers({
    buildSessionDetailHref: (sessionKey: string) => `/details/sessions/${encodeURIComponent(sessionKey)}`,
    buildTaskDetailHref: () => "/tasks/unused",
    dataConnectionLabel: () => "",
    hasFreshRuntimeTimestamp: () => true,
    humanizeOperatorLabel: (value: string) => value,
    normalizeInlineText: (value: string) => String(value ?? "").trim(),
    pickLatestSessionActivityTimestamp: (...values: Array<string | undefined>) => values.find(Boolean),
    pickLatestTimestamp: (...args: unknown[]) => String(args[0] ?? ""),
    simplifyUsageLabel: (value: string) => value,
    TASK_RUNTIME_ACTIVITY_WINDOW_MS: 15 * 60 * 1000,
    toSortableMs: (value?: string) => (value ? Date.parse(value) || 0 : 0),
  });

  const html = renderers.renderContextPressureCard(
    {
      contextWindows: [
        {
          sessionKey: "agent:jarvis:thread:collab-room-alpha",
          sessionLabel: "Jarvis room alpha",
          thresholdState: "critical",
          usagePercent: 96.4,
          agentId: "jarvis",
          model: "gpt-test",
          usedTokens: 9640,
          contextLimitTokens: 10000,
          paceLabel: "climbing",
        },
      ],
    },
    "en",
  );

  assert.match(html, /data-collaboration-room-open="room-alpha"/);
  assert.match(html, /data-collaboration-room-source="usage-context-pressure"/);
});

test("task detail page routes room-scoped session evidence to collaboration rooms", () => {
  const renderers = createTaskPageRenderers({
    buildHomeHref: () => "/",
    buildSessionDetailHref: (sessionKey: string) => `/details/sessions/${encodeURIComponent(sessionKey)}`,
    renderGlobalVisibilityStrip: () => "",
    sessionStateLabel: (state: string) => state,
    summarizeVisibleSessionSnippet: (value: string) => value,
    taskStateLabel: (state: string) => state,
  });

  const html = renderers.renderTaskDetailPage({
    language: "en",
    generatedAt: "2026-03-26T12:00:00.000Z",
    task: {
      taskId: "task-room-alpha",
      title: "Recover room sync",
      status: "in_progress",
      projectTitle: "Employee system",
      projectId: "employee-system",
      owner: "jarvis",
      dueAt: undefined,
      updatedAt: "2026-03-26T12:00:00.000Z",
      sessionKeys: ["agent:jarvis:thread:collab-room-alpha"],
    },
    certaintyCard: undefined,
    linkedSessions: [
      {
        sessionKey: "agent:jarvis:thread:collab-room-alpha",
        sessionHref: "/details/sessions/agent%3Ajarvis%3Athread%3Acollab-room-alpha",
        state: "running",
        agentId: "jarvis",
        latestAt: "2026-03-26T12:00:00.000Z",
        latestSnippet: "Still working",
      },
    ],
  });

  assert.match(html, /data-collaboration-room-open="room-alpha"/);
  assert.match(html, /data-collaboration-room-source="task-detail-session-list"/);
  assert.match(html, /data-collaboration-room-source="task-detail-session-evidence"/);
});

test("execution chain cards fall back to collaboration room popup when room refs are implicit in session keys", () => {
  const renderers = createTeamPanelRenderers({
    asPercent: (value: number) => value,
    collaborationParticipantRoleLabel: () => "",
    collaborationRoleAgentLabel: () => "",
    deriveAgentAnimalIdentity: () => ({ accent: "#123456" }),
    executionChainCardTitle: (item: { taskTitle?: string }) => item.taskTitle ?? "",
    executionChainSourceLabel: () => "history",
    executionChainStageLabel: (stage: string) => stage,
    formatSubscriptionNumericField: () => "",
    humanizeOperatorLabel: (value: string) => value,
    normalizeQuotaWindowLabel: (value: string) => value,
    officeZoneLabel: (value: string) => value,
    renderAgentAvatarFrame: () => "",
    renderQuotaWindowRow: () => "",
    sessionStateLabel: (state: string) => state,
    summarizeVisibleSessionSnippet: (value: string) => value,
  });

  const html = renderers.renderTaskExecutionChainCards(
    [
      {
        taskTitle: "Repair room replay",
        owner: "jarvis",
        sessionKey: "agent:jarvis:thread:collab-room-alpha",
        sessionHref: "/details/sessions/agent%3Ajarvis%3Athread%3Acollab-room-alpha",
        state: "running",
        latestAt: "2026-03-26T12:00:00.000Z",
        latestSnippet: "resuming",
        executionChain: {
          accepted: true,
          spawned: true,
          stage: "running",
          source: "history",
          inferred: false,
          detail: "Room-scoped child session is still active.",
          parentSessionKey: "agent:main:main",
          childSessionKey: "agent:jarvis:thread:collab-room-alpha",
        },
      },
    ],
    "en",
  );

  assert.match(html, /data-collaboration-room-open="room-alpha"/);
  assert.match(html, /data-collaboration-room-source="execution-chain-card"/);
});

test("dashboard source uses session room link attrs for usage and overview session lists", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");

  assert(source.includes('source: "usage-tool-sessions-table"'));
  assert(source.includes('source: "usage-tool-session-groups"'));
  assert(source.includes('source: "overview-recent-sessions"'));
});
