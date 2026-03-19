// @ts-nocheck

function createDashboardRuntimeHelpers(deps) {
  const {
    buildActionQueueLinks,
    buildNotificationCenter,
    commanderExceptionsFeed,
    invalidateDashboardRefreshCaches,
    loadAcksStore,
    loadAgentTeamEmbedSnapshot,
    loadCachedOfficeSessionPresence,
    loadCachedReplayPreview,
    loadCachedUsageCost,
    loadStructuredDocHubSnapshot,
    readReadModelSnapshotWithLiveSessions,
    refreshAgentTeamServeSessionSnapshot,
    workspaceRoot,
  } = deps;

  async function refreshDashboardSources(toolClient) {
    const refresh = await refreshAgentTeamServeSessionSnapshot({ workspaceRoot });
    invalidateDashboardRefreshCaches();
    const [agentTeamEmbed, snapshot] = await Promise.all([
      loadAgentTeamEmbedSnapshot(),
      readReadModelSnapshotWithLiveSessions(toolClient),
    ]);
    const docHubSnapshot = await loadStructuredDocHubSnapshot(snapshot, toolClient);
    return {
      refreshedAt: refresh.refreshedAt,
      fixtureDir: refresh.fixtureDir,
      statusPath: refresh.statusPath,
      dashboardPath: refresh.dashboardPath,
      command: refresh.command,
      args: refresh.args,
      statusFileUpdatedAt: refresh.statusFileUpdatedAt,
      dashboardFileUpdatedAt: refresh.dashboardFileUpdatedAt,
      embeddedSourceKind: agentTeamEmbed.sourceKind,
      embeddedFreshnessState: agentTeamEmbed.runtime.freshnessState,
      embeddedUpdatedAt: agentTeamEmbed.runtime.updatedAt,
      snapshotGeneratedAt: snapshot.generatedAt,
      docsHubGeneratedAt: docHubSnapshot.generatedAt,
      docsHubEntryCount: docHubSnapshot.items.length,
      scopeLabels: [
        "embedded agent-team snapshot",
        "chat-derived docs hub",
        "usage and status caches",
        "live session snapshot",
      ],
    };
  }

  async function primeUiRenderCaches(toolClient) {
    try {
      const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);
      await Promise.all([
        loadCachedUsageCost(snapshot, "summary"),
        loadCachedOfficeSessionPresence(),
        loadCachedReplayPreview(),
      ]);
    } catch (error) {
      console.warn("[mission-control] ui cache warmup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function readNotificationCenter(snapshot) {
    const exceptionsFeed = commanderExceptionsFeed(snapshot);
    const acks = await loadAcksStore();
    const linksByItemId = buildActionQueueLinks(exceptionsFeed, snapshot);
    return buildNotificationCenter(exceptionsFeed, acks, linksByItemId);
  }

  return {
    primeUiRenderCaches,
    readNotificationCenter,
    refreshDashboardSources,
  };
}

export { createDashboardRuntimeHelpers };
