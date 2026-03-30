// @ts-nocheck

const { randomUUID } = require("node:crypto");
const { stat } = require("node:fs/promises");
const { extname, join, relative, resolve } = require("node:path");
const import_collaboration_room = require("../runtime/collaboration-room");
const import_collaboration_project_memory = require("../runtime/collaboration-project-memory");
const import_collaboration_stage_results = require("../runtime/collaboration-stage-results");
const import_openclaw_chat_rooms = require("../runtime/openclaw-chat-rooms");
const import_collaboration_agent_artifacts = require("../runtime/collaboration-agent-artifacts");
const import_collaboration_live_drafts = require("../runtime/collaboration-live-drafts");
const import_chat_markdown = require("../runtime/chat-markdown");
const import_project_store = require("../runtime/project-store");
const import_task_store = require("../runtime/task-store");

const COLLABORATION_RECENT_SUMMARY_MAX_ITEMS = 6;
const COLLABORATION_RECENT_SUMMARY_MAX_TOTAL_CHARS = 1200;
const COLLABORATION_RECENT_SUMMARY_ITEM_MAX_CHARS = 220;
const COLLABORATION_RECENT_SUMMARY_LOOKBACK_EVENTS = 40;
const COLLABORATION_ABORT_PRESTART_MAX_ATTEMPTS = 4;
const COLLABORATION_ABORT_PRESTART_RETRY_DELAY_MS = 350;
const COLLABORATION_FULL_REPLY_MAX_LENGTH = 12000;
const COLLABORATION_RECOVERABLE_FAILURE_WATCH_TIMEOUT_MS = 120000;
const COLLABORATION_RECOVERABLE_FAILURE_POLL_INTERVAL_MS = 3000;
const COLLABORATION_RECOVERABLE_FAILURE_IDLE_BEFORE_RESUME_MS = 20000;
const COLLABORATION_RECOVERABLE_FAILURE_HISTORY_LIMIT = 60;
const COLLABORATION_RECOVERABLE_FAILURE_MAX_RESUME_ATTEMPTS = 1;

let collaborationTaskStoreWriteChain = Promise.resolve();

