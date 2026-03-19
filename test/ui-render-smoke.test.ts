import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { AuditTimelineSnapshot } from "../src/runtime/audit-timeline";
import type { AgentTeamEmbedSnapshot } from "../src/runtime/agent-team-embed";
import type { SessionConversationDetailResult } from "../src/runtime/session-conversations";
import type { ReadModelSnapshot } from "../src/types";

test("session drilldown page renders without network and escapes content", async () => {
  const { renderSessionDrilldownPageForSmoke } = await import("../src/ui/server");

  const detail: SessionConversationDetailResult = {
    generatedAt: "2026-03-03T09:00:00.000Z",
    session: {
      sessionKey: "sess-1",
      label: "Primary Session",
      agentId: "agent-alpha",
      state: "running",
      lastMessageAt: "2026-03-03T08:59:00.000Z",
    },
    status: {
      sessionKey: "sess-1",
      model: "gpt-test",
      tokensIn: 10,
      tokensOut: 20,
      cost: 0.01,
      updatedAt: "2026-03-03T08:59:30.000Z",
    },
    latestSnippet: "latest",
    latestRole: "assistant",
    latestKind: "message",
    latestToolName: undefined,
    latestHistoryAt: "2026-03-03T08:59:00.000Z",
    historyCount: 2,
    historyError: undefined,
    executionChain: {
      accepted: true,
      spawned: true,
      acceptedAt: "2026-03-03T08:58:10.000Z",
      spawnedAt: "2026-03-03T08:58:20.000Z",
      parentSessionKey: "sess-parent",
      childSessionKey: "sess-1",
      stage: "running",
      source: "history",
      inferred: false,
      detail: "accepted=yes | spawned=yes | parent=sess-parent | child=sess-1",
    },
    history: [
      {
        kind: "accepted",
        role: "system",
        content: "accepted request",
        timestamp: "2026-03-03T08:58:10.000Z",
      },
      {
        kind: "message",
        role: "user",
        content: "render this <script>alert(1)</script>",
        timestamp: "2026-03-03T08:58:00.000Z",
      },
      {
        kind: "tool_event",
        role: "tool",
        content: "tool output ok",
        timestamp: "2026-03-03T08:59:00.000Z",
        toolName: "openclaw.approvals.get",
        toolStatus: "ok",
      },
    ],
  };

  const html = renderSessionDrilldownPageForSmoke(detail);
  assert(html.includes("Session Drilldown"));
  assert(html.includes("Execution Chain"));
  assert(html.includes("Latest Messages / Tool Events"));
  assert(html.includes("/api/sessions/sess-1?historyLimit=120"));
  assert(html.includes("parent=sess-parent child=sess-1"));
  assert(html.includes("Accepted"));
  assert(html.includes("Spawned"));
  assert(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert(!html.includes("<script>alert(1)</script>"));

  const zh = renderSessionDrilldownPageForSmoke(detail, "zh");
  assert(zh.includes("/api/sessions/sess-1?historyLimit=120"));
  assert(!zh.includes("Session Drilldown"));
  assert(!zh.includes("Execution Chain"));
  assert(!zh.includes("Latest Messages / Tool Events"));
});

test("audit timeline page renders without network and keeps severity selection", async () => {
  const { renderAuditPageForSmoke } = await import("../src/ui/server");

  const timeline: AuditTimelineSnapshot = {
    generatedAt: "2026-03-03T09:10:00.000Z",
    counts: {
      info: 0,
      warn: 1,
      "action-required": 0,
      error: 0,
    },
    events: [
      {
        timestamp: "2026-03-03T09:09:00.000Z",
        severity: "warn",
        source: "monitor",
        message: "timeline <unsafe> marker",
      },
    ],
  };

  const html = renderAuditPageForSmoke(timeline, "warn");
  assert(html.includes("<title>AI Employee System Audit Timeline</title>"));
  assert(html.includes("<h1>Audit Timeline</h1>"));
  assert(html.includes('value="warn" selected'));
  assert(html.includes("timeline &lt;unsafe&gt; marker"));
  assert(!html.includes("timeline <unsafe> marker"));
});

test("dashboard section navigation renders required tabs with active state", async () => {
  const { renderDashboardSectionNavForSmoke } = await import("../src/ui/server");

  const en = renderDashboardSectionNavForSmoke("team", "en");
  assert(en.includes("Overview"));
  assert(en.includes("Staff"));
  assert(en.includes("Collaboration"));
  assert(en.includes("Memory"));
  assert(en.includes("Documents"));
  assert(en.includes("Usage"));
  assert(en.includes("Tasks"));
  assert(en.includes("Settings"));
  assert(en.includes('aria-current="page"'));
  assert(en.includes("/?section=team"));
  assert(en.indexOf("Overview") < en.indexOf("Usage"));
  assert(en.indexOf("Usage") < en.indexOf("Staff"));
  assert(en.indexOf("Staff") < en.indexOf("Collaboration"));
  assert(en.indexOf("Collaboration") < en.indexOf("Memory"));
  assert(!en.includes("Executors"));
  assert(!en.includes("Calendar"));
  assert(!en.includes("Attention"));
  assert(!en.includes("History"));

  const zh = renderDashboardSectionNavForSmoke("team", "zh");
  assert(zh.includes('aria-current="page"'));
  assert(zh.includes('/?section=team'));
  assert(zh.includes("总览"));
  assert(zh.includes("员工"));
  assert(zh.includes("协作"));
  assert(zh.includes("记忆"));
  assert(zh.includes("文档"));
  assert(zh.includes("用量"));
  assert(zh.includes("任务"));
  assert(zh.includes("设置"));
  assert(zh.indexOf("总览") < zh.indexOf("用量"));
  assert(zh.indexOf("用量") < zh.indexOf("员工"));
  assert(zh.indexOf("员工") < zh.indexOf("协作"));
  assert(zh.indexOf("协作") < zh.indexOf("记忆"));
  assert(!zh.includes("Overview"));
  assert(!zh.includes("Staff"));
  assert(!zh.includes("Memory"));
  assert(!zh.includes("Docs"));
  assert(!zh.includes("Usage"));
  assert(!zh.includes("Tasks"));
  assert(!zh.includes("Settings"));
  assert(!zh.includes("Executors"));
  assert(!zh.includes("Calendar"));
  assert(!zh.includes("Attention"));
  assert(!zh.includes("History"));
});

test("legacy mission-control routes resolve to dashboard sections", async () => {
  const { resolveLegacyDashboardSectionForSmoke, resolveDashboardSection } = await import("../src/ui/server");

  assert.equal(resolveLegacyDashboardSectionForSmoke("/calendar"), "projects-tasks");
  assert.equal(resolveLegacyDashboardSectionForSmoke("/heartbeat"), "overview");
  assert.equal(resolveLegacyDashboardSectionForSmoke("/tools"), "settings");
  assert.equal(resolveLegacyDashboardSectionForSmoke("/not-a-route"), undefined);
  assert.equal(resolveDashboardSection(new URLSearchParams("section=alerts")), "overview");
  assert.equal(resolveDashboardSection(new URLSearchParams("section=replay-audit")), "overview");
});

test("collaboration chat overlay exposes inline image preview and save actions", async () => {
  const { renderCollaborationChatOverlay } = await import("../src/ui/collaboration-chat-widget");

  const html = renderCollaborationChatOverlay({
    language: "en",
    preferences: {
      expanded: true,
      autoRefresh: true,
      lastReadSequence: 7,
    },
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    participants: [
      {
        agentId: "jarvis",
        displayName: "Jarvis",
        aliases: ["main", "jarvis"],
        mention: "jarvis",
        primary: true,
        statusTone: "working",
        statusDotLabel: "Working",
        currentWorkLabel: "Working on",
        currentWork: "Reviewing handoff notes",
        recentOutput: "Summarized the latest delivery notes.",
        identity: {
          accent: "#0f62fe",
          imageHref: "/avatars/jarvis.png",
        },
      },
    ],
    writeAccessEnabled: true,
    writeAccessAvailable: true,
  });

  assert(html.includes('data-collab-chat'));
  assert(html.includes('"save":"Save"'));
  assert(html.includes('data-collab-chat-roster'));
  assert(html.includes('data-collab-chat-unread hidden'));
  assert(html.includes('data-collab-chat-panel-unread hidden'));
  assert(html.includes('data-collab-room-trigger'));
  assert(html.includes('data-collab-room-trigger-title'));
  assert(html.includes('data-collab-room-trigger-meta'));
  assert(html.includes('class="collab-chat-input-shell"'));
  assert(html.includes('.collab-chat-empty[hidden]'));
  assert(html.includes('.collab-chat-launcher-unread[hidden]'));
  assert(html.includes('data-collab-chat-person-card'));
  assert(html.includes('data-person-agent="jarvis"'));
  assert(html.includes('collab-chat-avatar-state working'));
  assert(html.includes('"mention":"jarvis"'));
  assert(html.includes('pendingScrollToLatestRoomId'));
  assert(html.includes('scrollEventsToBottom'));
  assert(html.includes('eventsList.scrollTop = eventsList.scrollHeight'));
  assert(html.includes('data-collab-chat-tool-event'));
  assert(html.includes('collab-chat-event-fold-summary'));
  assert(html.includes('Show tool details'));
  assert(html.includes("attachment.kind === 'image'"));
  assert(html.includes("attachment.sourceLocalPath"));
  assert(html.includes("data-save-attachment"));
  assert(html.includes("showSaveFilePicker"));
  assert(!html.includes('data-collab-chat-people'));
});

test("collaboration room merge keeps transcript updates without reintroducing relay prompts", async () => {
  const { mergeCollaborationRoomApiEventsForSmoke } = await import("../src/ui/server");

  const merged = mergeCollaborationRoomApiEventsForSmoke({
    lastLocalSequence: 2,
    localEvents: [
      {
        sequence: 1,
        eventId: "local-user",
        type: "user_message",
        createdAt: "2026-03-16T12:00:00.000Z",
        authorRole: "user",
        label: "User message",
        message: "@Jarvis sync this room",
        detail: "Jarvis",
        targetAgentIds: ["jarvis"],
        targetDisplayNames: ["Jarvis"],
        attachmentIds: [],
        attachments: [],
      },
      {
        sequence: 2,
        eventId: "local-reply",
        type: "agent_reply",
        createdAt: "2026-03-16T12:00:05.000Z",
        authorRole: "agent",
        agentId: "jarvis",
        agentDisplayName: "Jarvis",
        label: "Jarvis replied",
        message: "Done. The room is synced.",
        detail: "Jarvis replied in 5s.",
        targetAgentIds: [],
        targetDisplayNames: [],
        attachmentIds: [],
        attachments: [],
      },
    ],
    transcriptEvents: [
      {
        sequence: 1,
        eventId: "transcript-prompt",
        type: "user_message",
        createdAt: "2026-03-16T12:00:01.000Z",
        authorRole: "user",
        label: "User message",
        message:
          "You are Jarvis in the OpenClaw collaboration room. Primary controller: Jarvis (main). Current user message: @Jarvis sync this room",
        detail: "",
        targetAgentIds: [],
        targetDisplayNames: [],
        attachmentIds: [],
        attachments: [],
      },
      {
        sequence: 2,
        eventId: "transcript-duplicate-reply",
        type: "agent_reply",
        createdAt: "2026-03-16T12:00:06.000Z",
        authorRole: "agent",
        agentId: "jarvis",
        agentDisplayName: "Jarvis",
        label: "Jarvis replied",
        message: "Done. The room is synced.",
        detail: "",
        targetAgentIds: [],
        targetDisplayNames: [],
        attachmentIds: [],
        attachments: [],
      },
      {
        sequence: 3,
        eventId: "transcript-follow-up",
        type: "agent_reply",
        createdAt: "2026-03-16T12:00:09.000Z",
        authorRole: "agent",
        agentId: "jarvis",
        agentDisplayName: "Jarvis",
        label: "Jarvis replied",
        message: "Latest OpenClaw transcript entry arrived after the room event.",
        detail: "",
        targetAgentIds: [],
        targetDisplayNames: [],
        attachmentIds: [],
        attachments: [],
      },
    ],
  });

  assert.equal(merged.length, 3);
  assert.deepEqual(
    merged.map((event) => event.eventId),
    ["local-user", "local-reply", "transcript-follow-up"],
  );
  assert.equal(merged[2]?.sequence, 3);
});

test("session activity timestamp prefers the fresher runtime signal over older history", async () => {
  const { pickLatestSessionActivityTimestampForSmoke } = await import("../src/ui/server");

  assert.equal(
    pickLatestSessionActivityTimestampForSmoke("2026-03-14T05:36:59.486Z", "2026-03-14T15:22:18.823Z"),
    "2026-03-14T15:22:18.823Z",
  );
  assert.equal(
    pickLatestSessionActivityTimestampForSmoke(undefined, "2026-03-14T15:00:00.019Z"),
    "2026-03-14T15:00:00.019Z",
  );
});

test("tasks section centers the merged task-and-schedule card wall before secondary detail", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  assert(source.includes('<section class="task-flow-stack">'));
  assert(source.includes('<section class="card" id="calendar-board">'));
  assert(source.includes('id="task-timeline"'));
  assert(source.includes('t("Task and schedule cards",'));
  assert(
    source.includes(
      "Put tracked tasks, due times, and timed jobs into one draggable card pool so the work queue and schedule stay in the same place.",
    ),
  );
  assert(source.includes('<section class="card" id="cron-execution-board">'));
  assert(
    source.includes(
      "This row focuses only on timed-job execution itself. Keep it below the main card wall so it acts as an execution monitor instead of competing with task priority.",
    ),
  );
  assert(source.includes('id="tracked-task-view"'));
  assert(source.includes("const trackedTaskDetailsOpen = pendingDecisionCount > 0 || taskCertaintyCards.length > 0;"));
  assert(source.includes('t("Tracked tasks and follow-up",'));
  assert(source.includes('<section class="task-hub-shell" id="task-hub">'));
  assert(source.includes('id="task-decision-center"'));
  assert(source.includes("Drag cards to reorder your task and schedule focus. The order is saved in UI preferences."));
  assert(source.includes(".task-flow-stack {"));
  assert(source.includes(".task-brief-grid {"));
  assert(source.includes(".task-brief-board {"));
  assert(source.includes(".task-drag-handle {"));
  assert(source.includes(".task-brief-card {"));
  assert(source.includes(".task-status-dot {"));
  assert(source.includes(".task-status-dot.scheduled {"));
  assert(source.includes(".task-legend-dot.scheduled {"));
  assert(source.includes(".cron-run-grid {"));
  assert(source.includes(".cron-run-card {"));
  assert(source.includes('data-task-board-root'));
  assert(source.includes('data-task-card-grid'));
  assert(source.includes('data-task-board-status'));
  assert(source.includes('data-task-order="${escapeHtml(JSON.stringify(manualOrder))}"'));
  assert(source.includes('draggable="true" data-task-card data-task-kind="${escapeHtml(card.cardKind)}" data-task-id="${escapeHtml(card.cardId)}"'));
  assert(source.includes('class="task-status-dot ${escapeHtml(card.statusTone)}"'));
  assert(source.includes('card.cardKind === "timed_job"'));
  assert(source.includes('const priorityPanelClass = card.cardKind === "timed_job" ? "task-priority-panel compact" : "task-priority-panel";'));
  assert(source.includes('pickUiText(language, "Auto run", "自动执行")'));
  assert(source.includes('badge("enabled", pickUiText(language, "Auto", "自动"))'));
  assert(source.includes('.task-brief-card[data-task-kind="timed_job"] .task-brief-head {'));
  assert(source.includes('.task-priority-panel.compact {'));
  assert(source.includes("const cronExecutionCardsHtml ="));
  assert(source.includes("body: JSON.stringify({ taskCardOrder: nextOrder })"));
  assert(source.includes('next.taskCardOrder = normalizeTaskCardOrderPatch(payload.taskCardOrder, "taskCardOrder");'));
  assert(source.includes('if (method === "PATCH" && path === "/api/ui/preferences") {'));
  assert(!source.includes('assertMutationAuthorized(req, "/api/ui/preferences");'));
  assert(source.includes('data-token-required="0" data-task-order="${escapeHtml(JSON.stringify(manualOrder))}"'));
  assert(!source.includes('data-task-board-token placeholder="${escapeHtml(taskBoardTokenPlaceholder)}"'));
  assert(source.includes('label: "关键写入保护"'));
  assert(source.includes('label: "安全口令配置"'));
  assert(source.includes('label: "当前保护状态"'));
  assert(source.includes("Write access is off. Turn on the top toolbar unlock before saving board order."));
  assert(source.includes("写入解锁已关闭，请先在顶部工具栏开启后再保存看板顺序。"));
  assert(source.includes('<label for="owner">${escapeHtml(t("Agent", "员工"))}</label>'));
  assert(source.includes('<label for="project">${escapeHtml(t("Project", "项目"))}</label>'));
  assert(source.includes('class="meta task-top-intro"'));
  assert(source.includes('class="task-top-meta-row"'));
  assert(source.includes('class="task-top-controls"'));
  assert(source.includes('class="filters task-top-filters"'));
  assert(source.includes(".task-top-filters {"));
  assert(source.includes(".task-top-controls .quick-chip {"));
  assert(source.includes('class="task-brief-copy"'));
  assert(source.includes('class="meta task-brief-hint"'));
  assert(source.includes('id="task-execution-chain"'));
  assert(source.includes('t("Execution chain",'));
  assert(source.includes('Accepted and spawned child sessions'));
  assert(source.includes('if (options.section === "calendar") sectionBody = projectsSection;'));
});

