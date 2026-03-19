import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ReadModelSnapshot } from "../types";

export interface SnapshotDiff {
  sessionsDelta: number;
  statusesDelta: number;
  cronJobsDelta: number;
  approvalsDelta: number;
  projectsDelta: number;
  tasksDelta: number;
  budgetEvaluationsDelta: number;
}

export interface SnapshotStoreResult {
  path: string;
  diff: SnapshotDiff;
}

const RUNTIME_DIR = join(process.cwd(), "runtime");
const LAST_SNAPSHOT_PATH = join(RUNTIME_DIR, "last-snapshot.json");
const SNAPSHOT_RENAME_RETRY_DELAYS_MS = [40, 80, 140, 220, 320, 450];

function countOf<T>(items: T[] | undefined): number {
  return Array.isArray(items) ? items.length : 0;
}

function computeDiff(prev: ReadModelSnapshot | null, next: ReadModelSnapshot): SnapshotDiff {
  if (!prev) {
    return {
      sessionsDelta: countOf(next.sessions),
      statusesDelta: countOf(next.statuses),
      cronJobsDelta: countOf(next.cronJobs),
      approvalsDelta: countOf(next.approvals),
      projectsDelta: countOf(next.projects.projects),
      tasksDelta: next.tasksSummary.tasks,
      budgetEvaluationsDelta: next.budgetSummary.total,
    };
  }

  const prevTasks = (prev as Partial<ReadModelSnapshot>).tasksSummary?.tasks ?? 0;
  const prevBudgets = (prev as Partial<ReadModelSnapshot>).budgetSummary?.total ?? 0;

  return {
    sessionsDelta: countOf(next.sessions) - countOf(prev.sessions),
    statusesDelta: countOf(next.statuses) - countOf(prev.statuses),
    cronJobsDelta: countOf(next.cronJobs) - countOf(prev.cronJobs),
    approvalsDelta: countOf(next.approvals) - countOf(prev.approvals),
    projectsDelta:
      countOf(next.projects.projects) - countOf((prev as Partial<ReadModelSnapshot>).projects?.projects),
    tasksDelta: next.tasksSummary.tasks - prevTasks,
    budgetEvaluationsDelta: next.budgetSummary.total - prevBudgets,
  };
}

async function readPreviousSnapshot(): Promise<ReadModelSnapshot | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const raw = await readFile(LAST_SNAPSHOT_PATH, "utf8");
      return JSON.parse(raw) as ReadModelSnapshot;
    } catch {
      if (attempt === 2) return null;
      await delay(25 * (attempt + 1));
    }
  }
  return null;
}

export async function saveSnapshot(next: ReadModelSnapshot): Promise<SnapshotStoreResult> {
  const prev = await readPreviousSnapshot();
  const diff = computeDiff(prev, next);

  await mkdir(dirname(LAST_SNAPSHOT_PATH), { recursive: true });
  const tempPath = `${LAST_SNAPSHOT_PATH}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const serialized = JSON.stringify(next, null, 2);
  await writeFile(tempPath, serialized, "utf8");
  try {
    await renameSnapshotWithRetries(tempPath, LAST_SNAPSHOT_PATH);
  } catch (error) {
    if (isRetryableSnapshotRenameError(error)) {
      await writeFile(LAST_SNAPSHOT_PATH, serialized, "utf8");
      await rm(tempPath, { force: true }).catch(() => void 0);
    } else {
      await rm(tempPath, { force: true }).catch(() => void 0);
      throw error;
    }
  }

  return {
    path: LAST_SNAPSHOT_PATH,
    diff,
  };
}

async function renameSnapshotWithRetries(tempPath: string, targetPath: string): Promise<void> {
  for (let attempt = 0; attempt <= SNAPSHOT_RENAME_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await rename(tempPath, targetPath);
      return;
    } catch (error) {
      if (!isRetryableSnapshotRenameError(error) || attempt === SNAPSHOT_RENAME_RETRY_DELAYS_MS.length) {
        throw error;
      }
      await delay(SNAPSHOT_RENAME_RETRY_DELAYS_MS[attempt]);
    }
  }
}

function isRetryableSnapshotRenameError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = String((error as { code?: unknown }).code ?? "").toUpperCase();
  return code === "EPERM" || code === "EBUSY" || code === "EACCES";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