function createCollaborationChatHelpers(deps) {
  const {
    acknowledgeActionQueueItem,
    abortCollaborationSessionRun,
    buildCollaborationAttachmentSummary,
    buildCollaborationBootstrapSourceKey,
    buildSessionDetailHref,
    collaborationRecoverableFailureTiming,
    createRequestValidationError,
    describeCollaborationRoomEvent,
    formatBytesCompact,
    formatCollaborationDuration,
    getOpenClawHomeDir,
    getOpenClawWorkspaceRoot,
    isUiLanguage,
    loadNotificationCenter,
    normalizeCollaborationAttachmentIds,
    normalizeCollaborationRoomIdPayload,
    normalizeLookupKey,
    optionalBoundedString,
    pickUiText,
    resolveCollaborationParticipantName,
    sanitizeCollaborationDisplayText,
    safeTruncate,
    toCollaborationApiAttachment,
  } = deps;
  const collaborationActiveTurns = new Map();
  const collaborationRoomAbortGenerations = new Map();
  const collaborationRecoverableFailureJobs = new Map();
  const normalizedRecoverableFailureTiming = normalizeCollaborationRecoverableFailureTiming(
    collaborationRecoverableFailureTiming,
  );

  function normalizeCollaborationRecoverableFailureTiming(input) {
    const source = input && typeof input === "object" ? input : {};
    const normalizePositiveInteger = (value, fallback) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return fallback;
      }
      return Math.max(1, Math.trunc(numeric));
    };
    return {
      watchTimeoutMs: normalizePositiveInteger(
        source.watchTimeoutMs,
        COLLABORATION_RECOVERABLE_FAILURE_WATCH_TIMEOUT_MS,
      ),
      pollIntervalMs: normalizePositiveInteger(
        source.pollIntervalMs,
        COLLABORATION_RECOVERABLE_FAILURE_POLL_INTERVAL_MS,
      ),
      idleBeforeResumeMs: normalizePositiveInteger(
        source.idleBeforeResumeMs,
        COLLABORATION_RECOVERABLE_FAILURE_IDLE_BEFORE_RESUME_MS,
      ),
      historyLimit: normalizePositiveInteger(
        source.historyLimit,
        COLLABORATION_RECOVERABLE_FAILURE_HISTORY_LIMIT,
      ),
      maxResumeAttempts: normalizePositiveInteger(
        source.maxResumeAttempts,
        COLLABORATION_RECOVERABLE_FAILURE_MAX_RESUME_ATTEMPTS,
      ),
    };
  }

  function buildCollaborationRecoverableFailureJobKey(input) {
    return [
      String(input.roomId || "").trim().toLowerCase(),
      String(input.sourceEventId || "").trim().toLowerCase(),
      String(input.agentId || "").trim().toLowerCase(),
    ].join("|");
  }

  function queueCollaborationRecoverableFailureJob(input, task) {
    const jobKey = buildCollaborationRecoverableFailureJobKey(input);
    if (!jobKey.replace(/\|/g, "")) {
      return false;
    }
    if (collaborationRecoverableFailureJobs.has(jobKey)) {
      return false;
    }
    const running = Promise.resolve()
      .then(task)
      .catch(() => void 0)
      .finally(() => {
        collaborationRecoverableFailureJobs.delete(jobKey);
      });
    collaborationRecoverableFailureJobs.set(jobKey, running);
    return true;
  }

  function currentCollaborationRoomAbortGeneration(roomId) {
    const normalizedRoomId = String(roomId || "").trim();
    if (!normalizedRoomId) {
      return 0;
    }
    const current = collaborationRoomAbortGenerations.get(normalizedRoomId);
    return Number.isInteger(current) && current >= 0 ? current : 0;
  }

  function registerCollaborationActiveTurn(input) {
    const roomId = String(input.roomId || "").trim();
    const turnId = randomUUID();
    const handle = {
      turnId,
      roomId,
      sourceEventId: String(input.sourceEventId || "").trim(),
      agentId: String(input.agentId || "").trim(),
      startedAt: new Date().toISOString(),
      abortGeneration: currentCollaborationRoomAbortGeneration(roomId),
      abortController: new AbortController(),
      projectId: void 0,
      taskId: void 0,
      taskTitle: void 0,
      stage: void 0,
      sessionKey: void 0,
      runId: void 0,
      streamStarted: false,
      streamStartedAt: void 0,
      lastStreamState: void 0,
    };
    collaborationActiveTurns.set(turnId, handle);
    return handle;
  }

  function updateCollaborationActiveTurn(handle, input) {
    if (!handle?.turnId || !collaborationActiveTurns.has(handle.turnId)) {
      return handle;
    }
    Object.assign(handle, input || {});
    collaborationActiveTurns.set(handle.turnId, handle);
    return handle;
  }

  function releaseCollaborationActiveTurn(handle) {
    if (!handle?.turnId) {
      return;
    }
    collaborationActiveTurns.delete(handle.turnId);
  }

  function isCollaborationTurnCancelled(handle) {
    if (!handle) {
      return false;
    }
    return (
      handle.abortController?.signal?.aborted === true ||
      currentCollaborationRoomAbortGeneration(handle.roomId) > Number(handle.abortGeneration || 0)
    );
  }

  function normalizeCollaborationTurnRunId(value) {
    const trimmed = String(value || "").trim();
    return trimmed || void 0;
  }

  function hasCollaborationTurnStreamStarted(handle) {
    return handle?.streamStarted === true || Boolean(normalizeCollaborationTurnRunId(handle?.runId));
  }

  function buildCollaborationActiveTurnStreamPatch(handle, input) {
    const patch = {};
    const sessionKey = String(input?.sessionKey || "").trim();
    if (sessionKey) {
      patch.sessionKey = sessionKey;
    }
    const runId = normalizeCollaborationTurnRunId(input?.runId);
    if (runId) {
      patch.runId = runId;
    }
    const state = String(input?.state || "").trim().toLowerCase();
    if (state) {
      patch.lastStreamState = state;
    }
    const streamStarted =
      hasCollaborationTurnStreamStarted(handle) ||
      Boolean(runId) ||
      state === "started" ||
      state === "delta" ||
      state === "final";
    if (streamStarted) {
      patch.streamStarted = true;
      if (!handle?.streamStartedAt) {
        patch.streamStartedAt = new Date().toISOString();
      }
    }
    return patch;
  }

  function shouldAcceptPrestartCollaborationAbortMiss(handle) {
    return Boolean(handle?.abortController?.signal?.aborted) && !hasCollaborationTurnStreamStarted(handle);
  }

  function selectPreferredAbortTargetHandle(currentHandle, nextHandle) {
    if (!currentHandle) {
      return nextHandle;
    }
    if (!nextHandle) {
      return currentHandle;
    }
    if (!hasCollaborationTurnStreamStarted(currentHandle) && hasCollaborationTurnStreamStarted(nextHandle)) {
      return nextHandle;
    }
    if (!normalizeCollaborationTurnRunId(currentHandle.runId) && normalizeCollaborationTurnRunId(nextHandle.runId)) {
      return nextHandle;
    }
    return currentHandle;
  }

  function buildCollaborationAbortTargets(handles) {
    const bySessionKey = new Map();
    for (const handle of handles || []) {
      const sessionKey = String(handle?.sessionKey || "").trim();
      if (!sessionKey) {
        continue;
      }
      const key = sessionKey.toLowerCase();
      const current = bySessionKey.get(key);
      if (!current) {
        bySessionKey.set(key, { sessionKey, handle });
        continue;
      }
      current.handle = selectPreferredAbortTargetHandle(current.handle, handle);
      if (current.handle === handle) {
        current.sessionKey = sessionKey;
      }
    }
    return [...bySessionKey.values()];
  }

  async function sleep(ms) {
    const timeoutMs = Math.max(0, Number(ms) || 0);
    if (!timeoutMs) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  }

  async function abortCollaborationActiveTurn(handle) {
    const sessionKey = String(handle?.sessionKey || "").trim();
    if (!sessionKey) {
      return {
        ok: true,
        sessionKey,
      };
    }
    if (typeof abortCollaborationSessionRun !== "function") {
      return {
        ok: false,
        sessionKey,
        message: "No upstream abort transport is configured for collaboration room termination.",
      };
    }
    const maxAttempts = shouldAcceptPrestartCollaborationAbortMiss(handle)
      ? COLLABORATION_ABORT_PRESTART_MAX_ATTEMPTS
      : 1;
    let lastResult = void 0;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      lastResult = await abortCollaborationSessionRun(
        sessionKey,
        normalizeCollaborationTurnRunId(handle?.runId),
      );
      if (!lastResult || lastResult.aborted !== false) {
        return {
          ok: true,
          sessionKey,
          result: lastResult,
        };
      }
      if (!shouldAcceptPrestartCollaborationAbortMiss(handle) || attempt >= maxAttempts) {
        break;
      }
      await sleep(COLLABORATION_ABORT_PRESTART_RETRY_DELAY_MS);
    }
    if (lastResult && lastResult.aborted === false && shouldAcceptPrestartCollaborationAbortMiss(handle)) {
      return {
        ok: true,
        sessionKey,
        result: lastResult,
        acceptedPrestartCancellation: true,
      };
    }
    return {
      ok: false,
      sessionKey,
      message: "Upstream gateway reported no active run to abort.",
      result: lastResult,
    };
  }

  async function createCollaborationRoomMessage(payload, toolClient, directory, defaultLanguage) {
    const roomId = await normalizeCollaborationRoomIdPayload(payload.roomId, directory);
    const roomState = await import_collaboration_room.loadExistingCollaborationRoom(roomId).catch(() => void 0);
    await ensurePrimaryAgentTranscriptSidecar({
      roomId,
      directory,
      roomTitle: roomState?.title,
    }).catch(() => void 0);
    const messageText = optionalBoundedString(payload.text ?? payload.message, "text", 12e3) ?? "";
    const languageInput = optionalBoundedString(payload.lang ?? payload.language, "lang", 8);
    const language =
      languageInput && isUiLanguage(languageInput.trim().toLowerCase())
        ? languageInput.trim().toLowerCase()
        : defaultLanguage;
    const attachmentIds = normalizeCollaborationAttachmentIds(payload.attachmentIds);
    if (!messageText && attachmentIds.length === 0) {
      throw createRequestValidationError("A collaboration message needs text, attachments, or both.", 400);
    }
    if (attachmentIds.length > import_collaboration_room.COLLABORATION_ATTACHMENTS_PER_MESSAGE_MAX) {
      throw createRequestValidationError(
        `A collaboration message supports at most ${import_collaboration_room.COLLABORATION_ATTACHMENTS_PER_MESSAGE_MAX} attachments.`,
        400,
      );
    }
    const unknownMentions = findUnknownCollaborationMentions(messageText, directory);
    if (unknownMentions.length > 0) {
      throw createRequestValidationError(`Unknown @ mention(s): ${unknownMentions.join(", ")}`, 400);
    }
    const attachmentRecords = await import_collaboration_room.getCollaborationAttachmentRecords(roomId, attachmentIds);
    if (attachmentRecords.length !== attachmentIds.length) {
      throw createRequestValidationError("One or more collaboration attachments could not be found.", 400);
    }
    const targets = import_collaboration_room.resolveCollaborationDispatchTargets({
      message: messageText,
      participants: directory.entries,
      primaryAgentId: directory.primaryAgentId,
    });
    if (targets.length === 0) {
      throw createRequestValidationError("No collaboration target could be resolved for this message.", 400);
    }
    const sourceEventId = randomUUID();
    const appended = await import_collaboration_room.appendCollaborationRoomEvents(roomId, [
      {
        eventId: sourceEventId,
        type: "user_message",
        authorRole: "user",
        message: messageText || void 0,
        targetAgentIds: targets,
        attachmentIds,
        detail: targets.map((agentId) => resolveCollaborationParticipantName(directory, agentId)).join(", "),
      },
      ...attachmentRecords.map((attachment) => ({
        eventId: randomUUID(),
        type: "attachment",
        authorRole: "user",
        sourceEventId,
        attachmentIds: [attachment.attachmentId],
        message: attachment.fileName,
        detail: buildCollaborationAttachmentSummary(attachment),
      })),
    ]);
    const sourceEvent = appended.find((event) => event.eventId === sourceEventId);
    if (!sourceEvent) {
      throw new Error("Failed to write collaboration room source event.");
    }
    await import_collaboration_room.markCollaborationAttachmentsReferenced(
      roomId,
      attachmentIds,
      sourceEvent.createdAt,
    );
    await closePendingUserConfirmationTasksForRoom({
      roomId,
      continuedAt: sourceEvent.createdAt,
    });
    await appendCollaborationDispatchStartedEvents({
      roomId,
      sourceEventId,
      targetAgentIds: targets,
      directory,
      language,
    });
    void dispatchCollaborationRoomMessage({
      roomId,
      sourceEvent,
      attachmentRecords,
      targetAgentIds: targets,
      toolClient,
      directory,
      language,
    });
    return {
      roomId,
      eventId: sourceEvent.eventId,
      sequence: sourceEvent.sequence,
      createdAt: sourceEvent.createdAt,
      text: sourceEvent.message,
      targetAgentIds: targets,
      targetDisplayNames: targets.map((agentId) => resolveCollaborationParticipantName(directory, agentId)),
      attachments: attachmentRecords.map((attachment) => toCollaborationApiAttachment(attachment, roomId)),
    };
  }

  async function terminateCollaborationRoomWork(payload, directory, defaultLanguage) {
    const roomId = await normalizeCollaborationRoomIdPayload(payload.roomId, directory);
    const languageInput = optionalBoundedString(payload.lang ?? payload.language, "lang", 8);
    const language =
      languageInput && isUiLanguage(languageInput.trim().toLowerCase())
        ? languageInput.trim().toLowerCase()
        : defaultLanguage;
    const now = new Date().toISOString();
    const nextAbortGeneration = currentCollaborationRoomAbortGeneration(roomId) + 1;
    collaborationRoomAbortGenerations.set(roomId, nextAbortGeneration);
    const activeTurns = [...collaborationActiveTurns.values()].filter(
      (handle) => String(handle.roomId || "").trim() === roomId,
    );
    const activeAgentIds = uniqueCompactStrings(activeTurns.map((handle) => handle.agentId));
    const activeAbortTargets = buildCollaborationAbortTargets(activeTurns);
    for (const handle of activeTurns) {
      try {
        handle.abortController.abort(
          pickUiText(
            language,
            "Stopped current room work from the collaboration chat.",
            "Stopped current room work from the collaboration chat.",
          ),
        );
      } catch {}
      if (handle.sourceEventId && handle.agentId) {
        import_collaboration_live_drafts.clearCollaborationLiveDraft({
          roomId,
          sourceEventId: handle.sourceEventId,
          agentId: handle.agentId,
        });
      }
    }
    const abortFailures = [];
    if (activeAbortTargets.length > 0) {
      const abortResults = await Promise.allSettled(
        activeAbortTargets.map(async (target) => {
          const result = await abortCollaborationActiveTurn(target.handle);
          if (!result?.ok) {
            throw new Error(result?.message || "Unknown abort failure.");
          }
          return target.sessionKey;
        }),
      );
      abortResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          return;
        }
        abortFailures.push({
          sessionKey: activeAbortTargets[index]?.sessionKey || "",
          message: result.reason instanceof Error ? result.reason.message : String(result.reason || "Unknown abort failure."),
        });
      });
    }
    if (abortFailures.length > 0) {
      const failureMessage = `Failed to stop ${abortFailures.length} upstream collaboration session(s). OpenClaw may still continue replying in this room.`;
      /*
      const failureMessage = pickUiText(
        language,
        `Failed to stop ${abortFailures.length} upstream collaboration session(s). OpenClaw may still continue replying in this room.`,
        `Failed to stop ${abortFailures.length} upstream collaboration session(s). OpenClaw may still continue replying in this room.`,
      );
      */
      const failureDetail = abortFailures
        .map((item) => `${item.sessionKey}: ${item.message}`)
        .join(" | ");
      await import_collaboration_room
        .appendCollaborationRoomEvents(roomId, [
          {
            eventId: randomUUID(),
            type: "system_note",
            authorRole: "system",
            agentId: directory.primaryAgentId,
            message: failureMessage,
            detail: failureDetail || failureMessage,
          },
        ])
        .catch(() => void 0);
      throw createRequestValidationError(
        failureDetail ? `${failureMessage} ${failureDetail}` : failureMessage,
        409,
      );
    }
    const roomState = await import_collaboration_room.loadCollaborationRoom(roomId);
    const projectStore = await import_project_store.loadProjectStore().catch(() => ({ projects: [] }));
    const projectTitleById = new Map(
      (projectStore?.projects || []).map((project) => [project.projectId, project.title || project.projectId]),
    );
    const stopMessage = pickUiText(
      language,
      "Stopped the current in-progress work from the collaboration chat.",
      "Stopped the current in-progress work from the collaboration chat.",
    );
    const stopBlocker = pickUiText(
      language,
      "Stopped by the user from the collaboration chat.",
      "Stopped by the user from the collaboration chat.",
    );
    const blockedTaskMap = new Map();
    for (const receipt of roomState.taskReceipts || []) {
      if (receipt.lastResultState !== "in_progress") {
        continue;
      }
      blockedTaskMap.set(`${receipt.projectId}::${receipt.taskId}`, {
        agentId: receipt.lastReportedBy,
        projectId: receipt.projectId,
        taskId: receipt.taskId,
        taskTitle: receipt.taskTitle,
        stage: receipt.stage,
      });
    }
    for (const handle of activeTurns) {
      if (!handle.projectId || !handle.taskId) {
        continue;
      }
      blockedTaskMap.set(`${handle.projectId}::${handle.taskId}`, {
        agentId: handle.agentId,
        projectId: handle.projectId,
        taskId: handle.taskId,
        taskTitle: handle.taskTitle,
        stage: handle.stage,
      });
    }
    const blockedTasks = [...blockedTaskMap.values()];
    await Promise.allSettled(
      blockedTasks.map(async (task) => {
        await import_collaboration_room.upsertCollaborationTaskReceipt(roomId, {
          taskId: task.taskId,
          projectId: task.projectId,
          lastResultState: "blocked",
          lastReportedAt: now,
          lastReportedBy: "system",
          taskTitle: task.taskTitle,
          stage: task.stage,
          summary: stopMessage,
          recentOutput: stopMessage,
          blockers: [stopBlocker],
        });
        await updateCollaborationTaskStatusDirect({
          projectId: task.projectId,
          taskId: task.taskId,
          status: "blocked",
        }).catch(() => void 0);
      }),
    );
    if (activeTurns.length > 0 || blockedTasks.length > 0) {
      await import_collaboration_room.appendCollaborationRoomEvents(roomId, [
        {
          eventId: randomUUID(),
          type: "system_note",
          authorRole: "system",
          agentId: directory.primaryAgentId,
          message: stopMessage,
          detail:
            activeAgentIds.length > 0
              ? pickUiText(
                  language,
                  `Stopped active turns for ${activeAgentIds.map((agentId) => resolveCollaborationParticipantName(directory, agentId)).join(", ")}.`,
                  `Stopped active turns for ${activeAgentIds.map((agentId) => resolveCollaborationParticipantName(directory, agentId)).join(", ")}.`,
                )
              : stopMessage,
        },
      ]);
    }
    const nextState = await import_collaboration_room.loadCollaborationRoom(roomId);
    const affectedProjectIds = uniqueCompactStrings(blockedTasks.map((task) => task.projectId));
    for (const projectId of affectedProjectIds) {
      await syncProjectOpenTasksForRoom(
        projectId,
        projectTitleById.get(projectId) || projectId,
        nextState,
      ).catch(() => void 0);
    }
    const statusMessage =
      activeTurns.length > 0 || blockedTasks.length > 0
        ? pickUiText(
            language,
            `Stopped ${Math.max(activeTurns.length, blockedTasks.length)} in-progress item(s) in this room.`,
            `Stopped ${Math.max(activeTurns.length, blockedTasks.length)} in-progress item(s) in this room.`,
          )
        : pickUiText(
            language,
            "No active room work needed to be stopped.",
            "No active room work needed to be stopped.",
          );
    return {
      roomId,
      terminatedAt: now,
      abortedTurnCount: activeTurns.length,
      blockedTaskCount: blockedTasks.length,
      activeAgentIds,
      taskIds: blockedTasks.map((task) => task.taskId),
      message: statusMessage,
    };
  }

  async function adjudicateCollaborationRoomOutcome(payload, directory, defaultLanguage) {
    const roomId = await normalizeCollaborationRoomIdPayload(payload.roomId, directory);
    const languageInput = optionalBoundedString(payload.lang ?? payload.language, "lang", 8);
    const language =
      languageInput && isUiLanguage(languageInput.trim().toLowerCase())
        ? languageInput.trim().toLowerCase()
        : defaultLanguage;
    const outcome = normalizeManualOutcome(
      optionalBoundedString(payload.outcome, "outcome", 24)?.trim().toLowerCase(),
    );
    if (!outcome) {
      throw createRequestValidationError("A valid collaboration room outcome is required.", 400);
    }
    const note = optionalBoundedString(payload.note, "note", 240);
    const roomState = await import_collaboration_room.loadCollaborationRoom(roomId);
    const taskStore = await import_task_store.loadTaskStore().catch(() => ({ tasks: [] }));
    const projectTitleById = await loadCollaborationProjectTitleById();
    const outcomeLabel = manualOutcomeLabel(outcome, language);
    const systemMessage = manualOutcomeNoteMessage(outcome, language);
    const now = new Date().toISOString();
    const targetReceipts = roomActionableTaskReceipts(roomState, taskStore);
    const nextTaskStatus = manualOutcomeTaskStatus(outcome);

    await Promise.allSettled(
      targetReceipts.map(async (receipt) => {
        await import_collaboration_room.upsertCollaborationTaskReceipt(roomId, {
          ...receipt,
          manualOutcome: outcome,
          manualOutcomeAt: now,
          manualOutcomeBy: "user",
          manualOutcomeNote: note || systemMessage,
        });
        await updateCollaborationTaskStatusDirect({
          projectId: receipt.projectId,
          taskId: receipt.taskId,
          status: nextTaskStatus,
        }).catch(() => void 0);
      }),
    );

    const previousOutcome = normalizeManualOutcome(
      targetReceipts.find((receipt) => receipt.manualOutcome)?.manualOutcome,
    );
    const detailParts = [
      previousOutcome && previousOutcome !== outcome
        ? pickUiText(
            language,
            `Replaced the previous manual room result (${manualOutcomeLabel(previousOutcome, language)}).`,
            `已覆盖之前的人工判定（${manualOutcomeLabel(previousOutcome, language)}）。`,
          )
        : "",
      note ? note.trim() : "",
    ].filter(Boolean);
    await import_collaboration_room.appendCollaborationRoomEvents(roomId, [
      {
        eventId: randomUUID(),
        type: "system_note",
        authorRole: "system",
        agentId: directory.primaryAgentId,
        message: systemMessage,
        detail: detailParts.join(" ") || outcomeLabel,
      },
    ]);

    const nextState = await import_collaboration_room.loadCollaborationRoom(roomId);
    const affectedProjectIds = uniqueCompactStrings(targetReceipts.map((receipt) => receipt.projectId));
    for (const projectId of affectedProjectIds) {
      await syncProjectOpenTasksForRoom(
        projectId,
        projectTitleById.get(projectId) || projectId,
        nextState,
      ).catch(() => void 0);
    }
    const acknowledgedActionItemIds = await acknowledgeLinkedActionQueueItemsForRoom({
      roomState: nextState,
      outcome,
      language,
    }).catch(() => []);
    const message = pickUiText(
      language,
      `${outcomeLabel}. Updated ${targetReceipts.length} task(s) in this room.`,
      `${outcomeLabel}。已更新该房间中的 ${targetReceipts.length} 个任务。`,
    );
    return {
      roomId,
      outcome,
      outcomeLabel,
      updatedAt: now,
      taskIds: targetReceipts.map((receipt) => receipt.taskId),
      updatedTaskCount: targetReceipts.length,
      acknowledgedActionItemIds,
      acknowledgedActionCount: acknowledgedActionItemIds.length,
      message,
    };
  }

  async function dispatchCollaborationRoomMessage(input) {
    try {
      await Promise.all(
        input.targetAgentIds.map((agentId) =>
          dispatchCollaborationTurnToAgentV2({
            roomId: input.roomId,
            sourceEvent: input.sourceEvent,
            targetAgentId: agentId,
            attachmentRecords: input.attachmentRecords,
            targetAgentIds: input.targetAgentIds,
            toolClient: input.toolClient,
            directory: input.directory,
            language: input.language,
            requestMessageOverride: input.requestMessageOverride,
            requestTitleOverride: input.requestTitleOverride,
          }),
        ),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unexpected collaboration dispatch failure.";
      await import_collaboration_room
        .appendCollaborationRoomEvents(input.roomId, [
          {
            eventId: randomUUID(),
            type: "system_note",
            authorRole: "system",
            sourceEventId: input.sourceEvent.eventId,
            message: detail,
            detail,
          },
        ])
        .catch(() => void 0);
    }
  }

  async function appendCollaborationDispatchStartedEvents(input) {
    const sessionBindings = new Map(
      await Promise.all(
        input.targetAgentIds.map(async (agentId) => [
          normalizeLookupKey(agentId),
          await import_collaboration_room.getCollaborationSessionBinding(input.roomId, agentId),
        ]),
      ),
    );
    return import_collaboration_room.appendCollaborationRoomEvents(
      input.roomId,
      input.targetAgentIds.map((agentId) => {
        const binding = resolveCollaborationAgentSessionBinding(
          input.roomId,
          agentId,
          sessionBindings.get(normalizeLookupKey(agentId)),
        );
        const participantName = resolveCollaborationParticipantName(input.directory, agentId);
        const routedByName =
          input.sourceAgentId &&
          normalizeLookupKey(input.sourceAgentId) !== normalizeLookupKey(agentId)
            ? resolveCollaborationParticipantName(input.directory, input.sourceAgentId)
            : "";
        return {
          eventId: randomUUID(),
          type: "dispatch_started",
          authorRole: "system",
          agentId,
          sourceEventId: input.sourceEventId,
          targetAgentIds: [agentId],
          relatedSessionId: binding?.sessionId,
          relatedSessionKey: binding?.sessionKey,
          detail: input.fromReplyMention && routedByName
            ? pickUiText(
                input.language,
                `Queued for ${participantName} from ${routedByName}'s coordination reply.`,
                `Queued for ${participantName} from ${routedByName}'s coordination reply.`,
              )
            : pickUiText(
                input.language,
                `Queued for ${participantName}.`,
                `Queued for ${participantName}.`,
              ),
        };
      }),
    );
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function stripCollaborationLineForMentionRouting(line) {
    return String(line || "")
      .replace(/[`*_~]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
  }

  function looksLikeActionableCollaborationMentionLine(line) {
    const normalized = stripCollaborationLineForMentionRouting(line);
    if (!normalized) {
      return false;
    }
    const actionablePattern =
      /(please|pls|kindly|should|must|can you|could you|need(?:s)? to|reply\b|respond\b|check\b|verify\b|review\b|inspect\b|investigate\b|draft\b|summari[sz]e\b|look into\b|handle\b|take\b|sync\b|coordinate\b|follow up\b|回复|确认|检查|核对|验证|评审|查看|处理|跟进|补充|整理|起草|麻烦|请回复一下)/iu;
    const statusPattern =
      /(reported\b|replied\b|feedback\b|done\b|completed\b|finished\b|complete\b|summary\b|summarizing\b|pending\b|still pending\b|latest worker updates\b|已反馈|已回复|都已反馈|已完成|完成了|汇总|最新进度|反馈情况|还缺)/iu;
    return actionablePattern.test(normalized) && !statusPattern.test(normalized);
  }

  function buildCollaborationParticipantReferencePatterns(participant) {
    const seeds = [
      participant?.agentId,
      participant?.displayName,
      ...(Array.isArray(participant?.aliases) ? participant.aliases : []),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const uniqueSeeds = [...new Set(seeds)];
    return uniqueSeeds.map((seed) => new RegExp(`(^|[^\\p{L}\\p{N}_-])@?${escapeRegExp(seed)}(?=$|[^\\p{L}\\p{N}_-])`, "iu"));
  }

  function extractCollaborationTargetedInstructionLines(input) {
    const participant = input.directory.entries.find(
      (entry) => normalizeLookupKey(entry.agentId) === normalizeLookupKey(input.targetAgentId),
    );
    if (!participant) {
      return [];
    }
    const visibleReplyText = sanitizeVisibleCollaborationText(input.replyText, input.language, "", 4000);
    const lines = visibleReplyText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return [];
    }
    const referencePatterns = buildCollaborationParticipantReferencePatterns(participant);
    const targetedLines = [];
    for (const line of lines) {
      if (!referencePatterns.some((pattern) => pattern.test(line))) {
        continue;
      }
      if (!looksLikeActionableCollaborationMentionLine(line)) {
        continue;
      }
      if (!targetedLines.includes(line)) {
        targetedLines.push(line);
      }
    }
    return targetedLines;
  }

  function resolveCollaborationReplyMentionDispatchPlans(input) {
    const primaryKey = normalizeLookupKey(input.directory.primaryAgentId);
    const actorKey = normalizeLookupKey(input.actorAgentId);
    if (!primaryKey || actorKey !== primaryKey) {
      return [];
    }
    const currentRouteKeys = new Set((input.currentRouteAgentIds || []).map((value) => normalizeLookupKey(value)));
    return import_collaboration_room
      .parseMentionedAgentIds(input.replyText, input.directory.entries)
      .filter((agentId) => {
        const normalizedAgentId = normalizeLookupKey(agentId);
        return normalizedAgentId && normalizedAgentId !== primaryKey && !currentRouteKeys.has(normalizedAgentId);
      })
      .map((agentId) => ({
        agentId,
        instructionLines: extractCollaborationTargetedInstructionLines({
          replyText: input.replyText,
          targetAgentId: agentId,
          directory: input.directory,
          language: input.language,
        }),
      }))
      .filter((plan) => plan.instructionLines.length > 0);
  }

  function buildCollaborationFollowUpRequestMessage(input) {
    const originalRequest = String(input.originalRequestText || "").trim();
    const coordinatorInstruction = String(input.coordinatorReplyText || "").trim();
    const targetedInstruction = String(input.targetedInstructionText || "").trim();
    if (originalRequest && coordinatorInstruction) {
      return [
        pickUiText(input.language, "Original user request (context only):", "鍘熷鐢ㄦ埛璇锋眰锛堜粎浣滀笂涓嬫枃锛夛細"),
        originalRequest,
        "",
        pickUiText(
          input.language,
          `${input.coordinatorName} assigned follow-up for you:`,
          `${input.coordinatorName} 鍒嗛厤缁欎綘鐨勫悗缁姩浣滐細`,
        ),
        targetedInstruction || coordinatorInstruction,
        "",
        pickUiText(
          input.language,
          "Do only this assigned follow-up unless the coordinator explicitly asks you to redo the whole user request.",
          "Do only this assigned follow-up unless the coordinator explicitly asks you to redo the whole user request.",
        ),
      ].join("\n");
    }
    return targetedInstruction || coordinatorInstruction || originalRequest;
  }

  async function maybeDispatchCollaborationReplyMentions(input) {
    const replyText = String(input.replyText || "").trim();
    if (!replyText) {
      return [];
    }
    const plans = resolveCollaborationReplyMentionDispatchPlans({
      replyText,
      directory: input.directory,
      actorAgentId: input.replyEvent.agentId,
      currentRouteAgentIds: input.currentRouteAgentIds,
      language: input.language,
    });
    const targets = plans.map((plan) => plan.agentId);
    if (targets.length === 0) {
      return [];
    }
    const originalRequestText = summarizeCollaborationUiText(
      input.parentRequestText,
      input.sourceEvent?.message || "",
      4000,
    );
    const attachmentRecords = mergeCollaborationAttachmentRecords(
      input.attachmentRecords,
      input.replyAttachments,
    );
    await appendCollaborationDispatchStartedEvents({
      roomId: input.roomId,
      sourceEventId: input.replyEvent.eventId,
      targetAgentIds: targets,
      directory: input.directory,
      language: input.language,
      sourceAgentId: input.replyEvent.agentId,
      fromReplyMention: true,
    });
    for (const plan of plans) {
      const targetedInstructionText = plan.instructionLines.join("\n");
      const requestMessageOverride = buildCollaborationFollowUpRequestMessage({
        originalRequestText,
        coordinatorReplyText: replyText,
        targetedInstructionText,
        coordinatorName: resolveCollaborationParticipantName(input.directory, input.replyEvent.agentId),
        language: input.language,
      });
      const requestTitleOverride =
        summarizeCollaborationUiText(targetedInstructionText, originalRequestText, 160) ||
        summarizeCollaborationUiText(originalRequestText, targetedInstructionText, 160);
      void dispatchCollaborationRoomMessage({
        roomId: input.roomId,
        sourceEvent: input.replyEvent,
        attachmentRecords,
        targetAgentIds: [plan.agentId],
        toolClient: input.toolClient,
        directory: input.directory,
        language: input.language,
        requestMessageOverride,
        requestTitleOverride,
      });
    }
    return targets;
  }

  function resolveCollaborationCoordinatorWorkerAgentIds(input) {
    const primaryKey = normalizeLookupKey(input.directory?.primaryAgentId);
    const discovered = uniqueCompactStrings(
      (input.roomState?.events || [])
        .filter(
          (event) =>
            event?.type === "dispatch_started" &&
            event?.sourceEventId === input.sourceEventId,
        )
        .flatMap((event) =>
          event?.targetAgentIds?.length > 0
            ? event.targetAgentIds
            : event?.agentId
              ? [event.agentId]
              : [],
        ),
    ).filter((agentId) => normalizeLookupKey(agentId) !== primaryKey);
    if (discovered.length > 0) {
      return discovered;
    }
    return uniqueCompactStrings(input.currentRouteAgentIds || []).filter(
      (agentId) => normalizeLookupKey(agentId) !== primaryKey,
    );
  }

  function buildCollaborationWorkerOutcomeSummaryLines(input) {
    const workerKeys = new Set((input.workerAgentIds || []).map((agentId) => normalizeLookupKey(agentId)).filter(Boolean));
    const latestByAgent = new Map();
    for (const event of [...(input.roomState?.events || []), ...(input.supplementalEvents || [])]) {
      if (event?.sourceEventId !== input.sourceEventId) {
        continue;
      }
      const agentKey = normalizeLookupKey(event.agentId);
      if (!agentKey || !workerKeys.has(agentKey)) {
        continue;
      }
      if (
        event.type !== "agent_reply" &&
        event.type !== "dispatch_failed" &&
        event.type !== "system_note"
      ) {
        continue;
      }
      latestByAgent.set(agentKey, event);
    }
    return (input.workerAgentIds || []).map((agentId) => {
      const key = normalizeLookupKey(agentId);
      const event = latestByAgent.get(key);
      if (!event) {
        return null;
      }
      const participantName = resolveCollaborationParticipantName(input.directory, agentId);
      const summary =
        summarizeCollaborationUiText(
          event.message,
          event.failureReason || event.detail || "",
          180,
        ) ||
        summarizeCollaborationUiText(event.detail, "", 180) ||
        pickUiText(input.language, "updated", "updated");
      return {
        agentId,
        line: `- ${participantName}: ${summary}`,
      };
    });
  }

  async function maybeDispatchCollaborationCoordinatorReviewAfterWorkerReply(input) {
    const primaryKey = normalizeLookupKey(input.directory?.primaryAgentId);
    const actorKey = normalizeLookupKey(input.replyEvent?.agentId);
    if (!primaryKey || !actorKey || actorKey === primaryKey) {
      return [];
    }
    const roomState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
    const workerAgentIds = resolveCollaborationCoordinatorWorkerAgentIds({
      roomState,
      sourceEventId: input.sourceEvent.eventId,
      currentRouteAgentIds: input.currentRouteAgentIds,
      directory: input.directory,
    });
    if (workerAgentIds.length === 0 || !workerAgentIds.some((agentId) => normalizeLookupKey(agentId) === actorKey)) {
      return [];
    }
    if (
      roomState.events.some(
        (event) =>
          event.type === "dispatch_started" &&
          event.sourceEventId === input.sourceEvent.eventId &&
          normalizeLookupKey(event.agentId) === primaryKey,
      )
    ) {
      return [];
    }
    const workerOutcomes = buildCollaborationWorkerOutcomeSummaryLines({
      roomState,
      sourceEventId: input.sourceEvent.eventId,
      workerAgentIds,
      supplementalEvents: [input.replyEvent],
      directory: input.directory,
      language: input.language,
    }).filter(Boolean);
    if (workerOutcomes.length !== workerAgentIds.length) {
      return [];
    }
    const baseRequest = String(input.requestMessageOverride || input.sourceEvent?.message || "").trim();
    const requestMessageOverride = [
      baseRequest,
      "",
      pickUiText(input.language, "Latest worker updates:", "鏈€鏂板憳宸ユ洿鏂帮細"),
      ...workerOutcomes.map((item) => item.line),
      "",
      pickUiText(
        input.language,
        `Continue as ${input.directory.primaryDisplayName} in this same room. If all requested workers have reported, summarize for the user now. Otherwise state exactly who is still pending instead of claiming completion.`,
        `Continue as ${input.directory.primaryDisplayName} in this same room. If all requested workers have reported, summarize for the user now. Otherwise state exactly who is still pending instead of claiming completion.`,
      ),
    ]
      .filter(Boolean)
      .join("\n");
    const requestTitleOverride =
      summarizeCollaborationUiText(
        workerOutcomes.map((item) => item.line).join("\n"),
        baseRequest,
        160,
      ) || summarizeCollaborationUiText(baseRequest, "", 160);
    const attachmentRecords = mergeCollaborationAttachmentRecords(
      input.attachmentRecords,
      input.replyAttachments,
    );
    await appendCollaborationDispatchStartedEvents({
      roomId: input.roomId,
      sourceEventId: input.sourceEvent.eventId,
      targetAgentIds: [input.directory.primaryAgentId],
      directory: input.directory,
      language: input.language,
    });
    void dispatchCollaborationRoomMessage({
      roomId: input.roomId,
      sourceEvent: input.sourceEvent,
      attachmentRecords,
      targetAgentIds: [input.directory.primaryAgentId],
      toolClient: input.toolClient,
      directory: input.directory,
      language: input.language,
      requestMessageOverride,
      requestTitleOverride,
    });
    return [input.directory.primaryAgentId];
  }

  async function dispatchCollaborationTurnToAgent(input) {
    const binding = resolveCollaborationAgentSessionBinding(
      input.roomId,
      input.targetAgentId,
      await import_collaboration_room.getCollaborationSessionBinding(
        input.roomId,
        input.targetAgentId,
      ),
    );
    const prompt = await buildCollaborationAgentPrompt({
      roomId: input.roomId,
      sourceEvent: input.sourceEvent,
      targetAgentId: input.targetAgentId,
      targetAgentIds: input.targetAgentIds,
      attachmentRecords: input.attachmentRecords,
      directory: input.directory,
      language: input.language,
      sessionBinding: binding ? { sessionId: binding.sessionId, sessionKey: binding.sessionKey } : void 0,
    });
    const response = await input.toolClient.agentTurn({
      agentId: input.targetAgentId,
      sessionId: binding?.sessionId,
      sessionKey: binding?.sessionKey,
      message: prompt,
      timeoutSeconds: 90,
    });
    if (response.sessionId) {
      await import_collaboration_room.setCollaborationSessionBinding(
        input.roomId,
        input.targetAgentId,
        response.sessionId,
        response.sessionKey,
      );
    }
    if (response.ok) {
      const replyText = (
        await resolveCollaborationAgentTurnOutput({
          response,
          toolClient: input.toolClient,
          sessionKey: response.sessionKey ?? binding?.sessionKey,
        })
      ).replyText;
      if (!replyText) {
        return;
      }
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "agent_reply",
          authorRole: "agent",
          agentId: input.targetAgentId,
          sourceEventId: input.sourceEvent.eventId,
          message: replyText || void 0,
          relatedSessionId: response.sessionId ?? binding?.sessionId,
          relatedSessionKey: response.sessionKey ?? binding?.sessionKey,
          detail: pickUiText(
            input.language,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} replied in ${formatCollaborationDuration(response.durationMs)}.`,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} replied in ${formatCollaborationDuration(response.durationMs)}.`,
          ),
        },
      ]);
      return;
    }
    const failureSummary = summarizeCollaborationFailure({
      language: input.language,
      failureReason: response.failureReason,
      rawText: response.rawText,
    });
    await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
      {
        eventId: randomUUID(),
        type: "dispatch_failed",
        authorRole: "system",
        agentId: input.targetAgentId,
        sourceEventId: input.sourceEvent.eventId,
        targetAgentIds: [input.targetAgentId],
        relatedSessionId: response.sessionId ?? binding?.sessionId,
        relatedSessionKey: response.sessionKey ?? binding?.sessionKey,
        failureReason: failureSummary,
        detail: pickUiText(
          input.language,
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed: ${failureSummary}`,
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 鍒嗗彂澶辫触锛?{failureSummary}`,
        ),
      },
    ]);
    const primaryKey = normalizeLookupKey(input.directory.primaryAgentId);
    if (normalizeLookupKey(input.targetAgentId) === primaryKey) {
      return;
    }
    const primaryAlreadyIncluded = input.targetAgentIds.some(
      (agentId) => normalizeLookupKey(agentId) === primaryKey,
    );
    await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
      {
        eventId: randomUUID(),
        type: "dispatch_fallback",
        authorRole: "system",
        agentId: input.targetAgentId,
        sourceEventId: input.sourceEvent.eventId,
        fallbackAgentId: input.directory.primaryAgentId,
        targetAgentIds: [input.directory.primaryAgentId],
        detail: primaryAlreadyIncluded
          ? pickUiText(
              input.language,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so ${input.directory.primaryDisplayName} remains the active fallback on this route.`,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so ${input.directory.primaryDisplayName} remains the active fallback on this route.`,
            )
          : pickUiText(
              input.language,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so the turn is being handed to ${input.directory.primaryDisplayName}.`,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so the turn is being handed to ${input.directory.primaryDisplayName}.`,
            ),
      },
    ]);
    if (primaryAlreadyIncluded) {
      return;
    }
    await dispatchCollaborationTurnToAgent({
      ...input,
      targetAgentId: input.directory.primaryAgentId,
      targetAgentIds: [...input.targetAgentIds, input.directory.primaryAgentId],
    });
  }

  async function buildCollaborationAgentPrompt(input) {
    const roomState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
    const attachmentsById = new Map(roomState.attachments.map((item) => [item.attachmentId, item]));
    const recentEvents = roomState.events
      .filter((event) => event.sequence <= input.sourceEvent.sequence)
      .slice(-12)
      .map((event) => {
        const described = describeCollaborationRoomEvent(
          event,
          input.language,
          input.directory,
          attachmentsById,
        );
        return `- [${event.sequence}] ${described.label}: ${safeTruncate(
          described.detail || event.message || "",
          260,
        )}`;
      })
      .join("\n");
    const attachmentLines =
      input.attachmentRecords.length === 0
        ? "- none"
        : input.attachmentRecords
            .map((attachment) => buildCollaborationAttachmentPromptLines(attachment))
            .join("\n");
    const routedNames = input.targetAgentIds.map((agentId) =>
      resolveCollaborationParticipantName(input.directory, agentId),
    );
    const currentTargetName = resolveCollaborationParticipantName(
      input.directory,
      input.targetAgentId,
    );
    const sessionLine = input.sessionBinding?.sessionKey
      ? `Continue the existing agent session if possible. sessionKey=${input.sessionBinding.sessionKey}${input.sessionBinding.sessionId ? ` sessionId=${input.sessionBinding.sessionId}` : ""}`
      : "No existing bound room session is available yet; create or continue as needed.";
    return [
      `You are ${currentTargetName} in the OpenClaw collaboration room.`,
      `Primary controller: ${input.directory.primaryDisplayName} (${input.directory.primaryAgentId}).`,
      `Current target: ${currentTargetName} (${input.targetAgentId}).`,
      `Routed participants for this user turn: ${routedNames.join(", ")}.`,
      sessionLine,
      "",
      "Recent room context:",
      recentEvents || "- none",
      "",
      "Current user message:",
      input.sourceEvent.message?.trim() || "[No text body. See attachments.]",
      "",
      "Attachments:",
      attachmentLines,
      "",
      buildCollaborationVisibleReplyLanguageRequirement(input.language),
      buildCollaborationShellRequirement(getOpenClawWorkspaceRoot(), input.language),
      "For HTML, Markdown, JSON, code, and other text attachments, use the inline excerpt above as content context first, then open the local file path only if you need more detail.",
      "If the user attached a file asking for analysis or changes, work from the file content instead of replying with only the file path.",
      "Reply to the user as this agent. If the file paths are relevant, read them directly from the provided local paths. Keep the answer concrete and execution-oriented.",
    ].join("\n");
  }

  function normalizeProjectIdCandidate(value) {
    const trimmed = String(value || "").trim();
    return /^[A-Za-z0-9._:-]{1,100}$/.test(trimmed) ? trimmed : "";
  }

  function slugifyProjectId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
  }

  function buildUniqueProjectId(seed, takenIds) {
    const taken = new Set((takenIds || []).map((item) => String(item || "").trim()).filter(Boolean));
    const base = slugifyProjectId(seed) || `project-${Date.now().toString(36)}`;
    if (!taken.has(base)) {
      return base;
    }
    for (let index = 2; index < 5000; index += 1) {
      const next = `${base}-${index}`;
      if (!taken.has(next)) {
        return next;
      }
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  function buildDispatchTaskId(sourceEventId, agentId) {
    const safeEventId = String(sourceEventId || "").trim().replace(/[^A-Za-z0-9._:-]+/g, "-").slice(0, 80);
    const safeAgentId = String(agentId || "").trim().replace(/[^A-Za-z0-9._:-]+/g, "-").slice(0, 40);
    return `collab-${safeEventId || "turn"}-${safeAgentId || "agent"}`.slice(0, 100);
  }

  function normalizeCollaborationSessionKeyPart(value, fallback) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96);
    return normalized || fallback;
  }

  function buildCollaborationBackgroundSessionKey(roomId, agentId) {
    const normalizedAgentId = normalizeCollaborationSessionKeyPart(
      normalizeLookupKey(agentId),
      "main",
    );
    const normalizedRoomId =
      import_openclaw_chat_rooms.normalizeTranscriptRoomId(roomId) ??
      normalizeCollaborationSessionKeyPart(roomId, "room");
    return `agent:${normalizedAgentId}:thread:collab-${normalizedRoomId}`;
  }

  function resolveCollaborationLiveDraftSessionKey(roomId, agentId, binding) {
    return binding?.sessionKey || buildCollaborationBackgroundSessionKey(roomId, agentId);
  }

  function resolveCollaborationAgentSessionBinding(roomId, agentId, binding) {
    const sessionKey = buildCollaborationBackgroundSessionKey(roomId, agentId);
    const normalizedBoundKey = String(binding?.sessionKey || "").trim().toLowerCase();
    if (!binding?.sessionId || normalizedBoundKey !== sessionKey) {
      return { sessionKey };
    }
    return {
      sessionId: binding.sessionId,
      sessionKey: binding.sessionKey || sessionKey,
    };
  }

  function isLikelyRelayPromptText(value) {
    const normalized = String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!normalized) {
      return false;
    }
    return (
      (
        normalized.includes("in the openclaw collaboration room.") &&
        normalized.includes("primary controller:") &&
        normalized.includes("current user message:")
      ) ||
      (
        normalized.includes("<openclaw_coordination>") &&
        normalized.includes("projectid:") &&
        normalized.includes("taskid:")
      )
    );
  }

  function isLikelyCollaborationPromptEcho(value) {
    const normalized = String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!normalized) {
      return false;
    }
    return (
      (normalized.includes("user request:") &&
        (normalized.includes("<openclaw_coordination>") ||
          normalized.includes("contextrefs:") ||
          normalized.includes("recentcollaborationsummary:"))) ||
      (normalized.includes("projectsummary:") &&
        normalized.includes("contextrefs:") &&
        normalized.includes("projectroot:")) ||
      (normalized.includes("projectartifactsdir:") &&
        normalized.includes("projectroot:") &&
        normalized.includes("sessionbinding:"))
    );
  }

  function stripCollaborationMachinePrompt(value) {
    let text = String(value || "").replace(/\r/g, "").trim();
    if (!text) {
      return "";
    }
    text = text.replace(/<openclaw_coordination>[\s\S]*?<\/openclaw_coordination>/gi, " ").trim();
    if (isLikelyRelayPromptText(text)) {
      const currentUserMessageMatch = /Current user message:\s*([\s\S]*?)(?:Attachments:|Reply to the user as this agent\.?|$)/i.exec(text);
      if (currentUserMessageMatch?.[1]?.trim()) {
        text = currentUserMessageMatch[1].trim();
      }
      const userRequestMatch = /User request:\s*([\s\S]*)$/i.exec(text);
      if (userRequestMatch?.[1]?.trim()) {
        text = userRequestMatch[1].trim();
      }
    }
    return text.trim();
  }

  function extractVisibleCollaborationTurnReplyText(response, maxLength = COLLABORATION_FULL_REPLY_MAX_LENGTH) {
    const primary = String(response?.replyText || "").trim();
    if (primary && !import_collaboration_agent_artifacts.isMachineOnlyCollaborationText(primary)) {
      return safeTruncate(primary, maxLength);
    }
    const fallback = String(response?.rawText || "").trim();
    if (
      fallback &&
      !import_collaboration_agent_artifacts.isMachineOnlyCollaborationText(fallback) &&
      !isLikelyCollaborationPromptEcho(fallback)
    ) {
      return safeTruncate(fallback, maxLength);
    }
    return "";
  }

  function parseCollaborationSessionHistoryRecord(input) {
    if (!input || typeof input !== "object") {
      if (typeof input !== "string") {
        return void 0;
      }
      try {
        const parsed = JSON.parse(input);
        return parsed && typeof parsed === "object" ? parsed : void 0;
      } catch {
        return void 0;
      }
    }
    return input;
  }

  function extractCollaborationSessionHistoryRecords(history) {
    if (!history) {
      return [];
    }
    const jsonHistory = history?.json?.history;
    if (Array.isArray(jsonHistory)) {
      return jsonHistory
        .map((entry) => parseCollaborationSessionHistoryRecord(entry))
        .filter((entry) => Boolean(entry));
    }
    return String(history.rawText || "")
      .split(/\r?\n/)
      .map((line) => parseCollaborationSessionHistoryRecord(line))
      .filter((entry) => Boolean(entry));
  }

  function collectCollaborationAssistantReplyTextFragments(input, output) {
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (trimmed) {
        output.push(trimmed);
      }
      return;
    }
    if (Array.isArray(input)) {
      for (const item of input) {
        collectCollaborationAssistantReplyTextFragments(item, output);
      }
      return;
    }
    if (!input || typeof input !== "object") {
      return;
    }
    const type = String(input.type || "").trim().toLowerCase();
    if (type.startsWith("tool")) {
      return;
    }
    const directText = typeof input.text === "string" ? input.text.trim() : "";
    if (directText) {
      output.push(directText);
    }
    const directContent = typeof input.content === "string" ? input.content.trim() : "";
    if (directContent) {
      output.push(directContent);
    }
    const directMessage = typeof input.message === "string" ? input.message.trim() : "";
    if (directMessage) {
      output.push(directMessage);
    }
    if (!directContent && input.content !== void 0) {
      collectCollaborationAssistantReplyTextFragments(input.content, output);
    }
    if (!directMessage && input.message !== void 0) {
      collectCollaborationAssistantReplyTextFragments(input.message, output);
    }
    if (input.parts !== void 0) {
      collectCollaborationAssistantReplyTextFragments(input.parts, output);
    }
  }

  function extractRawAssistantReplyTextFromSessionHistoryMessage(message) {
    if (!message || typeof message !== "object") {
      return "";
    }
    const collected = [];
    if (message.content !== void 0) {
      collectCollaborationAssistantReplyTextFragments(message.content, collected);
    }
    const directReplyText = collected.length > 0
      ? collected.join("\n\n").trim()
      : (
      (typeof message.replyText === "string" ? message.replyText : void 0) ||
      (typeof message.text === "string" ? message.text : void 0) ||
      (typeof message.message === "string" ? message.message : void 0) ||
      (typeof message.content === "string" ? message.content : void 0) ||
      ""
    ).trim();
    return directReplyText;
  }

  function extractVisibleAssistantReplyTextFromSessionHistoryMessage(message) {
    const directReplyText = extractRawAssistantReplyTextFromSessionHistoryMessage(message);
    return import_collaboration_agent_artifacts.isMachineOnlyCollaborationText(directReplyText)
      ? ""
      : directReplyText;
  }

  function normalizeCollaborationAssistantStopReason(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z]+/g, "");
  }

  function isInterruptedCollaborationAssistantStopReason(stopReason) {
    const normalized = normalizeCollaborationAssistantStopReason(stopReason);
    return (
      normalized === "aborted" ||
      normalized === "interrupted" ||
      normalized === "cancelled" ||
      normalized === "canceled" ||
      normalized === "tooluse" ||
      normalized === "toolcall"
    );
  }

  function extractLatestAssistantReplyFromSessionHistory(history, startedAtMs = 0) {
    const records = extractCollaborationSessionHistoryRecords(history);
    let latest = void 0;
    let latestActivityMs = 0;
    for (const record of records) {
      const recordTimestampMs = Date.parse(String(record?.timestamp || record?.message?.timestamp || ""));
      if (recordTimestampMs > 0 && (!startedAtMs || recordTimestampMs + 1000 >= startedAtMs)) {
        latestActivityMs = Math.max(latestActivityMs, recordTimestampMs);
      }
      if (String(record?.type || "").trim().toLowerCase() !== "message") {
        continue;
      }
      const message = record?.message;
      if (!message || typeof message !== "object") {
        continue;
      }
      if (String(message.role || "").trim().toLowerCase() !== "assistant") {
        continue;
      }
      const rawReplyText = extractRawAssistantReplyTextFromSessionHistoryMessage(message);
      const replyText = import_collaboration_agent_artifacts.isMachineOnlyCollaborationText(rawReplyText)
        ? ""
        : rawReplyText;
      if (!replyText) {
        continue;
      }
      const timestampMs = Date.parse(String(message.timestamp || record.timestamp || ""));
      const hasCurrentTurnMarker = /\[\[reply_to_current(?:[^\]]*)\]\]/i.test(rawReplyText);
      if (startedAtMs && timestampMs > 0 && timestampMs + 1000 < startedAtMs && !hasCurrentTurnMarker) {
        continue;
      }
      latest = {
        replyText,
        timestampMs,
        stopReason: String(message.stopReason ?? record.stopReason ?? "").trim(),
        errorMessage: String(message.errorMessage ?? record.errorMessage ?? "").trim(),
        hasCurrentTurnMarker,
        incomplete:
          isInterruptedCollaborationAssistantStopReason(message.stopReason ?? record.stopReason) ||
          /request was aborted|turn was aborted|was aborted|cancelled|canceled/i.test(
            String(message.errorMessage ?? record.errorMessage ?? ""),
          ),
      };
    }
    return {
      latestReply: latest,
      latestActivityMs,
    };
  }

  function extractLatestAssistantReplyTextFromSessionHistory(history) {
    return extractLatestAssistantReplyFromSessionHistory(history).latestReply?.replyText || "";
  }

  function normalizeComparableCollaborationReplyText(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function looksStructuredCollaborationReplyText(value) {
    const normalized = String(value || "").replace(/\r/g, "").trim();
    if (!normalized) {
      return false;
    }
    return /\n/.test(normalized) || /^\s*[-*]\s/m.test(normalized) || /^\s*\d+\.\s/m.test(normalized);
  }

  function shouldPreferRecoveredCollaborationReplyText(currentReplyText, recoveredReplyText, allowStructuredUpgrade = false) {
    const currentText = String(currentReplyText || "").trim();
    const recoveredText = String(recoveredReplyText || "").trim();
    if (!recoveredText) {
      return false;
    }
    if (!currentText) {
      return true;
    }
    const currentNormalized = normalizeComparableCollaborationReplyText(currentText);
    const recoveredNormalized = normalizeComparableCollaborationReplyText(recoveredText);
    const currentStructured = looksStructuredCollaborationReplyText(currentText);
    const recoveredStructured = looksStructuredCollaborationReplyText(recoveredText);
    if (
      recoveredStructured &&
      (!currentStructured || allowStructuredUpgrade) &&
      (recoveredNormalized === currentNormalized ||
        recoveredNormalized.includes(currentNormalized) ||
        currentNormalized.includes(recoveredNormalized))
    ) {
      return true;
    }
    if (
      recoveredNormalized &&
      currentNormalized &&
      (recoveredNormalized === currentNormalized ||
        recoveredNormalized.includes(currentNormalized) ||
        currentNormalized.includes(recoveredNormalized)) &&
      recoveredText.length >= currentText.length + 40
    ) {
      return true;
    }
    return allowStructuredUpgrade && recoveredStructured && !currentStructured;
  }

  function summarizeCollaborationUiText(value, fallback, maxLength = 260) {
    const primary = stripCollaborationMachinePrompt(value);
    const fallbackText = stripCollaborationMachinePrompt(fallback);
    const compact = (primary || fallbackText)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return compact ? safeTruncate(compact, maxLength) : "";
  }

  function sanitizeVisibleCollaborationText(value, language, fallback = "", maxLength = 240) {
    if (typeof sanitizeCollaborationDisplayText === "function") {
      return sanitizeCollaborationDisplayText(value, language, fallback, maxLength, true);
    }
    return summarizeCollaborationUiText(value, fallback, maxLength);
  }

  function appendUniqueCollaborationText(base, suffix) {
    if (!base) {
      return suffix;
    }
    if (!suffix || base.endsWith(suffix)) {
      return base;
    }
    const maxOverlap = Math.min(base.length, suffix.length);
    for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
      if (base.slice(-overlap) === suffix.slice(0, overlap)) {
        return base + suffix.slice(overlap);
      }
    }
    return base + suffix;
  }

  function resolveMergedCollaborationStreamText(input) {
    const previousText = String(input.previousText || "");
    const nextText = typeof input.nextText === "string" ? input.nextText : "";
    const nextDeltaText = typeof input.nextDeltaText === "string" ? input.nextDeltaText : "";
    if (nextText.trim() && previousText.trim()) {
      if (nextText.startsWith(previousText)) {
        return nextText;
      }
      if (previousText.startsWith(nextText) && !nextDeltaText.trim()) {
        return previousText;
      }
    }
    if (nextDeltaText.trim()) {
      return appendUniqueCollaborationText(previousText, nextDeltaText);
    }
    if (nextText.trim()) {
      return nextText;
    }
    return previousText;
  }

  function resolveCollaborationLiveDraftText(input) {
    const previousText = String(input.currentText || "");
    const mergedText = resolveMergedCollaborationStreamText({
      previousText,
      nextText: input.event?.text,
      nextDeltaText: input.event?.deltaText,
    });
    return sanitizeVisibleCollaborationText(mergedText, input.language, previousText, 12_000);
  }

  function isJarvisWaitingForUserConfirmation(input) {
    const primaryKey = normalizeLookupKey(input.directory?.primaryAgentId);
    const actorKey = normalizeLookupKey(input.targetAgentId);
    if (!primaryKey || actorKey !== primaryKey) {
      return false;
    }
    if (input.envelope?.resultState === "blocked" || input.envelope?.resultState === "failed") {
      return false;
    }
    const visibleReplyText = sanitizeVisibleCollaborationText(input.replyText, input.language, "", 2_000);
    if (!visibleReplyText) {
      return false;
    }
    const searchableText = [
      visibleReplyText,
      summarizeCollaborationUiText(input.envelope?.summary, "", 400),
      summarizeCollaborationUiText(input.envelope?.nextSuggestion, "", 400),
    ]
      .filter(Boolean)
      .join("\n");
    if (
      resolveCollaborationReplyMentionDispatchPlans({
        replyText: visibleReplyText,
        directory: input.directory,
        actorAgentId: input.targetAgentId,
        currentRouteAgentIds: input.currentRouteAgentIds,
        language: input.language,
      }).length > 0
    ) {
      return false;
    }
    if (
      /(?:wait(?:ing)? for your (?:confirmation|approval|decision)|once you (?:confirm|approve|choose|pick|decide)|after you (?:confirm|approve|choose|pick|decide)|please (?:confirm|approve|choose|pick|select|decide)|review and confirm|let me know which|tell me which option|which option|pick one|choose one|green light|go-ahead|go ahead)/i.test(
        searchableText,
      )
    ) {
      return true;
    }
    if (
      /(?:\u8bf7\u786e\u8ba4|\u7b49\u5f85\u4f60\u7684\u786e\u8ba4|\u7b49\u4f60\u786e\u8ba4|\u4f60\u786e\u8ba4\u540e\u6211\u7ee7\u7eed|\u786e\u8ba4\u540e\u6211\u7ee7\u7eed|\u8bf7\u62cd\u677f|\u7b49\u4f60\u62cd\u677f|\u4f60\u62cd\u677f\u540e\u6211\u7ee7\u7eed|\u8bf7\u9009\u62e9|\u9009\u4e00\u4e2a|\u4f60\u9009\u5b9a\u540e\u6211\u7ee7\u7eed|\u8bf7\u51b3\u5b9a|\u7b49\u4f60\u51b3\u5b9a|\u8bf7\u5b9a\u593a|\u544a\u8bc9\u6211\u9009\u54ea\u4e2a|\u4f60\u70b9\u5934\u540e\u6211\u518d\u7ee7\u7eed)/.test(
        searchableText,
      )
    ) {
      return true;
    }
    const asksForDecision =
      /(?:confirm|approval|approve|choose|pick|select|decide|decision|preference|which option|option [a-z0-9]|reply with|respond with|send back|blend both|either one|go-ahead|go ahead)/i.test(
        searchableText,
      ) ||
      /(?:\u786e\u8ba4|\u62cd\u677f|\u9009\u62e9|\u9009\u9879|\u51b3\u5b9a|\u5b9a\u593a|\u504f\u597d|\u65b9\u6848[abAB])/.test(
        searchableText,
      );
    const gatesContinuation =
      /(?:continue|proceed|move forward|next step|i(?:'| wi)?ll continue|continue from there|then continue|before i continue|before proceeding)/i.test(
        searchableText,
      ) ||
      /(?:\u7ee7\u7eed|\u518d\u5f80\u4e0b|\u4e0b\u4e00\u6b65|\u540e\u7eed|\u6211\u518d\u7ee7\u7eed|\u6211\u518d\u63a8\u8fdb)/.test(
        searchableText,
      );
    return asksForDecision && gatesContinuation;
  }

  function resolveMaybeCollaborationParticipantName(directory, agentId) {
    const normalizedAgentId = String(agentId || "").trim();
    if (!normalizedAgentId) {
      return "";
    }
    if (directory?.entries) {
      return resolveCollaborationParticipantName(directory, normalizedAgentId);
    }
    return normalizedAgentId;
  }

  function redactCollaborationSummaryPaths(value) {
    return String(value || "")
      .replace(/\b[a-z]:[\\/][^\s`"'<>|]+/gi, "[path omitted]")
      .replace(/\b(?:workspace|projects|runtime|artifacts)[\\/][^\s`"'<>|]+/gi, "[path omitted]")
      .replace(/\b\/(?:users|home|tmp|var|workspace|projects|runtime|artifacts)[^\s`"'<>|]+/gi, "[path omitted]");
  }

  function sanitizeCollaborationSummaryText(value, language, maxLength = 320) {
    const visibleText = sanitizeVisibleCollaborationText(value, language, "", maxLength * 4);
    let text =
      summarizeCollaborationUiText(visibleText, "", maxLength * 4) ||
      summarizeCollaborationUiText(value, "", maxLength * 4);
    if (!text) {
      return "";
    }
    text = text
      .replace(/\bsession(?:id|key)\b\s*[=:]\s*[^\s,;]+/gi, " ")
      .replace(/\bsessionbinding\b\s*[=:]\s*[^\s,;]+/gi, " ")
      .replace(/\[\[(?:reply_to_current|openclaw-files)[^\]]*\]\]/gi, " ");
    text = redactCollaborationSummaryPaths(text)
      .replace(/\s+/g, " ")
      .trim();
    return text ? safeTruncate(text, maxLength) : "";
  }

  function isMeaningfulCollaborationSystemNote(text) {
    return /(blocked?|blocker|failed?|error|fallback|interrupted|stuck|locked|retry|rejected|timeout|not found|闃诲|澶辫触|閿欒|鍥為€€|涓柇|鍗′綇|閿佸畾|閲嶈瘯|鏈€氳繃|瓒呮椂)/i.test(
      String(text || ""),
    );
  }

  function isMeaningfulReplyMentionDispatch(detailText) {
    return /(coordination reply|coordination instruction|鍗忓悓瀹夋帓|鍗忚皟鎸囦护)/i.test(String(detailText || ""));
  }

  function isMeaningfulCollaborationReplySummary(text) {
    const normalized = normalizeLookupKey(text || "");
    if (!normalized || normalized.length < 12) {
      return false;
    }
    return !/(accepted the task|accepted the follow-up|working on it|starting now|收到|开始处理|处理中)/i.test(
      normalized,
    );
  }

  function resolveRecentCollaborationSummaryLabel(input) {
    const describedLabel = String(input.describedLabel || "").trim();
    if (describedLabel) {
      return describedLabel;
    }
    if (input.event.authorRole === "agent" && input.event.agentId) {
      return resolveMaybeCollaborationParticipantName(input.directory, input.event.agentId);
    }
    if (input.event.authorRole === "user") {
      return pickUiText(input.language, "User", "鐢ㄦ埛");
    }
    if (
      (input.event.type === "dispatch_started" ||
        input.event.type === "dispatch_failed" ||
        input.event.type === "dispatch_fallback") &&
      input.event.agentId
    ) {
      return resolveMaybeCollaborationParticipantName(input.directory, input.event.agentId);
    }
    return pickUiText(input.language, "System", "绯荤粺");
  }

  function buildRecentCollaborationSummaryCandidate(input) {
    const described = input.directory?.entries
      ? describeCollaborationRoomEvent(
          input.event,
          input.language,
          input.directory,
          input.attachmentsById,
        )
      : {
          label: "",
          detail: input.event.detail || "",
        };
    const label = resolveRecentCollaborationSummaryLabel({
      event: input.event,
      describedLabel: described?.label,
      language: input.language,
      directory: input.directory,
    });
    const messageText = sanitizeCollaborationSummaryText(input.event.message, input.language, 420);
    const detailText = sanitizeCollaborationSummaryText(
      described?.detail || input.event.detail || "",
      input.language,
      420,
    );
    const failureText = sanitizeCollaborationSummaryText(input.event.failureReason, input.language, 260);

    let summaryText = "";
    let priority = 0;
    switch (input.event.type) {
      case "dispatch_failed":
        summaryText = failureText || detailText || messageText;
        priority = summaryText ? 500 : 0;
        break;
      case "dispatch_fallback":
        summaryText = detailText || messageText;
        priority = summaryText ? 450 : 0;
        break;
      case "system_note": {
        const systemNoteText = messageText || detailText;
        if (!isMeaningfulCollaborationSystemNote(`${messageText} ${detailText}`)) {
          return null;
        }
        summaryText = systemNoteText;
        priority = summaryText ? 400 : 0;
        break;
      }
      case "agent_reply":
        summaryText = messageText || detailText;
        priority = isMeaningfulCollaborationReplySummary(summaryText) ? 300 : 0;
        break;
      case "user_message":
        summaryText = messageText;
        priority = summaryText ? 200 : 0;
        break;
      case "dispatch_started":
        summaryText = detailText || messageText;
        priority = isMeaningfulReplyMentionDispatch(summaryText) ? 100 : 0;
        break;
      default:
        return null;
    }

    if (!summaryText || priority <= 0) {
      return null;
    }
    const prefix = `- [${input.event.sequence}] ${label}: `;
    const availableTextLength = Math.max(
      40,
      COLLABORATION_RECENT_SUMMARY_ITEM_MAX_CHARS - prefix.length,
    );
    const compactSummary = safeTruncate(summaryText, availableTextLength);
    return {
      sequence: input.event.sequence,
      priority,
      line: `${prefix}${compactSummary}`,
      dedupeKey: normalizeLookupKey(`${input.event.type}|${label}|${compactSummary}`),
    };
  }

  async function ensurePrimaryAgentTranscriptSidecar(input) {
    const transcriptRoomId = import_openclaw_chat_rooms.normalizeTranscriptRoomId(input.roomId);
    if (!transcriptRoomId) {
      return void 0;
    }
    return import_openclaw_chat_rooms.createOpenClawChatRoom({
      agentId: input.directory.primaryAgentId,
      roomId: transcriptRoomId,
      workspaceRoot: getOpenClawWorkspaceRoot(),
      openclawHomeDir: getOpenClawHomeDir(),
      title: input.roomTitle,
    });
  }

  function buildRecentCollaborationSummaryLines(input) {
    const sourceSequence = Number.isInteger(input.sourceEvent?.sequence)
      ? input.sourceEvent.sequence
      : Number.MAX_SAFE_INTEGER;
    const candidateEvents = (input.roomState?.events || [])
      .filter((event) => event.sequence < sourceSequence)
      .filter((event) => event.type !== "attachment")
      .slice(-COLLABORATION_RECENT_SUMMARY_LOOKBACK_EVENTS);
    if (candidateEvents.length === 0) {
      return [];
    }

    const candidates = candidateEvents
      .map((event) =>
        buildRecentCollaborationSummaryCandidate({
          event,
          language: input.language,
          directory: input.directory,
          attachmentsById: input.attachmentsById || new Map(),
        }),
      )
      .filter((item) => Boolean(item))
      .sort((left, right) => right.priority - left.priority || right.sequence - left.sequence);

    const selected = [];
    const seen = new Set();
    let totalChars = 0;
    for (const candidate of candidates) {
      if (selected.length >= COLLABORATION_RECENT_SUMMARY_MAX_ITEMS) {
        break;
      }
      if (candidate.dedupeKey && seen.has(candidate.dedupeKey)) {
        continue;
      }
      if (selected.length > 0 && totalChars + candidate.line.length > COLLABORATION_RECENT_SUMMARY_MAX_TOTAL_CHARS) {
        continue;
      }
      selected.push(candidate);
      totalChars += candidate.line.length;
      if (candidate.dedupeKey) {
        seen.add(candidate.dedupeKey);
      }
    }

    return selected
      .sort((left, right) => left.sequence - right.sequence)
      .map((candidate) => candidate.line);
  }

  function resolveCollaborationDispatchRequestText(input) {
    const override = String(input.requestMessageOverride || "").trim();
    if (override) {
      return override;
    }
    const sourceText = String(input.sourceEvent?.message || "").trim();
    if (sourceText) {
      return sourceText;
    }
    return pickUiText(
      input.language,
      "Please handle this request based on the attachments.",
      "Please handle this request based on the attachments.",
    );
  }

  function mergeCollaborationAttachmentRecords(...recordSets) {
    const merged = new Map();
    for (const recordSet of recordSets) {
      for (const record of recordSet || []) {
        if (!record) {
          continue;
        }
        const key =
          String(record.attachmentId || "").trim().toLowerCase() ||
          String(record.storedPath || "").trim().toLowerCase() ||
          `${String(record.fileName || "").trim().toLowerCase()}|${String(record.sizeBytes || 0)}`;
        if (!key || merged.has(key)) {
          continue;
        }
        merged.set(key, record);
      }
    }
    return [...merged.values()];
  }

  function isRetryableUpstreamProviderFailureText(input) {
    const normalized = String(input || "")
      .trim()
      .toLowerCase();
    if (!normalized) {
      return false;
    }
    if (normalized.includes("an error occurred while processing your request")) {
      return true;
    }
    if (normalized.includes("the ai service is temporarily overloaded")) {
      return true;
    }
    if (normalized.includes("the ai service is temporarily unavailable")) {
      return true;
    }
    if (normalized.includes("gateway chat stream timed out before a final event arrived")) {
      return true;
    }
    if (normalized.includes("gateway timeout") || normalized.includes("bad gateway") || normalized.includes("upstream")) {
      return true;
    }
    return normalized.includes("help.openai.com") && normalized.includes("request id");
  }

  function isRecoverableCollaborationFailureResponse(response) {
    if (response?.incomplete || isInterruptedCollaborationAgentTurn(response)) {
      return true;
    }
    const normalized = [response?.failureReason, response?.errorMessage, response?.rawText, response?.replyText]
      .filter((value) => typeof value === "string" && value.trim() !== "")
      .join("\n")
      .trim()
      .toLowerCase();
    if (!normalized) {
      return false;
    }
    return isRetryableUpstreamProviderFailureText(normalized);
  }

  function summarizeCollaborationFailure(input) {
    const safeRawText = isLikelyCollaborationPromptEcho(input.rawText) ? "" : input.rawText;
    const combined = [input.failureReason, safeRawText]
      .filter((value) => typeof value === "string" && value.trim() !== "")
      .join("\n");
    const normalized = stripCollaborationMachinePrompt(combined);
    if (isRetryableUpstreamProviderFailureText(normalized)) {
      return pickUiText(
        input.language,
        "The upstream model service hit an internal error. You can retry this turn.",
        "The upstream model service hit an internal error. You can retry this turn.",
      );
    }
    if (/unknown option '--session-key'/i.test(normalized)) {
      return pickUiText(
        input.language,
        "Session resume failed because this OpenClaw CLI does not support --session-key.",
        "Session resume failed because this OpenClaw CLI does not support --session-key.",
      );
    }
    if (/spawn openclaw .*enoent/i.test(normalized)) {
      return pickUiText(
        input.language,
        "Agent dispatch failed because the OpenClaw CLI executable was not found.",
        "Agent dispatch failed because the OpenClaw CLI executable was not found.",
      );
    }
    if (/gateway not connected/i.test(normalized) && /(session file locked|resource busy|ebusy|locked)/i.test(normalized)) {
      return pickUiText(
        input.language,
        "The gateway was disconnected, and the embedded fallback then hit a locked session file.",
        "The gateway was disconnected, and the embedded fallback then hit a locked session file.",
      );
    }
    if (/gateway not connected/i.test(normalized)) {
      return pickUiText(
        input.language,
        "Agent dispatch failed because the gateway is not connected.",
        "Agent dispatch failed because the gateway is not connected.",
      );
    }
    if (/(session file locked|resource busy|ebusy|locked)/i.test(normalized)) {
      return pickUiText(
        input.language,
        "Agent dispatch failed because the session file is locked.",
        "Agent dispatch failed because the session file is locked.",
      );
    }
    if (/(request was aborted|\baborted\b)/i.test(normalized)) {
      return pickUiText(
        input.language,
        "The agent turn was interrupted before the final reply was delivered.",
        "The agent turn was interrupted before the final reply was delivered.",
      );
    }
    const signalLine = normalized
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .filter((line) => !/^command failed:/i.test(line))
      .filter((line) => !/^traceback/i.test(line))
      .filter((line) => !/^file \"/i.test(line))
      .filter((line) => !/^raise systemexit/i.test(line))
      .filter((line) => !/^at /i.test(line))
      .filter((line) => !/^user request:\s*$/i.test(line))
      .filter((line) => !/^current user message:\s*$/i.test(line))
      .filter((line) => !/^recent collaboration summary:\s*$/i.test(line))
      .filter((line) => !/^projectsummary:\s*$/i.test(line))
      .filter((line) => !/^contextrefs:\s*$/i.test(line))
      .find((line) => !isLikelyRelayPromptText(line));
    return summarizeCollaborationUiText(
      signalLine || normalized,
      pickUiText(input.language, "Unknown agent failure.", "Unknown agent failure."),
      260,
    ) || pickUiText(input.language, "Unknown agent failure.", "Unknown agent failure.");
  }

  function isInterruptedCollaborationAgentTurn(response) {
    const stopReason = String(response?.stopReason || "")
      .trim()
      .toLowerCase();
    const normalizedStopReason = stopReason.replace(/[^a-z]+/g, "");
    const errorMessage = String(response?.errorMessage || response?.failureReason || "")
      .trim()
      .toLowerCase();
    if (response?.incomplete) {
      return true;
    }
    if (looksLikeInterruptedCollaborationTransportFailure(errorMessage)) {
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
    return /request was aborted|turn was aborted|was aborted|cancelled|canceled/.test(errorMessage);
  }

  function looksLikeInterruptedCollaborationTransportFailure(errorMessage) {
    const normalized = String(errorMessage || "").trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return /stream[_\s-]*read[_\s-]*error/.test(normalized);
  }

  function buildInterruptedCollaborationResumePrompt(input) {
    const actor = resolveCollaborationParticipantName(input.directory, input.targetAgentId);
    return pickUiText(
      input.language,
      [
        "[[internal_wake_resume]]",
        `The previous turn for ${actor} was interrupted after tool activity.`,
        "Continue the same session without restarting the task or repeating finished work.",
        "Do not treat this as a new user request.",
        "If any files were already written, keep them and use those existing artifacts.",
        "Send the final user-facing reply now, and include the hidden file footer and <stage_result> block if they are required for this task.",
      ].join("\n"),
      [
        "[[internal_wake_resume]]",
        `${actor} just had this turn interrupted after tool activity.`,
        "Continue the same session without restarting the task or repeating finished work.",
        "If any files were already written, keep them and use those existing artifacts.",
        "Send the final user-facing reply now, and include the hidden file footer and <stage_result> block if they are required for this task.",
      ].join("\n"),
    );
  }

  function summarizeInterruptedCollaborationTurn(input) {
    return pickUiText(
      input.language,
      input.attemptedResume
        ? `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} finished tool work but the reply was still interrupted after an automatic resume attempt.`
        : `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} finished tool work but the reply was interrupted before delivery.`,
      input.attemptedResume
        ? `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} finished tool work but the reply was still interrupted after an automatic resume attempt.`
        : `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} finished tool work but the reply was interrupted before delivery.`,
    );
  }

  function describeCollaborationAgentTurnOutput(response, stageResultFallback, options) {
    const replyTextOverride = String(options?.replyTextOverride || "").trim();
    const fallbackReplyText = replyTextOverride || extractVisibleCollaborationTurnReplyText(response);
    const parsedArtifacts = import_collaboration_agent_artifacts.parseCollaborationAgentArtifacts(fallbackReplyText);
    const parsedStageResult = stageResultFallback
      ? import_collaboration_stage_results.parseStageResultEnvelopeFromReply(
          parsedArtifacts.cleanReplyText.trim() || fallbackReplyText,
          stageResultFallback,
        )
      : {
          cleanReplyText: parsedArtifacts.cleanReplyText.trim() || fallbackReplyText,
          envelope: void 0,
        };
    const rawJsonArtifactPaths = import_collaboration_agent_artifacts.extractCollaborationAgentArtifactPathsFromRawJson(
      response.rawJson,
    );
    const stageResultArtifactPaths = uniqueCompactStrings(
      (parsedStageResult.envelope?.artifacts || []).map((artifact) => artifact.location),
    );
    const stageResultCleanReplyText = parsedStageResult.cleanReplyText.trim();
    const artifactCleanReplyText =
      parsedStageResult.envelope && !stageResultCleanReplyText
        ? ""
        : parsedArtifacts.cleanReplyText.trim();
    const stageResultSummaryReplyText = summarizeCollaborationUiText(
      parsedStageResult.envelope?.summary,
      "",
      2e3,
    );
    const replyTextSource = stageResultCleanReplyText
      ? "stage_clean"
      : stageResultSummaryReplyText
        ? "stage_summary"
        : artifactCleanReplyText
          ? "artifact_clean"
          : fallbackReplyText
            ? "response_visible"
            : "empty";
    return {
      parsedArtifacts,
      parsedStageResult,
      rawJsonArtifactPaths,
      replyTextSource,
      replyText:
        stageResultCleanReplyText ||
        stageResultSummaryReplyText ||
        artifactCleanReplyText ||
        extractVisibleCollaborationTurnReplyText(response),
      rawPaths: uniqueCompactStrings([
        ...parsedArtifacts.declaredPaths,
        ...parsedArtifacts.hintedPaths,
        ...rawJsonArtifactPaths,
        ...stageResultArtifactPaths,
      ]),
    };
  }

  async function resolveCollaborationAgentTurnOutput(input) {
    const described = describeCollaborationAgentTurnOutput(input.response, input.stageResultFallback);
    const sessionKey = String(input.sessionKey || "").trim();
    if (!sessionKey || !input.toolClient?.sessionsHistory) {
      return described;
    }
    try {
      const history = await input.toolClient.sessionsHistory({
        sessionKey,
        limit: 40,
      });
      const recoveredReplyText = extractLatestAssistantReplyTextFromSessionHistory(history);
      if (recoveredReplyText) {
        const recovered = describeCollaborationAgentTurnOutput(input.response, input.stageResultFallback, {
          replyTextOverride: recoveredReplyText,
        });
        const shouldPreferRecoveredReply =
          Boolean(recovered.parsedStageResult?.envelope && !described.parsedStageResult?.envelope) ||
          shouldPreferRecoveredCollaborationReplyText(
            described.replyText,
            recovered.replyText,
            described.replyTextSource === "stage_summary",
          );
        return {
          ...(shouldPreferRecoveredReply ? recovered : described),
          parsedStageResult:
            recovered.parsedStageResult?.envelope ? recovered.parsedStageResult : described.parsedStageResult,
          rawPaths: uniqueCompactStrings([...(described.rawPaths || []), ...(recovered.rawPaths || [])]),
          replyText:
            shouldPreferRecoveredReply || !described.replyText
              ? recovered.replyText || described.replyText
              : described.replyText,
          replyTextSource: shouldPreferRecoveredReply ? "session_history" : described.replyTextSource,
        };
      }
    } catch {
      // Fall back to the direct response text when the targeted history read is unavailable.
    }
    return described;
  }

  function buildTaskTitleFromSourceEvent(sourceEvent, attachmentRecords, overrideText) {
    const text = String(overrideText || sourceEvent?.message || "").trim();
    if (text) {
      return safeTruncate(text.replace(/\s+/g, " "), 160);
    }
    if (attachmentRecords.length > 0) {
      return safeTruncate(
        attachmentRecords.map((attachment) => attachment.fileName).join(", "),
        160,
      );
    }
    return "Collaboration task";
  }

  async function ensureCollaborationRoomProjectContext(input) {
    const roomState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
    const projectStore = await import_project_store.loadProjectStore();
    let projectId = normalizeProjectIdCandidate(roomState.projectId);
    let project =
      (projectId ? projectStore.projects.find((item) => item.projectId === projectId) : void 0) ?? void 0;
    if (!project) {
      const fallbackTitle =
        String(roomState.title || "").trim() ||
        pickUiText(input.language, "Collaboration project", "鍗忎綔椤圭洰");
      const duplicateByTitle = projectStore.projects.find(
        (item) => normalizeLookupKey(item.title) === normalizeLookupKey(fallbackTitle),
      );
      if (duplicateByTitle) {
        project = duplicateByTitle;
      } else {
        projectId =
          projectId ||
          buildUniqueProjectId(
            fallbackTitle,
            projectStore.projects.map((item) => item.projectId),
          );
        project = (
          await import_project_store.createProject({
            projectId,
            title: fallbackTitle,
            status: "active",
            owner: input.directory.primaryAgentId,
          })
        ).project;
      }
      await import_collaboration_room.upsertCollaborationRoomMetadata(input.roomId, {
        projectId: project.projectId,
      });
      roomState.projectId = project.projectId;
    }

    const memory = await import_collaboration_project_memory.loadCollaborationProjectMemory({
      workspaceRoot: getOpenClawWorkspaceRoot(),
      projectId: project.projectId,
      projectTitle: project.title,
    });

    return {
      roomState,
      project,
      memory,
    };
  }

  function mutateCollaborationTaskStore(mutator) {
    const run = async () => {
      const store = await import_task_store.loadTaskStore();
      const result = await mutator(store);
      if (result?.changed) {
        await import_task_store.saveTaskStore(store);
      }
      return result?.value;
    };
    const next = collaborationTaskStoreWriteChain.then(run, run);
    collaborationTaskStoreWriteChain = next.then(
      () => void 0,
      () => void 0,
    );
    return next;
  }

  async function upsertCollaborationTaskRecord(input) {
    return mutateCollaborationTaskStore((store) => {
      const existing = store.tasks.find(
        (task) => task.projectId === input.projectId && task.taskId === input.taskId,
      );
      const now = new Date().toISOString();
      if (existing) {
        existing.title = input.title;
        existing.owner = input.owner;
        existing.status = input.status ?? existing.status;
        existing.definitionOfDone = [...input.definitionOfDone];
        existing.sessionKeys = uniqueCompactStrings([...(existing.sessionKeys || []), ...(input.sessionKeys || [])]);
        existing.updatedAt = now;
        store.updatedAt = now;
        return {
          changed: true,
          value: existing,
        };
      }

      store.tasks.push({
        projectId: input.projectId,
        taskId: input.taskId,
        title: input.title,
        status: input.status ?? "in_progress",
        owner: input.owner,
        dueAt: void 0,
        definitionOfDone: [...input.definitionOfDone],
        artifacts: [],
        rollback: {
          strategy: "manual-rollback",
          steps: [],
        },
        sessionKeys: uniqueCompactStrings(input.sessionKeys || []),
        budget: {
          warnRatio: 0.8,
        },
        updatedAt: now,
      });
      store.updatedAt = now;
      return {
        changed: true,
        value: store.tasks.at(-1),
      };
    });
  }

  async function updateCollaborationTaskStatusDirect(input) {
    return mutateCollaborationTaskStore((store) => {
      const existing = store.tasks.find(
        (task) => task.projectId === input.projectId && task.taskId === input.taskId,
      );
      if (!existing) {
        return {
          changed: false,
          value: void 0,
        };
      }
      const now = new Date().toISOString();
      existing.status = input.status;
      existing.updatedAt = now;
      store.updatedAt = now;
      return {
        changed: true,
        value: existing,
      };
    });
  }

  function uniqueCompactStrings(values) {
    const seen = new Set();
    const out = [];
    for (const value of values || []) {
      const trimmed = String(value || "").trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
    return out;
  }

  function getCollaborationAttachmentExtension(fileName) {
    const match = /\.([a-z0-9]{1,12})$/i.exec(String(fileName || "").trim());
    return match?.[1] ? String(match[1]).toLowerCase() : "";
  }

  function getCollaborationAttachmentPreviewMode(attachment) {
    const contentType = String(attachment?.contentType || "").toLowerCase();
    const extension = getCollaborationAttachmentExtension(attachment?.fileName);
    if (contentType.includes("html") || extension === "html" || extension === "htm") {
      return "html";
    }
    if (contentType.includes("markdown") || extension === "md" || extension === "markdown" || extension === "mdx") {
      return "markdown";
    }
    if (
      contentType.includes("json") ||
      [
        "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "rb", "go", "rs", "java", "kt", "swift",
        "php", "c", "cc", "cpp", "h", "hpp", "cs", "sh", "bash", "ps1", "sql", "css", "scss",
        "less", "xml", "yml", "yaml", "toml", "ini", "env", "gradle",
      ].includes(extension)
    ) {
      return "code";
    }
    return "text";
  }

  function normalizeCollaborationAttachmentPreviewText(value) {
    return String(value || "").replace(/\r/g, "").trim();
  }

  function stripHtmlPreviewText(value) {
    return String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractHtmlPreviewTitle(value) {
    const raw = String(value || "");
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw);
    if (titleMatch?.[1]) {
      return titleMatch[1].replace(/\s+/g, " ").trim();
    }
    const headingMatch = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(raw);
    if (headingMatch?.[1]) {
      return headingMatch[1].replace(/\s+/g, " ").trim();
    }
    return "";
  }

  function summarizeMarkdownPreviewText(value) {
    const lines = normalizeCollaborationAttachmentPreviewText(value)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const heading = lines.find((line) => /^#{1,6}\s+/.test(line))?.replace(/^#{1,6}\s+/, "").trim() || "";
    const summary = lines
      .filter((line) => !/^#{1,6}\s+/.test(line))
      .filter((line) => !/^```/.test(line))
      .filter((line) => !/^[-*_]{3,}$/.test(line))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      heading,
      summary,
    };
  }

  function indentCollaborationPromptBlock(text, prefix = "    ") {
    return String(text || "")
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");
  }

  function buildCollaborationAttachmentPromptLines(attachment) {
    const mode = getCollaborationAttachmentPreviewMode(attachment);
    const previewText = normalizeCollaborationAttachmentPreviewText(attachment.previewText);
    const header = `- ${attachment.fileName} | kind=${mode} | size=${formatBytesCompact(attachment.sizeBytes)} | type=${attachment.contentType} | path=${attachment.storedPath}`;
    if (!previewText) {
      return header;
    }
    if (mode === "html") {
      const title = extractHtmlPreviewTitle(previewText);
      const visibleText = stripHtmlPreviewText(previewText);
      return [
        header,
        title ? `  html_title=${safeTruncate(title, 140)}` : "",
        visibleText ? `  visible_text=${safeTruncate(visibleText, 480)}` : "",
        "  source_excerpt:",
        indentCollaborationPromptBlock(safeTruncate(previewText, 1400)),
      ].filter(Boolean).join("\n");
    }
    if (mode === "markdown") {
      const markdown = summarizeMarkdownPreviewText(previewText);
      return [
        header,
        markdown.heading ? `  heading=${safeTruncate(markdown.heading, 140)}` : "",
        markdown.summary ? `  summary=${safeTruncate(markdown.summary, 480)}` : "",
        "  markdown_excerpt:",
        indentCollaborationPromptBlock(safeTruncate(previewText, 1400)),
      ].filter(Boolean).join("\n");
    }
    if (mode === "code") {
      return [
        header,
        "  code_excerpt:",
        indentCollaborationPromptBlock(safeTruncate(previewText, 1400)),
      ].join("\n");
    }
    return [
      header,
      `  text_excerpt=${safeTruncate(previewText, 520)}`,
    ].join("\n");
  }

  function buildCollaborationVisibleReplyLanguageRequirement(language) {
    return pickUiText(
      language,
      "Write the visible user-facing reply in the same language as the user's latest message. Do not switch to another language just because tool output or system notes use it.",
      "Write the visible user-facing reply in the same language as the user's latest message. Do not switch to another language just because tool output or system notes use it.",
    );
  }

  function buildCollaborationShellRequirement(agentWorkspaceRoot, language) {
    if (!/^[a-z]:[\\/]/i.test(String(agentWorkspaceRoot || "").trim())) {
      return "";
    }
    return pickUiText(
      language,
      "This workspace uses Windows PowerShell. Use PowerShell syntax, call curl.exe instead of the PowerShell curl alias, and do not use bash-only operators like &&.",
      "This workspace uses Windows PowerShell. Use PowerShell syntax, call curl.exe instead of the PowerShell curl alias, and do not use bash-only operators like &&.",
    );
  }

  function extractProjectSummaryPreview(summaryText) {
    const normalized = String(summaryText || "").trim();
    if (!normalized) return "";
    const lines = normalized
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("#") && !/^project id:/i.test(line) && !/^last updated:/i.test(line));
    return safeTruncate(lines[0] || normalized, 220);
  }

  function buildCollaborationProjectScopeRequirementLines(projectFiles) {
    const projectRoot = String(projectFiles?.projectDir || "").trim();
    const projectArtifactsDir = String(projectFiles?.artifactsDir || "").trim();
    if (!projectRoot) {
      return [];
    }
    return [
      `- Treat ${projectRoot} as the current collaboration project root for this task.`,
      projectArtifactsDir
        ? `- Prefer saving new deliverables under ${projectArtifactsDir} unless the user explicitly asks for another path inside the same project root.`
        : "",
      "- Do not create or update deliverables outside this project root, and do not use the global workspace root as the output location.",
    ].filter(Boolean);
  }

  async function resolveAgentLongTermMemoryPaths(agentWorkspaceRoot) {
    const candidates = [
      join(agentWorkspaceRoot, "MEMORY.md"),
      join(agentWorkspaceRoot, "USER.md"),
      join(agentWorkspaceRoot, "SOUL.md"),
      join(agentWorkspaceRoot, "IDENTITY.md"),
    ];
    const paths = [];
    for (const candidate of candidates) {
      try {
        const file = await stat(candidate);
        if (file.isFile()) {
          paths.push(candidate);
        }
      } catch {}
    }
    return paths;
  }

  function buildDispatchRecord(input) {
    const taskId = buildDispatchTaskId(input.sourceEvent.eventId, input.targetAgentId);
    const requestText = resolveCollaborationDispatchRequestText({
      sourceEvent: input.sourceEvent,
      requestMessageOverride: input.requestMessageOverride,
      language: input.language,
    });
    const title = buildTaskTitleFromSourceEvent(
      input.sourceEvent,
      input.attachmentRecords,
      input.requestTitleOverride || requestText,
    );
    const expectedArtifacts = shouldHintCollaborationArtifactReply(
      requestText,
      input.attachmentRecords,
    )
      ? ["Provide a file path or attach the generated artifact when applicable."]
      : [];
    return {
      taskId,
      projectId: input.project.projectId,
      stage: "delivery",
      ownerAgentId: input.targetAgentId,
      title,
      goal: requestText || pickUiText(input.language, "Handle the attachment-only request.", "Handle the attachment-only request."),
      definitionOfDone: [
        pickUiText(input.language, "Provide a concrete user-facing update.", "Provide a concrete user-facing update."),
        pickUiText(
          input.language,
          "Emit a <stage_result> envelope when the phase reaches a reviewable checkpoint.",
          "Emit a <stage_result> envelope when the phase reaches a reviewable checkpoint.",
        ),
      ],
      requiredContextRefs: [
        input.projectMemory.files.projectSummaryPath,
        input.projectMemory.files.openTasksPath,
        input.projectMemory.files.decisionsPath,
      ],
      expectedArtifacts,
      createdAt: new Date().toISOString(),
      createdBy: "jarvis",
    };
  }

  async function syncProjectOpenTasksForRoom(projectId, projectTitle, roomState) {
    await import_collaboration_project_memory.syncCollaborationProjectOpenTasks({
      workspaceRoot: getOpenClawWorkspaceRoot(),
      projectId,
      projectTitle,
      receipts: roomState.taskReceipts,
      dispatchRecords: roomState.dispatchRecords,
    });
  }

  async function loadCollaborationProjectTitleById() {
    const projectStore = await import_project_store.loadProjectStore().catch(() => ({ projects: [] }));
    return new Map(
      (projectStore?.projects || []).map((project) => [project.projectId, project.title || project.projectId]),
    );
  }

  function normalizeManualOutcome(value) {
    if (value === "done" || value === "follow_up" || value === "error") {
      return value;
    }
    return "";
  }

  function manualOutcomeLabel(outcome, language) {
    switch (normalizeManualOutcome(outcome)) {
      case "done":
        return pickUiText(language, "Manually marked complete", "人工判定：已完成");
      case "follow_up":
        return pickUiText(language, "Manually marked for follow-up", "人工判定：待继续");
      case "error":
        return pickUiText(language, "Manually marked as error", "人工判定：报错");
      default:
        return "";
    }
  }

  function manualOutcomeTaskStatus(outcome) {
    switch (normalizeManualOutcome(outcome)) {
      case "done":
        return "done";
      case "error":
        return "blocked";
      case "follow_up":
      default:
        return "in_progress";
    }
  }

  function manualOutcomeNoteMessage(outcome, language) {
    switch (normalizeManualOutcome(outcome)) {
      case "done":
        return pickUiText(
          language,
          "The user manually marked this room as completed in the collaboration chat.",
          "用户在协作群聊中将该房间手动标记为已完成。",
        );
      case "follow_up":
        return pickUiText(
          language,
          "The user manually marked this room as needing follow-up in the collaboration chat.",
          "用户在协作群聊中将该房间手动标记为待继续。",
        );
      case "error":
        return pickUiText(
          language,
          "The user manually marked this room as errored in the collaboration chat.",
          "用户在协作群聊中将该房间手动标记为报错。",
        );
      default:
        return "";
    }
  }

  function roomActionableTaskReceipts(roomState, taskStore) {
    const tasksByKey = new Map(
      (taskStore?.tasks || []).map((task) => [`${task.projectId}::${task.taskId}`, task]),
    );
    const actionable = (roomState?.taskReceipts || []).filter((receipt) => {
      const key = `${receipt.projectId}::${receipt.taskId}`;
      const taskStatus = String(tasksByKey.get(key)?.status || "").trim();
      return (
        receipt.reviewState === "awaiting_review" ||
        receipt.waitingFor === "user_confirmation" ||
        receipt.lastResultState === "awaiting_review" ||
        receipt.lastResultState === "in_progress" ||
        taskStatus === "in_progress" ||
        taskStatus === "blocked" ||
        taskStatus === "todo"
      );
    });
    if (actionable.length > 0) {
      return actionable;
    }
    return (roomState?.taskReceipts || []).length > 0 ? [roomState.taskReceipts[0]] : [];
  }

  function collectCollaborationRoomEventReferenceKeys(roomState) {
    const keys = new Set();
    for (const event of roomState?.events || []) {
      const eventIdKey = normalizeLookupKey(event?.eventId || "");
      const sourceEventIdKey = normalizeLookupKey(event?.sourceEventId || "");
      if (eventIdKey) {
        keys.add(eventIdKey);
      }
      if (sourceEventIdKey) {
        keys.add(sourceEventIdKey);
      }
    }
    return keys;
  }

  async function acknowledgeLinkedActionQueueItemsForRoom(input) {
    if (
      typeof loadNotificationCenter !== "function" ||
      typeof acknowledgeActionQueueItem !== "function" ||
      typeof buildCollaborationBootstrapSourceKey !== "function"
    ) {
      return [];
    }
    const center = await loadNotificationCenter().catch(() => void 0);
    if (!center || !Array.isArray(center.queue) || center.queue.length === 0) {
      return [];
    }
    const roomEventKeys = collectCollaborationRoomEventReferenceKeys(input.roomState);
    if (roomEventKeys.size === 0) {
      return [];
    }
    const matchingItems = center.queue.filter((item) => {
      if (item?.acknowledged) {
        return false;
      }
      const bootstrapKey = normalizeLookupKey(
        buildCollaborationBootstrapSourceKey("action_queue", item.itemId),
      );
      return Boolean(bootstrapKey) && roomEventKeys.has(bootstrapKey);
    });
    if (matchingItems.length === 0) {
      return [];
    }
    const note = pickUiText(
      input.language,
      `${manualOutcomeLabel(input.outcome, input.language)} for room ${input.roomState.roomId}.`,
      `${manualOutcomeLabel(input.outcome, input.language)}：${input.roomState.roomId}`,
    );
    await Promise.allSettled(
      matchingItems.map((item) =>
        acknowledgeActionQueueItem(
          {
            itemId: item.itemId,
            note,
          },
          center,
        ),
      ),
    );
    return matchingItems.map((item) => item.itemId);
  }

  async function closePendingUserConfirmationTasksForRoom(input) {
    const roomState = await import_collaboration_room.loadCollaborationRoom(input.roomId).catch(() => void 0);
    const pendingReceipts = (roomState?.taskReceipts || []).filter(
      (receipt) =>
        receipt.reviewState === "awaiting_review" &&
        receipt.waitingFor === "user_confirmation",
    );
    if (pendingReceipts.length === 0) {
      return;
    }
    const projectStore = await import_project_store.loadProjectStore().catch(() => ({ projects: [] }));
    const projectTitleById = new Map(
      (projectStore?.projects || []).map((project) => [project.projectId, project.title || project.projectId]),
    );
    await Promise.allSettled(
      pendingReceipts.map(async (receipt) => {
        await updateCollaborationTaskStatusDirect({
          projectId: receipt.projectId,
          taskId: receipt.taskId,
          status: "done",
        }).catch(() => void 0);
        await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
          ...receipt,
          reviewState: "approved",
          waitingFor: void 0,
          lastReportedAt: input.continuedAt,
        });
      }),
    );
    const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
    const closedProjectIds = uniqueCompactStrings(pendingReceipts.map((receipt) => receipt.projectId));
    for (const projectId of closedProjectIds) {
      await syncProjectOpenTasksForRoom(
        projectId,
        projectTitleById.get(projectId) || projectId,
        nextState,
      );
    }
  }

  function isImplicitCollaborationDefinitionOfDoneItem(item) {
    const normalized = normalizeLookupKey(item || "");
    if (!normalized) {
      return false;
    }
    return (
      normalized.includes("user-facing update") ||
      normalized.includes("闈㈠悜鐢ㄦ埛") ||
      normalized.includes("stage_result") ||
      normalized.includes("stage_result")
    );
  }

  function shouldAutoPromoteCollaborationStageResult(input) {
    if (!input.envelope || input.envelope.resultState !== "in_progress") {
      return false;
    }
    if ((input.envelope.blockers ?? []).length > 0) {
      return false;
    }
    if (
      (input.replyAttachments?.length ?? 0) > 0 ||
      (input.envelope.artifacts?.length ?? 0) > 0
    ) {
      return true;
    }
    return (
      isVerificationOnlyCollaborationGoal(input.dispatchRecord?.goal || input.dispatchRecord?.title || "") &&
      !replyDelegatesFurtherCollaborationWork(input) &&
      !replyLooksLikeIncompleteCollaborationArtifactWork(input.replyText) &&
      replyLooksLikeCompletedCollaborationVerificationVerdict(input.replyText)
    );
  }

  function replyLooksLikeIncompleteCollaborationArtifactWork(replyText) {
    const normalized = String(stripCollaborationMachinePrompt(replyText || ""))
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!normalized) {
      return false;
    }
    return /(?:working on|in progress|not ready|draft|partial|unfinished|todo|pending|still working|continue working|need more work|needs more work|follow-up needed|blocker|blocked|failed|failure|unable|cannot|can't|missing|review first|verify first|进行中|未完成|草稿|部分完成|待继续|还在处理|仍在处理|还没好|未就绪|待办|阻塞|失败|无法|缺少|先评审|先验证)/i.test(
      normalized,
    );
  }

  function isVerificationOnlyCollaborationGoal(message) {
    const text = extractCollaborationArtifactHintText(message).toLowerCase();
    if (!text) {
      return false;
    }
    const normalizedText = text
      .replace(/\b(?:do not|don't|dont|no need to|need not)\b[^.!?\n]{0,160}/gi, " ")
      .replace(/\bwithout\b[^.!?\n]{0,80}/gi, " ");
    const hasReadOnlyIntent =
      /(?:\bverify\b|\breview\b|\binspect\b|\baudit\b|\bcheck\b|\bvalidate\b|\banaly[sz]e\b|\bassess\b|\bexamine\b|\bconfirm\b|\btest\b|\bpass\s*\/\s*fail\b|\bpass-or-fail\b|\bpass or fail\b|\bread-only\b|\breply with\b.*\bpass\b.*\bfail\b|\b(?:reply|respond)\b.*\bonly\b)/i.test(
        text,
      ) || /(?:验证|核对|检查|审核|评审|复查|确认|分析|只需回复|仅需回复|仅回复|只回复|通过\/不通过|通过或不通过|不要修改|无需修改|不用修改|只给结论|仅给结论|只看结论)/.test(text);
    const hasArtifactActionIntent =
      /(?:\bcreate\b|\bgenerate\b|\bbuild\b|\bmake\b|\bwrite\b|\bdraft\b|\bprepare\b|\bproduce\b|\bexport\b|\battach\b|\bupload\b|\bsend\b|\bshare\b|\bdeliver\b|\breturn\b|\bfix\b|\bupdate\b|\bedit\b|\bmodify\b|\brewrite\b|\brevise\b|\bpatch\b|\bimplement\b|\brender\b|\bsave\b.{0,20}\bas\b)/i.test(
        normalizedText,
      ) || /(?:创建|生成|构建|制作|做成|导出|附上|上传|发送|分享|交付|产出|写成|整理成|输出|修复|修改|更新|改写|重写|补齐|实现|保存成|保存为)/.test(normalizedText);
    return hasReadOnlyIntent && !hasArtifactActionIntent;
  }

  function replyLooksLikeCompletedCollaborationVerificationVerdict(replyText) {
    const normalized = String(stripCollaborationMachinePrompt(replyText || ""))
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!normalized) {
      return false;
    }
    return /(?:\bpass\b|\bfail\b|\bpassed\b|\bfailed\b|\breviewable\b|\bnot reviewable\b|\bverified\b|\bapproved\b|\blooks good\b|\bneeds changes\b|\bcaution\b|\bverdict\b)/i.test(
      normalized,
    );
  }

  function replyDelegatesFurtherCollaborationWork(input) {
    if (!input.directory?.entries || !input.replyText) {
      return false;
    }
    return import_collaboration_room
      .parseMentionedAgentIds(input.replyText, input.directory.entries)
      .some((agentId) => normalizeLookupKey(agentId) !== normalizeLookupKey(input.targetAgentId));
  }

  function buildSyntheticCollaborationArtifactStageResult(input) {
    if (input.envelope) {
      return void 0;
    }
    if ((input.dispatchRecord?.expectedArtifacts?.length ?? 0) === 0) {
      return void 0;
    }
    if (!(input.dispatchRecord?.definitionOfDone || []).every((item) => isImplicitCollaborationDefinitionOfDoneItem(item))) {
      return void 0;
    }
    if (replyDelegatesFurtherCollaborationWork(input)) {
      return void 0;
    }
    if (replyLooksLikeIncompleteCollaborationArtifactWork(input.replyText)) {
      return void 0;
    }
    const artifactLocations = uniqueCompactStrings(
      (input.replyAttachments || [])
        .map((attachment) => attachment.sourceLocalPath || attachment.localPath || attachment.storedPath)
        .filter(Boolean),
    );
    if (artifactLocations.length === 0) {
      return void 0;
    }
    const summary =
      summarizeCollaborationUiText(input.replyText, input.dispatchRecord.goal, 400) ||
      pickUiText(
        input.language,
        "Generated the requested artifact in the current collaboration project.",
        "Generated the requested artifact in the current collaboration project.",
      );
    return {
      taskId: input.dispatchRecord.taskId,
      projectId: input.project.projectId,
      agentId: input.targetAgentId,
      resultState: "awaiting_review",
      summary,
      artifacts: artifactLocations.map((location) => ({ location })),
      completionChecklist: [],
      blockers: [],
      nextSuggestion: "",
      reportedAt: input.reportedAt ?? new Date().toISOString(),
    };
  }

  async function reviewCollaborationStageResult(input) {
    const checklist = uniqueCompactStrings(input.envelope.completionChecklist || []);
    const missingDefinitionOfDone = (input.dispatchRecord.definitionOfDone || [])
      .filter((item) => !isImplicitCollaborationDefinitionOfDoneItem(item))
      .filter((item) => {
        const normalizedItem = normalizeLookupKey(item);
        return !checklist.some((entry) => normalizeLookupKey(entry).includes(normalizedItem));
      });
    const declaredArtifactPaths = uniqueCompactStrings(
      (input.envelope.artifacts || []).map((artifact) => artifact.location),
    );
    const replyArtifactPaths = uniqueCompactStrings(
      (input.replyAttachments || [])
        .map((attachment) => attachment.sourceLocalPath || attachment.localPath || attachment.storedPath)
        .filter(Boolean),
    );
    const resolvedArtifactPaths = resolveCollaborationArtifactPaths({
      rawPaths: [...declaredArtifactPaths, ...replyArtifactPaths],
      workspaceRoot: input.workspaceRoot,
      projectFiles: input.projectFiles,
    });
    const declaredResolvedArtifactPaths = resolveCollaborationArtifactPaths({
      rawPaths: declaredArtifactPaths,
      workspaceRoot: input.workspaceRoot,
      projectFiles: input.projectFiles,
    });
    const existingArtifactPaths = [];
    for (const artifactPath of resolvedArtifactPaths) {
      if (await isReadableCollaborationArtifactPath(artifactPath, input.workspaceRoot, input.projectFiles)) {
        existingArtifactPaths.push(artifactPath);
      }
    }
    const missingArtifacts =
      declaredResolvedArtifactPaths.length > 0
        ? declaredResolvedArtifactPaths.filter(
            (artifactPath) => !existingArtifactPaths.some((item) => item === artifactPath),
          )
        : input.dispatchRecord.expectedArtifacts.length > 0 && existingArtifactPaths.length === 0
          ? input.dispatchRecord.expectedArtifacts
          : [];
    return {
      approved: missingDefinitionOfDone.length === 0 && missingArtifacts.length === 0,
      missingDefinitionOfDone,
      missingArtifacts,
      existingArtifactPaths,
    };
  }

  async function persistCollaborationStageResult(input) {
    const summarizedReplyText =
      summarizeCollaborationUiText(input.replyText, input.dispatchRecord.goal, 260) ||
      summarizeCollaborationUiText(input.dispatchRecord.goal, "", 260);
    const baseReceipt = {
      taskId: input.dispatchRecord.taskId,
      projectId: input.project.projectId,
      lastReportedAt: input.reportedAt,
      lastReportedBy: input.targetAgentId,
      taskTitle: input.dispatchRecord.title,
      stage: input.dispatchRecord.stage,
      summary: summarizedReplyText,
      recentOutput: summarizedReplyText,
    };
    const synthesizedEnvelope = buildSyntheticCollaborationArtifactStageResult(input);
    const effectiveEnvelope =
      input.envelope && shouldAutoPromoteCollaborationStageResult(input)
        ? { ...input.envelope, resultState: "awaiting_review" }
        : input.envelope || synthesizedEnvelope;
    const summarizedEnvelopeText = effectiveEnvelope
      ? summarizeCollaborationUiText(effectiveEnvelope.summary, summarizedReplyText, 260) || summarizedReplyText
      : summarizedReplyText;
    const waitsForUserConfirmation = isJarvisWaitingForUserConfirmation({
      replyText: input.replyText,
      envelope: effectiveEnvelope,
      directory: input.directory,
      targetAgentId: input.targetAgentId,
      currentRouteAgentIds: input.currentRouteAgentIds,
      language: input.language,
    });

    if (!effectiveEnvelope && !waitsForUserConfirmation) {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        ...baseReceipt,
        lastResultState: "in_progress",
      });
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }

    if (waitsForUserConfirmation) {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        ...baseReceipt,
        reviewState: "awaiting_review",
        lastResultState: "awaiting_review",
        waitingFor: "user_confirmation",
        summary: summarizedEnvelopeText,
        recentOutput: summarizedEnvelopeText,
        blockers: effectiveEnvelope?.blockers,
      });
      await updateCollaborationTaskStatusDirect({
        projectId: input.project.projectId,
        taskId: input.dispatchRecord.taskId,
        status: "in_progress",
      });
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }

    if (effectiveEnvelope.resultState === "blocked") {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        ...baseReceipt,
        lastResultState: "blocked",
        summary: summarizedEnvelopeText,
        recentOutput: summarizedEnvelopeText,
        blockers: effectiveEnvelope.blockers,
      });
      await updateCollaborationTaskStatusDirect({
        projectId: input.project.projectId,
        taskId: input.dispatchRecord.taskId,
        status: "blocked",
      });
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "system_note",
          authorRole: "system",
          agentId: input.targetAgentId,
          sourceEventId: input.sourceEvent.eventId,
          message: effectiveEnvelope.blockers?.join("; ") || effectiveEnvelope.summary,
          detail: pickUiText(
            input.language,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} reported a blocker.`,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} reported a blocker.`,
          ),
        },
      ]);
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }

    if (effectiveEnvelope.resultState === "failed") {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        ...baseReceipt,
        lastResultState: "failed",
        summary: summarizedEnvelopeText,
        recentOutput: summarizedEnvelopeText,
        blockers: effectiveEnvelope.blockers,
      });
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "system_note",
          authorRole: "system",
          agentId: input.targetAgentId,
          sourceEventId: input.sourceEvent.eventId,
          message: effectiveEnvelope.summary,
          detail: pickUiText(
            input.language,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} marked the stage as failed.`,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} marked the stage as failed.`,
          ),
        },
      ]);
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }

    if (effectiveEnvelope.resultState === "in_progress") {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        ...baseReceipt,
        lastResultState: "in_progress",
        summary: summarizedEnvelopeText,
        recentOutput: summarizedEnvelopeText,
        blockers: effectiveEnvelope.blockers,
      });
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }

    await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
      ...baseReceipt,
      reviewState: "awaiting_review",
      lastResultState: "awaiting_review",
      waitingFor: "jarvis_review",
      summary: summarizedEnvelopeText,
      recentOutput: summarizedEnvelopeText,
      blockers: effectiveEnvelope.blockers,
    });
    const review = await reviewCollaborationStageResult({
      envelope: effectiveEnvelope,
      dispatchRecord: input.dispatchRecord,
      replyAttachments: input.replyAttachments,
      workspaceRoot: input.workspaceRoot,
      projectFiles: input.projectFiles,
    });
    if (review.approved) {
      await updateCollaborationTaskStatusDirect({
        projectId: input.project.projectId,
        taskId: input.dispatchRecord.taskId,
        status: "done",
      });
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        ...baseReceipt,
        reviewState: "approved",
        lastResultState: "awaiting_review",
        waitingFor: void 0,
        summary: summarizedEnvelopeText,
        recentOutput: summarizedEnvelopeText,
        blockers: effectiveEnvelope.blockers,
      });
      const artifacts = review.existingArtifactPaths.map((location) => ({ location }));
      await import_collaboration_project_memory.appendCollaborationProjectStageLog({
        workspaceRoot: getOpenClawWorkspaceRoot(),
        projectId: input.project.projectId,
        projectTitle: input.project.title,
        entry: {
          taskId: input.dispatchRecord.taskId,
          projectId: input.project.projectId,
          stage: input.dispatchRecord.stage,
          agentId: input.targetAgentId,
          summary: effectiveEnvelope.summary,
          resultState: effectiveEnvelope.resultState,
          reviewState: "approved",
          reportedAt: effectiveEnvelope.reportedAt,
          approvedAt: new Date().toISOString(),
          artifacts,
          blockers: effectiveEnvelope.blockers,
          completionChecklist: effectiveEnvelope.completionChecklist,
          nextSuggestion: effectiveEnvelope.nextSuggestion,
        },
      });
      await import_collaboration_project_memory.updateCollaborationProjectSummary({
        workspaceRoot: getOpenClawWorkspaceRoot(),
        projectId: input.project.projectId,
        projectTitle: input.project.title,
        summary: effectiveEnvelope.summary,
        stage: input.dispatchRecord.stage,
        taskTitle: input.dispatchRecord.title,
        ownerAgentId: input.targetAgentId,
        artifacts,
        nextSuggestion: effectiveEnvelope.nextSuggestion,
        updatedAt: new Date().toISOString(),
      });
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "system_note",
          authorRole: "system",
          agentId: input.directory.primaryAgentId,
          sourceEventId: input.sourceEvent.eventId,
          message: effectiveEnvelope.summary,
          detail: pickUiText(
            input.language,
            `Jarvis approved ${input.dispatchRecord.title}.`,
            `Jarvis approved ${input.dispatchRecord.title}.`,
          ),
        },
      ]);
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }

    await updateCollaborationTaskStatusDirect({
      projectId: input.project.projectId,
      taskId: input.dispatchRecord.taskId,
      status: "in_progress",
    });
    await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
      ...baseReceipt,
      reviewState: "rejected",
      lastResultState: "awaiting_review",
      waitingFor: void 0,
      summary: summarizedEnvelopeText,
      recentOutput: summarizedEnvelopeText,
      blockers: [
        ...uniqueCompactStrings(effectiveEnvelope.blockers || []),
        ...uniqueCompactStrings(review.missingDefinitionOfDone || []),
        ...uniqueCompactStrings(review.missingArtifacts || []),
      ],
    });
    await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
      {
        eventId: randomUUID(),
        type: "system_note",
        authorRole: "system",
        agentId: input.directory.primaryAgentId,
        sourceEventId: input.sourceEvent.eventId,
        message: uniqueCompactStrings([
          ...(review.missingDefinitionOfDone || []),
          ...(review.missingArtifacts || []),
        ]).join("; "),
        detail: pickUiText(
          input.language,
          `Jarvis requested more work before approving ${input.dispatchRecord.title}.`,
          `Jarvis requested more work before approving ${input.dispatchRecord.title}.`,
        ),
      },
    ]);
    const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
    await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
  }

  async function persistSuccessfulCollaborationAgentOutput(input) {
    const replyAttachments = await collectCollaborationAgentReplyAttachments({
      roomId: input.roomId,
      workspaceRoot: input.workspaceRoot,
      projectFiles: input.projectFiles,
      targetAgentId: input.targetAgentId,
      rawPaths: input.rawPaths,
    });
    if (typeof input.cancelCheck === "function" && input.cancelCheck()) {
      return {
        cancelled: true,
        replyAttachments,
        replyEvent: void 0,
      };
    }
    const replyEvents =
      input.replyText || replyAttachments.length > 0
        ? await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
            {
              eventId: randomUUID(),
              type: "agent_reply",
              authorRole: "agent",
              agentId: input.targetAgentId,
              sourceEventId: input.sourceEvent.eventId,
              message: input.replyText || void 0,
              attachmentIds: replyAttachments.map((attachment) => attachment.attachmentId),
              relatedSessionId: input.sessionId,
              relatedSessionKey: input.sessionKey,
              detail: buildCollaborationAgentReplyDetail({
                language: input.language,
                directory: input.directory,
                agentId: input.targetAgentId,
                durationMs: input.durationMs,
                attachments: replyAttachments,
              }),
            },
          ])
        : [];
    const replyEvent = replyEvents.at(-1);
    if (typeof input.cancelCheck === "function" && input.cancelCheck()) {
      return {
        cancelled: true,
        replyAttachments,
        replyEvent,
      };
    }
    await persistCollaborationStageResult({
      roomId: input.roomId,
      sourceEvent: input.sourceEvent,
      targetAgentId: input.targetAgentId,
      directory: input.directory,
      language: input.language,
      project: input.project,
      dispatchRecord: input.dispatchRecord,
      envelope: input.envelope,
      replyAttachments,
      replyText: input.replyText,
      workspaceRoot: input.workspaceRoot,
      projectFiles: input.projectFiles,
      currentRouteAgentIds: input.currentRouteAgentIds,
      reportedAt: input.reportedAt ?? input.envelope?.reportedAt ?? new Date().toISOString(),
    });
    if (replyEvent) {
      await maybeDispatchCollaborationReplyMentions({
        roomId: input.roomId,
        sourceEvent: input.sourceEvent,
        replyEvent,
        replyText: input.replyText,
        attachmentRecords: input.attachmentRecords,
        replyAttachments,
        currentRouteAgentIds: input.currentRouteAgentIds,
        parentRequestText: input.requestMessageOverride || input.sourceEvent.message,
        toolClient: input.toolClient,
        directory: input.directory,
        language: input.language,
      });
      await maybeDispatchCollaborationCoordinatorReviewAfterWorkerReply({
        roomId: input.roomId,
        sourceEvent: input.sourceEvent,
        replyEvent,
        replyText: input.replyText,
        attachmentRecords: input.attachmentRecords,
        replyAttachments,
        currentRouteAgentIds: input.currentRouteAgentIds,
        requestMessageOverride: input.requestMessageOverride,
        toolClient: input.toolClient,
        directory: input.directory,
        language: input.language,
      });
    }
    return {
      cancelled: false,
      replyAttachments,
      replyEvent,
    };
  }

  async function finalizeRecoverableCollaborationFailureAsFailed(input) {
    const failureSummary = summarizeCollaborationFailure({
      language: input.language,
      failureReason: input.response.failureReason,
      rawText: input.response.rawText,
    });
    const failedReplyAttachments = await collectCollaborationAgentReplyAttachments({
      roomId: input.roomId,
      workspaceRoot: input.workspaceRoot,
      projectFiles: input.projectFiles,
      targetAgentId: input.targetAgentId,
      rawPaths: input.output.rawPaths,
    });
    await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
      taskId: input.dispatchRecord.taskId,
      projectId: input.project.projectId,
      lastResultState: "failed",
      lastReportedAt: new Date().toISOString(),
      lastReportedBy: input.targetAgentId,
      taskTitle: input.dispatchRecord.title,
      stage: input.dispatchRecord.stage,
      summary: failureSummary,
      recentOutput: failureSummary,
    });
    if (failedReplyAttachments.length > 0) {
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "system_note",
          authorRole: "system",
          agentId: input.targetAgentId,
          sourceEventId: input.sourceEvent.eventId,
          attachmentIds: failedReplyAttachments.map((attachment) => attachment.attachmentId),
          detail: pickUiText(
            input.language,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} generated file attachments before the reply ended unexpectedly.`,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} generated file attachments before the reply ended unexpectedly.`,
          ),
        },
      ]);
    }
    await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
      {
        eventId: randomUUID(),
        type: "dispatch_failed",
        authorRole: "system",
        agentId: input.targetAgentId,
        sourceEventId: input.sourceEvent.eventId,
        targetAgentIds: [input.targetAgentId],
        relatedSessionId: input.response.sessionId ?? input.binding?.sessionId,
        relatedSessionKey: input.response.sessionKey ?? input.binding?.sessionKey,
        failureReason: failureSummary,
        detail: pickUiText(
          input.language,
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed: ${failureSummary}`,
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed: ${failureSummary}`,
        ),
      },
    ]);
    const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
    await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
  }

  async function watchRecoverableCollaborationFailure(input) {
    const deadline = Date.now() + normalizedRecoverableFailureTiming.watchTimeoutMs;
    let resumeAttempts = 0;
    let latestInterruptedReply = "";
    while (Date.now() < deadline) {
      if (
        currentCollaborationRoomAbortGeneration(input.roomId) > Number(input.abortGeneration || 0)
      ) {
        return;
      }
      let history;
      try {
        history = await input.toolClient.sessionsHistory({
          sessionKey: input.sessionKey,
          limit: normalizedRecoverableFailureTiming.historyLimit,
        });
      } catch {
        history = void 0;
      }
      if (history) {
        const historyState = extractLatestAssistantReplyFromSessionHistory(history, input.startedAtMs);
        const latestReply = historyState.latestReply;
        if (latestReply?.replyText) {
          const recoveredOutput = describeCollaborationAgentTurnOutput(
            input.response,
            input.stageResultFallback,
            { replyTextOverride: latestReply.replyText },
          );
          if (!latestReply.incomplete) {
            await persistSuccessfulCollaborationAgentOutput({
              ...input,
              replyText: recoveredOutput.replyText,
              rawPaths: recoveredOutput.rawPaths,
              envelope: recoveredOutput.parsedStageResult?.envelope,
              durationMs: input.response.durationMs,
              sessionId: input.response.sessionId ?? input.binding?.sessionId,
              sessionKey: input.sessionKey,
            });
            return;
          }
          latestInterruptedReply = recoveredOutput.replyText || latestInterruptedReply;
          const idleMs = historyState.latestActivityMs > 0 ? Date.now() - historyState.latestActivityMs : 0;
          if (
            resumeAttempts < normalizedRecoverableFailureTiming.maxResumeAttempts &&
            idleMs >= normalizedRecoverableFailureTiming.idleBeforeResumeMs
          ) {
            resumeAttempts += 1;
            const resumedResponse = await input.toolClient.agentTurn({
              agentId: input.targetAgentId,
              sessionId: input.response.sessionId ?? input.binding?.sessionId,
              sessionKey: input.sessionKey,
              message: buildInterruptedCollaborationResumePrompt({
                language: input.language,
                directory: input.directory,
                targetAgentId: input.targetAgentId,
              }),
              timeoutSeconds: 60,
              preferGatewayStream: true,
            });
            const resumedOutput = await resolveCollaborationAgentTurnOutput({
              response: resumedResponse,
              stageResultFallback: input.stageResultFallback,
              toolClient: input.toolClient,
              sessionKey: resumedResponse.sessionKey ?? input.sessionKey,
            });
            if (resumedResponse.ok && !isInterruptedCollaborationAgentTurn(resumedResponse)) {
              if (resumedResponse.sessionId) {
                await import_collaboration_room.setCollaborationSessionBinding(
                  input.roomId,
                  input.targetAgentId,
                  resumedResponse.sessionId,
                  resumedResponse.sessionKey ?? input.sessionKey,
                );
              }
              await persistSuccessfulCollaborationAgentOutput({
                ...input,
                replyText: resumedOutput.replyText,
                rawPaths: resumedOutput.rawPaths,
                envelope: resumedOutput.parsedStageResult?.envelope,
                durationMs: (input.response.durationMs || 0) + (resumedResponse.durationMs || 0),
                sessionId: resumedResponse.sessionId ?? input.response.sessionId ?? input.binding?.sessionId,
                sessionKey: resumedResponse.sessionKey ?? input.sessionKey,
              });
              return;
            }
          }
        }
      }
      await sleep(normalizedRecoverableFailureTiming.pollIntervalMs);
    }
    if (latestInterruptedReply) {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        taskId: input.dispatchRecord.taskId,
        projectId: input.project.projectId,
        lastResultState: "in_progress",
        lastReportedAt: new Date().toISOString(),
        lastReportedBy: input.targetAgentId,
        taskTitle: input.dispatchRecord.title,
        stage: input.dispatchRecord.stage,
        summary:
          summarizeCollaborationUiText(latestInterruptedReply, input.dispatchRecord.goal, 260) ||
          summarizeCollaborationUiText(input.dispatchRecord.goal, "", 260),
        recentOutput:
          summarizeCollaborationUiText(latestInterruptedReply, input.dispatchRecord.goal, 260) ||
          summarizeCollaborationUiText(input.dispatchRecord.goal, "", 260),
      });
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }
    await finalizeRecoverableCollaborationFailureAsFailed(input);
  }

  async function dispatchCollaborationTurnToAgentV2(input) {
    const activeTurn = registerCollaborationActiveTurn({
      roomId: input.roomId,
      sourceEventId: input.sourceEvent?.eventId,
      agentId: input.targetAgentId,
    });
    const binding = resolveCollaborationAgentSessionBinding(
      input.roomId,
      input.targetAgentId,
      await import_collaboration_room.getCollaborationSessionBinding(
        input.roomId,
        input.targetAgentId,
      ),
    );
    const workspaceRoot = resolveCollaborationParticipantWorkspaceRoot(
      input.directory,
      input.targetAgentId,
    );
    const projectContext = await ensureCollaborationRoomProjectContext({
      roomId: input.roomId,
      directory: input.directory,
      language: input.language,
    });
    const liveDraftSessionKey =
      resolveCollaborationLiveDraftSessionKey(input.roomId, input.targetAgentId, binding);
    const clearLiveDraft = () =>
      import_collaboration_live_drafts.clearCollaborationLiveDraft({
        roomId: input.roomId,
        sourceEventId: input.sourceEvent.eventId,
        agentId: input.targetAgentId,
      });
    const handleLiveStreamEvent = (event) => {
      updateCollaborationActiveTurn(
        activeTurn,
        buildCollaborationActiveTurnStreamPatch(activeTurn, {
          sessionKey: event?.sessionKey || activeTurn.sessionKey || liveDraftSessionKey,
          runId: event?.runId,
          state: event?.state,
        }),
      );
      if (isCollaborationTurnCancelled(activeTurn)) {
        return;
      }
      const now = new Date().toISOString();
      const currentDraft = import_collaboration_live_drafts
        .listCollaborationLiveDrafts(input.roomId)
        .find(
          (draft) =>
            normalizeLookupKey(draft.sourceEventId) === normalizeLookupKey(input.sourceEvent.eventId) &&
            normalizeLookupKey(draft.agentId) === normalizeLookupKey(input.targetAgentId),
        );
      const visibleText = resolveCollaborationLiveDraftText({
        currentText: currentDraft?.text || "",
        event,
        language: input.language,
      });
      import_collaboration_live_drafts.upsertCollaborationLiveDraft({
        roomId: input.roomId,
        sourceEventId: input.sourceEvent.eventId,
        agentId: input.targetAgentId,
        agentDisplayName: resolveCollaborationParticipantName(input.directory, input.targetAgentId),
        runId: event?.runId || currentDraft?.runId,
        sessionKey: event?.sessionKey || currentDraft?.sessionKey || liveDraftSessionKey,
        createdAt: now,
        updatedAt: now,
        text: visibleText || currentDraft?.text || void 0,
        state: event?.state || currentDraft?.state || "delta",
        errorMessage: event?.errorMessage || void 0,
      });
    };
    try {
    const dispatchRecord = buildDispatchRecord({
      sourceEvent: input.sourceEvent,
      targetAgentId: input.targetAgentId,
      attachmentRecords: input.attachmentRecords,
      project: projectContext.project,
      projectMemory: projectContext.memory,
      language: input.language,
      requestMessageOverride: input.requestMessageOverride,
      requestTitleOverride: input.requestTitleOverride,
    });
    updateCollaborationActiveTurn(activeTurn, {
      projectId: projectContext.project.projectId,
      taskId: dispatchRecord.taskId,
      taskTitle: dispatchRecord.title,
      stage: dispatchRecord.stage,
      sessionKey: binding?.sessionKey || liveDraftSessionKey,
    });
    await upsertCollaborationTaskRecord({
      projectId: projectContext.project.projectId,
      taskId: dispatchRecord.taskId,
      title: dispatchRecord.title,
      owner: input.targetAgentId,
      status: "in_progress",
      definitionOfDone: dispatchRecord.definitionOfDone,
      sessionKeys: uniqueCompactStrings([binding?.sessionKey]),
    });
    await import_collaboration_room.upsertCollaborationDispatchRecord(input.roomId, dispatchRecord);
    await syncProjectOpenTasksForRoom(
      projectContext.project.projectId,
      projectContext.project.title,
      await import_collaboration_room.loadCollaborationRoom(input.roomId),
    );
    const nextPrompt = await buildCollaborationAgentPromptV2({
      roomId: input.roomId,
      sourceEvent: input.sourceEvent,
      targetAgentId: input.targetAgentId,
      targetAgentIds: input.targetAgentIds,
      attachmentRecords: input.attachmentRecords,
      directory: input.directory,
      language: input.language,
      agentWorkspaceRoot: workspaceRoot,
      project: projectContext.project,
      projectMemory: projectContext.memory,
      dispatchRecord,
      sessionBinding: binding?.sessionKey
        ? { sessionId: binding.sessionId, sessionKey: binding.sessionKey }
        : void 0,
      requestMessageOverride: input.requestMessageOverride,
    });
    if (isCollaborationTurnCancelled(activeTurn)) {
      return;
    }
    const nextResponse = await input.toolClient.agentTurn({
      agentId: input.targetAgentId,
      sessionId: binding?.sessionId,
      sessionKey: binding?.sessionKey,
      message: nextPrompt,
      timeoutSeconds: 90,
      preferGatewayStream: true,
      onStreamEvent: handleLiveStreamEvent,
      signal: activeTurn.abortController.signal,
    });
    updateCollaborationActiveTurn(
      activeTurn,
      buildCollaborationActiveTurnStreamPatch(activeTurn, {
        sessionKey: nextResponse.sessionKey ?? binding?.sessionKey ?? liveDraftSessionKey,
        runId: nextResponse.runId,
      }),
    );
    if (isCollaborationTurnCancelled(activeTurn)) {
      return;
    }
    if (nextResponse.sessionId) {
      updateCollaborationActiveTurn(activeTurn, {
        sessionKey: nextResponse.sessionKey ?? binding?.sessionKey ?? liveDraftSessionKey,
      });
      await import_collaboration_room.setCollaborationSessionBinding(
        input.roomId,
        input.targetAgentId,
        nextResponse.sessionId,
        nextResponse.sessionKey ?? binding?.sessionKey,
      );
      await upsertCollaborationTaskRecord({
        projectId: projectContext.project.projectId,
        taskId: dispatchRecord.taskId,
        title: dispatchRecord.title,
        owner: input.targetAgentId,
        status: "in_progress",
        definitionOfDone: dispatchRecord.definitionOfDone,
        sessionKeys: uniqueCompactStrings([binding?.sessionKey, nextResponse.sessionKey]),
      });
    }
    const stageResultFallback = {
      taskId: dispatchRecord.taskId,
      projectId: projectContext.project.projectId,
      agentId: input.targetAgentId,
      reportedAt: new Date().toISOString(),
    };
    if (isInterruptedCollaborationAgentTurn(nextResponse)) {
      const interruptedOutputs = [
        await resolveCollaborationAgentTurnOutput({
          response: nextResponse,
          stageResultFallback,
          toolClient: input.toolClient,
          sessionKey: nextResponse.sessionKey ?? binding?.sessionKey,
        }),
      ];
      let interruptedDurationMs = nextResponse.durationMs;
      let resumedResponse = nextResponse;
      if (nextResponse.sessionId || binding?.sessionId || nextResponse.sessionKey || binding?.sessionKey) {
        resumedResponse = await input.toolClient.agentTurn({
          agentId: input.targetAgentId,
          sessionId: nextResponse.sessionId ?? binding?.sessionId,
          sessionKey: nextResponse.sessionKey ?? binding?.sessionKey,
          message: buildInterruptedCollaborationResumePrompt({
            language: input.language,
            directory: input.directory,
            targetAgentId: input.targetAgentId,
          }),
          timeoutSeconds: 60,
          preferGatewayStream: true,
          onStreamEvent: handleLiveStreamEvent,
          signal: activeTurn.abortController.signal,
        });
        updateCollaborationActiveTurn(
          activeTurn,
          buildCollaborationActiveTurnStreamPatch(activeTurn, {
            sessionKey:
              resumedResponse.sessionKey ?? nextResponse.sessionKey ?? binding?.sessionKey ?? liveDraftSessionKey,
            runId: resumedResponse.runId ?? nextResponse.runId,
          }),
        );
        if (isCollaborationTurnCancelled(activeTurn)) {
          return;
        }
        interruptedDurationMs += resumedResponse.durationMs;
        interruptedOutputs.push(
          await resolveCollaborationAgentTurnOutput({
            response: resumedResponse,
            stageResultFallback,
            toolClient: input.toolClient,
            sessionKey: resumedResponse.sessionKey ?? nextResponse.sessionKey ?? binding?.sessionKey,
          }),
        );
        if (resumedResponse.sessionId) {
          updateCollaborationActiveTurn(activeTurn, {
            sessionKey:
              resumedResponse.sessionKey ?? nextResponse.sessionKey ?? binding?.sessionKey ?? liveDraftSessionKey,
          });
          await import_collaboration_room.setCollaborationSessionBinding(
            input.roomId,
            input.targetAgentId,
            resumedResponse.sessionId,
            resumedResponse.sessionKey ?? nextResponse.sessionKey ?? binding?.sessionKey,
          );
          await upsertCollaborationTaskRecord({
            projectId: projectContext.project.projectId,
            taskId: dispatchRecord.taskId,
            title: dispatchRecord.title,
            owner: input.targetAgentId,
            status: "in_progress",
            definitionOfDone: dispatchRecord.definitionOfDone,
            sessionKeys: uniqueCompactStrings([
              binding?.sessionKey,
              nextResponse.sessionKey,
              resumedResponse.sessionKey,
            ]),
          });
        }
      }
      const interruptedCurrentOutput = interruptedOutputs[interruptedOutputs.length - 1];
      const interruptedStageResult =
        [...interruptedOutputs]
          .reverse()
          .map((output) => output.parsedStageResult?.envelope)
          .find((envelope) => Boolean(envelope)) || void 0;
      const interruptedRawPaths = uniqueCompactStrings(interruptedOutputs.flatMap((output) => output.rawPaths || []));
      const interruptedReplyText =
        interruptedCurrentOutput.replyText ||
        [...interruptedOutputs]
          .reverse()
          .map((output) => output.replyText)
          .find((value) => typeof value === "string" && value.trim() !== "") ||
        safeTruncate(resumedResponse.rawText.trim(), 2e3);
      if (isCollaborationTurnCancelled(activeTurn)) {
        return;
      }
      if (resumedResponse.ok && !isInterruptedCollaborationAgentTurn(resumedResponse)) {
        const finalizedReplyText =
          interruptedCurrentOutput.replyText ||
          interruptedReplyText ||
          safeTruncate(resumedResponse.rawText.trim(), 2e3);
        await persistSuccessfulCollaborationAgentOutput({
          roomId: input.roomId,
          sourceEvent: input.sourceEvent,
          targetAgentId: input.targetAgentId,
          directory: input.directory,
          language: input.language,
          project: projectContext.project,
          dispatchRecord,
          workspaceRoot,
          projectFiles: projectContext.memory.files,
          currentRouteAgentIds: input.targetAgentIds,
          attachmentRecords: input.attachmentRecords,
          toolClient: input.toolClient,
          requestMessageOverride: input.requestMessageOverride,
          replyText: finalizedReplyText,
          rawPaths: interruptedRawPaths,
          envelope: interruptedStageResult,
          durationMs: interruptedDurationMs,
          sessionId: resumedResponse.sessionId ?? nextResponse.sessionId ?? binding?.sessionId,
          sessionKey: resumedResponse.sessionKey ?? nextResponse.sessionKey ?? binding?.sessionKey,
          reportedAt: interruptedStageResult?.reportedAt ?? new Date().toISOString(),
          cancelCheck: () => isCollaborationTurnCancelled(activeTurn),
        });
        return;
      }
      const interruptedReplyAttachments = await collectCollaborationAgentReplyAttachments({
        roomId: input.roomId,
        workspaceRoot,
        projectFiles: projectContext.memory.files,
        targetAgentId: input.targetAgentId,
        rawPaths: interruptedRawPaths,
      });
      const interruptedFailureSummary = summarizeInterruptedCollaborationTurn({
        language: input.language,
        directory: input.directory,
        targetAgentId: input.targetAgentId,
        attemptedResume: resumedResponse !== nextResponse,
      });
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        taskId: dispatchRecord.taskId,
        projectId: projectContext.project.projectId,
        lastResultState: "failed",
        lastReportedAt: new Date().toISOString(),
        lastReportedBy: input.targetAgentId,
        taskTitle: dispatchRecord.title,
        stage: dispatchRecord.stage,
        summary: interruptedFailureSummary,
        recentOutput:
          summarizeCollaborationUiText(interruptedReplyText, interruptedFailureSummary, 260) ||
          interruptedFailureSummary,
      });
      if (interruptedReplyAttachments.length > 0) {
        await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
          {
            eventId: randomUUID(),
            type: "system_note",
            authorRole: "system",
            agentId: input.targetAgentId,
            sourceEventId: input.sourceEvent.eventId,
            attachmentIds: interruptedReplyAttachments.map((attachment) => attachment.attachmentId),
            detail: pickUiText(
              input.language,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} generated file attachments before the reply ended unexpectedly.`,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} ????????????????`,
            ),
          },
        ]);
      }
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "dispatch_failed",
          authorRole: "system",
          agentId: input.targetAgentId,
          sourceEventId: input.sourceEvent.eventId,
          targetAgentIds: [input.targetAgentId],
          relatedSessionId: resumedResponse.sessionId ?? nextResponse.sessionId ?? binding?.sessionId,
          relatedSessionKey: resumedResponse.sessionKey ?? nextResponse.sessionKey ?? binding?.sessionKey,
          failureReason: interruptedFailureSummary,
          detail: pickUiText(
            input.language,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed: ${interruptedFailureSummary}`,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} ?????${interruptedFailureSummary}`,
          ),
        },
      ]);
      await syncProjectOpenTasksForRoom(
        projectContext.project.projectId,
        projectContext.project.title,
        await import_collaboration_room.loadCollaborationRoom(input.roomId),
      );
      return;
    }
    const nextResponseOutput = await resolveCollaborationAgentTurnOutput({
      response: nextResponse,
      stageResultFallback,
      toolClient: input.toolClient,
      sessionKey: nextResponse.sessionKey ?? binding?.sessionKey,
    });
    if (nextResponse.ok) {
      await persistSuccessfulCollaborationAgentOutput({
        roomId: input.roomId,
        sourceEvent: input.sourceEvent,
        targetAgentId: input.targetAgentId,
        directory: input.directory,
        language: input.language,
        project: projectContext.project,
        dispatchRecord,
        workspaceRoot,
        projectFiles: projectContext.memory.files,
        currentRouteAgentIds: input.targetAgentIds,
        attachmentRecords: input.attachmentRecords,
        toolClient: input.toolClient,
        requestMessageOverride: input.requestMessageOverride,
        replyText: nextResponseOutput.replyText,
        rawPaths: nextResponseOutput.rawPaths,
        envelope: nextResponseOutput.parsedStageResult.envelope,
        durationMs: nextResponse.durationMs,
        sessionId: nextResponse.sessionId ?? binding?.sessionId,
        sessionKey: nextResponse.sessionKey ?? binding?.sessionKey,
        reportedAt: nextResponseOutput.parsedStageResult.envelope?.reportedAt ?? new Date().toISOString(),
        cancelCheck: () => isCollaborationTurnCancelled(activeTurn),
      });
      return;
    }
    if (
      nextResponse.sessionKey &&
      input.toolClient?.sessionsHistory &&
      isRecoverableCollaborationFailureResponse(nextResponse)
    ) {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        taskId: dispatchRecord.taskId,
        projectId: projectContext.project.projectId,
        lastResultState: "in_progress",
        lastReportedAt: new Date().toISOString(),
        lastReportedBy: input.targetAgentId,
        taskTitle: dispatchRecord.title,
        stage: dispatchRecord.stage,
        summary:
          summarizeCollaborationUiText(nextResponseOutput.replyText, dispatchRecord.goal, 260) ||
          summarizeCollaborationUiText(dispatchRecord.goal, "", 260),
        recentOutput:
          summarizeCollaborationUiText(nextResponseOutput.replyText, dispatchRecord.goal, 260) ||
          summarizeCollaborationUiText(dispatchRecord.goal, "", 260),
      });
      await syncProjectOpenTasksForRoom(
        projectContext.project.projectId,
        projectContext.project.title,
        await import_collaboration_room.loadCollaborationRoom(input.roomId),
      );
      queueCollaborationRecoverableFailureJob(
        {
          roomId: input.roomId,
          sourceEventId: input.sourceEvent.eventId,
          agentId: input.targetAgentId,
        },
        async () => {
          await watchRecoverableCollaborationFailure({
            roomId: input.roomId,
            sourceEvent: input.sourceEvent,
            targetAgentId: input.targetAgentId,
            directory: input.directory,
            language: input.language,
            project: projectContext.project,
            dispatchRecord,
            workspaceRoot,
            projectFiles: projectContext.memory.files,
            currentRouteAgentIds: input.targetAgentIds,
            attachmentRecords: input.attachmentRecords,
            toolClient: input.toolClient,
            requestMessageOverride: input.requestMessageOverride,
            response: nextResponse,
            output: nextResponseOutput,
            binding,
            sessionKey: nextResponse.sessionKey ?? binding?.sessionKey,
            stageResultFallback,
            abortGeneration: activeTurn.abortGeneration,
            startedAtMs: Date.parse(activeTurn.startedAt || new Date().toISOString()),
          });
        },
      );
      return;
    }
    const nextFailedReplyAttachments = await collectCollaborationAgentReplyAttachments({
      roomId: input.roomId,
      workspaceRoot,
      projectFiles: projectContext.memory.files,
      targetAgentId: input.targetAgentId,
      rawPaths: nextResponseOutput.rawPaths,
    });
    if (isCollaborationTurnCancelled(activeTurn)) {
      return;
    }
    const nextFailureSummary = summarizeCollaborationFailure({
      language: input.language,
      failureReason: nextResponse.failureReason,
      rawText: nextResponse.rawText,
    });
    await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
      taskId: dispatchRecord.taskId,
      projectId: projectContext.project.projectId,
      lastResultState: "failed",
      lastReportedAt: new Date().toISOString(),
      lastReportedBy: input.targetAgentId,
      taskTitle: dispatchRecord.title,
      stage: dispatchRecord.stage,
      summary: nextFailureSummary,
      recentOutput: nextFailureSummary,
    });
    if (nextFailedReplyAttachments.length > 0) {
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "system_note",
          authorRole: "system",
          agentId: input.targetAgentId,
          sourceEventId: input.sourceEvent.eventId,
          attachmentIds: nextFailedReplyAttachments.map((attachment) => attachment.attachmentId),
          detail: pickUiText(
            input.language,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} generated file attachments before the reply ended unexpectedly.`,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} generated file attachments before the reply ended unexpectedly.`,
          ),
        },
      ]);
    }
    await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
      {
        eventId: randomUUID(),
        type: "dispatch_failed",
        authorRole: "system",
        agentId: input.targetAgentId,
        sourceEventId: input.sourceEvent.eventId,
        targetAgentIds: [input.targetAgentId],
        relatedSessionId: nextResponse.sessionId ?? binding?.sessionId,
        relatedSessionKey: nextResponse.sessionKey ?? binding?.sessionKey,
        failureReason: nextFailureSummary,
        detail: pickUiText(
          input.language,
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed: ${nextFailureSummary}`,
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 鍒嗗彂澶辫触锛?{nextFailureSummary}`,
        ),
      },
    ]);
    await syncProjectOpenTasksForRoom(
      projectContext.project.projectId,
      projectContext.project.title,
      await import_collaboration_room.loadCollaborationRoom(input.roomId),
    );
    const nextPrimaryKey = normalizeLookupKey(input.directory.primaryAgentId);
    if (normalizeLookupKey(input.targetAgentId) === nextPrimaryKey) {
      return;
    }
    const nextPrimaryAlreadyIncluded = input.targetAgentIds.some(
      (agentId) => normalizeLookupKey(agentId) === nextPrimaryKey,
    );
    await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
      {
        eventId: randomUUID(),
        type: "dispatch_fallback",
        authorRole: "system",
        agentId: input.targetAgentId,
        sourceEventId: input.sourceEvent.eventId,
        fallbackAgentId: input.directory.primaryAgentId,
        targetAgentIds: [input.directory.primaryAgentId],
        detail: nextPrimaryAlreadyIncluded
          ? pickUiText(
              input.language,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so ${input.directory.primaryDisplayName} stays on the route as the active fallback.`,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so ${input.directory.primaryDisplayName} stays on the route as the active fallback.`,
            )
          : pickUiText(
              input.language,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so the turn is being handed to ${input.directory.primaryDisplayName}.`,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so the turn is being handed to ${input.directory.primaryDisplayName}.`,
            ),
      },
    ]);
    if (nextPrimaryAlreadyIncluded) {
      return;
    }
    await dispatchCollaborationTurnToAgentV2({
      ...input,
      targetAgentId: input.directory.primaryAgentId,
      targetAgentIds: [...input.targetAgentIds, input.directory.primaryAgentId],
    });
    return;
    const failedRawJsonArtifactPaths =
      import_collaboration_agent_artifacts.extractCollaborationAgentArtifactPathsFromRawJson(
        response.rawJson,
      );
    const failedReplyAttachments = await collectCollaborationAgentReplyAttachments({
      roomId: input.roomId,
      workspaceRoot,
      projectFiles: projectContext.memory.files,
      targetAgentId: input.targetAgentId,
      rawPaths: [
        ...failedParsedArtifacts.declaredPaths,
        ...failedParsedArtifacts.hintedPaths,
        ...failedRawJsonArtifactPaths,
      ],
    });
    const failureSummary = summarizeCollaborationFailure({
      language: input.language,
      failureReason: response.failureReason,
      rawText: response.rawText,
    });
    if (failedReplyAttachments.length > 0) {
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "system_note",
          authorRole: "system",
          agentId: input.targetAgentId,
          sourceEventId: input.sourceEvent.eventId,
          attachmentIds: failedReplyAttachments.map((attachment) => attachment.attachmentId),
          detail: pickUiText(
            input.language,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} generated file attachments before the reply ended unexpectedly.`,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} generated file attachments before the reply ended unexpectedly.`,
          ),
        },
      ]);
    }
    await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
      {
        eventId: randomUUID(),
        type: "dispatch_failed",
        authorRole: "system",
        agentId: input.targetAgentId,
        sourceEventId: input.sourceEvent.eventId,
        targetAgentIds: [input.targetAgentId],
        relatedSessionId: response.sessionId ?? binding?.sessionId,
        relatedSessionKey: response.sessionKey ?? binding?.sessionKey,
        failureReason: failureSummary,
        detail: pickUiText(
          input.language,
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed: ${failureSummary}`,
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 鍒嗗彂澶辫触锛?{response.failureReason ?? "鏈煡閿欒"}`,
        ),
      },
    ]);
    const primaryKey = normalizeLookupKey(input.directory.primaryAgentId);
    if (normalizeLookupKey(input.targetAgentId) === primaryKey) {
      return;
    }
    const primaryAlreadyIncluded = input.targetAgentIds.some(
      (agentId) => normalizeLookupKey(agentId) === primaryKey,
    );
    await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
      {
        eventId: randomUUID(),
        type: "dispatch_fallback",
        authorRole: "system",
        agentId: input.targetAgentId,
        sourceEventId: input.sourceEvent.eventId,
        fallbackAgentId: input.directory.primaryAgentId,
        targetAgentIds: [input.directory.primaryAgentId],
        detail: primaryAlreadyIncluded
          ? pickUiText(
              input.language,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so ${input.directory.primaryDisplayName} stays on the route as the active fallback.`,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so ${input.directory.primaryDisplayName} stays on the route as the active fallback.`,
            )
          : pickUiText(
              input.language,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so the turn is being handed to ${input.directory.primaryDisplayName}.`,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so the turn is being handed to ${input.directory.primaryDisplayName}.`,
            ),
      },
    ]);
    if (primaryAlreadyIncluded) {
      return;
    }
    await dispatchCollaborationTurnToAgentV2({
      ...input,
      targetAgentId: input.directory.primaryAgentId,
      targetAgentIds: [...input.targetAgentIds, input.directory.primaryAgentId],
    });
    } finally {
      releaseCollaborationActiveTurn(activeTurn);
      clearLiveDraft();
    }
  }

  async function buildCollaborationAgentPromptV2(input) {
    const directUserMessage = resolveCollaborationDispatchRequestText({
      sourceEvent: input.sourceEvent,
      requestMessageOverride: input.requestMessageOverride,
      language: input.language,
    });
    const longTermMemoryPaths = await resolveAgentLongTermMemoryPaths(input.agentWorkspaceRoot);
    const roomState =
      input.roomStateOverride ||
      await import_collaboration_room.loadCollaborationRoom(input.roomId);
    const attachmentsById = new Map((roomState.attachments || []).map((item) => [item.attachmentId, item]));
    const recentCollaborationSummaryLines = buildRecentCollaborationSummaryLines({
      roomState,
      sourceEvent: input.sourceEvent,
      language: input.language,
      directory: input.directory,
      attachmentsById,
    });
    const projectRoot = String(input.projectMemory?.files?.projectDir || "").trim();
    const projectArtifactsDir = String(input.projectMemory?.files?.artifactsDir || "").trim();
    const summaryPreview = extractProjectSummaryPreview(input.projectMemory.summaryText);
    const teammateHandleLines =
      input.directory &&
      normalizeLookupKey(input.targetAgentId) === normalizeLookupKey(input.directory.primaryAgentId)
        ? input.directory.entries
            .filter((entry) => normalizeLookupKey(entry.agentId) !== normalizeLookupKey(input.targetAgentId))
            .map((entry) => {
              const handleCandidate =
                uniqueCompactStrings([
                  ...(Array.isArray(entry.aliases) ? entry.aliases : []),
                  entry.agentId,
                ])
                  .map((value) => normalizeLookupKey(value))
                  .find(Boolean) || normalizeLookupKey(entry.agentId);
              return handleCandidate ? `- @${handleCandidate} => ${entry.displayName}` : "";
            })
            .filter(Boolean)
        : [];
    const coordinationLines = [
      "<openclaw_coordination>",
      `roomId: ${input.roomId}`,
      `projectId: ${input.project.projectId}`,
      `projectTitle: ${input.project.title}`,
      ...(projectRoot ? [`projectRoot: ${projectRoot}`] : []),
      ...(projectArtifactsDir ? [`projectArtifactsDir: ${projectArtifactsDir}`] : []),
      `taskId: ${input.dispatchRecord.taskId}`,
      `stage: ${input.dispatchRecord.stage}`,
      `ownerAgentId: ${input.targetAgentId}`,
      `createdBy: jarvis`,
      input.sessionBinding?.sessionKey
        ? `sessionBinding: ${input.sessionBinding.sessionKey}${input.sessionBinding.sessionId ? ` sessionId=${input.sessionBinding.sessionId}` : ""}`
        : "sessionBinding: none",
      summaryPreview ? `projectSummary: ${summaryPreview}` : "projectSummary: none",
      ...(teammateHandleLines.length > 0 ? ["teamHandles:", ...teammateHandleLines] : []),
      "recentCollaborationSummary:",
      ...(recentCollaborationSummaryLines.length > 0 ? recentCollaborationSummaryLines : ["- none"]),
      "contextRefs:",
      ...uniqueCompactStrings([
        input.projectMemory.files.projectSummaryPath,
        input.projectMemory.files.openTasksPath,
        input.projectMemory.files.decisionsPath,
        input.projectMemory.files.stageLogPath,
        ...longTermMemoryPaths,
        ...input.dispatchRecord.requiredContextRefs,
      ]).map((item) => `- ${item}`),
      "definitionOfDone:",
      ...(input.dispatchRecord.definitionOfDone || []).map((item) => `- ${item}`),
      "expectedArtifacts:",
      ...((input.dispatchRecord.expectedArtifacts || []).length > 0
        ? input.dispatchRecord.expectedArtifacts.map((item) => `- ${item}`)
        : ["- none"]),
      "attachments:",
      ...(input.attachmentRecords.length > 0
        ? input.attachmentRecords.map((attachment) => buildCollaborationAttachmentPromptLines(attachment))
        : ["- none"]),
      "requirements:",
      ...buildCollaborationProjectScopeRequirementLines(input.projectMemory?.files),
      "- Read only the listed files that are relevant to this task.",
      "- For HTML, Markdown, JSON, code, and other text attachments, treat the inline excerpt above as file-content context before you fall back to opening the local path.",
      "- If the user attached a file asking for analysis, fixes, or optimization, operate on the attachment content instead of replying with only the file path.",
      ...(
        input.directory &&
        normalizeLookupKey(input.targetAgentId) === normalizeLookupKey(input.directory.primaryAgentId) &&
        (input.targetAgentIds?.length ?? 0) > 1
          ? [
              "- Even as the primary coordinator, you are directly assigned on this user turn. Send your own visible user-facing reply in addition to any coordination or review notes.",
            ]
          : []
      ),
      "- Do not repeat or expose this coordination block in the visible reply.",
      "- If you create a file, write it to disk before mentioning it.",
      `- ${buildCollaborationVisibleReplyLanguageRequirement(input.language)}`,
      ...(
        buildCollaborationShellRequirement(input.agentWorkspaceRoot, input.language)
          ? [`- ${buildCollaborationShellRequirement(input.agentWorkspaceRoot, input.language)}`]
          : []
      ),
      "artifactReplyContract:",
      ...import_collaboration_agent_artifacts
        .buildCollaborationAgentArtifactInstruction(projectRoot || input.agentWorkspaceRoot, projectArtifactsDir)
        .split("\n"),
      "- When the stage reaches a reviewable checkpoint, append exactly one <stage_result>...</stage_result> block.",
      ...(
        input.directory &&
        normalizeLookupKey(input.targetAgentId) === normalizeLookupKey(input.directory.primaryAgentId)
          ? [
              "- If you need another employee to act, explicitly mention them in your visible reply with their room handle such as @qa or @architect. Those visible @mentions are what queue follow-up work.",
              "- Do not claim another employee has confirmed, completed, or replied unless that employee has already replied in this room and you can see that result in the current room timeline or recent collaboration summary.",
              '- If you need the user\'s confirmation, decision, or option selection before continuing, use resultState="awaiting_review" for that checkpoint and wait for the user\'s next room message before continuing.',
            ]
          : []
      ),
      `- Use this JSON template inside the stage_result block: ${import_collaboration_stage_results.buildStageResultEnvelopeTemplate({
        taskId: input.dispatchRecord.taskId,
        projectId: input.project.projectId,
        agentId: input.targetAgentId,
      }).replace(/\s+/g, " ")}`,
      "</openclaw_coordination>",
    ];
    return [coordinationLines.join("\n"), "", "User request:", directUserMessage].join("\n");
  }

  function resolveCollaborationParticipantWorkspaceRoot(directory, agentId) {
    const normalized = normalizeLookupKey(agentId);
    const entry = directory.entries.find((item) => normalizeLookupKey(item.agentId) === normalized);
    if (entry?.workspaceRoot?.trim()) {
      return entry.workspaceRoot;
    }
    if (normalized === "main") {
      return getOpenClawWorkspaceRoot();
    }
    return join(getOpenClawWorkspaceRoot(), "agents", agentId);
  }

  function buildCollaborationPromptContextLines(input) {
    if (input.hasBoundSession) {
      return [];
    }
    const priorUserMessages = input.roomState.events
      .filter((event) => event.sequence < input.sourceEvent.sequence && event.type === "user_message")
      .slice(-2);
    const latestReplyFromTarget = input.roomState.events
      .filter(
        (event) =>
          event.sequence < input.sourceEvent.sequence &&
          event.type === "agent_reply" &&
          normalizeLookupKey(event.agentId ?? "") === normalizeLookupKey(input.targetAgentId),
      )
      .slice(-1);
    return [...priorUserMessages, ...latestReplyFromTarget]
      .sort((a, b) => a.sequence - b.sequence)
      .map((event) => {
        const described = describeCollaborationRoomEvent(
          event,
          input.language,
          input.directory,
          input.attachmentsById,
        );
        const detail = safeTruncate(event.message?.trim() || described.detail || "", 200);
        return `- [${event.sequence}] ${described.label}: ${detail}`;
      });
  }

  function extractCollaborationArtifactHintText(message) {
    const text = String(message || "").trim();
    if (!text) {
      return "";
    }
    const markers = [
      /coordination instruction:\s*/gi,
      /\u534f\u8c03\u6307\u4ee4[:\uff1a]\s*/g,
      /assigned follow-up for you:\s*/gi,
      /\u5206\u914d\u7ed9\u4f60\u7684\u540e\u7eed\u52a8\u4f5c[:\uff1a]\s*/g,
    ];
    let instructionStart = -1;
    for (const pattern of markers) {
      for (const match of text.matchAll(pattern)) {
        const start = (match.index ?? -1) + match[0].length;
        if (start > instructionStart) {
          instructionStart = start;
        }
      }
    }
    return instructionStart >= 0 ? text.slice(instructionStart).trim() : text;
  }

  function shouldHintCollaborationArtifactReply(message, attachments) {
    const text = extractCollaborationArtifactHintText(message).toLowerCase();
    if (!text) {
      return false;
    }
    const normalizedText = text
      .replace(
        /\b(?:do not|don't|dont|no need to|need not)\b[^.!?\n]{0,160}/gi,
        " ",
      )
      .replace(
        /\bwithout\b[^.!?\n]{0,80}/gi,
        " ",
      )
      .replace(
        /(?:不需要|无需|不用|不要)[^。！？\n]{0,80}/g,
        " ",
      );
    const hasReadOnlyIntent =
      /(?:\bverify\b|\breview\b|\binspect\b|\baudit\b|\bcheck\b|\bvalidate\b|\banaly[sz]e\b|\bassess\b|\bexamine\b|\bconfirm\b|\btest\b|\bpass\s*\/\s*fail\b|\bpass-or-fail\b|\bpass or fail\b|\bread-only\b|\breply with\b.*\bpass\b.*\bfail\b|\b(?:reply|respond)\b.*\bonly\b)/i.test(
        text,
      ) ||
      /(?:验证|核对|检查|审核|评审|复查|确认|分析|只需回复|仅需回复|仅回复|只回复|通过\/不通过|通过或不通过|不要修改|无需修改|不用修改|只给结论|仅给结论|只看结论)/.test(
        text,
      );
    const hasArtifactActionIntent =
      /(?:\bcreate\b|\bgenerate\b|\bbuild\b|\bmake\b|\bwrite\b|\bdraft\b|\bprepare\b|\bproduce\b|\bexport\b|\battach\b|\bupload\b|\bsend\b|\bshare\b|\bdeliver\b|\breturn\b|\bfix\b|\bupdate\b|\bedit\b|\bmodify\b|\brewrite\b|\brevise\b|\bpatch\b|\bimplement\b|\brender\b|\bsave\b.{0,20}\bas\b)/i.test(
        normalizedText,
      ) ||
      /(?:创建|生成|构建|制作|做成|导出|发送|附上|上传|交付|产出|写成|整理成|输出|修复|修改|更新|改写|重写|补齐|实现|保存成|保存为)/.test(
        normalizedText,
      );
    const hasArtifactTarget =
      /(?:\bhtml\b|\bpdf\b|\bdocx?\b|\bmarkdown\b|\bmd\b|\bjson\b|\bcsv\b|\btxt\b|\breport\b|\bfile\b|\bartifact\b|\battachment\b|\bpage\b|\bwebpage\b|\bwebsite\b|\bdocument\b)/i.test(
        text,
      ) || /(?:文件|文档|附件|报告|产物|页面|网页|站点)/.test(text);
    if (hasReadOnlyIntent && !hasArtifactActionIntent) {
      return false;
    }
    if (hasArtifactActionIntent && (hasArtifactTarget || attachments.length > 0)) {
      return true;
    }
    if (hasReadOnlyIntent) {
      return false;
    }
    return hasArtifactActionIntent;
  }

  async function collectCollaborationAgentReplyAttachments(input) {
    const candidatePaths = resolveCollaborationArtifactPaths({
      rawPaths: input.rawPaths,
      workspaceRoot: input.workspaceRoot,
      projectFiles: input.projectFiles,
    });
    const attachments = [];
    for (const path of candidatePaths) {
      if (!(await isReadableCollaborationArtifactPath(path, input.workspaceRoot, input.projectFiles))) {
        continue;
      }
      attachments.push(
        await import_collaboration_room.createCollaborationAttachmentFromFile({
          roomId: input.roomId,
          sourcePath: path,
          uploadedBy: "agent",
        }),
      );
    }
    return attachments;
  }

  function resolveCollaborationArtifactPaths(input) {
    const allowedRoots = resolveCollaborationArtifactAllowedRoots(input);
    const attemptRoots = resolveCollaborationArtifactAttemptRoots(input);
    const out = [];
    const seen = new Set();
    for (const rawPath of input.rawPaths) {
      const trimmed = String(rawPath || "").trim();
      if (!trimmed) {
        continue;
      }
      const normalized = trimmed.replace(/^workspace[\\/]/i, "");
      const attempts = new Set();
      if (isAbsoluteLikePath(normalized)) {
        attempts.add(resolve(normalized));
      } else {
        for (const root of attemptRoots) {
          attempts.add(resolve(root, normalized));
        }
      }
      for (const absolutePath of attempts) {
        if (!isPathInsideAnyRoot(absolutePath, allowedRoots)) {
          continue;
        }
        if (!isSupportedCollaborationArtifactPath(absolutePath)) {
          continue;
        }
        const key = absolutePath.toLowerCase();
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        out.push(absolutePath);
      }
    }
    return out.slice(0, import_collaboration_room.COLLABORATION_ATTACHMENTS_PER_MESSAGE_MAX);
  }

  function resolveCollaborationArtifactAllowedRoots(input) {
    const projectRoots = uniqueCompactStrings([
      input.projectFiles?.projectDir,
      input.projectFiles?.artifactsDir,
    ]).map((item) => resolve(item));
    if (projectRoots.length > 0) {
      return projectRoots;
    }
    return uniqueCompactStrings([input.workspaceRoot, getOpenClawWorkspaceRoot()]).map((item) => resolve(item));
  }

  function resolveCollaborationArtifactAttemptRoots(input) {
    const preferredProjectRoots = uniqueCompactStrings([
      input.projectFiles?.artifactsDir,
      input.projectFiles?.projectDir,
    ]);
    if (preferredProjectRoots.length > 0) {
      return uniqueCompactStrings([
        ...preferredProjectRoots,
        input.workspaceRoot,
        getOpenClawWorkspaceRoot(),
      ]).map((item) => resolve(item));
    }
    return uniqueCompactStrings([input.workspaceRoot, getOpenClawWorkspaceRoot()]).map((item) => resolve(item));
  }

  async function isReadableCollaborationArtifactPath(path, workspaceRoot, projectFiles) {
    if (!isPathInsideAnyRoot(path, resolveCollaborationArtifactAllowedRoots({ workspaceRoot, projectFiles }))) {
      return false;
    }
    if (!isSupportedCollaborationArtifactPath(path)) {
      return false;
    }
    try {
      const file = await stat(path);
      return (
        file.isFile() &&
        file.size > 0 &&
        file.size <= import_collaboration_room.COLLABORATION_ATTACHMENT_MAX_BYTES
      );
    } catch {
      return false;
    }
  }

  function isSupportedCollaborationArtifactPath(path) {
    return [
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
      ".ppt",
      ".pptx",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
    ].includes(extname(path).toLowerCase());
  }

  function isPathInsideAnyRoot(path, roots) {
    return roots.some((root) => isPathInsideRoot(path, root));
  }

  function isPathInsideRoot(path, root) {
    const relativePath = relative(root, path);
    return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.includes(":"));
  }

  function isAbsoluteLikePath(path) {
    return /^[A-Za-z]:[\\/]/.test(path) || path.startsWith("\\\\") || path.startsWith("/");
  }

  function buildCollaborationAgentReplyDetail(input) {
    const actor = resolveCollaborationParticipantName(input.directory, input.agentId);
    const durationLabel = formatCollaborationDuration(input.durationMs);
    if (input.attachments.length === 0) {
      return pickUiText(
        input.language,
        `${actor} replied in ${durationLabel}.`,
        `${actor} replied in ${durationLabel}.`,
      );
    }
    const fileNames = input.attachments.slice(0, 3).map((attachment) => attachment.fileName).join(", ");
    return pickUiText(
      input.language,
      `${actor} replied in ${durationLabel} and attached ${input.attachments.length} file(s): ${fileNames}.`,
      `${actor} replied in ${durationLabel} and attached ${input.attachments.length} file(s): ${fileNames}.`,
    );
  }

  function buildCollaborationRoomApiEvent(event, directory, attachmentsById, language, roomId) {
    const described = describeCollaborationRoomEvent(event, language, directory, attachmentsById);
    const visibleMessage = sanitizeVisibleCollaborationText(event.message, language, "", 12000) || void 0;
    const attachments =
      event.attachmentIds
        ?.map((attachmentId) => attachmentsById.get(attachmentId))
        .filter((attachment) => Boolean(attachment))
        .map((attachment) => toCollaborationApiAttachment(attachment, roomId)) ?? [];
    const targetAgentIds = event.targetAgentIds ?? [];
    return {
      sequence: event.sequence,
      eventId: event.eventId,
      type: event.type,
      createdAt: event.createdAt,
      authorRole: event.authorRole,
      agentId: event.agentId,
      agentDisplayName: event.agentId ? resolveCollaborationParticipantName(directory, event.agentId) : void 0,
      label: described.label,
      message: visibleMessage,
      messageHtml: visibleMessage ? import_chat_markdown.renderChatMarkdownToHtml(visibleMessage) : void 0,
      detail: described.detail,
      detailHtml: described.detail ? import_chat_markdown.renderChatMarkdownToHtml(described.detail) : void 0,
      failureReason: event.failureReason,
      sourceEventId: event.sourceEventId,
      targetAgentIds,
      targetDisplayNames: targetAgentIds.map((agentId) =>
        resolveCollaborationParticipantName(directory, agentId),
      ),
      fallbackAgentId: event.fallbackAgentId,
      fallbackDisplayName: event.fallbackAgentId
        ? resolveCollaborationParticipantName(directory, event.fallbackAgentId)
        : void 0,
      attachmentIds: event.attachmentIds ?? [],
      attachments,
      relatedSessionId: event.relatedSessionId,
      relatedSessionKey: event.relatedSessionKey,
      relatedSessionHref: event.relatedSessionKey
        ? buildSessionDetailHref(event.relatedSessionKey, language)
        : void 0,
    };
  }

  function findUnknownCollaborationMentions(message, directory) {
    if (!message.trim()) {
      return [];
    }
    const knownAliases = new Set(
      directory.entries
        .flatMap((entry) =>
          entry.aliases.map((alias) => import_collaboration_room.normalizeMentionAlias(alias)),
        )
        .filter(Boolean),
    );
    const unknown = new Set();
    for (const token of extractCollaborationMentionTokens(message)) {
      const normalized = import_collaboration_room.normalizeMentionAlias(token);
      if (!normalized || knownAliases.has(normalized)) {
        continue;
      }
      unknown.add(`@${token}`);
    }
    return [...unknown];
  }

  function extractCollaborationMentionTokens(message) {
    const matches = message.matchAll(/@([^\s@]+)/gu);
    const tokens = [];
    for (const match of matches) {
      const token = (match[1] ?? "").trim();
      if (token) {
        tokens.push(token);
      }
    }
    return tokens;
  }

  return {
    buildCollaborationAgentPrompt,
    buildCollaborationAgentPromptV2,
    buildCollaborationBackgroundSessionKey,
    resolveCollaborationLiveDraftSessionKey,
    buildCollaborationAgentReplyDetail,
    describeCollaborationAgentTurnOutput,
    resolveCollaborationAgentTurnOutput,
    extractVisibleCollaborationTurnReplyText,
    buildCollaborationPromptContextLines,
    buildRecentCollaborationSummaryLines,
    buildCollaborationRoomApiEvent,
    collectCollaborationAgentReplyAttachments,
    createCollaborationRoomMessage,
    adjudicateCollaborationRoomOutcome,
    terminateCollaborationRoomWork,
    dispatchCollaborationRoomMessage,
    dispatchCollaborationTurnToAgent,
    dispatchCollaborationTurnToAgentV2,
    buildSyntheticCollaborationArtifactStageResult,
    isAbsoluteLikePath,
    isInterruptedCollaborationAgentTurn,
    isPathInsideAnyRoot,
    isPathInsideRoot,
    isReadableCollaborationArtifactPath,
    isSupportedCollaborationArtifactPath,
    buildInterruptedCollaborationResumePrompt,
    resolveCollaborationArtifactPaths,
    resolveCollaborationAgentSessionBinding,
    resolveCollaborationParticipantWorkspaceRoot,
    extractCollaborationTargetedInstructionLines,
    resolveCollaborationReplyMentionDispatchPlans,
    resolveCollaborationLiveDraftText,
    shouldAutoPromoteCollaborationStageResult,
    isJarvisWaitingForUserConfirmation,
    summarizeCollaborationFailure,
    summarizeCollaborationUiText,
    shouldHintCollaborationArtifactReply,
  };
}

export { createCollaborationChatHelpers };