test("collaboration section is a standalone dashboard page with inline thread expanders", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  assert(source.includes('"collaboration"'));
  assert(source.includes('label: "Collaboration", blurb: "Agent handoffs and teamwork"'));
  assert(source.includes('label: "协作", blurb: "智能体交接与协同"'));
  assert(source.includes('activeSection === "collaboration"'));
  assert(source.includes('const collaborationSection = `'));
  assert(source.includes('id="collaboration-hub"'));
  assert(source.includes('id="collaboration-board"'));
  assert(source.includes('t("Team collaboration", "团队协作")'));
  assert(source.includes('t("Collaboration threads", "协作线程")'));
  assert(source.includes('data-collab-root'));
  assert(source.includes('data-collab-filter="multi-agent"'));
  assert(source.includes('data-collab-filter="primary-dispatched"'));
  assert(!source.includes('data-collab-filter="main-dispatched"'));
  assert(source.includes('collaboration-route-avatars'));
  assert(source.includes('collaboration-participant-label'));
  assert(source.includes('collaboration-thread-card'));
  assert(source.includes('deriveCollaborationTaskTitle({'));
  assert(source.includes('deriveInterSessionTaskTitle({'));
  assert(source.includes('pickUiText(language, "Cross-session communication", "跨会话通信")'));
  assert(source.includes('pickUiText(language, "Sending session", "发送会话")'));
  assert(source.includes('pickUiText(language, "Receiving session", "接收会话")'));
  assert(source.includes('pickUiText(input.language, "Parent accepted work", "父会话接到任务")'));
  assert(source.includes('pickUiText(input.language, "Parent opened child session", "父会话发起子会话")'));
  assert(source.includes('pickUiText(input.language, "Child session reply", "子会话最近回复")'));
  assert(source.includes('attachCollaborationRoomRefsToCards(collaborationThreadCards, collaborationRoomStates, options.language)'));
  assert(source.includes('renderCollaborationThreadCards(collaborationThreadCardsWithRoomRefs, options.language)'));
  assert(source.includes("renderAgentAvatarFrame({"));
  assert(source.includes('extraClassName: `collaboration-avatar${participant.current ? " is-current" : ""}`'));
  assert(source.includes(".collaboration-avatar.has-photo .agent-photo-image {"));
  assert(source.includes("object-position: center 34%;"));
  assert(source.includes('if (options.section === "collaboration") sectionBody = collaborationSection;'));
  assert(!source.includes('当前还没有看到跨智能体协作'));
  assert(!source.includes("Showing collaboration dispatched by Main"));
});

