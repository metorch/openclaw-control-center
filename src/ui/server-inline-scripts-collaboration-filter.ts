// @ts-nocheck

const { escapeHtml, pickUiText } = require("./server-shared");

function renderCollaborationFilterScript(language = "zh", primaryDispatcherFilterLabel = pickUiText(language, "Jarvis dispatched", "\u53EA\u770B Jarvis \u6D3E\u53D1")) {
    return `<script>
(() => {
  const roots = Array.from(document.querySelectorAll('[data-collab-root]'));
  if (roots.length === 0) return;

  const copy = {
    all: '${escapeHtml(pickUiText(language, "Showing all visible threads", "\u5F53\u524D\u663E\u793A\u5168\u90E8\u53EF\u89C1\u7EBF\u7A0B"))}',
    active: '${escapeHtml(pickUiText(language, "Showing in-progress collaboration", "\u5F53\u524D\u663E\u793A\u8FDB\u884C\u4E2D\u7684\u534F\u4F5C"))}',
    blocked: '${escapeHtml(pickUiText(language, "Showing blocked collaboration", "\u5F53\u524D\u663E\u793A\u5361\u4F4F\u7684\u534F\u4F5C"))}',
    completed: '${escapeHtml(pickUiText(language, "Showing completed collaboration", "\u5F53\u524D\u663E\u793A\u5DF2\u5B8C\u6210\u7684\u534F\u4F5C"))}',
    multiAgent: '${escapeHtml(pickUiText(language, "Showing multi-agent collaboration only", "\u5F53\u524D\u53EA\u770B\u591A\u667A\u80FD\u4F53\u534F\u4F5C"))}',
    primaryDispatched: '${escapeHtml(primaryDispatcherFilterLabel)}',
  };

  roots.forEach((root) => {
    const buttons = Array.from(root.querySelectorAll('[data-collab-filter]'));
    const cards = Array.from(root.querySelectorAll('[data-collab-card]'));
    const stateNode = root.querySelector('[data-collab-filter-state]');
    const primaryButton = root.querySelector('[data-collab-filter="primary-dispatched"]');
    if (primaryButton instanceof HTMLButtonElement) {
      primaryButton.dataset.collabFilter = 'primary-dispatched';
      primaryButton.textContent = '${escapeHtml(primaryDispatcherFilterLabel)}';
    }
    const apply = (mode) => {
      buttons.forEach((button) => button.classList.toggle('active', (button.dataset.collabFilter || 'all') === mode));
      cards.forEach((card) => {
        const state = card.dataset.collabState || 'completed';
        const multiAgent = card.dataset.collabMultiAgent === '1';
        const primaryDispatched = card.dataset.collabPrimaryDispatched === '1';
        const matches =
          mode === 'all' ||
          (mode === 'active' && (state === 'active' || state === 'handoff')) ||
          (mode === 'blocked' && state === 'blocked') ||
          (mode === 'completed' && state === 'completed') ||
          (mode === 'multi-agent' && multiAgent) ||
          (mode === 'primary-dispatched' && primaryDispatched);
        card.hidden = !matches;
      });
      if (stateNode) {
        stateNode.textContent =
          mode === 'all'
            ? copy.all
            : mode === 'active'
              ? copy.active
              : mode === 'blocked'
                ? copy.blocked
                : mode === 'completed'
                  ? copy.completed
                  : mode === 'multi-agent'
                    ? copy.multiAgent
                    : copy.primaryDispatched;
      }
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => apply(button.dataset.collabFilter || 'all'));
    });

    apply('all');
  });
})();
</script>`;
}

export { renderCollaborationFilterScript };
