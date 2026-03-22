import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ToolClient } from "../clients/tool-client";
import type { AgentTurnResponse, SessionsListItem } from "../contracts/openclaw-tools";
import {
  appendCollaborationRoomEvents,
  createCollaborationAttachmentFromFile,
  loadAllCollaborationRooms,
  loadCollaborationRoom,
  setCollaborationSessionBinding,
  upsertCollaborationTaskReceipt,
  type CollaborationRoomEvent,
  type CollaborationRoomState,
  type CollaborationSessionBinding,
  type CollaborationTaskReceipt,
  type ProjectTaskDispatchRecord,
} from "./collaboration-room";
import {
  extractCollaborationAgentArtifactPathsFromRawJson,
  parseCollaborationAgentArtifacts,
} from "./collaboration-agent-artifacts";
import { parseStageResultEnvelopeFromReply, type StageResultEnvelope } from "./collaboration-stage-results";
import {
  loadCurrentAgentCatalog,
  resolveOpenClawHomePath,
  type CurrentAgentCatalog,
  type CurrentAgentCatalogEntry,
} from "./current-agent-catalog";
import { isInternalMonitorAgentId } from "./system-agent-ids";
import { updateTaskStatus } from "./task-store";
import type { ProjectTask } from "../types";

const ACTIVE_SESSION_STATES = new Set([
  "running",
  "active",
  "busy",
  "blocked",
  "waiting_approval",
  "working",
  "in_progress",
  "processing",
  "thinking",
  "executing",
  "streaming",
]);
const DEFAULT_STALE_COLLABORATION_WINDOW_MS = 8 * 60 * 1000;
const RECOVERY_ATTENTION_WINDOW_MS = 12 * 60 * 60 * 1000;
const FAILED_TURN_RETRY_COOLDOWN_MS = 60 * 1000;
const STALE_IN_PROGRESS_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ACTIONS_PER_RUN = 2;
const DEFAULT_ACTION_TIMEOUT_SECONDS = 90;
const INTERNAL_WAKE_FAILURE_NOTICE_THRESHOLD = 5;
const SUPPORTED_ARTIFACT_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".md",
  ".markdown",
  ".txt",
  ".json",
  ".yml",
  ".yaml",
  ".csv",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".css",
  ".svg",
  ".xml",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
]);

export interface HeartRateMonitorTaskState {
  lastAttemptAt: string;
  lastOutcome: "resumed" | "failed" | "skipped";
  attemptCount: number;
  issueKey: string;
  consecutiveFailures?: number;
  lastEscalatedFailureCount?: number;
  lastFailureDetail?: string;
}

export interface HeartRateMonitorPersistentState {
  generatedAt: string;
  tasks: Record<string, HeartRateMonitorTaskState>;
}

export interface HeartRateMonitorAgentStatus {
  agentId: string;
  displayName: string;
  workspaceRoot?: string;
  sessionState: "idle" | "active" | "stale";
  activeSessionCount: number;
  latestSessionAt?: string;
  collaborationState: "idle" | "in_progress" | "stale" | "failed" | "blocked" | "awaiting_review";
  currentStage?: string;
  currentTaskTitle?: string;
  currentIssue?: string;
}

export interface HeartRateMonitorRecoveryCandidate {
  candidateId: string;
  issueKey: "stale_in_progress" | "failed_turn";
  roomId: string;
  projectId: string;
  taskId: string;
  agentId: string;
  displayName: string;
  workspaceRoot: string;
  stage: string;
  title: string;
  goal: string;
  definitionOfDone: string[];
  expectedArtifacts: string[];
  requiredContextRefs: string[];
  summary?: string;
  blockers: string[];
  lastHeartbeatAt: string;
  heartbeatAgeMs: number;
  lastResultState?: CollaborationTaskReceipt["lastResultState"];
  reviewState?: CollaborationTaskReceipt["reviewState"];
  sessionBinding?: CollaborationSessionBinding;
}

export interface HeartRateMonitorAction {
  candidateId: string;
  roomId: string;
  projectId: string;
  taskId: string;
  agentId: string;
  issueKey: HeartRateMonitorRecoveryCandidate["issueKey"];
  attemptedAt: string;
  ok: boolean;
  outcome: "resumed" | "failed" | "skipped";
  detail: string;
  sessionId?: string;
  sessionKey?: string;
  responseStopReason?: string;
  responseErrorMessage?: string;
}

export interface HeartRateMonitorControlChainStatus {
  workerHeartbeatAgeMs?: number;
  workerState?: string;
  supervisorStatus?: string;
  supervisorReason?: string;
  watchdogOutcome?: string;
  watchdogActions: string[];
}

export interface HeartRateMonitorReport {
  generatedAt: string;
  runtimeDir: string;
  agentCatalog: {
    sourcePath: string;
    detail: string;
    totalAgents: number;
  };
  controlChain: HeartRateMonitorControlChainStatus;
  summary: {
    agentsObserved: number;
    activeAgents: number;
    staleAgents: number;
    recoveryCandidates: number;
    attemptedRecoveries: number;
    successfulRecoveries: number;
  };
  agents: HeartRateMonitorAgentStatus[];
  recoveryCandidates: HeartRateMonitorRecoveryCandidate[];
  actions: HeartRateMonitorAction[];
}

interface HeartRateMonitorRecoveryOutput {
  replyText: string;
  rawPaths: string[];
  envelope?: StageResultEnvelope;
}

interface HeartRateMonitorPaths {
  runtimeDir: string;
  reportPath: string;
  auditPath: string;
  statePath: string;
}

