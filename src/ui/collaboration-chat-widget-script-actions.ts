import type { CollaborationChatScriptRenderInput } from "./collaboration-chat-widget-types";

function renderCollaborationChatScriptActions(_input: CollaborationChatScriptRenderInput): string {
  return `
  const maxQueuedAttachments = 5;
  const quickCreateTitleFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const buildQuickRoomTitle = () => {
    const prefix = embeddedLanguage === 'zh' ? '\\u65b0\\u5bf9\\u8bdd' : 'New chat';
    const formatted = quickCreateTitleFormatter.format(new Date());
    return (prefix + ' ' + formatted).trim();
  };

  const uploadReadyLabel = embeddedLanguage === 'zh'
    ? '\\u9644\\u4ef6\\u5df2\\u91cd\\u65b0\\u4e0a\\u4f20\\uff0c\\u53ef\\u7ee7\\u7eed\\u53d1\\u9001\\u6d88\\u606f\\u3002'
    : 'Attachment uploaded again. You can send the message now.';
  const uploadBusyMessage = embeddedLanguage === 'zh'
    ? '\\u5f53\\u524d\\u8fd8\\u6709\\u9644\\u4ef6\\u6b63\\u5728\\u4e0a\\u4f20\\uff0c\\u8bf7\\u7a0d\\u7b49\\u7247\\u523b\\u3002'
    : 'A file is still uploading. Wait for it to finish first.';
  const syncUploadUi = () => {
    renderUploads();
    renderRooms();
    syncComposerState();
  };

  const normalizeUploadErrorMessage = (error) => {
    const message = error instanceof Error ? error.message : String(error || '');
    const normalized = String(message || '').trim();
    if (!normalized) {
      return embeddedLanguage === 'zh' ? '\\u4e0a\\u4f20\\u5931\\u8d25\\uff0c\\u8bf7\\u91cd\\u8bd5\\u3002' : 'Upload failed. Please retry.';
    }
    if (/x-file-name header is required/i.test(normalized)) {
      return embeddedLanguage === 'zh'
        ? '\\u4e0a\\u4f20\\u5931\\u8d25\\uff1a\\u6d4f\\u89c8\\u5668\\u6ca1\\u6709\\u5e26\\u4e0a\\u6709\\u6548\\u6587\\u4ef6\\u540d\\uff0c\\u8bf7\\u91cd\\u65b0\\u9009\\u62e9\\u8be5\\u6587\\u4ef6\\u540e\\u91cd\\u8bd5\\u3002'
        : 'Upload failed: the browser did not send a valid file name. Re-select the file and try again.';
    }
    const attachmentLimitMatch = /Attachment exceeds the (\\d+) byte limit\\.?/i.exec(normalized);
    if (attachmentLimitMatch) {
      const limit = formatBytes(Number(attachmentLimitMatch[1] || 0));
      return embeddedLanguage === 'zh'
        ? '\\u4e0a\\u4f20\\u5931\\u8d25\\uff1a\\u5355\\u4e2a\\u9644\\u4ef6\\u4e0d\\u80fd\\u8d85\\u8fc7 ' + limit + '\\u3002'
        : 'Upload failed: each attachment must be under ' + limit + '.';
    }
    if (/attachment content is empty/i.test(normalized)) {
      return embeddedLanguage === 'zh'
        ? '\\u4e0a\\u4f20\\u5931\\u8d25\\uff1a\\u6587\\u4ef6\\u5185\\u5bb9\\u4e3a\\u7a7a\\uff0c\\u8bf7\\u91cd\\u65b0\\u9009\\u62e9\\u8be5\\u6587\\u4ef6\\u3002'
        : 'Upload failed: the file is empty. Re-select it and try again.';
    }
    if (/failed to fetch|networkerror|load failed/i.test(normalized)) {
      return embeddedLanguage === 'zh'
        ? '\\u4e0a\\u4f20\\u5931\\u8d25\\uff1a\\u5f53\\u524d\\u65e0\\u6cd5\\u8fde\\u63a5\\u5230\\u672c\\u5730\\u670d\\u52a1\\uff0c\\u8bf7\\u786e\\u8ba4 AI \\u5458\\u5de5\\u7cfb\\u7edf\\u4ecd\\u5728\\u8fd0\\u884c\\u3002'
        : 'Upload failed: the local server could not be reached. Make sure the AI employee system is still running.';
    }
    if (/internal server error/i.test(normalized)) {
      return embeddedLanguage === 'zh'
        ? '\\u4e0a\\u4f20\\u5931\\u8d25\\uff1a\\u670d\\u52a1\\u7aef\\u5904\\u7406\\u9644\\u4ef6\\u65f6\\u51fa\\u9519\\uff0c\\u8bf7\\u7a0d\\u540e\\u91cd\\u8bd5\\u3002'
        : 'Upload failed: the server hit an error while processing the attachment. Please try again.';
    }
    return normalized;
  };

  const uploadFileItem = async (item) => {
    item.status = 'uploading';
    item.errorMessage = '';
    syncUploadUi();
    try {
      const response = await fetch(endpoints.uploads + '?roomId=' + encodeURIComponent(state.activeRoomId), {
        method: 'POST',
        headers: mutationHeaders({
          'content-type': item.file.type || 'application/octet-stream',
          'x-file-name': encodeURIComponent(item.file.name),
        }),
        body: item.file,
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !payload.attachment?.attachmentId) {
        throw new Error(typeof payload?.error?.message === 'string' ? payload.error.message : labels.failed);
      }
      item.status = 'uploaded';
      item.attachmentId = payload.attachment.attachmentId;
      item.errorMessage = '';
      syncUploadUi();
      return item.attachmentId;
    } catch (error) {
      item.status = 'error';
      item.attachmentId = '';
      item.errorMessage = normalizeUploadErrorMessage(error);
      syncUploadUi();
      throw new Error(item.errorMessage);
    }
  };

  const retryUpload = async (uploadId) => {
    const lock = roomLockMessage();
    if (lock) {
      setStatus(lock, true);
      return;
    }
    if (hasUploadingFiles()) {
      setStatus(uploadBusyMessage, true);
      return;
    }
    const item = state.uploads.find((entry) => entry.id === uploadId);
    if (!item) return;
    item.status = 'queued';
    item.attachmentId = '';
    item.errorMessage = '';
    syncUploadUi();
    setStatus(labels.retrying, true);
    try {
      await uploadFileItem(item);
      setStatus(uploadReadyLabel);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : normalizeUploadErrorMessage(error), true);
    }
  };

  const activePollingDelay = () => {
    if (document.visibilityState === 'hidden') return 12000;
    const events = state.room && Array.isArray(state.room.events) ? state.room.events : [];
    const hasProjectedActivity = state.sending || events.some((event) => event && (event.pending || event.liveSessionBackfill));
    if (hasProjectedActivity) return state.expanded ? 550 : 1200;
    return state.expanded ? 900 : 4000;
  };

  const roomFetchLimit = () => (state.expanded ? 80 : 32);

  const buildRoomFetchParams = () => new URLSearchParams({
    roomId: state.activeRoomId,
    after: '0',
    limit: String(roomFetchLimit()),
    readSequence: String(roomCursor(state.activeRoomId)),
    lang: root.dataset.language || embeddedLanguage,
  });

  const applyRoomPayload = (room, reason = 'auto') => {
    if (!room || typeof room !== 'object') return;
    state.room = room;
    state.rooms = Array.isArray(room.rooms) ? room.rooms : [];
    state.participants = Array.isArray(room.participants) && room.participants.length > 0
      ? room.participants
      : state.participants;
    state.activeRoomId = String(room.roomId || state.activeRoomId);
    const canonicalReadSequence = Math.max(0, Number(room.readSequence || 0));
    if (canonicalReadSequence > roomCursor(state.activeRoomId)) {
      state.roomReadCursors[state.activeRoomId] = canonicalReadSequence;
      state.lastReadSequence = canonicalReadSequence;
      if (shouldPersistRoomViewState()) schedulePreferenceSave({ includeRoomViewState: true });
    }
    if (state.pendingScrollToLatestRoomId && String(state.pendingScrollToLatestRoomId).trim() !== state.activeRoomId) {
      state.pendingScrollToLatestRoomId = state.activeRoomId;
    }
    state.unreadCount = Number(room.unreadCount || 0);
    if (state.expanded) {
      markRoomRead(Number(room.lastSequence || 0), true);
      state.unreadCount = 0;
    }
    renderAll();
    if (reason === 'manual') setStatus(labels.refreshed);
  };

  const clearRoomStreamReconnect = () => {
    if (!state.roomStreamReconnectTimer) return;
    window.clearTimeout(state.roomStreamReconnectTimer);
    state.roomStreamReconnectTimer = 0;
  };

  const closeRoomStream = () => {
    clearRoomStreamReconnect();
    const current = state.roomStream;
    state.roomStream = null;
    state.roomStreamKey = '';
    if (current && typeof current.close === 'function') {
      try {
        current.close();
      } catch {}
    }
  };

  const delayRoomStreamReconnect = (delayMs = 2500) => {
    clearRoomStreamReconnect();
    state.roomStreamDisabledUntil = Date.now() + Math.max(500, Number(delayMs || 0));
    state.roomStreamReconnectTimer = window.setTimeout(() => {
      state.roomStreamReconnectTimer = 0;
      state.roomStreamDisabledUntil = 0;
      syncRoomStream();
      schedulePolling();
    }, Math.max(500, Number(delayMs || 0)));
  };

  const shouldUseRoomStream = () => {
    if (!state.autoRefresh || !state.expanded) return false;
    if (state.roomMutationPending) return false;
    if (document.visibilityState === 'hidden') return false;
    if (typeof window.EventSource !== 'function') return false;
    return Date.now() >= Number(state.roomStreamDisabledUntil || 0);
  };

  const currentRoomStreamKey = () => [
    String(state.activeRoomId || ''),
    String(roomFetchLimit()),
    String(root.dataset.language || embeddedLanguage),
  ].join('|');

  const syncRoomStream = () => {
    if (!shouldUseRoomStream()) {
      closeRoomStream();
      return false;
    }
    const nextKey = currentRoomStreamKey();
    if (state.roomStream && state.roomStreamKey === nextKey) {
      return true;
    }
    closeRoomStream();
    const params = new URLSearchParams({
      roomId: state.activeRoomId,
      limit: String(roomFetchLimit()),
      lang: root.dataset.language || embeddedLanguage,
    });
    const source = new window.EventSource(endpoints.roomStream + '?' + params.toString());
    state.roomStream = source;
    state.roomStreamKey = nextKey;
    source.onopen = () => {
      if (source !== state.roomStream) return;
      state.roomStreamDisabledUntil = 0;
    };
    source.addEventListener('snapshot', (event) => {
      if (source !== state.roomStream) return;
      let payload = {};
      try {
        payload = JSON.parse(String(event.data || '{}'));
      } catch {
        return;
      }
      if (!payload || typeof payload !== 'object' || !payload.room) {
        return;
      }
      applyRoomPayload(payload.room, 'stream');
    });
    source.addEventListener('room-error', () => {
      if (source !== state.roomStream) return;
      closeRoomStream();
      delayRoomStreamReconnect();
    });
    source.onerror = () => {
      if (source !== state.roomStream) return;
      closeRoomStream();
      delayRoomStreamReconnect();
    };
    return true;
  };

  const preferredRoomIdFromList = (rooms, fallbackRoomId = state.activeRoomId) => {
    if (!Array.isArray(rooms) || rooms.length === 0) return '';
    const fallback = String(fallbackRoomId || '').trim();
    if (fallback && rooms.some((room) => String(room.roomId || '').trim() === fallback)) {
      return fallback;
    }
    const flagged = rooms.find((room) => room && room.active && String(room.roomId || '').trim());
    if (flagged) return String(flagged.roomId || '').trim();
    return String(rooms[0]?.roomId || '').trim();
  };

  const tryRecoverMissingRoom = async () => {
    try {
      const response = await fetch(endpoints.rooms, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !Array.isArray(payload.rooms) || payload.rooms.length === 0) {
        return false;
      }
      state.rooms = payload.rooms;
      const activeExists = state.rooms.some((room) => String(room.roomId || '') === state.activeRoomId);
      const fallbackRoomId = activeExists
        ? state.activeRoomId
        : preferredRoomIdFromList(state.rooms, state.activeRoomId);
      if (!fallbackRoomId) {
        return false;
      }
      if (!activeExists) {
        state.activeRoomId = fallbackRoomId;
        state.pendingScrollToLatestRoomId = fallbackRoomId;
        state.lastReadSequence = roomCursor(fallbackRoomId);
        if (!(fallbackRoomId in state.roomReadCursors)) state.roomReadCursors[fallbackRoomId] = 0;
        if (shouldPersistRoomViewState()) schedulePreferenceSave({ includeRoomViewState: true });
      }
      renderRooms();
      return true;
    } catch {
      return false;
    }
  };

  const refreshRoom = async (reason = 'auto', allowRecovery = true) => {
    state.loading = true;
    syncComposerState();
    syncRefreshGuard();
    try {
      const params = buildRoomFetchParams();
      const response = await fetch(endpoints.room + '?' + params.toString(), {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !payload.room) {
        throw new Error(typeof payload?.error?.message === 'string' ? payload.error.message : labels.loading);
      }
      applyRoomPayload(payload.room, reason);
    } catch (error) {
      if (allowRecovery && await tryRecoverMissingRoom()) {
        await refreshRoom(reason, false);
        return;
      }
      if (state.room && String(state.room.roomId || '').trim() !== state.activeRoomId) {
        state.room = null;
        state.unreadCount = 0;
        renderAll();
      }
      setStatus(error instanceof Error ? error.message : labels.failed, true);
    } finally {
      state.loading = false;
      syncComposerState();
      syncRefreshGuard();
      syncRoomStream();
    }
  };

  const refreshRoomListOnly = async () => {
    try {
      const response = await fetch(endpoints.rooms, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !Array.isArray(payload.rooms)) return;
      state.rooms = payload.rooms;
      const preferredRoomId = preferredRoomIdFromList(state.rooms, state.activeRoomId);
      if (preferredRoomId && preferredRoomId !== state.activeRoomId) {
        state.activeRoomId = preferredRoomId;
        if (!(state.activeRoomId in state.roomReadCursors)) state.roomReadCursors[state.activeRoomId] = 0;
        state.lastReadSequence = roomCursor(state.activeRoomId);
        if (shouldPersistRoomViewState()) schedulePreferenceSave({ includeRoomViewState: true });
      }
      renderRooms();
    } catch {}
  };

  const schedulePolling = () => {
    if (state.pollingTimer) {
      window.clearTimeout(state.pollingTimer);
      state.pollingTimer = 0;
    }
    if (syncRoomStream()) return;
    if (!state.autoRefresh) return;
    const delay = activePollingDelay();
    state.pollingTimer = window.setTimeout(async () => {
      if (document.visibilityState === 'hidden' || state.roomMutationPending) {
        schedulePolling();
        return;
      }
      await (state.expanded ? refreshRoom('auto') : refreshRoomListOnly());
      schedulePolling();
    }, delay);
  };

  const refreshFromPresenceChange = async () => {
    if (!state.autoRefresh) {
      schedulePolling();
      return;
    }
    if (document.visibilityState === 'hidden') {
      schedulePolling();
      return;
    }
    if (state.loading || state.sending || state.roomMutationPending) {
      schedulePolling();
      return;
    }
    if (syncRoomStream()) return;
    await (state.expanded ? refreshRoom('auto') : refreshRoomListOnly());
    schedulePolling();
  };

  const activateRoom = async (roomId) => {
    if (hasUploadingFiles()) {
      setStatus(uploadBusyMessage, true);
      return;
    }
    const normalized = String(roomId || '').trim();
    if (!normalized) return;
    setRoomMenuOpen(false);
    state.activeRoomId = normalized;
    state.pendingScrollToLatestRoomId = normalized;
    state.lastReadSequence = roomCursor(normalized);
    if (!(normalized in state.roomReadCursors)) state.roomReadCursors[normalized] = 0;
    if (shouldPersistRoomViewState()) schedulePreferenceSave({ includeRoomViewState: true });
    renderAll();
    await refreshRoom('manual');
  };

  const createRoom = async () => {
    const lock = roomLockMessage();
    if (lock) {
      setStatus(lock, true);
      return;
    }
    if (hasUploadingFiles()) {
      setStatus(uploadBusyMessage, true);
      return;
    }
    setRoomMenuOpen(false);
    const title = buildQuickRoomTitle();
    setStatus(labels.creating, true);
    state.roomMutationPending = true;
    syncComposerState();
    renderRooms();
    try {
      const response = await fetch(endpoints.rooms, {
        method: 'POST',
        headers: mutationHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          title,
          projectTitle: title,
        }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !payload.room?.roomId) {
        throw new Error(typeof payload?.error?.message === 'string' ? payload.error.message : labels.failed);
      }
      state.activeRoomId = String(payload.room.roomId);
      state.pendingScrollToLatestRoomId = state.activeRoomId;
      state.roomReadCursors[state.activeRoomId] = 0;
      if (shouldPersistRoomViewState()) schedulePreferenceSave({ includeRoomViewState: true });
      await refreshRoom('manual');
      window.requestAnimationFrame(() => {
        inputNode.focus();
      });
      setStatus(
        embeddedLanguage === 'zh'
          ? '\\u65b0\\u5bf9\\u8bdd\\u5df2\\u521b\\u5efa\\uff0c\\u53ef\\u4ee5\\u76f4\\u63a5\\u53d1\\u9001\\u6587\\u4ef6\\u3002'
          : 'New chat ready. You can send files now.',
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : labels.failed, true);
    } finally {
      state.roomMutationPending = false;
      syncComposerState();
      renderRooms();
    }
  };

  const requestDeleteRoom = (roomId = state.activeRoomId) => {
    const lock = roomLockMessage();
    if (lock) {
      setStatus(lock, true);
      return;
    }
    if (hasUploadingFiles()) {
      setStatus(uploadBusyMessage, true);
      return;
    }
    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) return;
    openDeleteConfirm(normalizedRoomId);
  };

  const deleteRoom = async (roomId = state.activeRoomId) => {
    const lock = roomLockMessage();
    if (lock) {
      setStatus(lock, true);
      return;
    }
    if (hasUploadingFiles()) {
      setStatus(uploadBusyMessage, true);
      return;
    }
    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) return;
    setRoomMenuOpen(false);
    setStatus(labels.deleting, true);
    state.roomMutationPending = true;
    syncComposerState();
    renderRooms();
    try {
      const response = await fetch(endpoints.rooms + '/' + encodeURIComponent(normalizedRoomId), {
        method: 'DELETE',
        headers: mutationHeaders({}),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !payload.deleted?.fallbackRoomId) {
        throw new Error(typeof payload?.error?.message === 'string' ? payload.error.message : labels.failed);
      }
      if (normalizedRoomId === state.activeRoomId) {
        state.activeRoomId = String(payload.deleted.fallbackRoomId);
        state.pendingScrollToLatestRoomId = state.activeRoomId;
        if (!(state.activeRoomId in state.roomReadCursors)) state.roomReadCursors[state.activeRoomId] = 0;
        if (shouldPersistRoomViewState()) schedulePreferenceSave({ includeRoomViewState: true });
      }
      await refreshRoom('manual');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : labels.failed, true);
    } finally {
      state.roomMutationPending = false;
      closeDeleteConfirm(true);
      syncComposerState();
      renderRooms();
    }
  };

  const queueFiles = (files) => {
    const incoming = Array.from(files || []).filter((file) => file && typeof file.name === 'string');
    if (incoming.length === 0) return;
    const remainingSlots = Math.max(0, maxQueuedAttachments - state.uploads.length);
    if (remainingSlots <= 0) {
      setStatus(
        embeddedLanguage === 'zh'
          ? '\\u6bcf\\u6761\\u6d88\\u606f\\u6700\\u591a\\u53d1\\u9001 5 \\u4e2a\\u9644\\u4ef6\\u3002'
          : 'A message can include up to 5 attachments.',
        true,
      );
      return;
    }
    const accepted = incoming.slice(0, remainingSlots);
    accepted.forEach((file) => {
      state.uploads.push({
        id: Math.random().toString(36).slice(2),
        file,
        status: 'queued',
        attachmentId: '',
        errorMessage: '',
      });
    });
    if (incoming.length > accepted.length) {
      setStatus(
        embeddedLanguage === 'zh'
          ? '\\u5df2\\u52a0\\u5165\\u524d 5 \\u4e2a\\u9644\\u4ef6\\uff0c\\u5176\\u4f59\\u6587\\u4ef6\\u8bf7\\u5206\\u5f00\\u53d1\\u9001\\u3002'
          : 'Queued the first 5 attachments. Send the rest in another message.',
        true,
      );
    } else {
      setStatus(
        embeddedLanguage === 'zh'
          ? '\\u9644\\u4ef6\\u5df2\\u52a0\\u5165\\u53d1\\u9001\\u961f\\u5217\\u3002'
          : 'Attachments added to the send queue.',
      );
    }
    syncUploadUi();
  };

  const uploadPendingFiles = async () => {
    const uploadedIds = [];
    for (const item of state.uploads) {
      if (item.status === 'uploaded' && item.attachmentId) {
        uploadedIds.push(item.attachmentId);
        continue;
      }
      uploadedIds.push(await uploadFileItem(item));
    }
    return uploadedIds;
  };

  const sendCurrentMessage = async () => {
    const lock = roomLockMessage();
    if (lock) {
      setStatus(lock, true);
      return;
    }
    if (hasUploadingFiles()) {
      setStatus(uploadBusyMessage, true);
      return;
    }
    const text = inputNode.value.trim();
    if (!text && state.uploads.length === 0) return;
    setRoomMenuOpen(false);
    state.sending = true;
    state.pendingScrollToLatestRoomId = state.activeRoomId;
    syncComposerState();
    syncRefreshGuard();
    setStatus(labels.sending, true);
    try {
      const attachmentIds = await uploadPendingFiles();
      const response = await fetch(endpoints.messages, {
        method: 'POST',
        headers: mutationHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          roomId: state.activeRoomId,
          text,
          attachmentIds,
          language: root.dataset.language || embeddedLanguage,
        }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true) {
        throw new Error(typeof payload?.error?.message === 'string' ? payload.error.message : labels.failed);
      }
      inputNode.value = '';
      fileInput.value = '';
      state.uploads = [];
      mentionsNode.hidden = true;
      mentionsNode.innerHTML = '';
      state.mentionMatches = [];
      renderUploads();
      routeNode.textContent = labels.routeDefault;
      await refreshRoom('manual');
      window.setTimeout(() => { void refreshRoom('auto'); }, 900);
      window.setTimeout(() => { void refreshRoom('auto'); }, 2400);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : labels.failed, true);
    } finally {
      state.sending = false;
      renderRooms();
      syncComposerState();
      syncRefreshGuard();
    }
  };
`;
}

export { renderCollaborationChatScriptActions };
