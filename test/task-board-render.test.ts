import assert from "node:assert/strict";
import test from "node:test";

import { createTaskPageRenderers } from "../src/ui/server-task-pages";

function buildTaskCard(index: number) {
  return {
    cardId: `card-${index}`,
    cardKind: "task",
    taskId: `task-${index}`,
    projectId: "control-center",
    title: `Task ${index}`,
    scheduleLabel: `P${index}`,
    dueLabel: `due-${index}`,
    projectTitle: "AI Employee",
    ownerLabel: "Jarvis",
    summary: `summary-${index}`,
    recentSignal: `recent-${index}`,
    nextStep: `next-${index}`,
    detailHref: `/task/${index}`,
    priorityLabel: `priority-${index}`,
    boardStatusTone: "enabled",
    boardStatusLabel: "Open",
    statusLabel: "In progress",
    statusTone: "working",
    statusDotLabel: "Working",
    taskStatus: "in_progress",
    linkedRoomId: `room-${index}`,
    updatedLabel: `updated-${index}`,
  };
}

function countMatches(input: string, pattern: string) {
  return (input.match(new RegExp(pattern, "g")) || []).length;
}

test("task board render keeps only the current page in HTML and serializes the full board data", () => {
  const { renderTaskBoard } = createTaskPageRenderers({
    buildHomeHref: () => "/",
    buildSessionDetailHref: () => "/session",
    renderGlobalVisibilityStrip: () => "",
    sessionStateLabel: (value: string) => value,
    summarizeVisibleSessionSnippet: (value: string) => value,
    taskStateLabel: (value: string) => value,
  });

  const html = renderTaskBoard(
    Array.from({ length: 25 }, (_, index) => buildTaskCard(index + 1)),
    "en",
    [],
    null,
    "cards",
    { currentPage: 2, pageSize: 20 },
  );

  assert.equal(countMatches(html, 'class="task-brief-card"'), 5);
  assert.equal(countMatches(html, 'class="task-detail-row"'), 0);
  assert.match(html, /data-task-board-items/);
  assert.match(html, /data-task-board-current-page="2"/);
  assert.match(html, /task-25/);
});

test("task board detail mode renders only the active page rows server-side", () => {
  const { renderTaskBoard } = createTaskPageRenderers({
    buildHomeHref: () => "/",
    buildSessionDetailHref: () => "/session",
    renderGlobalVisibilityStrip: () => "",
    sessionStateLabel: (value: string) => value,
    summarizeVisibleSessionSnippet: (value: string) => value,
    taskStateLabel: (value: string) => value,
  });

  const html = renderTaskBoard(
    Array.from({ length: 21 }, (_, index) => buildTaskCard(index + 1)),
    "en",
    [],
    null,
    "details",
    { currentPage: 2, pageSize: 20 },
  );

  assert.equal(countMatches(html, 'class="task-brief-card"'), 1);
  assert.equal(countMatches(html, 'class="task-detail-row"'), 1);
  assert.match(html, /<code>task-21<\/code>/);
  assert.equal(countMatches(html, "<code>task-20</code>"), 0);
});
