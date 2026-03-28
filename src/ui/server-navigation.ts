// @ts-nocheck

function createNavigationHelpers(deps) {
  const { defaultPrimaryOperatorDisplayName, escapeHtml, pickUiText, uiQuickFilters } = deps;

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
      { key: "features", icon: "spark", label: "Features", blurb: "Standalone tools and workbenches" },
      { key: "projects-tasks", icon: "tasks", label: "Tasks", blurb: "Board, schedule and activity" },
      { key: "settings", icon: "settings", label: "Settings", blurb: "Safety and data links" },
    ];

    return baseLinks.map((item) => {
      if (language !== "zh") return item;
      if (item.key === "overview") {
        return { ...item, label: "\u603B\u89C8", blurb: "\u4ECA\u5929\u91CD\u70B9" };
      }
      if (item.key === "usage-cost") {
        return { ...item, label: "\u7528\u91CF", blurb: "\u9884\u7B97\u4E0E\u914D\u989D" };
      }
      if (item.key === "team") {
        return { ...item, label: "\u5458\u5DE5", blurb: "\u4EFB\u52A1\u3001\u5458\u5DE5\u4E0E\u5206\u5DE5" };
      }
      if (item.key === "collaboration") {
        return { ...item, label: "\u534F\u4F5C", blurb: "\u667A\u80FD\u4F53\u4EA4\u63A5\u4E0E\u534F\u540C" };
      }
      if (item.key === "memory") {
        return { ...item, label: "\u8BB0\u5FC6", blurb: "\u6BCF\u65E5\u4E0E\u957F\u671F\u8BB0\u5FC6" };
      }
      if (item.key === "docs") {
        return {
          ...item,
          label: "\u6587\u6863",
          blurb: `${defaultPrimaryOperatorDisplayName} \u4E0E\u5F53\u524D\u542F\u7528\u667A\u80FD\u4F53\u7684\u6838\u5FC3\u6587\u6863`,
        };
      }
      if (item.key === "features") {
        return { ...item, label: "\u529F\u80FD", blurb: "\u72EC\u7ACB\u5DE5\u5177\u4E0E\u53EF\u89C6\u5316\u5DE5\u4F5C\u53F0" };
      }
      if (item.key === "projects-tasks") {
        return { ...item, label: "\u4EFB\u52A1", blurb: "\u770B\u677F\u3001\u6392\u671F\u4E0E\u6D3B\u52A8" };
      }
      return { ...item, label: "\u8BBE\u7F6E", blurb: "\u5B89\u5168\u4E0E\u6570\u636E\u94FE\u63A5" };
    });
  }

  function resolveDashboardSectionTitle(section, language) {
    if (language === "en" && section.key === "overview") {
      return "Overview Control Center";
    }
    return section.label;
  }

  function buildHomeQuery(
    filters,
    compactStatusStrip,
    section = "overview",
    language = "en",
    usageView = "cumulative",
    extraParams = {},
  ) {
    const params = new URLSearchParams();
    params.set("compact", compactStatusStrip ? "1" : "0");
    params.set("section", section);
    params.set("lang", language);
    if (usageView === "today") params.set("usage_view", "today");
    params.set("quick", filters.quick ?? "all");
    if (filters.status) params.set("status", filters.status);
    if (filters.owner) params.set("owner", filters.owner);
    if (filters.project) params.set("project", filters.project);
    Object.entries(extraParams || {}).forEach(([key, value]) => {
      if (typeof value !== "string") return;
      const normalized = value.trim();
      if (!normalized) return;
      params.set(key, normalized);
    });
    return params.toString();
  }

  function buildHomeHref(
    filters,
    compactStatusStrip,
    section = "overview",
    language = "en",
    usageView = "cumulative",
    extraParams = {},
  ) {
    const query = buildHomeQuery(filters, compactStatusStrip, section, language, usageView, extraParams);
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
    return output.join(language === "en" ? ", " : "\u3001");
  }

  function quickFilterLabel(value, language = "en") {
    if (value === "all") return pickUiText(language, "Everything", "\u5168\u90E8");
    if (value === "attention") return pickUiText(language, "Needs Attention", "\u9700\u5173\u6CE8");
    if (value === "todo") return pickUiText(language, "Ready To Start", "\u53EF\u5F00\u59CB");
    if (value === "in_progress") return pickUiText(language, "In Motion", "\u8FDB\u884C\u4E2D");
    if (value === "blocked") return pickUiText(language, "Blocked", "\u5DF2\u963B\u585E");
    return pickUiText(language, "Completed", "\u5DF2\u5B8C\u6210");
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
    const enHref = buildHomeHref(
      filters,
      options.compactStatusStrip,
      options.section,
      "en",
      options.usageView,
      options.extraQuery,
    );
    const zhHref = buildHomeHref(
      filters,
      options.compactStatusStrip,
      options.section,
      "zh",
      options.usageView,
      options.extraQuery,
    );
    const enClass = options.language === "en" ? ' class="active"' : "";
    const zhClass = options.language === "zh" ? ' class="active"' : "";
    const label = pickUiText(options.language, "Language:", "\u8BED\u8A00\uFF1A");
    const zhLabel = pickUiText(options.language, "Chinese", "\u4E2D\u6587");
    return `<div class="meta lang-toggle">${label} <a${enClass} href="${escapeHtml(enHref)}">EN</a> / <a${zhClass} href="${escapeHtml(zhHref)}">${zhLabel}</a></div>`;
  }

  function renderDashboardRefreshControls(language, options) {
    const intervals = [15, 30, 60, 120];
    const intervalOptions = intervals
      .map((value) => {
        const label = language === "en" ? `${value}s` : `${value} \u79D2`;
        return `<option value="${value}"${value === 30 ? " selected" : ""}>${escapeHtml(label)}</option>`;
      })
      .join("");
    const writeAccessLabel = !options.localTokenAuthRequired
      ? pickUiText(language, "Write access: direct", "\u5199\u5165\u6743\u9650\uFF1A\u76F4\u63A5")
      : !options.localTokenConfigured
        ? pickUiText(language, "Write access: unavailable", "\u5199\u5165\u89E3\u9501\uFF1A\u672A\u914D\u7F6E")
        : options.localMutationUnlock
          ? pickUiText(language, "Write access: on", "\u5199\u5165\u89E3\u9501\uFF1A\u5F00")
          : pickUiText(language, "Write access: off", "\u5199\u5165\u89E3\u9501\uFF1A\u5173");
    const writeAccessPressed = options.localMutationUnlock && options.localTokenConfigured ? "true" : "false";
    const writeAccessDisabled = options.localTokenAuthRequired && !options.localTokenConfigured ? " disabled" : "";
    if (options.section === "features") {
      return `<div class="refresh-toolbar refresh-toolbar-features" data-dashboard-refresh-root>
    <button class="panel-toggle" type="button" data-dashboard-refresh-now hidden aria-hidden="true" tabindex="-1">${escapeHtml(pickUiText(language, "Refresh now", "\u7ACB\u5373\u5237\u65B0"))}</button>
    <button class="panel-toggle" type="button" data-dashboard-auto-refresh-toggle aria-pressed="false" hidden aria-hidden="true" tabindex="-1">${escapeHtml(pickUiText(language, "Auto refresh: off", "\u81EA\u52A8\u5237\u65B0\uFF1A\u5173"))}</button>
    <button class="panel-toggle" type="button" data-dashboard-mutation-toggle aria-pressed="${writeAccessPressed}"${writeAccessDisabled}>${escapeHtml(writeAccessLabel)}</button>
    <label class="refresh-interval" hidden aria-hidden="true">
      <span>${escapeHtml(pickUiText(language, "Auto every", "\u81EA\u52A8\u95F4\u9694"))}</span>
      <select data-dashboard-auto-refresh-interval aria-label="${escapeHtml(pickUiText(language, "Auto refresh interval", "\u81EA\u52A8\u5237\u65B0\u95F4\u9694"))}">
        ${intervalOptions}
      </select>
    </label>
    <div class="refresh-status" data-dashboard-refresh-status role="status" aria-live="polite">${escapeHtml(pickUiText(language, "Feature data sync is handled in the background. This page will not auto-refresh or reload.", "\u529F\u80FD\u9875\u6570\u636E\u7531\u540E\u7AEF\u540E\u53F0\u540C\u6B65\u3002\u8FD9\u4E2A\u9875\u9762\u4E0D\u4F1A\u81EA\u52A8\u5237\u65B0\u6216\u6574\u9875\u91CD\u8F7D\u3002"))}</div>
  </div>`;
    }
    return `<div class="refresh-toolbar" data-dashboard-refresh-root>
    <button class="panel-toggle" type="button" data-dashboard-refresh-now>${escapeHtml(pickUiText(language, "Refresh now", "\u7ACB\u5373\u5237\u65B0"))}</button>
    <button class="panel-toggle" type="button" data-dashboard-auto-refresh-toggle aria-pressed="false">${escapeHtml(pickUiText(language, "Auto refresh: off", "\u81EA\u52A8\u5237\u65B0\uFF1A\u5173"))}</button>
    <button class="panel-toggle" type="button" data-dashboard-mutation-toggle aria-pressed="${writeAccessPressed}"${writeAccessDisabled}>${escapeHtml(writeAccessLabel)}</button>
    <label class="refresh-interval">
      <span>${escapeHtml(pickUiText(language, "Auto every", "\u81EA\u52A8\u95F4\u9694"))}</span>
      <select data-dashboard-auto-refresh-interval aria-label="${escapeHtml(pickUiText(language, "Auto refresh interval", "\u81EA\u52A8\u5237\u65B0\u95F4\u9694"))}">
        ${intervalOptions}
      </select>
    </label>
    <div class="refresh-status" data-dashboard-refresh-status role="status" aria-live="polite">${escapeHtml(pickUiText(language, "Auto refresh is off.", "\u81EA\u52A8\u5237\u65B0\u5DF2\u5173\u95ED\u3002"))}</div>
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
    if (state === "todo") return pickUiText(language, "Ready To Start", "\u5F85\u5F00\u59CB");
    if (state === "in_progress") return pickUiText(language, "In Motion", "\u8FDB\u884C\u4E2D");
    if (state === "blocked") return pickUiText(language, "Blocked", "\u5DF2\u963B\u585E");
    return pickUiText(language, "Completed", "\u5DF2\u5B8C\u6210");
  }

  function projectStateLabel(state, language = "zh") {
    if (state === "planned") return pickUiText(language, "Planned", "\u89C4\u5212\u4E2D");
    if (state === "active") return pickUiText(language, "Active", "\u6267\u884C\u4E2D");
    if (state === "blocked") return pickUiText(language, "Blocked", "\u5DF2\u963B\u585E");
    return pickUiText(language, "Completed", "\u5DF2\u5B8C\u6210");
  }

  function searchScopeLabel(scope, language = "zh") {
    if (scope === "tasks") return pickUiText(language, "Tasks", "\u4EFB\u52A1");
    if (scope === "projects") return pickUiText(language, "Projects", "\u9879\u76EE");
    if (scope === "sessions") return pickUiText(language, "Sessions", "\u4F1A\u8BDD");
    return pickUiText(language, "Alerts", "\u544A\u8B66");
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