export async function runHeartRateMonitor(
  toolClient: ToolClient,
  options: {
    runtimeDir?: string;
    maxActionsPerRun?: number;
    dryRun?: boolean;
    now?: Date;
  } = {},
): Promise<HeartRateMonitorReport> {
  const now = options.now ?? new Date();
  const paths = resolveMonitorPaths(options.runtimeDir);
  const maxActionsPerRun = normalizePositiveInt(
    options.maxActionsPerRun ??
      Number(process.env.HEART_RATE_MONITOR_MAX_ACTIONS_PER_RUN ?? DEFAULT_MAX_ACTIONS_PER_RUN),
    DEFAULT_MAX_ACTIONS_PER_RUN,
  );
  const dryRun = options.dryRun ?? process.env.HEART_RATE_MONITOR_DRY_RUN === "true";

  const [catalog, sessionsResponse, rooms, state, controlChain] = await Promise.all([
    loadCurrentAgentCatalog(),
    toolClient.sessionsList(),
    loadAllCollaborationRooms(),
    readMonitorState(paths.statePath),
    loadControlChainStatus(paths.runtimeDir),
  ]);

  const sessions = sessionsResponse.sessions ?? [];
  const tasks = await loadTasksFromRooms(rooms);
  const agents = buildHeartRateMonitorAgentStatuses({
    catalog,
    sessions,
    rooms,
    tasks,
    now,
  });

  const candidates = selectHeartRateMonitorRecoveryCandidates({
    catalog,
    sessions,
    rooms,
    tasks,
    now,
  });
  const filteredCandidates = candidates.filter((candidate) => !isCandidateCoolingDown(candidate, state, now));
  const actions: HeartRateMonitorAction[] = [];
  const nextState: HeartRateMonitorPersistentState = {
    generatedAt: now.toISOString(),
    tasks: { ...state.tasks },
  };

  for (const candidate of filteredCandidates.slice(0, maxActionsPerRun)) {
    const previousTaskState = state.tasks[candidate.candidateId];
    const action = dryRun
      ? buildDryRunAction(candidate, now)
      : await recoverHeartRateCandidate({
          candidate,
          toolClient,
          now,
          openclawWorkspaceRoot: resolveOpenClawWorkspaceRoot(),
        });
    actions.push(action);
    const nextTaskState = buildNextMonitorTaskState(previousTaskState, action, candidate.issueKey);
    nextState.tasks[candidate.candidateId] = nextTaskState;
    const wakeFailureNotice = buildWakeFailureNoticeEvent({
      candidate,
      action,
      previousState: previousTaskState,
      nextState: nextTaskState,
    });
    if (wakeFailureNotice) {
      nextTaskState.lastEscalatedFailureCount = nextTaskState.consecutiveFailures;
      await appendCollaborationRoomEvents(candidate.roomId, [wakeFailureNotice]).catch(() => void 0);
    }
  }

  const report: HeartRateMonitorReport = {
    generatedAt: now.toISOString(),
    runtimeDir: paths.runtimeDir,
    agentCatalog: {
      sourcePath: catalog.sourcePath,
      detail: catalog.detail,
      totalAgents: catalog.entries.length,
    },
    controlChain,
    summary: {
      agentsObserved: agents.length,
      activeAgents: agents.filter((agent) => agent.sessionState === "active" || agent.collaborationState === "in_progress").length,
      staleAgents: agents.filter((agent) => agent.sessionState === "stale" || agent.collaborationState === "stale").length,
      recoveryCandidates: filteredCandidates.length,
      attemptedRecoveries: actions.length,
      successfulRecoveries: actions.filter((action) => action.ok && action.outcome === "resumed").length,
    },
    agents,
    recoveryCandidates: filteredCandidates,
    actions,
  };

  await writeReport(paths.reportPath, report);
  await writeMonitorState(paths.statePath, nextState);
  await appendAudit(
    paths.auditPath,
    `${report.generatedAt} | candidates=${report.summary.recoveryCandidates} | attempted=${report.summary.attemptedRecoveries} | resumed=${report.summary.successfulRecoveries} | dryRun=${dryRun ? "true" : "false"}`,
  );

  return report;
}

export function buildHeartRateMonitorAgentStatuses(input: {
  catalog: CurrentAgentCatalog;
  sessions: SessionsListItem[];
  rooms: CollaborationRoomState[];
  tasks: ProjectTask[];
  now?: Date;
}): HeartRateMonitorAgentStatus[] {
  const nowMs = (input.now ?? new Date()).getTime();
  const sessionsByAgent = new Map<string, SessionsListItem[]>();
  for (const session of input.sessions) {
    const agentId = normalizeAgentId(session.agentId);
    if (!agentId) continue;
    const bucket = sessionsByAgent.get(agentId) ?? [];
    bucket.push(session);
    sessionsByAgent.set(agentId, bucket);
  }

  const collaborationByAgent = buildCollaborationStatusByAgent(
    input.rooms,
    input.tasks,
    nowMs,
    input.catalog.primaryAgentId ?? "main",
  );
  return input.catalog.entries
    .filter((entry) => !isMonitorAgentId(entry.agentId))
    .map((entry) => {
      const normalizedAgentId = normalizeAgentId(entry.agentId);
      const sessions = sessionsByAgent.get(normalizedAgentId) ?? [];
      const activeSessions = sessions.filter((session) => isActiveSession(session));
      const latestSessionAtMs = sessions.reduce<number>((max, session) => {
        const updatedAtMs = normalizeSessionUpdatedAtMs(session);
        return Number.isFinite(updatedAtMs) ? Math.max(max, updatedAtMs) : max;
      }, 0);
      const sessionState =
        activeSessions.length === 0
          ? "idle"
          : latestSessionAtMs > 0 && nowMs - latestSessionAtMs > resolveStaleCollaborationWindowMs()
            ? "stale"
            : "active";
      const collaboration = collaborationByAgent.get(normalizedAgentId);
      return {
        agentId: entry.agentId,
        displayName: entry.displayName,
        workspaceRoot: entry.workspace,
        sessionState,
        activeSessionCount: activeSessions.length,
        latestSessionAt: latestSessionAtMs > 0 ? new Date(latestSessionAtMs).toISOString() : undefined,
        collaborationState: collaboration?.state ?? "idle",
        currentStage: collaboration?.stage,
        currentTaskTitle: collaboration?.title,
        currentIssue: collaboration?.issue,
      };
    });
}

export function selectHeartRateMonitorRecoveryCandidates(input: {
  catalog: CurrentAgentCatalog;
  sessions: SessionsListItem[];
  rooms: CollaborationRoomState[];
  tasks: ProjectTask[];
  now?: Date;
}): HeartRateMonitorRecoveryCandidate[] {
  const nowMs = (input.now ?? new Date()).getTime();
  const taskByKey = new Map(input.tasks.map((task) => [buildProjectTaskKey(task.projectId, task.taskId), task]));
  const catalogByAgent = new Map(
    input.catalog.entries.map((entry) => [normalizeAgentId(entry.agentId), entry] as const),
  );
  const sessionsByAgent = new Map<string, SessionsListItem[]>();
  for (const session of input.sessions) {
    const agentId = normalizeAgentId(session.agentId);
    if (!agentId) continue;
    const bucket = sessionsByAgent.get(agentId) ?? [];
    bucket.push(session);
    sessionsByAgent.set(agentId, bucket);
  }

  const strongestByAgent = new Map<string, HeartRateMonitorRecoveryCandidate>();
  for (const room of input.rooms) {
    for (const dispatch of room.dispatchRecords) {
      const normalizedAgentId = normalizeAgentId(dispatch.ownerAgentId);
      if (!normalizedAgentId || isMonitorAgentId(normalizedAgentId)) continue;
      const receipt = room.taskReceipts.find(
        (item) => item.projectId === dispatch.projectId && item.taskId === dispatch.taskId,
      );
      const task = taskByKey.get(buildProjectTaskKey(dispatch.projectId, dispatch.taskId));
      const lastHeartbeatAt = receipt?.lastReportedAt ?? dispatch.createdAt;
      const heartbeatAtMs = Date.parse(lastHeartbeatAt);
      if (!Number.isFinite(heartbeatAtMs)) continue;
      const heartbeatAgeMs = Math.max(0, nowMs - heartbeatAtMs);
      const issueKey = resolveRecoveryIssueKey(receipt, task, heartbeatAgeMs, {
        waitingForUserConfirmation: hasPendingPrimaryUserConfirmation({
          room,
          dispatch,
          receipt,
          primaryAgentId: input.catalog.primaryAgentId ?? "main",
        }),
      });
      if (!issueKey) continue;
      const entry = catalogByAgent.get(normalizedAgentId);
      const workspaceRoot = resolveAgentWorkspaceRoot(entry, dispatch.ownerAgentId);
      const candidate: HeartRateMonitorRecoveryCandidate = {
        candidateId: `${room.roomId}:${dispatch.projectId}:${dispatch.taskId}:${normalizedAgentId}`,
        issueKey,
        roomId: room.roomId,
        projectId: dispatch.projectId,
        taskId: dispatch.taskId,
        agentId: dispatch.ownerAgentId,
        displayName: entry?.displayName ?? dispatch.ownerAgentId,
        workspaceRoot,
        stage: dispatch.stage,
        title: dispatch.title,
        goal: dispatch.goal,
        definitionOfDone: dispatch.definitionOfDone,
        expectedArtifacts: dispatch.expectedArtifacts,
        requiredContextRefs: dispatch.requiredContextRefs,
        summary: receipt?.summary ?? receipt?.recentOutput,
        blockers: receipt?.blockers ?? [],
        lastHeartbeatAt,
        heartbeatAgeMs,
        lastResultState: receipt?.lastResultState,
        reviewState: receipt?.reviewState,
        sessionBinding:
          room.sessionBindings.find((binding) => normalizeAgentId(binding.agentId) === normalizedAgentId) ??
          guessBestSessionBinding(sessionsByAgent.get(normalizedAgentId) ?? []),
      };
      const previous = strongestByAgent.get(normalizedAgentId);
      if (!previous || compareRecoveryCandidates(candidate, previous) < 0) {
        strongestByAgent.set(normalizedAgentId, candidate);
      }
    }
  }

  return [...strongestByAgent.values()].sort(compareRecoveryCandidates);
}

