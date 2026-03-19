// @ts-nocheck

const { badge, escapeHtml, formatInt, formatPercent, pickUiText, safeTruncate } = require("./server-shared");

const TOKEN_PIE_COLORS = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ab"];

function createUsageRenderers(deps) {
  const { normalizeInlineText } = deps;

  function usagePeriodLabel(key, fallback, language = "zh") {
    if (key === "today") return pickUiText(language, "Today", "\u4ECA\u5929");
    if (key === "7d") return pickUiText(language, "Last 7 days", "\u8FD1 7 \u5929");
    if (key === "30d") return pickUiText(language, "Last 30 days", "\u8FD1 30 \u5929");
    return fallback;
  }

  function formatCurrency(value) {
    return `$${value.toFixed(2)}`;
  }

  function dataConnectionLabel(status, language = "zh") {
    const normalized = status.trim().toLowerCase();
    if (normalized === "connected") return pickUiText(language, "Connected", "\u5DF2\u8FDE\u63A5");
    if (normalized === "partial") return pickUiText(language, "Partially connected", "\u90E8\u5206\u8FDE\u63A5");
    if (normalized === "not_connected") return pickUiText(language, "Not connected", "\u672A\u8FDE\u63A5");
    return status;
  }

  function simplifyUsageLabel(label) {
    const normalized = normalizeInlineText(label);
    if (!normalized) return "\u672A\u547D\u540D";
    const withoutUuid = normalized.replace(/\s*\([0-9a-f]{8}-[0-9a-f-]{27,}\)\s*/gi, "");
    return safeTruncate(withoutUuid, 72);
  }

  function renderUsagePeriodCards(periods, language = "zh") {
    if (periods.length === 0) {
      return `<div class="empty-state">${escapeHtml(pickUiText(language, "No period snapshot yet because the data source is not connected.", "\u6570\u636E\u6E90\u672A\u8FDE\u63A5\uFF0C\u6682\u65E0\u5468\u671F\u7528\u91CF\u5FEB\u7167\u3002"))}</div>`;
    }
    const cards = periods.map((period) => {
      const periodLabel = usagePeriodLabel(period.key, period.label, language);
      const tokenLabel = period.sourceStatus === "not_connected" ? pickUiText(language, "Not connected", "\u6570\u636E\u6E90\u672A\u8FDE\u63A5") : formatInt(period.tokens);
      const costLabel = period.sourceStatus === "not_connected" ? pickUiText(language, "Not connected", "\u6570\u636E\u6E90\u672A\u8FDE\u63A5") : formatCurrency(period.estimatedCost);
      const requestLabel = period.requestCountStatus !== "not_connected" && typeof period.requestCount === "number" ? String(period.requestCount) : pickUiText(language, "Not connected", "\u6570\u636E\u6E90\u672A\u8FDE\u63A5");
      return `<div class="status-chip usage-chip"><span>${escapeHtml(periodLabel)}</span><strong>${escapeHtml(pickUiText(language, "AI usage", "AI \u7528\u91CF"))}\uFF1A${escapeHtml(tokenLabel)}</strong><span>${escapeHtml(pickUiText(language, "Estimated cost", "\u9884\u4F30\u8D39\u7528"))}\uFF1A${escapeHtml(costLabel)}</span><span>${escapeHtml(pickUiText(language, "Requests", "\u8BF7\u6C42\u6570"))}\uFF1A${escapeHtml(requestLabel)}</span><span>${escapeHtml(pickUiText(language, "Pace", "\u8282\u594F"))}\uFF1A${escapeHtml(period.pace.label)}</span></div>`;
    }).join("");
    return `<div class="status-strip">${cards}</div>`;
  }

  function renderUsageContextRows(rows, language) {
    if (rows.length === 0) return "";
    return rows.slice(0, 24).map((item) => {
      const usage = typeof item.usagePercent === "number"
        ? `${formatInt(item.usedTokens)} / ${formatInt(item.contextLimitTokens ?? 0)} (${item.usagePercent.toFixed(1)}%)`
        : `${formatInt(item.usedTokens)} / ${pickUiText(language, "Data source not connected", "\u6570\u636E\u6E90\u672A\u8FDE\u63A5")}`;
      return `<tr><td>${escapeHtml(item.agentId)}</td><td><code>${escapeHtml(item.sessionKey)}</code></td><td>${escapeHtml(item.model)}<div class="meta">${escapeHtml(item.provider)}</div></td><td>${usage}</td><td>${escapeHtml(item.paceLabel)} ${badge(item.thresholdState)}</td><td>${escapeHtml(item.warningThresholds)}</td></tr>`;
    }).join("");
  }

  function renderUsageBreakdownRows(rows, label, language = "zh") {
    if (rows.length === 0) return "";
    return rows.map((item) => `<tr><td>${escapeHtml(simplifyUsageLabel(item.label))}</td><td>${formatInt(item.tokens)}</td><td>${formatCurrency(item.estimatedCost)}</td><td>${item.requests}</td><td>${item.sessions}</td><td>${badge(item.sourceStatus, dataConnectionLabel(item.sourceStatus, language))}</td></tr>`).join("");
  }

  function renderTokenShareRows(rows, totalTokens, language = "zh") {
    if (rows.length === 0) return "";
    const safeTotal = totalTokens > 0 ? totalTokens : rows.reduce((sum, item) => sum + item.tokens, 0);
    return rows.map((item) => {
      const share = safeTotal > 0 ? item.tokens / safeTotal * 100 : 0;
      return `<tr><td>${escapeHtml(simplifyUsageLabel(item.label))}</td><td>${formatInt(item.tokens)}</td><td>${formatPercent(share)}</td><td>${item.sessions}</td><td>${badge(item.sourceStatus, dataConnectionLabel(item.sourceStatus, language))}</td></tr>`;
    }).join("");
  }

  function renderTokenPieChart(rows, totalTokens, centerLabel, language = "zh") {
    const sourceRows = rows.filter((item) => item.tokens > 0);
    if (sourceRows.length === 0 || totalTokens <= 0) return "";
    const segments = [...sourceRows].sort((a, b) => b.tokens - a.tokens);
    let cursor = 0;
    const gradientStops = [];
    const legend = segments.map((item, index) => {
      const color = TOKEN_PIE_COLORS[index % TOKEN_PIE_COLORS.length];
      const share = item.tokens / totalTokens * 100;
      const next = cursor + share;
      gradientStops.push(`${color} ${cursor.toFixed(2)}% ${next.toFixed(2)}%`);
      cursor = next;
      return `<li><span class="pie-swatch" style="background:${color};"></span><span class="pie-name">${escapeHtml(simplifyUsageLabel(item.label))}</span><span class="pie-val">${formatPercent(share)}</span></li>`;
    }).join("");
    const gradient = `conic-gradient(${gradientStops.join(", ")})`;
    return `<div class="pie-wrap">
    <div class="pie-chart" style="background:${gradient};">
      <div class="pie-hole"><strong>${escapeHtml(centerLabel)}</strong><span>${formatInt(totalTokens)} ${escapeHtml(pickUiText(language, "tokens", "\u7528\u91CF"))}</span></div>
    </div>
    <ul class="pie-legend">${legend}</ul>
  </div>`;
  }

  function renderUsageConnectorTodos(todos, language = "zh") {
    if (todos.length === 0) {
      return `<li>${escapeHtml(pickUiText(language, "All usage connectors are enabled.", "\u6240\u6709\u7528\u91CF\u8FDE\u63A5\u5668\u5747\u5DF2\u542F\u7528\u3002"))}</li>`;
    }
    const simplifyTitle = (raw) => {
      const text = normalizeInlineText(raw);
      const lower = text.toLowerCase();
      if (lower.includes("context")) return pickUiText(language, "Model context data", "\u6A21\u578B\u4E0A\u4E0B\u6587\u6570\u636E");
      if (lower.includes("digest")) return pickUiText(language, "Trend history data", "\u8D8B\u52BF\u5386\u53F2\u6570\u636E");
      if (lower.includes("request")) return pickUiText(language, "Request count data", "\u8BF7\u6C42\u8BA1\u6570\u6570\u636E");
      if (lower.includes("budget")) return pickUiText(language, "Budget limit data", "\u9884\u7B97\u9650\u989D\u6570\u636E");
      if (lower.includes("provider")) return pickUiText(language, "Provider mapping data", "\u4F9B\u5E94\u5546\u6620\u5C04\u6570\u636E");
      if (lower.includes("subscription")) return pickUiText(language, "Subscription billing data", "\u8BA2\u9605\u8D26\u5355\u6570\u636E");
      return pickUiText(language, "Data connector item", "\u6570\u636E\u8FDE\u63A5\u9879");
    };
    const simplifyDetail = (raw) => {
      const text = normalizeInlineText(raw);
      const lower = text.toLowerCase();
      if (lower.includes("subscription")) return pickUiText(language, "Connect the subscription billing data.", "\u8BF7\u8FDE\u63A5\u8BA2\u9605\u8D26\u5355\u6570\u636E\u3002");
      if (lower.includes("digest") || lower.includes("history")) return pickUiText(language, "Keep monitoring running so trend history stays complete.", "\u8BF7\u4FDD\u6301\u76D1\u63A7\u6301\u7EED\u8FD0\u884C\uFF0C\u786E\u4FDD\u8D8B\u52BF\u6570\u636E\u5B8C\u6574\u3002");
      if (lower.includes("request")) return pickUiText(language, "Connect the request count source.", "\u8BF7\u8FDE\u63A5\u8BF7\u6C42\u8BA1\u6570\u6570\u636E\u6E90\u3002");
      if (lower.includes("provider")) return pickUiText(language, "Complete the model-to-provider mapping.", "\u8BF7\u8865\u5168\u6A21\u578B\u5230\u4F9B\u5E94\u5546\u7684\u6620\u5C04\u3002");
      if (lower.includes("context")) return pickUiText(language, "Connect model context capacity data.", "\u8BF7\u8FDE\u63A5\u6A21\u578B\u4E0A\u4E0B\u6587\u5BB9\u91CF\u4FE1\u606F\u3002");
      if (lower.includes("budget")) return pickUiText(language, "Configure budget limits so the system can warn early.", "\u8BF7\u914D\u7F6E\u9884\u7B97\u9650\u989D\uFF0C\u4FBF\u4E8E\u98CE\u9669\u9884\u8B66\u3002");
      return pickUiText(language, "Finish the data connection in Settings.", "\u8BF7\u5728\u8BBE\u7F6E\u9875\u5B8C\u6210\u6570\u636E\u8FDE\u63A5\u3002");
    };
    return todos.map((item) => `<li><strong>${escapeHtml(simplifyTitle(item.title))}\uFF1A</strong>${escapeHtml(simplifyDetail(item.detail))}</li>`).join("");
  }

  function formatSubscriptionNumericField(value, unit, field, language = "zh") {
    if (typeof value === "number") {
      if (unit.trim() === "%") return `${value.toFixed(1)}%`;
      return `${formatInt(value)} ${unit}`;
    }
    return pickUiText(language, `Unavailable: subscription data is missing "${field}"`, `\u4E0D\u53EF\u7528\uFF1A\u8BA2\u9605\u6570\u636E\u7F3A\u5C11\u300C${field}\u300D`);
  }

  function formatSubscriptionTextField(value, field, language = "zh") {
    if (typeof value === "string" && value.trim()) return value.trim();
    return pickUiText(language, `Unavailable: subscription data is missing "${field}"`, `\u4E0D\u53EF\u7528\uFF1A\u8BA2\u9605\u6570\u636E\u7F3A\u5C11\u300C${field}\u300D`);
  }

  function formatSubscriptionPercentField(value, language = "zh") {
    if (typeof value === "number") return `${value.toFixed(1)}%`;
    return pickUiText(language, "Unavailable: subscription data is missing usage percent", "\u4E0D\u53EF\u7528\uFF1A\u8BA2\u9605\u6570\u636E\u7F3A\u5C11\u4F7F\u7528\u7387");
  }

  function normalizeQuotaWindowLabel(label, fallback) {
    const raw = (label ?? "").trim();
    if (!raw) return fallback;
    const normalized = raw.toLowerCase();
    if (normalized === "7d" || normalized.includes("week") || normalized.includes("\u5468")) return "Week";
    if (normalized === "5h" || normalized.includes("5h")) return "5h";
    const minuteMatch = /^(\d+(?:\.\d+)?)\s*m$/i.exec(normalized);
    if (minuteMatch?.[1]) {
      const minutes = Number(minuteMatch[1]);
      if (Number.isFinite(minutes)) {
        if (Math.abs(minutes - 10080) <= 2) return "Week";
        if (Math.abs(minutes - 300) <= 2) return "5h";
        if (Math.abs(minutes - 1440) <= 2) return "1d";
      }
    }
    return raw;
  }

  function asPercent(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return void 0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
  }

  function renderQuotaWindowRow(input, language = "zh") {
    const usedPercent = asPercent(input.usedPercent);
    const remainingPercent = asPercent(input.remainingPercent);
    const usedText = typeof usedPercent === "number" ? `${usedPercent.toFixed(1)}%` : "\u2014";
    const remainingText = typeof remainingPercent === "number" ? `${remainingPercent.toFixed(1)}%` : "\u2014";
    const fillWidth = typeof usedPercent === "number" ? usedPercent : 0;
    const resetAt = input.resetAt?.trim();
    const resetText = !resetAt
      ? pickUiText(language, "Reset not provided", "\u91CD\u7F6E\u65F6\u95F4\u672A\u63D0\u4F9B")
      : `${escapeHtml(pickUiText(language, "Reset", "\u91CD\u7F6E"))} <span data-quota-reset-at="${escapeHtml(resetAt)}" data-quota-window="${escapeHtml(input.label)}">${escapeHtml(pickUiText(language, "Loading...", "\u52A0\u8F7D\u4E2D..."))}</span>`;
    return `<div class="quota-row">
    <div class="quota-head">
      <span class="quota-label">${escapeHtml(input.label)}</span>
      <span class="quota-value">${escapeHtml(pickUiText(language, "Used", "\u5DF2\u7528"))} ${escapeHtml(usedText)} \xB7 ${escapeHtml(pickUiText(language, "Remaining", "\u5269\u4F59"))} ${escapeHtml(remainingText)}</span>
    </div>
    <div class="quota-track"><div class="quota-fill" style="width:${fillWidth.toFixed(1)}%;"></div></div>
    <div class="quota-foot">${resetText}</div>
  </div>`;
  }

  function renderSubscriptionSidebarSummary(subscription, language = "zh") {
    if (subscription.status === "connected" && (subscription.primaryWindowLabel || subscription.secondaryUsedPercent !== void 0)) {
      const primaryUsed = asPercent(subscription.primaryUsedPercent ?? subscription.usagePercent);
      const primaryRemaining = asPercent(subscription.primaryRemainingPercent ?? (typeof primaryUsed === "number" ? 100 - primaryUsed : void 0));
      const secondaryUsed = asPercent(subscription.secondaryUsedPercent);
      const secondaryRemaining = asPercent(subscription.secondaryRemainingPercent ?? (typeof secondaryUsed === "number" ? 100 - secondaryUsed : void 0));
      return `<div class="quota-compact">
      ${renderQuotaWindowRow({ label: normalizeQuotaWindowLabel(subscription.primaryWindowLabel, "5h"), usedPercent: primaryUsed, remainingPercent: primaryRemaining, resetAt: subscription.primaryResetAt ?? subscription.cycleEnd }, language)}
      ${renderQuotaWindowRow({ label: normalizeQuotaWindowLabel(subscription.secondaryWindowLabel, "Week"), usedPercent: secondaryUsed, remainingPercent: secondaryRemaining, resetAt: subscription.secondaryResetAt }, language)}
    </div>`;
    }
    return [
      typeof subscription.consumed === "number"
        ? `<div class="meta">${subscription.status === "connected" ? pickUiText(language, "Used", "\u5DF2\u7528") : pickUiText(language, "Estimated used", "\u4F30\u7B97\u5DF2\u7528")}\uFF1A${escapeHtml(formatSubscriptionNumericField(subscription.consumed, subscription.unit, subscription.status === "connected" ? "used" : "estimated_used", language))}</div>`
        : "",
      typeof subscription.remaining === "number"
        ? `<div class="meta">${subscription.status === "connected" ? pickUiText(language, "Remaining", "\u5269\u4F59") : pickUiText(language, "Estimated remaining", "\u4F30\u7B97\u5269\u4F59")}\uFF1A${escapeHtml(formatSubscriptionNumericField(subscription.remaining, subscription.unit, subscription.status === "connected" ? "remaining" : "estimated_remaining", language))}</div>`
        : "",
    ].filter((item) => item.length > 0).join("");
  }

  return {
    asPercent,
    dataConnectionLabel,
    formatCurrency,
    formatSubscriptionNumericField,
    formatSubscriptionPercentField,
    formatSubscriptionTextField,
    normalizeQuotaWindowLabel,
    renderQuotaWindowRow,
    renderSubscriptionSidebarSummary,
    renderTokenPieChart,
    renderTokenShareRows,
    renderUsageBreakdownRows,
    renderUsageConnectorTodos,
    renderUsageContextRows,
    renderUsagePeriodCards,
    simplifyUsageLabel,
    usagePeriodLabel,
  };
}

export { createUsageRenderers };
