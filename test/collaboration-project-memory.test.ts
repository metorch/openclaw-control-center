import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  appendCollaborationProjectStageLog,
  ensureCollaborationProjectMemory,
  loadCollaborationProjectMemory,
  parseStageLog,
  resolveCollaborationProjectFiles,
  updateCollaborationProjectSummary,
} from "../src/runtime/collaboration-project-memory";

test("collaboration project memory bootstraps the expected project files", async () => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "collab-project-memory-"));

  try {
    const files = await ensureCollaborationProjectMemory({
      workspaceRoot,
      projectId: "proj-alpha",
      projectTitle: "Alpha Delivery",
    });

    assert.deepEqual(files, resolveCollaborationProjectFiles(workspaceRoot, "proj-alpha"));

    const memory = await loadCollaborationProjectMemory({
      workspaceRoot,
      projectId: "proj-alpha",
      projectTitle: "Alpha Delivery",
    });

    assert.match(memory.summaryText, /# Alpha Delivery/);
    assert.match(memory.summaryText, /Project ID: proj-alpha/);
    assert.match(memory.decisionsText, /# Decisions/);
    assert.equal(memory.openTasks.projectId, "proj-alpha");
    assert.deepEqual(memory.openTasks.tasks, []);
    assert.deepEqual(memory.recentStageLogs, []);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("collaboration project memory records approved stage summaries and logs", async () => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "collab-project-summary-"));

  try {
    await ensureCollaborationProjectMemory({
      workspaceRoot,
      projectId: "proj-beta",
      projectTitle: "Beta Launch",
    });
    await appendCollaborationProjectStageLog({
      workspaceRoot,
      projectId: "proj-beta",
      projectTitle: "Beta Launch",
      entry: {
        taskId: "task-beta-1",
        projectId: "proj-beta",
        stage: "delivery",
        agentId: "architect",
        summary: "Shipped the first reviewable landing page build.",
        resultState: "awaiting_review",
        reviewState: "approved",
        reportedAt: "2026-03-18T08:00:00.000Z",
        approvedAt: "2026-03-18T08:05:00.000Z",
        artifacts: [{ label: "HTML", location: "C:/workspace/projects/proj-beta/artifacts/index.html" }],
        blockers: [],
        completionChecklist: ["Provide a concrete user-facing update."],
        nextSuggestion: "Hand the project to QA.",
      },
    });
    await updateCollaborationProjectSummary({
      workspaceRoot,
      projectId: "proj-beta",
      projectTitle: "Beta Launch",
      summary: "Landing page v1 is approved and ready for QA handoff.",
      stage: "delivery",
      taskTitle: "Deliver landing page v1",
      ownerAgentId: "architect",
      artifacts: [{ label: "HTML", location: "C:/workspace/projects/proj-beta/artifacts/index.html" }],
      nextSuggestion: "Create a QA task for Tester.",
      updatedAt: "2026-03-18T08:05:00.000Z",
    });

    const memory = await loadCollaborationProjectMemory({
      workspaceRoot,
      projectId: "proj-beta",
      projectTitle: "Beta Launch",
    });
    const stageLogText = await readFile(memory.files.stageLogPath, "utf8");

    assert.equal(memory.recentStageLogs.length, 1);
    assert.equal(memory.recentStageLogs[0]?.taskId, "task-beta-1");
    assert.equal(memory.recentStageLogs[0]?.reviewState, "approved");
    assert.match(memory.summaryText, /Landing page v1 is approved and ready for QA handoff\./);
    assert.match(memory.summaryText, /Deliver landing page v1/);
    assert.match(memory.summaryText, /Create a QA task for Tester\./);
    assert.deepEqual(parseStageLog(`${stageLogText}\nnot-json`), memory.recentStageLogs);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