export function buildHeartRateMonitorRecoveryPrompt(candidate: HeartRateMonitorRecoveryCandidate): string {
  return [
    "[[internal_wake_resume]]",
    "Internal recovery wake.",
    "Resume the SAME stage in the SAME session.",
    "Do not treat this as a new user request.",
    "Do not restart the task from scratch.",
    "Do not repeat finished work or overwrite already-correct files.",
    "Reuse existing files and continue from the current workspace state.",
    "",
    `Employee: ${candidate.displayName} (${candidate.agentId})`,
    `Current stage: ${candidate.stage}`,
    `Current task: ${candidate.title}`,
    `Project: ${candidate.projectId}`,
    `Issue: ${candidate.issueKey === "failed_turn" ? "the last stage turn failed" : "the collaboration session stopped replying normally"}`,
    "",
    candidate.summary?.trim() ? `Latest recorded summary: ${candidate.summary.trim()}` : "",
    candidate.blockers.length > 0 ? `Known blockers: ${candidate.blockers.join(" | ")}` : "",
    "Keep the visible reply language consistent with the active collaboration context; default to Chinese if unclear.",
    `Preferred workspace root: ${candidate.workspaceRoot}.`,
    "Append the hidden [[openclaw-files]] footer at the end only when files were changed.",
    "",
    "Before you finish, append exactly one <stage_result>...</stage_result> block.",
    'Use resultState="in_progress" if the stage still needs more work.',
    'Use resultState="awaiting_review" if the stage is ready for Jarvis review.',
    'Use resultState="blocked" only when there is a real blocker that prevents progress.',
    'Use resultState="failed" only when the stage truly failed and cannot continue right now.',
  ].filter(Boolean).join("\n");
}

function buildInterruptedHeartRateMonitorResumePrompt(candidate: HeartRateMonitorRecoveryCandidate): string {
  return [
    "[[internal_wake_resume]]",
    `The previous internal wake for ${candidate.displayName} (${candidate.agentId}) was interrupted after tool activity.`,
    "Continue the same stage in the same session without restarting the task or repeating finished work.",
    "Do not treat this as a new user request.",
    "If any files were already written, keep them and reuse those existing artifacts.",
    "If the stage reply is already ready, send the final user-facing update now and include the hidden [[openclaw-files]] footer and <stage_result> block if they are required for this stage.",
    "Keep the visible reply language consistent with the active collaboration context; default to Chinese if unclear.",
  ].join("\n");
}

function isInterruptedHeartRateMonitorResponse(
  response: Pick<AgentTurnResponse, "replyText" | "rawText" | "stopReason" | "errorMessage" | "failureReason" | "incomplete">,
): boolean {
  const normalizedStopReason = String(response.stopReason || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]+/g, "");
  const signalText = [response.errorMessage, response.failureReason, response.replyText, response.rawText]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join("\n");
  if (response.incomplete) {
    return true;
  }
  if (
    normalizedStopReason === "aborted" ||
    normalizedStopReason === "interrupted" ||
    normalizedStopReason === "cancelled" ||
    normalizedStopReason === "canceled" ||
    normalizedStopReason === "tooluse" ||
    normalizedStopReason === "toolcall"
  ) {
    return true;
  }
  return /request was aborted|turn was aborted|was aborted|cancelled|canceled|request timed out before a response was generated|timed out before a response was generated/.test(
    signalText,
  );
}

function recoveryAttemptCooldownMs(issueKey: HeartRateMonitorRecoveryCandidate["issueKey"]): number {
  return issueKey === "failed_turn" ? FAILED_TURN_RETRY_COOLDOWN_MS : STALE_IN_PROGRESS_RETRY_COOLDOWN_MS;
}

async function recoverHeartRateCandidate(input: {
  candidate: HeartRateMonitorRecoveryCandidate;
  toolClient: ToolClient;
  now: Date;
  openclawWorkspaceRoot: string;
}): Promise<HeartRateMonitorAction> {
  const prompt = buildHeartRateMonitorRecoveryPrompt(input.candidate);
  const responses: AgentTurnResponse[] = [];
  let response = await input.toolClient.agentTurn({
    agentId: input.candidate.agentId,
    sessionId: input.candidate.sessionBinding?.sessionId,
    sessionKey: input.candidate.sessionBinding?.sessionKey,
    message: prompt,
    timeoutSeconds: DEFAULT_ACTION_TIMEOUT_SECONDS,
  });
  responses.push(response);

  if (response.sessionId) {
    await setCollaborationSessionBinding(
      input.candidate.roomId,
      input.candidate.agentId,
      response.sessionId,
      response.sessionKey ?? input.candidate.sessionBinding?.sessionKey,
    );
  }

  if (response.ok && isInterruptedHeartRateMonitorResponse(response)) {
    const resumedResponse = await input.toolClient.agentTurn({
      agentId: input.candidate.agentId,
      sessionId: response.sessionId ?? input.candidate.sessionBinding?.sessionId,
      sessionKey: response.sessionKey ?? input.candidate.sessionBinding?.sessionKey,
      message: buildInterruptedHeartRateMonitorResumePrompt(input.candidate),
      timeoutSeconds: 60,
    });
    responses.push(resumedResponse);
    response = resumedResponse;

    if (response.sessionId) {
      await setCollaborationSessionBinding(
        input.candidate.roomId,
        input.candidate.agentId,
        response.sessionId,
        response.sessionKey ?? input.candidate.sessionBinding?.sessionKey,
      );
    }
  }

  const attemptedAt = new Date().toISOString();
  const partialOutput = mergeHeartRateMonitorRecoveryOutputs(
    responses
      .filter((item) => item.ok)
      .map((item) => describeSuccessfulRecoveryOutput(item)),
  );

  if (!response.ok || isInterruptedHeartRateMonitorResponse(response)) {
    const detail = summarizeHeartRateMonitorRecoveryFailure(response);
    const existingReceipt = await loadCandidateTaskReceipt(input.candidate);
    const failedReceipt = buildFailedRecoveryReceipt({
      candidate: input.candidate,
      existingReceipt,
      attemptedAt,
      detail,
    });
    if (failedReceipt) {
      await upsertCollaborationTaskReceipt(input.candidate.roomId, failedReceipt);
    }
    return {
      candidateId: input.candidate.candidateId,
      roomId: input.candidate.roomId,
      projectId: input.candidate.projectId,
      taskId: input.candidate.taskId,
      agentId: input.candidate.agentId,
      issueKey: input.candidate.issueKey,
      attemptedAt,
      ok: false,
      outcome: "failed",
      detail,
      sessionId: response.sessionId ?? input.candidate.sessionBinding?.sessionId,
      sessionKey: response.sessionKey ?? input.candidate.sessionBinding?.sessionKey,
      responseStopReason: response.stopReason,
      responseErrorMessage: response.errorMessage,
    };
  }

  const output = mergeHeartRateMonitorRecoveryOutputs([
    partialOutput,
    describeSuccessfulRecoveryOutput(response),
  ]);
  const replyAttachments = await collectRecoveryAttachments({
    roomId: input.candidate.roomId,
    workspaceRoot: input.candidate.workspaceRoot,
    openclawWorkspaceRoot: input.openclawWorkspaceRoot,
    rawPaths: output.rawPaths,
  });

  const resumedEvents: Array<Omit<CollaborationRoomEvent, "sequence" | "createdAt">> = [];
  if (output.replyText || replyAttachments.length > 0) {
    resumedEvents.push(buildMonitorEvent({
      type: "agent_reply",
      agentId: input.candidate.agentId,
      message: output.replyText || undefined,
      attachmentIds: replyAttachments.map((attachment) => attachment.attachmentId),
      relatedSessionId: response.sessionId ?? input.candidate.sessionBinding?.sessionId,
      relatedSessionKey: response.sessionKey ?? input.candidate.sessionBinding?.sessionKey,
    }));
  }
  if (resumedEvents.length > 0) {
    await appendCollaborationRoomEvents(input.candidate.roomId, resumedEvents);
  }
  await persistSuccessfulRecoveryResult({
    candidate: input.candidate,
    envelope: output.envelope,
    replyText: output.replyText,
    reportedAt: attemptedAt,
  });

  return {
    candidateId: input.candidate.candidateId,
    roomId: input.candidate.roomId,
    projectId: input.candidate.projectId,
    taskId: input.candidate.taskId,
    agentId: input.candidate.agentId,
    issueKey: input.candidate.issueKey,
    attemptedAt,
    ok: true,
    outcome: "resumed",
    detail: output.envelope?.summary ?? output.replyText ?? "recovered",
    sessionId: response.sessionId ?? input.candidate.sessionBinding?.sessionId,
    sessionKey: response.sessionKey ?? input.candidate.sessionBinding?.sessionKey,
    responseStopReason: response.stopReason,
    responseErrorMessage: response.errorMessage,
  };
}

