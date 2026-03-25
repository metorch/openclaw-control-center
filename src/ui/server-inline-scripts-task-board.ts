// @ts-nocheck

function renderTaskBoardScript() {
    return `<script>
(() => {
  const roots = Array.from(document.querySelectorAll('[data-task-board-root]'));
  if (roots.length === 0) return;

  roots.forEach((root) => {
    const grid = root.querySelector('[data-task-card-grid]');
    if (!(grid instanceof HTMLElement)) return;

    const language = (root.dataset.language || 'zh').trim().toLowerCase() === 'en' ? 'en' : 'zh';
    const statusNode = root.querySelector('[data-task-board-status]');
    const selectionStatusNode = root.querySelector('[data-task-board-selection-status]');
    const bulkDeleteButton = root.querySelector('[data-task-board-bulk-delete]');
    const cardsPanel = root.querySelector('[data-task-board-view-panel="cards"]');
    const detailsPanel = root.querySelector('[data-task-board-view-panel="details"]');
    const viewButtons = Array.from(root.querySelectorAll('[data-task-view-mode-button]')).filter((button) => button instanceof HTMLButtonElement);
    const l = {
      ready: language === 'en' ? 'Task and schedule order is ready.' : '\u4EFB\u52A1\u4E0E\u6392\u7A0B\u987A\u5E8F\u5DF2\u5C31\u7EEA\u3002',
      dragging: language === 'en' ? 'Dragging board card...' : '\u6B63\u5728\u62D6\u62FD\u770B\u677F\u5361\u7247...',
      saving: language === 'en' ? 'Saving board order...' : '\u6B63\u5728\u4FDD\u5B58\u770B\u677F\u987A\u5E8F...',
      saved: language === 'en' ? 'Board order saved.' : '\u770B\u677F\u987A\u5E8F\u5DF2\u4FDD\u5B58\u3002',
      viewSaving: language === 'en' ? 'Saving board view...' : '\u6B63\u5728\u4FDD\u5B58\u770B\u677F\u89C6\u56FE...',
      viewSaved: language === 'en' ? 'Board view saved.' : '\u770B\u677F\u89C6\u56FE\u5DF2\u4FDD\u5B58\u3002',
      selectedNone: language === 'en' ? 'Selected 0 tasks.' : '\u5DF2\u9009 0 \u4E2A\u4EFB\u52A1\u3002',
      selectedCount: language === 'en' ? 'Selected {count} tasks.' : '\u5DF2\u9009 {count} \u4E2A\u4EFB\u52A1\u3002',
      deleting: language === 'en' ? 'Deleting task...' : '\u6B63\u5728\u5220\u9664\u4EFB\u52A1...',
      deleted: language === 'en' ? 'Task deleted. Refreshing...' : '\u4EFB\u52A1\u5DF2\u5220\u9664\uFF0C\u6B63\u5728\u5237\u65B0...',
      bulkDeleting: language === 'en' ? 'Deleting selected tasks...' : '\u6B63\u5728\u5220\u9664\u5DF2\u9009\u4EFB\u52A1...',
      bulkDeleted: language === 'en' ? 'Selected tasks deleted. Refreshing...' : '\u5DF2\u9009\u4EFB\u52A1\u5DF2\u5220\u9664\uFF0C\u6B63\u5728\u5237\u65B0...',
      deleteFailed: language === 'en' ? 'Delete failed' : '\u5220\u9664\u5931\u8D25',
      viewFailed: language === 'en' ? 'View switch failed' : '\u5207\u6362\u89C6\u56FE\u5931\u8D25',
      failed: language === 'en' ? 'Save failed' : '\u4FDD\u5B58\u5931\u8D25',
      missingRoom: language === 'en'
        ? 'This task is not linked to a collaboration room yet.'
        : '\u8FD9\u4E2A\u4EFB\u52A1\u6682\u65F6\u8FD8\u6CA1\u6709\u5173\u8054\u5230\u534F\u4F5C\u623F\u95F4\u3002',
      confirmSingle: language === 'en'
        ? 'Delete this tracked task from the board?'
        : '\u786E\u5B9A\u5220\u9664\u8FD9\u4E2A\u8DDF\u8E2A\u4EFB\u52A1\u5417\uFF1F',
      confirmBulk: language === 'en'
        ? 'Delete {count} selected tracked tasks from the board?'
        : '\u786E\u5B9A\u6279\u91CF\u5220\u9664 {count} \u4E2A\u5DF2\u9009\u8DDF\u8E2A\u4EFB\u52A1\u5417\uFF1F',
      writeLocked: language === 'en'
        ? 'Write access is off. Turn on the top toolbar unlock before saving board order.'
        : '\u5199\u5165\u89E3\u9501\u5DF2\u5173\u95ED\uFF0C\u8BF7\u5148\u5728\u9876\u90E8\u5DE5\u5177\u680F\u5F00\u542F\u540E\u518D\u4FDD\u5B58\u770B\u677F\u987A\u5E8F\u3002',
      blocked: language === 'en'
        ? 'This machine has not set a safety passcode yet, so board changes are blocked.'
        : '\u8FD9\u53F0\u673A\u5668\u8FD8\u6CA1\u8BBE\u7F6E\u5B89\u5168\u53E3\u4EE4\uFF0C\u6240\u4EE5\u5F53\u524D\u4E0D\u80FD\u4FEE\u6539\u770B\u677F\u3002',
    };

    const normalizeViewMode = (value) => String(value || '').trim().toLowerCase() === 'details' ? 'details' : 'cards';
    const getMutationState = () =>
      typeof window.__openclawGetMutationAuthState === 'function'
        ? window.__openclawGetMutationAuthState()
        : { gateRequired: false, tokenConfigured: true, canMutate: true };
    const mutationHeaders = (headers = {}) =>
      typeof window.__openclawGetMutationAuthHeaders === 'function'
        ? window.__openclawGetMutationAuthHeaders(headers)
        : headers;
    const canMutateTaskBoard = () => Boolean(getMutationState().canMutate);
    const collaborationRoomOpenEventName = 'openclaw:collaboration-room-open';
    const taskBoardLockMessage = () => {
      const state = getMutationState();
      if (!state.gateRequired) return '';
      if (!state.tokenConfigured) return l.blocked;
      if (!state.canMutate) return l.writeLocked;
      return '';
    };
    const parseStoredOrder = (raw) => {
      try {
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed)
          ? parsed
              .map((value) => (typeof value === 'string' ? value.trim() : ''))
              .filter(Boolean)
          : [];
      } catch {
        return [];
      }
    };
    const setStatus = (message) => {
      if (statusNode) statusNode.textContent = message;
    };
    const requestCollaborationRoomOpen = (roomId) => {
      const normalized = String(roomId || '').trim();
      if (!normalized) return false;
      window.dispatchEvent(
        new CustomEvent(collaborationRoomOpenEventName, {
          detail: { roomId: normalized, source: 'task-board' },
        }),
      );
      return true;
    };
    const listCards = () => Array.from(grid.querySelectorAll('[data-task-card]')).filter((card) => card instanceof HTMLElement);
    const currentVisibleOrder = () =>
      listCards()
        .map((card) => (card.dataset.taskId || '').trim())
        .filter(Boolean);
    const clearDragTargets = () => {
      listCards().forEach((card) => {
        card.classList.remove('drag-target');
      });
    };
    const restoreVisibleOrder = (order) => {
      const cards = listCards();
      const byId = new Map(cards.map((card) => [(card.dataset.taskId || '').trim(), card]));
      const seen = new Set();
      order.forEach((taskId) => {
        const card = byId.get(taskId);
        if (!card || seen.has(taskId)) return;
        grid.appendChild(card);
        seen.add(taskId);
      });
      cards.forEach((card) => {
        const taskId = (card.dataset.taskId || '').trim();
        if (!taskId || seen.has(taskId)) return;
        grid.appendChild(card);
      });
    };
    const composePersistedOrder = (visibleOrder) => {
      const visibleSet = new Set(visibleOrder);
      const hiddenOrder = storedOrder.filter((taskId) => !visibleSet.has(taskId));
      return visibleOrder.concat(hiddenOrder);
    };
    const selectionKeyForInput = (input) => {
      const explicit = (input.dataset.taskSelectKey || '').trim();
      if (explicit) return explicit;
      return ((input.dataset.taskProjectId || '').trim()) + '::' + ((input.dataset.taskId || '').trim());
    };
    const registerSelectableTasks = () => {
      selectedTasksByKey.clear();
      selectableInputs().forEach((input) => {
        const key = selectionKeyForInput(input);
        const taskId = (input.dataset.taskId || '').trim();
        if (!key || !taskId) return;
        const projectId = (input.dataset.taskProjectId || '').trim();
        selectedTasksByKey.set(key, { taskId, projectId });
      });
      for (const key of [...selectedTaskKeys]) {
        if (!selectedTasksByKey.has(key)) selectedTaskKeys.delete(key);
      }
    };
    const selectableInputs = () =>
      Array.from(root.querySelectorAll('[data-task-select]')).filter((input) => input instanceof HTMLInputElement);
    const deleteButtons = () =>
      Array.from(root.querySelectorAll('[data-task-delete]')).filter((button) => button instanceof HTMLButtonElement);
    const syncSelectionUi = () => {
      selectableInputs().forEach((input) => {
        input.checked = selectedTaskKeys.has(selectionKeyForInput(input));
      });
      if (selectionStatusNode) {
        selectionStatusNode.textContent =
          selectedTaskKeys.size === 0
            ? l.selectedNone
            : l.selectedCount.replace('{count}', String(selectedTaskKeys.size));
      }
      const locked = Boolean(taskBoardLockMessage());
      if (bulkDeleteButton instanceof HTMLButtonElement) {
        bulkDeleteButton.disabled = busy || locked || selectedTaskKeys.size === 0;
      }
      deleteButtons().forEach((button) => {
        button.disabled = busy || locked;
      });
    };
    const syncCardDraggability = () => {
      const allowDrag = currentViewMode === 'cards' && !busy;
      listCards().forEach((card) => {
        card.setAttribute('draggable', allowDrag ? 'true' : 'false');
      });
    };
    const syncViewModeUi = () => {
      root.dataset.taskViewMode = currentViewMode;
      if (cardsPanel instanceof HTMLElement) {
        cardsPanel.hidden = currentViewMode !== 'cards';
      }
      if (detailsPanel instanceof HTMLElement) {
        detailsPanel.hidden = currentViewMode !== 'details';
      }
      viewButtons.forEach((button) => {
        const active = normalizeViewMode(button.dataset.taskViewModeValue) === currentViewMode;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      syncCardDraggability();
    };
    const updateUiPreferences = async (patch) => {
      const response = await fetch('/api/ui/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.ok !== true) {
        const message = payload && payload.error && payload.error.message ? payload.error.message : response.statusText || l.failed;
        throw new Error(message);
      }
      return payload;
    };
    const persistVisibleOrder = async () => {
      const visibleOrder = currentVisibleOrder();
      const nextOrder = composePersistedOrder(visibleOrder);
      const changed = JSON.stringify(nextOrder) !== JSON.stringify(storedOrder);
      if (!changed) {
        setStatus(l.ready);
        return;
      }

      const lockMessage = taskBoardLockMessage();
      if (lockMessage) {
        restoreVisibleOrder(dragSnapshotVisible);
        setStatus(lockMessage);
        return;
      }

      busy = true;
      syncSelectionUi();
      syncCardDraggability();
      setStatus(l.saving);
      try {
        await updateUiPreferences({ taskCardOrder: nextOrder });
        storedOrder = nextOrder;
        root.dataset.taskOrder = JSON.stringify(nextOrder);
        setStatus(l.saved);
      } catch (error) {
        restoreVisibleOrder(dragSnapshotVisible);
        const message = error instanceof Error ? error.message : l.failed;
        setStatus(l.failed + ': ' + message);
      } finally {
        busy = false;
        syncSelectionUi();
        syncCardDraggability();
      }
    };
    const finalizeDrag = async () => {
      if (!draggingCard) return;
      const activeCard = draggingCard;
      draggingCard = null;
      activeCard.classList.remove('dragging');
      clearDragTargets();
      if (!dropApplied) {
        restoreVisibleOrder(dragSnapshotVisible);
        setStatus(taskBoardLockMessage() || l.ready);
        return;
      }
      dropApplied = false;
      if (JSON.stringify(currentVisibleOrder()) === JSON.stringify(dragSnapshotVisible)) {
        setStatus(taskBoardLockMessage() || l.ready);
        return;
      }
      await persistVisibleOrder();
    };
    const cancelDrag = () => {
      if (!draggingCard) return;
      restoreVisibleOrder(dragSnapshotVisible);
      draggingCard.classList.remove('dragging');
      draggingCard = null;
      dropApplied = false;
      clearDragTargets();
    };
    const persistViewMode = async (nextMode) => {
      const previousMode = currentViewMode;
      currentViewMode = nextMode;
      syncViewModeUi();
      busy = true;
      syncSelectionUi();
      setStatus(l.viewSaving);
      try {
        await updateUiPreferences({ taskBoardViewMode: nextMode });
        setStatus(l.viewSaved);
      } catch (error) {
        currentViewMode = previousMode;
        syncViewModeUi();
        const message = error instanceof Error ? error.message : l.viewFailed;
        setStatus(l.viewFailed + ': ' + message);
      } finally {
        busy = false;
        syncSelectionUi();
      }
    };
    const parseApiError = async (response, fallbackLabel) => {
      const payload = await response.json().catch(() => null);
      if (response.ok && payload && payload.ok === true) return payload;
      const message =
        payload && payload.error && payload.error.message
          ? payload.error.message
          : response.statusText || fallbackLabel;
      throw new Error(message);
    };
    const deleteTasks = async (items) => {
      if (items.length === 0) return;
      const lockMessage = taskBoardLockMessage();
      if (lockMessage) {
        setStatus(lockMessage);
        return;
      }

      busy = true;
      syncSelectionUi();
      syncCardDraggability();
      setStatus(items.length > 1 ? l.bulkDeleting : l.deleting);
      try {
        if (items.length === 1) {
          const target = items[0];
          const query = target.projectId ? '?projectId=' + encodeURIComponent(target.projectId) : '';
          const response = await fetch('/api/tasks/' + encodeURIComponent(target.taskId) + query, {
            method: 'DELETE',
            headers: mutationHeaders({}),
          });
          await parseApiError(response, l.deleteFailed);
          setStatus(l.deleted);
        } else {
          const response = await fetch('/api/tasks/bulk-delete', {
            method: 'POST',
            headers: mutationHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({ tasks: items }),
          });
          await parseApiError(response, l.deleteFailed);
          setStatus(l.bulkDeleted);
        }
        window.setTimeout(() => window.location.reload(), 120);
      } catch (error) {
        const message = error instanceof Error ? error.message : l.deleteFailed;
        setStatus(l.deleteFailed + ': ' + message);
      } finally {
        busy = false;
        syncSelectionUi();
        syncCardDraggability();
      }
    };
    const confirmDelete = (items) => {
      if (items.length === 0) return;
      const message =
        items.length === 1
          ? l.confirmSingle
          : l.confirmBulk.replace('{count}', String(items.length));
      if (typeof window.confirm === 'function' && !window.confirm(message)) {
        return;
      }
      void deleteTasks(items);
    };
    const bindCard = (card) => {
      if (card.dataset.taskDragBound === '1') return;
      card.dataset.taskDragBound = '1';
      card.addEventListener('dragstart', (event) => {
        if (busy || currentViewMode !== 'cards' || !canMutateTaskBoard()) {
          if (!canMutateTaskBoard()) {
            setStatus(taskBoardLockMessage());
          }
          event.preventDefault();
          return;
        }
        draggingCard = card;
        dragSnapshotVisible = currentVisibleOrder();
        dropApplied = false;
        card.classList.add('dragging');
        setStatus(l.dragging);
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          try {
            event.dataTransfer.setData('text/plain', card.dataset.taskId || '');
          } catch {}
        }
      });
      card.addEventListener('dragover', (event) => {
        if (!draggingCard || draggingCard === card || currentViewMode !== 'cards') return;
        event.preventDefault();
        clearDragTargets();
        card.classList.add('drag-target');
        const rect = card.getBoundingClientRect();
        const insertAfter = event.clientY > rect.top + rect.height / 2;
        if (insertAfter) {
          grid.insertBefore(draggingCard, card.nextElementSibling);
        } else {
          grid.insertBefore(draggingCard, card);
        }
      });
      card.addEventListener('drop', (event) => {
        if (!draggingCard || currentViewMode !== 'cards') return;
        event.preventDefault();
        dropApplied = true;
      });
      card.addEventListener('dragend', () => {
        window.requestAnimationFrame(() => {
          void finalizeDrag();
        });
      });
    };

    let storedOrder = parseStoredOrder(root.dataset.taskOrder || '[]');
    let draggingCard = null;
    let dragSnapshotVisible = [];
    let dropApplied = false;
    let busy = false;
    let currentViewMode = normalizeViewMode(root.dataset.taskViewMode || 'cards');
    const selectedTaskKeys = new Set();
    const selectedTasksByKey = new Map();

    registerSelectableTasks();
    listCards().forEach(bindCard);
    grid.addEventListener('dragover', (event) => {
      if (!draggingCard || currentViewMode !== 'cards') return;
      event.preventDefault();
    });
    grid.addEventListener('drop', (event) => {
      if (!draggingCard || currentViewMode !== 'cards') return;
      event.preventDefault();
      dropApplied = true;
    });
    root.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.matches('[data-task-select]')) return;
      const key = selectionKeyForInput(target);
      if (!key) return;
      if (target.checked) {
        selectedTaskKeys.add(key);
      } else {
        selectedTaskKeys.delete(key);
      }
      syncSelectionUi();
    });
    root.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const viewButton = target.closest('[data-task-view-mode-button]');
      if (viewButton instanceof HTMLButtonElement) {
        const nextMode = normalizeViewMode(viewButton.dataset.taskViewModeValue);
        if (nextMode === currentViewMode || busy) return;
        cancelDrag();
        void persistViewMode(nextMode);
        return;
      }
      const openRoomControl = target.closest('[data-task-open-room]');
      if (openRoomControl instanceof HTMLElement) {
        const roomId = (openRoomControl.dataset.taskOpenRoom || '').trim();
        if (!roomId) return;
        requestCollaborationRoomOpen(roomId);
        return;
      }
      const missingRoomControl = target.closest('[data-task-open-room-missing]');
      if (missingRoomControl instanceof HTMLButtonElement) {
        setStatus(l.missingRoom);
        return;
      }
      const singleDeleteButton = target.closest('[data-task-delete]');
      if (singleDeleteButton instanceof HTMLButtonElement) {
        const taskId = (singleDeleteButton.dataset.taskId || '').trim();
        const projectId = (singleDeleteButton.dataset.taskProjectId || '').trim();
        if (!taskId || busy) return;
        confirmDelete([{ taskId, projectId }]);
        return;
      }
      if (bulkDeleteButton instanceof HTMLButtonElement && target.closest('[data-task-board-bulk-delete]')) {
        if (busy || selectedTaskKeys.size === 0) return;
        const items = [...selectedTaskKeys]
          .map((key) => selectedTasksByKey.get(key))
          .filter(Boolean);
        confirmDelete(items);
      }
    });

    syncViewModeUi();
    syncSelectionUi();
    const initialTaskBoardLockMessage = taskBoardLockMessage();
    setStatus(initialTaskBoardLockMessage || l.ready);
    window.addEventListener('openclaw:mutation-auth-changed', () => {
      if (draggingCard && !canMutateTaskBoard()) {
        cancelDrag();
      }
      syncSelectionUi();
      const lockMessage = taskBoardLockMessage();
      setStatus(lockMessage || l.ready);
    });
  });
})();
</script>`;
}

export { renderTaskBoardScript };
