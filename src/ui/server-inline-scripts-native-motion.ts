// @ts-nocheck

const { escapeHtml, pickUiText } = require("./server-shared");

function renderNativeMotionScript(language = "zh") {
    return `<script>
(() => {
  const body = document.body;
  if (!body) return;
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealNodes = Array.from(document.querySelectorAll('.panel .card, .sidebar .card, .nav-link, .overview-kpi-card, .overview-primary-card'));
  revealNodes.forEach((node, index) => {
    node.style.setProperty('--stagger-index', String(Math.min(index, 20)));
  });
  requestAnimationFrame(() => body.classList.add('ui-ready'));

  const inspectorToggle = document.getElementById('inspector-toggle');
  const inspectorStorageKey = 'openclaw:inspector-collapsed:v1';
  const applyInspectorLabel = () => {
    if (!(inspectorToggle instanceof HTMLButtonElement)) return;
    const collapsed = body.classList.contains('inspector-collapsed');
    inspectorToggle.textContent = collapsed ? '${escapeHtml(pickUiText(language, "Expand inspector", "\u5C55\u5F00\u68C0\u89C6\u680F"))}' : '${escapeHtml(pickUiText(language, "Collapse inspector", "\u6536\u8D77\u68C0\u89C6\u680F"))}';
    inspectorToggle.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
  };
  if (inspectorToggle instanceof HTMLButtonElement) {
    try {
      if (window.localStorage.getItem(inspectorStorageKey) === '1' && window.innerWidth > 1320) {
        body.classList.add('inspector-collapsed');
      }
    } catch {}
    applyInspectorLabel();
    inspectorToggle.addEventListener('click', () => {
      body.classList.toggle('inspector-collapsed');
      applyInspectorLabel();
      try {
        window.localStorage.setItem(inspectorStorageKey, body.classList.contains('inspector-collapsed') ? '1' : '0');
      } catch {}
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 1320 && body.classList.contains('inspector-collapsed')) {
        body.classList.remove('inspector-collapsed');
      }
      applyInspectorLabel();
    });
  }

  const shellNav = document.querySelector('[data-shell-nav]');
  const shellNavHoverZone = document.querySelector('[data-shell-nav-hover-zone]');
  const shellNavPin = document.querySelector('[data-shell-nav-pin]');
  const shellNavPinLabel =
    shellNavPin instanceof HTMLElement
      ? shellNavPin.querySelector('[data-shell-nav-pin-label]')
      : null;
  const shellNavStorageKey = 'openclaw:shell-nav-pinned:v1';
  const shellNavLabels = {
    pin: '${escapeHtml(pickUiText(language, "Pin", "\u56FA\u5B9A"))}',
    unpin: '${escapeHtml(pickUiText(language, "Auto", "\u81EA\u52A8"))}',
    pinAria: '${escapeHtml(pickUiText(language, "Pin navigation open", "\u56FA\u5B9A\u5BFC\u822A\u5C55\u5F00"))}',
    unpinAria: '${escapeHtml(pickUiText(language, "Return navigation to auto collapse", "\u6062\u590D\u5BFC\u822A\u81EA\u52A8\u6536\u56DE"))}',
  };
  const shellNavState = {
    pinned: false,
    hoverExpanded: false,
    collapseTimer: 0,
  };
  const isDesktopShellNav = () =>
    window.innerWidth > 1320 &&
    Boolean(window.matchMedia) &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clearShellNavTimer = () => {
    if (!shellNavState.collapseTimer) return;
    window.clearTimeout(shellNavState.collapseTimer);
    shellNavState.collapseTimer = 0;
  };
  const syncShellNav = () => {
    const desktop = isDesktopShellNav();
    const expanded = desktop ? shellNavState.pinned || shellNavState.hoverExpanded : true;
    body.dataset.shellNavMode = desktop ? 'desktop' : 'touch';
    body.dataset.shellNavState = expanded ? 'expanded' : 'collapsed';
    body.dataset.shellNavPinned = shellNavState.pinned ? '1' : '0';
    if (shellNav instanceof HTMLElement) {
      shellNav.dataset.shellNavState = expanded ? 'expanded' : 'collapsed';
    }
    if (shellNavPin instanceof HTMLButtonElement) {
      shellNavPin.hidden = !desktop;
      if (shellNavPinLabel instanceof HTMLElement) {
        shellNavPinLabel.textContent = shellNavState.pinned ? shellNavLabels.unpin : shellNavLabels.pin;
      } else {
        shellNavPin.textContent = shellNavState.pinned ? shellNavLabels.unpin : shellNavLabels.pin;
      }
      shellNavPin.dataset.shellNavPinState = shellNavState.pinned ? 'pinned' : 'auto';
      shellNavPin.setAttribute('aria-pressed', shellNavState.pinned ? 'true' : 'false');
      shellNavPin.setAttribute('aria-label', shellNavState.pinned ? shellNavLabels.unpinAria : shellNavLabels.pinAria);
      shellNavPin.title = shellNavState.pinned ? shellNavLabels.unpinAria : shellNavLabels.pinAria;
    }
  };
  const expandShellNav = () => {
    if (!isDesktopShellNav()) return;
    clearShellNavTimer();
    shellNavState.hoverExpanded = true;
    syncShellNav();
  };
  const collapseShellNav = () => {
    if (!isDesktopShellNav() || shellNavState.pinned) return;
    clearShellNavTimer();
    shellNavState.hoverExpanded = false;
    syncShellNav();
  };
  const scheduleShellNavCollapse = () => {
    if (!isDesktopShellNav() || shellNavState.pinned) return;
    clearShellNavTimer();
    shellNavState.collapseTimer = window.setTimeout(() => {
      shellNavState.collapseTimer = 0;
      shellNavState.hoverExpanded = false;
      syncShellNav();
    }, 120);
  };
  try {
    shellNavState.pinned = window.localStorage.getItem(shellNavStorageKey) === '1';
  } catch {}
  if (shellNavPin instanceof HTMLButtonElement) {
    shellNavPin.addEventListener('click', () => {
      shellNavState.pinned = !shellNavState.pinned;
      shellNavState.hoverExpanded = shellNavState.pinned;
      syncShellNav();
      try {
        window.localStorage.setItem(shellNavStorageKey, shellNavState.pinned ? '1' : '0');
      } catch {}
    });
  }
  if (shellNav instanceof HTMLElement) {
    shellNav.addEventListener('mouseenter', expandShellNav);
    shellNav.addEventListener('mouseleave', scheduleShellNavCollapse);
    shellNav.addEventListener('focusin', expandShellNav);
    shellNav.addEventListener('focusout', (event) => {
      if (!(event.relatedTarget instanceof Node) || !shellNav.contains(event.relatedTarget)) {
        scheduleShellNavCollapse();
      }
    });
  }
  if (shellNavHoverZone instanceof HTMLElement) {
    shellNavHoverZone.addEventListener('mouseenter', expandShellNav);
    shellNavHoverZone.addEventListener('mouseleave', scheduleShellNavCollapse);
  }
  window.addEventListener('resize', () => {
    if (!isDesktopShellNav()) {
      clearShellNavTimer();
      shellNavState.hoverExpanded = false;
    }
    syncShellNav();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (shellNavState.pinned) return;
    if (shellNavState.hoverExpanded) {
      shellNavState.hoverExpanded = false;
      syncShellNav();
    }
  });
  syncShellNav();

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a[href]');
    if (!anchor) return;
    if (anchor.getAttribute('target') === '_blank') return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) return;
    if (href.startsWith('/api/')) return;
    event.preventDefault();
    window.location.href = href;
  });

  const panel = document.querySelector('.panel');
  const compactDetails = Array.from(document.querySelectorAll('details.card.compact-details'));
  compactDetails.forEach((details) => {
    const foldBody = details.querySelector('.fold-body');
    details.addEventListener('toggle', () => {
      if (panel) {
        panel.classList.add('is-reflowing');
        window.setTimeout(() => panel.classList.remove('is-reflowing'), 240);
      }
      if (prefersReducedMotion || !foldBody || !details.open) return;
      foldBody.style.overflow = 'hidden';
      foldBody.style.opacity = '0';
      foldBody.style.height = '0px';
      const targetHeight = foldBody.scrollHeight;
      foldBody.getBoundingClientRect();
      foldBody.style.transition = 'height 220ms ease, opacity 220ms ease';
      foldBody.style.height = targetHeight + 'px';
      foldBody.style.opacity = '1';
      window.setTimeout(() => {
        foldBody.style.removeProperty('overflow');
        foldBody.style.removeProperty('opacity');
        foldBody.style.removeProperty('height');
        foldBody.style.removeProperty('transition');
      }, 240);
    });
  });

  const docsSearchInput = document.getElementById('docs-search-input');
  const docsSourceFilter = document.getElementById('docs-source-filter');
  if (docsSearchInput instanceof HTMLInputElement) {
    const docCards = Array.from(document.querySelectorAll('.doc-card[data-doc-search]'));
    const applyDocFilter = () => {
      const needle = docsSearchInput.value.trim().toLowerCase();
      const sourceNeedle = docsSourceFilter instanceof HTMLSelectElement ? docsSourceFilter.value.trim().toLowerCase() : 'all';
      docCards.forEach((card) => {
        const haystack = (card.getAttribute('data-doc-search') || '').toLowerCase();
        const source = (card.getAttribute('data-doc-source') || 'file').toLowerCase();
        const textMatch = !needle || haystack.includes(needle);
        const sourceMatch = sourceNeedle === 'all' || sourceNeedle === source;
        card.classList.toggle('is-hidden', !(textMatch && sourceMatch));
      });
    };
    docsSearchInput.addEventListener('input', applyDocFilter);
    if (docsSourceFilter instanceof HTMLSelectElement) {
      docsSourceFilter.addEventListener('change', applyDocFilter);
    }
    applyDocFilter();
  }

  const docPreviewDialog = document.querySelector('[data-doc-preview-dialog]');
  if (docPreviewDialog instanceof HTMLDialogElement) {
    const docPreviewTitle = docPreviewDialog.querySelector('[data-doc-preview-title]');
    const docPreviewMeta = docPreviewDialog.querySelector('[data-doc-preview-meta]');
    const docPreviewStatus = docPreviewDialog.querySelector('[data-doc-preview-status]');
    const docPreviewContent = docPreviewDialog.querySelector('[data-doc-preview-content]');
    const docPreviewEditor = docPreviewDialog.querySelector('[data-doc-preview-editor]');
    const docPreviewScroll = docPreviewDialog.querySelector('.doc-preview-content');
    const docPreviewClose = docPreviewDialog.querySelector('[data-doc-preview-close]');
    const docPreviewToolbar = docPreviewDialog.querySelector('[data-doc-preview-toolbar]');
    const docPreviewEdit = docPreviewDialog.querySelector('[data-doc-preview-edit]');
    const docPreviewCancelEdit = docPreviewDialog.querySelector('[data-doc-preview-cancel-edit]');
    const docPreviewSave = docPreviewDialog.querySelector('[data-doc-preview-save]');
    const docPreviewLabels = {
      defaultTitle: ${JSON.stringify(pickUiText(language, "Document preview", "\u6587\u6863\u9884\u89C8"))},
      loadingTitle: ${JSON.stringify(pickUiText(language, "Loading preview...", "\u6B63\u5728\u52A0\u8F7D\u9884\u89C8..."))},
      loadingStatus: ${JSON.stringify(pickUiText(language, "Fetching the latest doc text...", "\u6B63\u5728\u8BFB\u53D6\u6700\u65B0\u6587\u6863\u6B63\u6587..."))},
      emptyContent: ${JSON.stringify(pickUiText(language, "This document is empty.", "\u8FD9\u4EFD\u6587\u6863\u5F53\u524D\u662F\u7A7A\u7684\u3002"))},
      loadFailed: ${JSON.stringify(pickUiText(language, "Preview failed", "\u9884\u89C8\u5931\u8D25"))},
      failedContent: ${JSON.stringify(pickUiText(language, "The preview could not be loaded right now.", "\u5F53\u524D\u6CA1\u80FD\u628A\u8FD9\u4EFD\u6587\u6863\u9884\u89C8\u52A0\u8F7D\u51FA\u6765\u3002"))},
      truncatedHint: ${JSON.stringify(pickUiText(language, "Preview trimmed for fast loading.", "\u4E3A\u4E86\u66F4\u5FEB\u52A0\u8F7D\uFF0C\u8FD9\u91CC\u5C55\u793A\u7684\u662F\u88C1\u526A\u540E\u7684\u9884\u89C8\u3002"))},
      editableHint: ${JSON.stringify(pickUiText(language, "Read-only preview. Click Modify if you want to edit this file.", "\u5F53\u524D\u662F\u53EA\u8BFB\u9884\u89C8\uFF0C\u5982\u9700\u4FEE\u6539\u8BF7\u5148\u70B9\u201C\u4FEE\u6539\u201D\u3002"))},
      editingHint: ${JSON.stringify(pickUiText(language, "Editing mode is on. Save to write back to the source file.", "\u5DF2\u8FDB\u5165\u4FEE\u6539\u6A21\u5F0F\uFF0C\u4FDD\u5B58\u540E\u4F1A\u76F4\u63A5\u5199\u56DE\u6E90\u6587\u4EF6\u3002"))},
      unsavedHint: ${JSON.stringify(pickUiText(language, "Editing in progress. Changes are not saved yet.", "\u6B63\u5728\u4FEE\u6539\u4E2D\uFF0C\u6539\u52A8\u8FD8\u6CA1\u6709\u4FDD\u5B58\u3002"))},
      editLocked: ${JSON.stringify(pickUiText(language, "This machine has not set a safety passcode yet, so saving is blocked for now.", "\u8FD9\u53F0\u673A\u5668\u8FD8\u6CA1\u8BBE\u7F6E\u5B89\u5168\u53E3\u4EE4\uFF0C\u6240\u4EE5\u8FD9\u91CC\u6682\u65F6\u4E0D\u80FD\u4FDD\u5B58\u3002"))},
      writeLocked: ${JSON.stringify(pickUiText(language, "Write access is off. Turn on the top toolbar unlock before saving.", "\u5199\u5165\u89E3\u9501\u5DF2\u5173\u95ED\uFF0C\u8BF7\u5148\u5728\u9876\u90E8\u5DE5\u5177\u680F\u5F00\u542F\u540E\u518D\u4FDD\u5B58\u3002"))},
      saving: ${JSON.stringify(pickUiText(language, "Saving to the source file...", "\u6B63\u5728\u4FDD\u5B58\u5230\u6E90\u6587\u4EF6..."))},
      saved: ${JSON.stringify(pickUiText(language, "Saved to the source file.", "\u5DF2\u4FDD\u5B58\u5230\u6E90\u6587\u4EF6\u3002"))},
      saveFailed: ${JSON.stringify(pickUiText(language, "Save failed", "\u4FDD\u5B58\u5931\u8D25"))},
      editCancelled: ${JSON.stringify(pickUiText(language, "Returned to read-only preview.", "\u5DF2\u56DE\u5230\u53EA\u8BFB\u9884\u89C8\u3002"))},
    };
    const getMutationState = () =>
      typeof window.__openclawGetMutationAuthState === 'function'
        ? window.__openclawGetMutationAuthState()
        : { gateRequired: false, tokenConfigured: true, unlocked: true, canMutate: true };
    const canMutateDocPreview = () => Boolean(getMutationState().canMutate);
    const mutationHeaders = (headers = {}) =>
      typeof window.__openclawGetMutationAuthHeaders === 'function'
        ? window.__openclawGetMutationAuthHeaders(headers)
        : headers;
    const docPreviewLockMessage = () => {
      const state = getMutationState();
      if (!state.gateRequired) return '';
      if (!state.tokenConfigured) return docPreviewLabels.editLocked;
      if (!state.canMutate) return docPreviewLabels.writeLocked;
      return '';
    };
    let docPreviewRequestToken = 0;
    let activeEditableDoc = null;
    let activePreviewTitle = docPreviewLabels.defaultTitle;
    let activePreviewMeta = '';
    let activePreviewContent = '';
    let docPreviewEditing = false;
    const syncDocPreviewRefreshGuard = () => {
      if (typeof window.__openclawSetRefreshGuard !== 'function') return;
      window.__openclawSetRefreshGuard(
        'doc-preview',
        docPreviewEditing,
        docPreviewEditing ? docPreviewLabels.unsavedHint : '',
      );
    };
    const syncDocPreviewToolbar = () => {
      const canEdit = Boolean(activeEditableDoc);
      const canWrite = canEdit && canMutateDocPreview();
      if (docPreviewToolbar instanceof HTMLElement) {
        docPreviewToolbar.hidden = !canEdit;
      }
      if (docPreviewEdit instanceof HTMLButtonElement) {
        docPreviewEdit.hidden = !canEdit || docPreviewEditing;
        docPreviewEdit.disabled = !canWrite;
      }
      if (docPreviewCancelEdit instanceof HTMLButtonElement) {
        docPreviewCancelEdit.hidden = !canEdit || !docPreviewEditing;
        docPreviewCancelEdit.disabled = false;
      }
      if (docPreviewSave instanceof HTMLButtonElement) {
        docPreviewSave.hidden = !canEdit || !docPreviewEditing;
        docPreviewSave.disabled = !canWrite;
      }
      if (docPreviewContent instanceof HTMLElement) {
        docPreviewContent.hidden = docPreviewEditing;
      }
      if (docPreviewEditor instanceof HTMLTextAreaElement) {
        docPreviewEditor.hidden = !docPreviewEditing;
        docPreviewEditor.readOnly = !canWrite;
      }
    };
    const setDocPreviewEditing = (enabled, statusMessage) => {
      docPreviewEditing = enabled && Boolean(activeEditableDoc);
      syncDocPreviewToolbar();
      if (docPreviewEditing) {
        if (docPreviewEditor instanceof HTMLTextAreaElement) {
          docPreviewEditor.value = activePreviewContent;
          docPreviewEditor.focus();
          const end = docPreviewEditor.value.length;
          docPreviewEditor.setSelectionRange(end, end);
        }
        if (docPreviewStatus) docPreviewStatus.textContent = statusMessage || docPreviewLabels.editingHint;
      } else {
        if (docPreviewEditor instanceof HTMLTextAreaElement) {
          docPreviewEditor.value = activePreviewContent;
        }
        if (docPreviewStatus) docPreviewStatus.textContent = statusMessage || (activeEditableDoc ? docPreviewLabels.editableHint : '');
      }
      syncDocPreviewRefreshGuard();
    };
    const setDocPreviewState = ({ title, meta, status, content }) => {
      activePreviewTitle = title || docPreviewLabels.defaultTitle;
      activePreviewMeta = meta || '';
      activePreviewContent = typeof content === 'string' ? content : '';
      const visibleContent = activePreviewContent || docPreviewLabels.emptyContent;
      if (docPreviewTitle) docPreviewTitle.textContent = activePreviewTitle;
      if (docPreviewMeta) docPreviewMeta.textContent = activePreviewMeta;
      if (docPreviewStatus) docPreviewStatus.textContent = status || '';
      if (docPreviewContent) docPreviewContent.textContent = visibleContent;
      if (docPreviewEditor instanceof HTMLTextAreaElement) {
        docPreviewEditor.value = activePreviewContent;
      }
      if (docPreviewScroll instanceof HTMLElement) docPreviewScroll.scrollTop = 0;
    };
    const openDocPreview = async (trigger) => {
      const docId = (trigger.getAttribute('data-doc-id') || '').trim();
      const filePath = (trigger.getAttribute('data-doc-file-path') || '').trim();
      const fileScope = (trigger.getAttribute('data-doc-file-scope') || '').trim();
      const title = (trigger.getAttribute('data-doc-title') || '').trim() || docPreviewLabels.defaultTitle;
      const sourceLabel = (trigger.getAttribute('data-doc-source-label') || '').trim();
      const relativeLabel = (trigger.getAttribute('data-doc-relative-label') || '').trim();
      const freshnessLabel = (trigger.getAttribute('data-doc-freshness-label') || '').trim();
      const isEditableFile = Boolean(filePath && fileScope);
      if (!isEditableFile && !docId) return;
      const initialMeta = [sourceLabel, relativeLabel, freshnessLabel].filter(Boolean).join(' \xB7 ');
      activeEditableDoc = isEditableFile ? { path: filePath, scope: fileScope, sourceLabel } : null;
      setDocPreviewEditing(false, '');
      setDocPreviewState({
        title,
        meta: initialMeta,
        status: docPreviewLabels.loadingStatus,
        content: docPreviewLabels.loadingStatus,
      });
      if (!docPreviewDialog.open) {
        if (typeof docPreviewDialog.showModal === 'function') {
          docPreviewDialog.showModal();
        } else {
          docPreviewDialog.setAttribute('open', 'open');
        }
      }
      const requestToken = ++docPreviewRequestToken;
      try {
        if (activeEditableDoc) {
          const response = await fetch('/api/files/content?scope=' + encodeURIComponent(fileScope) + '&path=' + encodeURIComponent(filePath), {
            headers: { accept: 'application/json' },
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload || payload.ok !== true || !payload.entry) {
            const message = payload && payload.error && payload.error.message
              ? payload.error.message
              : response.statusText || docPreviewLabels.loadFailed;
            throw new Error(message);
          }
          if (requestToken !== docPreviewRequestToken) return;
          const entry = payload.entry;
          const nextMeta = [sourceLabel, entry.relativePath || relativeLabel, entry.updatedAt || freshnessLabel].filter(Boolean).join(' \xB7 ');
          setDocPreviewState({
            title: entry.title || title,
            meta: nextMeta,
            status: docPreviewLabels.editableHint,
            content: typeof payload.content === 'string' ? payload.content : '',
          });
          syncDocPreviewToolbar();
          return;
        }
        const response = await fetch('/api/docs/preview?docId=' + encodeURIComponent(docId), {
          headers: { accept: 'application/json' },
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.ok !== true || !payload.preview) {
          const message = payload && payload.error && payload.error.message
            ? payload.error.message
            : response.statusText || docPreviewLabels.loadFailed;
          throw new Error(message);
        }
        if (requestToken !== docPreviewRequestToken) return;
        const preview = payload.preview;
        const nextMeta = [sourceLabel, relativeLabel, freshnessLabel, preview.updatedAt].filter(Boolean).join(' \xB7 ');
        setDocPreviewState({
          title: preview.title || title,
          meta: nextMeta,
          status: preview.truncated ? docPreviewLabels.truncatedHint : '',
          content: typeof preview.content === 'string' ? preview.content : '',
        });
        syncDocPreviewToolbar();
      } catch (error) {
        if (requestToken !== docPreviewRequestToken) return;
        const message = error instanceof Error ? error.message : docPreviewLabels.loadFailed;
        setDocPreviewState({
          title,
          meta: initialMeta,
          status: docPreviewLabels.loadFailed + ': ' + message,
          content: docPreviewLabels.failedContent,
        });
        syncDocPreviewToolbar();
      }
    };
    if (docPreviewEdit instanceof HTMLButtonElement) {
      docPreviewEdit.addEventListener('click', () => {
        if (!activeEditableDoc) return;
        const lockMessage = docPreviewLockMessage();
        if (lockMessage) {
          if (docPreviewStatus) docPreviewStatus.textContent = lockMessage;
          return;
        }
        setDocPreviewEditing(true, docPreviewLabels.editingHint);
      });
    }
    if (docPreviewCancelEdit instanceof HTMLButtonElement) {
      docPreviewCancelEdit.addEventListener('click', () => {
        setDocPreviewEditing(false, docPreviewLabels.editCancelled);
      });
    }
    if (docPreviewEditor instanceof HTMLTextAreaElement) {
      docPreviewEditor.addEventListener('input', () => {
        if (!docPreviewEditing) return;
        if (docPreviewStatus) docPreviewStatus.textContent = docPreviewLabels.unsavedHint;
      });
    }
    if (docPreviewSave instanceof HTMLButtonElement) {
      docPreviewSave.addEventListener('click', async () => {
        if (!activeEditableDoc || !(docPreviewEditor instanceof HTMLTextAreaElement)) return;
        const lockMessage = docPreviewLockMessage();
        if (lockMessage) {
          if (docPreviewStatus) docPreviewStatus.textContent = lockMessage;
          return;
        }
        docPreviewSave.setAttribute('disabled', 'disabled');
        if (docPreviewEdit instanceof HTMLButtonElement) docPreviewEdit.setAttribute('disabled', 'disabled');
        if (docPreviewCancelEdit instanceof HTMLButtonElement) docPreviewCancelEdit.setAttribute('disabled', 'disabled');
        if (docPreviewStatus) docPreviewStatus.textContent = docPreviewLabels.saving;
        try {
          const headers = mutationHeaders({ 'content-type': 'application/json' });
          const response = await fetch('/api/files/content', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              scope: activeEditableDoc.scope,
              path: activeEditableDoc.path,
              content: docPreviewEditor.value,
            }),
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload || payload.ok !== true || !payload.entry) {
            const message = payload && payload.error && payload.error.message
              ? payload.error.message
              : response.statusText || docPreviewLabels.saveFailed;
            throw new Error(message);
          }
          const entry = payload.entry;
          const nextMeta = [
            activeEditableDoc.sourceLabel || '',
            entry.relativePath || '',
            entry.updatedAt || '',
          ].filter(Boolean).join(' \xB7 ');
          setDocPreviewState({
            title: entry.title || activePreviewTitle,
            meta: nextMeta,
            status: docPreviewLabels.saved,
            content: typeof payload.content === 'string' ? payload.content : '',
          });
          setDocPreviewEditing(false, docPreviewLabels.saved);
        } catch (error) {
          if (docPreviewStatus) {
            docPreviewStatus.textContent = (error instanceof Error ? error.message : docPreviewLabels.saveFailed);
          }
        } finally {
          docPreviewSave.removeAttribute('disabled');
          if (docPreviewEdit instanceof HTMLButtonElement) docPreviewEdit.removeAttribute('disabled');
          if (docPreviewCancelEdit instanceof HTMLButtonElement) docPreviewCancelEdit.removeAttribute('disabled');
        }
      });
    }
    Array.from(document.querySelectorAll('[data-doc-preview-trigger]')).forEach((node) => {
      if (!(node instanceof HTMLButtonElement)) return;
      node.addEventListener('click', () => {
        void openDocPreview(node);
      });
    });
    if (docPreviewClose instanceof HTMLButtonElement) {
      docPreviewClose.addEventListener('click', () => docPreviewDialog.close());
    }
    docPreviewDialog.addEventListener('click', (event) => {
      if (event.target === docPreviewDialog) docPreviewDialog.close();
    });
    docPreviewDialog.addEventListener('close', () => {
      activeEditableDoc = null;
      setDocPreviewEditing(false, '');
      syncDocPreviewToolbar();
    });
    window.addEventListener('openclaw:mutation-auth-changed', () => {
      if (docPreviewEditing && !canMutateDocPreview()) {
        setDocPreviewEditing(false, docPreviewLockMessage());
        return;
      }
      syncDocPreviewToolbar();
    });
  }

  const counterStorageKey = 'openclaw:overview-counters:v2';
  const counterNodes = Array.from(document.querySelectorAll('[data-counter-key][data-counter-target]'));
  let previousCounters = {};
  try {
    previousCounters = JSON.parse(window.localStorage.getItem(counterStorageKey) || '{}');
  } catch {
    previousCounters = {};
  }
  const nextCounters = {};
  const formatCounter = (value, format) => {
    if (format === 'int') return Math.round(value).toLocaleString('en-US');
    return String(Math.round(value));
  };
  const animateCounter = (node, start, target, format) => {
    if (prefersReducedMotion) {
      node.textContent = formatCounter(target, format);
      return;
    }
    const duration = 560;
    const startAt = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - startAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + (target - start) * eased;
      node.textContent = formatCounter(value, format);
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  };
  counterNodes.forEach((node) => {
    const key = node.getAttribute('data-counter-key');
    const target = Number(node.getAttribute('data-counter-target'));
    if (!key || !Number.isFinite(target)) return;
    const format = (node.getAttribute('data-counter-format') || 'int').toLowerCase();
    const previousRaw = Number(previousCounters[key]);
    const start = Number.isFinite(previousRaw) ? previousRaw : Math.max(0, Math.round(target * 0.82));
    animateCounter(node, start, target, format);
    if (Number.isFinite(previousRaw) && previousRaw !== target) {
      const card = node.closest('.overview-kpi-card, .overview-primary-card');
      if (card) {
        card.classList.add('state-updated-soft');
        window.setTimeout(() => card.classList.remove('state-updated-soft'), 900);
      }
    }
    nextCounters[key] = target;
  });
  try {
    window.localStorage.setItem(counterStorageKey, JSON.stringify(nextCounters));
  } catch {}

  const signalCards = Array.from(document.querySelectorAll('.signal-gauge-card[data-signal-key][data-signal-value]'));
  if (signalCards.length) {
    const storageKey = 'openclaw:signal-dashboard:v1';
    let previous = {};
    try {
      previous = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    } catch {
      previous = {};
    }
    const current = {};
    signalCards.forEach((card) => {
      const key = card.getAttribute('data-signal-key');
      const value = Number(card.getAttribute('data-signal-value') || '0');
      if (!key) return;
      current[key] = value;
      const oldValue = Number(previous[key]);
      if (Number.isFinite(oldValue) && oldValue !== value) {
        card.classList.add('state-updated');
      }
    });
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(current));
    } catch {}
  }
})();
</script>`;
}

export { renderNativeMotionScript };
