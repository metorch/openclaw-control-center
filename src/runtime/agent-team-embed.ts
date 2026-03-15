import { readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { loadCurrentAgentCatalog, resolveOpenClawHomePath } from "./current-agent-catalog";

const EMBED_CACHE_TTL_MS = 3_000;
const PREFERRED_SCENARIOS = ["active-supervision", "manual-mode", "pending-controls", "stale-lock", "idle"] as const;

type ProjectContextEntryFile = {
  title?: string | null;
  file?: string | null;
  updated_at?: string | null;
  section?: string | null;
  id?: string | null;
  name?: string | null;
  role?: string | null;
};

type ProjectContextFile = {
  generated_at?: string | null;
  workspace?: string | null;
  summary?: {
    member_count?: number | null;
    key_doc_count?: number | null;
    pilot_asset_count?: number | null;
    memory_count?: number | null;
  } | null;
  team_members?: ProjectContextEntryFile[] | null;
  key_docs?: ProjectContextEntryFile[] | null;
  pilot_assets?: ProjectContextEntryFile[] | null;
  recent_memory?: ProjectContextEntryFile[] | null;
};

type FixtureManifestFile = {
  loader?: {
    default_scenario?: string | null;
    scenarios?: Record<string, unknown> | null;
  } | null;
};

type RuntimeStatusFile = {
  runner?: {
    phase?: string | null;
    reason_summary?: string | null;
    decision_mode?: string | null;
    pending_job_count?: number | null;
    active_supervision_count?: number | null;
    freshness?: {
      state?: string | null;
      updated_at?: string | null;
    } | null;
    primary_action?: {
      kind?: string | null;
      detail_hint?: {
        page_key?: string | null;
      } | null;
    } | null;
  } | null;
};

type RuntimeDashboardFile = {
  dashboard?: {
    attention_items?: unknown[] | null;
    next_actions?: unknown[] | null;
    jobs?: {
      count?: number | null;
    } | null;
    supervision?: {
      count?: number | null;
    } | null;
    primary_action?: {
      kind?: string | null;
      reason?: string | null;
    } | null;
  } | null;
};

type RunsDashboardFile = {
  total_count?: number | null;
  runs?: Array<{
    run_id?: string | null;
    job_id?: string | null;
    target_pipeline?: string | null;
    status?: string | null;
    final_action?: string | null;
    warning_count?: number | null;
    failure_count?: number | null;
    artifact_count?: number | null;
    event_count?: number | null;
    updated_at?: string | null;
  }> | null;
};

type RunArtifactsFile = {
  entries?: Array<{
    file?: string | null;
    stage?: string | null;
    schema?: string | null;
    mode?: string | null;
    source_role?: string | null;
    updated_at?: string | null;
    size_bytes?: number | null;
    note_count?: number | null;
  }> | null;
};

type RunDetailFile = {
  run?: {
    run_id?: string | null;
    job_id?: string | null;
    target_pipeline?: string | null;
    status?: string | null;
    final_action?: string | null;
    warning_count?: number | null;
    failure_count?: number | null;
    artifact_count?: number | null;
    event_count?: number | null;
    updated_at?: string | null;
  } | null;
  manifest?: {
    deliverables?: Record<string, unknown> | null;
  } | null;
  summary?: {
    status?: string | null;
    final_action?: string | null;
    warning_count?: number | null;
    failure_count?: number | null;
    artifact_count?: number | null;
    event_count?: number | null;
    target_pipeline?: string | null;
  } | null;
  job?: {
    job_id?: string | null;
    target_pipeline?: string | null;
    goal?: string | null;
  } | null;
  result_summary?: {
    mode?: string | null;
    stop_reason?: string | null;
    tick_count?: number | null;
    remaining_job_ids?: string[] | null;
  } | null;
  control?: {
    pending_count?: number | null;
    processed_count?: number | null;
  } | null;
};

type RunArtifactPreviewFile = {
  run_id?: string | null;
  artifact?: {
    file?: string | null;
    exists?: boolean | null;
    updated_at?: string | null;
    size_bytes?: number | null;
    stage?: string | null;
    schema?: string | null;
    mode?: string | null;
    source_role?: string | null;
    note_count?: number | null;
    has_input_bundle?: boolean | null;
    has_embedded_content?: boolean | null;
  } | null;
  preview?: {
    source?: string | null;
    content?: string | null;
    truncated?: boolean | null;
    character_count?: number | null;
    line_count?: number | null;
  } | null;
  embedded?: {
    note_count?: number | null;
    has_input_bundle?: boolean | null;
  } | null;
};

type RunTimelineFile = {
  items?: Array<{
    kind?: string | null;
    source?: string | null;
    stage?: string | null;
    detail?: string | null;
    timestamp?: string | null;
  }> | null;
};

export type AgentTeamEmbedEntry = {
  title: string;
  file: string;
  updatedAt?: string;
  section?: string;
  id?: string;
  name?: string;
  role?: string;
};

export type AgentTeamEmbedRun = {
  runId: string;
  jobId?: string;
  pipeline?: string;
  status?: string;
  finalAction?: string;
  warningCount: number;
  failureCount: number;
  artifactCount: number;
  eventCount: number;
  updatedAt?: string;
};

export type AgentTeamEmbedArtifact = {
  file: string;
  stage?: string;
  schema?: string;
  mode?: string;
  sourceRole?: string;
  updatedAt?: string;
  sizeBytes?: number;
  noteCount: number;
};

export type AgentTeamEmbedFact = {
  key: string;
  value: string;
};

export type AgentTeamEmbedDeliverable = {
  key: string;
  label: string;
  schema?: string;
  file?: string;
};

export type AgentTeamEmbedFocusedRun = AgentTeamEmbedRun & {
  goal?: string;
  pendingCount: number;
  processedCount: number;
  deliverables: AgentTeamEmbedDeliverable[];
  facts: AgentTeamEmbedFact[];
};

export type AgentTeamEmbedPreviewArtifact = AgentTeamEmbedArtifact & {
  runId?: string;
  exists: boolean;
  hasInputBundle: boolean;
  hasEmbeddedContent: boolean;
  previewSource?: string;
  previewContent?: string;
  previewLineCount?: number;
  previewCharacterCount?: number;
  previewTruncated: boolean;
};

export type AgentTeamEmbedTimelineItem = {
  kind?: string;
  source?: string;
  stage?: string;
  detail?: string;
  timestamp?: string;
};

export type AgentTeamEmbedSourceKind = "runtime" | "fixture";

export type AgentTeamEmbedSnapshot = {
  available: boolean;
  workspaceLabel: string;
  generatedAt?: string;
  scenarioKey?: string;
  sourceKind: AgentTeamEmbedSourceKind;
  summary: {
    memberCount: number;
    keyDocCount: number;
    pilotAssetCount: number;
    memoryCount: number;
    runCount: number;
    pendingJobCount: number;
    activeSupervisionCount: number;
  };
  runtime: {
    phase?: string;
    reasonSummary?: string;
    decisionMode?: string;
    freshnessState?: string;
    updatedAt?: string;
    primaryActionKind?: string;
    primaryActionPage?: string;
  };
  dashboard: {
    attentionItemsCount: number;
    nextActionsCount: number;
    jobsCount: number;
    supervisionCount: number;
    primaryActionKind?: string;
    primaryActionReason?: string;
  };
  teamMembers: AgentTeamEmbedEntry[];
  keyDocs: AgentTeamEmbedEntry[];
  pilotAssets: AgentTeamEmbedEntry[];
  recentMemory: AgentTeamEmbedEntry[];
  runs: AgentTeamEmbedRun[];
  focusedRun?: AgentTeamEmbedFocusedRun;
  artifacts: AgentTeamEmbedArtifact[];
  previewArtifact?: AgentTeamEmbedPreviewArtifact;
  timeline: AgentTeamEmbedTimelineItem[];
  sources: {
    workspaceRoot: string;
    publicDir: string;
    projectContextPath: string;
    fixtureManifestPath: string;
    scenarioDir?: string;
    statusPath?: string;
    dashboardPath?: string;
    runsDashboardPath?: string;
    runDetailPath?: string;
    runArtifactsPath?: string;
    runArtifactPath?: string;
    runTimelinePath?: string;
  };
};

type FixturePayloadBundle = {
  sourceKind: AgentTeamEmbedSourceKind;
  sourceRoot: string;
  manifestPath: string;
  scenarioKey?: string;
  statusPath?: string;
  dashboardPath?: string;
  runsDashboardPath?: string;
  runDetailPath?: string;
  runArtifactsPath?: string;
  runArtifactPath?: string;
  runTimelinePath?: string;
  runtimeStatus?: RuntimeStatusFile;
  runtimeDashboard?: RuntimeDashboardFile;
  runsDashboard?: RunsDashboardFile;
  runDetail?: RunDetailFile;
  runArtifacts?: RunArtifactsFile;
  runArtifactPreview?: RunArtifactPreviewFile;
  runTimeline?: RunTimelineFile;
};

let embedCache: { value: AgentTeamEmbedSnapshot; expiresAt: number } | undefined;
let embedInFlight: Promise<AgentTeamEmbedSnapshot> | undefined;

export async function loadAgentTeamEmbedSnapshot(): Promise<AgentTeamEmbedSnapshot> {
  const now = Date.now();
  if (embedCache && embedCache.expiresAt > now) {
    return embedCache.value;
  }
  if (embedInFlight) {
    return embedInFlight;
  }
  embedInFlight = loadAgentTeamEmbedSnapshotUncached()
    .then((value) => {
      embedCache = {
        value,
        expiresAt: Date.now() + EMBED_CACHE_TTL_MS,
      };
      return value;
    })
    .finally(() => {
      embedInFlight = undefined;
    });
  return embedInFlight;
}

export function invalidateAgentTeamEmbedSnapshotCache(): void {
  embedCache = undefined;
  embedInFlight = undefined;
}

async function loadAgentTeamEmbedSnapshotUncached(): Promise<AgentTeamEmbedSnapshot> {
  const workspaceRoot = resolve(process.cwd(), "..", "..");
  const runtimeFixturesDir = join(workspaceRoot, "team", "runtime", "runs", "serve-session", "control-ui-fixtures");
  const examplePublicDir = join(workspaceRoot, "team_runtime", "examples", "control_ui_vite_host", "public");
  const fallbackProjectContextPath = join(examplePublicDir, "project-context.json");

  const [fixtureBundle, projectContextWithSource] = await Promise.all([
    loadFixturePayloadBundle(runtimeFixturesDir, "runtime").then(
      async (runtimeBundle) =>
        runtimeBundle ?? (await loadFixturePayloadBundle(join(examplePublicDir, "control-ui-fixtures"), "fixture")),
    ),
    loadProjectContextSnapshot(workspaceRoot, fallbackProjectContextPath),
  ]);

  const projectContext = projectContextWithSource.projectContext;
  const projectContextPath = projectContextWithSource.sourcePath;
  const selectedScenario = fixtureBundle?.scenarioKey;
  const fixtureSourceRoot = fixtureBundle?.sourceRoot ?? join(examplePublicDir, "control-ui-fixtures");
  const fixtureManifestPath = fixtureBundle?.manifestPath ?? join(examplePublicDir, "control-ui-fixtures", "manifest.json");
  const runtimeStatus = fixtureBundle?.runtimeStatus;
  const runtimeDashboard = fixtureBundle?.runtimeDashboard;
  const runsDashboard = fixtureBundle?.runsDashboard;
  const runDetail = fixtureBundle?.runDetail;
  const runArtifacts = fixtureBundle?.runArtifacts;
  const runArtifactPreview = fixtureBundle?.runArtifactPreview;
  const runTimeline = fixtureBundle?.runTimeline;

  const teamMembers = normalizeEntries(projectContext?.team_members);
  const keyDocs = normalizeEntries(projectContext?.key_docs);
  const pilotAssets = normalizeEntries(projectContext?.pilot_assets);
  const recentMemory = normalizeEntries(projectContext?.recent_memory);
  const runs = normalizeRuns(runsDashboard?.runs);
  const focusedRun = normalizeFocusedRun(runDetail, runs[0]);
  const artifacts = normalizeArtifacts(runArtifacts?.entries);
  const previewArtifact = normalizePreviewArtifact(runArtifactPreview, artifacts[0], focusedRun?.runId);
  const timeline = normalizeTimeline(runTimeline?.items);

  const memberCount = coerceCount(projectContext?.summary?.member_count, teamMembers.length);
  const keyDocCount = coerceCount(projectContext?.summary?.key_doc_count, keyDocs.length);
  const pilotAssetCount = coerceCount(projectContext?.summary?.pilot_asset_count, pilotAssets.length);
  const memoryCount = coerceCount(projectContext?.summary?.memory_count, recentMemory.length);
  const runCount = coerceCount(runsDashboard?.total_count, runs.length);
  const pendingJobCount = coerceCount(runtimeStatus?.runner?.pending_job_count, 0);
  const activeSupervisionCount = coerceCount(runtimeStatus?.runner?.active_supervision_count, 0);
  const attentionItemsCount = coerceCount(runtimeDashboard?.dashboard?.attention_items?.length, 0);
  const nextActionsCount = coerceCount(runtimeDashboard?.dashboard?.next_actions?.length, 0);
  const jobsCount = coerceCount(runtimeDashboard?.dashboard?.jobs?.count, 0);
  const supervisionCount = coerceCount(runtimeDashboard?.dashboard?.supervision?.count, 0);

  return {
    available: Boolean(
      projectContext ||
        runtimeStatus ||
        runtimeDashboard ||
        runsDashboard ||
        focusedRun ||
        previewArtifact ||
        teamMembers.length > 0 ||
        keyDocs.length > 0 ||
        recentMemory.length > 0 ||
        runs.length > 0,
    ),
    workspaceLabel: cleanText(projectContext?.workspace) ?? "openclaw-agent-team",
    generatedAt: cleanText(projectContext?.generated_at),
    scenarioKey: selectedScenario,
    sourceKind: fixtureBundle?.sourceKind ?? "fixture",
    summary: {
      memberCount,
      keyDocCount,
      pilotAssetCount,
      memoryCount,
      runCount,
      pendingJobCount,
      activeSupervisionCount,
    },
    runtime: {
      phase: cleanText(runtimeStatus?.runner?.phase),
      reasonSummary: cleanText(runtimeStatus?.runner?.reason_summary),
      decisionMode: cleanText(runtimeStatus?.runner?.decision_mode),
      freshnessState: cleanText(runtimeStatus?.runner?.freshness?.state),
      updatedAt: cleanText(runtimeStatus?.runner?.freshness?.updated_at),
      primaryActionKind: cleanText(runtimeStatus?.runner?.primary_action?.kind),
      primaryActionPage: cleanText(runtimeStatus?.runner?.primary_action?.detail_hint?.page_key),
    },
    dashboard: {
      attentionItemsCount,
      nextActionsCount,
      jobsCount,
      supervisionCount,
      primaryActionKind: cleanText(runtimeDashboard?.dashboard?.primary_action?.kind),
      primaryActionReason: cleanText(runtimeDashboard?.dashboard?.primary_action?.reason),
    },
    teamMembers,
    keyDocs,
    pilotAssets,
    recentMemory,
    runs,
    focusedRun,
    artifacts,
    previewArtifact,
    timeline,
    sources: {
      workspaceRoot,
      publicDir: fixtureSourceRoot,
      projectContextPath,
      fixtureManifestPath,
      scenarioDir: selectedScenario ? join(fixtureSourceRoot, "scenarios", selectedScenario) : undefined,
      statusPath: fixtureBundle?.statusPath,
      dashboardPath: fixtureBundle?.dashboardPath,
      runsDashboardPath: fixtureBundle?.runsDashboardPath,
      runDetailPath: fixtureBundle?.runDetailPath,
      runArtifactsPath: fixtureBundle?.runArtifactsPath,
      runArtifactPath: fixtureBundle?.runArtifactPath,
      runTimelinePath: fixtureBundle?.runTimelinePath,
    },
  };
}

async function loadFixturePayloadBundle(
  fixturesDir: string,
  sourceKind: AgentTeamEmbedSourceKind,
): Promise<FixturePayloadBundle | undefined> {
  const manifestPath = join(fixturesDir, "manifest.json");
  const manifest = await readJsonFile<FixtureManifestFile>(manifestPath);

  const rootBundle = await loadFixturePayloadBundleFromPaths({
    sourceKind,
    sourceRoot: fixturesDir,
    manifestPath,
    statusPath: join(fixturesDir, "status.json"),
    dashboardPath: join(fixturesDir, "dashboard.json"),
    runsDashboardPath: join(fixturesDir, "pages", "runs-dashboard.json"),
    runDetailPath: join(fixturesDir, "pages", "run-detail.json"),
    runArtifactsPath: join(fixturesDir, "pages", "run-artifacts.json"),
    runArtifactPath: join(fixturesDir, "pages", "run-artifact.json"),
    runTimelinePath: join(fixturesDir, "pages", "run-timeline.json"),
  });
  if (rootBundle) {
    return rootBundle;
  }

  const scenarioCandidates = uniqueStrings([
    ...PREFERRED_SCENARIOS,
    manifest?.loader?.default_scenario,
    ...Object.keys(manifest?.loader?.scenarios ?? {}),
  ]);

  for (const scenarioKey of scenarioCandidates) {
    const scenarioDir = join(fixturesDir, "scenarios", scenarioKey);
    const bundle = await loadFixturePayloadBundleFromPaths({
      sourceKind,
      sourceRoot: fixturesDir,
      manifestPath,
      scenarioKey,
      statusPath: join(scenarioDir, "status.json"),
      dashboardPath: join(scenarioDir, "dashboard.json"),
      runsDashboardPath: join(scenarioDir, "pages", "runs-dashboard.json"),
      runDetailPath: join(scenarioDir, "pages", "run-detail.json"),
      runArtifactsPath: join(scenarioDir, "pages", "run-artifacts.json"),
      runArtifactPath: join(scenarioDir, "pages", "run-artifact.json"),
      runTimelinePath: join(scenarioDir, "pages", "run-timeline.json"),
    });
    if (bundle) {
      return bundle;
    }
  }

  return undefined;
}

async function loadFixturePayloadBundleFromPaths(
  input: Omit<
    FixturePayloadBundle,
    | "runtimeStatus"
    | "runtimeDashboard"
    | "runsDashboard"
    | "runDetail"
    | "runArtifacts"
    | "runArtifactPreview"
    | "runTimeline"
  >,
): Promise<FixturePayloadBundle | undefined> {
  const [runtimeStatus, runtimeDashboard, runsDashboard, runDetail, runArtifacts, runArtifactPreview, runTimeline] =
    await Promise.all([
      readJsonFile<RuntimeStatusFile>(input.statusPath ?? ""),
      readJsonFile<RuntimeDashboardFile>(input.dashboardPath ?? ""),
      readJsonFile<RunsDashboardFile>(input.runsDashboardPath ?? ""),
      readJsonFile<RunDetailFile>(input.runDetailPath ?? ""),
      readJsonFile<RunArtifactsFile>(input.runArtifactsPath ?? ""),
      readJsonFile<RunArtifactPreviewFile>(input.runArtifactPath ?? ""),
      readJsonFile<RunTimelineFile>(input.runTimelinePath ?? ""),
    ]);

  if (!runtimeStatus && !runtimeDashboard && !runsDashboard && !runDetail && !runArtifacts && !runArtifactPreview) {
    return undefined;
  }

  return {
    ...input,
    runtimeStatus,
    runtimeDashboard,
    runsDashboard,
    runDetail,
    runArtifacts,
    runArtifactPreview,
    runTimeline,
  };
}

async function loadProjectContextSnapshot(
  workspaceRoot: string,
  fallbackProjectContextPath: string,
): Promise<{ projectContext: ProjectContextFile | undefined; sourcePath: string }> {
  const [baseContext, catalog] = await Promise.all([
    readJsonFile<ProjectContextFile>(fallbackProjectContextPath),
    loadCurrentAgentCatalog(),
  ]);
  const teamMembers = await buildCatalogProjectEntries(workspaceRoot, catalog.entries);
  if (teamMembers.length === 0) {
    return {
      projectContext: baseContext,
      sourcePath: fallbackProjectContextPath,
    };
  }

  return {
    projectContext: {
      generated_at: baseContext?.generated_at ?? new Date().toISOString(),
      workspace: cleanText(baseContext?.workspace) ?? "openclaw-agent-team",
      summary: {
        member_count: teamMembers.length,
        key_doc_count: baseContext?.summary?.key_doc_count,
        pilot_asset_count: baseContext?.summary?.pilot_asset_count,
        memory_count: baseContext?.summary?.memory_count,
      },
      team_members: teamMembers,
      key_docs: baseContext?.key_docs,
      pilot_assets: baseContext?.pilot_assets,
      recent_memory: baseContext?.recent_memory,
    },
    sourcePath: `${catalog.sourcePath} + ${fallbackProjectContextPath}`,
  };
}

async function buildCatalogProjectEntries(
  workspaceRoot: string,
  entries: Awaited<ReturnType<typeof loadCurrentAgentCatalog>>["entries"],
): Promise<ProjectContextEntryFile[]> {
  if (entries.length === 0) {
    return [];
  }
  const openclawHome = resolveOpenClawHomePath();

  return Promise.all(
    entries.map(async (entry) => {
      const evidencePath = await resolveAgentEvidencePath(openclawHome, workspaceRoot, entry.agentId);
      const updatedAt = evidencePath ? await readFileUpdatedAt(evidencePath) : undefined;
      return {
        title: entry.displayName,
        file: toDisplayPath(evidencePath ?? join(openclawHome, "openclaw.json"), workspaceRoot, openclawHome),
        updated_at: updatedAt,
        id: entry.agentId,
        name: entry.displayName,
        role: agentTeamKeyLabel(entry.agentId),
      };
    }),
  );
}

async function resolveAgentEvidencePath(
  openclawHome: string,
  workspaceRoot: string,
  agentId: string,
): Promise<string | undefined> {
  const candidates = [
    join(workspaceRoot, "agents", agentId, "IDENTITY.md"),
    join(workspaceRoot, "agents", agentId, "SOUL.md"),
    join(openclawHome, "agents", agentId, "IDENTITY.md"),
    join(openclawHome, "agents", agentId, "SOUL.md"),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readFileUpdatedAt(path: string): Promise<string | undefined> {
  try {
    const value = await stat(path);
    return value.mtime.toISOString();
  } catch {
    return undefined;
  }
}

function toDisplayPath(path: string, workspaceRoot: string, openclawHome: string): string {
  const relativeToWorkspace = relative(workspaceRoot, path);
  if (relativeToWorkspace && !relativeToWorkspace.startsWith("..")) {
    return relativeToWorkspace.replace(/\\/g, "/");
  }
  const relativeToHome = relative(openclawHome, path);
  if (relativeToHome && !relativeToHome.startsWith("..")) {
    return relativeToHome.replace(/\\/g, "/");
  }
  return path.replace(/\\/g, "/");
}

function normalizeEntries(entries: ProjectContextEntryFile[] | null | undefined): AgentTeamEmbedEntry[] {
  return (entries ?? []).flatMap((entry) => {
      const title = cleanText(entry.name) ?? cleanText(entry.title) ?? cleanText(entry.id) ?? cleanText(entry.file);
      const file = cleanText(entry.file);
      if (!title || !file) {
        return [];
      }
      return [{
        title,
        file,
        updatedAt: cleanText(entry.updated_at),
        section: cleanText(entry.section),
        id: cleanText(entry.id),
        name: cleanText(entry.name),
        role: cleanText(entry.role),
      }];
    });
}

function normalizeRuns(entries: RunsDashboardFile["runs"]): AgentTeamEmbedRun[] {
  return (entries ?? [])
    .flatMap((entry) => {
      const runId = cleanText(entry.run_id);
      if (!runId) {
        return [];
      }
      return [{
        runId,
        jobId: cleanText(entry.job_id),
        pipeline: cleanText(entry.target_pipeline),
        status: cleanText(entry.status),
        finalAction: cleanText(entry.final_action),
        warningCount: coerceCount(entry.warning_count, 0),
        failureCount: coerceCount(entry.failure_count, 0),
        artifactCount: coerceCount(entry.artifact_count, 0),
        eventCount: coerceCount(entry.event_count, 0),
        updatedAt: cleanText(entry.updated_at),
      }];
    })
    .sort((left, right) => toSortableMs(right.updatedAt) - toSortableMs(left.updatedAt));
}

function normalizeArtifacts(entries: RunArtifactsFile["entries"]): AgentTeamEmbedArtifact[] {
  return (entries ?? [])
    .flatMap((entry) => {
      const file = cleanText(entry.file);
      if (!file) {
        return [];
      }
      return [{
        file,
        stage: cleanText(entry.stage),
        schema: cleanText(entry.schema),
        mode: cleanText(entry.mode),
        sourceRole: cleanText(entry.source_role),
        updatedAt: cleanText(entry.updated_at),
        sizeBytes: coerceOptionalNumber(entry.size_bytes),
        noteCount: coerceCount(entry.note_count, 0),
      }];
    })
    .sort((left, right) => toSortableMs(right.updatedAt) - toSortableMs(left.updatedAt));
}

function normalizeFocusedRun(
  detail: RunDetailFile | undefined,
  fallbackRun: AgentTeamEmbedRun | undefined,
): AgentTeamEmbedFocusedRun | undefined {
  const runId = cleanText(detail?.run?.run_id) ?? fallbackRun?.runId;
  if (!runId) {
    return undefined;
  }
  return {
    runId,
    jobId: cleanText(detail?.run?.job_id) ?? cleanText(detail?.job?.job_id) ?? fallbackRun?.jobId,
    pipeline:
      cleanText(detail?.run?.target_pipeline) ??
      cleanText(detail?.summary?.target_pipeline) ??
      cleanText(detail?.job?.target_pipeline) ??
      fallbackRun?.pipeline,
    status: cleanText(detail?.run?.status) ?? cleanText(detail?.summary?.status) ?? fallbackRun?.status,
    finalAction:
      cleanText(detail?.run?.final_action) ??
      cleanText(detail?.summary?.final_action) ??
      fallbackRun?.finalAction,
    warningCount:
      coerceOptionalNumber(detail?.run?.warning_count) ??
      coerceOptionalNumber(detail?.summary?.warning_count) ??
      fallbackRun?.warningCount ??
      0,
    failureCount:
      coerceOptionalNumber(detail?.run?.failure_count) ??
      coerceOptionalNumber(detail?.summary?.failure_count) ??
      fallbackRun?.failureCount ??
      0,
    artifactCount:
      coerceOptionalNumber(detail?.run?.artifact_count) ??
      coerceOptionalNumber(detail?.summary?.artifact_count) ??
      fallbackRun?.artifactCount ??
      0,
    eventCount:
      coerceOptionalNumber(detail?.run?.event_count) ??
      coerceOptionalNumber(detail?.summary?.event_count) ??
      fallbackRun?.eventCount ??
      0,
    updatedAt: cleanText(detail?.run?.updated_at) ?? fallbackRun?.updatedAt,
    goal: cleanText(detail?.job?.goal),
    pendingCount: coerceCount(detail?.control?.pending_count, 0),
    processedCount: coerceCount(detail?.control?.processed_count, 0),
    deliverables: normalizeDeliverables(detail?.manifest?.deliverables),
    facts: normalizeFacts([
      ["goal", detail?.job?.goal],
      ["pipeline", detail?.job?.target_pipeline ?? detail?.run?.target_pipeline ?? detail?.summary?.target_pipeline],
      ["stop_reason", detail?.result_summary?.stop_reason],
      ["mode", detail?.result_summary?.mode],
      ["tick_count", detail?.result_summary?.tick_count],
      ["remaining_job_ids", detail?.result_summary?.remaining_job_ids],
      ["processed_count", detail?.control?.processed_count],
    ]),
  };
}

function normalizePreviewArtifact(
  detail: RunArtifactPreviewFile | undefined,
  fallbackArtifact: AgentTeamEmbedArtifact | undefined,
  fallbackRunId: string | undefined,
): AgentTeamEmbedPreviewArtifact | undefined {
  const file = cleanText(detail?.artifact?.file) ?? cleanText(fallbackArtifact?.file);
  if (!file) {
    return undefined;
  }
  return {
    runId: cleanText(detail?.run_id) ?? fallbackRunId,
    file,
    stage: cleanText(detail?.artifact?.stage) ?? fallbackArtifact?.stage,
    schema: cleanText(detail?.artifact?.schema) ?? fallbackArtifact?.schema,
    mode: cleanText(detail?.artifact?.mode) ?? fallbackArtifact?.mode,
    sourceRole: cleanText(detail?.artifact?.source_role) ?? fallbackArtifact?.sourceRole,
    updatedAt: cleanText(detail?.artifact?.updated_at) ?? fallbackArtifact?.updatedAt,
    sizeBytes: coerceOptionalNumber(detail?.artifact?.size_bytes) ?? fallbackArtifact?.sizeBytes,
    noteCount:
      coerceOptionalNumber(detail?.artifact?.note_count) ??
      coerceOptionalNumber(detail?.embedded?.note_count) ??
      fallbackArtifact?.noteCount ??
      0,
    exists: coerceBoolean(detail?.artifact?.exists, true),
    hasInputBundle:
      coerceBoolean(detail?.artifact?.has_input_bundle, false) ||
      coerceBoolean(detail?.embedded?.has_input_bundle, false),
    hasEmbeddedContent: coerceBoolean(detail?.artifact?.has_embedded_content, false),
    previewSource: cleanText(detail?.preview?.source),
    previewContent: cleanText(detail?.preview?.content),
    previewLineCount: coerceOptionalNumber(detail?.preview?.line_count),
    previewCharacterCount: coerceOptionalNumber(detail?.preview?.character_count),
    previewTruncated: coerceBoolean(detail?.preview?.truncated, false),
  };
}

function normalizeDeliverables(value: Record<string, unknown> | null | undefined): AgentTeamEmbedDeliverable[] {
  return Object.entries(value ?? {}).flatMap(([key, rawValue]) => {
    const nested = asRecord(rawValue);
    if (nested) {
      const label = cleanText(nested.label) ?? cleanText(nested.title) ?? agentTeamKeyLabel(key);
      return [{
        key,
        label,
        schema: cleanText(nested.schema),
        file: cleanText(nested.file),
      }];
    }
    const label = cleanText(rawValue);
    if (!label) {
      return [];
    }
    return [{
      key,
      label,
    }];
  });
}

function normalizeFacts(entries: Array<[string, unknown]>): AgentTeamEmbedFact[] {
  return entries.flatMap(([key, value]) => {
    const normalizedValue = scalarToText(value);
    if (!normalizedValue) {
      return [];
    }
    return [{
      key,
      value: normalizedValue,
    }];
  });
}

function normalizeTimeline(entries: RunTimelineFile["items"]): AgentTeamEmbedTimelineItem[] {
  return (entries ?? [])
    .map((entry) => ({
      kind: cleanText(entry.kind),
      source: cleanText(entry.source),
      stage: cleanText(entry.stage),
      detail: cleanText(entry.detail),
      timestamp: cleanText(entry.timestamp),
    }))
    .sort((left, right) => toSortableMs(right.timestamp) - toSortableMs(left.timestamp));
}

async function readJsonFile<T>(path: string): Promise<T | undefined> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function coerceCount(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  return fallback;
}

function coerceOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const next = cleanText(value);
    if (!next || seen.has(next)) {
      continue;
    }
    seen.add(next);
    output.push(next);
  }
  return output;
}

function toSortableMs(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scalarToText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return cleanText(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    const items = value.flatMap((entry) => {
      const next = scalarToText(entry);
      return next ? [next] : [];
    });
    if (items.length === 0) {
      return undefined;
    }
    return items.join(", ");
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function agentTeamKeyLabel(key: string): string {
  return key
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}