async function persistSuccessfulRecoveryResult(input: {
  candidate: HeartRateMonitorRecoveryCandidate;
  envelope?: StageResultEnvelope;
  replyText: string;
  reportedAt: string;
}): Promise<void> {
  const summary = summarizeRecoveryText(input.envelope?.summary, input.replyText, input.candidate.goal);
  const baseReceipt: CollaborationTaskReceipt = {
    taskId: input.candidate.taskId,
    projectId: input.candidate.projectId,
    lastReportedAt: input.reportedAt,
    lastReportedBy: input.candidate.agentId,
    taskTitle: input.candidate.title,
    stage: input.candidate.stage,
    summary,
    recentOutput: summary,
    blockers: input.envelope?.blockers ?? [],
  };

  if (!input.envelope) {
    await upsertCollaborationTaskReceipt(input.candidate.roomId, {
      ...baseReceipt,
      lastResultState: "in_progress",
    });
    return;
  }

  if (input.envelope.resultState === "blocked") {
    await upsertCollaborationTaskReceipt(input.candidate.roomId, {
      ...baseReceipt,
      lastResultState: "blocked",
    });
    await safelyUpdateTaskStatus(input.candidate.projectId, input.candidate.taskId, "blocked");
    return;
  }

  if (input.envelope.resultState === "failed") {
    await upsertCollaborationTaskReceipt(input.candidate.roomId, {
      ...baseReceipt,
      lastResultState: "failed",
    });
    return;
  }

  if (input.envelope.resultState === "awaiting_review") {
    await upsertCollaborationTaskReceipt(input.candidate.roomId, {
      ...baseReceipt,
      reviewState: "awaiting_review",
      lastResultState: "awaiting_review",
      waitingFor: "jarvis_review",
    });
    await safelyUpdateTaskStatus(input.candidate.projectId, input.candidate.taskId, "in_progress");
    return;
  }

  await upsertCollaborationTaskReceipt(input.candidate.roomId, {
    ...baseReceipt,
    lastResultState: "in_progress",
  });
  await safelyUpdateTaskStatus(input.candidate.projectId, input.candidate.taskId, "in_progress");
}

async function loadCandidateTaskReceipt(
  candidate: Pick<HeartRateMonitorRecoveryCandidate, "roomId" | "projectId" | "taskId">,
): Promise<CollaborationTaskReceipt | undefined> {
  try {
    const room = await loadCollaborationRoom(candidate.roomId);
    return room.taskReceipts.find(
      (item) => item.projectId === candidate.projectId && item.taskId === candidate.taskId,
    );
  } catch {
    return undefined;
  }
}

function isReviewReadyReceipt(receipt: CollaborationTaskReceipt | undefined): boolean {
  return receipt?.reviewState === "awaiting_review" || receipt?.lastResultState === "awaiting_review";
}

function isWaitingForUserConfirmationReceipt(receipt: CollaborationTaskReceipt | undefined): boolean {
  return receipt?.reviewState === "awaiting_review" && receipt?.waitingFor === "user_confirmation";
}

function isCompletedReceipt(receipt: CollaborationTaskReceipt | undefined, task: ProjectTask | undefined): boolean {
  return receipt?.reviewState === "approved" || isReviewReadyReceipt(receipt) || task?.status === "done";
}

function stripHeartRateMonitorReplyControlText(replyText: string | undefined): string {
  const parsed = parseStageResultEnvelopeFromReply(String(replyText || ""), {
    taskId: "display",
    projectId: "display",
    agentId: "display",
  });
  return parsed.cleanReplyText.replace(/^\[\[reply_to_current\]\]\s*/i, "").replace(/\s+/g, " ").trim();
}