test("collaboration chat widget renders real avatar images when provided", async () => {
  const { renderCollaborationChatOverlay } = await import("../src/ui/collaboration-chat-widget");

  const html = renderCollaborationChatOverlay({
    language: "zh",
    preferences: {
      expanded: true,
      autoRefresh: true,
      lastReadSequence: 3,
    },
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    writeAccessEnabled: true,
    writeAccessAvailable: true,
    participants: [
      {
        agentId: "jarvis",
        displayName: "Jarvis",
        aliases: ["jarvis"],
        primary: true,
        statusTone: "idle",
        statusDotLabel: "空闲",
        currentWorkLabel: "正在处理什么",
        currentWork: "当前无实时任务",
        recentOutput: "最近暂无产出。",
        identity: {
          accent: "#0f62fe",
          imageHref: "/avatars/jarvis.png",
        },
      },
    ],
  });

  assert(html.includes('class="collab-chat-avatar has-photo"'));
  assert(html.includes('class="collab-chat-avatar-image" src="/avatars/jarvis.png"'));
  assert(html.includes("collab-chat-person-label"));
  assert(html.includes('data-collab-chat-roster'));
  assert(html.includes('data-collab-room-trigger'));
  assert(html.includes('data-collab-room-trigger-title'));
  assert(html.includes('data-collab-room-trigger-meta'));
  assert(html.includes('class="collab-chat-input-shell"'));
  assert(html.includes('data-collab-chat-person-card'));
  assert(html.includes('data-person-agent="jarvis"'));
  assert(html.includes('collab-chat-avatar-state idle'));
  assert(html.includes("collab-chat-event-headline"));
  assert(html.includes('data-write-enabled="1"'));
  assert(html.includes('data-write-available="1"'));
  assert(!html.includes('data-collab-chat-people'));
});

test("editable file workbench keeps shared files visible under each facet", async () => {
  const source = await readFile("src/ui/server-editable-files.ts", "utf8");

  assert(source.includes('const key = `${entry.facetKey ?? ""}::${resolve(entry.sourcePath)}`;'));
});

test("dashboard renders manual refresh and auto refresh controls with edit guards", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  const dashboardRuntimeSource = await readFile("src/ui/server-dashboard-runtime.ts", "utf8");
  assert(source.includes('data-dashboard-refresh-root'));
  assert(source.includes('data-dashboard-refresh-now'));
  assert(source.includes('data-dashboard-auto-refresh-toggle'));
  assert(source.includes('data-dashboard-mutation-toggle'));
  assert(source.includes('data-dashboard-auto-refresh-interval'));
  assert(source.includes('data-dashboard-refresh-status'));
  assert(source.includes("const dashboardRefreshGeneratedAt ="));
  assert(source.includes("docHubSnapshot.generatedAt"));
  assert(source.includes("agentTeamEmbed.runtime.updatedAt"));
  assert(source.includes('data-refresh-generated-at="${escapeHtml(dashboardRefreshGeneratedAt ?? "")}"'));
  assert(source.includes("openclaw:dashboard-refresh:v1"));
  assert(source.includes("window.__openclawSetRefreshGuard = setRefreshGuard;"));
  assert(source.includes("window.__openclawGetMutationAuthState = getMutationAuthState;"));
  assert(source.includes("window.__openclawGetMutationAuthHeaders = getMutationAuthHeaders;"));
  assert(source.includes("'doc-preview'"));
  assert(source.includes("'file-editor:' + scope"));
  assert(source.includes("'staff-model:' + agentId"));
  assert(source.includes('const refreshEndpoint = \'/api/dashboard/refresh\';'));
  assert(source.includes('const preferencesEndpoint = \'/api/ui/preferences\';'));
  assert(source.includes("await window.fetch(refreshEndpoint, {"));
  assert(source.includes("if (method === \"POST\" && path === \"/api/dashboard/refresh\") {"));
  assert(source.includes("async function refreshDashboardSources(toolClient: ToolClient): Promise<DashboardRefreshResult> {"));
  assert(source.includes('const { createDashboardRuntimeHelpers } = require("./server-dashboard-runtime");'));
  assert(source.includes("const dashboardRuntimeHelpers = createDashboardRuntimeHelpers({"));
  assert(dashboardRuntimeSource.includes("const refresh = await refreshAgentTeamServeSessionSnapshot({ workspaceRoot });"));
  assert(dashboardRuntimeSource.includes("invalidateDashboardRefreshCaches();"));
  assert(
    dashboardRuntimeSource.indexOf("const refresh = await refreshAgentTeamServeSessionSnapshot({ workspaceRoot });") <
      dashboardRuntimeSource.indexOf("invalidateDashboardRefreshCaches();"),
  );
  assert(dashboardRuntimeSource.includes("const docHubSnapshot = await loadStructuredDocHubSnapshot(snapshot, toolClient);"));
  assert(dashboardRuntimeSource.includes("agentTeamEmbed.runtime.updatedAt"));
  assert(source.includes("docsHubGeneratedAt"));
  assert(source.includes("docsHubEntryCount"));
  assert(source.includes("scopeLabels"));
});

test("agent team sidebar explains embedded snapshot freshness instead of implying live refresh", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  assert(source.includes("Embedded serve-session snapshot"));
  assert(source.includes("Last embedded update ${relative} (${model.runtime.updatedAt})"));
  assert(
    source.includes(
      "Use the dashboard refresh control to rebuild this snapshot from the latest persisted session state",
    ),
  );
  assert(source.includes("嵌入的 serve-session 导出"));
});

test("global visibility card keeps plain-language EN/ZH copy for four key signals", async () => {
  const { renderGlobalVisibilityCardForSmoke } = await import("../src/ui/server");

  const en = renderGlobalVisibilityCardForSmoke("en");
  assert(en.includes("Global Visibility"));
  assert(en.includes("One place to see timed jobs, heartbeat, current tasks, and tool calls."));
  assert(en.includes("Timed jobs:"));
  assert(en.includes("Heartbeat checks:"));
  assert(en.includes("Current tasks:"));
  assert(en.includes("Tool calls:"));
  assert(en.includes("Timed jobs are on."));
  assert(en.includes("Heartbeat is on."));
  assert(en.includes("Active timed jobs: 1."));
  assert(en.includes("Active heartbeat checks: 1."));
  assert(en.includes('/?compact=1&amp;section=overview&amp;lang=en&amp;quick=all#cron-health'));
  assert(en.includes('/?compact=1&amp;section=overview&amp;lang=en&amp;quick=all#heartbeat-health'));
  assert(en.includes('/?compact=1&amp;section=projects-tasks&amp;lang=en&amp;quick=all#tracked-task-view'));
  assert(en.includes('/?compact=1&amp;section=overview&amp;lang=en&amp;quick=all#tool-activity'));
  assert(!en.includes('href="/cron"'));
  assert(!en.includes('href="/sessions"'));

  const zh = renderGlobalVisibilityCardForSmoke("zh");
  assert(zh.includes("&amp;lang=zh&amp;quick=all#cron-health"));
  // assert(zh.includes("涓€鐪肩湅鍥涗欢浜嬶細瀹氭椂浠诲姟銆佷换鍔″績璺炽€佸綋鍓嶄换鍔°€佸伐鍏疯皟鐢ㄣ€?));
  // assert(zh.includes("瀹氭椂浠诲姟锛?));
  // assert(zh.includes("浠诲姟蹇冭烦锛?));
  // assert(zh.includes("褰撳墠浠诲姟锛?));
  // assert(zh.includes("宸ュ叿璋冪敤锛?));
  // assert(zh.includes("瀹氭椂浠诲姟姝ｅ湪杩愯銆?));
  // assert(zh.includes("浠诲姟蹇冭烦宸插紑鍚€?));
  // assert(zh.includes("宸插紑鍚畾鏃朵换鍔★細1 涓€?));
  // assert(zh.includes("宸插紑鍚换鍔″績璺筹細1 涓€?));
  assert(!zh.includes("Global Visibility"));
  assert(!zh.includes("Schedule checks (cron):"));
  assert(!zh.includes("Heartbeat checks:"));
  assert(!zh.includes("Tasks in progress:"));
  assert(zh.includes('/?compact=1&amp;section=overview&amp;lang=zh&amp;quick=all#cron-health'));
  assert(zh.includes('/?compact=1&amp;section=overview&amp;lang=zh&amp;quick=all#heartbeat-health'));
  assert(zh.includes('/?compact=1&amp;section=projects-tasks&amp;lang=zh&amp;quick=all#tracked-task-view'));
  assert(zh.includes('/?compact=1&amp;section=overview&amp;lang=zh&amp;quick=all#tool-activity'));
  assert(!zh.includes('href="/cron"'));
  assert(!zh.includes('href="/sessions"'));
});

