import assert from "node:assert/strict";
import test from "node:test";
import type { SessionsListItem } from "../src/contracts/openclaw-tools";
import {
  defaultCollaborationRoomState,
  type CollaborationRoomState,
} from "../src/runtime/collaboration-room";
import type { CurrentAgentCatalog } from "../src/runtime/current-agent-catalog";
import {
  buildWakeFailureNoticeEventForSmoke,
  buildFailedRecoveryReceiptForSmoke,
  buildHeartRateMonitorAgentStatuses,
  buildHeartRateMonitorRecoveryPrompt,
  buildInterruptedHeartRateMonitorResumePromptForSmoke,
  isInterruptedHeartRateMonitorResponseForSmoke,
  recoveryAttemptCooldownMsForSmoke,
  selectHeartRateMonitorRecoveryCandidates,
  type HeartRateMonitorRecoveryCandidate,
  type HeartRateMonitorTaskState,
} from "../src/runtime/heart-rate-monitor";
import { agentHierarchyRank } from "../src/runtime/team-hierarchy";
import type { ProjectTask } from "../src/types";

function createCatalog(entries: CurrentAgentCatalog["entries"]): CurrentAgentCatalog {
  return {
    status: "connected",
    sourcePath: "C:\\Users\\45441\\.openclaw\\openclaw.json",
    detail: "fixture catalog",
    entries,
    primaryAgentId: "main",
    primaryDisplayName: "Jarvis",
  };
}

function createTask(
  projectId: string,
  taskId: string,
  title: string,
  owner: string,
  status: ProjectTask["status"],
  updatedAt: string,
): ProjectTask {
  return {
    projectId,
    taskId,
    title,
    status,
    owner,
    dueAt: undefined,
    definitionOfDone: ["Ship the current stage"],
    artifacts: [],
    rollback: {
      strategy: "manual-rollback",
      steps: [],
    },
    sessionKeys: [],
    budget: {
      warnRatio: 0.8,
    },
    updatedAt,
  };
}

function createRoom(input: {
  roomId: string;
  projectId: string;
  taskId: string;
  agentId: string;
  stage: string;
  title: string;
  createdAt: string;
  receiptState?: "in_progress" | "awaiting_review" | "blocked" | "failed";
  reviewState?: "awaiting_review" | "approved" | "rejected";
  waitingFor?: "jarvis_review" | "user_confirmation";
  receiptAt?: string;
  summary?: string;
  sessionId?: string;
  sessionKey?: string;
  events?: CollaborationRoomState["events"];
}): CollaborationRoomState {
  const room = defaultCollaborationRoomState({
    roomId: input.roomId,
    title: `${input.roomId} room`,
    projectId: input.projectId,
    now: input.createdAt,
  });
  room.dispatchRecords.push({
    taskId: input.taskId,
    projectId: input.projectId,
    stage: input.stage,
    ownerAgentId: input.agentId,
    title: input.title,
    goal: `Finish ${input.title}`,
    definitionOfDone: ["Leave the task in a handoff-ready state"],
    requiredContextRefs: ["docs/ARCHITECTURE.md"],
    expectedArtifacts: ["runtime/report.md"],
    createdAt: input.createdAt,
    createdBy: "jarvis",
  });
  if (input.receiptState && input.receiptAt) {
    room.taskReceipts.push({
      taskId: input.taskId,
      projectId: input.projectId,
      reviewState: input.reviewState,
      lastResultState: input.receiptState,
      waitingFor: input.waitingFor,
      lastReportedAt: input.receiptAt,
      lastReportedBy: input.agentId,
      taskTitle: input.title,
      stage: input.stage,
      summary: input.summary,
    });
    room.updatedAt = input.receiptAt;
  }
  if (input.sessionId) {
    room.sessionBindings.push({
      agentId: input.agentId,
      sessionId: input.sessionId,
      sessionKey: input.sessionKey,
      updatedAt: input.receiptAt ?? input.createdAt,
    });
  }
  if (input.events) {
    room.events.push(...input.events);
    room.lastSequence = room.events.at(-1)?.sequence ?? room.lastSequence;
    room.updatedAt = room.events.at(-1)?.createdAt ?? room.updatedAt;
  }
  return room;
}

