import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("task board source includes delete controls and card/details view switch", async () => {
  const [taskPagesSource, taskBoardScriptSource, collaborationBootSource, serverSource] = await Promise.all([
    readFile("src/ui/server-task-pages.ts", "utf8"),
    readFile("src/ui/server-inline-scripts-task-board.ts", "utf8"),
    readFile("src/ui/collaboration-chat-widget-script-boot.ts", "utf8"),
    readFile("src/ui/server.ts", "utf8"),
  ]);

  assert(taskPagesSource.includes('data-task-view-mode="${escapeHtml(normalizedViewMode)}"'));
  assert(taskPagesSource.includes('data-task-view-mode-button'));
  assert(taskPagesSource.includes('data-task-board-bulk-delete'));
  assert(taskPagesSource.includes('data-task-delete'));
  assert(taskPagesSource.includes('data-task-open-room="${escapeHtml(item.linkedRoomId)}"'));
  assert(taskPagesSource.includes('data-task-open-room-missing'));
  assert(taskPagesSource.includes('task-detail-table'));
  assert(taskPagesSource.includes('const completedCount = cards.filter((item) => item.statusTone === "done").length;'));
  assert(taskPagesSource.includes('task-legend-dot done'));
  assert(taskPagesSource.includes('pickUiText(language, "Completed", "\\u5DF2\\u5B8C\\u6210")'));
  assert.doesNotMatch(taskPagesSource, /task-detail-col-project/);
  assert.doesNotMatch(taskPagesSource, /task-detail-col-owner/);
  assert(taskPagesSource.includes("const TASK_BOARD_TITLE_MAX_CHARS = 20;"));
  assert(taskPagesSource.includes('title="${escapeHtml(card.title)}"'));
  assert(taskBoardScriptSource.includes("fetch('/api/tasks/bulk-delete'"));
  assert(taskBoardScriptSource.includes("method: 'DELETE'"));
  assert(taskBoardScriptSource.includes("taskBoardViewMode: nextMode"));
  assert(taskBoardScriptSource.includes("const collaborationRoomOpenEventName = 'openclaw:collaboration-room-open';"));
  assert(taskBoardScriptSource.includes("typeof window.__openclawOpenCollaborationRoom === 'function'"));
  assert(taskBoardScriptSource.includes("requestCollaborationRoomOpen(roomId);"));
  assert(taskBoardScriptSource.includes("target.closest('[data-task-open-room-missing]')"));
  assert(taskBoardScriptSource.includes("setStatus(l.missingRoom);"));
  assert(collaborationBootSource.includes("window.addEventListener('openclaw:collaboration-room-open'"));
  assert(collaborationBootSource.includes("window.__openclawOpenCollaborationRoom = (roomId, source) => {"));
  assert(collaborationBootSource.includes("const openRoomFromExternalTrigger = async (roomId, source = 'external') => {"));
  assert(collaborationBootSource.includes("await activateRoom(normalizedRoomId);"));
  assert(serverSource.includes('if (method === "POST" && path === "/api/tasks/bulk-delete") {'));
  assert(serverSource.includes('if (method === "DELETE" && path.startsWith("/api/tasks/") && !path.endsWith("/status")) {'));
  assert(serverSource.includes('const taskSpotlightCardsWithRoomRefs = collaborationRoomStates.length > 0 ? attachCollaborationRoomRefsToCards(taskSpotlightCards, collaborationRoomStates, options.language) : taskSpotlightCards;'));
  assert(serverSource.includes('min-width: 960px;'));
  assert(serverSource.includes(".task-status-dot.done {"));
  assert(serverSource.includes(".task-legend-dot.done {"));
  assert.doesNotMatch(serverSource, /task-detail-col-project/);
  assert.doesNotMatch(serverSource, /task-detail-col-owner/);
  assert.doesNotMatch(serverSource, /detailHref:\s*buildCollaborationRoomHref\(card\.linkedRoomId\)/);
});

test("done task cards render in a dedicated completed bucket", async () => {
  const { createTaskPageRenderers } = await import("../src/ui/server-task-pages");
  const renderers = createTaskPageRenderers({
    buildHomeHref: () => "/",
    buildSessionDetailHref: (sessionKey: string) => `/sessions/${sessionKey}`,
    renderGlobalVisibilityStrip: () => "",
    sessionStateLabel: (state: string) => state,
    summarizeVisibleSessionSnippet: (value: string) => value,
    taskStateLabel: (state: string, language: string) => (language === "en" && state === "done" ? "Done" : state),
  });

  const html = renderers.renderTaskBoard(
    [
      {
        cardId: "task-done",
        cardKind: "task",
        taskId: "task-done",
        projectId: "proj-alpha",
        title: "Completed regression task",
        projectTitle: "Alpha",
        taskStatus: "done",
        ownerLabel: "Jarvis",
        statusTone: "done",
        statusLabel: "Completed",
        statusDotLabel: "Completed",
        priorityLabel: "Completed",
        boardStatusLabel: "Done",
        boardStatusTone: "done",
        summary: "Recovered final answer.",
        recentSignal: "Final reply landed.",
        nextStep: "Review if needed.",
        scheduleLabel: "Due date set",
        dueLabel: "Completed",
        updatedLabel: "Updated just now",
        detailHref: "/tasks/task-done",
      },
    ],
    "en",
    [],
    null,
    "cards",
  );

  assert(html.includes("Completed 1"));
  assert(html.includes('task-status-dot done'));
  assert(!html.includes("Issues 1"));
  assert(!html.includes("Queued 1"));
});

test("done tasks keep a completed tone even if stale signals look blocked", async () => {
  const { createTaskSpotlightHelpers } = await import("../src/ui/server-task-spotlight");
  const helpers = createTaskSpotlightHelpers({
    buildCronDetailHref: (jobId: string) => `/cron/${jobId}`,
    buildTaskDetailHref: (taskId: string) => `/tasks/${taskId}`,
    formatSeconds: (value: number) => `${value}s`,
    formatTimeAgoFromNow: (value: string) => value,
    hasFreshRuntimeTimestamp: () => false,
    humanizeOperatorLabel: (value: string) => value,
    humanizeTimedJobScheduleLabel: (value: string) => value,
    humanizeTimedJobWindowLabel: (value: string) => value,
    isStaleRuntimeTimestamp: () => false,
    pickLatestSessionActivityTimestamp: (a?: string, b?: string) => a ?? b ?? "",
    pickUiText: (language: string, english: string, chinese: string) => (language === "en" ? english : chinese),
    sanitizeCronPurposeText: (value: string) => value,
    summarizeVisibleSessionSnippet: (value: string) => value,
    taskStateLabel: (state: string) => state,
    taskRuntimeActivityWindowMs: 15 * 60 * 1000,
    toSortableMs: (value?: string) => (value ? Date.parse(value) : 0),
  });

  const tone = helpers.resolveTaskSpotlightTone({
    task: { status: "done" },
    certainty: { tone: "blocked" },
    errorSessionCount: 1,
    blockedSessionCount: 1,
    waitingApprovalSessionCount: 1,
    pendingApprovals: 1,
    liveSessionCount: 0,
    recentActivityCount: 0,
  });

  assert.equal(tone, "done");
});
