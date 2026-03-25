// @ts-nocheck

function createDashboardQueryHelpers(deps) {
  const {
    RequestValidationError,
    assertAllowedQueryParams,
    asObject,
    badge,
    commanderExceptionsFeed,
    dashboardSearchScopes,
    dashboardSections,
    escapeHtml,
    hasAnyQueryKey,
    isUiLanguage,
    isUiQuickFilter,
    isUiTaskBoardViewMode,
    legacyDashboardRouteAnchor,
    legacyDashboardRouteSection,
    listTasks,
    matchesQuickFilter,
    normalizeOptionalPatchString,
    normalizeQueryString,
    normalizeTaskCardOrderPatch,
    normalizeCollaborationRoomId,
    pickUiText,
    projectStates,
    projectTitleMap,
    readPositiveIntQuery,
    searchLimitMax,
    searchScopeLabel,
    sessionStates,
    taskStates,
  } = deps;

  function parseTaskFilters(searchParams, strict) {
    assertAllowedQueryParams(searchParams, ["quick", "status", "owner", "project"], strict);
    const filters = {};
    const quick = normalizeQueryString(searchParams.get("quick"), "quick", 20, strict);
    if (quick) {
      if (isUiQuickFilter(quick)) {
        filters.quick = quick;
      } else if (strict) {
        throw new RequestValidationError(
          "quick must be one of: all, attention, todo, in_progress, blocked, done",
          400,
        );
      }
    }
    const status = normalizeQueryString(searchParams.get("status"), "status", 30, strict);
    if (status) {
      if (taskStates.includes(status)) {
        filters.status = status;
      } else if (strict) {
        throw new RequestValidationError("status must be one of: todo, in_progress, blocked, done", 400);
      }
    }
    const owner = normalizeQueryString(searchParams.get("owner"), "owner", 80, strict);
    if (owner) {
      filters.owner = owner;
    }
    const project = normalizeQueryString(searchParams.get("project"), "project", 120, strict);
    if (project) {
      filters.project = project;
    }
    return filters;
  }

  function parseProjectFilters(searchParams, strict) {
    assertAllowedQueryParams(searchParams, ["status", "owner", "projectId"], strict);
    const filters = {};
    const status = normalizeQueryString(searchParams.get("status"), "status", 30, strict);
    if (status) {
      if (projectStates.includes(status)) {
        filters.status = status;
      } else if (strict) {
        throw new RequestValidationError("status must be one of: planned, active, blocked, done", 400);
      }
    }
    const owner = normalizeQueryString(searchParams.get("owner"), "owner", 80, strict);
    if (owner) {
      filters.owner = owner;
    }
    const projectId = normalizeQueryString(searchParams.get("projectId"), "projectId", 120, strict);
    if (projectId) {
      filters.projectId = projectId;
    }
    return filters;
  }

  function parseSessionQuery(searchParams, strict) {
    assertAllowedQueryParams(searchParams, ["state", "agentId", "q", "page", "pageSize", "historyLimit"], strict);
    const filters = {};
    const state = normalizeQueryString(searchParams.get("state"), "state", 40, strict);
    if (state) {
      if (sessionStates.includes(state)) {
        filters.state = state;
      } else if (strict) {
        throw new RequestValidationError(
          "state must be one of: idle, running, blocked, waiting_approval, error",
          400,
        );
      }
    }
    const agentId = normalizeQueryString(searchParams.get("agentId"), "agentId", 120, strict);
    if (agentId) {
      filters.agentId = agentId;
    }
    const q = normalizeQueryString(searchParams.get("q"), "q", 160, strict);
    if (q) {
      filters.q = q;
    }
    return {
      filters,
      page: readPositiveIntQuery(searchParams.get("page"), "page", 1, strict),
      pageSize: readPositiveIntQuery(searchParams.get("pageSize"), "pageSize", 12, strict, 100),
      historyLimit: readPositiveIntQuery(searchParams.get("historyLimit"), "historyLimit", 8, strict, 200),
    };
  }

  function parseAuditSeverity(searchParams, strict) {
    assertAllowedQueryParams(searchParams, ["severity"], strict);
    const value = normalizeQueryString(searchParams.get("severity"), "severity", 30, strict);
    if (!value) {
      return "all";
    }
    if (value === "all" || value === "info" || value === "warn" || value === "action-required" || value === "error") {
      return value;
    }
    if (strict) {
      throw new RequestValidationError("severity must be one of: all, info, warn, action-required, error", 400);
    }
    return "all";
  }

  function parseSearchQuery(searchParams) {
    assertAllowedQueryParams(searchParams, ["q", "limit"], true);
    const q = normalizeQueryString(searchParams.get("q"), "q", 180, true);
    if (!q) {
      throw new RequestValidationError("q is required and must be non-empty.", 400);
    }
    return { q, limit: readPositiveIntQuery(searchParams.get("limit"), "limit", 20, true, searchLimitMax) };
  }

  function parseReplayWindowQuery(searchParams, strict) {
    const from = normalizeQueryString(searchParams.get("from"), "from", 64, strict);
    const to = normalizeQueryString(searchParams.get("to"), "to", 64, strict);
    const fromMs = from ? Date.parse(from) : Number.NaN;
    const toMs = to ? Date.parse(to) : Number.NaN;
    if (from && Number.isNaN(fromMs)) {
      throw new RequestValidationError("from must be a valid ISO date-time string.", 400);
    }
    if (to && Number.isNaN(toMs)) {
      throw new RequestValidationError("to must be a valid ISO date-time string.", 400);
    }
    if (from && to && fromMs > toMs) {
      throw new RequestValidationError("from must be less than or equal to to.", 400);
    }
    return {
      from: from ? new Date(fromMs).toISOString() : void 0,
      to: to ? new Date(toMs).toISOString() : void 0,
    };
  }

  function safeSubstringMatch(query, ...fields) {
    const needle = query.toLowerCase();
    if (!needle) {
      return false;
    }
    return fields.some((field) => typeof field === "string" && field.toLowerCase().includes(needle));
  }

  function buildBoundedSearchResult(items, limit) {
    const sliced = items.slice(0, limit);
    return { count: items.length, returned: sliced.length, items: sliced };
  }

  function resolveDashboardSearchQuery(searchParams) {
    const q = normalizeQueryString(searchParams.get("search_q"), "search_q", 180, false) ?? "";
    const rawScope = normalizeQueryString(searchParams.get("search_scope"), "search_scope", 20, false);
    const scope = dashboardSearchScopes.includes(rawScope) ? rawScope : "tasks";
    const limit = readPositiveIntQuery(searchParams.get("search_limit"), "search_limit", 20, false, searchLimitMax);
    return { scope, q, limit };
  }

  function resolveDashboardSection(searchParams) {
    const value = normalizeQueryString(searchParams.get("section"), "section", 40, false);
    if (!value) {
      return "overview";
    }
    if (value === "calendar") {
      return "projects-tasks";
    }
    if (value === "alerts" || value === "replay-audit") {
      return "overview";
    }
    return dashboardSections.includes(value) ? value : "overview";
  }

  function resolveLegacyDashboardSection(path) {
    const section = legacyDashboardRouteSection[path];
    return section;
  }

  function resolveLegacyDashboardAnchor(path) {
    return legacyDashboardRouteAnchor[path];
  }

  function buildDashboardSearchResult(snapshot, query) {
    if (!query.q) {
      return void 0;
    }
    if (query.scope === "tasks") {
      const result = buildBoundedSearchResult(
        listTasks(snapshot.tasks, projectTitleMap(snapshot)).filter((task) =>
          safeSubstringMatch(
            query.q,
            task.taskId,
            task.title,
            task.owner,
            task.projectId,
            task.projectTitle,
            task.status,
            task.dueAt,
          ),
        ),
        query.limit,
      );
      const items = result.items;
      const rows =
        items.length === 0
          ? '<tr><td colspan="6">\u672A\u627E\u5230\u5339\u914D\u4EFB\u52A1\u3002</td></tr>'
          : items
              .map(
                (item) =>
                  `<tr><td><code>${escapeHtml(item.taskId)}</code></td><td>${escapeHtml(item.title)}</td><td>${badge(item.status)}</td><td>${escapeHtml(item.owner)}</td><td>${escapeHtml(item.projectTitle)}</td><td>${escapeHtml(item.updatedAt)}</td></tr>`,
              )
              .join("");
      return {
        scope: query.scope,
        q: query.q,
        limit: query.limit,
        count: result.count,
        returned: result.returned,
        rows: `<table style="margin-top:8px;"><thead><tr><th>\u4EFB\u52A1 ID</th><th>\u6807\u9898</th><th>\u72B6\u6001</th><th>\u667A\u80FD\u4F53</th><th>\u9879\u76EE</th><th>\u66F4\u65B0\u65F6\u95F4</th></tr></thead><tbody>${rows}</tbody></table>`,
      };
    }
    if (query.scope === "projects") {
      const result = buildBoundedSearchResult(
        snapshot.projects.projects.filter((project) =>
          safeSubstringMatch(query.q, project.projectId, project.title, project.owner, project.status),
        ),
        query.limit,
      );
      const items = result.items;
      const rows =
        items.length === 0
          ? '<tr><td colspan="5">\u672A\u627E\u5230\u5339\u914D\u9879\u76EE\u3002</td></tr>'
          : items
              .map(
                (item) =>
                  `<tr><td><code>${escapeHtml(item.projectId)}</code></td><td>${escapeHtml(item.title)}</td><td>${badge(item.status)}</td><td>${escapeHtml(item.owner)}</td><td>${escapeHtml(item.updatedAt)}</td></tr>`,
              )
              .join("");
      return {
        scope: query.scope,
        q: query.q,
        limit: query.limit,
        count: result.count,
        returned: result.returned,
        rows: `<table style="margin-top:8px;"><thead><tr><th>\u9879\u76EE ID</th><th>\u6807\u9898</th><th>\u72B6\u6001</th><th>\u667A\u80FD\u4F53</th><th>\u66F4\u65B0\u65F6\u95F4</th></tr></thead><tbody>${rows}</tbody></table>`,
      };
    }
    if (query.scope === "sessions") {
      const result = buildBoundedSearchResult(
        snapshot.sessions.filter((session) =>
          safeSubstringMatch(query.q, session.sessionKey, session.label, session.agentId, session.state, session.lastMessageAt),
        ),
        query.limit,
      );
      const items = result.items;
      const rows =
        items.length === 0
          ? '<tr><td colspan="5">\u672A\u627E\u5230\u5339\u914D\u4F1A\u8BDD\u3002</td></tr>'
          : items
              .map(
                (item) =>
                  `<tr><td><code>${escapeHtml(item.sessionKey)}</code></td><td>${badge(item.state)}</td><td>${escapeHtml(item.agentId ?? "-")}</td><td>${escapeHtml(item.label ?? "-")}</td><td>${escapeHtml(item.lastMessageAt ?? "-")}</td></tr>`,
              )
              .join("");
      return {
        scope: query.scope,
        q: query.q,
        limit: query.limit,
        count: result.count,
        returned: result.returned,
        rows: `<table style="margin-top:8px;"><thead><tr><th>\u4F1A\u8BDD</th><th>\u72B6\u6001</th><th>\u52A9\u624B</th><th>\u6807\u7B7E</th><th>\u6700\u540E\u6D3B\u52A8</th></tr></thead><tbody>${rows}</tbody></table>`,
      };
    }
    const result = buildBoundedSearchResult(
      commanderExceptionsFeed(snapshot).items.filter((item) =>
        safeSubstringMatch(query.q, item.level, item.code, item.source, item.sourceId, item.route, item.message),
      ),
      query.limit,
    );
    const items = result.items;
    const rows =
      items.length === 0
        ? '<tr><td colspan="5">\u672A\u627E\u5230\u5339\u914D\u544A\u8B66\u3002</td></tr>'
        : items
            .map(
              (item) =>
                `<tr><td>${badge(item.level)}</td><td>${escapeHtml(item.code)}</td><td><code>${escapeHtml(item.sourceId)}</code></td><td>${escapeHtml(item.route)}</td><td>${escapeHtml(item.message)}</td></tr>`,
            )
            .join("");
    return {
      scope: query.scope,
      q: query.q,
      limit: query.limit,
      count: result.count,
      returned: result.returned,
      rows: `<table style="margin-top:8px;"><thead><tr><th>\u7EA7\u522B</th><th>\u4EE3\u7801</th><th>\u6765\u6E90</th><th>\u8DEF\u7531</th><th>\u4FE1\u606F</th></tr></thead><tbody>${rows}</tbody></table>`,
    };
  }

  function renderDashboardSearchResult(result, language = "zh") {
    if (!result) {
      return `<div class="meta" style="margin-top:8px;">${escapeHtml(
        pickUiText(language, "Enter a keyword to search by scope.", "\u8F93\u5165\u5173\u952E\u8BCD\u540E\u53EF\u6309\u8303\u56F4\u641C\u7D22\u3002"),
      )}</div>`;
    }
    const summary =
      result.count > result.returned
        ? pickUiText(
            language,
            `Scope: ${searchScopeLabel(result.scope, language)} \u00B7 Keyword: ${result.q} \u00B7 Showing ${result.returned} of ${result.count} matches`,
            `\u8303\u56F4\uFF1A${searchScopeLabel(result.scope, language)} \u00B7 \u5173\u952E\u8BCD\uFF1A${result.q} \u00B7 \u5F53\u524D\u663E\u793A ${result.returned}/${result.count} \u6761\u547D\u4E2D`,
          )
        : pickUiText(
            language,
            `Scope: ${searchScopeLabel(result.scope, language)} \u00B7 Keyword: ${result.q} \u00B7 Matches: ${result.count}`,
            `\u8303\u56F4\uFF1A${searchScopeLabel(result.scope, language)} \u00B7 \u5173\u952E\u8BCD\uFF1A${result.q} \u00B7 \u547D\u4E2D\uFF1A${result.count}`,
          );
    return `<div class="meta" style="margin-top:8px;">${escapeHtml(summary)}</div>${result.rows}`;
  }

  function resolveDashboardTaskFilters(searchParams, preferences) {
    const incoming = parseTaskFilters(searchParams, false);
    if (hasAnyQueryKey(searchParams, ["quick", "status", "owner", "project"])) {
      return {
        quick: incoming.quick ?? "all",
        status: incoming.status,
        owner: incoming.owner,
        project: incoming.project,
      };
    }
    return {
      quick: preferences.quickFilter,
      status: preferences.taskFilters.status,
      owner: preferences.taskFilters.owner,
      project: preferences.taskFilters.project,
    };
  }

  function resolveCompactStatusStrip(searchParams, fallback) {
    const compact = normalizeQueryString(searchParams.get("compact"), "compact", 8, false);
    if (!compact) {
      return fallback;
    }
    if (compact === "1" || compact.toLowerCase() === "true" || compact.toLowerCase() === "on") {
      return true;
    }
    if (compact === "0" || compact.toLowerCase() === "false" || compact.toLowerCase() === "off") {
      return false;
    }
    return fallback;
  }

  function resolveUsageView(searchParams) {
    const usageView = normalizeQueryString(searchParams.get("usage_view"), "usage_view", 16, false);
    return usageView === "today" ? "today" : "cumulative";
  }

  function resolveUiLanguage(searchParams, fallback) {
    const raw = normalizeQueryString(searchParams.get("lang"), "lang", 8, false);
    if (!raw) {
      return fallback;
    }
    const normalized = raw.trim().toLowerCase();
    return isUiLanguage(normalized) ? normalized : fallback;
  }

  function mergeUiPreferencesPatch(current, payload) {
    const next = {
      language: current.language,
      compactStatusStrip: current.compactStatusStrip,
      quickFilter: current.quickFilter,
      taskFilters: { ...current.taskFilters },
      taskCardOrder: [...current.taskCardOrder],
      taskBoardViewMode: current.taskBoardViewMode,
      localMutationUnlock: current.localMutationUnlock,
      collaborationChat: { ...current.collaborationChat },
      updatedAt: new Date().toISOString(),
    };
    if (payload.language !== void 0) {
      if (typeof payload.language !== "string") {
        throw new RequestValidationError("language must be a string.", 400);
      }
      const normalizedLanguage = payload.language.trim().toLowerCase();
      if (!isUiLanguage(normalizedLanguage)) {
        throw new RequestValidationError("language must be one of: en, zh", 400);
      }
      next.language = normalizedLanguage;
    }
    if (payload.compactStatusStrip !== void 0) {
      if (typeof payload.compactStatusStrip !== "boolean") {
        throw new RequestValidationError("compactStatusStrip must be a boolean.", 400);
      }
      next.compactStatusStrip = payload.compactStatusStrip;
    }
    if (payload.quickFilter !== void 0) {
      if (typeof payload.quickFilter !== "string") {
        throw new RequestValidationError("quickFilter must be a string.", 400);
      }
      const quick = payload.quickFilter.trim();
      if (!isUiQuickFilter(quick)) {
        throw new RequestValidationError(
          "quickFilter must be one of: all, attention, todo, in_progress, blocked, done",
          400,
        );
      }
      next.quickFilter = quick;
    }
    if (payload.taskFilters !== void 0) {
      const filtersObj = asObject(payload.taskFilters);
      if (!filtersObj) {
        throw new RequestValidationError("taskFilters must be an object.", 400);
      }
      if (filtersObj.status !== void 0) {
        if (filtersObj.status === null || filtersObj.status === "") {
          next.taskFilters.status = void 0;
        } else if (typeof filtersObj.status === "string" && taskStates.includes(filtersObj.status)) {
          next.taskFilters.status = filtersObj.status;
        } else {
          throw new RequestValidationError("taskFilters.status must be one of: todo, in_progress, blocked, done", 400);
        }
      }
      if (filtersObj.owner !== void 0) {
        next.taskFilters.owner = normalizeOptionalPatchString(filtersObj.owner, "taskFilters.owner", 80);
      }
      if (filtersObj.project !== void 0) {
        next.taskFilters.project = normalizeOptionalPatchString(filtersObj.project, "taskFilters.project", 120);
      }
    }
    if (payload.taskCardOrder !== void 0) {
      next.taskCardOrder = normalizeTaskCardOrderPatch(payload.taskCardOrder, "taskCardOrder");
    }
    if (payload.taskBoardViewMode !== void 0) {
      if (typeof payload.taskBoardViewMode !== "string") {
        throw new RequestValidationError("taskBoardViewMode must be a string.", 400);
      }
      const viewMode = payload.taskBoardViewMode.trim().toLowerCase();
      if (!isUiTaskBoardViewMode(viewMode)) {
        throw new RequestValidationError("taskBoardViewMode must be one of: cards, details", 400);
      }
      next.taskBoardViewMode = viewMode;
    }
    if (payload.localMutationUnlock !== void 0) {
      if (typeof payload.localMutationUnlock !== "boolean") {
        throw new RequestValidationError("localMutationUnlock must be a boolean.", 400);
      }
      next.localMutationUnlock = payload.localMutationUnlock;
    }
    if (payload.collaborationChat !== void 0) {
      const chatObj = asObject(payload.collaborationChat);
      if (!chatObj) {
        throw new RequestValidationError("collaborationChat must be an object.", 400);
      }
      if (chatObj.expanded !== void 0) {
        if (typeof chatObj.expanded !== "boolean") {
          throw new RequestValidationError("collaborationChat.expanded must be a boolean.", 400);
        }
        next.collaborationChat.expanded = chatObj.expanded;
      }
      if (chatObj.autoRefresh !== void 0) {
        if (typeof chatObj.autoRefresh !== "boolean") {
          throw new RequestValidationError("collaborationChat.autoRefresh must be a boolean.", 400);
        }
        next.collaborationChat.autoRefresh = chatObj.autoRefresh;
      }
      if (chatObj.lastReadSequence !== void 0) {
        if (
          typeof chatObj.lastReadSequence !== "number" ||
          !Number.isInteger(chatObj.lastReadSequence) ||
          chatObj.lastReadSequence < 0
        ) {
          throw new RequestValidationError("collaborationChat.lastReadSequence must be a non-negative integer.", 400);
        }
        next.collaborationChat.lastReadSequence = chatObj.lastReadSequence;
      }
      if (chatObj.activeRoomId !== void 0) {
        if (typeof chatObj.activeRoomId !== "string") {
          throw new RequestValidationError("collaborationChat.activeRoomId must be a string.", 400);
        }
        const activeRoomId = normalizeCollaborationRoomId(chatObj.activeRoomId);
        if (activeRoomId) {
          next.collaborationChat.activeRoomId = activeRoomId;
        }
      }
      if (chatObj.roomReadCursors !== void 0) {
        const cursorObj = asObject(chatObj.roomReadCursors);
        if (!cursorObj) {
          throw new RequestValidationError("collaborationChat.roomReadCursors must be an object.", 400);
        }
        const nextCursors = {};
        for (const [roomId, sequence] of Object.entries(cursorObj)) {
          const normalizedRoomId = normalizeCollaborationRoomId(roomId);
          if (!normalizedRoomId) {
            continue;
          }
          if (typeof sequence !== "number" || !Number.isInteger(sequence) || sequence < 0) {
            throw new RequestValidationError(
              `collaborationChat.roomReadCursors.${normalizedRoomId} must be a non-negative integer.`,
              400,
            );
          }
          nextCursors[normalizedRoomId] = sequence;
        }
        next.collaborationChat.roomReadCursors = nextCursors;
      }
      if (!(next.collaborationChat.activeRoomId in next.collaborationChat.roomReadCursors)) {
        next.collaborationChat.roomReadCursors[next.collaborationChat.activeRoomId] = next.collaborationChat.lastReadSequence;
      }
    }
    return next;
  }

  function applyTaskFilters(tasks, filters) {
    const now = Date.now();
    return tasks.filter((task) => {
      if (filters.quick && !matchesQuickFilter(task, filters.quick, now)) {
        return false;
      }
      if (filters.status && task.status !== filters.status) {
        return false;
      }
      if (filters.owner && task.owner.toLowerCase() !== filters.owner.toLowerCase()) {
        return false;
      }
      if (filters.project && task.projectId.toLowerCase() !== filters.project.toLowerCase()) {
        return false;
      }
      return true;
    });
  }

  function applyProjectFilters(projects, filters) {
    return projects.filter((project) => {
      if (filters.status && project.status !== filters.status) {
        return false;
      }
      if (filters.owner && project.owner.toLowerCase() !== filters.owner.toLowerCase()) {
        return false;
      }
      if (filters.projectId && project.projectId.toLowerCase() !== filters.projectId.toLowerCase()) {
        return false;
      }
      return true;
    });
  }

  return {
    applyProjectFilters,
    applyTaskFilters,
    buildBoundedSearchResult,
    buildDashboardSearchResult,
    mergeUiPreferencesPatch,
    parseAuditSeverity,
    parseProjectFilters,
    parseReplayWindowQuery,
    parseSearchQuery,
    parseSessionQuery,
    parseTaskFilters,
    renderDashboardSearchResult,
    resolveCompactStatusStrip,
    resolveDashboardSearchQuery,
    resolveDashboardSection,
    resolveDashboardTaskFilters,
    resolveLegacyDashboardAnchor,
    resolveLegacyDashboardSection,
    resolveUiLanguage,
    resolveUsageView,
    safeSubstringMatch,
  };
}

export { createDashboardQueryHelpers };
