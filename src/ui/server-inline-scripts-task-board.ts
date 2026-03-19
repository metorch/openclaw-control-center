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
    const l = {
      ready: language === 'en' ? 'Task and schedule order is ready.' : '\u4EFB\u52A1\u4E0E\u6392\u7A0B\u987A\u5E8F\u5DF2\u5C31\u7EEA\u3002',
      dragging: language === 'en' ? 'Dragging board card...' : '\u6B63\u5728\u62D6\u62FD\u770B\u677F\u5361\u7247...',
      saving: language === 'en' ? 'Saving board order...' : '\u6B63\u5728\u4FDD\u5B58\u770B\u677F\u987A\u5E8F...',
      saved: language === 'en' ? 'Board order saved.' : '\u770B\u677F\u987A\u5E8F\u5DF2\u4FDD\u5B58\u3002',
      writeLocked: language === 'en'
        ? 'Write access is off. Turn on the top toolbar unlock before saving board order.'
        : '\u5199\u5165\u89E3\u9501\u5DF2\u5173\u95ED\uFF0C\u8BF7\u5148\u5728\u9876\u90E8\u5DE5\u5177\u680F\u5F00\u542F\u540E\u518D\u4FDD\u5B58\u770B\u677F\u987A\u5E8F\u3002',
      blocked: language === 'en'
        ? 'This machine has not set a safety passcode yet, so board changes are blocked.'
        : '\u8FD9\u53F0\u673A\u5668\u8FD8\u6CA1\u8BBE\u7F6E\u5B89\u5168\u53E3\u4EE4\uFF0C\u6240\u4EE5\u5F53\u524D\u4E0D\u80FD\u4FEE\u6539\u770B\u677F\u987A\u5E8F\u3002',
      failed: language === 'en' ? 'Save failed' : '\u4FDD\u5B58\u5931\u8D25',
    };
    const getMutationState = () =>
      typeof window.__openclawGetMutationAuthState === 'function'
        ? window.__openclawGetMutationAuthState()
        : { gateRequired: false, tokenConfigured: true, canMutate: true };
    const canMutateTaskBoard = () => Boolean(getMutationState().canMutate);
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
    let storedOrder = parseStoredOrder(root.dataset.taskOrder || '[]');
    let draggingCard = null;
    let dragSnapshotVisible = [];
    let saving = false;
    let dropApplied = false;

    const setStatus = (message) => {
      if (statusNode) statusNode.textContent = message;
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

      saving = true;
      setStatus(l.saving);
      try {
        const headers = { 'content-type': 'application/json' };
        const response = await fetch('/api/ui/preferences', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ taskCardOrder: nextOrder }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.ok !== true) {
          const message = payload && payload.error && payload.error.message ? payload.error.message : response.statusText || l.failed;
          throw new Error(message);
        }
        storedOrder = nextOrder;
        root.dataset.taskOrder = JSON.stringify(nextOrder);
        setStatus(l.saved);
      } catch (error) {
        restoreVisibleOrder(dragSnapshotVisible);
        const message = error instanceof Error ? error.message : l.failed;
        setStatus(l.failed + ': ' + message);
      } finally {
        saving = false;
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
        setStatus(l.ready);
        return;
      }
      dropApplied = false;
      if (JSON.stringify(currentVisibleOrder()) === JSON.stringify(dragSnapshotVisible)) {
        setStatus(l.ready);
        return;
      }
      await persistVisibleOrder();
    };
    const bindCard = (card) => {
      if (card.dataset.taskDragBound === '1') return;
      card.dataset.taskDragBound = '1';
      card.addEventListener('dragstart', (event) => {
        if (saving || !canMutateTaskBoard()) {
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
        if (!draggingCard || draggingCard === card) return;
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
        if (!draggingCard) return;
        event.preventDefault();
        dropApplied = true;
      });
      card.addEventListener('dragend', () => {
        window.requestAnimationFrame(() => {
          void finalizeDrag();
        });
      });
    };

    listCards().forEach(bindCard);
    grid.addEventListener('dragover', (event) => {
      if (!draggingCard) return;
      event.preventDefault();
    });
    grid.addEventListener('drop', (event) => {
      if (!draggingCard) return;
      event.preventDefault();
      dropApplied = true;
    });
    const initialTaskBoardLockMessage = taskBoardLockMessage();
    setStatus(initialTaskBoardLockMessage || l.ready);
    window.addEventListener('openclaw:mutation-auth-changed', () => {
      if (draggingCard && !canMutateTaskBoard()) {
        restoreVisibleOrder(dragSnapshotVisible);
        draggingCard.classList.remove('dragging');
        draggingCard = null;
        dropApplied = false;
        clearDragTargets();
      }
      const lockMessage = taskBoardLockMessage();
      setStatus(lockMessage || l.ready);
    });
  });
})();
</script>`;
}

export { renderTaskBoardScript };
