// @ts-nocheck

const import_current_agent_catalog = require("../runtime/current-agent-catalog");
const import_collaboration_project_memory = require("../runtime/collaboration-project-memory");
const import_collaboration_room = require("../runtime/collaboration-room");
const import_openclaw_chat_rooms = require("../runtime/openclaw-chat-rooms");
const import_operator_display = require("../runtime/operator-display");
const import_project_store = require("../runtime/project-store");
const import_task_store = require("../runtime/task-store");
const import_team_hierarchy = require("../runtime/team-hierarchy");
const import_chat_markdown = require("../runtime/chat-markdown");

function createCollaborationRoomHelpers(deps) {
  const {
    buildCollaborationRoomApiEvent,
    buildSessionDetailHref,
    createRequestValidationError,
    deriveAgentAnimalIdentity,
    getOpenClawHomeDir,
    getSearchLimitMax,
    getOpenClawWorkspaceRoot,
    humanizeOperatorLabel,
    loadCachedStaffRecentActivity,
    normalizeAgentIdCandidate,
    normalizeSessionHistoryMessages,
    normalizeLookupKey,
    pickLatestSessionActivityTimestamp,
    pickUiText,
    resolveConfiguredWorkspaceRoot,
    resolveStaffStatusDotTone,
    safeTruncate,
    staffCurrentWorkLabel,
    staffStatusDotLabel,
    toSortableMs,
  } = deps;

  async function loadCollaborationParticipantDirectory() {
    const catalog = await import_current_agent_catalog.loadCurrentAgentCatalog();
    const seededEntries =
      catalog.entries.length > 0
        ? catalog.entries
        : [{ agentId: catalog.primaryAgentId?.trim() || "jarvis", displayName: catalog.primaryDisplayName?.trim() || "Jarvis" }];
    const primaryKey =
      normalizeAgentIdCandidate(catalog.primaryAgentId) ??
      normalizeAgentIdCandidate(seededEntries[0]?.agentId) ??
      "jarvis";
    const merged = new Map();

    for (const entry of seededEntries) {
      const agentId = entry.agentId.trim();
      if (!agentId) {
        continue;
      }
      const key = normalizeLookupKey(agentId);
      if (merged.has(key)) {
        continue;
      }
      const displayName =
        import_operator_display.humanizeOperatorDisplayName(entry.displayName?.trim() || agentId) ??
        humanizeOperatorLabel(agentId);
      merged.set(key, {
        agentId,
        displayName,
        aliases: import_collaboration_room.buildMentionAliases(agentId, displayName),
        primary: key === primaryKey,
        identity: deriveAgentAnimalIdentity(agentId),
        workspaceRoot:
          key === "main"
            ? getOpenClawWorkspaceRoot()
            : resolveConfiguredWorkspaceRoot(entry.workspace?.trim(), agentId),
      });
    }

    if (!merged.has(primaryKey)) {
      const fallbackAgentId = catalog.primaryAgentId?.trim() || primaryKey;
      const fallbackDisplayName =
        import_operator_display.humanizeOperatorDisplayName(catalog.primaryDisplayName?.trim() || fallbackAgentId) ??
        humanizeOperatorLabel(fallbackAgentId);
      merged.set(primaryKey, {
        agentId: fallbackAgentId,
        displayName: fallbackDisplayName,
        aliases: import_collaboration_room.buildMentionAliases(fallbackAgentId, fallbackDisplayName),
        primary: true,
        identity: deriveAgentAnimalIdentity(fallbackAgentId),
        workspaceRoot:
          normalizeLookupKey(fallbackAgentId) === "main"
            ? getOpenClawWorkspaceRoot()
            : resolveConfiguredWorkspaceRoot(void 0, fallbackAgentId),
      });
    }

    const entries = [...merged.values()]
      .map((entry) => ({ ...entry, primary: normalizeLookupKey(entry.agentId) === primaryKey }))
      .sort((a, b) => import_team_hierarchy.compareAgentHierarchy(a.agentId, b.agentId));
    const primaryEntry = entries.find((entry) => entry.primary) ?? entries[0];
    return {
      primaryAgentId: primaryEntry?.agentId ?? "jarvis",
      primaryDisplayName: primaryEntry?.displayName ?? "Jarvis",
      entries,
    };
  }

  async function buildCollaborationChatParticipantViews(input) {
    const officeCardByKey = new Map(input.officeCards.map((item) => [normalizeLookupKey(item.agentId), item]));
    const executionByKey = new Map(
      input.executionAgentSummaries.map((item) => [normalizeLookupKey(item.agentId), item]),
    );
    const recentActivityByKey = await loadCachedStaffRecentActivity(
      input.snapshot,
      input.client,
      input.directory.entries.map((entry) => entry.agentId),
      input.language,
    );
    return input.directory.entries.map((entry) => {
      const key = normalizeLookupKey(entry.agentId);
      const office = officeCardByKey.get(key);
      const execution = executionByKey.get(key);
      const recentActivity = recentActivityByKey.get(key);
      const effectiveOfficeStatus = recentActivity?.statusOverride ?? office?.status;
      const currentWork = staffCurrentWorkLabel({
        office: office ? { ...office, status: effectiveOfficeStatus ?? office.status } : office,
        execution,
        language: input.language,
      });
      const statusTone = resolveStaffStatusDotTone(effectiveOfficeStatus);
      return {
        agentId: entry.agentId,
        displayName: entry.displayName,
        aliases: entry.aliases,
        mention: import_collaboration_room.preferredMentionAlias(entry.agentId, entry.displayName, entry.aliases),
        primary: entry.primary,
        identity: entry.identity,
        statusTone,
        statusDotLabel: staffStatusDotLabel(statusTone, input.language),
        currentWorkLabel: currentWork.label,
        currentWork: sanitizeCollaborationDisplayText(currentWork.value, input.language, "", 180),
        recentOutput: sanitizeCollaborationDisplayText(
          recentActivity?.recentOutput,
          input.language,
          pickUiText(input.language, "No recent output yet.", "最近暂无产出。"),
          220,
        ),
      };
    });
  }

  async function normalizeCollaborationRoomIdQuery(roomId, directory) {
    const normalized = import_openclaw_chat_rooms.normalizeTranscriptRoomId(roomId ?? void 0);
    if (normalized) {
      return normalized;
    }
    const resolvedDirectory = directory ?? (await loadCollaborationParticipantDirectory());
    return (
      (await import_openclaw_chat_rooms.loadActiveOpenClawChatRoomId({
        agentId: resolvedDirectory.primaryAgentId,
        workspaceRoot: getOpenClawWorkspaceRoot(),
        openclawHomeDir: getOpenClawHomeDir(),
      })) ?? import_collaboration_room.DEFAULT_COLLABORATION_ROOM_ID
    );
  }

  async function normalizeCollaborationRoomIdPayload(roomId, directory) {
    if (typeof roomId === "string") {
      const normalized = import_openclaw_chat_rooms.normalizeTranscriptRoomId(roomId);
      if (normalized) {
        return normalized;
      }
    } else if (roomId !== void 0 && roomId !== null) {
      throw createRequestValidationError("roomId must be a string when provided.", 400);
    }
    return normalizeCollaborationRoomIdQuery(null, directory);
  }

  function sanitizeCollaborationDisplayText(value, language, fallback = "", maxLength = 240) {
    const normalized = String(value || "").replace(/\r/g, "").trim();
    const fallbackText = String(fallback || "").trim();
    if (!normalized) {
      return fallbackText ? safeTruncate(fallbackText, maxLength) : "";
    }
    let text = normalized.replace(/<openclaw_coordination>[\s\S]*?<\/openclaw_coordination>/gi, " ").trim();
    if (isCollaborationRelayPromptMessage(text)) {
      const currentUserMessageMatch = /Current user message:\s*([\s\S]*?)(?:Attachments:|Reply to the user as this agent\.?|$)/i.exec(text);
      if (currentUserMessageMatch?.[1]?.trim()) {
        text = currentUserMessageMatch[1].trim();
      }
      const userRequestMatch = /User request:\s*([\s\S]*)$/i.exec(text);
      if (userRequestMatch?.[1]?.trim()) {
        text = userRequestMatch[1].trim();
      }
    }
    if (/unknown option '--session-key'/i.test(text)) {
      return pickUiText(
        language,
        "Session resume failed because this OpenClaw CLI does not support --session-key.",
        "会话续接失败：当前 OpenClaw CLI 不支持 --session-key。",
      );
    }
    if (/spawn openclaw .*enoent/i.test(text)) {
      return pickUiText(
        language,
        "Agent dispatch failed because the OpenClaw CLI executable was not found.",
        "分发失败：没有找到 OpenClaw CLI 可执行文件。",
      );
    }
    const compact = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .filter((line) => !/^command failed:/i.test(line))
      .filter((line) => !/^traceback/i.test(line))
      .filter((line) => !/^file \"/i.test(line))
      .filter((line) => !/^raise systemexit/i.test(line))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const resolved = compact || fallbackText;
    return resolved ? safeTruncate(resolved, maxLength) : "";
  }

  async function listCollaborationTranscriptRooms(directory) {
    const [openclawRooms, localRooms] = await Promise.all([
      import_openclaw_chat_rooms.listOpenClawChatRooms({
        agentId: directory.primaryAgentId,
        workspaceRoot: getOpenClawWorkspaceRoot(),
        openclawHomeDir: getOpenClawHomeDir(),
      }),
      import_collaboration_room.loadAllCollaborationRooms().catch(() => []),
    ]);
    const localById = new Map(localRooms.map((room) => [room.roomId, room]));
    return openclawRooms.map((room) => {
      const local = localById.get(room.roomId);
      const titleMode = local?.titleMode === "manual" ? "manual" : "auto";
      return {
        roomId: room.roomId,
        title:
          titleMode === "manual"
            ? local?.title || room.title || import_collaboration_room.DEFAULT_COLLABORATION_ROOM_TITLE
            : room.title || local?.title || import_collaboration_room.DEFAULT_COLLABORATION_ROOM_TITLE,
        titleMode,
        projectId: local?.projectId,
        createdAt: room.createdAt,
        updatedAt: pickLatestSessionActivityTimestamp(room.updatedAt, local?.updatedAt) ?? room.updatedAt,
        lastSequence: local?.lastSequence ?? 0,
        eventCount: local?.events.length ?? 0,
        active: room.active,
      };
    });
  }

  function normalizeProjectIdCandidate(value) {
    const trimmed = String(value || "").trim();
    return /^[A-Za-z0-9._:-]{1,100}$/.test(trimmed) ? trimmed : "";
  }

  function slugifyProjectId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._:-]+/g, "-")
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

  function resolveDisplayedRoomTitle(localRoom, transcriptRoom) {
    if (localRoom?.titleMode === "manual") {
      return localRoom.title || transcriptRoom?.title || import_collaboration_room.DEFAULT_COLLABORATION_ROOM_TITLE;
    }
    return transcriptRoom?.title || localRoom?.title || import_collaboration_room.DEFAULT_COLLABORATION_ROOM_TITLE;
  }

  function extractProjectSummaryExcerpt(summaryText, language) {
    const normalized = String(summaryText || "").trim();
    if (!normalized) {
      return pickUiText(language, "No approved stage summary yet.", "暂无已审核通过的阶段总结。");
    }
    const lines = normalized
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("#") && !/^project id:/i.test(line) && !/^last updated:/i.test(line));
    return safeTruncate(lines[0] || normalized, 200);
  }

  async function ensureCollaborationRoomProjectBinding(input) {
    const existingProjectId = normalizeProjectIdCandidate(input.state.projectId);
    const projectStore = await import_project_store.loadProjectStore();
    const displayedRoomTitle = resolveDisplayedRoomTitle(input.state, input.selectedRoom);
    let project =
      (existingProjectId
        ? projectStore.projects.find((item) => item.projectId === existingProjectId)
        : void 0) ?? void 0;

    if (!project) {
      const desiredTitle =
        displayedRoomTitle && displayedRoomTitle !== import_collaboration_room.DEFAULT_COLLABORATION_ROOM_TITLE
          ? displayedRoomTitle
          : `Project ${String(input.state.roomId || "").slice(0, 8) || "room"}`;
      const desiredProjectId =
        existingProjectId ||
        buildUniqueProjectId(
          desiredTitle,
          projectStore.projects.map((item) => item.projectId),
        );
      const duplicateByTitle = projectStore.projects.find(
        (item) => normalizeLookupKey(item.title) === normalizeLookupKey(desiredTitle),
      );
      if (duplicateByTitle) {
        project = duplicateByTitle;
      } else {
        project = (
          await import_project_store.createProject({
            projectId: desiredProjectId,
            title: desiredTitle,
            status: "active",
            owner: input.directory.primaryAgentId,
          })
        ).project;
      }
      await import_collaboration_room.upsertCollaborationRoomMetadata(input.state.roomId, {
        projectId: project.projectId,
      });
      input.state.projectId = project.projectId;
    }

    const memory = await import_collaboration_project_memory.loadCollaborationProjectMemory({
      workspaceRoot: getOpenClawWorkspaceRoot(),
      projectId: project.projectId,
      projectTitle: project.title,
    });
    await import_collaboration_project_memory.syncCollaborationProjectOpenTasks({
      workspaceRoot: getOpenClawWorkspaceRoot(),
      projectId: project.projectId,
      projectTitle: project.title,
      receipts: input.state.taskReceipts,
      dispatchRecords: input.state.dispatchRecords,
    });
    return {
      project,
      memory,
    };
  }

  function deriveCollaborationExecutionState(input) {
    const latestActivityAt =
      input.receipt?.lastReportedAt || input.dispatch?.createdAt || input.task?.updatedAt || "";
    const latestActivityMs = toSortableMs(latestActivityAt);
    const stale = latestActivityMs > 0 && Date.now() - latestActivityMs > 20 * 60 * 1000;
    if (input.receipt?.reviewState === "awaiting_review") return "awaiting_review";
    if (input.receipt?.reviewState === "approved" || input.task?.status === "done") return "done";
    if (input.receipt?.lastResultState === "failed") return "failed";
    if (input.receipt?.lastResultState === "blocked" || input.task?.status === "blocked") return "blocked";
    if (stale && (input.dispatch || input.task?.status === "in_progress" || input.receipt?.lastResultState === "in_progress")) {
      return "stale";
    }
    if (input.dispatch || input.task?.status === "in_progress" || input.receipt?.lastResultState === "in_progress") {
      return "in_progress";
    }
    return "idle";
  }

  function collaborationExecutionTone(state) {
    if (state === "blocked" || state === "failed" || state === "stale") return "issue";
    if (state === "in_progress" || state === "awaiting_review") return "working";
    return "idle";
  }

  function collaborationExecutionLabel(state, language) {
    switch (state) {
      case "in_progress":
        return pickUiText(language, "Executing", "执行中");
      case "awaiting_review":
        return pickUiText(language, "Waiting for Jarvis review", "等待 Jarvis 审核");
      case "blocked":
        return pickUiText(language, "Blocked", "阻塞");
      case "failed":
        return pickUiText(language, "Failed", "失败");
      case "done":
        return pickUiText(language, "Completed", "已完成");
      case "stale":
        return pickUiText(language, "Stale", "长时间无心跳");
      default:
        return pickUiText(language, "Standby", "待命");
    }
  }

  function mergeParticipantsWithCollaborationState(input) {
    const taskById = new Map(
      input.tasks
        .filter((task) => task.projectId === input.project.projectId)
        .map((task) => [task.taskId, task]),
    );
    return input.participants.map((participant) => {
      const participantKey = normalizeLookupKey(participant.agentId);
      const dispatch = input.state.dispatchRecords.find(
        (item) =>
          item.projectId === input.project.projectId &&
          normalizeLookupKey(item.ownerAgentId) === participantKey,
      );
      const receipt = input.state.taskReceipts.find(
        (item) =>
          item.projectId === input.project.projectId &&
          normalizeLookupKey(item.lastReportedBy) === participantKey,
      );
      const task =
        (dispatch ? taskById.get(dispatch.taskId) : void 0) ||
        (receipt ? taskById.get(receipt.taskId) : void 0) ||
        input.tasks.find(
          (item) =>
            item.projectId === input.project.projectId &&
            normalizeLookupKey(item.owner) === participantKey,
        );
      const executionState = deriveCollaborationExecutionState({ dispatch, receipt, task });
      const statusTone = collaborationExecutionTone(executionState);
      return {
        ...participant,
        statusTone,
        statusDotLabel: collaborationExecutionLabel(executionState, input.language),
        executionState,
        executionStateLabel: collaborationExecutionLabel(executionState, input.language),
        currentProjectTitle: input.project.title,
        currentStage: receipt?.stage || dispatch?.stage || pickUiText(input.language, "None", "无"),
        currentTaskId: dispatch?.taskId || receipt?.taskId || task?.taskId,
        currentTaskTitle: sanitizeCollaborationDisplayText(
          dispatch?.title || receipt?.taskTitle || task?.title || participant.currentWork,
          input.language,
          participant.currentWork,
          180,
        ),
        lastHeartbeatAt: receipt?.lastReportedAt || dispatch?.createdAt || task?.updatedAt,
        currentWorkLabel: pickUiText(input.language, "Current task", "当前任务"),
        currentWork:
          dispatch?.title ||
          receipt?.taskTitle ||
          task?.title ||
          participant.currentWork ||
          pickUiText(input.language, "No live task right now.", "当前无实时任务。"),
        recentOutput:
          receipt?.recentOutput ||
          receipt?.summary ||
          participant.recentOutput ||
          pickUiText(input.language, "No recent output yet.", "最近暂无产出。"),
      };
    });
  }

  function toCollaborationApiAttachment(
    attachment,
    roomId = import_collaboration_room.DEFAULT_COLLABORATION_ROOM_ID,
  ) {
    const encodedId = encodeURIComponent(attachment.attachmentId);
    const roomQuery = `roomId=${encodeURIComponent(roomId)}`;
    return {
      attachmentId: attachment.attachmentId,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      sizeBytes: attachment.sizeBytes,
      kind: attachment.kind,
      uploadedAt: attachment.uploadedAt,
      uploadedBy: attachment.uploadedBy,
      referencedAt: attachment.referencedAt,
      previewText: attachment.previewText,
      localPath: attachment.storedPath,
      sourceLocalPath: attachment.sourceLocalPath,
      contentHref: `/api/collaboration/room/attachments/${encodedId}/content?${roomQuery}`,
      downloadHref: `/api/collaboration/room/attachments/${encodedId}/content?download=1&${roomQuery}`,
    };
  }

  function normalizeCollaborationEventSyncText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isCollaborationRelayPromptMessage(value) {
    const normalized = normalizeCollaborationEventSyncText(value);
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

  function buildCollaborationEventSyncSignature(event) {
    const message = normalizeCollaborationEventSyncText(event.message);
    const detail = normalizeCollaborationEventSyncText(event.detail);
    const actorKey = normalizeLookupKey(event.authorRole === "agent" ? event.agentId ?? "" : event.authorRole);
    if (message) {
      return `${actorKey}|m|${message}`;
    }
    if (event.authorRole === "system" && detail) {
      return `${normalizeLookupKey(event.type)}|d|${detail}`;
    }
    return void 0;
  }

  function isDuplicateCollaborationSyncEvent(event, signatures, thresholdMs = 2e4) {
    const signature = buildCollaborationEventSyncSignature(event);
    if (!signature) {
      return false;
    }
    const timestamp = toSortableMs(event.createdAt);
    const known = signatures.get(signature);
    if (!known || known.length === 0) {
      return false;
    }
    if (timestamp <= 0) {
      return true;
    }
    return known.some((value) => Math.abs(value - timestamp) <= thresholdMs);
  }

  function registerCollaborationSyncEventSignature(event, signatures) {
    const signature = buildCollaborationEventSyncSignature(event);
    if (!signature) {
      return;
    }
    const timestamp = toSortableMs(event.createdAt);
    const next = signatures.get(signature) ?? [];
    next.push(timestamp);
    signatures.set(signature, next);
  }

  function compareCollaborationApiEventsByTime(a, b) {
    const timeDiff = toSortableMs(a.createdAt) - toSortableMs(b.createdAt);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.sequence - b.sequence;
  }

  function mergeCollaborationRoomApiEvents(input) {
    const transcriptEvents = input.transcriptEvents.filter(
      (event) => !(event.authorRole === "user" && isCollaborationRelayPromptMessage(event.message)),
    );
    if (input.localEvents.length === 0) {
      const events = [...transcriptEvents].sort(compareCollaborationApiEventsByTime);
      return { events, localSequenceOffset: 0, lastSequence: events.at(-1)?.sequence ?? 0 };
    }
    const signatures = new Map();
    for (const event of input.localEvents) {
      registerCollaborationSyncEventSignature(event, signatures);
    }
    const firstLocalAt = toSortableMs(input.localEvents[0]?.createdAt);
    const historicalTranscript = [];
    const appendedTranscript = [];
    for (const event of transcriptEvents) {
      if (isDuplicateCollaborationSyncEvent(event, signatures)) {
        continue;
      }
      registerCollaborationSyncEventSignature(event, signatures);
      if (firstLocalAt > 0 && toSortableMs(event.createdAt) > 0 && toSortableMs(event.createdAt) < firstLocalAt) {
        historicalTranscript.push(event);
        continue;
      }
      appendedTranscript.push(event);
    }
    historicalTranscript.sort(compareCollaborationApiEventsByTime);
    appendedTranscript.sort(compareCollaborationApiEventsByTime);
    const localSequenceOffset = historicalTranscript.length;
    const historicalWithSequence = historicalTranscript.map((event, index) => ({ ...event, sequence: index + 1 }));
    const localWithSequence = input.localEvents.map((event) => ({
      ...event,
      sequence: localSequenceOffset + event.sequence,
    }));
    const appendedWithSequence = appendedTranscript.map((event, index) => ({
      ...event,
      sequence: localSequenceOffset + input.lastLocalSequence + index + 1,
    }));
    return {
      events: [...historicalWithSequence, ...localWithSequence, ...appendedWithSequence],
      localSequenceOffset,
      lastSequence: localSequenceOffset + input.lastLocalSequence + appendedWithSequence.length,
    };
  }

  async function buildCollaborationRoomApiView(input) {
    const directory = input.directory ?? (await loadCollaborationParticipantDirectory());
    const rooms = await listCollaborationTranscriptRooms(directory);
    const selectedRoom = rooms.find((room) => room.roomId === input.roomId);
    const persistedState = await import_collaboration_room.loadExistingCollaborationRoom(input.roomId);
    const state =
      persistedState ??
      import_collaboration_room.defaultCollaborationRoomState({
        roomId: input.roomId,
        title: selectedRoom?.title ?? import_collaboration_room.DEFAULT_COLLABORATION_ROOM_TITLE,
        titleMode: selectedRoom?.titleMode ?? "auto",
        projectId: selectedRoom?.projectId,
        now: selectedRoom?.createdAt,
      });
    const { project, memory } = await ensureCollaborationRoomProjectBinding({
      directory,
      selectedRoom,
      state,
    });
    const effectiveLimit = Math.max(1, Math.min(getSearchLimitMax(), input.limit));
    const attachmentsById = new Map(state.attachments.map((item) => [item.attachmentId, item]));
    const taskStore = await import_task_store.loadTaskStore();
    const transcriptHistory = await import_openclaw_chat_rooms
      .readOpenClawChatRoomHistory({
        agentId: directory.primaryAgentId,
        roomId: input.roomId,
        openclawHomeDir: getOpenClawHomeDir(),
        limit: effectiveLimit,
      })
      .catch(() => void 0);
    const transcriptEvents = transcriptHistory
      ? buildCollaborationTranscriptBackfillEvents({
          messages: normalizeSessionHistoryMessages(transcriptHistory, effectiveLimit),
          language: input.language,
          primaryAgentId: input.primaryAgentId,
          primaryDisplayName: input.primaryDisplayName,
        })
      : [];
    const localEvents = state.events.map((event) =>
      buildCollaborationRoomApiEvent(event, directory, attachmentsById, input.language, state.roomId),
    );
    const mergedTimeline = mergeCollaborationRoomApiEvents({
      localEvents,
      transcriptEvents,
      lastLocalSequence: state.lastSequence,
    });
    const effectiveLastSequence = mergedTimeline.lastSequence;
    const translatedAfterSequence =
      state.events.length > 0 && input.afterSequence > 0 && input.afterSequence <= state.lastSequence
        ? input.afterSequence + mergedTimeline.localSequenceOffset
        : input.afterSequence;
    const translatedReadSequence =
      state.events.length > 0 && input.readSequence > 0 && input.readSequence <= state.lastSequence
        ? input.readSequence + mergedTimeline.localSequenceOffset
        : input.readSequence;
    const normalizedReadSequence = Math.max(0, Math.min(effectiveLastSequence, translatedReadSequence));
    const events = mergedTimeline.events
      .filter((event) => event.sequence > translatedAfterSequence)
      .slice(-effectiveLimit);
    const unreadCount = mergedTimeline.events.filter(
      (event) => event.sequence > normalizedReadSequence && shouldCountUnreadCollaborationApiEvent(event),
    ).length;
    const baseParticipants =
      input.participants ??
      directory.entries.map((entry) => ({
        agentId: entry.agentId,
        displayName: entry.displayName,
        aliases: entry.aliases,
        mention: import_collaboration_room.preferredMentionAlias(
          entry.agentId,
          entry.displayName,
          entry.aliases,
        ),
        primary: entry.primary,
        identity: entry.identity,
        statusTone: "idle",
        statusDotLabel: staffStatusDotLabel("idle", input.language),
        currentWorkLabel: pickUiText(input.language, "Current task", "当前任务"),
        currentWork: pickUiText(input.language, "No live work right now", "当前无实时任务"),
        recentOutput: pickUiText(input.language, "No recent output yet.", "最近暂无产出。"),
      }));
    const participants = mergeParticipantsWithCollaborationState({
      participants: baseParticipants,
      state,
      project,
      tasks: taskStore.tasks,
      language: input.language,
    });
    const openTasks = taskStore.tasks.filter(
      (task) => task.projectId === project.projectId && task.status !== "done",
    );

    return {
      roomId: selectedRoom?.roomId ?? state.roomId,
      title: resolveDisplayedRoomTitle(state, selectedRoom),
      titleMode: state.titleMode,
      projectId: project.projectId,
      createdAt: selectedRoom?.createdAt ?? state.createdAt,
      updatedAt:
        pickLatestSessionActivityTimestamp(
          selectedRoom?.updatedAt,
          persistedState?.updatedAt,
          mergedTimeline.events.at(-1)?.createdAt,
        ) ??
        selectedRoom?.updatedAt ??
        state.updatedAt,
      lastSequence: effectiveLastSequence,
      unreadCount,
      readSequence: normalizedReadSequence,
      returnedCount: events.length,
      rooms,
      project: {
        projectId: project.projectId,
        title: project.title,
        status: project.status,
        owner: project.owner,
        summary: extractProjectSummaryExcerpt(memory.summaryText, input.language),
        openTaskCount: openTasks.length,
        lastStageAt:
          memory.recentStageLogs.at(-1)?.approvedAt ||
          memory.recentStageLogs.at(-1)?.reportedAt ||
          project.updatedAt,
      },
      participants,
      /*
      participants:
        input.participants ??
        directory.entries.map((entry) => ({
          agentId: entry.agentId,
          displayName: entry.displayName,
          aliases: entry.aliases,
          mention: import_collaboration_room.preferredMentionAlias(
            entry.agentId,
            entry.displayName,
            entry.aliases,
          ),
          primary: entry.primary,
          identity: entry.identity,
          statusTone: "idle",
          statusDotLabel: staffStatusDotLabel("idle", input.language),
          currentWorkLabel: pickUiText(input.language, "Working on", "正在处理什么"),
          currentWork: pickUiText(input.language, "No live work right now", "当前无实时任务"),
          recentOutput: pickUiText(input.language, "No recent output yet.", "最近暂无产出。"),
        })),
      */
      events,
    };
  }

  function attachCollaborationRoomRefsToCards(cards, roomStates, language) {
    return cards.map((card) => {
      const sessionKeys = new Set(
        [card.sessionKey, card.parentSessionKey, card.childSessionKey, ...card.aggregateItems.map((item) => item.sessionKey)]
          .map((value) => normalizeLookupKey(value ?? ""))
          .filter(Boolean),
      );
      if (sessionKeys.size === 0) {
        return card;
      }
      const roomRefs = roomStates
        .flatMap((roomState) => {
          const attachmentsById = new Map(roomState.attachments.map((item) => [item.attachmentId, item]));
          const relatedSourceEventIds = new Set();
          for (const event of roomState.events) {
            const relatedSessionKey = normalizeLookupKey(event.relatedSessionKey ?? "");
            if (!relatedSessionKey || !sessionKeys.has(relatedSessionKey)) {
              continue;
            }
            relatedSourceEventIds.add(event.eventId);
            if (event.sourceEventId) {
              relatedSourceEventIds.add(event.sourceEventId);
            }
          }
          if (relatedSourceEventIds.size === 0) {
            return [];
          }
          return roomState.events
            .filter((event) => {
              const relatedSessionKey = normalizeLookupKey(event.relatedSessionKey ?? "");
              return (
                (relatedSessionKey && sessionKeys.has(relatedSessionKey)) ||
                relatedSourceEventIds.has(event.eventId) ||
                Boolean(event.sourceEventId && relatedSourceEventIds.has(event.sourceEventId))
              );
            })
            .map((event) => {
              const described = describeCollaborationRoomEvent(event, language, void 0, attachmentsById);
              return {
                sequence: event.sequence,
                type: event.type,
                createdAt: event.createdAt,
                label: described.label,
                detail: described.detail,
              };
            });
        })
        .sort((a, b) => toSortableMs(a.createdAt) - toSortableMs(b.createdAt))
        .slice(-6);
      if (roomRefs.length === 0) {
        return card;
      }
      return { ...card, roomRefs };
    });
  }

  function buildCollaborationTranscriptBackfillEvents(input) {
    return input.messages
      .map((message, index) =>
        buildCollaborationTranscriptBackfillEvent({
          message,
          sequence: index + 1,
          language: input.language,
          primaryAgentId: input.primaryAgentId,
          primaryDisplayName: input.primaryDisplayName,
        }),
      )
      .filter((event) => Boolean(event));
  }

  function buildCollaborationTranscriptBackfillEvent(input) {
    const timestamp = input.message.timestamp?.trim();
    if (!timestamp) {
      return null;
    }
    const normalizedRole = normalizeLookupKey(input.message.role);
    const isUserMessage = normalizedRole === "user";
    const isAgentMessage = normalizedRole === "assistant" || input.message.kind === "inter_session";
    const detail = buildTranscriptBackfillDetail(input.message, input.language);
    const message = isUserMessage || isAgentMessage ? input.message.content : void 0;
    return {
      sequence: input.sequence,
      eventId: `transcript:${input.sequence}:${input.message.kind}`,
      type: isUserMessage ? "user_message" : isAgentMessage ? "agent_reply" : "system_note",
      createdAt: timestamp,
      authorRole: isUserMessage ? "user" : isAgentMessage ? "agent" : "system",
      agentId: isAgentMessage ? input.primaryAgentId : void 0,
      agentDisplayName: isAgentMessage ? input.primaryDisplayName : void 0,
      label: isUserMessage
        ? pickUiText(input.language, "User message", "用户消息")
        : isAgentMessage
          ? pickUiText(input.language, `${input.primaryDisplayName} replied`, `${input.primaryDisplayName} 已回复`)
          : input.message.kind === "tool_event"
            ? pickUiText(input.language, "Tool event", "工具事件")
            : pickUiText(input.language, "System note", "系统说明"),
      message,
      messageHtml: message ? import_chat_markdown.renderChatMarkdownToHtml(message) : void 0,
      detail,
      detailHtml: detail ? import_chat_markdown.renderChatMarkdownToHtml(detail) : void 0,
      failureReason: void 0,
      sourceEventId: void 0,
      targetAgentIds: [],
      targetDisplayNames: [],
      fallbackAgentId: void 0,
      fallbackDisplayName: void 0,
      attachmentIds: [],
      attachments: [],
      relatedSessionId: void 0,
      relatedSessionKey: input.message.sourceSessionKey,
      relatedSessionHref: input.message.sourceSessionKey
        ? buildSessionDetailHref(input.message.sourceSessionKey, input.language)
        : void 0,
    };
  }

  function buildTranscriptBackfillDetail(message, language) {
    if (message.kind === "tool_event") {
      const parts = [
        message.toolName ? pickUiText(language, `Tool ${message.toolName}`, `工具 ${message.toolName}`) : pickUiText(language, "Tool event", "工具事件"),
        message.toolStatus?.trim() || "",
        message.content.trim(),
      ].filter((item) => item.length > 0);
      return parts.join(" · ");
    }
    if (message.kind === "accepted" || message.kind === "spawn") {
      return message.content.trim() || void 0;
    }
    return void 0;
  }

  function describeCollaborationRoomEvent(event, language, directory, attachmentsById) {
    const agentName = event.agentId ? resolveCollaborationParticipantName(directory, event.agentId) : pickUiText(language, "System", "系统");
    const targetNames = (event.targetAgentIds ?? []).map((agentId) => resolveCollaborationParticipantName(directory, agentId));
    const attachmentSummary = summarizeCollaborationAttachmentNames(event.attachmentIds ?? [], attachmentsById, language);
    const baseMessage = safeTruncate(event.message?.trim() ?? "", 280);
    const sessionRef = event.relatedSessionKey ? ` [${event.relatedSessionKey}]` : "";
    switch (event.type) {
      case "user_message":
        return {
          label: pickUiText(language, "User message", "用户消息"),
          detail:
            baseMessage ||
            (attachmentSummary
              ? pickUiText(language, `Attachment-only message: ${attachmentSummary}`, `仅附件消息：${attachmentSummary}`)
              : pickUiText(language, "A new collaboration message was sent.", "发送了一条新的协作消息。")),
        };
      case "attachment":
        return {
          label: pickUiText(language, "Attachment", "附件"),
          detail:
            event.detail ||
            attachmentSummary ||
            baseMessage ||
            pickUiText(language, "Attachment uploaded.", "已上传附件。"),
        };
      case "dispatch_started":
        return {
          label: pickUiText(language, `${agentName} dispatch started`, `${agentName} 开始分发`),
          detail:
            event.detail ||
            pickUiText(
              language,
              `Queued for ${targetNames.join(", ") || agentName}${sessionRef}.`,
              `已排队给 ${targetNames.join("、") || agentName}${sessionRef}。`,
            ),
        };
      case "dispatch_failed":
        return {
          label: pickUiText(language, `${agentName} dispatch failed`, `${agentName} 分发失败`),
          detail:
            event.detail ||
            event.failureReason ||
            pickUiText(language, "The dispatch failed.", "本次分发失败。"),
        };
      case "dispatch_fallback":
        return {
          label: pickUiText(language, "Fallback to primary controller", "回退给主控"),
          detail:
            event.detail ||
            pickUiText(
              language,
              `Fallback routed to ${
                event.fallbackAgentId ? resolveCollaborationParticipantName(directory, event.fallbackAgentId) : "the primary controller"
              }.`,
              `已回退给 ${event.fallbackAgentId ? resolveCollaborationParticipantName(directory, event.fallbackAgentId) : "主控"}。`,
            ),
        };
      case "agent_reply":
        return {
          label: pickUiText(language, `${agentName} replied`, `${agentName} 已回复`),
          detail:
            baseMessage ||
            event.detail ||
            pickUiText(language, "Agent reply captured.", "已记录智能体回复。"),
        };
      case "system_note":
      default:
        return {
          label: pickUiText(language, "System note", "系统说明"),
          detail:
            event.detail ||
            baseMessage ||
            pickUiText(language, "System note recorded.", "已记录系统说明。"),
        };
    }
  }

  function shouldCountUnreadCollaborationEvent(event) {
    return event.type !== "dispatch_started";
  }

  function shouldCountUnreadCollaborationApiEvent(event) {
    return event.type !== "dispatch_started";
  }

  function resolveCollaborationParticipantName(directory, agentId) {
    const normalized = normalizeLookupKey(agentId);
    if (directory) {
      const match = directory.entries.find((entry) => normalizeLookupKey(entry.agentId) === normalized);
      if (match) {
        return match.displayName;
      }
    }
    return humanizeOperatorLabel(agentId);
  }

  function summarizeCollaborationAttachmentNames(attachmentIds, attachmentsById, language) {
    const names = attachmentIds
      .map((attachmentId) => attachmentsById?.get(attachmentId)?.fileName)
      .filter((value) => Boolean(value));
    if (names.length === 0) {
      return "";
    }
    const joined = names.slice(0, 3).join(language === "en" ? ", " : "、");
    return names.length > 3 ? pickUiText(language, `${joined} and ${names.length - 3} more`, `${joined} 等 ${names.length} 个附件`) : joined;
  }

  function buildCollaborationAttachmentSummary(attachment) {
    return `${attachment.kind} · ${attachment.contentType} · ${formatBytesCompact(attachment.sizeBytes)} · ${attachment.storedPath}`;
  }

  function formatCollaborationDuration(durationMs) {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      return "0s";
    }
    if (durationMs < 1e3) {
      return `${Math.round(durationMs)}ms`;
    }
    if (durationMs < 6e4) {
      return `${(durationMs / 1e3).toFixed(durationMs >= 1e4 ? 0 : 1)}s`;
    }
    return `${Math.round(durationMs / 1e3)}s`;
  }

  function formatBytesCompact(sizeBytes) {
    if (!Number.isFinite(sizeBytes) || sizeBytes < 1024) {
      return `${Math.max(0, Math.round(sizeBytes))} B`;
    }
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(sizeBytes >= 10 * 1024 ? 0 : 1)} KB`;
    }
    if (sizeBytes < 1024 * 1024 * 1024) {
      return `${(sizeBytes / (1024 * 1024)).toFixed(sizeBytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
    }
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function normalizeCollaborationAttachmentIds(input) {
    if (input === void 0) {
      return [];
    }
    if (!Array.isArray(input)) {
      throw createRequestValidationError("attachmentIds must be an array of strings.", 400);
    }
    const out = [];
    const seen = new Set();
    for (const item of input) {
      if (typeof item !== "string") {
        throw createRequestValidationError("attachmentIds must contain only strings.", 400);
      }
      const normalized = item.trim();
      if (!normalized) {
        continue;
      }
      if (normalized.length > 240) {
        throw createRequestValidationError("attachmentIds entries must be <= 240 characters.", 400);
      }
      if (seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      out.push(normalized);
    }
    return out;
  }

  function findUnknownCollaborationMentions(message, directory) {
    if (!message.trim()) {
      return [];
    }
    const knownAliases = new Set(
      directory.entries
        .flatMap((entry) => entry.aliases.map((alias) => import_collaboration_room.normalizeMentionAlias(alias)))
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
    attachCollaborationRoomRefsToCards,
    buildCollaborationAttachmentSummary,
    buildCollaborationChatParticipantViews,
    buildCollaborationRoomApiView,
    buildCollaborationEventSyncSignature,
    buildCollaborationTranscriptBackfillEvent,
    buildCollaborationTranscriptBackfillEvents,
    buildTranscriptBackfillDetail,
    compareCollaborationApiEventsByTime,
    describeCollaborationRoomEvent,
    extractCollaborationMentionTokens,
    findUnknownCollaborationMentions,
    formatBytesCompact,
    formatCollaborationDuration,
    isCollaborationRelayPromptMessage,
    isDuplicateCollaborationSyncEvent,
    listCollaborationTranscriptRooms,
    loadCollaborationParticipantDirectory,
    mergeCollaborationRoomApiEvents,
    normalizeCollaborationAttachmentIds,
    normalizeCollaborationEventSyncText,
    normalizeCollaborationRoomIdPayload,
    normalizeCollaborationRoomIdQuery,
    registerCollaborationSyncEventSignature,
    resolveCollaborationParticipantName,
    sanitizeCollaborationDisplayText,
    shouldCountUnreadCollaborationApiEvent,
    shouldCountUnreadCollaborationEvent,
    summarizeCollaborationAttachmentNames,
    toCollaborationApiAttachment,
  };
}

export { createCollaborationRoomHelpers };