test("empty task wall still shows live runtime signals instead of a blank board", async () => {
  const { renderTaskBoardEmptyStateForSmoke } = await import("../src/ui/server");
  const source = await readFile("src/ui/server.ts", "utf8");

  const en = renderTaskBoardEmptyStateForSmoke("en");
  assert(en.includes("No task or schedule cards yet."));
  assert(
    en.includes(
      "The wall is empty for now, but the live signals below still show whether timed jobs, heartbeat, current tasks, or tool calls are alive.",
    ),
  );
  assert(en.includes("Timed jobs:"));
  assert(en.includes("Heartbeat checks:"));
  assert(en.includes("Current tasks:"));
  assert(en.includes("Tool calls:"));
  assert(en.includes('/?compact=1&amp;section=overview&amp;lang=en&amp;quick=all#cron-health'));
  assert(en.includes('/?compact=1&amp;section=projects-tasks&amp;lang=en&amp;quick=all#tracked-task-view'));
  assert(source.includes("renderTaskBoard(taskBoardCards, options.language, options.taskCardOrder, globalVisibilityModel);"));
  assert(source.includes('class="empty-state task-empty-state"'));
  assert(source.includes('data-task-empty-signals'));
  assert(source.includes("renderGlobalVisibilityStrip(emptyStateModel, language)"));
});

test("timed job schedule labels are translated into plain-language cadence", async () => {
  const { humanizeTimedJobScheduleLabelForSmoke, humanizeTimedJobWindowLabelForSmoke } = await import("../src/ui/server");

  assert.equal(humanizeTimedJobScheduleLabelForSmoke("system interval", "zh"), "自动轮询");
  assert.equal(humanizeTimedJobScheduleLabelForSmoke("cron 10 3 * * *", "zh"), "每天 03:10");
  assert.equal(humanizeTimedJobScheduleLabelForSmoke("cron 35 */6 * * *", "zh"), "每 6 小时");
  assert.equal(humanizeTimedJobScheduleLabelForSmoke("cron 20 3 * * 1", "zh"), "周一 03:20");
  assert.equal(humanizeTimedJobWindowLabelForSmoke("2026-03-14T16:35:08.249Z", 43, "zh"), "43秒后");
});

test("overview and task certainty lean on runtime evidence instead of manual due or blocked fields", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  const commanderSource = await readFile("src/runtime/commander.ts", "utf8");

  assert(source.includes('const pendingDecisionCount = actionQueue.counts.unacked;'));
  assert(source.includes("const sessionErrorCount = exceptions.errors.length;"));
  assert(source.includes('const sessionBlockedCount = exceptions.blocked.filter((session) => session.state === "blocked").length;'));
  assert(source.includes('const stalledRunningSessionCount = countStalledRunningSessions('));
  assert(source.includes('t("Review queue",'));
  assert(source.includes('t("Runtime issues",'));
  assert(source.includes('t("Stalled runs",'));
  assert(source.includes('pickUiText(input.language, "No execution session is linked yet.",'));
  assert(source.includes('pickUiText(input.language, "A linked session is blocked.",'));
  assert(!source.includes('const pendingDecisionCount = actionQueue.counts.unacked + pendingApprovalsCount;'));
  assert(!source.includes('const sessionErrorCount = snapshot.sessions.filter((session) => session.state === "error").length;'));
  assert(!source.includes('if (task.dueAt) score += 8;'));
  assert(!source.includes('if (task.status === "blocked") score -= 18;'));
  assert(!source.includes('if (overdue) score -= 18;'));
  assert(commanderSource.includes("const CURRENT_RUNTIME_ISSUE_WINDOW_MS = 6 * 60 * 60 * 1000;"));
  assert(commanderSource.includes("isFreshRuntimeIssueSession(s.lastMessageAt, nowMs)"));
});

test("execution chain cards keep raw JSON out of visible titles and summaries", async () => {
  const { renderTaskExecutionChainCardsForSmoke } = await import("../src/ui/server");
  const source = await readFile("src/ui/server.ts", "utf8");

  const zh = renderTaskExecutionChainCardsForSmoke("zh");
  assert(zh.includes("Jarvis"));
  assert(zh.includes("locked"));
  assert(zh.includes("30"));
  // assert(zh.includes("宸叉帴鍗?路 宸叉淳鍙?路 浼氳瘽閿帹鏂?路 鎺ㄦ柇鍊?));
  assert(zh.includes('class="execution-chain-context"'));
  assert(zh.includes('class="execution-chain-flow"'));
  assert(zh.includes('class="execution-chain-summary"'));
  assert(!zh.includes('<strong>{&quot;ok&quot;:true'));
  assert(!zh.includes('<strong>{&quot;ok&quot;:false'));
  assert(!zh.includes('&quot;attemptedQueries&quot;:30'));
  assert(!zh.includes('&quot;error&quot;:&quot;locked&quot;'));
  assert(!zh.includes("accepted=yes | spawned=yes"));
  assert(source.includes("grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr));"));
  assert(source.includes(".execution-chain-context {"));
  assert(source.includes(".execution-chain-flow {"));
  assert(source.includes(".execution-chain-summary {"));
});

test("dashboard keeps global visibility as overview-only block", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  const readModelSource = await readFile("src/ui/server-read-model.ts", "utf8");
  const usageSource = await readFile("src/runtime/usage-cost.ts", "utf8");
  assert(source.includes('data-ui-polish="apple-native-v3"'));
  assert(source.includes("const globalVisibilityCard = renderGlobalVisibilityCard(globalVisibilityModel, options.language);"));
  assert(source.includes("const globalVisibilityQuickRows = ["));
  assert(source.includes("const sidebarSignalRows ="));
  assert(
    source.includes(
      "const globalVisibilityBlock = options.section === \"overview\" ? globalVisibilityCard : \"\";",
    ),
  );
  assert(source.includes('<div class="content-stack">${globalVisibilityBlock}${sectionBody}</div>'));
  assert(source.includes("heartbeat: enabledHeartbeatCount"));
  assert(source.includes("const toolCallsCount = input.toolCallsCount ?? (await countRecentToolCalls(snapshot, toolClient));"));
  assert(source.includes("if (typeof item.toolEventCount === \"number\") return sum + item.toolEventCount;"));
  assert(source.includes("const scheduleSignalText = scheduleRow?.currentAction ?? noSignalText;"));
  assert(source.includes("<small>${escapeHtml(scheduleSignalText)}</small>"));
  assert(source.includes('const language: UiLanguage = hasExplicitLanguage ? resolvedLanguage : "zh";'));
  assert(!source.includes("const recentToolCallsCount = sessionPreview.items.filter((item) => item.latestKind === \"tool_event\").length;"));
  assert(source.includes("const languageToggle = renderLanguageToggle(filters, options);"));
  assert(source.includes("${languageToggle}"));
  assert(source.includes('<section class="overview-v3-shell" id="overview-decision-home">'));
  assert(source.includes('id="overview-decision-center"'));
  assert(source.includes('id="overview-busy-staff"'));
  assert(source.includes('id="overview-runtime-checkpoint"'));
  assert(source.includes('t("Isolated execution",'));
  assert(source.includes('Accepted and spawned child sessions'));
  assert(source.includes("${sidebarSignalRows}"));
  assert(source.includes("Open current tasks"));
  assert(source.includes("Open current tasks"));
  assert(source.includes("Open follow-up items"));
  // assert(source.includes("鏌ョ湅寰呭鐞?));
  assert(source.includes("formatSeconds(job.dueInSeconds, options.language)"));
  assert(!source.includes("formatSeconds(job.dueInSeconds))"));
  assert(source.includes("const spriteBoundsCache = new Map();"));
  assert(source.includes("const computeSpriteBounds = (sprite) => {"));
  assert(source.includes("Recommended data connections"));
  assert(!source.includes("const informationCertaintyCard = renderInformationCertaintyCard(informationCertainty, options.language);"));
  assert(!source.includes("const taskCertaintySection = renderTaskCertaintySection(taskCertaintyCards, options.language);"));
  assert(!source.includes("${informationCertaintyCard}"));
  assert(!source.includes("${taskCertaintySection}"));
  assert(source.includes('const usageCostMode: UsageCostMode = "full";'));
  assert(source.includes("loadCachedUsageCost(snapshot, usageCostMode)"));
  assert(source.includes("loadCachedOfficeSessionPresence()"));
  assert(source.includes("loadCachedTaskEvidenceSessions("));
  assert(source.includes("const collaborationPreviewSessionKeys = new Set(collaborationPreview.items.map(item => item.sessionKey.trim()).filter(Boolean));"));
  assert(source.includes("const taskSignalItems = needsCollaborationThreads ? collaborationPreview.items : mergeSessionConversationItems(taskEvidenceItems, sessionPreview.items);"));
  assert(source.includes("const collaborationSessionKeys = needsCollaborationThreads ? collectCollaborationEvidenceSessionKeys(collaborationPreview.items) : [];"));
  assert(source.includes("const collaborationEvidenceItems = needsCollaborationThreads && collaborationSessionKeys.length > 0 ? await loadCachedTaskEvidenceSessions(snapshot, toolClient, collaborationSessionKeys, 6) : [];"));
  assert(source.includes("includeSnapshotUnmappedSessions: !needsCollaborationThreads"));
  assert(source.includes("const liveSessionCount = officePresence.totalActiveSessions;"));
  assert(source.includes("buildTaskDetailHref(task.taskId, input.language)"));
  assert(source.includes('const language = resolveUiLanguage(url.searchParams, "zh");'));
  assert(source.includes('buildUsageCostSnapshot(snapshot, mode)'));
  assert(source.includes('const needsSessionPreview ='));
  assert(source.includes('activeSection === "projects-tasks" || activeSection === "overview";'));
  assert(source.includes("const allApprovals = [...(snapshot.approvals ?? [])].sort(compareApprovals);"));
  assert(source.includes('const pendingApprovalsCount = allApprovals.filter((item) => item.status === "pending").length;'));
  assert(source.includes("replayPreview.stats.timeline.total"));
  assert(source.includes('t("Replay activity",'));
  assert(source.includes('t("Approval requests",'));
  assert(source.includes('route: "/?section=projects-tasks&quick=attention#tracked-task-view"'));
  assert(source.includes('route: "/audit"'));
  assert(source.includes('route: "/digest/latest"'));
  assert(source.includes("void primeUiRenderCaches(toolClient);"));
  assert(source.includes('const { createReadModelHelpers } = require("./server-read-model");'));
  assert(source.includes("const readModelHelpers = createReadModelHelpers({"));
  assert(readModelSource.includes("const sourceStamp = await readReadModelSourceStamp();"));
  assert(readModelSource.includes("const sessions = mapSessionsListToSummaries(live);"));
  assert(!source.includes('state: item.active ? "running" : "idle"'));
  assert(usageSource.includes("const USAGE_SOURCE_CACHE_TTL_MS = 10_000;"));
  assert(usageSource.includes("loadCachedRuntimeUsageData()"));
  assert(usageSource.includes("loadCachedSubscriptionUsage()"));
  assert(source.includes('t("See four signals in overview",'));
  assert(source.includes('t("Data source not connected",'));
  assert(source.includes('t("Recent usage",'));
  assert(!source.includes("task.sessionKeys.slice(0, 6)"));
  // assert(source.includes("纭畾鎬у垽鏂?));
});

