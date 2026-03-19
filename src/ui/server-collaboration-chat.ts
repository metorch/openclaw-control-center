// @ts-nocheck

const { randomUUID } = require("node:crypto");
const { stat } = require("node:fs/promises");
const { extname, join, relative, resolve } = require("node:path");
const import_collaboration_room = require("../runtime/collaboration-room");
const import_collaboration_project_memory = require("../runtime/collaboration-project-memory");
const import_collaboration_stage_results = require("../runtime/collaboration-stage-results");
const import_openclaw_chat_rooms = require("../runtime/openclaw-chat-rooms");
const import_collaboration_agent_artifacts = require("../runtime/collaboration-agent-artifacts");
const import_chat_markdown = require("../runtime/chat-markdown");
const import_project_store = require("../runtime/project-store");
const import_task_store = require("../runtime/task-store");

function createCollaborationChatHelpers(deps) {
  const {
    buildCollaborationAttachmentSummary,
    buildSessionDetailHref,
    createRequestValidationError,
    describeCollaborationRoomEvent,
    formatBytesCompact,
    formatCollaborationDuration,
    getOpenClawHomeDir,
    getOpenClawWorkspaceRoot,
    isUiLanguage,
    normalizeCollaborationAttachmentIds,
    normalizeCollaborationRoomIdPayload,
    normalizeLookupKey,
    optionalBoundedString,
    pickUiText,
    resolveCollaborationParticipantName,
    safeTruncate,
    toCollaborationApiAttachment,
  } = deps;

  async function createCollaborationRoomMessage(payload, toolClient, directory, defaultLanguage) {
    const roomId = await normalizeCollaborationRoomIdPayload(payload.roomId, directory);
    await import_openclaw_chat_rooms.activateOpenClawChatRoom({
      agentId: directory.primaryAgentId,
      roomId,
      openclawHomeDir: getOpenClawHomeDir(),
    });
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
    const sessionBindings = new Map(
      await Promise.all(
        targets.map(async (agentId) => [
          normalizeLookupKey(agentId),
          await import_collaboration_room.getCollaborationSessionBinding(roomId, agentId),
        ]),
      ),
    );
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
      ...targets.map((agentId) => {
        const binding = resolveCollaborationAgentSessionBinding(
          roomId,
          agentId,
          sessionBindings.get(normalizeLookupKey(agentId)),
        );
        return {
          eventId: randomUUID(),
          type: "dispatch_started",
          authorRole: "system",
          agentId,
          sourceEventId,
          targetAgentIds: [agentId],
          relatedSessionId: binding?.sessionId,
          relatedSessionKey: binding?.sessionKey,
          detail: pickUiText(
            language,
            `Queued for ${resolveCollaborationParticipantName(directory, agentId)}.`,
            `已排队给 ${resolveCollaborationParticipantName(directory, agentId)}。`,
          ),
        };
      }),
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
      const replyText = response.replyText.trim() || safeTruncate(response.rawText.trim(), 2e3);
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
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 已回复，用时 ${formatCollaborationDuration(response.durationMs)}。`,
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
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 分发失败：${failureSummary}`,
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
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 失败，${input.directory.primaryDisplayName} 将继续作为这条链路上的兜底主控。`,
            )
          : pickUiText(
              input.language,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so the turn is being handed to ${input.directory.primaryDisplayName}.`,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 失败，当前消息将回退交给 ${input.directory.primaryDisplayName}。`,
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
            .map((attachment) => {
              const preview = attachment.previewText
                ? ` | preview=${safeTruncate(attachment.previewText, 240)}`
                : "";
              return `- ${attachment.fileName} | kind=${attachment.kind} | size=${formatBytesCompact(attachment.sizeBytes)} | type=${attachment.contentType} | path=${attachment.storedPath}${preview}`;
            })
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
    return normalized.includes("help.openai.com") && normalized.includes("request id");
  }

  function summarizeCollaborationFailure(input) {
    const combined = [input.failureReason, input.rawText]
      .filter((value) => typeof value === "string" && value.trim() !== "")
      .join("\n");
    const normalized = stripCollaborationMachinePrompt(combined);
    if (isRetryableUpstreamProviderFailureText(normalized)) {
      return pickUiText(
        input.language,
        "The upstream model service hit an internal error. You can retry this turn.",
        "上游模型服务发生内部错误，可以重试这一轮。",
      );
    }
    if (/unknown option '--session-key'/i.test(normalized)) {
      return pickUiText(
        input.language,
        "Session resume failed because this OpenClaw CLI does not support --session-key.",
        "会话续接失败：当前 OpenClaw CLI 不支持 --session-key。",
      );
    }
    if (/spawn openclaw .*enoent/i.test(normalized)) {
      return pickUiText(
        input.language,
        "Agent dispatch failed because the OpenClaw CLI executable was not found.",
        "分发失败：没有找到 OpenClaw CLI 可执行文件。",
      );
    }
    if (/gateway not connected/i.test(normalized) && /(session file locked|resource busy|ebusy|locked)/i.test(normalized)) {
      return pickUiText(
        input.language,
        "The gateway was disconnected, and the embedded fallback then hit a locked session file.",
        "网关未连接，而且嵌入式回退随后又遇到了会话文件锁定。",
      );
    }
    if (/gateway not connected/i.test(normalized)) {
      return pickUiText(
        input.language,
        "Agent dispatch failed because the gateway is not connected.",
        "分发失败：当前网关未连接。",
      );
    }
    if (/(session file locked|resource busy|ebusy|locked)/i.test(normalized)) {
      return pickUiText(
        input.language,
        "Agent dispatch failed because the session file is locked.",
        "分发失败：会话文件当前被锁定。",
      );
    }
    if (/(request was aborted|\baborted\b)/i.test(normalized)) {
      return pickUiText(
        input.language,
        "The agent turn was interrupted before the final reply was delivered.",
        "Agent 回合在最终回复发出前被中断了。",
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
      .find((line) => !isLikelyRelayPromptText(line));
    return summarizeCollaborationUiText(
      signalLine || normalized,
      pickUiText(input.language, "Unknown agent failure.", "未知的执行失败。"),
      260,
    ) || pickUiText(input.language, "Unknown agent failure.", "未知的执行失败。");
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

  function buildInterruptedCollaborationResumePrompt(input) {
    const actor = resolveCollaborationParticipantName(input.directory, input.targetAgentId);
    return pickUiText(
      input.language,
      [
        `The previous turn for ${actor} was interrupted after tool activity.`,
        "Continue the same session without restarting the task or repeating finished work.",
        "If any files were already written, keep them and use those existing artifacts.",
        "Send the final user-facing reply now, and include the hidden file footer and <stage_result> block if they are required for this task.",
      ].join("\n"),
      [
        `${actor} 刚才这一轮在工具执行后被中断了。`,
        "请继续当前会话，不要重头开始，也不要重复已经完成的工作。",
        "如果文件已经写好，直接复用现有产物，不要重新生成。",
        "现在请补发最终给用户看的回复；如果这项任务需要隐藏文件尾注或 <stage_result> 结果包，也一并补齐。",
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
        ? `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 在工具执行后已自动续接一次，但最终回复仍然被中断。`
        : `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 已完成工具执行，但最终回复在发出前被中断。`,
    );
  }

  function describeCollaborationAgentTurnOutput(response, stageResultFallback) {
    const fallbackReplyText =
      String(response.replyText || "").trim() || safeTruncate(String(response.rawText || "").trim(), 2e3);
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
    return {
      parsedArtifacts,
      parsedStageResult,
      rawJsonArtifactPaths,
      replyText:
        parsedStageResult.cleanReplyText.trim() ||
        parsedArtifacts.cleanReplyText.trim() ||
        String(response.replyText || "").trim() ||
        safeTruncate(String(response.rawText || "").trim(), 2e3),
      rawPaths: uniqueCompactStrings([
        ...parsedArtifacts.declaredPaths,
        ...parsedArtifacts.hintedPaths,
        ...rawJsonArtifactPaths,
        ...stageResultArtifactPaths,
      ]),
    };
  }

  function buildTaskTitleFromSourceEvent(sourceEvent, attachmentRecords) {
    const text = String(sourceEvent?.message || "").trim();
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
        pickUiText(input.language, "Collaboration project", "协作项目");
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

  async function upsertCollaborationTaskRecord(input) {
    const store = await import_task_store.loadTaskStore();
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
      await import_task_store.saveTaskStore(store);
      return existing;
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
    await import_task_store.saveTaskStore(store);
    return store.tasks.at(-1);
  }

  async function updateCollaborationTaskStatusDirect(input) {
    const store = await import_task_store.loadTaskStore();
    const existing = store.tasks.find(
      (task) => task.projectId === input.projectId && task.taskId === input.taskId,
    );
    if (!existing) {
      return void 0;
    }
    const now = new Date().toISOString();
    existing.status = input.status;
    existing.updatedAt = now;
    store.updatedAt = now;
    await import_task_store.saveTaskStore(store);
    return existing;
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

  function buildCollaborationVisibleReplyLanguageRequirement(language) {
    return pickUiText(
      language,
      "Write the visible user-facing reply in the same language as the user's latest message. Do not switch to another language just because tool output or system notes use it.",
      "可见的用户回复必须跟用户最近一条消息保持同一种语言。不要因为工具输出或系统说明是另一种语言，就把正式回复切成别的语言。",
    );
  }

  function buildCollaborationShellRequirement(agentWorkspaceRoot, language) {
    if (!/^[a-z]:[\\/]/i.test(String(agentWorkspaceRoot || "").trim())) {
      return "";
    }
    return pickUiText(
      language,
      "This workspace uses Windows PowerShell. Use PowerShell syntax, call curl.exe instead of the PowerShell curl alias, and do not use bash-only operators like &&.",
      "当前工作区使用 Windows PowerShell。请使用 PowerShell 语法；如果需要 curl，请调用 curl.exe，不要用 PowerShell 的 curl 别名；也不要使用 && 这类 bash/CMD 风格的连接符。",
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
    const title = buildTaskTitleFromSourceEvent(input.sourceEvent, input.attachmentRecords);
    const expectedArtifacts = shouldHintCollaborationArtifactReply(
      input.sourceEvent.message,
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
      goal:
        String(input.sourceEvent.message || "").trim() ||
        pickUiText(input.language, "Handle the attachment-only request.", "处理附件请求。"),
      definitionOfDone: [
        pickUiText(input.language, "Provide a concrete user-facing update.", "给出面向用户的明确反馈。"),
        pickUiText(
          input.language,
          "Emit a <stage_result> envelope when the phase reaches a reviewable checkpoint.",
          "当阶段达到可审核节点时输出 <stage_result> 结果包。",
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

  async function reviewCollaborationStageResult(input) {
    const checklist = uniqueCompactStrings(input.envelope.completionChecklist || []);
    const missingDefinitionOfDone = (input.dispatchRecord.definitionOfDone || []).filter((item) => {
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
    });
    const declaredResolvedArtifactPaths = resolveCollaborationArtifactPaths({
      rawPaths: declaredArtifactPaths,
      workspaceRoot: input.workspaceRoot,
    });
    const existingArtifactPaths = [];
    for (const artifactPath of resolvedArtifactPaths) {
      if (await isReadableCollaborationArtifactPath(artifactPath, input.workspaceRoot)) {
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
    const summarizedEnvelopeText = input.envelope
      ? summarizeCollaborationUiText(input.envelope.summary, summarizedReplyText, 260) || summarizedReplyText
      : summarizedReplyText;

    if (!input.envelope) {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        ...baseReceipt,
        lastResultState: "in_progress",
      });
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }

    if (input.envelope.resultState === "blocked") {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        ...baseReceipt,
        lastResultState: "blocked",
        summary: summarizedEnvelopeText,
        recentOutput: summarizedEnvelopeText,
        blockers: input.envelope.blockers,
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
          message: input.envelope.blockers?.join("; ") || input.envelope.summary,
          detail: pickUiText(
            input.language,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} reported a blocker.`,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 上报了阻塞。`,
          ),
        },
      ]);
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }

    if (input.envelope.resultState === "failed") {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        ...baseReceipt,
        lastResultState: "failed",
        summary: summarizedEnvelopeText,
        recentOutput: summarizedEnvelopeText,
        blockers: input.envelope.blockers,
      });
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "system_note",
          authorRole: "system",
          agentId: input.targetAgentId,
          sourceEventId: input.sourceEvent.eventId,
          message: input.envelope.summary,
          detail: pickUiText(
            input.language,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} marked the stage as failed.`,
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 将当前阶段标记为失败。`,
          ),
        },
      ]);
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }

    if (input.envelope.resultState === "in_progress") {
      await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
        ...baseReceipt,
        lastResultState: "in_progress",
        summary: summarizedEnvelopeText,
        recentOutput: summarizedEnvelopeText,
        blockers: input.envelope.blockers,
      });
      const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
      await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
      return;
    }

    await import_collaboration_room.upsertCollaborationTaskReceipt(input.roomId, {
      ...baseReceipt,
      reviewState: "awaiting_review",
      lastResultState: "awaiting_review",
      summary: summarizedEnvelopeText,
      recentOutput: summarizedEnvelopeText,
      blockers: input.envelope.blockers,
    });
    const review = await reviewCollaborationStageResult({
      envelope: input.envelope,
      dispatchRecord: input.dispatchRecord,
      replyAttachments: input.replyAttachments,
      workspaceRoot: input.workspaceRoot,
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
        summary: summarizedEnvelopeText,
        recentOutput: summarizedEnvelopeText,
        blockers: input.envelope.blockers,
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
          summary: input.envelope.summary,
          resultState: input.envelope.resultState,
          reviewState: "approved",
          reportedAt: input.envelope.reportedAt,
          approvedAt: new Date().toISOString(),
          artifacts,
          blockers: input.envelope.blockers,
          completionChecklist: input.envelope.completionChecklist,
          nextSuggestion: input.envelope.nextSuggestion,
        },
      });
      await import_collaboration_project_memory.updateCollaborationProjectSummary({
        workspaceRoot: getOpenClawWorkspaceRoot(),
        projectId: input.project.projectId,
        projectTitle: input.project.title,
        summary: input.envelope.summary,
        stage: input.dispatchRecord.stage,
        taskTitle: input.dispatchRecord.title,
        ownerAgentId: input.targetAgentId,
        artifacts,
        nextSuggestion: input.envelope.nextSuggestion,
        updatedAt: new Date().toISOString(),
      });
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "system_note",
          authorRole: "system",
          agentId: input.directory.primaryAgentId,
          sourceEventId: input.sourceEvent.eventId,
          message: input.envelope.summary,
          detail: pickUiText(
            input.language,
            `Jarvis approved ${input.dispatchRecord.title}.`,
            `Jarvis 已审核通过：${input.dispatchRecord.title}。`,
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
      summary: summarizedEnvelopeText,
      recentOutput: summarizedEnvelopeText,
      blockers: [
        ...uniqueCompactStrings(input.envelope.blockers || []),
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
          `Jarvis 要求补充后再审核：${input.dispatchRecord.title}。`,
        ),
      },
    ]);
    const nextState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
    await syncProjectOpenTasksForRoom(input.project.projectId, input.project.title, nextState);
  }

  async function dispatchCollaborationTurnToAgentV2(input) {
    const isPrimaryTarget =
      normalizeLookupKey(input.targetAgentId) === normalizeLookupKey(input.directory.primaryAgentId);
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
    const dispatchRecord = buildDispatchRecord({
      sourceEvent: input.sourceEvent,
      targetAgentId: input.targetAgentId,
      attachmentRecords: input.attachmentRecords,
      project: projectContext.project,
      projectMemory: projectContext.memory,
      language: input.language,
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
    });
    const nextResponse = await input.toolClient.agentTurn({
      agentId: input.targetAgentId,
      sessionId: binding?.sessionId,
      sessionKey: binding?.sessionKey,
      message: nextPrompt,
      timeoutSeconds: 90,
    });
    if (nextResponse.sessionId) {
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
      const interruptedOutputs = [describeCollaborationAgentTurnOutput(nextResponse, stageResultFallback)];
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
        });
        interruptedDurationMs += resumedResponse.durationMs;
        interruptedOutputs.push(describeCollaborationAgentTurnOutput(resumedResponse, stageResultFallback));
        if (resumedResponse.sessionId) {
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
      const interruptedReplyAttachments = await collectCollaborationAgentReplyAttachments({
        roomId: input.roomId,
        workspaceRoot,
        targetAgentId: input.targetAgentId,
        rawPaths: interruptedRawPaths,
      });
      if (resumedResponse.ok && !isInterruptedCollaborationAgentTurn(resumedResponse)) {
        const finalizedReplyText =
          interruptedCurrentOutput.replyText ||
          interruptedReplyText ||
          safeTruncate(resumedResponse.rawText.trim(), 2e3);
        await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
          {
            eventId: randomUUID(),
            type: "agent_reply",
            authorRole: "agent",
            agentId: input.targetAgentId,
            sourceEventId: input.sourceEvent.eventId,
            message: finalizedReplyText || void 0,
            attachmentIds: interruptedReplyAttachments.map((attachment) => attachment.attachmentId),
            relatedSessionId: resumedResponse.sessionId ?? nextResponse.sessionId ?? binding?.sessionId,
            relatedSessionKey: resumedResponse.sessionKey ?? nextResponse.sessionKey ?? binding?.sessionKey,
            detail: buildCollaborationAgentReplyDetail({
              language: input.language,
              directory: input.directory,
              agentId: input.targetAgentId,
              durationMs: interruptedDurationMs,
              attachments: interruptedReplyAttachments,
            }),
          },
        ]);
        await persistCollaborationStageResult({
          roomId: input.roomId,
          sourceEvent: input.sourceEvent,
          targetAgentId: input.targetAgentId,
          directory: input.directory,
          language: input.language,
          project: projectContext.project,
          dispatchRecord,
          envelope: interruptedStageResult,
          replyAttachments: interruptedReplyAttachments,
          replyText: finalizedReplyText,
          workspaceRoot,
          reportedAt: interruptedStageResult?.reportedAt ?? new Date().toISOString(),
        });
        return;
      }
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
    const nextResponseOutput = describeCollaborationAgentTurnOutput(nextResponse, stageResultFallback);
    if (nextResponse.ok) {
      const nextReplyAttachments = await collectCollaborationAgentReplyAttachments({
        roomId: input.roomId,
        workspaceRoot,
        targetAgentId: input.targetAgentId,
        rawPaths: nextResponseOutput.rawPaths,
      });
      const nextReplyText = nextResponseOutput.replyText;
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "agent_reply",
          authorRole: "agent",
          agentId: input.targetAgentId,
          sourceEventId: input.sourceEvent.eventId,
          message: nextReplyText || void 0,
          attachmentIds: nextReplyAttachments.map((attachment) => attachment.attachmentId),
          relatedSessionId: nextResponse.sessionId ?? binding?.sessionId,
          relatedSessionKey: nextResponse.sessionKey ?? binding?.sessionKey,
          detail: buildCollaborationAgentReplyDetail({
            language: input.language,
            directory: input.directory,
            agentId: input.targetAgentId,
            durationMs: nextResponse.durationMs,
            attachments: nextReplyAttachments,
          }),
        },
      ]);
      await persistCollaborationStageResult({
        roomId: input.roomId,
        sourceEvent: input.sourceEvent,
        targetAgentId: input.targetAgentId,
        directory: input.directory,
          language: input.language,
          project: projectContext.project,
          dispatchRecord,
          envelope: nextResponseOutput.parsedStageResult.envelope,
          replyAttachments: nextReplyAttachments,
          replyText: nextReplyText,
          workspaceRoot,
          reportedAt: nextResponseOutput.parsedStageResult.envelope?.reportedAt ?? new Date().toISOString(),
        });
      return;
    }
    const nextFailedReplyAttachments = await collectCollaborationAgentReplyAttachments({
      roomId: input.roomId,
      workspaceRoot,
      targetAgentId: input.targetAgentId,
      rawPaths: nextResponseOutput.rawPaths,
    });
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
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 在异常结束前已经生成了文件附件。`,
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
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 分发失败：${nextFailureSummary}`,
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
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 失败后，${input.directory.primaryDisplayName} 继续作为当前回退主控。`,
            )
          : pickUiText(
              input.language,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so the turn is being handed to ${input.directory.primaryDisplayName}.`,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 失败后，当前轮次转交给 ${input.directory.primaryDisplayName}。`,
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

    const prompt = await buildCollaborationAgentPromptV2({
      roomId: input.roomId,
      sourceEvent: input.sourceEvent,
      targetAgentId: input.targetAgentId,
      targetAgentIds: input.targetAgentIds,
      attachmentRecords: input.attachmentRecords,
      directory: input.directory,
      language: input.language,
      agentWorkspaceRoot: workspaceRoot,
      sessionBinding: binding ? { sessionId: binding.sessionId, sessionKey: binding.sessionKey } : void 0,
    });
    const response = await input.toolClient.agentTurn({
      agentId: input.targetAgentId,
      sessionId: isPrimaryTarget ? void 0 : binding?.sessionId,
      message: prompt,
      timeoutSeconds: 90,
    });
    if (!isPrimaryTarget && response.sessionId) {
      await import_collaboration_room.setCollaborationSessionBinding(
        input.roomId,
        input.targetAgentId,
        response.sessionId,
        response.sessionKey,
      );
    }
    if (response.ok) {
      const parsedArtifacts = import_collaboration_agent_artifacts.parseCollaborationAgentArtifacts(
        response.replyText.trim() || safeTruncate(response.rawText.trim(), 2e3),
      );
      const rawJsonArtifactPaths =
        import_collaboration_agent_artifacts.extractCollaborationAgentArtifactPathsFromRawJson(
          response.rawJson,
        );
      const replyAttachments = await collectCollaborationAgentReplyAttachments({
        roomId: input.roomId,
        workspaceRoot,
        targetAgentId: input.targetAgentId,
        rawPaths: [...parsedArtifacts.declaredPaths, ...parsedArtifacts.hintedPaths, ...rawJsonArtifactPaths],
      });
      const replyText =
        parsedArtifacts.cleanReplyText.trim() || safeTruncate(response.rawText.trim(), 2e3);
      await import_collaboration_room.appendCollaborationRoomEvents(input.roomId, [
        {
          eventId: randomUUID(),
          type: "agent_reply",
          authorRole: "agent",
          agentId: input.targetAgentId,
          sourceEventId: input.sourceEvent.eventId,
          message: replyText || void 0,
          attachmentIds: replyAttachments.map((attachment) => attachment.attachmentId),
          relatedSessionId: response.sessionId ?? binding?.sessionId,
          relatedSessionKey: response.sessionKey ?? binding?.sessionKey,
          detail: buildCollaborationAgentReplyDetail({
            language: input.language,
            directory: input.directory,
            agentId: input.targetAgentId,
            durationMs: response.durationMs,
            attachments: replyAttachments,
          }),
        },
      ]);
      return;
    }
    const failedParsedArtifacts = import_collaboration_agent_artifacts.parseCollaborationAgentArtifacts(
      response.replyText.trim() || safeTruncate(response.rawText.trim(), 2e3),
    );
    const failedRawJsonArtifactPaths =
      import_collaboration_agent_artifacts.extractCollaborationAgentArtifactPathsFromRawJson(
        response.rawJson,
      );
    const failedReplyAttachments = await collectCollaborationAgentReplyAttachments({
      roomId: input.roomId,
      workspaceRoot,
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
            `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 在回复异常结束前已经生成了附件文件。`,
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
          `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 分发失败：${response.failureReason ?? "未知错误"}`,
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
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 失败后，${input.directory.primaryDisplayName} 会继续作为这条链路上的兜底主控。`,
            )
          : pickUiText(
              input.language,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} failed, so the turn is being handed to ${input.directory.primaryDisplayName}.`,
              `${resolveCollaborationParticipantName(input.directory, input.targetAgentId)} 失败后，当前消息会自动转交给 ${input.directory.primaryDisplayName}。`,
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
  }

  async function buildCollaborationAgentPromptV2(input) {
    const directUserMessage =
      input.sourceEvent.message?.trim() ||
      pickUiText(
        input.language,
        "Please handle this request based on the attachments.",
        "请根据附件处理这条请求。",
      );
    const longTermMemoryPaths = await resolveAgentLongTermMemoryPaths(input.agentWorkspaceRoot);
    const summaryPreview = extractProjectSummaryPreview(input.projectMemory.summaryText);
    const coordinationLines = [
      "<openclaw_coordination>",
      `roomId: ${input.roomId}`,
      `projectId: ${input.project.projectId}`,
      `projectTitle: ${input.project.title}`,
      `taskId: ${input.dispatchRecord.taskId}`,
      `stage: ${input.dispatchRecord.stage}`,
      `ownerAgentId: ${input.targetAgentId}`,
      `createdBy: jarvis`,
      input.sessionBinding?.sessionKey
        ? `sessionBinding: ${input.sessionBinding.sessionKey}${input.sessionBinding.sessionId ? ` sessionId=${input.sessionBinding.sessionId}` : ""}`
        : "sessionBinding: none",
      summaryPreview ? `projectSummary: ${summaryPreview}` : "projectSummary: none",
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
        ? input.attachmentRecords.map((attachment) => {
            const preview = attachment.previewText
              ? ` | preview=${safeTruncate(attachment.previewText, 160)}`
              : "";
            return `- ${attachment.fileName} | ${attachment.contentType} | ${attachment.storedPath}${preview}`;
          })
        : ["- none"]),
      "requirements:",
      "- Read only the listed files that are relevant to this task.",
      "- Do not repeat or expose this coordination block in the visible reply.",
      "- If you create a file, write it to disk before mentioning it.",
      `- ${buildCollaborationVisibleReplyLanguageRequirement(input.language)}`,
      ...(
        buildCollaborationShellRequirement(input.agentWorkspaceRoot, input.language)
          ? [`- ${buildCollaborationShellRequirement(input.agentWorkspaceRoot, input.language)}`]
          : []
      ),
      "artifactReplyContract:",
      ...import_collaboration_agent_artifacts.buildCollaborationAgentArtifactInstruction(input.agentWorkspaceRoot).split(
        "\n",
      ),
      "- When the stage reaches a reviewable checkpoint, append exactly one <stage_result>...</stage_result> block.",
      `- Use this JSON template inside the stage_result block: ${import_collaboration_stage_results.buildStageResultEnvelopeTemplate({
        taskId: input.dispatchRecord.taskId,
        projectId: input.project.projectId,
        agentId: input.targetAgentId,
      }).replace(/\s+/g, " ")}`,
      "</openclaw_coordination>",
    ];
    return [coordinationLines.join("\n"), "", "User request:", directUserMessage].join("\n");

    const roomState = await import_collaboration_room.loadCollaborationRoom(input.roomId);
    const attachmentsById = new Map(roomState.attachments.map((item) => [item.attachmentId, item]));
    const recentEvents = buildCollaborationPromptContextLines({
      roomState,
      sourceEvent: input.sourceEvent,
      targetAgentId: input.targetAgentId,
      language: input.language,
      directory: input.directory,
      attachmentsById,
      hasBoundSession: Boolean(input.sessionBinding?.sessionId),
    }).join("\n");
    const userMessage =
      input.sourceEvent.message?.trim() ||
      pickUiText(
        input.language,
        "Please handle this request based on the attachments.",
        "请根据附件处理这条请求。",
      );
    const machineNotes = [];
    if (recentEvents.trim()) {
      machineNotes.push(pickUiText(input.language, "Reference context:", "参考上下文:"), recentEvents);
    }
    if (input.attachmentRecords.length > 0) {
      machineNotes.push(
        pickUiText(input.language, "Attachment paths:", "附件路径:"),
        ...input.attachmentRecords.map((attachment) => {
          const preview = attachment.previewText
            ? ` | ${pickUiText(input.language, "preview", "预览")}=${safeTruncate(attachment.previewText, 160)}`
            : "";
          return `- ${attachment.fileName} | ${attachment.contentType} | ${attachment.storedPath}${preview}`;
        }),
      );
    }
    if (shouldHintCollaborationArtifactReply(input.sourceEvent.message, input.attachmentRecords)) {
      machineNotes.push(
        pickUiText(
          input.language,
          "If you create or update a file for the user, write it in your workspace first, then append the hidden [[openclaw-files]] footer with each file path. Do not expose raw file paths in the visible reply.",
          "如果你为用户生成或更新了文件，请先实际写入工作区，再在回复末尾追加隐藏的 [[openclaw-files]] 文件尾注。不要在可见回复里暴露原始文件路径。",
        ),
      );
    }
    if (machineNotes.length === 0) {
      return userMessage;
    }
    return [userMessage, "", "---", ...machineNotes].join("\n");
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

  function shouldHintCollaborationArtifactReply(message, attachments) {
    if (attachments.length > 0) {
      return true;
    }
    const text = String(message || "").trim().toLowerCase();
    if (!text) {
      return false;
    }
    return /(?:\bhtml\b|\bpdf\b|\bdocx?\b|\bmarkdown\b|\bmd\b|\bjson\b|\bcsv\b|鏂囦欢|鏂囨。|闄勪欢|瀵煎嚭|鐢熸垚|鍋氭垚|鍙戠粰鎴憒涓嬭浇|淇濆瓨|report|export|download|save)/i.test(
      text,
    );
  }

  async function collectCollaborationAgentReplyAttachments(input) {
    const candidatePaths = resolveCollaborationArtifactPaths({
      rawPaths: input.rawPaths,
      workspaceRoot: input.workspaceRoot,
    });
    const attachments = [];
    for (const path of candidatePaths) {
      if (!(await isReadableCollaborationArtifactPath(path, input.workspaceRoot))) {
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
    const allowedRoots = [resolve(input.workspaceRoot), resolve(getOpenClawWorkspaceRoot())];
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
        attempts.add(resolve(input.workspaceRoot, normalized));
        attempts.add(resolve(getOpenClawWorkspaceRoot(), normalized));
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

  async function isReadableCollaborationArtifactPath(path, workspaceRoot) {
    if (!isPathInsideAnyRoot(path, [resolve(workspaceRoot), resolve(getOpenClawWorkspaceRoot())])) {
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
        `${actor} 已回复，用时 ${durationLabel}。`,
      );
    }
    const fileNames = input.attachments.slice(0, 3).map((attachment) => attachment.fileName).join(", ");
    return pickUiText(
      input.language,
      `${actor} replied in ${durationLabel} and attached ${input.attachments.length} file(s): ${fileNames}.`,
      `${actor} 已回复，用时 ${durationLabel}，并附上 ${input.attachments.length} 个文件：${fileNames}。`,
    );
  }

  function buildCollaborationRoomApiEvent(event, directory, attachmentsById, language, roomId) {
    const described = describeCollaborationRoomEvent(event, language, directory, attachmentsById);
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
      message: event.message,
      messageHtml: event.message ? import_chat_markdown.renderChatMarkdownToHtml(event.message) : void 0,
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
    buildCollaborationAgentReplyDetail,
    describeCollaborationAgentTurnOutput,
    buildCollaborationPromptContextLines,
    buildCollaborationRoomApiEvent,
    collectCollaborationAgentReplyAttachments,
    createCollaborationRoomMessage,
    dispatchCollaborationRoomMessage,
    dispatchCollaborationTurnToAgent,
    dispatchCollaborationTurnToAgentV2,
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
    summarizeCollaborationFailure,
    summarizeCollaborationUiText,
    shouldHintCollaborationArtifactReply,
  };
}

export { createCollaborationChatHelpers };
