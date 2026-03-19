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
    const select = root.querySelector('[data-staff-model-select]');
    const saveButton = root.querySelector('[data-staff-model-save]');
    const statusNode = root.querySelector('[data-staff-model-status]');
    if (!(select instanceof HTMLSelectElement) || !(saveButton instanceof HTMLButtonElement) || !(statusNode instanceof HTMLElement) || !agentId) return;

    let currentModel = (root.dataset.currentModel || select.value || '').trim();
    let saving = false;
    const l = {
      blocked: language === 'en' ? 'Model change is blocked until this machine has a safety passcode.' : '\u5F53\u524D\u673A\u5668\u8FD8\u6CA1\u8BBE\u7F6E\u5B89\u5168\u53E3\u4EE4\uFF0C\u6682\u65F6\u4E0D\u80FD\u4FDD\u5B58\u6A21\u578B\u3002',
      writeLocked: language === 'en'
        ? 'Write access is off. Turn on the top toolbar unlock before changing models.'
        : '\u5199\u5165\u89E3\u9501\u5DF2\u5173\u95ED\uFF0C\u8BF7\u5148\u5728\u9876\u90E8\u5DE5\u5177\u680F\u5F00\u542F\u540E\u518D\u4FEE\u6539\u6A21\u578B\u3002',
      unchanged: language === 'en' ? 'This is already the current model.' : '\u8FD9\u5DF2\u7ECF\u662F\u5F53\u524D\u6A21\u578B\u3002',
      changed: language === 'en' ? 'Ready to save.' : '\u7B49\u5F85\u4FDD\u5B58\u3002',
      saving: language === 'en' ? 'Saving model to openclaw.json...' : '\u6B63\u5728\u628A\u6A21\u578B\u5199\u56DE openclaw.json...',
      saved: language === 'en' ? 'Model saved to openclaw.json.' : '\u6A21\u578B\u5DF2\u5199\u56DE openclaw.json\u3002',
      failed: language === 'en' ? 'Save failed' : '\u4FDD\u5B58\u5931\u8D25',
    };
    const getMutationState = () =>
      typeof window.__openclawGetMutationAuthState === 'function'
        ? window.__openclawGetMutationAuthState()
        : { gateRequired: false, tokenConfigured: true, canMutate: true };
    const canMutateStaffModel = () => Boolean(getMutationState().canMutate);
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
    const syncRefreshGuard = () => {
      if (typeof window.__openclawSetRefreshGuard !== 'function') return;
      const selected = (select.value || '').trim();
      window.__openclawSetRefreshGuard(
        'staff-model:' + agentId,
        Boolean(selected && selected !== currentModel),
        selected && selected !== currentModel ? l.changed : '',
      );
    };

    const syncSelectionState = () => {
      const selected = (select.value || '').trim();
      const lockMessage = staffModelLockMessage();
      select.disabled = !baseEditable || saving || Boolean(lockMessage);
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
      setStatus(selected === currentModel ? '' : l.changed);
      syncRefreshGuard();
    };

    select.addEventListener('change', syncSelectionState);
    saveButton.addEventListener('click', async () => {
      const nextModel = (select.value || '').trim();
      if (!nextModel) return;
      if (nextModel === currentModel) {
        setStatus(l.unchanged);
        return;
      }
      const lockMessage = staffModelLockMessage();
      if (lockMessage) {
        setStatus(lockMessage);
        return;
      }

      saving = true;
      saveButton.setAttribute('disabled', 'disabled');
      select.setAttribute('disabled', 'disabled');
      setStatus(l.saving);
      try {
        const headers = mutationHeaders({ 'content-type': 'application/json' });
        const response = await fetch('/api/staff/' + encodeURIComponent(agentId) + '/model', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ model: nextModel }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.ok !== true || !payload.member) {
          const message = payload && payload.error && payload.error.message ? payload.error.message : response.statusText || l.failed;
          throw new Error(message);
        }
        currentModel = payload.member.model || nextModel;
        root.dataset.currentModel = currentModel;
        setStatus(l.saved + ' ' + currentModel);
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
