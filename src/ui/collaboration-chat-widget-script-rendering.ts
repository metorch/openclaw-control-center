import type { CollaborationChatScriptRenderInput } from "./collaboration-chat-widget-types";

function serializeJsonForScript(input: unknown): string {
  return JSON.stringify(input)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function renderCollaborationChatScriptRendering(input: CollaborationChatScriptRenderInput): string {
  return `
  const setExpanded = (nextExpanded) => {
    state.expanded = Boolean(nextExpanded);
    root.dataset.expanded = state.expanded ? '1' : '0';
    if (!state.expanded) setRoomMenuOpen(false);
    if (!state.expanded) {
      personCard.hidden = true;
      personCard.innerHTML = '';
    }
    applyPanelSize(false);
    panel.classList.toggle('is-open', state.expanded);
    toggleButton.classList.toggle('is-open', state.expanded);
    toggleButton.setAttribute('aria-expanded', state.expanded ? 'true' : 'false');
    launcherStatus.textContent = state.expanded ? labels.close : labels.subtitle;
    schedulePreferenceSave();
    syncRefreshGuard();
    schedulePolling();
    if (state.expanded && state.room && Number(state.room.lastSequence || 0) > roomCursor(state.activeRoomId)) {
      markRoomRead(state.room.lastSequence, true);
    }
  };

  const setAutoRefresh = (nextAuto) => {
    state.autoRefresh = Boolean(nextAuto);
    root.dataset.autoRefresh = state.autoRefresh ? '1' : '0';
    autoButton.textContent = state.autoRefresh ? labels.autoOn : labels.autoOff;
    autoButton.setAttribute('aria-pressed', state.autoRefresh ? 'true' : 'false');
    schedulePreferenceSave();
    schedulePolling();
  };

  const markRoomRead = (sequence, persist = true) => {
    const nextSequence = Math.max(0, Number(sequence || 0));
    state.roomReadCursors[state.activeRoomId] = nextSequence;
    state.lastReadSequence = nextSequence;
    if (persist) schedulePreferenceSave();
    renderUnread();
  };

  const renderUnread = () => {
    const unread = Math.max(0, Number(state.expanded ? 0 : state.unreadCount || 0));
    launcherUnread.textContent = String(unread);
    launcherUnread.hidden = unread <= 0;
    panelUnread.textContent = String(unread);
    panelUnread.hidden = unread <= 0;
  };

  const setRoomMenuOpen = (nextOpen) => {
    state.roomMenuOpen = Boolean(nextOpen) && Array.isArray(state.rooms) && state.rooms.length > 0;
    roomList.hidden = !state.roomMenuOpen;
    roomTrigger.setAttribute('aria-expanded', state.roomMenuOpen ? 'true' : 'false');
  };

  const buildParticipantChipMarkup = (participant) => {
    const accent = (participant.identity && participant.identity.accent) || '#0f766e';
    const imageHref = participant.identity && participant.identity.imageHref ? participant.identity.imageHref : '';
    return '<button class="collab-chat-person' + (participant.primary ? ' is-primary' : '') + '" type="button" data-person-agent="' + escapeHtml(participant.agentId) + '" aria-label="' + escapeHtml(participant.displayName || participant.agentId) + '">' +
      buildAvatarMarkup({
        accent,
        imageHref,
        label: participant.displayName || participant.agentId || '?',
        statusTone: participantStatusTone(participant),
        statusLabel: participantStatusLabel(participant),
      }) +
      '<span class="collab-chat-person-label">' + escapeHtml(participant.displayName || participant.agentId) + '</span>' +
    '</button>';
  };

  const summarizePersonCardText = (value, fallback, maxLength) => {
    const normalize = (input) => String(input || '').replace(/\\r/g, '').trim();
    let text = normalize(value) || normalize(fallback);
    if (!text) return labels.justNow;
    text = text.replace(/<openclaw_coordination>[\\s\\S]*?<\\/openclaw_coordination>/gi, ' ').trim();
    const normalized = text.replace(/\\s+/g, ' ').trim().toLowerCase();
    const relayPrompt =
      (normalized.includes('in the openclaw collaboration room.') &&
        normalized.includes('primary controller:') &&
        normalized.includes('current user message:')) ||
      (normalized.includes('<openclaw_coordination>') &&
        normalized.includes('projectid:') &&
        normalized.includes('taskid:'));
    if (relayPrompt) {
      const currentUserMatch = /Current user message:\\s*([\\s\\S]*?)(?:Attachments:|Reply to the user as this agent\\.?|$)/i.exec(text);
      if (currentUserMatch && currentUserMatch[1] && currentUserMatch[1].trim()) {
        text = currentUserMatch[1].trim();
      }
      const userRequestMatch = /User request:\\s*([\\s\\S]*)$/i.exec(text);
      if (userRequestMatch && userRequestMatch[1] && userRequestMatch[1].trim()) {
        text = userRequestMatch[1].trim();
      }
    }
    if (/unknown option '--session-key'/i.test(text)) {
      return ${serializeJsonForScript(input.language === "zh"
        ? "会话续接失败：当前 OpenClaw CLI 不支持 --session-key。"
        : "Session resume failed because this OpenClaw CLI does not support --session-key.")};
    }
    const compact = text
      .split(/\\r?\\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .filter((line) => !/^command failed:/i.test(line))
      .filter((line) => !/^traceback/i.test(line))
      .filter((line) => !/^file \"/i.test(line))
      .filter((line) => !/^raise systemexit/i.test(line))
      .join(' ')
      .replace(/\\s+/g, ' ')
      .trim();
    if (!compact) return normalize(fallback) || labels.justNow;
    if (compact.length <= maxLength) return compact;
    return compact.slice(0, Math.max(0, maxLength - 1)).trimEnd() + '…';
  };

  const buildPersonCardMarkup = (participant) => {
    const executionStateLabel = String(participant.executionStateLabel || participantStatusLabel(participant)).trim() || participantStatusLabel(participant);
    const projectTitle = summarizePersonCardText(participant.currentProjectTitle, labels.projectLabel, 120);
    const currentStage = String(participant.currentStage || labels.justNow).trim() || labels.justNow;
    const currentTaskTitle = summarizePersonCardText(participant.currentTaskTitle || participant.currentWork, labels.justNow, 180);
    const heartbeat = participant.lastHeartbeatAt ? formatTime(participant.lastHeartbeatAt) : labels.justNow;
    const currentWorkLabel = String(participant.currentWorkLabel || labels.taskLabel).trim() || labels.taskLabel;
    const currentWork = summarizePersonCardText(participant.currentWork, labels.justNow, 180);
    const recentOutput = summarizePersonCardText(participant.recentOutput, labels.justNow, 220);
    return '<div class="collab-chat-person-card-head">' +
      '<strong>' + escapeHtml(participant.displayName || participant.agentId) + '</strong>' +
      '<span class="collab-chat-person-card-status">' +
        '<span class="collab-chat-avatar-state ' + escapeHtml(participantStatusTone(participant)) + '" aria-hidden="true"></span>' +
        escapeHtml(executionStateLabel) +
      '</span>' +
    '</div>' +
    '<div class="collab-chat-person-card-meta">' +
      '<span><strong>' + escapeHtml(labels.projectLabel) + '</strong>' + escapeHtml(projectTitle) + '</span>' +
      '<span><strong>' + escapeHtml(labels.stateLabel) + '</strong>' + escapeHtml(executionStateLabel) + '</span>' +
      '<span><strong>' + escapeHtml(labels.stageLabel) + '</strong>' + escapeHtml(currentStage) + '</span>' +
      '<span><strong>' + escapeHtml(labels.taskLabel) + '</strong>' + escapeHtml(currentTaskTitle) + '</span>' +
      '<span><strong>' + escapeHtml(labels.heartbeatLabel) + '</strong>' + escapeHtml(heartbeat) + '</span>' +
    '</div>' +
    '<div class="collab-chat-person-card-body">' +
      '<div class="collab-chat-person-card-row">' +
        '<span>' + escapeHtml(currentWorkLabel) + '</span>' +
        '<p>' + escapeHtml(currentWork) + '</p>' +
      '</div>' +
      '<div class="collab-chat-person-card-row">' +
        '<span>' + escapeHtml(labels.latestUpdate) + '</span>' +
        '<p>' + escapeHtml(recentOutput) + '</p>' +
      '</div>' +
    '</div>';
  };

  const renderRoster = () => {
    personCard.hidden = true;
    personCard.innerHTML = '';
    if (state.participants.length === 0) {
      rosterList.innerHTML = '<span class="collab-chat-empty-line">' + escapeHtml(labels.noRooms) + '</span>';
      personCard.hidden = true;
      return;
    }
    rosterList.innerHTML = state.participants.map((participant) => buildParticipantChipMarkup(participant)).join('');
  };

  const renderProjectStrip = () => {
    const project = state.room && state.room.project ? state.room.project : null;
    if (!project) {
      projectTitleNode.textContent = labels.projectLabel;
      projectSummaryNode.textContent = labels.loading;
      projectOpenTasksNode.textContent = labels.openTasksLabel + ' 0';
      return;
    }
    projectTitleNode.textContent = project.title || project.projectId || labels.projectLabel;
    projectSummaryNode.textContent = project.summary || labels.loading;
    const openTasks = Number(project.openTaskCount || 0);
    const lastStageAt = project.lastStageAt ? ' | ' + formatTime(project.lastStageAt) : '';
    projectOpenTasksNode.textContent = labels.openTasksLabel + ' ' + String(openTasks) + lastStageAt;
  };

  const renderRooms = () => {
    if (!Array.isArray(state.rooms) || state.rooms.length === 0) {
      roomTrigger.disabled = true;
      roomTriggerTitle.textContent = labels.noRooms;
      roomTriggerMeta.textContent = '';
      roomTriggerMeta.hidden = true;
      roomList.innerHTML = '<span class="collab-chat-empty-line">' + escapeHtml(labels.noRooms) + '</span>';
      setRoomMenuOpen(false);
      return;
    }
    roomTrigger.disabled = false;
    const activeRoom = state.rooms.find((room) => String(room.roomId || '') === state.activeRoomId) || state.rooms[0] || null;
    if (activeRoom && String(activeRoom.roomId || '') !== state.activeRoomId) {
      state.activeRoomId = String(activeRoom.roomId || '');
    }
    const activeMeta = [formatRoomDate(activeRoom && activeRoom.updatedAt), formatRoomClock(activeRoom && activeRoom.updatedAt)].filter(Boolean);
    roomTriggerTitle.textContent = activeRoom && activeRoom.title ? activeRoom.title : labels.title;
    roomTriggerMeta.textContent = activeMeta.join(' | ');
    roomTriggerMeta.hidden = roomTriggerMeta.textContent.trim() === '';
    roomList.innerHTML = state.rooms.map((room) => {
      const active = String(room.roomId || '') === state.activeRoomId;
      const metaParts = [formatRoomDate(room.updatedAt), formatRoomClock(room.updatedAt)].filter(Boolean);
      return '<button class="collab-chat-room-option' + (active ? ' is-active' : '') + '" type="button" data-room-switch="' + escapeHtml(room.roomId) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
        '<strong>' + escapeHtml(room.title || room.roomId) + '</strong>' +
        (metaParts.length > 0 ? '<span>' + escapeHtml(metaParts.join(' | ')) + '</span>' : '') +
      '</button>';
    }).join('');
  };

  const renderUploads = () => {
    if (state.uploads.length === 0) {
      uploadList.innerHTML = '';
      return;
    }
    uploadList.innerHTML = state.uploads.map((item) => {
      const status = item.status === 'uploading'
        ? labels.upload
        : item.status === 'error'
          ? labels.failed
          : labels.queued;
      return '<div class="collab-chat-upload-item">' +
        '<div class="collab-chat-upload-copy">' +
          '<strong>' + escapeHtml(item.file.name) + '</strong>' +
          '<span>' + escapeHtml(status + ' | ' + formatBytes(item.file.size)) + '</span>' +
        '</div>' +
        '<div class="collab-chat-upload-actions">' +
          '<button class="collab-chat-ghost" type="button" data-upload-remove="' + escapeHtml(item.id) + '">' + escapeHtml(labels.remove) + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  };

  const renderAttachments = (attachments) => {
    if (!Array.isArray(attachments) || attachments.length === 0) return '';
    return '<div class="collab-chat-attachments">' + attachments.map((attachment) => {
      state.attachmentIndex.set(attachment.attachmentId, attachment);
      const meta = [attachment.contentType, formatBytes(attachment.sizeBytes), attachment.sourceLocalPath]
        .filter(Boolean)
        .join(' | ');
      let preview = '';
      if (attachment.kind === 'image') {
        preview = '<img class="collab-chat-image" src="' + escapeHtml(attachment.contentHref) + '" alt="' + escapeHtml(attachment.fileName) + '" />';
      } else if (attachment.kind === 'text' && attachment.previewText) {
        preview = '<details><summary class="collab-chat-link">' + escapeHtml(labels.preview) + '</summary><pre class="collab-chat-preview">' + escapeHtml(attachment.previewText) + '</pre></details>';
      }
      return '<div class="collab-chat-attachment">' +
        '<div class="collab-chat-attachment-head">' +
          '<div class="collab-chat-attachment-copy">' +
            '<strong>' + escapeHtml(attachment.fileName) + '</strong>' +
            '<span>' + escapeHtml(meta) + '</span>' +
          '</div>' +
          '<div class="collab-chat-attachment-actions">' +
            '<a class="collab-chat-link" href="' + escapeHtml(attachment.contentHref) + '" target="_blank" rel="noreferrer">' + escapeHtml(labels.openFile) + '</a>' +
            '<button class="collab-chat-ghost" type="button" data-save-attachment="' + escapeHtml(attachment.attachmentId) + '">' + escapeHtml(labels.save) + '</button>' +
          '</div>' +
        '</div>' +
        preview +
      '</div>';
    }).join('') + '</div>';
  };

  const renderEvents = () => {
    const events = state.room && Array.isArray(state.room.events) ? state.room.events : [];
    if (events.length === 0) {
      emptyState.hidden = false;
      emptyState.textContent = labels.noEvents;
      eventsList.hidden = true;
      eventsList.innerHTML = '';
      return;
    }

    emptyState.hidden = true;
    eventsList.hidden = false;
    eventsList.innerHTML = events.map((event) => {
      const participant = event.agentId ? findParticipant(event.agentId) : null;
      const historyToolEvent = isHistoryToolEvent(event);
      const actorName = event.authorRole === 'user'
        ? ${serializeJsonForScript(input.language === "zh" ? "你" : "You")}
        : participant && participant.displayName
          ? participant.displayName
          : event.agentDisplayName || event.label || ${serializeJsonForScript(input.language === "zh" ? "系统" : "System")};
      const accent = participant && participant.identity && participant.identity.accent ? participant.identity.accent : '#0f766e';
      const imageHref = participant && participant.identity && participant.identity.imageHref ? participant.identity.imageHref : '';
      const eventClass = (event.authorRole === 'user' ? ' is-user' : event.authorRole === 'agent' ? ' is-agent' : '') + (historyToolEvent ? ' is-tool-event' : '');
      const bodyHtml = event.messageHtml || (event.message ? '<p class="chat-md-paragraph">' + escapeHtml(event.message) + '</p>' : '');
      const detailHtml = event.detailHtml || (event.detail ? '<p class="chat-md-paragraph">' + escapeHtml(event.detail) + '</p>' : '');
      const eventContent = (bodyHtml ? '<div class="collab-chat-event-body">' + bodyHtml + '</div>' : '') +
        (detailHtml ? '<div class="collab-chat-event-detail">' + detailHtml + '</div>' : '') +
        renderAttachments(event.attachments);
      return '<li class="collab-chat-event' + eventClass + '">' +
        '<div class="collab-chat-event-head">' +
          '<div class="collab-chat-event-headline">' +
            buildAvatarMarkup({
              accent,
              imageHref,
              label: actorName,
              statusTone: participant ? participantStatusTone(participant) : '',
              statusLabel: participant ? participantStatusLabel(participant) : '',
            }) +
            '<span class="collab-chat-event-copy">' +
              '<strong>' + escapeHtml(actorName) + '</strong>' +
              '<span>' + escapeHtml(event.label || '') + '</span>' +
            '</span>' +
          '</div>' +
          '<time class="collab-chat-event-time">' + escapeHtml(formatTime(event.createdAt)) + '</time>' +
        '</div>' +
        (historyToolEvent
          ? '<details class="collab-chat-event-fold" data-collab-chat-tool-event><summary class="collab-chat-event-fold-summary">' + escapeHtml(${serializeJsonForScript(input.language === "zh" ? "展开工具详情" : "Show tool details")}) + '</summary><div class="collab-chat-event-fold-body">' + eventContent + '</div></details>'
          : eventContent) +
      '</li>';
    }).join('');
  };

  const scrollEventsToBottom = () => {
    window.requestAnimationFrame(() => {
      eventsList.scrollTop = eventsList.scrollHeight;
    });
  };

  const syncPendingEventsScroll = () => {
    const pendingRoomId = String(state.pendingScrollToLatestRoomId || '').trim();
    const currentRoomId = String(state.room && state.room.roomId ? state.room.roomId : '').trim();
    if (!pendingRoomId || !currentRoomId || pendingRoomId !== currentRoomId || eventsList.hidden) return;
    state.pendingScrollToLatestRoomId = '';
    scrollEventsToBottom();
  };

  const syncPresence = () => {
    const events = state.room && Array.isArray(state.room.events) ? state.room.events : [];
    const latest = events.length > 0 ? events[events.length - 1] : null;
    presenceNode.classList.remove('is-busy', 'is-failed');
    if (state.sending || (latest && latest.type === 'dispatch_started')) {
      presenceNode.classList.add('is-busy');
    } else if (latest && latest.type === 'dispatch_failed') {
      presenceNode.classList.add('is-failed');
    }
  };

  const syncComposerState = () => {
    const lock = roomLockMessage();
    const writable = !lock;
    inputNode.disabled = !writable || state.sending;
    sendButton.disabled = !writable || state.sending || (!inputNode.value.trim() && state.uploads.length === 0);
    fileInput.disabled = !writable || state.sending;
    createButton.disabled = !writable || state.loading || state.sending;
    deleteButton.disabled = !writable || state.loading || state.sending || state.rooms.length <= 1;
    writeStateNode.textContent = lock || labels.writeReady;
  };

  const syncHeader = () => {
    const room = state.room;
    roomTitle.textContent = room && room.title ? room.title : labels.title;
    const meta = [];
    if (room && room.roomId) meta.push(room.roomId);
    if (room && room.updatedAt) meta.push(formatTime(room.updatedAt));
    roomMeta.textContent = meta.join(' | ') || labels.subtitle;
    routeNode.textContent = routeLabelForText(inputNode.value);
    syncComposerState();
    syncPresence();
  };

  const renderAll = () => {
    applyPanelSize(false);
    renderUnread();
    renderRooms();
    renderProjectStrip();
    renderRoster();
    renderUploads();
    renderEvents();
    syncPendingEventsScroll();
    syncHeader();
    syncRefreshGuard();
  };
`;
}

export { renderCollaborationChatScriptRendering };