function isPrimaryReplyWaitingForUserConfirmation(replyText: string | undefined): boolean {
  const visibleText = stripHeartRateMonitorReplyControlText(replyText);
  if (!visibleText) {
    return false;
  }
  if (
    /(?:waiting for your (?:confirmation|approval|decision)|once you (?:confirm|approve|choose|pick|decide)|after you (?:confirm|approve|choose|pick|decide)|please (?:confirm|approve|choose|pick|select|decide)|review and confirm|let me know which|tell me which option|which option|pick one|choose one|green light|go-ahead|go ahead)/i.test(
      visibleText,
    )
  ) {
    return true;
  }
  if (
    /(?:\u8bf7\u786e\u8ba4|\u7b49\u5f85\u4f60\u7684\u786e\u8ba4|\u7b49\u4f60\u786e\u8ba4|\u4f60\u786e\u8ba4\u540e\u6211\u7ee7\u7eed|\u786e\u8ba4\u540e\u6211\u7ee7\u7eed|\u8bf7\u62cd\u677f|\u7b49\u4f60\u62cd\u677f|\u4f60\u62cd\u677f\u540e\u6211\u7ee7\u7eed|\u8bf7\u9009\u62e9|\u9009\u4e00\u4e2a|\u4f60\u9009\u5b9a\u540e\u6211\u7ee7\u7eed|\u8bf7\u51b3\u5b9a|\u7b49\u4f60\u51b3\u5b9a|\u8bf7\u5b9a\u593a|\u544a\u8bc9\u6211\u9009\u54ea\u4e2a|\u4f60\u70b9\u5934\u540e\u6211\u518d\u7ee7\u7eed)/.test(
      visibleText,
    )
  ) {
    return true;
  }
  const asksForDecision =
    /(?:confirm|approval|approve|choose|pick|select|decide|decision|preference|which option|option [a-z]|go-ahead|go ahead)/i.test(
      visibleText,
    ) ||
    /(?:\u786e\u8ba4|\u62cd\u677f|\u9009\u62e9|\u9009\u9879|\u51b3\u5b9a|\u5b9a\u593a|\u504f\u597d|\u65b9\u6848[abAB])/.test(
      visibleText,
    );
  const gatesContinuation =
    /(?:continue|proceed|move forward|next step|i(?:'| wi)?ll continue|then continue|before i continue|before proceeding)/i.test(
      visibleText,
    ) ||
    /(?:\u7ee7\u7eed|\u518d\u5f80\u4e0b|\u4e0b\u4e00\u6b65|\u540e\u7eed|\u6211\u518d\u7ee7\u7eed|\u6211\u518d\u63a8\u8fdb)/.test(
      visibleText,
    );
  return asksForDecision && gatesContinuation;
}

function hasPendingPrimaryUserConfirmation(input: {
  room: CollaborationRoomState;
  dispatch: ProjectTaskDispatchRecord;
  receipt: CollaborationTaskReceipt | undefined;
  primaryAgentId: string;
}): boolean {
  if (isWaitingForUserConfirmationReceipt(input.receipt)) {
    return true;
  }
  if (normalizeAgentId(input.dispatch.ownerAgentId) !== normalizeAgentId(input.primaryAgentId)) {
    return false;
  }
  const latestPrimaryReply = [...input.room.events]
    .filter(
      (event) =>
        event.type === "agent_reply" &&
        normalizeAgentId(event.agentId) === normalizeAgentId(input.primaryAgentId),
    )
    .at(-1);
  if (!latestPrimaryReply || !isPrimaryReplyWaitingForUserConfirmation(latestPrimaryReply.message)) {
    return false;
  }
  return !input.room.events.some(
    (event) => event.type === "user_message" && event.sequence > latestPrimaryReply.sequence,
  );
}

function buildFailedRecoveryReceipt(input: {
  candidate: Pick<HeartRateMonitorRecoveryCandidate, "agentId" | "projectId" | "stage" | "taskId" | "title">;
  existingReceipt?: CollaborationTaskReceipt;
  attemptedAt: string;
  detail: string;
}): CollaborationTaskReceipt | undefined {
  if (isCompletedReceipt(input.existingReceipt, undefined)) {
    return undefined;
  }
  return {
    taskId: input.candidate.taskId,
    projectId: input.candidate.projectId,
    lastResultState: "failed",
    lastReportedAt: input.attemptedAt,
    lastReportedBy: input.candidate.agentId,
    taskTitle: input.candidate.title,
    stage: input.candidate.stage,
    summary: input.detail,
    recentOutput: input.detail,
  };
}

function buildNextMonitorTaskState(
  previous: HeartRateMonitorTaskState | undefined,
  action: HeartRateMonitorAction,
  issueKey: HeartRateMonitorRecoveryCandidate["issueKey"],
): HeartRateMonitorTaskState {
  const previousFailures =
    previous?.lastOutcome === "failed"
      ? Math.max(0, Math.trunc(previous.consecutiveFailures ?? 1))
      : 0;
  const consecutiveFailures = action.outcome === "failed" ? previousFailures + 1 : 0;
  return {
    lastAttemptAt: action.attemptedAt,
    lastOutcome: action.outcome,
    attemptCount: Math.max(0, Math.trunc(previous?.attemptCount ?? 0)) + 1,
    issueKey,
    consecutiveFailures,
    lastEscalatedFailureCount: action.outcome === "failed"
      ? Math.max(0, Math.trunc(previous?.lastEscalatedFailureCount ?? 0))
      : 0,
    lastFailureDetail: action.outcome === "failed" ? action.detail : undefined,
  };
}

function buildWakeFailureNoticeEvent(input: {
  candidate: HeartRateMonitorRecoveryCandidate;
  action: HeartRateMonitorAction;
  previousState?: HeartRateMonitorTaskState;
  nextState: HeartRateMonitorTaskState;
}): Omit<CollaborationRoomEvent, "sequence" | "createdAt"> | undefined {
  if (input.action.outcome !== "failed") {
    return undefined;
  }
  const consecutiveFailures = Math.max(0, Math.trunc(input.nextState.consecutiveFailures ?? 0));
  const lastEscalated = Math.max(0, Math.trunc(input.previousState?.lastEscalatedFailureCount ?? 0));
  if (
    consecutiveFailures < INTERNAL_WAKE_FAILURE_NOTICE_THRESHOLD ||
    consecutiveFailures === lastEscalated
  ) {
    return undefined;
  }
  if (consecutiveFailures % INTERNAL_WAKE_FAILURE_NOTICE_THRESHOLD !== 0) {
    return undefined;
  }
  const reason = humanizeWakeFailureReason(input.action.detail);
  const detail = `未能唤醒 ${input.candidate.displayName}（已连续失败 ${consecutiveFailures} 次）：${reason}`;
  return buildMonitorEvent({
    type: "system_note",
    agentId: input.candidate.agentId,
    detail,
    relatedSessionId: input.action.sessionId ?? input.candidate.sessionBinding?.sessionId,
    relatedSessionKey: input.action.sessionKey ?? input.candidate.sessionBinding?.sessionKey,
  });
}

function humanizeWakeFailureReason(detail: string | undefined): string {
  const normalized = String(detail || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "暂时没有拿到明确原因。";
  }
  if (/unknown option '--session-key'/i.test(normalized)) {
    return "当前 OpenClaw CLI 不支持会话续接参数。";
  }
  if (/spawn openclaw .*enoent/i.test(normalized) || /not found/i.test(normalized)) {
    return "本机没有成功调用 OpenClaw CLI。";
  }
  if (/502|bad gateway|gateway/i.test(normalized)) {
    return "上游模型服务暂时不可用。";
  }
  if (/session lock|stale lock|lock owner|lock conflict/i.test(normalized)) {
    return "会话被锁住了，还不能安全续接。";
  }
  if (/aborted|timed out|timeout|interrupted/i.test(normalized)) {
    return "上游请求反复中断或超时。";
  }
  return normalized.slice(0, 180);
}

async function collectRecoveryAttachments(input: {
  roomId: string;
  workspaceRoot: string;
  openclawWorkspaceRoot: string;
  rawPaths: string[];
}): Promise<Array<{ attachmentId: string }>> {
  const attachments: Array<{ attachmentId: string }> = [];
  for (const path of resolveCandidateArtifactPaths(input)) {
    try {
      const attachment = await createCollaborationAttachmentFromFile({
        roomId: input.roomId,
        sourcePath: path,
        uploadedBy: "agent",
      });
      attachments.push({ attachmentId: attachment.attachmentId });
    } catch {
      continue;
    }
  }
  return attachments;
}

function resolveCandidateArtifactPaths(input: {
  workspaceRoot: string;
  openclawWorkspaceRoot: string;
  rawPaths: string[];
}): string[] {
  const allowedRoots = [resolve(input.workspaceRoot), resolve(input.openclawWorkspaceRoot)];
  const output: string[] = [];
  const seen = new Set<string>();

  for (const rawPath of input.rawPaths) {
    const attempts = resolvePathAttempts(rawPath, input.workspaceRoot, input.openclawWorkspaceRoot);
    for (const candidate of attempts) {
      const normalized = resolve(candidate);
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      if (!isPathInsideAnyRoot(normalized, allowedRoots)) continue;
      if (!looksLikeSupportedArtifactPath(normalized)) continue;
      seen.add(key);
      output.push(normalized);
    }
  }

  return output;
}

function resolvePathAttempts(rawPath: string, workspaceRoot: string, openclawWorkspaceRoot: string): string[] {
  const trimmed = String(rawPath || "").trim();
  if (!trimmed) return [];
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith("\\\\") || trimmed.startsWith("/")) {
    return [trimmed];
  }
  const normalizedWorkspaceRelative = trimmed.replace(/^workspace[\\/]/i, "");
  return [
    resolve(workspaceRoot, trimmed),
    resolve(workspaceRoot, normalizedWorkspaceRelative),
    resolve(openclawWorkspaceRoot, normalizedWorkspaceRelative),
  ];
}

