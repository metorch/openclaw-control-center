// @ts-nocheck

const { pickUiText } = require("./server-shared");

function renderSettingsBudgetLimitScript(language) {
    const l = { unchanged: pickUiText(language, "Current value is already loaded.", "\u5F53\u524D\u503C\u5DF2\u52A0\u8F7D\u3002"), unsaved: pickUiText(language, "Ready to save this budget limit.", "\u9884\u7B97\u9650\u989D\u5DF2\u4FEE\u6539\uFF0C\u53EF\u4EE5\u4FDD\u5B58\u3002"), invalid: pickUiText(language, "Please enter a number greater than 0.", "\u8BF7\u8F93\u5165\u5927\u4E8E 0 \u7684\u6570\u5B57\u3002"), saving: pickUiText(language, "Saving budget limit...", "\u6B63\u5728\u4FDD\u5B58\u9884\u7B97\u9650\u989D..."), clearing: pickUiText(language, "Clearing budget limit...", "\u6B63\u5728\u6E05\u7A7A\u9884\u7B97\u9650\u989D..."), saved: pickUiText(language, "Budget limit saved. Refreshing the page...", "\u9884\u7B97\u9650\u989D\u5DF2\u4FDD\u5B58\uFF0C\u6B63\u5728\u5237\u65B0\u9875\u9762..."), cleared: pickUiText(language, "Budget limit cleared. Refreshing the page...", "\u9884\u7B97\u9650\u989D\u5DF2\u6E05\u7A7A\uFF0C\u6B63\u5728\u5237\u65B0\u9875\u9762..."), saveFailed: pickUiText(language, "Failed to save budget limit.", "\u4FDD\u5B58\u9884\u7B97\u9650\u989D\u5931\u8D25\u3002"), emptyHint: pickUiText(language, "Enter a number, for example 20.", "\u8BF7\u8F93\u5165\u6570\u5B57\uFF0C\u4F8B\u5982 20\u3002"), clearHint: pickUiText(language, "The input is empty. Click Clear to remove the current limit.", "\u8F93\u5165\u6846\u5DF2\u6E05\u7A7A\uFF0C\u70B9\u51FB\u201C\u6E05\u7A7A\u201D\u5373\u53EF\u79FB\u9664\u5F53\u524D\u9650\u989D\u3002"), notSet: pickUiText(language, "Not set", "\u672A\u8BBE\u7F6E"), blocked: pickUiText(language, "This machine has not set a safety passcode yet, so saving is blocked for now.", "\u8FD9\u53F0\u673A\u5668\u8FD8\u6CA1\u8BBE\u7F6E\u5B89\u5168\u53E3\u4EE4\uFF0C\u6240\u4EE5\u8FD9\u91CC\u6682\u65F6\u4E0D\u80FD\u4FDD\u5B58\u3002"), writeLocked: pickUiText(language, "Write access is off. Turn on the top toolbar unlock before saving.", "\u5199\u5165\u89E3\u9501\u5DF2\u5173\u95ED\uFF0C\u8BF7\u5148\u5728\u9876\u90E8\u5DE5\u5177\u680F\u5F00\u542F\u540E\u518D\u4FDD\u5B58\u3002") };
    return `<script>
(() => {
  const root = document.querySelector('[data-budget-limit-root]');
  if (!(root instanceof HTMLElement)) return;
  const input = root.querySelector('[data-budget-limit-input]');
  const saveButton = root.querySelector('[data-budget-limit-save]');
  const clearButton = root.querySelector('[data-budget-limit-clear]');
  const statusNode = root.querySelector('[data-budget-limit-status]');
  const currentNode = root.querySelector('[data-budget-limit-current]');
  if (!(input instanceof HTMLInputElement) || !(saveButton instanceof HTMLButtonElement) || !(clearButton instanceof HTMLButtonElement) || !(statusNode instanceof HTMLElement) || !(currentNode instanceof HTMLElement)) return;

  let currentValue = (root.dataset.currentLimit || '').trim();
  let saving = false;

  const getMutationState = () =>
    typeof window.__openclawGetMutationAuthState === 'function'
      ? window.__openclawGetMutationAuthState()
      : { gateRequired: false, tokenConfigured: true, canMutate: true };
  const mutationHeaders = (headers = {}) =>
    typeof window.__openclawGetMutationAuthHeaders === 'function'
      ? window.__openclawGetMutationAuthHeaders(headers)
      : headers;
  const lockMessage = () => {
    const state = getMutationState();
    if (!state.gateRequired) return '';
    if (!state.tokenConfigured) return ${JSON.stringify(l.blocked)};
    if (!state.canMutate) return ${JSON.stringify(l.writeLocked)};
    return '';
  };
  const setStatus = (message) => {
    statusNode.textContent = message;
  };
  const parseCurrentNumber = () => {
    const value = Number(currentValue);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  const sameAsCurrent = (raw) => {
    const trimmed = String(raw || '').trim();
    if (!trimmed && !currentValue) return true;
    const nextValue = Number(trimmed);
    const prevValue = parseCurrentNumber();
    if (Number.isFinite(nextValue) && prevValue !== undefined) {
      return Math.abs(nextValue - prevValue) < 1e-9;
    }
    return trimmed === currentValue;
  };
  const updateCurrentLabel = () => {
    const value = parseCurrentNumber();
    currentNode.textContent = value === undefined ? ${JSON.stringify(l.notSet)} : value.toFixed(2);
  };
  const syncRefreshGuard = () => {
    if (typeof window.__openclawSetRefreshGuard !== 'function') return;
    const raw = input.value.trim();
    window.__openclawSetRefreshGuard(
      'settings-budget-limit',
      !sameAsCurrent(raw),
      !sameAsCurrent(raw) ? ${JSON.stringify(l.unsaved)} : '',
    );
  };
  const syncButtons = () => {
    const raw = input.value.trim();
    const locked = Boolean(lockMessage());
    const empty = raw === '';
    const invalid = !empty && (!Number.isFinite(Number(raw)) || Number(raw) <= 0);
    saveButton.disabled = saving || locked || empty || invalid || sameAsCurrent(raw);
    clearButton.disabled = saving || locked || (!currentValue && empty);
  };
  const refreshBudgetStatus = () => {
    if (saving) return;
    const locked = lockMessage();
    if (locked) {
      setStatus(locked);
      return;
    }
    const raw = input.value.trim();
    if (!raw) {
      setStatus(currentValue ? ${JSON.stringify(l.clearHint)} : ${JSON.stringify(l.emptyHint)});
      return;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setStatus(${JSON.stringify(l.invalid)});
      return;
    }
    setStatus(sameAsCurrent(raw) ? ${JSON.stringify(l.unchanged)} : ${JSON.stringify(l.unsaved)});
  };
  const reloadAfterSave = () => {
    if (typeof window.__openclawTriggerDashboardRefresh === 'function') {
      void window.__openclawTriggerDashboardRefresh('manual');
      return;
    }
    window.location.reload();
  };
  const submitLimit = async (limit) => {
    const locked = lockMessage();
    if (locked) {
      setStatus(locked);
      syncButtons();
      return;
    }
    saving = true;
    syncButtons();
    setStatus(limit === null ? ${JSON.stringify(l.clearing)} : ${JSON.stringify(l.saving)});
    try {
      const response = await window.fetch('/api/settings/budget-limit', {
        method: 'POST',
        headers: mutationHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        body: JSON.stringify({ limit }),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true) {
        const detail = typeof payload?.error?.message === 'string'
          ? payload.error.message
          : typeof payload?.message === 'string'
            ? payload.message
            : '';
        throw new Error(String(detail || ${JSON.stringify(l.saveFailed)}));
      }
      currentValue = limit === null ? '' : String(payload?.limit ?? limit);
      input.value = currentValue;
      root.dataset.currentLimit = currentValue;
      updateCurrentLabel();
      syncRefreshGuard();
      syncButtons();
      setStatus(limit === null ? ${JSON.stringify(l.cleared)} : ${JSON.stringify(l.saved)});
      window.setTimeout(reloadAfterSave, 180);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : ${JSON.stringify(l.saveFailed)});
    } finally {
      saving = false;
      syncButtons();
    }
  };

  input.addEventListener('input', () => {
    syncRefreshGuard();
    syncButtons();
    refreshBudgetStatus();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    saveButton.click();
  });
  saveButton.addEventListener('click', () => {
    const raw = input.value.trim();
    const numeric = Number(raw);
    if (!raw) {
      setStatus(${JSON.stringify(l.emptyHint)});
      syncButtons();
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setStatus(${JSON.stringify(l.invalid)});
      syncButtons();
      return;
    }
    void submitLimit(numeric);
  });
  clearButton.addEventListener('click', () => {
    if (!currentValue && !input.value.trim()) {
      setStatus(${JSON.stringify(l.emptyHint)});
      syncButtons();
      return;
    }
    input.value = '';
    syncRefreshGuard();
    syncButtons();
    void submitLimit(null);
  });
  window.addEventListener('openclaw:mutation-auth-changed', () => {
    syncButtons();
    refreshBudgetStatus();
  });

  updateCurrentLabel();
  syncRefreshGuard();
  syncButtons();
  refreshBudgetStatus();
})();
</script>`;
}

export { renderSettingsBudgetLimitScript };
