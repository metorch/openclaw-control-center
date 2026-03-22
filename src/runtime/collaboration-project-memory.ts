import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadProjectStore } from "./project-store";
import { loadTaskStore } from "./task-store";

const SAFE_PROJECT_DIR_NAME_REGEX = /^[A-Za-z0-9._-]{1,100}$/;
const WINDOWS_RESERVED_PATH_SEGMENT_REGEX = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export interface CollaborationProjectFiles {
  projectDir: string;
  projectSummaryPath: string;
  stageLogPath: string;
  openTasksPath: string;
  decisionsPath: string;
  artifactsDir: string;
}

export interface CollaborationProjectStageLogEntry {
  taskId: string;
  projectId: string;
  stage: string;
  agentId: string;
  summary: string;
  resultState: string;
  reviewState?: string;
  reportedAt: string;
  approvedAt?: string;
  artifacts?: Array<{ label?: string; location: string }>;
  blockers?: string[];
  completionChecklist?: string[];
  nextSuggestion?: string;
}

interface OpenTasksSnapshot {
  projectId: string;
  updatedAt: string;
  tasks: Array<{
    taskId: string;
    title: string;
    owner: string;
    status: string;
    reviewState?: string;
    lastResultState?: string;
    waitingFor?: string;
    stage?: string;
    updatedAt: string;
  }>;
}

export function collaborationProjectDirName(projectId: string): string {
  const raw = String(projectId || "").trim();
  const direct = trimWindowsUnsafeSegmentTail(raw);
  if (
    direct &&
    SAFE_PROJECT_DIR_NAME_REGEX.test(direct) &&
    !WINDOWS_RESERVED_PATH_SEGMENT_REGEX.test(direct)
  ) {
    return direct;
  }

  const hash = createHash("sha1")
    .update(raw || "project")
    .digest("hex")
    .slice(0, 10);
  const normalizedBase = trimWindowsUnsafeSegmentTail(
    raw
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[._-]+|[._-]+$/g, ""),
  );
  const base = trimWindowsUnsafeSegmentTail((normalizedBase || "project").slice(0, 64)) || "project";
  const candidate = `${base}-${hash}`;
  if (WINDOWS_RESERVED_PATH_SEGMENT_REGEX.test(candidate)) {
    return `project-${hash}`;
  }
  return candidate;
}

export async function ensureCollaborationProjectMemory(input: {
  workspaceRoot: string;
  projectId: string;
  projectTitle?: string;
}): Promise<CollaborationProjectFiles> {
  const files = resolveCollaborationProjectFiles(input.workspaceRoot, input.projectId);
  await mkdir(files.artifactsDir, { recursive: true });
  await mkdir(join(files.projectDir, "memory"), { recursive: true });

  await ensureTextFile(
    files.projectSummaryPath,
    buildDefaultProjectSummary({
      projectId: input.projectId,
      projectTitle: input.projectTitle ?? input.projectId,
    }),
  );
  await ensureTextFile(files.stageLogPath, "");
  await ensureTextFile(
    files.openTasksPath,
    `${JSON.stringify({ projectId: input.projectId, updatedAt: new Date().toISOString(), tasks: [] }, null, 2)}\n`,
  );
  await ensureTextFile(
    files.decisionsPath,
    `# Decisions\n\nProject ID: ${input.projectId}\n\n- No recorded decisions yet.\n`,
  );

  return files;
}

export async function loadCollaborationProjectMemory(input: {
  workspaceRoot: string;
  projectId: string;
  projectTitle?: string;
}): Promise<{
  files: CollaborationProjectFiles;
  summaryText: string;
  decisionsText: string;
  openTasks: OpenTasksSnapshot;
  recentStageLogs: CollaborationProjectStageLogEntry[];
}> {
  const files = await ensureCollaborationProjectMemory(input);
  const [summaryText, decisionsText, openTasksText, stageLogText] = await Promise.all([
    readUtf8Safe(files.projectSummaryPath),
    readUtf8Safe(files.decisionsPath),
    readUtf8Safe(files.openTasksPath),
    readUtf8Safe(files.stageLogPath),
  ]);

  return {
    files,
    summaryText,
    decisionsText,
    openTasks: normalizeOpenTasks(openTasksText, input.projectId),
    recentStageLogs: parseStageLog(stageLogText).slice(-8),
  };
}

