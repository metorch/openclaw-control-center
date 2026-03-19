// @ts-nocheck

function pickUiText(language, en, zh) {
  return language === "zh" ? zh : en;
}

function safeTruncate(input, maxLength) {
  if (input.length <= maxLength) {
    return input;
  }
  if (maxLength <= 3) {
    return input.slice(0, Math.max(0, maxLength));
  }
  return `${input.slice(0, maxLength - 3)}...`;
}

function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInt(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "0.00%";
  }
  return `${value.toFixed(2)}%`;
}

function extractDateFromName(value) {
  const match = value.match(/(20\d{2}-\d{2}-\d{2})/);
  return match ? match[1] : void 0;
}

function toPlainSummary(input, maxLength) {
  const compact = input.replace(/`{1,3}[^`]*`{1,3}/g, " ").replace(/[#>*_\-\[\]\(\)!]/g, " ").replace(/\s+/g, " ").trim();
  if (!compact) {
    return "\u6682\u65E0\u6458\u8981\u3002";
  }
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1)}\u2026`;
}

function extractMarkdownHeading(input) {
  const line = input
    .split(/\r?\n/)
    .map((row) => row.trim())
    .find((row) => row.startsWith("#"));
  if (!line) {
    return void 0;
  }
  return line.replace(/^#+\s*/, "").trim() || void 0;
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => value.trim() !== ""))].sort((a, b) => a.localeCompare(b));
}

function toSortableMs(value) {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTimeAgoFromNow(value, language = "zh") {
  const parsed = toSortableMs(value);
  if (!parsed) {
    return pickUiText(language, "time unavailable", "时间未知");
  }
  const diffSeconds = Math.max(0, Math.round((Date.now() - parsed) / 1e3));
  if (diffSeconds < 60) {
    return pickUiText(language, "just now", "刚刚");
  }
  if (diffSeconds < 3600) {
    const minutes = Math.max(1, Math.round(diffSeconds / 60));
    return pickUiText(language, `${minutes}m ago`, `${minutes} 分钟前`);
  }
  if (diffSeconds < 86400) {
    const hours = Math.max(1, Math.round(diffSeconds / 3600));
    return pickUiText(language, `${hours}h ago`, `${hours} 小时前`);
  }
  const days = Math.max(1, Math.round(diffSeconds / 86400));
  return pickUiText(language, `${days}d ago`, `${days} 天前`);
}

function badge(status, label) {
  const safeStatus = escapeHtml(status);
  const safeLabel = escapeHtml(label ?? status);
  return `<span class="badge ${safeStatus}">${safeLabel}</span>`;
}

export {
  badge,
  escapeHtml,
  extractMarkdownHeading,
  extractDateFromName,
  formatInt,
  formatPercent,
  formatTimeAgoFromNow,
  pickUiText,
  safeTruncate,
  toPlainSummary,
  toSortableMs,
  uniqueSorted,
};