function looksLikeSupportedArtifactPath(path: string): boolean {
  const extensionStart = path.lastIndexOf(".");
  if (extensionStart < 0) return false;
  return SUPPORTED_ARTIFACT_EXTENSIONS.has(path.slice(extensionStart).toLowerCase());
}

function isPathInsideAnyRoot(path: string, roots: string[]): boolean {
  return roots.some((root) => {
    const normalizedPath = path.toLowerCase();
    const normalizedRoot = root.toLowerCase();
    if (!normalizedPath.startsWith(normalizedRoot)) return false;
    const tail = path.slice(root.length);
    return tail === "" || tail.startsWith("\\") || tail.startsWith("/");
  });
}

function describeSuccessfulRecoveryOutput(response: AgentTurnResponse): HeartRateMonitorRecoveryOutput {
  const fallbackReplyText = String(response.replyText || "").trim() || String(response.rawText || "").trim();
  const parsedArtifacts = parseCollaborationAgentArtifacts(fallbackReplyText);
  const parsedStageResult = parseStageResultEnvelopeFromReply(parsedArtifacts.cleanReplyText || fallbackReplyText, {
    agentId: response.agentId,
    reportedAt: new Date().toISOString(),
  });
  const rawPaths = dedupeStrings([
    ...parsedArtifacts.declaredPaths,
    ...parsedArtifacts.hintedPaths,
    ...extractCollaborationAgentArtifactPathsFromRawJson(response.rawJson),
  ]);
  return {
    replyText:
      parsedStageResult.cleanReplyText.trim() ||
      parsedArtifacts.cleanReplyText.trim() ||
      fallbackReplyText,
    rawPaths,
    envelope: parsedStageResult.envelope,
  };
}

export function isInterruptedHeartRateMonitorResponseForSmoke(
  response: Pick<AgentTurnResponse, "replyText" | "rawText" | "stopReason" | "errorMessage" | "failureReason" | "incomplete">,
): boolean {
  return isInterruptedHeartRateMonitorResponse(response);
}

export function buildInterruptedHeartRateMonitorResumePromptForSmoke(
  candidate: HeartRateMonitorRecoveryCandidate,
): string {
  return buildInterruptedHeartRateMonitorResumePrompt(candidate);
}

export function recoveryAttemptCooldownMsForSmoke(
  issueKey: HeartRateMonitorRecoveryCandidate["issueKey"],
): number {
  return recoveryAttemptCooldownMs(issueKey);
}

export function buildFailedRecoveryReceiptForSmoke(input: {
  candidate: Pick<HeartRateMonitorRecoveryCandidate, "agentId" | "projectId" | "stage" | "taskId" | "title">;
  existingReceipt?: CollaborationTaskReceipt;
  attemptedAt: string;
  detail: string;
}): CollaborationTaskReceipt | undefined {
  return buildFailedRecoveryReceipt(input);
}

export function buildWakeFailureNoticeEventForSmoke(input: {
  candidate: HeartRateMonitorRecoveryCandidate;
  action: HeartRateMonitorAction;
  previousState?: HeartRateMonitorTaskState;
  nextState: HeartRateMonitorTaskState;
}): Omit<CollaborationRoomEvent, "sequence" | "createdAt"> | undefined {
  return buildWakeFailureNoticeEvent(input);
}

function buildCollaborationStatusByAgent(
  rooms: CollaborationRoomState[],
  tasks: ProjectTask[],
  nowMs: number,
  primaryAgentId: string,
): Map<string, { state: HeartRateMonitorAgentStatus["collaborationState"]; stage?: string; title?: string; issue?: string }> {
  const taskByKey = new Map(tasks.map((task) => [buildProjectTaskKey(task.projectId, task.taskId), task]));
  const strongest = new Map<string, { state: HeartRateMonitorAgentStatus["collaborationState"]; stage?: string; title?: string; issue?: string; score: number }>();

  for (const room of rooms) {
    for (const dispatch of room.dispatchRecords) {
      const agentId = normalizeAgentId(dispatch.ownerAgentId);
      if (!agentId) continue;
      const receipt = room.taskReceipts.find((item) => item.projectId === dispatch.projectId && item.taskId === dispatch.taskId);
      const task = taskByKey.get(buildProjectTaskKey(dispatch.projectId, dispatch.taskId));
      const lastHeartbeatAt = receipt?.lastReportedAt ?? dispatch.createdAt;
      const ageMs = Math.max(0, nowMs - Date.parse(lastHeartbeatAt));
      const state = resolveCollaborationState(receipt, task, ageMs, {
        waitingForUserConfirmation: hasPendingPrimaryUserConfirmation({
          room,
          dispatch,
          receipt,
          primaryAgentId,
        }),
      });
      const score = collaborationStateScore(state);
      const previous = strongest.get(agentId);
      if (!previous || score < previous.score) {
        strongest.set(agentId, {
          state,
          stage: dispatch.stage,
          title: dispatch.title,
          issue:
            state === "stale"
              ? "stage heartbeat is stale"
              : state === "failed"
                ? "last collaboration turn failed"
                : state === "blocked"
                  ? "stage is blocked"
                  : undefined,
          score,
        });
      }
    }
  }

  return new Map(
    [...strongest.entries()].map(([key, value]) => [
      key,
      { state: value.state, stage: value.stage, title: value.title, issue: value.issue },
    ]),
  );
}

function resolveCollaborationState(
  receipt: CollaborationTaskReceipt | undefined,
  task: ProjectTask | undefined,
  heartbeatAgeMs: number,
  options: { waitingForUserConfirmation?: boolean } = {},
): HeartRateMonitorAgentStatus["collaborationState"] {
  if (options.waitingForUserConfirmation || isWaitingForUserConfirmationReceipt(receipt)) {
    return "awaiting_review";
  }
  if (isReviewReadyReceipt(receipt)) {
    return "awaiting_review";
  }
  if (isCompletedReceipt(receipt, task)) {
    return "idle";
  }
  if (receipt?.lastResultState === "blocked" || task?.status === "blocked") {
    return "blocked";
  }
  if (receipt?.lastResultState === "failed") {
    if (heartbeatAgeMs > RECOVERY_ATTENTION_WINDOW_MS) {
      return "idle";
    }
    return "failed";
  }
  if (heartbeatAgeMs > RECOVERY_ATTENTION_WINDOW_MS) {
    return "idle";
  }
  if (
    heartbeatAgeMs > resolveStaleCollaborationWindowMs() &&
    (receipt?.lastResultState === "in_progress" || task?.status === "in_progress" || !receipt)
  ) {
    return "stale";
  }
  if (receipt?.lastResultState === "in_progress" || task?.status === "in_progress") {
    return "in_progress";
  }
  return "idle";
}

