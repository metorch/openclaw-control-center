// @ts-nocheck

const { pickUiText } = require("./server-shared");

function renderSettingsSafetyScript(language) {
  const text = {
    locked: pickUiText(
      language,
      "Write access is off. Turn on the top toolbar unlock before changing safety settings.",
      "写入解锁已关闭，请先在顶部工具栏开启后再修改安全设置。",
    ),
    passphraseOff: pickUiText(
      language,
      "Safety passphrase mode is off. Local write actions no longer require a passphrase.",
      "安全口令模式已关闭，本地写入操作将不再要求输入口令。",
    ),
    passphraseMissing: pickUiText(
      language,
      "Safety passphrase mode is on, but no passphrase is configured yet.",
      "安全口令模式已开启，但当前还没有配置口令。",
    ),
    passphraseReady: pickUiText(
      language,
      "Safety passphrase is configured. Edit it here if you want to replace it.",
      "安全口令已配置，如需替换可以直接在这里修改。",
    ),
    saving: pickUiText(language, "Saving safety settings...", "正在保存安全设置..."),
    restarting: pickUiText(
      language,
      "Safety settings saved. Restarting the AI employee system UI...",
      "安全设置已保存，正在重启 AI 员工系统界面...",
    ),
    passphraseSaved: pickUiText(
      language,
      "Safety passphrase saved. Restarting the AI employee system UI...",
      "安全口令已保存，正在重启 AI 员工系统界面...",
    ),
    passphraseCleared: pickUiText(
      language,
      "Safety passphrase cleared. Restarting the AI employee system UI...",
      "安全口令已清空，正在重启 AI 员工系统界面...",
    ),
    saved: pickUiText(language, "Safety settings saved.", "安全设置已保存。"),
    unchanged: pickUiText(language, "Current setting is already applied.", "当前设置已经是这个值。"),
    failed: pickUiText(language, "Failed to save safety settings.", "保存安全设置失败。"),
    show: pickUiText(language, "Show", "显示"),
    hide: pickUiText(language, "Hide", "隐藏"),
    placeholderReady: pickUiText(language, "Enter a safety passphrase", "输入安全口令"),
    placeholderConfigured: pickUiText(
      language,
      "Current passphrase is hidden. Edit to replace it.",
      "当前口令已隐藏，直接修改即可替换。",
    ),
    editing: pickUiText(
      language,
      "Press Enter or leave the field to save the new passphrase.",
      "修改后按回车，或离开输入框即可保存新口令。",
    ),
    toggleOn: pickUiText(language, "On", "开启"),
    toggleOff: pickUiText(language, "Off", "关闭"),
  };

  return `<script>
(() => {
  const root = document.querySelector('[data-settings-safety-root]');
  if (!(root instanceof HTMLElement)) return;

  const statusNode = root.querySelector('[data-settings-safety-status]');
  const tokenRow = root.querySelector('[data-safety-token-row]');
  const tokenInput = root.querySelector('[data-safety-token-input]');
  const tokenVisibilityButton = root.querySelector('[data-safety-token-visibility]');
  const toggleButtons = Array.from(root.querySelectorAll('[data-safety-toggle]')).filter(
    (node) => node instanceof HTMLButtonElement,
  );
  if (!(statusNode instanceof HTMLElement)) return;

  const getMutationState = () =>
    typeof window.__openclawGetMutationAuthState === 'function'
      ? window.__openclawGetMutationAuthState()
      : { gateRequired: false, tokenConfigured: true, canMutate: true };
  const mutationHeaders = (headers = {}) =>
    typeof window.__openclawGetMutationAuthHeaders === 'function'
      ? window.__openclawGetMutationAuthHeaders(headers)
      : headers;
  const isWriteLocked = () => {
    const state = getMutationState();
    return Boolean(state.gateRequired && state.tokenConfigured && !state.canMutate);
  };
  const setStatus = (message) => {
    statusNode.textContent = String(message || '');
  };
  const readTokenConfigured = () => {
    const rootValue = String(root.dataset.tokenConfigured || '').trim();
    if (rootValue === 'true' || rootValue === 'false') {
      return rootValue === 'true';
    }
    if (tokenRow instanceof HTMLElement) {
      return tokenRow.dataset.configured === 'true';
    }
    return false;
  };
  const readPassphraseModeEnabled = () => {
    const button = root.querySelector('[data-safety-toggle="localTokenAuthRequired"]');
    return button instanceof HTMLButtonElement && button.getAttribute('aria-checked') === 'true';
  };
  let busy = false;
  let tokenVisible = false;
  let suppressBlurOnce = false;
  let tokenConfigured = readTokenConfigured();
  let lastSavedTokenValue = tokenInput instanceof HTMLInputElement ? tokenInput.value.trim() : '';

  const writeTokenConfigured = (value) => {
    tokenConfigured = Boolean(value);
    root.dataset.tokenConfigured = tokenConfigured ? 'true' : 'false';
    if (tokenRow instanceof HTMLElement) {
      tokenRow.dataset.configured = tokenConfigured ? 'true' : 'false';
    }
  };
  const idleStatus = () => {
    if (isWriteLocked()) return ${JSON.stringify(text.locked)};
    if (!readPassphraseModeEnabled()) return ${JSON.stringify(text.passphraseOff)};
    return tokenConfigured ? ${JSON.stringify(text.passphraseReady)} : ${JSON.stringify(text.passphraseMissing)};
  };
  const setTokenPlaceholder = () => {
    if (!(tokenInput instanceof HTMLInputElement)) return;
    tokenInput.placeholder = tokenConfigured
      ? ${JSON.stringify(text.placeholderConfigured)}
      : ${JSON.stringify(text.placeholderReady)};
  };
  const syncControlState = () => {
    const locked = isWriteLocked();
    toggleButtons.forEach((button) => {
      button.disabled = busy || locked;
    });
    if (tokenInput instanceof HTMLInputElement) {
      tokenInput.disabled = busy || locked;
    }
    if (tokenVisibilityButton instanceof HTMLButtonElement) {
      tokenVisibilityButton.disabled = busy;
      tokenVisibilityButton.setAttribute('aria-pressed', tokenVisible ? 'true' : 'false');
      tokenVisibilityButton.title = tokenVisible ? ${JSON.stringify(text.hide)} : ${JSON.stringify(text.show)};
    }
    setTokenPlaceholder();
  };
  const setToggleState = (button, checked) => {
    button.setAttribute('aria-checked', checked ? 'true' : 'false');
    button.dataset.nextValue = checked ? 'false' : 'true';
    button.classList.toggle('is-on', checked);
    const labelNode = button.parentElement?.querySelector('[data-safety-toggle-label]');
    if (labelNode instanceof HTMLElement) {
      const onLabel = String(button.dataset.labelOn || '').trim() || ${JSON.stringify(text.toggleOn)};
      const offLabel = String(button.dataset.labelOff || '').trim() || ${JSON.stringify(text.toggleOff)};
      labelNode.textContent = checked ? onLabel : offLabel;
    }
  };
  const waitForRestartAndReload = async () => {
    const deadline = Date.now() + 90000;
    let seenOffline = false;
    while (Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, seenOffline ? 1400 : 700));
      try {
        const response = await window.fetch('/healthz', { cache: 'no-store' });
        if (response.ok) {
          if (seenOffline) {
            window.location.reload();
            return;
          }
          continue;
        }
        seenOffline = true;
      } catch {
        seenOffline = true;
      }
    }
    window.location.reload();
  };
  const submitPatch = async (patch, successMessage, onSuccess) => {
    if (isWriteLocked()) {
      setStatus(${JSON.stringify(text.locked)});
      syncControlState();
      return;
    }
    busy = true;
    syncControlState();
    setStatus(${JSON.stringify(text.saving)});
    try {
      const response = await window.fetch('/api/settings/safety', {
        method: 'PATCH',
        headers: mutationHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        body: JSON.stringify(patch),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true) {
        const detail = typeof payload?.error?.message === 'string'
          ? payload.error.message
          : typeof payload?.message === 'string'
            ? payload.message
            : '';
        throw new Error(String(detail || ${JSON.stringify(text.failed)}));
      }
      if (typeof onSuccess === 'function') {
        onSuccess(payload);
      }
      setStatus(successMessage || ${JSON.stringify(text.saved)});
      if (payload?.restartScheduled) {
        void waitForRestartAndReload();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : ${JSON.stringify(text.failed)});
    } finally {
      busy = false;
      syncControlState();
    }
  };
  const saveTokenIfNeeded = async () => {
    if (!(tokenInput instanceof HTMLInputElement) || busy || isWriteLocked()) return;
    const nextValue = tokenInput.value.trim();
    if (nextValue === lastSavedTokenValue) {
      setStatus('');
      syncControlState();
      return;
    }
    await submitPatch(
      { localApiToken: nextValue },
      nextValue ? ${JSON.stringify(text.passphraseSaved)} : ${JSON.stringify(text.passphraseCleared)},
      () => {
        lastSavedTokenValue = nextValue;
        writeTokenConfigured(nextValue !== '');
        tokenVisible = false;
        tokenInput.type = 'password';
      },
    );
  };

  toggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const key = String(button.dataset.safetyToggle || '').trim();
      if (!key) return;
      const currentChecked = button.getAttribute('aria-checked') === 'true';
      const nextValue = String(button.dataset.nextValue || '').trim() === 'true';
      if (currentChecked === nextValue) {
        setStatus('');
        syncControlState();
        return;
      }
      void submitPatch(
        { [key]: nextValue },
        ${JSON.stringify(text.restarting)},
        () => setToggleState(button, nextValue),
      );
    });
  });

  if (tokenVisibilityButton instanceof HTMLButtonElement && tokenInput instanceof HTMLInputElement) {
    tokenVisibilityButton.addEventListener('pointerdown', () => {
      suppressBlurOnce = true;
    });
    tokenVisibilityButton.addEventListener('click', () => {
      tokenVisible = !tokenVisible;
      tokenInput.type = tokenVisible ? 'text' : 'password';
      syncControlState();
    });
  }

  if (tokenInput instanceof HTMLInputElement) {
    tokenInput.addEventListener('input', () => {
      if (!busy) {
        setStatus(${JSON.stringify(text.editing)});
      }
      syncControlState();
    });
    tokenInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      void saveTokenIfNeeded();
    });
    tokenInput.addEventListener('blur', () => {
      if (suppressBlurOnce) {
        suppressBlurOnce = false;
        return;
      }
      void saveTokenIfNeeded();
    });
  }

  window.addEventListener('openclaw:mutation-auth-changed', () => {
    if (busy) return;
    setStatus('');
    syncControlState();
  });

  writeTokenConfigured(tokenConfigured);
  toggleButtons.forEach((button) => {
    setToggleState(button, button.getAttribute('aria-checked') === 'true');
  });
  if (tokenVisibilityButton instanceof HTMLButtonElement) {
    tokenVisibilityButton.innerHTML = tokenVisibilityButton.innerHTML.trim() || '<span aria-hidden="true">show</span>';
  }
  setTokenPlaceholder();
  setStatus('');
  syncControlState();
})();
</script>`;
}

export { renderSettingsSafetyScript };
