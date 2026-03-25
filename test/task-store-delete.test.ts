import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const tsxLoaderHref = pathToFileURL(join(process.cwd(), "node_modules", "tsx", "dist", "loader.mjs")).href;
const projectStoreModuleHref = pathToFileURL(
  join(process.cwd(), "src", "runtime", "project-store.ts"),
).href;
const taskStoreModuleHref = pathToFileURL(join(process.cwd(), "src", "runtime", "task-store.ts")).href;
const unwrapModuleSource = `
  const unwrapModule = (mod) => mod.default ?? mod["module.exports"] ?? mod;
`;

async function runTaskStoreModuleForTest(tempRoot: string, source: string): Promise<string> {
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

test("deleteTasks removes only the requested tracked tasks", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "task-store-delete-"));

  try {
    const result = JSON.parse(
      await runTaskStoreModuleForTest(
        tempRoot,
        `
          ${unwrapModuleSource}
          const projectStore = unwrapModule(await import(${JSON.stringify(projectStoreModuleHref)}));
          const taskStore = unwrapModule(await import(${JSON.stringify(taskStoreModuleHref)}));

          await projectStore.saveProjectStore({
            projects: [
              { projectId: "proj-alpha", title: "Alpha", status: "active", owner: "main", budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" },
              { projectId: "proj-beta", title: "Beta", status: "active", owner: "main", budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" }
            ],
            updatedAt: "2026-03-24T00:00:00.000Z"
          });
          await taskStore.saveTaskStore({
            tasks: [
              { projectId: "proj-alpha", taskId: "task-alpha", title: "Task Alpha", status: "todo", owner: "main", definitionOfDone: [], artifacts: [], rollback: { strategy: "manual", steps: [] }, sessionKeys: [], budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" },
              { projectId: "proj-alpha", taskId: "task-beta", title: "Task Beta", status: "in_progress", owner: "frontend", definitionOfDone: [], artifacts: [], rollback: { strategy: "manual", steps: [] }, sessionKeys: [], budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" },
              { projectId: "proj-beta", taskId: "task-gamma", title: "Task Gamma", status: "blocked", owner: "qa", definitionOfDone: [], artifacts: [], rollback: { strategy: "manual", steps: [] }, sessionKeys: [], budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" }
            ],
            agentBudgets: [],
            updatedAt: "2026-03-24T00:00:00.000Z"
          });

          const deleted = await taskStore.deleteTasks({
            tasks: [
              { taskId: "task-alpha", projectId: "proj-alpha" },
              { taskId: "task-gamma", projectId: "proj-beta" }
            ]
          });
          const reloaded = await taskStore.loadTaskStore();

          console.log(JSON.stringify({
            removedTaskIds: deleted.removed.map((item) => item.task.taskId),
            remainingTaskIds: reloaded.tasks.map((item) => item.taskId),
          }));
        `,
      ),
    ) as { removedTaskIds: string[]; remainingTaskIds: string[] };

    assert.deepEqual(result.removedTaskIds, ["task-alpha", "task-gamma"]);
    assert.deepEqual(result.remainingTaskIds, ["task-beta"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("deleteTask rejects ambiguous ids until projectId is provided", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "task-store-delete-ambiguous-"));

  try {
    const result = JSON.parse(
      await runTaskStoreModuleForTest(
        tempRoot,
        `
          ${unwrapModuleSource}
          const taskStore = unwrapModule(await import(${JSON.stringify(taskStoreModuleHref)}));

          await taskStore.saveTaskStore({
            tasks: [
              { projectId: "proj-alpha", taskId: "shared-task", title: "Shared Alpha", status: "todo", owner: "main", definitionOfDone: [], artifacts: [], rollback: { strategy: "manual", steps: [] }, sessionKeys: [], budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" },
              { projectId: "proj-beta", taskId: "shared-task", title: "Shared Beta", status: "todo", owner: "main", definitionOfDone: [], artifacts: [], rollback: { strategy: "manual", steps: [] }, sessionKeys: [], budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" }
            ],
            agentBudgets: [],
            updatedAt: "2026-03-24T00:00:00.000Z"
          });

          try {
            await taskStore.deleteTask({ taskId: "shared-task" });
          } catch (error) {
            console.log(JSON.stringify({
              name: error.name,
              statusCode: error.statusCode,
              issues: error.issues,
              message: error.message,
            }));
          }
        `,
      ),
    ) as { name: string; statusCode: number; issues: string[]; message: string };

    assert.equal(result.name, "TaskStoreValidationError");
    assert.equal(result.statusCode, 409);
    assert.deepEqual(result.issues, ["projectId"]);
    assert.match(result.message, /ambiguous/i);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("deleteTask removes only the targeted project-scoped duplicate task id", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "task-store-delete-scoped-"));

  try {
    const result = JSON.parse(
      await runTaskStoreModuleForTest(
        tempRoot,
        `
          ${unwrapModuleSource}
          const taskStore = unwrapModule(await import(${JSON.stringify(taskStoreModuleHref)}));

          await taskStore.saveTaskStore({
            tasks: [
              { projectId: "proj-alpha", taskId: "shared-task", title: "Shared Alpha", status: "todo", owner: "main", definitionOfDone: [], artifacts: [], rollback: { strategy: "manual", steps: [] }, sessionKeys: [], budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" },
              { projectId: "proj-beta", taskId: "shared-task", title: "Shared Beta", status: "todo", owner: "main", definitionOfDone: [], artifacts: [], rollback: { strategy: "manual", steps: [] }, sessionKeys: [], budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" },
              { projectId: "proj-beta", taskId: "beta-only", title: "Beta Only", status: "todo", owner: "main", definitionOfDone: [], artifacts: [], rollback: { strategy: "manual", steps: [] }, sessionKeys: [], budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" }
            ],
            agentBudgets: [],
            updatedAt: "2026-03-24T00:00:00.000Z"
          });

          await taskStore.deleteTask({ taskId: "shared-task", projectId: "proj-alpha" });
          const reloaded = await taskStore.loadTaskStore();

          console.log(JSON.stringify({
            remaining: reloaded.tasks.map((item) => ({
              projectId: item.projectId,
              taskId: item.taskId,
            })),
          }));
        `,
      ),
    ) as { remaining: Array<{ projectId: string; taskId: string }> };

    assert.deepEqual(result.remaining, [
      { projectId: "proj-beta", taskId: "shared-task" },
      { projectId: "proj-beta", taskId: "beta-only" },
    ]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("task store normalizes completed-style states into done", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "task-store-completed-alias-"));

  try {
    const result = JSON.parse(
      await runTaskStoreModuleForTest(
        tempRoot,
        `
          ${unwrapModuleSource}
          const projectStore = unwrapModule(await import(${JSON.stringify(projectStoreModuleHref)}));
          const taskStore = unwrapModule(await import(${JSON.stringify(taskStoreModuleHref)}));

          await projectStore.saveProjectStore({
            projects: [
              { projectId: "proj-alpha", title: "Alpha", status: "active", owner: "main", budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" }
            ],
            updatedAt: "2026-03-24T00:00:00.000Z"
          });

          await taskStore.saveTaskStore({
            tasks: [
              { projectId: "proj-alpha", taskId: "task-alias", title: "Alias task", status: "completed", owner: "main", definitionOfDone: [], artifacts: [], rollback: { strategy: "manual", steps: [] }, sessionKeys: [], budget: { warnRatio: 0.8 }, updatedAt: "2026-03-24T00:00:00.000Z" }
            ],
            agentBudgets: [],
            updatedAt: "2026-03-24T00:00:00.000Z"
          });

          const loaded = await taskStore.loadTaskStore();
          const updated = await taskStore.updateTaskStatus({
            taskId: "task-alias",
            projectId: "proj-alpha",
            status: "finished"
          });
          const reloaded = await taskStore.loadTaskStore();

          console.log(JSON.stringify({
            loadedStatus: loaded.tasks[0]?.status,
            updatedStatus: updated.task.status,
            reloadedStatus: reloaded.tasks[0]?.status,
          }));
        `,
      ),
    ) as { loadedStatus: string; updatedStatus: string; reloadedStatus: string };

    assert.equal(result.loadedStatus, "done");
    assert.equal(result.updatedStatus, "done");
    assert.equal(result.reloadedStatus, "done");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
