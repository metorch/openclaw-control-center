// @ts-nocheck

const { pickUiText } = require("./server-shared");

function renderTaskDiagnosticsScript(language) {
  const labels = {
    loading: pickUiText(
      language,
      "Loading diagnostics and raw task data in the background...",
      "正在后台加载诊断与原始任务数据……",
    ),
    failed: pickUiText(
      language,
      "Diagnostics could not be loaded automatically.",
      "诊断区暂时无法自动加载。",
    ),
    empty: pickUiText(
      language,
      "Diagnostics content is empty.",
      "诊断内容为空。",
    ),
  };

  return `<script>
(() => {
  const shells = Array.from(document.querySelectorAll('[data-task-diagnostics-shell]'));
  if (shells.length === 0) return;

  shells.forEach((shell) => {
    if (!(shell instanceof HTMLElement)) return;
    const details = shell.closest('details');
    if (!(details instanceof HTMLDetailsElement)) return;
    const endpoint = (shell.dataset.taskDiagnosticsEndpoint || '').trim();
    if (!endpoint) return;

    const statusNode = shell.querySelector('[data-task-diagnostics-status]');
    let pendingRequest = null;

    const setStatus = (message) => {
      if (!(statusNode instanceof HTMLElement)) return;
      statusNode.textContent = String(message || '').trim();
    };

    const readErrorMessage = async (response) => {
      try {
        const text = await response.text();
        return String(text || '').trim();
      } catch {
        return '';
      }
    };

    const load = () => {
      if ((shell.dataset.taskDiagnosticsLoaded || '').trim() === '1') {
        return Promise.resolve();
      }
      if (pendingRequest) return pendingRequest;

      shell.dataset.taskDiagnosticsLoading = '1';
      setStatus(${JSON.stringify(labels.loading)});

      pendingRequest = window.fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'text/html',
        },
        cache: 'no-store',
      })
        .then(async (response) => {
          if (!response.ok) {
            const detail = await readErrorMessage(response);
            throw new Error(detail || ${JSON.stringify(labels.failed)});
          }
          const html = await response.text();
          if (!String(html || '').trim()) {
            throw new Error(${JSON.stringify(labels.empty)});
          }
          shell.innerHTML = html;
          shell.dataset.taskDiagnosticsLoaded = '1';
          shell.dataset.taskDiagnosticsPending = '0';
        })
        .catch((error) => {
          shell.dataset.taskDiagnosticsLoaded = '0';
          shell.dataset.taskDiagnosticsPending = '1';
          setStatus(error instanceof Error && error.message ? error.message : ${JSON.stringify(labels.failed)});
        })
        .finally(() => {
          shell.dataset.taskDiagnosticsLoading = '0';
          pendingRequest = null;
        });

      return pendingRequest;
    };

    if (details.open) {
      void load();
    }

    details.addEventListener('toggle', () => {
      if (!details.open) return;
      void load();
    });
  });
})();
</script>`;
}

export { renderTaskDiagnosticsScript };
