// @ts-nocheck

function createRuntimeCacheHelpers(deps) {
  const {
    buildUsageCostSnapshot,
    heavyCacheTtlMs,
    loadBestEffortOfficeSessionPresence,
    loadReplayIndex,
    replayCacheTtlMs,
    usageCacheTtlMs,
  } = deps;

  let usageCostSummaryCache;
  let usageCostFullCache;
  let officePresenceCache;
  let replayPreviewCache;
  let usageCostSummaryInFlight;
  let usageCostFullInFlight;
  let replayPreviewInFlight;

  function invalidateRuntimeCaches() {
    usageCostSummaryCache = void 0;
    usageCostFullCache = void 0;
    officePresenceCache = void 0;
    replayPreviewCache = void 0;
    usageCostSummaryInFlight = void 0;
    usageCostFullInFlight = void 0;
    replayPreviewInFlight = void 0;
  }

  function buildUsageCostCacheKey(snapshot, mode) {
    const sessionFingerprint = snapshot.sessions
      .map((session) => `${session.sessionKey}:${session.state}`)
      .sort()
      .join(";");
    const statusFingerprint = snapshot.statuses
      .map((status) => `${status.sessionKey}:${status.updatedAt}`)
      .sort()
      .join(";");
    return `${mode}|${sessionFingerprint}|${statusFingerprint}`;
  }

  async function loadCachedUsageCost(snapshot, mode) {
    const snapshotKey = buildUsageCostCacheKey(snapshot, mode);
    const now = Date.now();
    const targetCache = mode === "full" ? usageCostFullCache : usageCostSummaryCache;
    const targetInFlight = mode === "full" ? usageCostFullInFlight : usageCostSummaryInFlight;

    if (targetCache && targetCache.snapshotKey === snapshotKey && targetCache.expiresAt > now) {
      return targetCache.value;
    }

    if (targetCache && targetCache.snapshotKey === snapshotKey) {
      if (!targetInFlight || targetInFlight.snapshotKey !== snapshotKey) {
        const nextValue = buildUsageCostSnapshot(snapshot, mode);
        if (mode === "full") {
          usageCostFullInFlight = { snapshotKey, value: nextValue };
        } else {
          usageCostSummaryInFlight = { snapshotKey, value: nextValue };
        }
        void nextValue
          .then((value) => {
            const nextCache = { snapshotKey, value, expiresAt: Date.now() + usageCacheTtlMs };
            if (mode === "full") {
              usageCostFullCache = nextCache;
            } else {
              usageCostSummaryCache = nextCache;
            }
          })
          .finally(() => {
            if (mode === "full") {
              if (usageCostFullInFlight?.snapshotKey === snapshotKey) {
                usageCostFullInFlight = void 0;
              }
            } else if (usageCostSummaryInFlight?.snapshotKey === snapshotKey) {
              usageCostSummaryInFlight = void 0;
            }
          });
      }
      return targetCache.value;
    }

    if (targetInFlight?.snapshotKey === snapshotKey) {
      return targetInFlight.value;
    }

    const nextValue = buildUsageCostSnapshot(snapshot, mode);
    if (mode === "full") {
      usageCostFullInFlight = { snapshotKey, value: nextValue };
    } else {
      usageCostSummaryInFlight = { snapshotKey, value: nextValue };
    }

    try {
      const value = await nextValue;
      const nextCache = { snapshotKey, value, expiresAt: now + usageCacheTtlMs };
      if (mode === "full") {
        usageCostFullCache = nextCache;
      } else {
        usageCostSummaryCache = nextCache;
      }
      return value;
    } finally {
      if (mode === "full") {
        if (usageCostFullInFlight?.snapshotKey === snapshotKey) {
          usageCostFullInFlight = void 0;
        }
      } else if (usageCostSummaryInFlight?.snapshotKey === snapshotKey) {
        usageCostSummaryInFlight = void 0;
      }
    }
  }

  async function loadCachedOfficeSessionPresence() {
    const now = Date.now();
    if (officePresenceCache && officePresenceCache.expiresAt > now) {
      return officePresenceCache.value;
    }
    if (officePresenceCache) {
      return officePresenceCache.value;
    }
    const value = await loadBestEffortOfficeSessionPresence();
    officePresenceCache = { value, expiresAt: now + heavyCacheTtlMs };
    return value;
  }

  async function loadCachedReplayPreview() {
    const now = Date.now();
    if (replayPreviewCache && replayPreviewCache.expiresAt > now) {
      return replayPreviewCache.value;
    }
    if (replayPreviewCache) {
      if (!replayPreviewInFlight) {
        const nextValue = loadReplayIndex({ timelineLimit: 20, digestLimit: 10, exportLimit: 10 });
        replayPreviewInFlight = nextValue;
        void nextValue
          .then((value) => {
            replayPreviewCache = { value, expiresAt: Date.now() + replayCacheTtlMs };
          })
          .finally(() => {
            replayPreviewInFlight = void 0;
          });
      }
      return replayPreviewCache.value;
    }
    if (replayPreviewInFlight) {
      return replayPreviewInFlight;
    }
    const nextValue = loadReplayIndex({ timelineLimit: 20, digestLimit: 10, exportLimit: 10 });
    replayPreviewInFlight = nextValue;
    try {
      const value = await nextValue;
      replayPreviewCache = { value, expiresAt: now + replayCacheTtlMs };
      return value;
    } finally {
      replayPreviewInFlight = void 0;
    }
  }

  return {
    buildUsageCostCacheKey,
    invalidateRuntimeCaches,
    loadCachedOfficeSessionPresence,
    loadCachedReplayPreview,
    loadCachedUsageCost,
  };
}

export { createRuntimeCacheHelpers };
