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
  const panelSizeStorageKey = 'openclaw:collab-chat-size:v1';
  const endpoints = {
    room: '/api/collaboration/room',
    rooms: '/api/collaboration/rooms',
    uploads: '/api/collaboration/room/uploads',
    messages: '/api/collaboration/room/messages',
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
  const deleteButton = root.querySelector('[data-collab-room-delete]');
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
  const uploadList = root.querySelector('[data-collab-chat-upload-list]');
  const inputNode = root.querySelector('[data-collab-chat-input]');
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

  if (
    !(toggleButton instanceof HTMLButtonElement) ||
    !(panel instanceof HTMLElement) ||
    !(resizeHandle instanceof HTMLElement) ||
    !(launcherUnread instanceof HTMLElement) ||
    !(launcherStatus instanceof HTMLElement) ||
    !(refreshButton instanceof HTMLButtonElement) ||
    !(autoButton instanceof HTMLButtonElement) ||
    !(createButton instanceof HTMLButtonElement) ||
    !(deleteButton instanceof HTMLButtonElement) ||
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
    !(uploadList instanceof HTMLElement) ||
    !(inputNode instanceof HTMLTextAreaElement) ||
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
    !(projectOpenTasksNode instanceof HTMLElement)
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
    pollingTimer: 0,
    prefsTimer: 0,
    statusTimer: 0,
    mentionMatches: [],
    activeMentionIndex: 0,
    unreadCount: 0,
    roomMenuOpen: false,
    panelSize: null,
    resizeSession: null,
    personCardHideTimer: 0,
    activePersonCardAgentId: '',
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

  state.panelSize = loadStoredPanelSize() || { width: 432, height: 736 };

  const roomCursor = (roomId) => {
    const value = Number(state.roomReadCursors[roomId] || 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

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

  const isCompactViewport = () => window.innerWidth <= 760;

  const clampPanelSize = (size) => {
    const maxWidth = Math.max(360, window.innerWidth - 24);
    const maxHeight = Math.max(420, window.innerHeight - (isCompactViewport() ? 24 : 112));
    return {
      width: Math.max(360, Math.min(maxWidth, Number(size?.width || 432))),
      height: Math.max(420, Math.min(maxHeight, Number(size?.height || 736))),
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
    state.panelSize = clampPanelSize(state.panelSize || { width: 432, height: 736 });
    panel.style.width = String(state.panelSize.width) + 'px';
    panel.style.height = String(state.panelSize.height) + 'px';
    panel.style.maxWidth = String(Math.max(360, window.innerWidth - 24)) + 'px';
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

  const schedulePreferenceSave = () => {
    if (!isPersistableRoomId(state.activeRoomId)) return;
    if (state.prefsTimer) window.clearTimeout(state.prefsTimer);
    state.prefsTimer = window.setTimeout(async () => {
      try {
        await fetch(endpoints.preferences, {
          method: 'PATCH',
          headers: mutationHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({
            collaborationChat: {
              expanded: state.expanded,
              autoRefresh: state.autoRefresh,
              activeRoomId: state.activeRoomId,
              lastReadSequence: state.lastReadSequence,
              roomReadCursors: state.roomReadCursors,
            },
          }),
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
    if (targets.length === 0) return [primaryAgentId];
    return targets;
  };

  const routeLabelForText = (text) => {
    const names = routeTargetsFromText(text).map((agentId) => {
      const participant = findParticipant(agentId);
      return participant ? participant.displayName : agentId;
    });
    return labels.routePrefix + ' ' + names.join(', ');
  };

  const isPersistableRoomId = (value) => /^[0-9a-f-]{8,64}$/i.test(String(value || '').trim());
  const isHistoryToolEvent = (event) => /^transcript:\\d+:tool_event$/i.test(String(event?.eventId || '').trim());
`;
}

export { renderCollaborationChatScriptPrelude };