function createCandidate(): HeartRateMonitorRecoveryCandidate {
  return {
    candidateId: "room-1:proj-1:task-1:backend",
    issueKey: "stale_in_progress",
    roomId: "room-1",
    projectId: "proj-1",
    taskId: "task-1",
    agentId: "backend",
    displayName: "Backend",
    workspaceRoot: "C:\\Users\\45441\\.openclaw\\workspace\\agents\\backend",
    stage: "backend",
    title: "Fix collaboration recovery",
    goal: "Resume the unfinished backend stage safely.",
    definitionOfDone: ["Current stage reaches a real handoff state"],
    expectedArtifacts: ["runtime/report.md"],
    requiredContextRefs: ["docs/ARCHITECTURE.md"],
    summary: "The last step stalled after partial progress.",
    blockers: ["Need to reuse the existing session."],
    lastHeartbeatAt: "2026-03-20T09:20:00.000Z",
    heartbeatAgeMs: 45 * 60 * 1000,
    lastResultState: "in_progress",
    reviewState: undefined,
    sessionBinding: {
      agentId: "backend",
      sessionId: "sess-backend",
      sessionKey: "agent:backend:1",
      updatedAt: "2026-03-20T09:20:00.000Z",
    },
  };
}

test("team hierarchy ranks heart rate monitor after core delivery roles but before unknown agents", () => {
  assert(agentHierarchyRank("heart-rate-monitor") > agentHierarchyRank("ops"));
  assert(agentHierarchyRank("heart-rate-monitor") < agentHierarchyRank("custom-role"));
});

test("recovery candidate selection prioritizes failed turns before stale heartbeats", () => {
  const now = new Date("2026-03-20T10:00:00.000Z");
  const catalog = createCatalog([
    {
      agentId: "backend",
      displayName: "Backend",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace\\agents\\backend",
    },
    {
      agentId: "frontend",
      displayName: "Frontend",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace\\agents\\frontend",
    },
    {
      agentId: "heart-rate-monitor",
      displayName: "Heart rate monitor",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace\\agents\\heart-rate-monitor",
    },
  ]);
  const rooms = [
    createRoom({
      roomId: "room-failed",
      projectId: "proj-1",
      taskId: "task-failed",
      agentId: "backend",
      stage: "backend",
      title: "Repair failed stage",
      createdAt: "2026-03-20T09:40:00.000Z",
      receiptState: "failed",
      receiptAt: "2026-03-20T09:50:00.000Z",
      summary: "Tool call failed before the stage could finish.",
      sessionId: "sess-backend",
      sessionKey: "agent:backend:1",
    }),
    createRoom({
      roomId: "room-stale",
      projectId: "proj-1",
      taskId: "task-stale",
      agentId: "frontend",
      stage: "frontend",
      title: "Finish attachment preview",
      createdAt: "2026-03-20T09:00:00.000Z",
      receiptState: "in_progress",
      receiptAt: "2026-03-20T09:20:00.000Z",
      summary: "UI draft exists but the stage stopped replying.",
      sessionId: "sess-frontend",
      sessionKey: "agent:frontend:1",
    }),
  ];
  const tasks = [
    createTask("proj-1", "task-failed", "Repair failed stage", "backend", "in_progress", "2026-03-20T09:50:00.000Z"),
    createTask("proj-1", "task-stale", "Finish attachment preview", "frontend", "in_progress", "2026-03-20T09:20:00.000Z"),
  ];
  const sessions: SessionsListItem[] = [
    {
      agentId: "backend",
      sessionId: "sess-backend",
      sessionKey: "agent:backend:1",
      active: true,
      updatedAt: "2026-03-20T09:59:00.000Z",
    },
    {
      agentId: "frontend",
      sessionId: "sess-frontend",
      sessionKey: "agent:frontend:1",
      active: true,
      updatedAt: "2026-03-20T09:58:00.000Z",
    },
  ];

  const candidates = selectHeartRateMonitorRecoveryCandidates({
    catalog,
    sessions,
    rooms,
    tasks,
    now,
  });

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0]?.agentId, "backend");
  assert.equal(candidates[0]?.issueKey, "failed_turn");
  assert.equal(candidates[0]?.sessionBinding?.sessionId, "sess-backend");
  assert.equal(candidates[1]?.agentId, "frontend");
  assert.equal(candidates[1]?.issueKey, "stale_in_progress");
  assert(candidates[1].heartbeatAgeMs > candidates[0].heartbeatAgeMs);
});

