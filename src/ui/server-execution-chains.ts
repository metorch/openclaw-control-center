// @ts-nocheck

function createExecutionChainHelpers(deps) {
  const {
    buildSessionDetailHref,
    buildTaskDetailHref,
    formatInt,
    humanizeOperatorLabel,
    inferSessionExecutionChainFromSessionKey,
    normalizeInlineText,
    normalizeLookupKey,
    pickLatestSessionActivityTimestamp,
    pickUiText,
    safeTruncate,
    toSortableMs,
  } = deps;

  function buildTaskExecutionChainCards(input) {
    const previewByKey = new Map(input.sessionItems.map((item) => [item.sessionKey, item]));
    const snapshotByKey = new Map(input.sessions.map((session) => [session.sessionKey, session]));
    const usedSessionKeys = new Set();

    const resolveCandidate = (sessionKey) => {
      const preview = previewByKey.get(sessionKey);
      const snapshotSession = snapshotByKey.get(sessionKey);
      const sessionLike =
        preview ??
        snapshotSession ??
        (sessionKey.includes(":run:")
          ? {
              sessionKey,
              agentId: extractAgentIdFromSessionKey(sessionKey),
              state: "idle",
              lastMessageAt: void 0,
            }
          : void 0);
      if (!sessionLike) {
        return void 0;
      }
      const executionChain =
        preview?.executionChain ??
        inferSessionExecutionChainFromSessionKey({
          sessionKey: sessionLike.sessionKey,
          agentId: sessionLike.agentId,
          state: sessionLike.state,
          lastMessageAt: sessionLike.lastMessageAt,
        });
      if (!executionChain) {
        return void 0;
      }
      return {
        taskTitle: preview?.label ?? sessionLike.sessionKey,
        owner: preview?.agentId ?? sessionLike.agentId ?? pickUiText(input.language, "Unassigned", "未分配"),
        sessionKey: sessionLike.sessionKey,
        agentId: sessionLike.agentId,
        state: sessionLike.state,
        latestAt: pickLatestSessionActivityTimestamp(preview?.latestHistoryAt, sessionLike.lastMessageAt),
        latestSnippet: preview?.latestSnippet,
        executionChain,
        sessionHref: buildSessionDetailHref(sessionLike.sessionKey, input.language),
      };
    };

    const cards = [];
    for (const task of input.tasks) {
      const candidates = [...new Set(task.sessionKeys)]
        .map((sessionKey) => resolveCandidate(sessionKey))
        .filter(Boolean)
        .sort(compareTaskExecutionChainCards);
      if (candidates.length === 0) {
        continue;
      }
      const chosen = candidates[0];
      usedSessionKeys.add(chosen.sessionKey);
      if (chosen.executionChain.parentSessionKey) {
        usedSessionKeys.add(chosen.executionChain.parentSessionKey);
      }
      if (chosen.executionChain.childSessionKey) {
        usedSessionKeys.add(chosen.executionChain.childSessionKey);
      }
      cards.push({
        ...chosen,
        taskId: task.taskId,
        taskTitle: task.title,
        projectTitle: task.projectTitle,
        owner: task.owner,
        taskHref: buildTaskDetailHref(task.taskId, input.language),
      });
    }

    const unmappedSessions = [
      ...input.sessionItems.map((item) => resolveCandidate(item.sessionKey)).filter(Boolean),
      ...(input.includeSnapshotUnmappedSessions === false
        ? []
        : input.sessions.map((session) => resolveCandidate(session.sessionKey)).filter(Boolean)),
    ];
    const dedupedUnmapped = new Map();
    for (const item of unmappedSessions) {
      if (dedupedUnmapped.has(item.sessionKey)) {
        continue;
      }
      dedupedUnmapped.set(item.sessionKey, item);
    }
    for (const item of dedupedUnmapped.values()) {
      if (!item.executionChain.spawned) {
        continue;
      }
      if (usedSessionKeys.has(item.sessionKey)) {
        continue;
      }
      cards.push({
        ...item,
        taskTitle: item.latestSnippet?.trim()
          ? safeTruncate(item.latestSnippet.trim(), 64)
          : pickUiText(input.language, "Isolated execution session", "隔离执行会话"),
        owner: item.agentId ?? pickUiText(input.language, "Unassigned", "未分配"),
        unmapped: true,
      });
    }

    return cards.sort(compareTaskExecutionChainCards);
  }

  function compareTaskExecutionChainCards(a, b) {
    if (a.unmapped !== b.unmapped) {
      return a.unmapped ? 1 : -1;
    }
    const stageRank = executionChainStageRank(b.executionChain.stage) - executionChainStageRank(a.executionChain.stage);
    if (stageRank !== 0) {
      return stageRank;
    }
    const timeRank = toSortableMs(b.latestAt) - toSortableMs(a.latestAt);
    if (timeRank !== 0) {
      return timeRank;
    }
    return a.sessionKey.localeCompare(b.sessionKey);
  }

  function summarizeVisibleSessionSnippet(rawSnippet, language = "zh", maxLength = 96) {
    const normalized = normalizeInlineText(rawSnippet ?? "");
    if (!normalized) {
      return pickUiText(language, "No recent summary yet.", "暂无最近摘要。");
    }
    const structured = summarizeStructuredSessionPayload(normalized, language);
    return safeTruncate(structured ?? normalized, maxLength);
  }

  function summarizeStructuredSessionPayload(input, language) {
    const trimmed = input.trim();
    if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
      return summarizeStructuredKeyValueText(trimmed, language);
    }
    try {
      const parsed = summarizeStructuredSessionValue(JSON.parse(trimmed), language);
      if (parsed) {
        return parsed;
      }
    } catch {}
    return summarizeStructuredSessionTextFallback(trimmed, language);
  }

  function summarizeStructuredKeyValueText(input, language) {
    const parts = input
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 2 || !parts.some((part) => part.includes("="))) {
      return void 0;
    }
    const values = new Map();
    for (const part of parts) {
      const [rawKey, ...rest] = part.split("=");
      const key = rawKey?.trim().toLowerCase();
      const value = rest.join("=").trim();
      if (!key || !value) {
        continue;
      }
      values.set(key, value);
    }
    if (values.size === 0) {
      return void 0;
    }
    const segments = [];
    const accepted = values.get("accepted");
    if (accepted) {
      segments.push(
        isTruthyFlag(accepted) ? pickUiText(language, "Accepted", "已接单") : pickUiText(language, "Not accepted", "未接单"),
      );
    }
    const spawned = values.get("spawned");
    if (spawned) {
      segments.push(
        isTruthyFlag(spawned)
          ? pickUiText(language, "Spawned", "已派发")
          : pickUiText(language, "Pending spawn", "待派发"),
      );
    }
    const scanned = numericSummarySegment(values.get("scanned"), language, "Scanned", "扫描");
    if (scanned) segments.push(scanned);
    const sent = numericSummarySegment(values.get("sent"), language, "Sent", "发送");
    if (sent) segments.push(sent);
    const attempted = numericSummarySegment(values.get("attemptedqueries"), language, "Queries", "查询");
    if (attempted) segments.push(attempted);
    const successful = numericSummarySegment(values.get("successfulqueries"), language, "Successful", "成功");
    if (successful) segments.push(successful);
    const source = values.get("source");
    if (source?.trim()) {
      const normalized = normalizeLookupKey(source);
      const sourceLabel =
        normalized === "session_key"
          ? pickUiText(language, "Session-key inferred", "会话键推断")
          : normalized === "history"
            ? pickUiText(language, "History derived", "历史推导")
            : safeTruncate(normalizeInlineText(source), 32);
      segments.push(sourceLabel);
    }
    const inferred = values.get("inferred");
    if (inferred && isTruthyFlag(inferred)) {
      segments.push(pickUiText(language, "Best-effort", "推断值"));
    }
    return segments.length > 0 ? segments.slice(0, 5).join(" · ") : void 0;
  }

  function numericSummarySegment(rawValue, language, enLabel, zhLabel) {
    if (!rawValue) {
      return void 0;
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      return void 0;
    }
    return `${pickUiText(language, enLabel, zhLabel)} ${formatInt(value)}`;
  }

  function isTruthyFlag(input) {
    return /^(?:1|true|yes|y)$/i.test(input.trim());
  }

  function summarizeStructuredSessionValue(input, language) {
    if (input === null || input === void 0) {
      return void 0;
    }
    if (typeof input === "string") {
      const normalized = normalizeInlineText(input);
      if (!normalized) {
        return void 0;
      }
      return normalized;
    }
    if (typeof input === "number" || typeof input === "boolean") {
      return String(input);
    }
    if (Array.isArray(input)) {
      if (input.length === 0) {
        return pickUiText(language, "Empty result", "空结果");
      }
      const first = summarizeStructuredSessionValue(input[0], language);
      if (first?.trim()) {
        const suffix = input.length > 1 ? ` · ${formatInt(input.length)} ${pickUiText(language, "items", "项")}` : "";
        return `${first}${suffix}`;
      }
      return `${formatInt(input.length)} ${pickUiText(language, "items", "项")}`;
    }
    if (typeof input !== "object") {
      return void 0;
    }
    const obj = input;
    const explicitText = firstStructuredSessionText(obj);
    if (explicitText) {
      return explicitText;
    }
    const segments = [];
    if (typeof obj.ok === "boolean") {
      segments.push(pickUiText(language, obj.ok ? "Succeeded" : "Failed", obj.ok ? "成功" : "失败"));
    }
    const errorText = boundedStructuredSessionText(obj.error, 48);
    if (errorText) {
      segments.push(`${pickUiText(language, "Error", "错误")} ${errorText}`);
    }
    const counters = [
      ["attemptedQueries", "Queries", "查询"],
      ["successfulQueries", "Successful", "成功"],
      ["scanned", "Scanned", "扫描"],
      ["qualified", "Qualified", "入选"],
      ["sent", "Sent", "发送"],
      ["candidatesLoaded", "Loaded", "载入"],
      ["matches", "Matches", "匹配"],
      ["created", "Created", "新建"],
      ["updated", "Updated", "更新"],
      ["written", "Written", "写入"],
      ["deleted", "Deleted", "删除"],
    ];
    for (const [key, enLabel, zhLabel] of counters) {
      const value = obj[key];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        continue;
      }
      segments.push(`${pickUiText(language, enLabel, zhLabel)} ${formatInt(value)}`);
      if (segments.length >= 5) {
        break;
      }
    }
    if (segments.length > 0) {
      return segments.join(" · ");
    }
    return void 0;
  }

  function firstStructuredSessionText(obj) {
    const keys = ["summary", "message", "detail", "reason", "statusText", "status", "result", "output", "response"];
    for (const key of keys) {
      const text = boundedStructuredSessionText(obj[key], 88);
      if (text) {
        return text;
      }
    }
    return void 0;
  }

  function boundedStructuredSessionText(input, maxLength) {
    if (typeof input !== "string") {
      return void 0;
    }
    const normalized = normalizeInlineText(input);
    if (!normalized || normalized.startsWith("{") || normalized.startsWith("[")) {
      return void 0;
    }
    return safeTruncate(normalized, maxLength);
  }

  function summarizeStructuredSessionTextFallback(input, language) {
    const segments = [];
    const okMatch = /"ok"\s*:\s*(true|false)/i.exec(input);
    if (okMatch) {
      segments.push(pickUiText(language, okMatch[1] === "true" ? "Succeeded" : "Failed", okMatch[1] === "true" ? "成功" : "失败"));
    }
    const errorMatch = /"error"\s*:\s*"([^"]+)"/i.exec(input);
    if (errorMatch?.[1]?.trim()) {
      segments.push(`${pickUiText(language, "Error", "错误")} ${safeTruncate(normalizeInlineText(errorMatch[1]), 48)}`);
    }
    const counters = [
      [/"attemptedQueries"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Queries", "查询"],
      [/"successfulQueries"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Successful", "成功"],
      [/"scanned"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Scanned", "扫描"],
      [/"qualified"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Qualified", "入选"],
      [/"sent"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Sent", "发送"],
      [/"candidatesLoaded"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Loaded", "载入"],
      [/"matches"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Matches", "匹配"],
      [/"created"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Created", "新建"],
      [/"updated"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Updated", "更新"],
      [/"written"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Written", "写入"],
      [/"deleted"\s*:\s*(-?\d+(?:\.\d+)?)/i, "Deleted", "删除"],
    ];
    for (const [pattern, enLabel, zhLabel] of counters) {
      const match = pattern.exec(input);
      if (!match?.[1]) {
        continue;
      }
      const value = Number(match[1]);
      if (!Number.isFinite(value)) {
        continue;
      }
      segments.push(`${pickUiText(language, enLabel, zhLabel)} ${formatInt(value)}`);
      if (segments.length >= 5) {
        break;
      }
    }
    if (segments.length > 0) {
      return segments.join(" · ");
    }
    return void 0;
  }

  function looksLikeStructuredExecutionTitle(input) {
    const normalized = normalizeInlineText(input);
    if (!normalized) {
      return true;
    }
    if (normalized.startsWith("{") || normalized.startsWith("[")) {
      return true;
    }
    if (normalized.startsWith("agent:")) {
      return true;
    }
    if (/[{"\[]/.test(normalized) && /"[^"]+"\s*:/.test(normalized)) {
      return true;
    }
    return false;
  }

  function executionChainFallbackTitle(item, language) {
    const agentLabel = humanizeOperatorLabel(item.agentId ?? item.owner ?? "main");
    if (item.unmapped) {
      const sessionKind = extractCronJobIdFromSessionKey(item.sessionKey)
        ? pickUiText(language, "Cron isolated run", "Cron 隔离执行")
        : pickUiText(language, "Isolated execution session", "隔离执行会话");
      return `${agentLabel} · ${sessionKind}`;
    }
    const projectLabel = normalizeInlineText(item.projectTitle ?? "");
    if (projectLabel) {
      return `${safeTruncate(projectLabel, 36)} · ${pickUiText(language, "Linked task", "关联任务")}`;
    }
    if (item.taskId?.trim()) {
      return `${pickUiText(language, "Task", "任务")} ${safeTruncate(item.taskId.trim(), 32)}`;
    }
    return `${agentLabel} · ${pickUiText(language, "Linked task", "关联任务")}`;
  }

  function executionChainCardTitle(item, language) {
    if (item.unmapped) {
      return executionChainFallbackTitle(item, language);
    }
    const normalizedTitle = normalizeInlineText(item.taskTitle ?? "");
    if (!normalizedTitle) {
      return executionChainFallbackTitle(item, language);
    }
    if (!looksLikeStructuredExecutionTitle(normalizedTitle)) {
      return safeTruncate(normalizedTitle, 88);
    }
    const structuredTitle = summarizeStructuredSessionPayload(normalizedTitle, language);
    if (structuredTitle?.trim()) {
      return safeTruncate(structuredTitle, 88);
    }
    return executionChainFallbackTitle(item, language);
  }

  function executionChainStageRank(stage) {
    switch (stage) {
      case "running":
        return 4;
      case "spawned":
        return 3;
      case "accepted":
        return 2;
      case "idle":
      default:
        return 1;
    }
  }

  function executionChainStageLabel(stage, language = "zh") {
    switch (stage) {
      case "running":
        return pickUiText(language, "Running", "执行中");
      case "spawned":
        return pickUiText(language, "Spawned", "已派发");
      case "accepted":
        return pickUiText(language, "Accepted", "已接单");
      case "idle":
      default:
        return pickUiText(language, "Idle", "待命");
    }
  }

  function executionChainSourceLabel(chain, language = "zh") {
    if (chain.source === "history") {
      return chain.inferred
        ? pickUiText(language, "History signal (best effort)", "历史信号（尽力推断）")
        : pickUiText(language, "History evidence", "历史证据");
    }
    return pickUiText(language, "Session-key inference", "会话键推断");
  }

  function extractAgentIdFromSessionKey(sessionKey) {
    const match = /^agent:([^:]+)/.exec(sessionKey.trim());
    return match?.[1];
  }

  function extractCronJobIdFromSessionKey(sessionKey) {
    const match = /^agent:[^:]+:cron:([^:]+)/.exec(sessionKey.trim());
    return match?.[1];
  }

  return {
    buildTaskExecutionChainCards,
    compareTaskExecutionChainCards,
    executionChainCardTitle,
    executionChainSourceLabel,
    executionChainStageLabel,
    executionChainStageRank,
    extractAgentIdFromSessionKey,
    extractCronJobIdFromSessionKey,
    looksLikeStructuredExecutionTitle,
    summarizeStructuredSessionPayload,
    summarizeVisibleSessionSnippet,
  };
}

export { createExecutionChainHelpers };
