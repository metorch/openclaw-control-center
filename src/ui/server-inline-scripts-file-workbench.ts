// @ts-nocheck

function renderFileWorkbenchScript() {
    return `<script>
(() => {
  const roots = Array.from(document.querySelectorAll('[data-file-editor-root]'));
  if (roots.length === 0) return;

  roots.forEach((root) => {
    const scope = (root.dataset.scope || '').trim();
    const language = (root.dataset.language || 'zh').trim().toLowerCase() === 'en' ? 'en' : 'zh';
    const normalizeFacetKey = (value) => String(value || 'all').trim().toLowerCase() || 'all';
    const defaultFacet = normalizeFacetKey(root.dataset.defaultFacet || 'all');
    if (!scope) return;

    const navItems = Array.from(root.querySelectorAll('[data-file-item]'));
    const filterInput = root.querySelector('[data-file-filter]');
    const facetButtons = Array.from(root.querySelectorAll('[data-file-facet]'));
    const filterStateNode = root.querySelector('[data-file-filter-state]');
    const titleNode = root.querySelector('[data-file-title]');
    const pathNode = root.querySelector('[data-file-path]');
    const metaNode = root.querySelector('[data-file-meta]');
    const statusNode = root.querySelector('[data-file-status]');
    const textNode = root.querySelector('[data-file-text]');
    const reloadButton = root.querySelector('[data-file-reload]');
    const saveButton = root.querySelector('[data-file-save]');

    if (!textNode || !(textNode instanceof HTMLTextAreaElement)) return;

    let activePath = '';
    let lastLoadedValue = textNode.value;
    let saving = false;
    let activeFacet = defaultFacet;
    const l = {
      all: language === 'en' ? 'All' : '\u5168\u90E8',
      currentGroup: language === 'en' ? 'Current group' : '\u5F53\u524D\u5206\u7EC4',
      files: language === 'en' ? 'files' : '\u6587\u4EF6',
      fileUnit: language === 'en' ? 'files' : '\u4EFD',
      noMatches: language === 'en' ? 'No matching files' : '\u6CA1\u6709\u5339\u914D\u6587\u4EF6',
      unsavedBeforeSwitch: language === 'en' ? 'This file has unsaved changes. Save or restore it before switching.' : '\u5F53\u524D\u6587\u4EF6\u6709\u672A\u4FDD\u5B58\u6539\u52A8\uFF0C\u8BF7\u5148\u4FDD\u5B58\u6216\u6062\u590D\u540E\u518D\u5207\u6362\u3002',
      switchedTo: language === 'en' ? 'Switched to' : '\u5DF2\u5207\u6362\u5230',
      availableFiles: language === 'en' ? 'available files' : '\u53EF\u9009\u6587\u4EF6',
      noFilesForFilter: language === 'en' ? 'No files match the current filter.' : '\u5F53\u524D\u7B5B\u9009\u4E0B\u6CA1\u6709\u6587\u4EF6\u3002',
      showing: language === 'en' ? 'Showing' : '\u5F53\u524D\u663E\u793A',
      chooseLeft: language === 'en' ? 'Pick a file from the left.' : '\u53EF\u5728\u5DE6\u4FA7\u9009\u62E9\u5177\u4F53\u6587\u4EF6\u3002',
      untitled: language === 'en' ? 'Untitled file' : '\u672A\u547D\u540D\u6587\u4EF6',
      updatedAt: language === 'en' ? 'Updated' : '\u66F4\u65B0\u4E8E',
      reading: language === 'en' ? 'Reading source file...' : '\u6B63\u5728\u8BFB\u53D6\u6E90\u6587\u4EF6...',
      readFailed: language === 'en' ? 'Read failed' : '\u8BFB\u53D6\u5931\u8D25',
      unsavedSwitchConfirm: language === 'en' ? 'This file has unsaved changes. Continue switching?' : '\u5F53\u524D\u6587\u4EF6\u6709\u672A\u4FDD\u5B58\u6539\u52A8\uFF0C\u4ECD\u8981\u5207\u6362\u5417\uFF1F',
      loaded: language === 'en' ? 'File loaded.' : '\u5DF2\u8F7D\u5165\u6587\u4EF6\u3002',
      unsavedFacetConfirm: language === 'en' ? 'This file has unsaved changes. Continue switching groups?' : '\u5F53\u524D\u6587\u4EF6\u6709\u672A\u4FDD\u5B58\u6539\u52A8\uFF0C\u4ECD\u8981\u5207\u6362\u5206\u7EC4\u5417\uFF1F',
      sameAsSource: language === 'en' ? 'Content matches the source file.' : '\u5185\u5BB9\u4E0E\u6E90\u6587\u4EF6\u4E00\u81F4\u3002',
      unsaved: language === 'en' ? 'You have unsaved changes.' : '\u6709\u672A\u4FDD\u5B58\u6539\u52A8\u3002',
      reloadConfirm: language === 'en' ? 'This will discard current unsaved changes. Continue reloading?' : '\u5C06\u653E\u5F03\u5F53\u524D\u672A\u4FDD\u5B58\u6539\u52A8\uFF0C\u7EE7\u7EED\u91CD\u65B0\u8BFB\u53D6\u5417\uFF1F',
      reloaded: language === 'en' ? 'Source file reloaded.' : '\u5DF2\u91CD\u65B0\u8BFB\u53D6\u6E90\u6587\u4EF6\u3002',
      saving: language === 'en' ? 'Saving to the source file...' : '\u6B63\u5728\u4FDD\u5B58\u5230\u6E90\u6587\u4EF6...',
      blocked: language === 'en'
        ? 'This machine has not set a safety passcode yet, so saving is blocked.'
        : '\u8FD9\u53F0\u673A\u5668\u8FD8\u6CA1\u8BBE\u7F6E\u5B89\u5168\u53E3\u4EE4\uFF0C\u6240\u4EE5\u5F53\u524D\u4E0D\u80FD\u4FDD\u5B58\u3002',
      writeLocked: language === 'en'
        ? 'Write access is off. Turn on the top toolbar unlock before editing or saving.'
        : '\u5199\u5165\u89E3\u9501\u5DF2\u5173\u95ED\uFF0C\u8BF7\u5148\u5728\u9876\u90E8\u5DE5\u5177\u680F\u5F00\u542F\u540E\u518D\u7F16\u8F91\u6216\u4FDD\u5B58\u3002',
      saveFailed: language === 'en' ? 'Save failed' : '\u4FDD\u5B58\u5931\u8D25',
      saved: language === 'en' ? 'Saved to the source file.' : '\u5DF2\u4FDD\u5B58\u5230\u6E90\u6587\u4EF6\u3002',
    };
    const getMutationState = () =>
      typeof window.__openclawGetMutationAuthState === 'function'
        ? window.__openclawGetMutationAuthState()
        : { gateRequired: false, tokenConfigured: true, canMutate: true };
    const canMutateFileEditor = () => Boolean(getMutationState().canMutate);
    const mutationHeaders = (headers = {}) =>
      typeof window.__openclawGetMutationAuthHeaders === 'function'
        ? window.__openclawGetMutationAuthHeaders(headers)
        : headers;
    const fileEditorLockMessage = () => {
      const state = getMutationState();
      if (!state.gateRequired) return '';
      if (!state.tokenConfigured) return l.blocked;
      if (!state.canMutate) return l.writeLocked;
      return '';
    };

    const facetLabel = (key) => {
      const normalized = normalizeFacetKey(key);
      if (!normalized || normalized === 'all') return l.all;
      const target = facetButtons.find((button) => normalizeFacetKey(button.dataset.fileFacet || '') === normalized);
      return target ? (target.textContent || key).trim() : key;
    };

    const setStatus = (message) => {
      if (statusNode) statusNode.textContent = message;
    };
    const syncEditorLockState = (fallbackMessage = '') => {
      const lockMessage = fileEditorLockMessage();
      textNode.readOnly = Boolean(lockMessage);
      if (saveButton instanceof HTMLButtonElement) {
        saveButton.disabled = saving || Boolean(lockMessage);
      }
      if (lockMessage && (!activePath || textNode.value === lastLoadedValue)) {
        setStatus(lockMessage);
        return lockMessage;
      }
      if (fallbackMessage) {
        setStatus(fallbackMessage);
      }
      return '';
    };
    const syncRefreshGuard = () => {
      if (typeof window.__openclawSetRefreshGuard !== 'function') return;
      window.__openclawSetRefreshGuard(
        'file-editor:' + scope,
        Boolean(activePath && textNode.value !== lastLoadedValue),
        textNode.value !== lastLoadedValue ? l.unsaved : '',
      );
    };

    const setFilterState = (message) => {
      if (filterStateNode) filterStateNode.textContent = message;
    };

    const setActiveItem = (path) => {
      navItems.forEach((item) => {
        const matches = (item.dataset.sourcePath || '') === path;
        item.classList.toggle('active', matches);
      });
    };

    const setActiveFacetButton = () => {
      facetButtons.forEach((button) => {
        const matches = normalizeFacetKey(button.dataset.fileFacet || '') === activeFacet;
        button.classList.toggle('active', matches);
      });
    };

    const applyNavFilter = () => {
      const query = filterInput instanceof HTMLInputElement ? filterInput.value.trim().toLowerCase() : '';
      let firstVisiblePath = '';
      let visibleCount = 0;
      navItems.forEach((item) => {
        const haystack = (item.dataset.fileSearch || '').toLowerCase();
        const itemFacet = normalizeFacetKey(item.dataset.fileFacetKey || 'all');
        const facetMatch = activeFacet === 'all' || itemFacet === activeFacet;
        const queryMatch = query.length === 0 || haystack.includes(query);
        const visible = facetMatch && queryMatch;
        item.hidden = !visible;
        item.style.display = visible ? "" : "none";
        if (visible && !firstVisiblePath) {
          firstVisiblePath = (item.dataset.sourcePath || '').trim();
        }
        if (visible) visibleCount += 1;
      });
      setFilterState(language === 'en'
        ? l.currentGroup + ': ' + facetLabel(activeFacet) + ' \xB7 ' + String(visibleCount) + ' ' + l.fileUnit
        : l.currentGroup + '\uFF1A' + facetLabel(activeFacet) + ' \xB7 ' + l.files + ' ' + String(visibleCount) + ' ' + l.fileUnit);
      const activeItemVisible = navItems.some((item) => !item.hidden && (item.dataset.sourcePath || '').trim() === activePath);
      if (!activeItemVisible && firstVisiblePath) {
        if (textNode.value !== lastLoadedValue && activePath) {
          setStatus(l.unsavedBeforeSwitch);
          return;
        }
        void loadFile(firstVisiblePath, language === 'en'
          ? l.switchedTo + ' ' + facetLabel(activeFacet) + ' \xB7 ' + String(visibleCount) + ' ' + l.availableFiles + '.'
          : l.switchedTo + ' ' + facetLabel(activeFacet) + '\uFF0C' + l.availableFiles + ' ' + String(visibleCount) + ' \u4EFD\u3002');
        return;
      }
      if (!firstVisiblePath) {
        setStatus(l.noFilesForFilter);
        setFilterState(language === 'en'
          ? l.currentGroup + ': ' + facetLabel(activeFacet) + ' \xB7 ' + l.noMatches
          : l.currentGroup + '\uFF1A' + facetLabel(activeFacet) + ' \xB7 ' + l.noMatches);
        return;
      }
      setStatus(language === 'en'
        ? l.showing + ' ' + facetLabel(activeFacet) + ' files. ' + l.chooseLeft
        : l.showing + ' ' + facetLabel(activeFacet) + ' \u7684\u6587\u4EF6\u3002' + l.chooseLeft);
    };

    const applyPayload = (payload, message) => {
      if (!payload || !payload.entry) return;
      activePath = payload.entry.sourcePath || '';
      lastLoadedValue = typeof payload.content === 'string' ? payload.content : '';
      textNode.value = lastLoadedValue;
      if (titleNode) titleNode.textContent = payload.entry.title || l.untitled;
      if (pathNode) pathNode.textContent = payload.entry.sourcePath || '';
      if (metaNode) metaNode.textContent = l.updatedAt + ' ' + (payload.entry.updatedAt || '-') + ' \xB7 ' + String(payload.entry.size || 0) + ' bytes';
      setActiveItem(activePath);
      syncEditorLockState(message);
      syncRefreshGuard();
    };

    const loadFile = async (path, message) => {
      if (!path) return;
      setStatus(l.reading);
      try {
        const response = await fetch('/api/files/content?scope=' + encodeURIComponent(scope) + '&path=' + encodeURIComponent(path));
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload?.error?.message || l.readFailed);
        }
        applyPayload(payload, message);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : l.readFailed);
      }
    };

    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const nextPath = (item.dataset.sourcePath || '').trim();
        if (!nextPath || nextPath === activePath) return;
        if (textNode.value !== lastLoadedValue && !window.confirm(l.unsavedSwitchConfirm)) {
          return;
        }
        void loadFile(nextPath, l.loaded);
      });
    });

    if (filterInput instanceof HTMLInputElement) {
      filterInput.addEventListener('input', () => {
        applyNavFilter();
      });
    }

    facetButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextFacet = normalizeFacetKey(button.dataset.fileFacet || 'all');
        if (nextFacet === activeFacet) return;
        if (textNode.value !== lastLoadedValue && activePath && !window.confirm(l.unsavedFacetConfirm)) {
          return;
        }
        activeFacet = nextFacet;
        setActiveFacetButton();
        applyNavFilter();
      });
    });

    textNode.addEventListener('input', () => {
      setStatus(textNode.value === lastLoadedValue ? l.sameAsSource : l.unsaved);
      syncRefreshGuard();
    });

    if (reloadButton) {
      reloadButton.addEventListener('click', () => {
        if (!activePath) return;
        if (textNode.value !== lastLoadedValue && !window.confirm(l.reloadConfirm)) {
          return;
        }
        void loadFile(activePath, l.reloaded);
      });
    }

    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        if (!activePath || saving) return;
        const lockMessage = fileEditorLockMessage();
        if (lockMessage) {
          setStatus(lockMessage);
          return;
        }
        saving = true;
        saveButton.setAttribute('disabled', 'disabled');
        setStatus(l.saving);
        try {
          const headers = mutationHeaders({ 'content-type': 'application/json' });
          const response = await fetch('/api/files/content', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              scope,
              path: activePath,
              content: textNode.value,
            }),
          });
          const payload = await response.json();
          if (!response.ok || !payload.ok) {
            throw new Error(payload?.error?.message || l.saveFailed);
          }
          applyPayload(payload, l.saved);
        } catch (error) {
          setStatus(error instanceof Error ? error.message : l.saveFailed);
        } finally {
          saving = false;
          syncEditorLockState();
        }
      });
    }

    const firstActive = navItems.find((item) => item.classList.contains('active'));
    activePath = (firstActive?.dataset.sourcePath || '').trim();
    setActiveFacetButton();
    setActiveItem(activePath);
    applyNavFilter();
    syncRefreshGuard();
    syncEditorLockState();
    window.addEventListener('openclaw:mutation-auth-changed', () => {
      syncEditorLockState();
    });
  });
})();
</script>`;
}

export { renderFileWorkbenchScript };