test("agent status builder excludes the monitor employee from the watched roster and marks stale collaboration", () => {
  const now = new Date("2026-03-20T10:00:00.000Z");
  const catalog = createCatalog([
    {
      agentId: "frontend",
      displayName: "Frontend",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace\\agents\\frontend",
    },
    {
      agentId: "heart-rate-monitor",
      displayName: "Heart rate monitor",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace\\agents\\heart-rate-monitor",
    },
  ]);
  const rooms = [
    createRoom({
      roomId: "room-stale",
      projectId: "proj-ui",
      taskId: "task-ui",
      agentId: "frontend",
      stage: "frontend",
      title: "Recover widget buttons",
      createdAt: "2026-03-20T09:00:00.000Z",
      receiptState: "in_progress",
      receiptAt: "2026-03-20T09:20:00.000Z",
      summary: "Buttons stopped responding after partial UI changes.",
    }),
  ];
  const tasks = [
    createTask("proj-ui", "task-ui", "Recover widget buttons", "frontend", "in_progress", "2026-03-20T09:20:00.000Z"),
  ];
  const sessions: SessionsListItem[] = [
    {
      agentId: "frontend",
      sessionId: "sess-ui",
      sessionKey: "agent:frontend:ui",
      active: true,
      updatedAt: "2026-03-20T09:58:00.000Z",
    },
  ];

  const statuses = buildHeartRateMonitorAgentStatuses({
    catalog,
    sessions,
    rooms,
    tasks,
    now,
  });

  assert.equal(statuses.length, 1);
  assert.equal(statuses[0]?.agentId, "frontend");
  assert.equal(statuses[0]?.sessionState, "active");
  assert.equal(statuses[0]?.collaborationState, "stale");
  assert.equal(statuses[0]?.currentStage, "frontend");
});

