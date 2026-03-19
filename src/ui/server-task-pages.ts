// @ts-nocheck

const { badge, escapeHtml, formatTimeAgoFromNow, pickUiText } = require("./server-shared");

function createTaskPageRenderers(deps) {
  const {
    buildHomeHref,
    buildSessionDetailHref,
    renderGlobalVisibilityStrip,
    sessionStateLabel,
    summarizeVisibleSessionSnippet,
    taskStateLabel,
  } = deps;

  function renderLegacyTaskBoard(cards, language = "zh", storedOrder = []) {
    if (cards.length === 0) {
      return `<div class="empty-state">${escapeHtml(pickUiText(language, "No tasks yet. New tasks will appear here automatically.", "\u6682\u65E0\u4EFB\u52A1\u3002\u65B0\u4EFB\u52A1\u51FA\u73B0\u540E\u4F1A\u81EA\u52A8\u663E\u793A\u5728\u8FD9\u91CC\u3002"))}</div>`;
    }
    const workingCount = cards.filter((item) => item.statusTone === "working").length;
    const issueCount = cards.filter((item) => item.statusTone === "issue").length;
    const queuedCount = cards.filter((item) => item.statusTone === "idle").length;
    const topCards = cards.slice(0, 18);
    const manualOrder = storedOrder.length > 0 ? storedOrder : cards.map((item) => item.taskId);
    const taskBoardStatus = pickUiText(language, "Manual priority order is ready.", "\u5DF2\u5C31\u7EEA\uFF0C\u53EF\u624B\u52A8\u8C03\u6574\u4F18\u5148\u7EA7\u3002");
    const taskBoardHint = pickUiText(language, "Drag task cards to manually reorder board priority. Your order is saved in UI preferences.", "\u62D6\u52A8\u4EFB\u52A1\u5361\u7247\u5373\u53EF\u624B\u52A8\u8C03\u6574\u770B\u677F\u4F18\u5148\u7EA7\uFF0C\u6392\u5E8F\u4F1A\u4FDD\u5B58\u5230\u754C\u9762\u504F\u597D\u3002");
    const dragHandleLabel = pickUiText(language, "Drag to reorder", "\u62D6\u62FD\u6392\u5E8F");
    const moreLabel = cards.length > topCards.length ? `<div class="meta">${escapeHtml(pickUiText(language, `${cards.length - topCards.length} more tasks stay in the raw table below.`, `\u5176\u4F59 ${cards.length - topCards.length} \u4E2A\u4EFB\u52A1\u4FDD\u7559\u5728\u4E0B\u65B9\u539F\u59CB\u660E\u7EC6\u91CC\u3002`))}</div>` : "";
    return `
    <div class="task-brief-board" data-task-board-root data-language="${escapeHtml(language)}" data-token-required="0" data-task-order="${escapeHtml(JSON.stringify(manualOrder))}">
      <div class="task-brief-toolbar">
        <div class="task-brief-copy">
          <div class="task-brief-legend">
      <span class="task-legend-chip"><span class="task-legend-dot issue"></span>${escapeHtml(pickUiText(language, "Issue first", "\u5F02\u5E38\u4F18\u5148"))} ${issueCount}</span>
      <span class="task-legend-chip"><span class="task-legend-dot working"></span>${escapeHtml(pickUiText(language, "Working now", "\u6B63\u5728\u8FDB\u884C"))} ${workingCount}</span>
      <span class="task-legend-chip"><span class="task-legend-dot idle"></span>${escapeHtml(pickUiText(language, "Queued", "\u6392\u961F\u4E2D"))} ${queuedCount}</span>
          </div>
          <div class="meta task-brief-hint">${escapeHtml(taskBoardHint)}</div>
        </div>
        <div class="task-brief-controls">
          <div class="meta task-brief-status-line" data-task-board-status>${escapeHtml(taskBoardStatus)}</div>
        </div>
      </div>
    <div class="task-brief-grid" data-task-card-grid>${topCards.map((card) => `<article class="task-brief-card" draggable="true" data-task-card data-task-id="${escapeHtml(card.taskId)}">
          <span class="task-status-dot ${escapeHtml(card.statusTone)}" title="${escapeHtml(card.statusDotLabel)}" aria-hidden="true"></span>
          <div class="task-drag-handle" title="${escapeHtml(dragHandleLabel)}" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="task-brief-head">
            <div class="task-priority-panel">
              <span>${escapeHtml(pickUiText(language, "Priority", "\u4F18\u5148\u7EA7"))}</span>
              <strong>${escapeHtml(card.priorityLabel)}</strong>
              <small>${escapeHtml(card.dueLabel)}</small>
            </div>
            <div class="task-brief-identity">
              <h3>${escapeHtml(card.title)}</h3>
              <div class="task-brief-pills">
                ${badge(card.statusTone === "issue" ? "blocked" : card.statusTone === "working" ? "warn" : "enabled", card.statusLabel)}
                ${badge(card.taskStatus === "done" ? "done" : card.taskStatus === "in_progress" ? "in_progress" : card.taskStatus === "blocked" ? "blocked" : "enabled", card.boardStatusLabel)}
              </div>
              <div class="task-role">${escapeHtml(card.projectTitle)} \xB7 ${escapeHtml(card.ownerLabel)}</div>
            </div>
          </div>
          <dl class="task-brief-list">
            <div class="task-brief-row"><dt>${escapeHtml(pickUiText(language, "Current state", "\u5F53\u524D\u72B6\u6001"))}</dt><dd>${escapeHtml(card.summary)}</dd></div>
            <div class="task-brief-row"><dt>${escapeHtml(pickUiText(language, "Recent signal", "\u6700\u8FD1\u4FE1\u53F7"))}</dt><dd>${escapeHtml(card.recentSignal)}</dd></div>
            <div class="task-brief-row"><dt>${escapeHtml(pickUiText(language, "Next step", "\u4E0B\u4E00\u6B65"))}</dt><dd>${escapeHtml(card.nextStep)}</dd></div>
            <div class="task-brief-row"><dt>${escapeHtml(pickUiText(language, "Update", "\u66F4\u65B0\u65F6\u95F4"))}</dt><dd>${escapeHtml(card.updatedLabel)}</dd></div>
          </dl>
          <div class="task-brief-actions">
            <div class="meta"><code>${escapeHtml(card.taskId)}</code></div>
            <a class="btn" href="${escapeHtml(card.detailHref)}">${escapeHtml(pickUiText(language, "Open detail", "\u67E5\u770B\u8BE6\u60C5"))}</a>
          </div>
        </article>`).join("")}</div>
    ${moreLabel}
    </div>
  `;
  }

  function renderTaskBoard(cards, language = "zh", storedOrder = [], emptyStateModel) {
    if (cards.length === 0) {
      const emptyTitle = pickUiText(language, "No task or schedule cards yet.", "\u6682\u65E0\u4EFB\u52A1\u6216\u6392\u7A0B\u5361\u7247\u3002");
      const emptyDetail = pickUiText(language, "The wall is empty for now, but the live signals below still show whether timed jobs, heartbeat, current tasks, or tool calls are alive.", "\u5F53\u524D\u5361\u7247\u5899\u8FD8\u662F\u7A7A\u7684\uFF0C\u4F46\u4E0B\u9762\u7684\u5B9E\u65F6\u4FE1\u53F7\u4ECD\u4F1A\u544A\u8BC9\u4F60\uFF1A\u5B9A\u65F6\u4EFB\u52A1\u3001\u4EFB\u52A1\u5FC3\u8DF3\u3001\u5F53\u524D\u4EFB\u52A1\u3001\u5DE5\u5177\u8C03\u7528\u6709\u6CA1\u6709\u5728\u52A8\u3002");
      const signalStrip = emptyStateModel ? `<div class="task-empty-signals" data-task-empty-signals>${renderGlobalVisibilityStrip(emptyStateModel, language)}</div>` : "";
      return `<div class="task-brief-board task-brief-board-empty">
      <div class="empty-state task-empty-state">
        <strong>${escapeHtml(emptyTitle)}</strong>
        <div class="meta">${escapeHtml(emptyDetail)}</div>
        ${signalStrip}
      </div>
    </div>`;
    }
    const workingCount = cards.filter((item) => item.statusTone === "working").length;
    const issueCount = cards.filter((item) => item.statusTone === "issue").length;
    const queuedCount = cards.filter((item) => item.statusTone === "idle").length;
    const scheduledCount = cards.filter((item) => item.statusTone === "scheduled").length;
    const topCards = cards.slice(0, 18);
    const manualOrder = storedOrder.length > 0 ? storedOrder : cards.map((item) => item.cardId);
    const boardOrderReadyText = pickUiText(language, "Task and schedule order is ready.", "\u4EFB\u52A1\u4E0E\u6392\u7A0B\u987A\u5E8F\u5DF2\u5C31\u7EEA\u3002");
    const boardHintText = pickUiText(language, "Drag cards to reorder your task and schedule focus. The order is saved in UI preferences.", "\u62D6\u52A8\u5361\u7247\u5373\u53EF\u91CD\u6392\u4EFB\u52A1\u4E0E\u6392\u7A0B\u7684\u5173\u6CE8\u987A\u5E8F\uFF0C\u6392\u5E8F\u4F1A\u4FDD\u5B58\u5230\u754C\u9762\u504F\u597D\u3002");
    const dragHandleLabel = pickUiText(language, "Drag to reorder", "\u62D6\u62FD\u6392\u5E8F");
    const moreLabel = cards.length > topCards.length ? `<div class="meta">${escapeHtml(pickUiText(language, `${cards.length - topCards.length} more cards stay in the raw detail panels below.`, `\u5176\u4F59 ${cards.length - topCards.length} \u5F20\u5361\u7247\u4FDD\u7559\u5728\u4E0B\u65B9\u539F\u59CB\u660E\u7EC6\u9762\u677F\u4E2D\u3002`))}</div>` : "";
    return `
    <div class="task-brief-board" data-task-board-root data-language="${escapeHtml(language)}" data-token-required="0" data-task-order="${escapeHtml(JSON.stringify(manualOrder))}">
      <div class="task-brief-toolbar">
        <div class="task-brief-copy">
          <div class="task-brief-legend">
            <span class="task-legend-chip"><span class="task-legend-dot issue"></span>${escapeHtml(pickUiText(language, "Issues", "\u5F02\u5E38"))} ${issueCount}</span>
            <span class="task-legend-chip"><span class="task-legend-dot working"></span>${escapeHtml(pickUiText(language, "Working", "\u8FDB\u884C\u4E2D"))} ${workingCount}</span>
            <span class="task-legend-chip"><span class="task-legend-dot idle"></span>${escapeHtml(pickUiText(language, "Queued", "\u6392\u961F\u4E2D"))} ${queuedCount}</span>
            <span class="task-legend-chip"><span class="task-legend-dot scheduled"></span>${escapeHtml(pickUiText(language, "Timed jobs", "\u5B9A\u65F6\u4EFB\u52A1"))} ${scheduledCount}</span>
          </div>
          <div class="meta task-brief-hint">${escapeHtml(boardHintText)}</div>
        </div>
        <div class="task-brief-controls">
          <div class="meta task-brief-status-line" data-task-board-status>${escapeHtml(boardOrderReadyText)}</div>
        </div>
      </div>
      <div class="task-brief-grid" data-task-card-grid>${topCards.map((card) => {
        const priorityPanelClass = card.cardKind === "timed_job" ? "task-priority-panel compact" : "task-priority-panel";
        const primaryBadge = card.cardKind === "timed_job" ? badge("ok", pickUiText(language, "Timed job", "\u5B9A\u65F6\u4EFB\u52A1")) : badge(card.statusTone === "issue" ? "blocked" : card.statusTone === "working" ? "warn" : card.taskStatus === "done" ? "done" : "enabled", card.statusLabel);
        const secondaryBadge = card.cardKind === "timed_job" ? badge(card.boardStatusLabel === pickUiText(language, "Disabled", "\u5DF2\u505C\u7528") ? "blocked" : "ok", card.boardStatusLabel) : badge(card.taskStatus === "done" ? "done" : card.taskStatus === "in_progress" ? "in_progress" : card.taskStatus === "blocked" ? "blocked" : "enabled", card.boardStatusLabel);
        const tertiaryBadge = card.cardKind === "timed_job" ? badge("enabled", pickUiText(language, "Auto", "\u81EA\u52A8")) : badge("ok", card.priorityLabel);
        const topLabel = card.cardKind === "timed_job" ? pickUiText(language, "Auto run", "\u81EA\u52A8\u6267\u884C") : pickUiText(language, "Time", "\u65F6\u95F4");
        const rowOneLabel = card.cardKind === "timed_job" ? pickUiText(language, "Purpose", "\u7528\u9014") : pickUiText(language, "Current state", "\u5F53\u524D\u72B6\u6001");
        const rowTwoLabel = card.cardKind === "timed_job" ? pickUiText(language, "Runtime", "\u8FD0\u884C\u72B6\u6001") : pickUiText(language, "Recent signal", "\u6700\u8FD1\u4FE1\u53F7");
        return `<article class="task-brief-card" draggable="true" data-task-card data-task-kind="${escapeHtml(card.cardKind)}" data-task-id="${escapeHtml(card.cardId)}">
            <span class="task-status-dot ${escapeHtml(card.statusTone)}" title="${escapeHtml(card.statusDotLabel)}" aria-hidden="true"></span>
            <div class="task-drag-handle" title="${escapeHtml(dragHandleLabel)}" aria-hidden="true"><span></span><span></span><span></span></div>
            <div class="task-brief-head">
              <div class="${priorityPanelClass}">
                <span>${escapeHtml(topLabel)}</span>
                <strong>${escapeHtml(card.scheduleLabel)}</strong>
                <small>${escapeHtml(card.dueLabel)}</small>
              </div>
              <div class="task-brief-identity">
                <h3>${escapeHtml(card.title)}</h3>
                <div class="task-brief-pills">
                  ${primaryBadge}
                  ${secondaryBadge}
                  ${tertiaryBadge}
                </div>
                <div class="task-role">${escapeHtml(card.projectTitle)} \xB7 ${escapeHtml(card.ownerLabel)}</div>
              </div>
            </div>
            <dl class="task-brief-list">
              <div class="task-brief-row"><dt>${escapeHtml(rowOneLabel)}</dt><dd class="task-brief-value clamp-2">${escapeHtml(card.summary)}</dd></div>
              <div class="task-brief-row"><dt>${escapeHtml(rowTwoLabel)}</dt><dd class="task-brief-value clamp-2">${escapeHtml(card.recentSignal)}</dd></div>
              <div class="task-brief-row"><dt>${escapeHtml(pickUiText(language, "Next step", "\u4E0B\u4E00\u6B65"))}</dt><dd class="task-brief-value clamp-2">${escapeHtml(card.nextStep)}</dd></div>
            </dl>
            <div class="task-brief-actions">
              <div class="meta"><code>${escapeHtml(card.taskId)}</code> \xB7 ${escapeHtml(card.updatedLabel)}</div>
              <a class="btn" href="${escapeHtml(card.detailHref)}">${escapeHtml(pickUiText(language, "Open detail", "\u67E5\u770B\u8BE6\u60C5"))}</a>
            </div>
          </article>`;
      }).join("")}</div>
      ${moreLabel}
    </div>
  `;
  }

  function renderTaskDetailPage(input) {
    const language = input.language ?? "zh";
    const task = input.task;
    const certaintyCard = input.certaintyCard;
    const linkedSessions = input.linkedSessions ?? [];
    const t = (en, zh) => pickUiText(language, en, zh);
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(t("Task detail", "\u4EFB\u52A1\u8BE6\u60C5"))} \xB7 ${escapeHtml(task.taskId)}</title>
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
    .story-list { margin:0; padding-left:18px; display:grid; gap:8px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <h1>${escapeHtml(task.title)}</h1>
      <div class="meta">${escapeHtml(t("Task detail page", "\u4EFB\u52A1\u8BE6\u60C5\u9875"))} \xB7 ${escapeHtml(t("Generated at", "\u751F\u6210\u4E8E"))} ${escapeHtml(input.generatedAt)}</div>
    </div>
    <div class="card">
      <h2>${escapeHtml(t("Key facts", "\u5173\u952E\u4FE1\u606F"))}</h2>
      <div class="meta"><code>${escapeHtml(task.taskId)}</code> ${badge(task.status, taskStateLabel(task.status, language))}</div>
      <div class="meta">${escapeHtml(t("Project", "\u9879\u76EE"))}\uFF1A${escapeHtml(task.projectTitle)}\uFF08${escapeHtml(task.projectId)}\uFF09</div>
      <div class="meta">${escapeHtml(t("Owner", "\u8D1F\u8D23\u4EBA"))}\uFF1A${escapeHtml(task.owner)}</div>
      <div class="meta">${escapeHtml(t("Due time", "\u622A\u6B62\u65F6\u95F4"))}\uFF1A${escapeHtml(task.dueAt ?? t("Not set", "\u672A\u8BBE\u7F6E"))}</div>
      <div class="meta">${escapeHtml(t("Updated at", "\u66F4\u65B0\u65F6\u95F4"))}\uFF1A${escapeHtml(task.updatedAt)}</div>
      <div class="meta">${escapeHtml(t("Sessions", "\u4F1A\u8BDD"))}\uFF1A${task.sessionKeys.length > 0 ? task.sessionKeys.map((id) => `<a href="${escapeHtml(buildSessionDetailHref(id, language))}"><code>${escapeHtml(id)}</code></a>`).join(" \xB7 ") : escapeHtml(t("None yet", "\u6682\u65E0"))}</div>
    </div>
    <div class="card">
      <h2>${escapeHtml(t("Execution certainty", "\u786E\u5B9A\u6027\u5224\u65AD"))}</h2>
      ${certaintyCard ? `<div class="meta">${badge(certaintyCard.tone, certaintyCard.toneLabel)} \xB7 ${certaintyCard.score} ${escapeHtml(t("points", "\u5206"))}</div>
             <div class="meta">${escapeHtml(certaintyCard.summary)}</div>
             <div class="meta">${escapeHtml(t("Confirmed", "\u5DF2\u786E\u8BA4"))}\uFF1A${escapeHtml(certaintyCard.evidence.join(" \xB7 ") || t("No direct evidence yet.", "\u6682\u65F6\u6CA1\u6709\u76F4\u63A5\u8BC1\u636E\u3002"))}</div>
             <div class="meta">${escapeHtml(t("Still missing", "\u4ECD\u5F85\u786E\u8BA4"))}\uFF1A${escapeHtml(certaintyCard.gaps.join(" \xB7 ") || t("No obvious gap right now.", "\u5F53\u524D\u6CA1\u6709\u660E\u663E\u7F3A\u53E3\u3002"))}</div>` : `<div class="meta">${escapeHtml(t("There is not enough data to judge execution certainty yet.", "\u5F53\u524D\u6CA1\u6709\u8DB3\u591F\u6570\u636E\u751F\u6210\u786E\u5B9A\u6027\u5224\u65AD\u3002"))}</div>`}
    </div>
    <div class="card">
      <h2>${escapeHtml(t("Session evidence", "\u4F1A\u8BDD\u8BC1\u636E"))}</h2>
      ${linkedSessions.length > 0 ? `<ul class="story-list">${linkedSessions.map((session) => `<li><a href="${escapeHtml(session.sessionHref)}"><code>${escapeHtml(session.sessionKey)}</code></a> ${badge(session.state, sessionStateLabel(session.state))}<div class="meta">${escapeHtml(pickUiText(language, "Agent", "\u667A\u80FD\u4F53"))}\uFF1A${escapeHtml(session.agentId ?? pickUiText(language, "Unassigned", "\u672A\u5206\u914D"))} \xB7 ${escapeHtml(pickUiText(language, "Latest activity", "\u6700\u8FD1\u6D3B\u52A8"))}\uFF1A${escapeHtml(session.latestAt ? formatTimeAgoFromNow(session.latestAt, language) : pickUiText(language, "unknown", "\u672A\u77E5"))}</div><div class="meta">${escapeHtml(summarizeVisibleSessionSnippet(session.latestSnippet, language, 120))}</div></li>`).join("")}</ul>` : `<div class="meta">${escapeHtml(pickUiText(language, "No session evidence is visible yet.", "\u5F53\u524D\u8FD8\u6CA1\u6709\u53EF\u663E\u793A\u7684\u4F1A\u8BDD\u8BC1\u636E\u3002"))}</div>`}
    </div>
    <div class="meta"><a href="${escapeHtml(buildHomeHref({ quick: "all" }, true, "projects-tasks", language))}#tracked-task-view">${escapeHtml(pickUiText(language, "Back to tracked tasks", "\u8FD4\u56DE\u8DDF\u8E2A\u4EFB\u52A1"))}</a></div>
  </div>
</body>
</html>`;
  }

  return {
    renderLegacyTaskBoard,
    renderTaskBoard,
    renderTaskDetailPage,
  };
}

export { createTaskPageRenderers };
