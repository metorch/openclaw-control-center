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
    if (!state.expanded) closeDeleteConfirm(true);
    if (!state.expanded) clearFileDropState();
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
    if (persist && shouldPersistRoomViewState()) schedulePreferenceSave({ includeRoomViewState: true });
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
    const uploadsBusy = hasUploadingFiles();
    const visibleRooms = sortRoomsForDisplay(state.rooms);
    if (visibleRooms.length === 0) {
      roomTrigger.disabled = true;
      roomTriggerTitle.textContent = labels.noRooms;
      roomTriggerMeta.textContent = '';
      roomTriggerMeta.hidden = true;
      roomList.innerHTML = '<span class="collab-chat-empty-line">' + escapeHtml(labels.noRooms) + '</span>';
      setRoomMenuOpen(false);
      return;
    }
    roomTrigger.disabled = uploadsBusy;
    const activeRoom =
      visibleRooms.find((room) => String(room.roomId || '') === state.activeRoomId) ||
      visibleRooms[0] ||
      null;
    if (activeRoom && String(activeRoom.roomId || '') !== state.activeRoomId) {
      state.activeRoomId = String(activeRoom.roomId || '');
    }
    const activeMeta = [formatRoomDate(activeRoom && activeRoom.updatedAt), formatRoomClock(activeRoom && activeRoom.updatedAt)].filter(Boolean);
    roomTriggerTitle.textContent = activeRoom && activeRoom.title ? activeRoom.title : labels.title;
    roomTriggerMeta.textContent = activeMeta.join(' | ');
    roomTriggerMeta.hidden = roomTriggerMeta.textContent.trim() === '';
    roomList.innerHTML = visibleRooms.map((room) => {
      const active = String(room.roomId || '') === state.activeRoomId;
      const metaParts = [formatRoomDate(room.updatedAt), formatRoomClock(room.updatedAt)].filter(Boolean);
      const switchDisabled = uploadsBusy;
      const deleteDisabled = !canMutateRoom() || state.roomMutationPending || state.sending || uploadsBusy;
      const roomLabel = room.title || room.roomId || labels.title;
      return '<div class="collab-chat-room-row">' +
        '<button class="collab-chat-room-option' + (active ? ' is-active' : '') + '" type="button" data-room-switch="' + escapeHtml(room.roomId) + '" aria-pressed="' + (active ? 'true' : 'false') + '"' + (switchDisabled ? ' disabled' : '') + '>' +
          '<strong>' + escapeHtml(roomLabel) + '</strong>' +
          (metaParts.length > 0 ? '<span>' + escapeHtml(metaParts.join(' | ')) + '</span>' : '') +
        '</button>' +
        '<button class="collab-chat-room-delete" type="button" data-room-delete="' + escapeHtml(room.roomId) + '" title="' + escapeHtml(labels.deleteChat) + '" aria-label="' + escapeHtml(labels.deleteChat + ': ' + roomLabel) + '"' + (deleteDisabled ? ' disabled' : '') + '>' +
          '<span aria-hidden="true">\u00d7</span>' +
        '</button>' +
      '</div>';
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
        : item.status === 'uploaded'
          ? (embeddedLanguage === 'zh' ? '待发送' : 'Ready to send')
        : item.status === 'error'
          ? labels.failed
          : labels.queued;
      const removeDisabled = item.status === 'uploading' || state.sending;
      const retryDisabled = item.status === 'uploading' || state.sending || hasUploadingFiles();
      return '<div class="collab-chat-upload-item' + (item.status === 'error' ? ' is-error' : item.status === 'uploaded' ? ' is-ready' : '') + '">' +
        '<div class="collab-chat-upload-copy">' +
          '<strong>' + escapeHtml(item.file.name) + '</strong>' +
          '<span>' + escapeHtml(status + ' | ' + formatBytes(item.file.size)) + '</span>' +
          (item.status === 'error' && item.errorMessage
            ? '<p class="collab-chat-upload-error">' + escapeHtml(item.errorMessage) + '</p>'
            : '') +
        '</div>' +
        '<div class="collab-chat-upload-actions">' +
          (item.status === 'error'
            ? '<button class="collab-chat-ghost" type="button" data-upload-retry="' + escapeHtml(item.id) + '"' + (retryDisabled ? ' disabled' : '') + '>' + escapeHtml(embeddedLanguage === 'zh' ? '重试' : 'Retry') + '</button>'
            : '') +
          '<button class="collab-chat-ghost" type="button" data-upload-remove="' + escapeHtml(item.id) + '"' + (removeDisabled ? ' disabled' : '') + '>' + escapeHtml(labels.remove) + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  };

  const attachmentExtension = (fileName) => {
    const match = /\\.([a-z0-9]{1,12})$/i.exec(String(fileName || '').trim());
    return match ? String(match[1] || '').toLowerCase() : '';
  };

  const attachmentPreviewMode = (attachment) => {
    const contentType = String(attachment?.contentType || '').toLowerCase();
    const extension = attachmentExtension(attachment?.fileName);
    if (contentType.includes('application/pdf') || extension === 'pdf') return 'pdf';
    if (
      contentType.includes('presentationml') ||
      contentType.includes('powerpoint') ||
      ['ppt', 'pptx', 'key'].includes(extension)
    ) {
      return 'office';
    }
    if (String(attachment?.kind || '') !== 'text') return 'none';
    if (contentType.includes('html') || extension === 'html' || extension === 'htm') return 'html';
    if (contentType.includes('markdown') || extension === 'md' || extension === 'markdown' || extension === 'mdx') {
      return 'markdown';
    }
    if (
      contentType.includes('json') ||
      [
        'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift',
        'php', 'c', 'cc', 'cpp', 'h', 'hpp', 'cs', 'sh', 'bash', 'ps1', 'sql', 'css', 'scss',
        'less', 'xml', 'yml', 'yaml', 'toml', 'ini', 'env', 'gradle',
      ].includes(extension)
    ) {
      return 'code';
    }
    return 'text';
  };

  const attachmentFileMode = (attachment, previewMode) => {
    const contentType = String(attachment?.contentType || '').toLowerCase();
    const extension = attachmentExtension(attachment?.fileName);
    if (previewMode === 'pdf') return 'pdf';
    if (previewMode === 'html') return 'html';
    if (previewMode === 'markdown') return 'md';
    if (attachment?.kind === 'image') return 'image';
    if (previewMode === 'code') return 'code';
    if (
      contentType.includes('presentationml') ||
      contentType.includes('powerpoint') ||
      ['ppt', 'pptx', 'key'].includes(extension)
    ) {
      return 'ppt';
    }
    if (
      contentType.includes('wordprocessingml') ||
      contentType.includes('msword') ||
      ['doc', 'docx'].includes(extension)
    ) {
      return 'word';
    }
    if (
      contentType.includes('spreadsheetml') ||
      contentType.includes('ms-excel') ||
      ['xls', 'xlsx', 'csv'].includes(extension)
    ) {
      return 'excel';
    }
    if (previewMode === 'office') return 'office';
    return extension || previewMode || attachment?.kind || 'file';
  };

  const normalizePreviewText = (value) => String(value || '').replace(/\\r/g, '').trim();

  const truncatePreviewText = (value, maxLength) => {
    const normalized = normalizePreviewText(value);
    if (!normalized) return '';
    if (normalized.length <= maxLength) return normalized;
    return normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
  };

  const decodePreviewEntities = (value) =>
    String(value || '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");

  const stripHtmlPreviewText = (value) =>
    decodePreviewEntities(String(value || ''))
      .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
      .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
      .replace(/<!--[\\s\\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();

  const extractHtmlPreviewTitle = (value) => {
    const raw = String(value || '');
    const titleMatch = /<title[^>]*>([\\s\\S]*?)<\\/title>/i.exec(raw);
    if (titleMatch?.[1]) return decodePreviewEntities(titleMatch[1]).replace(/\\s+/g, ' ').trim();
    const headingMatch = /<h1[^>]*>([\\s\\S]*?)<\\/h1>/i.exec(raw);
    if (headingMatch?.[1]) return decodePreviewEntities(headingMatch[1]).replace(/\\s+/g, ' ').trim();
    return '';
  };

  const summarizeMarkdownPreview = (value) => {
    const lines = normalizePreviewText(value)
      .split(/\\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const heading = lines.find((line) => /^#{1,6}\\s+/.test(line))?.replace(/^#{1,6}\\s+/, '').trim() || '';
    const summary = lines
      .filter((line) => !/^#{1,6}\\s+/.test(line))
      .filter((line) => !/^\\x60{3}/.test(line))
      .filter((line) => !/^[-*_]{3,}$/.test(line))
      .join(' ')
      .replace(/\\s+/g, ' ')
      .trim();
    return {
      heading,
      summary,
    };
  };

  const previewBadgeLabel = (attachment, mode) => {
    if (mode === 'html') return 'HTML';
    if (mode === 'markdown') return 'MD';
    if (mode === 'code') return (attachmentExtension(attachment?.fileName) || 'code').toUpperCase();
    return embeddedLanguage === 'zh' ? '\u6587\u672c' : 'Text';
  };

  const attachmentCardLabel = (attachment, mode) => {
    if (mode === 'html') return 'HTML';
    if (mode === 'markdown') return 'MD';
    if (mode === 'code') return (attachmentExtension(attachment?.fileName) || 'CODE').toUpperCase().slice(0, 6);
    if (mode === 'pdf') return 'PDF';
    if (mode === 'office') return (attachmentExtension(attachment?.fileName) || 'FILE').toUpperCase().slice(0, 6);
    if (attachment?.kind === 'image') return 'IMG';
    return (attachmentExtension(attachment?.fileName) || (embeddedLanguage === 'zh' ? '\u6587\u4ef6' : 'FILE')).toUpperCase().slice(0, 6);
  };

  const attachmentMetaLine = (attachment, mode) => {
    return [
      formatBytes(attachment.sizeBytes),
      attachmentCardLabel(attachment, mode),
    ].filter(Boolean).join(' \u00b7 ');
  };

  const renderAttachmentTextPreview = (attachment) => {
    const rawPreview = normalizePreviewText(attachment.previewText);
    if (!rawPreview) return '';
    const mode = attachmentPreviewMode(attachment);
    if (mode === 'html') {
      const title = truncatePreviewText(extractHtmlPreviewTitle(rawPreview) || attachment.fileName, 88);
      const summary = truncatePreviewText(stripHtmlPreviewText(rawPreview), 260);
      return '<div class="collab-chat-rich-preview is-html">' +
        '<div class="collab-chat-rich-preview-head">' +
          '<span class="collab-chat-preview-badge">' + escapeHtml(previewBadgeLabel(attachment, mode)) + '</span>' +
          '<strong>' + escapeHtml(title) + '</strong>' +
        '</div>' +
        (summary ? '<p class="collab-chat-rich-preview-summary">' + escapeHtml(summary) + '</p>' : '') +
        '<details><summary class="collab-chat-link">' + escapeHtml(embeddedLanguage === 'zh' ? '\u67e5\u770b\u6e90\u7801\u7247\u6bb5' : 'View source snippet') + '</summary>' +
          '<pre class="collab-chat-preview is-code" data-preview-mode="html">' + escapeHtml(truncatePreviewText(rawPreview, 1400)) + '</pre>' +
        '</details>' +
      '</div>';
    }
    if (mode === 'markdown') {
      const markdownSummary = summarizeMarkdownPreview(rawPreview);
      const title = truncatePreviewText(markdownSummary.heading || attachment.fileName, 88);
      const summary = truncatePreviewText(markdownSummary.summary, 260);
      return '<div class="collab-chat-rich-preview is-markdown">' +
        '<div class="collab-chat-rich-preview-head">' +
          '<span class="collab-chat-preview-badge">' + escapeHtml(previewBadgeLabel(attachment, mode)) + '</span>' +
          '<strong>' + escapeHtml(title) + '</strong>' +
        '</div>' +
        (summary ? '<p class="collab-chat-rich-preview-summary">' + escapeHtml(summary) + '</p>' : '') +
        '<details><summary class="collab-chat-link">' + escapeHtml(embeddedLanguage === 'zh' ? '\u67e5\u770b Markdown \u539f\u6587' : 'View markdown snippet') + '</summary>' +
          '<pre class="collab-chat-preview is-code" data-preview-mode="markdown">' + escapeHtml(truncatePreviewText(rawPreview, 1400)) + '</pre>' +
        '</details>' +
      '</div>';
    }
    if (mode === 'code') {
      return '<div class="collab-chat-rich-preview is-code">' +
        '<div class="collab-chat-rich-preview-head">' +
          '<span class="collab-chat-preview-badge">' + escapeHtml(previewBadgeLabel(attachment, mode)) + '</span>' +
          '<strong>' + escapeHtml(embeddedLanguage === 'zh' ? '\u4ee3\u7801\u9884\u89c8' : 'Code preview') + '</strong>' +
        '</div>' +
        '<pre class="collab-chat-preview is-code" data-preview-mode="code">' + escapeHtml(truncatePreviewText(rawPreview, 1600)) + '</pre>' +
      '</div>';
    }
    return '<details><summary class="collab-chat-link">' + escapeHtml(labels.preview) + '</summary><pre class="collab-chat-preview">' + escapeHtml(truncatePreviewText(rawPreview, 1400)) + '</pre></details>';
  };

  const renderAttachmentFilePreview = (attachment, mode) => {
    if (mode === 'pdf') {
      const previewSrc = String(attachment.contentHref || '').trim();
      if (!previewSrc) return '';
      return '<div class="collab-chat-file-preview is-pdf">' +
        '<iframe class="collab-chat-file-preview-frame" src="' + escapeHtml(previewSrc + '#toolbar=0&navpanes=0&scrollbar=0') + '" loading="lazy" referrerpolicy="no-referrer" title="' + escapeHtml(attachment.fileName) + '"></iframe>' +
      '</div>';
    }
    if (mode === 'office') {
      return '<div class="collab-chat-file-preview is-office">' +
        '<div class="collab-chat-file-preview-copy">' +
          '<strong>' + escapeHtml(embeddedLanguage === 'zh' ? '\u7FA4\u804A\u6587\u4EF6' : 'Shared file') + '</strong>' +
          '<span>' + escapeHtml(embeddedLanguage === 'zh' ? '\u8FD9\u4EFD\u6587\u4EF6\u5DF2\u7ECF\u4F5C\u4E3A\u9644\u4EF6\u53D1\u8FDB\u534F\u4F5C\u7FA4\u804A\uFF0C\u53EF\u4EE5\u76F4\u63A5\u6253\u5F00\u6216\u4FDD\u5B58\u3002' : 'This file is attached directly in the collaboration chat. Open it or save it locally.') + '</span>' +
        '</div>' +
      '</div>';
    }
    return '';
  };

  const renderAttachments = (attachments) => {
    if (!Array.isArray(attachments) || attachments.length === 0) return '';
    return '<div class="collab-chat-attachments">' + attachments.map((attachment) => {
      state.attachmentIndex.set(attachment.attachmentId, attachment);
      const mode = attachmentPreviewMode(attachment);
      const fileMode = attachmentFileMode(attachment, mode);
      const meta = attachmentMetaLine(attachment, mode);
      let preview = '';
      if (attachment.kind === 'image') {
        preview = '<img class="collab-chat-image" src="' + escapeHtml(attachment.contentHref) + '" alt="' + escapeHtml(attachment.fileName) + '" />';
      } else if (attachment.kind === 'text' && attachment.previewText) {
        preview = renderAttachmentTextPreview(attachment);
      } else if (mode === 'pdf' || mode === 'office') {
        preview = renderAttachmentFilePreview(attachment, mode);
      }
      const openLabel = mode === 'html'
        ? (embeddedLanguage === 'zh' ? '\u6253\u5f00\u9875\u9762' : 'Open page')
        : labels.openFile;
      const openHint = mode === 'pdf' || mode === 'office'
        ? (embeddedLanguage === 'zh' ? '\u5DF2\u4F5C\u4E3A\u7FA4\u804A\u9644\u4EF6\u53D1\u9001' : 'Sent as a chat attachment')
        : (embeddedLanguage === 'zh' ? '\u70B9\u51FB\u76F4\u63A5\u6253\u5F00' : 'Click to open');
      return '<div class="collab-chat-attachment">' +
        '<div class="collab-chat-attachment-card" data-file-mode="' + escapeHtml(fileMode) + '" data-open-attachment="' + escapeHtml(attachment.attachmentId) + '" tabindex="0" role="button" aria-label="' + escapeHtml(openLabel + ': ' + attachment.fileName) + '">' +
          '<div class="collab-chat-attachment-copy">' +
            '<strong>' + escapeHtml(attachment.fileName) + '</strong>' +
            '<span>' + escapeHtml(meta) + '</span>' +
          '</div>' +
          '<span class="collab-chat-attachment-icon" data-file-mode="' + escapeHtml(fileMode) + '">' +
            '<span>' + escapeHtml(attachmentCardLabel(attachment, mode)) + '</span>' +
          '</span>' +
        '</div>' +
        (preview ? '<div class="collab-chat-attachment-preview">' + preview + '</div>' : '') +
        '<div class="collab-chat-attachment-actions">' +
          '<span class="collab-chat-attachment-openhint">' + escapeHtml(openHint) + '</span>' +
          '<div class="collab-chat-attachment-actions-inner">' +
            '<a class="collab-chat-link" href="' + escapeHtml(attachment.contentHref) + '" target="_blank" rel="noreferrer" data-open-link="' + escapeHtml(attachment.attachmentId) + '">' + escapeHtml(openLabel) + '</a>' +
            '<button class="collab-chat-ghost" type="button" data-save-attachment="' + escapeHtml(attachment.attachmentId) + '">' + escapeHtml(labels.save) + '</button>' +
          '</div>' +
        '</div>' +
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
      const livePreview = event.liveDraft === true || event.liveSessionBackfill === true;
      const pendingEvent = event.pending === true && !livePreview;
      const stoppedPending = pendingEvent && event.pendingState === 'stopped';
      const actorName = event.authorRole === 'user'
        ? ${serializeJsonForScript(input.language === "zh" ? "你" : "You")}
        : participant && participant.displayName
          ? participant.displayName
          : event.agentDisplayName || event.label || ${serializeJsonForScript(input.language === "zh" ? "系统" : "System")};
      const accent = participant && participant.identity && participant.identity.accent ? participant.identity.accent : '#0f766e';
      const imageHref = participant && participant.identity && participant.identity.imageHref ? participant.identity.imageHref : '';
      const eventClass = (event.authorRole === 'user' ? ' is-user' : event.authorRole === 'agent' ? ' is-agent' : '') + (historyToolEvent ? ' is-tool-event' : '') + (livePreview ? ' is-live' : '') + (pendingEvent ? ' is-pending' : '') + (stoppedPending ? ' is-stopped' : '');
      let eventBadge = pendingEvent
        ? ${serializeJsonForScript(input.language === "zh" ? "处理中" : "Working")}
        : livePreview
          ? ${serializeJsonForScript(input.language === "zh" ? "实时同步" : "Live sync")}
          : '';
      if (stoppedPending) {
        eventBadge = ${serializeJsonForScript(input.language === "zh" ? "已终止" : "Stopped")};
      }
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
              '<span>' + escapeHtml(event.label || '') + (eventBadge ? '<em class="collab-chat-event-badge">' + escapeHtml(eventBadge) + '</em>' : '') + '</span>' +
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
    const hasProjectedActivity = events.some((event) => event && (event.pending || event.liveDraft || event.liveSessionBackfill));
    presenceNode.classList.remove('is-busy', 'is-failed');
    if (state.sending || hasProjectedActivity || (latest && latest.type === 'dispatch_started')) {
      presenceNode.classList.add('is-busy');
    } else if (latest && latest.type === 'dispatch_failed') {
      presenceNode.classList.add('is-failed');
    }
  };

  const roomHasTerminableWork = () => {
    if (hasProjectedRoomActivity()) return true;
    const participants = Array.isArray(state.room?.participants) ? state.room.participants : [];
    return participants.some((participant) => {
      const executionState = String(participant?.executionState || '').trim().toLowerCase();
      return executionState === 'in_progress' || executionState === 'working' || executionState === 'processing';
    });
  };

  const syncComposerState = () => {
    const lock = roomLockMessage();
    const uploadsBusy = hasUploadingFiles();
    const writable = !lock;
    inputNode.disabled = !writable || state.sending || state.terminating || state.adjudicating;
    terminateButton.disabled = !writable || state.sending || state.terminating || state.adjudicating || state.roomMutationPending || uploadsBusy || !roomHasTerminableWork();
    sendButton.disabled =
      !writable ||
      state.sending ||
      state.terminating ||
      state.adjudicating ||
      uploadsBusy ||
      (!inputNode.value.trim() && state.uploads.length === 0);
    fileInput.disabled = !writable || state.sending || state.terminating || state.adjudicating || uploadsBusy;
    createButton.disabled = !writable || state.sending || state.terminating || state.adjudicating || state.roomMutationPending || uploadsBusy;
    adjudicateButtons.forEach((button) => {
      const activeOutcome = String(state.room?.manualOutcome?.outcome || '').trim().toLowerCase();
      const buttonOutcome = String(button.dataset.collabRoomAdjudicateOutcome || '').trim().toLowerCase();
      button.disabled =
        !writable ||
        state.sending ||
        state.terminating ||
        state.adjudicating ||
        state.roomMutationPending ||
        uploadsBusy ||
        !String(state.activeRoomId || '').trim();
      button.classList.toggle('is-active', Boolean(activeOutcome) && activeOutcome === buttonOutcome);
    });
    writeStateNode.textContent = lock || labels.writeReady;
    syncDeleteDialog();
  };

  const syncHeader = () => {
    const room = state.room;
    roomTitle.textContent = room && room.title ? room.title : labels.title;
    const meta = [];
    if (room && room.roomId) meta.push(room.roomId);
    if (room && room.updatedAt) meta.push(formatTime(room.updatedAt));
    if (room && room.manualOutcome && room.manualOutcome.label) meta.push(String(room.manualOutcome.label));
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
    syncDeleteDialog();
  };
`;
}

export { renderCollaborationChatScriptRendering };
