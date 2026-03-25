// @ts-nocheck

const import_current_agent_catalog = require("../runtime/current-agent-catalog");
const import_collaboration_agent_artifacts = require("../runtime/collaboration-agent-artifacts");
const import_collaboration_project_memory = require("../runtime/collaboration-project-memory");
const import_collaboration_room = require("../runtime/collaboration-room");
const import_collaboration_stage_results = require("../runtime/collaboration-stage-results");
const import_openclaw_chat_rooms = require("../runtime/openclaw-chat-rooms");
const import_collaboration_live_drafts = require("../runtime/collaboration-live-drafts");
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
  const LIVE_SESSION_HISTORY_LIMIT_MIN = 80;
  const LIVE_SESSION_HISTORY_LIMIT_MAX = 160;
  const LIVE_SESSION_EVENT_LOOKBACK = 60;
  const PENDING_DISPATCH_LOOKBACK = 40;
  const LIVE_SESSION_HISTORY_TIMEOUT_MS = 1200;

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

  async function resolveCollaborationRoomSelection(roomId, directory) {
    const resolvedDirectory = directory ?? (await loadCollaborationParticipantDirectory());
    const rooms = await listCollaborationTranscriptRooms(resolvedDirectory);
    const normalizedRequestedRoomId = normalizeCollaborationRoomIdCandidate(roomId);
    const activeTranscriptRoomId = await import_openclaw_chat_rooms.loadActiveOpenClawChatRoomId({
      agentId: resolvedDirectory.primaryAgentId,
      workspaceRoot: getOpenClawWorkspaceRoot(),
      openclawHomeDir: getOpenClawHomeDir(),
    }).catch(() => void 0);
    const selectedRoom =
      (normalizedRequestedRoomId
        ? rooms.find((room) => room.roomId === normalizedRequestedRoomId)
        : void 0) ??
      (activeTranscriptRoomId ? rooms.find((room) => room.roomId === activeTranscriptRoomId) : void 0) ??
      rooms[0];
    const selectedRoomId = selectedRoom?.roomId ?? import_collaboration_room.DEFAULT_COLLABORATION_ROOM_ID;

    return {
      directory: resolvedDirectory,
      rooms: rooms.map((room) => ({
        ...room,
        active: room.roomId === selectedRoomId,
      })),
      roomId: selectedRoomId,
      selectedRoom,
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
    const selection = await resolveCollaborationRoomSelection(roomId, directory);
    return selection.roomId;
  }

  async function normalizeCollaborationRoomIdPayload(roomId, directory) {
    if (typeof roomId === "string") {
      const normalized = normalizeCollaborationRoomIdCandidate(roomId);
      if (normalized) {
        return normalized;
      }
    } else if (roomId !== void 0 && roomId !== null) {
      throw createRequestValidationError("roomId must be a string when provided.", 400);
    }
    return normalizeCollaborationRoomIdQuery(null, directory);
  }

  function normalizeSerializableRoomReadCursors(input) {
    if (!input || typeof input !== "object") {
      return {};
    }
    const out = {};
    for (const [roomId, sequence] of Object.entries(input)) {
      const normalizedRoomId = normalizeCollaborationRoomIdCandidate(roomId);
      if (
        !normalizedRoomId ||
        typeof sequence !== "number" ||
        !Number.isInteger(sequence) ||
        sequence < 0
      ) {
        continue;
      }
      out[normalizedRoomId] = sequence;
    }
    return out;
  }

  async function buildCollaborationChatBootPreferences(input) {
    const preferences = input?.preferences && typeof input.preferences === "object"
      ? input.preferences
      : {};
    const directory = input?.directory ?? (await loadCollaborationParticipantDirectory());
    const rooms = await listCollaborationTranscriptRooms(directory);
    const cachedActiveRoomId = normalizeCollaborationRoomIdCandidate(preferences.activeRoomId);
    const activeTranscriptRoomId = await import_openclaw_chat_rooms.loadActiveOpenClawChatRoomId({
      agentId: directory.primaryAgentId,
      workspaceRoot: getOpenClawWorkspaceRoot(),
      openclawHomeDir: getOpenClawHomeDir(),
    }).catch(() => void 0);
    const selectedRoom =
      (cachedActiveRoomId ? rooms.find((room) => room.roomId === cachedActiveRoomId) : void 0) ??
      (activeTranscriptRoomId ? rooms.find((room) => room.roomId === activeTranscriptRoomId) : void 0) ??
      rooms[0];
    const activeRoomId = selectedRoom?.roomId ?? import_collaboration_room.DEFAULT_COLLABORATION_ROOM_ID;
    const cachedRoomReadCursors = normalizeSerializableRoomReadCursors(preferences.roomReadCursors);
    const cachedLastReadSequence =
      typeof preferences.lastReadSequence === "number" &&
      Number.isInteger(preferences.lastReadSequence) &&
      preferences.lastReadSequence >= 0
        ? preferences.lastReadSequence
        : 0;
    const cachedActiveReadSequence =
      cachedRoomReadCursors[activeRoomId] ??
      ((cachedActiveRoomId === activeRoomId && cachedLastReadSequence > 0)
        ? cachedLastReadSequence
        : 0);
    const effectiveReadSequence = Math.max(0, typeof cachedActiveReadSequence === "number" ? cachedActiveReadSequence : 0);
    return {
      expanded: preferences.expanded === true,
      autoRefresh: preferences.autoRefresh !== false,
      activeRoomId,
      lastReadSequence: effectiveReadSequence,
      roomReadCursors: {
        ...cachedRoomReadCursors,
        [activeRoomId]: effectiveReadSequence,
      },
    };
  }

  function sanitizeCollaborationDisplayText(value, language, fallback = "", maxLength = 240, preserveLineBreaks = false) {
    const normalized = String(value || "").replace(/\r/g, "").trim();
    const fallbackText = String(fallback || "").trim();
    if (!normalized) {
      return fallbackText ? safeTruncate(fallbackText, maxLength) : "";
    }
    let text = normalized.replace(/<openclaw_coordination>[\s\S]*?<\/openclaw_coordination>/gi, " ").trim();
    text = text.replace(/^\[\[reply_to_current\]\]\s*/i, "").trim();
    text = import_collaboration_agent_artifacts.parseCollaborationAgentArtifacts(text).cleanReplyText.trim();
    text = import_collaboration_stage_results.parseStageResultEnvelopeFromReply(text, {
      agentId: "display",
    }).cleanReplyText.trim();
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
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .filter((line) => !/^command failed:/i.test(line))
      .filter((line) => !/^traceback/i.test(line))
      .filter((line) => !/^file \"/i.test(line))
      .filter((line) => !/^raise systemexit/i.test(line));
    const resolved = preserveLineBreaks
      ? lines.join("\n").trim()
      : lines.join(" ").replace(/\s+/g, " ").trim();
    const fallbackResolved = preserveLineBreaks
      ? fallbackText.replace(/\r/g, "").trim()
      : fallbackText.replace(/\s+/g, " ").trim();
    const output = resolved || fallbackResolved;
    return output ? safeTruncate(output, maxLength) : "";
  }

  function normalizeCollaborationRoomIdCandidate(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized ? normalized.slice(0, 120) : void 0;
  }

  function compareCollaborationRoomListRecency(left, right) {
    const updatedDiff = toSortableMs(right?.updatedAt) - toSortableMs(left?.updatedAt);
    if (updatedDiff !== 0) {
      return updatedDiff;
    }
    const createdDiff = toSortableMs(right?.createdAt) - toSortableMs(left?.createdAt);
    if (createdDiff !== 0) {
      return createdDiff;
    }
    return String(left?.title || "").localeCompare(String(right?.title || ""));
  }

  function buildCollaborationRoomListEntry(input) {
    const createdAt =
      input.localRoom?.createdAt ??
      input.transcriptRoom?.createdAt ??
      new Date(0).toISOString();
    const updatedAt =
      pickLatestSessionActivityTimestamp(input.localRoom?.updatedAt, input.transcriptRoom?.updatedAt, createdAt) ??
      input.localRoom?.updatedAt ??
      input.transcriptRoom?.updatedAt ??
      createdAt;
    const titleMode = input.localRoom?.titleMode === "manual" ? "manual" : "auto";
    return {
      roomId: input.roomId,
      title: resolveDisplayedRoomTitle(input.localRoom, input.transcriptRoom),
      titleMode,
      projectId: input.localRoom?.projectId,
      createdAt,
      updatedAt,
      lastSequence: input.localRoom?.lastSequence ?? 0,
      eventCount: input.localRoom?.eventCount ?? 0,
      hasLocalRoom: Boolean(input.localRoom),
      hasTranscriptRoom: Boolean(input.transcriptRoom),
      active: input.roomId === input.activeRoomId,
    };
  }

  async function listCollaborationTranscriptRooms(directory, options) {
    const activeRoomId = normalizeCollaborationRoomIdCandidate(options?.activeRoomId);
    const [localRooms, openclawRooms] = await Promise.all([
      import_collaboration_room.listCollaborationRooms().catch(() => []),
      import_openclaw_chat_rooms.listOpenClawChatRooms({
        agentId: directory.primaryAgentId,
        workspaceRoot: getOpenClawWorkspaceRoot(),
        openclawHomeDir: getOpenClawHomeDir(),
        createIfEmpty: false,
      }).catch(() => []),
    ]);
    const transcriptById = new Map(openclawRooms.map((room) => [room.roomId, room]));
    const localEntries = localRooms
      .map((room) =>
        buildCollaborationRoomListEntry({
          roomId: room.roomId,
          localRoom: room,
          transcriptRoom: transcriptById.get(room.roomId),
          activeRoomId,
        }),
      )
      .sort(compareCollaborationRoomListRecency);
    const seenRoomIds = new Set(localEntries.map((room) => room.roomId));
    const transcriptOnlyEntries = openclawRooms
      .filter((room) => !seenRoomIds.has(room.roomId))
      .map((room) =>
        buildCollaborationRoomListEntry({
          roomId: room.roomId,
          transcriptRoom: room,
          activeRoomId,
        }),
      )
      .sort(compareCollaborationRoomListRecency);
    return [...localEntries, ...transcriptOnlyEntries];
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

  function findParticipantReplyEventForActivity(input) {
    const activityAt = String(input.activityAt || "").trim();
    const activityMs = toSortableMs(activityAt);
    if (activityMs <= 0) {
      return void 0;
    }
    const matches = input.events
      .filter(
        (event) =>
          event.type === "agent_reply" &&
          normalizeLookupKey(event.agentId ?? "") === input.participantKey,
      )
      .map((event) => ({ event, deltaMs: Math.abs(toSortableMs(event.createdAt) - activityMs) }))
      .filter((candidate) => Number.isFinite(candidate.deltaMs) && candidate.deltaMs <= 60 * 1000)
      .sort((a, b) => a.deltaMs - b.deltaMs);
    return matches[0]?.event;
  }

  function deriveCompletionStateFromReplyEvent(input) {
    if (input.receipt?.lastResultState !== "in_progress") {
      return void 0;
    }
    const replyEvent = input.replyEvent;
    if (!replyEvent?.message?.trim()) {
      return void 0;
    }
    const parsedReply = import_collaboration_stage_results.parseStageResultEnvelopeFromReply(replyEvent.message, {
      taskId: input.receipt?.taskId || input.task?.taskId,
      projectId: input.receipt?.projectId || input.task?.projectId,
      agentId: replyEvent.agentId?.trim() || input.receipt?.lastReportedBy || "",
      reportedAt: input.receipt?.lastReportedAt || replyEvent.createdAt,
    });
    const artifactCount = parsedReply.envelope?.artifacts?.length ?? 0;
    const attachmentCount = replyEvent.attachmentIds?.length ?? 0;
    if (parsedReply.envelope?.resultState === "awaiting_review") {
      return "done";
    }
    if (attachmentCount > 0 && artifactCount > 0) {
      return "done";
    }
    return void 0;
  }

  function shouldOverlayParticipantWithCollaborationState(executionState) {
    return (
      executionState === "in_progress" ||
      executionState === "awaiting_review" ||
      executionState === "blocked" ||
      executionState === "failed" ||
      executionState === "stale"
    );
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

  const COLLABORATION_EXECUTION_ATTENTION_WINDOW_MS = 12 * 60 * 60 * 1000;

  function deriveCollaborationExecutionState(input) {
    const latestActivityAt =
      input.receipt?.lastReportedAt || input.dispatch?.createdAt || input.task?.updatedAt || "";
    const latestActivityMs = toSortableMs(latestActivityAt);
    const stale = latestActivityMs > 0 && Date.now() - latestActivityMs > 20 * 60 * 1000;
    if (input.receipt?.reviewState === "awaiting_review") return "awaiting_review";
    if (input.receipt?.reviewState === "approved" || input.task?.status === "done") return "done";
    if (input.receipt?.lastResultState === "failed") {
      if (latestActivityMs > 0 && Date.now() - latestActivityMs > COLLABORATION_EXECUTION_ATTENTION_WINDOW_MS) {
        return "idle";
      }
      return "failed";
    }
    if (input.receipt?.lastResultState === "blocked" || input.task?.status === "blocked") return "blocked";
    const completedFromReply = stale ? deriveCompletionStateFromReplyEvent(input) : void 0;
    if (completedFromReply) return completedFromReply;
    if (latestActivityMs > 0 && Date.now() - latestActivityMs > COLLABORATION_EXECUTION_ATTENTION_WINDOW_MS) {
      return "idle";
    }
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

  function collaborationExecutionLabel(state, language, receipt) {
    const waitingFor = receipt?.waitingFor;
    switch (state) {
      case "in_progress":
        return pickUiText(language, "Executing", "执行中");
      case "awaiting_review":
        return waitingFor === "user_confirmation"
          ? pickUiText(language, "Waiting for your confirmation", "等待你的确认")
          : pickUiText(language, "Waiting for Jarvis review", "等待 Jarvis 审核");
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
      const latestReplyEvent = findParticipantReplyEventForActivity({
        events: input.state.events,
        participantKey,
        activityAt: receipt?.lastReportedAt || dispatch?.createdAt || task?.updatedAt,
      });
      const executionState = deriveCollaborationExecutionState({
        dispatch,
        receipt,
        task,
        replyEvent: latestReplyEvent,
      });
      const statusTone = collaborationExecutionTone(executionState);
      const roomOwnsVisibleStatus = shouldOverlayParticipantWithCollaborationState(executionState);
      return {
        ...participant,
        statusTone: roomOwnsVisibleStatus ? statusTone : participant.statusTone,
        statusDotLabel: roomOwnsVisibleStatus
          ? collaborationExecutionLabel(executionState, input.language, receipt)
          : participant.statusDotLabel,
        executionState,
        executionStateLabel: collaborationExecutionLabel(executionState, input.language, receipt),
        currentProjectTitle: roomOwnsVisibleStatus ? input.project.title : void 0,
        currentStage: receipt?.stage || dispatch?.stage || pickUiText(input.language, "None", "无"),
        currentTaskId: dispatch?.taskId || receipt?.taskId || task?.taskId,
        currentTaskTitle: sanitizeCollaborationDisplayText(
          dispatch?.title || receipt?.taskTitle || task?.title || participant.currentWork,
          input.language,
          participant.currentWork,
          180,
        ),
        lastHeartbeatAt: receipt?.lastReportedAt || dispatch?.createdAt || task?.updatedAt,
        currentWorkLabel: roomOwnsVisibleStatus
          ? pickUiText(input.language, "Current task", "当前任务")
          : participant.currentWorkLabel,
        currentWork: roomOwnsVisibleStatus
          ? dispatch?.title ||
            receipt?.taskTitle ||
            task?.title ||
            participant.currentWork ||
            pickUiText(input.language, "No live task right now.", "当前无实时任务。")
          : participant.currentWork,
        recentOutput: roomOwnsVisibleStatus
          ? receipt?.recentOutput ||
            receipt?.summary ||
            participant.recentOutput ||
            pickUiText(input.language, "No recent output yet.", "最近暂无产出。")
          : participant.recentOutput,
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

  function isCollaborationInternalPromptMessage(value) {
    const normalized = normalizeCollaborationEventSyncText(value);
    if (!normalized) {
      return false;
    }
    const looksLikeLegacyInterruptedResumePrompt =
      (
        normalized.includes("the previous turn for") &&
        normalized.includes("interrupted after tool activity") &&
        normalized.includes("continue the same session without restarting the task")
      ) ||
      (
        normalized.includes("请继续当前会话") &&
        normalized.includes("不要重头开始") &&
        normalized.includes("不要重复已经完成的工作") &&
        normalized.includes("现在请补发最终给用户看的回复")
      );
    return (
      isCollaborationRelayPromptMessage(value) ||
      normalized.includes("[[internal_wake_resume]]") ||
      normalized.includes("internal recovery wake.") ||
      normalized.includes("continue where you left off. the previous model attempt failed or timed out.") ||
      looksLikeLegacyInterruptedResumePrompt ||
      (
        normalized.includes("heart rate monitor recovery check.") &&
        normalized.includes("current stage:") &&
        normalized.includes("current task:")
      )
    );
  }

  function isCollaborationMachineOnlyMessage(value) {
    return import_collaboration_agent_artifacts.isMachineOnlyCollaborationText(String(value || "").trim());
  }

  function looksLikeAnyRoomScopedCollaborationSessionKey(sessionKey) {
    const normalized =
      typeof sessionKey === "string" && sessionKey.trim()
        ? normalizeLookupKey(sessionKey)
        : "";
    return Boolean(normalized && normalized.includes("thread:collab-"));
  }

  function buildCollaborationEventSyncSignature(event) {
    const message = normalizeCollaborationEventSyncText(
      sanitizeCollaborationDisplayText(event.message, "en", "", 12000),
    );
    const detail = normalizeCollaborationEventSyncText(event.detail);
    const actorKey = normalizeLookupKey(event.authorRole === "agent" ? event.agentId ?? "" : event.authorRole);
    const eventTypeKey = normalizeLookupKey(event.type);
    if (message) {
      return `${eventTypeKey}|${actorKey}|m|${message}`;
    }
    if (event.authorRole === "system" && detail) {
      return `${eventTypeKey}|d|${detail}`;
    }
    return void 0;
  }

  function buildCollaborationEventAttachmentSemanticKey(event) {
    const attachmentNames = [
      ...(Array.isArray(event.attachments) ? event.attachments.map((attachment) => attachment?.fileName || "") : []),
      ...(Array.isArray(event.attachmentIds) ? event.attachmentIds.map((attachmentId) => String(attachmentId || "")) : []),
    ]
      .map((value) => normalizeCollaborationEventSyncText(value))
      .filter(Boolean)
      .sort();
    if (attachmentNames.length === 0) {
      return "";
    }
    return `attachments:${attachmentNames.length}:${attachmentNames.join("|")}`;
  }

  function normalizeComparableCollaborationDisplayText(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function looksStructuredCollaborationDisplayText(value) {
    const normalized = String(value || "").replace(/\r/g, "").trim();
    if (!normalized) {
      return false;
    }
    return /\n/.test(normalized) || /^\s*[-*]\s/m.test(normalized) || /^\s*\d+\.\s/m.test(normalized);
  }

  function shouldPreferStructuredCollaborationDisplayText(candidate, current) {
    const candidateText = String(candidate || "").trim();
    if (!candidateText) {
      return false;
    }
    const currentText = String(current || "").trim();
    if (!currentText) {
      return true;
    }
    const candidateStructured = looksStructuredCollaborationDisplayText(candidateText);
    const currentStructured = looksStructuredCollaborationDisplayText(currentText);
    if (!candidateStructured && currentStructured) {
      return false;
    }
    const candidateNormalized = normalizeComparableCollaborationDisplayText(candidateText);
    const currentNormalized = normalizeComparableCollaborationDisplayText(currentText);
    if (!candidateStructured) {
      return candidateNormalized.length > currentNormalized.length && !currentNormalized;
    }
    return (
      !currentStructured ||
      candidateNormalized === currentNormalized ||
      candidateNormalized.includes(currentNormalized) ||
      currentNormalized.includes(candidateNormalized)
    );
  }

  function shouldPreferExpandedCollaborationDisplayText(candidate, current) {
    const candidateText = String(candidate || "").trim();
    if (!candidateText) {
      return false;
    }
    const currentText = String(current || "").trim();
    if (!currentText) {
      return true;
    }
    const candidateNormalized = normalizeComparableCollaborationDisplayText(candidateText);
    const currentNormalized = normalizeComparableCollaborationDisplayText(currentText);
    if (!candidateNormalized || !currentNormalized) {
      return false;
    }
    return (
      (candidateNormalized === currentNormalized ||
        candidateNormalized.includes(currentNormalized) ||
        currentNormalized.includes(candidateNormalized)) &&
      candidateText.length >= currentText.length + 40
    );
  }

  function areCollaborationEventAttachmentSemanticsCompatible(left, right) {
    if (!left || !right) {
      return true;
    }
    return left === right;
  }

  function isContainedCollaborationSyncMessageMatch(left, right) {
    const leftText = String(left || "").trim();
    const rightText = String(right || "").trim();
    if (!leftText || !rightText) {
      return false;
    }
    if (leftText === rightText) {
      return true;
    }
    if (Math.min(leftText.length, rightText.length) < 80) {
      return false;
    }
    return leftText.includes(rightText) || rightText.includes(leftText);
  }

  function findMatchingCollaborationSyncEvent(event, signatures, thresholdMs = 2e4) {
    const signature = buildCollaborationEventSyncSignature(event);
    if (!signature) {
      return void 0;
    }
    const message = normalizeCollaborationEventSyncText(
      sanitizeCollaborationDisplayText(event.message, "en", "", 12000),
    );
    const actorKey = normalizeLookupKey(event.authorRole === "agent" ? event.agentId ?? "" : event.authorRole);
    const eventTypeKey = normalizeLookupKey(event.type);
    const relatedSessionKey = normalizeLookupKey(event.relatedSessionKey);
    const timestamp = toSortableMs(event.createdAt);
    const attachmentSemanticKey = buildCollaborationEventAttachmentSemanticKey(event);
    const known = signatures.get(signature);
    const effectiveThresholdMs = event?.syncControlMessage ? Math.max(thresholdMs, 6e4) : thresholdMs;
    if (known && known.length > 0 && timestamp <= 0) {
      const directMatch = known.find((value) =>
        areCollaborationEventAttachmentSemanticsCompatible(attachmentSemanticKey, value.attachmentSemanticKey),
      );
      if (directMatch) {
        return directMatch;
      }
    }
    if (known && known.length > 0) {
      const directMatch = known.find(
        (value) =>
          Math.abs(value.timestamp - timestamp) <= effectiveThresholdMs &&
          areCollaborationEventAttachmentSemanticsCompatible(attachmentSemanticKey, value.attachmentSemanticKey),
      );
      if (directMatch) {
        return directMatch;
      }
    }
    return [...signatures.values()].flat().find(
      (value) =>
        value.eventTypeKey === eventTypeKey &&
        value.actorKey === actorKey &&
        (!relatedSessionKey || !value.relatedSessionKey || value.relatedSessionKey === relatedSessionKey) &&
        (timestamp <= 0 || value.timestamp <= 0 || Math.abs(value.timestamp - timestamp) <= effectiveThresholdMs) &&
        areCollaborationEventAttachmentSemanticsCompatible(attachmentSemanticKey, value.attachmentSemanticKey) &&
        isContainedCollaborationSyncMessageMatch(message, value.message),
    );
  }

  function isDuplicateCollaborationSyncEvent(event, signatures, thresholdMs = 2e4) {
    return Boolean(findMatchingCollaborationSyncEvent(event, signatures, thresholdMs));
  }

  function registerCollaborationSyncEventSignature(event, signatures, metadata) {
    const signature = buildCollaborationEventSyncSignature(event);
    if (!signature) {
      return;
    }
    const timestamp = toSortableMs(event.createdAt);
    const attachmentSemanticKey = buildCollaborationEventAttachmentSemanticKey(event);
    const message = normalizeCollaborationEventSyncText(
      sanitizeCollaborationDisplayText(event.message, "en", "", 12000),
    );
    const actorKey = normalizeLookupKey(event.authorRole === "agent" ? event.agentId ?? "" : event.authorRole);
    const eventTypeKey = normalizeLookupKey(event.type);
    const relatedSessionKey = normalizeLookupKey(event.relatedSessionKey);
    const next = signatures.get(signature) ?? [];
    next.push({
      timestamp,
      attachmentSemanticKey,
      message,
      actorKey,
      eventTypeKey,
      relatedSessionKey,
      ...(metadata || {}),
    });
    signatures.set(signature, next);
  }

  function mergePreferredTranscriptEventIntoLocalEvent(localEvent, transcriptEvent) {
    if (!localEvent) {
      return transcriptEvent;
    }
    if (!transcriptEvent) {
      return localEvent;
    }
    const merged = { ...localEvent };
    if (
      shouldPreferStructuredCollaborationDisplayText(transcriptEvent.message, localEvent.message) ||
      shouldPreferExpandedCollaborationDisplayText(transcriptEvent.message, localEvent.message)
    ) {
      merged.message = transcriptEvent.message;
      merged.messageHtml = transcriptEvent.messageHtml ?? merged.messageHtml;
    }
    if (
      shouldPreferStructuredCollaborationDisplayText(transcriptEvent.detail, localEvent.detail) ||
      shouldPreferExpandedCollaborationDisplayText(transcriptEvent.detail, localEvent.detail)
    ) {
      merged.detail = transcriptEvent.detail;
      merged.detailHtml = transcriptEvent.detailHtml ?? merged.detailHtml;
    }
    if (
      (!Array.isArray(merged.attachments) || merged.attachments.length === 0) &&
      Array.isArray(transcriptEvent.attachments) &&
      transcriptEvent.attachments.length > 0
    ) {
      merged.attachments = transcriptEvent.attachments;
      merged.attachmentIds = transcriptEvent.attachmentIds ?? merged.attachmentIds;
    }
    if (!merged.relatedSessionId && transcriptEvent.relatedSessionId) {
      merged.relatedSessionId = transcriptEvent.relatedSessionId;
    }
    if (!merged.relatedSessionKey && transcriptEvent.relatedSessionKey) {
      merged.relatedSessionKey = transcriptEvent.relatedSessionKey;
    }
    if (!merged.relatedSessionHref && transcriptEvent.relatedSessionHref) {
      merged.relatedSessionHref = transcriptEvent.relatedSessionHref;
    }
    return merged;
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
      (event) =>
        !(
          (event.authorRole === "user" && isCollaborationInternalPromptMessage(event.message)) ||
          (
            event.authorRole === "agent" &&
            !event.message &&
            (event.syncControlMessage || isCollaborationInternalPromptMessage(event.detail))
          ) ||
          (
            event.authorRole === "agent" &&
            isCollaborationInternalPromptMessage(event.message) &&
            !event.syncControlMessage
          )
        ),
    );
    if (input.localEvents.length === 0) {
      const events = [...transcriptEvents].sort(compareCollaborationApiEventsByTime);
      return { events, localSequenceOffset: 0, lastSequence: events.at(-1)?.sequence ?? 0 };
    }
    const localEvents = input.localEvents.map((event) => ({ ...event }));
    const signatures = new Map();
    localEvents.forEach((event, index) => {
      registerCollaborationSyncEventSignature(event, signatures, { localIndex: index });
    });
    const firstLocalAt = toSortableMs(localEvents[0]?.createdAt);
    const historicalTranscript = [];
    const appendedTranscript = [];
    for (const event of transcriptEvents) {
      const eventTimestamp = toSortableMs(event.createdAt);
      if (
        localEvents.length > 0 &&
        event.authorRole === "user" &&
        looksLikeAnyRoomScopedCollaborationSessionKey(event.relatedSessionKey) &&
        (firstLocalAt <= 0 || eventTimestamp <= 0 || eventTimestamp >= firstLocalAt)
      ) {
        continue;
      }
      const matchingSignature = findMatchingCollaborationSyncEvent(event, signatures);
      if (matchingSignature) {
        const localIndex = Number.isInteger(matchingSignature.localIndex) ? matchingSignature.localIndex : -1;
        if (localIndex >= 0 && localIndex < localEvents.length) {
          localEvents[localIndex] = mergePreferredTranscriptEventIntoLocalEvent(localEvents[localIndex], event);
        }
        continue;
      }
      registerCollaborationSyncEventSignature(event, signatures);
      if (firstLocalAt > 0 && eventTimestamp > 0 && eventTimestamp < firstLocalAt) {
        historicalTranscript.push(event);
        continue;
      }
      appendedTranscript.push(event);
    }
    historicalTranscript.sort(compareCollaborationApiEventsByTime);
    appendedTranscript.sort(compareCollaborationApiEventsByTime);
    const localSequenceOffset = historicalTranscript.length;
    const historicalWithSequence = historicalTranscript.map((event, index) => ({ ...event, sequence: index + 1 }));
    const localWithSequence = localEvents.map((event) => ({
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

  function isHeartbeatRecoveryNoiseText(value) {
    const normalized = normalizeCollaborationEventSyncText(value);
    if (!normalized) {
      return false;
    }
    return (
      normalized === "heartbeat_ok" ||
      normalized.includes("heart rate monitor recovery check.") ||
      normalized.includes("heart rate monitor resumed") ||
      normalized.includes("without a normal heartbeat") ||
      normalized.includes("stale_in_progress") ||
      normalized.includes("heartbeat ok")
    );
  }

  function shouldHideCollaborationApiEvent(event) {
    if (!event || typeof event !== "object") {
      return true;
    }
    if (
      event.authorRole === "agent" &&
      (isHeartbeatRecoveryNoiseText(event.message) || isCollaborationMachineOnlyMessage(event.message))
    ) {
      return true;
    }
    if (
      (event.type === "system_note" ||
        event.type === "dispatch_failed" ||
        event.type === "dispatch_started") &&
      (isHeartbeatRecoveryNoiseText(event.message) ||
        isHeartbeatRecoveryNoiseText(event.detail) ||
        isHeartbeatRecoveryNoiseText(event.failureReason))
    ) {
      return true;
    }
    return false;
  }

  function normalizeCollaborationEventId(value) {
    return String(value || "").trim();
  }

  function normalizeCollaborationEventAgentKey(event) {
    return normalizeLookupKey(event?.agentId ?? event?.authorAgentId ?? "");
  }

  function isVisibleCollaborationReplyCandidate(event) {
    if (!event || event.type !== "agent_reply") {
      return false;
    }
    if (
      isHeartbeatRecoveryNoiseText(event.message) ||
      isCollaborationMachineOnlyMessage(event.message)
    ) {
      return false;
    }
    return Boolean(String(event.message || "").trim() || event.attachmentIds?.length);
  }

  function isSupersededDispatchFailureEvent(events, index) {
    const failureEvent = Array.isArray(events) ? events[index] : void 0;
    if (!failureEvent || failureEvent.type !== "dispatch_failed") {
      return false;
    }
    const failureAgentKey = normalizeCollaborationEventAgentKey(failureEvent);
    const failureSessionKey = normalizeLookupKey(failureEvent.relatedSessionKey ?? "");
    const failureSourceEventId = normalizeCollaborationEventId(failureEvent.sourceEventId);
    const failureEventId = normalizeCollaborationEventId(failureEvent.eventId);
    if (!failureSessionKey && !failureSourceEventId && !failureEventId) {
      return false;
    }

    for (let cursor = index + 1; cursor < events.length; cursor += 1) {
      const candidate = events[cursor];
      if (!candidate || typeof candidate !== "object") {
        continue;
      }
      const candidateAgentKey = normalizeCollaborationEventAgentKey(candidate);
      const sameAgent = !failureAgentKey || !candidateAgentKey || candidateAgentKey === failureAgentKey;
      const candidateSessionKey = normalizeLookupKey(candidate.relatedSessionKey ?? "");
      const candidateEventId = normalizeCollaborationEventId(candidate.eventId);
      const candidateSourceEventId = normalizeCollaborationEventId(candidate.sourceEventId);
      const sameSession = failureSessionKey && candidateSessionKey && candidateSessionKey === failureSessionKey;
      const sameSourceChain = Boolean(
        (failureSourceEventId &&
          (candidateSourceEventId === failureSourceEventId || candidateEventId === failureSourceEventId)) ||
          (failureEventId && candidateSourceEventId === failureEventId),
      );
      if (!sameSession && !sameSourceChain) {
        continue;
      }
      if (candidate.type === "dispatch_started" && sameSession && sameAgent && !sameSourceChain) {
        return false;
      }
      if (sameAgent && isVisibleCollaborationReplyCandidate(candidate)) {
        return true;
      }
    }
    return false;
  }

  function filterVisibleCollaborationApiEvents(events) {
    const normalizedEvents = Array.isArray(events) ? events : [];
    return normalizedEvents.filter(
      (event, index) =>
        !shouldHideCollaborationApiEvent(event) &&
        !isSupersededDispatchFailureEvent(normalizedEvents, index),
    );
  }

  function looksLikeRoomScopedCollaborationSessionKey(sessionKey, roomId) {
    const normalizedSessionKey = normalizeLookupKey(sessionKey);
    const normalizedRoomId = normalizeLookupKey(roomId);
    if (!normalizedSessionKey || !normalizedRoomId) {
      return false;
    }
    return normalizedSessionKey.includes(`thread:collab-${normalizedRoomId}`);
  }

  function isRoomScopedCoordinationPrompt(value, roomId) {
    const normalized = normalizeCollaborationEventSyncText(value);
    const normalizedRoomId = normalizeCollaborationEventSyncText(roomId);
    if (!normalized || !normalizedRoomId) {
      return false;
    }
    return (
      normalized.includes("<openclaw_coordination>") &&
      (normalized.includes(`roomid:${normalizedRoomId}`) ||
        normalized.includes(`roomid: ${normalizedRoomId}`))
    );
  }

  function escapeCollaborationPromptFieldPattern(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function extractCollaborationPromptField(value, fieldNames) {
    const source = String(value || "");
    if (!source.trim() || !Array.isArray(fieldNames)) {
      return "";
    }
    for (const fieldName of fieldNames) {
      const pattern = new RegExp(
        `${escapeCollaborationPromptFieldPattern(fieldName)}\\s*:\\s*([\\s\\S]*?)(?=(?:\\n\\s*|\\s+)(?:[A-Za-z][A-Za-z ]{2,40})\\s*:|$)`,
        "i",
      );
      const resolved = pattern.exec(source)?.[1]?.trim() || "";
      if (resolved) {
        return resolved;
      }
    }
    return "";
  }

  function buildCollaborationRoomScopeContext(input) {
    const state = input?.state;
    const sessionKeys = new Set();
    const taskIds = new Set();
    const taskTexts = new Set();
    const collectTaskText = (value) => {
      const normalized = normalizeComparableCollaborationReplyText(value).slice(0, 1_200);
      if (normalized) {
        taskTexts.add(normalized);
      }
    };

    for (const binding of state?.sessionBindings ?? []) {
      const normalizedSessionKey = normalizeLookupKey(binding?.sessionKey);
      if (normalizedSessionKey) {
        sessionKeys.add(normalizedSessionKey);
      }
    }

    for (const dispatch of state?.dispatchRecords ?? []) {
      const normalizedTaskId = normalizeLookupKey(dispatch?.taskId);
      if (normalizedTaskId) {
        taskIds.add(normalizedTaskId);
      }
      collectTaskText(dispatch?.title);
      collectTaskText(dispatch?.goal);
    }

    for (const receipt of state?.taskReceipts ?? []) {
      const normalizedTaskId = normalizeLookupKey(receipt?.taskId);
      if (normalizedTaskId) {
        taskIds.add(normalizedTaskId);
      }
      collectTaskText(receipt?.taskTitle);
      collectTaskText(receipt?.summary);
      collectTaskText(receipt?.recentOutput);
    }

    for (const event of state?.events ?? []) {
      if (event?.type === "user_message") {
        collectTaskText(event?.message);
      }
    }

    return {
      roomId: String(input?.roomId || "").trim(),
      projectId: normalizeLookupKey(input?.projectId),
      sessionKeys: [...sessionKeys],
      taskIds: [...taskIds],
      taskTexts: [...taskTexts],
    };
  }

  function matchesCollaborationRoomScopeTask(currentTask, taskTexts) {
    const normalizedCurrentTask = normalizeComparableCollaborationReplyText(currentTask);
    if (!normalizedCurrentTask) {
      return false;
    }
    for (const taskText of Array.isArray(taskTexts) ? taskTexts : []) {
      const normalizedTaskText = normalizeComparableCollaborationReplyText(taskText);
      if (!normalizedTaskText) {
        continue;
      }
      if (
        normalizedTaskText === normalizedCurrentTask ||
        normalizedTaskText.includes(normalizedCurrentTask) ||
        normalizedCurrentTask.includes(normalizedTaskText)
      ) {
        return true;
      }
    }
    return false;
  }

  function isRoomRelevantCollaborationInternalPrompt(value, roomContext, options) {
    if (!isCollaborationInternalPromptMessage(value)) {
      return false;
    }

    const normalizedRoomId = normalizeLookupKey(extractCollaborationPromptField(value, ["roomId"]));
    const expectedRoomId = normalizeLookupKey(roomContext?.roomId);
    if (normalizedRoomId) {
      return Boolean(expectedRoomId && normalizedRoomId === expectedRoomId);
    }

    const rawSessionBinding = extractCollaborationPromptField(value, ["sessionBinding", "sessionKey"]);
    const normalizedSessionBinding = normalizeLookupKey(rawSessionBinding.split(/\s+/)[0]);
    const knownSessionKeys = Array.isArray(roomContext?.sessionKeys) ? roomContext.sessionKeys : [];
    if (normalizedSessionBinding) {
      const matchesSession = knownSessionKeys.some((sessionKey) => sessionKey === normalizedSessionBinding);
      if (matchesSession) {
        return true;
      }
      if (knownSessionKeys.length > 0) {
        return false;
      }
    }

    const normalizedProjectId = normalizeLookupKey(
      extractCollaborationPromptField(value, ["projectId", "Project"]),
    );
    const expectedProjectId = normalizeLookupKey(roomContext?.projectId);
    if (normalizedProjectId) {
      if (expectedProjectId && normalizedProjectId !== expectedProjectId) {
        return false;
      }
      if (expectedProjectId && normalizedProjectId === expectedProjectId) {
        return true;
      }
    }

    const normalizedTaskId = normalizeLookupKey(extractCollaborationPromptField(value, ["taskId"]));
    const knownTaskIds = Array.isArray(roomContext?.taskIds) ? roomContext.taskIds : [];
    if (normalizedTaskId) {
      const matchesTaskId = knownTaskIds.some((taskId) => taskId === normalizedTaskId);
      if (matchesTaskId) {
        return true;
      }
      if (knownTaskIds.length > 0) {
        return false;
      }
    }

    const currentTask = extractCollaborationPromptField(value, ["Current task"]);
    if (currentTask) {
      const matchesTaskText = matchesCollaborationRoomScopeTask(currentTask, roomContext?.taskTexts);
      if (matchesTaskText) {
        return true;
      }
      if (expectedProjectId || knownTaskIds.length > 0) {
        return false;
      }
    }

    return options?.allowLegacyContinuation === true;
  }

  function collectRoomRelevantSessionCandidates(input) {
    const candidates = new Map();
    const activeAgentKeys = new Set();
    const recentStateEvents = Array.isArray(input.state?.events)
      ? input.state.events.slice(-LIVE_SESSION_EVENT_LOOKBACK)
      : [];
    const recentTranscriptEvents = Array.isArray(input.transcriptEvents)
      ? input.transcriptEvents.slice(-LIVE_SESSION_EVENT_LOOKBACK)
      : [];

    const upsertCandidate = (sessionKey, agentId) => {
      const normalizedSessionKey = normalizeLookupKey(sessionKey);
      if (!normalizedSessionKey) {
        return;
      }
      const trimmedSessionKey = String(sessionKey || "").trim();
      const normalizedAgentId = normalizeLookupKey(agentId);
      const next = {
        sessionKey: trimmedSessionKey,
        agentId:
          agentId ||
          extractAgentIdFromTranscriptSessionKey(trimmedSessionKey) ||
          input.primaryAgentId,
        roomScoped: looksLikeRoomScopedCollaborationSessionKey(trimmedSessionKey, input.roomId),
      };
      const current = candidates.get(normalizedSessionKey);
      if (!current || (next.roomScoped && !current.roomScoped)) {
        candidates.set(normalizedSessionKey, next);
      }
      if (normalizedAgentId) {
        activeAgentKeys.add(normalizedAgentId);
      }
    };

    for (const event of recentStateEvents) {
      if (event.agentId) {
        activeAgentKeys.add(normalizeLookupKey(event.agentId));
      }
      if (event.relatedSessionKey) {
        upsertCandidate(event.relatedSessionKey, event.agentId);
      }
    }

    for (const event of recentTranscriptEvents) {
      if (event.agentId) {
        activeAgentKeys.add(normalizeLookupKey(event.agentId));
      }
      if (event.relatedSessionKey) {
        upsertCandidate(event.relatedSessionKey, event.agentId);
      }
    }

    for (const binding of input.state?.sessionBindings ?? []) {
      const normalizedAgentId = normalizeLookupKey(binding?.agentId);
      if (!normalizedAgentId || !activeAgentKeys.has(normalizedAgentId) || !binding?.sessionKey) {
        continue;
      }
      upsertCandidate(binding.sessionKey, binding.agentId);
    }

    return [...candidates.values()].sort((left, right) => {
      if (left.roomScoped !== right.roomScoped) {
        return left.roomScoped ? -1 : 1;
      }
      return String(left.sessionKey || "").localeCompare(String(right.sessionKey || ""));
    });
  }

  function extractLatestRoomScopedSessionReply(input) {
    const messages = filterRoomScopedTranscriptMessages(
      Array.isArray(input.messages) ? input.messages : [],
      input.roomId,
      input.roomContext,
    );
    let latest = null;
    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index];
      if (normalizeLookupKey(message?.role) !== "user") {
        continue;
      }
      const promptText = extractSessionHistoryMessageText(message);
      if (!isRoomScopedCoordinationPrompt(promptText, input.roomId)) {
        continue;
      }
      let latestAssistant = null;
      let nextUserTimestamp = "";
      for (let cursor = index + 1; cursor < messages.length; cursor += 1) {
        const candidate = messages[cursor];
        const candidateRole = normalizeLookupKey(candidate?.role);
        if (candidateRole === "user") {
          nextUserTimestamp = String(candidate.timestamp || "");
          break;
        }
        if (candidateRole !== "assistant") {
          continue;
        }
        const visibleReplyText = extractVisibleAssistantReplyTextFromSessionHistoryMessage(candidate);
        const sanitized = sanitizeCollaborationDisplayText(visibleReplyText, input.language, "", 12000, true);
        if (
          !sanitized ||
          isCollaborationInternalPromptMessage(visibleReplyText) ||
          isCollaborationMachineOnlyMessage(visibleReplyText)
        ) {
          continue;
        }
        latestAssistant = {
          ...candidate,
          author: candidate.author || input.agentId,
          content: visibleReplyText,
          sourceSessionKey: candidate.sourceSessionKey || input.sessionKey,
          visibleContent: sanitized,
        };
      }
      latest = {
        prompt: message,
        assistant: latestAssistant,
        nextUserTimestamp,
      };
    }
    return latest;
  }

  function filterRoomScopedTranscriptMessages(messages, roomId, roomContext) {
    const normalizedMessages = Array.isArray(messages) ? messages : [];
    const filtered = [];
    let insideRoomScopedWindow = false;

    for (const message of normalizedMessages) {
      const role = normalizeLookupKey(message?.role);
      if (role === "user") {
        const promptText = extractSessionHistoryMessageText(message);
        if (isRoomScopedCoordinationPrompt(promptText, roomId)) {
          insideRoomScopedWindow = true;
          filtered.push(message);
          continue;
        }
        if (insideRoomScopedWindow && isCollaborationInternalPromptMessage(promptText)) {
          insideRoomScopedWindow = isRoomRelevantCollaborationInternalPrompt(
            promptText,
            {
              ...(roomContext || {}),
              roomId,
            },
            { allowLegacyContinuation: true },
          );
          continue;
        }
        insideRoomScopedWindow = false;
        continue;
      }
      if (!insideRoomScopedWindow) {
        continue;
      }
      if (role === "assistant" || message?.kind === "inter_session") {
        filtered.push(message);
      }
    }

    return filtered;
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

  function shouldPreferRecoveredCollaborationReplyText(currentReplyText, recoveredReplyText) {
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
      !currentStructured &&
      (recoveredNormalized === currentNormalized ||
        recoveredNormalized.includes(currentNormalized) ||
        currentNormalized.includes(recoveredNormalized))
    ) {
      return true;
    }
    if (
      (recoveredNormalized === currentNormalized ||
        recoveredNormalized.includes(currentNormalized) ||
        currentNormalized.includes(recoveredNormalized)) &&
      recoveredText.length >= currentText.length + 40
    ) {
      return true;
    }
    return false;
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

  function extractSessionHistoryMessageText(message) {
    if (!message || typeof message !== "object") {
      return "";
    }
    const collected = [];
    if (message.content !== void 0) {
      collectCollaborationAssistantReplyTextFragments(message.content, collected);
    }
    if (collected.length > 0) {
      return collected.join("\n\n").trim();
    }
    return (
      (typeof message.replyText === "string" ? message.replyText : void 0) ||
      (typeof message.text === "string" ? message.text : void 0) ||
      (typeof message.message === "string" ? message.message : void 0) ||
      (typeof message.content === "string" ? message.content : void 0) ||
      ""
    ).trim();
  }

  function normalizeRoomSyncMessageFromSessionHistoryRecord(record, fallback) {
    if (!record || typeof record !== "object") {
      return null;
    }
    const nestedMessage =
      record.message && typeof record.message === "object"
        ? record.message
        : record;
    const role = String(nestedMessage.role ?? record.role ?? "").trim();
    if (!role) {
      return null;
    }
    const content = extractSessionHistoryMessageText(nestedMessage);
    if (!content) {
      return null;
    }
    return {
      role,
      kind: String(nestedMessage.kind ?? record.kind ?? "message").trim() || "message",
      timestamp: String(nestedMessage.timestamp ?? record.timestamp ?? "").trim(),
      content,
      sourceSessionKey: String(nestedMessage.sourceSessionKey ?? record.sourceSessionKey ?? fallback.sessionKey ?? "").trim(),
      author: String(nestedMessage.author ?? record.author ?? fallback.agentId ?? "").trim(),
    };
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

  function extractVisibleAssistantReplyTextFromSessionHistoryMessage(message) {
    const directReplyText = extractSessionHistoryMessageText(message);
    return import_collaboration_agent_artifacts.isMachineOnlyCollaborationText(directReplyText)
      ? ""
      : directReplyText;
  }

  function extractStructuredAssistantRepliesFromSessionHistory(input) {
    const replies = [];
    for (const record of extractCollaborationSessionHistoryRecords(input.history)) {
      if (normalizeLookupKey(record?.type) !== "message") {
        continue;
      }
      const message = record?.message;
      if (!message || typeof message !== "object" || normalizeLookupKey(message?.role) !== "assistant") {
        continue;
      }
      const visibleContent = sanitizeCollaborationDisplayText(
        extractVisibleAssistantReplyTextFromSessionHistoryMessage(message),
        input.language,
        "",
        12000,
        true,
      );
      if (
        !visibleContent ||
        isCollaborationInternalPromptMessage(visibleContent) ||
        isCollaborationMachineOnlyMessage(visibleContent)
      ) {
        continue;
      }
      replies.push(visibleContent);
    }
    return replies;
  }

  function resolveStructuredLocalReplyFromSessionHistory(input) {
    const currentMessage = String(input.event?.message || "").trim();
    if (!currentMessage) {
      return "";
    }
    let bestMatch = "";
    let bestExactMatch = "";
    const currentNormalized = normalizeComparableCollaborationReplyText(currentMessage);
    for (const candidate of extractStructuredAssistantRepliesFromSessionHistory(input)) {
      if (!shouldPreferRecoveredCollaborationReplyText(currentMessage, candidate)) {
        continue;
      }
      const candidateNormalized = normalizeComparableCollaborationReplyText(candidate);
      if (candidateNormalized === currentNormalized) {
        bestExactMatch = candidate;
      } else if (!bestMatch) {
        bestMatch = candidate;
      }
    }
    return bestExactMatch || bestMatch;
  }

  async function upgradeCollaborationApiEventsFromSessionHistory(input) {
    if (!input.client || typeof input.client.sessionsHistory !== "function") {
      return input.events ?? [];
    }
    const normalizedEvents = Array.isArray(input.events) ? input.events : [];
    const historyCache = new Map();
    const historyLimit = Math.max(40, Math.min(80, Math.max(40, normalizedEvents.length * 4)));

    const loadHistoryMessages = async (sessionKey) => {
      const normalizedSessionKey = normalizeLookupKey(sessionKey);
      if (!normalizedSessionKey) {
        return [];
      }
      if (!historyCache.has(normalizedSessionKey)) {
        historyCache.set(
          normalizedSessionKey,
          promiseWithTimeout(
            input.client
              .sessionsHistory({
                sessionKey,
                limit: historyLimit,
              })
              .catch(() => void 0),
            LIVE_SESSION_HISTORY_TIMEOUT_MS,
          ).catch(() => void 0),
        );
      }
      return historyCache.get(normalizedSessionKey);
    };

    return Promise.all(
      normalizedEvents.map(async (event) => {
        if (
          event?.type !== "agent_reply" ||
          !event?.relatedSessionKey ||
          !looksLikeRoomScopedCollaborationSessionKey(event.relatedSessionKey, input.roomId)
        ) {
          return event;
        }
        const recoveredMessage = resolveStructuredLocalReplyFromSessionHistory({
          event,
          history: await loadHistoryMessages(event.relatedSessionKey),
          language: input.language,
        });
        if (!recoveredMessage || recoveredMessage === event.message) {
          return event;
        }
        return {
          ...event,
          message: recoveredMessage,
          messageHtml: import_chat_markdown.renderChatMarkdownToHtml(recoveredMessage),
        };
      }),
    );
  }

  async function buildCollaborationLiveSessionBackfillEvents(input) {
    if (!input.client || typeof input.client.sessionsHistory !== "function") {
      return [];
    }
    const roomScopeContext =
      input.roomScopeContext ??
      buildCollaborationRoomScopeContext({
        roomId: input.roomId,
        projectId: input.state?.projectId,
        state: input.state,
      });
    const sessionCandidates = collectRoomRelevantSessionCandidates(input);
    if (sessionCandidates.length === 0) {
      return [];
    }
    const historyLimit = Math.max(
      LIVE_SESSION_HISTORY_LIMIT_MIN,
      Math.min(LIVE_SESSION_HISTORY_LIMIT_MAX, Math.max(input.limit * 4, LIVE_SESSION_HISTORY_LIMIT_MIN)),
    );
    const signatures = new Map();
    for (const event of input.visibleTimeline ?? []) {
      registerCollaborationSyncEventSignature(event, signatures);
    }

    const drafts = [];
    const histories = await Promise.all(
      sessionCandidates.map(async (candidate) => {
        try {
          const history = await promiseWithTimeout(
            input.client.sessionsHistory({
              sessionKey: candidate.sessionKey,
              limit: historyLimit,
            }),
            LIVE_SESSION_HISTORY_TIMEOUT_MS,
          );
          const rawMessages = extractCollaborationSessionHistoryRecords(history)
            .map((record) =>
              normalizeRoomSyncMessageFromSessionHistoryRecord(record, {
                sessionKey: candidate.sessionKey,
                agentId: candidate.agentId,
              }),
            )
            .filter((message) => Boolean(message));
          return {
            candidate,
            messages:
              rawMessages.length > 0
                ? rawMessages
                : normalizeSessionHistoryMessages(history, historyLimit),
          };
        } catch {
          return null;
        }
      }),
    );

    for (const item of histories) {
      if (!item) {
        continue;
      }
      const latestWindow = extractLatestRoomScopedSessionReply({
        messages: item.messages,
        roomId: input.roomId,
        roomContext: roomScopeContext,
        agentId: item.candidate.agentId,
        sessionKey: item.candidate.sessionKey,
        language: input.language,
      });
      if (!latestWindow?.assistant) {
        continue;
      }
      const assistantMessage = {
        ...latestWindow.assistant,
        author: latestWindow.assistant.author || item.candidate.agentId,
        sourceSessionKey: latestWindow.assistant.sourceSessionKey || item.candidate.sessionKey,
      };
      const liveEvent = buildCollaborationTranscriptBackfillEvent({
        sequence: 1,
        message: assistantMessage,
        language: input.language,
        primaryAgentId: input.primaryAgentId,
        primaryDisplayName: input.primaryDisplayName,
        directory: input.directory,
      });
      if (!liveEvent || isDuplicateCollaborationSyncEvent(liveEvent, signatures)) {
        continue;
      }
      if (false) {
        pendingMessage = pickUiText(
          input.language,
          "This room task was stopped before a visible reply was synced.",
          "当前协作会话中的这项任务已在可见回复同步前终止。",
        );
        pendingDetail = pickUiText(
          input.language,
          `${agentName}'s current room task was stopped before a visible reply was synced.`,
          `${agentName} 的当前协作任务已在可见回复同步前终止。`,
        );
      }
      drafts.push({
        ...liveEvent,
        eventId: `live-session:${normalizeLookupKey(item.candidate.sessionKey)}:${toSortableMs(liveEvent.createdAt) || drafts.length + 1}`,
        agentId: liveEvent.agentId || item.candidate.agentId,
        agentDisplayName:
          liveEvent.agentDisplayName ||
          resolveCollaborationParticipantName(input.directory, item.candidate.agentId),
        relatedSessionKey: item.candidate.sessionKey,
        relatedSessionHref: buildSessionDetailHref(item.candidate.sessionKey, input.language),
        liveSessionBackfill: true,
      });
      registerCollaborationSyncEventSignature(liveEvent, signatures);
    }

    return drafts
      .sort(compareCollaborationApiEventsByTime)
      .map((event, index) => ({
        ...event,
        sequence: input.baseSequence + index + 1,
      }));
  }

  function buildCollaborationLiveDraftEvents(input) {
    const signatures = new Map();
    for (const event of input.visibleTimeline ?? []) {
      registerCollaborationSyncEventSignature(event, signatures);
    }

    const projected = [];
    for (const draft of import_collaboration_live_drafts.listCollaborationLiveDrafts(input.roomId)) {
      const visibleMessage = sanitizeCollaborationDisplayText(draft.text, input.language, "", 12_000, true);
      if (!visibleMessage) {
        continue;
      }
      const agentName =
        draft.agentDisplayName || resolveCollaborationParticipantName(input.directory, draft.agentId);
      const createdAt = String(draft.updatedAt || draft.createdAt || new Date().toISOString());
      const detail =
        draft.state === "error"
          ? pickUiText(
              input.language,
              `${agentName}'s live stream dropped. Waiting for transcript recovery.`,
              `${agentName} 的实时流已中断，正在等待 transcript 恢复。`,
            )
          : pickUiText(
              input.language,
              `${agentName} is replying in the shared room...`,
              `${agentName} 正在共享房间里回复...`,
            );
      const projectedEvent = {
        sequence: 0,
        eventId: `live-draft:${normalizeLookupKey(draft.runId || draft.sourceEventId || draft.agentId)}:${toSortableMs(createdAt) || projected.length + 1}`,
        type: "agent_reply",
        createdAt,
        authorRole: "agent",
        agentId: draft.agentId,
        agentDisplayName: agentName,
        label: pickUiText(
          input.language,
          `${agentName} is replying`,
          `${agentName} 正在回复`,
        ),
        message: visibleMessage,
        messageHtml: import_chat_markdown.renderChatMarkdownToHtml(visibleMessage),
        detail,
        detailHtml: import_chat_markdown.renderChatMarkdownToHtml(detail),
        failureReason: draft.errorMessage,
        sourceEventId: draft.sourceEventId,
        targetAgentIds: [draft.agentId],
        targetDisplayNames: [agentName],
        fallbackAgentId: void 0,
        fallbackDisplayName: void 0,
        attachmentIds: [],
        attachments: [],
        relatedSessionId: void 0,
        relatedSessionKey: draft.sessionKey,
        relatedSessionHref: draft.sessionKey
          ? buildSessionDetailHref(draft.sessionKey, input.language)
          : void 0,
        pending: true,
        liveDraft: true,
      };
      if (isDuplicateCollaborationSyncEvent(projectedEvent, signatures)) {
        continue;
      }
      registerCollaborationSyncEventSignature(projectedEvent, signatures);
      projected.push(projectedEvent);
    }

    return projected
      .sort(compareCollaborationApiEventsByTime)
      .map((event, index) => ({
        ...event,
        sequence: input.baseSequence + index + 1,
      }));
  }

  function promiseWithTimeout(promise, timeoutMs) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return promise;
    }
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), Math.trunc(timeoutMs)),
      ),
    ]);
  }

  function buildPendingDispatchTaskId(sourceEventId, agentId) {
    const safeEventId = String(sourceEventId || "")
      .trim()
      .replace(/[^A-Za-z0-9._:-]+/g, "-")
      .slice(0, 80);
    const safeAgentId = String(agentId || "")
      .trim()
      .replace(/[^A-Za-z0-9._:-]+/g, "-")
      .slice(0, 40);
    if (!safeEventId || !safeAgentId) {
      return "";
    }
    return `collab-${safeEventId}-${safeAgentId}`.slice(0, 100);
  }

  function resolvePendingDispatchReceipt(state, dispatch) {
    if (!state || !dispatch?.agentId) {
      return void 0;
    }
    const taskId = buildPendingDispatchTaskId(dispatch.sourceEventId, dispatch.agentId);
    if (!taskId) {
      return void 0;
    }
    const preferredProjectId = String(state.projectId || "").trim();
    return (state.taskReceipts || []).find(
      (receipt) =>
        receipt?.taskId === taskId &&
        (!preferredProjectId || String(receipt.projectId || "").trim() === preferredProjectId),
    );
  }

  function isUserStoppedPendingDispatchReceipt(receipt) {
    if (!receipt || receipt.lastResultState !== "blocked") {
      return false;
    }
    const signals = [
      receipt.summary,
      receipt.recentOutput,
      ...(Array.isArray(receipt.blockers) ? receipt.blockers : []),
    ]
      .map((value) => normalizeCollaborationEventSyncText(value))
      .filter(Boolean);
    return signals.some(
      (value) =>
        (value.includes("stopped") && value.includes("collaboration chat")) ||
        (value.includes("终止") && (value.includes("协作") || value.includes("群聊"))),
    );
  }

  function buildCollaborationPendingDraftEvents(input) {
    const drafts = [];
    const currentVisibleEvents = Array.isArray(input.currentEvents) ? input.currentEvents : [];
    const recentDispatches = Array.isArray(input.state?.events)
      ? input.state.events.slice(-PENDING_DISPATCH_LOOKBACK)
      : [];
    const seen = new Set();

    for (let index = recentDispatches.length - 1; index >= 0; index -= 1) {
      const dispatch = recentDispatches[index];
      if (dispatch?.type !== "dispatch_started" || !dispatch?.agentId) {
        continue;
      }
      const dispatchKey = `${normalizeLookupKey(dispatch.agentId)}|${normalizeLookupKey(dispatch.sourceEventId || dispatch.eventId)}`;
      if (seen.has(dispatchKey)) {
        continue;
      }
      seen.add(dispatchKey);
      const hasVisibleFollowUp = currentVisibleEvents.some((event) => {
        if (normalizeLookupKey(event?.agentId ?? "") !== normalizeLookupKey(dispatch.agentId ?? "")) {
          return false;
        }
        if (event.pending && !event.liveDraft && !event.liveSessionBackfill) {
          return false;
        }
        if (
          event.sourceEventId &&
          dispatch.sourceEventId &&
          normalizeLookupKey(event.sourceEventId ?? "") !== normalizeLookupKey(dispatch.sourceEventId ?? "")
        ) {
          return false;
        }
        return (
          event.type !== "dispatch_started" &&
          toSortableMs(event.createdAt) >= toSortableMs(dispatch.createdAt)
        );
      });
      if (hasVisibleFollowUp) {
        continue;
      }
      const agentName = resolveCollaborationParticipantName(input.directory, dispatch.agentId);
      const receipt = resolvePendingDispatchReceipt(input.state, dispatch);
      const stoppedByUser = isUserStoppedPendingDispatchReceipt(receipt);
      let pendingMessage = pickUiText(
        input.language,
        "Working in the current room session...",
        "正在当前协作会话中处理...",
      );
      let pendingDetail = pickUiText(
        input.language,
        `${agentName} has started working and has not published a visible reply yet.`,
        `${agentName} 已开始处理，但还没有同步出可见回复。`,
      );
      if (stoppedByUser) {
        pendingMessage = pickUiText(
          input.language,
          "This room task was stopped before a visible reply was synced.",
          "当前协作会话中的这项任务已在可见回复同步前终止。",
        );
        pendingDetail = pickUiText(
          input.language,
          `${agentName}'s current room task was stopped before a visible reply was synced.`,
          `${agentName} 的当前协作任务已在可见回复同步前终止。`,
        );
      }
      drafts.push({
        sequence: 0,
        eventId: `pending:${dispatch.eventId}`,
        type: "dispatch_started",
        createdAt: dispatch.createdAt,
        authorRole: "agent",
        agentId: dispatch.agentId,
        agentDisplayName: agentName,
        label: pickUiText(input.language, `${agentName} is working`, `${agentName} 正在处理`),
        message: pendingMessage,
        messageHtml: import_chat_markdown.renderChatMarkdownToHtml(pendingMessage),
        detail: pendingDetail,
        detailHtml: import_chat_markdown.renderChatMarkdownToHtml(pendingDetail),
        failureReason: void 0,
        sourceEventId: dispatch.sourceEventId,
        targetAgentIds: dispatch.targetAgentIds ?? [dispatch.agentId],
        targetDisplayNames: [agentName],
        fallbackAgentId: void 0,
        fallbackDisplayName: void 0,
        attachmentIds: [],
        attachments: [],
        relatedSessionId: dispatch.relatedSessionId,
        relatedSessionKey: dispatch.relatedSessionKey,
        relatedSessionHref: dispatch.relatedSessionKey
          ? buildSessionDetailHref(dispatch.relatedSessionKey, input.language)
          : void 0,
        pending: true,
        pendingState: stoppedByUser ? "stopped" : "working",
      });
      if (stoppedByUser && drafts.length > 0) {
        drafts[drafts.length - 1].label = pickUiText(
          input.language,
          `${agentName} was stopped`,
          `${agentName} 已终止`,
        );
      }
    }

    return drafts
      .sort(compareCollaborationApiEventsByTime)
      .map((event, index) => ({
        ...event,
        sequence: input.baseSequence + index + 1,
      }));
  }

  async function buildCollaborationRoomApiView(input) {
    const selection = await resolveCollaborationRoomSelection(input.roomId, input.directory);
    const directory = selection.directory;
    const rooms = selection.rooms;
    const selectedRoom = selection.selectedRoom;
    const effectiveRoomId = selection.roomId;
    const persistedState = selectedRoom
      ? await import_collaboration_room.loadExistingCollaborationRoom(effectiveRoomId)
      : void 0;
    const state =
      persistedState ??
      import_collaboration_room.defaultCollaborationRoomState({
        roomId: effectiveRoomId,
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
    const roomScopeContext = buildCollaborationRoomScopeContext({
      roomId: effectiveRoomId,
      projectId: project?.projectId ?? state.projectId ?? selectedRoom?.projectId,
      state,
    });
    const effectiveLimit = Math.max(1, Math.min(getSearchLimitMax(), input.limit));
    const attachmentsById = new Map(state.attachments.map((item) => [item.attachmentId, item]));
    const taskStore = await import_task_store.loadTaskStore();
    const transcriptHistory = await import_openclaw_chat_rooms
      .readOpenClawChatRoomHistory({
        agentId: directory.primaryAgentId,
        roomId: effectiveRoomId,
        openclawHomeDir: getOpenClawHomeDir(),
        limit: effectiveLimit,
      })
      .catch(() => void 0);
    const normalizedTranscriptMessages = transcriptHistory
      ? normalizeSessionHistoryMessages(transcriptHistory, effectiveLimit)
      : [];
    const requireRoomScopedTranscriptBackfill = selectedRoom?.hasLocalRoom === true;
    const transcriptMessages =
      requireRoomScopedTranscriptBackfill
        ? filterRoomScopedTranscriptMessages(normalizedTranscriptMessages, effectiveRoomId, roomScopeContext)
        : normalizedTranscriptMessages;
    const transcriptEvents =
      transcriptMessages.length > 0
        ? buildCollaborationTranscriptBackfillEvents({
            messages: transcriptMessages,
            language: input.language,
            primaryAgentId: input.primaryAgentId,
            primaryDisplayName: input.primaryDisplayName,
            directory,
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
    const visibleTimeline = filterVisibleCollaborationApiEvents(mergedTimeline.events);
    const effectiveLastSequence = visibleTimeline.at(-1)?.sequence ?? 0;
    const effectiveReadSequenceInput = Math.max(0, input.readSequence);
    const translatedAfterSequence =
      state.events.length > 0 && input.afterSequence > 0 && input.afterSequence <= state.lastSequence
        ? input.afterSequence + mergedTimeline.localSequenceOffset
        : input.afterSequence;
    const translatedReadSequence =
      state.events.length > 0 &&
      effectiveReadSequenceInput > 0 &&
      effectiveReadSequenceInput <= state.lastSequence
        ? effectiveReadSequenceInput + mergedTimeline.localSequenceOffset
        : effectiveReadSequenceInput;
    const normalizedReadSequence = Math.max(0, Math.min(effectiveLastSequence, translatedReadSequence));
    const realEvents = visibleTimeline
      .filter((event) => event.sequence > translatedAfterSequence)
      .slice(-effectiveLimit);
    const liveDraftEvents = buildCollaborationLiveDraftEvents({
      roomId: effectiveRoomId,
      directory,
      language: input.language,
      visibleTimeline,
      baseSequence: effectiveLastSequence,
    });
    const liveSessionEvents = await buildCollaborationLiveSessionBackfillEvents({
      client: input.client,
      state,
      roomId: effectiveRoomId,
      directory,
      transcriptEvents,
      visibleTimeline: [...visibleTimeline, ...liveDraftEvents],
      primaryAgentId: input.primaryAgentId,
      primaryDisplayName: input.primaryDisplayName,
      language: input.language,
      limit: effectiveLimit,
      baseSequence: effectiveLastSequence + liveDraftEvents.length,
      roomScopeContext,
    });
    const pendingDraftEvents = buildCollaborationPendingDraftEvents({
      state,
      roomId: effectiveRoomId,
      directory,
      language: input.language,
      currentEvents: [...visibleTimeline, ...liveDraftEvents, ...liveSessionEvents],
      baseSequence: effectiveLastSequence + liveDraftEvents.length + liveSessionEvents.length,
    });
    const events = await upgradeCollaborationApiEventsFromSessionHistory({
      client: input.client,
      events: [...realEvents, ...liveDraftEvents, ...liveSessionEvents, ...pendingDraftEvents],
      roomId: effectiveRoomId,
      language: input.language,
    });
    const unreadCount = visibleTimeline.filter(
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
          visibleTimeline.at(-1)?.createdAt,
          liveDraftEvents.at(-1)?.createdAt,
          liveSessionEvents.at(-1)?.createdAt,
          pendingDraftEvents.at(-1)?.createdAt,
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

  function buildCollaborationRoomStreamSignature(roomView) {
    const rooms = Array.isArray(roomView?.rooms)
      ? roomView.rooms.map((room) =>
          [
            String(room?.roomId || ""),
            String(room?.updatedAt || ""),
            String(room?.lastSequence || 0),
            room?.active ? "1" : "0",
          ].join("|"),
        )
      : [];
    const participants = Array.isArray(roomView?.participants)
      ? roomView.participants
          .map((participant) =>
            [
              String(participant?.agentId || ""),
              String(participant?.executionState || ""),
              String(participant?.lastHeartbeatAt || ""),
              safeTruncate(String(participant?.currentTaskId || ""), 120),
              safeTruncate(
                normalizeCollaborationEventSyncText(
                  String(participant?.recentOutput || participant?.currentWork || ""),
                ),
                220,
              ),
            ].join("|"),
          )
          .sort()
      : [];
    const events = Array.isArray(roomView?.events)
      ? roomView.events.map((event) =>
          [
            String(event?.sequence || 0),
            String(event?.eventId || ""),
            String(event?.type || ""),
            String(event?.agentId || ""),
            String(event?.createdAt || ""),
            event?.pending ? "1" : "0",
            event?.liveDraft ? "1" : "0",
            event?.liveSessionBackfill ? "1" : "0",
            event?.syncControlMessage ? "1" : "0",
            safeTruncate(
              normalizeCollaborationEventSyncText(String(event?.message || "")),
              320,
            ),
            safeTruncate(normalizeCollaborationEventSyncText(String(event?.detail || "")), 220),
            safeTruncate(normalizeCollaborationEventSyncText(String(event?.failureReason || "")), 220),
          ].join("|"),
        )
      : [];

    return JSON.stringify({
      roomId: String(roomView?.roomId || ""),
      updatedAt: String(roomView?.updatedAt || ""),
      lastSequence: Number(roomView?.lastSequence || 0),
      returnedCount: Number(roomView?.returnedCount || events.length),
      projectId: String(roomView?.project?.projectId || ""),
      projectSummary: safeTruncate(String(roomView?.project?.summary || ""), 240),
      projectOpenTaskCount: Number(roomView?.project?.openTaskCount || 0),
      rooms,
      participants,
      events,
    });
  }

  function attachCollaborationRoomRefsToCards(cards, roomStates, language) {
    const roomIndexes = roomStates.map((roomState) => {
      const attachmentsById = new Map((roomState.attachments ?? []).map((item) => [item.attachmentId, item]));
      const eventsBySessionKey = new Map();
      const eventsById = new Map();
      const eventsBySourceEventId = new Map();
      const eventRefCache = new Map();
      const events = Array.isArray(roomState.events) ? roomState.events : [];

      for (const event of events) {
        const eventId = String(event?.eventId ?? "").trim();
        if (eventId) {
          eventsById.set(eventId, event);
        }
        const relatedSessionKey = normalizeLookupKey(event?.relatedSessionKey ?? "");
        if (relatedSessionKey) {
          const bucket = eventsBySessionKey.get(relatedSessionKey) ?? [];
          bucket.push(event);
          eventsBySessionKey.set(relatedSessionKey, bucket);
        }
        const sourceEventId = String(event?.sourceEventId ?? "").trim();
        if (sourceEventId) {
          const bucket = eventsBySourceEventId.get(sourceEventId) ?? [];
          bucket.push(event);
          eventsBySourceEventId.set(sourceEventId, bucket);
        }
      }

      const getRoomRef = (event) => {
        if (!event || typeof event !== "object") {
          return null;
        }
        const eventId = String(event?.eventId ?? "").trim() || `sequence:${Number(event?.sequence ?? 0)}`;
        if (eventRefCache.has(eventId)) {
          return eventRefCache.get(eventId);
        }
        const described = describeCollaborationRoomEvent(event, language, void 0, attachmentsById);
        const ref = {
          roomId: roomState.roomId,
          sequence: event.sequence,
          type: event.type,
          createdAt: event.createdAt,
          label: described.label,
          detail: described.detail,
          eventId: String(event?.eventId ?? "").trim(),
          sourceEventId: String(event?.sourceEventId ?? "").trim(),
        };
        eventRefCache.set(eventId, ref);
        return ref;
      };

      return {
        eventsById,
        eventsBySessionKey,
        eventsBySourceEventId,
        getRoomRef,
      };
    });

    return cards.map((card) => {
      const aggregateItems = Array.isArray(card.aggregateItems) ? card.aggregateItems : [];
      const directSessionKeys = Array.isArray(card.sessionKeys) ? card.sessionKeys : [];
      const sessionKeys = new Set(
        [
          card.sessionKey,
          card.parentSessionKey,
          card.childSessionKey,
          ...directSessionKeys,
          ...aggregateItems.map((item) => item.sessionKey),
        ]
          .map((value) => normalizeLookupKey(value ?? ""))
          .filter(Boolean),
      );
      if (sessionKeys.size === 0) {
        return card;
      }
      const roomRefsByKey = new Map();
      const pushRoomRef = (ref) => {
        if (!ref) {
          return;
        }
        const key = `${ref.roomId}:${ref.eventId || ref.sequence}:${ref.type}`;
        if (!roomRefsByKey.has(key)) {
          roomRefsByKey.set(key, ref);
        }
      };
      for (const roomIndex of roomIndexes) {
        const relatedSourceEventIds = new Set();
        let matched = false;
        for (const sessionKey of sessionKeys) {
          const directEvents = roomIndex.eventsBySessionKey.get(sessionKey) ?? [];
          if (directEvents.length === 0) {
            continue;
          }
          matched = true;
          for (const event of directEvents) {
            const ref = roomIndex.getRoomRef(event);
            pushRoomRef(ref);
            if (ref.eventId) {
              relatedSourceEventIds.add(ref.eventId);
            }
            if (ref.sourceEventId) {
              relatedSourceEventIds.add(ref.sourceEventId);
            }
          }
        }
        if (!matched || relatedSourceEventIds.size === 0) {
          continue;
        }
        for (const relatedSourceEventId of relatedSourceEventIds) {
          pushRoomRef(roomIndex.getRoomRef(roomIndex.eventsById.get(relatedSourceEventId)));
          const linkedEvents = roomIndex.eventsBySourceEventId.get(relatedSourceEventId) ?? [];
          for (const event of linkedEvents) {
            pushRoomRef(roomIndex.getRoomRef(event));
          }
        }
      }
      const roomRefs = [...roomRefsByKey.values()]
        .sort((a, b) => toSortableMs(a.createdAt) - toSortableMs(b.createdAt))
        .slice(-6)
        .map((ref) => ({
          roomId: ref.roomId,
          sequence: ref.sequence,
          type: ref.type,
          createdAt: ref.createdAt,
          label: ref.label,
          detail: ref.detail,
        }));
      if (roomRefs.length === 0) {
        return card;
      }
      return {
        ...card,
        roomRefs,
        linkedRoomId: roomRefs[roomRefs.length - 1]?.roomId ?? card.linkedRoomId,
      };
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
          directory: input.directory,
        }),
      )
      .filter((event) => Boolean(event));
  }

  function extractAgentIdFromTranscriptSessionKey(sessionKey) {
    const normalized = String(sessionKey || "").trim();
    if (!normalized) {
      return "";
    }
    const match = /^agent:([^:]+)/i.exec(normalized);
    return match?.[1]?.trim() || "";
  }

  function buildTranscriptIdentityLookupCandidates(message) {
    const values = [
      message.author,
      extractAgentIdFromTranscriptSessionKey(message.sourceSessionKey),
      message.sourceSessionKey,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const expanded = new Set();
    for (const value of values) {
      expanded.add(value);
      const withoutParens = value.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
      if (withoutParens) {
        expanded.add(withoutParens);
      }
    }
    return [...expanded];
  }

  function resolveTranscriptBackfillAgentIdentity(input) {
    const entries = Array.isArray(input.directory?.entries) ? input.directory.entries : [];
    const candidates = buildTranscriptIdentityLookupCandidates(input.message);
    for (const candidate of candidates) {
      const normalizedCandidate = normalizeLookupKey(candidate);
      if (!normalizedCandidate) {
        continue;
      }
      const matched = entries.find((entry) => {
        if (normalizeLookupKey(entry.agentId) === normalizedCandidate) {
          return true;
        }
        if (normalizeLookupKey(entry.displayName) === normalizedCandidate) {
          return true;
        }
        return Array.isArray(entry.aliases)
          ? entry.aliases.some((alias) => normalizeLookupKey(alias) === normalizedCandidate)
          : false;
      });
      if (matched) {
        return {
          agentId: matched.agentId,
          displayName: matched.displayName,
        };
      }
    }
    return {
      agentId: input.primaryAgentId,
      displayName: input.primaryDisplayName,
    };
  }

  function buildCollaborationTranscriptBackfillEvent(input) {
    const timestamp = input.message.timestamp?.trim();
    if (!timestamp) {
      return null;
    }
    const normalizedRole = normalizeLookupKey(input.message.role);
    const isUserMessage = normalizedRole === "user";
    const isAgentMessage = normalizedRole === "assistant" || input.message.kind === "inter_session";
    if (!isUserMessage && !isAgentMessage) {
      return null;
    }
    const resolvedAgentIdentity = isAgentMessage
      ? resolveTranscriptBackfillAgentIdentity(input)
      : { agentId: input.primaryAgentId, displayName: input.primaryDisplayName };
    const rawMessageContent = isUserMessage || isAgentMessage ? String(input.message.content || "") : "";
    if (isAgentMessage && isCollaborationMachineOnlyMessage(rawMessageContent)) {
      return null;
    }
    const detail = buildTranscriptBackfillDetail(input.message, input.language);
    const message =
      isUserMessage || isAgentMessage
        ? sanitizeCollaborationDisplayText(rawMessageContent, input.language, "", 12000, true) || void 0
        : void 0;
    return {
      sequence: input.sequence,
      eventId: `transcript:${input.sequence}:${input.message.kind}`,
      type: isUserMessage ? "user_message" : isAgentMessage ? "agent_reply" : "system_note",
      createdAt: timestamp,
      authorRole: isUserMessage ? "user" : isAgentMessage ? "agent" : "system",
      agentId: isAgentMessage ? resolvedAgentIdentity.agentId : void 0,
      agentDisplayName: isAgentMessage ? resolvedAgentIdentity.displayName : void 0,
      label: isUserMessage
        ? pickUiText(input.language, "User message", "用户消息")
        : isAgentMessage
          ? pickUiText(
              input.language,
              `${resolvedAgentIdentity.displayName} replied`,
              `${resolvedAgentIdentity.displayName} 已回复`,
            )
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
      syncControlMessage: isAgentMessage && /\[\[reply_to_current\]\]/i.test(rawMessageContent),
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
    const baseMessage = sanitizeCollaborationDisplayText(event.message, language, "", 280);
    const sessionRef = event.relatedSessionKey ? ` [${event.relatedSessionKey}]` : "";
    switch (event.type) {
      case "user_message":
        return {
          label: pickUiText(language, "User message", "用户消息"),
          detail:
            event.detail ||
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
    buildCollaborationChatBootPreferences,
    buildCollaborationChatParticipantViews,
    buildCollaborationRoomApiView,
    buildCollaborationRoomStreamSignature,
    buildCollaborationEventSyncSignature,
    buildCollaborationLiveSessionBackfillEvents,
    upgradeCollaborationApiEventsFromSessionHistory,
    buildCollaborationLiveDraftEvents,
    buildCollaborationPendingDraftEvents,
    buildCollaborationTranscriptBackfillEvent,
    buildCollaborationTranscriptBackfillEvents,
    filterRoomScopedTranscriptMessages,
    buildTranscriptBackfillDetail,
    compareCollaborationApiEventsByTime,
    deriveCollaborationExecutionStateForSmoke: deriveCollaborationExecutionState,
    describeCollaborationRoomEvent,
    extractCollaborationMentionTokens,
    findUnknownCollaborationMentions,
    formatBytesCompact,
    formatCollaborationDuration,
    isCollaborationRelayPromptMessage,
    isDuplicateCollaborationSyncEvent,
    filterVisibleCollaborationApiEvents,
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
