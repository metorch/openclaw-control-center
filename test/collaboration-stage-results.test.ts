import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStageResultEnvelopeTemplate,
  normalizeStageResultEnvelope,
  parseStageResultEnvelopeFromReply,
} from "../src/runtime/collaboration-stage-results";

test("stage result parser strips the hidden envelope and preserves the visible reply", () => {
  const parsed = parseStageResultEnvelopeFromReply(
    [
      "阶段已经完成，产物已落盘。",
      "",
      "<stage_result>",
      JSON.stringify({
        taskId: "task-alpha",
        projectId: "proj-alpha",
        agentId: "architect",
        resultState: "awaiting_review",
        summary: "Landing page draft is ready for review.",
        artifacts: [
          { label: "HTML", location: "C:/workspace/projects/proj-alpha/artifacts/index.html" },
        ],
        completionChecklist: ["Provide a concrete user-facing update."],
        blockers: [],
        nextSuggestion: "Ask Jarvis to hand QA to Tester.",
        reportedAt: "2026-03-18T08:00:00.000Z",
      }),
      "</stage_result>",
    ].join("\n"),
    {
      taskId: "fallback-task",
      projectId: "fallback-project",
      agentId: "architect",
      reportedAt: "2026-03-18T09:00:00.000Z",
    },
  );

  assert.equal(parsed.cleanReplyText, "阶段已经完成，产物已落盘。");
  assert.equal(parsed.envelope?.taskId, "task-alpha");
  assert.equal(parsed.envelope?.projectId, "proj-alpha");
  assert.equal(parsed.envelope?.resultState, "awaiting_review");
  assert.deepEqual(parsed.envelope?.artifacts, [
    { label: "HTML", location: "C:/workspace/projects/proj-alpha/artifacts/index.html" },
  ]);
});

test("stage result normalization falls back to dispatch metadata and deduplicates lists", () => {
  const envelope = normalizeStageResultEnvelope(
    {
      resultState: "blocked",
      summary: "Waiting on design tokens.",
      artifacts: [
        "C:/workspace/a.txt",
        { location: "C:/workspace/A.txt", label: "duplicate path" },
        { path: "C:/workspace/b.txt", label: "Spec" },
      ],
      completionChecklist: ["One", "one", "Two"],
      blockers: ["Need token export", "need token export"],
    },
    {
      taskId: "task-beta",
      projectId: "proj-beta",
      agentId: "jarvis",
      reportedAt: "2026-03-18T10:00:00.000Z",
    },
  );

  assert.deepEqual(envelope, {
    taskId: "task-beta",
    projectId: "proj-beta",
    agentId: "jarvis",
    resultState: "blocked",
    summary: "Waiting on design tokens.",
    artifacts: [
      { location: "C:/workspace/a.txt" },
      { label: "Spec", location: "C:/workspace/b.txt" },
    ],
    completionChecklist: ["One", "Two"],
    blockers: ["Need token export"],
    nextSuggestion: undefined,
    reportedAt: "2026-03-18T10:00:00.000Z",
  });
});

test("stage result template keeps the required dispatch fields visible", () => {
  const template = JSON.parse(
    buildStageResultEnvelopeTemplate({
      taskId: "task-gamma",
      projectId: "proj-gamma",
      agentId: "jarvis",
    }),
  ) as Record<string, unknown>;

  assert.equal(template.taskId, "task-gamma");
  assert.equal(template.projectId, "proj-gamma");
  assert.equal(template.agentId, "jarvis");
  assert.equal(template.resultState, "in_progress");
});
