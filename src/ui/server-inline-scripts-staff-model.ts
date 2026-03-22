// @ts-nocheck

function renderStaffModelScript() {
  return `<script>
(() => {
  const roots = Array.from(document.querySelectorAll('[data-staff-model-root]'));
  if (roots.length === 0) return;

  roots.forEach((root) => {
    const agentId = (root.dataset.agentId || '').trim();
    const language = (root.dataset.language || 'zh').trim().toLowerCase() === 'en' ? 'en' : 'zh';
    const baseEditable = root.dataset.modelEditable === '1';
    const primarySelect = root.querySelector('[data-staff-model-select]');
    const fallbackSelect = root.querySelector('[data-staff-fallback-model-select]');
    const saveButton = root.querySelector('[data-staff-model-save]');
    const statusNode = root.querySelector('[data-staff-model-status]');
    if (
      !(primarySelect instanceof HTMLSelectElement) ||
      !(fallbackSelect instanceof HTMLSelectElement) ||
      !(saveButton instanceof HTMLButtonElement) ||
      !(statusNode instanceof HTMLElement) ||
      !agentId
    ) {
      return;
    }

    let currentModel = (root.dataset.currentModel || primarySelect.value || '').trim();
    let currentFallbackModel = (root.dataset.currentFallbackModel || fallbackSelect.value || '').trim();
    primarySelect.value = currentModel || primarySelect.value;
    fallbackSelect.value = currentFallbackModel;
    let saving = false;
    const l = {
      blocked: language === 'en' ? 'Model change is blocked until this machine has a safety passcode.' : '\\u5F53\\u524D\\u673A\\u5668\\u8FD8\\u6CA1\\u8BBE\\u7F6E\\u5B89\\u5168\\u53E3\\u4EE4\\uFF0C\\u6682\\u65F6\\u4E0D\\u80FD\\u4FDD\\u5B58\\u6A21\\u578B\\u3002',
      writeLocked: language === 'en'
        ? 'Write access is off. Turn on the top toolbar unlock before changing models.'
        : '\\u5199\\u5165\\u89E3\\u9501\\u5DF2\\u5173\\u95ED\\uFF0C\\u8BF7\\u5148\\u5728\\u9876\\u90E8\\u5DE5\\u5177\\u680F\\u5F00\\u542F\\u540E\\u518D\\u4FEE\\u6539\\u6A21\\u578B\\u3002',
      unchanged: language === 'en' ? 'These model settings are already current.' : '\\u8FD9\\u5957\\u6A21\\u578B\\u8BBE\\u7F6E\\u5DF2\\u7ECF\\u662F\\u5F53\\u524D\\u503C\\u3002',
      changed: language === 'en' ? 'Ready to save.' : '\\u7B49\\u5F85\\u4FDD\\u5B58\\u3002',
      saving: language === 'en' ? 'Saving model settings to openclaw.json...' : '\\u6B63\\u5728\\u628A\\u6A21\\u578B\\u8BBE\\u7F6E\\u5199\\u56DE openclaw.json...',
      saved: language === 'en' ? 'Model settings saved to openclaw.json.' : '\\u6A21\\u578B\\u8BBE\\u7F6E\\u5DF2\\u5199\\u56DE openclaw.json\\u3002',
      failed: language === 'en' ? 'Save failed' : '\\u4FDD\\u5B58\\u5931\\u8D25',
      primaryLabel: language === 'en' ? 'Primary' : '\\u4E3B\\u6A21\\u578B',
      fallbackLabel: language === 'en' ? 'Fallback' : '\\u5907\\u7528',
      noFallback: language === 'en' ? 'none' : '\\u65E0',
    };
    const getMutationState = () =>
      typeof window.__openclawGetMutationAuthState === 'function'
        ? window.__openclawGetMutationAuthState()
        : { gateRequired: false, tokenConfigured: true, canMutate: true };
    const mutationHeaders = (headers = {}) =>
      typeof window.__openclawGetMutationAuthHeaders === 'function'
        ? window.__openclawGetMutationAuthHeaders(headers)
        : headers;
    const staffModelLockMessage = () => {
      const state = getMutationState();
      if (!state.gateRequired) return '';
      if (!state.tokenConfigured) return l.blocked;
      if (!state.canMutate) return l.writeLocked;
      return '';
    };
    const setStatus = (message) => {
      statusNode.textContent = message;
    };
    const readSelection = () => ({
      model: (primarySelect.value || '').trim(),
      fallbackModel: (fallbackSelect.value || '').trim(),
    });
    const hasPendingChange = () => {
      const selected = readSelection();
      return selected.model !== currentModel || selected.fallbackModel !== currentFallbackModel;
    };
    const describeSavedState = () => {
      const fallbackValue = currentFallbackModel || l.noFallback;
      return language === 'en'
        ? ' ' + l.primaryLabel + ': ' + currentModel + ' | ' + l.fallbackLabel + ': ' + fallbackValue
        : ' ' + l.primaryLabel + '\\uFF1A' + currentModel + ' \\uFF5C ' + l.fallbackLabel + '\\uFF1A' + fallbackValue;
    };
    const syncRefreshGuard = () => {
      if (typeof window.__openclawSetRefreshGuard !== 'function') return;
      window.__openclawSetRefreshGuard('staff-model:' + agentId, hasPendingChange(), hasPendingChange() ? l.changed : '');
    };
    const syncSelectionState = () => {
      const lockMessage = staffModelLockMessage();
      primarySelect.disabled = !baseEditable || saving || Boolean(lockMessage);
      fallbackSelect.disabled = !baseEditable || saving || Boolean(lockMessage);
      saveButton.disabled = !baseEditable || saving || Boolean(lockMessage);
      if (lockMessage) {
        setStatus(lockMessage);
        syncRefreshGuard();
        return;
      }
      if (!baseEditable) {
        syncRefreshGuard();
        return;
      }
      setStatus(hasPendingChange() ? l.changed : '');
      syncRefreshGuard();
    };

    primarySelect.addEventListener('change', syncSelectionState);
    fallbackSelect.addEventListener('change', syncSelectionState);
    saveButton.addEventListener('click', async () => {
      const nextSelection = readSelection();
      if (!nextSelection.model) return;
      if (!hasPendingChange()) {
        setStatus(l.unchanged);
        return;
      }
      const lockMessage = staffModelLockMessage();
      if (lockMessage) {
        setStatus(lockMessage);
        return;
      }

      saving = true;
      primarySelect.setAttribute('disabled', 'disabled');
      fallbackSelect.setAttribute('disabled', 'disabled');
      saveButton.setAttribute('disabled', 'disabled');
      setStatus(l.saving);
      try {
        const headers = mutationHeaders({ 'content-type': 'application/json' });
        const response = await fetch('/api/staff/' + encodeURIComponent(agentId) + '/model', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            model: nextSelection.model,
            fallbackModel: nextSelection.fallbackModel,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.ok !== true || !payload.member) {
          const message = payload && payload.error && payload.error.message ? payload.error.message : response.statusText || l.failed;
          throw new Error(message);
        }
        currentModel = (payload.member.model || nextSelection.model || '').trim();
        currentFallbackModel = (payload.member.fallbackModel || '').trim();
        root.dataset.currentModel = currentModel;
        root.dataset.currentFallbackModel = currentFallbackModel;
        primarySelect.value = currentModel;
        fallbackSelect.value = currentFallbackModel;
        setStatus(l.saved + describeSavedState());
        syncRefreshGuard();
      } catch (error) {
        setStatus(l.failed + ': ' + (error instanceof Error ? error.message : l.failed));
      } finally {
        saving = false;
        syncSelectionState();
      }
    });

    syncSelectionState();
    window.addEventListener('openclaw:mutation-auth-changed', () => {
      syncSelectionState();
    });
  });
})();
</script>`;
}

export { renderStaffModelScript };
