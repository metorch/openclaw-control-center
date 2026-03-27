// @ts-nocheck

function mountCompactTaskBoard(root, grid) {
  const itemsNode = root.querySelector("[data-task-board-items]");
  if (!(itemsNode instanceof HTMLScriptElement)) return false;

  let taskItems = [];
  try {
    const parsed = JSON.parse(itemsNode.textContent || "[]");
    taskItems = Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.cardId === "string")
      : [];
  } catch {
    return false;
  }
  if (taskItems.length === 0) return false;
  itemsNode.remove();

  const language = (root.dataset.language || "zh").trim().toLowerCase() === "en" ? "en" : "zh";
  const statusNode = root.querySelector("[data-task-board-status]");
  const selectionStatusNode = root.querySelector("[data-task-board-selection-status]");
  const bulkDeleteButton = root.querySelector("[data-task-board-bulk-delete]");
  const cardsPanel = root.querySelector('[data-task-board-view-panel="cards"]');
  const detailsPanel = root.querySelector('[data-task-board-view-panel="details"]');
  const detailsTableBody = root.querySelector("[data-task-detail-table-body]");
  const pageSummaryNode = root.querySelector("[data-task-board-page-summary]");
  const pageNav = root.querySelector("[data-task-board-pagination]");
  const viewButtons = Array.from(root.querySelectorAll("[data-task-view-mode-button]")).filter(
    (button) => button instanceof HTMLButtonElement,
  );
  const copy = {
    ready: language === "en" ? "Task and schedule order is ready." : "\u4EFB\u52A1\u4E0E\u6392\u7A0B\u987A\u5E8F\u5DF2\u5C31\u7EEA\u3002",
    dragging: language === "en" ? "Dragging board card..." : "\u6B63\u5728\u62D6\u62FD\u770B\u677F\u5361\u7247...",
    saving: language === "en" ? "Saving board order..." : "\u6B63\u5728\u4FDD\u5B58\u770B\u677F\u987A\u5E8F...",
    saved: language === "en" ? "Board order saved." : "\u770B\u677F\u987A\u5E8F\u5DF2\u4FDD\u5B58\u3002",
    viewSaving: language === "en" ? "Saving board view..." : "\u6B63\u5728\u4FDD\u5B58\u770B\u677F\u89C6\u56FE...",
    viewSaved: language === "en" ? "Board view saved." : "\u770B\u677F\u89C6\u56FE\u5DF2\u4FDD\u5B58\u3002",
    selectedNone: language === "en" ? "Selected 0 tasks." : "\u5DF2\u9009 0 \u4E2A\u4EFB\u52A1\u3002",
    selectedCount: language === "en" ? "Selected {count} tasks." : "\u5DF2\u9009 {count} \u4E2A\u4EFB\u52A1\u3002",
    deleting: language === "en" ? "Deleting task..." : "\u6B63\u5728\u5220\u9664\u4EFB\u52A1...",
    deleted: language === "en" ? "Task deleted. Refreshing..." : "\u4EFB\u52A1\u5DF2\u5220\u9664\uFF0C\u6B63\u5728\u5237\u65B0...",
    bulkDeleting: language === "en" ? "Deleting selected tasks..." : "\u6B63\u5728\u5220\u9664\u5DF2\u9009\u4EFB\u52A1...",
    bulkDeleted: language === "en" ? "Selected tasks deleted. Refreshing..." : "\u5DF2\u9009\u4EFB\u52A1\u5DF2\u5220\u9664\uFF0C\u6B63\u5728\u5237\u65B0...",
    deleteFailed: language === "en" ? "Delete failed" : "\u5220\u9664\u5931\u8D25",
    viewFailed: language === "en" ? "View switch failed" : "\u5207\u6362\u89C6\u56FE\u5931\u8D25",
    failed: language === "en" ? "Save failed" : "\u4FDD\u5B58\u5931\u8D25",
    missingRoom: language === "en" ? "This task is not linked to a collaboration room yet." : "\u8FD9\u4E2A\u4EFB\u52A1\u6682\u65F6\u8FD8\u6CA1\u6709\u5173\u8054\u5230\u534F\u4F5C\u623F\u95F4\u3002",
    confirmSingle: language === "en" ? "Delete this tracked task from the board?" : "\u786E\u5B9A\u5220\u9664\u8FD9\u4E2A\u8DDF\u8E2A\u4EFB\u52A1\u5417\uFF1F",
    confirmBulk: language === "en" ? "Delete {count} selected tracked tasks from the board?" : "\u786E\u5B9A\u6279\u91CF\u5220\u9664 {count} \u4E2A\u5DF2\u9009\u8DDF\u8E2A\u4EFB\u52A1\u5417\uFF1F",
    writeLocked: language === "en" ? "Write access is off. Turn on the top toolbar unlock before saving board order." : "\u5199\u5165\u89E3\u9501\u5DF2\u5173\u95ED\uFF0C\u8BF7\u5148\u5728\u9876\u90E8\u5DE5\u5177\u680F\u5F00\u542F\u540E\u518D\u4FDD\u5B58\u770B\u677F\u987A\u5E8F\u3002",
    blocked: language === "en" ? "This machine has not set a safety passcode yet, so board changes are blocked." : "\u8FD9\u53F0\u673A\u5668\u8FD8\u6CA1\u8BBE\u7F6E\u5B89\u5168\u53E3\u4EE4\uFF0C\u6240\u4EE5\u5F53\u524D\u4E0D\u80FD\u4FEE\u6539\u770B\u677F\u3002",
    pageSummary: language === "en" ? "Showing {start}-{end} of {total}" : "\u5F53\u524D\u663E\u793A {start}-{end} / {total}",
    select: language === "en" ? "Select task" : "\u9009\u62E9\u4EFB\u52A1",
    selectShort: language === "en" ? "Select" : "\u9009\u62E9",
    openDetail: language === "en" ? "Open detail" : "\u67E5\u770B\u8BE6\u60C5",
    deleteTask: language === "en" ? "Delete" : "\u5220\u9664",
    timedJobType: language === "en" ? "Timed job" : "\u5B9A\u65F6\u4EFB\u52A1",
    nextStep: language === "en" ? "Next step" : "\u4E0B\u4E00\u6B65",
  };
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const renderBadgeHtml = (tone, label) => `<span class="badge ${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
  const normalizeViewMode = (value) => String(value || "").trim().toLowerCase() === "details" ? "details" : "cards";
  const parsePositiveInt = (value, fallbackValue) => {
    const parsed = Number.parseInt(String(value || "").trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
  };
  const parseStoredOrder = (raw) => {
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed)
        ? parsed.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  };
  const orderTaskItems = (items, order) => {
    if (!Array.isArray(order) || order.length === 0) return items.slice();
    const byId = new Map(items.map((item) => [String(item.cardId || "").trim(), item]));
    const ordered = [];
    const seen = new Set();
    order.forEach((cardId) => {
      const normalized = String(cardId || "").trim();
      const item = byId.get(normalized);
      if (!item || seen.has(normalized)) return;
      ordered.push(item);
      seen.add(normalized);
    });
    items.forEach((item) => {
      const normalized = String(item.cardId || "").trim();
      if (!normalized || seen.has(normalized)) return;
      ordered.push(item);
    });
    return ordered;
  };
  const getMutationState = () =>
    typeof window.__openclawGetMutationAuthState === "function"
      ? window.__openclawGetMutationAuthState()
      : { gateRequired: false, tokenConfigured: true, canMutate: true };
  const mutationHeaders = (headers = {}) =>
    typeof window.__openclawGetMutationAuthHeaders === "function"
      ? window.__openclawGetMutationAuthHeaders(headers)
      : headers;
  const canMutateTaskBoard = () => Boolean(getMutationState().canMutate);
  const taskBoardLockMessage = () => {
    const state = getMutationState();
    if (!state.gateRequired) return "";
    if (!state.tokenConfigured) return copy.blocked;
    if (!state.canMutate) return copy.writeLocked;
    return "";
  };
  const setStatus = (message) => {
    if (statusNode) statusNode.textContent = message;
  };
  const requestCollaborationRoomOpen = (roomId) => {
    const normalized = String(roomId || "").trim();
    if (!normalized) return false;
    window.dispatchEvent(new CustomEvent("openclaw:collaboration-room-open", {
      detail: { roomId: normalized, source: "task-board" },
    }));
    return true;
  };
  const renderSelectionControl = (item, variant) => {
    if (String(item.cardKind || "").trim() !== "task") {
      return variant === "table" ? `<span class="task-list-static">${escapeHtml(copy.timedJobType)}</span>` : "";
    }
    const className = variant === "table" ? "task-select-control table" : "task-select-control";
    const label = variant === "table" ? copy.select : copy.selectShort;
    return `<label class="${className}"><input type="checkbox" data-task-select data-task-id="${escapeHtml(item.taskId)}" data-task-project-id="${escapeHtml(item.projectId || "")}" data-task-select-key="${escapeHtml(item.selectionKey || "")}" aria-label="${escapeHtml(copy.select)}" /><span>${escapeHtml(label)}</span></label>`;
  };
  const renderDetailButton = (item) => {
    const linkedRoomId = String(item.linkedRoomId || "").trim();
    if (String(item.cardKind || "").trim() !== "task") {
      return `<a class="btn" href="${escapeHtml(item.detailHref || "")}">${escapeHtml(copy.openDetail)}</a>`;
    }
    if (linkedRoomId) {
      return `<button class="btn" type="button" data-task-open-room="${escapeHtml(linkedRoomId)}">${escapeHtml(copy.openDetail)}</button>`;
    }
    return `<button class="btn" type="button" data-task-open-room-missing>${escapeHtml(copy.openDetail)}</button>`;
  };
  const renderDeleteButton = (item, className) => {
    if (String(item.cardKind || "").trim() !== "task") return "";
    return `<button class="btn ${escapeHtml(className || "task-delete-button")}" type="button" data-task-delete data-task-id="${escapeHtml(item.taskId)}" data-task-project-id="${escapeHtml(item.projectId || "")}">${escapeHtml(copy.deleteTask)}</button>`;
  };
  const renderCardMarkup = (item, index) => {
    const priorityPanelClass = String(item.cardKind || "").trim() === "timed_job" ? "task-priority-panel compact" : "task-priority-panel";
    const dragHandleLabel = item.dragHandleLabel || (language === "en" ? "Drag to reorder" : "\u62D6\u62FD\u6392\u5E8F");
    return `<article class="task-brief-card" draggable="true" data-task-card data-task-id="${escapeHtml(item.cardId)}" data-task-board-item-index="${index}">
      <span class="task-status-dot ${escapeHtml(item.statusTone || "")}" title="${escapeHtml(item.statusDotLabel || "")}" aria-hidden="true"></span>
      <div class="task-drag-handle" title="${escapeHtml(dragHandleLabel)}" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="task-brief-head">
        <div class="${priorityPanelClass}">
          <span>${escapeHtml(item.topLabel || "")}</span>
          <strong>${escapeHtml(item.scheduleLabel || "")}</strong>
          <small>${escapeHtml(item.dueLabel || "")}</small>
        </div>
        <div class="task-brief-identity">
          <h3 title="${escapeHtml(item.title || "")}">${escapeHtml(item.displayTitle || item.title || "")}</h3>
          <div class="task-brief-pills">
            ${renderBadgeHtml(item.primaryBadgeTone || "enabled", item.primaryBadgeLabel || "")}
            ${renderBadgeHtml(item.secondaryBadgeTone || "enabled", item.secondaryBadgeLabel || "")}
            ${renderBadgeHtml(item.tertiaryBadgeTone || "enabled", item.tertiaryBadgeLabel || "")}
          </div>
          <div class="task-role">${escapeHtml(item.projectTitle || "")} \u00B7 ${escapeHtml(item.ownerLabel || "")}</div>
        </div>
      </div>
      <dl class="task-brief-list">
        <div class="task-brief-row"><dt>${escapeHtml(item.rowOneLabel || "")}</dt><dd class="task-brief-value clamp-2">${escapeHtml(item.summary || "")}</dd></div>
        <div class="task-brief-row"><dt>${escapeHtml(item.rowTwoLabel || "")}</dt><dd class="task-brief-value clamp-2">${escapeHtml(item.recentSignal || "")}</dd></div>
        <div class="task-brief-row"><dt>${escapeHtml(copy.nextStep)}</dt><dd class="task-brief-value clamp-2">${escapeHtml(item.nextStep || "")}</dd></div>
      </dl>
      <div class="task-brief-actions">
        <div class="task-brief-actions-meta">
          ${renderSelectionControl(item, "card")}
          <div class="meta"><code>${escapeHtml(item.taskId || "")}</code> \u00B7 ${escapeHtml(item.updatedLabel || "")}</div>
        </div>
        <div class="task-brief-action-buttons">
          ${renderDetailButton(item)}
          ${renderDeleteButton(item, "task-delete-button")}
        </div>
      </div>
    </article>`;
  };
  const renderDetailRowMarkup = (item, index) => {
    return `<tr class="task-detail-row" data-task-list-row data-task-kind="${escapeHtml(item.cardKind || "")}" data-task-id="${escapeHtml(item.cardId || "")}" data-task-project-id="${escapeHtml(item.projectId || "")}" data-task-board-item-index="${index}">
      <td class="task-detail-cell task-detail-cell-select">${renderSelectionControl(item, "table")}</td>
      <td class="task-detail-cell task-detail-cell-type"><span class="task-list-kind ${escapeHtml(item.cardKind || "")}">${escapeHtml(item.typeLabel || "")}</span></td>
      <td class="task-detail-cell task-detail-cell-title"><div class="task-detail-title" title="${escapeHtml(item.title || "")}">${escapeHtml(item.displayTitle || item.title || "")}</div><div class="meta task-detail-submeta"><code>${escapeHtml(item.taskId || "")}</code></div></td>
      <td class="task-detail-cell task-detail-cell-status"><div class="task-detail-status">${renderBadgeHtml(item.boardStatusTone || "enabled", item.boardStatusLabel || "")}</div><div class="meta task-detail-submeta" title="${escapeHtml(item.statusLabel || "")}">${escapeHtml(item.statusLabel || "")}</div></td>
      <td class="task-detail-cell task-detail-cell-focus"><div class="task-detail-primary-line" title="${escapeHtml(item.focusValue || "")}">${escapeHtml(item.focusValue || "")}</div><div class="meta task-detail-submeta" title="${escapeHtml(item.dueLabel || "")}">${escapeHtml(item.dueLabel || "")}</div></td>
      <td class="task-detail-cell task-detail-cell-recent"><div class="task-detail-recent" title="${escapeHtml(item.recentSignal || "")}">${escapeHtml(item.recentSignal || "")}</div></td>
      <td class="task-detail-cell task-detail-cell-updated" title="${escapeHtml(item.updatedLabel || "")}">${escapeHtml(item.updatedLabel || "")}</td>
      <td class="task-detail-cell task-detail-cell-actions"><div class="task-detail-actions">${renderDetailButton(item)}${renderDeleteButton(item, "task-delete-button inline")}</div></td>
    </tr>`;
  };
  const listCards = () => Array.from(grid.querySelectorAll("[data-task-card]")).filter((card) => card instanceof HTMLElement);
  const selectableInputs = () => Array.from(root.querySelectorAll("[data-task-select]")).filter((input) => input instanceof HTMLInputElement);
  const deleteButtons = () => Array.from(root.querySelectorAll("[data-task-delete]")).filter((button) => button instanceof HTMLButtonElement);
  const taskBoardPageButtons = () => Array.from(root.querySelectorAll("[data-task-board-page-button]")).filter((button) => button instanceof HTMLButtonElement);

  let storedOrder = parseStoredOrder(root.dataset.taskOrder || "[]");
  taskItems = orderTaskItems(taskItems, storedOrder);
  if (storedOrder.length === 0) {
    storedOrder = taskItems.map((item) => String(item.cardId || "").trim()).filter(Boolean);
    root.dataset.taskOrder = JSON.stringify(storedOrder);
  }
  const taskBoardPageSize = Math.max(1, parsePositiveInt(root.dataset.taskBoardPageSize, 20));
  const taskBoardTotalItems = taskItems.length;
  const taskBoardTotalPages = Math.max(1, Math.ceil(taskBoardTotalItems / taskBoardPageSize));
  const clampTaskBoardPage = (value) => {
    const parsed = parsePositiveInt(value, 1);
    return Math.min(taskBoardTotalPages, Math.max(1, parsed));
  };
  let draggingCard = null;
  let dragSnapshotVisible = [];
  let dropApplied = false;
  let busy = false;
  let currentViewMode = normalizeViewMode(root.dataset.taskViewMode || "cards");
  let currentTaskBoardPage = clampTaskBoardPage(root.dataset.taskBoardCurrentPage);
  const selectedTaskKeys = new Set();
  const selectedTasksByKey = new Map();

  const rebuildSelectableTaskIndex = () => {
    selectedTasksByKey.clear();
    taskItems.forEach((item) => {
      if (String(item.cardKind || "").trim() !== "task") return;
      const key = String(item.selectionKey || "").trim();
      const taskId = String(item.taskId || "").trim();
      if (!key || !taskId) return;
      selectedTasksByKey.set(key, { taskId, projectId: String(item.projectId || "").trim() });
    });
    Array.from(selectedTaskKeys).forEach((key) => {
      if (!selectedTasksByKey.has(key)) selectedTaskKeys.delete(key);
    });
  };
  const selectionKeyForInput = (input) => {
    const explicit = (input.dataset.taskSelectKey || "").trim();
    if (explicit) return explicit;
    return ((input.dataset.taskProjectId || "").trim()) + "::" + ((input.dataset.taskId || "").trim());
  };
  const getPageBounds = (page) => {
    const normalizedPage = clampTaskBoardPage(page);
    const start = (normalizedPage - 1) * taskBoardPageSize;
    return { start, end: Math.min(taskItems.length, start + taskBoardPageSize) };
  };
  const currentVisibleOrder = () => listCards().map((card) => (card.dataset.taskId || "").trim()).filter(Boolean);
  const reorderCurrentPage = (orderedIds) => {
    const bounds = getPageBounds(currentTaskBoardPage);
    const pageItems = taskItems.slice(bounds.start, bounds.end);
    const byId = new Map(pageItems.map((item) => [String(item.cardId || "").trim(), item]));
    const reordered = [];
    const seen = new Set();
    orderedIds.forEach((cardId) => {
      const normalized = String(cardId || "").trim();
      const item = byId.get(normalized);
      if (!item || seen.has(normalized)) return;
      reordered.push(item);
      seen.add(normalized);
    });
    pageItems.forEach((item) => {
      const normalized = String(item.cardId || "").trim();
      if (!normalized || seen.has(normalized)) return;
      reordered.push(item);
    });
    taskItems.splice(bounds.start, pageItems.length, ...reordered);
  };
  const clearDragTargets = () => listCards().forEach((card) => card.classList.remove("drag-target"));
  const syncCardDraggability = () => {
    const allowDrag = currentViewMode === "cards" && !busy;
    listCards().forEach((card) => {
      card.setAttribute("draggable", allowDrag ? "true" : "false");
    });
  };
  const syncSelectionUi = () => {
    selectableInputs().forEach((input) => {
      input.checked = selectedTaskKeys.has(selectionKeyForInput(input));
    });
    if (selectionStatusNode) {
      selectionStatusNode.textContent = selectedTaskKeys.size === 0 ? copy.selectedNone : copy.selectedCount.replace("{count}", String(selectedTaskKeys.size));
    }
    const locked = Boolean(taskBoardLockMessage());
    if (bulkDeleteButton instanceof HTMLButtonElement) {
      bulkDeleteButton.disabled = busy || locked || selectedTaskKeys.size === 0;
    }
    deleteButtons().forEach((button) => {
      button.disabled = busy || locked;
    });
  };
  const bindCard = (card) => {
    if (card.dataset.taskDragBound === "1") return;
    card.dataset.taskDragBound = "1";
    card.addEventListener("dragstart", (event) => {
      if (busy || currentViewMode !== "cards" || !canMutateTaskBoard()) {
        if (!canMutateTaskBoard()) setStatus(taskBoardLockMessage());
        event.preventDefault();
        return;
      }
      draggingCard = card;
      dragSnapshotVisible = currentVisibleOrder();
      dropApplied = false;
      card.classList.add("dragging");
      setStatus(copy.dragging);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        try {
          event.dataTransfer.setData("text/plain", card.dataset.taskId || "");
        } catch {}
      }
    });
    card.addEventListener("dragover", (event) => {
      if (!draggingCard || draggingCard === card || currentViewMode !== "cards") return;
      event.preventDefault();
      clearDragTargets();
      card.classList.add("drag-target");
      const rect = card.getBoundingClientRect();
      const insertAfter = event.clientY > rect.top + rect.height / 2;
      if (insertAfter) {
        grid.insertBefore(draggingCard, card.nextElementSibling);
      } else {
        grid.insertBefore(draggingCard, card);
      }
    });
    card.addEventListener("drop", (event) => {
      if (!draggingCard || currentViewMode !== "cards") return;
      event.preventDefault();
      dropApplied = true;
    });
    card.addEventListener("dragend", () => {
      window.requestAnimationFrame(() => {
        void finalizeDrag();
      });
    });
  };
  const renderCurrentPage = () => {
    const bounds = getPageBounds(currentTaskBoardPage);
    const pageItems = taskItems.slice(bounds.start, bounds.end);
    grid.innerHTML = pageItems.map((item, index) => renderCardMarkup(item, bounds.start + index)).join("");
    if (detailsTableBody instanceof HTMLElement) {
      detailsTableBody.innerHTML = pageItems.map((item, index) => renderDetailRowMarkup(item, bounds.start + index)).join("");
    }
    listCards().forEach(bindCard);
    syncCardDraggability();
    syncSelectionUi();
  };
  const applyTaskBoardPage = (value) => {
    currentTaskBoardPage = clampTaskBoardPage(value);
    root.dataset.taskBoardCurrentPage = String(currentTaskBoardPage);
    renderCurrentPage();
    if (pageSummaryNode instanceof HTMLElement) {
      const bounds = getPageBounds(currentTaskBoardPage);
      const startItem = taskBoardTotalItems === 0 ? 0 : bounds.start + 1;
      const endItem = taskBoardTotalItems === 0 ? 0 : bounds.end;
      pageSummaryNode.textContent = copy.pageSummary.replace("{start}", String(startItem)).replace("{end}", String(endItem)).replace("{total}", String(taskBoardTotalItems));
    }
    taskBoardPageButtons().forEach((button) => {
      const active = clampTaskBoardPage(button.dataset.taskBoardPage) === currentTaskBoardPage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (pageNav instanceof HTMLElement) pageNav.hidden = taskBoardTotalPages <= 1;
  };
  const restoreVisibleOrder = (order) => {
    reorderCurrentPage(order);
    renderCurrentPage();
  };
  const updateUiPreferences = async (patch) => {
    const response = await fetch("/api/ui/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) {
      const message = payload && payload.error && payload.error.message ? payload.error.message : response.statusText || copy.failed;
      throw new Error(message);
    }
    return payload;
  };
  const persistVisibleOrder = async () => {
    const nextOrder = taskItems.map((item) => String(item.cardId || "").trim()).filter(Boolean);
    if (JSON.stringify(nextOrder) === JSON.stringify(storedOrder)) {
      setStatus(copy.ready);
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
    setStatus(copy.saving);
    try {
      await updateUiPreferences({ taskCardOrder: nextOrder });
      storedOrder = nextOrder;
      root.dataset.taskOrder = JSON.stringify(nextOrder);
      setStatus(copy.saved);
    } catch (error) {
      restoreVisibleOrder(dragSnapshotVisible);
      const message = error instanceof Error ? error.message : copy.failed;
      setStatus(copy.failed + ": " + message);
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
    activeCard.classList.remove("dragging");
    clearDragTargets();
    if (!dropApplied) {
      restoreVisibleOrder(dragSnapshotVisible);
      setStatus(taskBoardLockMessage() || copy.ready);
      return;
    }
    dropApplied = false;
    const nextVisibleOrder = currentVisibleOrder();
    if (JSON.stringify(nextVisibleOrder) === JSON.stringify(dragSnapshotVisible)) {
      setStatus(taskBoardLockMessage() || copy.ready);
      return;
    }
    reorderCurrentPage(nextVisibleOrder);
    await persistVisibleOrder();
    renderCurrentPage();
  };
  const cancelDrag = () => {
    if (!draggingCard) return;
    restoreVisibleOrder(dragSnapshotVisible);
    draggingCard.classList.remove("dragging");
    draggingCard = null;
    dropApplied = false;
    clearDragTargets();
  };
  const syncViewModeUi = () => {
    root.dataset.taskViewMode = currentViewMode;
    if (cardsPanel instanceof HTMLElement) cardsPanel.hidden = currentViewMode !== "cards";
    if (detailsPanel instanceof HTMLElement) detailsPanel.hidden = currentViewMode !== "details";
    viewButtons.forEach((button) => {
      const active = normalizeViewMode(button.dataset.taskViewModeValue) === currentViewMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    syncCardDraggability();
  };
  const parseApiError = async (response, fallbackLabel) => {
    const payload = await response.json().catch(() => null);
    if (response.ok && payload && payload.ok === true) return payload;
    const message = payload && payload.error && payload.error.message ? payload.error.message : response.statusText || fallbackLabel;
    throw new Error(message);
  };
  rebuildSelectableTaskIndex();
  renderCurrentPage();
  grid.addEventListener("dragover", (event) => {
    if (!draggingCard || currentViewMode !== "cards") return;
    event.preventDefault();
  });
  grid.addEventListener("drop", (event) => {
    if (!draggingCard || currentViewMode !== "cards") return;
    event.preventDefault();
    dropApplied = true;
  });
  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-task-select]")) return;
    const key = selectionKeyForInput(target);
    if (!key) return;
    if (target.checked) selectedTaskKeys.add(key);
    else selectedTaskKeys.delete(key);
    syncSelectionUi();
  });
  root.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const pageButton = target.closest("[data-task-board-page-button]");
    if (pageButton instanceof HTMLButtonElement) {
      if (busy) return;
      cancelDrag();
      applyTaskBoardPage(pageButton.dataset.taskBoardPage);
      return;
    }
    const viewButton = target.closest("[data-task-view-mode-button]");
    if (viewButton instanceof HTMLButtonElement) {
      const nextMode = normalizeViewMode(viewButton.dataset.taskViewModeValue);
      if (nextMode === currentViewMode || busy) return;
      cancelDrag();
      const previousMode = currentViewMode;
      currentViewMode = nextMode;
      syncViewModeUi();
      busy = true;
      syncSelectionUi();
      setStatus(copy.viewSaving);
      try {
        await updateUiPreferences({ taskBoardViewMode: nextMode });
        setStatus(copy.viewSaved);
      } catch (error) {
        currentViewMode = previousMode;
        syncViewModeUi();
        const message = error instanceof Error ? error.message : copy.viewFailed;
        setStatus(copy.viewFailed + ": " + message);
      } finally {
        busy = false;
        syncSelectionUi();
      }
      return;
    }
    const openRoomControl = target.closest("[data-task-open-room]");
    if (openRoomControl instanceof HTMLElement) {
      requestCollaborationRoomOpen(openRoomControl.dataset.taskOpenRoom || "");
      return;
    }
    const missingRoomControl = target.closest("[data-task-open-room-missing]");
    if (missingRoomControl instanceof HTMLButtonElement) {
      setStatus(copy.missingRoom);
      return;
    }
    const singleDeleteButton = target.closest("[data-task-delete]");
    if (singleDeleteButton instanceof HTMLButtonElement) {
      if (busy) return;
      const taskId = (singleDeleteButton.dataset.taskId || "").trim();
      const projectId = (singleDeleteButton.dataset.taskProjectId || "").trim();
      const message = copy.confirmSingle;
      if (taskId && (typeof window.confirm !== "function" || window.confirm(message))) {
        await deleteTasks([{ taskId, projectId }]);
      }
      return;
    }
    if (bulkDeleteButton instanceof HTMLButtonElement && target.closest("[data-task-board-bulk-delete]")) {
      if (busy || selectedTaskKeys.size === 0) return;
      const items = Array.from(selectedTaskKeys).map((key) => selectedTasksByKey.get(key)).filter(Boolean);
      const message = copy.confirmBulk.replace("{count}", String(items.length));
      if (typeof window.confirm !== "function" || window.confirm(message)) {
        await deleteTasks(items);
      }
    }
  });
  async function deleteTasks(items) {
    if (items.length === 0) return;
    const lockMessage = taskBoardLockMessage();
    if (lockMessage) {
      setStatus(lockMessage);
      return;
    }
    busy = true;
    syncSelectionUi();
    syncCardDraggability();
    setStatus(items.length > 1 ? copy.bulkDeleting : copy.deleting);
    try {
      if (items.length === 1) {
        const target = items[0];
        const query = target.projectId ? "?projectId=" + encodeURIComponent(target.projectId) : "";
        const response = await fetch("/api/tasks/" + encodeURIComponent(target.taskId) + query, { method: "DELETE", headers: mutationHeaders({}) });
        await parseApiError(response, copy.deleteFailed);
        setStatus(copy.deleted);
      } else {
        const response = await fetch("/api/tasks/bulk-delete", { method: "POST", headers: mutationHeaders({ "content-type": "application/json" }), body: JSON.stringify({ tasks: items }) });
        await parseApiError(response, copy.deleteFailed);
        setStatus(copy.bulkDeleted);
      }
      window.setTimeout(() => window.location.reload(), 120);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.deleteFailed;
      setStatus(copy.deleteFailed + ": " + message);
    } finally {
      busy = false;
      syncSelectionUi();
      syncCardDraggability();
    }
  }
  syncViewModeUi();
  applyTaskBoardPage(currentTaskBoardPage);
  syncSelectionUi();
  setStatus(taskBoardLockMessage() || copy.ready);
  window.addEventListener("openclaw:mutation-auth-changed", () => {
    if (draggingCard && !canMutateTaskBoard()) cancelDrag();
    syncSelectionUi();
    setStatus(taskBoardLockMessage() || copy.ready);
  });
  return true;
}

function createTaskBoardCompactScriptSource() {
  return `const mountCompactTaskBoard = ${mountCompactTaskBoard.toString()};`;
}

module.exports = { createTaskBoardCompactScriptSource };