function collaborationStateScore(state: HeartRateMonitorAgentStatus["collaborationState"]): number {
  switch (state) {
    case "failed":
      return 0;
    case "stale":
      return 1;
    case "blocked":
      return 2;
    case "awaiting_review":
      return 3;
    case "in_progress":
      return 4;
    default:
      return 5;
  }
}

function resolveRecoveryIssueKey(
  receipt: CollaborationTaskReceipt | undefined,
  task: ProjectTask | undefined,
  heartbeatAgeMs: number,
  options: { waitingForUserConfirmation?: boolean } = {},
): HeartRateMonitorRecoveryCandidate["issueKey"] | undefined {
  if (options.waitingForUserConfirmation || isWaitingForUserConfirmationReceipt(receipt)) {
    return undefined;
  }
  if (isCompletedReceipt(receipt, task)) {
    return undefined;
  }
  if (receipt?.lastResultState === "blocked" || task?.status === "blocked") {
    return undefined;
  }
  if (receipt?.lastResultState === "failed") {
    if (heartbeatAgeMs > RECOVERY_ATTENTION_WINDOW_MS) {
      return undefined;
    }
    return "failed_turn";
  }
  if (heartbeatAgeMs > RECOVERY_ATTENTION_WINDOW_MS) {
    return undefined;
  }
  if (
    heartbeatAgeMs > resolveStaleCollaborationWindowMs() &&
    (receipt?.lastResultState === "in_progress" || task?.status === "in_progress" || !receipt)
  ) {
    return "stale_in_progress";
  }
  return undefined;
}

function compareRecoveryCandidates(
  left: HeartRateMonitorRecoveryCandidate,
  right: HeartRateMonitorRecoveryCandidate,
): number {
  const issueDiff = recoveryIssueRank(left.issueKey) - recoveryIssueRank(right.issueKey);
  if (issueDiff !== 0) return issueDiff;
  if (right.heartbeatAgeMs !== left.heartbeatAgeMs) return right.heartbeatAgeMs - left.heartbeatAgeMs;
  return left.candidateId.localeCompare(right.candidateId);
}

function recoveryIssueRank(issueKey: HeartRateMonitorRecoveryCandidate["issueKey"]): number {
  return issueKey === "failed_turn" ? 0 : 1;
}

function guessBestSessionBinding(sessions: SessionsListItem[]): CollaborationSessionBinding | undefined {
  const best = [...sessions]
    .filter((session) => isActiveSession(session))
    .sort((left, right) => normalizeSessionUpdatedAtMs(right) - normalizeSessionUpdatedAtMs(left))[0];
  if (!best?.sessionId && !best?.sessionKey) return undefined;
  return {
    agentId: best.agentId?.trim() || "",
    sessionId: best.sessionId?.trim() || "",
    sessionKey: best.sessionKey?.trim(),
    updatedAt: new Date(normalizeSessionUpdatedAtMs(best) || Date.now()).toISOString(),
  };
}

function isCandidateCoolingDown(
  candidate: HeartRateMonitorRecoveryCandidate,
  state: HeartRateMonitorPersistentState,
  now: Date,
): boolean {
  const previous = state.tasks[candidate.candidateId];
  if (!previous) return false;
  if (previous.issueKey !== candidate.issueKey) return false;
  const lastAttemptAtMs = Date.parse(previous.lastAttemptAt);
  if (!Number.isFinite(lastAttemptAtMs)) return false;
  return now.getTime() - lastAttemptAtMs < recoveryAttemptCooldownMs(candidate.issueKey);
}

function buildDryRunAction(candidate: HeartRateMonitorRecoveryCandidate, now: Date): HeartRateMonitorAction {
  return {
    candidateId: candidate.candidateId,
    roomId: candidate.roomId,
    projectId: candidate.projectId,
    taskId: candidate.taskId,
    agentId: candidate.agentId,
    issueKey: candidate.issueKey,
    attemptedAt: now.toISOString(),
    ok: true,
    outcome: "skipped",
    detail: "dry-run only",
    sessionId: candidate.sessionBinding?.sessionId,
    sessionKey: candidate.sessionBinding?.sessionKey,
  };
}

function summarizeAgentTurnFailure(response: AgentTurnResponse): string {
  return (
    String(response.failureReason || "").trim() ||
    String(response.errorMessage || "").trim() ||
    String(response.rawText || "").trim() ||
    "Internal wake attempt failed."
  ).slice(0, 800);
}

function summarizeHeartRateMonitorRecoveryFailure(response: AgentTurnResponse): string {
  if (!response.ok) {
    return summarizeAgentTurnFailure(response);
  }
  const output = describeSuccessfulRecoveryOutput(response);
  if (/request timed out before a response was generated/i.test(output.replyText)) {
    return output.replyText.slice(0, 800);
  }
  const stopReason = String(response.stopReason || "").trim();
  return summarizeRecoveryText(
    response.errorMessage,
    stopReason ? `Internal wake attempt stopped with ${stopReason} before the final stage reply was delivered.` : undefined,
    "Internal wake attempt was interrupted before the final stage reply was delivered.",
  );
}

function summarizeRecoveryText(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = String(candidate || "").replace(/\s+/g, " ").trim();
    if (trimmed) return trimmed.slice(0, 800);
  }
  return "Recovered after an internal wake.";
}

function mergeHeartRateMonitorRecoveryOutputs(outputs: HeartRateMonitorRecoveryOutput[]): HeartRateMonitorRecoveryOutput {
  return outputs.reduce<HeartRateMonitorRecoveryOutput>(
    (merged, output) => ({
      replyText: output.replyText.trim() || merged.replyText,
      rawPaths: dedupeStrings([...merged.rawPaths, ...output.rawPaths]),
      envelope: output.envelope ?? merged.envelope,
    }),
    {
      replyText: "",
      rawPaths: [],
      envelope: undefined,
    },
  );
}

function buildMonitorEvent(input: {
  type: CollaborationRoomEvent["type"];
  agentId: string;
  detail?: string;
  message?: string;
  attachmentIds?: string[];
  targetAgentIds?: string[];
  relatedSessionId?: string;
  relatedSessionKey?: string;
  failureReason?: string;
}): Omit<CollaborationRoomEvent, "sequence" | "createdAt"> {
  return {
    eventId: randomUUID(),
    type: input.type,
    authorRole: input.type === "agent_reply" ? "agent" : "system",
    agentId: input.agentId,
    message: input.message,
    detail: input.detail,
    attachmentIds: input.attachmentIds,
    targetAgentIds: input.targetAgentIds,
    relatedSessionId: input.relatedSessionId,
    relatedSessionKey: input.relatedSessionKey,
    failureReason: input.failureReason,
  };
}

