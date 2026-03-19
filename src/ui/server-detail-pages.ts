// @ts-nocheck

const { badge, escapeHtml, pickUiText, safeTruncate } = require("./server-shared");

function createDetailPageRenderers(deps) {
  const {
    buildHomeHref,
    buildSessionDetailHref,
    cronHealthLabel,
    executionChainStageLabel,
    formatSeconds,
    humanizeTimedJobScheduleLabel,
    renderSelectOptions,
    sessionStateLabel,
    summarizeVisibleSessionSnippet,
  } = deps;

  function renderSessionPreviewRows(items, language = "zh") {
    if (items.length === 0) {
      return `<tr><td colspan="6">${escapeHtml(pickUiText(language, "No session data yet.", "\u6682\u65E0\u4F1A\u8BDD\u6570\u636E"))}</td></tr>`;
    }
    return items.map((item) => {
      const latestKind = item.latestKind ?? "message";
      const latestLabel = item.latestToolName ? `${latestKind}:${item.latestToolName}` : latestKind;
      const latestTime = item.latestHistoryAt ? ` @ ${item.latestHistoryAt}` : "";
      const historyState = item.historyError ? pickUiText(language, `Error: ${item.historyError}`, `\u9519\u8BEF: ${item.historyError}`) : `${item.historyCount}`;
      const agent = item.agentId ?? "-";
      return `<tr><td><a href="${escapeHtml(buildSessionDetailHref(item.sessionKey, language))}"><code>${escapeHtml(item.sessionKey)}</code></a></td><td>${badge(item.state, sessionStateLabel(item.state))}</td><td>${escapeHtml(agent)}</td><td>${badge(latestKind)} ${escapeHtml(latestLabel)}${escapeHtml(latestTime)}</td><td>${escapeHtml(summarizeVisibleSessionSnippet(item.latestSnippet, language, 220))}</td><td>${escapeHtml(historyState)}</td></tr>`;
    }).join("");
  }

  function renderSessionHistoryRows(items, language = "en") {
    if (items.length === 0) {
      return `<tr><td colspan="6">${escapeHtml(pickUiText(language, "Not activated yet", "\u5C1A\u672A\u6FC0\u6D3B"))}</td></tr>`;
    }
    const newestFirst = [...items].reverse().slice(0, 160);
    return newestFirst.map((item) => {
      const tool = item.toolName ?? "-";
      const status = item.toolStatus ?? "-";
      const refs = [item.parentSessionKey ? `parent=${item.parentSessionKey}` : "", item.childSessionKey ? `child=${item.childSessionKey}` : ""].filter(Boolean).join(" | ");
      const content = refs ? `${safeTruncate(item.content, 620)}\n${refs}` : safeTruncate(item.content, 700);
      const suffix = item.truncated ? " [truncated]" : "";
      return `<tr><td>${escapeHtml(item.timestamp ?? "-")}</td><td>${badge(item.kind)}</td><td>${escapeHtml(item.role)}</td><td>${escapeHtml(tool)}</td><td>${escapeHtml(status)}</td><td class="cell-content">${escapeHtml(content + suffix)}</td></tr>`;
    }).join("");
  }

  function renderSessionDrilldownPage(detail, language = "en") {
    const t = (en, zh) => pickUiText(language, en, zh);
    const rows = renderSessionHistoryRows(detail.history, language);
    const status = detail.status;
    const executionChain = detail.executionChain;
    const homeHref = buildHomeHref({ quick: "all" }, true, "overview", language);
    const executionChainCard = executionChain ? `<div class="card" id="session-execution-chain">
    <h2 style="font-size:15px;">${escapeHtml(t("Execution Chain", "\u6267\u884C\u94FE"))}</h2>
    <div class="meta">${badge(executionChain.stage, executionChainStageLabel(executionChain.stage, language))} ${badge(executionChain.accepted ? "accepted" : "idle", t("Accepted", "\u5DF2\u63A5\u5355"))} ${badge(executionChain.spawned ? "spawn" : "idle", t("Spawned", "\u5DF2\u6D3E\u53D1"))}</div>
    <div class="meta">source=${escapeHtml(executionChain.source)} inferred=${executionChain.inferred ? "yes" : "no"}</div>
    <div class="meta">parent=${escapeHtml(executionChain.parentSessionKey ?? "-")} child=${escapeHtml(executionChain.childSessionKey ?? "-")}</div>
    <div class="meta">acceptedAt=${escapeHtml(executionChain.acceptedAt ?? "-")} spawnedAt=${escapeHtml(executionChain.spawnedAt ?? "-")}</div>
    <div class="meta">${escapeHtml(executionChain.detail)}</div>
  </div>` : `<div class="card" id="session-execution-chain">
    <h2 style="font-size:15px;">${escapeHtml(t("Execution Chain", "\u6267\u884C\u94FE"))}</h2>
    <div class="meta">${escapeHtml(t("No accepted/spawn evidence found yet. If this is a child run session, it will still appear once the session key or history provides a chain signal.", "\u5F53\u524D\u8FD8\u6CA1\u6709\u63A5\u5355/\u6D3E\u53D1\u8BC1\u636E\u3002\u5982\u679C\u8FD9\u662F\u5B50\u6267\u884C\u4F1A\u8BDD\uFF0C\u5F85\u4F1A\u8BDD key \u6216\u5386\u53F2\u8BB0\u5F55\u8865\u9F50\u94FE\u8DEF\u4FE1\u53F7\u540E\u4F1A\u663E\u793A\u3002"))}</div>
  </div>`;
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(t("AI Employee System Session Drilldown", "AI\u5458\u5DE5\u7CFB\u7EDF\u4F1A\u8BDD\u8BE6\u60C5"))}</title>
  <style>
    body { font-family: "SF Mono", Menlo, monospace; background: #0b1016; color: #d6e7f9; padding: 16px; margin: 0; }
    a { color: #7dd3fc; }
    .card { border: 1px solid #27405a; background: #111923; padding: 12px; border-radius: 8px; margin-top: 10px; }
    .meta { color: #93aac2; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th, td { border-bottom: 1px solid rgba(39,64,90,0.45); text-align: left; padding: 6px; vertical-align: top; }
    th { color: #93aac2; }
    .badge { display:inline-block; border-radius:999px; padding:2px 8px; font-size:11px; border:1px solid transparent; text-transform:uppercase; letter-spacing:0.06em; }
    .badge.info, .badge.running, .badge.in_progress, .badge.spawn, .badge.spawned { color: #3b82f6; border-color: #3b82f6; }
    .badge.warn { color: #f59e0b; border-color: #f59e0b; }
    .badge.action-required, .badge.blocked, .badge.error, .badge.over { color: #ef4444; border-color: #ef4444; }
    .badge.idle, .badge.todo, .badge.message, .badge.tool_event { color: #9ca3af; border-color: #9ca3af; }
    .badge.accepted { color: #22c55e; border-color: #22c55e; }
    .cell-content { white-space: pre-wrap; word-break: break-word; max-width: 760px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(t("Session Drilldown", "\u4F1A\u8BDD\u8BE6\u60C5"))}</h1>
  <div class="meta"><code>${escapeHtml(detail.session.sessionKey)}</code> | state=${escapeHtml(detail.session.state)} | generatedAt=${escapeHtml(detail.generatedAt)}</div>

  <div class="card">
    <div>session=${escapeHtml(detail.session.sessionKey)} label=${escapeHtml(detail.session.label ?? "-")} agent=${escapeHtml(detail.session.agentId ?? "-")}</div>
    <div class="meta">lastMessageAt=${escapeHtml(detail.session.lastMessageAt ?? "-")} latestEvent=${escapeHtml(detail.latestKind ?? "-")} role=${escapeHtml(detail.latestRole ?? "-")} tool=${escapeHtml(detail.latestToolName ?? "-")} latestHistoryAt=${escapeHtml(detail.latestHistoryAt ?? "-")}</div>
    <div class="meta">historyCount=${detail.historyCount} historyLimit=readonly-safe</div>
    <div class="meta">historyError=${escapeHtml(detail.historyError ?? "none")}</div>
    <div class="meta">status model=${escapeHtml(status?.model ?? "-")} tokensIn=${status?.tokensIn ?? 0} tokensOut=${status?.tokensOut ?? 0} cost=${status?.cost ?? 0} updatedAt=${escapeHtml(status?.updatedAt ?? "-")}</div>
  </div>

  ${executionChainCard}

  <div class="card">
    <h2 style="font-size:15px;">${escapeHtml(t("Latest Messages / Tool Events", "\u6700\u8FD1\u6D88\u606F / \u5DE5\u5177\u4E8B\u4EF6"))}</h2>
    <table>
      <thead><tr><th>${escapeHtml(t("timestamp", "\u65F6\u95F4"))}</th><th>${escapeHtml(t("kind", "\u7C7B\u578B"))}</th><th>${escapeHtml(t("role", "\u89D2\u8272"))}</th><th>${escapeHtml(t("tool", "\u5DE5\u5177"))}</th><th>${escapeHtml(t("status", "\u72B6\u6001"))}</th><th>${escapeHtml(t("content", "\u5185\u5BB9"))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <p class="meta"><a href="${escapeHtml(homeHref)}">${escapeHtml(t("Back to overview", "\u8FD4\u56DE\u603B\u89C8"))}</a> | <a href="/api/sessions/${encodeURIComponent(detail.session.sessionKey)}?historyLimit=120">${escapeHtml(t("Session JSON API", "\u4F1A\u8BDD JSON \u63A5\u53E3"))}</a></p>
</body>
</html>`;
  }

  function renderAuditPage(timeline, severity) {
    const rows = timeline.events.length === 0 ? '<tr><td colspan="4">Not activated yet</td></tr>' : timeline.events.slice(0, 300).map((event) => `<tr><td>${escapeHtml(event.timestamp)}</td><td>${badge(event.severity)}</td><td>${escapeHtml(event.source)}</td><td>${escapeHtml(event.message)}</td></tr>`).join("");
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>AI Employee System Audit Timeline</title>
  <style>
    body { font-family: "SF Mono", Menlo, monospace; background: #0b1016; color: #d6e7f9; padding: 16px; margin: 0; }
    a { color: #7dd3fc; }
    .card { border: 1px solid #27405a; background: #111923; padding: 12px; border-radius: 8px; margin-top: 10px; }
    .meta { color: #93aac2; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th, td { border-bottom: 1px solid rgba(39,64,90,0.45); text-align: left; padding: 6px; vertical-align: top; }
    th { color: #93aac2; }
    .badge { display:inline-block; border-radius:999px; padding:2px 8px; font-size:11px; border:1px solid transparent; text-transform:uppercase; letter-spacing:0.06em; }
    .badge.info { color: #3b82f6; border-color: #3b82f6; }
    .badge.warn { color: #f59e0b; border-color: #f59e0b; }
    .badge.action-required { color: #ef4444; border-color: #ef4444; }
    .badge.error { color: #f43f5e; border-color: #f43f5e; }
    label { color: #93aac2; font-size: 12px; margin-right: 8px; }
    select, button { background: #09141f; color: #d6e7f9; border: 1px solid #27405a; border-radius: 6px; padding: 6px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Audit Timeline</h1>
  <div class="meta">newest-first runtime events from snapshot, monitor timeline log, and approval action audit log</div>
  <div class="card">
    <form method="GET" action="/audit">
      <label for="severity">severity</label>
      <select id="severity" name="severity">
        ${renderSelectOptions([{ value: "all", label: "all" }, { value: "info", label: "info" }, { value: "warn", label: "warn" }, { value: "action-required", label: "action-required" }, { value: "error", label: "error" }], severity)}
      </select>
      <button type="submit">apply</button>
    </form>
    <div class="meta" style="margin-top:8px;">
      generatedAt=${escapeHtml(timeline.generatedAt)} | info=${timeline.counts.info} warn=${timeline.counts.warn} action_required=${timeline.counts["action-required"]} error=${timeline.counts.error}
    </div>
    <table>
      <thead><tr><th>timestamp</th><th>severity</th><th>source</th><th>message</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <p class="meta"><a href="/">home</a> | <a href="/api/audit?severity=${encodeURIComponent(severity)}">audit api</a></p>
</body>
</html>`;
  }

  function renderCronJobDetailPage(job, generatedAt, language = "zh") {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(pickUiText(language, "Cron detail", "Cron \u8BE6\u60C5"))} \xB7 ${escapeHtml(job.jobId)}</title>
  <style>
    body { font-family: "SF Pro Text", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; margin:0; padding:20px; background:#f5f5f7; color:#1d1d1f; }
    .page { max-width: 860px; margin: 0 auto; display:grid; gap:12px; }
    .card { border:1px solid rgba(17,24,39,0.1); border-radius:16px; background:#fff; padding:14px; box-shadow:0 8px 20px rgba(17,24,39,0.06); }
    .meta { color:#6e6e73; font-size:13px; line-height:1.6; }
    h1 { margin:0; font-size:30px; letter-spacing:-0.02em; }
    h2 { margin:0; font-size:18px; }
    .badge { display:inline-block; border-radius:999px; padding:3px 10px; font-size:12px; border:1px solid rgba(17,24,39,0.14); background:#f7f8fb; }
    a { color:#0068d3; }
    code { font-size:12px; color:#005ab6; }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <h1>${escapeHtml(job.name)}</h1>
      <div class="meta">${escapeHtml(pickUiText(language, "Cron detail page", "Cron \u4EFB\u52A1\u8BE6\u60C5\u9875"))} \xB7 ${escapeHtml(pickUiText(language, "Generated at", "\u751F\u6210\u4E8E"))} ${escapeHtml(generatedAt)}</div>
    </div>
    <div class="card">
      <h2>${escapeHtml(pickUiText(language, "Key facts", "\u5173\u952E\u4FE1\u606F"))}</h2>
      <div class="meta"><code>${escapeHtml(job.jobId)}</code> ${badge(job.status, cronHealthLabel(job.status, language))}</div>
      <div class="meta">${escapeHtml(pickUiText(language, "Agent", "\u6267\u884C\u667A\u80FD\u4F53"))}\uFF1A${escapeHtml(job.owner)}</div>
      <div class="meta">${escapeHtml(pickUiText(language, "Purpose", "\u4EFB\u52A1\u76EE\u7684"))}\uFF1A${escapeHtml(job.purpose)}</div>
      <div class="meta">${escapeHtml(pickUiText(language, "Schedule", "\u8C03\u5EA6"))}\uFF1A${escapeHtml(humanizeTimedJobScheduleLabel(job.schedule, language))}</div>
      <div class="meta">${escapeHtml(pickUiText(language, "Next run", "\u4E0B\u6B21\u8FD0\u884C"))}\uFF1A${escapeHtml(job.nextRunAt)} \xB7 ${escapeHtml(formatSeconds(job.dueInSeconds, language))}</div>
    </div>
    <div class="meta"><a href="${escapeHtml(buildHomeHref({ quick: "all" }, true, "overview", language))}#cron-health">${escapeHtml(pickUiText(language, "Back to cron board", "\u8FD4\u56DE Cron \u770B\u677F"))}</a></div>
  </div>
</body>
</html>`;
  }

  return {
    renderSessionPreviewRows,
    renderSessionDrilldownPage,
    renderSessionHistoryRows,
    renderAuditPage,
    renderCronJobDetailPage,
  };
}

export { createDetailPageRenderers };