test("heartbeat API routes are implemented in UI server", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  assert(source.includes('if (method === "GET" && path === "/api/tasks/heartbeat")'));
  assert(source.includes('if (method === "POST" && path === "/api/tasks/heartbeat")'));
  assert(source.includes("runTaskHeartbeat({ gate })"));
});

test("overview focus ring keeps a compact English label and stable inner layout", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  // assert(source.includes('aria-label="${escapeHtml(t("Health score", "鍋ュ悍鍒?))}"'));
  // assert(source.includes('t("Health", "鍋ュ悍鍒?)'));
  assert(source.includes("grid-template-rows: auto auto;"));
  assert(source.includes("justify-items: center;"));
  assert(source.includes("text-align: center;"));
  assert(source.includes("max-width: 56px;"));
});

test("overview page title expands to Overview Control Center in English only", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  assert(source.includes('function resolveDashboardSectionTitle(section: DashboardSectionLink, language: UiLanguage): string {'));
  assert(source.includes('if (language === "en" && section.key === "overview") {'));
  assert(source.includes('return "Overview Control Center";'));
  assert(source.includes("const sectionTitle = resolveDashboardSectionTitle(sectionMeta, options.language);"));
  assert(source.includes('<h2 class="section-title">${escapeHtml(sectionTitle)}</h2>'));
});

test("usage dashboard includes token type share and cron token share sections", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  assert(source.includes('renderTokenPieChart(usageSessionTypeRows, usageSessionTypeTotalTokens, t("All sessions",'));
  assert(source.includes('t("Total timed-job usage",'));
  // assert(source.includes("瀹氭椂浠诲姟鍐呭悇鏅鸿兘浣撳崰姣?));
  assert(source.includes("usage_view"));
  assert(source.includes('usageView === "today" ? "today" : "cumulative"'));
  assert(source.includes('usageCost.periods.filter((item) => item.key === "today" || item.key === "7d")'));
  // assert(source.includes("瀹氭椂浠诲姟銆丏iscord銆乀elegram銆佸唴閮ㄤ細璇?));
  assert(source.includes("renderTokenShareRows("));
  assert(source.includes("usageCost.breakdownToday"));
  assert(source.includes("selectedUsageBreakdown.bySessionType"));
  assert(source.includes("selectedUsageBreakdown.byCronJob"));
  assert(source.includes("selectedUsageBreakdown.byCronAgent"));
});

test("dashboard wires CLI insight cards into overview, usage, memory, and settings", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  const normalizedSource = source.replace(/\r\n/g, "\n");
  assert(source.includes('id="overview-connection-health"'));
  assert(source.includes('pickUiText(language, "Connection health", "接线状态")'));
  assert(source.includes('pickUiText(language, "Gateway", "网关")'));
  assert(source.includes('6 项关键用量数据里，已经接上 ${connectedCount} 项，还差 1 项：${gapLabel}。${impact}${action}'));
  assert(source.includes("去设置页补上订阅或账单快照即可。"));
  assert(source.includes('const needsSettingsInsights = activeSection === "settings";'));
  assert(source.includes('id="settings-environment-status"'));
  assert(source.includes('pickUiText(language, "System environment status", "系统环境状态")'));
  assert(source.includes("renderSettingsEnvironmentStatusCard("));
  assert(source.includes("renderSettingsConfigAccessCard("));
  assert(source.includes("settingsBudgetLimitCard"));
  assert(source.includes("renderSettingsConnectionPanel("));
  assert(source.includes("renderSettingsSecurityPanel("));
  assert(source.includes("renderSettingsUpdatePanel("));
  assert(normalizedSource.includes("const settingsSection = `\n    ${settingsEnvironmentStatusCard}"));
  assert(normalizedSource.includes("${settingsConfigAccessCard}"));
  assert(!normalizedSource.includes("${settingsConfigAccessCard}\n    ${settingsBudgetLimitCard}\n    <section class=\"card\">"));
  assert(source.includes('id="session-context-pressure"'));
  assert(source.includes('pickUiText(language, "Context pressure", "上下文压力")'));
  assert(normalizedSource.includes("</section>\n    ${contextPressureCard}\n    <details class=\"card compact-details\">"));
  assert(source.includes('id="memory-status-card"'));
  assert(source.includes('pickUiText(language, "Memory status", "记忆状态")'));
  assert(normalizedSource.includes("${memoryWorkbench}\n    ${memoryStateSection}"));
  assert(source.includes('id="settings-connection-health"'));
  assert(source.includes('id="security-risk-summary"'));
  assert(source.includes('pickUiText(language, "Security risk summary", "安全风险摘要")'));
  assert(source.includes('title: "反向代理信任尚未配置"'));
  assert(source.includes('title: "检测到可能的多人共享使用场景"'));
  assert(source.includes('id="update-status-card"'));
  assert(source.includes('pickUiText(language, "Update status", "更新状态")'));
  assert(source.includes('id="tool-connectors"'));
  assert(source.includes('t("System config and data access", "系统配置与数据接入")'));
  assert(source.includes('id="settings-budget-limit"'));
  assert(source.includes('data-budget-limit-root'));
  assert(source.includes('renderSettingsBudgetLimitCard('));
  assert(source.includes('"embedded"'));
  assert(source.includes('settings-inline-budget'));
  assert(source.includes('renderSettingsConfigAccessCard(\n    importGuardRows,\n    usageConnectorTodos,\n    settingsBudgetLimitCard,\n    options.language,'));
  assert(source.includes("/api/settings/budget-limit"));
  assert(source.includes('scope: "runtime"'));
  assert(source.includes("agent.main.cost"));
  assert(source.includes("data-budget-limit-input"));
  assert(source.includes("data-budget-limit-save"));
  assert(source.includes("data-budget-limit-clear"));
  assert(!source.includes('高级预算 JSON 工作台'));
  assert(source.includes('t("Safety switches", "安全开关")'));
  assert(source.includes('t("Recommended data connections", "数据接入建议")'));
  assert(source.includes(".settings-status-grid {"));
  assert(source.includes(".settings-status-panel {"));
  assert(source.includes('if (label === "stable (default)") return "稳定版（默认）";'));
});