async function loadTasksFromRooms(rooms: CollaborationRoomState[]): Promise<ProjectTask[]> {
  const tasks = new Map<string, ProjectTask>();
  for (const room of rooms) {
    for (const dispatch of room.dispatchRecords) {
      const receipt = room.taskReceipts.find(
        (item) => item.projectId === dispatch.projectId && item.taskId === dispatch.taskId,
      );
      const status =
        isCompletedReceipt(receipt, undefined)
          ? "done"
          : receipt?.lastResultState === "blocked"
            ? "blocked"
            : receipt?.lastResultState === "failed"
              ? "in_progress"
              : "in_progress";
      tasks.set(buildProjectTaskKey(dispatch.projectId, dispatch.taskId), {
        projectId: dispatch.projectId,
        taskId: dispatch.taskId,
        title: dispatch.title,
        status,
        owner: dispatch.ownerAgentId,
        dueAt: undefined,
        definitionOfDone: dispatch.definitionOfDone,
        artifacts: [],
        rollback: {
          strategy: "manual-rollback",
          steps: [],
        },
        sessionKeys: dedupeStrings([receipt?.taskId ? receipt.taskId : "", room.sessionBindings.find((binding) => normalizeAgentId(binding.agentId) === normalizeAgentId(dispatch.ownerAgentId))?.sessionKey ?? ""]),
        budget: {
          tokensIn: undefined,
          tokensOut: undefined,
          totalTokens: undefined,
          cost: undefined,
          warnRatio: 0.8,
        },
        updatedAt: receipt?.lastReportedAt ?? dispatch.createdAt,
      });
    }
  }
  return [...tasks.values()];
}

async function safelyUpdateTaskStatus(
  projectId: string,
  taskId: string,
  status: ProjectTask["status"],
): Promise<void> {
  try {
    await updateTaskStatus({ projectId, taskId, status });
  } catch {
    // Best-effort only. Collaboration receipts stay authoritative for recovery runs.
  }
}

function resolveAgentWorkspaceRoot(entry: CurrentAgentCatalogEntry | undefined, agentId: string): string {
  const configured = entry?.workspace?.trim();
  if (configured) return configured;
  return join(resolveOpenClawWorkspaceRoot(), "agents", agentId);
}

function resolveOpenClawWorkspaceRoot(): string {
  return join(resolveOpenClawHomePath(), "workspace");
}

function normalizeAgentId(input: string | undefined): string {
  return String(input || "").trim().toLowerCase();
}

function isMonitorAgentId(input: string | undefined): boolean {
  return isInternalMonitorAgentId(input);
}

function isActiveSession(session: SessionsListItem): boolean {
  if (session.active === true) return true;
  const state = String(session.state || "").trim().toLowerCase();
  return ACTIVE_SESSION_STATES.has(state);
}

function normalizeSessionUpdatedAtMs(session: SessionsListItem): number {
  if (typeof session.updatedAtMs === "number" && Number.isFinite(session.updatedAtMs)) {
    return session.updatedAtMs;
  }
  if (typeof session.updatedAt === "string" && !Number.isNaN(Date.parse(session.updatedAt))) {
    return Date.parse(session.updatedAt);
  }
  return 0;
}

function buildProjectTaskKey(projectId: string, taskId: string): string {
  return `${projectId}:${taskId}`;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const trimmed = String(value || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
  }
  return output;
}

async function loadControlChainStatus(runtimeDir: string): Promise<HeartRateMonitorControlChainStatus> {
  const [workerHeartbeat, supervisorReport, watchdogReport, heartbeatAgeMs] = await Promise.all([
    readJson<Record<string, unknown>>(resolve(runtimeDir, "health", "worker-heartbeat.json")),
    readJson<Record<string, unknown>>(resolve(runtimeDir, "recovery", "supervisor-latest.json")),
    readJson<Record<string, unknown>>(resolve(runtimeDir, "recovery", "watchdog-latest.json")),
    readFileAgeMs(resolve(runtimeDir, "health", "worker-heartbeat.json")),
  ]);
  return {
    workerHeartbeatAgeMs: heartbeatAgeMs,
    workerState: asString(workerHeartbeat?.state),
    supervisorStatus: asString(supervisorReport?.status),
    supervisorReason: asString(supervisorReport?.reason),
    watchdogOutcome: asString(watchdogReport?.outcome),
    watchdogActions: Array.isArray(watchdogReport?.actions)
      ? watchdogReport.actions.flatMap((item) => (typeof item === "string" ? [item] : []))
      : [],
  };
}

function resolveMonitorPaths(runtimeDir?: string): HeartRateMonitorPaths {
  const resolvedRuntimeDir = resolve(runtimeDir ?? join(process.cwd(), "runtime"));
  const baseDir = resolve(resolvedRuntimeDir, "heart-rate-monitor");
  return {
    runtimeDir: resolvedRuntimeDir,
    reportPath: resolve(baseDir, "latest.json"),
    auditPath: resolve(baseDir, "audit.log"),
    statePath: resolve(baseDir, "state.json"),
  };
}

async function readMonitorState(path: string): Promise<HeartRateMonitorPersistentState> {
  const fallback: HeartRateMonitorPersistentState = {
    generatedAt: new Date(0).toISOString(),
    tasks: {},
  };
  return (await readJson<HeartRateMonitorPersistentState>(path)) ?? fallback;
}

async function writeMonitorState(path: string, state: HeartRateMonitorPersistentState): Promise<void> {
  await writeJsonAtomic(path, state);
}

async function writeReport(path: string, report: HeartRateMonitorReport): Promise<void> {
  await writeJsonAtomic(path, report);
}

async function appendAudit(path: string, line: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  let existing = "";
  try {
    existing = await readFile(path, "utf8");
  } catch {
    existing = "";
  }
  await writeFile(path, `${existing}${line}\n`, "utf8");
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, payload, "utf8");
  try {
    await renameWithWindowsFallback(tmp, path, payload);
  } finally {
    await rm(tmp, { force: true }).catch(() => undefined);
  }
}

async function renameWithWindowsFallback(tmp: string, target: string, payload: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rename(tmp, target);
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableAtomicWriteError(error)) {
        throw error;
      }
      await delay(40 * (attempt + 1));
    }
  }

  try {
    await writeFile(target, payload, "utf8");
    return;
  } catch {
    throw lastError instanceof Error ? lastError : new Error("Failed to persist heart-rate monitor state.");
  }
}

function isRetryableAtomicWriteError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : undefined;
  return (
    code === "EPERM" ||
    code === "EBUSY" ||
    code === "EACCES" ||
    code === "ENOTEMPTY" ||
    code === "EEXIST"
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function readFileAgeMs(path: string): Promise<number | undefined> {
  try {
    const file = await stat(path);
    return Math.max(0, Date.now() - file.mtimeMs);
  } catch {
    return undefined;
  }
}

function normalizePositiveInt(input: number, fallback: number): number {
  if (!Number.isFinite(input) || input <= 0) return fallback;
  return Math.max(1, Math.trunc(input));
}

function resolveStaleCollaborationWindowMs(): number {
  const configured = normalizePositiveInt(
    Number(process.env.HEART_RATE_MONITOR_STALE_WINDOW_MS ?? DEFAULT_STALE_COLLABORATION_WINDOW_MS),
    DEFAULT_STALE_COLLABORATION_WINDOW_MS,
  );
  return Math.max(60 * 1000, configured);
}

function asString(input: unknown): string | undefined {
  return typeof input === "string" ? input.trim() || undefined : undefined;
}
