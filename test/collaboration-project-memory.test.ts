import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  appendCollaborationProjectStageLog,
  collaborationProjectDirName,
  ensureCollaborationProjectMemory,
  loadCollaborationProjectMemory,
  parseStageLog,
  resolveCollaborationProjectFiles,
  updateCollaborationProjectSummary,
} from "../src/runtime/collaboration-project-memory";

const execFileAsync = promisify(execFile);
const tsxLoaderHref = pathToFileURL(join(process.cwd(), "node_modules", "tsx", "dist", "loader.mjs")).href;
const projectMemoryModuleHref = pathToFileURL(
  join(process.cwd(), "src", "runtime", "collaboration-project-memory.ts"),
).href;
const projectStoreModuleHref = pathToFileURL(
  join(process.cwd(), "src", "runtime", "project-store.ts"),
).href;
const taskStoreModuleHref = pathToFileURL(join(process.cwd(), "src", "runtime", "task-store.ts")).href;

async function runProjectMemoryModuleForTest(tempRoot: string, source: string): Promise<string> {
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

test("safe project ids keep their existing collaboration memory folder name", () => {
  assert.equal(collaborationProjectDirName("skills"), "skills");
  assert.equal(collaborationProjectDirName("test-2"), "test-2");
});

test("unsafe project ids still load collaboration memory on Windows-safe paths", async () => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "collab-project-safe-path-"));
  const projectId = "3-20-10:55:16";

  try {
    const dirName = collaborationProjectDirName(projectId);
    assert.match(dirName, /^[A-Za-z0-9._-]+$/);
    assert(!dirName.includes(":"));

    const files = await ensureCollaborationProjectMemory({
      workspaceRoot,
      projectId,
      projectTitle: "新对话 3月20日 10:55:16",
    });
    const resolved = resolveCollaborationProjectFiles(workspaceRoot, projectId);
    const summary = await readFile(files.projectSummaryPath, "utf8");

    assert.equal(files.projectDir, resolved.projectDir);
    assert.equal(files.projectDir, join(workspaceRoot, "projects", dirName));
    assert(summary.includes(`Project ID: ${projectId}`));
    assert(summary.includes("新对话 3月20日 10:55:16"));
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("open tasks snapshots preserve waiting-for-user-confirmation receipts without inventing an approved delivery", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-project-open-tasks-"));

  try {
    const output = await runProjectMemoryModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const projectMemory = unwrap(await import(${JSON.stringify(projectMemoryModuleHref)}));
        const projectStore = unwrap(await import(${JSON.stringify(projectStoreModuleHref)}));
        const taskStore = unwrap(await import(${JSON.stringify(taskStoreModuleHref)}));
        const { join } = await import("node:path");

        const workspaceRoot = join(process.cwd(), "workspace");
        await projectStore.createProject({
          projectId: "proj-waiting",
          title: "Waiting room",
          status: "active",
          owner: "jarvis",
        });
        await taskStore.createTask({
          projectId: "proj-waiting",
          taskId: "task-waiting",
          title: "Wait for user",
          status: "in_progress",
          owner: "jarvis",
          definitionOfDone: ["Wait for the next user decision."],
          artifacts: [],
          rollback: { strategy: "manual", steps: [] },
          sessionKeys: [],
          budget: { warnRatio: 0.8 },
        });

        const syncInput = {
          workspaceRoot,
          projectId: "proj-waiting",
          projectTitle: "Waiting room",
          receipts: [
            {
              taskId: "task-waiting",
              projectId: "proj-waiting",
              reviewState: "awaiting_review",
              lastResultState: "awaiting_review",
              waitingFor: "user_confirmation",
              lastReportedAt: "2026-03-22T10:00:00.000Z",
            },
          ],
          dispatchRecords: [
            {
              taskId: "task-waiting",
              projectId: "proj-waiting",
              ownerAgentId: "jarvis",
              stage: "delivery",
            },
          ],
        };

        await projectMemory.syncCollaborationProjectOpenTasks(syncInput);
        const waitingMemory = await projectMemory.loadCollaborationProjectMemory({
          workspaceRoot,
          projectId: "proj-waiting",
          projectTitle: "Waiting room",
        });

        await taskStore.updateTaskStatus({
          projectId: "proj-waiting",
          taskId: "task-waiting",
          status: "done",
        });
        await projectMemory.syncCollaborationProjectOpenTasks(syncInput);
        const closedMemory = await projectMemory.loadCollaborationProjectMemory({
          workspaceRoot,
          projectId: "proj-waiting",
          projectTitle: "Waiting room",
        });

        process.stdout.write(JSON.stringify({
          waitingTask: waitingMemory.openTasks.tasks[0] ?? null,
          closedTaskCount: closedMemory.openTasks.tasks.length,
          stageLogCount: closedMemory.recentStageLogs.length,
          summaryText: closedMemory.summaryText,
        }));
      `,
    );

    const parsed = JSON.parse(output) as {
      waitingTask: null | {
        taskId: string;
        reviewState?: string;
        lastResultState?: string;
        waitingFor?: string;
      };
      closedTaskCount: number;
      stageLogCount: number;
      summaryText: string;
    };

    assert.equal(parsed.waitingTask?.taskId, "task-waiting");
    assert.equal(parsed.waitingTask?.reviewState, "awaiting_review");
    assert.equal(parsed.waitingTask?.lastResultState, "awaiting_review");
    assert.equal(parsed.waitingTask?.waitingFor, "user_confirmation");
    assert.equal(parsed.closedTaskCount, 0);
    assert.equal(parsed.stageLogCount, 0);
    assert.match(parsed.summaryText, /No approved stage summary yet\./);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