export async function appendCollaborationProjectStageLog(input: {
  workspaceRoot: string;
  projectId: string;
  projectTitle?: string;
  entry: CollaborationProjectStageLogEntry;
}): Promise<string> {
  const files = await ensureCollaborationProjectMemory(input);
  const existing = await readUtf8Safe(files.stageLogPath);
  const line = `${JSON.stringify({
    ...input.entry,
    reportedAt: asIsoString(input.entry.reportedAt) ?? new Date().toISOString(),
    approvedAt: asIsoString(input.entry.approvedAt),
  })}\n`;
  await writeFile(files.stageLogPath, `${existing}${line}`, "utf8");
  return files.stageLogPath;
}

export async function updateCollaborationProjectSummary(input: {
  workspaceRoot: string;
  projectId: string;
  projectTitle: string;
  summary: string;
  stage?: string;
  taskTitle?: string;
  ownerAgentId?: string;
  artifacts?: Array<{ label?: string; location: string }>;
  nextSuggestion?: string;
  updatedAt?: string;
}): Promise<string> {
  const files = await ensureCollaborationProjectMemory(input);
  const updatedAt = asIsoString(input.updatedAt) ?? new Date().toISOString();
  const artifactLines =
    input.artifacts && input.artifacts.length > 0
      ? input.artifacts.map((artifact) => `- ${artifact.label ? `${artifact.label}: ` : ""}${artifact.location}`).join("\n")
      : "- None recorded";
  const summaryText = [
    `# ${input.projectTitle}`,
    "",
    `Project ID: ${input.projectId}`,
    `Last updated: ${updatedAt}`,
    "",
    "## Current summary",
    input.summary.trim() || "No approved stage summary yet.",
    "",
    "## Latest approved stage",
    `- Stage: ${input.stage?.trim() || "delivery"}`,
    `- Task: ${input.taskTitle?.trim() || "Not specified"}`,
    `- Owner: ${input.ownerAgentId?.trim() || "Jarvis"}`,
    "",
    "## Latest artifacts",
    artifactLines,
    "",
    "## Suggested next step",
    input.nextSuggestion?.trim() || "No next step recorded.",
    "",
  ].join("\n");
  await writeFile(files.projectSummaryPath, summaryText, "utf8");
  return files.projectSummaryPath;
}

export async function syncCollaborationProjectOpenTasks(input: {
  workspaceRoot: string;
  projectId: string;
  projectTitle?: string;
  receipts?: Array<{
    taskId: string;
    projectId: string;
    reviewState?: string;
    lastResultState?: string;
    waitingFor?: string;
    lastReportedAt: string;
  }>;
  dispatchRecords?: Array<{
    taskId: string;
    projectId: string;
    ownerAgentId: string;
    stage: string;
  }>;
}): Promise<string> {
  const files = await ensureCollaborationProjectMemory(input);
  const [taskStore, projectStore] = await Promise.all([loadTaskStore(), loadProjectStore()]);
  const project = projectStore.projects.find((item) => item.projectId === input.projectId);
  const receiptByTaskId = new Map(
    (input.receipts ?? [])
      .filter((item) => item.projectId === input.projectId)
      .map((item) => [item.taskId, item]),
  );
  const dispatchByTaskId = new Map(
    (input.dispatchRecords ?? [])
      .filter((item) => item.projectId === input.projectId)
      .map((item) => [item.taskId, item]),
  );

  const snapshot: OpenTasksSnapshot = {
    projectId: input.projectId,
    updatedAt: new Date().toISOString(),
    tasks: taskStore.tasks
      .filter((task) => task.projectId === input.projectId && task.status !== "done")
      .map((task) => ({
        taskId: task.taskId,
        title: task.title,
        owner: task.owner,
        status: task.status,
        reviewState: receiptByTaskId.get(task.taskId)?.reviewState,
        lastResultState: receiptByTaskId.get(task.taskId)?.lastResultState,
        waitingFor: receiptByTaskId.get(task.taskId)?.waitingFor,
        stage: dispatchByTaskId.get(task.taskId)?.stage,
        updatedAt: task.updatedAt,
      }))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
  };

  await writeFile(files.openTasksPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  if (project?.title) {
    const summaryText = await readUtf8Safe(files.projectSummaryPath);
    if (!summaryText.trim()) {
      await updateCollaborationProjectSummary({
        workspaceRoot: input.workspaceRoot,
        projectId: input.projectId,
        projectTitle: project.title,
        summary: "No approved stage summary yet.",
        updatedAt: snapshot.updatedAt,
      });
    }
  }

  return files.openTasksPath;
}

export function resolveCollaborationProjectFiles(
  workspaceRoot: string,
  projectId: string,
): CollaborationProjectFiles {
  const projectDir = join(workspaceRoot, "projects", collaborationProjectDirName(projectId));
  return {
    projectDir,
    projectSummaryPath: join(projectDir, "PROJECT.md"),
    stageLogPath: join(projectDir, "memory", "stage-log.jsonl"),
    openTasksPath: join(projectDir, "memory", "open-tasks.json"),
    decisionsPath: join(projectDir, "memory", "decisions.md"),
    artifactsDir: join(projectDir, "artifacts"),
  };
}

export function parseStageLog(input: string): CollaborationProjectStageLogEntry[] {
  return String(input || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line) as CollaborationProjectStageLogEntry;
        return parsed?.taskId && parsed?.projectId ? [parsed] : [];
      } catch {
        return [];
      }
    });
}

