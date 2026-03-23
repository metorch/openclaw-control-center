import type { CollaborationChatScriptRenderInput } from "./collaboration-chat-widget-types";

function serializeJsonForScript(input: unknown): string {
  return JSON.stringify(input)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function renderCollaborationChatScriptPrelude(input: CollaborationChatScriptRenderInput): string {
  return `<script>
(() => {
  const root = document.querySelector('[data-collab-chat]');
  if (!(root instanceof HTMLElement)) return;

  const labels = ${serializeJsonForScript(input.labels)};
  const embeddedParticipants = ${serializeJsonForScript(input.participants)};
  const embeddedPreferences = ${serializeJsonForScript(input.preferences)};
  const primaryAgentId = ${serializeJsonForScript(input.primaryAgentId)};
  const primaryDisplayName = ${serializeJsonForScript(input.primaryDisplayName)};
  const embeddedLanguage = ${serializeJsonForScript(input.language)};
  const mutationEventName = 'openclaw:mutation-auth-changed';
  const panelSizeStorageKey = 'openclaw:collab-chat-size:v2';
  const endpoints = {
    room: '/api/collaboration/room',
    roomStream: '/api/collaboration/room/stream',
    rooms: '/api/collaboration/rooms',
    uploads: '/api/collaboration/room/uploads',
    messages: '/api/collaboration/room/messages',
    terminate: '/api/collaboration/room/terminate',
    preferences: '/api/ui/preferences',
  };

  const toggleButton = root.querySelector('[data-collab-chat-toggle]');
  const panel = root.querySelector('[data-collab-chat-panel]');
  const resizeHandle = root.querySelector('[data-collab-chat-resize]');
  const launcherUnread = root.querySelector('[data-collab-chat-unread]');
  const launcherStatus = root.querySelector('[data-collab-chat-launcher-status]');
  const refreshButton = root.querySelector('[data-collab-chat-refresh]');
  const autoButton = root.querySelector('[data-collab-chat-auto]');
  const createButton = root.querySelector('[data-collab-room-create]');
  const roomTitle = root.querySelector('[data-collab-chat-room-title]');
  const roomMeta = root.querySelector('[data-collab-chat-room-meta]');
  const roomTrigger = root.querySelector('[data-collab-room-trigger]');
  const roomTriggerTitle = root.querySelector('[data-collab-room-trigger-title]');
  const roomTriggerMeta = root.querySelector('[data-collab-room-trigger-meta]');
  const roomList = root.querySelector('[data-collab-room-list]');
  const rosterList = root.querySelector('[data-collab-chat-roster]');
  const personCard = root.querySelector('[data-collab-chat-person-card]');
  const feed = root.querySelector('[data-collab-chat-feed]');
  const emptyState = root.querySelector('[data-collab-chat-empty]');
  const eventsList = root.querySelector('[data-collab-chat-events]');
  const composer = root.querySelector('[data-collab-chat-composer]');
  const dropHint = root.querySelector('[data-collab-chat-drop-hint]');
  const uploadList = root.querySelector('[data-collab-chat-upload-list]');
  const inputShell = root.querySelector('[data-collab-chat-input-shell]');
  const inputNode = root.querySelector('[data-collab-chat-input]');
  const terminateButton = root.querySelector('[data-collab-chat-terminate]');
  const sendButton = root.querySelector('[data-collab-chat-send]');
  const fileInput = root.querySelector('[data-collab-chat-files]');
  const mentionsNode = root.querySelector('[data-collab-mentions]');
  const routeNode = root.querySelector('[data-collab-chat-route]');
  const statusNode = root.querySelector('[data-collab-chat-status]');
  const writeStateNode = root.querySelector('[data-collab-chat-write-state]');
  const panelUnread = root.querySelector('[data-collab-chat-panel-unread]');
  const presenceNode = root.querySelector('[data-collab-chat-presence]');
  const projectTitleNode = root.querySelector('[data-collab-chat-project-title]');
  const projectSummaryNode = root.querySelector('[data-collab-chat-project-summary]');
  const projectOpenTasksNode = root.querySelector('[data-collab-chat-project-open-tasks]');
  const deleteDialog = root.querySelector('[data-collab-chat-delete-dialog]');
  const deleteDialogSurface = root.querySelector('[data-collab-chat-delete-surface]');
  const deleteDialogTitle = root.querySelector('[data-collab-chat-delete-title]');
  const deleteDialogMessage = root.querySelector('[data-collab-chat-delete-message]');
  const deleteDialogCancel = root.querySelector('[data-collab-chat-delete-cancel]');
  const deleteDialogConfirm = root.querySelector('[data-collab-chat-delete-confirm]');

  if (
    !(toggleButton instanceof HTMLButtonElement) ||
    !(panel instanceof HTMLElement) ||
    !(resizeHandle instanceof HTMLElement) ||
    !(launcherUnread instanceof HTMLElement) ||
    !(launcherStatus instanceof HTMLElement) ||
    !(refreshButton instanceof HTMLButtonElement) ||
    !(autoButton instanceof HTMLButtonElement) ||
    !(createButton instanceof HTMLButtonElement) ||
    !(roomTitle instanceof HTMLElement) ||
    !(roomMeta instanceof HTMLElement) ||
    !(roomTrigger instanceof HTMLButtonElement) ||
    !(roomTriggerTitle instanceof HTMLElement) ||
    !(roomTriggerMeta instanceof HTMLElement) ||
    !(roomList instanceof HTMLElement) ||
    !(rosterList instanceof HTMLElement) ||
    !(personCard instanceof HTMLElement) ||
    !(feed instanceof HTMLElement) ||
    !(emptyState instanceof HTMLElement) ||
    !(eventsList instanceof HTMLOListElement) ||
    !(composer instanceof HTMLElement) ||
    !(dropHint instanceof HTMLElement) ||
    !(uploadList instanceof HTMLElement) ||
    !(inputShell instanceof HTMLElement) ||
    !(inputNode instanceof HTMLTextAreaElement) ||
    !(terminateButton instanceof HTMLButtonElement) ||
    !(sendButton instanceof HTMLButtonElement) ||
    !(fileInput instanceof HTMLInputElement) ||
    !(mentionsNode instanceof HTMLElement) ||
    !(routeNode instanceof HTMLElement) ||
    !(statusNode instanceof HTMLElement) ||
    !(writeStateNode instanceof HTMLElement) ||
    !(panelUnread instanceof HTMLElement) ||
    !(presenceNode instanceof HTMLElement) ||
    !(projectTitleNode instanceof HTMLElement) ||
    !(projectSummaryNode instanceof HTMLElement) ||
    !(projectOpenTasksNode instanceof HTMLElement) ||
    !(deleteDialog instanceof HTMLElement) ||
    !(deleteDialogSurface instanceof HTMLElement) ||
    !(deleteDialogTitle instanceof HTMLElement) ||
    !(deleteDialogMessage instanceof HTMLElement) ||
    !(deleteDialogCancel instanceof HTMLButtonElement) ||
    !(deleteDialogConfirm instanceof HTMLButtonElement)
  ) {
    return;
  }

  const state = {
    expanded: embeddedPreferences.expanded === true,
    autoRefresh: embeddedPreferences.autoRefresh !== false,
    activeRoomId: String(embeddedPreferences.activeRoomId || root.dataset.roomId || 'global').trim() || 'global',
    lastReadSequence: Number(embeddedPreferences.lastReadSequence || root.dataset.lastReadSequence || 0) || 0,
    roomReadCursors: { ...(embeddedPreferences.roomReadCursors || {}) },
    participants: Array.isArray(embeddedParticipants) ? embeddedParticipants.slice() : [],
    rooms: [],
    room: null,
    uploads: [],
    attachmentIndex: new Map(),
    loading: false,
    sending: false,
    terminating: false,
    roomStream: null,
    roomStreamKey: '',
    roomStreamLastSnapshotAt: 0,
    roomStreamReconnectTimer: 0,
    roomStreamDisabledUntil: 0,
    pollingTimer: 0,
    prefsTimer: 0,
    prefsIncludeRoomViewState: false,
    statusTimer: 0,
    mentionMatches: [],
    activeMentionIndex: 0,
    unreadCount: 0,
    roomMenuOpen: false,
    roomMutationPending: false,
    draggingFiles: false,
    fileDragDepth: 0,
    panelSize: null,
    resizeSession: null,
    personCardHideTimer: 0,
    activePersonCardAgentId: '',
    pendingDeleteRoomId: '',
    pendingDeleteRoomLabel: '',
    pendingScrollToLatestRoomId: String(embeddedPreferences.activeRoomId || root.dataset.roomId || 'global').trim() || 'global',
  };

  const loadStoredPanelSize = () => {
    try {
      const raw = window.localStorage.getItem(panelSizeStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const width = Number(parsed.width);
      const height = Number(parsed.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
      return { width, height };
    } catch {
      return null;
    }
  };

  const defaultPanelSize = () => ({
    width: window.innerWidth <= 1480 ? 396 : 416,
    height: window.innerHeight <= 920 ? 648 : 688,
  });

  state.panelSize = loadStoredPanelSize() || defaultPanelSize();

  const roomCursor = (roomId) => {
    const value = Number(state.roomReadCursors[roomId] || 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  const hasUploadingFiles = () =>
    Array.isArray(state.uploads) && state.uploads.some((item) => item && item.status === 'uploading');

  if (!(state.activeRoomId in state.roomReadCursors)) {
    state.roomReadCursors[state.activeRoomId] = state.lastReadSequence;
  }

  const locale = ${JSON.stringify(input.language === "zh" ? "zh-CN" : "en-US")};
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const roomDateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  });
  const roomClockFormatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const escapeHtml = (value) =>
    String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const formatBytes = (value) => {
    const size = Number(value || 0);
    if (!Number.isFinite(size) || size <= 0) return '0 B';
    if (size < 1024) return String(size) + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(size < 10 * 1024 ? 1 : 0) + ' KB';
    return (size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
  };

  const formatTime = (value) => {
    const timestamp = Date.parse(String(value || ''));
    if (!Number.isFinite(timestamp)) return String(value || '');
    return timeFormatter.format(new Date(timestamp));
  };

  const formatRoomDate = (value) => {
    const timestamp = Date.parse(String(value || ''));
    if (!Number.isFinite(timestamp)) return '';
    return roomDateFormatter.format(new Date(timestamp));
  };

  const formatRoomClock = (value) => {
    const timestamp = Date.parse(String(value || ''));
    if (!Number.isFinite(timestamp)) return '';
    return roomClockFormatter.format(new Date(timestamp));
  };

  const hasFileTransfer = (dataTransfer) => {
    if (!dataTransfer) return false;
    const files = Array.from(dataTransfer.files || []).filter(Boolean);
    if (files.length > 0) return true;
    const types = Array.from(dataTransfer.types || []).map((value) => String(value || ''));
    if (types.includes('Files')) return true;
    return Array.from(dataTransfer.items || []).some((item) => item && item.kind === 'file');
  };

  const collectTransferFiles = (dataTransfer) => {
    if (!dataTransfer) return [];
    const fromItems = Array.from(dataTransfer.items || [])
      .map((item) => (item && item.kind === 'file' && typeof item.getAsFile === 'function' ? item.getAsFile() : null))
      .filter(Boolean);
    const fromFiles = Array.from(dataTransfer.files || []).filter(Boolean);
    return (fromItems.length > 0 ? fromItems : fromFiles)
      .filter((file) => file && typeof file.name === 'string' && file.name.trim() !== '');
  };

  const syncFileDropState = (nextActive, resetDepth = false) => {
    state.draggingFiles = Boolean(nextActive) && state.expanded;
    if (resetDepth) state.fileDragDepth = 0;
    panel.classList.toggle('is-file-drop-target', state.draggingFiles);
    inputShell.classList.toggle('is-file-drop-target', state.draggingFiles);
    composer.classList.toggle('is-file-drop-target', state.draggingFiles);
    dropHint.hidden = !state.draggingFiles;
  };

  const clearFileDropState = () => {
    syncFileDropState(false, true);
  };

  const deleteDialogTitleText = embeddedLanguage === 'zh' ? '确认删除对话' : 'Delete chat';
  const deleteDialogMessageForRoom = (roomLabel) => {
    const normalizedLabel = String(roomLabel || '').trim();
    if (!normalizedLabel) return labels.deleteConfirm;
    if (embeddedLanguage === 'zh') {
      return '确认删除“' + normalizedLabel + '”吗？这会同时删除对应的本地协作记录、相关本地文件，以及 OpenClaw 原始聊天记录。';
    }
    return 'Delete "' + normalizedLabel + '"? This also removes the linked local collaboration record, related local files, and the original OpenClaw chat transcript.';
  };

  const resolveRoomLabel = (roomId) => {
    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) return labels.title;
    const matchingRoom = Array.isArray(state.rooms)
      ? state.rooms.find((room) => String(room.roomId || '') === normalizedRoomId)
      : null;
    return String(matchingRoom?.title || matchingRoom?.roomId || normalizedRoomId || labels.title);
  };

  const syncDeleteDialog = () => {
    const open = Boolean(String(state.pendingDeleteRoomId || '').trim());
    deleteDialog.hidden = !open;
    deleteDialogTitle.textContent = deleteDialogTitleText;
    deleteDialogMessage.textContent = deleteDialogMessageForRoom(state.pendingDeleteRoomLabel);
    deleteDialogCancel.disabled = state.roomMutationPending;
    deleteDialogConfirm.disabled = !open || state.roomMutationPending;
  };

  const closeDeleteConfirm = (force = false) => {
    if (state.roomMutationPending && !force) return;
    state.pendingDeleteRoomId = '';
    state.pendingDeleteRoomLabel = '';
    syncDeleteDialog();
  };

  const openDeleteConfirm = (roomId) => {
    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) return;
    setRoomMenuOpen(false);
    state.pendingDeleteRoomId = normalizedRoomId;
    state.pendingDeleteRoomLabel = resolveRoomLabel(normalizedRoomId);
    syncDeleteDialog();
    window.requestAnimationFrame(() => {
      if (!deleteDialog.hidden) deleteDialogConfirm.focus();
    });
  };

  const isCompactViewport = () => window.innerWidth <= 760 || window.innerHeight <= 720;

  const clampPanelSize = (size) => {
    const defaults = defaultPanelSize();
    const minWidth = window.innerWidth <= 1320 ? 340 : 360;
    const minHeight = window.innerHeight <= 840 ? 380 : 420;
    const maxWidth = Math.max(minWidth, window.innerWidth - 28);
    const maxHeight = Math.max(minHeight, window.innerHeight - (isCompactViewport() ? 24 : 104));
    return {
      width: Math.max(minWidth, Math.min(maxWidth, Number(size?.width || defaults.width))),
      height: Math.max(minHeight, Math.min(maxHeight, Number(size?.height || defaults.height))),
    };
  };

  const persistPanelSize = () => {
    try {
      if (!state.panelSize) return;
      window.localStorage.setItem(panelSizeStorageKey, JSON.stringify(state.panelSize));
    } catch {}
  };

  const applyPanelSize = (persist = false) => {
    if (isCompactViewport()) {
      panel.style.removeProperty('width');
      panel.style.removeProperty('height');
      panel.style.removeProperty('max-width');
      panel.classList.remove('is-resizable');
      return;
    }
    state.panelSize = clampPanelSize(state.panelSize || defaultPanelSize());
    panel.style.width = String(state.panelSize.width) + 'px';
    panel.style.height = String(state.panelSize.height) + 'px';
    panel.style.maxWidth = String(Math.max(window.innerWidth <= 1320 ? 340 : 360, window.innerWidth - 28)) + 'px';
    panel.classList.add('is-resizable');
    if (persist) persistPanelSize();
  };

  const setStatus = (message, sticky = false) => {
    statusNode.textContent = String(message || labels.justNow);
    if (state.statusTimer) {
      window.clearTimeout(state.statusTimer);
      state.statusTimer = 0;
    }
    if (!sticky && message && message !== labels.justNow) {
      state.statusTimer = window.setTimeout(() => {
        statusNode.textContent = labels.justNow;
      }, 2200);
    }
  };

  const getMutationState = () =>
    typeof window.__openclawGetMutationAuthState === 'function'
      ? window.__openclawGetMutationAuthState()
      : {
          gateRequired: false,
          tokenConfigured: root.dataset.writeAvailable === '1',
          unlocked: root.dataset.writeEnabled === '1',
          canMutate: root.dataset.writeEnabled === '1',
          writeAccessAvailable: root.dataset.writeAvailable === '1',
        };

  const mutationHeaders = (headers = {}) =>
    typeof window.__openclawGetMutationAuthHeaders === 'function'
      ? window.__openclawGetMutationAuthHeaders(headers)
      : headers;

  const canMutateRoom = () => Boolean(getMutationState().canMutate);

  const roomLockMessage = () => {
    const mutationState = getMutationState();
    if (!mutationState.gateRequired) return '';
    if (!mutationState.tokenConfigured) return labels.roomUnavailable;
    if (!mutationState.canMutate) return labels.roomLocked;
    return '';
  };

  const shouldPersistRoomViewState = () => isPersistableRoomId(state.activeRoomId);

  const buildPreferencePatch = (includeRoomViewState = false) => {
    const collaborationChat = {
      expanded: state.expanded,
      autoRefresh: state.autoRefresh,
    };
    if (includeRoomViewState && isPersistableRoomId(state.activeRoomId)) {
      collaborationChat.activeRoomId = state.activeRoomId;
      collaborationChat.lastReadSequence = state.lastReadSequence;
      collaborationChat.roomReadCursors = state.roomReadCursors;
    }
    return { collaborationChat };
  };

  const schedulePreferenceSave = (options = {}) => {
    const includeRoomViewState = Boolean(options && options.includeRoomViewState === true);
    state.prefsIncludeRoomViewState = state.prefsIncludeRoomViewState || includeRoomViewState;
    if (state.prefsTimer) window.clearTimeout(state.prefsTimer);
    state.prefsTimer = window.setTimeout(async () => {
      const includeRoomViewStateOnFlush = state.prefsIncludeRoomViewState && shouldPersistRoomViewState();
      state.prefsIncludeRoomViewState = false;
      try {
        await fetch(endpoints.preferences, {
          method: 'PATCH',
          headers: mutationHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify(buildPreferencePatch(includeRoomViewStateOnFlush)),
          cache: 'no-store',
        });
      } catch {}
    }, 140);
  };

  const syncRefreshGuard = () => {
    if (typeof window.__openclawSetRefreshGuard !== 'function') return;
    window.__openclawSetRefreshGuard(
      'collaboration-chat',
      Boolean(state.expanded && (state.sending || state.loading || state.uploads.length > 0)),
      state.sending ? labels.sending : state.loading ? labels.loading : '',
    );
  };

  const findParticipant = (agentId) => {
    const key = String(agentId || '').trim().toLowerCase();
    return state.participants.find((item) => String(item.agentId || '').trim().toLowerCase() === key) || null;
  };

  const participantMentionAlias = (participant) => {
    const explicit = String(participant?.mention || '').trim();
    if (explicit) return explicit;
    const fallbackAlias = Array.isArray(participant?.aliases)
      ? participant.aliases.map((alias) => String(alias || '').trim()).find((alias) => alias)
      : '';
    return fallbackAlias || participant?.agentId;
  };

  const participantStatusTone = (participant) => {
    const tone = String(participant?.statusTone || '').trim().toLowerCase();
    return tone === 'working' || tone === 'issue' ? tone : 'idle';
  };

  const participantStatusLabel = (participant) => {
    const label = String(participant?.statusDotLabel || '').trim();
    if (label) return label;
    const tone = participantStatusTone(participant);
    if (tone === 'working') return labels.workingState;
    if (tone === 'issue') return labels.issueDetected;
    return labels.idleState;
  };

  const buildAvatarMarkup = (input) => {
    const accent = String(input?.accent || '').trim() || '#0f766e';
    const imageHref = String(input?.imageHref || '').trim();
    const label = String(input?.label || '?');
    const tone = String(input?.statusTone || '').trim();
    const statusLabel = String(input?.statusLabel || '').trim();
    return '<span class="collab-chat-avatar-wrap">' +
      '<span class="collab-chat-avatar' + (imageHref ? ' has-photo' : '') + '" style="--avatar-accent:' + escapeHtml(accent) + '">' +
        (imageHref
          ? '<img class="collab-chat-avatar-image" src="' + escapeHtml(imageHref) + '" alt="' + escapeHtml(label) + '" />'
          : '<span>' + escapeHtml(label.slice(0, 1).toUpperCase()) + '</span>') +
      '</span>' +
      (tone
        ? '<span class="collab-chat-avatar-state ' + escapeHtml(tone) + '" title="' + escapeHtml(statusLabel) + '" aria-hidden="true"></span>'
        : '') +
    '</span>';
  };

  const mentionableParticipants = () =>
    state.participants.filter((participant) => participant && typeof participant.agentId === 'string');

  const routeTargetsFromText = (text) => {
    const aliases = new Map();
    mentionableParticipants().forEach((participant) => {
      const seeds = []
        .concat(participant.aliases || [])
        .concat([participant.displayName, participant.agentId])
        .filter(Boolean);
      seeds.forEach((seed) => {
        const normalized = String(seed || '').trim().toLowerCase().replace(/^@+/, '');
        if (normalized && !aliases.has(normalized)) aliases.set(normalized, participant.agentId);
      });
    });
    const targets = [];
    const seen = new Set();
    const register = (agentId) => {
      const key = String(agentId || '').trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      targets.push(agentId);
    };
    const mentionRegex = /@([^\\s@]+)/g;
    let match = null;
    while ((match = mentionRegex.exec(String(text || ''))) !== null) {
      const normalized = String(match[1] || '').trim().toLowerCase().replace(/^@+/, '');
      const mapped = aliases.get(normalized);
      if (mapped) register(mapped);
    }
    if (targets.length === 0) {
      mentionableParticipants().forEach((participant) => register(participant.agentId));
    }
    if (targets.length === 0 && primaryAgentId) return [primaryAgentId];
    return targets;
  };

  const routeLabelForText = (text) => {
    const targets = routeTargetsFromText(text);
    const people = mentionableParticipants();
    const everyoneSelected =
      people.length > 0 &&
      targets.length === people.length &&
      people.every((participant) => targets.includes(participant.agentId));

    if (everyoneSelected) {
      return labels.routePrefix + ' ' + labels.routeAllMembers;
    }

    const names = targets.map((agentId) => {
      const participant = findParticipant(agentId);
      return participant ? participant.displayName : agentId;
    });
    return labels.routePrefix + ' ' + names.join(', ');
  };

  const isPersistableRoomId = (value) => /^[a-z0-9._-]{1,120}$/i.test(String(value || '').trim());
  const isHistoryToolEvent = (event) => /^transcript:\\d+:tool_event$/i.test(String(event?.eventId || '').trim());
`;
}

export { renderCollaborationChatScriptPrelude };
