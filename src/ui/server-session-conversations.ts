// @ts-nocheck

function createSessionConversationHelpers(deps) {
  const {
    executionChainStageRank,
    getSessionConversationDetail,
    heavyCacheTtlMs,
    listSessionConversations,
    normalizeInlineText,
    normalizeLookupKey,
    pickLatestTimestamp,
    safeTruncate,
    toSortableMs,
  } = deps;

  const COLLABORATION_PREVIEW_PAGE_SIZE = 8;
  const COLLABORATION_PREVIEW_HISTORY_LIMIT = 3;
  let sessionPreviewCache;
  let collaborationPreviewCache;
  let collaborationPreviewInFlight;
  let taskEvidenceCache;
  let taskEvidenceInFlight;

  function invalidateSessionConversationCaches() {
    sessionPreviewCache = void 0;
    collaborationPreviewCache = void 0;
    collaborationPreviewInFlight = void 0;
    taskEvidenceCache = void 0;
    taskEvidenceInFlight = void 0;
  }

  function mergeSessionConversationItems(primary, secondary) {
    const merged = new Map();
    for (const item of [...primary, ...secondary]) {
      const sessionKey = item.sessionKey.trim();
      if (!sessionKey) {
        continue;
      }
      const existing = merged.get(sessionKey);
      merged.set(sessionKey, existing ? mergeSessionConversationItem(existing, item) : item);
    }
    return [...merged.values()];
  }

  function mergeSessionConversationItem(existing, incoming) {
    return {
      ...existing,
      ...incoming,
      label: incoming.label ?? existing.label,
      agentId: incoming.agentId ?? existing.agentId,
      state: incoming.state ?? existing.state,
      lastMessageAt:
        pickLatestTimestamp([existing.lastMessageAt, incoming.lastMessageAt]) ??
        incoming.lastMessageAt ??
        existing.lastMessageAt,
      taskSnippet: pickRicherSessionText(existing.taskSnippet, incoming.taskSnippet),
      latestSnippet: pickRicherSessionText(existing.latestSnippet, incoming.latestSnippet),
      latestRole: incoming.latestRole ?? existing.latestRole,
      latestKind: incoming.latestKind ?? existing.latestKind,
      latestToolName: incoming.latestToolName ?? existing.latestToolName,
      latestHistoryAt:
        pickLatestTimestamp([existing.latestHistoryAt, incoming.latestHistoryAt]) ??
        incoming.latestHistoryAt ??
        existing.latestHistoryAt,
      historyCount: Math.max(existing.historyCount, incoming.historyCount),
      toolEventCount: Math.max(existing.toolEventCount, incoming.toolEventCount),
      historyError: existing.historyError || incoming.historyError,
      executionChain:
        existing.executionChain && incoming.executionChain
          ? mergeExecutionChainSummaries(existing.executionChain, incoming.executionChain)
          : incoming.executionChain ?? existing.executionChain,
      interSessionSignals: mergeInterSessionSignals(existing.interSessionSignals, incoming.interSessionSignals),
    };
  }

  function pickRicherSessionText(current, incoming) {
    const currentText = normalizeInlineText(current ?? "");
    const incomingText = normalizeInlineText(incoming ?? "");
    if (!currentText) {
      return incomingText || void 0;
    }
    if (!incomingText) {
      return currentText || void 0;
    }
    if (incomingText.length > currentText.length) {
      return incomingText;
    }
    return currentText;
  }

  function mergeExecutionChainSummaries(current, incoming) {
    const chosenStage =
      executionChainStageRank(incoming.stage) >= executionChainStageRank(current.stage)
        ? incoming.stage
        : current.stage;
    return {
      accepted: current.accepted || incoming.accepted,
      acceptedAt:
        pickLatestTimestamp([current.acceptedAt, incoming.acceptedAt]) ??
        incoming.acceptedAt ??
        current.acceptedAt,
      spawned: current.spawned || incoming.spawned,
      spawnedAt:
        pickLatestTimestamp([current.spawnedAt, incoming.spawnedAt]) ??
        incoming.spawnedAt ??
        current.spawnedAt,
      parentSessionKey: incoming.parentSessionKey ?? current.parentSessionKey,
      childSessionKey: incoming.childSessionKey ?? current.childSessionKey,
      stage: chosenStage,
      source: incoming.source === "history" || current.source !== "history" ? incoming.source : current.source,
      inferred: current.inferred && incoming.inferred,
      detail: pickRicherSessionText(current.detail, incoming.detail) ?? incoming.detail,
    };
  }

  function mergeInterSessionSignals(current, incoming) {
    const items = [...(current ?? []), ...(incoming ?? [])];
    if (items.length === 0) {
      return void 0;
    }
    const merged = new Map();
    for (const item of items) {
      const key = [
        normalizeLookupKey(item.sourceSessionKey),
        normalizeLookupKey(item.sourceTool ?? ""),
        normalizeLookupKey(item.timestamp ?? ""),
        normalizeLookupKey(item.snippet),
      ].join("::");
      if (!merged.has(key)) {
        merged.set(key, item);
      }
    }
    return [...merged.values()].sort((a, b) => toSortableMs(a.timestamp) - toSortableMs(b.timestamp));
  }

  function pickSessionTaskSnippet(history) {
    const candidates = history.filter(
      (item) => (item.kind === "message" || item.kind === "inter_session") && item.content.trim(),
    );
    const preferred =
      candidates.find((item) => /user|system/i.test(item.role)) ??
      candidates.find((item) => !/assistant|tool/i.test(item.role)) ??
      candidates[0];
    const normalized = normalizeInlineText(preferred?.content ?? "");
    return normalized || void 0;
  }

  async function loadSessionConversationItemsByKeys(snapshot, toolClient, sessionKeys, historyLimit) {
    const normalizedKeys = [...new Set(sessionKeys.map((item) => item.trim()).filter(Boolean))];
    if (normalizedKeys.length === 0) {
      return [];
    }
    const details = await Promise.all(
      normalizedKeys.map(async (sessionKey) => {
        const detail = await getSessionConversationDetail({
          snapshot,
          client: toolClient,
          sessionKey,
          historyLimit,
        });
        return detail ?? void 0;
      }),
    );
    return details.filter(Boolean).map((detail) => ({
      sessionKey: detail.session.sessionKey,
      label: detail.session.label,
      agentId: detail.session.agentId,
      state: detail.session.state,
      lastMessageAt: detail.session.lastMessageAt,
      taskSnippet: pickSessionTaskSnippet(detail.history),
      latestSnippet: detail.latestSnippet,
      latestRole: detail.latestRole,
      latestKind: detail.latestKind,
      latestToolName: detail.latestToolName,
      latestHistoryAt: detail.latestHistoryAt,
      historyCount: detail.historyCount,
      toolEventCount: detail.history.filter((item) => item.kind === "tool_event").length,
      historyError: detail.historyError,
      executionChain: detail.executionChain,
      interSessionSignals: detail.history
        .filter((item) => item.kind === "inter_session" && (item.sourceSessionKey ?? "").trim())
        .map((item) => ({
          sourceSessionKey: item.sourceSessionKey.trim(),
          sourceTool: item.sourceTool,
          timestamp: item.timestamp,
          snippet: safeTruncate(normalizeInlineText(item.content), 220),
        })),
    }));
  }

  function buildConversationSnapshotKey(input) {
    const { snapshot, sessionKeys, pageSize, historyLimit } = input;
    const explicitKeys = sessionKeys?.map((item) => item.trim()).filter(Boolean);
    const scopedSessions =
      explicitKeys && explicitKeys.length > 0
        ? snapshot.sessions.filter((session) => explicitKeys.includes(session.sessionKey))
        : [...snapshot.sessions]
            .sort((a, b) => {
              const aTs = toSortableMs(a.lastMessageAt);
              const bTs = toSortableMs(b.lastMessageAt);
              if (aTs !== bTs) {
                return bTs - aTs;
              }
              return a.sessionKey.localeCompare(b.sessionKey);
            })
            .slice(0, pageSize ?? snapshot.sessions.length);
    const relevantSessionKeys = scopedSessions.map((session) => session.sessionKey);
    const sessionFingerprint = scopedSessions
      .map((session) => `${session.sessionKey}:${session.state}:${session.lastMessageAt ?? ""}`)
      .sort()
      .join(";");
    const statusFingerprint = snapshot.statuses
      .filter((status) => relevantSessionKeys.includes(status.sessionKey))
      .map((status) => `${status.sessionKey}:${status.updatedAt}`)
      .sort()
      .join(";");
    return `${pageSize ?? 0}|${historyLimit ?? 0}|${sessionFingerprint}|${statusFingerprint}`;
  }

  async function loadCachedTaskEvidenceSessions(snapshot, toolClient, sessionKeys, historyLimit = 24) {
    const normalizedKeys = [...new Set(sessionKeys.map((item) => item.trim()).filter(Boolean))].sort();
    if (normalizedKeys.length === 0) {
      return [];
    }
    const cacheKey = normalizedKeys.join(",");
    const snapshotKey = buildConversationSnapshotKey({
      snapshot,
      sessionKeys: normalizedKeys,
      historyLimit,
    });
    const now = Date.now();
    if (
      taskEvidenceCache &&
      taskEvidenceCache.snapshotKey === snapshotKey &&
      taskEvidenceCache.historyLimit === historyLimit &&
      taskEvidenceCache.sessionKey === cacheKey &&
      taskEvidenceCache.expiresAt > now
    ) {
      return taskEvidenceCache.value;
    }

    if (
      taskEvidenceCache &&
      taskEvidenceCache.historyLimit === historyLimit &&
      taskEvidenceCache.sessionKey === cacheKey
    ) {
      if (
        !taskEvidenceInFlight ||
        taskEvidenceInFlight.snapshotKey !== snapshotKey ||
        taskEvidenceInFlight.historyLimit !== historyLimit ||
        taskEvidenceInFlight.sessionKey !== cacheKey
      ) {
        const nextValue = loadSessionConversationItemsByKeys(snapshot, toolClient, normalizedKeys, historyLimit);
        taskEvidenceInFlight = {
          snapshotKey,
          historyLimit,
          sessionKey: cacheKey,
          value: nextValue,
        };
        void nextValue
          .then((value) => {
            taskEvidenceCache = {
              snapshotKey,
              historyLimit,
              sessionKey: cacheKey,
              value,
              expiresAt: Date.now() + heavyCacheTtlMs,
            };
          })
          .finally(() => {
            if (
              taskEvidenceInFlight?.snapshotKey === snapshotKey &&
              taskEvidenceInFlight.historyLimit === historyLimit &&
              taskEvidenceInFlight.sessionKey === cacheKey
            ) {
              taskEvidenceInFlight = void 0;
            }
          });
      }
      return taskEvidenceCache.value;
    }

    if (
      taskEvidenceInFlight &&
      taskEvidenceInFlight.snapshotKey === snapshotKey &&
      taskEvidenceInFlight.historyLimit === historyLimit &&
      taskEvidenceInFlight.sessionKey === cacheKey
    ) {
      return taskEvidenceInFlight.value;
    }

    const nextValue = loadSessionConversationItemsByKeys(snapshot, toolClient, normalizedKeys, historyLimit);
    taskEvidenceInFlight = {
      snapshotKey,
      historyLimit,
      sessionKey: cacheKey,
      value: nextValue,
    };
    try {
      const value = await nextValue;
      taskEvidenceCache = {
        snapshotKey,
        historyLimit,
        sessionKey: cacheKey,
        value,
        expiresAt: now + heavyCacheTtlMs,
      };
      return value;
    } finally {
      if (
        taskEvidenceInFlight?.snapshotKey === snapshotKey &&
        taskEvidenceInFlight.historyLimit === historyLimit &&
        taskEvidenceInFlight.sessionKey === cacheKey
      ) {
        taskEvidenceInFlight = void 0;
      }
    }
  }

  async function loadCachedSessionPreview(snapshot, toolClient) {
    const snapshotKey = buildConversationSnapshotKey({
      snapshot,
      pageSize: 12,
      historyLimit: 5,
    });
    const now = Date.now();
    if (
      sessionPreviewCache &&
      sessionPreviewCache.snapshotKey === snapshotKey &&
      sessionPreviewCache.expiresAt > now
    ) {
      return sessionPreviewCache.value;
    }
    const value = await listSessionConversations({
      snapshot,
      client: toolClient,
      filters: {},
      page: 1,
      pageSize: 12,
      historyLimit: 5,
    });
    sessionPreviewCache = { snapshotKey, value, expiresAt: now + heavyCacheTtlMs };
    return value;
  }

  async function loadCachedCollaborationPreview(snapshot, toolClient) {
    const snapshotKey = buildConversationSnapshotKey({
      snapshot,
      pageSize: COLLABORATION_PREVIEW_PAGE_SIZE,
      historyLimit: COLLABORATION_PREVIEW_HISTORY_LIMIT,
    });
    const now = Date.now();
    if (
      collaborationPreviewCache &&
      collaborationPreviewCache.snapshotKey === snapshotKey &&
      collaborationPreviewCache.expiresAt > now
    ) {
      return collaborationPreviewCache.value;
    }

    if (collaborationPreviewCache) {
      if (!collaborationPreviewInFlight || collaborationPreviewInFlight.snapshotKey !== snapshotKey) {
        const nextValue = listSessionConversations({
          snapshot,
          client: toolClient,
          filters: {},
          page: 1,
          pageSize: COLLABORATION_PREVIEW_PAGE_SIZE,
          historyLimit: COLLABORATION_PREVIEW_HISTORY_LIMIT,
        });
        collaborationPreviewInFlight = {
          snapshotKey,
          value: nextValue,
        };
        void nextValue
          .then((value) => {
            collaborationPreviewCache = {
              snapshotKey,
              value,
              expiresAt: Date.now() + heavyCacheTtlMs,
            };
          })
          .finally(() => {
            if (collaborationPreviewInFlight?.snapshotKey === snapshotKey) {
              collaborationPreviewInFlight = void 0;
            }
          });
      }
      return collaborationPreviewCache.value;
    }

    if (collaborationPreviewInFlight?.snapshotKey === snapshotKey) {
      return collaborationPreviewInFlight.value;
    }

    const nextValue = listSessionConversations({
      snapshot,
      client: toolClient,
      filters: {},
      page: 1,
      pageSize: COLLABORATION_PREVIEW_PAGE_SIZE,
      historyLimit: COLLABORATION_PREVIEW_HISTORY_LIMIT,
    });
    collaborationPreviewInFlight = {
      snapshotKey,
      value: nextValue,
    };
    try {
      const value = await nextValue;
      collaborationPreviewCache = {
        snapshotKey,
        value,
        expiresAt: now + heavyCacheTtlMs,
      };
      return value;
    } finally {
      if (collaborationPreviewInFlight?.snapshotKey === snapshotKey) {
        collaborationPreviewInFlight = void 0;
      }
    }
  }

  return {
    invalidateSessionConversationCaches,
    loadCachedCollaborationPreview,
    loadCachedSessionPreview,
    loadCachedTaskEvidenceSessions,
    mergeSessionConversationItems,
  };
}

export { createSessionConversationHelpers };