function normalizeOpenTasks(input: string, projectId: string): OpenTasksSnapshot {
  try {
    const parsed = JSON.parse(input) as Partial<OpenTasksSnapshot>;
    return {
      projectId: String(parsed.projectId || projectId),
      updatedAt: asIsoString(parsed.updatedAt) ?? new Date().toISOString(),
      tasks: Array.isArray(parsed.tasks)
        ? parsed.tasks.flatMap((task) => {
            if (!task || typeof task !== "object") return [];
            const item = task as Record<string, unknown>;
            const taskId = typeof item.taskId === "string" ? item.taskId.trim() : "";
            const title = typeof item.title === "string" ? item.title.trim() : "";
            const owner = typeof item.owner === "string" ? item.owner.trim() : "";
            const status = typeof item.status === "string" ? item.status.trim() : "";
            const updatedAt = asIsoString(item.updatedAt) ?? new Date().toISOString();
            if (!taskId || !title || !owner || !status) return [];
            return [
              {
                taskId,
                title,
                owner,
                status,
                reviewState: typeof item.reviewState === "string" ? item.reviewState.trim() : undefined,
                lastResultState:
                  typeof item.lastResultState === "string" ? item.lastResultState.trim() : undefined,
                waitingFor: typeof item.waitingFor === "string" ? item.waitingFor.trim() : undefined,
                stage: typeof item.stage === "string" ? item.stage.trim() : undefined,
                updatedAt,
              },
            ];
          })
        : [],
    };
  } catch {
    return {
      projectId,
      updatedAt: new Date().toISOString(),
      tasks: [],
    };
  }
}

async function ensureTextFile(path: string, contents: string): Promise<void> {
  try {
    await readFile(path, "utf8");
  } catch {
    await writeFile(path, contents, "utf8");
  }
}

async function readUtf8Safe(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

function buildDefaultProjectSummary(input: { projectId: string; projectTitle: string }): string {
  return [
    `# ${input.projectTitle}`,
    "",
    `Project ID: ${input.projectId}`,
    `Last updated: ${new Date().toISOString()}`,
    "",
    "## Current summary",
    "No approved stage summary yet.",
    "",
    "## Latest approved stage",
    "- Stage: Not started",
    "- Task: Not assigned",
    "- Owner: Jarvis",
    "",
    "## Latest artifacts",
    "- None recorded",
    "",
    "## Suggested next step",
    "Wait for Jarvis to dispatch the first task.",
    "",
  ].join("\n");
}

function trimWindowsUnsafeSegmentTail(value: string): string {
  return String(value || "").replace(/[. ]+$/g, "");
}

function asIsoString(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}
