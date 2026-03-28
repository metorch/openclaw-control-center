// @ts-nocheck

const { pickUiText } = require("./server-shared");

function renderDashboardRefreshScript(language, options) {
    return `<script>
(() => {
  const root = document.querySelector('[data-dashboard-refresh-root]');
  if (!(root instanceof HTMLElement)) return;

  const refreshButton = root.querySelector('[data-dashboard-refresh-now]');
  const autoToggle = root.querySelector('[data-dashboard-auto-refresh-toggle]');
  const mutationToggle = root.querySelector('[data-dashboard-mutation-toggle]');
  const intervalSelect = root.querySelector('[data-dashboard-auto-refresh-interval]');
  const statusNode = root.querySelector('[data-dashboard-refresh-status]');
  if (
    !(refreshButton instanceof HTMLButtonElement) ||
    !(autoToggle instanceof HTMLButtonElement) ||
    !(mutationToggle instanceof HTMLButtonElement) ||
    !(intervalSelect instanceof HTMLSelectElement) ||
    !(statusNode instanceof HTMLElement)
  ) {
    return;
  }

  const generatedAtRaw = (document.body?.dataset.refreshGeneratedAt || '').trim();
  const dashboardSection = (document.body?.dataset.dashboardSection || '').trim();
  const autoRefreshDisabledForPage = dashboardSection === 'features';
  const settingsKey = 'openclaw:dashboard-refresh:v1';
  const scrollKey = 'openclaw:dashboard-refresh-scroll:v1';
  const refreshEndpoint = '/api/dashboard/refresh';
  const preferencesEndpoint = '/api/ui/preferences';
  const mutationEventName = 'openclaw:mutation-auth-changed';
  const allowedIntervals = [15, 30, 60, 120];
  const refreshGuards = new Map();
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const mutationState = {
    gateRequired: ${options.localTokenAuthRequired ? "true" : "false"},
    tokenConfigured: ${options.localTokenConfigured ? "true" : "false"},
    unlocked: ${options.localTokenAuthRequired ? options.localMutationUnlock ? "true" : "false" : "true"},
    headerName: ${JSON.stringify(options.localTokenHeader)},
    embeddedToken: ${JSON.stringify(options.embeddedLocalToken)},
  };
  const l = {
    refreshing: ${JSON.stringify(pickUiText(language, "Refreshing dashboard data, docs, and runtime...", "\u6B63\u5728\u5237\u65B0\u770B\u677F\u6570\u636E\u3001\u6587\u6863\u4E0E\u8FD0\u884C\u5FEB\u7167..."))},
    autoOn: ${JSON.stringify(pickUiText(language, "Auto refresh is on.", "\u81EA\u52A8\u5237\u65B0\u5DF2\u5F00\u542F\u3002"))},
    autoOff: ${JSON.stringify(pickUiText(language, "Auto refresh is off.", "\u81EA\u52A8\u5237\u65B0\u5DF2\u5173\u95ED\u3002"))},
    autoButtonOn: ${JSON.stringify(pickUiText(language, "Auto refresh: on", "\u81EA\u52A8\u5237\u65B0\uFF1A\u5F00"))},
    autoButtonOff: ${JSON.stringify(pickUiText(language, "Auto refresh: off", "\u81EA\u52A8\u5237\u65B0\uFF1A\u5173"))},
    writeButtonOn: ${JSON.stringify(pickUiText(language, "Write access: on", "\u5199\u5165\u89E3\u9501\uFF1A\u5F00"))},
    writeButtonOff: ${JSON.stringify(pickUiText(language, "Write access: off", "\u5199\u5165\u89E3\u9501\uFF1A\u5173"))},
    writeButtonUnavailable: ${JSON.stringify(pickUiText(language, "Write access: unavailable", "\u5199\u5165\u89E3\u9501\uFF1A\u672A\u914D\u7F6E"))},
    writeButtonDirect: ${JSON.stringify(pickUiText(language, "Write access: direct", "\u5199\u5165\u6743\u9650\uFF1A\u76F4\u8FDE"))},
    mutationUpdating: ${JSON.stringify(pickUiText(language, "Updating write access...", "\u6B63\u5728\u66F4\u65B0\u5199\u5165\u89E3\u9501..."))},
    mutationFailed: ${JSON.stringify(pickUiText(language, "Failed to update write access.", "\u66F4\u65B0\u5199\u5165\u89E3\u9501\u5931\u8D25\u3002"))},
    waitingForTab: ${JSON.stringify(pickUiText(language, "Auto refresh is waiting for this tab to become active.", "\u81EA\u52A8\u5237\u65B0\u7B49\u5F85\u5F53\u524D\u6807\u7B7E\u9875\u6062\u590D\u6D3B\u52A8\u3002"))},
    featurePageDisabled: ${JSON.stringify(pickUiText(language, "Feature pages do not participate in dashboard auto refresh.", "\u529F\u80FD\u9875\u4E0D\u53C2\u4E0E\u770B\u677F\u81EA\u52A8\u5237\u65B0\u3002"))},
    pausedByDraft: ${JSON.stringify(pickUiText(language, "Auto refresh paused because there are unsaved edits.", "\u6709\u672A\u4FDD\u5B58\u6539\u52A8\uFF0C\u81EA\u52A8\u5237\u65B0\u5DF2\u6682\u505C\u3002"))},
    nextIn: ${JSON.stringify(pickUiText(language, "Next refresh in", "\u4E0B\u6B21\u5237\u65B0\u8FD8\u6709"))},
    lastUpdated: ${JSON.stringify(pickUiText(language, "Last updated", "\u6700\u8FD1\u66F4\u65B0\u65F6\u95F4"))},
    unknown: ${JSON.stringify(pickUiText(language, "unknown", "\u672A\u77E5"))},
    forceConfirm: ${JSON.stringify(pickUiText(language, "There are unsaved edits on this page. Refreshing now will discard them. Continue?", "\u5F53\u524D\u9875\u9762\u6709\u672A\u4FDD\u5B58\u6539\u52A8\uFF0C\u7ACB\u5373\u5237\u65B0\u4F1A\u4E22\u5931\u8FD9\u4E9B\u4FEE\u6539\u3002\u7EE7\u7EED\u5417\uFF1F"))},
    unsavedDraft: ${JSON.stringify(pickUiText(language, "Unsaved edits are open.", "\u5B58\u5728\u672A\u4FDD\u5B58\u6539\u52A8\u3002"))},
    refreshFailed: ${JSON.stringify(pickUiText(language, "Refresh failed.", "\u5237\u65B0\u5931\u8D25\u3002"))},
    secondsSuffix: ${JSON.stringify(language === "en" ? "s" : " \u79D2")},
  };
  let enabled = false;
  let intervalSeconds = 30;
  let nextRefreshAt = 0;
  let ticker = 0;
  let refreshing = false;
  let refreshErrorMessage = '';
  let mutationStatusMessage = '';
  let mutationUpdating = false;

  const currentPageKey = () => window.location.pathname + window.location.search + window.location.hash;
  const setStatus = (message) => {
    statusNode.textContent = message;
  };
  const syncBodyState = () => {
    if (!(document.body instanceof HTMLElement)) return;
    document.body.dataset.refreshBlocked = refreshGuards.size > 0 ? '1' : '0';
    document.body.dataset.mutationUnlocked = mutationState.unlocked ? '1' : '0';
    document.body.dataset.mutationConfigured = mutationState.tokenConfigured ? '1' : '0';
  };
  const formatGeneratedAt = (raw) => {
    if (!raw) return l.unknown;
    const ms = Date.parse(raw);
    if (!Number.isFinite(ms)) return raw;
    return timeFormatter.format(new Date(ms));
  };
  const persistSettings = () => {
    try {
      window.localStorage.setItem(settingsKey, JSON.stringify({ enabled, intervalSeconds }));
    } catch {}
  };
  const loadSettings = () => {
    try {
      const raw = window.localStorage.getItem(settingsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      enabled = parsed?.enabled === true;
      const nextInterval = Number(parsed?.intervalSeconds);
      intervalSeconds = allowedIntervals.includes(nextInterval) ? nextInterval : 30;
    } catch {}
  };
  const restoreScrollPosition = () => {
    try {
      const raw = window.sessionStorage.getItem(scrollKey);
      if (!raw) return;
      window.sessionStorage.removeItem(scrollKey);
      const saved = JSON.parse(raw);
      if (!saved || saved.key !== currentPageKey()) return;
      const x = Number(saved.x);
      const y = Number(saved.y);
      window.requestAnimationFrame(() => {
        window.scrollTo(Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0);
      });
    } catch {}
  };
  const saveScrollPosition = () => {
    try {
      window.sessionStorage.setItem(
        scrollKey,
        JSON.stringify({
          key: currentPageKey(),
          x: window.scrollX,
          y: window.scrollY,
        }),
      );
    } catch {}
  };
  const refreshGuardSummary = () => {
    const messages = [...new Set(Array.from(refreshGuards.values()).map((value) => String(value || '').trim()).filter(Boolean))];
    return messages[0] || l.unsavedDraft;
  };
  const mutationCanWrite = () =>
    !mutationState.gateRequired ||
    (mutationState.tokenConfigured && mutationState.unlocked && Boolean(mutationState.embeddedToken));
  const getMutationAuthState = () => ({
    gateRequired: mutationState.gateRequired,
    tokenConfigured: mutationState.tokenConfigured,
    unlocked: mutationState.unlocked,
    headerName: mutationState.headerName,
    canMutate: mutationCanWrite(),
    writeAccessAvailable: !mutationState.gateRequired || mutationState.tokenConfigured,
  });
  const getMutationAuthHeaders = (inputHeaders = {}) => {
    const headers = { ...(inputHeaders || {}) };
    if (mutationState.gateRequired && mutationCanWrite() && mutationState.embeddedToken) {
      headers[mutationState.headerName] = mutationState.embeddedToken;
    }
    return headers;
  };
  const emitMutationState = () => {
    window.dispatchEvent(new CustomEvent(mutationEventName, { detail: getMutationAuthState() }));
  };
  const mutationButtonLabel = () => {
    if (!mutationState.gateRequired) return l.writeButtonDirect;
    if (!mutationState.tokenConfigured) return l.writeButtonUnavailable;
    return mutationState.unlocked ? l.writeButtonOn : l.writeButtonOff;
  };
  const syncControls = () => {
    const autoEnabled = autoRefreshDisabledForPage ? false : enabled;
    autoToggle.textContent = autoEnabled ? l.autoButtonOn : l.autoButtonOff;
    autoToggle.setAttribute('aria-pressed', autoEnabled ? 'true' : 'false');
    mutationToggle.textContent = mutationButtonLabel();
    mutationToggle.setAttribute(
      'aria-pressed',
      mutationState.gateRequired && mutationState.tokenConfigured && mutationState.unlocked ? 'true' : 'false',
    );
    intervalSelect.value = String(intervalSeconds);
    refreshButton.disabled = refreshing || mutationUpdating;
    autoToggle.disabled = autoRefreshDisabledForPage || refreshing || mutationUpdating;
    mutationToggle.disabled = refreshing || mutationUpdating || (mutationState.gateRequired && !mutationState.tokenConfigured);
    intervalSelect.disabled = autoRefreshDisabledForPage || refreshing || mutationUpdating;
  };
  const parseRefreshError = async (response) => {
    try {
      const payload = await response.json();
      const detail = typeof payload?.error?.message === 'string'
        ? payload.error.message
        : typeof payload?.error === 'string'
          ? payload.error
          : typeof payload?.message === 'string'
            ? payload.message
            : '';
      return String(detail || '').trim();
    } catch {
      return '';
    }
  };
  const requestUpstreamRefresh = async () => {
    const response = await window.fetch(refreshEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      const detail = await parseRefreshError(response);
      throw new Error(detail || l.refreshFailed);
    }
    const payload = await response.json().catch(() => ({}));
    if (payload?.ok !== true) {
      throw new Error(l.refreshFailed);
    }
    return payload;
  };
  const persistMutationUnlock = async (nextUnlocked) => {
    const response = await window.fetch(preferencesEndpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ localMutationUnlock: nextUnlocked }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok !== true) {
      const detail = typeof payload?.error?.message === 'string'
        ? payload.error.message
        : typeof payload?.message === 'string'
          ? payload.message
          : '';
      throw new Error(String(detail || l.mutationFailed));
    }
  };
  const updateStatus = () => {
    syncControls();
    syncBodyState();
    if (mutationUpdating) {
      setStatus(l.mutationUpdating);
      return;
    }
    if (mutationStatusMessage) {
      setStatus(mutationStatusMessage);
      return;
    }
    if (refreshing) {
      setStatus(l.refreshing);
      return;
    }
    if (refreshErrorMessage) {
      setStatus(refreshErrorMessage);
      return;
    }
    const updatedLabel = formatGeneratedAt(generatedAtRaw);
    if (autoRefreshDisabledForPage) {
      setStatus(l.featurePageDisabled + ' \xB7 ' + l.lastUpdated + ' ' + updatedLabel);
      return;
    }
    if (!enabled) {
      setStatus(l.autoOff + ' \xB7 ' + l.lastUpdated + ' ' + updatedLabel);
      return;
    }
    if (refreshGuards.size > 0) {
      setStatus(l.pausedByDraft + ' \xB7 ' + refreshGuardSummary());
      return;
    }
    if (document.visibilityState === 'hidden') {
      setStatus(l.waitingForTab + ' \xB7 ' + l.lastUpdated + ' ' + updatedLabel);
      return;
    }
    const remaining = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
    setStatus(l.autoOn + ' \xB7 ' + l.nextIn + ' ' + String(remaining) + l.secondsSuffix);
  };
  const stopTicker = () => {
    if (ticker) {
      window.clearInterval(ticker);
      ticker = 0;
    }
  };
  const triggerRefresh = async (reason) => {
    if (refreshing || mutationUpdating) return;
    const blocked = refreshGuards.size > 0;
    if (blocked && reason === 'manual' && !window.confirm(l.forceConfirm)) {
      updateStatus();
      return;
    }
    if (blocked && reason !== 'manual') {
      updateStatus();
      return;
    }
    if (reason !== 'manual' && document.visibilityState === 'hidden') {
      updateStatus();
      return;
    }
    refreshing = true;
    refreshErrorMessage = '';
    mutationStatusMessage = '';
    updateStatus();
    saveScrollPosition();
    try {
      await requestUpstreamRefresh();
      window.location.reload();
    } catch (error) {
      refreshing = false;
      if (enabled) {
        nextRefreshAt = Date.now() + intervalSeconds * 1000;
      }
      const detail = error instanceof Error ? String(error.message || '').trim() : '';
      refreshErrorMessage = detail ? l.refreshFailed + ' ' + detail : l.refreshFailed;
      updateStatus();
    }
  };
  const startTicker = () => {
    stopTicker();
    if (!enabled) {
      updateStatus();
      return;
    }
    nextRefreshAt = Date.now() + intervalSeconds * 1000;
    updateStatus();
    ticker = window.setInterval(() => {
      if (!enabled) {
        stopTicker();
        return;
      }
      if (refreshing || mutationUpdating || refreshGuards.size > 0 || document.visibilityState === 'hidden') {
        updateStatus();
        return;
      }
      if (Date.now() >= nextRefreshAt) {
        void triggerRefresh('auto');
        return;
      }
      updateStatus();
    }, 1000);
  };
  const setRefreshGuard = (key, active, message) => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return;
    if (active) {
      refreshGuards.set(normalizedKey, String(message || '').trim());
    } else {
      refreshGuards.delete(normalizedKey);
    }
    if (enabled && refreshGuards.size === 0 && Date.now() >= nextRefreshAt) {
      nextRefreshAt = Date.now() + intervalSeconds * 1000;
    }
    updateStatus();
  };
  const toggleMutationUnlock = async () => {
    if (mutationUpdating || !mutationState.gateRequired || !mutationState.tokenConfigured) return;
    mutationUpdating = true;
    mutationStatusMessage = '';
    updateStatus();
    saveScrollPosition();
    try {
      await persistMutationUnlock(!mutationState.unlocked);
      window.location.reload();
    } catch (error) {
      mutationUpdating = false;
      const detail = error instanceof Error ? String(error.message || '').trim() : '';
      mutationStatusMessage = detail ? l.mutationFailed + ' ' + detail : l.mutationFailed;
      updateStatus();
    }
  };

  window.__openclawSetRefreshGuard = setRefreshGuard;
  window.__openclawTriggerDashboardRefresh = triggerRefresh;
  window.__openclawGetMutationAuthState = getMutationAuthState;
  window.__openclawCanMutate = () => mutationCanWrite();
  window.__openclawGetMutationAuthHeaders = getMutationAuthHeaders;
  refreshButton.addEventListener('click', () => {
    void triggerRefresh('manual');
  });
  autoToggle.addEventListener('click', () => {
    if (autoRefreshDisabledForPage) {
      enabled = false;
      updateStatus();
      return;
    }
    enabled = !enabled;
    persistSettings();
    startTicker();
  });
  mutationToggle.addEventListener('click', () => {
    void toggleMutationUnlock();
  });
  intervalSelect.addEventListener('change', () => {
    if (autoRefreshDisabledForPage) {
      intervalSelect.value = String(intervalSeconds);
      updateStatus();
      return;
    }
    const nextInterval = Number(intervalSelect.value);
    intervalSeconds = allowedIntervals.includes(nextInterval) ? nextInterval : 30;
    persistSettings();
    startTicker();
  });
  document.addEventListener('visibilitychange', () => {
    if (enabled && document.visibilityState === 'visible' && refreshGuards.size === 0 && Date.now() >= nextRefreshAt) {
      nextRefreshAt = Date.now() + Math.min(intervalSeconds, 5) * 1000;
    }
    updateStatus();
  });

  loadSettings();
  if (autoRefreshDisabledForPage) {
    enabled = false;
  }
  restoreScrollPosition();
  syncControls();
  if (enabled) {
    nextRefreshAt = Date.now() + intervalSeconds * 1000;
  }
  emitMutationState();
  startTicker();
})();
</script>`;
}

export { renderDashboardRefreshScript };
