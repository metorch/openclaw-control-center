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
    const parts = await Promise.all([
      readOptionalFileStamp(snapshotPath),
      readOptionalFileStamp(projectsPath),
      readOptionalFileStamp(tasksPath),
      readOptionalFileStamp(budgetPolicyPath),
    ]);
    return parts.join("|");
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
      const [projects, tasks, budgetPolicy] = await Promise.all([
        loadProjectStore(),
        loadTaskStore(),
        loadBudgetPolicy(),
      ]);
      if (budgetPolicy.issues.length > 0) {
        console.warn("[mission-control] budget policy issues", {
          path: budgetPolicy.path,
          issues: budgetPolicy.issues,
        });
      }
      const sessions = Array.isArray(snapshot.sessions) ? snapshot.sessions : [];
      const statuses = Array.isArray(snapshot.statuses) ? snapshot.statuses : [];
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
      const [snapshot, live] = await Promise.all([snapshotPromise, livePromise]);
      const sessions = mapSessionsListToSummaries(live);
      if (sessions.length === 0) {
        return snapshot;
      }

      const liveStatuses = [];
      for (const item of live.sessions ?? []) {
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
