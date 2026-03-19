import type { CollaborationChatScriptRenderInput } from "./collaboration-chat-widget-types";

function renderCollaborationChatScriptActions(_input: CollaborationChatScriptRenderInput): string {
  return `
  const activePollingDelay = () => {
    if (document.visibilityState === 'hidden') return 12000;
    return state.expanded ? 900 : 4000;
  };

  const refreshRoom = async (reason = 'auto') => {
    state.loading = true;
    syncComposerState();
    syncRefreshGuard();
    try {
      const params = new URLSearchParams({
        roomId: state.activeRoomId,
        after: '0',
        limit: state.expanded ? '80' : '32',
        readSequence: String(roomCursor(state.activeRoomId)),
        lang: root.dataset.language || embeddedLanguage,
      });
      const response = await fetch(endpoints.room + '?' + params.toString(), {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !payload.room) {
        throw new Error(typeof payload?.error?.message === 'string' ? payload.error.message : labels.loading);
      }
      state.room = payload.room;
      state.rooms = Array.isArray(payload.room.rooms) ? payload.room.rooms : [];
      state.participants = Array.isArray(payload.room.participants) && payload.room.participants.length > 0
        ? payload.room.participants
        : state.participants;
      state.activeRoomId = String(payload.room.roomId || state.activeRoomId);
      if (state.pendingScrollToLatestRoomId && String(state.pendingScrollToLatestRoomId).trim() !== state.activeRoomId) {
        state.pendingScrollToLatestRoomId = state.activeRoomId;
      }
      state.unreadCount = Number(payload.room.unreadCount || 0);
      if (state.expanded) {
        markRoomRead(Number(payload.room.lastSequence || 0), true);
        state.unreadCount = 0;
      }
      renderAll();
      if (reason === 'manual') setStatus(labels.refreshed);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : labels.failed, true);
    } finally {
      state.loading = false;
      syncComposerState();
      syncRefreshGuard();
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
      if (!state.rooms.some((room) => String(room.roomId || '') === state.activeRoomId) && state.rooms[0]?.roomId) {
        state.activeRoomId = String(state.rooms[0].roomId);
        if (!(state.activeRoomId in state.roomReadCursors)) state.roomReadCursors[state.activeRoomId] = 0;
        schedulePreferenceSave();
      }
      renderRooms();
    } catch {}
  };

  const schedulePolling = () => {
    if (state.pollingTimer) {
      window.clearTimeout(state.pollingTimer);
      state.pollingTimer = 0;
    }
    if (!state.autoRefresh) return;
    const delay = activePollingDelay();
    state.pollingTimer = window.setTimeout(async () => {
      if (document.visibilityState === 'hidden') {
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
    if (state.loading || state.sending) {
      schedulePolling();
      return;
    }
    await (state.expanded ? refreshRoom('auto') : refreshRoomListOnly());
    schedulePolling();
  };

  const activateRoom = async (roomId, remote = true) => {
    const normalized = String(roomId || '').trim();
    if (!normalized) return;
    setRoomMenuOpen(false);
    state.activeRoomId = normalized;
    state.pendingScrollToLatestRoomId = normalized;
    state.lastReadSequence = roomCursor(normalized);
    if (!(normalized in state.roomReadCursors)) state.roomReadCursors[normalized] = 0;
    schedulePreferenceSave();
    renderAll();
    if (remote && canMutateRoom()) {
      try {
        await fetch(endpoints.rooms + '/' + encodeURIComponent(normalized) + '/activate', {
          method: 'POST',
          headers: mutationHeaders({}),
          cache: 'no-store',
        });
      } catch {}
    }
    await refreshRoom('manual');
  };

  const createRoom = async () => {
    const lock = roomLockMessage();
    if (lock) {
      setStatus(lock, true);
      return;
    }
    setRoomMenuOpen(false);
    const projectTitleInput = window.prompt(labels.projectPrompt, '') || '';
    const projectTitle = projectTitleInput.trim();
    if (!projectTitle) {
      setStatus(labels.projectRequired, true);
      return;
    }
    const title = window.prompt(labels.createPrompt, projectTitle) || '';
    setStatus(labels.creating, true);
    try {
      const response = await fetch(endpoints.rooms, {
        method: 'POST',
        headers: mutationHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          projectTitle,
          ...(title.trim() ? { title: title.trim() } : {}),
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
      schedulePreferenceSave();
      await refreshRoom('manual');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : labels.failed, true);
    }
  };

  const deleteRoom = async () => {
    const lock = roomLockMessage();
    if (lock) {
      setStatus(lock, true);
      return;
    }
    setRoomMenuOpen(false);
    if (!window.confirm(labels.deleteConfirm)) return;
    setStatus(labels.deleting, true);
    try {
      const response = await fetch(endpoints.rooms + '/' + encodeURIComponent(state.activeRoomId), {
        method: 'DELETE',
        headers: mutationHeaders({}),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !payload.deleted?.fallbackRoomId) {
        throw new Error(typeof payload?.error?.message === 'string' ? payload.error.message : labels.failed);
      }
      state.activeRoomId = String(payload.deleted.fallbackRoomId);
      state.pendingScrollToLatestRoomId = state.activeRoomId;
      if (!(state.activeRoomId in state.roomReadCursors)) state.roomReadCursors[state.activeRoomId] = 0;
      schedulePreferenceSave();
      await refreshRoom('manual');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : labels.failed, true);
    }
  };

  const queueFiles = (files) => {
    Array.from(files || []).slice(0, 5).forEach((file) => {
      state.uploads.push({
        id: Math.random().toString(36).slice(2),
        file,
        status: 'queued',
        attachmentId: '',
      });
    });
    renderUploads();
    syncComposerState();
  };

  const uploadPendingFiles = async () => {
    const uploadedIds = [];
    for (const item of state.uploads) {
      if (item.status === 'uploaded' && item.attachmentId) {
        uploadedIds.push(item.attachmentId);
        continue;
      }
      item.status = 'uploading';
      renderUploads();
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
        uploadedIds.push(item.attachmentId);
      } catch (error) {
        item.status = 'error';
        renderUploads();
        throw error;
      }
      renderUploads();
    }
    return uploadedIds;
  };

  const sendCurrentMessage = async () => {
    const lock = roomLockMessage();
    if (lock) {
      setStatus(lock, true);
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
      syncComposerState();
      syncRefreshGuard();
    }
  };
`;
}

export { renderCollaborationChatScriptActions };
