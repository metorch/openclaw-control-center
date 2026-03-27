// @ts-nocheck

const { pickUiText } = require("./server-shared");

function renderSettingsInsightsScript(language) {
  const labels = {
    loading: pickUiText(
      language,
      "Loading the latest environment signals in the background...",
      "正在后台补齐最新环境信号...",
    ),
    failed: pickUiText(
      language,
      "Latest environment signals could not be loaded automatically.",
      "最新环境信号暂时无法自动加载。",
    ),
  };

  return `<script>
(() => {
  const root = document.querySelector('[data-settings-environment-shell]');
  if (!(root instanceof HTMLElement)) return;
  if ((root.dataset.settingsInsightsPending || '').trim() !== '1') return;
  const endpoint = (root.dataset.settingsInsightsEndpoint || '').trim();
  if (!endpoint) return;

  const statusNode = root.querySelector('[data-settings-environment-pending-status]');
  const setStatus = (message) => {
    if (!(statusNode instanceof HTMLElement)) return;
    statusNode.textContent = String(message || '').trim();
  };
  const parseError = async (response) => {
    try {
      const payload = await response.json();
      const detail = typeof payload?.error?.message === 'string'
        ? payload.error.message
        : typeof payload?.error === 'string'
          ? payload.error
          : '';
      return detail || '';
    } catch {
      return '';
    }
  };

  setStatus(${JSON.stringify(labels.loading)});
  window.fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
    .then(async (response) => {
      if (!response.ok) {
        const detail = await parseError(response);
        throw new Error(detail || ${JSON.stringify(labels.failed)});
      }
      const payload = await response.json().catch(() => ({}));
      if (payload?.ok !== true || typeof payload.html !== 'string' || !payload.html.trim()) {
        throw new Error(${JSON.stringify(labels.failed)});
      }
      root.innerHTML = payload.html;
      root.dataset.settingsInsightsPending = '0';
    })
    .catch((error) => {
      setStatus(error instanceof Error && error.message ? error.message : ${JSON.stringify(labels.failed)});
    });
})();
</script>`;
}

export { renderSettingsInsightsScript };