test("memory, workspace, and runtime sections expose editable file workbenches", async () => {
  const serverSource = (await readFile("src/ui/server.ts", "utf8")).replace(/\r\n/g, "\n");
  const docsHubSource = (await readFile("src/ui/docs-hub.ts", "utf8")).replace(/\r\n/g, "\n");
  const source = `${serverSource}\n${docsHubSource}`;
  assert(source.includes("/api/files"));
  assert(source.includes("/api/files/content"));
  assert(source.includes('const EDITABLE_FILE_SCOPES = ["memory", "workspace", "runtime"] as const;'));
  assert(source.includes("const EDITABLE_FILE_SCOPE_ERROR = `scope must be one of: ${EDITABLE_FILE_SCOPES.join(\", \")}`;"));
  assert(source.includes('title: t("Memory file workbench",'));
  assert(source.includes('buildRuntimeBudgetPolicyStarterContent()'));
  assert(source.includes("renderSettingsBudgetLimitScript("));
  assert(source.includes("window.__openclawTriggerDashboardRefresh('manual')"));
  assert(
    source.includes(
      'const mainMemoryFacetLabel =\n    memoryFacetOptions.find((item) => item.key === "main")?.label ?? DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME;',
    ),
  );
  assert(source.includes('${escapeHtml(mainMemoryFacetLabel)} ${escapeHtml(t("memories",'));
  assert(source.includes('${escapeHtml(t("Available views",'));
  assert(source.includes('const agentProfileFiles = ["MEMORY.md"];'));
  assert(!source.includes('const agentProfileFiles = ["MEMORY.md", "USER.md", "SOUL.md", "IDENTITY.md"];'));
  assert(source.includes('const SHARED_DOCUMENT_FILE_CANDIDATES = ['));
  assert(source.includes('const AGENT_DOCUMENT_FILE_CANDIDATES = ['));
  assert(source.includes('"IDENTITY.md"'));
  assert(source.includes('"SOUL.md"'));
  assert(source.includes('"USER.md"'));
  assert(source.includes('"TASKS.md"'));
  assert(source.includes('"BOOTSTRAP.md"'));
  assert(source.includes("listMemoryFacetOptions()"));
  assert(source.includes("listWorkspaceFacetOptions()"));
  assert(source.includes("facetOptions: memoryFacetOptions"));
  assert(!source.includes("facetOptions: workspaceFacetOptions"));
  assert(source.includes('title: basename(input.sourcePath) || relativePath,'));
  assert(source.includes("defaultFacetKey: \"main\""));
  assert(source.includes("defaultFacetKey: \"main\""));
  assert(source.includes("includeAllFacet: false"));
  assert(source.includes("data-default-facet"));
  assert(source.includes(".file-nav-item[hidden]"));
  assert(source.includes("item.style.display = visible ? \"\" : \"none\";"));
  assert(source.includes("currentGroup"));
  assert(source.includes("Pick a file from the left."));
  assert(source.includes("data-file-facet"));
  assert(source.includes("const normalizeFacetKey = (value) => String(value || 'all').trim().toLowerCase() || 'all';"));
  assert(source.includes(".segment-switch {"));
  assert(source.includes("display: inline-flex;"));
  assert(source.includes("flex-wrap: wrap;"));
  assert(source.includes(".segment-item {"));
  assert(source.includes("appearance: none;"));
  assert(source.includes("border: none;"));
  assert(source.includes("background: transparent;"));
  assert(source.includes("min-height: 40px;"));
  assert(source.includes(".file-facet-switch .segment-item {"));
  assert(source.includes(".file-facet-switch .segment-item.active {"));
  // assert(source.includes("鏂囨。宸ヤ綔鍙?));
  assert(source.includes('t("Document overview",'));
  assert(
    source.includes(
      'const mainDocumentFacetLabel =\n    input.workspaceFacetOptions.find((item) => item.key === "main")?.label ?? DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME;',
    ),
  );
  assert(source.includes('${escapeHtml(mainDocumentFacetLabel)} ${escapeHtml(t("documents",'));
  assert(source.includes('const docsSection = await renderDocsSectionFromDocsHub({'));
  assert(source.includes('const docEntries = await loadDocHubEntries(input.docHubSnapshot.items);'));
  assert(source.includes('buildDocEntryViewModels(docEntries, input.agentScopes, input.projectSummaries, input.language)'));
  assert(source.includes('renderDocSummaryCards(recentDocCards, input.language)'));
  assert(source.includes("buildAgentDocCoverage(input.agentScopes, input.workspaceFiles)"));
  assert(source.includes("renderAgentDocCoverageGrid(agentDocCoverage, input.language)"));
  assert(source.includes('renderProjectDocGroups(projectDocGroups, input.language)'));
  assert(source.includes('t("What changed recently", "最近该看什么")'));
  assert(source.includes('t("Staff docs", "员工文档")'));
  assert(source.includes('t("Project document view", "按项目查看文档")'));
  assert(source.includes('t("Chat-derived notes", "聊天沉淀文档")'));
  assert(source.includes("input.docHubSnapshot.detail"));
  assert(source.includes("renderStructuredChatDocSummary(input.docHubSnapshot.items)"));
  assert(source.includes('export function buildAgentDocCoverageForSmoke('));
  assert(source.includes('const TEAM_CORE_DOCUMENTS = ['));
  assert(source.includes('"AGENTS.md"'));
  assert(source.includes('"BOOTSTRAP.md"'));
  assert(source.includes('"HEARTBEAT.md"'));
  assert(source.includes('"TOOLS.md"'));
  assert(!source.includes("workspaceWorkbenchHtml"));
  assert(source.includes('path === "/api/docs/preview"'));
  assert(source.includes('docId is required.'));
  assert(source.includes('export async function loadDocPreviewEntry('));
  assert(source.includes("data-doc-preview-trigger"));
  assert(source.includes("data-doc-preview-dialog"));
  assert(source.includes("renderDocPreviewModal(input.language)"));
  assert(source.includes("renderDocPreviewTrigger(entry, \"doc-summary-card\""));
  assert(source.includes("renderDocPreviewTrigger(entry, \"doc-project-trigger\""));
  assert(source.includes("data-doc-preview-edit"));
  assert(source.includes("data-doc-preview-save"));
  assert(source.includes("data-doc-preview-editor"));
  assert(source.includes("data-doc-file-scope=\"workspace\""));
  assert(source.includes("data-doc-file-path="));
  assert(!source.includes("const fileScope = (trigger.getAttribute('data-doc-file-scope') || '').trim();\n      if (!docId) return;"));
  assert(source.includes("/api/docs/preview?docId="));
  assert(source.includes("/api/files/content?scope="));
  assert(source.includes("method: 'PUT'"));
  assert(source.includes(".doc-summary-grid {"));
  assert(source.includes(".doc-summary-card {"));
  assert(source.includes(".doc-coverage-grid {"));
  assert(source.includes(".doc-coverage-card {"));
  assert(source.includes(".doc-coverage-pill.ready {"));
  assert(source.includes(".doc-coverage-pill.missing {"));
  assert(source.includes(".doc-preview-toolbar {"));
  assert(source.includes(".doc-preview-editor {"));
  assert(source.includes("overflow-wrap: anywhere;"));
  assert(source.includes("-webkit-line-clamp: 3;"));
  assert(source.includes("-webkit-line-clamp: 6;"));
  assert(source.includes(".doc-project-grid {"));
  assert(source.includes(".doc-preview-dialog {"));
  assert(source.includes(".doc-preview-body {"));
  assert(source.includes(".doc-project-trigger {"));
  assert(source.includes("Markdown files that matter most"));
  // assert(source.includes("涓嶅啀鎸変細璇濆巻鍙插睍绀烘枃妗?));
  assert(source.includes("resolveEditableAgentScopesFromConfig("));
  assert(source.includes("loadEditableAgentScopesFromConfig()"));
  assert(source.includes("loadEditableAgentScopesFromWorkspaceDirs()"));
  assert(source.includes("data-quota-reset-at"));
  assert(source.includes("renderQuotaResetScript()"));
  assert(source.includes("new Intl.DateTimeFormat(undefined"));
  assert(source.includes("OPENCLAW_WORKSPACE_ROOT"));
  // assert(source.includes("淇濆瓨鍚庝細鐩存帴鍐欏洖婧愭枃浠?));
  assert(source.includes('t("Write access is on. Changes save straight back to the source file.", "写入解锁已开启，改动会直接写回源文件。")'));
  assert(source.includes('t("Write access is off. Use the top toolbar unlock before editing or saving.", "写入解锁已关闭，请先在顶部工具栏开启后再编辑或保存。")'));
  assert(source.includes('t("This machine has not set a safety passcode yet, so saving is blocked for now.", "这台机器还没设置安全口令，所以这里暂时不能保存。")'));
  assert(!source.includes('data-file-token'));
  assert(!source.includes('LOCAL_API_TOKEN is not configured in this environment.'));
  assert(source.includes("renderFileWorkbenchScript()"));
  assert(source.includes('t("Staff overview",'));
  assert(source.includes('t("The default view shows only name, role, current status, current work, recent output, and whether each person is on the schedule."'));
  assert(source.includes('id="agent-team-team-panel"'));
  assert(source.includes('t("Open project role mapping", "查看项目角色映射")'));
  const staffOverviewSource = await readFile("src/ui/server-staff-overview.ts", "utf8");
  assert(source.includes("async function resolveStaffRoleLabel("));
  assert(source.includes('const { createStaffOverviewHelpers } = require("./server-staff-overview");'));
  assert(source.includes("const staffOverviewHelpers = createStaffOverviewHelpers({"));
  assert(staffOverviewSource.includes('return pickUiText(language, "YouTube to article writing",'));
  assert(staffOverviewSource.includes('return pickUiText(language, "High-value content creation",'));
  assert(staffOverviewSource.includes('return pickUiText(language, "Control Center delivery",'));
  assert(staffOverviewSource.includes('return pickUiText(language, "Daily news and trend briefings",'));
  assert(staffOverviewSource.includes('return pickUiText(language, "Personal assistance and reminders",'));
  assert(staffOverviewSource.includes('return pickUiText(language, "Security and updates",'));
  assert(staffOverviewSource.includes('return pickUiText(language, "Role not defined in workspace",'));
  assert(source.includes('function staffStatusLabel('));
  assert(source.includes('function resolveStaffStatusDotTone('));
  assert(source.includes('function staffStatusDotLabel('));
  assert(source.includes('pickUiText(language, "Status",'));
  assert(source.includes('pickUiText(language, "Working on",'));
  assert(source.includes('pickUiText(language, "Recent output",'));
  assert(source.includes('pickUiText(language, "In schedule",'));
  assert(source.includes('pickUiText(language, "Model", "模型")'));
  assert(source.includes('pickUiText(language, "Save model", "保存模型")'));
  assert(source.includes('const staffOverviewCards = needsTeamSnapshot'));
  assert(source.includes("modelOptions: teamSnapshot.modelOptions"));
  assert(source.includes("modelEditable: teamSnapshot.modelEditable"));
  assert(source.includes("configPath: teamSnapshot.sourcePath"));
  assert(source.includes("data-staff-model-root"));
  assert(source.includes("data-staff-model-select"));
  assert(source.includes("data-staff-model-save"));
  assert(source.includes("data-staff-model-status"));
  assert(source.includes("renderStaffModelScript()"));
  assert(source.includes('/api/staff/'));
  assert(source.includes('path.startsWith("/api/staff/") && path.endsWith("/model")'));
  assert(source.includes('assertMutationAuthorized(req, "/api/staff/:agentId/model")'));
  assert(source.includes("async function updateOpenClawAgentModel("));
  assert(source.includes("collectOpenClawModelOptions("));
  assert(source.includes(".staff-brief-grid {\n      margin-top: 12px;\n      display: grid;\n      grid-template-columns: repeat(3, minmax(0, 1fr));"));
  assert(source.includes("gap: 10px;"));
  assert(source.includes("grid-template-columns: 96px minmax(0, 1fr);"));
  assert(source.includes("width: 96px;"));
  assert(source.includes(".staff-brief-value {"));
  assert(source.includes(".staff-brief-value.clamp-2 {"));
  assert(source.includes(".staff-brief-value.clamp-3 {"));
  assert(source.includes(".staff-status-dot,"));
  assert(source.includes(".staff-status-dot.idle,"));
  assert(source.includes(".staff-status-dot.working,"));
  assert(source.includes(".staff-status-dot.issue,"));
  assert(source.includes("grid-template-columns: minmax(0, 1fr) auto;"));
  assert(source.includes(".staff-model-status:empty {"));
  assert(source.includes('<span class="staff-status-dot ${escapeHtml(card.statusTone)}"'));
  assert(source.includes('<canvas class="agent-pixel-canvas" width="${input.canvasWidth}" height="${input.canvasHeight}"></canvas>'));
  assert(source.includes("querySelectorAll('.agent-avatar, .staff-avatar')"));
  assert(source.includes('data-animal="${escapeHtml(input.identity.animal)}"'));
  assert(source.includes('t("Shared staff mission",'));
  assert(!source.includes('t("Staff system details",'));
  assert(!source.includes('pickUiText(language, "Tool profile", "工具权限")'));
  assert(!source.includes('pickUiText(language, "Workspace", "工作目录")'));
  assert(!source.includes('pickUiText(language, "Config source", "配置来源")'));
  assert(source.includes("renderOfficeCards("));
  assert(source.includes("no network polling and no extra token usage"));
  assert(source.includes("window.requestAnimationFrame(step);"));
  assert(source.includes("headers[\"cache-control\"] = \"no-store, no-cache, must-revalidate, max-age=0\";"));
  assert(source.includes("headers.pragma = \"no-cache\";"));
  assert(source.includes("headers.expires = \"0\";"));
  assert(!source.includes('return pickUiText(language, "Fast execution",'));
  assert(!source.includes('return pickUiText(language, "Planning and organization",'));
  // assert(!source.includes("Workspace 鏂囦欢宸ヤ綔鍙?));
  assert(!source.includes("鑱婂ぉ杈撳嚭缁撴瀯鍖栧叆搴擄紙"));
  assert(!source.includes("鍔炲叕瀹?2D 瀹炲喌"));
  assert(!source.includes("瀹屾暣鏅鸿兘浣撳悕褰曪紙"));
  assert(!source.includes("office-scene-stage"));
  assert(!source.includes("zone-watercooler"));
});

