// @ts-nocheck

function renderQuotaResetScript() {
    return `<script>
(() => {
  const nodes = Array.from(document.querySelectorAll('[data-quota-reset-at]'));
  if (nodes.length === 0) return;

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const monthDayYearFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formatReset = (raw, windowLabel) => {
    if (!raw) return '\u672A\u63D0\u4F9B';
    const ms = Date.parse(raw);
    if (!Number.isFinite(ms)) return raw;
    const date = new Date(ms);
    const normalized = String(windowLabel || '').trim().toLowerCase();
    if (normalized === '5h' || normalized.includes('5h')) {
      return timeFormatter.format(date);
    }
    const now = new Date();
    if (date.getFullYear() === now.getFullYear()) {
      return monthDayFormatter.format(date);
    }
    return monthDayYearFormatter.format(date);
  };

  nodes.forEach((node) => {
    const raw = node.getAttribute('data-quota-reset-at') || '';
    const windowLabel = node.getAttribute('data-quota-window') || '';
    node.textContent = formatReset(raw, windowLabel);
  });
})();
</script>`;
}

export { renderQuotaResetScript };
