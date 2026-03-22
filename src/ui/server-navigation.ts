// @ts-nocheck

function createNavigationHelpers(deps) {
  const {
    defaultPrimaryOperatorDisplayName,
    escapeHtml,
    pickUiText,
    uiQuickFilters,
  } = deps;

  function normalizeDashboardSectionForNav(section) {
    if (section === "office-space") return "team";
    if (section === "calendar") return "projects-tasks";
    return section;
  }

  function dashboardSectionLinks(language) {
    const baseLinks = [
      { key: "overview", icon: "overview", label: "Overview", blurb: "Today at a glance" },
      { key: "usage-cost", icon: "usage", label: "Usage", blurb: "Budget and quota" },
      { key: "team", icon: "team", label: "Staff", blurb: "Mission, staff and assignments" },
      { key: "collaboration", icon: "collaboration", label: "Collaboration", blurb: "Agent handoffs and teamwork" },
      { key: "memory", icon: "memory", label: "Memory", blurb: "Daily and long-term memories" },
      { key: "docs", icon: "docs", label: "Documents", blurb: `${defaultPrimaryOperatorDisplayName} and active agent core docs` },
      { key: "projects-tasks", icon: "tasks", label: "Tasks", blurb: "Board, schedule and activity" },
      { key: "settings", icon: "settings", label: "Settings", blurb: "Safety and data links" },
    ];

    return baseLinks.map((item) => {
      if (language !== "zh") return item;
      if (item.key === "overview") {
        return { ...item, label: "总览", blurb: "今天重点" };
      }
      if (item.key === "usage-cost") {
        return { ...item, label: "用量", blurb: "预算与额度" };
      }
      if (item.key === "team") {
        return { ...item, label: "员工", blurb: "员工、分工与职责" };
      }
      if (item.key === "collaboration") {
        return { ...item, label: "协作", blurb: "智能体交接与协同" };
      }
      if (item.key === "memory") {
        return { ...item, label: "记忆", blurb: "每日与长期记忆" };
      }
      if (item.key === "docs") {
        return { ...item, label: "文档", blurb: `${defaultPrimaryOperatorDisplayName} 与当前启用智能体核心文档` };
      }
      if (item.key === "projects-tasks") {
        return { ...item, label: "任务", blurb: "任务、排程与活动" };
      }
      return { ...item, label: "设置", blurb: "安全与数据连接" };
    });
  }

  function resolveDashboardSectionTitle(section, language) {
    if (language === "en" && section.key === "overview") {
      return "Overview Control Center";
    }
    return section.label;
  }

  function buildHomeQuery(filters, compactStatusStrip, section = "overview", language = "en", usageView = "cumulative") {
    const params = new URLSearchParams();
    params.set("compact", compactStatusStrip ? "1" : "0");
    params.set("section", section);
    params.set("lang", language);
    if (usageView === "today") params.set("usage_view", "today");
    params.set("quick", filters.quick ?? "all");
    if (filters.status) params.set("status", filters.status);
    if (filters.owner) params.set("owner", filters.owner);
    if (filters.project) params.set("project", filters.project);
    return params.toString();
  }

  function buildHomeHref(filters, compactStatusStrip, section = "overview", language = "en", usageView = "cumulative") {
    const query = buildHomeQuery(filters, compactStatusStrip, section, language, usageView);
    return query ? `/?${query}` : "/";
  }

  function buildTaskDetailHref(taskId, language) {
    return `/details/task/${encodeURIComponent(taskId)}?lang=${encodeURIComponent(language)}`;
  }

  function buildCronDetailHref(jobId, language) {
    return `/details/cron/${encodeURIComponent(jobId)}?lang=${encodeURIComponent(language)}`;
  }

  function buildSessionDetailHref(sessionKey, language) {
    return `/session/${encodeURIComponent(sessionKey)}?lang=${encodeURIComponent(language)}`;
  }

  function joinDisplayList(items, language) {
    const output = items.map((item) => item.trim()).filter((item) => item.length > 0);
    return output.join(language === "en" ? ", " : "、");
  }

  function quickFilterLabel(value, language = "en") {
    if (value === "all") return pickUiText(language, "Everything", "全部");
    if (value === "attention") return pickUiText(language, "Needs Attention", "需关注");
    if (value === "todo") return pickUiText(language, "Ready To Start", "可开始");
    if (value === "in_progress") return pickUiText(language, "In Motion", "进行中");
    if (value === "blocked") return pickUiText(language, "Blocked", "已阻塞");
    return pickUiText(language, "Completed", "已完成");
  }

  function renderQuickFilters(filters, compactStatusStrip, section, language, usageView) {
    const options = uiQuickFilters.map((value) => ({ value, label: quickFilterLabel(value, language) }));
    const active = filters.quick ?? "all";
    const base = { owner: filters.owner, project: filters.project };
    return options
      .map((option) => {
        const href = buildHomeHref({ ...base, quick: option.value }, compactStatusStrip, section, language, usageView);
        const activeClass = option.value === active ? " active" : "";
        return `<a class="quick-chip${activeClass}" href="${escapeHtml(href)}">${escapeHtml(option.label)}</a>`;
      })
      .join("");
  }

  function renderLanguageToggle(filters, options) {
    const enHref = buildHomeHref(filters, options.compactStatusStrip, options.section, "en", options.usageView);
    const zhHref = buildHomeHref(filters, options.compactStatusStrip, options.section, "zh", options.usageView);
    const enClass = options.language === "en" ? ' class="active"' : "";
    const zhClass = options.language === "zh" ? ' class="active"' : "";
    const label = pickUiText(options.language, "Language:", "语言：");
    const zhLabel = pickUiText(options.language, "Chinese", "中文");
    return `<div class="meta lang-toggle">${label} <a${enClass} href="${escapeHtml(enHref)}">EN</a> / <a${zhClass} href="${escapeHtml(zhHref)}">${zhLabel}</a></div>`;
  }

  function renderDashboardRefreshControls(language, options) {
    const intervals = [15, 30, 60, 120];
    const intervalOptions = intervals
      .map((value) => {
        const label = language === "en" ? `${value}s` : `${value} 秒`;
        return `<option value="${value}"${value === 30 ? " selected" : ""}>${escapeHtml(label)}</option>`;
      })
      .join("");
    const writeAccessLabel = !options.localTokenAuthRequired
      ? pickUiText(language, "Write access: direct", "写入权限：直连")
      : !options.localTokenConfigured
        ? pickUiText(language, "Write access: unavailable", "写入解锁：未配置")
        : options.localMutationUnlock
          ? pickUiText(language, "Write access: on", "写入解锁：开")
          : pickUiText(language, "Write access: off", "写入解锁：关");
    const writeAccessPressed = options.localMutationUnlock && options.localTokenConfigured ? "true" : "false";
    const writeAccessDisabled = options.localTokenAuthRequired && !options.localTokenConfigured ? " disabled" : "";
    return `<div class="refresh-toolbar" data-dashboard-refresh-root>
    <button class="panel-toggle" type="button" data-dashboard-refresh-now>${escapeHtml(pickUiText(language, "Refresh now", "立即刷新"))}</button>
    <button class="panel-toggle" type="button" data-dashboard-auto-refresh-toggle aria-pressed="false">${escapeHtml(pickUiText(language, "Auto refresh: off", "自动刷新：关"))}</button>
    <button class="panel-toggle" type="button" data-dashboard-mutation-toggle aria-pressed="${writeAccessPressed}"${writeAccessDisabled}>${escapeHtml(writeAccessLabel)}</button>
    <label class="refresh-interval">
      <span>${escapeHtml(pickUiText(language, "Auto every", "自动间隔"))}</span>
      <select data-dashboard-auto-refresh-interval aria-label="${escapeHtml(pickUiText(language, "Auto refresh interval", "自动刷新间隔"))}">
        ${intervalOptions}
      </select>
    </label>
    <div class="refresh-status" data-dashboard-refresh-status role="status" aria-live="polite">${escapeHtml(pickUiText(language, "Auto refresh is off.", "自动刷新已关闭。"))}</div>
  </div>`;
  }

  function agentTeamSidebarLinks(filters, options) {
    return {
      team: buildHomeHref(filters, options.compactStatusStrip, "team", options.language, options.usageView),
      docs: buildHomeHref(filters, options.compactStatusStrip, "docs", options.language, options.usageView),
      memory: buildHomeHref(filters, options.compactStatusStrip, "memory", options.language, options.usageView),
      projects: buildHomeHref(filters, options.compactStatusStrip, "projects-tasks", options.language, options.usageView),
      settings: buildHomeHref(filters, options.compactStatusStrip, "settings", options.language, options.usageView),
    };
  }

  function taskStateLabel(state, language = "zh") {
    if (state === "todo") return pickUiText(language, "Ready To Start", "待开始");
    if (state === "in_progress") return pickUiText(language, "In Motion", "进行中");
    if (state === "blocked") return pickUiText(language, "Blocked", "已阻塞");
    return pickUiText(language, "Completed", "已完成");
  }

  function projectStateLabel(state, language = "zh") {
    if (state === "planned") return pickUiText(language, "Planned", "规划中");
    if (state === "active") return pickUiText(language, "Active", "执行中");
    if (state === "blocked") return pickUiText(language, "Blocked", "已阻塞");
    return pickUiText(language, "Completed", "已完成");
  }

  function searchScopeLabel(scope, language = "zh") {
    if (scope === "tasks") return pickUiText(language, "Tasks", "任务");
    if (scope === "projects") return pickUiText(language, "Projects", "项目");
    if (scope === "sessions") return pickUiText(language, "Sessions", "会话");
    return pickUiText(language, "Alerts", "告警");
  }

  function isTaskDueNow(task, now) {
    if (task.status === "done") return false;
    if (!task.dueAt) return false;
    const dueMs = Date.parse(task.dueAt);
    if (Number.isNaN(dueMs)) return false;
    return dueMs <= now;
  }

  function matchesQuickFilter(task, quick, now) {
    if (quick === "all") return true;
    if (quick === "attention") {
      return task.status === "blocked" || isTaskDueNow(task, now);
    }
    return task.status === quick;
  }

  function hasAnyQueryKey(searchParams, keys) {
    return keys.some((key) => searchParams.has(key));
  }

  return {
    agentTeamSidebarLinks,
    buildCronDetailHref,
    buildHomeHref,
    buildHomeQuery,
    buildSessionDetailHref,
    buildTaskDetailHref,
    dashboardSectionLinks,
    hasAnyQueryKey,
    joinDisplayList,
    matchesQuickFilter,
    normalizeDashboardSectionForNav,
    projectStateLabel,
    quickFilterLabel,
    renderDashboardRefreshControls,
    renderLanguageToggle,
    renderQuickFilters,
    resolveDashboardSectionTitle,
    searchScopeLabel,
    taskStateLabel,
  };
}

module.exports = { createNavigationHelpers };
