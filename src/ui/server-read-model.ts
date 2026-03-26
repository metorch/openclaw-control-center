// @ts-nocheck

function createReadModelHelpers(deps) {
  const {
    budgetPolicyPath,
    buildBudgetSummary,
    compareSessionSummariesByLatest,
    computeProjectSummaries,
    computeTasksSummary,
    defaultSnapshot,
    delay,
    htmlLiveSessionsCacheTtlMs,
    htmlSnapshotCacheTtlMs,
    loadBudgetPolicy,
    listCollaborationRooms,
    loadProjectStore,
    loadTaskStore,
    mapSessionsListToSummaries,
    projectsPath,
    readFile,
    snapshotPath,
    stat,
    tasksPath,
  } = deps;

  let renderSnapshotCache;
  let renderSnapshotInFlight;
  let renderLiveSessionsCache;
  let renderLiveSessionsInFlight;

  function invalidateReadModelCaches() {
    renderSnapshotCache = void 0;
    renderSnapshotInFlight = void 0;
    renderLiveSessionsCache = void 0;
    renderLiveSessionsInFlight = void 0;
  }

  async function readSnapshotRaw() {
    try {
      return await readFile(snapshotPath, "utf8");
    } catch {
      return JSON.stringify(defaultSnapshot(), null, 2);
    }
  }

  function isFsNotFound(error) {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
  }

  async function readOptionalFileStamp(path) {
    try {
      const file = await stat(path);
      return `${path}:${file.mtimeMs}:${file.size}`;
    } catch (error) {
      if (isFsNotFound(error)) {
        return `${path}:missing`;
      }
      return `${path}:error`;
    }
  }

  async function readReadModelSourceStamp() {
    const collaborationRoomsStamp = await readCollaborationRoomsStamp();
    const parts = await Promise.all([
      readOptionalFileStamp(snapshotPath),
      readOptionalFileStamp(projectsPath),
      readOptionalFileStamp(tasksPath),
      readOptionalFileStamp(budgetPolicyPath),
    ]);
    parts.push(collaborationRoomsStamp);
    return parts.join("|");
  }

  async function readCollaborationRoomsStamp() {
    if (typeof listCollaborationRooms !== "function") {
      return "collaboration-rooms:unavailable";
    }
    try {
      const rooms = await listCollaborationRooms();
      if (!Array.isArray(rooms) || rooms.length === 0) {
        return "collaboration-rooms:empty";
      }
      return `collaboration-rooms:${rooms
        .map((room) =>
          [normalizeRoomId(room?.roomId), String(room?.updatedAt ?? ""), String(room?.lastSequence ?? "")]
            .filter(Boolean)
            .join(":"),
        )
        .filter(Boolean)
        .sort()
        .join("|")}`;
    } catch (error) {
      return `collaboration-rooms:error:${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async function loadValidCollaborationRoomIds() {
    if (typeof listCollaborationRooms !== "function") {
      return undefined;
    }
    try {
      const rooms = await listCollaborationRooms();
      return new Set(
        (Array.isArray(rooms) ? rooms : [])
          .map((room) => normalizeRoomId(room?.roomId))
          .filter(Boolean),
      );
    } catch {
      return undefined;
    }
  }

  function normalizeRoomId(input) {
    const value = String(input ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "");
    return /^[0-9a-f-]{8,64}$/.test(value) ? value : "";
  }

  function extractRoomScopedCollaborationRoomId(sessionKey) {
    const normalized = String(sessionKey ?? "").trim().toLowerCase();
    if (!normalized) {
      return "";
    }
    const match = normalized.match(/:thread:collab-([0-9a-f-]{8,64})(?::|$)/);
    return match?.[1] ?? "";
  }

  function filterMissingCollaborationRoomScopedItems(items, validRoomIds, selectSessionKey) {
    const list = Array.isArray(items) ? items : [];
    if (!(validRoomIds instanceof Set)) {
      return list;
    }
    return list.filter((item) => {
      const roomId = extractRoomScopedCollaborationRoomId(selectSessionKey(item));
      return !roomId || validRoomIds.has(roomId);
    });
  }

  async function readSnapshotJsonWithRetry() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return JSON.parse(await readSnapshotRaw());
      } catch (error) {
        if (attempt === 2) {
          throw error;
        }
        await delay(25 * (attempt + 1));
      }
    }
    return defaultSnapshot();
  }

  async function readReadModelSnapshot() {
    const sourceStamp = await readReadModelSourceStamp();
    const now = Date.now();
    if (renderSnapshotCache && renderSnapshotCache.sourceStamp === sourceStamp && renderSnapshotCache.expiresAt > now) {
      return renderSnapshotCache.value;
    }
    if (renderSnapshotInFlight?.sourceStamp === sourceStamp) {
      return renderSnapshotInFlight.value;
    }

    const nextValue = (async () => {
      const snapshot = await readSnapshotJsonWithRetry();
      const [projects, tasks, budgetPolicy, validRoomIds] = await Promise.all([
        loadProjectStore(),
        loadTaskStore(),
        loadBudgetPolicy(),
        loadValidCollaborationRoomIds(),
      ]);
      if (budgetPolicy.issues.length > 0) {
        console.warn("[mission-control] budget policy issues", {
          path: budgetPolicy.path,
          issues: budgetPolicy.issues,
        });
      }
      const sessions = filterMissingCollaborationRoomScopedItems(
        Array.isArray(snapshot.sessions) ? snapshot.sessions : [],
        validRoomIds,
        (item) => item?.sessionKey,
      );
      const statuses = filterMissingCollaborationRoomScopedItems(
        Array.isArray(snapshot.statuses) ? snapshot.statuses : [],
        validRoomIds,
        (item) => item?.sessionKey,
      );
      const value = {
        sessions,
        statuses,
        cronJobs: Array.isArray(snapshot.cronJobs) ? snapshot.cronJobs : [],
        approvals: Array.isArray(snapshot.approvals) ? snapshot.approvals : [],
        projects,
        projectSummaries: computeProjectSummaries(projects, tasks),
        tasks,
        tasksSummary: computeTasksSummary(tasks, projects.projects.length),
        budgetSummary: buildBudgetSummary(sessions, statuses, tasks, projects, budgetPolicy.policy),
        generatedAt:
          typeof snapshot.generatedAt === "string" && !Number.isNaN(Date.parse(snapshot.generatedAt))
            ? snapshot.generatedAt
            : new Date().toISOString(),
      };
      renderSnapshotCache = {
        sourceStamp,
        value,
        expiresAt: Date.now() + htmlSnapshotCacheTtlMs,
      };
      return value;
    })();

    renderSnapshotInFlight = { sourceStamp, value: nextValue };
    try {
      return await nextValue;
    } finally {
      if (renderSnapshotInFlight?.sourceStamp === sourceStamp) {
        renderSnapshotInFlight = void 0;
      }
    }
  }

  async function loadCachedLiveSessions(toolClient) {
    const now = Date.now();
    if (renderLiveSessionsCache && renderLiveSessionsCache.expiresAt > now) {
      return renderLiveSessionsCache.value;
    }
    if (renderLiveSessionsCache) {
      if (!renderLiveSessionsInFlight) {
        const nextValue = toolClient.sessionsList();
        renderLiveSessionsInFlight = nextValue;
        void nextValue
          .then((value) => {
            renderLiveSessionsCache = {
              value,
              expiresAt: Date.now() + htmlLiveSessionsCacheTtlMs,
            };
          })
          .finally(() => {
            renderLiveSessionsInFlight = void 0;
          });
      }
      return renderLiveSessionsCache.value;
    }
    if (renderLiveSessionsInFlight) {
      return renderLiveSessionsInFlight;
    }

    const nextValue = toolClient.sessionsList();
    renderLiveSessionsInFlight = nextValue;
    try {
      const value = await nextValue;
      renderLiveSessionsCache = {
        value,
        expiresAt: Date.now() + htmlLiveSessionsCacheTtlMs,
      };
      return value;
    } finally {
      renderLiveSessionsInFlight = void 0;
    }
  }

  async function readReadModelSnapshotWithLiveSessions(toolClient) {
    const snapshotPromise = readReadModelSnapshot();
    const livePromise = loadCachedLiveSessions(toolClient);
    try {
      const [snapshot, live, validRoomIds] = await Promise.all([
        snapshotPromise,
        livePromise,
        loadValidCollaborationRoomIds(),
      ]);
      const filteredLiveItems = filterMissingCollaborationRoomScopedItems(
        live.sessions ?? [],
        validRoomIds,
        (item) => item?.sessionKey ?? item?.key,
      );
      const sessions = filterMissingCollaborationRoomScopedItems(
        mapSessionsListToSummaries({
          ...live,
          sessions: filteredLiveItems,
        }),
        validRoomIds,
        (item) => item?.sessionKey,
      );
      if (sessions.length === 0) {
        return snapshot;
      }

      const liveStatuses = [];
      for (const item of filteredLiveItems) {
        const sessionKey = item.sessionKey ?? item.key;
        if (!sessionKey) continue;
        const updatedAt =
          typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt))
            ? item.updatedAt
            : typeof item.updatedAtMs === "number" && Number.isFinite(item.updatedAtMs)
              ? new Date(item.updatedAtMs).toISOString()
              : new Date().toISOString();
        liveStatuses.push({
          sessionKey,
          model: item.model,
          tokensIn: item.inputTokens,
          tokensOut: item.outputTokens,
          cost: void 0,
          updatedAt,
        });
      }

      const sessionsByKey = new Map(snapshot.sessions.map((item) => [item.sessionKey, item]));
      for (const liveSession of sessions) {
        const existing = sessionsByKey.get(liveSession.sessionKey);
        sessionsByKey.set(liveSession.sessionKey, {
          ...existing,
          ...liveSession,
          label: liveSession.label ?? existing?.label,
          agentId: liveSession.agentId ?? existing?.agentId,
          lastMessageAt: liveSession.lastMessageAt ?? existing?.lastMessageAt,
        });
      }

      const statusesByKey = new Map(snapshot.statuses.map((item) => [item.sessionKey, item]));
      for (const liveStatus of liveStatuses) {
        const existing = statusesByKey.get(liveStatus.sessionKey);
        statusesByKey.set(liveStatus.sessionKey, {
          ...existing,
          ...liveStatus,
          model: liveStatus.model ?? existing?.model,
          tokensIn: liveStatus.tokensIn ?? existing?.tokensIn,
          tokensOut: liveStatus.tokensOut ?? existing?.tokensOut,
          cost: existing?.cost,
          updatedAt: liveStatus.updatedAt ?? existing?.updatedAt ?? new Date().toISOString(),
        });
      }

      return {
        ...snapshot,
        sessions: [...sessionsByKey.values()].sort(compareSessionSummariesByLatest),
        statuses: [...statusesByKey.values()],
      };
    } catch (error) {
      console.warn("[mission-control] live session backfill failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return snapshotPromise;
    }
  }

  return {
    invalidateReadModelCaches,
    loadCachedLiveSessions,
    readOptionalFileStamp,
    readReadModelSourceStamp,
    readReadModelSnapshot,
    readReadModelSnapshotWithLiveSessions,
    readSnapshotJsonWithRetry,
    readSnapshotRaw,
  };
}

export { createReadModelHelpers };
