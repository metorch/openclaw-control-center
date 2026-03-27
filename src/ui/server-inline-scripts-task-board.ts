// @ts-nocheck

const { createTaskBoardCompactScriptSource } = require("./server-inline-scripts-task-board-compact");

function renderTaskBoardScript() {
    return `<script>
(() => {
  ${createTaskBoardCompactScriptSource()}
  const roots = Array.from(document.querySelectorAll('[data-task-board-root]'));

  roots.forEach((root) => {
    const grid = root.querySelector('[data-task-card-grid]');
    if (!(grid instanceof HTMLElement)) return;
    if (mountCompactTaskBoard(root, grid)) return;

    const language = (root.dataset.language || 'zh').trim().toLowerCase() === 'en' ? 'en' : 'zh';
    const statusNode = root.querySelector('[data-task-board-status]');
    const selectionStatusNode = root.querySelector('[data-task-board-selection-status]');
    const bulkDeleteButton = root.querySelector('[data-task-board-bulk-delete]');
    const cardsPanel = root.querySelector('[data-task-board-view-panel="cards"]');
    const detailsPanel = root.querySelector('[data-task-board-view-panel="details"]');
    const detailsTableBody = root.querySelector('[data-task-detail-table-body]');
    const pageSummaryNode = root.querySelector('[data-task-board-page-summary]');
    const pageNav = root.querySelector('[data-task-board-pagination]');
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
      pageSummary: language === 'en'
        ? 'Showing {start}-{end} of {total}'
        : '\u5F53\u524D\u663E\u793A {start}-{end} / {total}',
      select: language === 'en' ? 'Select task' : '\u9009\u62E9\u4EFB\u52A1',
      openDetail: language === 'en' ? 'Open detail' : '\u67E5\u770B\u8BE6\u60C5',
      deleteTask: language === 'en' ? 'Delete' : '\u5220\u9664',
      taskType: language === 'en' ? 'Task' : '\u4EFB\u52A1',
      timedJobType: language === 'en' ? 'Timed job' : '\u5B9A\u65F6\u4EFB\u52A1',
    };

    const escapeHtml = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
    const listRows = () => Array.from(root.querySelectorAll('[data-task-list-row]')).filter((row) => row instanceof HTMLElement);
    const ensureDetailRows = () => {
      if (!(detailsTableBody instanceof HTMLElement) || detailsTableBody.dataset.rowsReady === '1') return;
      const rowsHtml = listCards()
        .map((card, index) => {
          const kind = (card.dataset.taskKind || '').trim() === 'timed_job' ? 'timed_job' : 'task';
          const taskRecordId = (card.dataset.taskRecordId || '').trim();
          const projectId = (card.dataset.taskProjectId || '').trim();
          const selectionKey = (card.dataset.taskSelectionKey || '').trim() || (projectId + '::' + taskRecordId);
          const typeLabel = kind === 'timed_job' ? l.timedJobType : l.taskType;
          const title = card.dataset.taskTitle || '';
          const displayTitle = card.dataset.taskDisplayTitle || title;
          const boardStatusTone = (card.dataset.taskBoardStatusTone || 'enabled').trim() || 'enabled';
          const boardStatusLabel = card.dataset.taskBoardStatusLabel || '';
          const statusLabel = card.dataset.taskStatusLabel || '';
          const focusValue = card.dataset.taskFocusValue || '';
          const dueLabel = card.dataset.taskDueLabel || '';
          const recentSignal = card.dataset.taskRecentSignal || '';
          const updatedLabel = card.dataset.taskUpdatedLabel || '';
          const linkedRoomId = (card.dataset.taskLinkedRoomId || '').trim();
          const detailHref = card.dataset.taskDetailHref || '';
          const selectionCell = kind === 'task'
            ? '<label class="task-select-control table"><input type="checkbox" data-task-select data-task-id="' + escapeHtml(taskRecordId) + '" data-task-project-id="' + escapeHtml(projectId) + '" data-task-select-key="' + escapeHtml(selectionKey) + '" aria-label="' + escapeHtml(l.select) + '" /><span>' + escapeHtml(l.select) + '</span></label>'
            : '<span class="task-list-static">' + escapeHtml(l.timedJobType) + '</span>';
          const detailButton = kind !== 'task'
            ? '<a class="btn" href="' + escapeHtml(detailHref) + '">' + escapeHtml(l.openDetail) + '</a>'
            : linkedRoomId
              ? '<button class="btn" type="button" data-task-open-room="' + escapeHtml(linkedRoomId) + '">' + escapeHtml(l.openDetail) + '</button>'
              : '<button class="btn" type="button" data-task-open-room-missing>' + escapeHtml(l.openDetail) + '</button>';
          const deleteButton = kind === 'task'
            ? '<button class="btn task-delete-button inline" type="button" data-task-delete data-task-id="' + escapeHtml(taskRecordId) + '" data-task-project-id="' + escapeHtml(projectId) + '">' + escapeHtml(l.deleteTask) + '</button>'
            : '';
          return [
            '<tr class="task-detail-row" data-task-list-row data-task-kind="' + escapeHtml(kind) + '" data-task-id="' + escapeHtml((card.dataset.taskId || '').trim()) + '" data-task-project-id="' + escapeHtml(projectId) + '" data-task-board-item-index="' + index + '">',
            '<td class="task-detail-cell task-detail-cell-select">' + selectionCell + '</td>',
            '<td class="task-detail-cell task-detail-cell-type"><span class="task-list-kind ' + escapeHtml(kind) + '">' + escapeHtml(typeLabel) + '</span></td>',
            '<td class="task-detail-cell task-detail-cell-title"><div class="task-detail-title" title="' + escapeHtml(title) + '">' + escapeHtml(displayTitle) + '</div><div class="meta task-detail-submeta"><code>' + escapeHtml(taskRecordId) + '</code></div></td>',
            '<td class="task-detail-cell task-detail-cell-status"><div class="task-detail-status"><span class="badge ' + escapeHtml(boardStatusTone) + '">' + escapeHtml(boardStatusLabel) + '</span></div><div class="meta task-detail-submeta" title="' + escapeHtml(statusLabel) + '">' + escapeHtml(statusLabel) + '</div></td>',
            '<td class="task-detail-cell task-detail-cell-focus"><div class="task-detail-primary-line" title="' + escapeHtml(focusValue) + '">' + escapeHtml(focusValue) + '</div><div class="meta task-detail-submeta" title="' + escapeHtml(dueLabel) + '">' + escapeHtml(dueLabel) + '</div></td>',
            '<td class="task-detail-cell task-detail-cell-recent"><div class="task-detail-recent" title="' + escapeHtml(recentSignal) + '">' + escapeHtml(recentSignal) + '</div></td>',
            '<td class="task-detail-cell task-detail-cell-updated" title="' + escapeHtml(updatedLabel) + '">' + escapeHtml(updatedLabel) + '</td>',
            '<td class="task-detail-cell task-detail-cell-actions"><div class="task-detail-actions">' + detailButton + deleteButton + '</div></td>',
            '</tr>',
          ].join('');
        })
        .join('');
      detailsTableBody.innerHTML = rowsHtml;
      detailsTableBody.dataset.rowsReady = '1';
      registerSelectableTasks();
      syncSelectionUi();
    };
    const taskBoardPageButtons = () =>
      Array.from(root.querySelectorAll('[data-task-board-page-button]')).filter((button) => button instanceof HTMLButtonElement);
    const parsePositiveInt = (value, fallbackValue) => {
      const parsed = Number.parseInt(String(value || '').trim(), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
    };
    const taskBoardPageSize = Math.max(1, parsePositiveInt(root.dataset.taskBoardPageSize, 20));
    const taskBoardTotalItems = Math.max(listCards().length, listRows().length);
    const taskBoardTotalPages = Math.max(1, Math.ceil(taskBoardTotalItems / taskBoardPageSize));
    const clampTaskBoardPage = (value) => {
      const parsed = parsePositiveInt(value, 1);
      return Math.min(taskBoardTotalPages, Math.max(1, parsed));
    };
    const applyTaskBoardPage = (value) => {
      if (currentViewMode === 'details') {
        ensureDetailRows();
      }
      currentTaskBoardPage = clampTaskBoardPage(value);
      root.dataset.taskBoardCurrentPage = String(currentTaskBoardPage);
      const startOffset = (currentTaskBoardPage - 1) * taskBoardPageSize;
      const endOffset = startOffset + taskBoardPageSize;
      listCards().forEach((card, index) => {
        card.hidden = index < startOffset || index >= endOffset;
      });
      listRows().forEach((row, index) => {
        row.hidden = index < startOffset || index >= endOffset;
      });
      if (pageSummaryNode instanceof HTMLElement) {
        const startItem = taskBoardTotalItems === 0 ? 0 : startOffset + 1;
        const endItem = taskBoardTotalItems === 0 ? 0 : Math.min(taskBoardTotalItems, endOffset);
        pageSummaryNode.textContent = l.pageSummary
          .replace('{start}', String(startItem))
          .replace('{end}', String(endItem))
          .replace('{total}', String(taskBoardTotalItems));
      }
      taskBoardPageButtons().forEach((button) => {
        const buttonPage = clampTaskBoardPage(button.dataset.taskBoardPage);
        const active = buttonPage === currentTaskBoardPage;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (active) {
          button.setAttribute('aria-current', 'page');
        } else {
          button.removeAttribute('aria-current');
        }
      });
      if (pageNav instanceof HTMLElement) {
        pageNav.hidden = taskBoardTotalPages <= 1;
      }
      syncCardDraggability();
    };
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
      applyTaskBoardPage(currentTaskBoardPage);
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
        card.setAttribute('draggable', allowDrag && !card.hidden ? 'true' : 'false');
      });
    };
    const syncViewModeUi = () => {
      if (currentViewMode === 'details') {
        ensureDetailRows();
      }
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
      const nextOrder = currentVisibleOrder();
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
        if (busy || currentViewMode !== 'cards' || card.hidden || !canMutateTaskBoard()) {
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
        if (!draggingCard || draggingCard === card || currentViewMode !== 'cards' || card.hidden) return;
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
    let currentTaskBoardPage = clampTaskBoardPage(root.dataset.taskBoardCurrentPage);
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
      const pageButton = target.closest('[data-task-board-page-button]');
      if (pageButton instanceof HTMLButtonElement) {
        if (busy) return;
        cancelDrag();
        applyTaskBoardPage(pageButton.dataset.taskBoardPage);
        return;
      }
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
    applyTaskBoardPage(currentTaskBoardPage);
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

  const inlinePageRoots = Array.from(document.querySelectorAll('[data-inline-page-root]'));
  inlinePageRoots.forEach((root) => {
    if (!(root instanceof HTMLElement)) return;
    const items = Array.from(root.querySelectorAll('[data-inline-page-item]')).filter((item) => item instanceof HTMLElement);
    if (items.length === 0) return;
    const language = (root.dataset.language || document.documentElement.lang || 'zh').trim().toLowerCase() === 'en' ? 'en' : 'zh';
    const pageSizeRaw = Number.parseInt(String(root.dataset.inlinePageSize || '').trim(), 10);
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : items.length;
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    let currentPage = Number.parseInt(String(root.dataset.inlineCurrentPage || '').trim(), 10);
    currentPage = Number.isFinite(currentPage) && currentPage > 0 ? Math.min(totalPages, currentPage) : 1;
    const summaryNode = root.querySelector('[data-inline-page-summary]');
    const pagerNode = root.querySelector('[data-inline-pager]');
    const pageButtons = () =>
      Array.from(root.querySelectorAll('[data-inline-page-button]')).filter((button) => button instanceof HTMLButtonElement);
    const summaryTemplate = language === 'en' ? 'Showing {start}-{end} of {total}.' : '\u5F53\u524D\u663E\u793A {start}-{end} / {total}\u3002';
    const clampPage = (value) => {
      const parsed = Number.parseInt(String(value || '').trim(), 10);
      if (!Number.isFinite(parsed) || parsed < 1) return 1;
      return Math.min(totalPages, parsed);
    };
    const applyPage = (value) => {
      currentPage = clampPage(value);
      root.dataset.inlineCurrentPage = String(currentPage);
      const startOffset = (currentPage - 1) * pageSize;
      const endOffset = startOffset + pageSize;
      items.forEach((item, index) => {
        item.hidden = index < startOffset || index >= endOffset;
      });
      if (summaryNode instanceof HTMLElement) {
        const startItem = items.length === 0 ? 0 : startOffset + 1;
        const endItem = items.length === 0 ? 0 : Math.min(items.length, endOffset);
        summaryNode.textContent = summaryTemplate
          .replace('{start}', String(startItem))
          .replace('{end}', String(endItem))
          .replace('{total}', String(items.length));
      }
      pageButtons().forEach((button) => {
        const active = clampPage(button.dataset.inlinePage) === currentPage;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (active) {
          button.setAttribute('aria-current', 'page');
        } else {
          button.removeAttribute('aria-current');
        }
      });
      if (pagerNode instanceof HTMLElement) {
        pagerNode.hidden = totalPages <= 1;
      }
    };
    root.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('[data-inline-page-button]');
      if (!(button instanceof HTMLButtonElement)) return;
      applyPage(button.dataset.inlinePage);
    });
    applyPage(currentPage);
  });

  const queueLanguage = (document.documentElement.lang || 'zh').trim().toLowerCase() === 'en' ? 'en' : 'zh';
  const queueCopy = {
    creating: queueLanguage === 'en' ? 'Starting room...' : '\u6B63\u5728\u8865\u5F00\u623F\u95F4...',
    openRoom: queueLanguage === 'en' ? 'Open room' : '\u67E5\u770B\u4F1A\u8BDD',
    createFailed: queueLanguage === 'en' ? 'Failed to start a collaboration room.' : '\u8865\u5F00\u534F\u4F5C\u623F\u95F4\u5931\u8D25\u3002',
    blocked: queueLanguage === 'en'
      ? 'This machine has not set a safety passcode yet, so queue actions are blocked.'
      : '\u8FD9\u53F0\u673A\u5668\u8FD8\u6CA1\u8BBE\u7F6E\u5B89\u5168\u53E3\u4EE4\uFF0C\u6240\u4EE5\u5F53\u524D\u4E0D\u80FD\u5904\u7406\u961F\u5217\u52A8\u4F5C\u3002',
    writeLocked: queueLanguage === 'en'
      ? 'Write access is off. Turn on the top toolbar unlock before creating a room.'
      : '\u5199\u5165\u89E3\u9501\u5DF2\u5173\u95ED\uFF0C\u8BF7\u5148\u5728\u9876\u90E8\u5DE5\u5177\u680F\u5F00\u542F\u540E\u518D\u8865\u5F00\u623F\u95F4\u3002',
  };
  const getQueueMutationState = () =>
    typeof window.__openclawGetMutationAuthState === 'function'
      ? window.__openclawGetMutationAuthState()
      : { gateRequired: false, tokenConfigured: true, canMutate: true };
  const queueMutationHeaders = (headers = {}) =>
    typeof window.__openclawGetMutationAuthHeaders === 'function'
      ? window.__openclawGetMutationAuthHeaders(headers)
      : headers;
  const dispatchCollaborationRoomOpen = (roomId, source = 'task-queue') => {
    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) return false;
    window.dispatchEvent(
      new CustomEvent('openclaw:collaboration-room-open', {
        detail: { roomId: normalizedRoomId, source },
      }),
    );
    return true;
  };

  const queueRoots = Array.from(document.querySelectorAll('[data-task-queue-root]'));
  queueRoots.forEach((root) => {
    if (!(root instanceof HTMLElement)) return;
    const buttons = Array.from(root.querySelectorAll('[data-task-queue-tab-button]')).filter((button) => button instanceof HTMLButtonElement);
    const panels = Array.from(root.querySelectorAll('[data-task-queue-panel]')).filter((panel) => panel instanceof HTMLElement);
    if (buttons.length === 0 || panels.length === 0) return;
    const activeBootstrapKeys = new Set();

    const normalizeTab = (value) => String(value || '').trim().toLowerCase() === 'followup' ? 'followup' : 'decision';
    const applyTab = (value) => {
      const currentTab = normalizeTab(value);
      root.dataset.taskQueueCurrentTab = currentTab;
      buttons.forEach((button) => {
        const active = normalizeTab(button.dataset.taskQueueTab) === currentTab;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        panel.hidden = normalizeTab(panel.dataset.taskQueuePanel) !== currentTab;
      });
    };

    root.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('[data-task-queue-tab-button]');
      if (button instanceof HTMLButtonElement) {
        applyTab(button.dataset.taskQueueTab || root.dataset.taskQueueDefaultTab || 'decision');
        return;
      }
      const bootstrapButton = target.closest('[data-collaboration-room-bootstrap]');
      if (!(bootstrapButton instanceof HTMLButtonElement)) return;
      event.preventDefault();
      const kind = (bootstrapButton.dataset.collaborationRoomBootstrap || '').trim();
      const bootstrapId = (bootstrapButton.dataset.collaborationRoomBootstrapId || '').trim();
      if (!kind || !bootstrapId) return;
      const mutationState = getQueueMutationState();
      if (mutationState.gateRequired && !mutationState.tokenConfigured) {
        window.alert(queueCopy.blocked);
        return;
      }
      if (mutationState.gateRequired && !mutationState.canMutate) {
        window.alert(queueCopy.writeLocked);
        return;
      }
      const busyKey = kind + '::' + bootstrapId;
      if (activeBootstrapKeys.has(busyKey)) return;
      const originalLabel = bootstrapButton.textContent || queueCopy.openRoom;
      const payload = { kind };
      if (kind === 'approval') {
        payload.approvalId = bootstrapId;
      } else {
        payload.itemId = bootstrapId;
      }
      activeBootstrapKeys.add(busyKey);
      bootstrapButton.disabled = true;
      bootstrapButton.textContent = queueCopy.creating;
      void fetch('/api/collaboration/rooms/bootstrap', {
        method: 'POST',
        headers: queueMutationHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          let body = null;
          try {
            body = await response.json();
          } catch {
            body = null;
          }
          if (!response.ok || !body?.room?.roomId) {
            const message = body?.error?.message || body?.message || queueCopy.createFailed;
            throw new Error(String(message || queueCopy.createFailed));
          }
          const roomId = String(body.room.roomId || '').trim();
          bootstrapButton.disabled = false;
          bootstrapButton.textContent = queueCopy.openRoom;
          bootstrapButton.dataset.collaborationRoomOpen = roomId;
          bootstrapButton.dataset.collaborationRoomSource =
            (bootstrapButton.dataset.collaborationRoomBootstrapSource || '').trim() || 'task-queue-bootstrap';
          bootstrapButton.removeAttribute('data-collaboration-room-bootstrap');
          bootstrapButton.removeAttribute('data-collaboration-room-bootstrap-id');
          bootstrapButton.removeAttribute('data-collaboration-room-bootstrap-source');
          dispatchCollaborationRoomOpen(roomId, bootstrapButton.dataset.collaborationRoomSource || 'task-queue-bootstrap');
        })
        .catch((error) => {
          bootstrapButton.disabled = false;
          bootstrapButton.textContent = originalLabel;
          window.alert(error instanceof Error ? error.message : queueCopy.createFailed);
        })
        .finally(() => {
          activeBootstrapKeys.delete(busyKey);
        });
    });

    applyTab(root.dataset.taskQueueDefaultTab || 'decision');
  });
})();
</script>`;
}

export { renderTaskBoardScript };