test("staff recent activity falls back to agent-team runtime artifacts when session history is absent", async () => {
  const { buildStaffRecentActivityFallbackFromAgentTeamEmbedForSmoke } = await import("../src/ui/server");

  const embed: AgentTeamEmbedSnapshot = {
    available: true,
    workspaceLabel: "agent-team",
    generatedAt: "2026-03-14T00:10:00.000Z",
    scenarioKey: "active-supervision",
    sourceKind: "runtime",
    summary: {
      memberCount: 7,
      keyDocCount: 0,
      pilotAssetCount: 0,
      memoryCount: 0,
      runCount: 1,
      pendingJobCount: 0,
      activeSupervisionCount: 0,
    },
    runtime: {},
    dashboard: {
      attentionItemsCount: 0,
      nextActionsCount: 0,
      jobsCount: 0,
      supervisionCount: 0,
    },
    teamMembers: [],
    keyDocs: [],
    pilotAssets: [],
    recentMemory: [],
    runs: [
      {
        runId: "run-fixture-detail-1",
        status: "attention",
        warningCount: 1,
        failureCount: 0,
        artifactCount: 1,
        eventCount: 1,
        updatedAt: "2026-03-14T00:00:00.000Z",
      },
    ],
    focusedRun: {
      runId: "run-fixture-detail-1",
      status: "attention",
      warningCount: 1,
      failureCount: 0,
      artifactCount: 1,
      eventCount: 1,
      updatedAt: "2026-03-14T00:00:00.000Z",
      pendingCount: 0,
      processedCount: 0,
      deliverables: [],
      facts: [],
    },
    artifacts: [
      {
        file: "01-dispatcher.md",
        stage: "dispatcher",
        sourceRole: "dispatcher",
        updatedAt: "2026-03-14T00:00:00.000Z",
        noteCount: 0,
      },
    ],
    previewArtifact: undefined,
    timeline: [
      {
        kind: "stage_validated",
        stage: "dispatcher",
        detail: "fixture dispatcher validation passed",
        timestamp: "2026-03-14T00:10:00.000Z",
      },
    ],
    sources: {
      workspaceRoot: "/tmp/agent-team",
      publicDir: "/tmp/agent-team/public",
      projectContextPath: "/tmp/agent-team/project-context.json",
      fixtureManifestPath: "/tmp/agent-team/manifest.json",
    },
  };

  const zh = buildStaffRecentActivityFallbackFromAgentTeamEmbedForSmoke(embed, ["dispatcher", "qa"], "zh");
  assert(((zh.get("dispatcher")?.recentOutput ?? "").length) > 0);
  assert(!(zh.get("dispatcher")?.recentOutput ?? "").includes("dispatch planning"));
  assert.equal(zh.has("qa"), false);

  const en = buildStaffRecentActivityFallbackFromAgentTeamEmbedForSmoke(embed, ["dispatcher"], "en");
  assert.match(en.get("dispatcher")?.recentOutput ?? "", /dispatch planning/i);
});

test("editable agent scopes follow configured agents before workspace folders", async () => {
  const {
    resolveOpenClawWorkspaceRootForSmoke,
    resolveEditableAgentScopesFromConfigForSmoke,
    resolveEditableAgentScopesWithFallbackForSmoke,
  } = await import("../src/ui/server");

  assert.equal(
    resolveOpenClawWorkspaceRootForSmoke({
      openclawHomeDir: "/home/test/.openclaw",
      configPath: "/home/test/.openclaw/openclaw.json",
      configText: JSON.stringify({
        agents: {
          list: [
            { id: "main" },
            { id: "pandas", workspace: "/srv/openclaw/workspace/agents/pandas" },
          ],
        },
      }),
    }),
    resolve("/srv/openclaw/workspace"),
  );
  assert.equal(
    resolveOpenClawWorkspaceRootForSmoke({
      explicitWorkspaceRoot: "/data/openclaw/workspace",
      openclawHomeDir: "/home/test/.openclaw",
    }),
    resolve("/data/openclaw/workspace"),
  );
  assert.equal(
    resolveOpenClawWorkspaceRootForSmoke({
      openclawHomeDir: "/home/test/.openclaw",
    }),
    join("/home/test/.openclaw", "workspace"),
  );

  const scopes = resolveEditableAgentScopesFromConfigForSmoke({
    agents: {
      list: [
        { id: "main", name: "Jarvis", workspace: "/tmp/main" },
        { id: "pandas", workspace: "/tmp/pandas" },
        { id: "tiger", workspace: "/tmp/tiger" },
      ],
    },
  });

  assert.equal(scopes[0]?.facetKey, "main");
  assert.equal(scopes[0]?.facetLabel, "Jarvis");
  assert.deepEqual(
    scopes.map((item) => item.facetKey),
    ["main", "pandas", "tiger"],
  );
  assert(!scopes.some((item) => item.facetKey === "dolphin"));
  assert(!scopes.some((item) => item.facetKey === "mission-ops"));

  const guardedScopes = resolveEditableAgentScopesWithFallbackForSmoke({
    configText: "{not-json",
    workspaceAgentIds: ["dolphin", "mission-ops", "pandas"],
  });
  assert.deepEqual(
    guardedScopes.map((item) => item.facetKey),
    ["main"],
  );
  assert.equal(guardedScopes[0]?.facetLabel, "Jarvis");
});

test("search helpers keep total matches separate from returned rows", async () => {
  const { buildDashboardSearchResultForSmoke } = await import("../src/ui/server");

  const snapshot: ReadModelSnapshot = {
    sessions: [
      {
        sessionKey: "sess-alpha-1",
        label: "Alpha One",
        agentId: "panda",
        state: "running",
        lastMessageAt: "2026-03-10T10:00:00.000Z",
      },
      {
        sessionKey: "sess-alpha-2",
        label: "Alpha Two",
        agentId: "tiger",
        state: "idle",
        lastMessageAt: "2026-03-10T09:00:00.000Z",
      },
    ],
    statuses: [],
    cronJobs: [],
    approvals: [],
    projects: {
      updatedAt: "2026-03-10T10:00:00.000Z",
      projects: [
        {
          projectId: "proj-alpha",
          title: "Alpha rollout",
          status: "active",
          owner: "panda",
          updatedAt: "2026-03-10T10:00:00.000Z",
        },
      ],
    },
    projectSummaries: [],
    tasks: {
      updatedAt: "2026-03-10T10:00:00.000Z",
      agentBudgets: [],
      tasks: [
        {
          projectId: "proj-alpha",
          taskId: "task-alpha-1",
          title: "Alpha first",
          status: "todo",
          owner: "panda",
          definitionOfDone: [],
          artifacts: [],
          rollback: { strategy: "none", steps: [] },
          sessionKeys: ["sess-alpha-1"],
          budget: {},
          updatedAt: "2026-03-10T10:00:00.000Z",
        },
        {
          projectId: "proj-alpha",
          taskId: "task-alpha-2",
          title: "Alpha second",
          status: "blocked",
          owner: "tiger",
          definitionOfDone: [],
          artifacts: [],
          rollback: { strategy: "none", steps: [] },
          sessionKeys: ["sess-alpha-2"],
          budget: {},
          updatedAt: "2026-03-10T10:01:00.000Z",
        },
      ],
    },
    tasksSummary: {
      projects: 1,
      tasks: 2,
      todo: 1,
      inProgress: 0,
      blocked: 1,
      done: 0,
      owners: 2,
      artifacts: 0,
    },
    budgetSummary: { total: 0, ok: 0, warn: 0, over: 0, evaluations: [] },
    generatedAt: "2026-03-10T10:05:00.000Z",
  };

  const taskResult = buildDashboardSearchResultForSmoke(snapshot, { scope: "tasks", q: "alpha", limit: 1 });
  assert(taskResult);
  assert.equal(taskResult.count, 2);
  assert.equal(taskResult.returned, 1);

  const sessionResult = buildDashboardSearchResultForSmoke(snapshot, {
    scope: "sessions",
    q: "alpha",
    limit: 1,
  });
  assert(sessionResult);
  assert.equal(sessionResult.count, 2);
  assert.equal(sessionResult.returned, 1);
});