test("heart rate monitor uses the shorter default stale window for in-progress collaboration turns", () => {
  const now = new Date("2026-03-20T10:00:00.000Z");
  const catalog = createCatalog([
    {
      agentId: "main",
      displayName: "Jarvis",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace",
    },
  ]);
  const rooms = [
    createRoom({
      roomId: "room-short-stale",
      projectId: "proj-short-stale",
      taskId: "task-short-stale",
      agentId: "main",
      stage: "delivery",
      title: "Short stale turn",
      createdAt: "2026-03-20T09:45:00.000Z",
      receiptState: "in_progress",
      receiptAt: "2026-03-20T09:51:00.000Z",
      summary: "The task stopped replying a few minutes ago.",
      sessionId: "sess-main",
      sessionKey: "agent:main:main",
    }),
  ];
  const tasks = [
    createTask(
      "proj-short-stale",
      "task-short-stale",
      "Short stale turn",
      "main",
      "in_progress",
      "2026-03-20T09:51:00.000Z",
    ),
  ];

  const candidates = selectHeartRateMonitorRecoveryCandidates({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });
  const statuses = buildHeartRateMonitorAgentStatuses({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.issueKey, "stale_in_progress");
  assert.equal(statuses[0]?.collaborationState, "stale");
});

test("heart rate monitor ignores expired failed turns from old collaboration history", () => {
  const now = new Date("2026-03-20T10:00:00.000Z");
  const catalog = createCatalog([
    {
      agentId: "main",
      displayName: "Jarvis",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace",
    },
  ]);
  const rooms = [
    createRoom({
      roomId: "room-old-failure",
      projectId: "proj-legacy",
      taskId: "task-legacy",
      agentId: "main",
      stage: "delivery",
      title: "Legacy failed turn",
      createdAt: "2026-03-19T00:00:00.000Z",
      receiptState: "failed",
      receiptAt: "2026-03-19T00:30:00.000Z",
      summary: "Old gateway disconnect from a previous day.",
      sessionId: "sess-main",
      sessionKey: "agent:main:main",
    }),
  ];
  const tasks = [
    createTask("proj-legacy", "task-legacy", "Legacy failed turn", "main", "in_progress", "2026-03-19T00:30:00.000Z"),
  ];

  const candidates = selectHeartRateMonitorRecoveryCandidates({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });
  const statuses = buildHeartRateMonitorAgentStatuses({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });

  assert.equal(candidates.length, 0);
  assert.equal(statuses[0]?.collaborationState, "idle");
});

test("heart rate monitor ignores review-ready receipts even when only lastResultState is awaiting_review", () => {
  const now = new Date("2026-03-20T10:00:00.000Z");
  const catalog = createCatalog([
    {
      agentId: "main",
      displayName: "Jarvis",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace",
    },
  ]);
  const rooms = [
    createRoom({
      roomId: "room-review-ready",
      projectId: "proj-review",
      taskId: "task-review-ready",
      agentId: "main",
      stage: "delivery",
      title: "Already ready for review",
      createdAt: "2026-03-20T09:00:00.000Z",
      receiptState: "awaiting_review",
      receiptAt: "2026-03-20T09:20:00.000Z",
      summary: "The stage already finished and is waiting for review.",
      sessionId: "sess-main",
      sessionKey: "agent:main:main",
    }),
  ];
  const tasks = [
    createTask(
      "proj-review",
      "task-review-ready",
      "Already ready for review",
      "main",
      "in_progress",
      "2026-03-20T09:20:00.000Z",
    ),
  ];

  const candidates = selectHeartRateMonitorRecoveryCandidates({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });
  const statuses = buildHeartRateMonitorAgentStatuses({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });

  assert.equal(candidates.length, 0);
  assert.equal(statuses[0]?.collaborationState, "awaiting_review");
});

test("heart rate monitor ignores long-abandoned stale in-progress work", () => {
  const now = new Date("2026-03-20T10:00:00.000Z");
  const catalog = createCatalog([
    {
      agentId: "main",
      displayName: "Jarvis",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace",
    },
  ]);
  const rooms = [
    createRoom({
      roomId: "room-old-stale",
      projectId: "proj-legacy",
      taskId: "task-legacy-stale",
      agentId: "main",
      stage: "delivery",
      title: "Legacy stale turn",
      createdAt: "2026-03-19T00:00:00.000Z",
      receiptState: "in_progress",
      receiptAt: "2026-03-19T00:30:00.000Z",
      summary: "Old unfinished work from a previous conversation.",
      sessionId: "sess-main",
      sessionKey: "agent:main:main",
    }),
  ];
  const tasks = [
    createTask(
      "proj-legacy",
      "task-legacy-stale",
      "Legacy stale turn",
      "main",
      "in_progress",
      "2026-03-19T00:30:00.000Z",
    ),
  ];

  const candidates = selectHeartRateMonitorRecoveryCandidates({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });
  const statuses = buildHeartRateMonitorAgentStatuses({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });

  assert.equal(candidates.length, 0);
  assert.equal(statuses[0]?.collaborationState, "idle");
});

test("failed recovery transport does not overwrite a review-ready receipt", () => {
  const candidate = createCandidate();
  const attemptedAt = "2026-03-20T10:15:00.000Z";
  const existingReadyReceipt = {
    taskId: candidate.taskId,
    projectId: candidate.projectId,
    reviewState: "awaiting_review" as const,
    lastResultState: "awaiting_review" as const,
    lastReportedAt: "2026-03-20T10:10:00.000Z",
    lastReportedBy: candidate.agentId,
    taskTitle: candidate.title,
    stage: candidate.stage,
    summary: "Ready for review.",
    recentOutput: "Ready for review.",
  };

  assert.equal(
    buildFailedRecoveryReceiptForSmoke({
      candidate,
      existingReceipt: existingReadyReceipt,
      attemptedAt,
      detail: "CLI transport failed after completion.",
    }),
    undefined,
  );

  const unfinishedReceipt = {
    ...existingReadyReceipt,
    reviewState: undefined,
    lastResultState: "in_progress" as const,
  };
  const failedReceipt = buildFailedRecoveryReceiptForSmoke({
    candidate,
    existingReceipt: unfinishedReceipt,
    attemptedAt,
    detail: "CLI transport failed before completion.",
  });

  assert.equal(failedReceipt?.lastResultState, "failed");
  assert.equal(failedReceipt?.summary, "CLI transport failed before completion.");
  assert.equal(failedReceipt?.recentOutput, "CLI transport failed before completion.");
});

test("recovery prompt keeps stage continuity and the Chinese-default reply hint", () => {
  const prompt = buildHeartRateMonitorRecoveryPrompt(createCandidate());

  assert.match(prompt, /\[\[internal_wake_resume\]\]/);
  assert.match(prompt, /Internal recovery wake\./);
  assert.match(prompt, /Resume the SAME stage in the SAME session\./);
  assert.match(prompt, /Do not treat this as a new user request\./);
  assert.match(prompt, /Do not restart the task from scratch\./);
  assert.match(prompt, /default to Chinese if unclear\./);
  assert.match(prompt, /Append the hidden \[\[openclaw-files\]\] footer/);
  assert.match(prompt, /<stage_result>.*<\/stage_result>/s);
});

test("interrupted recovery responses stay in the retry path instead of counting as success", () => {
  assert.equal(
    isInterruptedHeartRateMonitorResponseForSmoke({
      replyText: "Request timed out before a response was generated. Please try again.",
      rawText: "",
      stopReason: "toolUse",
      errorMessage: undefined,
      failureReason: undefined,
      incomplete: true,
    }),
    true,
  );

  assert.equal(
    isInterruptedHeartRateMonitorResponseForSmoke({
      replyText: "Stage delivered and ready for review.",
      rawText: "",
      stopReason: "endTurn",
      errorMessage: undefined,
      failureReason: undefined,
      incomplete: false,
    }),
    false,
  );
});

test("interrupted recovery resume prompt preserves same-stage continuity", () => {
  const prompt = buildInterruptedHeartRateMonitorResumePromptForSmoke(createCandidate());

  assert.match(prompt, /\[\[internal_wake_resume\]\]/);
  assert.match(prompt, /same stage in the same session/i);
  assert.match(prompt, /Do not treat this as a new user request\./);
  assert.match(prompt, /\[\[openclaw-files\]\]/);
  assert.match(prompt, /default to Chinese if unclear\./);
});

test("wake failure notice only appears after five consecutive failed wake attempts", () => {
  const previousState: HeartRateMonitorTaskState = {
    lastAttemptAt: "2026-03-20T09:59:00.000Z",
    lastOutcome: "failed",
    attemptCount: 4,
    issueKey: "failed_turn",
    consecutiveFailures: 4,
    lastEscalatedFailureCount: 0,
    lastFailureDetail: "Request was aborted.",
  };
  const nextState: HeartRateMonitorTaskState = {
    lastAttemptAt: "2026-03-20T10:00:00.000Z",
    lastOutcome: "failed",
    attemptCount: 5,
    issueKey: "failed_turn",
    consecutiveFailures: 5,
    lastEscalatedFailureCount: 0,
    lastFailureDetail: "Request was aborted before a response was generated.",
  };

  const notice = buildWakeFailureNoticeEventForSmoke({
    candidate: createCandidate(),
    previousState,
    nextState,
    action: {
      candidateId: "room-1:proj-1:task-1:backend",
      roomId: "room-1",
      projectId: "proj-1",
      taskId: "task-1",
      agentId: "backend",
      issueKey: "failed_turn",
      attemptedAt: "2026-03-20T10:00:00.000Z",
      ok: false,
      outcome: "failed",
      detail: "Request was aborted before a response was generated.",
      sessionId: "sess-backend",
      sessionKey: "agent:backend:1",
    },
  });

  assert.equal(notice?.type, "system_note");
  assert.match(notice?.detail ?? "", /未能唤醒 Backend（已连续失败 5 次）/);
  assert.match(notice?.detail ?? "", /中断或超时/);

  const silent = buildWakeFailureNoticeEventForSmoke({
    candidate: createCandidate(),
    previousState: {
      ...previousState,
      lastEscalatedFailureCount: 5,
    },
    nextState,
    action: {
      candidateId: "room-1:proj-1:task-1:backend",
      roomId: "room-1",
      projectId: "proj-1",
      taskId: "task-1",
      agentId: "backend",
      issueKey: "failed_turn",
      attemptedAt: "2026-03-20T10:00:00.000Z",
      ok: false,
      outcome: "failed",
      detail: "Request was aborted before a response was generated.",
      sessionId: "sess-backend",
      sessionKey: "agent:backend:1",
    },
  });

  assert.equal(silent, undefined);
});

test("failed turns retry faster than stale in-progress work", () => {
  assert.equal(recoveryAttemptCooldownMsForSmoke("failed_turn"), 60_000);
  assert.equal(recoveryAttemptCooldownMsForSmoke("stale_in_progress"), 5 * 60 * 1000);
});

test("heart rate monitor ignores Jarvis receipts that are explicitly waiting for user confirmation", () => {
  const now = new Date("2026-03-20T10:00:00.000Z");
  const catalog = createCatalog([
    {
      agentId: "main",
      displayName: "Jarvis",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace",
    },
  ]);
  const rooms = [
    createRoom({
      roomId: "room-user-confirmation",
      projectId: "proj-confirm",
      taskId: "task-confirm",
      agentId: "main",
      stage: "delivery",
      title: "Wait for user confirmation",
      createdAt: "2026-03-20T09:00:00.000Z",
      receiptState: "awaiting_review",
      reviewState: "awaiting_review",
      waitingFor: "user_confirmation",
      receiptAt: "2026-03-20T09:20:00.000Z",
      summary: "Waiting for the user to choose a direction.",
    }),
  ];
  const tasks = [
    createTask(
      "proj-confirm",
      "task-confirm",
      "Wait for user confirmation",
      "main",
      "in_progress",
      "2026-03-20T09:20:00.000Z",
    ),
  ];

  const candidates = selectHeartRateMonitorRecoveryCandidates({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });
  const statuses = buildHeartRateMonitorAgentStatuses({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });

  assert.equal(candidates.length, 0);
  assert.equal(statuses[0]?.collaborationState, "awaiting_review");
});

test("heart rate monitor keeps legacy Jarvis confirmation waits out of stale recovery", () => {
  const now = new Date("2026-03-20T10:00:00.000Z");
  const catalog = createCatalog([
    {
      agentId: "main",
      displayName: "Jarvis",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace",
    },
  ]);
  const rooms = [
    createRoom({
      roomId: "room-legacy-confirm",
      projectId: "proj-legacy-confirm",
      taskId: "task-legacy-confirm",
      agentId: "main",
      stage: "delivery",
      title: "Legacy confirmation checkpoint",
      createdAt: "2026-03-20T09:00:00.000Z",
      receiptState: "in_progress",
      receiptAt: "2026-03-20T09:20:00.000Z",
      summary: "Checkpoint prepared.",
      events: [
        {
          sequence: 1,
          eventId: "evt-user-1",
          type: "user_message",
          createdAt: "2026-03-20T09:00:00.000Z",
          authorRole: "user",
          message: "Review the launch options.",
        },
        {
          sequence: 2,
          eventId: "evt-agent-1",
          type: "agent_reply",
          createdAt: "2026-03-20T09:21:00.000Z",
          authorRole: "agent",
          agentId: "main",
          message: "[[reply_to_current]] I drafted two rollout options. Please choose one and I will continue.",
        },
      ],
    }),
  ];
  const tasks = [
    createTask(
      "proj-legacy-confirm",
      "task-legacy-confirm",
      "Legacy confirmation checkpoint",
      "main",
      "in_progress",
      "2026-03-20T09:20:00.000Z",
    ),
  ];

  const candidates = selectHeartRateMonitorRecoveryCandidates({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });
  const statuses = buildHeartRateMonitorAgentStatuses({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });

  assert.equal(candidates.length, 0);
  assert.equal(statuses[0]?.collaborationState, "awaiting_review");
});

test("heart rate monitor drops legacy confirmation protection after the next user reply arrives", () => {
  const now = new Date("2026-03-20T10:00:00.000Z");
  const catalog = createCatalog([
    {
      agentId: "main",
      displayName: "Jarvis",
      workspace: "C:\\Users\\45441\\.openclaw\\workspace",
    },
  ]);
  const rooms = [
    createRoom({
      roomId: "room-legacy-confirm-resumed",
      projectId: "proj-legacy-confirm",
      taskId: "task-legacy-confirm",
      agentId: "main",
      stage: "delivery",
      title: "Legacy confirmation checkpoint",
      createdAt: "2026-03-20T09:00:00.000Z",
      receiptState: "in_progress",
      receiptAt: "2026-03-20T09:20:00.000Z",
      summary: "Checkpoint prepared.",
      events: [
        {
          sequence: 1,
          eventId: "evt-user-1",
          type: "user_message",
          createdAt: "2026-03-20T09:00:00.000Z",
          authorRole: "user",
          message: "Review the launch options.",
        },
        {
          sequence: 2,
          eventId: "evt-agent-1",
          type: "agent_reply",
          createdAt: "2026-03-20T09:21:00.000Z",
          authorRole: "agent",
          agentId: "main",
          message: "[[reply_to_current]] I drafted two rollout options. Please choose one and I will continue.",
        },
        {
          sequence: 3,
          eventId: "evt-user-2",
          type: "user_message",
          createdAt: "2026-03-20T09:30:00.000Z",
          authorRole: "user",
          message: "Choose option A and continue.",
        },
      ],
    }),
  ];
  const tasks = [
    createTask(
      "proj-legacy-confirm",
      "task-legacy-confirm",
      "Legacy confirmation checkpoint",
      "main",
      "in_progress",
      "2026-03-20T09:30:00.000Z",
    ),
  ];

  const candidates = selectHeartRateMonitorRecoveryCandidates({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });
  const statuses = buildHeartRateMonitorAgentStatuses({
    catalog,
    sessions: [],
    rooms,
    tasks,
    now,
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.issueKey, "stale_in_progress");
  assert.equal(statuses[0]?.collaborationState, "stale");
});