test("search APIs advertise total match counts and bounded returned rows", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  const apiDocsSource = await readFile("src/runtime/api-docs.ts", "utf8");

  assert(source.includes("count: matches.length,"));
  assert(source.includes("returned: tasks.length,"));
  assert(source.includes("returned: projects.length,"));
  assert(source.includes("returned: sessions.length,"));
  assert(source.includes("returned: items.length,"));
  assert(source.includes('const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);'));
  assert(source.includes("function buildBoundedSearchResult<T>(items: T[], limit: number): {"));
  assert(apiDocsSource.includes('count: "number (total matches before limit)"'));
  assert(apiDocsSource.includes('returned: "number (items returned in this response)"'));
  assert(apiDocsSource.includes('count: "number (total matches before limit, including live-merged sessions)"'));
  assert(apiDocsSource.includes('path: "/api/dashboard/refresh"'));
  assert(apiDocsSource.includes("docsHubGeneratedAt"));
  assert(apiDocsSource.includes("docsHubEntryCount"));
});

test("import live input turns invalid file paths into validation errors", async () => {
  const { resolveImportInputForSmoke } = await import("../src/runtime/import-live");

  const result = await resolveImportInputForSmoke({ fileName: "../outside.json" });
  assert.equal(result.ok, false);
  assert.equal(result.validation.valid, false);
  assert.match(result.validation.issues[0] ?? "", /outside runtime exports directory/i);
});

test("session links stay on the session detail UI and docs index accepts language", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");

  assert(source.includes('function buildSessionDetailHref(sessionKey: string, language: UiLanguage): string {'));
  assert(source.includes('const language = resolveUiLanguage(url.searchParams, "zh");'));
  assert(source.includes('const html = renderSessionDrilldownPage(detail, language);'));
  assert(source.includes('assertAllowedQueryParams(url.searchParams, ["lang"], true);'));
  assert(source.includes('Open staff docs'));
  assert(source.includes('Back to AI employee system'));
  assert(!source.includes('href="/sessions/${encodeURIComponent(item.sessionKey)}"'));
  assert(source.includes('Available views",'));
  assert(source.includes('function joinDisplayList(items: string[], language: UiLanguage): string {'));
});

test("navigation script does not add artificial leave delay", async () => {
  const source = await readFile("src/ui/server.ts", "utf8");
  assert(source.includes("window.location.href = href;"));
  assert(!source.includes("window.setTimeout(() => {\n      window.location.href = href;\n    }, 120);"));
});

test("agent animal identity mapping prefers custom staff avatars and stays deterministic", async () => {
  const { deriveAgentAnimalIdentity } = await import("../src/ui/server");

  const leader = deriveAgentAnimalIdentity("main");
  assert.equal(leader.animal, "fox");
  assert.match(leader.imageHref ?? "", /\/assets\/staff-custom\/fox\.png$/);

  const dispatcher = deriveAgentAnimalIdentity("dispatcher");
  assert.equal(dispatcher.animal, "shiba");

  const architect = deriveAgentAnimalIdentity("architect");
  assert.equal(architect.animal, "panda");

  const backend = deriveAgentAnimalIdentity("backend");
  assert.equal(backend.animal, "tiger");

  const frontend = deriveAgentAnimalIdentity("frontend");
  assert.equal(frontend.animal, "cat");

  const qa = deriveAgentAnimalIdentity("qa");
  assert.equal(qa.animal, "elephant");

  const ops = deriveAgentAnimalIdentity("ops");
  assert.equal(ops.animal, "dolphin");

  const codexA = deriveAgentAnimalIdentity("codex");
  const codexB = deriveAgentAnimalIdentity("codex");
  assert.equal(codexA.animal, codexB.animal);
  assert.equal(codexA.imageHref, codexB.imageHref);
  assert.equal(codexA.imageHref, undefined);
  assert.equal(typeof codexA.title, "string");
  assert.notEqual(codexA.title, "");

  const fallbackA = deriveAgentAnimalIdentity("zxq-agent-42");
  const fallbackB = deriveAgentAnimalIdentity("zxq-agent-42");
  assert.equal(fallbackA.animal, fallbackB.animal);
  assert.equal(fallbackA.imageHref, fallbackB.imageHref);
  assert.equal(fallbackA.imageHref, undefined);
  assert.equal(typeof fallbackA.title, "string");
  assert.notEqual(fallbackA.title, "");
});

test("docs hub tracks baseline coverage for each active agent folder", async () => {
  const { buildAgentDocCoverageForSmoke } = await import("../src/ui/docs-hub");

  const coverage = buildAgentDocCoverageForSmoke(
    [
      { facetKey: "main", facetLabel: "Jarvis", workspaceRoot: "/workspace" },
      { facetKey: "backend", facetLabel: "Backend", workspaceRoot: "/workspace/agents/backend" },
    ],
    [
      { facetKey: "main", sourcePath: "/workspace/AGENTS.md" },
      { facetKey: "main", sourcePath: "/workspace/IDENTITY.md" },
      { facetKey: "main", sourcePath: "/workspace/SOUL.md" },
      { facetKey: "main", sourcePath: "/workspace/USER.md" },
      { facetKey: "main", sourcePath: "/workspace/BOOTSTRAP.md" },
      { facetKey: "main", sourcePath: "/workspace/HEARTBEAT.md" },
      { facetKey: "main", sourcePath: "/workspace/TOOLS.md" },
      { facetKey: "backend", sourcePath: "/workspace/agents/backend/IDENTITY.md" },
      { facetKey: "backend", sourcePath: "/workspace/agents/backend/SOUL.md" },
    ],
  );

  assert.equal(coverage.length, 2);
  assert.equal(coverage[0]?.facetLabel, "Jarvis");
  assert.equal(coverage[0]?.presentCount, 7);
  assert.deepEqual(coverage[0]?.missingFiles, []);
  assert.equal(coverage[1]?.facetLabel, "Backend");
  assert.equal(coverage[1]?.presentCount, 2);
  assert.deepEqual(coverage[1]?.missingFiles, ["AGENTS.md", "USER.md", "BOOTSTRAP.md", "HEARTBEAT.md", "TOOLS.md"]);
});

test("subscription card renders explicit unavailable states for missing fields", async () => {
  const { renderSubscriptionStatusCardForSmoke } = await import("../src/ui/server");

  const html = renderSubscriptionStatusCardForSmoke({
    status: "partial",
    planLabel: "Pro Monthly",
    unit: "USD",
    detail: "Partial billing fields available.",
    connectHint: "Provide subscription snapshot path.",
  });

  assert(html.includes("Pro Monthly"));
  assert(html.includes("Used Unavailable: subscription data is missing &quot;consumed&quot;"));
  assert(html.includes("Remaining Unavailable: subscription data is missing &quot;remaining&quot;"));
  assert(html.includes("Unavailable: subscription data is missing &quot;limit&quot;"));
  assert(html.includes("Cycle"));
  assert(html.includes("Not provided"));
});

test("subscription card normalizes near-week minute labels before rendering", async () => {
  const { renderSubscriptionStatusCardForSmoke } = await import("../src/ui/server");

  const html = renderSubscriptionStatusCardForSmoke({
    status: "connected",
    planLabel: "Codex Live",
    unit: "%",
    detail: "Live Codex rate limits.",
    connectHint: "",
    consumed: 2,
    remaining: 98,
    limit: 100,
    usagePercent: 2,
    primaryWindowLabel: "300m",
    primaryUsedPercent: 2,
    primaryRemainingPercent: 98,
    primaryResetAt: "2026-03-11T11:30:05.000Z",
    secondaryWindowLabel: "10081m",
    secondaryUsedPercent: 1,
    secondaryRemainingPercent: 99,
    secondaryResetAt: "2026-03-18T06:31:05.000Z",
  });

  assert(html.includes(">5h<"));
  assert(html.includes(">Week<"));
  assert(!html.includes(">300m<"));
  assert(!html.includes(">10081m<"));
});

test("collaboration source includes primary dispatcher filter and floating room chat", async () => {
  const serverSource = await readFile("src/ui/server.ts", "utf8");
  const widgetSource = await readFile("src/ui/collaboration-chat-widget.ts", "utf8");

  assert(serverSource.includes("primaryDispatcherFilterLabel"));
  assert(serverSource.includes('data-collab-primary-dispatched'));
  assert(serverSource.includes('renderCollaborationChatOverlay'));
  assert(serverSource.includes('data-collab-filter="primary-dispatched"'));
  assert(widgetSource.includes('data-collab-chat'));
  assert(widgetSource.includes('/api/collaboration/room'));
  assert(widgetSource.includes('/api/collaboration/room/uploads'));
  assert(widgetSource.includes('/api/collaboration/room/messages'));
  assert(widgetSource.includes('data-collab-mentions'));
  assert(widgetSource.includes('participant.mention'));
  assert(!widgetSource.includes('participant.aliases[0]'));
  assert(widgetSource.includes('data-write-enabled'));
  assert(widgetSource.includes('data-write-available'));
  assert(widgetSource.includes('roomLockMessage'));
  assert(widgetSource.includes('window.__openclawGetMutationAuthState'));
  assert(widgetSource.includes('window.__openclawSetRefreshGuard'));
  assert(widgetSource.includes('@media (max-width: 480px)'));
  assert(widgetSource.includes('grid-template-columns: minmax(0, 1fr);'));
  assert(widgetSource.includes('data-collab-room-trigger'));
  assert(serverSource.includes('loadExistingCollaborationRoom(input.roomId)'));
  assert(widgetSource.includes('.collab-chat-room-dropdown {'));
  assert(widgetSource.includes('data-collab-chat-person-card'));
  assert(widgetSource.includes('data-person-agent'));
  assert(widgetSource.includes('collab-chat-avatar-state'));
  assert(widgetSource.includes('max-height: min(16.5rem, calc(100vh - 8rem));'));
  assert(widgetSource.includes('white-space: pre-wrap;'));
});
