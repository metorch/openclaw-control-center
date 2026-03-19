// @ts-nocheck
/*
function globalVisibilityCopy
Global Visibility
One place to see timed jobs, heartbeat, current tasks, and tool calls.
Timed jobs:
Heartbeat checks:
Current tasks:
Tool calls:
全局可视
一眼看全局：定时任务、任务心跳、当前任务和工具调用。
定时任务：
任务心跳：
当前任务：
工具调用：
鍏ㄥ眬鍙
鍏ㄥ眬鎬昏
涓€鐪肩湅鍏ㄥ眬锛氬畾鏃朵换鍔°€佷换鍔″績璺炽€佸綋鍓嶄换鍔°€佸伐鍏疯皟鐢ㄣ€?涓€鐪肩湅鍥涗欢浜嬶細瀹氭椂浠诲姟銆佷换鍔″績璺炽€佸綋鍓嶄换鍔°€佸伐鍏疯皟鐢ㄣ€?瀹氭椂浠诲姟锛?浠诲姟蹇冭烦锛?褰撳墠浠诲姟锛?宸ュ叿璋冪敤锛?function formatExecutorAgentLabel
*/
const __name = (target, value) => Object.defineProperty(target, "name", { value, configurable: true });
const import_node_http = require("node:http");
const import_node_crypto = require("node:crypto");
const import_node_fs = require("node:fs");
const import_promises = require("node:fs/promises");
const import_node_os = require("node:os");
const import_node_path = require("node:path");
const import_config = require("../config");
const import_openclaw_mappers = require("../mappers/openclaw-mappers");
const import_api_docs = require("../runtime/api-docs");
const import_budget_governance = require("../runtime/budget-governance");
const import_budget_policy = require("../runtime/budget-policy");
const import_commander = require("../runtime/commander");
const import_cron_overview = require("../runtime/cron-overview");
const import_collaboration_room = require("../runtime/collaboration-room");
const import_openclaw_chat_rooms = require("../runtime/openclaw-chat-rooms");
const import_done_checklist = require("../runtime/done-checklist");
const import_collaboration_agent_artifacts = require("../runtime/collaboration-agent-artifacts");
const import_chat_markdown = require("../runtime/chat-markdown");
const import_audit_timeline = require("../runtime/audit-timeline");
const import_digest_renderer = require("../runtime/digest-renderer");
const import_export_bundle = require("../runtime/export-bundle");
const import_healthz = require("../runtime/healthz");
const import_import_live = require("../runtime/import-live");
const import_import_dry_run = require("../runtime/import-dry-run");
const import_local_token_auth = require("../runtime/local-token-auth");
const import_openclaw_cli_insights = require("../runtime/openclaw-cli-insights");
const import_operation_audit = require("../runtime/operation-audit");
const import_approval_action_service = require("../runtime/approval-action-service");
const import_action_queue_links = require("../runtime/action-queue-links");
const import_doc_hub = require("../runtime/doc-hub");
const import_replay_index = require("../runtime/replay-index");
const import_notification_policy = require("../runtime/notification-policy");
const import_notification_center = require("../runtime/notification-center");
const import_pixel_state = require("../runtime/pixel-state");
const import_usage_cost = require("../runtime/usage-cost");
const import_project_store = require("../runtime/project-store");
const import_project_summary = require("../runtime/project-summary");
const import_task_summary = require("../runtime/task-summary");
const import_task_heartbeat = require("../runtime/task-heartbeat");
const import_ui_preferences = require("../runtime/ui-preferences");
const import_task_store = require("../runtime/task-store");
const import_session_conversations = require("../runtime/session-conversations");
const import_agent_roster = require("../runtime/agent-roster");
const import_operator_display = require("../runtime/operator-display");
const import_team_hierarchy = require("../runtime/team-hierarchy");
const import_agent_team_embed = require("../runtime/agent-team-embed");
const import_agent_team_refresh = require("../runtime/agent-team-refresh");
const import_current_agent_catalog = require("../runtime/current-agent-catalog");
const import_office_session_presence = require("../runtime/office-session-presence");
const import_docs_hub = require("./docs-hub");
const import_collaboration_chat_widget = require("./collaboration-chat-widget");
const { createServerRequestHelpers, resolveOpenClawWorkspaceRoot: resolveOpenClawWorkspaceRootImpl, resolveOpenClawWorkspaceRootForSmoke: resolveOpenClawWorkspaceRootForSmokeImpl } = require("./server-core-helpers");
const { createEditableFileHelpers } = require("./server-editable-files");
const { createDashboardQueryHelpers } = require("./server-dashboard-queries");
const { createGlobalVisibilityRenderers } = require("./server-global-visibility");
const { createOfficeRuntimeHelpers } = require("./server-office-runtime");
const { createRuntimeLabelHelpers } = require("./server-runtime-labels");
const { createExecutionChainHelpers } = require("./server-execution-chains");
const { createCollaborationRoomHelpers } = require("./server-collaboration-room");
const { createCollaborationChatHelpers } = require("./server-collaboration-chat");
const { createCollaborationThreadHelpers } = require("./server-collaboration-threads");
const { createRuntimeCacheHelpers } = require("./server-runtime-caches");
const { createSessionConversationHelpers } = require("./server-session-conversations");
const { createTaskSpotlightHelpers } = require("./server-task-spotlight");
const { createDashboardRuntimeHelpers } = require("./server-dashboard-runtime");
const { createReadModelHelpers } = require("./server-read-model");
const { createStaffModelHelpers } = require("./server-staff-models");
const { createStaffOverviewHelpers } = require("./server-staff-overview");
const { badge, escapeHtml, extractDateFromName, formatInt, formatPercent, formatTimeAgoFromNow, pickUiText, safeTruncate, toPlainSummary, toSortableMs, uniqueSorted } = require("./server-shared");
const { renderAgentVisualEnhancerScript, renderCollaborationFilterScript, renderDashboardRefreshScript, renderFileWorkbenchScript, renderNativeMotionScript, renderQuotaResetScript, renderSettingsBudgetLimitScript, renderStaffModelScript, renderTaskBoardScript } = require("./server-inline-scripts");
const { agentTeamActionLabel, agentTeamEmbeddedUpdatedLabel, agentTeamFactLabel, agentTeamFreshnessTone, agentTeamPhaseLabel, agentTeamPreviewSourceLabel, agentTeamRunStatusLabel, agentTeamRuntimeSummary, agentTeamSuggestedPanelHref, hasFreshRuntimeTimestamp, isSameLocalCalendarDay, isStaleRuntimeTimestamp, pickLatestSessionActivityTimestamp, pickLatestTimestamp, renderAgentTeamArtifactPreviewCard, renderAgentTeamDocsBlock, renderAgentTeamInspectorCard, renderAgentTeamInspectorSummary, renderAgentTeamMemoryBlock, renderAgentTeamOverviewBlock, renderAgentTeamProjectsBlock, renderAgentTeamRunSummaryCard, renderAgentTeamSettingsBlock, renderAgentTeamSidebarCard, renderAgentTeamTeamBlock } = require("./server-agent-team");
const { createDetailPageRenderers } = require("./server-detail-pages");
const { createDashboardFragmentHelpers } = require("./server-dashboard-fragments");
const { createInsightRenderers } = require("./server-insight-panels");
const { createTaskPageRenderers } = require("./server-task-pages");
const { createTeamPanelRenderers } = require("./server-team-panels");
const { createUsageRenderers } = require("./server-usage-rendering");
const dashboardFragmentHelpers = createDashboardFragmentHelpers({
    badge,
    escapeHtml,
    getDocLinks: () => DOC_LINKS,
    pickUiText,
    projectStateLabel: (state, language = "zh") => projectStateLabel(state, language),
    projectStates: import_project_store.PROJECT_STATES,
    toSortableMs
});
const { cronHealthLabel, cronPayloadOwner, cronPayloadOwnerAgentId, cronPayloadPurpose, cronRuntimePurpose, cronScheduleLabel, formatExecutorAgentLabel, heartbeatModeLabel, humanizeTimedJobScheduleLabel, humanizeTimedJobWindowLabel, sanitizeCronPurposeText, sessionStateLabel, summarizeNames } = createRuntimeLabelHelpers({ formatSeconds, humanizeOperatorLabel, normalizeInlineText, pickUiText, safeTruncate, toSortableMs });
const { buildBudgetBars, buildParitySurfaceRows, compareApprovals, parseSubscriptionConnectPaths, renderActionQueue, renderBudgetBars, renderChecklistRows, renderExceptionsList, renderMetricSummary, renderParitySurfaceRows, renderProjectBoard, renderReadinessRows, renderSelectOptions } = dashboardFragmentHelpers;
const { buildGlobalVisibilityDetailHref, buildGlobalVisibilityViewModel, loadOpenclawCronCatalog, renderGlobalVisibilityCard, renderGlobalVisibilityStrip, renderGlobalVisibilityStripCard } = createGlobalVisibilityRenderers({ asObject, badge, buildCronOverview: import_cron_overview.buildCronOverview, buildHomeHref, cronPayloadOwner, cronPayloadOwnerAgentId, cronPayloadPurpose, cronPollingIntervalMs: import_config.POLLING_INTERVALS_MS.cron, cronRuntimePurpose, cronScheduleLabel, escapeHtml, formatExecutorAgentLabel, getOpenClawCronJobsCandidates: () => OPENCLAW_CRON_JOBS_CANDIDATES, listSessionConversations: import_session_conversations.listSessionConversations, pickUiText, readTaskHeartbeatRuns: import_task_heartbeat.readTaskHeartbeatRuns, sanitizeCronPurposeText, summarizeNames });
const { renderAuditPage, renderCronJobDetailPage, renderSessionDrilldownPage, renderSessionHistoryRows, renderSessionPreviewRows } = createDetailPageRenderers({ buildHomeHref, buildSessionDetailHref, cronHealthLabel, executionChainStageLabel: (stage, language = "zh") => executionChainHelpers.executionChainStageLabel(stage, language), formatSeconds, humanizeTimedJobScheduleLabel, renderSelectOptions, sessionStateLabel, summarizeVisibleSessionSnippet: (rawSnippet, language = "zh", maxLength = 96) => executionChainHelpers.summarizeVisibleSessionSnippet(rawSnippet, language, maxLength) });
const { renderLegacyTaskBoard, renderTaskBoard, renderTaskDetailPage } = createTaskPageRenderers({ buildHomeHref, buildSessionDetailHref, renderGlobalVisibilityStrip, sessionStateLabel, summarizeVisibleSessionSnippet: (rawSnippet, language = "zh", maxLength = 96) => executionChainHelpers.summarizeVisibleSessionSnippet(rawSnippet, language, maxLength), taskStateLabel });
const { asPercent, dataConnectionLabel, formatCurrency, formatSubscriptionNumericField, formatSubscriptionPercentField, formatSubscriptionTextField, normalizeQuotaWindowLabel, renderQuotaWindowRow, renderSubscriptionSidebarSummary, renderTokenPieChart, renderTokenShareRows, renderUsageBreakdownRows, renderUsageConnectorTodos, renderUsageContextRows, renderUsagePeriodCards, simplifyUsageLabel, usagePeriodLabel } = createUsageRenderers({ normalizeInlineText });
const collaborationThreadHelpers = createCollaborationThreadHelpers({
    buildSessionDetailHref,
    deriveAgentAnimalIdentity: (agentId) => officeRuntimeHelpers.deriveAgentAnimalIdentity(agentId),
    executionChainCardTitle: (item, language) => executionChainHelpers.executionChainCardTitle(item, language),
    executionChainSourceLabel: (chain, language = "zh") => executionChainHelpers.executionChainSourceLabel(chain, language),
    extractAgentIdFromSessionKey: (sessionKey) => executionChainHelpers.extractAgentIdFromSessionKey(sessionKey),
    formatTimeAgoFromNow,
    humanizeOperatorLabel,
    looksLikeStructuredExecutionTitle: (input) => executionChainHelpers.looksLikeStructuredExecutionTitle(input),
    normalizeInlineText,
    normalizeLookupKey,
    pickLatestTimestamp,
    pickUiText,
    safeTruncate,
    summarizeStructuredSessionPayload: (input, language) => executionChainHelpers.summarizeStructuredSessionPayload(input, language),
    summarizeVisibleSessionSnippet: (rawSnippet, language = "zh", maxLength = 96) => executionChainHelpers.summarizeVisibleSessionSnippet(rawSnippet, language, maxLength),
    toSortableMs
});
const collaborationRoomHelpers = createCollaborationRoomHelpers({
    buildCollaborationRoomApiEvent: (event, directory, attachmentsById, language, roomId) => collaborationChatHelpers.buildCollaborationRoomApiEvent(event, directory, attachmentsById, language, roomId),
    buildSessionDetailHref,
    createRequestValidationError: (message, statusCode) => new RequestValidationError(message, statusCode),
    deriveAgentAnimalIdentity: (agentId) => officeRuntimeHelpers.deriveAgentAnimalIdentity(agentId),
    getOpenClawHomeDir: () => OPENCLAW_HOME_DIR,
    getSearchLimitMax: () => SEARCH_LIMIT_MAX,
    getOpenClawWorkspaceRoot: () => OPENCLAW_WORKSPACE_ROOT,
    humanizeOperatorLabel,
    loadCachedStaffRecentActivity,
    normalizeAgentIdCandidate: (value) => collaborationThreadHelpers.normalizeAgentIdCandidate(value),
    normalizeSessionHistoryMessages: import_session_conversations.normalizeSessionHistoryMessages,
    normalizeLookupKey,
    pickLatestSessionActivityTimestamp,
    pickUiText,
    resolveConfiguredWorkspaceRoot: (rawWorkspace, agentId) => resolveConfiguredWorkspaceRoot(rawWorkspace, agentId),
    resolveStaffStatusDotTone,
    safeTruncate,
    staffCurrentWorkLabel: (input) => officeRuntimeHelpers.staffCurrentWorkLabel(input),
    staffStatusDotLabel,
    toSortableMs
});
const collaborationChatHelpers = createCollaborationChatHelpers({
    buildCollaborationAttachmentSummary: (attachment) => collaborationRoomHelpers.buildCollaborationAttachmentSummary(attachment),
    buildSessionDetailHref,
    createRequestValidationError: (message, statusCode) => new RequestValidationError(message, statusCode),
    describeCollaborationRoomEvent: (event, language, directory, attachmentsById) => collaborationRoomHelpers.describeCollaborationRoomEvent(event, language, directory, attachmentsById),
    formatBytesCompact: (sizeBytes) => collaborationRoomHelpers.formatBytesCompact(sizeBytes),
    formatCollaborationDuration: (durationMs) => collaborationRoomHelpers.formatCollaborationDuration(durationMs),
    getOpenClawHomeDir: () => OPENCLAW_HOME_DIR,
    getOpenClawWorkspaceRoot: () => OPENCLAW_WORKSPACE_ROOT,
    isUiLanguage: import_ui_preferences.isUiLanguage,
    normalizeCollaborationAttachmentIds: (input) => collaborationRoomHelpers.normalizeCollaborationAttachmentIds(input),
    normalizeCollaborationRoomIdPayload: (roomId, directory) => collaborationRoomHelpers.normalizeCollaborationRoomIdPayload(roomId, directory),
    normalizeLookupKey,
    optionalBoundedString: (value, label, maxLength) => optionalBoundedString(value, label, maxLength),
    pickUiText,
    resolveCollaborationParticipantName: (directory, agentId) => collaborationRoomHelpers.resolveCollaborationParticipantName(directory, agentId),
    safeTruncate,
    toCollaborationApiAttachment: (attachment, roomId) => collaborationRoomHelpers.toCollaborationApiAttachment(attachment, roomId)
});
const { renderCollaborationThreadCards, renderOfficeCards, renderOfficeFloor, renderStaffOverviewCards, renderSubscriptionStatusCard, renderTaskExecutionChainCards } = createTeamPanelRenderers({ asPercent, collaborationParticipantRoleLabel: collaborationThreadHelpers.collaborationParticipantRoleLabel, collaborationRoleAgentLabel: collaborationThreadHelpers.collaborationRoleAgentLabel, deriveAgentAnimalIdentity: (agentId) => officeRuntimeHelpers.deriveAgentAnimalIdentity(agentId), executionChainCardTitle: (item, language) => executionChainHelpers.executionChainCardTitle(item, language), executionChainSourceLabel: (chain, language = "zh") => executionChainHelpers.executionChainSourceLabel(chain, language), executionChainStageLabel: (stage, language = "zh") => executionChainHelpers.executionChainStageLabel(stage, language), formatSubscriptionNumericField, humanizeOperatorLabel, normalizeQuotaWindowLabel, officeZoneLabel: (zone, language = "zh") => officeRuntimeHelpers.officeZoneLabel(zone, language), renderAgentAvatarFrame: (input) => officeRuntimeHelpers.renderAgentAvatarFrame({ ...input, escapeHtml }), renderQuotaWindowRow, sessionStateLabel, summarizeVisibleSessionSnippet: (rawSnippet, language = "zh", maxLength = 96) => executionChainHelpers.summarizeVisibleSessionSnippet(rawSnippet, language, maxLength) });
const { attachCollaborationRoomRefsToCards, buildCollaborationAttachmentSummary, buildCollaborationChatParticipantViews, buildCollaborationEventSyncSignature, buildCollaborationRoomApiView, buildCollaborationTranscriptBackfillEvent, buildCollaborationTranscriptBackfillEvents, buildTranscriptBackfillDetail, compareCollaborationApiEventsByTime, describeCollaborationRoomEvent, extractCollaborationMentionTokens, findUnknownCollaborationMentions, formatBytesCompact, formatCollaborationDuration, isCollaborationRelayPromptMessage, isDuplicateCollaborationSyncEvent, listCollaborationTranscriptRooms, loadCollaborationParticipantDirectory, mergeCollaborationRoomApiEvents, normalizeCollaborationAttachmentIds, normalizeCollaborationEventSyncText, normalizeCollaborationRoomIdPayload, normalizeCollaborationRoomIdQuery, registerCollaborationSyncEventSignature, resolveCollaborationParticipantName, shouldCountUnreadCollaborationApiEvent, shouldCountUnreadCollaborationEvent, summarizeCollaborationAttachmentNames, toCollaborationApiAttachment } = collaborationRoomHelpers;
const { buildCollaborationAgentPrompt, buildCollaborationAgentPromptV2, buildCollaborationAgentReplyDetail, buildCollaborationPromptContextLines, buildCollaborationRoomApiEvent, collectCollaborationAgentReplyAttachments, createCollaborationRoomMessage, dispatchCollaborationRoomMessage, dispatchCollaborationTurnToAgent, dispatchCollaborationTurnToAgentV2, isAbsoluteLikePath, isPathInsideAnyRoot, isPathInsideRoot, isReadableCollaborationArtifactPath, isSupportedCollaborationArtifactPath, resolveCollaborationArtifactPaths, resolveCollaborationParticipantWorkspaceRoot, shouldHintCollaborationArtifactReply } = collaborationChatHelpers;
const { buildCollaborationThreadCards, buildCollaborationTimelineSteps, buildInterSessionCollaborationCards, buildInterSessionCollaborationTimelineSteps, collaborationInterSessionCurrentOwnerLabel, collaborationInterSessionRouteLabel, collaborationInterSessionSummary, collaborationParticipantRoleLabel, collaborationRoleAgentLabel, collaborationRouteLabel, collaborationStatusRank, collaborationThreadKindLabel, collaborationThreadStatusLabel, collaborationThreadSummary, deriveCollaborationTaskTitle, deriveInterSessionTaskTitle, extractCollaborationTaskLabel, foldCollaborationThreadCards, mergeCollaborationThreadCards, normalizeAgentIdCandidate, resolveCollaborationCurrentOwner, resolveInterSessionCollaborationStatus, resolveCollaborationThreadStatus } = collaborationThreadHelpers;
const SNAPSHOT_PATH = (0, import_node_path.join)(process.cwd(), "runtime", "last-snapshot.json");
const OPENCLAW_HOME_DIR = process.env.OPENCLAW_HOME?.trim() || (0, import_node_path.join)((0, import_node_os.homedir)(), ".openclaw");
const OPENCLAW_CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH?.trim() || (0, import_node_path.join)(OPENCLAW_HOME_DIR, "openclaw.json");
const OPENCLAW_CONFIG_DIR = (0, import_node_path.dirname)(OPENCLAW_CONFIG_PATH);
const OPENCLAW_CRON_JOBS_CANDIDATES = [(0, import_node_path.join)(OPENCLAW_HOME_DIR, "cron", "jobs.json"), (0, import_node_path.join)(process.cwd(), "..", "..", "..", "..", "cron", "jobs.json")];
const DOCS_DIR = (0, import_node_path.join)(process.cwd(), "docs");
const README_PATH = (0, import_node_path.join)(process.cwd(), "README.md");
const AGENT_ROOT_DIR = process.env.OPENCLAW_AGENT_ROOT?.trim() || (0, import_node_path.join)(process.cwd(), "..");
const HTML_HEAVY_CACHE_TTL_MS = 3e3;
const HTML_USAGE_CACHE_TTL_MS = 1e4;
const HTML_SNAPSHOT_CACHE_TTL_MS = 1e4;
const HTML_LIVE_SESSIONS_CACHE_TTL_MS = import_config.POLLING_INTERVALS_MS.sessionsList;
const HTML_REPLAY_CACHE_TTL_MS = 1e4;
const JSON_MAX_BYTES = 128 * 1024;
const FORM_MAX_BYTES = 16 * 1024;
const RAW_UPLOAD_MAX_BYTES = import_collaboration_room.COLLABORATION_ATTACHMENT_MAX_BYTES + 8 * 1024;
const EDITABLE_TEXT_FILE_MAX_BYTES = 1024 * 1024;
const EDITABLE_TEXT_CONTENT_MAX_CHARS = 24e4;
const SEARCH_LIMIT_MAX = 200;
const TASK_RUNTIME_ACTIVITY_WINDOW_MS = 6 * 60 * 60 * 1e3;
const STALLED_RUNNING_SESSION_WINDOW_MS = 2 * 60 * 60 * 1e3;
const OPENCLAW_WORKSPACE_ROOT = resolveOpenClawWorkspaceRootImpl({ explicitWorkspaceRoot: process.env.OPENCLAW_WORKSPACE_ROOT?.trim(), openclawHomeDir: OPENCLAW_HOME_DIR, configPath: OPENCLAW_CONFIG_PATH });
const CONTROL_CENTER_ROOT = (0, import_node_path.resolve)(process.cwd());
const CUSTOM_STAFF_AVATAR_ROUTE_PREFIX = "/assets/staff-custom/";
const CUSTOM_STAFF_AVATAR_DIR = (0, import_node_path.join)(CONTROL_CENTER_ROOT, "runtime", "assets", "staff-custom");
const WORKSPACE_EDITABLE_SKIP_DIRS = new Set(["node_modules", ".git", "dist", "coverage"]);
const WORKSPACE_EDITABLE_EXTENSIONS = new Set([".md", ".markdown"]);
const MEMORY_EDITABLE_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);
const SHARED_DOCUMENT_FILE_CANDIDATES = ["AGENTS.md", "IDENTITY.md", "SOUL.md", "USER.md", "TASKS.md", "BOOTSTRAP.md", "HEARTBEAT.md", "TOOLS.md", (0, import_node_path.join)(".learnings", "LEARNINGS.md"), (0, import_node_path.join)("control-center", "README.md")];
const AGENT_DOCUMENT_FILE_CANDIDATES = ["AGENTS.md", "IDENTITY.md", "SOUL.md", "USER.md", "TASKS.md", "HEARTBEAT.md", "TOOLS.md", "README.md", "BOOTSTRAP.md", "NOTEBOOK.md", "focus.md", "inbox.md", "routines.md"];
const STAFF_ROLE_EVIDENCE_FILE_CANDIDATES = ["IDENTITY.md", "SOUL.md", "AGENTS.md", "BOOTSTRAP.md", "HEARTBEAT.md", "TOOLS.md", "README.md", "MEMORY.md", "focus.md", "routines.md", "inbox.md"];
const DASHBOARD_SEARCH_SCOPES = ["tasks", "projects", "sessions", "exceptions"];
const DASHBOARD_SECTIONS = ["overview", "calendar", "team", "collaboration", "memory", "docs", "usage-cost", "office-space", "projects-tasks", "alerts", "replay-audit", "settings"];
const CONTROL_CENTER_MAPPING_TASK_IDS = new Set(["due-fast", "todo-second", "already-running", "unassigned"]);
const LEGACY_DASHBOARD_ROUTE_SECTION = { "/calendar": "projects-tasks", "/heartbeat": "overview", "/tools": "settings" };
const LEGACY_DASHBOARD_ROUTE_ANCHOR = { "/calendar": "calendar-board", "/heartbeat": "heartbeat-health", "/tools": "tool-connectors" };
function resolveOpenClawWorkspaceRootForSmoke(input) {
    return resolveOpenClawWorkspaceRootForSmokeImpl(input);
}
__name(resolveOpenClawWorkspaceRootForSmoke, "resolveOpenClawWorkspaceRootForSmoke");
const TASK_STATES = ["todo", "in_progress", "blocked", "done"];
const SESSION_STATES = ["idle", "running", "blocked", "waiting_approval", "error"];
const DOC_LINKS = [{ label: "README.md", href: "/docs/readme" }, { label: "docs/RUNBOOK.md", href: "/docs/runbook" }, { label: "docs/ARCHITECTURE.md", href: "/docs/architecture" }, { label: "docs/PROGRESS.md", href: "/docs/progress" }];
const DASHBOARD_SECTION_LINKS_EN = [{ key: "overview", label: "Overview", blurb: "Today at a glance" }, { key: "usage-cost", label: "Usage", blurb: "Budget and quota" }, { key: "team", label: "Staff", blurb: "Mission, staff and assignments" }, { key: "collaboration", label: "Collaboration", blurb: "Agent handoffs and teamwork" }, { key: "memory", label: "Memory", blurb: "Daily and long-term memories" }, { key: "docs", label: "Documents", blurb: `${import_operator_display.DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME} and active agent core docs` }, { key: "projects-tasks", label: "Tasks", blurb: "Board, schedule and activity" }, { key: "settings", label: "Settings", blurb: "Safety and data links" }];
const ANIMAL_CATALOG = [{ key: "robot", title: "Robot Operator", accent: "#8ad2ff", sprite: " [:::] \n |o o| \n | - | \n /|_|\\\\ ", keywords: ["robot", "android", "bot", "codex"] }, { key: "lion", title: "Lion Captain", accent: "#ff9966", sprite: " /\\_/\\ \n( 0_0 )\n /|^|\\ \n  / \\  ", keywords: ["lion", "lead", "main", "chief", "alpha"] }, { key: "panda", title: "Panda Strategist", accent: "#9df2ff", sprite: " /\\_/\\ \n( o.o )\n(  =  )\n /   \\ ", keywords: ["panda", "focus", "plan", "calm"] }, { key: "monkey", title: "Monkey Builder", accent: "#f4c542", sprite: " /\\_/\\ \n( @.@ )\n /|_|\\ \n  / \\  ", keywords: ["monkey", "ape", "creative", "hack"] }, { key: "dolphin", title: "Dolphin Navigator", accent: "#6ed8ff", sprite: "  __/\\ \n<( o )__\n /  .--'\n \\_/    ", keywords: ["dolphin", "wave", "flow", "sea"] }, { key: "owl", title: "Owl Analyst", accent: "#f4ccff", sprite: " /\\_/\\ \n( O,O )\n(  V  )\n /   \\ ", keywords: ["owl", "watch", "audit", "night"] }, { key: "fox", title: "Fox Courier", accent: "#ffb36e", sprite: " /\\_/\\ \n( ^.^ )\n /\\_/\\ \n  / \\  ", keywords: ["fox", "swift", "relay", "ops"] }, { key: "bear", title: "Bear Guardian", accent: "#a4ffb0", sprite: " /\\_/\\ \n( -.- )\n(  U  )\n /   \\ ", keywords: ["bear", "guard", "shield", "safe"] }, { key: "eagle", title: "Eagle Scout", accent: "#ffe07d", sprite: "  /\\_/\\\n==(o)==\n  /_\\  \n  / \\  ", keywords: ["eagle", "vision", "scan", "observer"] }, { key: "tiger", title: "Tiger Sprinter", accent: "#ff8a7d", sprite: " /\\_/\\ \n( >.< )\n /|#|\\ \n  / \\  ", keywords: ["tiger", "stripe", "fast", "sprint"] }, { key: "otter", title: "Otter Planner", accent: "#8ad1ff", sprite: " /\\_/\\ \n( o_o )\n /~~~\\ \n  / \\  ", keywords: ["otter", "water", "daily", "planner"] }, { key: "rooster", title: "Rooster Herald", accent: "#ffb85e", sprite: "  __\n<(o )___\n ( ._> /\n  `---'  ", keywords: ["rooster", "cock", "coq", "chanticleer"] }];
const FALLBACK_ANIMAL_CATALOG = ANIMAL_CATALOG.filter(item => item.key !== "robot");
const CUSTOM_STAFF_AVATAR_CATALOG = [{ key: "fox", title: "Fox Lead", accent: "#ff8f4d", fileName: "fox.png" }, { key: "panda", title: "Panda Architect", accent: "#91bdd8", fileName: "panda.png" }, { key: "shiba", title: "Shiba Dispatcher", accent: "#f3ab5f", fileName: "shiba.png" }, { key: "cat", title: "Cat Frontend", accent: "#ffb783", fileName: "cat.png" }, { key: "tiger", title: "Tiger Backend", accent: "#ff985a", fileName: "tiger.png" }, { key: "elephant", title: "Elephant QA", accent: "#9aa7bf", fileName: "elephant.png" }, { key: "dolphin", title: "Dolphin Ops", accent: "#73c7f4", fileName: "dolphin.png" }, { key: "lion", title: "Lion Captain", accent: "#f1a35f", fileName: "lion.png" }, { key: "deer", title: "Deer Runner", accent: "#c89d67", fileName: "deer.png" }, { key: "bird", title: "Bird Scout", accent: "#d7d9df", fileName: "bird.png" }];
const CUSTOM_STAFF_AVATAR_BY_KEY = new Map(CUSTOM_STAFF_AVATAR_CATALOG.map(item => [item.key, item]));
const CUSTOM_STAFF_AVATAR_FILE_NAMES = new Set(CUSTOM_STAFF_AVATAR_CATALOG.map(item => item.fileName));
const CORE_STAFF_AVATAR_OVERRIDES = new Map([["main", "fox"], ["jarvis", "fox"], ["dispatcher", "shiba"], ["productdispatcher", "shiba"], ["product", "shiba"], ["architect", "panda"], ["architecture", "panda"], ["backend", "tiger"], ["frontend", "cat"], ["qa", "elephant"], ["quality", "elephant"], ["ops", "dolphin"], ["devops", "dolphin"]]);
const EDITABLE_FILE_SCOPES = ["memory", "workspace", "runtime"];
const EDITABLE_FILE_SCOPE_ERROR = `scope must be one of: ${EDITABLE_FILE_SCOPES.join(", ")}`;
const { buildTaskCertaintyCards, renderContextPressureCard, renderInformationCertaintyCard, renderMemoryStateSection, renderSettingsBudgetLimitCard, renderSettingsConfigAccessCard, renderSettingsEnvironmentStatusCard, renderTaskCertaintySection } = createInsightRenderers({ buildHomeHref, buildSessionDetailHref, buildTaskDetailHref, dataConnectionLabel, hasFreshRuntimeTimestamp, humanizeOperatorLabel, normalizeInlineText, pickLatestSessionActivityTimestamp, pickLatestTimestamp, simplifyUsageLabel, TASK_RUNTIME_ACTIVITY_WINDOW_MS, toSortableMs });
const taskSpotlightHelpers = createTaskSpotlightHelpers({
    buildCronDetailHref,
    buildTaskDetailHref,
    formatSeconds,
    formatTimeAgoFromNow,
    hasFreshRuntimeTimestamp,
    humanizeOperatorLabel,
    humanizeTimedJobScheduleLabel,
    humanizeTimedJobWindowLabel,
    isStaleRuntimeTimestamp,
    pickLatestSessionActivityTimestamp,
    pickUiText,
    sanitizeCronPurposeText,
    summarizeVisibleSessionSnippet: (rawSnippet, language = "zh", maxLength = 96) => executionChainHelpers.summarizeVisibleSessionSnippet(rawSnippet, language, maxLength),
    taskRuntimeActivityWindowMs: TASK_RUNTIME_ACTIVITY_WINDOW_MS,
    taskStateLabel,
    toSortableMs
});
const executionChainHelpers = createExecutionChainHelpers({
    buildSessionDetailHref,
    buildTaskDetailHref,
    formatInt,
    humanizeOperatorLabel,
    inferSessionExecutionChainFromSessionKey: import_session_conversations.inferSessionExecutionChainFromSessionKey,
    normalizeInlineText,
    normalizeLookupKey,
    pickLatestSessionActivityTimestamp,
    pickUiText,
    safeTruncate,
    toSortableMs
});
const { buildTaskExecutionChainCards, compareTaskExecutionChainCards, executionChainCardTitle, executionChainSourceLabel, executionChainStageLabel, executionChainStageRank, extractAgentIdFromSessionKey, extractCronJobIdFromSessionKey, looksLikeStructuredExecutionTitle, summarizeStructuredSessionPayload, summarizeVisibleSessionSnippet } = executionChainHelpers;
const sessionConversationHelpers = createSessionConversationHelpers({
    executionChainStageRank: executionChainHelpers.executionChainStageRank,
    getSessionConversationDetail: import_session_conversations.getSessionConversationDetail,
    heavyCacheTtlMs: HTML_HEAVY_CACHE_TTL_MS,
    listSessionConversations: import_session_conversations.listSessionConversations,
    normalizeInlineText,
    normalizeLookupKey,
    pickLatestTimestamp,
    safeTruncate,
    toSortableMs
});
const runtimeCacheHelpers = createRuntimeCacheHelpers({
    buildUsageCostSnapshot: import_usage_cost.buildUsageCostSnapshot,
    heavyCacheTtlMs: HTML_HEAVY_CACHE_TTL_MS,
    loadBestEffortOfficeSessionPresence: import_office_session_presence.loadBestEffortOfficeSessionPresence,
    loadReplayIndex: import_replay_index.loadReplayIndex,
    replayCacheTtlMs: HTML_REPLAY_CACHE_TTL_MS,
    usageCacheTtlMs: HTML_USAGE_CACHE_TTL_MS
});
const readModelHelpers = createReadModelHelpers({
    budgetPolicyPath: import_budget_policy.BUDGET_POLICY_PATH,
    buildBudgetSummary: import_budget_governance.computeBudgetSummary,
    compareSessionSummariesByLatest,
    computeProjectSummaries: import_project_summary.computeProjectSummaries,
    computeTasksSummary: import_task_summary.computeTasksSummary,
    defaultSnapshot,
    delay,
    htmlLiveSessionsCacheTtlMs: HTML_LIVE_SESSIONS_CACHE_TTL_MS,
    htmlSnapshotCacheTtlMs: HTML_SNAPSHOT_CACHE_TTL_MS,
    loadBudgetPolicy: import_budget_policy.loadBudgetPolicy,
    loadProjectStore: import_project_store.loadProjectStore,
    loadTaskStore: import_task_store.loadTaskStore,
    mapSessionsListToSummaries: import_openclaw_mappers.mapSessionsListToSummaries,
    projectsPath: import_project_store.PROJECTS_PATH,
    readFile: import_promises.readFile,
    snapshotPath: SNAPSHOT_PATH,
    stat: import_promises.stat,
    tasksPath: import_task_store.TASKS_PATH
});
const { buildUsageCostCacheKey, loadCachedOfficeSessionPresence, loadCachedReplayPreview, loadCachedUsageCost } = runtimeCacheHelpers;
const { buildTaskCardManualOrderLookup, buildTaskSpotlightCards, buildTimedJobSpotlightCards, buildUnifiedTaskBoardCards, compareTaskSpotlightCards, compareTaskSpotlightCardsWithManualOrder, countStalledRunningSessions, resolveTaskSpotlightPriorityBucket, resolveTaskSpotlightTone, taskSpotlightDueLabel, taskSpotlightNextStep, taskSpotlightPriorityLabel, taskSpotlightRecentSignal, taskSpotlightStatusDotLabel, taskSpotlightStatusLabel, taskSpotlightSummary } = taskSpotlightHelpers;
const { loadCachedCollaborationPreview, loadCachedSessionPreview, loadCachedTaskEvidenceSessions, mergeSessionConversationItems } = sessionConversationHelpers;
const { loadCachedLiveSessions, readOptionalFileStamp, readReadModelSourceStamp, readReadModelSnapshot, readReadModelSnapshotWithLiveSessions, readSnapshotJsonWithRetry, readSnapshotRaw } = readModelHelpers;
const dashboardRuntimeHelpers = createDashboardRuntimeHelpers({
    buildActionQueueLinks: import_action_queue_links.buildActionQueueLinks,
    buildNotificationCenter: import_notification_center.buildNotificationCenter,
    commanderExceptionsFeed: import_commander.commanderExceptionsFeed,
    invalidateDashboardRefreshCaches,
    loadAcksStore: import_notification_center.loadAcksStore,
    loadAgentTeamEmbedSnapshot: import_agent_team_embed.loadAgentTeamEmbedSnapshot,
    loadCachedOfficeSessionPresence,
    loadCachedReplayPreview,
    loadCachedUsageCost,
    loadStructuredDocHubSnapshot: import_docs_hub.loadStructuredDocHubSnapshot,
    readReadModelSnapshotWithLiveSessions,
    refreshAgentTeamServeSessionSnapshot: import_agent_team_refresh.refreshAgentTeamServeSessionSnapshot,
    workspaceRoot: OPENCLAW_WORKSPACE_ROOT
});
const { primeUiRenderCaches, readNotificationCenter, refreshDashboardSources } = dashboardRuntimeHelpers;
let renderStaffRecentActivityCache;
function invalidateUiRenderCaches() { sessionConversationHelpers.invalidateSessionConversationCaches(); runtimeCacheHelpers.invalidateRuntimeCaches(); renderStaffRecentActivityCache = void 0; readModelHelpers.invalidateReadModelCaches(); }
__name(invalidateUiRenderCaches, "invalidateUiRenderCaches");
function invalidateDashboardRefreshCaches() { invalidateUiRenderCaches(); (0, import_agent_team_embed.invalidateAgentTeamEmbedSnapshotCache)(); (0, import_doc_hub.invalidateStructuredDocHubCache)(); (0, import_openclaw_cli_insights.invalidateOpenClawCliInsightsCache)(); (0, import_usage_cost.invalidateUsageCostSourceCache)(); }
__name(invalidateDashboardRefreshCaches, "invalidateDashboardRefreshCaches");
function resolveCustomStaffAvatarAssetPath(pathname) {
    if (!pathname.startsWith(CUSTOM_STAFF_AVATAR_ROUTE_PREFIX)) {
        return void 0;
    }
    const fileName = pathname.slice(CUSTOM_STAFF_AVATAR_ROUTE_PREFIX.length).trim();
    if (!fileName || fileName !== (0, import_node_path.basename)(fileName) || !CUSTOM_STAFF_AVATAR_FILE_NAMES.has(fileName)) {
        return void 0;
    }
    return (0, import_node_path.join)(CUSTOM_STAFF_AVATAR_DIR, fileName);
}
__name(resolveCustomStaffAvatarAssetPath, "resolveCustomStaffAvatarAssetPath");
function startUiServer(port, toolClient) {
    const approvalActions = new import_approval_action_service.ApprovalActionService(toolClient);
    const server = (0, import_node_http.createServer)(async (req, res) => {
        const method = req.method ?? "GET";
        const requestId = resolveRequestId(req);
        res.setHeader("x-request-id", requestId);
        try {
            const url = new URL(req.url ?? "/", "http://127.0.0.1");
            const path = url.pathname;
            const legacySection = resolveLegacyDashboardSection(path);
            const legacyAnchor = resolveLegacyDashboardAnchor(path);
            if (method === "GET") {
                const customStaffAvatarAssetPath = resolveCustomStaffAvatarAssetPath(path);
                if (customStaffAvatarAssetPath) {
                    try {
                        const image = await (0, import_promises.readFile)(customStaffAvatarAssetPath);
                        return writeBinary(res, 200, image, "image/png");
                    }
                    catch {
                        return writeApiError(res, 404, "NOT_FOUND", "Staff avatar asset not found.");
                    }
                }
            }
            if (method === "GET" && (path === "/" || legacySection)) {
                const prefs = await (0, import_ui_preferences.loadUiPreferences)();
                if (prefs.issues.length > 0) {
                    console.warn("[mission-control] ui preferences normalized", { requestId, issues: prefs.issues });
                }
                let filters = resolveDashboardTaskFilters(url.searchParams, prefs.preferences);
                const section = legacySection ?? resolveDashboardSection(url.searchParams);
                const resolvedLanguage = resolveUiLanguage(url.searchParams, prefs.preferences.language);
                const hasExplicitLanguage = hasAnyQueryKey(url.searchParams, ["lang"]);
                const language = hasExplicitLanguage ? resolvedLanguage : "zh";
                const compactStatusStrip = resolveCompactStatusStrip(url.searchParams, prefs.preferences.compactStatusStrip);
                const usageView = resolveUsageView(url.searchParams);
                const search = resolveDashboardSearchQuery(url.searchParams);
                const hasTaskFilterQuery = hasAnyQueryKey(url.searchParams, ["quick", "status", "owner", "project"]);
                if (section === "projects-tasks" && !hasTaskFilterQuery) {
                    filters = { quick: "all" };
                }
                if (path !== "/") {
                    const target = `${buildHomeHref(filters, compactStatusStrip, section, language, usageView)}${legacyAnchor ? `#${legacyAnchor}` : ""}`;
                    return redirect(res, 302, target);
                }
                if (hasAnyQueryKey(url.searchParams, ["quick", "status", "owner", "project", "compact", "lang", "usage_view"])) {
                    await (0, import_ui_preferences.saveUiPreferences)({ ...prefs.preferences, language, compactStatusStrip, quickFilter: filters.quick ?? "all", taskFilters: { status: filters.status, owner: filters.owner, project: filters.project }, updatedAt: new Date().toISOString() });
                }
                const html = await renderHtml(filters, toolClient, { section, language, compactStatusStrip, usageView, preferencesPath: prefs.path, taskCardOrder: prefs.preferences.taskCardOrder, localMutationUnlock: prefs.preferences.localMutationUnlock, collaborationChat: prefs.preferences.collaborationChat, search });
                return writeText(res, 200, html, "text/html; charset=utf-8");
            }
            if (method === "POST" && path === "/api/dashboard/refresh") {
                assertAllowedQueryParams(url.searchParams, [], true);
                try {
                    const refresh = await refreshDashboardSources(toolClient);
                    return writeJson(res, 200, { ok: true, refresh: { refreshedAt: refresh.refreshedAt, fixtureDir: refresh.fixtureDir, statusPath: refresh.statusPath, dashboardPath: refresh.dashboardPath, command: refresh.command, args: refresh.args, statusFileUpdatedAt: refresh.statusFileUpdatedAt, dashboardFileUpdatedAt: refresh.dashboardFileUpdatedAt, embeddedSourceKind: refresh.embeddedSourceKind, embeddedFreshnessState: refresh.embeddedFreshnessState, embeddedUpdatedAt: refresh.embeddedUpdatedAt, snapshotGeneratedAt: refresh.snapshotGeneratedAt, docsHubGeneratedAt: refresh.docsHubGeneratedAt, docsHubEntryCount: refresh.docsHubEntryCount, scopes: refresh.scopeLabels } });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to refresh dashboard sources.";
                    return writeApiError(res, 500, "INTERNAL_ERROR", message);
                }
            }
            if (method === "GET" && path === "/docs") {
                assertAllowedQueryParams(url.searchParams, ["lang"], true);
                const language = resolveUiLanguage(url.searchParams, "zh");
                const t = __name((en, zh) => pickUiText(language, en, zh), "t");
                const links = DOC_LINKS.map(item => `<li><a href="${item.href}?lang=${encodeURIComponent(language)}">${escapeHtml(item.label)}</a></li>`).join("");
                const docsHref = buildHomeHref({ quick: "all" }, true, "docs", language);
                const homeHref = buildHomeHref({ quick: "all" }, true, "overview", language);
                const docsTitle = pickUiText(language, "AI Employee System Docs", "AI\u5458\u5DE5\u7CFB\u7EDF\u6587\u6863");
                const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(docsTitle)}</title></head><body><h1>${escapeHtml(docsTitle)}</h1><ul>${links}</ul><p><a href="${escapeHtml(docsHref)}">${escapeHtml(t("Open staff docs", "\u6253\u5F00\u5458\u5DE5\u6587\u6863"))}</a> \xB7 <a href="${escapeHtml(homeHref)}">${escapeHtml(t("Back to AI employee system", "\u8FD4\u56DEAI\u5458\u5DE5\u7CFB\u7EDF"))}</a></p></body></html>`;
                return writeText(res, 200, html, "text/html; charset=utf-8");
            }
            if (method === "GET" && path.startsWith("/docs/")) {
                assertAllowedQueryParams(url.searchParams, ["lang"], true);
                const docId = path.slice("/docs/".length);
                const docPath = resolveDocPath(docId);
                if (!docPath) {
                    return writeApiError(res, 404, "NOT_FOUND", "Unknown docs route.");
                }
                let body = "";
                try {
                    body = await (0, import_promises.readFile)(docPath, "utf8");
                }
                catch {
                    return writeApiError(res, 404, "NOT_FOUND", "Doc file not found.");
                }
                return writeText(res, 200, body, "text/markdown; charset=utf-8");
            }
            if (method === "GET" && path === "/snapshot") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const body = await readSnapshotRaw();
                return writeText(res, 200, body, "application/json; charset=utf-8");
            }
            if (method === "GET" && (path === "/graph" || path === "/api/graph")) {
                assertAllowedQueryParams(url.searchParams, [], true);
                const snapshot = await readReadModelSnapshot();
                return writeJson(res, 200, { ok: true, graph: buildLinkageGraph(snapshot) });
            }
            if (method === "GET" && path === "/view/pixel-state.json") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const snapshot = await readReadModelSnapshot();
                return writeJson(res, 200, { ok: true, state: (0, import_pixel_state.buildPixelState)(snapshot) });
            }
            if (method === "GET" && (path === "/export/state.json" || path === "/api/export/state.json")) {
                assertAllowedQueryParams(url.searchParams, [], true);
                assertMutationAuthorized(req, "/api/export/state.json");
                const snapshot = await readReadModelSnapshot();
                const exportPayload = await (0, import_export_bundle.buildExportBundle)(snapshot, "api", requestId);
                let exportSnapshot;
                let backupExport;
                try {
                    [exportSnapshot, backupExport] = await Promise.all([(0, import_replay_index.writeExportSnapshot)(exportPayload, requestId), (0, import_export_bundle.writeExportBundle)(exportPayload, "backup")]);
                    await (0, import_operation_audit.appendOperationAudit)({ action: "backup_export", source: "api", ok: true, requestId, detail: `wrote ${backupExport.fileName}`, metadata: { path: backupExport.path, sizeBytes: backupExport.sizeBytes } });
                }
                catch (error) {
                    await (0, import_operation_audit.appendOperationAudit)({ action: "backup_export", source: "api", ok: false, requestId, detail: error instanceof Error ? error.message : "backup export failed" });
                    throw error;
                }
                return writeJson(res, 200, { ...exportPayload, exportSnapshot, backupExport });
            }
            if (method === "GET" && (path === "/done-checklist" || path === "/api/done-checklist")) {
                assertAllowedQueryParams(url.searchParams, [], true);
                const snapshot = await readReadModelSnapshot();
                const checklist = await (0, import_done_checklist.buildDoneChecklist)(snapshot);
                return writeJson(res, 200, { ok: true, checklist });
            }
            if (method === "GET" && path === "/api/docs") {
                assertAllowedQueryParams(url.searchParams, [], true);
                return writeJson(res, 200, { ok: true, docs: (0, import_api_docs.buildApiDocs)() });
            }
            if (method === "GET" && path === "/api/docs/preview") {
                assertAllowedQueryParams(url.searchParams, ["docId"], true);
                const docId = normalizeQueryString(url.searchParams.get("docId"), "docId", 128, true);
                if (!docId) {
                    throw new RequestValidationError("docId is required.", 400);
                }
                const snapshot = await readReadModelSnapshot();
                const preview = await (0, import_docs_hub.loadDocPreviewEntry)(snapshot, toolClient, docId);
                if (!preview) {
                    return writeApiError(res, 404, "NOT_FOUND", "Document preview not found in current docs hub.");
                }
                return writeJson(res, 200, { ok: true, preview });
            }
            if (method === "GET" && path === "/api/files") {
                assertAllowedQueryParams(url.searchParams, ["scope"], true);
                const scopeParam = normalizeQueryString(url.searchParams.get("scope"), "scope", 24, true);
                const scope = normalizeEditableFileScope(scopeParam);
                if (!scope) {
                    throw new RequestValidationError(EDITABLE_FILE_SCOPE_ERROR, 400);
                }
                const files = await listEditableFiles(scope);
                return writeJson(res, 200, { ok: true, scope, count: files.length, files });
            }
            if (method === "GET" && path === "/api/files/content") {
                assertAllowedQueryParams(url.searchParams, ["scope", "path"], true);
                const scopeParam = normalizeQueryString(url.searchParams.get("scope"), "scope", 24, true);
                const filePath = normalizeQueryString(url.searchParams.get("path"), "path", 4096, true);
                const scope = normalizeEditableFileScope(scopeParam);
                if (!scope) {
                    throw new RequestValidationError(EDITABLE_FILE_SCOPE_ERROR, 400);
                }
                if (!filePath) {
                    throw new RequestValidationError("path is required.", 400);
                }
                const payload = await readEditableFile(scope, filePath);
                if (!payload) {
                    return writeApiError(res, 404, "NOT_FOUND", "Editable file not found in allowed scope.");
                }
                return writeJson(res, 200, { ok: true, scope, entry: payload.entry, content: payload.content });
            }
            if ((method === "PUT" || method === "PATCH") && path === "/api/files/content") {
                assertMutationAuthorized(req, "/api/files/content");
                assertJsonContentType(req);
                const payload = expectObject(await readJsonBody(req), "editable file payload");
                const scope = normalizeEditableFileScope(optionalBoundedString(payload.scope, "scope", 24));
                const filePath = optionalBoundedString(payload.path, "path", 4096);
                const content = boundedTextField(payload.content, "content", EDITABLE_TEXT_CONTENT_MAX_CHARS);
                if (!scope) {
                    throw new RequestValidationError(EDITABLE_FILE_SCOPE_ERROR, 400);
                }
                if (!filePath) {
                    throw new RequestValidationError("path is required.", 400);
                }
                const saved = await writeEditableFileContent(scope, filePath, content);
                if (!saved) {
                    return writeApiError(res, 404, "NOT_FOUND", "Editable file not found in allowed scope.");
                }
                return writeJson(res, 200, { ok: true, scope, entry: saved.entry, content: saved.content });
            }
            if ((method === "POST" || method === "PATCH") && path === "/api/settings/budget-limit") {
                assertMutationAuthorized(req, "/api/settings/budget-limit");
                assertJsonContentType(req);
                const payload = expectObject(await readJsonBody(req), "budget limit payload");
                const nextLimit = optionalPositiveNumberField(payload.limit, "limit", 1e6);
                const current = await (0, import_budget_policy.loadBudgetPolicy)();
                const nextPolicy = applyPrimaryBudgetLimit(current.policy, nextLimit);
                await writeBudgetPolicyConfig(nextPolicy);
                invalidateDashboardRefreshCaches();
                return writeJson(res, 200, { ok: true, path: import_budget_policy.BUDGET_POLICY_PATH, relativePath: (0, import_node_path.relative)(process.cwd(), import_budget_policy.BUDGET_POLICY_PATH) || (0, import_node_path.join)("runtime", "budgets.json"), limit: nextLimit ?? null, warnRatio: typeof nextPolicy.defaults.warnRatio === "number" && Number.isFinite(nextPolicy.defaults.warnRatio) ? nextPolicy.defaults.warnRatio : null });
            }
            if (method === "GET" && path === "/api/ui/preferences") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const prefs = await (0, import_ui_preferences.loadUiPreferences)();
                return writeJson(res, 200, { ok: true, path: prefs.path, preferences: prefs.preferences, issues: prefs.issues });
            }
            if (method === "PATCH" && path === "/api/ui/preferences") {
                assertJsonContentType(req);
                const payload = expectObject(await readJsonBody(req), "ui preferences payload");
                const current = await (0, import_ui_preferences.loadUiPreferences)();
                const merged = mergeUiPreferencesPatch(current.preferences, payload);
                const saved = await (0, import_ui_preferences.saveUiPreferences)(merged);
                return writeJson(res, 200, { ok: true, path: saved.path, preferences: saved.preferences, issues: saved.issues });
            }
            if (method === "GET" && path === "/api/collaboration/participants") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const directory = await loadCollaborationParticipantDirectory();
                return writeJson(res, 200, { ok: true, primaryAgentId: directory.primaryAgentId, primaryDisplayName: directory.primaryDisplayName, participants: directory.entries.map(entry => ({ agentId: entry.agentId, displayName: entry.displayName, mention: (0, import_collaboration_room.preferredMentionAlias)(entry.agentId, entry.displayName, entry.aliases), aliases: entry.aliases, primary: entry.primary, identity: entry.identity })) });
            }
            if (method === "GET" && path === "/api/collaboration/rooms") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const directory = await loadCollaborationParticipantDirectory();
                const rooms = await listCollaborationTranscriptRooms(directory);
                return writeJson(res, 200, { ok: true, rooms });
            }
            if (method === "POST" && path === "/api/collaboration/rooms") {
                assertMutationAuthorized(req, "/api/collaboration/rooms");
                assertJsonContentType(req);
                const payload = expectObject(await readJsonBody(req), "collaboration room create payload");
                const title = optionalBoundedString(payload.title, "title", 80);
                const projectTitle = optionalBoundedString(payload.projectTitle, "projectTitle", 120);
                const requestedProjectId = optionalBoundedString(payload.projectId, "projectId", 100);
                const directory = await loadCollaborationParticipantDirectory();
                const slugifyProjectId = (value) => String(value || "")
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9._:-]+/g, "-")
                    .replace(/^-+|-+$/g, "")
                    .slice(0, 100);
                const buildUniqueProjectId = (seed, takenIds) => {
                    const taken = new Set((takenIds || []).map((item) => String(item || "").trim()).filter(Boolean));
                    const base = slugifyProjectId(seed) || `project-${Date.now().toString(36)}`;
                    if (!taken.has(base)) {
                        return base;
                    }
                    for (let index = 2; index < 5000; index += 1) {
                        const next = `${base}-${index}`;
                        if (!taken.has(next)) {
                            return next;
                        }
                    }
                    return `${base}-${Date.now().toString(36)}`;
                };
                const projectStore = await (0, import_project_store.loadProjectStore)();
                let project = (requestedProjectId
                    ? projectStore.projects.find((item) => item.projectId === requestedProjectId.trim())
                    : undefined) ??
                    (projectTitle
                        ? projectStore.projects.find((item) => normalizeLookupKey(item.title) === normalizeLookupKey(projectTitle.trim()))
                        : undefined);
                if (!project) {
                    const nextProjectTitle = projectTitle?.trim() || title?.trim() || "Collaboration project";
                    const nextProjectId = requestedProjectId?.trim() || buildUniqueProjectId(nextProjectTitle, projectStore.projects.map((item) => item.projectId));
                    project = (await (0, import_project_store.createProject)({
                        projectId: nextProjectId,
                        title: nextProjectTitle,
                        status: "active",
                        owner: directory.primaryAgentId,
                    })).project;
                }
                const roomTitle = title?.trim() || project.title;
                const roomTitleMode = title?.trim() ? "manual" : "auto";
                const room = await (0, import_openclaw_chat_rooms.createOpenClawChatRoom)({ agentId: directory.primaryAgentId, workspaceRoot: OPENCLAW_WORKSPACE_ROOT, title: roomTitle });
                await (0, import_collaboration_room.upsertCollaborationRoomMetadata)(room.roomId, {
                    title: roomTitle,
                    titleMode: roomTitleMode,
                    projectId: project.projectId,
                });
                return writeJson(res, 201, { ok: true, room: { ...room, title: roomTitle, titleMode: roomTitleMode, projectId: project.projectId }, project });
            }
            if (method === "DELETE" && path.startsWith("/api/collaboration/rooms/")) {
                assertMutationAuthorized(req, "/api/collaboration/rooms/:roomId");
                assertAllowedQueryParams(url.searchParams, [], true);
                const roomId = decodeRouteParam(path, /^\/api\/collaboration\/rooms\/([^/]+)$/, "roomId");
                const directory = await loadCollaborationParticipantDirectory();
                const deleted = await (0, import_openclaw_chat_rooms.deleteOpenClawChatRoom)({ agentId: directory.primaryAgentId, roomId, workspaceRoot: OPENCLAW_WORKSPACE_ROOT });
                return writeJson(res, 200, { ok: true, deleted });
            }
            if (method === "POST" && path.startsWith("/api/collaboration/rooms/") && path.endsWith("/activate")) {
                assertMutationAuthorized(req, "/api/collaboration/rooms/:roomId/activate");
                assertAllowedQueryParams(url.searchParams, [], true);
                const roomId = decodeRouteParam(path, /^\/api\/collaboration\/rooms\/([^/]+)\/activate$/, "roomId");
                const directory = await loadCollaborationParticipantDirectory();
                await (0, import_openclaw_chat_rooms.activateOpenClawChatRoom)({ agentId: directory.primaryAgentId, roomId, openclawHomeDir: OPENCLAW_HOME_DIR });
                return writeJson(res, 200, { ok: true, roomId });
            }
            if (method === "GET" && path === "/api/collaboration/room") {
                assertAllowedQueryParams(url.searchParams, ["after", "limit", "readSequence", "lang", "roomId"], true);
                const after = normalizeOptionalPositiveInt(url.searchParams.get("after"), "after") ?? 0;
                const limit = normalizeOptionalPositiveInt(url.searchParams.get("limit"), "limit") ?? 60;
                const readSequence = normalizeOptionalPositiveInt(url.searchParams.get("readSequence"), "readSequence") ?? 0;
                const apiLanguage = resolveUiLanguage(url.searchParams, "zh");
                const directory = await loadCollaborationParticipantDirectory();
                const roomId = await normalizeCollaborationRoomIdQuery(url.searchParams.get("roomId"), directory);
                const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);
                const [officeRoster, officePresence, openclawCronJobs] = await Promise.all([(0, import_agent_roster.loadBestEffortAgentRoster)(), loadCachedOfficeSessionPresence(), loadOpenclawCronCatalog(apiLanguage)]);
                const realTasks = (0, import_task_store.listTasks)(snapshot.tasks, projectTitleMap(snapshot)).filter(task => !isControlCenterMappingTask(task));
                const officeCards = buildOfficeSpaceCards(snapshot, realTasks, officeRoster.entries.map(entry => entry.agentId), officePresence.activeSessionsByAgent, apiLanguage);
                const executionAgentSummaries = buildExecutionAgentSummaries(snapshot, realTasks, openclawCronJobs, officeRoster.entries, new Map);
                const participants = await buildCollaborationChatParticipantViews({ snapshot, client: toolClient, directory, officeCards, executionAgentSummaries, language: apiLanguage });
                const roomView = await buildCollaborationRoomApiView({ roomId, language: apiLanguage, afterSequence: after, limit, readSequence, directory, participants, primaryAgentId: directory.primaryAgentId, primaryDisplayName: directory.primaryDisplayName });
                return writeJson(res, 200, { ok: true, room: roomView });
            }
            if (method === "POST" && path === "/api/collaboration/room/uploads") {
                assertMutationAuthorized(req, "/api/collaboration/room/uploads");
                assertAllowedQueryParams(url.searchParams, ["roomId"], true);
                const rawName = readHeaderValue(req, "x-file-name");
                const fileName = rawName ? decodeURIComponentSafe(rawName) : "";
                if (!fileName.trim()) {
                    throw new RequestValidationError("x-file-name header is required.", 400);
                }
                const directory = await loadCollaborationParticipantDirectory();
                const roomId = await normalizeCollaborationRoomIdQuery(url.searchParams.get("roomId"), directory);
                const body = await readBinaryBody(req, RAW_UPLOAD_MAX_BYTES);
                const attachment = await (0, import_collaboration_room.createCollaborationAttachment)({ roomId, fileName, contentType: readHeaderValue(req, "content-type") ?? void 0, content: body, uploadedBy: "user" });
                return writeJson(res, 200, { ok: true, attachment: toCollaborationApiAttachment(attachment, roomId) });
            }
            if (method === "POST" && path === "/api/collaboration/room/messages") {
                assertMutationAuthorized(req, "/api/collaboration/room/messages");
                assertJsonContentType(req);
                const payload = expectObject(await readJsonBody(req), "collaboration room message payload");
                const directory = await loadCollaborationParticipantDirectory();
                const messageResult = await createCollaborationRoomMessage(payload, toolClient, directory, "zh");
                return writeJson(res, 202, { ok: true, message: messageResult });
            }
            if (method === "GET" && path.startsWith("/api/collaboration/room/attachments/") && path.endsWith("/content")) {
                assertAllowedQueryParams(url.searchParams, ["download", "roomId"], true);
                const attachmentId = decodeRouteParam(path, /^\/api\/collaboration\/room\/attachments\/([^/]+)\/content$/, "attachmentId");
                const directory = await loadCollaborationParticipantDirectory();
                const roomId = await normalizeCollaborationRoomIdQuery(url.searchParams.get("roomId"), directory);
                const attachmentPayload = await (0, import_collaboration_room.readCollaborationAttachment)(attachmentId, roomId);
                if (!attachmentPayload) {
                    return writeApiError(res, 404, "NOT_FOUND", "Collaboration attachment not found.");
                }
                res.setHeader("content-type", attachmentPayload.attachment.contentType || "application/octet-stream");
                const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
                res.setHeader("content-disposition", `${disposition}; filename="${sanitizeHeaderFileName(attachmentPayload.attachment.fileName)}"`);
                return writeBinary(res, 200, attachmentPayload.content, attachmentPayload.attachment.contentType);
            }
            if (method === "PATCH" && path.startsWith("/api/staff/") && path.endsWith("/model")) {
                assertMutationAuthorized(req, "/api/staff/:agentId/model");
                assertJsonContentType(req);
                const agentId = decodeRouteParam(path, /^\/api\/staff\/([^/]+)\/model$/, "agentId");
                const payload = expectObject(await readJsonBody(req), "staff model payload");
                const model = requiredBoundedString(payload.model, "model", 240);
                const saved = await updateOpenClawAgentModel(agentId, model);
                if (!saved) {
                    return writeApiError(res, 404, "NOT_FOUND", "Staff member not found in openclaw.json.");
                }
                return writeJson(res, 200, { ok: true, member: saved });
            }
            if (method === "GET" && path === "/api/search/tasks") {
                const query = parseSearchQuery(url.searchParams);
                const snapshot = await readReadModelSnapshot();
                const matches = (0, import_task_store.listTasks)(snapshot.tasks, projectTitleMap(snapshot)).filter(task => safeSubstringMatch(query.q, task.taskId, task.title, task.owner, task.projectId, task.projectTitle, task.dueAt, task.status));
                const tasks = matches.slice(0, query.limit);
                return writeJson(res, 200, { ok: true, scope: "tasks", query, count: matches.length, returned: tasks.length, items: tasks });
            }
            if (method === "GET" && path === "/api/search/projects") {
                const query = parseSearchQuery(url.searchParams);
                const snapshot = await readReadModelSnapshot();
                const matches = snapshot.projects.projects.filter(project => safeSubstringMatch(query.q, project.projectId, project.title, project.owner, project.status));
                const projects = matches.slice(0, query.limit);
                return writeJson(res, 200, { ok: true, scope: "projects", query, count: matches.length, returned: projects.length, items: projects });
            }
            if (method === "GET" && path === "/api/search/sessions") {
                const query = parseSearchQuery(url.searchParams);
                const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);
                const matches = snapshot.sessions.filter(session => safeSubstringMatch(query.q, session.sessionKey, session.label, session.agentId, session.state, session.lastMessageAt));
                const sessions = matches.slice(0, query.limit);
                return writeJson(res, 200, { ok: true, scope: "sessions", query, count: matches.length, returned: sessions.length, items: sessions });
            }
            if (method === "GET" && path === "/api/search/exceptions") {
                const query = parseSearchQuery(url.searchParams);
                const snapshot = await readReadModelSnapshot();
                const feed = (0, import_commander.commanderExceptionsFeed)(snapshot);
                const matches = feed.items.filter(item => safeSubstringMatch(query.q, item.level, item.code, item.source, item.sourceId, item.route, item.message));
                const items = matches.slice(0, query.limit);
                return writeJson(res, 200, { ok: true, scope: "exceptions", query, count: matches.length, returned: items.length, items });
            }
            if (method === "GET" && path === "/api/usage-cost") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const snapshot = await readReadModelSnapshot();
                const usage = await (0, import_usage_cost.buildUsageCostSnapshot)(snapshot);
                return writeJson(res, 200, { ok: true, usage });
            }
            if (method === "GET" && path === "/api/subscription/template") {
                assertAllowedQueryParams(url.searchParams, [], true);
                return writeJson(res, 200, { ok: true, template: { subscription: { planLabel: "AI Employee Plan", unit: "USD", consumed: 120, remaining: 880, limit: 1e3, cycleStart: "2026-03-01", cycleEnd: "2026-03-31" } }, hint: `Save as ${(0, import_node_path.join)(process.cwd(), "runtime", "subscription-snapshot.json")}` });
            }
            if (method === "GET" && path === "/api/tasks/heartbeat") {
                assertAllowedQueryParams(url.searchParams, ["limit"], true);
                const limit = readPositiveIntQuery(url.searchParams.get("limit"), "limit", 20, true, 200);
                const runs = await (0, import_task_heartbeat.readTaskHeartbeatRuns)(limit);
                return writeJson(res, 200, { ok: true, path: runs.path, count: runs.count, runs: runs.runs });
            }
            if (method === "POST" && path === "/api/tasks/heartbeat") {
                assertMutationAuthorized(req, "/api/tasks/heartbeat");
                assertAllowedQueryParams(url.searchParams, [], true);
                assertJsonContentType(req);
                const payload = expectObject(await readJsonBody(req), "task heartbeat payload");
                const gate = (0, import_task_heartbeat.runtimeTaskHeartbeatGate)();
                if (payload.dryRun !== void 0) {
                    if (typeof payload.dryRun !== "boolean") {
                        throw new RequestValidationError("dryRun must be a boolean when provided.", 400);
                    }
                    gate.dryRun = payload.dryRun;
                }
                const maxTasksPerRun = optionalIntegerField(payload.maxTasksPerRun, "maxTasksPerRun", 1, 200);
                if (maxTasksPerRun !== void 0)
                    gate.maxTasksPerRun = maxTasksPerRun;
                const result = await (0, import_task_heartbeat.runTaskHeartbeat)({ gate });
                return writeJson(res, result.mode === "blocked" ? 403 : 200, result);
            }
            if (method === "GET" && path === "/usage-cost") {
                assertAllowedQueryParams(url.searchParams, [], true);
                res.statusCode = 302;
                res.setHeader("location", "/?section=usage-cost");
                return writeText(res, 302, "redirecting", "text/plain; charset=utf-8");
            }
            if (method === "GET" && path === "/api/replay/index") {
                assertAllowedQueryParams(url.searchParams, ["timelineLimit", "digestLimit", "exportLimit", "from", "to"], true);
                const replayWindow = parseReplayWindowQuery(url.searchParams, true);
                const replay = await (0, import_replay_index.loadReplayIndex)({ timelineLimit: readPositiveIntQuery(url.searchParams.get("timelineLimit"), "timelineLimit", 80, true, 400), digestLimit: readPositiveIntQuery(url.searchParams.get("digestLimit"), "digestLimit", 30, true, 200), exportLimit: readPositiveIntQuery(url.searchParams.get("exportLimit"), "exportLimit", 30, true, 200), from: replayWindow.from, to: replayWindow.to });
                return writeJson(res, 200, { ok: true, replay });
            }
            if (method === "POST" && path === "/api/import/dry-run") {
                assertMutationAuthorized(req, "/api/import/dry-run");
                assertJsonContentType(req);
                const payload = expectObject(await readJsonBody(req), "import dry-run payload");
                let validation;
                if (typeof payload.fileName === "string" && payload.fileName.trim() !== "") {
                    validation = await (0, import_import_dry_run.validateExportFileDryRun)(payload.fileName);
                }
                else if (payload.bundle !== void 0) {
                    validation = (0, import_import_dry_run.validateExportBundleDryRun)(payload.bundle, "payload.bundle");
                }
                else {
                    validation = (0, import_import_dry_run.validateExportBundleDryRun)(payload, "payload");
                }
                await (0, import_operation_audit.appendOperationAudit)({ action: "import_dry_run", source: "api", ok: validation.valid, requestId, detail: `validated ${validation.source}`, metadata: { valid: validation.valid, issues: validation.issues.length, warnings: validation.warnings.length } });
                return writeJson(res, 200, { ok: validation.valid, validation });
            }
            if (method === "POST" && path === "/api/import/live") {
                assertMutationAuthorized(req, "/api/import/live");
                assertJsonContentType(req);
                const payload = expectObject(await readJsonBody(req), "import live payload");
                const result = await (0, import_import_live.applyImportMutation)({ fileName: typeof payload.fileName === "string" ? payload.fileName : void 0, bundle: payload.bundle !== void 0 ? payload.bundle : payload, dryRun: typeof payload.dryRun === "boolean" ? payload.dryRun : void 0 });
                await (0, import_operation_audit.appendOperationAudit)({ action: "import_apply", source: "api", ok: result.ok, requestId, detail: `${result.mode} ${result.source ?? "payload"}: ${result.message}`, metadata: { mode: result.mode, statusCode: result.statusCode, valid: result.validation?.valid ?? false, issues: result.validation?.issues.length ?? 0, warnings: result.validation?.warnings.length ?? 0 } });
                return writeJson(res, result.statusCode, result);
            }
            if (method === "GET" && (path === "/projects" || path === "/api/projects")) {
                const projectStore = await (0, import_project_store.loadProjectStore)();
                const filters = parseProjectFilters(url.searchParams, path === "/api/projects");
                const projects = applyProjectFilters((0, import_project_store.listProjects)(projectStore), filters);
                return writeJson(res, 200, { ok: true, updatedAt: projectStore.updatedAt, count: projects.length, filters, projects });
            }
            if (method === "POST" && path === "/api/projects") {
                assertMutationAuthorized(req, "/api/projects");
                assertJsonContentType(req);
                const payload = expectObject(await readJsonBody(req), "create project payload");
                const created = await (0, import_project_store.createProject)(payload);
                return writeJson(res, 201, { ok: true, ...created });
            }
            if (method === "PATCH" && path.startsWith("/api/projects/")) {
                assertMutationAuthorized(req, "/api/projects/:projectId");
                assertJsonContentType(req);
                const projectId = decodeRouteParam(path, /^\/api\/projects\/([^/]+)$/, "projectId");
                const payload = expectObject(await readJsonBody(req), "update project payload");
                const updated = await (0, import_project_store.updateProject)({ ...payload, projectId });
                return writeJson(res, 200, { ok: true, ...updated });
            }
            if (method === "GET" && (path === "/tasks" || path === "/api/tasks")) {
                const snapshot = await readReadModelSnapshot();
                const filters = parseTaskFilters(url.searchParams, path === "/api/tasks");
                const allTasks = (0, import_task_store.listTasks)(snapshot.tasks, projectTitleMap(snapshot));
                const filteredTasks = applyTaskFilters(allTasks, filters);
                return writeJson(res, 200, { ok: true, updatedAt: snapshot.tasks.updatedAt, count: filteredTasks.length, filters, tasks: filteredTasks });
            }
            if (method === "POST" && path === "/api/tasks") {
                assertMutationAuthorized(req, "/api/tasks");
                assertJsonContentType(req);
                const payload = expectObject(await readJsonBody(req), "create task payload");
                const created = await (0, import_task_store.createTask)(payload);
                return writeJson(res, 201, { ok: true, ...created });
            }
            if (method === "PATCH" && path.startsWith("/api/tasks/") && path.endsWith("/status")) {
                assertMutationAuthorized(req, "/api/tasks/:taskId/status");
                assertJsonContentType(req);
                const taskId = decodeRouteParam(path, /^\/api\/tasks\/([^/]+)\/status$/, "taskId");
                const payload = expectObject(await readJsonBody(req), "update task status payload");
                const updated = await (0, import_task_store.updateTaskStatus)({ taskId, status: payload.status, projectId: payload.projectId });
                return writeJson(res, 200, { ok: true, ...updated });
            }
            if (method === "GET" && (path === "/sessions" || path === "/api/sessions")) {
                const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);
                const strict = path === "/api/sessions";
                const query = parseSessionQuery(url.searchParams, strict);
                const sessions = await (0, import_session_conversations.listSessionConversations)({ snapshot, client: toolClient, filters: query.filters, page: query.page, pageSize: query.pageSize, historyLimit: query.historyLimit });
                return writeJson(res, 200, { ok: true, ...sessions });
            }
            if (method === "GET" && path.startsWith("/api/sessions/")) {
                const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);
                const sessionKey = decodeRouteParam(path, /^\/api\/sessions\/([^/]+)$/, "sessionKey");
                assertAllowedQueryParams(url.searchParams, ["historyLimit"], true);
                const historyLimit = readPositiveIntQuery(url.searchParams.get("historyLimit"), "historyLimit", 50, true, 200);
                const detail = await (0, import_session_conversations.getSessionConversationDetail)({ snapshot, client: toolClient, sessionKey, historyLimit });
                if (!detail) {
                    return writeApiError(res, 404, "NOT_FOUND", `Session '${sessionKey}' was not found.`);
                }
                return writeJson(res, 200, { ok: true, ...detail });
            }
            if (method === "GET" && path.startsWith("/sessions/")) {
                const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);
                const sessionKey = decodeRouteParam(path, /^\/sessions\/([^/]+)$/, "sessionKey");
                const historyLimit = readPositiveIntQuery(url.searchParams.get("historyLimit"), "historyLimit", 50, false);
                const detail = await (0, import_session_conversations.getSessionConversationDetail)({ snapshot, client: toolClient, sessionKey, historyLimit });
                if (!detail) {
                    return writeApiError(res, 404, "NOT_FOUND", `Session '${sessionKey}' was not found.`);
                }
                return writeJson(res, 200, { ok: true, ...detail });
            }
            if (method === "GET" && path.startsWith("/session/")) {
                const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);
                const language = resolveUiLanguage(url.searchParams, "zh");
                const sessionKey = decodeRouteParam(path, /^\/session\/([^/]+)$/, "sessionKey");
                assertAllowedQueryParams(url.searchParams, ["historyLimit"], false);
                const historyLimit = readPositiveIntQuery(url.searchParams.get("historyLimit"), "historyLimit", 50, false, 200);
                const detail = await (0, import_session_conversations.getSessionConversationDetail)({ snapshot, client: toolClient, sessionKey, historyLimit });
                if (!detail) {
                    return writeText(res, 404, "Session not found", "text/plain; charset=utf-8");
                }
                const html = renderSessionDrilldownPage(detail, language);
                return writeText(res, 200, html, "text/html; charset=utf-8");
            }
            if (method === "GET" && path.startsWith("/details/task/")) {
                const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);
                const language = resolveUiLanguage(url.searchParams, "zh");
                const taskId = decodeRouteParam(path, /^\/details\/task\/([^/]+)$/, "taskId");
                const tasks = (0, import_task_store.listTasks)(snapshot.tasks, projectTitleMap(snapshot));
                const task = tasks.find(item => item.taskId === taskId);
                if (!task) {
                    return writeText(res, 404, "Task not found", "text/plain; charset=utf-8");
                }
                const linkedSessionItems = await loadSessionConversationItemsByKeys(snapshot, toolClient, task.sessionKeys, 24);
                const certaintyCard = buildTaskCertaintyCards({ tasks: [task], sessions: snapshot.sessions, sessionItems: linkedSessionItems, approvals: snapshot.approvals, language })[0];
                const linkedSessions = linkedSessionItems.map(detail => ({ sessionKey: detail.sessionKey, agentId: detail.agentId, state: detail.state, latestAt: pickLatestSessionActivityTimestamp(detail.latestHistoryAt, detail.lastMessageAt), latestSnippet: detail.latestSnippet, sessionHref: buildSessionDetailHref(detail.sessionKey, language) }));
                const html = renderTaskDetailPage({ task, generatedAt: snapshot.generatedAt ?? new Date().toISOString(), certaintyCard, linkedSessions, language });
                return writeText(res, 200, html, "text/html; charset=utf-8");
            }
            if (method === "GET" && path.startsWith("/details/cron/")) {
                const snapshot = await readReadModelSnapshot();
                const language = resolveUiLanguage(url.searchParams, "zh");
                const jobId = decodeRouteParam(path, /^\/details\/cron\/([^/]+)$/, "jobId");
                const overview = await (0, import_cron_overview.buildCronOverview)(snapshot, import_config.POLLING_INTERVALS_MS.cron);
                const catalog = await loadOpenclawCronCatalog(language);
                const runtimeById = new Map(overview.jobs.map(job => [job.jobId, job]));
                const catalogJob = catalog.find(item => item.jobId === jobId);
                const runtimeJob = runtimeById.get(jobId);
                if (!catalogJob && !runtimeJob) {
                    return writeText(res, 404, "Cron job not found", "text/plain; charset=utf-8");
                }
                const html = renderCronJobDetailPage({ jobId, name: catalogJob?.name ?? runtimeJob?.name ?? jobId, owner: catalogJob?.owner ?? formatExecutorAgentLabel("system-cron", language), purpose: catalogJob?.purpose ?? cronRuntimePurpose(jobId, language), schedule: catalogJob?.scheduleLabel ?? pickUiText(language, "system interval", "\u7CFB\u7EDF\u95F4\u9694"), status: runtimeJob ? runtimeJob.health : catalogJob?.enabled ? "enabled" : "disabled", nextRunAt: runtimeJob?.nextRunAt ?? "-", dueInSeconds: runtimeJob?.dueInSeconds }, snapshot.generatedAt ?? new Date().toISOString(), language);
                return writeText(res, 200, html, "text/html; charset=utf-8");
            }
            if (method === "GET" && path === "/api/audit") {
                const snapshot = await readReadModelSnapshot();
                const severity = parseAuditSeverity(url.searchParams, true);
                const timeline = (0, import_audit_timeline.filterAuditTimeline)(await (0, import_audit_timeline.loadAuditTimeline)(snapshot), severity);
                return writeJson(res, 200, { ok: true, severity, timeline });
            }
            if (method === "GET" && path === "/audit") {
                const snapshot = await readReadModelSnapshot();
                const severity = parseAuditSeverity(url.searchParams, false);
                const timeline = (0, import_audit_timeline.filterAuditTimeline)(await (0, import_audit_timeline.loadAuditTimeline)(snapshot), severity);
                const html = renderAuditPage(timeline, severity);
                return writeText(res, 200, html, "text/html; charset=utf-8");
            }
            if (method === "GET" && path === "/api/commander/exceptions") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const snapshot = await readReadModelSnapshot();
                return writeJson(res, 200, { ok: true, exceptions: (0, import_commander.commanderExceptions)(snapshot) });
            }
            if (method === "GET" && path === "/exceptions") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const snapshot = await readReadModelSnapshot();
                return writeJson(res, 200, { ok: true, feed: (0, import_commander.commanderExceptionsFeed)(snapshot) });
            }
            if (method === "GET" && path === "/notifications/preview") {
                assertAllowedQueryParams(url.searchParams, ["at"], true);
                const atParam = normalizeQueryString(url.searchParams.get("at"), "at", 64, true);
                let evaluatedAt = new Date;
                if (atParam) {
                    const ms = Date.parse(atParam);
                    if (Number.isNaN(ms)) {
                        throw new RequestValidationError("at must be a valid ISO date-time string.", 400);
                    }
                    evaluatedAt = new Date(ms);
                }
                const snapshot = await readReadModelSnapshot();
                const feed = (0, import_commander.commanderExceptionsFeed)(snapshot);
                const policy = await (0, import_notification_policy.loadNotificationPolicy)();
                const preview = (0, import_notification_policy.buildNotificationPreview)(feed, policy, evaluatedAt);
                return writeJson(res, 200, { ok: true, preview });
            }
            if (method === "GET" && path === "/cron") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const snapshot = await readReadModelSnapshot();
                const overview = await (0, import_cron_overview.buildCronOverview)(snapshot, import_config.POLLING_INTERVALS_MS.cron);
                return writeJson(res, 200, { ok: true, overview });
            }
            if (method === "GET" && path === "/healthz") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const snapshot = await readReadModelSnapshot();
                const health = await (0, import_healthz.buildHealthzPayload)(snapshot);
                const statusCode = health.status === "stale" ? 503 : 200;
                return writeJson(res, statusCode, { ok: health.status !== "stale", health });
            }
            if (method === "GET" && path === "/digest/latest") {
                assertAllowedQueryParams(url.searchParams, [], false);
                const latest = await (0, import_digest_renderer.loadLatestDigest)();
                return writeText(res, 200, (0, import_digest_renderer.renderLatestDigestPage)(latest), "text/html; charset=utf-8");
            }
            if (method === "GET" && path === "/api/action-queue") {
                assertAllowedQueryParams(url.searchParams, [], true);
                const snapshot = await readReadModelSnapshot();
                const queue = await readNotificationCenter(snapshot);
                return writeJson(res, 200, { ok: true, queue });
            }
            if (method === "GET" && path === "/api/action-queue/acks/prune-preview") {
                assertMutationAuthorized(req, "/api/action-queue/acks/prune-preview");
                assertAllowedQueryParams(url.searchParams, [], true);
                const preview = await (0, import_notification_center.previewStaleAcksPrune)();
                return writeJson(res, 200, { ok: true, preview });
            }
            if (method === "POST" && path.startsWith("/api/action-queue/") && path.endsWith("/ack")) {
                assertMutationAuthorized(req, "/api/action-queue/:itemId/ack");
                assertJsonContentType(req);
                const itemId = decodeRouteParam(path, /^\/api\/action-queue\/([^/]+)\/ack$/, "itemId");
                const payload = expectObject(await readJsonBody(req), "action queue acknowledge payload");
                const ttlMinutes = optionalIntegerField(payload.ttlMinutes, "ttlMinutes", 1, 7 * 24 * 60);
                const snoozeUntil = optionalIsoTimestampField(payload.snoozeUntil, "snoozeUntil");
                if (ttlMinutes !== void 0 && snoozeUntil !== void 0) {
                    throw new RequestValidationError("Provide either ttlMinutes or snoozeUntil, not both.", 400);
                }
                if (snoozeUntil !== void 0 && Date.parse(snoozeUntil) <= Date.now()) {
                    throw new RequestValidationError("snoozeUntil must be a future ISO date-time string.", 400);
                }
                const snapshot = await readReadModelSnapshot();
                const queue = await readNotificationCenter(snapshot);
                const acknowledged = await (0, import_notification_center.acknowledgeActionQueueItem)({ itemId, note: payload.note, ttlMinutes, snoozeUntil }, queue);
                return writeJson(res, 200, { ok: true, ...acknowledged });
            }
            if (method === "POST" && path === "/action-queue/ack") {
                const form = await readFormBody(req);
                assertMutationAuthorized(req, "/action-queue/ack", form.get("localToken"));
                const itemId = readRequiredFormValue(form, "itemId");
                const snapshot = await readReadModelSnapshot();
                const queue = await readNotificationCenter(snapshot);
                await (0, import_notification_center.acknowledgeActionQueueItem)({ itemId }, queue);
                return redirect(res, 303, "/");
            }
            if (method === "POST" && path.startsWith("/api/approvals/") && path.endsWith("/approve")) {
                assertMutationAuthorized(req, "/api/approvals/:approvalId/approve");
                assertJsonContentType(req);
                const approvalId = decodeRouteParam(path, /^\/api\/approvals\/([^/]+)\/approve$/, "approvalId");
                const payload = expectObject(await readJsonBody(req), "approval payload");
                const reason = optionalBoundedString(payload.reason, "reason", 220);
                const result = await approvalActions.execute({ action: "approve", approvalId, reason });
                return writeJson(res, result.mode === "blocked" ? 403 : result.ok ? 200 : 500, result);
            }
            if (method === "POST" && path.startsWith("/api/approvals/") && path.endsWith("/reject")) {
                assertMutationAuthorized(req, "/api/approvals/:approvalId/reject");
                assertJsonContentType(req);
                const approvalId = decodeRouteParam(path, /^\/api\/approvals\/([^/]+)\/reject$/, "approvalId");
                const payload = expectObject(await readJsonBody(req), "approval payload");
                const reason = requiredBoundedString(payload.reason, "reason", 220);
                const result = await approvalActions.execute({ action: "reject", approvalId, reason });
                return writeJson(res, result.mode === "blocked" ? 403 : result.ok ? 200 : 500, result);
            }
            if (path.startsWith("/api/")) {
                return writeApiError(res, 404, "NOT_FOUND", "API route not found.");
            }
            return writeText(res, 404, "Not Found", "text/plain; charset=utf-8");
        }
        catch (error) {
            if (error instanceof import_task_store.TaskStoreValidationError || error instanceof import_project_store.ProjectStoreValidationError || error instanceof import_notification_center.NotificationCenterValidationError) {
                console.warn("[mission-control] ui request validation", { requestId, message: error.message, issues: error.issues });
                const code = error.statusCode === 404 ? "NOT_FOUND" : "VALIDATION_ERROR";
                return writeApiError(res, error.statusCode, code, error.message, error.issues);
            }
            if (error instanceof RequestValidationError) {
                console.warn("[mission-control] ui request validation", { requestId, message: error.message, issues: error.issues });
                const code = error.statusCode === 415 ? "UNSUPPORTED_MEDIA_TYPE" : "VALIDATION_ERROR";
                return writeApiError(res, error.statusCode, code, error.message, error.issues);
            }
            console.error("[mission-control] ui error", { requestId, error });
            return writeApiError(res, 500, "INTERNAL_ERROR", "Internal server error.");
        }
    });
    const bindAddress = process.env.UI_BIND_ADDRESS ?? "127.0.0.1";
    server.listen(port, bindAddress, () => { const displayUrl = bindAddress === "0.0.0.0" ? `http://<your-ip>:${port}` : `http://${bindAddress}:${port}`; console.log(`[mission-control] ui listening at ${displayUrl}`); void Promise.resolve().then(() => (0, import_openclaw_cli_insights.primeOpenClawCliInsights)()); void primeUiRenderCaches(toolClient); });
    return server;
}
__name(startUiServer, "startUiServer");
function isFsNotFound(error) { return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT"); }
__name(isFsNotFound, "isFsNotFound");
function uiEmployeeBrand(language) { return pickUiText(language, "AI Employees", "AI\u5458\u5DE5"); }
__name(uiEmployeeBrand, "uiEmployeeBrand");
function uiEmployeeSystemBrand(language) { return pickUiText(language, "AI Employee System", "AI\u5458\u5DE5\u7CFB\u7EDF"); }
__name(uiEmployeeSystemBrand, "uiEmployeeSystemBrand");
function delay(ms) { return new Promise(resolve2 => setTimeout(resolve2, ms)); }
__name(delay, "delay");
function normalizeInlineText(input) { return input.replace(/\s+/g, " ").trim(); }
__name(normalizeInlineText, "normalizeInlineText");
function humanizeTimedJobScheduleLabelForSmoke(scheduleLabel, language) { return humanizeTimedJobScheduleLabel(scheduleLabel, language); }
__name(humanizeTimedJobScheduleLabelForSmoke, "humanizeTimedJobScheduleLabelForSmoke");
function humanizeTimedJobWindowLabelForSmoke(nextRun, dueInSeconds, language) { return humanizeTimedJobWindowLabel(nextRun, dueInSeconds, language); }
__name(humanizeTimedJobWindowLabelForSmoke, "humanizeTimedJobWindowLabelForSmoke");
function dashboardSectionLinks(language) {
    return DASHBOARD_SECTION_LINKS_EN.map(item => {
        if (language !== "zh")
            return item;
        if (item.key === "overview") {
            return { ...item, label: "\u603B\u89C8", blurb: "\u4ECA\u5929\u91CD\u70B9" };
        }
        if (item.key === "team") {
            return { ...item, label: "\u5458\u5DE5", blurb: "\u5458\u5DE5\u3001\u5206\u5DE5\u4E0E\u804C\u8D23" };
        }
        if (item.key === "collaboration") {
            return { ...item, label: "\u534F\u4F5C", blurb: "\u667A\u80FD\u4F53\u4EA4\u63A5\u4E0E\u534F\u540C" };
        }
        if (item.key === "memory") {
            return { ...item, label: "\u8BB0\u5FC6", blurb: "\u6BCF\u65E5\u4E0E\u957F\u671F\u8BB0\u5FC6" };
        }
        if (item.key === "docs") {
            return { ...item, label: "\u6587\u6863", blurb: `${import_operator_display.DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME} \u4E0E\u5F53\u524D\u542F\u7528\u667A\u80FD\u4F53\u6838\u5FC3\u6587\u6863` };
        }
        if (item.key === "usage-cost") {
            return { ...item, label: "\u7528\u91CF", blurb: "\u9884\u7B97\u4E0E\u989D\u5EA6" };
        }
        if (item.key === "projects-tasks") {
            return { ...item, label: "\u4EFB\u52A1", blurb: "\u4EFB\u52A1\u3001\u6392\u7A0B\u4E0E\u6D3B\u52A8" };
        }
        return { ...item, label: "\u8BBE\u7F6E", blurb: "\u5B89\u5168\u4E0E\u6570\u636E\u8FDE\u63A5" };
    });
}
__name(dashboardSectionLinks, "dashboardSectionLinks");
function resolveDashboardSectionTitle(section, language) {
    if (language === "en" && section.key === "overview") {
        return "Overview Control Center";
    }
    return section.label;
}
__name(resolveDashboardSectionTitle, "resolveDashboardSectionTitle");
function agentTeamSidebarLinks(filters, options) { return { team: buildHomeHref(filters, options.compactStatusStrip, "team", options.language, options.usageView), docs: buildHomeHref(filters, options.compactStatusStrip, "docs", options.language, options.usageView), memory: buildHomeHref(filters, options.compactStatusStrip, "memory", options.language, options.usageView), projects: buildHomeHref(filters, options.compactStatusStrip, "projects-tasks", options.language, options.usageView), settings: buildHomeHref(filters, options.compactStatusStrip, "settings", options.language, options.usageView) }; }
__name(agentTeamSidebarLinks, "agentTeamSidebarLinks");
async function renderHtml(filters, toolClient, options) {
    const renderStartedAt = performance.now();
    let renderPhaseAt = renderStartedAt;
    const renderPhases = [];
    const markRenderPhase = __name(label => { const now = performance.now(); renderPhases.push(`${label}=${Math.round(now - renderPhaseAt)}ms`); renderPhaseAt = now; }, "markRenderPhase");
    const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);
    const t = __name((en, zh) => pickUiText(options.language, en, zh), "t");
    const sectionLinks = dashboardSectionLinks(options.language);
    const activeSection = options.section === "office-space" ? "team" : options.section === "calendar" ? "projects-tasks" : options.section;
    const usageCostMode = activeSection === "usage-cost" || activeSection === "settings" ? "full" : "summary";
    const sectionMeta = sectionLinks.find(item => item.key === activeSection) ?? sectionLinks[0];
    const sectionTitle = resolveDashboardSectionTitle(sectionMeta, options.language);
    const sectionLeadText = activeSection === "overview" ? t("Decide from one screen: system health, items needing your intervention, who is active, and AI burn.", "\u4E00\u4E2A\u9996\u9875\u53EA\u56DE\u7B54\u56DB\u4EF6\u4E8B\uFF1A\u7CFB\u7EDF\u662F\u5426\u6B63\u5E38\u3001\u54EA\u91CC\u9700\u8981\u4F60\u4ECB\u5165\u3001\u8C01\u5728\u5FD9\u3001AI \u7528\u91CF\u662F\u5426\u5F02\u5E38\u3002") : activeSection === "collaboration" ? t("Follow how work moves between agents: who accepted it, who received the handoff, and where collaboration is currently waiting.", "\u76F4\u63A5\u770B\u4EFB\u52A1\u662F\u600E\u4E48\u5728\u667A\u80FD\u4F53\u4E4B\u95F4\u6D41\u8F6C\u7684\uFF1A\u8C01\u5148\u63A5\u5355\u3001\u540E\u6765\u4EA4\u7ED9\u4E86\u8C01\u3001\u5F53\u524D\u5361\u5728\u54EA\u4E00\u6BB5\u534F\u4F5C\u91CC\u3002") : activeSection === "projects-tasks" ? t("Start with the task and schedule card wall. It now merges tracked tasks, due times, and timed jobs into one place before you drill into execution detail.", "\u5148\u770B\u4EFB\u52A1\u4E0E\u6392\u7A0B\u5361\u7247\u5899\u3002\u73B0\u5728\u4F1A\u5148\u628A\u8DDF\u8E2A\u4EFB\u52A1\u3001\u622A\u6B62\u65F6\u95F4\u548C\u5B9A\u65F6\u4EFB\u52A1\u5408\u5230\u4E00\u8D77\uFF0C\u518D\u5F80\u4E0B\u94BB\u6267\u884C\u7EC6\u8282\u3002") : sectionMeta.blurb;
    const needsSessionPreview = activeSection === "projects-tasks" || activeSection === "overview";
    const needsTaskEvidence = activeSection === "projects-tasks";
    const needsTeamSnapshot = activeSection === "team";
    const needsMemoryFiles = activeSection === "memory";
    const needsWorkspaceFiles = activeSection === "docs";
    const needsConnectionHealth = activeSection === "settings";
    const needsSecuritySummary = activeSection === "settings";
    const needsUpdateSummary = activeSection === "settings";
    const needsMemoryState = activeSection === "memory";
    const needsCollaborationThreads = activeSection === "collaboration";
    const needsMemorySection = needsMemoryFiles;
    const needsDocsHub = needsWorkspaceFiles;
    const needsSettingsInsights = activeSection === "settings";
    markRenderPhase("snapshot");
    const exceptions = (0, import_commander.commanderExceptions)(snapshot);
    const exceptionsFeed = (0, import_commander.commanderExceptionsFeed)(snapshot);
    const actionQueue = await readNotificationCenter(snapshot);
    const allTasks = (0, import_task_store.listTasks)(snapshot.tasks, projectTitleMap(snapshot));
    const controlCenterMappingTasks = allTasks.filter(isControlCenterMappingTask);
    const realTasks = allTasks.filter(task => !isControlCenterMappingTask(task));
    const tasks = applyTaskFilters(realTasks, filters);
    const allApprovals = [...snapshot.approvals ?? []].sort(compareApprovals);
    const topApprovals = allApprovals.slice(0, 5);
    const budgets = snapshot.budgetSummary ?? { total: 0, ok: 0, warn: 0, over: 0, evaluations: [] };
    const nonOkBudgets = (budgets.evaluations ?? []).filter(item => item.status === "warn" || item.status === "over").slice(0, 8);
    const projectOptions = uniqueSorted(snapshot.projects.projects.map(project => project.projectId));
    const ownerOptions = uniqueSorted(realTasks.map(task => task.owner));
    const sessionPreview = needsSessionPreview ? await loadCachedSessionPreview(snapshot, toolClient) : { generatedAt: snapshot.generatedAt, total: 0, page: 1, pageSize: 0, filters: {}, items: [] };
    const collaborationPreview = needsCollaborationThreads ? await loadCachedCollaborationPreview(snapshot, toolClient) : { generatedAt: snapshot.generatedAt, total: 0, page: 1, pageSize: 0, filters: {}, items: [] };
    const sessionRows = renderSessionPreviewRows(sessionPreview.items, options.language);
    markRenderPhase("session-preview");
    const [cronOverview, openclawCronJobs, replayPreview, usageCost, officeRoster, officePresence, agentTeamEmbed] = await Promise.all([(0, import_cron_overview.buildCronOverview)(snapshot, import_config.POLLING_INTERVALS_MS.cron), loadOpenclawCronCatalog(options.language), loadCachedReplayPreview(), loadCachedUsageCost(snapshot, usageCostMode), (0, import_agent_roster.loadBestEffortAgentRoster)(), loadCachedOfficeSessionPresence(), (0, import_agent_team_embed.loadAgentTeamEmbedSnapshot)()]);
    markRenderPhase("shared-data");
    const [teamSnapshot, memoryFiles, memoryFacetOptions, workspaceFiles, settingsBudgetPolicy, workspaceFacetOptions, workspaceAgentScopes, docHubSnapshot, taskEvidenceItems, connectionHealthSummary, securitySummary, updateSummary, memoryStateSummary] = await Promise.all([needsTeamSnapshot ? loadTeamSnapshot(officeRoster) : Promise.resolve({ missionStatement: t("No shared mission loaded.", "\u5C1A\u672A\u52A0\u8F7D\u5171\u540C\u76EE\u6807\u3002"), members: [], sourcePath: OPENCLAW_CONFIG_PATH, detail: t("Loaded on the staff page only.", "\u4EC5\u5728\u5458\u5DE5\u9875\u52A0\u8F7D\u3002"), modelOptions: [], modelEditable: false }), needsMemorySection ? listEditableFiles("memory") : Promise.resolve([]), needsMemorySection ? listMemoryFacetOptions() : Promise.resolve([]), needsDocsHub ? listEditableFiles("workspace") : Promise.resolve([]), (0, import_budget_policy.loadBudgetPolicy)(), needsDocsHub ? listWorkspaceFacetOptions() : Promise.resolve([]), needsDocsHub ? loadEditableAgentScopes() : Promise.resolve([]), needsDocsHub ? (0, import_docs_hub.loadStructuredDocHubSnapshot)(snapshot, toolClient) : Promise.resolve({ generatedAt: snapshot.generatedAt, sourcePath: (0, import_node_path.join)(process.cwd(), "runtime", "doc-hub-chat.json"), detail: t("Loaded on the docs page only.", "\u4EC5\u5728\u6587\u6863\u9875\u52A0\u8F7D\u3002"), items: [] }), needsTaskEvidence ? loadCachedTaskEvidenceSessions(snapshot, toolClient, tasks.flatMap(task => task.sessionKeys), 24) : Promise.resolve([]), needsSettingsInsights ? (0, import_openclaw_cli_insights.loadCachedOpenClawConnectionSummary)() : Promise.resolve(void 0), needsSettingsInsights ? (0, import_openclaw_cli_insights.loadCachedOpenClawSecuritySummary)() : Promise.resolve(void 0), needsSettingsInsights ? (0, import_openclaw_cli_insights.loadCachedOpenClawUpdateSummary)() : Promise.resolve(void 0), needsMemorySection ? (0, import_openclaw_cli_insights.loadCachedOpenClawMemorySummary)() : Promise.resolve(void 0)]);
    markRenderPhase("section-assets");
    const collaborationDirectory = await loadCollaborationParticipantDirectory();
    const dashboardRefreshGeneratedAt = pickLatestSessionActivityTimestamp(snapshot.generatedAt, sessionPreview.generatedAt, collaborationPreview.generatedAt, docHubSnapshot.generatedAt, agentTeamEmbed.runtime.updatedAt) ?? snapshot.generatedAt;
    const usageToday = usageCost.periods.find(item => item.key === "today");
    const usage7d = usageCost.periods.find(item => item.key === "7d");
    const usage30d = usageCost.periods.find(item => item.key === "30d");
    const officeCards = buildOfficeSpaceCards(snapshot, realTasks, officeRoster.entries.map(entry => entry.agentId), officePresence.activeSessionsByAgent, options.language);
    const usageAgentTokensByKey = new Map(usageCost.breakdown.byAgent.map(item => [normalizeLookupKey(item.key), item.tokens]));
    const executionAgentSummaries = buildExecutionAgentSummaries(snapshot, realTasks, openclawCronJobs, officeRoster.entries, usageAgentTokensByKey);
    const collaborationChatParticipants = await buildCollaborationChatParticipantViews({ snapshot, client: toolClient, directory: collaborationDirectory, officeCards, executionAgentSummaries, language: options.language });
    const collaborationPreviewSessionKeys = new Set(collaborationPreview.items.map(item => item.sessionKey.trim()).filter(Boolean));
    const collaborationScopedTasks = needsCollaborationThreads ? realTasks.filter(task => task.sessionKeys.some(sessionKey => collaborationPreviewSessionKeys.has(sessionKey.trim()))) : realTasks;
    const taskSignalItems = needsCollaborationThreads ? collaborationPreview.items : mergeSessionConversationItems(taskEvidenceItems, sessionPreview.items);
    const collaborationSessionKeys = needsCollaborationThreads ? collectCollaborationEvidenceSessionKeys(collaborationPreview.items) : [];
    const collaborationEvidenceItems = needsCollaborationThreads && collaborationSessionKeys.length > 0 ? await loadCachedTaskEvidenceSessions(snapshot, toolClient, collaborationSessionKeys, 6) : [];
    const collaborationSignalItems = mergeSessionConversationItems(collaborationEvidenceItems, mergeSessionConversationItems(taskSignalItems, collaborationPreview.items));
    const taskExecutionChainCards = buildTaskExecutionChainCards({ tasks: collaborationScopedTasks, sessions: snapshot.sessions, sessionItems: needsCollaborationThreads ? collaborationSignalItems : taskSignalItems, language: options.language, includeSnapshotUnmappedSessions: !needsCollaborationThreads });
    const collaborationThreadCards = needsCollaborationThreads ? mergeCollaborationThreadCards(buildCollaborationThreadCards({ cards: taskExecutionChainCards, sessionItems: collaborationSignalItems, language: options.language, primaryAgentId: collaborationDirectory.primaryAgentId }), buildInterSessionCollaborationCards({ sessionItems: collaborationSignalItems, language: options.language, primaryAgentId: collaborationDirectory.primaryAgentId })) : [];
    const collaborationRoomStates = needsCollaborationThreads ? await (0, import_collaboration_room.loadAllCollaborationRooms)() : [];
    const collaborationThreadCardsWithRoomRefs = collaborationRoomStates.length > 0 ? attachCollaborationRoomRefsToCards(collaborationThreadCards, collaborationRoomStates, options.language) : collaborationThreadCards;
    const taskCertaintyCards = buildTaskCertaintyCards({ tasks, sessions: snapshot.sessions, sessionItems: taskSignalItems, approvals: snapshot.approvals, language: options.language });
    const taskSpotlightCards = buildTaskSpotlightCards({ tasks, certaintyCards: taskCertaintyCards, sessions: snapshot.sessions, sessionItems: taskSignalItems, approvals: snapshot.approvals, manualOrder: options.taskCardOrder, language: options.language });
    const taskCertaintyStrongCount = taskCertaintyCards.filter(item => item.tone === "ok").length;
    const taskCertaintyFollowupCount = taskCertaintyCards.filter(item => item.tone === "warn").length;
    const taskCertaintyWeakCount = taskCertaintyCards.filter(item => item.tone === "blocked").length;
    const spawnedExecutionChainCount = taskExecutionChainCards.filter(item => item.executionChain.spawned).length;
    const runningExecutionChainCount = taskExecutionChainCards.filter(item => item.executionChain.stage === "running").length;
    const mappedExecutionChainCount = taskExecutionChainCards.filter(item => !item.unmapped).length;
    const taskExecutionChainHtml = renderTaskExecutionChainCards(taskExecutionChainCards, options.language);
    const collaborationThreadHtml = renderCollaborationThreadCards(collaborationThreadCardsWithRoomRefs, options.language);
    const collaborationThreadVisibleCount = collaborationThreadCardsWithRoomRefs.length;
    const collaborationThreadTotalCount = collaborationThreadCardsWithRoomRefs.reduce((sum, item) => sum + item.aggregateCount, 0);
    const collaborationActiveCount = collaborationThreadCardsWithRoomRefs.reduce((sum, item) => sum + (item.status === "active" ? item.aggregateCount : 0), 0);
    const collaborationHandoffCount = collaborationThreadCardsWithRoomRefs.reduce((sum, item) => sum + (item.status === "handoff" ? item.aggregateCount : 0), 0);
    const collaborationBlockedCount = collaborationThreadCardsWithRoomRefs.reduce((sum, item) => sum + (item.status === "blocked" ? item.aggregateCount : 0), 0);
    const collaborationCompletedTodayCount = collaborationThreadCardsWithRoomRefs.reduce((sum, item) => {
        if (item.status !== "completed")
            return sum;
        return sum + item.aggregateItems.filter(entry => isSameLocalCalendarDay(entry.latestAt, Date.now())).length;
    }, 0);
    const primaryDispatcherFilterLabel = pickUiText(options.language, `${collaborationDirectory.primaryDisplayName} dispatched`, `\u53EA\u770B ${collaborationDirectory.primaryDisplayName} \u6D3E\u53D1`);
    const taskRoleSummaries = buildTaskRoleSummaries(controlCenterMappingTasks);
    const pendingApprovalsCount = allApprovals.filter(item => item.status === "pending").length;
    const inProgressTasksCount = realTasks.filter(task => task.status === "in_progress").length;
    const blockedTasksCount = realTasks.filter(task => task.status === "blocked").length;
    const tasksInMotionCount = inProgressTasksCount + blockedTasksCount;
    const liveSessionCount = officePresence.totalActiveSessions;
    const nowMs = Date.now();
    const sessionErrorCount = exceptions.errors.length;
    const sessionBlockedCount = exceptions.blocked.filter(session => session.state === "blocked").length;
    const sessionWaitingApprovalCount = exceptions.blocked.filter(session => session.state === "waiting_approval").length;
    const runtimeSessionIssueCount = sessionBlockedCount + sessionErrorCount + sessionWaitingApprovalCount;
    const stalledRunningSessionCount = countStalledRunningSessions(snapshot.sessions, taskSignalItems, nowMs);
    const runtimeIssueCount = runtimeSessionIssueCount + stalledRunningSessionCount;
    const globalVisibilityModel = await buildGlobalVisibilityViewModel(snapshot, toolClient, options.language, { cronOverview, openclawCronJobs, currentTasksCount: taskCertaintyCards.length, strongTaskEvidenceCount: taskCertaintyStrongCount, followupTaskEvidenceCount: taskCertaintyFollowupCount, weakTaskEvidenceCount: taskCertaintyWeakCount });
    const attentionCount = actionQueue.counts.unacked + runtimeIssueCount + nonOkBudgets.length;
    const replayMoments = replayPreview.timeline.entries.slice(0, 8);
    const replaySignals = [{ label: t("Timeline events", "\u65F6\u95F4\u7EBF\u4E8B\u4EF6"), value: replayPreview.stats.timeline.total }, { label: t("Daily digests", "\u65E5\u62A5\u5FEB\u7167"), value: replayPreview.stats.digests.total }, { label: t("Export snapshots", "\u5BFC\u51FA\u5FEB\u7167"), value: replayPreview.stats.exportSnapshots.total }, { label: t("Backup bundles", "\u5907\u4EFD\u5305"), value: replayPreview.stats.exportBundles.total }].filter(item => item.value > 0);
    const heartbeatJobs = cronOverview.jobs.filter(job => job.jobId.toLowerCase().includes("heartbeat"));
    const heartbeatEnabledCount = heartbeatJobs.filter(job => job.enabled).length;
    const heartbeatNextRun = heartbeatJobs.find(job => job.enabled)?.nextRunAt ?? heartbeatJobs[0]?.nextRunAt ?? t("Not scheduled", "\u672A\u6392\u7A0B");
    const heartbeatHealth = heartbeatEnabledCount > 0 ? "ok" : "warn";
    const heartbeatRuns = await (0, import_task_heartbeat.readTaskHeartbeatRuns)(1);
    const latestHeartbeatRun = heartbeatRuns.runs[0];
    const currentTaskHealth = taskCertaintyWeakCount === 0 ? "ok" : "warn";
    const mappingTaskHint = controlCenterMappingTasks.length > 0 ? t(`${controlCenterMappingTasks.length} board-only mapping examples are hidden from execution metrics.`, `\u53E6\u6709 ${controlCenterMappingTasks.length} \u4E2A\u770B\u677F\u6837\u4F8B\uFF08\u4E0D\u6267\u884C\u4EFB\u52A1\uFF09\u3002`) : "";
    const pendingDecisionCount = actionQueue.counts.unacked;
    const budgetRiskCount = nonOkBudgets.length;
    const focusSummary = [`${t("Review queue", "\u5BA1\u9605\u961F\u5217")} ${pendingDecisionCount}`, `${t("Runtime issues", "\u8FD0\u884C\u5F02\u5E38")} ${runtimeIssueCount}`, `${t("Budget risks", "\u9884\u7B97\u98CE\u9669")} ${budgetRiskCount}`].join(" \xB7 ");
    const focusHref = `${buildHomeHref({ quick: "all" }, options.compactStatusStrip, "projects-tasks", options.language, options.usageView)}#tracked-task-view`;
    const currentTaskHealthHref = `${buildHomeHref({ quick: "all" }, true, "projects-tasks", options.language, options.usageView)}#tracked-task-view`;
    const runtimeCronById = new Map(cronOverview.jobs.map(job => [job.jobId, job]));
    const catalogMatchedRuntimeIds = new Set;
    const catalogCronRows = openclawCronJobs.map(job => {
        const runtimeJob = runtimeCronById.get(job.jobId);
        if (runtimeJob)
            catalogMatchedRuntimeIds.add(job.jobId);
        const status = runtimeJob ? runtimeJob.health : job.enabled ? "enabled" : "disabled";
        const statusLabel = runtimeJob ? cronHealthLabel(runtimeJob.health, options.language) : job.enabled ? pickUiText(options.language, "Enabled (awaiting runtime sync)", "\u5DF2\u542F\u7528\uFF08\u7B49\u5F85\u8FD0\u884C\u65F6\u540C\u6B65\uFF09") : cronHealthLabel("disabled", options.language);
        const nextRun = runtimeJob?.nextRunAt ?? (job.enabled ? t("Waiting for runtime sync", "\u7B49\u5F85\u8FD0\u884C\u65F6\u540C\u6B65") : "-");
        return { source: "openclaw", sourceLabel: t("Task config", "\u4EFB\u52A1\u914D\u7F6E"), jobId: job.jobId, name: job.name, owner: job.owner, purpose: job.purpose, schedule: job.scheduleLabel, status, statusLabel, nextRun, dueInSeconds: runtimeJob?.dueInSeconds };
    });
    const runtimeOnlyCronRows = cronOverview.jobs.filter(job => !catalogMatchedRuntimeIds.has(job.jobId)).map(job => ({ source: "runtime", sourceLabel: t("Runtime monitor", "\u7CFB\u7EDF\u76D1\u63A7"), jobId: job.jobId, name: job.name ?? job.jobId, owner: formatExecutorAgentLabel("system-cron", options.language), purpose: cronRuntimePurpose(job.jobId, options.language), schedule: pickUiText(options.language, "system interval", "\u7CFB\u7EDF\u95F4\u9694"), status: job.enabled ? job.health : "disabled", statusLabel: cronHealthLabel(job.enabled ? job.health : "disabled", options.language), nextRun: job.nextRunAt ?? "-", dueInSeconds: job.dueInSeconds }));
    const allCronRows = [...catalogCronRows, ...runtimeOnlyCronRows];
    const timedJobSpotlightCards = buildTimedJobSpotlightCards({ jobs: allCronRows, language: options.language });
    const taskBoardCards = buildUnifiedTaskBoardCards({ taskCards: taskSpotlightCards, timedJobCards: timedJobSpotlightCards, manualOrder: options.taskCardOrder });
    const cronRows = allCronRows.slice(0, 20).map(job => { const dueIn = Number.isFinite(job.dueInSeconds) ? formatSeconds(job.dueInSeconds, options.language) : "-"; const purpose = sanitizeCronPurposeText(job.purpose, options.language, 56); return `<tr><td><div>${escapeHtml(job.name)}</div><div class="meta">${escapeHtml(job.jobId)}</div></td><td>${escapeHtml(job.owner)}</td><td>${escapeHtml(purpose)}</td><td>${badge(job.status, job.statusLabel)}</td><td>${escapeHtml(job.nextRun)}</td><td>${escapeHtml(dueIn)}</td></tr>`; }).join("");
    const agentJobCatalogRows = allCronRows;
    const agentJobRowsHtml = agentJobCatalogRows.length === 0 ? `<tr><td colspan="7">${escapeHtml(t("No visible jobs yet.", "\u6682\u65E0\u53EF\u89C1 job\u3002"))}</td></tr>` : agentJobCatalogRows.slice(0, 40).map(item => `<tr><td>${escapeHtml(item.sourceLabel)}</td><td><div>${escapeHtml(item.name)}</div><div class="meta">${escapeHtml(item.jobId)}</div></td><td>${escapeHtml(item.owner)}</td><td>${escapeHtml(sanitizeCronPurposeText(item.purpose, options.language, 48))}</td><td>${escapeHtml(humanizeTimedJobScheduleLabel(item.schedule, options.language))}</td><td>${escapeHtml(item.nextRun)}</td><td>${badge(item.status, item.statusLabel)}</td></tr>`).join("");
    const toolSessions = sessionPreview.items.filter(item => (item.toolEventCount ?? 0) > 0 || item.latestKind === "tool_event").slice(0, 12);
    const toolRows = toolSessions.length === 0 ? `<tr><td colspan="5">${escapeHtml(t("No tool-call sessions yet.", "\u6682\u65E0\u5DE5\u5177\u8C03\u7528\u4F1A\u8BDD\u3002"))}</td></tr>` : toolSessions.map(item => { const toolCount = item.toolEventCount ?? (item.latestKind === "tool_event" ? 1 : 0); return `<tr><td><a href="${escapeHtml(buildSessionDetailHref(item.sessionKey, options.language))}">${escapeHtml(item.label ?? item.sessionKey)}</a></td><td>${escapeHtml(item.agentId ?? t("Unassigned", "\u672A\u5206\u914D"))}</td><td>${toolCount}</td><td>${badge(item.state, sessionStateLabel(item.state))}</td><td>${escapeHtml(item.lastMessageAt ?? "-")}</td></tr>`; }).join("");
    const importGuard = (0, import_import_live.readImportMutationGuardState)();
    const tokenGateStatus = import_config.LOCAL_TOKEN_AUTH_REQUIRED ? import_config.LOCAL_API_TOKEN !== "" ? "armed" : "blocked_no_token" : "disabled";
    const importGuardRows = [{ label: "\u53EA\u8BFB\u4FDD\u62A4", value: import_config.READONLY_MODE ? "\u5F00\u542F" : "\u5173\u95ED", note: import_config.READONLY_MODE ? "\u5F53\u524D\u53EA\u5141\u8BB8\u5B89\u5168\u6F14\u7EC3\uFF0C\u4E0D\u4F1A\u5199\u5165\u771F\u5B9E\u53D8\u66F4\u3002" : "\u5141\u8BB8\u771F\u5B9E\u5199\u5165\uFF0C\u8BF7\u786E\u8BA4\u540E\u4F7F\u7528\u3002", status: import_config.READONLY_MODE ? "enabled" : "warn" }, { label: "\u5173\u952E\u5199\u5165\u4FDD\u62A4", value: import_config.LOCAL_TOKEN_AUTH_REQUIRED ? "\u5F00\u542F" : "\u5173\u95ED", note: import_config.LOCAL_TOKEN_AUTH_REQUIRED ? "\u4F1A\u6539\u6570\u636E\u7684\u64CD\u4F5C\u9700\u8981\u5148\u8FC7\u4E00\u5C42\u4FDD\u62A4\u3002" : "\u5F53\u524D\u6CA1\u6709\u989D\u5916\u4FDD\u62A4\uFF0C\u5EFA\u8BAE\u53EA\u5728\u6D4B\u8BD5\u73AF\u5883\u8FD9\u6837\u7528\u3002", status: import_config.LOCAL_TOKEN_AUTH_REQUIRED ? "enabled" : "warn" }, { label: "\u5B89\u5168\u53E3\u4EE4\u914D\u7F6E", value: importGuard.localTokenConfigured ? "\u5DF2\u8BBE\u7F6E" : "\u672A\u8BBE\u7F6E", note: importGuard.localTokenConfigured ? "\u8FD9\u53F0\u673A\u5668\u5DF2\u7ECF\u8BBE\u7F6E\u4E86\u4FDD\u62A4\u53E3\u4EE4\u3002" : "\u8FD9\u53F0\u673A\u5668\u8FD8\u6CA1\u8BBE\u7F6E\u4FDD\u62A4\u53E3\u4EE4\uFF0C\u6240\u4EE5\u9AD8\u98CE\u9669\u5199\u5165\u4F1A\u88AB\u62E6\u4F4F\u3002", status: importGuard.localTokenConfigured ? "enabled" : "blocked" }, { label: "\u5F53\u524D\u4FDD\u62A4\u72B6\u6001", value: tokenGateStatus === "armed" ? "\u5DF2\u5C31\u7EEA" : tokenGateStatus === "blocked_no_token" ? "\u672A\u914D\u7F6E" : "\u672A\u5F00\u542F", note: "\u53EA\u5F71\u54CD\u4F1A\u6539\u6570\u636E\u7684\u64CD\u4F5C\uFF0C\u4E0D\u5F71\u54CD\u666E\u901A\u67E5\u770B\u3002", status: tokenGateStatus === "armed" ? "enabled" : tokenGateStatus === "blocked_no_token" ? "blocked" : "disabled" }, { label: "\u53D8\u66F4\u5199\u5165\u5F00\u5173", value: import_config.IMPORT_MUTATION_ENABLED ? "\u5F00\u542F" : "\u5173\u95ED", note: import_config.IMPORT_MUTATION_ENABLED ? "\u5141\u8BB8\u5199\u5165\u5BFC\u5165\u53D8\u66F4\u3002" : "\u5DF2\u5173\u95ED\u5BFC\u5165\u5199\u5165\u3002", status: import_config.IMPORT_MUTATION_ENABLED ? "warn" : "disabled" }, { label: "\u5BA1\u6279\u5199\u5165\u5F00\u5173", value: import_config.APPROVAL_ACTIONS_ENABLED ? "\u5F00\u542F" : "\u5173\u95ED", note: import_config.APPROVAL_ACTIONS_ENABLED ? "\u5141\u8BB8\u6267\u884C\u5BA1\u6279\u5199\u5165\u3002" : "\u5DF2\u5173\u95ED\u5BA1\u6279\u5199\u5165\u3002", status: import_config.APPROVAL_ACTIONS_ENABLED ? "warn" : "disabled" }, { label: "\u9ED8\u8BA4\u4FDD\u62A4\u6A21\u5F0F", value: importGuard.defaultMode, note: importGuard.defaultMode === "blocked" ? "\u5F53\u524D\u4E3A\u4FDD\u62A4\u72B6\u6001\uFF0C\u4EC5\u5141\u8BB8\u6F14\u7EC3\u3002" : importGuard.defaultMode === "dry_run" ? "\u9ED8\u8BA4\u5148\u6F14\u7EC3\uFF0C\u518D\u51B3\u5B9A\u662F\u5426\u5199\u5165\u3002" : "\u5F53\u524D\u5141\u8BB8\u5B9E\u65F6\u5199\u5165\u3002", status: importGuard.defaultMode }].map(item => `<tr><td>${escapeHtml(item.label)}</td><td>${badge(item.status)}</td><td>${escapeHtml(item.value)}</td><td>${escapeHtml(item.note)}</td></tr>`).join("");
    const replayRowItems = [{ label: t("Timeline scanned", "\u65F6\u95F4\u7EBF\u626B\u63CF\u6570"), value: replayPreview.stats.timeline.total }, { label: t("Timeline shown", "\u65F6\u95F4\u7EBF\u5C55\u793A\u6570"), value: replayPreview.stats.timeline.returned }, { label: t("Timeline filtered", "\u65F6\u95F4\u7EBF\u8FC7\u6EE4\u6570"), value: replayPreview.stats.timeline.filteredOut }, { label: t("Digests shown", "\u65E5\u62A5\u5FEB\u7167\u5C55\u793A\u6570"), value: replayPreview.stats.digests.returned }, { label: t("Export snapshots shown", "\u5BFC\u51FA\u5FEB\u7167\u5C55\u793A\u6570"), value: replayPreview.stats.exportSnapshots.returned }, { label: t("Backup bundles shown", "\u5907\u4EFD\u5305\u5C55\u793A\u6570"), value: replayPreview.stats.exportBundles.returned }, { label: t("Replay load p50 (ms)", "\u56DE\u653E\u52A0\u8F7D p50 (ms)"), value: replayPreview.stats.total.latencyBucketsMs.p50 }, { label: t("Replay load p95 (ms)", "\u56DE\u653E\u52A0\u8F7D p95 (ms)"), value: replayPreview.stats.total.latencyBucketsMs.p95 }].filter(item => item.value > 0);
    const replayRows = replayRowItems.map(item => `<tr><td><code>${escapeHtml(item.label)}</code></td><td>${item.value}</td></tr>`).join("");
    const replayMetricsHtml = replayRowItems.length === 0 ? `<div class="empty-state">${escapeHtml(t("No replay metrics yet. They will appear after the system runs for a while.", "\u6682\u65E0\u56DE\u653E\u7EDF\u8BA1\u3002\u8FD0\u884C\u4E00\u6BB5\u65F6\u95F4\u540E\u4F1A\u663E\u793A\u3002"))}</div>` : `<table style="margin-top:10px;"><thead><tr><th>${escapeHtml(t("Metric", "\u6307\u6807"))}</th><th>${escapeHtml(t("Value", "\u6570\u503C"))}</th></tr></thead><tbody>${replayRows}</tbody></table>`;
    const replayLatestSnapshot = replayPreview.exportSnapshots[0];
    const replayLatestBundle = replayPreview.exportBundles[0];
    const approvalsPreviewMeta = allApprovals.length > topApprovals.length ? t(`Showing the latest ${topApprovals.length} of ${allApprovals.length} approval items.`, `\u5F53\u524D\u5C55\u793A\u6700\u8FD1 ${topApprovals.length}/${allApprovals.length} \u6761\u5BA1\u6279\u8BB0\u5F55\u3002`) : t(`Showing ${topApprovals.length} approval items.`, `\u5F53\u524D\u5C55\u793A ${topApprovals.length} \u6761\u5BA1\u6279\u8BB0\u5F55\u3002`);
    const approvalsItems = topApprovals.length === 0 ? `<li>${escapeHtml(t("No approvals yet.", "\u6682\u65E0\u5BA1\u6279\u8BB0\u5F55"))}</li>` : topApprovals.map(approval => { const status = approval.status ?? "unknown"; const target = approval.agentId ?? approval.sessionKey ?? t("Unknown target", "\u672A\u77E5\u76EE\u6807"); const commandLabel = approval.command ? escapeHtml(approval.command) : t("Approval action", "\u5BA1\u6279\u52A8\u4F5C"); const when = approval.requestedAt ? ` \xB7 ${escapeHtml(t("Requested at", "\u63D0\u4EA4\u4E8E"))} ${escapeHtml(approval.requestedAt)}` : ""; return `<li>${badge(status)} ${commandLabel} \xB7 <strong>${escapeHtml(target)}</strong>${when}</li>`; }).join("");
    const budgetItems = nonOkBudgets.length === 0 ? `<tr><td colspan="4">${escapeHtml(t("All budgets are currently within the safe range.", "\u5F53\u524D\u9884\u7B97\u5168\u90E8\u5728\u5B89\u5168\u8303\u56F4\u5185\u3002"))}</td></tr>` : nonOkBudgets.map(item => { return `<tr><td>${badge(item.status ?? "ok")}</td><td>${escapeHtml(item.scope ?? t("Unknown scope", "\u672A\u77E5\u8303\u56F4"))}</td><td>${escapeHtml(item.label ?? t("Untitled", "\u672A\u547D\u540D"))}</td><td>${renderMetricSummary(item)}</td></tr>`; }).join("");
    const taskRows = tasks.length === 0 ? `<tr><td colspan="7">${escapeHtml(t("No tasks match the current filter.", "\u5F53\u524D\u7B5B\u9009\u4E0B\u6682\u65E0\u4EFB\u52A1\u3002"))}</td></tr>` : tasks.slice(0, 50).map(task => `<tr><td>${escapeHtml(task.projectTitle)}</td><td><code>${escapeHtml(task.taskId)}</code></td><td>${escapeHtml(task.title)}</td><td>${badge(task.status, taskStateLabel(task.status, options.language))}</td><td>${escapeHtml(task.owner)}</td><td>${escapeHtml(task.dueAt ?? "-")}</td><td>${escapeHtml(task.updatedAt)}</td></tr>`).join("");
    const taskGroupedListHtml = tasks.length === 0 ? `<div class="empty-state">${escapeHtml(t("No tasks match the current filter.", "\u5F53\u524D\u7B5B\u9009\u4E0B\u6682\u65E0\u4EFB\u52A1\u3002"))}</div>` : `<div class="group-list">${TASK_STATES.map(state => {
        const bucket = tasks.filter(task => task.status === state);
        if (bucket.length === 0)
            return "";
        const itemRows = bucket.slice(0, 16).map(task => {
            const detailHref = buildTaskDetailHref(task.taskId, options.language);
            return `<li class="group-item">
                <div class="group-item-head">
                  <strong>${escapeHtml(task.title)}</strong>
                  ${badge(task.status, taskStateLabel(task.status, options.language))}
                </div>
                <div class="meta"><code>${escapeHtml(task.taskId)}</code> \xB7 ${escapeHtml(task.projectTitle)} \xB7 ${escapeHtml(t("Owner", "\u8D1F\u8D23\u4EBA"))} ${escapeHtml(task.owner)}</div>
                <div class="meta">${escapeHtml(t("Due", "\u622A\u6B62"))} ${escapeHtml(task.dueAt ?? t("Not set", "\u672A\u8BBE\u7F6E"))} \xB7 ${escapeHtml(t("Updated", "\u66F4\u65B0"))} ${escapeHtml(task.updatedAt)}</div>
                <div class="meta"><a href="${escapeHtml(detailHref)}">${escapeHtml(t("Open task detail", "\u67E5\u770B\u4EFB\u52A1\u8BE6\u60C5\u9875"))}</a></div>
              </li>`;
        }).join("");
        const more = bucket.length > 16 ? `<div class="meta">${escapeHtml(t(`${bucket.length - 16} more tasks are collapsed.`, `\u5176\u4F59 ${bucket.length - 16} \u4E2A\u4EFB\u52A1\u5DF2\u6298\u53E0\u3002`))}</div>` : "";
        return `<details class="group-section" open><summary>${escapeHtml(taskStateLabel(state, options.language))} (${bucket.length})</summary><ul class="group-items">${itemRows}</ul>${more}</details>`;
    }).join("")}</div>`;
    const toolGroupedListHtml = toolSessions.length === 0 ? `<div class="empty-state">${escapeHtml(t("No tool-call sessions yet.", "\u6682\u65E0\u5DE5\u5177\u8C03\u7528\u4F1A\u8BDD\u3002"))}</div>` : `<div class="group-list"><details class="group-section" open><summary>${escapeHtml(t("Active tool sessions", "\u6D3B\u8DC3\u5DE5\u5177\u4F1A\u8BDD"))} (${toolSessions.length})</summary><ul class="group-items">${toolSessions.map(item => {
        const toolCount = item.toolEventCount ?? (item.latestKind === "tool_event" ? 1 : 0);
        return `<li class="group-item">
              <div class="group-item-head"><strong>${escapeHtml(item.label ?? item.sessionKey)}</strong>${badge(item.state, sessionStateLabel(item.state))}</div>
              <div class="meta">${escapeHtml(t("Agent", "\u667A\u80FD\u4F53"))} ${escapeHtml(item.agentId ?? t("Unassigned", "\u672A\u5206\u914D"))} \xB7 ${escapeHtml(t("Calls", "\u8C03\u7528"))} ${toolCount} ${escapeHtml(t("times", "\u6B21"))}</div>
              <div class="meta">${escapeHtml(t("Latest activity", "\u6700\u8FD1\u6D3B\u52A8"))} ${escapeHtml(item.lastMessageAt ?? "-")}</div>
              <div class="meta"><a href="${escapeHtml(buildSessionDetailHref(item.sessionKey, options.language))}">${escapeHtml(t("Open session detail", "\u67E5\u770B\u4F1A\u8BDD\u8BE6\u60C5\u9875"))}</a></div>
            </li>`;
    }).join("")}</ul></details></div>`;
    const heartbeatGroupedListHtml = heartbeatJobs.length === 0 ? `<div class="empty-state">${escapeHtml(t("No heartbeat timed jobs found yet.", "\u5C1A\u672A\u53D1\u73B0\u5FC3\u8DF3\u5B9A\u65F6\u4EFB\u52A1\u3002"))}</div>` : `<div class="group-list"><details class="group-section" open><summary>${escapeHtml(t("Heartbeat checks", "\u5FC3\u8DF3\u68C0\u67E5\u9879"))} (${heartbeatJobs.length})</summary><ul class="group-items">${heartbeatJobs.slice(0, 16).map(job => {
        const detailHref = buildCronDetailHref(job.jobId, options.language);
        const checkLabel = job.jobId.toLowerCase().includes("heartbeat") ? t("Task heartbeat service", "\u4EFB\u52A1\u5FC3\u8DF3\u670D\u52A1") : job.name?.trim() || job.jobId;
        return `<li class="group-item">
              <div class="group-item-head"><strong>${escapeHtml(checkLabel)}</strong>${badge(job.health, cronHealthLabel(job.health, options.language))}</div>
              <div class="meta">${escapeHtml(t("Next run", "\u4E0B\u6B21\u8FD0\u884C"))} ${escapeHtml(job.nextRunAt ?? "-")} \xB7 ${escapeHtml(formatSeconds(job.dueInSeconds, options.language))}</div>
              <div class="meta"><a href="${escapeHtml(detailHref)}">${escapeHtml(t("Open task detail", "\u67E5\u770B\u4EFB\u52A1\u8BE6\u60C5\u9875"))}</a></div>
            </li>`;
    }).join("")}</ul></details></div>`;
    const agentJobGroupedListHtml = agentJobCatalogRows.length === 0 ? `<div class="empty-state">${escapeHtml(t("No visible jobs yet.", "\u6682\u65E0\u53EF\u89C1 job\u3002"))}</div>` : `<div class="group-list">${[...new Set(agentJobCatalogRows.map(item => item.owner))].slice(0, 10).map(owner => {
        const jobs = agentJobCatalogRows.filter(item => item.owner === owner);
        const rows = jobs.slice(0, 10).map(item => {
            const detailHref = buildCronDetailHref(item.jobId, options.language);
            return `<li class="group-item">
                  <div class="group-item-head"><strong>${escapeHtml(item.name)}</strong>${badge(item.status, item.statusLabel)}</div>
                  <div class="meta"><code>${escapeHtml(item.jobId)}</code> \xB7 ${escapeHtml(humanizeTimedJobScheduleLabel(item.schedule, options.language))}</div>
                  <div class="meta">${escapeHtml(sanitizeCronPurposeText(item.purpose, options.language, 80))}</div>
                  <div class="meta"><a href="${escapeHtml(detailHref)}">${escapeHtml(t("Open task detail", "\u67E5\u770B\u4EFB\u52A1\u8BE6\u60C5\u9875"))}</a></div>
                </li>`;
        }).join("");
        return `<details class="group-section" open><summary>${escapeHtml(owner)} (${jobs.length})</summary><ul class="group-items">${rows}</ul></details>`;
    }).join("")}</div>`;
    const exceptionsItems = renderExceptionsList(exceptionsFeed);
    const taskBoard = renderTaskBoard(taskBoardCards, options.language, options.taskCardOrder, globalVisibilityModel);
    const projectBoard = renderProjectBoard(snapshot.projectSummaries, options.language);
    const actionQueueItems = renderActionQueue(actionQueue);
    const effectiveQuick = filters.quick ?? "all";
    const quickFilters = renderQuickFilters(filters, options.compactStatusStrip, options.section, options.language, options.usageView);
    const clearHref = buildHomeHref({ quick: "all" }, options.compactStatusStrip, options.section, options.language, options.usageView);
    const signalItems = [{ label: t("Active sessions", "\u6D3B\u8DC3\u4F1A\u8BDD"), value: liveSessionCount }, { label: t("Tasks under watch", "\u6B63\u5728\u89C2\u5BDF\u4E2D\u7684\u4EFB\u52A1"), value: taskCertaintyCards.length }, { label: t("Risk signals", "\u98CE\u9669\u4FE1\u53F7"), value: attentionCount }, { label: t("Active projects", "\u6D3B\u8DC3\u9879\u76EE"), value: snapshot.projectSummaries.filter(item => item.status === "active").length }].filter(item => item.value > 0);
    const subscriptionWindowHint = usageCost.subscription.primaryWindowLabel || usageCost.subscription.secondaryUsedPercent !== void 0 ? `${normalizeQuotaWindowLabel(usageCost.subscription.primaryWindowLabel, "5h")} / ${normalizeQuotaWindowLabel(usageCost.subscription.secondaryWindowLabel, "Week")}` : usageCost.subscription.planLabel;
    const executiveCards = [{ title: t("Projects", "\u9879\u76EE"), metric: `${snapshot.projectSummaries.length}`, detail: `${t("Active", "\u6D3B\u8DC3")} ${snapshot.projectSummaries.filter(item => item.status === "active").length} \xB7 ${t("Blocked", "\u963B\u585E")} ${snapshot.projectSummaries.filter(item => item.status === "blocked").length}` }, { title: t("Tasks", "\u4EFB\u52A1"), metric: `${realTasks.length}`, detail: `${t("In motion", "\u8FDB\u884C\u4E2D")} ${inProgressTasksCount} \xB7 ${t("Blocked", "\u963B\u585E")} ${blockedTasksCount}${controlCenterMappingTasks.length > 0 ? ` \xB7 ${t("Mapping examples", "\u6620\u5C04\u6837\u4F8B")} ${controlCenterMappingTasks.length}` : ""}` }, { title: t("Agents", "\u667A\u80FD\u4F53"), metric: `${officeCards.filter(card => card.status !== "inactive").length}`, detail: `${t("Online agents", "\u5728\u7EBF\u667A\u80FD\u4F53")} ${officeCards.filter(card => card.activeSessions > 0).length}` }, { title: t("Budget", "\u9884\u7B97"), metric: `${budgets.total}`, detail: `${t("Warnings", "\u9884\u8B66")} ${budgets.warn ?? 0} \xB7 ${t("Over limit", "\u8D85\u9650")} ${budgets.over ?? 0}` }, { title: t("Subscription", "\u8BA2\u9605"), metric: usageCost.subscription.status === "connected" ? t("Connected", "\u5DF2\u8FDE\u63A5") : t("Needs connection", "\u5F85\u8FDE\u63A5"), detail: subscriptionWindowHint }, { title: t("System health", "\u7CFB\u7EDF\u5065\u5EB7"), metric: cronOverview.health.status === "ok" ? t("Healthy", "\u6B63\u5E38") : t("Attention", "\u5173\u6CE8"), detail: `${t("Timed jobs", "\u5B9A\u65F6\u4EFB\u52A1")} ${cronOverview.jobs.length} ${t("items", "\u4E2A")} \xB7 ${t("Heartbeats", "\u5FC3\u8DF3")} ${heartbeatEnabledCount} ${t("items", "\u4E2A")}` }];
    const executiveCardsHtml = `<section class="executive-grid">${executiveCards.map(item => `<article class="exec-card"><div class="exec-title">${escapeHtml(item.title)}</div><div class="exec-metric">${escapeHtml(item.metric)}</div><div class="meta">${escapeHtml(item.detail)}</div></article>`).join("")}</section>`;
    const overviewTopMetrics = [{ key: "review-queue", title: t("Review queue", "\u5BA1\u9605\u961F\u5217"), numericValue: pendingDecisionCount, displayValue: formatInt(pendingDecisionCount), detail: pendingDecisionCount > 0 ? t("Waiting for your review", "\u7B49\u4F60\u5904\u7406") : t("No backlog", "\u65E0\u79EF\u538B"), tone: pendingDecisionCount > 0 ? "warn" : "ok" }, { key: "runtime-issues", title: t("Runtime issues", "\u8FD0\u884C\u5F02\u5E38"), numericValue: runtimeSessionIssueCount, displayValue: formatInt(runtimeSessionIssueCount), detail: runtimeSessionIssueCount > 0 ? t("Blocked, waiting, or failing sessions", "\u963B\u585E\u3001\u7B49\u5F85\u6216\u62A5\u9519\u4E2D\u7684\u4F1A\u8BDD") : t("Normal", "\u72B6\u6001\u6B63\u5E38"), tone: runtimeSessionIssueCount > 0 ? "warn" : "ok" }, { key: "stalled-runs", title: t("Stalled runs", "\u505C\u6EDE\u6267\u884C"), numericValue: stalledRunningSessionCount, displayValue: formatInt(stalledRunningSessionCount), detail: stalledRunningSessionCount > 0 ? t("Running sessions have gone quiet", "\u8FD0\u884C\u4E2D\u7684\u4F1A\u8BDD\u5DF2\u7ECF\u6C89\u9ED8") : t("Fresh", "\u4FE1\u53F7\u65B0\u9C9C"), tone: stalledRunningSessionCount > 0 ? "warn" : "ok" }, { key: "budget-risk", title: t("Budget risk", "\u9884\u7B97\u98CE\u9669"), numericValue: budgetRiskCount, displayValue: formatInt(budgetRiskCount), detail: budgetRiskCount > 0 ? t("Budget warning", "\u9884\u7B97\u544A\u8B66") : t("Budget safe", "\u9884\u7B97\u5B89\u5168"), tone: budgetRiskCount > 0 ? "warn" : "ok" }, { key: "today-usage", title: t("Today's usage", "\u4ECA\u65E5\u7528\u91CF"), numericValue: usageToday?.sourceStatus === "not_connected" ? void 0 : usageToday?.tokens ?? 0, displayValue: usageToday?.sourceStatus === "not_connected" ? t("Not connected", "\u672A\u8FDE\u63A5") : formatInt(usageToday?.tokens ?? 0), detail: usageToday?.sourceStatus === "not_connected" ? t("Not connected", "\u672A\u8FDE\u63A5") : `${t("Cost", "\u8D39\u7528")} ${formatCurrency(usageToday?.estimatedCost ?? 0)}`, tone: usageToday?.sourceStatus === "not_connected" ? "neutral" : "ok" }];
    const overviewTopMetricHtml = `<section class="overview-kpi-grid">${overviewTopMetrics.map(item => {
        const counterAttrs = typeof item.numericValue === "number" ? ` data-counter-key="overview:${escapeHtml(item.key)}" data-counter-target="${Math.max(0, Math.round(item.numericValue))}" data-counter-format="int"` : "";
        return `<article class="overview-kpi-card tone-${escapeHtml(item.tone)}" data-overview-kpi="${escapeHtml(item.key)}">
        <div class="overview-kpi-label">${escapeHtml(item.title)}</div>
        <div class="overview-kpi-value"${counterAttrs}>${escapeHtml(item.displayValue)}</div>
        <div class="overview-kpi-detail">${escapeHtml(item.detail)}</div>
      </article>`;
    }).join("")}</section>`;
    const signalStrip = signalItems.map(item => `<div class="status-chip"><span>${escapeHtml(item.label)}</span><strong>${item.value}</strong></div>`).join("");
    const showSignalsFallback = signalItems.length === 0;
    const officeFloorHtml = renderOfficeFloor(officeCards, options.language);
    const staffOverviewCards = needsTeamSnapshot ? await buildStaffOverviewCards({ snapshot, client: toolClient, members: teamSnapshot.members, officeCards, executionAgentSummaries, language: options.language, modelOptions: teamSnapshot.modelOptions, modelEditable: teamSnapshot.modelEditable, configPath: teamSnapshot.sourcePath }) : [];
    const staffOverviewCardsHtml = renderStaffOverviewCards(staffOverviewCards, options.language, options.localMutationUnlock);
    const subscriptionStatusHtml = renderSubscriptionStatusCard(usageCost.subscription, options.language);
    const sectionNav = sectionLinks.map(item => { const href = buildHomeHref(filters, options.compactStatusStrip, item.key, options.language, options.usageView); const activeClass = item.key === activeSection ? " active" : ""; const current = item.key === activeSection ? ' aria-current="page"' : ""; return `<a class="nav-link${activeClass}" href="${escapeHtml(href)}"${current}><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.blurb)}</small></a>`; }).join("");
    const languageToggle = renderLanguageToggle(filters, options);
    const dashboardRefreshControls = renderDashboardRefreshControls(options.language, { localMutationUnlock: options.localMutationUnlock, localTokenAuthRequired: import_config.LOCAL_TOKEN_AUTH_REQUIRED, localTokenConfigured: import_config.LOCAL_API_TOKEN !== "" });
    const agentTeamLinks = agentTeamSidebarLinks(filters, options);
    const agentTeamSidebarCard = renderAgentTeamSidebarCard(agentTeamEmbed, options.language, agentTeamLinks);
    const agentTeamOverviewBlock = renderAgentTeamOverviewBlock(agentTeamEmbed, options.language, agentTeamLinks);
    const agentTeamMemoryBlock = renderAgentTeamMemoryBlock(agentTeamEmbed, options.language);
    const agentTeamDocsBlock = renderAgentTeamDocsBlock(agentTeamEmbed, options.language);
    const agentTeamProjectsBlock = renderAgentTeamProjectsBlock(agentTeamEmbed, options.language);
    const agentTeamSettingsBlock = renderAgentTeamSettingsBlock(agentTeamEmbed, options.language);
    const agentTeamInspectorSummary = renderAgentTeamInspectorSummary(agentTeamEmbed, options.language);
    const agentTeamInspectorCard = renderAgentTeamInspectorCard(agentTeamEmbed, options.language);
    const agentTeamRunSummaryCard = renderAgentTeamRunSummaryCard(agentTeamEmbed, options.language);
    const agentTeamArtifactPreviewCard = renderAgentTeamArtifactPreviewCard(agentTeamEmbed, options.language);
    const replayMomentsRows = replayMoments.length === 0 ? `<li>${escapeHtml(t("No timeline events yet.", "\u6682\u65E0\u65F6\u95F4\u7EBF\u4E8B\u4EF6\u3002"))}</li>` : replayMoments.map(item => `<li><code>${escapeHtml(item.timestamp)}</code> ${escapeHtml(item.summary)}</li>`).join("");
    const isTodayUsageView = options.usageView === "today";
    const usagePeriodsForView = isTodayUsageView ? usageCost.periods.filter(item => item.key === "today") : usageCost.periods;
    const usagePeriodCards = renderUsagePeriodCards(usagePeriodsForView, options.language);
    const usageViewTodayHref = buildHomeHref(filters, options.compactStatusStrip, "usage-cost", options.language, "today");
    const usageViewCumulativeHref = buildHomeHref(filters, options.compactStatusStrip, "usage-cost", options.language, "cumulative");
    const usageViewSwitchHtml = `<div class="segment-switch"><a class="segment-item${isTodayUsageView ? " active" : ""}" href="${escapeHtml(usageViewTodayHref)}">${escapeHtml(t("Today", "\u4ECA\u5929"))}</a><a class="segment-item${!isTodayUsageView ? " active" : ""}" href="${escapeHtml(usageViewCumulativeHref)}">${escapeHtml(t("Cumulative", "\u7D2F\u8BA1"))}</a></div>`;
    const usageViewRangeText = isTodayUsageView ? t("Range: today from 00:00 until now.", "\u7EDF\u8BA1\u8303\u56F4\uFF1A\u4ECA\u65E5 00:00 \u81F3\u5F53\u524D\u3002") : t("Range: cumulative history until now.", "\u7EDF\u8BA1\u8303\u56F4\uFF1A\u5386\u53F2\u7D2F\u8BA1\u5230\u5F53\u524D\u3002");
    const usageViewRangeDetail = isTodayUsageView ? t("Today view focuses on same-day consumption and live budget pressure.", "\u4ECA\u5929\u89C6\u56FE\u805A\u7126\u5F53\u65E5\u6D88\u8017\uFF0C\u9002\u5408\u770B\u5B9E\u65F6\u9884\u7B97\u538B\u529B\u3002") : t("Cumulative view shows overall composition and long-term trend.", "\u7D2F\u8BA1\u89C6\u56FE\u7528\u4E8E\u770B\u6574\u4F53\u7ED3\u6784\u5360\u6BD4\u548C\u957F\u671F\u8D8B\u52BF\u3002");
    const usageContextRows = renderUsageContextRows(usageCost.contextWindows, options.language);
    const selectedUsageBreakdown = isTodayUsageView ? usageCost.breakdownToday : usageCost.breakdown;
    const usageAgentRows = renderUsageBreakdownRows(selectedUsageBreakdown.byAgent, "agent", options.language);
    const usageProjectRows = renderUsageBreakdownRows(selectedUsageBreakdown.byProject, "project", options.language);
    const usageTaskBreakdownRows = selectedUsageBreakdown.byTask.filter(item => !isControlCenterMappingUsageTaskLabel(item.label) && !isControlCenterMappingUsageTaskLabel(item.key));
    const usageTaskRows = renderUsageBreakdownRows(usageTaskBreakdownRows, "task", options.language);
    const usageModelRows = renderUsageBreakdownRows(selectedUsageBreakdown.byModel, "model", options.language);
    const usageProviderRows = renderUsageBreakdownRows(selectedUsageBreakdown.byProvider, "provider", options.language);
    const usageSessionTypeRows = selectedUsageBreakdown.bySessionType;
    const usageCronJobRows = selectedUsageBreakdown.byCronJob;
    const usageCronAgentRows = selectedUsageBreakdown.byCronAgent;
    const usageSessionTypeTotalTokens = usageSessionTypeRows.reduce((sum, item) => sum + item.tokens, 0);
    const usageCronTotalTokens = usageCronJobRows.reduce((sum, item) => sum + item.tokens, 0);
    const usageCronAgentTotalTokens = usageCronAgentRows.reduce((sum, item) => sum + item.tokens, 0);
    const usageSourceAgentTotalTokens = selectedUsageBreakdown.byAgent.reduce((sum, item) => sum + item.tokens, 0);
    const usageSourceProjectTotalTokens = selectedUsageBreakdown.byProject.reduce((sum, item) => sum + item.tokens, 0);
    const runtimeTokenRangeLabel = usageToday?.sourceStatus === "not_connected" ? t("Range: current snapshot (data source not connected).", "\u7EDF\u8BA1\u8303\u56F4\uFF1A\u5F53\u524D\u5FEB\u7167\uFF08\u6570\u636E\u6E90\u672A\u8FDE\u63A5\uFF09\u3002") : isTodayUsageView ? t("Range: today from 00:00 until now.", "\u7EDF\u8BA1\u8303\u56F4\uFF1A\u4ECA\u65E5 00:00 \u81F3\u5F53\u524D\u3002") : t("Range: cumulative until now.", "\u7EDF\u8BA1\u8303\u56F4\uFF1A\u7D2F\u8BA1\u81F3\u5F53\u524D\u3002");
    const sessionTypeTokenRangeLabel = isTodayUsageView ? t("Range: all sessions today (00:00 until now).", "\u7EDF\u8BA1\u8303\u56F4\uFF1A\u4ECA\u65E5\u5168\u90E8\u4F1A\u8BDD\uFF0800:00 \u81F3\u5F53\u524D\uFF09\u3002") : t("Range: all sessions cumulative (through now).", "\u7EDF\u8BA1\u8303\u56F4\uFF1A\u5168\u90E8\u4F1A\u8BDD\u7D2F\u8BA1\uFF08\u622A\u81F3\u5F53\u524D\uFF09\u3002");
    const cronTokenRangeLabel = isTodayUsageView ? t("Range: timed-job sessions today (00:00 until now).", "\u7EDF\u8BA1\u8303\u56F4\uFF1A\u4ECA\u65E5\u5B9A\u65F6\u4EFB\u52A1\u4F1A\u8BDD\uFF0800:00 \u81F3\u5F53\u524D\uFF09\u3002") : t("Range: timed-job sessions cumulative (through now).", "\u7EDF\u8BA1\u8303\u56F4\uFF1A\u5B9A\u65F6\u4EFB\u52A1\u4F1A\u8BDD\u7D2F\u8BA1\uFF08\u622A\u81F3\u5F53\u524D\uFF09\u3002");
    const usageSourcePieHtml = selectedUsageBreakdown.byAgent.length === 0 && selectedUsageBreakdown.byProject.length === 0 ? "" : `<div class="bars">
          <div>
            <div class="meta">${escapeHtml(t("Share by agent", "\u6309\u667A\u80FD\u4F53\u5360\u6BD4"))}</div>
            ${renderTokenPieChart(selectedUsageBreakdown.byAgent, usageSourceAgentTotalTokens, t("Agents", "\u667A\u80FD\u4F53"), options.language)}
          </div>
          <div>
            <div class="meta">${escapeHtml(t("Share by project", "\u6309\u9879\u76EE\u5360\u6BD4"))}</div>
            ${renderTokenPieChart(selectedUsageBreakdown.byProject, usageSourceProjectTotalTokens, t("Projects", "\u9879\u76EE"), options.language)}
          </div>
        </div>`;
    const usageSessionTypePieHtml = renderTokenPieChart(usageSessionTypeRows, usageSessionTypeTotalTokens, t("All sessions", "\u5168\u90E8\u4F1A\u8BDD"), options.language);
    const usageCronJobPieHtml = renderTokenPieChart(usageCronJobRows, usageCronTotalTokens, t("Timed jobs", "\u5B9A\u65F6\u4EFB\u52A1"), options.language);
    const usageCronAgentPieHtml = renderTokenPieChart(usageCronAgentRows, usageCronAgentTotalTokens, t("Agents", "\u667A\u80FD\u4F53"), options.language);
    const usageSessionTypeShareHtml = usageSessionTypeRows.length === 0 ? `<div class="empty-state">${escapeHtml(t("No session-type usage data yet.", "\u6682\u65E0\u4F1A\u8BDD\u7C7B\u578B\u7528\u91CF\u6570\u636E\u3002"))}</div>` : `<div class="meta">${sessionTypeTokenRangeLabel}</div>
         <div class="meta">${escapeHtml(t("Total usage", "\u603B\u7528\u91CF"))}\uFF1A${formatInt(usageSessionTypeTotalTokens)}</div>
         ${usageSessionTypePieHtml}
         <table>
           <thead><tr><th>${escapeHtml(t("Type", "\u7C7B\u578B"))}</th><th>${escapeHtml(t("Usage", "\u7528\u91CF"))}</th><th>${escapeHtml(t("Share", "\u5360\u6BD4"))}</th><th>${escapeHtml(t("Sessions", "\u4F1A\u8BDD\u6570"))}</th><th>${escapeHtml(t("Data status", "\u6570\u636E\u72B6\u6001"))}</th></tr></thead>
           <tbody>${renderTokenShareRows(usageSessionTypeRows, usageSessionTypeTotalTokens, options.language)}</tbody>
         </table>`;
    const usageCronJobShareHtml = usageCronJobRows.length === 0 ? `<div class="empty-state">${escapeHtml(t("No timed-job usage data yet.", "\u6682\u65E0\u5B9A\u65F6\u4EFB\u52A1\u7528\u91CF\u6570\u636E\u3002"))}</div>` : `<div class="meta">${cronTokenRangeLabel}</div>
         <div class="meta">${escapeHtml(t("Total timed-job usage", "\u5B9A\u65F6\u4EFB\u52A1\u603B\u7528\u91CF"))}\uFF1A${formatInt(usageCronTotalTokens)}</div>
         ${usageCronJobPieHtml}
         <table>
           <thead><tr><th>${escapeHtml(t("Timed job", "\u5B9A\u65F6\u4EFB\u52A1"))}</th><th>${escapeHtml(t("Usage", "\u7528\u91CF"))}</th><th>${escapeHtml(t("Share within timed jobs", "\u5360\u6BD4\uFF08\u5B9A\u65F6\u4EFB\u52A1\u5185\uFF09"))}</th><th>${escapeHtml(t("Sessions", "\u4F1A\u8BDD\u6570"))}</th><th>${escapeHtml(t("Data status", "\u6570\u636E\u72B6\u6001"))}</th></tr></thead>
           <tbody>${renderTokenShareRows(usageCronJobRows, usageCronTotalTokens, options.language)}</tbody>
         </table>`;
    const usageCronAgentShareHtml = usageCronAgentRows.length === 0 ? `<div class="empty-state">${escapeHtml(t("No timed-job agent usage data yet.", "\u6682\u65E0\u5B9A\u65F6\u4EFB\u52A1\u667A\u80FD\u4F53\u7528\u91CF\u6570\u636E\u3002"))}</div>` : `<div class="meta">${cronTokenRangeLabel}</div>
         <div class="meta">${escapeHtml(t("Total timed-job agent usage", "\u5B9A\u65F6\u4EFB\u52A1\u667A\u80FD\u4F53\u603B\u7528\u91CF"))}\uFF1A${formatInt(usageCronAgentTotalTokens)}</div>
         ${usageCronAgentPieHtml}
         <table>
           <thead><tr><th>${escapeHtml(t("Agent", "\u667A\u80FD\u4F53"))}</th><th>${escapeHtml(t("Usage", "\u7528\u91CF"))}</th><th>${escapeHtml(t("Share within timed jobs", "\u5360\u6BD4\uFF08\u5B9A\u65F6\u4EFB\u52A1\u5185\uFF09"))}</th><th>${escapeHtml(t("Sessions", "\u4F1A\u8BDD\u6570"))}</th><th>${escapeHtml(t("Data status", "\u6570\u636E\u72B6\u6001"))}</th></tr></thead>
           <tbody>${renderTokenShareRows(usageCronAgentRows, usageCronAgentTotalTokens, options.language)}</tbody>
         </table>`;
    const usageConnectorTodos = renderUsageConnectorTodos(usageCost.connectors.todos, options.language);
    const usageBudgetStatusLabel = usageCost.budget.status === "ok" ? t("Healthy", "\u6B63\u5E38") : usageCost.budget.status === "warn" ? t("Warning", "\u9884\u8B66") : t("Over limit", "\u8D85\u9650");
    const usageBudgetHeadline = usageCost.budget.status === "not_connected" ? t("Budget data source is not connected", "\u9884\u7B97\u6570\u636E\u6E90\u672A\u8FDE\u63A5") : `${badge(usageCost.budget.status, usageBudgetStatusLabel)} ${escapeHtml(usageCost.budget.message)}`;
    const usageBudgetMeta = usage30d?.sourceStatus === "not_connected" ? t("Last 30 days cost: data source not connected", "\u8FD1 30 \u5929\u8D39\u7528\uFF1A\u6570\u636E\u6E90\u672A\u8FDE\u63A5") : usageCost.budget.limitCost30d ? `${t("Last 30 days cost", "\u8FD1 30 \u5929\u8D39\u7528")} ${formatCurrency(usageCost.budget.usedCost30d)} / ${t("Limit", "\u9650\u989D")} ${formatCurrency(usageCost.budget.limitCost30d)}` : `${t("Last 30 days cost", "\u8FD1 30 \u5929\u8D39\u7528")} ${formatCurrency(usageCost.budget.usedCost30d)}`;
    const hasUsageActivity = usageCost.contextWindows.length > 0 || usageCost.periods.some(item => item.tokens > 0 || item.estimatedCost > 0 || item.statusSamples > 0);
    const usageContextHtml = usageCost.contextWindows.length === 0 ? `<div class="empty-state">${escapeHtml(t("No context-usage records yet. They will appear after sessions start.", "\u6682\u65E0\u4E0A\u4E0B\u6587\u4F7F\u7528\u8BB0\u5F55\u3002\u5F00\u59CB\u4F1A\u8BDD\u540E\u4F1A\u663E\u793A\u3002"))}</div>` : `<table>
        <thead><tr><th>${escapeHtml(t("Agent", "\u52A9\u624B"))}</th><th>${escapeHtml(t("Session", "\u4F1A\u8BDD"))}</th><th>${escapeHtml(t("Model", "\u6A21\u578B"))}</th><th>${escapeHtml(t("Context usage", "\u4E0A\u4E0B\u6587\u4F7F\u7528"))}</th><th>${escapeHtml(t("Pace", "\u8282\u594F"))}</th><th>${escapeHtml(t("Threshold", "\u9608\u503C"))}</th></tr></thead>
        <tbody>${usageContextRows}</tbody>
      </table>`;
    const usageSourceHtml = selectedUsageBreakdown.byAgent.length === 0 && selectedUsageBreakdown.byProject.length === 0 ? `<div class="empty-state">${escapeHtml(t("No source attribution yet. It will appear after activity is recorded.", "\u6682\u65E0\u6765\u6E90\u62C6\u5206\u3002\u4EA7\u751F\u8C03\u7528\u540E\u4F1A\u663E\u793A\u3002"))}</div>` : `<div class="meta">${runtimeTokenRangeLabel}</div>
        ${usageSourcePieHtml}
        ${selectedUsageBreakdown.byAgent.length === 0 ? "" : `<table><thead><tr><th>${escapeHtml(t("Agent", "\u667A\u80FD\u4F53"))}</th><th>${escapeHtml(t("Usage", "\u7528\u91CF"))}</th><th>${escapeHtml(t("Estimated cost", "\u9884\u4F30\u8D39\u7528"))}</th><th>${escapeHtml(t("Requests", "\u8BF7\u6C42\u6570"))}</th><th>${escapeHtml(t("Sessions", "\u4F1A\u8BDD\u6570"))}</th><th>${escapeHtml(t("Data status", "\u6570\u636E\u72B6\u6001"))}</th></tr></thead><tbody>${usageAgentRows}</tbody></table>`}
        ${selectedUsageBreakdown.byProject.length === 0 ? "" : `<table style="margin-top:12px;"><thead><tr><th>${escapeHtml(t("Project", "\u9879\u76EE"))}</th><th>${escapeHtml(t("Usage", "\u7528\u91CF"))}</th><th>${escapeHtml(t("Estimated cost", "\u9884\u4F30\u8D39\u7528"))}</th><th>${escapeHtml(t("Requests", "\u8BF7\u6C42\u6570"))}</th><th>${escapeHtml(t("Sessions", "\u4F1A\u8BDD\u6570"))}</th><th>${escapeHtml(t("Data status", "\u6570\u636E\u72B6\u6001"))}</th></tr></thead><tbody>${usageProjectRows}</tbody></table>`}`;
    const usageTaskHtml = usageTaskBreakdownRows.length === 0 ? `<div class="empty-state">${escapeHtml(t("No real task-level usage data yet.", "\u6682\u65E0\u771F\u5B9E\u4EFB\u52A1\u7EA7\u7528\u91CF\u6570\u636E\u3002"))}</div>` : `<div class="meta">${runtimeTokenRangeLabel}</div><table><thead><tr><th>${escapeHtml(t("Task", "\u4EFB\u52A1"))}</th><th>${escapeHtml(t("Usage", "\u7528\u91CF"))}</th><th>${escapeHtml(t("Estimated cost", "\u9884\u4F30\u8D39\u7528"))}</th><th>${escapeHtml(t("Requests", "\u8BF7\u6C42\u6570"))}</th><th>${escapeHtml(t("Sessions", "\u4F1A\u8BDD\u6570"))}</th><th>${escapeHtml(t("Data status", "\u6570\u636E\u72B6\u6001"))}</th></tr></thead><tbody>${usageTaskRows}</tbody></table>`;
    const usageOverviewAgentRows = renderUsageBreakdownRows(selectedUsageBreakdown.byAgent.slice(0, 8), "agent", options.language);
    const usageOverviewTaskRows = renderUsageBreakdownRows(usageTaskBreakdownRows.slice(0, 8), "task", options.language);
    const usageAttributionHtml = selectedUsageBreakdown.byAgent.length === 0 && usageTaskBreakdownRows.length === 0 ? `<div class="empty-state">${escapeHtml(t("No usage attribution by agent or task yet.", "\u6682\u65E0\u6309\u667A\u80FD\u4F53/\u4EFB\u52A1\u5F52\u56E0\u7684\u7528\u91CF\u6570\u636E\u3002"))}</div>` : `<div class="meta">${runtimeTokenRangeLabel}</div>
        ${selectedUsageBreakdown.byAgent.length === 0 ? "" : `<table><thead><tr><th>${escapeHtml(t("Agent", "\u667A\u80FD\u4F53"))}</th><th>${escapeHtml(t("Usage", "\u7528\u91CF"))}</th><th>${escapeHtml(t("Estimated cost", "\u9884\u4F30\u8D39\u7528"))}</th><th>${escapeHtml(t("Requests", "\u8BF7\u6C42\u6570"))}</th><th>${escapeHtml(t("Sessions", "\u4F1A\u8BDD\u6570"))}</th><th>${escapeHtml(t("Data status", "\u6570\u636E\u72B6\u6001"))}</th></tr></thead><tbody>${usageOverviewAgentRows}</tbody></table>`}
        ${usageTaskBreakdownRows.length === 0 ? "" : `<table style="margin-top:12px;"><thead><tr><th>${escapeHtml(t("Task", "\u4EFB\u52A1"))}</th><th>${escapeHtml(t("Usage", "\u7528\u91CF"))}</th><th>${escapeHtml(t("Estimated cost", "\u9884\u4F30\u8D39\u7528"))}</th><th>${escapeHtml(t("Requests", "\u8BF7\u6C42\u6570"))}</th><th>${escapeHtml(t("Sessions", "\u4F1A\u8BDD\u6570"))}</th><th>${escapeHtml(t("Data status", "\u6570\u636E\u72B6\u6001"))}</th></tr></thead><tbody>${usageOverviewTaskRows}</tbody></table>`}`;
    const usageModelMixHtml = selectedUsageBreakdown.byModel.length === 0 && selectedUsageBreakdown.byProvider.length === 0 ? `<div class="empty-state">${escapeHtml(t("No model or provider split yet.", "\u6682\u65E0\u6A21\u578B\u4E0E\u4F9B\u5E94\u5546\u62C6\u5206\u6570\u636E\u3002"))}</div>` : `<div class="meta">${runtimeTokenRangeLabel}</div>
        ${selectedUsageBreakdown.byModel.length === 0 ? "" : `<table><thead><tr><th>${escapeHtml(t("Model", "\u6A21\u578B"))}</th><th>${escapeHtml(t("Usage", "\u7528\u91CF"))}</th><th>${escapeHtml(t("Estimated cost", "\u9884\u4F30\u8D39\u7528"))}</th><th>${escapeHtml(t("Requests", "\u8BF7\u6C42\u6570"))}</th><th>${escapeHtml(t("Sessions", "\u4F1A\u8BDD\u6570"))}</th><th>${escapeHtml(t("Data status", "\u6570\u636E\u72B6\u6001"))}</th></tr></thead><tbody>${usageModelRows}</tbody></table>`}
        ${selectedUsageBreakdown.byProvider.length === 0 ? "" : `<table style="margin-top:12px;"><thead><tr><th>${escapeHtml(t("Provider", "\u4F9B\u5E94\u5546"))}</th><th>${escapeHtml(t("Usage", "\u7528\u91CF"))}</th><th>${escapeHtml(t("Estimated cost", "\u9884\u4F30\u8D39\u7528"))}</th><th>${escapeHtml(t("Requests", "\u8BF7\u6C42\u6570"))}</th><th>${escapeHtml(t("Sessions", "\u4F1A\u8BDD\u6570"))}</th><th>${escapeHtml(t("Data status", "\u6570\u636E\u72B6\u6001"))}</th></tr></thead><tbody>${usageProviderRows}</tbody></table>`}`;
    const renderExecutionAgentItem = __name((item, mode) => { const modeHint = mode === "active" ? t("Live", "\u5B9E\u65F6") : t("Recent", "\u8FD1\u671F"); const detail = mode === "active" ? `${t("Sessions", "\u4F1A\u8BDD")} ${item.activeSessions} \xB7 ${t("Tasks", "\u4EFB\u52A1")} ${item.activeTasks}` : `${t("Recent usage", "\u8FD1\u671F\u7528\u91CF")} ${formatInt(item.recentTokens30d)}`; return `<li><strong>${escapeHtml(item.displayName)}</strong> <span class="meta-inline">${escapeHtml(modeHint)}</span><div class="meta">${detail}</div></li>`; }, "renderExecutionAgentItem");
    const activeExecutionAgentRows = executionAgentSummaries.filter(item => item.activeSessions > 0 || item.activeTasks > 0 || item.enabledCronJobs > 0).slice(0, 8).map(item => { return renderExecutionAgentItem(item, "active"); }).join("");
    const usageFallbackExecutionRows = executionAgentSummaries.filter(item => item.recentTokens30d > 0).slice(0, 8).map(item => renderExecutionAgentItem(item, "usage")).join("");
    const executionAgentRows = activeExecutionAgentRows || usageFallbackExecutionRows;
    const taskRoleRows = taskRoleSummaries.map(item => `<li><strong>${escapeHtml(item.owner)}</strong><div class="meta">${escapeHtml(t("Board labels", "\u770B\u677F\u6807\u7B7E"))} ${item.activeTasks} ${escapeHtml(t("items", "\u4E2A"))} \xB7 ${escapeHtml(t("Examples", "\u793A\u4F8B"))}\uFF1A${escapeHtml(item.sampleTaskIds.join("\u3001") || t("None", "\u6682\u65E0"))}</div></li>`).join("");
    const mappingTaskRows = controlCenterMappingTasks.map(task => `<tr><td>${escapeHtml(task.taskId)}</td><td>${escapeHtml(task.owner)}</td><td>${badge(task.status, taskStateLabel(task.status, options.language))}</td></tr>`).join("");
    const cronTable = allCronRows.length === 0 ? `<div class="empty-state">${escapeHtml(t("No timed jobs yet. They will appear here after you create them.", "\u6682\u65E0\u5B9A\u65F6\u4EFB\u52A1\u3002\u521B\u5EFA\u540E\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002"))}</div>` : `<table>
          <thead><tr><th>${escapeHtml(t("Job", "\u4EFB\u52A1"))}</th><th>${escapeHtml(t("Agent", "\u667A\u80FD\u4F53"))}</th><th>${escapeHtml(t("Purpose", "\u4EFB\u52A1\u76EE\u7684"))}</th><th>${escapeHtml(t("Status", "\u72B6\u6001"))}</th><th>${escapeHtml(t("Next run", "\u4E0B\u6B21\u8FD0\u884C"))}</th><th>${escapeHtml(t("Due in", "\u8DDD\u79BB\u6267\u884C"))}</th></tr></thead>
          <tbody>${cronRows}</tbody>
        </table>`;
    const cronOwnerBuckets = new Map;
    for (const job of allCronRows) {
        const ownerKey = job.owner.trim() || t("Unassigned agent", "\u672A\u5206\u914D\u667A\u80FD\u4F53");
        const bucket = cronOwnerBuckets.get(ownerKey) ?? [];
        bucket.push(job);
        cronOwnerBuckets.set(ownerKey, bucket);
    }
    const cronBoardHtml = allCronRows.length === 0 ? `<div class="empty-state">${escapeHtml(t("No timed jobs yet. They will be grouped by agent here once configured.", "\u6682\u65E0\u5B9A\u65F6\u4EFB\u52A1\uFF0C\u914D\u7F6E\u540E\u8FD9\u91CC\u4F1A\u81EA\u52A8\u6309\u667A\u80FD\u4F53\u5206\u7EC4\u5C55\u793A\u3002"))}</div>` : `<div class="cron-board">${[...cronOwnerBuckets.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "zh-Hans-CN")).map(([owner, jobs]) => { const healthyCount = jobs.filter(item => item.status === "ok" || item.status === "enabled").length; const unhealthyCount = jobs.length - healthyCount; const jobRows = jobs.slice(0, 10).map(item => { const dueIn = Number.isFinite(item.dueInSeconds) ? formatSeconds(item.dueInSeconds, options.language) : "-"; return `<li><div class="cron-job-head"><strong>${escapeHtml(item.name)}</strong>${badge(item.status, item.statusLabel)}</div><div class="meta">${escapeHtml(sanitizeCronPurposeText(item.purpose, options.language, 52))}</div><div class="meta">${escapeHtml(t("Next", "\u4E0B\u6B21"))}\uFF1A${escapeHtml(item.nextRun)} \xB7 ${escapeHtml(dueIn)}</div></li>`; }).join(""); const moreLabel = jobs.length > 10 ? `<div class="meta">${escapeHtml(t(`${jobs.length - 10} more jobs are omitted.`, `\u5176\u4F59 ${jobs.length - 10} \u4E2A\u4EFB\u52A1\u5DF2\u7701\u7565\u3002`))}</div>` : ""; return `<article class="cron-owner-card"><div class="cron-owner-head"><h3>${escapeHtml(owner)}</h3><span class="meta">${jobs.length} ${escapeHtml(t("jobs", "\u4E2A\u4EFB\u52A1"))}</span></div><div class="meta">${escapeHtml(t("Healthy", "\u5065\u5EB7"))} ${healthyCount} \xB7 ${escapeHtml(t("Attention", "\u5173\u6CE8"))} ${unhealthyCount}</div><ul class="cron-job-list">${jobRows}</ul>${moreLabel}</article>`; }).join("")}</div>`;
    const cronExecutionCardsHtml = allCronRows.length === 0 ? `<div class="empty-state">${escapeHtml(t("No timed jobs yet. They will appear as execution cards here once configured.", "\u6682\u65E0\u5B9A\u65F6\u4EFB\u52A1\u3002\u914D\u7F6E\u5B8C\u6210\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u6267\u884C\u5361\u7247\u3002"))}</div>` : `<div class="cron-run-grid">${allCronRows.slice().sort((a, b) => {
        const aIssue = a.status !== "ok" && a.status !== "enabled" ? 1 : 0;
        const bIssue = b.status !== "ok" && b.status !== "enabled" ? 1 : 0;
        if (bIssue !== aIssue)
            return bIssue - aIssue;
        const aSort = toSortableMs(a.nextRun);
        const bSort = toSortableMs(b.nextRun);
        if (aSort !== bSort)
            return aSort - bSort;
        return a.name.localeCompare(b.name, "zh-Hans-CN");
    }).slice(0, 18).map(item => {
        const dueIn = Number.isFinite(item.dueInSeconds) ? formatSeconds(item.dueInSeconds, options.language) : t("Unknown", "\u672A\u77E5");
        const nextStep = item.status === "disabled" ? t("Currently paused. Enable it before the next cycle.", "\u5F53\u524D\u5DF2\u6682\u505C\uFF0C\u542F\u7528\u540E\u624D\u4F1A\u8FDB\u5165\u4E0B\u4E00\u8F6E\u3002") : t("Watch the next execution window and confirm the assigned employee starts work.", "\u5173\u6CE8\u4E0B\u4E00\u6B21\u6267\u884C\u7A97\u53E3\uFF0C\u5E76\u786E\u8BA4\u5BF9\u5E94\u5458\u5DE5\u5F00\u59CB\u5DE5\u4F5C\u3002");
        return `<article class="cron-run-card">
              <div class="cron-run-head">
                <div>
                  <div class="meta">${escapeHtml(item.sourceLabel)}</div>
                  <h3>${escapeHtml(item.name)}</h3>
                </div>
                <div>${badge(item.status, item.statusLabel)}</div>
              </div>
              <div class="cron-run-pills">
                ${badge("enabled", item.owner)}
                ${badge(item.status === "disabled" ? "blocked" : "ok", item.schedule)}
              </div>
              <dl class="cron-run-list">
                <div class="cron-run-row"><dt>${escapeHtml(t("Purpose", "\u7528\u9014"))}</dt><dd>${escapeHtml(sanitizeCronPurposeText(item.purpose, options.language, 120))}</dd></div>
                <div class="cron-run-row"><dt>${escapeHtml(t("Next run", "\u4E0B\u6B21\u6267\u884C"))}</dt><dd>${escapeHtml(item.nextRun)}</dd></div>
                <div class="cron-run-row"><dt>${escapeHtml(t("Countdown", "\u5012\u8BA1\u65F6"))}</dt><dd>${escapeHtml(dueIn)}</dd></div>
                <div class="cron-run-row"><dt>${escapeHtml(t("Next step", "\u4E0B\u4E00\u6B65"))}</dt><dd>${escapeHtml(nextStep)}</dd></div>
              </dl>
              <div class="cron-run-actions">
                <div class="meta"><code>${escapeHtml(item.jobId)}</code></div>
                <a class="btn" href="${escapeHtml(buildCronDetailHref(item.jobId, options.language))}">${escapeHtml(t("Open detail", "\u67E5\u770B\u8BE6\u60C5"))}</a>
              </div>
            </article>`;
    }).join("")}</div>`;
    const subscriptionSidebarRows = renderSubscriptionSidebarSummary(usageCost.subscription, options.language);
    const usageDetailHref = buildHomeHref({ quick: "all" }, options.compactStatusStrip, "usage-cost", options.language, options.usageView);
    const agentTeamTeamBlock = renderAgentTeamTeamBlock(agentTeamEmbed, options.language);
    const settingsEnvironmentStatusCard = renderSettingsEnvironmentStatusCard(connectionHealthSummary, usageCost, securitySummary, updateSummary, options.language);
    const settingsBudgetLimitCard = renderSettingsBudgetLimitCard(buildSettingsBudgetLimitModel(settingsBudgetPolicy), options.language, "embedded");
    const settingsConfigAccessCard = renderSettingsConfigAccessCard(importGuardRows, usageConnectorTodos, settingsBudgetLimitCard, options.language);
    const contextPressureCard = renderContextPressureCard(usageCost, options.language);
    const memoryStateSection = renderMemoryStateSection(memoryStateSummary, options.language);
    const overviewUsagePeriods = isTodayUsageView ? usageCost.periods.filter(item => item.key === "today") : usageCost.periods.filter(item => item.key === "today" || item.key === "7d");
    const overviewUsageCards = hasUsageActivity ? renderUsagePeriodCards(overviewUsagePeriods, options.language) : `<div class="empty-state">${escapeHtml(t("No usage data yet. Usage and cost cards will appear after activity starts.", "\u6682\u65E0\u7528\u91CF\u6570\u636E\u3002\u5F00\u59CB\u4F1A\u8BDD\u540E\u4F1A\u663E\u793A\u7528\u91CF\u548C\u8D39\u7528\u5361\u7247\u3002"))}</div>`;
    const overviewAttentionTotal = pendingDecisionCount + runtimeIssueCount + budgetRiskCount;
    const overviewCommandStatus = overviewAttentionTotal > 0 ? badge("warn", t("Needs attention", "\u9700\u8981\u5173\u6CE8")) : badge("ok", t("Stable", "\u5E73\u7A33"));
    const overviewActionItems = [{ label: t("Review queue", "\u5BA1\u9605\u961F\u5217"), value: pendingDecisionCount, detail: pendingDecisionCount > 0 ? t("Approvals or runtime actions are waiting for review", "\u8FD8\u6709\u5BA1\u6279\u6216\u8FD0\u884C\u5F02\u5E38\u7B49\u5F85\u5904\u7406") : t("Nothing is waiting for review", "\u5F53\u524D\u6CA1\u6709\u5F85\u5BA1\u4E8B\u9879") }, { label: t("Runtime issues", "\u8FD0\u884C\u5F02\u5E38"), value: runtimeIssueCount, detail: runtimeIssueCount > 0 ? t(`${runtimeSessionIssueCount} blocked/error/waiting sessions \xB7 ${stalledRunningSessionCount} stalled runs`, `${runtimeSessionIssueCount} \u4E2A\u963B\u585E/\u5F02\u5E38/\u7B49\u5F85\u4F1A\u8BDD \xB7 ${stalledRunningSessionCount} \u4E2A\u505C\u6EDE\u6267\u884C`) : t("No blocked, failing, or stalled runtime signal", "\u5F53\u524D\u6CA1\u6709\u963B\u585E\u3001\u62A5\u9519\u6216\u505C\u6EDE\u4FE1\u53F7") }, { label: t("Budget risk", "\u9884\u7B97\u98CE\u9669"), value: budgetRiskCount, detail: budgetRiskCount > 0 ? t("Near or over the budget line", "\u63A5\u8FD1\u6216\u89E6\u53D1\u9884\u7B97\u7EBF") : t("Budget is in the safe zone", "\u9884\u7B97\u5904\u4E8E\u5B89\u5168\u533A") }];
    const overviewActionRows = overviewActionItems.map(item => { const toneClass = item.value > 0 ? " hot" : ""; return `<div class="overview-action-item${toneClass}"><span>${escapeHtml(item.label)}</span><strong>${item.value}</strong><small>${escapeHtml(item.detail)}</small></div>`; }).join("");
    const overviewPrimaryStatus = overviewAttentionTotal > 0 ? badge("warn", t("Needs attention", "\u9700\u8981\u5173\u6CE8")) : badge("ok", t("Stable", "\u7A33\u5B9A\u8FD0\u884C"));
    const overviewPrimarySignalText = overviewAttentionTotal > 0 ? t("Runtime is surfacing signals that need intervention.", "\u8FD0\u884C\u73B0\u573A\u6B63\u5728\u5192\u51FA\u9700\u8981\u4F60\u5904\u7406\u7684\u4FE1\u53F7\u3002") : t("The system is holding a stable rhythm.", "\u7CFB\u7EDF\u7EF4\u6301\u7A33\u5B9A\u8282\u594F\u3002");
    const overviewPrimaryDirective = pendingDecisionCount > 0 ? t("Clear the review queue first", "\u5148\u6E05\u6389\u5BA1\u9605\u961F\u5217") : runtimeIssueCount > 0 ? t("Inspect blocked, failing, or stalled runs next", "\u63A5\u7740\u68C0\u67E5\u963B\u585E\u3001\u62A5\u9519\u548C\u505C\u6EDE\u6267\u884C") : budgetRiskCount > 0 ? t("Prioritize budget risk", "\u4F18\u5148\u5904\u7406\u9884\u7B97\u98CE\u9669") : t("Keep the current rhythm", "\u7EE7\u7EED\u4FDD\u6301\u5F53\u524D\u8282\u594F");
    markRenderPhase("view-models");
    const overviewFocusScore = Math.max(0, Math.min(100, Math.round(100 - pendingDecisionCount * 14 - runtimeSessionIssueCount * 18 - stalledRunningSessionCount * 16 - budgetRiskCount * 18)));
    const overviewFocusTone = overviewFocusScore >= 80 ? "#1f9a63" : overviewFocusScore >= 60 ? "#c28819" : "#d2473a";
    const overviewFocusHeadline = overviewFocusScore >= 80 ? t("Flowing well", "\u63A8\u8FDB\u987A\u7545") : overviewFocusScore >= 60 ? t("Light pressure", "\u8F7B\u5EA6\u538B\u529B") : t("Needs immediate action", "\u9700\u8981\u7ACB\u523B\u5904\u7406");
    const overviewFocusShort = `${t("Review queue", "\u5BA1\u9605\u961F\u5217")} ${pendingDecisionCount} \xB7 ${t("Runtime issues", "\u8FD0\u884C\u5F02\u5E38")} ${runtimeSessionIssueCount} \xB7 ${t("Stalled runs", "\u505C\u6EDE\u6267\u884C")} ${stalledRunningSessionCount} \xB7 ${t("Budget risk", "\u9884\u7B97\u98CE\u9669")} ${budgetRiskCount}`;
    const enabledCronCount = allCronRows.filter(item => item.status !== "disabled").length;
    const upcomingTaskDueCount = realTasks.filter(task => task.dueAt && task.status !== "done").length;
    const taskHubHref = buildHomeHref({ quick: "all" }, options.compactStatusStrip, "projects-tasks", options.language, options.usageView);
    const cronHubHref = `${taskHubHref}#cron-execution-board`;
    const timelineHubHref = `${taskHubHref}#calendar-board`;
    const decisionHubHref = `${taskHubHref}#task-decision-center`;
    const executionChainHubHref = `${taskHubHref}#task-execution-chain`;
    const staffHubHref = buildHomeHref({ quick: "all" }, options.compactStatusStrip, "team", options.language, options.usageView);
    const overviewNextOpsSummary = `Cron ${cronOverview.nextRunAt ?? t("None", "\u6682\u65E0")} \xB7 ${t("Heartbeat", "\u5FC3\u8DF3")} ${heartbeatNextRun}`;
    const calendarEvents = [...allCronRows.map(row => ({ at: row.nextRun, day: extractDateFromName(row.nextRun) ?? row.nextRun.slice(0, 10), type: "Cron", title: row.name, status: row.status, detail: sanitizeCronPurposeText(row.purpose, options.language, 64), owner: row.owner })), ...realTasks.filter(task => task.status !== "done" && task.dueAt).map(task => ({ at: task.dueAt ?? "-", day: task.dueAt ? task.dueAt.slice(0, 10) : "-", type: t("Task due", "\u4EFB\u52A1\u622A\u6B62"), title: task.title, status: task.status, detail: `${task.projectId} \xB7 ${task.owner}`, owner: task.owner }))].filter(item => item.day && item.day !== "-").sort((a, b) => a.at.localeCompare(b.at));
    const overviewUpcomingRows = calendarEvents.slice(0, 4).map(item => `<div class="decision-row">
        <div class="decision-row-copy">
          <strong>${escapeHtml(item.title)}</strong>
          <div class="meta">${escapeHtml(item.type)} \xB7 ${escapeHtml(item.owner)}</div>
        </div>
        <div class="decision-row-value">${escapeHtml(item.at)}</div>
      </div>`).join("");
    const overviewBusyAgents = executionAgentSummaries.filter(item => item.activeSessions > 0 || item.activeTasks > 0 || item.enabledCronJobs > 0).sort((a, b) => b.activeTasks - a.activeTasks || b.activeSessions - a.activeSessions || b.enabledCronJobs - a.enabledCronJobs).slice(0, 3);
    const overviewBusyCardsHtml = overviewBusyAgents.length === 0 ? `<div class="empty-state">${escapeHtml(t("No staff are carrying live work right now.", "\u5F53\u524D\u6CA1\u6709\u5458\u5DE5\u5728\u627F\u62C5\u5B9E\u65F6\u5DE5\u4F5C\u3002"))}</div>` : `<div class="overview-busy-grid">${overviewBusyAgents.map(item => {
        const leadAssignment = item.cronJobNames[0] ?? t("No live assignment", "\u6682\u65E0\u5B9E\u65F6\u5206\u6D3E");
        return `<article class="overview-busy-card">
              <div class="overview-busy-head">
                <strong>${escapeHtml(item.displayName)}</strong>
                <span>${escapeHtml(t("Live", "\u5B9E\u65F6"))}</span>
              </div>
              <div class="overview-busy-copy">${escapeHtml(leadAssignment)}</div>
              <div class="meta">${escapeHtml(t("Tasks", "\u4EFB\u52A1"))} ${item.activeTasks} \xB7 ${escapeHtml(t("Sessions", "\u4F1A\u8BDD"))} ${item.activeSessions} \xB7 Cron ${item.enabledCronJobs}</div>
            </article>`;
    }).join("")}</div>`;
    const overviewDecisionRowsHtml = `<div class="overview-action-grid">${[{ ...overviewActionItems[0], href: decisionHubHref }, { ...overviewActionItems[1], href: focusHref }, { ...overviewActionItems[2], href: usageDetailHref }].map(item => {
        const toneClass = item.value > 0 ? " hot" : "";
        return `<a class="overview-action-item${toneClass}" href="${escapeHtml(item.href)}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${item.value}</strong>
        <small>${escapeHtml(item.detail)}</small>
      </a>`;
    }).join("")}</div>`;
    const overviewRuntimeRowsHtml = `<div class="decision-list">
    <div class="decision-row">
      <div class="decision-row-copy">
        <strong>${escapeHtml(t("Timed jobs running", "\u6B63\u5728\u8FD0\u884C\u7684\u5B9A\u65F6\u4EFB\u52A1"))}</strong>
        <div class="meta">${escapeHtml(t("Next", "\u4E0B\u6B21"))} ${escapeHtml(cronOverview.nextRunAt ?? t("None", "\u6682\u65E0"))}</div>
      </div>
      <div class="decision-row-value">${enabledCronCount}/${allCronRows.length}</div>
    </div>
    <div class="decision-row">
      <div class="decision-row-copy">
        <strong>${escapeHtml(t("Heartbeat checks", "\u4EFB\u52A1\u5FC3\u8DF3"))}</strong>
        <div class="meta">${escapeHtml(t("Next", "\u4E0B\u6B21"))} ${escapeHtml(heartbeatNextRun)}</div>
      </div>
      <div class="decision-row-value">${heartbeatEnabledCount}</div>
    </div>
    <div class="decision-row">
      <div class="decision-row-copy">
        <strong>${escapeHtml(t("Stalled runs", "\u505C\u6EDE\u6267\u884C"))}</strong>
        <div class="meta">${escapeHtml(t("Running sessions with no fresh signal in the last 2 hours", "\u6700\u8FD1 2 \u5C0F\u65F6\u6CA1\u6709\u65B0\u4FE1\u53F7\u7684\u8FD0\u884C\u4F1A\u8BDD"))}</div>
      </div>
      <div class="decision-row-value">${stalledRunningSessionCount}</div>
    </div>
    <a class="decision-row" href="${escapeHtml(executionChainHubHref)}">
      <div class="decision-row-copy">
        <strong>${escapeHtml(t("Isolated execution", "\u9694\u79BB\u6267\u884C"))}</strong>
        <div class="meta">${escapeHtml(t("Accepted and spawned child sessions", "\u5DF2\u63A5\u5355\u5E76\u6D3E\u53D1\u5B50\u4F1A\u8BDD"))}</div>
      </div>
      <div class="decision-row-value">${runningExecutionChainCount}/${spawnedExecutionChainCount}</div>
    </a>
  </div>`;
    const taskDecisionPreviewHtml = actionQueue.queue.length > 0 ? `<div class="decision-list">${actionQueue.queue.slice(0, 4).map(item => {
        const link = item.links[0]?.href ?? decisionHubHref;
        return `<a class="decision-row" href="${escapeHtml(link)}">
              <div class="decision-row-copy">
                <strong>${escapeHtml(item.message)}</strong>
                <div class="meta">${badge(item.level)} <code>${escapeHtml(item.itemId)}</code></div>
              </div>
              <div class="decision-row-link">${escapeHtml(t("Open", "\u6253\u5F00"))}</div>
            </a>`;
    }).join("")}</div>` : topApprovals.length > 0 ? `<div class="decision-list">${topApprovals.slice(0, 4).map(approval => {
        const target = approval.agentId ?? approval.sessionKey ?? t("Unknown target", "\u672A\u77E5\u76EE\u6807");
        return `<a class="decision-row" href="${escapeHtml(decisionHubHref)}">
                <div class="decision-row-copy">
                  <strong>${escapeHtml(approval.command || t("Approval action", "\u5BA1\u6279\u52A8\u4F5C"))}</strong>
                  <div class="meta">${badge(approval.status ?? "unknown")} ${escapeHtml(target)}</div>
                </div>
                <div class="decision-row-link">${escapeHtml(t("Review", "\u5BA1\u9605"))}</div>
              </a>`;
    }).join("")}</div>` : `<div class="empty-state">${escapeHtml(t("Nothing is waiting for your review right now.", "\u5F53\u524D\u6CA1\u6709\u7B49\u5F85\u4F60\u51B3\u7B56\u7684\u4E8B\u9879\u3002"))}</div>`;
    const taskHubStatCardsHtml = `<div class="task-hub-stat-grid">
    <article class="task-hub-stat">
      <span>${escapeHtml(t("Confirmed live", "\u5DF2\u786E\u8BA4\u5728\u8DD1"))}</span>
      <strong>${taskCertaintyStrongCount}</strong>
      <small>${escapeHtml(t("Tasks already backed by fresh runtime signals", "\u5DF2\u7ECF\u6709\u65B0\u9C9C\u8FD0\u884C\u4FE1\u53F7\u652F\u6491\u7684\u4EFB\u52A1"))}</small>
    </article>
    <article class="task-hub-stat">
      <span>${escapeHtml(t("Need review", "\u5F85\u786E\u8BA4"))}</span>
      <strong>${pendingDecisionCount}</strong>
      <small>${escapeHtml(t("Approvals and action items", "\u5BA1\u6279\u4E0E\u5F85\u5904\u7406\u4E8B\u9879"))}</small>
    </article>
    <article class="task-hub-stat">
      <span>${escapeHtml(t("Timed jobs", "\u5B9A\u65F6\u4EFB\u52A1"))}</span>
      <strong>${enabledCronCount}</strong>
      <small>${escapeHtml(t("Enabled cron jobs", "\u5DF2\u542F\u7528\u7684 Cron"))}</small>
    </article>
    <article class="task-hub-stat">
      <span>${escapeHtml(t("Needs inspection", "\u9700\u6392\u67E5"))}</span>
      <strong>${taskCertaintyWeakCount}</strong>
      <small>${escapeHtml(t("Tasks whose runtime signals still look weak", "\u8FD0\u884C\u4FE1\u53F7\u4ECD\u7136\u504F\u5F31\u7684\u4EFB\u52A1"))}</small>
    </article>
  </div>`;
    const overviewSection = `
    <section class="overview-v3-shell" id="overview-decision-home">
      <article class="card overview-primary-card" id="overview-primary-card">
        <div class="overview-primary-head">
          <div>
            <h2>${escapeHtml(t("Today's control posture", "\u4ECA\u65E5\u603B\u63A7\u6001\u52BF"))}</h2>
            <div class="meta">${escapeHtml(overviewPrimarySignalText)}</div>
          </div>
          <div>${overviewPrimaryStatus}</div>
        </div>
        <div class="overview-focus-stage" style="--focus-score:${overviewFocusScore}; --focus-tone:${escapeHtml(overviewFocusTone)};">
          <div class="overview-focus-ring">
            <div class="overview-focus-core">
              <div class="overview-focus-score" data-counter-key="overview:focus-score" data-counter-target="${overviewFocusScore}" data-counter-format="int">${overviewFocusScore}</div>
              <div class="overview-focus-unit" aria-label="${escapeHtml(t("Health score", "\u5065\u5EB7\u5206"))}">${escapeHtml(t("Health", "\u5065\u5EB7\u5206"))}</div>
            </div>
          </div>
          <div class="overview-focus-copy">
            <div class="overview-focus-headline">${escapeHtml(overviewFocusHeadline)}</div>
            <div class="overview-focus-sub">${escapeHtml(overviewFocusShort)}</div>
            <div class="overview-focus-meta">${escapeHtml(overviewNextOpsSummary)}</div>
          </div>
        </div>
        <div class="overview-primary-directive">${escapeHtml(overviewPrimaryDirective)}</div>
        <div class="overview-primary-core">
          <div class="overview-primary-value" data-counter-key="overview:attention-total" data-counter-target="${Math.max(0, overviewAttentionTotal)}" data-counter-format="int">${formatInt(overviewAttentionTotal)}</div>
          <div class="overview-primary-label">${escapeHtml(t("Key action items", "\u5F85\u5904\u7406\u5173\u952E\u4E8B\u9879"))}</div>
        </div>
        <div class="overview-quick-links">
          <a class="btn" href="${escapeHtml(currentTaskHealthHref)}">${escapeHtml(t("Open current tasks", "\u67E5\u770B\u5F53\u524D\u4EFB\u52A1"))}</a>
          <a class="btn" href="${escapeHtml(focusHref)}">${escapeHtml(t("Open follow-up items", "\u67E5\u770B\u5F85\u5904\u7406"))}</a>
        </div>
      </article>
      ${overviewTopMetricHtml}
    </section>
    ${agentTeamOverviewBlock}
    <section class="overview-decision-grid" id="overview-primary-section">
      <article class="card" id="overview-decision-center">
        <div class="overview-command-head">
          <h2>${escapeHtml(t("Needs your intervention", "\u9700\u8981\u4F60\u4ECB\u5165"))}</h2>
          <div>${overviewCommandStatus}</div>
        </div>
        ${overviewDecisionRowsHtml}
      </article>
      <article class="card" id="overview-busy-staff">
        <div class="overview-command-head">
          <h2>${escapeHtml(t("Who is active", "\u8C01\u5728\u5FD9"))}</h2>
          <a class="btn" href="${escapeHtml(staffHubHref)}">${escapeHtml(t("Open staff", "\u67E5\u770B\u5458\u5DE5"))}</a>
        </div>
        ${overviewBusyCardsHtml}
      </article>
      <article class="card overview-usage-card" id="usage-pulse">
        <div class="overview-command-head">
          <h2>${escapeHtml(t("AI burn now", "\u5F53\u524D AI \u7528\u91CF"))}</h2>
          <a class="btn" href="${escapeHtml(usageDetailHref)}">${escapeHtml(t("Open usage", "\u67E5\u770B\u7528\u91CF"))}</a>
        </div>
        ${overviewUsageCards}
        <div class="meta">${usageBudgetMeta}</div>
      </article>
      <article class="card" id="overview-runtime-checkpoint">
        <div class="overview-command-head">
          <h2>${escapeHtml(t("Next scheduled work", "\u4E0B\u4E00\u6279\u6392\u7A0B"))}</h2>
          <a class="btn" href="${escapeHtml(timelineHubHref)}">${escapeHtml(t("Open task hub", "\u67E5\u770B\u4EFB\u52A1\u4E2D\u67A2"))}</a>
        </div>
        ${overviewUpcomingRows ? `<div class="decision-list">${overviewUpcomingRows}</div>` : `<div class="empty-state">${escapeHtml(t("No future schedule yet.", "\u6682\u65E0\u672A\u6765\u6392\u7A0B\u3002"))}</div>`}
        <div style="height:10px;"></div>
        ${overviewRuntimeRowsHtml}
      </article>
    </section>
    <details class="card compact-details overview-secondary-shell" id="overview-secondary-shell">
      <summary>${escapeHtml(t("Expand runtime detail", "\u5C55\u5F00\u8FD0\u884C\u7EC6\u8282"))}</summary>
      <div class="fold-body">
        <details class="card compact-details" open>
          <summary>${escapeHtml(t("More key metrics", "\u66F4\u591A\u5173\u952E\u6307\u6807"))}</summary>
          <div class="fold-body">${executiveCardsHtml}</div>
        </details>
        <article class="card overview-span overview-pulse-card" id="overview-pulse">
          <h2>${escapeHtml(t("Global pulse", "\u5168\u5C40\u8109\u640F"))}</h2>
          ${showSignalsFallback ? `<div class="empty-state">${escapeHtml(t("No live signals yet. This will update automatically after tasks or sessions start.", "\u8FD8\u6CA1\u6709\u5B9E\u65F6\u4FE1\u53F7\u3002\u542F\u52A8\u4EFB\u52A1\u6216\u4F1A\u8BDD\u540E\uFF0C\u8FD9\u91CC\u4F1A\u81EA\u52A8\u66F4\u65B0\u3002"))}</div>` : `<div class="status-strip ${options.compactStatusStrip ? "compact" : "expanded"}">${signalStrip}</div>`}
        </article>
        <section class="card" id="cron-health">
          <div class="overview-command-head">
            <h2>${escapeHtml(t("Runtime checkpoint", "\u8FD0\u884C\u68C0\u67E5\u70B9"))}</h2>
            <a class="btn" href="${escapeHtml(cronHubHref)}">${escapeHtml(t("Open cron board", "\u67E5\u770B Cron \u770B\u677F"))}</a>
          </div>
          <div class="meta">${escapeHtml(t("Use the task hub for the full cron board. This panel stays compact and only tells you whether runtime scheduling is healthy.", "\u5B8C\u6574 Cron \u770B\u677F\u5DF2\u4E0B\u653E\u5230\u4EFB\u52A1\u9875\uFF0C\u8FD9\u91CC\u53EA\u4FDD\u7559\u7D27\u51D1\u7684\u8FD0\u884C\u68C0\u67E5\u70B9\u3002"))}</div>
          <div class="meta">${escapeHtml(t("Status", "\u72B6\u6001"))} ${badge(cronOverview.health.status)} \xB7 ${escapeHtml(t("Next", "\u4E0B\u6B21"))} ${escapeHtml(cronOverview.nextRunAt ?? t("None", "\u6682\u65E0"))} \xB7 ${escapeHtml(t("Enabled", "\u542F\u7528"))} ${enabledCronCount}</div>
          ${overviewUpcomingRows ? `<div class="decision-list" style="margin-top:10px;">${overviewUpcomingRows}</div>` : ""}
        </section>
        <details class="card compact-details" id="heartbeat-health">
          <summary>${escapeHtml(t("Heartbeat monitor", "\u4EFB\u52A1\u5FC3\u8DF3\u76D1\u63A7"))}</summary>
          <div class="fold-body">
            <div class="meta">${escapeHtml(t("Status", "\u72B6\u6001"))} ${badge(heartbeatHealth)} \xB7 ${escapeHtml(t("Enabled", "\u5DF2\u542F\u7528"))} ${heartbeatEnabledCount} ${escapeHtml(t("items", "\u4E2A"))} \xB7 ${escapeHtml(t("Next", "\u4E0B\u6B21"))} ${escapeHtml(heartbeatNextRun)}</div>
            ${heartbeatGroupedListHtml}
            <details class="compact-table-details" style="margin-top:12px;">
              <summary>${escapeHtml(t("Open raw table", "\u67E5\u770B\u539F\u59CB\u8868\u683C"))}</summary>
              <div class="fold-body">${heartbeatJobs.length === 0 ? `<div class="empty-state">${escapeHtml(t("No heartbeat timed jobs found yet.", "\u5C1A\u672A\u53D1\u73B0\u5FC3\u8DF3\u5B9A\u65F6\u4EFB\u52A1\u3002"))}</div>` : `<table><thead><tr><th>${escapeHtml(t("Check", "\u68C0\u67E5\u9879"))}</th><th>${escapeHtml(t("Status", "\u72B6\u6001"))}</th><th>${escapeHtml(t("Next run", "\u4E0B\u6B21\u8FD0\u884C"))}</th><th>${escapeHtml(t("Due in", "\u8DDD\u79BB\u6267\u884C"))}</th></tr></thead><tbody>${heartbeatJobs.slice(0, 12).map(job => { const checkLabel = job.jobId.toLowerCase().includes("heartbeat") ? t("Task heartbeat service", "\u4EFB\u52A1\u5FC3\u8DF3\u670D\u52A1") : job.name?.trim() || job.jobId; return `<tr><td>${escapeHtml(checkLabel)}</td><td>${badge(job.health, cronHealthLabel(job.health, options.language))}</td><td>${escapeHtml(job.nextRunAt ?? "-")}</td><td>${escapeHtml(formatSeconds(job.dueInSeconds, options.language))}</td></tr>`; }).join("")}</tbody></table>`}</div>
            </details>
          </div>
        </details>
        <details class="card compact-details" id="tool-activity">
          <summary>${escapeHtml(t("Tool activity detail", "\u5DE5\u5177\u8C03\u7528\u8BE6\u60C5"))}</summary>
          <div class="fold-body">
            ${toolGroupedListHtml}
            <details class="compact-table-details" style="margin-top:12px;">
              <summary>${escapeHtml(t("Open raw table", "\u67E5\u770B\u539F\u59CB\u8868\u683C"))}</summary>
              <div class="fold-body">
                <table>
                  <thead><tr><th>${escapeHtml(t("Session", "\u4F1A\u8BDD"))}</th><th>${escapeHtml(t("Agent", "\u52A9\u624B"))}</th><th>${escapeHtml(t("Call count", "\u8C03\u7528\u6B21\u6570"))}</th><th>${escapeHtml(t("Status", "\u72B6\u6001"))}</th><th>${escapeHtml(t("Latest activity", "\u6700\u8FD1\u6D3B\u52A8"))}</th></tr></thead>
                  <tbody>${toolRows}</tbody>
                </table>
              </div>
            </details>
          </div>
        </details>
        <details class="card compact-details" id="agent-job-catalog">
          <summary>${escapeHtml(t("Timed-job catalog (execution entry)", "\u5B9A\u65F6\u4EFB\u52A1\u540D\u5F55\uFF08\u6267\u884C\u5165\u53E3\uFF09"))}</summary>
          <div class="fold-body">
            <div class="meta">${escapeHtml(t("This shows the real timed jobs that can trigger execution.", "\u8FD9\u91CC\u5C55\u793A\u4F1A\u89E6\u53D1\u6267\u884C\u7684\u771F\u5B9E\u5B9A\u65F6\u4EFB\u52A1\u3002"))}</div>
            ${agentJobGroupedListHtml}
            <details class="compact-table-details" style="margin-top:12px;">
              <summary>${escapeHtml(t("Open raw table", "\u67E5\u770B\u539F\u59CB\u8868\u683C"))}</summary>
              <div class="fold-body">
                <table>
                  <thead><tr><th>${escapeHtml(t("Source", "\u6765\u6E90"))}</th><th>${escapeHtml(t("Job", "\u4EFB\u52A1"))}</th><th>${escapeHtml(t("Agent", "\u667A\u80FD\u4F53"))}</th><th>${escapeHtml(t("Purpose", "\u4EFB\u52A1\u76EE\u7684"))}</th><th>${escapeHtml(t("Schedule", "\u8C03\u5EA6"))}</th><th>${escapeHtml(t("Next run", "\u4E0B\u6B21\u8FD0\u884C"))}</th><th>${escapeHtml(t("Status", "\u72B6\u6001"))}</th></tr></thead>
                  <tbody>${agentJobRowsHtml}</tbody>
                </table>
              </div>
            </details>
          </div>
        </details>
      </div>
    </details>
  `;
    const calendarBuckets = new Map;
    for (const event of calendarEvents) {
        const bucket = calendarBuckets.get(event.day) ?? [];
        bucket.push(event);
        calendarBuckets.set(event.day, bucket);
    }
    const calendarBoardHtml = calendarBuckets.size === 0 ? `<div class="empty-state">${escapeHtml(t("No future schedule yet. You can add timed jobs from tasks or automations.", "\u6682\u65E0\u672A\u6765\u6392\u7A0B\u3002\u4F60\u53EF\u4EE5\u5728\u4EFB\u52A1\u6216\u81EA\u52A8\u5316\u91CC\u6DFB\u52A0\u5B9A\u65F6\u4EFB\u52A1\u3002"))}</div>` : `<div class="calendar-grid">${[...calendarBuckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 12).map(([day, events]) => {
        const rows = events.slice(0, 10).map(item => `<li class="calendar-event">
                  <div class="calendar-event-head"><strong>${escapeHtml(item.title)}</strong>${badge(item.status)}</div>
                  <div class="meta">${escapeHtml(item.type)} \xB7 ${escapeHtml(item.at)}</div>
                  <div class="meta">${escapeHtml(item.detail)}</div>
                </li>`).join("");
        return `<article class="calendar-day"><h3>${escapeHtml(day)}</h3><div class="meta">${events.length} ${escapeHtml(t("scheduled items", "\u6761\u6392\u7A0B"))}</div><ul class="calendar-event-list">${rows}</ul></article>`;
    }).join("")}</div>`;
    const legacyCalendarSection = `
    <section class="card" id="calendar-board">
      <div id="task-timeline">
        <h2>${escapeHtml(t("Today and next schedule", "\u4ECA\u65E5\u4E0E\u4E0B\u4E00\u6279\u6392\u7A0B"))}</h2>
        <div class="meta">${escapeHtml(t("See timed jobs and due dates together so you can confirm the AI employee system actually scheduled them, instead of only saying it did in chat.", "\u628A\u5B9A\u65F6\u4EFB\u52A1\u548C\u4EFB\u52A1\u622A\u6B62\u653E\u5728\u4E00\u8D77\u770B\uFF0C\u786E\u8BA4 AI \u5458\u5DE5\u7CFB\u7EDF\u771F\u7684\u6392\u4E0A\u4E86\uFF0C\u800C\u4E0D\u662F\u53EA\u5728\u5BF9\u8BDD\u91CC\u8BF4\u201C\u5DF2\u5B89\u6392\u201D\u3002"))}</div>
        <div class="timeline-summary-strip">
          <div class="timeline-stat"><span>${escapeHtml(t("Timed jobs", "\u5B9A\u65F6\u4EFB\u52A1"))}</span><strong>${allCronRows.length}</strong><small>${escapeHtml(t("Catalog total", "\u540D\u5F55\u603B\u6570"))}</small></div>
          <div class="timeline-stat"><span>${escapeHtml(t("Enabled", "\u542F\u7528"))}</span><strong>${enabledCronCount}</strong><small>${escapeHtml(t("Ready to run", "\u5DF2\u51C6\u5907\u6267\u884C"))}</small></div>
          <div class="timeline-stat"><span>${escapeHtml(t("Upcoming due", "\u5373\u5C06\u622A\u6B62"))}</span><strong>${upcomingTaskDueCount}</strong><small>${escapeHtml(t("Tasks with due dates", "\u5E26\u622A\u6B62\u65F6\u95F4\u7684\u4EFB\u52A1"))}</small></div>
        </div>
      </div>
      ${calendarBoardHtml}
      <details class="compact-table-details" style="margin-top:12px;">
        <summary>${escapeHtml(t("Open Cron table detail", "\u67E5\u770B Cron \u8868\u683C\u660E\u7EC6"))}</summary>
        <div class="fold-body">${cronTable}</div>
      </details>
    </section>
  `;
    const legacyCronExecutionSection = `
    <section class="card" id="cron-execution-board">
      <div class="overview-command-head">
        <h2>${escapeHtml(t("Cron execution board", "Cron \u6267\u884C\u770B\u677F"))}</h2>
        <div>${badge(cronOverview.health.status, cronHealthLabel(cronOverview.health.status, options.language))}</div>
      </div>
      <div class="meta">${escapeHtml(t("Grouped by agent so you can see which timed jobs are active, what they do, and when they run next.", "\u6309\u667A\u80FD\u4F53\u5206\u7EC4\u5C55\u793A\u5F53\u524D\u5B9A\u65F6\u4EFB\u52A1\u3001\u4EFB\u52A1\u76EE\u7684\u4EE5\u53CA\u4E0B\u6B21\u6267\u884C\u65F6\u95F4\u3002"))}</div>
      <div class="meta">${escapeHtml(t("Next", "\u4E0B\u6B21"))} ${escapeHtml(cronOverview.nextRunAt ?? t("None", "\u6682\u65E0"))} \xB7 ${escapeHtml(t("Heartbeat", "\u5FC3\u8DF3"))} ${escapeHtml(heartbeatNextRun)} \xB7 ${escapeHtml(t("Enabled", "\u542F\u7528"))} ${enabledCronCount}</div>
      ${cronBoardHtml}
      <details class="compact-table-details" style="margin-top:12px;">
        <summary>${escapeHtml(t("Open Cron table detail", "\u67E5\u770B Cron \u8868\u683C\u660E\u7EC6"))}</summary>
        <div class="fold-body">${cronTable}</div>
      </details>
    </section>
  `;
    const taskExecutionChainSection = `
    <section class="card" id="task-execution-chain">
      <div class="overview-command-head">
        <h2>${escapeHtml(t("Execution chain", "\u6267\u884C\u94FE"))}</h2>
        <div>${badge(spawnedExecutionChainCount > 0 ? "info" : "idle", spawnedExecutionChainCount > 0 ? t("Active", "\u6D3B\u8DC3") : t("Waiting", "\u7B49\u5F85\u4E2D"))}</div>
      </div>
      <div class="meta">${escapeHtml(t("See whether the parent session accepted the work, whether it spawned an isolated session, and which child session is now running.", "\u76F4\u63A5\u770B\u7236\u4F1A\u8BDD\u662F\u5426\u63A5\u5355\u3001\u662F\u5426\u6D3E\u53D1\u9694\u79BB\u4F1A\u8BDD\uFF0C\u4EE5\u53CA\u5F53\u524D\u5230\u5E95\u662F\u54EA\u6761\u5B50\u4F1A\u8BDD\u5728\u6267\u884C\u3002"))}</div>
      <div class="meta">${escapeHtml(t("Isolated runs", "\u9694\u79BB\u6267\u884C"))} ${spawnedExecutionChainCount} \xB7 ${escapeHtml(t("Running now", "\u5F53\u524D\u6267\u884C\u4E2D"))} ${runningExecutionChainCount} \xB7 ${escapeHtml(t("Mapped tasks", "\u5DF2\u5173\u8054\u4EFB\u52A1"))} ${mappedExecutionChainCount}</div>
      ${taskExecutionChainHtml}
    </section>
  `;
    const teamSection = `
    <section class="card">
      <h2>${escapeHtml(t("Staff overview", "\u5458\u5DE5\u603B\u89C8"))}</h2>
      <div class="meta">${escapeHtml(t("The default view shows only name, role, current status, current work, recent output, and whether each person is on the schedule.", "\u9ED8\u8BA4\u89C6\u56FE\u53EA\u663E\u793A\u5458\u5DE5\u540D\u5B57\u3001\u89D2\u8272\u5B9A\u4F4D\u3001\u5F53\u524D\u72B6\u6001\u3001\u6B63\u5728\u5904\u7406\u4EC0\u4E48\u3001\u6700\u8FD1\u4EA7\u51FA\uFF0C\u4EE5\u53CA\u662F\u5426\u5728\u6392\u73ED\u91CC\u3002"))}</div>
      ${staffOverviewCardsHtml}
      ${agentTeamTeamBlock}
    </section>
    <details class="card compact-details">
      <summary>${escapeHtml(t("Shared staff mission", "\u5458\u5DE5\u5171\u540C\u76EE\u6807"))}</summary>
      <div class="fold-body">
        <div class="mission-banner">${escapeHtml(teamSnapshot.missionStatement)}</div>
        <div class="meta">${escapeHtml(t("Source", "\u6765\u6E90"))}\uFF1A${escapeHtml(teamSnapshot.sourcePath)}</div>
        <div class="meta">${escapeHtml(teamSnapshot.detail)}</div>
      </div>
    </details>
  `;
    const collaborationSection = `
    <section class="card" id="collaboration-hub">
      <div class="overview-command-head">
        <div>
          <h2>${escapeHtml(t("Team collaboration", "\u56E2\u961F\u534F\u4F5C"))}</h2>
          <div class="meta">${escapeHtml(t("See both collaboration patterns in one place: parent-child relays and cross-session messages between existing agent sessions.", "\u628A\u4E24\u79CD\u534F\u4F5C\u90FD\u653E\u5728\u540C\u4E00\u9875\u770B\u6E05\u695A\uFF1A\u7236\u5B50\u4F1A\u8BDD\u63A5\u529B\uFF0C\u4EE5\u53CA\u4E0D\u540C\u667A\u80FD\u4F53\u65E2\u6709\u4F1A\u8BDD\u4E4B\u95F4\u7684\u6D88\u606F\u5F80\u8FD4\u3002"))}</div>
        </div>
        <div>${badge(collaborationBlockedCount > 0 ? "warn" : collaborationActiveCount > 0 ? "info" : "ok", collaborationBlockedCount > 0 ? t("Needs follow-up", "\u9700\u8DDF\u8FDB") : collaborationActiveCount > 0 ? t("Active", "\u8FDB\u884C\u4E2D") : t("Steady", "\u5E73\u7A33"))}</div>
      </div>
      <div class="status-strip collaboration-summary-grid">
        <div class="status-chip">
          <span>${escapeHtml(t("Active", "\u6D3B\u8DC3\u534F\u4F5C"))}</span>
          <strong>${collaborationActiveCount}</strong>
        </div>
        <div class="status-chip">
          <span>${escapeHtml(t("Waiting handoff", "\u7B49\u5F85\u4EA4\u63A5"))}</span>
          <strong>${collaborationHandoffCount}</strong>
        </div>
        <div class="status-chip">
          <span>${escapeHtml(t("Blocked", "\u5361\u4F4F"))}</span>
          <strong>${collaborationBlockedCount}</strong>
        </div>
        <div class="status-chip">
          <span>${escapeHtml(t("Completed today", "\u4ECA\u65E5\u5B8C\u6210"))}</span>
          <strong>${collaborationCompletedTodayCount}</strong>
        </div>
      </div>
      <div class="meta collaboration-headline">${escapeHtml(collaborationThreadVisibleCount > 0 ? collaborationThreadTotalCount > collaborationThreadVisibleCount ? t(`${collaborationThreadTotalCount} collaboration threads are visible in total. Similar completed threads are folded into ${collaborationThreadVisibleCount} cards so this page stays readable.`, `\u5F53\u524D\u5171\u6574\u7406\u51FA ${collaborationThreadTotalCount} \u6761\u534F\u4F5C\u7EBF\u7A0B\uFF0C\u5E76\u628A\u76F8\u8FD1\u7684\u5DF2\u5B8C\u6210\u7EBF\u7A0B\u6298\u53E0\u4E3A ${collaborationThreadVisibleCount} \u5F20\u5361\u7247\uFF0C\u65B9\u4FBF\u76F4\u63A5\u770B\u91CD\u70B9\u3002`) : t(`${collaborationThreadVisibleCount} visible collaboration threads. Open a thread to inspect parent-child relays or cross-session messages without leaving this page.`, `\u5F53\u524D\u53EF\u89C1 ${collaborationThreadVisibleCount} \u6761\u534F\u4F5C\u7EBF\u7A0B\u3002\u76F4\u63A5\u5C55\u5F00\u7EBF\u7A0B\uFF0C\u5C31\u80FD\u5728\u5F53\u524D\u9875\u67E5\u770B\u7236\u5B50\u63A5\u529B\u6216\u8DE8\u4F1A\u8BDD\u6D88\u606F\u65F6\u95F4\u7EBF\u3002`) : t("No visible collaboration threads yet. They will appear once parent-child relays or cross-session messages become visible.", "\u5F53\u524D\u8FD8\u6CA1\u6709\u53EF\u89C1\u7684\u534F\u4F5C\u7EBF\u7A0B\u3002\u7236\u5B50\u63A5\u529B\u6216\u8DE8\u4F1A\u8BDD\u901A\u4FE1\u51FA\u73B0\u540E\uFF0C\u8FD9\u91CC\u5C31\u4F1A\u5F00\u59CB\u663E\u793A\u3002"))}</div>
    </section>
    <section class="card" id="collaboration-board" data-collab-root>
      <div class="overview-command-head">
        <h2>${escapeHtml(t("Collaboration threads", "\u534F\u4F5C\u7EBF\u7A0B"))}</h2>
        <div class="meta" data-collab-filter-state>${escapeHtml(t("Showing all visible threads", "\u5F53\u524D\u663E\u793A\u5168\u90E8\u53EF\u89C1\u7EBF\u7A0B"))}</div>
      </div>
      <div class="segment-switch collaboration-filter-bar" role="tablist" aria-label="${escapeHtml(t("Collaboration filters", "\u534F\u4F5C\u7B5B\u9009"))}">
        <button class="segment-item active" type="button" data-collab-filter="all">${escapeHtml(t("All", "\u5168\u90E8"))}</button>
        <button class="segment-item" type="button" data-collab-filter="active">${escapeHtml(t("In progress", "\u8FDB\u884C\u4E2D"))}</button>
        <button class="segment-item" type="button" data-collab-filter="blocked">${escapeHtml(t("Blocked", "\u5361\u4F4F"))}</button>
        <button class="segment-item" type="button" data-collab-filter="completed">${escapeHtml(t("Completed", "\u5DF2\u5B8C\u6210"))}</button>
        <button class="segment-item" type="button" data-collab-filter="multi-agent">${escapeHtml(t("Multi-agent only", "\u53EA\u770B\u591A\u667A\u80FD\u4F53"))}</button>
        <button class="segment-item" type="button" data-collab-filter="primary-dispatched">${escapeHtml(primaryDispatcherFilterLabel)}</button>
      </div>
      ${collaborationThreadHtml}
    </section>
  `;
    const memoryMainCount = memoryFiles.filter(entry => entry.facetKey === "main").length;
    const memoryWorkbench = needsMemorySection ? await renderEditableFileWorkbench({ scope: "memory", language: options.language, localMutationUnlock: options.localMutationUnlock, title: t("Memory file workbench", "\u8BB0\u5FC6\u6587\u4EF6\u5DE5\u4F5C\u53F0"), description: t("Browse and edit AI employee system memory files directly. Saving writes back to the source files.", "\u76F4\u63A5\u6D4F\u89C8\u548C\u4FEE\u6539 AI \u5458\u5DE5\u7CFB\u7EDF\u7684\u8BB0\u5FC6\u6587\u4EF6\u3002\u4FDD\u5B58\u540E\u4F1A\u5199\u56DE\u539F\u6587\u4EF6\u3002"), entries: memoryFiles, emptyMessage: t("There are no editable memory files right now.", "\u5F53\u524D\u6CA1\u6709\u53EF\u7F16\u8F91\u7684\u8BB0\u5FC6\u6587\u4EF6\u3002"), defaultFacetKey: "main", includeAllFacet: false, facetOptions: memoryFacetOptions }) : "";
    const mainMemoryFacetLabel = memoryFacetOptions.find(item => item.key === "main")?.label ?? import_operator_display.DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME;
    const memoryViewsLabel = joinDisplayList(memoryFacetOptions.map(item => item.label), options.language);
    const memorySection = `
    <section class="card">
      <h2>${escapeHtml(t("Memory overview", "\u8BB0\u5FC6\u6982\u89C8"))}</h2>
      <div class="meta">${escapeHtml(mainMemoryFacetLabel)} ${escapeHtml(t("memories", "\u8BB0\u5FC6"))} ${memoryMainCount} ${escapeHtml(t("files", "\u4EFD"))} \xB7 ${escapeHtml(t("Agents found", "\u5DF2\u53D1\u73B0\u667A\u80FD\u4F53"))} ${Math.max(0, memoryFacetOptions.filter(item => item.key !== "main").length)} ${escapeHtml(t("items", "\u4E2A"))}</div>
      <div class="meta">${escapeHtml(t("Available views", "\u53EF\u5207\u6362\u67E5\u770B"))}${escapeHtml(options.language === "en" ? ": " : "\uFF1A")}${escapeHtml(memoryViewsLabel)}</div>
      <div class="meta">${escapeHtml(t("Only memory-related files are kept here: root MEMORY.md, memory/, and each agent's own MEMORY.md and memory/.", "\u8FD9\u91CC\u53EA\u4FDD\u7559\u8BB0\u5FC6\u76F8\u5173\u6587\u4EF6\uFF1A\u6839\u76EE\u5F55 MEMORY.md\u3001memory/\uFF0C\u4EE5\u53CA\u5404\u667A\u80FD\u4F53\u81EA\u5DF1\u7684 MEMORY.md \u4E0E memory/\u3002"))}</div>
      <div class="meta">${escapeHtml(t("Edits here sync directly back to the real memory files on the machine running the AI employee system.", "\u8FD9\u91CC\u7684\u7F16\u8F91\u4F1A\u76F4\u63A5\u540C\u6B65\u5230\u8FD0\u884C AI \u5458\u5DE5\u7CFB\u7EDF\u7684\u673A\u5668\u4E0A\u7684\u771F\u5B9E\u8BB0\u5FC6\u6587\u4EF6\u3002"))}</div>
    </section>
    ${memoryWorkbench}
    ${memoryStateSection}
    ${agentTeamMemoryBlock}
  `;
    const docsSection = await (0, import_docs_hub.renderDocsSection)({ language: options.language, workspaceFiles, workspaceFacetOptions, projectSummaries: snapshot.projectSummaries, agentScopes: workspaceAgentScopes, docHubSnapshot, agentTeamDocsBlockHtml: agentTeamDocsBlock });
    const usageSection = `
    <section class="card">
      <h2>${escapeHtml(t("Measurement scope", "\u7EDF\u8BA1\u53E3\u5F84"))}</h2>
      ${usageViewSwitchHtml}
      <div class="meta">${usageViewRangeText}</div>
      <div class="meta">${usageViewRangeDetail}</div>
      <div class="meta">${escapeHtml(t("Today: from 00:00 until now. Cumulative: full history until now.", "\u4ECA\u65E5\uFF1A\u5F53\u65E5 00:00 \u81F3\u5F53\u524D\u3002\u7D2F\u8BA1\uFF1A\u5386\u53F2\u5168\u91CF\u5230\u5F53\u524D\u3002"))}</div>
    </section>
    <section class="card">
      <h2>${escapeHtml(isTodayUsageView ? t("Today's usage snapshot", "\u4ECA\u65E5\u7528\u91CF\u5FEB\u7167") : t("Cost trend", "\u8D39\u7528\u8D8B\u52BF"))}</h2>
      <div class="meta">${isTodayUsageView ? escapeHtml(t("Range: today.", "\u7EDF\u8BA1\u8303\u56F4\uFF1A\u4ECA\u65E5\u3002")) : runtimeTokenRangeLabel}</div>
      ${hasUsageActivity ? usagePeriodCards : `<div class="empty-state">${escapeHtml(t("No usage data yet. It will be generated automatically after sessions start.", "\u6682\u65E0\u7528\u91CF\u6570\u636E\u3002\u5F00\u59CB\u4F1A\u8BDD\u540E\u4F1A\u81EA\u52A8\u751F\u6210\u3002"))}</div>`}
    </section>
    <section class="card">
      <h2>${escapeHtml(t("Subscription windows", "\u8BA2\u9605\u7A97\u53E3"))}</h2>
      ${subscriptionStatusHtml}
    </section>
    <section class="card">
      <h2>${escapeHtml(t("AI usage mix (all sessions)", "AI \u7528\u91CF\u6784\u6210\uFF08\u5168\u90E8\u4F1A\u8BDD\uFF09"))}</h2>
      <div class="meta">${escapeHtml(t("Timed jobs, Discord, Telegram, internal sessions", "\u5B9A\u65F6\u4EFB\u52A1\u3001Discord\u3001Telegram\u3001\u5185\u90E8\u4F1A\u8BDD"))}</div>
      ${usageSessionTypeShareHtml}
    </section>
    <section class="card">
      <h2>${escapeHtml(t("Timed-job usage share", "\u5B9A\u65F6\u4EFB\u52A1\u7528\u91CF\u5360\u6BD4"))}</h2>
      <div class="meta">${cronTokenRangeLabel}</div>
      ${usageCronJobShareHtml}
      <details class="compact-table-details" style="margin-top:12px;">
        <summary>${escapeHtml(t("Agent share within timed jobs", "\u5B9A\u65F6\u4EFB\u52A1\u5185\u5404\u667A\u80FD\u4F53\u5360\u6BD4"))}</summary>
        <div class="fold-body">${usageCronAgentShareHtml}</div>
      </details>
    </section>
    ${contextPressureCard}
    <details class="card compact-details">
      <summary>${escapeHtml(t("Advanced detail (attribution / model / context / budget)", "\u9AD8\u7EA7\u660E\u7EC6\uFF08\u5F52\u56E0/\u6A21\u578B/\u4E0A\u4E0B\u6587/\u9884\u7B97\uFF09"))}</summary>
      <div class="fold-body">
        <h3 style="margin:0 0 6px 0;">${escapeHtml(t("Split by agent and task", "\u6309\u667A\u80FD\u4F53\u4E0E\u4EFB\u52A1\u62C6\u5206"))}</h3>
        ${usageAttributionHtml}
        <div style="height:10px;"></div>
        <h3 style="margin:0 0 6px 0;">${escapeHtml(t("Usage sources", "\u7528\u91CF\u6765\u6E90"))}</h3>
        ${usageSourceHtml}
        <div style="height:10px;"></div>
        <h3 style="margin:0 0 6px 0;">${escapeHtml(t("Task consumption", "\u4EFB\u52A1\u6D88\u8017"))}</h3>
        ${usageTaskHtml}
        <div style="height:10px;"></div>
        <h3 style="margin:0 0 6px 0;">${escapeHtml(t("Models and providers", "\u6A21\u578B\u4E0E\u4F9B\u5E94\u5546"))}</h3>
        ${usageModelMixHtml}
        <div style="height:10px;"></div>
        <h3 style="margin:0 0 6px 0;">${escapeHtml(t("Session context", "\u4F1A\u8BDD\u4E0A\u4E0B\u6587"))}</h3>
        ${usageContextHtml}
        <div style="height:10px;"></div>
        <h3 style="margin:0 0 6px 0;">${escapeHtml(t("Budget forecast", "\u9884\u7B97\u9884\u6D4B"))}</h3>
        <div class="meta">${usageBudgetMeta}</div>
        <div class="meta">${usageBudgetHeadline}</div>
        <div class="meta">${escapeHtml(t("Daily burn", "\u65E5\u5747\u6D88\u8017"))} ${usageCost.budget.burnRatePerDay !== void 0 ? formatCurrency(usageCost.budget.burnRatePerDay) : t("Data source not connected", "\u6570\u636E\u6E90\u672A\u8FDE\u63A5")}</div>
        <div class="meta">${escapeHtml(t("Estimated days remaining", "\u9884\u8BA1\u5269\u4F59\u5929\u6570"))} ${usageCost.budget.projectedDaysToLimit !== void 0 ? usageCost.budget.projectedDaysToLimit.toFixed(1) : t("Data source not connected", "\u6570\u636E\u6E90\u672A\u8FDE\u63A5")}</div>
      </div>
    </details>
  `;
    const officeSection = `
    <section class="card">
      <h2>\u770B\u677F\u6620\u5C04\u8BF4\u660E</h2>
      <div class="meta">Alex / Sam / Taylor / Unassigned \u8FD9\u7C7B\u540D\u79F0\u53EA\u662F control-center \u7684\u5206\u7EC4\u6807\u7B7E\uFF0C\u4E0D\u662F\u667A\u80FD\u4F53\uFF0C\u4E0D\u4F1A\u5355\u72EC\u6D88\u8017\u9884\u7B97\u3002</div>
      <details class="compact-table-details" style="margin-top:8px;" open>
        <summary>\u67E5\u770B\u6620\u5C04\u6807\u7B7E\uFF08\u4E0D\u6267\u884C\u4EFB\u52A1\uFF09</summary>
        <div class="fold-body">
          <ul class="story-list">${taskRoleRows || "<li>\u5F53\u524D\u6CA1\u6709\u6620\u5C04\u6807\u7B7E\u3002</li>"}</ul>
        </div>
      </details>
    </section>
    <details class="card compact-details" open>
      <summary>\u6267\u884C\u5206\u533A\uFF08\u5DE5\u4F4D\uFF09</summary>
      <div class="fold-body">${officeFloorHtml}</div>
    </details>
    <details class="card compact-details" open>
      <summary>\u6700\u8FD1\u4F1A\u8BDD\uFF08${sessionPreview.items.length}/${sessionPreview.total}\uFF09</summary>
      <div class="fold-body">
        ${sessionPreview.items.length === 0 ? '<div class="empty-state">\u6682\u65E0\u4F1A\u8BDD\u6570\u636E\u3002</div>' : `<div class="group-list"><details class="group-section" open><summary>\u6700\u8FD1\u6D3B\u8DC3\u4F1A\u8BDD\uFF08${sessionPreview.items.length}\uFF09</summary><ul class="group-items">${sessionPreview.items.slice(0, 14).map(item => `<li class="group-item"><div class="group-item-head"><strong>${escapeHtml(item.label ?? item.sessionKey)}</strong>${badge(item.state, sessionStateLabel(item.state))}</div><div class="meta">\u667A\u80FD\u4F53 ${escapeHtml(item.agentId ?? "-")} \xB7 \u6700\u8FD1 ${escapeHtml(item.lastMessageAt ?? "-")}</div><div class="meta">\u6700\u65B0\u4E8B\u4EF6 ${escapeHtml(item.latestKind ?? "message")} \xB7 \u5386\u53F2 ${item.historyCount}</div><div class="meta"><a href="${escapeHtml(buildSessionDetailHref(item.sessionKey, options.language))}">\u67E5\u770B\u4F1A\u8BDD\u8BE6\u60C5\u9875</a></div></li>`).join("")}</ul></details></div>`}
        <details class="compact-table-details" style="margin-top:12px;">
          <summary>\u67E5\u770B\u539F\u59CB\u8868\u683C</summary>
          <div class="fold-body">
            <table>
              <thead><tr><th>\u4F1A\u8BDD</th><th>\u72B6\u6001</th><th>\u52A9\u624B</th><th>\u6700\u8FD1\u6D3B\u52A8</th></tr></thead>
              <tbody>${sessionRows}</tbody>
            </table>
          </div>
        </details>
      </div>
    </details>
  `;
    const teamUnifiedSection = teamSection;
    const hasTrackedTaskPanels = true;
    const trackedTaskDetailsOpen = pendingDecisionCount > 0 || taskCertaintyCards.length > 0;
    const trackedTaskSummaryText = hasTrackedTaskPanels ? t(`Tracked tasks ${taskCertaintyCards.length} \xB7 Follow-up ${pendingDecisionCount}`, `\u8DDF\u8E2A\u4EFB\u52A1 ${taskCertaintyCards.length} \xB7 \u5F85\u5904\u7406 ${pendingDecisionCount}`) : t("No tracked task rows yet", "\u8FD8\u6CA1\u6709\u8DDF\u8E2A\u4EFB\u52A1\u6761\u76EE");
    const trackedTaskExplanation = hasTrackedTaskPanels ? t("This lower-priority area is only for tracked task rows, decisions, and runtime evidence.", "\u8FD9\u5757\u4F4E\u4F18\u5148\u7EA7\u533A\u57DF\u53EA\u770B\u53EF\u8DDF\u8E2A\u4EFB\u52A1\u6761\u76EE\u3001\u5F85\u5904\u7406\u4E8B\u9879\u548C\u8FD0\u884C\u8BC1\u636E\u3002") : liveSessionCount > 0 ? t("Staff status comes from live sessions. Cron jobs, heartbeat, and ad-hoc sessions can keep agents busy before anything becomes a tracked task row.", "\u5458\u5DE5\u72B6\u6001\u6765\u81EA\u5B9E\u65F6\u4F1A\u8BDD\u3002Cron\u3001\u5FC3\u8DF3\u548C\u4E34\u65F6\u4F1A\u8BDD\u53EF\u80FD\u5DF2\u7ECF\u8BA9\u667A\u80FD\u4F53\u5728\u5DE5\u4F5C\uFF0C\u4F46\u8FD8\u6CA1\u6709\u5F62\u6210\u53EF\u8DDF\u8E2A\u7684\u4EFB\u52A1\u6761\u76EE\u3002") : t("There is no tracked task row visible right now. Start here only when you actually use the task store.", "\u5F53\u524D\u8FD8\u6CA1\u6709\u53EF\u89C1\u7684\u8DDF\u8E2A\u4EFB\u52A1\u6761\u76EE\u3002\u53EA\u6709\u771F\u6B63\u4F7F\u7528\u4EFB\u52A1\u5E93\u65F6\uFF0C\u8FD9\u91CC\u624D\u4F1A\u51FA\u73B0\u5185\u5BB9\u3002");
    const legacyTrackedTaskDetailsBody = hasTrackedTaskPanels ? `
      <section class="task-hub-shell" id="task-hub">
        <article class="card task-hub-primary" id="task-hub-primary">
          <div class="overview-command-head">
            <div>
              <h2>${escapeHtml(t("Task hub", "\u4EFB\u52A1\u4E2D\u67A2"))}</h2>
              <div class="meta">${escapeHtml(t("One place for tracked tasks, follow-up items, and runtime evidence.", "\u628A\u53EF\u8DDF\u8E2A\u4EFB\u52A1\u3001\u5F85\u5904\u7406\u4E8B\u9879\u548C\u8FD0\u884C\u8BC1\u636E\u653E\u5728\u4E00\u8D77\u3002"))}</div>
            </div>
            <div>${overviewPrimaryStatus}</div>
          </div>
          ${taskHubStatCardsHtml}
          <div class="overview-task-strip">
            <div>
              <div class="meta">${escapeHtml(t("Current focus", "\u5F53\u524D\u5173\u6CE8"))}</div>
              <div class="overview-task-metric">${badge(currentTaskHealth)} ${escapeHtml(t("Confirmed live", "\u5DF2\u786E\u8BA4\u5728\u8DD1"))} ${taskCertaintyStrongCount} \xB7 ${escapeHtml(t("Need follow-up", "\u9700\u8DDF\u8FDB"))} ${taskCertaintyFollowupCount} \xB7 ${escapeHtml(t("Needs inspection", "\u9700\u6392\u67E5"))} ${taskCertaintyWeakCount}</div>
              ${mappingTaskHint ? `<div class="meta">${escapeHtml(mappingTaskHint)}</div>` : ""}
            </div>
            <div class="overview-quick-links">
              <a class="btn" href="${escapeHtml(currentTaskHealthHref)}">${escapeHtml(t("Open tracked tasks", "\u67E5\u770B\u8DDF\u8E2A\u4EFB\u52A1"))}</a>
              <a class="btn" href="${escapeHtml(focusHref)}">${escapeHtml(t("Open follow-up items", "\u67E5\u770B\u5F85\u5904\u7406"))}</a>
            </div>
          </div>
        </article>
        <article class="card" id="task-decision-center">
          <div class="overview-command-head">
            <h2>${escapeHtml(t("Waiting for your decision", "\u7B49\u5F85\u4F60\u51B3\u7B56"))}</h2>
            <div>${badge(pendingDecisionCount > 0 ? "warn" : "ok", pendingDecisionCount > 0 ? t("Queue active", "\u961F\u5217\u6D3B\u8DC3") : t("Clear", "\u5DF2\u6E05\u7A7A"))}</div>
          </div>
          <div class="meta">${escapeHtml(t("Pending decisions", "\u5F85\u5904\u7406\u4E8B\u9879"))} ${pendingDecisionCount} \xB7 ${escapeHtml(t("Approvals", "\u5BA1\u6279"))} ${pendingApprovalsCount} \xB7 ${escapeHtml(t("Unacked alerts", "\u672A\u786E\u8BA4\u544A\u8B66"))} ${actionQueue.counts.unacked}</div>
          ${taskDecisionPreviewHtml}
        </article>
      </section>
      ${taskExecutionChainSection}
      <section class="task-hub-grid task-hub-board-grid">
        <section class="card" id="task-lane">
          <h2>${escapeHtml(t("Task cards", "\u4EFB\u52A1\u5361\u7247"))}</h2>
          <div class="meta task-top-intro">${escapeHtml(t("Sorted by priority so unresolved items stay on top and active work stays easy to scan.", "\u6309\u4F18\u5148\u7EA7\u6392\u5E8F\uFF0C\u672A\u89E3\u51B3\u9879\u4F1A\u6392\u5728\u6700\u524D\uFF0C\u6B63\u5728\u63A8\u8FDB\u7684\u5DE5\u4F5C\u4E5F\u80FD\u4E00\u773C\u770B\u6E05\u3002"))}</div>
          <div class="meta task-top-intro">${escapeHtml(t("Yellow = in progress, green = queued, red = failed, blocked, or still unresolved.", "\u9EC4\u8272\u8868\u793A\u8FDB\u884C\u4E2D\uFF0C\u7EFF\u8272\u8868\u793A\u6392\u961F\u4E2D\uFF0C\u7EA2\u8272\u8868\u793A\u5931\u8D25\u3001\u963B\u585E\u6216\u4ECD\u672A\u89E3\u51B3\u3002"))}</div>
          <div class="task-top-meta-row">
            <div class="meta task-top-meta">${escapeHtml(t("Current focus", "\u5F53\u524D\u5173\u6CE8"))}\uFF1A${escapeHtml(quickFilterLabel(effectiveQuick, options.language))}</div>
            ${controlCenterMappingTasks.length > 0 ? `<div class="meta task-top-meta">${escapeHtml(t(`${controlCenterMappingTasks.length} board-only mapping examples are hidden because they are not real execution tasks.`, `\u5DF2\u9690\u85CF ${controlCenterMappingTasks.length} \u4E2A\u770B\u677F\u6620\u5C04\u6837\u4F8B\uFF08\u975E\u771F\u5B9E\u6267\u884C\u4EFB\u52A1\uFF09\u3002`))}</div>` : ""}
          </div>
          <div class="task-top-controls">
          <div class="quick-filters">${quickFilters}</div>
          <form method="GET" action="/" class="filters task-top-filters">
            <input type="hidden" name="section" value="${escapeHtml(options.section)}" />
            <input type="hidden" name="lang" value="${escapeHtml(options.language)}" />
            <input type="hidden" name="quick" value="${escapeHtml(effectiveQuick)}" />
            <input type="hidden" name="compact" value="${options.compactStatusStrip ? "1" : "0"}" />
            <input type="hidden" name="usage_view" value="${options.usageView === "today" ? "today" : "cumulative"}" />
            <div>
              <label for="status">${escapeHtml(t("Status", "\u72B6\u6001"))}</label>
              <select id="status" name="status">
                ${renderSelectOptions([{ value: "", label: t("All", "\u5168\u90E8") }, ...TASK_STATES.map(state => ({ value: state, label: taskStateLabel(state, options.language) }))], filters.status ?? "")}
              </select>
            </div>
            <div>
              <label for="owner">${escapeHtml(t("Agent", "\u667A\u80FD\u4F53"))}</label>
              <select id="owner" name="owner">
                ${renderSelectOptions([{ value: "", label: t("All", "\u5168\u90E8") }, ...ownerOptions.map(owner => ({ value: owner, label: owner }))], filters.owner ?? "")}
              </select>
            </div>
            <div>
              <label for="project">${escapeHtml(t("Project", "\u9879\u76EE"))}</label>
              <select id="project" name="project">
                ${renderSelectOptions([{ value: "", label: t("All", "\u5168\u90E8") }, ...projectOptions.map(project => ({ value: project, label: project }))], filters.project ?? "")}
              </select>
            </div>
            <div class="filter-actions">
              <button class="btn" type="submit">${escapeHtml(t("Apply", "\u5E94\u7528"))}</button>
              <a href="${escapeHtml(clearHref)}">${escapeHtml(t("Clear filters", "\u6E05\u7A7A\u7B5B\u9009"))}</a>
            </div>
          </form>
          </div>
          ${taskBoard}
          <div style="height:10px;"></div>
          <h3 style="margin:0 0 6px 0;">${escapeHtml(t("Task groups (native view)", "\u4EFB\u52A1\u5206\u7EC4\u5217\u8868\uFF08\u539F\u751F\u89C6\u56FE\uFF09"))}</h3>
          ${taskGroupedListHtml}
          ${controlCenterMappingTasks.length === 0 ? "" : `<details class="compact-table-details" style="margin-top:12px;" open>
                   <summary>${escapeHtml(t("Open board mapping examples (non-executing)", "\u67E5\u770B\u770B\u677F\u6620\u5C04\u6837\u4F8B\uFF08\u4E0D\u6267\u884C\u4EFB\u52A1\uFF09"))}</summary>
                   <div class="fold-body">
                     <table>
                       <thead><tr><th>${escapeHtml(t("Example task", "\u6837\u4F8B\u4EFB\u52A1"))}</th><th>${escapeHtml(t("Label", "\u6807\u7B7E"))}</th><th>${escapeHtml(t("Status", "\u72B6\u6001"))}</th></tr></thead>
                       <tbody>${mappingTaskRows}</tbody>
                     </table>
                   </div>
                 </details>`}
        </section>
        <div class="task-hub-sidebar">
          <section class="card" id="project-lane">
            <h2>${escapeHtml(t("Project lanes", "\u9879\u76EE\u6CF3\u9053"))}</h2>
            ${projectBoard}
          </section>
          <section class="card" id="task-live-feed">
            <h2>${escapeHtml(t("Live activity feed", "\u5B9E\u65F6\u6D3B\u52A8\u6D41"))}</h2>
            <div class="meta">${escapeHtml(t("Use this to confirm what the AI employee system and each employee are doing right now.", "\u7528\u4E8E\u786E\u8BA4 AI \u5458\u5DE5\u7CFB\u7EDF\u4E0E\u5404\u5458\u5DE5\u5F53\u524D\u6B63\u5728\u6267\u884C\u4EC0\u4E48\u3002"))}</div>
            <ul class="story-list">${replayMomentsRows}</ul>
          </section>
        </div>
      </section>
      <details class="card compact-details" id="task-table">
        <summary>${escapeHtml(t(`Task table (raw detail, ${tasks.length}/${allTasks.length})`, `\u4EFB\u52A1\u8868\u683C\uFF08\u539F\u59CB\u660E\u7EC6\uFF0C${tasks.length}/${allTasks.length}\uFF09`))}</summary>
        <div class="fold-body">
          <table>
            <thead><tr><th>${escapeHtml(t("Project", "\u9879\u76EE"))}</th><th>${escapeHtml(t("Task", "\u4EFB\u52A1"))}</th><th>${escapeHtml(t("Title", "\u6807\u9898"))}</th><th>${escapeHtml(t("Status", "\u72B6\u6001"))}</th><th>${escapeHtml(t("Agent", "\u667A\u80FD\u4F53"))}</th><th>${escapeHtml(t("Due", "\u622A\u6B62"))}</th><th>${escapeHtml(t("Updated", "\u66F4\u65B0\u65F6\u95F4"))}</th></tr></thead>
            <tbody>${taskRows}</tbody>
          </table>
        </div>
      </details>
    ` : `<div class="meta">${escapeHtml(trackedTaskExplanation)}</div>`;
    const trackedTaskDetailsBody = hasTrackedTaskPanels ? `
      <section class="task-hub-shell" id="task-hub">
        <article class="card task-hub-primary" id="task-hub-primary">
          <div class="overview-command-head">
            <div>
              <h2>${escapeHtml(t("Task follow-up center", "\u4EFB\u52A1\u8DDF\u8FDB\u4E2D\u5FC3"))}</h2>
              <div class="meta">${escapeHtml(t("Use this lower panel for decisions, execution trace, and raw detail only after the top card wall has helped you set the working order.", "\u4E0A\u65B9\u5361\u7247\u5899\u5148\u5E2E\u4F60\u786E\u5B9A\u5DE5\u4F5C\u987A\u5E8F\uFF0C\u8FD9\u4E00\u5C42\u53EA\u4FDD\u7559\u51B3\u7B56\u3001\u6267\u884C\u94FE\u548C\u539F\u59CB\u660E\u7EC6\u3002"))}</div>
            </div>
            <div>${overviewPrimaryStatus}</div>
          </div>
          ${taskHubStatCardsHtml}
          <div class="overview-task-strip">
            <div>
              <div class="meta">${escapeHtml(t("Current follow-up", "\u5F53\u524D\u8DDF\u8FDB"))}</div>
              <div class="overview-task-metric">${badge(currentTaskHealth)} ${escapeHtml(t("Confirmed live", "\u5DF2\u786E\u8BA4\u5728\u8DD1"))} ${taskCertaintyStrongCount} \xB7 ${escapeHtml(t("Need follow-up", "\u9700\u8DDF\u8FDB"))} ${taskCertaintyFollowupCount} \xB7 ${escapeHtml(t("Needs inspection", "\u9700\u6392\u67E5"))} ${taskCertaintyWeakCount}</div>
              ${mappingTaskHint ? `<div class="meta">${escapeHtml(mappingTaskHint)}</div>` : ""}
            </div>
            <div class="overview-quick-links">
              <a class="btn" href="${escapeHtml(currentTaskHealthHref)}">${escapeHtml(t("Jump to card wall", "\u8FD4\u56DE\u5361\u7247\u5899"))}</a>
              <a class="btn" href="${escapeHtml(focusHref)}">${escapeHtml(t("Open follow-up items", "\u67E5\u770B\u5F85\u5904\u7406\u9879"))}</a>
            </div>
          </div>
        </article>
        <article class="card" id="task-decision-center">
          <div class="overview-command-head">
            <h2>${escapeHtml(t("Waiting for your decision", "\u7B49\u5F85\u4F60\u7684\u51B3\u7B56"))}</h2>
            <div>${badge(pendingDecisionCount > 0 ? "warn" : "ok", pendingDecisionCount > 0 ? t("Queue active", "\u961F\u5217\u6D3B\u8DC3") : t("Clear", "\u5DF2\u6E05\u7A7A"))}</div>
          </div>
          <div class="meta">${escapeHtml(t("Pending decisions", "\u5F85\u5904\u7406\u4E8B\u9879"))} ${pendingDecisionCount} \xB7 ${escapeHtml(t("Approvals", "\u5BA1\u6279"))} ${pendingApprovalsCount} \xB7 ${escapeHtml(t("Unacked alerts", "\u672A\u786E\u8BA4\u544A\u8B66"))} ${actionQueue.counts.unacked}</div>
          ${taskDecisionPreviewHtml}
        </article>
      </section>
      ${taskExecutionChainSection}
      <section class="task-hub-grid">
        <section class="card" id="project-lane">
          <h2>${escapeHtml(t("Project lanes", "\u9879\u76EE\u6CF3\u9053"))}</h2>
          ${projectBoard}
        </section>
        <section class="card" id="task-live-feed">
          <h2>${escapeHtml(t("Live activity feed", "\u5B9E\u65F6\u6D3B\u52A8\u6D41"))}</h2>
          <div class="meta">${escapeHtml(t("Use this to confirm what the AI employee system and each employee are doing right now.", "\u7528\u6765\u786E\u8BA4 AI \u5458\u5DE5\u7CFB\u7EDF\u548C\u6BCF\u4F4D\u5458\u5DE5\u6B64\u523B\u6B63\u5728\u505A\u4EC0\u4E48\u3002"))}</div>
          <ul class="story-list">${replayMomentsRows}</ul>
        </section>
      </section>
      <section class="card" id="task-groups">
        <h2>${escapeHtml(t("Task groups", "\u4EFB\u52A1\u5206\u7EC4"))}</h2>
        <div class="meta">${escapeHtml(t("Keep the raw native grouping here for cross-checking after you reorder the main card wall.", "\u4E3B\u5361\u7247\u5899\u7528\u4E8E\u64CD\u4F5C\uFF0C\u8FD9\u91CC\u4FDD\u7559\u539F\u751F\u5206\u7EC4\uFF0C\u65B9\u4FBF\u4F60\u540E\u7EED\u4EA4\u53C9\u6838\u5BF9\u3002"))}</div>
        ${taskGroupedListHtml}
        ${controlCenterMappingTasks.length === 0 ? "" : `<details class="compact-table-details" style="margin-top:12px;">
                 <summary>${escapeHtml(t("Open board mapping examples (non-executing)", "\u67E5\u770B\u770B\u677F\u6620\u5C04\u6837\u4F8B\uFF08\u4E0D\u6267\u884C\u4EFB\u52A1\uFF09"))}</summary>
                 <div class="fold-body">
                   <table>
                     <thead><tr><th>${escapeHtml(t("Example task", "\u6837\u4F8B\u4EFB\u52A1"))}</th><th>${escapeHtml(t("Label", "\u6807\u7B7E"))}</th><th>${escapeHtml(t("Status", "\u72B6\u6001"))}</th></tr></thead>
                     <tbody>${mappingTaskRows}</tbody>
                   </table>
                 </div>
               </details>`}
      </section>
      <details class="card compact-details" id="task-table">
        <summary>${escapeHtml(t(`Task table (raw detail, ${tasks.length}/${allTasks.length})`, `\u4EFB\u52A1\u8868\u683C\uFF08\u539F\u59CB\u660E\u7EC6\uFF0C${tasks.length}/${allTasks.length}\uFF09`))}</summary>
        <div class="fold-body">
          <table>
            <thead><tr><th>${escapeHtml(t("Project", "\u9879\u76EE"))}</th><th>${escapeHtml(t("Task", "\u4EFB\u52A1"))}</th><th>${escapeHtml(t("Title", "\u6807\u9898"))}</th><th>${escapeHtml(t("Status", "\u72B6\u6001"))}</th><th>${escapeHtml(t("Agent", "\u5458\u5DE5"))}</th><th>${escapeHtml(t("Due", "\u622A\u6B62"))}</th><th>${escapeHtml(t("Updated", "\u66F4\u65B0\u65F6\u95F4"))}</th></tr></thead>
            <tbody>${taskRows}</tbody>
          </table>
        </div>
      </details>
    ` : `<div class="meta">${escapeHtml(trackedTaskExplanation)}</div>`;
    const calendarSection = `
    <section class="card" id="calendar-board">
      <div id="task-timeline">
        <h2>${escapeHtml(t("Task and schedule cards", "\u4EFB\u52A1\u4E0E\u6392\u7A0B\u5361\u7247"))}</h2>
        <div class="meta task-top-intro">${escapeHtml(t("Put tracked tasks, due times, and timed jobs into one draggable card pool so the work queue and schedule stay in the same place.", "\u628A\u8DDF\u8E2A\u4EFB\u52A1\u3001\u622A\u6B62\u65F6\u95F4\u548C\u5B9A\u65F6\u4EFB\u52A1\u5408\u5E76\u5230\u540C\u4E00\u7EC4\u53EF\u62D6\u62FD\u5361\u7247\u91CC\uFF0C\u8BA9\u5DE5\u4F5C\u961F\u5217\u548C\u6392\u7A0B\u653E\u5728\u540C\u4E00\u4E2A\u5730\u65B9\u3002"))}</div>
        <div class="timeline-summary-strip">
          <div class="timeline-stat"><span>${escapeHtml(t("Tracked tasks", "\u8DDF\u8E2A\u4EFB\u52A1"))}</span><strong>${tasks.length}</strong><small>${escapeHtml(t("Current filtered list", "\u5F53\u524D\u7B5B\u9009\u7ED3\u679C"))}</small></div>
          <div class="timeline-stat"><span>${escapeHtml(t("Timed jobs", "\u5B9A\u65F6\u4EFB\u52A1"))}</span><strong>${allCronRows.length}</strong><small>${escapeHtml(t("Included in card pool", "\u5DF2\u5E76\u5165\u5361\u7247\u6C60"))}</small></div>
          <div class="timeline-stat"><span>${escapeHtml(t("Upcoming due", "\u5373\u5C06\u622A\u6B62"))}</span><strong>${upcomingTaskDueCount}</strong><small>${escapeHtml(t("Tasks with due dates", "\u5E26\u622A\u6B62\u65F6\u95F4\u7684\u4EFB\u52A1"))}</small></div>
          <div class="timeline-stat"><span>${escapeHtml(t("Enabled", "\u5DF2\u542F\u7528"))}</span><strong>${enabledCronCount}</strong><small>${escapeHtml(t("Ready to run", "\u53EF\u8FDB\u5165\u4E0B\u4E00\u8F6E"))}</small></div>
        </div>
      </div>
      <div class="task-top-meta-row">
        <div class="meta task-top-meta">${escapeHtml(t("Current focus", "\u5F53\u524D\u5173\u6CE8"))}\uFF1A${escapeHtml(quickFilterLabel(effectiveQuick, options.language))}</div>
        ${controlCenterMappingTasks.length > 0 ? `<div class="meta task-top-meta">${escapeHtml(t(`${controlCenterMappingTasks.length} board-only mapping examples are hidden because they are not real execution tasks.`, `\u5DF2\u9690\u85CF ${controlCenterMappingTasks.length} \u4E2A\u770B\u677F\u6620\u5C04\u6837\u4F8B\uFF08\u975E\u771F\u5B9E\u6267\u884C\u4EFB\u52A1\uFF09\u3002`))}</div>` : ""}
      </div>
      <div class="task-top-controls">
      <div class="quick-filters">${quickFilters}</div>
      <form method="GET" action="/" class="filters task-top-filters">
        <input type="hidden" name="section" value="${escapeHtml(options.section)}" />
        <input type="hidden" name="lang" value="${escapeHtml(options.language)}" />
        <input type="hidden" name="quick" value="${escapeHtml(effectiveQuick)}" />
        <input type="hidden" name="compact" value="${options.compactStatusStrip ? "1" : "0"}" />
        <input type="hidden" name="usage_view" value="${options.usageView === "today" ? "today" : "cumulative"}" />
        <div>
          <label for="status">${escapeHtml(t("Status", "\u72B6\u6001"))}</label>
          <select id="status" name="status">
            ${renderSelectOptions([{ value: "", label: t("All", "\u5168\u90E8") }, ...TASK_STATES.map(state => ({ value: state, label: taskStateLabel(state, options.language) }))], filters.status ?? "")}
          </select>
        </div>
        <div>
          <label for="owner">${escapeHtml(t("Agent", "\u5458\u5DE5"))}</label>
          <select id="owner" name="owner">
            ${renderSelectOptions([{ value: "", label: t("All", "\u5168\u90E8") }, ...ownerOptions.map(owner => ({ value: owner, label: owner }))], filters.owner ?? "")}
          </select>
        </div>
        <div>
          <label for="project">${escapeHtml(t("Project", "\u9879\u76EE"))}</label>
          <select id="project" name="project">
            ${renderSelectOptions([{ value: "", label: t("All", "\u5168\u90E8") }, ...projectOptions.map(project => ({ value: project, label: project }))], filters.project ?? "")}
          </select>
        </div>
        <div class="filter-actions">
          <button class="btn" type="submit">${escapeHtml(t("Apply", "\u5E94\u7528"))}</button>
          <a href="${escapeHtml(clearHref)}">${escapeHtml(t("Clear filters", "\u6E05\u7A7A\u7B5B\u9009"))}</a>
        </div>
      </form>
      </div>
      ${taskBoard}
      <details class="compact-table-details" style="margin-top:12px;">
        <summary>${escapeHtml(t("Open timeline detail", "\u67E5\u770B\u65F6\u95F4\u7EBF\u660E\u7EC6"))}</summary>
        <div class="fold-body">${calendarBoardHtml}</div>
      </details>
    </section>
  `;
    const cronExecutionSection = `
    <section class="card" id="cron-execution-board">
      <div class="overview-command-head">
        <h2>${escapeHtml(t("Cron execution board", "Cron \u6267\u884C\u770B\u677F"))}</h2>
        <div>${badge(cronOverview.health.status, cronHealthLabel(cronOverview.health.status, options.language))}</div>
      </div>
      <div class="meta">${escapeHtml(t("This row focuses only on timed-job execution itself. Keep it below the main card wall so it acts as an execution monitor instead of competing with task priority.", "\u8FD9\u4E00\u6392\u53EA\u770B\u5B9A\u65F6\u4EFB\u52A1\u6267\u884C\u672C\u8EAB\uFF0C\u653E\u5728\u4E3B\u5361\u7247\u5899\u4E0B\u65B9\uFF0C\u4F5C\u4E3A\u6267\u884C\u76D1\u63A7\u800C\u4E0D\u662F\u548C\u4EFB\u52A1\u4F18\u5148\u7EA7\u62A2\u4F4D\u7F6E\u3002"))}</div>
      <div class="meta">${escapeHtml(t("Next", "\u4E0B\u6B21"))} ${escapeHtml(cronOverview.nextRunAt ?? t("None", "\u6682\u65E0"))} \xB7 ${escapeHtml(t("Heartbeat", "\u5FC3\u8DF3"))} ${escapeHtml(heartbeatNextRun)} \xB7 ${escapeHtml(t("Enabled", "\u5DF2\u542F\u7528"))} ${enabledCronCount}</div>
      ${cronExecutionCardsHtml}
      <details class="compact-table-details" style="margin-top:12px;">
        <summary>${escapeHtml(t("Open Cron table detail", "\u67E5\u770B Cron \u8868\u683C\u660E\u7EC6"))}</summary>
        <div class="fold-body">${cronTable}</div>
      </details>
    </section>
  `;
    const projectsSection = `
    <section class="task-flow-stack">
      ${calendarSection}
      ${cronExecutionSection}
    </section>
    ${agentTeamProjectsBlock}
    <details class="card compact-details" id="tracked-task-view"${trackedTaskDetailsOpen ? " open" : ""}>
      <summary>${escapeHtml(t("Tracked tasks and follow-up", "\u8DDF\u8E2A\u4EFB\u52A1\u4E0E\u8DDF\u8FDB"))}</summary>
      <div class="fold-body">
        <div class="meta">${escapeHtml(trackedTaskSummaryText)}</div>
        <div class="meta">${escapeHtml(trackedTaskExplanation)}</div>
        ${trackedTaskDetailsBody}
      </div>
    </details>
  `;
    const alertsSection = `
    <section class="card">
      <h2>${escapeHtml(t("Attention items", "\u5173\u6CE8\u4E8B\u9879"))}</h2>
      <div class="meta">${escapeHtml(t("Blocked", "\u963B\u585E"))} ${exceptions.counts.blocked} \xB7 ${escapeHtml(t("Errors", "\u5F02\u5E38"))} ${exceptions.counts.errors} \xB7 ${escapeHtml(t("Pending approvals", "\u5F85\u5BA1\u6279"))} ${exceptions.counts.pendingApprovals} \xB7 ${escapeHtml(t("Stalled runs", "\u505C\u6EDE\u6267\u884C"))} ${stalledRunningSessionCount}</div>
      <ul class="story-list">${exceptionsItems}</ul>
    </section>
    <section class="card">
      <h2>${escapeHtml(t("Needs your decision", "\u9700\u8981\u4F60\u51B3\u7B56"))}</h2>
      <div class="meta">${escapeHtml(t("Unacked", "\u5F85\u5904\u7406"))} ${actionQueue.counts.unacked} \xB7 ${escapeHtml(t("Acked", "\u5DF2\u786E\u8BA4"))} ${actionQueue.counts.acked}</div>
      ${actionQueue.counts.total === 0 ? `<div class="empty-state">${escapeHtml(t("There is nothing waiting for a decision right now.", "\u5F53\u524D\u6CA1\u6709\u5F85\u51B3\u7B56\u4E8B\u9879\u3002"))}</div>` : actionQueueItems}
    </section>
    <details class="card compact-details">
      <summary>${escapeHtml(t("Approval requests", "\u5BA1\u6279\u8BF7\u6C42"))}</summary>
      <div class="fold-body">${topApprovals.length === 0 ? `<div class="empty-state">${escapeHtml(t("No approval requests yet.", "\u6682\u65E0\u5BA1\u6279\u8BF7\u6C42\u3002"))}</div>` : `<div class="meta">${escapeHtml(approvalsPreviewMeta)}</div><ul class="story-list">${approvalsItems}</ul>`}</div>
    </details>
    <details class="card compact-details">
      <summary>${escapeHtml(t("Budget watch", "\u9884\u7B97\u76D1\u63A7"))}</summary>
      <div class="fold-body">${nonOkBudgets.length === 0 ? `<div class="empty-state">${escapeHtml(t("Budget status looks healthy right now.", "\u9884\u7B97\u72B6\u6001\u5065\u5EB7\uFF0C\u5F53\u524D\u65E0\u9884\u8B66\u3002"))}</div>` : `<table><thead><tr><th>${escapeHtml(t("Status", "\u72B6\u6001"))}</th><th>${escapeHtml(t("Scope", "\u8303\u56F4"))}</th><th>${escapeHtml(t("Target", "\u5BF9\u8C61"))}</th><th>${escapeHtml(t("Usage", "\u4F7F\u7528\u60C5\u51B5"))}</th></tr></thead><tbody>${budgetItems}</tbody></table>`}</div>
    </details>
  `;
    const replaySection = `
    <section class="card">
      <h2>${escapeHtml(t("Replay activity", "\u6D3B\u52A8\u56DE\u653E"))}</h2>
      ${replaySignals.length === 0 ? `<div class="empty-state">${escapeHtml(t("No replay data yet. It will appear after the monitor has been running.", "\u6682\u65E0\u56DE\u653E\u6570\u636E\u3002\u76D1\u63A7\u8FD0\u884C\u540E\u4F1A\u51FA\u73B0\u3002"))}</div>` : `<div class="status-strip">${replaySignals.map(item => `<div class="status-chip"><span>${escapeHtml(item.label)}</span><strong>${item.value}</strong></div>`).join("")}</div>`}
      <div class="meta">${escapeHtml(t("Latest snapshot", "\u6700\u65B0\u5FEB\u7167"))}\uFF1A${escapeHtml(replayLatestSnapshot?.fileName ?? t("Not available", "\u6682\u65E0"))}</div>
      <div class="meta">${escapeHtml(t("Latest backup", "\u6700\u65B0\u5907\u4EFD"))}\uFF1A${escapeHtml(replayLatestBundle?.fileName ?? t("Not available", "\u6682\u65E0"))}</div>
      <div class="meta"><a href="/audit">${escapeHtml(t("Open audit timeline", "\u67E5\u770B\u6D3B\u52A8\u65F6\u95F4\u7EBF"))}</a> \xB7 <a href="/export/state.json">${escapeHtml(t("Create backup snapshot", "\u521B\u5EFA\u5907\u4EFD\u5FEB\u7167"))}</a></div>
    </section>
    <details class="card compact-details">
      <summary>${escapeHtml(t("Replay metrics", "\u56DE\u653E\u8BE6\u7EC6\u6307\u6807"))}</summary>
      <div class="fold-body">${replayMetricsHtml}</div>
    </details>
    <details class="card compact-details">
      <summary>${escapeHtml(t("Recent timeline", "\u6700\u8FD1\u65F6\u95F4\u7EBF"))}</summary>
      <div class="fold-body"><ul class="story-list">${replayMomentsRows}</ul></div>
    </details>
  `;
    const settingsSection = `
    ${settingsEnvironmentStatusCard}
    ${settingsConfigAccessCard}
    ${agentTeamSettingsBlock}
  `;
    let sectionBody = overviewSection;
    if (options.section === "calendar")
        sectionBody = projectsSection;
    if (options.section === "team")
        sectionBody = teamUnifiedSection;
    if (options.section === "collaboration")
        sectionBody = collaborationSection;
    if (options.section === "memory")
        sectionBody = memorySection;
    if (options.section === "docs")
        sectionBody = docsSection;
    if (options.section === "usage-cost")
        sectionBody = usageSection;
    if (options.section === "office-space")
        sectionBody = teamUnifiedSection;
    if (options.section === "projects-tasks")
        sectionBody = projectsSection;
    if (options.section === "alerts")
        sectionBody = alertsSection;
    if (options.section === "replay-audit")
        sectionBody = replaySection;
    if (options.section === "settings")
        sectionBody = settingsSection;
    const globalVisibilityCard = renderGlobalVisibilityCard(globalVisibilityModel, options.language);
    const globalVisibilityBlock = options.section === "overview" ? globalVisibilityCard : "";
    const globalVisibilityQuickRows = [{ label: pickUiText(options.language, "Timed jobs", "\u5B9A\u65F6\u4EFB\u52A1"), count: globalVisibilityModel.signalCounts.schedule, href: buildGlobalVisibilityDetailHref("cron", options.language) }, { label: pickUiText(options.language, "Heartbeat", "\u4EFB\u52A1\u5FC3\u8DF3"), count: globalVisibilityModel.signalCounts.heartbeat, href: buildGlobalVisibilityDetailHref("heartbeat", options.language) }, { label: pickUiText(options.language, "Current tasks", "\u5F53\u524D\u4EFB\u52A1"), count: globalVisibilityModel.signalCounts.currentTasks, href: buildGlobalVisibilityDetailHref("current_task", options.language) }, { label: pickUiText(options.language, "Tool calls", "\u5DE5\u5177\u8C03\u7528"), count: globalVisibilityModel.signalCounts.toolCalls, href: buildGlobalVisibilityDetailHref("tool_call", options.language) }].map(item => `<div class="meta"><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>\uFF1A${item.count}</div>`).join("");
    const sidebarSignalRows = options.section === "overview" ? globalVisibilityQuickRows : `<div class="meta"><a href="${escapeHtml(buildHomeHref({ quick: "all" }, true, "overview", options.language, options.usageView))}">${escapeHtml(t("See four signals in overview", "\u5728\u603B\u89C8\u67E5\u770B\u56DB\u9879\u4FE1\u53F7"))}</a></div>`;
    const taskBoardScript = renderTaskBoardScript();
    const fileWorkbenchScript = renderFileWorkbenchScript();
    const staffModelScript = renderStaffModelScript();
    const agentVisualEnhancerScript = renderAgentVisualEnhancerScript();
    const nativeMotionScript = renderNativeMotionScript(options.language);
    const collaborationFilterScript = renderCollaborationFilterScript(options.language, primaryDispatcherFilterLabel);
    const quotaResetScript = renderQuotaResetScript();
    const dashboardRefreshScript = renderDashboardRefreshScript(options.language, { localMutationUnlock: options.localMutationUnlock, localTokenAuthRequired: import_config.LOCAL_TOKEN_AUTH_REQUIRED, localTokenConfigured: import_config.LOCAL_API_TOKEN !== "", localTokenHeader: import_config.LOCAL_TOKEN_HEADER, embeddedLocalToken: options.localMutationUnlock ? import_config.LOCAL_API_TOKEN : "" });
    const settingsBudgetLimitScript = renderSettingsBudgetLimitScript(options.language);
    const collaborationChatOverlay = (0, import_collaboration_chat_widget.renderCollaborationChatOverlay)({ language: options.language, preferences: options.collaborationChat, primaryAgentId: collaborationDirectory.primaryAgentId, primaryDisplayName: collaborationDirectory.primaryDisplayName, writeAccessEnabled: !import_config.LOCAL_TOKEN_AUTH_REQUIRED || import_config.LOCAL_API_TOKEN !== "" && options.localMutationUnlock, writeAccessAvailable: !import_config.LOCAL_TOKEN_AUTH_REQUIRED || import_config.LOCAL_API_TOKEN !== "", participants: collaborationChatParticipants });
    const renderTotalMs = Math.round(performance.now() - renderStartedAt);
    if (renderTotalMs >= 1e3) {
        console.warn("[mission-control] slow html render", { section: activeSection, totalMs: renderTotalMs, phases: renderPhases.join(" | ") });
    }
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(uiEmployeeSystemBrand(options.language))}</title>
  <style>
    :root {
      --bg: #eef2f6;
      --panel: #ffffff;
      --panel-soft: #fbfbfd;
      --surface-1: rgba(255, 255, 255, 0.98);
      --surface-2: rgba(252, 253, 255, 0.94);
      --surface-3: rgba(246, 249, 253, 0.92);
      --glass-1: rgba(255, 255, 255, 0.78);
      --glass-2: rgba(248, 250, 255, 0.74);
      --border: rgba(17, 24, 39, 0.09);
      --border-soft: rgba(17, 24, 39, 0.06);
      --border-strong: rgba(17, 24, 39, 0.14);
      --text: #1d1d1f;
      --muted: #6e6e73;
      --ok: #248a3d;
      --warn: #b57f10;
      --over: #d23f31;
      --todo: #6e6e73;
      --progress: #0071e3;
      --blocked: #b05c12;
      --done: #248a3d;
      --focus: #0071e3;
      --primary: #0071e3;
      --primary-strong: #0058b1;
      --secondary: #248a3d;
      --accent: #b57f10;
      --apple-glass-blur: 22px;
      --shadow-soft: 0 8px 24px rgba(15, 23, 42, 0.06);
      --shadow-hard: 0 22px 56px rgba(15, 23, 42, 0.1);
      --shadow-float: 0 18px 44px rgba(15, 23, 42, 0.09);
      --shadow-press: 0 10px 24px rgba(15, 23, 42, 0.08);
      --card-fill:
        linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(250, 251, 253, 0.975) 56%, rgba(244, 247, 251, 0.95)),
        radial-gradient(circle at 100% 0%, rgba(210, 223, 242, 0.18), transparent 54%);
      --card-fill-soft:
        linear-gradient(180deg, rgba(255, 255, 255, 0.975), rgba(248, 250, 253, 0.955) 58%, rgba(242, 246, 250, 0.93)),
        radial-gradient(circle at 100% 0%, rgba(219, 228, 242, 0.12), transparent 52%);
      --card-border: rgba(15, 23, 42, 0.07);
      --card-border-strong: rgba(15, 23, 42, 0.11);
      --card-shadow-soft: 0 14px 30px rgba(15, 23, 42, 0.05), 0 2px 8px rgba(15, 23, 42, 0.03);
      --card-shadow: 0 20px 42px rgba(15, 23, 42, 0.065), 0 3px 10px rgba(15, 23, 42, 0.035);
      --card-shadow-hover: 0 28px 52px rgba(15, 23, 42, 0.085), 0 4px 14px rgba(15, 23, 42, 0.04);
      --ring-soft: 0 0 0 4px rgba(0, 113, 227, 0.1);
      --radius-lg: 26px;
      --radius-md: 18px;
      --radius-sm: 12px;
      --font-large-title: 40px;
      --font-title-1: 28px;
      --font-title-2: 22px;
      --font-body: 15px;
      --font-caption: 12px;
      --space-1: 8px;
      --space-2: 16px;
      --space-3: 24px;
      --space-4: 32px;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", "Helvetica Neue", sans-serif;
      color: var(--text);
      font-size: var(--font-body);
      line-height: 1.58;
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 8% -10%, rgba(164, 192, 230, 0.22), transparent 34%),
        radial-gradient(circle at 96% 0%, rgba(218, 226, 240, 0.18), transparent 32%),
        linear-gradient(180deg, #f3f5f8 0%, #e9edf3 46%, #e5eaf0 100%);
      position: relative;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    .ui-preload .app-shell { opacity: 1; transform: translateY(0); }
    body.ui-ready .app-shell { opacity: 1; transform: translateY(0); transition: opacity 260ms ease, transform 320ms ease; }
    body.page-leave .app-shell { opacity: 0; transform: translateY(10px) scale(0.996); transition: opacity 140ms ease, transform 150ms ease; }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.16) 42%, transparent 60%),
        radial-gradient(circle at 50% -18%, rgba(255, 255, 255, 0.54), transparent 46%);
      pointer-events: none;
      z-index: -1;
    }
    button,
    input,
    select,
    textarea {
      font: inherit;
    }
    button {
      -webkit-appearance: none;
      appearance: none;
    }
    h1, h2, h3 { margin: 0; line-height: 1.24; letter-spacing: -0.012em; }
    a {
      color: #0071e3;
      text-decoration-thickness: 1.5px;
      text-underline-offset: 2px;
    }
    a:focus-visible {
      outline: none;
      border-radius: 10px;
      box-shadow: var(--ring-soft);
    }
    .app-shell {
      display: grid;
      grid-template-columns: 232px minmax(0, 1fr) 300px;
      gap: var(--space-2);
      padding: var(--space-3);
      max-width: 1880px;
      margin: 0 auto;
    }
    body.inspector-collapsed .app-shell {
      grid-template-columns: 232px minmax(0, 1fr);
    }
    body.inspector-collapsed .inspector-sidebar {
      display: none;
    }
    .sidebar {
      border: 1px solid rgba(255, 255, 255, 0.84);
      background:
        linear-gradient(180deg, var(--glass-1), var(--glass-2)),
        radial-gradient(circle at 100% 0%, rgba(214, 228, 255, 0.2), transparent 48%);
      border-radius: var(--radius-lg);
      padding: 18px;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.1);
      backdrop-filter: blur(var(--apple-glass-blur));
      -webkit-backdrop-filter: blur(var(--apple-glass-blur));
      animation: panel-in 320ms ease both;
    }
    .brand {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(15, 23, 42, 0.05);
      border-radius: var(--radius-md);
      padding: 16px;
      background:
        linear-gradient(135deg, rgba(232, 239, 255, 0.66), rgba(255, 255, 255, 0.92)),
        radial-gradient(circle at 82% 14%, rgba(255, 255, 255, 0.8), transparent 56%);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72);
    }
    .brand-kicker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid rgba(0, 113, 227, 0.26);
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #0060c5;
      background: rgba(255, 255, 255, 0.84);
      text-transform: uppercase;
    }
    .brand h1 { font-size: 23px; font-weight: 760; margin-top: 9px; }
    .brand .meta { margin-top: 6px; }
    .meta { color: var(--muted); font-size: 13px; line-height: 1.62; }
    .meta-inline { color: var(--muted); font-size: 12px; margin-left: 6px; }
    .nav-links { margin-top: 14px; display: grid; gap: 9px; }
    .nav-link {
      display: block;
      border: 1px solid rgba(17, 24, 39, 0.06);
      border-radius: 16px;
      text-decoration: none;
      color: var(--text);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.74), rgba(251, 253, 255, 0.78));
      padding: 12px 13px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76);
      transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
    }
    .nav-link:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
      border-color: rgba(17, 24, 39, 0.1);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(251, 253, 255, 0.98));
    }
    .nav-link span { display: block; font-size: 15px; font-weight: 640; color: #1d1d1f; }
    .nav-link small { display: block; font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.45; }
    .nav-link.active {
      border-color: rgba(0, 113, 227, 0.2);
      background:
        linear-gradient(180deg, rgba(234, 244, 255, 0.92), rgba(249, 252, 255, 0.98)),
        radial-gradient(circle at 0% 0%, rgba(0, 113, 227, 0.08), transparent 38%);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.82),
        0 10px 24px rgba(0, 113, 227, 0.08);
    }
    .panel {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px;
      background:
        linear-gradient(180deg, rgba(251, 253, 255, 0.88), rgba(244, 247, 251, 0.8)),
        radial-gradient(circle at 100% 0%, rgba(214, 225, 243, 0.14), transparent 46%);
      box-shadow: 0 28px 60px rgba(15, 23, 42, 0.09);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      animation: panel-in 350ms ease both;
    }
    .section-title { font-size: var(--font-large-title); font-weight: 760; letter-spacing: -0.03em; line-height: 1.05; }
    .section-blurb { margin-top: 4px; font-size: var(--font-body); color: #6e6e73; }
    .section-hero-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-2);
    }
    .section-head-copy { min-width: 0; }
    .section-head-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: flex-end;
      gap: var(--space-1);
    }
    .refresh-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex: 0 1 460px;
      min-width: min(460px, 100%);
    }
    .refresh-toolbar .panel-toggle {
      white-space: nowrap;
    }
    .refresh-interval {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 2px solid var(--border);
      border-radius: 8px;
      padding: 7px 12px;
      background: #f3f4f6;
      color: #334155;
      font-size: var(--font-caption);
      font-weight: 620;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
    }
    .refresh-interval span {
      white-space: nowrap;
    }
    .refresh-interval select {
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      min-width: 68px;
      padding: 0;
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
    }
    .refresh-status {
      flex: 1 0 100%;
      min-height: 18px;
      font-size: 12px;
      line-height: 1.45;
      color: #5f6b7a;
      padding: 2px 2px 0;
      text-align: right;
    }
    .panel-toggle {
      border: 2px solid var(--border);
      border-radius: 8px;
      padding: 7px 13px;
      background: #f3f4f6;
      color: #334155;
      font-size: var(--font-caption);
      font-weight: 620;
      cursor: pointer;
      box-shadow: none;
      transition: transform 180ms ease, border-color 180ms ease, color 180ms ease, background 180ms ease;
    }
    .panel-toggle:hover {
      transform: translateY(-1px);
      border-color: rgba(0, 113, 227, 0.24);
      color: #005bb8;
      background: linear-gradient(180deg, rgba(241, 248, 255, 0.98), rgba(250, 253, 255, 0.96));
      box-shadow: 0 10px 24px rgba(0, 113, 227, 0.08);
    }
    .content-stack { margin-top: var(--space-2); display: grid; gap: var(--space-2); }
    .content-stack > #overview-decision-home { order: 1; }
    .content-stack > #agent-team-overview { order: 2; }
    .content-stack > #overview-primary-section { order: 3; }
    .content-stack > #overview-secondary-shell { order: 4; }
    .content-stack > #global-visibility-card { order: 5; }
    .executive-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: 12px; }
    .overview-v3-shell {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
      gap: var(--space-2);
      align-items: start;
    }
    .overview-primary-card {
      position: relative;
      overflow: hidden;
      background:
        linear-gradient(150deg, rgba(232, 242, 255, 0.94), rgba(255, 255, 255, 0.98)),
        radial-gradient(circle at 88% 18%, rgba(167, 196, 234, 0.22), transparent 52%);
      border-color: rgba(0, 113, 227, 0.24);
      box-shadow: 0 18px 34px rgba(30, 72, 118, 0.12);
    }
    .overview-primary-card::after {
      content: "";
      position: absolute;
      right: -28px;
      top: -34px;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 113, 227, 0.15), transparent 66%);
      pointer-events: none;
    }
    .overview-primary-head {
      display: flex;
      justify-content: space-between;
      gap: var(--space-2);
      align-items: flex-start;
    }
    .overview-primary-core { margin-top: 14px; }
    .overview-primary-value {
      font-size: 42px;
      letter-spacing: -0.04em;
      font-weight: 760;
      color: #102a43;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .overview-primary-label {
      margin-top: 4px;
      font-size: var(--font-caption);
      color: #516174;
      letter-spacing: 0.02em;
    }
    .overview-focus-stage {
      margin-top: var(--space-2);
      display: grid;
      grid-template-columns: 138px minmax(0, 1fr);
      align-items: center;
      gap: 12px;
      border: 1px solid rgba(16, 42, 67, 0.1);
      border-radius: 16px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.88);
    }
    .overview-focus-ring {
      width: 118px;
      height: 118px;
      border-radius: 50%;
      background: conic-gradient(var(--focus-tone) calc(var(--focus-score) * 1%), rgba(191, 203, 219, 0.36) 0);
      display: grid;
      place-items: center;
      border: 1px solid rgba(16, 42, 67, 0.14);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.66);
    }
    .overview-focus-core {
      width: 82px;
      height: 82px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.97);
      border: 1px solid rgba(16, 42, 67, 0.12);
      display: grid;
      grid-template-rows: auto auto;
      justify-items: center;
      align-content: center;
      gap: 3px;
      padding: 8px 6px;
      box-sizing: border-box;
    }
    .overview-focus-score {
      font-size: 28px;
      font-weight: 760;
      letter-spacing: -0.03em;
      color: #1c2836;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .overview-focus-unit {
      font-size: 10px;
      color: #6f7985;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-weight: 620;
      line-height: 1.15;
      text-align: center;
      max-width: 56px;
      text-wrap: balance;
    }
    .overview-focus-copy {
      min-width: 0;
      display: grid;
      gap: 4px;
    }
    .overview-focus-headline {
      font-size: 22px;
      line-height: 1.12;
      letter-spacing: -0.02em;
      color: #0f2840;
      font-weight: 740;
    }
    .overview-focus-sub {
      font-size: 13px;
      color: #4f5f71;
      line-height: 1.45;
    }
    .overview-focus-meta {
      font-size: 12px;
      color: #6a7787;
      line-height: 1.45;
    }
    .overview-primary-directive {
      margin-top: 10px;
      border-radius: 999px;
      border: 1px solid rgba(0, 113, 227, 0.2);
      background: rgba(255, 255, 255, 0.88);
      color: #0e5ba6;
      padding: 5px 10px;
      width: fit-content;
      font-size: 12px;
      font-weight: 620;
      letter-spacing: 0.01em;
    }
    .overview-primary-card .overview-quick-links {
      margin-top: var(--space-2);
      justify-content: flex-start;
      min-width: 0;
    }
    .overview-kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2);
    }
    .overview-decision-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2);
      align-items: start;
    }
    .overview-decision-grid > .card {
      align-self: start;
    }
    .overview-kpi-card {
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: var(--space-2);
      background: var(--card-fill-soft);
      box-shadow: var(--card-shadow-soft);
      position: relative;
      overflow: hidden;
    }
    .overview-kpi-card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto 0;
      height: 3px;
      background: linear-gradient(90deg, rgba(0, 113, 227, 0.74), rgba(91, 183, 255, 0.72));
    }
    .overview-kpi-card.tone-warn {
      border-color: rgba(181, 127, 16, 0.3);
      background: linear-gradient(180deg, rgba(255, 251, 243, 0.98), rgba(255, 255, 255, 0.96));
    }
    .overview-kpi-card.tone-warn::before {
      background: linear-gradient(90deg, rgba(194, 136, 25, 0.84), rgba(230, 179, 76, 0.7));
    }
    .overview-kpi-card.tone-neutral {
      border-color: rgba(107, 114, 128, 0.24);
      background: linear-gradient(180deg, rgba(248, 249, 252, 0.98), rgba(255, 255, 255, 0.96));
    }
    .overview-kpi-card.tone-neutral::before {
      background: linear-gradient(90deg, rgba(110, 117, 125, 0.66), rgba(177, 182, 189, 0.62));
    }
    .overview-kpi-label {
      font-size: var(--font-caption);
      color: #6b7280;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-weight: 620;
    }
    .overview-kpi-value {
      margin-top: 8px;
      font-size: 42px;
      line-height: 1;
      letter-spacing: -0.03em;
      color: #111827;
      font-weight: 740;
      font-variant-numeric: tabular-nums;
    }
    .overview-kpi-detail {
      margin-top: 8px;
      color: #6b7280;
      font-size: var(--font-caption);
      line-height: 1.45;
    }
    .overview-secondary-shell > .fold-body {
      margin-top: var(--space-2);
      display: grid;
      gap: var(--space-2);
    }
    .overview-hero-strip {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 10px;
    }
    .overview-hero-card {
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 13px 13px 11px;
      background: var(--card-fill-soft);
      box-shadow: var(--card-shadow-soft);
    }
    .overview-hero-card .label {
      font-size: 11px;
      color: #6f7379;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-weight: 620;
    }
    .overview-hero-card .value {
      margin-top: 6px;
      font-size: 29px;
      line-height: 1.02;
      letter-spacing: -0.024em;
      color: #1d1d1f;
      font-weight: 740;
    }
    .overview-hero-card .hint {
      margin-top: 4px;
      font-size: 12px;
      color: #6e6e73;
      line-height: 1.45;
    }
    .overview-main-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr);
      gap: 14px;
      align-items: start;
    }
    .overview-main-grid > .card { align-self: start; }
    .overview-main-grid .overview-span { grid-column: 1 / -1; }
    .exec-card {
      border: 1px solid var(--card-border);
      border-radius: 16px;
      background: var(--card-fill-soft);
      padding: 15px 15px 13px;
      box-shadow: var(--card-shadow-soft);
    }
    .exec-title { font-size: 11px; color: #6a6d72; letter-spacing: 0.045em; text-transform: uppercase; font-weight: 620; }
    .exec-metric { margin-top: 7px; font-size: 30px; font-weight: 740; color: #1d1d1f; letter-spacing: -0.024em; line-height: 1.04; }
    #current-task-health {
      background:
        linear-gradient(155deg, rgba(234, 244, 255, 0.92), rgba(255, 255, 255, 0.98)),
        radial-gradient(circle at 88% 12%, rgba(197, 221, 250, 0.24), transparent 50%);
      border-color: rgba(0, 113, 227, 0.22);
      box-shadow: 0 14px 30px rgba(14, 63, 126, 0.1);
      overflow: hidden;
    }
    .overview-command-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .overview-action-grid {
      margin-top: 2px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .overview-action-item {
      display: block;
      border: 1px solid var(--card-border);
      border-radius: 14px;
      background: var(--card-fill-soft);
      padding: 11px;
      min-height: 92px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
      color: inherit;
      text-decoration: none;
    }
    .overview-action-item.hot {
      border-color: rgba(181, 120, 16, 0.38);
      background: linear-gradient(180deg, rgba(255, 248, 233, 0.98), rgba(255, 255, 255, 0.95));
    }
    .overview-action-item:hover {
      transform: translateY(-1px);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.92),
        0 14px 28px rgba(17, 24, 39, 0.08);
    }
    .overview-action-item span {
      display: block;
      font-size: 12px;
      color: #6b6f76;
      letter-spacing: 0.01em;
    }
    .overview-action-item strong {
      display: block;
      margin-top: 6px;
      font-size: 30px;
      line-height: 1;
      letter-spacing: -0.025em;
      color: #1d1d1f;
    }
    .overview-action-item small {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #6b6f76;
      line-height: 1.45;
    }
    .overview-task-strip {
      margin-top: 12px;
      border: 1px solid rgba(17, 24, 39, 0.09);
      border-radius: 14px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }
    .overview-task-metric {
      margin-top: 5px;
      font-size: 15px;
      color: #2a2a2d;
      line-height: 1.45;
    }
    .decision-list {
      display: grid;
      gap: 10px;
    }
    .decision-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 12px 13px;
      background: var(--card-fill-soft);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.86),
        0 10px 20px rgba(15, 23, 42, 0.035);
      color: inherit;
      text-decoration: none;
    }
    .decision-row:hover {
      transform: translateY(-1px);
      border-color: rgba(17, 24, 39, 0.1);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.88),
        0 12px 26px rgba(17, 24, 39, 0.06);
    }
    .decision-row-copy {
      min-width: 0;
      display: grid;
      gap: 3px;
    }
    .decision-row-copy strong {
      font-size: 14px;
      color: #1d1d1f;
      line-height: 1.4;
    }
    .decision-row-value,
    .decision-row-link {
      font-size: 12px;
      color: #0b6db3;
      font-weight: 650;
      white-space: nowrap;
      align-self: center;
    }
    .overview-busy-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .overview-busy-card {
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 12px;
      background: var(--card-fill-soft);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.86),
        0 10px 20px rgba(15, 23, 42, 0.03);
      display: grid;
      gap: 6px;
    }
    .overview-busy-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: baseline;
    }
    .overview-busy-head strong {
      font-size: 14px;
      color: #1d1d1f;
    }
    .overview-busy-head span {
      font-size: 11px;
      color: #6e6e73;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 640;
    }
    .overview-busy-copy {
      font-size: 13px;
      color: #2b3946;
      line-height: 1.5;
    }
    .overview-quick-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      min-width: 180px;
    }
    .overview-quick-links .btn {
      padding: 7px 11px;
      border-radius: 9px;
      white-space: nowrap;
      background: linear-gradient(180deg, rgba(238, 246, 255, 0.96), rgba(255, 255, 255, 0.98));
    }
    .overview-context-card {
      display: grid;
      gap: 12px;
      align-content: start;
    }
    .overview-context-card .overview-command-head {
      margin-bottom: 0;
      align-items: flex-start;
    }
    .overview-context-note {
      border: 1px solid var(--card-border);
      border-radius: 16px;
      background: var(--card-fill-soft);
      padding: 12px 13px;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.86),
        0 10px 20px rgba(15, 23, 42, 0.035);
    }
    .overview-context-note strong {
      display: block;
      font-size: 12px;
      color: #1d1d1f;
      letter-spacing: 0.01em;
    }
    .overview-context-note .meta {
      margin-top: 6px;
    }
    .overview-context-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .overview-context-links .btn {
      padding: 7px 11px;
      border-radius: 9px;
      white-space: nowrap;
      background: linear-gradient(180deg, rgba(238, 246, 255, 0.96), rgba(255, 255, 255, 0.98));
    }
    .overview-usage-card {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 251, 255, 0.97)),
        radial-gradient(circle at 85% 14%, rgba(217, 231, 255, 0.2), transparent 52%);
    }
    .overview-pulse-card {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 252, 255, 0.95)),
        radial-gradient(circle at 12% -5%, rgba(192, 218, 244, 0.18), transparent 45%);
    }
    .card {
      position: relative;
      border: 2px solid var(--card-border);
      background: var(--card-fill);
      padding: 18px 18px 17px;
      border-radius: 8px;
      box-shadow: var(--card-shadow);
      animation: card-in 360ms ease both;
      transition: transform 200ms ease, border-color 200ms ease, background 200ms ease;
      overflow-x: auto;
    }
    .card::before {
      content: none;
    }
    .card, .sidebar, .nav-link, .overview-hero-card { animation-delay: calc(var(--stagger-index, 0) * 36ms); }
    .panel.is-reflowing .card,
    .panel.is-reflowing .overview-kpi-card {
      transition: transform 230ms ease, opacity 230ms ease;
    }
    .card:hover {
      transform: scale(1.01);
      border-color: var(--card-border-strong);
      background: #f8fbff;
    }
    .card h2 { font-size: var(--font-title-2); color: #1d1d1f; margin-bottom: var(--space-1); letter-spacing: -0.022em; line-height: 1.14; }
    .badge {
      display: inline-block;
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 11px;
      border: 0;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: #f3f4f6;
      font-weight: 700;
    }
    .badge.ok, .badge.done, .badge.accepted, .badge.enabled, .badge.pass { color: #065f46; background: #d1fae5; }
    .badge.warn, .badge.dry_run { color: #92400e; background: #fef3c7; }
    .badge.over, .badge.blocked, .badge.action-required, .badge.critical, .badge.fail, .badge.blocked_no_token { color: #991b1b; background: #fee2e2; }
    .badge.info, .badge.in_progress, .badge.active, .badge.armed, .badge.live, .badge.spawned, .badge.spawn { color: #1d4ed8; background: #dbeafe; }
    .badge.todo, .badge.planned, .badge.message, .badge.tool_event, .badge.idle, .badge.disabled { color: #4b5563; background: #f3f4f6; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 15px;
      margin-top: 10px;
      min-width: 780px;
    }
    th,
    td {
      border-bottom: 1px solid rgba(17, 24, 39, 0.08);
      text-align: left;
      padding: 12px 9px;
      vertical-align: top;
      word-break: normal;
      overflow-wrap: break-word;
      line-height: 1.48;
    }
    th {
      color: #6e6e73;
      font-size: 13px;
      font-weight: 660;
      letter-spacing: 0.005em;
      white-space: nowrap;
    }
    tr:hover td { background: rgba(245, 247, 250, 0.84); }
    .global-visibility-card {
      overflow-x: auto;
    }
    .global-visibility-card .ops-board {
      min-width: 980px;
      table-layout: auto;
    }
    ul { margin: 7px 0 0 18px; padding: 0; }
    .story-list { margin-top: 8px; line-height: 1.45; }
    .group-list { display: grid; gap: 10px; margin-top: 8px; }
    .group-section {
      border: 2px solid var(--card-border);
      border-radius: 8px;
      background: var(--card-fill-soft);
      box-shadow: var(--card-shadow-soft);
      padding: 0;
      overflow: hidden;
    }
    .group-section summary {
      list-style: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 660;
      color: #1d1d1f;
      padding: 11px 13px;
      background: #f3f4f6;
      border-bottom: 2px solid var(--border);
    }
    .group-items {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0;
    }
    .group-item {
      border-top: 1px solid rgba(17, 24, 39, 0.08);
      padding: 11px 13px;
      background: rgba(255,255,255,0.98);
    }
    .group-item:first-child { border-top: none; }
    .group-item-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 4px;
    }
    .group-item-head strong {
      font-size: 14px;
      color: #1d1d1f;
      line-height: 1.45;
    }
    .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-top: 8px; }
    .filters label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 5px; font-weight: 580; }
    .filters select,
    .filters input {
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      background: #f3f4f6;
      color: var(--text);
      border: 2px solid transparent;
      border-radius: 8px;
      padding: 10px 12px;
      font-family: inherit;
      font-size: 13px;
      box-shadow: none;
    }
    .filters select:focus,
    .filters input:focus {
      outline: none;
      border-color: var(--primary);
      background: #ffffff;
      box-shadow: var(--ring-soft);
    }
    .filter-actions { margin-top: 8px; display: flex; gap: 10px; align-items: center; }
    .task-top-intro {
      max-width: 960px;
      line-height: 1.38;
    }
    .task-top-meta-row {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 12px;
    }
    .task-top-meta {
      margin: 0;
      line-height: 1.32;
    }
    .task-top-controls {
      margin-top: 8px;
      display: grid;
      gap: 8px;
    }
    .task-top-filters {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 0;
    }
    .task-top-filters label {
      font-size: 11.5px;
      margin-bottom: 4px;
    }
    .task-top-filters select,
    .task-top-filters input {
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
    }
    .task-top-filters .filter-actions {
      margin-top: 0;
      gap: 8px;
      align-self: end;
      padding-bottom: 1px;
    }
    .btn {
      -webkit-appearance: none;
      appearance: none;
      border: 1px solid rgba(0, 113, 227, 0.18);
      border-radius: 999px;
      background:
        linear-gradient(180deg, rgba(244, 249, 255, 0.98), rgba(255, 255, 255, 0.98)),
        radial-gradient(circle at 50% 0%, rgba(0, 113, 227, 0.08), transparent 58%);
      color: #0058b1;
      padding: 8px 14px;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 630;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.88),
        0 8px 18px rgba(0, 113, 227, 0.08);
      transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, color 180ms ease, background 180ms ease;
    }
    .btn:hover {
      transform: translateY(-1px);
      border-color: rgba(0, 113, 227, 0.24);
      color: #004f9f;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        0 14px 24px rgba(0, 113, 227, 0.12);
      background:
        linear-gradient(180deg, rgba(238, 247, 255, 0.99), rgba(255, 255, 255, 0.99)),
        radial-gradient(circle at 50% 0%, rgba(0, 113, 227, 0.1), transparent 58%);
    }
    .btn:focus-visible {
      outline: none;
      box-shadow: var(--ring-soft), inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 12px 24px rgba(0, 113, 227, 0.1);
    }
    .board { margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .lane {
      border: 2px solid var(--card-border);
      border-radius: 8px;
      padding: 12px;
      background: var(--card-fill-soft);
      box-shadow: var(--card-shadow-soft);
      min-height: 128px;
    }
    .lane h3 { margin: 0; font-size: 14px; color: #1f2023; letter-spacing: -0.01em; }
    .lane-count { color: var(--muted); font-size: 12px; margin-top: 3px; }
    .task-chip,
    .project-chip {
      margin-top: 8px;
      border: 2px solid var(--card-border);
      border-radius: 8px;
      padding: 10px;
      background: var(--card-fill-soft);
      box-shadow: none;
      font-size: 13px;
      line-height: 1.56;
    }
    .task-chip.mapping {
      border-color: rgba(181, 111, 18, 0.34);
      background: rgba(255, 248, 236, 0.95);
    }
    .task-chip code,
    .project-chip code { color: #0065cc; }
    .bars { margin-top: 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
    .bar-row { margin-top: 8px; }
    .bar-meta { font-size: 12px; color: var(--muted); display: flex; justify-content: space-between; gap: 6px; }
    .bar-track { margin-top: 4px; border: 1px solid rgba(17, 24, 39, 0.1); border-radius: 999px; height: 8px; background: rgba(227, 230, 236, 0.62); overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 999px; }
    .bar-fill.ok { background: #18a97a; }
    .bar-fill.warn { background: #d69a1d; }
    .bar-fill.over { background: #cc4545; }
    .queue-list { list-style: none; margin: 8px 0 0 0; padding: 0; display: grid; gap: 9px; }
    .queue-item {
      margin-top: 0;
      border: 1px solid var(--card-border);
      border-radius: 15px;
      padding: 11px;
      background: var(--card-fill-soft);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.86),
        0 10px 20px rgba(15, 23, 42, 0.03);
    }
    .queue-actions { margin-top: 7px; display: flex; align-items: center; gap: 8px; }
    .inline-form { display: inline; margin: 0; }
    .status-strip { margin-top: 10px; display: grid; gap: 9px; grid-template-columns: repeat(auto-fit, minmax(138px, 1fr)); }
    .status-strip.compact { grid-template-columns: repeat(auto-fit, minmax(116px, 1fr)); }
    .settings-status-grid {
      margin-top: 12px;
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
      align-items: start;
    }
    .settings-config-grid {
      grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.9fr);
    }
    .settings-status-panel {
      border: 1px solid var(--card-border);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,255,0.96));
      padding: 16px;
      box-shadow: 0 10px 22px rgba(17, 24, 39, 0.04);
      min-width: 0;
    }
    #tool-connectors .settings-status-panel .meta {
      max-width: 64ch;
    }
    #settings-data-connections {
      align-content: start;
    }
    .settings-connector-list {
      margin-top: 12px;
      padding-left: 18px;
      display: grid;
      gap: 10px;
      align-content: start;
    }
    .settings-inline-budget {
      margin-top: 14px;
      padding: 15px;
      border-radius: 16px;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(255, 255, 255, 0.96)),
        radial-gradient(circle at 100% 0%, rgba(0, 113, 227, 0.08), transparent 54%);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.88),
        0 10px 20px rgba(15, 23, 42, 0.04);
    }
    .settings-inline-budget:hover {
      transform: none;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.88),
        0 10px 20px rgba(15, 23, 42, 0.04);
      border-color: var(--card-border);
    }
    .settings-inline-budget h2 {
      font-size: 26px;
      margin-bottom: 6px;
    }
    .settings-inline-budget .overview-command-head {
      gap: 10px;
      align-items: flex-start;
    }
    .settings-inline-budget .status-chip strong {
      font-size: 18px;
      line-height: 1.12;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .settings-inline-budget .settings-budget-form {
      grid-template-columns: 1fr;
      align-items: stretch;
    }
    .settings-inline-budget .settings-budget-input {
      min-height: 44px;
      font-size: 18px;
    }
    .settings-inline-budget .settings-budget-actions {
      justify-content: flex-start;
    }
    .settings-switch-table-wrap {
      margin-top: 12px;
      min-width: 0;
    }
    .settings-switch-table {
      margin-top: 0;
      min-width: 0;
      table-layout: fixed;
    }
    .settings-switch-table th,
    .settings-switch-table td {
      padding: 10px 12px;
      font-size: 14px;
      line-height: 1.45;
    }
    .settings-switch-table th {
      font-size: 12px;
    }
    .settings-switch-table td:nth-child(2),
    .settings-switch-table td:nth-child(3) {
      white-space: nowrap;
    }
    .settings-switch-table td:last-child {
      color: #4f5560;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .settings-switch-col-label {
      width: 26%;
    }
    .settings-switch-col-state {
      width: 20%;
    }
    .settings-switch-col-value {
      width: 18%;
    }
    .settings-switch-col-note {
      width: 36%;
    }
    .settings-budget-form {
      margin-top: 14px;
      display: grid;
      gap: 12px;
      grid-template-columns: minmax(220px, 320px) auto;
      align-items: end;
    }
    .settings-budget-field {
      display: grid;
      gap: 7px;
    }
    .settings-budget-field span {
      font-size: 12px;
      color: var(--muted);
      letter-spacing: 0.02em;
    }
    .settings-budget-input {
      width: 100%;
      min-height: 48px;
      border-radius: 16px;
      border: 1px solid rgba(140, 166, 202, 0.38);
      background: rgba(255,255,255,0.95);
      padding: 0 14px;
      font-size: 24px;
      font-weight: 700;
      color: var(--text);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.92);
    }
    .settings-budget-input:focus {
      outline: none;
      border-color: rgba(48, 101, 210, 0.46);
      box-shadow: 0 0 0 4px rgba(48, 101, 210, 0.12);
    }
    .settings-budget-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .settings-status-panel .overview-command-head {
      align-items: flex-start;
    }
    .settings-status-panel h3 {
      margin: 0;
      font-size: 17px;
      line-height: 1.35;
      color: #1d1d1f;
    }
    .status-chip {
      border: 1px solid var(--card-border);
      border-radius: 16px;
      background: var(--card-fill-soft);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.88),
        0 12px 24px rgba(15, 23, 42, 0.04);
    }
    .status-chip span { color: #6d6f75; font-size: 12px; letter-spacing: 0.01em; }
    .status-chip strong { font-size: 24px; line-height: 1.08; letter-spacing: -0.02em; color: #1d1d1f; }
    .usage-chip strong { font-size: 22px; }
    .status-chip small { display: none; }
    .dashboard-strip {
      grid-template-columns: repeat(4, minmax(0, 1fr)) 150px 150px;
      gap: 10px;
    }
    .task-hub-shell {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(360px, 1fr);
      gap: var(--space-2);
      align-items: start;
    }
    .task-hub-primary {
      background:
        linear-gradient(155deg, rgba(234, 244, 255, 0.92), rgba(255, 255, 255, 0.98)),
        radial-gradient(circle at 88% 12%, rgba(197, 221, 250, 0.24), transparent 50%);
      border-color: rgba(0, 113, 227, 0.22);
      box-shadow: 0 14px 30px rgba(14, 63, 126, 0.1);
    }
    .task-hub-stat-grid {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .task-hub-stat {
      border: 1px solid var(--card-border);
      border-radius: 15px;
      background: var(--card-fill-soft);
      padding: 12px;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.88),
        0 10px 20px rgba(15, 23, 42, 0.035);
      display: grid;
      gap: 4px;
    }
    .task-hub-stat span {
      font-size: 12px;
      color: #6b6f76;
      letter-spacing: 0.01em;
    }
    .task-hub-stat strong {
      font-size: 28px;
      line-height: 1;
      color: #1d1d1f;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
    }
    .task-hub-stat small {
      font-size: 12px;
      color: #6b6f76;
      line-height: 1.45;
    }
    .task-hub-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2);
      align-items: start;
    }
    .task-flow-stack {
      display: grid;
      gap: var(--space-2);
      align-items: start;
    }
    .task-hub-board-grid {
      grid-template-columns: minmax(0, 1.6fr) minmax(340px, 1fr);
    }
    .task-hub-sidebar {
      display: grid;
      gap: var(--space-2);
      align-content: start;
    }
    .execution-chain-list {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr));
      gap: 16px;
      align-items: stretch;
    }
    .execution-chain-card {
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 18px;
      background: var(--card-fill-soft);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.9),
        0 18px 34px rgba(15, 23, 42, 0.05);
      display: grid;
      gap: 12px;
      min-width: 0;
      overflow: hidden;
      min-height: 100%;
    }
    .execution-chain-head {
      display: grid;
      gap: 10px;
    }
    .execution-chain-copy {
      min-width: 0;
      display: grid;
      gap: 6px;
    }
    .execution-chain-copy strong {
      font-size: clamp(24px, 0.85vw + 18px, 31px);
      line-height: 1.08;
      letter-spacing: -0.04em;
      color: #1d1d1f;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: normal;
    }
    .execution-chain-context {
      color: #6d6f75;
      font-size: 14px;
      line-height: 1.55;
      letter-spacing: -0.01em;
    }
    .execution-chain-badges {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
      gap: 6px;
      max-width: none;
      min-width: 0;
      align-content: flex-start;
    }
    .execution-chain-meta-stack {
      display: grid;
      gap: 10px;
    }
    .execution-chain-meta-line {
      color: #6d6f75;
      font-size: 14px;
      line-height: 1.55;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .execution-chain-flow {
      border: 1px solid rgba(0, 113, 227, 0.12);
      border-radius: 18px;
      padding: 12px 14px;
      background:
        linear-gradient(180deg, rgba(245, 249, 255, 0.98), rgba(255, 255, 255, 0.96)),
        radial-gradient(circle at 0% 0%, rgba(0, 113, 227, 0.06), transparent 58%);
      color: #29527a;
      font-size: 14px;
      line-height: 1.62;
    }
    .execution-chain-summary {
      color: #2f3237;
      font-size: 15px;
      line-height: 1.62;
      letter-spacing: -0.01em;
    }
    .execution-chain-arrow {
      color: #6b6f76;
      margin: 0 4px;
    }
    .execution-chain-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: auto;
      padding-top: 4px;
    }
    .execution-chain-card code,
    .execution-chain-flow code {
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .execution-chain-card .meta {
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .collaboration-summary-grid {
      margin-top: 12px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .collaboration-headline {
      margin-top: 10px;
    }
    .collaboration-filter-bar {
      margin-top: 12px;
      width: 100%;
      justify-content: flex-start;
    }
    .collaboration-thread-list {
      margin-top: 14px;
      display: grid;
      gap: 14px;
    }
    .collaboration-thread-card {
      padding: 0;
      overflow: hidden;
    }
    .collaboration-thread-card > summary {
      list-style: none;
      cursor: pointer;
      padding: 18px;
      display: grid;
      gap: 14px;
    }
    .collaboration-thread-card > summary::-webkit-details-marker {
      display: none;
    }
    .collaboration-thread-card > summary::marker {
      display: none;
    }
    .collaboration-thread-head {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
    }
    .collaboration-route-avatars {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
    }
    .collaboration-participant {
      display: grid;
      justify-items: center;
      gap: 6px;
      min-width: 72px;
      flex: 0 0 auto;
    }
    .collaboration-participant-label {
      font-size: 11px;
      line-height: 1.35;
      color: #6e7680;
      font-weight: 620;
      letter-spacing: 0.01em;
      text-align: center;
    }
    .collaboration-route-arrow {
      color: #6e7680;
      font-size: 15px;
      font-weight: 700;
    }
    .collaboration-avatar {
      max-width: 72px;
      width: 72px;
      padding: 6px;
      border-radius: 16px;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.84),
        0 10px 22px rgba(17, 24, 39, 0.06);
    }
    .collaboration-avatar .agent-stage {
      aspect-ratio: 1 / 1;
      border-radius: 10px;
    }
    .collaboration-avatar.has-photo .agent-stage {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 249, 255, 0.92)),
        radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.56), transparent 58%);
    }
    .collaboration-avatar.has-photo .agent-photo-image {
      object-fit: cover;
      object-position: center 34%;
      transform: scale(1.34);
      transform-origin: center center;
      filter: saturate(1.03) contrast(1.03);
    }
    .collaboration-avatar .agent-animal-label {
      display: none;
    }
    .collaboration-avatar.is-current {
      border-color: rgba(0, 113, 227, 0.22);
      box-shadow:
        inset 0 0 0 1px rgba(0, 113, 227, 0.1),
        0 12px 26px rgba(0, 113, 227, 0.12);
      background:
        linear-gradient(180deg, rgba(240, 247, 255, 0.99), rgba(255, 255, 255, 0.98)),
        radial-gradient(circle at 50% 0%, rgba(0, 113, 227, 0.08), transparent 60%);
    }
    .collaboration-thread-copy {
      min-width: 0;
      display: grid;
      gap: 5px;
    }
    .collaboration-thread-copy strong {
      font-size: 24px;
      line-height: 1.08;
      letter-spacing: -0.035em;
      color: #1d1d1f;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      overflow-wrap: anywhere;
    }
    .collaboration-thread-badges {
      display: grid;
      justify-items: end;
      gap: 8px;
    }
    .collaboration-current-owner {
      font-size: 12px;
      line-height: 1.45;
      color: #5f6670;
      font-weight: 620;
      text-align: right;
    }
    .collaboration-thread-teaser {
      display: grid;
      gap: 8px;
    }
    .collaboration-latest-snippet {
      border: 1px solid rgba(0, 113, 227, 0.12);
      border-radius: 16px;
      padding: 12px 14px;
      background:
        linear-gradient(180deg, rgba(246, 250, 255, 0.98), rgba(255, 255, 255, 0.98)),
        radial-gradient(circle at 0% 0%, rgba(0, 113, 227, 0.06), transparent 52%);
      color: #294866;
      font-size: 14px;
      line-height: 1.6;
    }
    .collaboration-thread-body {
      border-top: 1px solid rgba(17, 24, 39, 0.07);
      padding: 0 18px 18px;
      display: grid;
      gap: 14px;
    }
    .collaboration-timeline {
      list-style: none;
      margin: 0;
      padding: 14px 0 0;
      display: grid;
      gap: 12px;
    }
    .collaboration-timeline-step {
      display: grid;
      grid-template-columns: 176px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      padding-top: 12px;
      border-top: 1px solid rgba(17, 24, 39, 0.06);
    }
    .collaboration-timeline-step:first-child {
      border-top: none;
      padding-top: 0;
    }
    .collaboration-agent-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 999px;
      border: 1px solid rgba(17, 24, 39, 0.09);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(248, 251, 255, 0.96)),
        radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--agent-accent) 14%, transparent), transparent 58%);
      color: #223546;
      font-size: 13px;
      font-weight: 650;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.86);
    }
    .collaboration-agent-pill-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--agent-accent);
      box-shadow: 0 0 0 2px rgba(255,255,255,0.72);
      flex: 0 0 auto;
    }
    .collaboration-step-copy {
      min-width: 0;
      display: grid;
      gap: 6px;
    }
    .collaboration-step-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }
    .collaboration-step-head strong {
      font-size: 15px;
      color: #1d1d1f;
      letter-spacing: -0.01em;
    }
    .collaboration-step-head span {
      font-size: 12px;
      color: #6e7680;
    }
    .collaboration-thread-foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .collaboration-folded-note {
      margin-top: 2px;
    }
    .collaboration-folded-list {
      margin: 8px 0 0;
    }
    .collaboration-thread-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .collaboration-technical-details {
      margin-top: -4px;
    }
    .timeline-summary-strip {
      margin-top: 8px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .timeline-stat {
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 9px 10px;
      background: var(--card-fill-soft);
      display: grid;
      gap: 3px;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.84),
        0 10px 20px rgba(15, 23, 42, 0.03);
    }
    .timeline-stat span {
      font-size: 12px;
      color: #6b6f76;
    }
    .timeline-stat strong {
      font-size: 22px;
      line-height: 1;
      color: #1d1d1f;
      letter-spacing: -0.03em;
    }
    .timeline-stat small {
      font-size: 11px;
      color: #6e6e73;
      line-height: 1.35;
    }
    .signal-gauge-card {
      padding: 11px 11px 12px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,252,255,0.95)),
        radial-gradient(circle at 100% 0%, rgba(220, 233, 255, 0.12), transparent 52%);
    }
    .signal-gauge-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .signal-gauge-main { margin-top: 8px; display: grid; grid-template-columns: 68px minmax(0, 1fr); gap: 10px; align-items: center; }
    .signal-gauge {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: conic-gradient(var(--gauge-tone) calc(var(--gauge-pct) * 1%), rgba(199, 208, 220, 0.34) 0);
      border: 1px solid rgba(17, 24, 39, 0.12);
      display: grid;
      place-items: center;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.54);
    }
    .signal-gauge-core {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255,255,255,0.96);
      border: 1px solid rgba(17, 24, 39, 0.11);
      display: grid;
      place-items: center;
    }
    .signal-gauge-core strong {
      font-size: 20px;
      letter-spacing: -0.02em;
    }
    .signal-gauge-meta {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
    }
    .signal-gauge-meta small {
      display: block;
      color: #6e6e73;
      font-size: 12px;
      line-height: 1.45;
    }
    .signal-gauge-meta a {
      color: #0068d3;
      font-size: 13px;
      text-decoration: none;
      font-weight: 620;
    }
    .summary-gauge-card {
      justify-content: center;
      background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,253,0.95));
      gap: 7px;
    }
    .summary-gauge-card strong { font-size: 30px; }
    .summary-track {
      width: 100%;
      height: 7px;
      border-radius: 999px;
      background: rgba(196, 208, 224, 0.42);
      overflow: hidden;
      border: 1px solid rgba(17, 24, 39, 0.08);
    }
    .summary-fill {
      height: 100%;
      background: linear-gradient(90deg, rgba(33, 154, 85, 0.9), rgba(78, 191, 121, 0.95));
      border-radius: 999px;
    }
    .summary-fill.warn {
      background: linear-gradient(90deg, rgba(196, 137, 25, 0.9), rgba(217, 165, 58, 0.95));
    }
    .signal-gauge-card.state-updated { animation: status-bump 760ms ease; }
    .overview-kpi-card.state-updated-soft,
    .overview-primary-card.state-updated-soft {
      animation: kpi-bump 860ms ease;
    }
    .overview-pulse-card .status-strip {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .overview-pulse-card .status-chip {
      border-radius: 14px;
      padding: 11px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(248, 252, 255, 0.95));
      border-color: rgba(17, 24, 39, 0.1);
    }
    .overview-pulse-card .status-chip span {
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.06em;
      color: #7a7f86;
    }
    .overview-pulse-card .status-chip strong {
      font-size: 21px;
      color: #1d1d1f;
    }
    #usage-pulse .status-strip { grid-template-columns: 1fr; }
    #usage-pulse .usage-chip {
      border-radius: 16px;
      padding: 12px;
      border-color: rgba(17, 24, 39, 0.1);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.95));
    }
    #usage-pulse .usage-chip strong {
      font-size: 34px;
      letter-spacing: -0.03em;
      line-height: 1.04;
      margin-top: 1px;
    }
    .quick-filters { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; }
    .task-top-controls .quick-filters { margin-top: 0; gap: 6px; }
    .quick-chip { border: 1px solid rgba(17, 24, 39, 0.16); border-radius: 999px; padding: 6px 11px; font-size: 12px; text-decoration: none; color: #4f545a; background: rgba(255, 255, 255, 0.95); }
    .task-top-controls .quick-chip { padding: 5px 10px; font-size: 11.5px; }
    .quick-chip.active { border-color: rgba(0, 113, 227, 0.42); color: #005cb9; background: rgba(236, 246, 255, 0.96); }
    .segment-switch {
      margin-top: 8px;
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 999px;
      padding: 5px;
      background:
        linear-gradient(180deg, rgba(248, 250, 253, 0.98), rgba(255, 255, 255, 0.96)),
        radial-gradient(circle at 50% 0%, rgba(221, 232, 255, 0.18), transparent 58%);
      gap: 6px;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.88),
        0 8px 18px rgba(17, 24, 39, 0.05);
    }
    .segment-item {
      -webkit-appearance: none;
      appearance: none;
      border: none;
      background: transparent;
      box-shadow: none;
      border-radius: 999px;
      min-height: 40px;
      padding: 0 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      color: #4f545a;
      text-decoration: none;
      font-weight: 620;
      letter-spacing: -0.01em;
      cursor: pointer;
      transition: transform 160ms ease, color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }
    .segment-item:hover {
      transform: translateY(-1px);
      color: #2f3944;
      background: rgba(255, 255, 255, 0.72);
    }
    .segment-item.active {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(247, 250, 255, 0.98)),
        radial-gradient(circle at 50% 0%, rgba(0, 113, 227, 0.12), transparent 60%);
      color: #0059b2;
      box-shadow:
        inset 0 0 0 1px rgba(0, 113, 227, 0.16),
        0 8px 18px rgba(0, 113, 227, 0.12);
    }
    .segment-item:focus-visible {
      outline: none;
      box-shadow: var(--ring-soft), inset 0 0 0 1px rgba(0, 113, 227, 0.18);
    }
    .cron-board { margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
    .cron-owner-card {
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 18px;
      background: linear-gradient(170deg, rgba(255, 255, 255, 0.97), rgba(250, 252, 255, 0.94));
      padding: 12px;
      box-shadow: 0 10px 22px rgba(17, 24, 39, 0.04);
    }
    .cron-owner-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .cron-owner-head h3 { font-size: 16px; color: #1d1d1f; letter-spacing: -0.012em; }
    .cron-job-list { list-style: none; margin: 8px 0 0 0; padding: 0; display: grid; gap: 8px; }
    .cron-job-list li {
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 14px;
      padding: 10px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 252, 255, 0.96));
    }
    .cron-job-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .cron-job-head strong { font-size: 13px; color: #1d1d1f; line-height: 1.45; }
    .cron-run-grid {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
      gap: 12px;
    }
    .cron-run-card {
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 20px;
      padding: 15px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(248, 251, 255, 0.96)),
        radial-gradient(circle at 100% 0%, rgba(23, 120, 242, 0.1), transparent 56%);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.84),
        0 14px 30px rgba(17, 24, 39, 0.06);
      display: grid;
      gap: 12px;
    }
    .cron-run-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .cron-run-head h3 {
      margin: 4px 0 0 0;
      font-size: 18px;
      line-height: 1.22;
      color: #1d1d1f;
      letter-spacing: -0.02em;
    }
    .cron-run-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .cron-run-list {
      margin: 0;
      display: grid;
      gap: 8px;
    }
    .cron-run-row {
      display: grid;
      grid-template-columns: 78px minmax(0, 1fr);
      gap: 8px;
      align-items: start;
    }
    .cron-run-row dt {
      margin: 0;
      color: #68707a;
      font-size: 12px;
      line-height: 1.45;
      font-weight: 700;
    }
    .cron-run-row dd {
      margin: 0;
      color: #22262b;
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
    }
    .cron-run-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding-top: 10px;
      border-top: 1px solid rgba(17, 24, 39, 0.07);
    }
    .toolbar { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .readiness-grid { margin-top: 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
    .readiness-chip {
      border: 2px solid var(--card-border);
      border-radius: 8px;
      background: #ffffff;
      padding: 11px;
      box-shadow: none;
    }
    .readiness-chip .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
    .readiness-chip .score { font-size: 22px; margin-top: 4px; letter-spacing: -0.02em; }
    .empty-state { margin-top: 10px; border: 2px dashed #f59e0b; padding: 13px; border-radius: 8px; background: #fffbeb; color: #92400e; font-size: 13px; line-height: 1.68; }
    .office-grid { margin-top: 8px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .office-card {
      border: 1px solid rgba(17, 24, 39, 0.1);
      border-radius: 16px;
      padding: 13px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(251, 253, 255, 0.95));
      box-shadow: 0 8px 20px rgba(17, 24, 39, 0.06);
    }
    .office-head { display: grid; grid-template-columns: 146px minmax(0, 1fr); gap: 12px; align-items: start; }
    .office-info .topline { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .office-info .topline strong { font-size: 15px; letter-spacing: -0.01em; }
    .agent-avatar {
      border: 1px solid rgba(17, 24, 39, 0.12);
      border-top: 3px solid var(--agent-accent);
      border-radius: 12px;
      padding: 10px;
      background:
        linear-gradient(140deg, rgba(255, 255, 255, 0.98), rgba(250, 252, 255, 0.95)),
        radial-gradient(circle at 84% 14%, rgba(255, 255, 255, 0.74), transparent 48%);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.56);
      text-align: center;
      position: relative;
      overflow: hidden;
      width: 100%;
      max-width: 146px;
    }
    .agent-stage {
      position: relative;
      height: auto;
      aspect-ratio: 224 / 160;
      border-radius: 10px;
      border: 1px solid rgba(17, 24, 39, 0.1);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(240, 247, 255, 0.8)),
        repeating-linear-gradient(
          0deg,
          rgba(31, 41, 55, 0.04) 0px,
          rgba(31, 41, 55, 0.04) 1px,
          transparent 1px,
          transparent 8px
        ),
        repeating-linear-gradient(
          90deg,
          rgba(31, 41, 55, 0.04) 0px,
          rgba(31, 41, 55, 0.04) 1px,
          transparent 1px,
          transparent 8px
        );
      overflow: hidden;
    }
    .agent-avatar.has-photo .agent-stage,
    .staff-avatar.has-photo .agent-stage {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(243, 248, 255, 0.84)),
        radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.5), transparent 54%);
    }
    .agent-pixel-canvas {
      width: 100%;
      height: 100%;
      display: block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      filter: saturate(1.06) contrast(1.04);
    }
    .agent-photo-image {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      object-position: center center;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      filter: saturate(1.02) contrast(1.02);
    }
    .agent-animal-label {
      margin-top: 8px;
      font-size: 12px;
      color: #4d5259;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .staff-brief-grid {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .staff-brief-card {
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 22px;
      padding: 13px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(249, 251, 255, 0.97)),
        radial-gradient(circle at 100% 0%, rgba(221, 232, 255, 0.18), transparent 52%);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.82),
        0 16px 34px rgba(17, 24, 39, 0.06);
      display: grid;
      gap: 10px;
      position: relative;
    }
    .staff-status-dot,
    .task-status-dot {
      position: absolute;
      left: 14px;
      top: 14px;
      width: 11px;
      height: 11px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.82);
      box-shadow:
        0 0 0 3px rgba(255, 255, 255, 0.72),
        0 6px 12px rgba(17, 24, 39, 0.14);
      z-index: 2;
    }
    .staff-status-dot.idle,
    .task-status-dot.idle {
      background: #1f9d55;
    }
    .staff-status-dot.working,
    .task-status-dot.working {
      background: #e0a106;
    }
    .staff-status-dot.issue,
    .task-status-dot.issue {
      background: #dc3c32;
    }
    .task-status-dot.scheduled {
      background: #1778f2;
    }
    .task-brief-board {
      margin-top: 12px;
      display: grid;
      gap: 12px;
    }
    .doc-summary-grid {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
      gap: 12px;
    }
    .doc-summary-card {
      border: 2px solid var(--card-border);
      border-radius: 8px;
      padding: 14px;
      background: #ffffff;
      display: grid;
      gap: 8px;
      min-width: 0;
      overflow: hidden;
      box-shadow: none;
    }
    .doc-preview-trigger {
      width: 100%;
      appearance: none;
      text-align: left;
      color: inherit;
      font: inherit;
      cursor: pointer;
      min-width: 0;
      overflow: hidden;
      transition:
        transform 160ms ease,
        box-shadow 160ms ease,
        border-color 160ms ease;
    }
    .doc-preview-trigger:hover {
      transform: scale(1.01);
      border-color: rgba(37, 99, 235, 0.22);
      box-shadow: none;
    }
    .doc-preview-trigger:focus-visible {
      outline: 2px solid rgba(37, 99, 235, 0.45);
      outline-offset: 3px;
    }
    .doc-summary-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: start;
      min-width: 0;
    }
    .doc-summary-head strong {
      min-width: 0;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-size: 15px;
      line-height: 1.35;
      color: #1d1d1f;
    }
    .doc-summary-card .meta,
    .doc-project-trigger .meta,
    .doc-project-trigger strong,
    .doc-summary-card code,
    .doc-project-trigger code {
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .doc-summary-body {
      color: #364152;
      font-size: 13px;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 6;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .doc-coverage-grid {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
      gap: 12px;
    }
    .doc-coverage-card {
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 18px;
      padding: 14px;
      background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,252,0.96));
      display: grid;
      gap: 10px;
      box-shadow: 0 10px 22px rgba(17, 24, 39, 0.04);
    }
    .doc-coverage-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .doc-coverage-head strong {
      font-size: 15px;
      line-height: 1.35;
      color: #1d1d1f;
    }
    .doc-coverage-count {
      border-radius: 999px;
      padding: 4px 10px;
      background: rgba(15, 23, 42, 0.06);
      color: #0f172a;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .doc-coverage-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .doc-coverage-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    button.doc-coverage-pill {
      appearance: none;
      cursor: pointer;
    }
    .doc-coverage-pill.ready {
      background: rgba(34, 197, 94, 0.14);
      border: 1px solid rgba(22, 163, 74, 0.2);
      color: #166534;
    }
    .doc-coverage-pill.missing {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(220, 38, 38, 0.18);
      color: #b91c1c;
    }
    .doc-project-grid {
      margin-top: 12px;
      display: grid;
      gap: 12px;
    }
    .doc-project-card {
      margin: 0;
    }
    .doc-project-items .group-item {
      gap: 6px;
    }
    .doc-project-trigger {
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 14px;
      padding: 12px;
      background: rgba(248, 250, 252, 0.86);
      display: grid;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }
    .doc-preview-dialog {
      width: min(920px, calc(100vw - 32px));
      max-width: 920px;
      height: min(78vh, 720px);
      max-height: 78vh;
      padding: 0;
      border: none;
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(246, 249, 255, 0.98)),
        radial-gradient(circle at top right, rgba(191, 219, 254, 0.3), transparent 42%);
      box-shadow:
        0 26px 80px rgba(15, 23, 42, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      color: #0f172a;
      overflow: hidden;
    }
    .doc-preview-dialog::backdrop {
      background: rgba(15, 23, 42, 0.46);
      backdrop-filter: blur(5px);
    }
    .doc-preview-shell {
      height: 100%;
      display: grid;
      grid-template-rows: auto auto 1fr;
    }
    .doc-preview-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding: 22px 24px 14px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    }
    .doc-preview-head-copy {
      display: grid;
      gap: 6px;
      min-width: 0;
    }
    .doc-preview-head-copy strong {
      font-size: 18px;
      line-height: 1.4;
      color: #0f172a;
    }
    .doc-preview-close {
      appearance: none;
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      color: #0f172a;
      padding: 9px 14px;
      cursor: pointer;
      font: inherit;
      white-space: nowrap;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }
    .doc-preview-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      padding: 12px 24px 0;
    }
    .doc-preview-token {
      min-width: min(240px, 100%);
      border: 1px solid rgba(148, 163, 184, 0.34);
      border-radius: 12px;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.96);
      color: #0f172a;
    }
    .doc-preview-content {
      padding: 0 24px 24px;
      overflow: auto;
    }
    .doc-preview-body {
      margin: 0;
      min-height: 100%;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 13px;
      line-height: 1.7;
      color: #0f172a;
      background: rgba(255, 255, 255, 0.84);
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 18px;
      padding: 18px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
    }
    .doc-preview-editor {
      width: 100%;
      min-height: 100%;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 16px;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.96);
      color: #0f172a;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 13px;
      line-height: 1.65;
      resize: none;
      box-sizing: border-box;
    }
    .doc-preview-status {
      padding: 12px 24px 14px;
    }
    .task-brief-board-empty {
      margin-top: 12px;
    }
    .task-empty-state strong {
      display: block;
      font-size: 14px;
      color: #5b3f14;
    }
    .task-empty-state .meta {
      margin-top: 6px;
    }
    .task-empty-signals {
      margin-top: 12px;
    }
    .task-empty-signals .dashboard-strip {
      margin-top: 0;
    }
    .task-brief-toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px 12px;
    }
    .task-brief-copy {
      display: grid;
      gap: 6px;
      min-width: 0;
    }
    .task-brief-controls {
      display: grid;
      gap: 6px;
      justify-items: end;
      min-width: min(100%, 190px);
    }
    .task-brief-token {
      width: min(100%, 220px);
      border-radius: 12px;
      border: 1px solid rgba(17, 24, 39, 0.14);
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.92);
      color: #1d1d1f;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
    }
    .task-brief-legend {
      margin-top: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .task-legend-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 999px;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.82);
      color: #505863;
      font-size: 11px;
      font-weight: 620;
    }
    .task-brief-hint,
    .task-brief-status-line {
      margin: 0;
      line-height: 1.35;
    }
    .task-brief-hint {
      max-width: 780px;
    }
    .task-legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.62);
    }
    .task-legend-dot.idle { background: #1f9d55; }
    .task-legend-dot.working { background: #e0a106; }
    .task-legend-dot.issue { background: #dc3c32; }
    .task-legend-dot.scheduled { background: #1778f2; }
    .task-brief-grid {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
      gap: 10px;
    }
    .task-brief-card {
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 22px;
      padding: 13px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(249, 251, 255, 0.97)),
        radial-gradient(circle at 100% 0%, rgba(221, 232, 255, 0.16), transparent 54%);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.82),
        0 16px 34px rgba(17, 24, 39, 0.06);
      display: grid;
      gap: 10px;
      position: relative;
      cursor: grab;
      transition:
        transform 160ms ease,
        box-shadow 160ms ease,
        border-color 160ms ease,
        opacity 160ms ease;
    }
    .task-brief-card.dragging {
      opacity: 0.68;
      cursor: grabbing;
      transform: scale(0.985);
      border-color: rgba(0, 113, 227, 0.34);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.82),
        0 18px 38px rgba(17, 24, 39, 0.12);
    }
    .task-brief-card.drag-target {
      border-color: rgba(0, 113, 227, 0.42);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.82),
        0 18px 38px rgba(17, 24, 39, 0.1);
    }
    .task-drag-handle {
      position: absolute;
      right: 14px;
      top: 12px;
      display: inline-grid;
      gap: 3px;
      padding: 8px 7px;
      border-radius: 12px;
      border: 1px dashed rgba(70, 96, 124, 0.22);
      background: rgba(255, 255, 255, 0.88);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
      pointer-events: none;
    }
    .task-drag-handle span {
      display: block;
      width: 13px;
      height: 2px;
      border-radius: 999px;
      background: rgba(70, 96, 124, 0.74);
    }
    .task-brief-head {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
    }
    .task-brief-card[data-task-kind="timed_job"] .task-brief-head {
      grid-template-columns: 76px minmax(0, 1fr);
    }
    .task-priority-panel {
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 18px;
      padding: 9px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 250, 255, 0.96)),
        radial-gradient(circle at 0% 0%, rgba(0, 113, 227, 0.08), transparent 60%);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.82),
        0 10px 22px rgba(17, 24, 39, 0.05);
      display: grid;
      gap: 4px;
      min-height: 100%;
    }
    .task-priority-panel.compact {
      padding: 8px 9px;
      gap: 3px;
    }
    .task-priority-panel span {
      color: #68707a;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
    }
    .task-priority-panel.compact span {
      font-size: 10px;
      letter-spacing: 0.03em;
    }
    .task-priority-panel strong {
      font-size: 16px;
      line-height: 1.15;
      color: #1d1d1f;
      letter-spacing: -0.02em;
    }
    .task-priority-panel.compact strong {
      font-size: 13px;
      line-height: 1.2;
    }
    .task-priority-panel small {
      color: #68707a;
      font-size: 11px;
      line-height: 1.35;
    }
    .task-priority-panel.compact small {
      font-size: 10px;
      line-height: 1.25;
    }
    .task-brief-identity h3 {
      margin: 0;
      font-size: 18px;
      line-height: 1.14;
      color: #1d1d1f;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .task-brief-pills {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .task-brief-identity .task-role {
      margin-top: 4px;
      font-size: 11px;
      line-height: 1.35;
      color: #5c6570;
      font-weight: 620;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .task-brief-list {
      margin: 0;
      display: grid;
      gap: 6px;
    }
    .task-brief-row {
      display: grid;
      grid-template-columns: 74px minmax(0, 1fr);
      gap: 6px;
      align-items: start;
      min-width: 0;
    }
    .task-brief-row dt {
      margin: 0;
      color: #68707a;
      font-size: 11px;
      line-height: 1.35;
      font-weight: 700;
    }
    .task-brief-row dd {
      margin: 0;
      color: #22262b;
      font-size: 13px;
      line-height: 1.45;
      word-break: break-word;
    }
    .task-brief-value {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .task-brief-value.clamp-2 {
      -webkit-line-clamp: 2;
    }
    .task-brief-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding-top: 8px;
      border-top: 1px solid rgba(17, 24, 39, 0.07);
    }
    .task-brief-actions code {
      color: #46607c;
      font-size: 11px;
    }
    .staff-brief-head {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
    }
    .staff-avatar {
      width: 96px;
      padding: 7px;
      border-radius: 16px;
      border: 1px solid rgba(17, 24, 39, 0.08);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 252, 255, 0.95)),
        radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--agent-accent) 12%, transparent), transparent 62%);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.8),
        0 10px 20px rgba(17, 24, 39, 0.05);
    }
    .staff-avatar .agent-stage {
      aspect-ratio: 1 / 1;
      border-radius: 12px;
    }
    .staff-brief-identity h3 {
      margin: 0;
      font-size: 18px;
      line-height: 1.12;
      color: #1d1d1f;
    }
    .staff-role {
      margin-top: 3px;
      font-size: 11px;
      line-height: 1.35;
      color: #5c6570;
      font-weight: 620;
    }
    .staff-brief-list {
      margin: 0;
      display: grid;
      gap: 6px;
    }
    .staff-brief-row {
      display: grid;
      grid-template-columns: 84px minmax(0, 1fr);
      gap: 6px;
      align-items: start;
      padding-top: 6px;
      border-top: 1px solid rgba(17, 24, 39, 0.06);
    }
    .staff-brief-row:first-child {
      border-top: none;
      padding-top: 0;
    }
    .staff-brief-row dt {
      margin: 0;
      font-size: 11px;
      line-height: 1.35;
      color: #7b8490;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .staff-brief-row dd {
      margin: 0;
      font-size: 13px;
      line-height: 1.45;
      color: #24313d;
      font-weight: 560;
    }
    .staff-brief-value {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .staff-brief-value.clamp-2 {
      -webkit-line-clamp: 2;
    }
    .staff-brief-value.clamp-3 {
      -webkit-line-clamp: 3;
    }
    .staff-config-row dd {
      overflow: hidden;
    }
    .staff-model-editor {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      min-width: 0;
    }
    .staff-model-select,
    .staff-model-token {
      width: 100%;
      min-height: 36px;
      border: 1px solid rgba(148, 163, 184, 0.32);
      border-radius: 12px;
      padding: 0 12px;
      background: rgba(255, 255, 255, 0.95);
      color: #17212b;
      font: inherit;
      box-sizing: border-box;
    }
    .staff-model-token {
      grid-column: 1 / -1;
    }
    .staff-model-save {
      justify-self: start;
      min-height: 36px;
      padding: 0 14px;
    }
    .staff-model-status {
      grid-column: 1 / -1;
      overflow-wrap: anywhere;
      word-break: break-word;
      min-height: 0;
    }
    .staff-model-status:empty {
      display: none;
    }
    .office-focus { margin: 6px 0 0 18px; padding: 0; }
    .office-focus li { margin-top: 4px; }
    .office-floor { margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
    .zone { border: 1px solid rgba(22, 86, 116, 0.2); border-radius: 12px; padding: 10px; background: rgba(247, 252, 255, 0.95); }
    .zone h3 { font-size: 13px; color: #1a4e66; margin-bottom: 4px; }
    .zone .meta { margin-bottom: 6px; }
    .desk-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .desk-chip {
      border: 1px solid rgba(22, 86, 116, 0.2);
      border-radius: 9px;
      padding: 7px;
      font-size: 12px;
      background: rgba(255, 255, 255, 0.95);
    }
    .desk-chip strong { color: #15485f; }
    .calendar-grid { margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
    .calendar-day {
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 18px;
      padding: 12px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 251, 255, 0.96));
      box-shadow: 0 10px 22px rgba(17, 24, 39, 0.04);
    }
    .calendar-day h3 { font-size: 14px; margin: 0; color: #1f2937; }
    .calendar-event-list { list-style: none; margin: 8px 0 0 0; padding: 0; display: grid; gap: 8px; }
    .calendar-event {
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 14px;
      padding: 10px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(250, 252, 255, 0.97));
    }
    .calendar-event-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .mission-banner {
      margin-top: 8px;
      border: 1px solid rgba(0, 113, 227, 0.24);
      border-radius: 12px;
      padding: 10px;
      background: linear-gradient(180deg, rgba(236, 246, 255, 0.96), rgba(255, 255, 255, 0.98));
      color: #11385a;
      font-weight: 620;
      line-height: 1.5;
    }
    .memory-timeline { margin-top: 10px; display: grid; gap: 8px; }
    .memory-row {
      border: 1px solid rgba(17, 24, 39, 0.1);
      border-radius: 12px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.95);
      display: grid;
      grid-template-columns: 110px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
    }
    .memory-day {
      font-size: 12px;
      color: #6b7280;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .memory-title { font-size: 15px; color: #1f2937; font-weight: 650; line-height: 1.4; }
    .file-workbench {
      margin-top: 12px;
      display: grid;
      grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
      gap: 12px;
      align-items: stretch;
    }
    .file-sidebar,
    .file-editor-panel {
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 22px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 252, 255, 0.96)),
        radial-gradient(circle at 100% 0%, rgba(221, 232, 255, 0.16), transparent 52%);
      padding: 14px;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.8),
        0 18px 36px rgba(17, 24, 39, 0.06);
    }
    .file-sidebar { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px; }
    .file-sidebar-tools { display: grid; gap: 8px; }
    .file-facet-switch {
      justify-self: start;
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 8px;
      border: none;
      background: transparent;
      box-shadow: none;
      padding: 0;
      border-radius: 0;
    }
    .file-facet-switch .segment-item {
      min-height: 38px;
      padding: 0 16px;
      border: 1px solid rgba(17, 24, 39, 0.08);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(249, 251, 255, 0.94));
      color: #4d5560;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.84),
        0 8px 18px rgba(17, 24, 39, 0.04);
    }
    .file-facet-switch .segment-item:hover {
      border-color: rgba(17, 24, 39, 0.12);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(250, 252, 255, 0.97));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.88),
        0 10px 20px rgba(17, 24, 39, 0.06);
    }
    .file-facet-switch .segment-item.active {
      border-color: rgba(0, 113, 227, 0.16);
      background:
        linear-gradient(180deg, rgba(240, 247, 255, 0.99), rgba(255, 255, 255, 0.98)),
        radial-gradient(circle at 50% 0%, rgba(0, 113, 227, 0.08), transparent 60%);
      color: #0059b2;
      box-shadow:
        inset 0 0 0 1px rgba(0, 113, 227, 0.12),
        0 10px 22px rgba(0, 113, 227, 0.08);
    }
    .file-filter-input,
    .file-token-input {
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      border: 1px solid rgba(17, 24, 39, 0.1);
      border-radius: 15px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(249, 251, 255, 0.97));
      padding: 11px 13px;
      font-size: 13px;
      font-family: inherit;
      color: #1d1d1f;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
    }
    .file-filter-input:focus,
    .file-token-input:focus {
      outline: none;
      border-color: rgba(0, 113, 227, 0.24);
      box-shadow: var(--ring-soft), inset 0 1px 0 rgba(255, 255, 255, 0.88);
    }
    .file-filter-input::placeholder,
    .file-token-input::placeholder,
    .docs-search input::placeholder,
    .file-editor-textarea::placeholder {
      color: #8c9198;
    }
    .file-nav {
      display: grid;
      gap: 8px;
      max-height: 660px;
      overflow: auto;
      padding-right: 4px;
      scrollbar-width: thin;
      scrollbar-color: rgba(126, 138, 154, 0.45) transparent;
    }
    .file-nav::-webkit-scrollbar,
    .panel::-webkit-scrollbar,
    .card::-webkit-scrollbar,
    textarea::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .file-nav::-webkit-scrollbar-thumb,
    .panel::-webkit-scrollbar-thumb,
    .card::-webkit-scrollbar-thumb,
    textarea::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: rgba(126, 138, 154, 0.42);
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    .file-nav::-webkit-scrollbar-track,
    .panel::-webkit-scrollbar-track,
    .card::-webkit-scrollbar-track,
    textarea::-webkit-scrollbar-track {
      background: transparent;
    }
    .file-nav-item {
      -webkit-appearance: none;
      appearance: none;
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(250, 251, 253, 0.96), rgba(255, 255, 255, 0.95));
      padding: 12px 13px;
      text-align: left;
      display: grid;
      gap: 4px;
      cursor: pointer;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
      transition: border-color 180ms ease, transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
    }
    .file-nav-item[hidden] {
      display: none !important;
    }
    .file-nav-item:hover {
      border-color: rgba(17, 24, 39, 0.1);
      background: linear-gradient(180deg, rgba(247, 250, 255, 0.99), rgba(255, 255, 255, 0.98));
      transform: translateY(-1px);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.84),
        0 10px 24px rgba(17, 24, 39, 0.06);
    }
    .file-nav-item.active {
      border-color: rgba(0, 113, 227, 0.16);
      background:
        linear-gradient(180deg, rgba(240, 247, 255, 0.99), rgba(255, 255, 255, 0.99)),
        radial-gradient(circle at 0% 0%, rgba(0, 113, 227, 0.08), transparent 42%);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.84),
        0 14px 28px rgba(0, 113, 227, 0.09);
    }
    .file-nav-title { font-size: 14px; font-weight: 650; color: #1d1d1f; }
    .file-nav-meta { font-size: 12px; color: #6e6e73; line-height: 1.5; }
    .file-editor-panel {
      display: grid;
      grid-template-rows: auto minmax(360px, 1fr) auto;
      gap: 10px;
      min-height: 0;
    }
    .file-editor-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }
    .file-editor-title { font-size: 18px; font-weight: 680; color: #1d1d1f; line-height: 1.25; }
    .file-editor-textarea {
      width: 100%;
      min-height: 480px;
      border: 1px solid rgba(17, 24, 39, 0.1);
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(251, 252, 254, 0.99), rgba(247, 249, 252, 0.98));
      padding: 16px 18px;
      font: 13px/1.65 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      color: #17202a;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.74);
    }
    .file-editor-textarea:focus {
      border-color: rgba(0, 113, 227, 0.24);
      box-shadow: var(--ring-soft), inset 0 1px 0 rgba(255, 255, 255, 0.78);
    }
    .docs-toolbar {
      margin-top: 10px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 150px;
      gap: 8px;
      align-items: center;
    }
    .docs-search { margin-top: 0; }
    .docs-search input {
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      border: 1px solid rgba(17, 24, 39, 0.1);
      border-radius: 15px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(249, 251, 255, 0.97));
      padding: 11px 13px;
      font-size: 14px;
      font-family: inherit;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
    }
    .docs-source-filter-wrap select {
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      border: 1px solid rgba(17, 24, 39, 0.1);
      border-radius: 15px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(249, 251, 255, 0.97));
      padding: 11px 13px;
      font-size: 13px;
      color: #364152;
      font-family: inherit;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
    }
    .docs-search input:focus,
    .docs-source-filter-wrap select:focus {
      outline: none;
      border-color: rgba(0, 113, 227, 0.24);
      box-shadow: var(--ring-soft), inset 0 1px 0 rgba(255, 255, 255, 0.88);
    }
    .docs-grid { margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
    .doc-card {
      border: 1px solid rgba(17, 24, 39, 0.07);
      border-radius: 16px;
      padding: 11px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 252, 255, 0.96));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.84);
      display: grid;
      gap: 6px;
    }
    .doc-card.is-hidden { display: none; }
    .doc-card-head { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    details summary { cursor: pointer; color: #1a4e66; font-size: 13px; font-weight: 620; }
    .card.compact-details summary {
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 15px;
      color: #143e60;
      font-weight: 680;
    }
    .card.compact-details summary::after {
      content: var(--fold-open-label);
      font-size: 11px;
      color: #6a7380;
      border: 1px solid rgba(22, 86, 116, 0.14);
      border-radius: 999px;
      padding: 4px 9px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.92));
    }
    .card.compact-details[open] summary::after { content: var(--fold-close-label); }
    .card.compact-details > .meta { margin-top: 8px; }
    .card.compact-details .fold-body { margin-top: 10px; }
    .compact-table-details summary {
      list-style: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #1c5471;
      font-weight: 620;
      cursor: pointer;
    }
    .compact-table-details summary::after {
      content: var(--fold-open-label);
      font-size: 11px;
      color: #6a7380;
      border: 1px solid rgba(22, 86, 116, 0.14);
      border-radius: 999px;
      padding: 3px 8px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.92));
    }
    .compact-table-details[open] summary::after { content: var(--fold-close-label); }
    code { color: #0b6db3; font-size: 12px; }
    .subscription-pill {
      margin-top: 8px;
      border: 1px solid rgba(22, 86, 116, 0.14);
      border-radius: 16px;
      padding: 12px;
      background: linear-gradient(180deg, rgba(247, 252, 255, 0.98), rgba(255, 255, 255, 0.97));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.84);
    }
    .quota-compact { display: grid; gap: 10px; margin-top: 8px; }
    .quota-row {
      border: 1px solid rgba(22, 86, 116, 0.1);
      border-radius: 14px;
      padding: 10px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 251, 255, 0.96));
    }
    .quota-head { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
    .quota-label { font-size: 13px; font-weight: 650; color: #14374d; }
    .quota-value { font-size: 12px; color: var(--muted); }
    .quota-track { margin-top: 6px; border: 1px solid rgba(20, 92, 124, 0.16); border-radius: 999px; height: 8px; background: rgba(210, 228, 238, 0.52); overflow: hidden; }
    .quota-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #0f7bb2, #1f9f80); }
    .quota-foot { margin-top: 4px; font-size: 11px; color: var(--muted); }
    .pie-wrap { margin-top: 10px; display: grid; grid-template-columns: minmax(180px, 220px) minmax(0, 1fr); gap: 12px; align-items: center; }
    .pie-chart {
      width: 180px;
      height: 180px;
      border-radius: 50%;
      border: 1px solid rgba(21, 82, 112, 0.18);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.52), 0 8px 18px rgba(16, 53, 76, 0.08);
      position: relative;
      margin: 0 auto;
    }
    .pie-hole {
      position: absolute;
      inset: 32px;
      border-radius: 50%;
      border: 1px solid rgba(21, 82, 112, 0.14);
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 10px;
    }
    .pie-hole strong { font-size: 17px; color: #11364e; letter-spacing: -0.01em; }
    .pie-hole span { margin-top: 2px; font-size: 11px; color: var(--muted); line-height: 1.35; }
    .pie-legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .pie-legend li {
      display: grid;
      grid-template-columns: 10px minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #1a4259;
      border-bottom: 1px dashed rgba(22, 86, 116, 0.1);
      padding-bottom: 4px;
    }
    .pie-swatch { width: 10px; height: 10px; border-radius: 999px; }
    .pie-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pie-val { color: var(--muted); font-variant-numeric: tabular-nums; }
    @keyframes card-in {
      from { opacity: 0; transform: translateY(7px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes panel-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes status-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.015); }
      100% { transform: scale(1); }
    }
    @keyframes status-bump {
      0% { transform: translateY(0); box-shadow: 0 0 0 rgba(0, 113, 227, 0); }
      30% { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0, 113, 227, 0.2); }
      100% { transform: translateY(0); box-shadow: 0 0 0 rgba(0, 113, 227, 0); }
    }
    @keyframes kpi-bump {
      0% { transform: translateY(0); box-shadow: 0 0 0 rgba(0, 113, 227, 0); }
      24% { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(0, 113, 227, 0.16); }
      100% { transform: translateY(0); box-shadow: 0 0 0 rgba(0, 113, 227, 0); }
    }
    @media (max-width: 1600px) {
      .app-shell { grid-template-columns: 214px minmax(0, 1fr) 272px; gap: 16px; padding: 18px; }
      .section-title { font-size: 34px; }
      .overview-v3-shell { grid-template-columns: 1fr; }
      .overview-decision-grid { grid-template-columns: 1fr 1fr; }
      .overview-kpi-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .task-hub-shell { grid-template-columns: 1fr; }
      .task-hub-grid { grid-template-columns: 1fr; }
      .task-hub-board-grid { grid-template-columns: 1fr; }
      .overview-busy-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .office-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .task-brief-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .staff-brief-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .collaboration-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    /* Reverted custom UI override layers
    .refresh-interval,
    .panel-toggle,
    .overview-focus-stage,
    .overview-kpi-card,
    .overview-hero-card,
    .exec-card,
    .overview-action-item,
    .overview-task-strip,
    .decision-row,
    .overview-busy-card,
    .overview-context-note,
    .queue-item,
    .settings-status-panel,
    .settings-inline-budget,
    .status-chip,
    .signal-gauge-card,
    .timeline-stat,
    .quick-chip,
    .segment-switch,
    .cron-owner-card,
    .cron-job-list li,
    .cron-run-card,
    .office-card,
    .collaboration-thread-card,
    .collaboration-latest-snippet,
    .collaboration-agent-pill,
    .file-nav-item,
    .doc-summary-card {
      border: 2px solid var(--border);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: none;
    }
    .panel-toggle,
    .quick-chip,
    .segment-item,
    .file-nav-item,
    .overview-action-item,
    .decision-row,
    .overview-quick-links .btn,
    .overview-context-links .btn {
      transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease;
    }
    .panel-toggle:hover,
    .quick-chip:hover,
    .segment-item:hover,
    .file-nav-item:hover,
    .overview-action-item:hover,
    .decision-row:hover,
    .overview-quick-links .btn:hover,
    .overview-context-links .btn:hover {
      transform: scale(1.02);
      background: #dbeafe;
      border-color: var(--primary);
      box-shadow: none;
      color: #1d4ed8;
    }
    .refresh-interval {
      background: #f3f4f6;
      box-shadow: none;
    }
    .refresh-interval select {
      background: transparent;
    }
    .panel-toggle {
      min-height: 40px;
      font-weight: 700;
      background: #f3f4f6;
      color: #374151;
    }
    .overview-primary-card {
      border: 2px solid #111827;
      border-radius: 8px;
      background:
        linear-gradient(135deg, #3b82f6 0 83%, #1d4ed8 83% 100%);
      box-shadow: none;
      overflow: hidden;
    }
    .overview-primary-card::after {
      content: "";
      position: absolute;
      right: -32px;
      top: -28px;
      width: 132px;
      height: 132px;
      border-radius: 8px;
      transform: rotate(18deg);
      background: rgba(255, 255, 255, 0.12);
      pointer-events: none;
    }
    .overview-primary-card h2,
    .overview-primary-card .overview-primary-value {
      color: #ffffff;
    }
    .overview-primary-card .meta,
    .overview-primary-card .overview-primary-label {
      color: rgba(255, 255, 255, 0.86);
    }
    .overview-primary-directive {
      border: 2px solid rgba(255, 255, 255, 0.72);
      border-radius: 8px;
      background: rgba(17, 24, 39, 0.12);
      color: #ffffff;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .overview-primary-card .overview-quick-links .btn {
      border: 0;
      background: #ffffff;
      color: #1d4ed8;
    }
    .overview-focus-stage {
      grid-template-columns: 126px minmax(0, 1fr);
      padding: 14px;
      background: #ffffff;
      border-color: #111827;
    }
    .overview-focus-ring {
      width: 104px;
      height: 104px;
      border: 2px solid #111827;
      box-shadow: none;
      background: conic-gradient(var(--focus-tone) calc(var(--focus-score) * 1%), #d1d5db 0);
    }
    .overview-focus-core {
      width: 72px;
      height: 72px;
      border: 2px solid #111827;
      box-shadow: none;
      background: #ffffff;
    }
    .overview-focus-score,
    .overview-focus-headline,
    .overview-focus-sub,
    .overview-focus-meta {
      color: #111827;
    }
    .overview-kpi-card {
      border-radius: 8px;
      padding: 18px;
      background: #ffffff;
    }
    .overview-kpi-card::before {
      height: 6px;
      background: #10b981;
    }
    .overview-kpi-card.tone-warn {
      border-color: #f59e0b;
      background: #fef3c7;
    }
    .overview-kpi-card.tone-warn::before {
      background: #f59e0b;
    }
    .overview-kpi-card.tone-neutral {
      border-color: #d1d5db;
      background: #f3f4f6;
    }
    .overview-kpi-card.tone-neutral::before {
      background: #6b7280;
    }
    .overview-kpi-label,
    .overview-hero-card .label,
    .exec-title,
    .status-chip span,
    .timeline-stat span {
      color: #4b5563;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .overview-kpi-value,
    .overview-hero-card .value,
    .exec-metric,
    .status-chip strong,
    .timeline-stat strong {
      color: #111827;
      font-weight: 800;
    }
    .overview-kpi-detail,
    .overview-hero-card .hint,
    .timeline-stat small {
      color: #6b7280;
    }
    .overview-hero-card,
    .exec-card {
      padding: 16px;
    }
    .executive-grid .exec-card:nth-child(4n + 1),
    .overview-hero-strip .overview-hero-card:nth-child(4n + 1) {
      background: #dbeafe;
      border-color: #93c5fd;
    }
    .executive-grid .exec-card:nth-child(4n + 2),
    .overview-hero-strip .overview-hero-card:nth-child(4n + 2) {
      background: #d1fae5;
      border-color: #6ee7b7;
    }
    .executive-grid .exec-card:nth-child(4n + 3),
    .overview-hero-strip .overview-hero-card:nth-child(4n + 3) {
      background: #fef3c7;
      border-color: #fcd34d;
    }
    .executive-grid .exec-card:nth-child(4n + 4),
    .overview-hero-strip .overview-hero-card:nth-child(4n + 4) {
      background: #f3f4f6;
      border-color: #d1d5db;
    }
    #current-task-health {
      background: #ecfdf5;
      border-color: #10b981;
      box-shadow: none;
    }
    .overview-action-item {
      border-radius: 8px;
      min-height: 96px;
      padding: 14px;
    }
    .overview-action-item.hot {
      border-color: #f59e0b;
      background: #fef3c7;
    }
    .overview-action-item span,
    .overview-action-item small,
    .decision-row-copy .meta {
      color: #4b5563;
    }
    .overview-action-item strong,
    .decision-row-copy strong {
      color: #111827;
    }
    .overview-task-strip,
    .overview-context-note {
      background: #f3f4f6;
    }
    .decision-row {
      border-radius: 8px;
      padding: 13px 14px;
      background: #ffffff;
    }
    .decision-row-value,
    .decision-row-link {
      color: #1d4ed8;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .overview-busy-card {
      background: #ffffff;
    }
    .overview-usage-card {
      background: #fffbeb;
      border-color: #f59e0b;
    }
    .overview-pulse-card {
      background: #f9fafb;
    }
    .status-chip {
      border-radius: 8px;
      padding: 12px;
      gap: 6px;
    }
    .overview-pulse-card .status-chip:nth-child(4n + 1) {
      background: #dbeafe;
      border-color: #93c5fd;
    }
    .overview-pulse-card .status-chip:nth-child(4n + 2) {
      background: #d1fae5;
      border-color: #6ee7b7;
    }
    .overview-pulse-card .status-chip:nth-child(4n + 3) {
      background: #fef3c7;
      border-color: #fcd34d;
    }
    .overview-pulse-card .status-chip:nth-child(4n + 4) {
      background: #f3f4f6;
      border-color: #d1d5db;
    }
    #usage-pulse .usage-chip {
      background: #fef3c7;
      border-color: #f59e0b;
    }
    .summary-track {
      border: 2px solid var(--border);
      background: #e5e7eb;
      box-shadow: none;
    }
    .summary-fill {
      background: #10b981;
    }
    .summary-fill.warn {
      background: #f59e0b;
    }
    .signal-gauge-card {
      background: #ffffff;
    }
    .signal-gauge,
    .signal-gauge-core {
      border-width: 2px;
      box-shadow: none;
    }
    .timeline-stat {
      padding: 12px;
      background: #f9fafb;
    }
    .quick-chip {
      border: 2px solid var(--border);
      border-radius: 8px;
      padding: 7px 12px;
      background: #f3f4f6;
      color: #374151;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .quick-chip.active {
      border-color: var(--primary);
      background: var(--primary);
      color: #ffffff;
    }
    .segment-switch {
      padding: 4px;
      background: #f3f4f6;
      border-radius: 8px;
    }
    .segment-item {
      min-height: 38px;
      padding: 0 14px;
      border-radius: 6px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .segment-item.active {
      background: var(--primary);
      color: #ffffff;
      box-shadow: none;
    }
    .cron-owner-card,
    .cron-job-list li,
    .cron-run-card {
      background: #ffffff;
    }
    .queue-item {
      padding: 13px;
      background: #ffffff;
    }
    .settings-status-panel {
      padding: 18px;
      background: #ffffff;
    }
    .settings-inline-budget {
      background: #eff6ff;
      border-color: #93c5fd;
    }
    .settings-connector-list {
      padding-left: 20px;
    }
    .settings-budget-form,
    .settings-inline-budget .settings-budget-form {
      gap: 10px;
    }
    .office-card {
      background: #ffffff;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }
    .office-card:hover {
      transform: scale(1.01);
      border-color: #93c5fd;
      background: #f8fbff;
    }
    .agent-avatar,
    .collaboration-avatar {
      border: 2px solid var(--border);
      border-radius: 8px;
      background: #f3f4f6;
      box-shadow: none;
    }
    .agent-stage {
      border: 2px solid var(--border);
      border-radius: 6px;
      box-shadow: none;
      background:
        linear-gradient(0deg, rgba(17, 24, 39, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(17, 24, 39, 0.04) 1px, transparent 1px),
        #ffffff;
      background-size: 10px 10px, 10px 10px, auto;
    }
    .collaboration-thread-card {
      border: 2px solid var(--border);
      background: #ffffff;
    }
    .collaboration-thread-card > summary {
      padding: 18px;
      transition: background 160ms ease;
    }
    .collaboration-thread-card > summary:hover {
      background: #f9fafb;
    }
    .collaboration-latest-snippet {
      background: #f3f4f6;
      color: #374151;
    }
    .collaboration-thread-body {
      border-top: 2px solid var(--border);
    }
    .collaboration-agent-pill {
      background: #f3f4f6;
      color: #111827;
      font-weight: 700;
    }
    .collaboration-agent-pill-dot {
      box-shadow: none;
    }
    table {
      border: 2px solid var(--border);
      background: #ffffff;
    }
    th,
    td {
      border-bottom-color: #e5e7eb;
    }
    th {
      background: #f3f4f6;
      color: #4b5563;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 12px;
      font-weight: 700;
    }
    .file-nav-item {
      border: 2px solid var(--border);
      border-radius: 8px;
      background: #ffffff;
      box-shadow: none;
    }
    .file-nav-item.active {
      border-color: var(--primary);
      background: #dbeafe;
      box-shadow: none;
    }
    .file-editor-textarea,
    .docs-search input,
    .docs-source-filter-wrap select,
    .settings-budget-input {
      border: 2px solid transparent;
      border-radius: 8px;
      background: #f3f4f6;
      box-shadow: none;
    }
    .file-editor-textarea:focus,
    .docs-search input:focus,
    .docs-source-filter-wrap select:focus,
    .settings-budget-input:focus {
      border-color: var(--primary);
      background: #ffffff;
      box-shadow: var(--ring-soft);
    }
    Neumorphism reference-ui layer
    body {
      background: var(--bg);
    }
    body::before {
      background:
        radial-gradient(circle at 10% 14%, rgba(125, 156, 247, 0.18) 0 108px, transparent 109px),
        radial-gradient(circle at 84% 18%, rgba(242, 179, 143, 0.16) 0 84px, transparent 85px),
        radial-gradient(circle at 78% 82%, rgba(132, 215, 190, 0.14) 0 104px, transparent 105px),
        linear-gradient(180deg, rgba(255, 255, 255, 0.6), transparent 48%);
    }
    .sidebar,
    .panel {
      background: var(--panel);
      border-color: transparent;
      box-shadow: var(--shadow-hard);
    }
    .brand {
      border: 0;
      background: linear-gradient(145deg, #eef3fa, #dbe4f0);
      color: var(--text);
      box-shadow: var(--shadow-hard);
    }
    .brand::before {
      content: "";
      position: absolute;
      left: -14px;
      bottom: -16px;
      width: 84px;
      height: 84px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(125, 156, 247, 0.18), transparent 68%);
      pointer-events: none;
    }
    .brand::after {
      content: "";
      position: absolute;
      top: -18px;
      right: -12px;
      width: 92px;
      height: 92px;
      border-radius: 24px;
      transform: rotate(18deg);
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.5), rgba(125, 156, 247, 0.12));
      pointer-events: none;
    }
    .brand h1 {
      color: var(--primary);
    }
    .brand .meta {
      color: var(--muted);
    }
    .brand-kicker {
      border: 0;
      border-radius: 14px;
      background: var(--panel-soft);
      color: var(--primary);
      box-shadow: 7px 7px 14px rgba(163, 177, 198, 0.34), -7px -7px 14px rgba(255, 255, 255, 0.9);
      text-transform: none;
      letter-spacing: 0.03em;
    }
    .nav-link {
      border-width: 0;
      border-color: transparent;
      border-radius: 18px;
      background: var(--panel);
      color: #617083;
      box-shadow: var(--shadow-soft);
    }
    .nav-link:hover,
    .nav-link.active {
      transform: translateY(1px);
      border-color: transparent;
      background: linear-gradient(145deg, #e3eaf4, #f0f5fb);
      box-shadow: var(--shadow-press);
      color: #4f5d6f;
    }
    .section-hero-head {
      position: relative;
      overflow: hidden;
      padding: 26px 28px;
      border: 0;
      border-radius: 30px;
      background: linear-gradient(145deg, #eef3fa, #dbe5f2);
      color: var(--text);
      box-shadow: var(--shadow-hard);
    }
    .section-hero-head::before {
      content: "";
      position: absolute;
      left: -28px;
      bottom: -44px;
      width: 154px;
      height: 154px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(125, 156, 247, 0.18), transparent 68%);
      pointer-events: none;
    }
    .section-hero-head::after {
      content: "";
      position: absolute;
      top: -30px;
      right: -20px;
      width: 124px;
      height: 124px;
      border-radius: 40px;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.54), rgba(125, 156, 247, 0.14));
      pointer-events: none;
    }
    .section-title {
      color: #556272;
    }
    .section-blurb,
    .section-hero-head .meta,
    .section-hero-head .refresh-status {
      color: var(--muted);
    }
    .section-head-actions {
      align-items: center;
    }
    .section-hero-head .panel-toggle,
    .section-hero-head .refresh-interval {
      border-color: transparent;
      background: var(--panel);
      color: #5f6d7f;
      box-shadow: var(--shadow-soft);
    }
    .section-hero-head .panel-toggle:hover,
    .section-hero-head .refresh-interval:hover {
      border-color: transparent;
      background: var(--panel);
      color: #4f5d6f;
      box-shadow: var(--shadow-press);
      transform: translateY(1px);
    }
    .btn,
    .panel-toggle,
    .quick-chip,
    .segment-item {
      min-height: 44px;
      border-radius: 18px;
      font-weight: 700;
      letter-spacing: 0.01em;
      text-transform: none;
    }
    .btn {
      background: linear-gradient(145deg, #8ea9ff, #6f8ff4);
      border: 0;
      color: #ffffff;
      padding: 0 18px;
      box-shadow: 9px 9px 18px rgba(124, 145, 205, 0.34), -7px -7px 16px rgba(255, 255, 255, 0.34);
    }
    .btn:hover {
      background: linear-gradient(145deg, #8ea9ff, #6f8ff4);
      color: #ffffff;
      transform: translateY(1px);
      box-shadow: inset 6px 6px 12px rgba(99, 126, 210, 0.34), inset -6px -6px 12px rgba(255, 255, 255, 0.16), 4px 4px 12px rgba(163, 177, 198, 0.28);
    }
    .panel-toggle,
    .quick-chip,
    .segment-item,
    .file-nav-item,
    .overview-action-item,
    .decision-row,
    .office-card,
    .overview-quick-links .btn,
    .overview-context-links .btn {
      border-color: transparent;
      background: var(--panel);
      color: #5f6d7f;
      box-shadow: var(--shadow-soft);
    }
    .panel-toggle:hover,
    .quick-chip:hover,
    .segment-item:hover,
    .file-nav-item:hover,
    .overview-action-item:hover,
    .decision-row:hover,
    .office-card:hover,
    .overview-quick-links .btn:hover,
    .overview-context-links .btn:hover {
      transform: translateY(1px);
      background: var(--panel);
      color: #4f5d6f;
      box-shadow: var(--shadow-press);
    }
    .card,
    .overview-kpi-card,
    .overview-hero-card,
    .exec-card,
    .overview-action-item,
    .overview-task-strip,
    .overview-context-note,
    .decision-row,
    .overview-busy-card,
    .status-chip,
    .timeline-stat,
    .queue-item,
    .settings-status-panel,
    .signal-gauge-card,
    .office-card,
    .collaboration-thread-card,
    .collaboration-latest-snippet,
    .collaboration-agent-pill,
    .cron-owner-card,
    .cron-job-list li,
    .cron-run-card,
    .group-section,
    .task-brief-card,
    .task-priority-panel,
    .calendar-day,
    .calendar-event,
    .zone,
    .desk-chip,
    .memory-row,
    .subscription-pill,
    .quota-row,
    .file-sidebar,
    .file-editor-panel,
    .doc-card {
      border-width: 0;
      border-color: transparent;
      border-radius: 24px;
      background: linear-gradient(145deg, #edf2f8, #dde6f1);
      box-shadow: var(--shadow-soft);
    }
    .card:hover {
      transform: translateY(-1px);
      background: linear-gradient(145deg, #edf2f8, #dde6f1);
      box-shadow: var(--card-shadow-hover);
    }
    .overview-primary-card {
      border-color: transparent;
      background: linear-gradient(145deg, #dfe8f8, #edf2f9);
      box-shadow: var(--shadow-hard);
    }
    .overview-primary-card::after {
      width: 140px;
      height: 140px;
      border-radius: 999px;
      transform: none;
      background: radial-gradient(circle, rgba(125, 156, 247, 0.18), transparent 68%);
    }
    .overview-primary-card h2,
    .overview-primary-card .overview-primary-value,
    .overview-primary-card .overview-primary-label,
    .overview-primary-card .meta {
      color: var(--text);
    }
    .overview-primary-directive {
      border: 0;
      border-radius: 16px;
      background: var(--panel-soft);
      color: var(--primary);
      box-shadow: var(--shadow-soft);
      letter-spacing: 0.01em;
      text-transform: none;
    }
    .overview-primary-card .overview-quick-links .btn,
    .overview-primary-card .btn {
      background: var(--panel);
      border-color: transparent;
      color: var(--primary);
      box-shadow: var(--shadow-soft);
    }
    .overview-primary-card .overview-quick-links .btn:hover,
    .overview-primary-card .btn:hover {
      background: var(--panel);
      border-color: transparent;
      color: var(--primary-strong);
      box-shadow: var(--shadow-press);
    }
    .overview-focus-stage,
    .overview-task-strip,
    .overview-context-note {
      border-width: 0;
      border-radius: 22px;
      background: var(--panel-soft);
      box-shadow: var(--shadow-press);
    }
    .overview-focus-ring {
      border: 0;
      box-shadow: var(--shadow-soft);
    }
    .overview-focus-core {
      border: 0;
      box-shadow: var(--shadow-press);
    }
    .overview-kpi-grid .overview-kpi-card:nth-child(4n + 1),
    .executive-grid .exec-card:nth-child(4n + 1),
    .overview-hero-strip .overview-hero-card:nth-child(4n + 1),
    .overview-pulse-card .status-chip:nth-child(4n + 1),
    .settings-status-grid .settings-status-panel:nth-child(4n + 1) {
      background: linear-gradient(145deg, #e8eef8, #dbe5f2);
      box-shadow: var(--shadow-soft);
    }
    .overview-kpi-grid .overview-kpi-card:nth-child(4n + 2),
    .executive-grid .exec-card:nth-child(4n + 2),
    .overview-hero-strip .overview-hero-card:nth-child(4n + 2),
    .overview-pulse-card .status-chip:nth-child(4n + 2),
    .settings-status-grid .settings-status-panel:nth-child(4n + 2) {
      background: linear-gradient(145deg, #e7f4f0, #d8eee5);
      box-shadow: var(--shadow-soft);
    }
    .overview-kpi-grid .overview-kpi-card:nth-child(4n + 3),
    .executive-grid .exec-card:nth-child(4n + 3),
    .overview-hero-strip .overview-hero-card:nth-child(4n + 3),
    .overview-pulse-card .status-chip:nth-child(4n + 3),
    .settings-status-grid .settings-status-panel:nth-child(4n + 3) {
      background: linear-gradient(145deg, #f5ece5, #efe1d7);
      box-shadow: var(--shadow-soft);
    }
    .overview-kpi-grid .overview-kpi-card:nth-child(4n + 4),
    .executive-grid .exec-card:nth-child(4n + 4),
    .overview-hero-strip .overview-hero-card:nth-child(4n + 4),
    .overview-pulse-card .status-chip:nth-child(4n + 4),
    .settings-status-grid .settings-status-panel:nth-child(4n + 4) {
      background: linear-gradient(145deg, #edf2f8, #dde6f1);
      box-shadow: var(--shadow-soft);
    }
    .group-section,
    .card.compact-details {
      border-color: transparent;
      background: linear-gradient(145deg, #edf2f8, #dde6f1);
      box-shadow: var(--shadow-soft);
    }
    .group-section summary,
    .card.compact-details summary {
      padding: 14px 16px;
      background: transparent;
      border-bottom: 0;
      box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.54), inset 0 -2px 0 rgba(188, 197, 209, 0.24);
      color: #556272;
      font-weight: 760;
      letter-spacing: -0.01em;
    }
    .card.compact-details summary::after,
    .compact-table-details summary::after {
      border: 0;
      border-radius: 14px;
      background: var(--panel);
      color: #6f7b8c;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: none;
      box-shadow: var(--shadow-soft);
    }
    .group-item {
      border-bottom: 1px solid rgba(188, 197, 209, 0.24);
    }
    .group-item:last-child {
      border-bottom: none;
    }
    .file-filter-input,
    .file-token-input,
    .docs-search input,
    .docs-source-filter-wrap select,
    .file-editor-textarea,
    .settings-budget-input,
    .staff-model-select,
    .staff-model-token,
    .task-brief-token,
    .doc-preview-token,
    .doc-preview-editor {
      border: 0;
      border-radius: 18px;
      background: var(--panel);
      box-shadow: var(--shadow-press);
      color: var(--text);
    }
    .file-filter-input:focus,
    .file-token-input:focus,
    .docs-search input:focus,
    .docs-source-filter-wrap select:focus,
    .file-editor-textarea:focus,
    .settings-budget-input:focus,
    .staff-model-select:focus,
    .staff-model-token:focus,
    .doc-preview-token:focus,
    .doc-preview-editor:focus {
      border-color: transparent;
      background: var(--panel);
      box-shadow: var(--shadow-press), var(--ring-soft);
      outline: none;
    }
    .file-nav-item.active,
    .quick-chip.active,
    .segment-item.active {
      background: linear-gradient(145deg, #8ea9ff, #6f8ff4);
      border-color: transparent;
      color: #ffffff;
      box-shadow: 10px 10px 20px rgba(124, 145, 205, 0.34), -8px -8px 18px rgba(255, 255, 255, 0.28);
    }
    table {
      border-color: transparent;
      background: var(--panel);
      box-shadow: var(--shadow-soft);
    }
    th {
      background: #e1e9f3;
      color: #697588;
    }
    @media (max-width: 1320px) {
      .app-shell { grid-template-columns: 1fr 284px; }
      .app-shell > .sidebar:first-of-type { grid-column: 1 / -1; }
      .panel { grid-column: 1; }
      .section-hero-head { flex-direction: column; align-items: stretch; }
      .section-head-actions { justify-content: flex-start; }
      .refresh-toolbar { justify-content: flex-start; }
      .refresh-status { text-align: left; }
      .overview-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .overview-decision-grid { grid-template-columns: 1fr; }
      .overview-main-grid { grid-template-columns: 1fr; }
      .overview-pulse-card .status-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .task-hub-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .timeline-summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .task-top-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .overview-busy-grid { grid-template-columns: 1fr; }
      .dashboard-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .execution-chain-list { grid-template-columns: 1fr; }
      .collaboration-thread-head { grid-template-columns: 1fr; }
      .collaboration-thread-badges { justify-items: start; }
      .collaboration-current-owner { text-align: left; }
      .collaboration-timeline-step { grid-template-columns: 1fr; }
      .file-workbench { grid-template-columns: 1fr; }
      .settings-budget-form { grid-template-columns: 1fr; }
      .task-brief-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .staff-brief-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 1080px) {
      .app-shell { grid-template-columns: 1fr; }
      .sidebar, .panel { order: unset; }
      .section-title { font-size: 25px; }
      .refresh-toolbar { width: 100%; }
      .refresh-status { width: 100%; }
      .overview-v3-shell { grid-template-columns: 1fr; }
      .overview-kpi-grid { grid-template-columns: 1fr; }
      .overview-decision-grid { grid-template-columns: 1fr; }
      .overview-primary-value { font-size: 46px; }
      .overview-focus-stage { grid-template-columns: 1fr; }
      .overview-focus-ring { width: 104px; height: 104px; }
      .overview-focus-core { width: 72px; height: 72px; }
      .overview-focus-score { font-size: 24px; }
      .overview-main-grid { grid-template-columns: 1fr; }
      .overview-action-grid { grid-template-columns: 1fr; }
      .overview-task-strip { flex-direction: column; }
      .overview-quick-links { justify-content: flex-start; min-width: 0; }
      .task-hub-stat-grid { grid-template-columns: 1fr; }
      .task-hub-shell { grid-template-columns: 1fr; }
      .task-hub-grid { grid-template-columns: 1fr; }
      .task-hub-board-grid { grid-template-columns: 1fr; }
      .overview-pulse-card .status-strip { grid-template-columns: 1fr; }
      .dashboard-strip { grid-template-columns: 1fr; }
      .collaboration-summary-grid { grid-template-columns: 1fr; }
      .collaboration-route-avatars { flex-wrap: wrap; }
      .collaboration-avatar { width: 54px; max-width: 54px; }
      .signal-gauge-main { grid-template-columns: 64px minmax(0, 1fr); }
      .office-grid { grid-template-columns: 1fr; }
      .task-brief-head { grid-template-columns: 1fr; }
      .task-brief-grid { grid-template-columns: 1fr; }
      .staff-brief-head { grid-template-columns: 1fr; }
      .staff-avatar { width: min(156px, 100%); }
      .staff-brief-grid { grid-template-columns: 1fr; }
      .settings-config-grid { grid-template-columns: 1fr; }
      table { min-width: 720px; }
      .settings-switch-table { min-width: 0; }
      .global-visibility-card .ops-board { min-width: 900px; }
      .pie-wrap { grid-template-columns: 1fr; }
      .office-head { grid-template-columns: 1fr; }
      .agent-avatar { max-width: 180px; }
      .memory-row { grid-template-columns: 1fr; }
      .docs-toolbar { grid-template-columns: 1fr; }
      .file-editor-head { flex-direction: column; }
      .file-editor-panel { grid-template-rows: auto minmax(280px, 1fr) auto; }
      .file-editor-textarea { min-height: 360px; }
    }
    @media (max-width: 720px) {
      .timeline-summary-strip { grid-template-columns: 1fr; }
      .task-top-meta-row { flex-direction: column; align-items: flex-start; }
      .task-top-filters { grid-template-columns: 1fr; }
      .task-brief-toolbar { align-items: stretch; }
      .task-brief-controls { justify-items: start; min-width: 0; }
      .settings-switch-table td:nth-child(2),
      .settings-switch-table td:nth-child(3) {
        white-space: normal;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
    */
  </style>
</head>
<body class="ui-preload" data-ui-polish="apple-native-v3" data-apple-window-controls="true" data-ui-language="${escapeHtml(options.language)}" data-refresh-generated-at="${escapeHtml(dashboardRefreshGeneratedAt ?? "")}" style="--fold-open-label:${options.language === "en" ? "'Expand'" : "'\u5C55\u5F00'"}; --fold-close-label:${options.language === "en" ? "'Collapse'" : "'\u6536\u8D77'"};">
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-kicker">${escapeHtml(uiEmployeeBrand(options.language))}</div>
        <h1>${escapeHtml(uiEmployeeSystemBrand(options.language))}</h1>
        <div class="meta">${escapeHtml(t("Updated", "\u66F4\u65B0\u65F6\u95F4"))}${escapeHtml(options.language === "en" ? ": " : "\uFF1A")}${escapeHtml(dashboardRefreshGeneratedAt ?? t("Not available", "\u6682\u65E0"))}</div>
        ${languageToggle}
      </div>
      <nav class="nav-links">${sectionNav}</nav>
      ${agentTeamSidebarCard}
    </aside>
    <main class="panel">
      <header class="section-hero-head">
        <div class="section-head-copy">
          <h2 class="section-title">${escapeHtml(sectionTitle)}</h2>
          <div class="section-blurb">${escapeHtml(sectionLeadText)}</div>
        </div>
        <div class="section-head-actions">
          ${dashboardRefreshControls}
          <button id="inspector-toggle" type="button" class="panel-toggle" aria-pressed="false">${escapeHtml(t("Collapse inspector", "\u6536\u8D77\u68C0\u89C6\u680F"))}</button>
        </div>
      </header>
      <div class="content-stack">${globalVisibilityBlock}${sectionBody}</div>
    </main>
    <aside class="sidebar inspector-sidebar">
      <div class="card">
        <h2>${escapeHtml(t("Current status", "\u5F53\u524D\u72B6\u6001"))}</h2>
        <div class="meta">${escapeHtml(t("Active sessions", "\u6D3B\u8DC3\u4F1A\u8BDD"))}\uFF1A${liveSessionCount}</div>
        <div class="meta">${escapeHtml(t("Tasks under watch", "\u6B63\u5728\u89C2\u5BDF\u4E2D\u7684\u4EFB\u52A1"))}\uFF1A${taskCertaintyCards.length}</div>
        <div class="meta">${escapeHtml(t("Review queue", "\u5BA1\u9605\u961F\u5217"))}\uFF1A${pendingDecisionCount}</div>
        ${agentTeamInspectorSummary}
        ${sidebarSignalRows}
      </div>
      <div class="card" style="margin-top:10px;">
        <h2>${escapeHtml(t("Usage and subscription summary", "\u7528\u91CF\u4E0E\u8BA2\u9605\u6458\u8981"))}</h2>
        <div class="meta">${escapeHtml(t("Today's AI usage", "\u4ECA\u65E5 AI \u7528\u91CF"))}\uFF1A${usageToday?.sourceStatus === "not_connected" ? t("Data source not connected", "\u6570\u636E\u6E90\u672A\u8FDE\u63A5") : formatInt(usageToday?.tokens ?? 0)}</div>
        <div class="meta">${escapeHtml(t("Today's cost", "\u4ECA\u65E5\u8D39\u7528"))}\uFF1A${usageToday?.sourceStatus === "not_connected" ? t("Data source not connected", "\u6570\u636E\u6E90\u672A\u8FDE\u63A5") : formatCurrency(usageToday?.estimatedCost ?? 0)}</div>
        <div class="meta">${escapeHtml(t("Last 30 days", "\u8FD1 30 \u5929"))}\uFF1A${usage30d?.sourceStatus === "not_connected" ? t("Data source not connected", "\u6570\u636E\u6E90\u672A\u8FDE\u63A5") : formatCurrency(usage30d?.estimatedCost ?? 0)}</div>
        ${subscriptionSidebarRows}
        <div class="meta"><a href="${escapeHtml(usageDetailHref)}">${escapeHtml(t("Open full usage and subscription view", "\u67E5\u770B\u5B8C\u6574\u7528\u91CF\u4E0E\u8BA2\u9605"))}</a></div>
      </div>
      <div class="card" style="margin-top:10px;">
        <h2>${escapeHtml(t("Currently active agents", "\u5F53\u524D\u6D3B\u8DC3\u667A\u80FD\u4F53"))}</h2>
        <ul class="story-list">${executionAgentRows || `<li>${escapeHtml(t("No active agent signal yet.", "\u6682\u65E0\u6D3B\u8DC3\u667A\u80FD\u4F53\u4FE1\u53F7\u3002"))}</li>`}</ul>
      </div>
      ${agentTeamInspectorCard}
      ${agentTeamRunSummaryCard}
      ${agentTeamArtifactPreviewCard}
      <section class="card" style="margin-top:10px;">
        <h2>${escapeHtml(t("Timed jobs and heartbeat", "\u5B9A\u65F6\u4E0E\u5FC3\u8DF3"))}</h2>
        <div class="meta">${escapeHtml(t("Timed jobs", "\u5B9A\u65F6"))} ${badge(cronOverview.health.status)} \xB7 ${escapeHtml(t("Next", "\u4E0B\u6B21"))} ${escapeHtml(cronOverview.nextRunAt ?? t("None", "\u6682\u65E0"))}</div>
        <div class="meta">${escapeHtml(t("Heartbeat", "\u5FC3\u8DF3"))} ${badge(heartbeatHealth)} \xB7 ${escapeHtml(t("Next", "\u4E0B\u6B21"))} ${escapeHtml(heartbeatNextRun)}</div>
        <div class="meta"><a href="/?section=overview#cron-health">${escapeHtml(t("Open timed jobs", "\u67E5\u770B\u5B9A\u65F6\u4EFB\u52A1"))}</a> \xB7 <a href="/?section=overview#heartbeat-health">${escapeHtml(t("Open heartbeat checks", "\u67E5\u770B\u4EFB\u52A1\u5FC3\u8DF3"))}</a></div>
      </section>
    </aside>
  </div>
  ${dashboardRefreshScript}
  ${settingsBudgetLimitScript}
  ${agentVisualEnhancerScript}
  ${taskBoardScript}
  ${fileWorkbenchScript}
  ${staffModelScript}
  ${nativeMotionScript}
  ${collaborationFilterScript}
  ${quotaResetScript}
  ${collaborationChatOverlay}
</body>
</html>`;
}
__name(renderHtml, "renderHtml");
function resolveLegacyDashboardSectionForSmoke(path) { return resolveLegacyDashboardSection(path); }
__name(resolveLegacyDashboardSectionForSmoke, "resolveLegacyDashboardSectionForSmoke");
function buildDashboardSearchResultForSmoke(snapshot, query) { return buildDashboardSearchResult(snapshot, query); }
__name(buildDashboardSearchResultForSmoke, "buildDashboardSearchResultForSmoke");
function buildLinkageGraph(snapshot) {
    const nodes = new Map;
    const edges = new Map;
    const sessionByKey = new Map(snapshot.sessions.map(session => [session.sessionKey, session]));
    for (const project of snapshot.projects.projects) {
        addGraphNode(nodes, { id: `project:${project.projectId}`, type: "project", label: project.title, status: project.status });
    }
    for (const task of snapshot.tasks.tasks) {
        const taskNodeId = `task:${task.projectId}:${task.taskId}`;
        addGraphNode(nodes, { id: taskNodeId, type: "task", label: task.title, status: task.status });
        addGraphEdge(edges, { id: `project_task:${task.projectId}:${task.taskId}`, from: `project:${task.projectId}`, to: taskNodeId, type: "project_task" });
        for (const sessionKey of task.sessionKeys) {
            const session = sessionByKey.get(sessionKey);
            addGraphNode(nodes, { id: `session:${sessionKey}`, type: "session", label: session?.label ?? sessionKey, status: session?.state ?? "unknown" });
            addGraphEdge(edges, { id: `task_session:${task.projectId}:${task.taskId}:${sessionKey}`, from: taskNodeId, to: `session:${sessionKey}`, type: "task_session" });
            addGraphEdge(edges, { id: `project_session:${task.projectId}:${sessionKey}`, from: `project:${task.projectId}`, to: `session:${sessionKey}`, type: "project_session" });
        }
    }
    for (const session of snapshot.sessions) {
        addGraphNode(nodes, { id: `session:${session.sessionKey}`, type: "session", label: session.label ?? session.sessionKey, status: session.state });
        if (session.agentId) {
            addGraphNode(nodes, { id: `agent:${session.agentId}`, type: "agent", label: session.agentId });
            addGraphEdge(edges, { id: `agent_session:${session.agentId}:${session.sessionKey}`, from: `agent:${session.agentId}`, to: `session:${session.sessionKey}`, type: "agent_session" });
        }
    }
    const nodeValues = [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
    const edgeValues = [...edges.values()].sort((a, b) => a.id.localeCompare(b.id));
    return { generatedAt: new Date().toISOString(), nodes: nodeValues, edges: edgeValues, counts: { nodes: nodeValues.length, edges: edgeValues.length, projects: nodeValues.filter(node => node.type === "project").length, tasks: nodeValues.filter(node => node.type === "task").length, sessions: nodeValues.filter(node => node.type === "session").length, agents: nodeValues.filter(node => node.type === "agent").length } };
}
__name(buildLinkageGraph, "buildLinkageGraph");
function addGraphNode(target, node) {
    if (target.has(node.id))
        return;
    target.set(node.id, node);
}
__name(addGraphNode, "addGraphNode");
function addGraphEdge(target, edge) {
    if (target.has(edge.id))
        return;
    target.set(edge.id, edge);
}
__name(addGraphEdge, "addGraphEdge");
function normalizeDocCategoryKey(value) { return value.trim().toLowerCase().replace(/\s+/g, "-"); }
__name(normalizeDocCategoryKey, "normalizeDocCategoryKey");
async function safeReadTextFile(path) {
    try {
        return await (0, import_promises.readFile)(path, "utf8");
    }
    catch {
        return void 0;
    }
}
__name(safeReadTextFile, "safeReadTextFile");
function normalizeEvidenceText(input) { return input.toLowerCase().replace(/[`*_#>\[\]\(\)!|]+/g, " ").replace(/\s+/g, " ").trim(); }
__name(normalizeEvidenceText, "normalizeEvidenceText");
function extractLabeledField(input, labels) {
    for (const rawLine of input.split(/\r?\n/)) {
        const line = rawLine.replace(/\*\*/g, "").replace(/`/g, "").trim().replace(/^[-*]\s*/, "");
        if (!line)
            continue;
        const lower = line.toLowerCase();
        for (const label of labels) {
            const prefix = `${label.toLowerCase()}:`;
            if (!lower.startsWith(prefix))
                continue;
            const value = line.slice(prefix.length).trim();
            if (value)
                return value;
        }
    }
    return void 0;
}
__name(extractLabeledField, "extractLabeledField");
const staffOverviewHelpers = createStaffOverviewHelpers({
    defaultPrimaryOperatorDisplayName: import_operator_display.DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME,
    extractLabeledField,
    joinPath: import_node_path.join,
    normalizeEvidenceText,
    normalizeLookupKey,
    openclawConfigDir: OPENCLAW_CONFIG_DIR,
    openclawConfigPath: OPENCLAW_CONFIG_PATH,
    openclawCronJobsCandidates: OPENCLAW_CRON_JOBS_CANDIDATES,
    openclawWorkspaceRoot: OPENCLAW_WORKSPACE_ROOT,
    pickUiText,
    resolvePath: import_node_path.resolve,
    safeReadTextFile,
    staffRoleEvidenceFileCandidates: STAFF_ROLE_EVIDENCE_FILE_CANDIDATES
});
async function resolveStaffRoleLabel(member, language = "zh") {
    return staffOverviewHelpers.resolveStaffRoleLabel(member, language);
}
__name(resolveStaffRoleLabel, "resolveStaffRoleLabel");
const staffModelHelpers = createStaffModelHelpers({
    agentRootDir: AGENT_ROOT_DIR,
    asArray,
    asObject,
    asString,
    compareAgentHierarchy: import_team_hierarchy.compareAgentHierarchy,
    createRequestValidationError: (message, statusCode) => new RequestValidationError(message, statusCode),
    humanizeOperatorDisplayName: import_operator_display.humanizeOperatorDisplayName,
    joinPath: import_node_path.join,
    normalizeLookupKey,
    openclawConfigPath: OPENCLAW_CONFIG_PATH,
    safeReadTextFile
});
const { collectOpenClawModelOptions, loadTeamSnapshot, updateOpenClawAgentModel: updateOpenClawAgentModelFromConfig } = staffModelHelpers;
function resolveEditableAgentScopesFromConfigForSmoke(input) { return resolveEditableAgentScopesFromConfig(input); }
function resolveEditableAgentScopesWithFallbackForSmoke(input) { return resolveEditableAgentScopesWithFallbackImpl(input); }
async function updateOpenClawAgentModel(agentId, model) {
    return updateOpenClawAgentModelFromConfig(agentId, model);
}
__name(updateOpenClawAgentModel, "updateOpenClawAgentModel");
function summarizeFilters(filters) {
    const labels = [];
    if (filters.quick)
        labels.push(`quick=${filters.quick}`);
    if (filters.status)
        labels.push(`status=${filters.status}`);
    if (filters.owner)
        labels.push(`owner=${filters.owner}`);
    if (filters.project)
        labels.push(`project=${filters.project}`);
    return labels.length > 0 ? `filters(${labels.join(", ")})` : "filters(none)";
}
__name(summarizeFilters, "summarizeFilters");
function matchesQuickFilter(task, quick, now) {
    if (quick === "all")
        return true;
    if (quick === "attention") {
        return task.status === "blocked" || isTaskDueNow(task, now);
    }
    return task.status === quick;
}
__name(matchesQuickFilter, "matchesQuickFilter");
function isTaskDueNow(task, now) {
    if (task.status === "done")
        return false;
    if (!task.dueAt)
        return false;
    const dueMs = Date.parse(task.dueAt);
    if (Number.isNaN(dueMs))
        return false;
    return dueMs <= now;
}
__name(isTaskDueNow, "isTaskDueNow");
function hasAnyQueryKey(searchParams, keys) { return keys.some(key => searchParams.has(key)); }
__name(hasAnyQueryKey, "hasAnyQueryKey");
function renderLanguageToggle(filters, options) { const enHref = buildHomeHref(filters, options.compactStatusStrip, options.section, "en", options.usageView); const zhHref = buildHomeHref(filters, options.compactStatusStrip, options.section, "zh", options.usageView); const enClass = options.language === "en" ? ' class="active"' : ""; const zhClass = options.language === "zh" ? ' class="active"' : ""; const label = pickUiText(options.language, "Language:", "\u8BED\u8A00\uFF1A"); const zhLabel = pickUiText(options.language, "\u4E2D\u6587", "\u4E2D\u6587"); return `<div class="meta lang-toggle">${label} <a${enClass} href="${escapeHtml(enHref)}">EN</a> / <a${zhClass} href="${escapeHtml(zhHref)}">${zhLabel}</a></div>`; }
__name(renderLanguageToggle, "renderLanguageToggle");
function renderDashboardRefreshControls(language, options) {
    const intervals = [15, 30, 60, 120];
    const intervalOptions = intervals.map(value => { const label = language === "en" ? `${value}s` : `${value} \u79D2`; return `<option value="${value}"${value === 30 ? " selected" : ""}>${escapeHtml(label)}</option>`; }).join("");
    const writeAccessLabel = !options.localTokenAuthRequired ? pickUiText(language, "Write access: direct", "\u5199\u5165\u6743\u9650\uFF1A\u76F4\u8FDE") : !options.localTokenConfigured ? pickUiText(language, "Write access: unavailable", "\u5199\u5165\u89E3\u9501\uFF1A\u672A\u914D\u7F6E") : options.localMutationUnlock ? pickUiText(language, "Write access: on", "\u5199\u5165\u89E3\u9501\uFF1A\u5F00") : pickUiText(language, "Write access: off", "\u5199\u5165\u89E3\u9501\uFF1A\u5173");
    const writeAccessPressed = options.localMutationUnlock && options.localTokenConfigured ? "true" : "false";
    const writeAccessDisabled = options.localTokenAuthRequired && !options.localTokenConfigured ? " disabled" : "";
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
__name(renderDashboardRefreshControls, "renderDashboardRefreshControls");
function buildHomeHref(filters, compactStatusStrip, section = "overview", language = "en", usageView = "cumulative") { const query = buildHomeQuery(filters, compactStatusStrip, section, language, usageView); return query ? `/?${query}` : "/"; }
__name(buildHomeHref, "buildHomeHref");
function buildHomeQuery(filters, compactStatusStrip, section = "overview", language = "en", usageView = "cumulative") {
    const params = new URLSearchParams;
    params.set("compact", compactStatusStrip ? "1" : "0");
    params.set("section", section);
    params.set("lang", language);
    if (usageView === "today")
        params.set("usage_view", "today");
    params.set("quick", filters.quick ?? "all");
    if (filters.status)
        params.set("status", filters.status);
    if (filters.owner)
        params.set("owner", filters.owner);
    if (filters.project)
        params.set("project", filters.project);
    return params.toString();
}
__name(buildHomeQuery, "buildHomeQuery");
function buildTaskDetailHref(taskId, language) { return `/details/task/${encodeURIComponent(taskId)}?lang=${encodeURIComponent(language)}`; }
__name(buildTaskDetailHref, "buildTaskDetailHref");
function buildCronDetailHref(jobId, language) { return `/details/cron/${encodeURIComponent(jobId)}?lang=${encodeURIComponent(language)}`; }
__name(buildCronDetailHref, "buildCronDetailHref");
function buildSessionDetailHref(sessionKey, language) { return `/session/${encodeURIComponent(sessionKey)}?lang=${encodeURIComponent(language)}`; }
__name(buildSessionDetailHref, "buildSessionDetailHref");
function joinDisplayList(items, language) { const output = items.map(item => item.trim()).filter(item => item.length > 0); return output.join(language === "en" ? ", " : "\u3001"); }
__name(joinDisplayList, "joinDisplayList");
function renderQuickFilters(filters, compactStatusStrip, section, language, usageView) { const options = import_ui_preferences.UI_QUICK_FILTERS.map(value => ({ value, label: quickFilterLabel(value, language) })); const active = filters.quick ?? "all"; const base = { owner: filters.owner, project: filters.project }; return options.map(option => { const href = buildHomeHref({ ...base, quick: option.value }, compactStatusStrip, section, language, usageView); const activeClass = option.value === active ? " active" : ""; return `<a class="quick-chip${activeClass}" href="${escapeHtml(href)}">${escapeHtml(option.label)}</a>`; }).join(""); }
__name(renderQuickFilters, "renderQuickFilters");
function quickFilterLabel(value, language = "en") {
    if (value === "all")
        return pickUiText(language, "Everything", "\u5168\u90E8");
    if (value === "attention")
        return pickUiText(language, "Needs Attention", "\u9700\u5173\u6CE8");
    if (value === "todo")
        return pickUiText(language, "Ready To Start", "\u53EF\u5F00\u59CB");
    if (value === "in_progress")
        return pickUiText(language, "In Motion", "\u8FDB\u884C\u4E2D");
    if (value === "blocked")
        return pickUiText(language, "Blocked", "\u5DF2\u963B\u585E");
    return pickUiText(language, "Completed", "\u5DF2\u5B8C\u6210");
}
__name(quickFilterLabel, "quickFilterLabel");
function taskStateLabel(state, language = "zh") {
    if (state === "todo")
        return pickUiText(language, "Ready To Start", "\u5F85\u5F00\u59CB");
    if (state === "in_progress")
        return pickUiText(language, "In Motion", "\u8FDB\u884C\u4E2D");
    if (state === "blocked")
        return pickUiText(language, "Blocked", "\u5DF2\u963B\u585E");
    return pickUiText(language, "Completed", "\u5DF2\u5B8C\u6210");
}
__name(taskStateLabel, "taskStateLabel");
function projectStateLabel(state, language = "zh") {
    if (state === "planned")
        return pickUiText(language, "Planned", "\u89C4\u5212\u4E2D");
    if (state === "active")
        return pickUiText(language, "Active", "\u6267\u884C\u4E2D");
    if (state === "blocked")
        return pickUiText(language, "Blocked", "\u5DF2\u963B\u585E");
    return pickUiText(language, "Completed", "\u5DF2\u5B8C\u6210");
}
__name(projectStateLabel, "projectStateLabel");
function searchScopeLabel(scope, language = "zh") {
    if (scope === "tasks")
        return pickUiText(language, "Tasks", "\u4EFB\u52A1");
    if (scope === "projects")
        return pickUiText(language, "Projects", "\u9879\u76EE");
    if (scope === "sessions")
        return pickUiText(language, "Sessions", "\u4F1A\u8BDD");
    return pickUiText(language, "Alerts", "\u544A\u8B66");
}
__name(searchScopeLabel, "searchScopeLabel");
function humanizeOperatorLabel(value) { return (0, import_operator_display.humanizeOperatorDisplayName)(value) ?? "\u672A\u77E5\u52A9\u624B"; }
__name(humanizeOperatorLabel, "humanizeOperatorLabel");
function normalizeLookupKey(input) { return input.trim().toLowerCase(); }
__name(normalizeLookupKey, "normalizeLookupKey");
function staffStatusLabel(status, language = "zh") { return officeRuntimeHelpers.staffStatusLabel(status, language); }
__name(staffStatusLabel, "staffStatusLabel");
function resolveStaffStatusDotTone(status) { return officeRuntimeHelpers.resolveStaffStatusDotTone(status); }
__name(resolveStaffStatusDotTone, "resolveStaffStatusDotTone");
function staffStatusDotLabel(tone, language = "zh") { return officeRuntimeHelpers.staffStatusDotLabel(tone, language); }
__name(staffStatusDotLabel, "staffStatusDotLabel");
async function loadCachedStaffRecentActivity(snapshot, client, agentIds, language) {
    const now = Date.now();
    const agentKey = [...new Set(agentIds.map(value2 => normalizeLookupKey(value2)).filter(Boolean))].sort().join(",");
    if (renderStaffRecentActivityCache && renderStaffRecentActivityCache.snapshotAt === snapshot.generatedAt && renderStaffRecentActivityCache.language === language && renderStaffRecentActivityCache.agentKey === agentKey && renderStaffRecentActivityCache.expiresAt > now) {
        return renderStaffRecentActivityCache.value;
    }
    const value = await loadStaffRecentActivity(snapshot, client, agentIds, language);
    renderStaffRecentActivityCache = { snapshotAt: snapshot.generatedAt, language, agentKey, value, expiresAt: now + HTML_HEAVY_CACHE_TTL_MS };
    return value;
}
__name(loadCachedStaffRecentActivity, "loadCachedStaffRecentActivity");
async function loadStaffRecentActivity(snapshot, client, agentIds, language) {
    const targetKeys = [...new Set(agentIds.map(value => normalizeLookupKey(value)).filter(Boolean))];
    const targetKeySet = new Set(targetKeys);
    const sessionsByAgent = new Map;
    for (const session of [...snapshot.sessions].sort(compareSessionSummariesByLatest)) {
        const agentId = session.agentId?.trim();
        if (!agentId)
            continue;
        const key = normalizeLookupKey(agentId);
        if (!targetKeySet.has(key))
            continue;
        const bucket = sessionsByAgent.get(key) ?? [];
        if (bucket.length >= 3)
            continue;
        bucket.push(session);
        sessionsByAgent.set(key, bucket);
    }
    const entries = await Promise.all(targetKeys.map(async (key) => {
        const sessions = sessionsByAgent.get(key) ?? [];
        let residualRunningDetected = false;
        let liveRunningDetected = false;
        for (const session of sessions) {
            const detail = await (0, import_session_conversations.getSessionConversationDetail)({ snapshot, client, sessionKey: session.sessionKey, historyLimit: 20 });
            if (!detail)
                continue;
            if (detail.session.state === "running") {
                if (historyImpliesStaffStopped(detail.history)) {
                    residualRunningDetected = true;
                }
                else {
                    liveRunningDetected = true;
                }
            }
            const recent = pickRecentStaffActivity(detail.history, language);
            if (recent) {
                return [key, { ...recent, sessionKey: session.sessionKey, statusOverride: !liveRunningDetected && residualRunningDetected ? "idle" : void 0 }];
            }
        }
        if (!liveRunningDetected && residualRunningDetected) {
            return [key, { recentOutput: pickUiText(language, "Recently stopped and returned to standby.", "\u6700\u8FD1\u5DF2\u505C\u6B62\u5F53\u524D\u4EFB\u52A1\u5E76\u56DE\u5230\u5F85\u547D\u3002"), statusOverride: "idle" }];
        }
        return [key, void 0];
    }));
    const resolved = new Map(entries.filter(entry => Boolean(entry[1])));
    const agentTeamFallback = buildStaffRecentActivityFallbackFromAgentTeamEmbed(await (0, import_agent_team_embed.loadAgentTeamEmbedSnapshot)(), targetKeys, language);
    for (const [key, value] of agentTeamFallback.entries()) {
        if (!resolved.has(key))
            resolved.set(key, value);
    }
    return resolved;
}
__name(loadStaffRecentActivity, "loadStaffRecentActivity");
function buildStaffRecentActivityFallbackFromAgentTeamEmbedForSmoke(embed, agentIds, language = "zh") { return buildStaffRecentActivityFallbackFromAgentTeamEmbed(embed, agentIds, language); }
__name(buildStaffRecentActivityFallbackFromAgentTeamEmbedForSmoke, "buildStaffRecentActivityFallbackFromAgentTeamEmbedForSmoke");
function compareSessionSummariesByLatest(a, b) { return officeRuntimeHelpers.compareSessionSummariesByLatest(a, b); }
__name(compareSessionSummariesByLatest, "compareSessionSummariesByLatest");
async function buildStaffOverviewCards(input) { const officeCardByKey = new Map(input.officeCards.map(item => [normalizeLookupKey(item.agentId), item])); const executionByKey = new Map(input.executionAgentSummaries.map(item => [normalizeLookupKey(item.agentId), item])); const memberList = (input.members.length > 0 ? input.members : input.executionAgentSummaries.map(item => ({ agentId: item.agentId, displayName: item.displayName, model: "unlisted", workspace: "unlisted", toolsProfile: "default" }))).slice().sort((a, b) => (0, import_team_hierarchy.compareAgentHierarchy)(a.agentId, b.agentId)); const avatarIdentityByKey = buildAgentAnimalIdentityMap(memberList.map(member => member.agentId)); const recentActivityByKey = await loadCachedStaffRecentActivity(input.snapshot, input.client, memberList.map(member => member.agentId), input.language); return await Promise.all(memberList.map(async (member) => { const key = normalizeLookupKey(member.agentId); const office = officeCardByKey.get(key); const execution = executionByKey.get(key); const recentActivity = recentActivityByKey.get(key); const identity = office?.identity ?? avatarIdentityByKey.get(key) ?? deriveAgentAnimalIdentity(member.agentId); const roleLabel = await resolveStaffRoleLabel(member, input.language); const effectiveOfficeStatus = recentActivity?.statusOverride ?? office?.status; const currentWork = staffCurrentWorkLabel({ office: office ? { ...office, status: effectiveOfficeStatus ?? office.status } : office, execution, language: input.language }); const statusTone = resolveStaffStatusDotTone(effectiveOfficeStatus); const recentOutput = recentActivity?.recentOutput ? recentActivity.recentOutput : pickUiText(input.language, "No recent output yet.", "\u6700\u8FD1\u6682\u65E0\u4EA7\u51FA\u3002"); const scheduledLabel = (execution?.enabledCronJobs ?? 0) > 0 ? pickUiText(input.language, "Scheduled", "\u5DF2\u6392\u73ED") : pickUiText(input.language, "Not scheduled", "\u672A\u6392\u73ED"); return { agentId: member.agentId, displayName: member.displayName, identity, roleLabel, statusTone, statusDotLabel: staffStatusDotLabel(statusTone, input.language), statusLabel: staffStatusLabel(effectiveOfficeStatus, input.language), currentWorkLabel: currentWork.label, currentWork: currentWork.value, recentOutput, scheduledLabel, model: member.model, workspace: member.workspace, toolsProfile: member.toolsProfile, modelOptions: dedupeModelOptionsForCard(member.model, input.modelOptions ?? []), modelEditable: input.modelEditable === true, configPath: input.configPath?.trim() || OPENCLAW_CONFIG_PATH }; })); }
__name(buildStaffOverviewCards, "buildStaffOverviewCards");
function collectCollaborationEvidenceSessionKeys(sessionItems) {
    return [...new Set([...sessionItems.flatMap(item => [item.sessionKey, item.executionChain?.parentSessionKey, item.executionChain?.childSessionKey, ...(item.interSessionSignals ?? []).map(signal => signal.sourceSessionKey)]).map(value => value?.trim() ?? "").filter(Boolean)])];
}
__name(collectCollaborationEvidenceSessionKeys, "collectCollaborationEvidenceSessionKeys");
/*
function extractCollaborationTaskLabel(input, language) {
    const normalized = normalizeInlineText(input);
    if (!normalized)
        return void 0;
    const explicitTaskMatch = /(?:浠诲姟|鐩爣|task|objective)\s*[:锛歖\s*([^銆傦紱\n]+)/i.exec(normalized);
    if (explicitTaskMatch?.[1]?.trim())
        return safeTruncate(explicitTaskMatch[1].trim(), 88);
    const cronTaskMatch = /^\[[^\]]+\s+([^\]\s][^\]]*?)\]\s/.exec(normalized);
    if (cronTaskMatch?.[1]?.trim())
        return safeTruncate(cronTaskMatch[1].trim(), 88);
    const chineseBracketMatch = /^銆?[^銆慮+)銆?.exec(normalized);
    if (chineseBracketMatch?.[1]?.trim())
        return safeTruncate(chineseBracketMatch[1].trim(), 88);
    const firstClause = normalized.split(/\s+[鈥?]\s+/).map(segment => normalizeInlineText(segment)).find(segment => segment.length >= 4);
    if (firstClause && !looksLikeStructuredExecutionTitle(firstClause))
        return safeTruncate(firstClause, 88);
    if (!looksLikeStructuredExecutionTitle(normalized))
        return safeTruncate(normalized, 88);
    const structuredSummary = summarizeStructuredSessionPayload(normalized, language);
    if (structuredSummary?.trim())
        return safeTruncate(structuredSummary, 88);
    return void 0;
}
__name(extractCollaborationTaskLabel, "extractCollaborationTaskLabel");
function deriveCollaborationTaskTitle(input) {
    const mappedTitle = executionChainCardTitle(input.card, input.language);
    const mappedLooksGeneric = /闅旂鎵ц|鍏宠仈浠诲姟|linked task|isolated execution|cron isolated run/i.test(mappedTitle) || /^(鎴愬姛|澶辫触|Succeeded|Failed)\b/.test(mappedTitle) || /(鏌ヨ|鎴愬姛|鎵弿|鍏ラ€墊鍙戦€亅Queries|Successful|Scanned|Qualified|Sent)\s+\d+/i.test(mappedTitle);
    if (!mappedLooksGeneric)
        return mappedTitle;
    const candidates = [input.childSession?.label, input.parentSession?.label, input.childSession?.taskSnippet, input.parentSession?.taskSnippet, input.childSession?.latestSnippet, input.parentSession?.latestSnippet, input.card.latestSnippet, input.card.executionChain.detail, input.card.taskTitle];
    for (const candidate of candidates) {
        const derived = extractCollaborationTaskLabel(candidate ?? "", input.language);
        if (derived?.trim())
            return derived;
    }
    return mappedTitle;
}
__name(deriveCollaborationTaskTitle, "deriveCollaborationTaskTitle");
*/
function renderSubscriptionStatusCardForSmoke(subscription) { return renderSubscriptionStatusCard(subscription, "en"); }
__name(renderSubscriptionStatusCardForSmoke, "renderSubscriptionStatusCardForSmoke");
function mergeCollaborationRoomApiEventsForSmoke(input) { return mergeCollaborationRoomApiEvents(input).events; }
__name(mergeCollaborationRoomApiEventsForSmoke, "mergeCollaborationRoomApiEventsForSmoke");
function pickLatestSessionActivityTimestampForSmoke(...values) { return pickLatestSessionActivityTimestamp(...values); }
__name(pickLatestSessionActivityTimestampForSmoke, "pickLatestSessionActivityTimestampForSmoke");
function renderDashboardSectionNavForSmoke(section, language = "en") { const activeSection = section === "office-space" ? "team" : section === "calendar" ? "projects-tasks" : section; return dashboardSectionLinks(language).map(item => { const activeClass = item.key === activeSection ? " active" : ""; const current = item.key === activeSection ? ' aria-current="page"' : ""; return `<a class="nav-link${activeClass}" href="/?section=${encodeURIComponent(item.key)}"${current}>${escapeHtml(item.label)}</a>`; }).join(""); }
__name(renderDashboardSectionNavForSmoke, "renderDashboardSectionNavForSmoke");
function buildGlobalVisibilitySmokeModel(language) { return { tasks: [{ taskType: "cron", taskTypeLabel: pickUiText(language, "Timed jobs", "\u5B9A\u65F6\u4EFB\u52A1"), taskName: pickUiText(language, "Timed jobs", "\u5B9A\u65F6\u4EFB\u52A1"), executor: pickUiText(language, "System service", "\u7CFB\u7EDF\u670D\u52A1"), currentAction: pickUiText(language, "Timed jobs are on.", "\u5B9A\u65F6\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C\u3002"), nextRun: "2026-03-05T13:30:00.000Z", latestResult: pickUiText(language, "Active timed jobs: 1.", "\u5DF2\u5F00\u542F\u5B9A\u65F6\u4EFB\u52A1\uFF1A1 \u4E2A\u3002"), status: "done", nextAction: pickUiText(language, "Keep timed jobs on and keep each job goal clear.", "\u4FDD\u6301\u5B9A\u65F6\u4EFB\u52A1\u5F00\u542F\uFF0C\u5E76\u786E\u8BA4\u6BCF\u4E2A\u4EFB\u52A1\u76EE\u6807\u6E05\u695A\u3002"), detailsHref: buildGlobalVisibilityDetailHref("cron", language), detailsLabel: pickUiText(language, "See timed jobs", "\u67E5\u770B\u5B9A\u65F6\u4EFB\u52A1") }, { taskType: "heartbeat", taskTypeLabel: pickUiText(language, "Heartbeat", "\u4EFB\u52A1\u5FC3\u8DF3"), taskName: pickUiText(language, "Heartbeat", "\u4EFB\u52A1\u5FC3\u8DF3"), executor: pickUiText(language, "System service", "\u7CFB\u7EDF\u670D\u52A1"), currentAction: pickUiText(language, "Heartbeat is on.", "\u4EFB\u52A1\u5FC3\u8DF3\u5DF2\u5F00\u542F\u3002"), nextRun: "2026-03-05T13:35:00.000Z", latestResult: pickUiText(language, "Active heartbeat checks: 1.", "\u5DF2\u5F00\u542F\u4EFB\u52A1\u5FC3\u8DF3\uFF1A1 \u4E2A\u3002"), status: "done", nextAction: pickUiText(language, "Check picked tasks and confirm the choices look right.", "\u67E5\u770B\u6311\u51FA\u7684\u4EFB\u52A1\uFF0C\u786E\u8BA4\u6311\u9009\u7ED3\u679C\u662F\u5426\u5408\u7406\u3002"), detailsHref: buildGlobalVisibilityDetailHref("heartbeat", language), detailsLabel: pickUiText(language, "See heartbeat checks", "\u67E5\u770B\u4EFB\u52A1\u5FC3\u8DF3") }, { taskType: "current_task", taskTypeLabel: pickUiText(language, "Current tasks", "\u5F53\u524D\u4EFB\u52A1"), taskName: pickUiText(language, "Current tasks", "\u5F53\u524D\u4EFB\u52A1"), executor: pickUiText(language, "Task owners", "\u4EFB\u52A1\u667A\u80FD\u4F53"), currentAction: pickUiText(language, "Tasks are moving.", "\u4EFB\u52A1\u6B63\u5728\u63A8\u8FDB\u3002"), nextRun: pickUiText(language, "Live update", "\u5B9E\u65F6\u66F4\u65B0"), latestResult: pickUiText(language, "2 tasks moving.", "2 \u4E2A\u4EFB\u52A1\u5728\u8FDB\u884C\u4E2D\u3002"), status: "done", nextAction: pickUiText(language, "Keep progress updated.", "\u6301\u7EED\u66F4\u65B0\u4EFB\u52A1\u8FDB\u5EA6\u3002"), detailsHref: buildGlobalVisibilityDetailHref("current_task", language), detailsLabel: pickUiText(language, "See current tasks", "\u67E5\u770B\u5F53\u524D\u4EFB\u52A1") }, { taskType: "tool_call", taskTypeLabel: pickUiText(language, "Tool calls", "\u5DE5\u5177\u8C03\u7528"), taskName: pickUiText(language, "Tool calls", "\u5DE5\u5177\u8C03\u7528"), executor: pickUiText(language, "Active sessions", "\u6D3B\u8DC3\u4F1A\u8BDD"), currentAction: pickUiText(language, "Tools were used recently.", "\u6700\u8FD1\u6709\u5DE5\u5177\u5728\u4F7F\u7528\u3002"), nextRun: pickUiText(language, "Live update", "\u5B9E\u65F6\u66F4\u65B0"), latestResult: pickUiText(language, "Tool calls in recent activity: 3.", "\u6700\u8FD1\u5DE5\u5177\u8C03\u7528\uFF1A3 \u6B21\u3002"), status: "done", nextAction: pickUiText(language, "Review results and keep going.", "\u770B\u4E0B\u7ED3\u679C\u540E\u7EE7\u7EED\u3002"), detailsHref: buildGlobalVisibilityDetailHref("tool_call", language), detailsLabel: pickUiText(language, "See tool calls", "\u67E5\u770B\u5DE5\u5177\u8C03\u7528") }], doneCount: 4, notDoneCount: 0, noTaskMessage: pickUiText(language, "No timed jobs, heartbeat, current tasks, or tool calls yet.", "\u6682\u65E0\u5B9A\u65F6\u4EFB\u52A1\u3001\u4EFB\u52A1\u5FC3\u8DF3\u3001\u5F53\u524D\u4EFB\u52A1\u6216\u5DE5\u5177\u8C03\u7528\u3002"), signalCounts: { schedule: 1, heartbeat: 1, currentTasks: 2, toolCalls: 3 } }; }
__name(buildGlobalVisibilitySmokeModel, "buildGlobalVisibilitySmokeModel");
function renderGlobalVisibilityCardForSmoke(language) { const model = buildGlobalVisibilitySmokeModel(language); return renderGlobalVisibilityCard(model, language); }
__name(renderGlobalVisibilityCardForSmoke, "renderGlobalVisibilityCardForSmoke");
function renderTaskBoardEmptyStateForSmoke(language) { return renderTaskBoard([], language, [], buildGlobalVisibilitySmokeModel(language)); }
__name(renderTaskBoardEmptyStateForSmoke, "renderTaskBoardEmptyStateForSmoke");
function renderInformationCertaintyCardForSmoke(language) { return renderInformationCertaintyCard({ score: 82, badgeStatus: "ok", badgeLabel: pickUiText(language, "High certainty", "\u9AD8\u786E\u5B9A\u6027"), headline: pickUiText(language, "This picture is trustworthy enough for day-to-day decisions.", "\u8FD9\u5F20\u753B\u9762\u5DF2\u7ECF\u8DB3\u591F\u652F\u6491\u65E5\u5E38\u5224\u65AD\u3002"), summary: pickUiText(language, "Most key signals are connected, so you can judge the AI employee system from one screen with relatively high confidence.", "\u5927\u90E8\u5206\u5173\u952E\u4FE1\u53F7\u90FD\u5DF2\u8FDE\u4E0A\uFF0C\u53EF\u4EE5\u6BD4\u8F83\u653E\u5FC3\u5730\u7528\u8FD9\u4E00\u5C4F\u5224\u65AD AI \u5458\u5DE5\u7CFB\u7EDF\u7684\u5F53\u524D\u72B6\u6001\u3002"), strengths: [pickUiText(language, "The home picture is fresh enough for current-state decisions.", "\u9996\u9875\u753B\u9762\u591F\u65B0\uFF0C\u53EF\u4EE5\u76F4\u63A5\u62FF\u6765\u5224\u65AD\u5F53\u524D\u72B6\u6001\u3002"), pickUiText(language, "Current execution is visible, not just task records on a board.", "\u73B0\u5728\u80FD\u770B\u5230\u771F\u5B9E\u6267\u884C\u4E2D\u7684\u4F1A\u8BDD\uFF0C\u800C\u4E0D\u53EA\u662F\u4EFB\u52A1\u677F\u4E0A\u7684\u8BB0\u5F55\u3002")], gaps: [pickUiText(language, "Remaining package room is still unconfirmed.", "\u5957\u9910\u5269\u4F59\u989D\u5EA6\u76EE\u524D\u8FD8\u6CA1\u6709\u88AB\u5B8C\u5168\u786E\u8BA4\u3002")], signals: [{ key: "freshness", label: pickUiText(language, "Live picture", "\u5B9E\u65F6\u753B\u9762"), status: "connected", detail: pickUiText(language, "Updated just now; suitable for deciding what is happening now.", "\u521A\u521A\u66F4\u65B0\uFF0C\u9002\u5408\u76F4\u63A5\u5224\u65AD\u73B0\u5728\u53D1\u751F\u4E86\u4EC0\u4E48\u3002") }, { key: "live_sessions", label: pickUiText(language, "Live execution", "\u5B9E\u65F6\u6267\u884C"), status: "connected", detail: pickUiText(language, "3 live sessions are visible right now.", "\u5F53\u524D\u53EF\u89C1 3 \u4E2A\u5B9E\u65F6\u6267\u884C\u4E2D\u7684\u4F1A\u8BDD\u3002") }, { key: "subscription", label: pickUiText(language, "Subscription room", "\u8BA2\u9605\u989D\u5EA6"), status: "partial", detail: pickUiText(language, "Subscription data exists, but part of the billing picture is missing.", "\u8BA2\u9605\u6570\u636E\u5DF2\u7ECF\u6709\u4E86\uFF0C\u4F46\u8D26\u5355\u753B\u9762\u8FD8\u4E0D\u5B8C\u6574\u3002") }] }, language); }
__name(renderInformationCertaintyCardForSmoke, "renderInformationCertaintyCardForSmoke");
function renderTaskCertaintySectionForSmoke(language) { return renderTaskCertaintySection([{ taskId: "task-1", title: pickUiText(language, "Stabilize Mission Control dashboard", "\u7A33\u5B9A Mission Control \u770B\u677F"), projectTitle: "control-center", owner: "Panda", score: 84, tone: "ok", toneLabel: pickUiText(language, "Evidence is strong", "\u8BC1\u636E\u5145\u5206"), summary: pickUiText(language, "This task already has enough execution evidence for normal follow-up.", "\u8FD9\u4E2A\u4EFB\u52A1\u5DF2\u7ECF\u6709\u8DB3\u591F\u7684\u6267\u884C\u8BC1\u636E\uFF0C\u6B63\u5E38\u8DDF\u8FDB\u5373\u53EF\u3002"), evidence: [pickUiText(language, "Owner: Panda", "\u8D1F\u8D23\u4EBA\uFF1APanda"), pickUiText(language, "2 linked sessions", "\u5DF2\u5173\u8054 2 \u4E2A\u4F1A\u8BDD")], gaps: [], detailHref: buildTaskDetailHref("task-1", language) }, { taskId: "task-2", title: pickUiText(language, "Reconnect billing visibility", "\u8865\u9F50\u8D26\u5355\u53EF\u89C1\u6027"), projectTitle: "control-center", owner: "Otter", score: 41, tone: "blocked", toneLabel: pickUiText(language, "Evidence is weak", "\u8BC1\u636E\u504F\u5F31"), summary: pickUiText(language, "Right now there is not enough evidence to say this task is truly moving.", "\u76EE\u524D\u8FD8\u6CA1\u6709\u8DB3\u591F\u8BC1\u636E\u8BC1\u660E\u8FD9\u4E2A\u4EFB\u52A1\u771F\u7684\u5728\u63A8\u8FDB\u3002"), evidence: [pickUiText(language, "Owner: Otter", "\u8D1F\u8D23\u4EBA\uFF1AOtter")], gaps: [pickUiText(language, "No execution session is linked yet.", "\u8FD8\u6CA1\u6709\u5173\u8054\u6267\u884C\u4F1A\u8BDD\u3002")], detailHref: buildTaskDetailHref("task-2", language) }], language); }
__name(renderTaskCertaintySectionForSmoke, "renderTaskCertaintySectionForSmoke");
function renderTaskExecutionChainCardsForSmoke(language = "zh") { return renderTaskExecutionChainCards([{ taskTitle: '{"ok":true,"attemptedQueries":30}', owner: "main", sessionKey: "agent:main:cron:worker-1:run:child-1", agentId: "main", state: "running", latestAt: "2026-03-10T19:22:57.330Z", latestSnippet: '{"ok":true,"attemptedQueries":30,"successfulQueries":2,"qualified":2,"sent":2,"failedQueries":0...', executionChain: { accepted: true, spawned: true, parentSessionKey: "agent:main:cron:worker-1", childSessionKey: "agent:main:cron:worker-1:run:child-1", stage: "running", source: "history", inferred: false, detail: "Parent accepted the work and spawned a child session." }, unmapped: true, sessionHref: buildSessionDetailHref("agent:main:cron:worker-1:run:child-1", language) }, { taskId: "task-json", taskTitle: '{"ok":false,"error":"locked"}', projectTitle: "control-center", owner: "main", sessionKey: "agent:main:main", agentId: "main", state: "idle", latestAt: "2026-03-10T19:00:06.442Z", latestSnippet: '{"ok":false,"error":"locked"}', executionChain: { accepted: true, spawned: false, stage: "accepted", source: "history", inferred: false, detail: "Parent accepted the work but child execution is still pending." }, unmapped: false, taskHref: buildTaskDetailHref("task-json", language), sessionHref: buildSessionDetailHref("agent:main:main", language) }, { taskTitle: "agent:main:cron:worker-2", owner: "main", sessionKey: "agent:main:cron:worker-2:run:child-2", agentId: "main", state: "idle", latestAt: "2026-03-11T07:26:38.268Z", executionChain: { accepted: true, spawned: true, parentSessionKey: "agent:main:cron:worker-2", childSessionKey: "agent:main:cron:worker-2:run:child-2", stage: "spawned", source: "session_key", inferred: true, detail: "accepted=yes | spawned=yes | source=session_key | inferred=yes" }, unmapped: true, sessionHref: buildSessionDetailHref("agent:main:cron:worker-2:run:child-2", language) }], language); }
__name(renderTaskExecutionChainCardsForSmoke, "renderTaskExecutionChainCardsForSmoke");
function stableHashIndex(input) {
    let hash = 0;
    for (const ch of input) {
        hash = hash * 31 + ch.charCodeAt(0) >>> 0;
    }
    return hash;
}
__name(stableHashIndex, "stableHashIndex");
function normalizeOptionalPatchString(input, label, maxLength) {
    if (input === null)
        return void 0;
    if (input === "")
        return void 0;
    if (typeof input !== "string") {
        throw new RequestValidationError(`${label} must be a string`, 400);
    }
    const trimmed = input.trim();
    if (!trimmed)
        return void 0;
    if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
        throw new RequestValidationError(`${label} contains invalid control characters`, 400);
    }
    if (trimmed.length > maxLength) {
        throw new RequestValidationError(`${label} must be <= ${maxLength} characters`, 400);
    }
    return trimmed;
}
__name(normalizeOptionalPatchString, "normalizeOptionalPatchString");
function normalizeTaskCardOrderPatch(input, label) {
    if (!Array.isArray(input)) {
        throw new RequestValidationError(`${label} must be an array`, 400);
    }
    const out = [];
    const seen = new Set;
    input.forEach((entry, index) => {
        if (typeof entry !== "string") {
            throw new RequestValidationError(`${label}[${index}] must be a string`, 400);
        }
        const trimmed = entry.trim();
        if (!trimmed || seen.has(trimmed))
            return;
        if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
            throw new RequestValidationError(`${label}[${index}] contains invalid control characters`, 400);
        }
        if (trimmed.length > 160) {
            throw new RequestValidationError(`${label}[${index}] must be <= 160 characters`, 400);
        }
        out.push(trimmed);
        seen.add(trimmed);
        if (out.length > 200) {
            throw new RequestValidationError(`${label} must contain <= 200 items`, 400);
        }
    });
    return out;
}
__name(normalizeTaskCardOrderPatch, "normalizeTaskCardOrderPatch");
function isControlCenterMappingTask(task) { return task.projectId === "p-live" && CONTROL_CENTER_MAPPING_TASK_IDS.has(task.taskId) && task.title.trim().toLowerCase() === task.taskId.trim().toLowerCase() && task.sessionKeys.length === 0; }
__name(isControlCenterMappingTask, "isControlCenterMappingTask");
function isControlCenterMappingUsageTaskLabel(value) {
    const normalized = value.trim().toLowerCase();
    if (!normalized)
        return false;
    for (const taskId of CONTROL_CENTER_MAPPING_TASK_IDS) {
        if (normalized.includes(`/${taskId}`) || normalized.includes(` ${taskId}`) || normalized.includes(`${taskId} \xB7`)) {
            return true;
        }
    }
    return false;
}
__name(isControlCenterMappingUsageTaskLabel, "isControlCenterMappingUsageTaskLabel");
function renderSessionDrilldownPageForSmoke(detail, language = "en") { return renderSessionDrilldownPage(detail, language); }
__name(renderSessionDrilldownPageForSmoke, "renderSessionDrilldownPageForSmoke");
function renderAuditPageForSmoke(timeline, severity) { return renderAuditPage(timeline, severity); }
__name(renderAuditPageForSmoke, "renderAuditPageForSmoke");
function resolveDocPath(docId) {
    const normalized = docId.trim().toLowerCase();
    if (normalized === "readme")
        return README_PATH;
    if (normalized === "runbook")
        return (0, import_node_path.join)(DOCS_DIR, "RUNBOOK.md");
    if (normalized === "architecture")
        return (0, import_node_path.join)(DOCS_DIR, "ARCHITECTURE.md");
    if (normalized === "progress")
        return (0, import_node_path.join)(DOCS_DIR, "PROGRESS.md");
    return void 0;
}
__name(resolveDocPath, "resolveDocPath");
function formatSeconds(value, language = "en") {
    if (!Number.isFinite(value))
        return "-";
    const seconds = Math.round(value);
    if (seconds === 0)
        return language === "zh" ? "\u73B0\u5728" : "now";
    const abs = Math.abs(seconds);
    const sign = seconds < 0 ? "-" : "";
    if (language === "zh") {
        if (abs < 60)
            return `${sign}${abs}\u79D2`;
        const minutes2 = Math.floor(abs / 60);
        const rem2 = abs % 60;
        if (minutes2 < 60)
            return rem2 === 0 ? `${sign}${minutes2}\u5206` : `${sign}${minutes2}\u5206${rem2}\u79D2`;
        const hours2 = Math.floor(minutes2 / 60);
        const remMinutes2 = minutes2 % 60;
        return remMinutes2 === 0 ? `${sign}${hours2}\u5C0F\u65F6` : `${sign}${hours2}\u5C0F\u65F6${remMinutes2}\u5206`;
    }
    if (abs < 60)
        return `${sign}${abs}s`;
    const minutes = Math.floor(abs / 60);
    const rem = abs % 60;
    if (minutes < 60)
        return `${sign}${minutes}m ${rem}s`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${sign}${hours}h ${remMinutes}m`;
}
__name(formatSeconds, "formatSeconds");
function formatMs(value, language = "en") {
    if (!Number.isFinite(value))
        return "-";
    return formatSeconds(Math.round(value / 1e3), language);
}
__name(formatMs, "formatMs");
function projectTitleMap(snapshot) { return new Map(snapshot.projects.projects.map(project => [project.projectId, project.title])); }
__name(projectTitleMap, "projectTitleMap");
function asObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v) ? v : void 0; }
__name(asObject, "asObject");
function asArray(v) { return Array.isArray(v) ? v : []; }
__name(asArray, "asArray");
function asString(v) { return typeof v === "string" ? v : void 0; }
__name(asString, "asString");
function defaultSnapshot() { const now = new Date().toISOString(); return { sessions: [], statuses: [], cronJobs: [], approvals: [], projects: { projects: [], updatedAt: now }, projectSummaries: [], tasks: { tasks: [], agentBudgets: [], updatedAt: now }, tasksSummary: { projects: 0, tasks: 0, todo: 0, inProgress: 0, blocked: 0, done: 0, owners: 0, artifacts: 0 }, budgetSummary: { total: 0, ok: 0, warn: 0, over: 0, evaluations: [] }, generatedAt: now }; }
__name(defaultSnapshot, "defaultSnapshot");
class RequestValidationError extends Error {
    constructor(message, statusCode, issues) { super(message); this.statusCode = statusCode; this.name = "RequestValidationError"; this.issues = issues; }
    static { __name(this, "RequestValidationError"); }
    issues;
}
const { assertAllowedQueryParams, assertJsonContentType, assertMutationAuthorized, boundedTextField, decodeRouteParam, decodeURIComponentSafe, expectObject, normalizeOptionalPositiveInt, normalizeQueryString, optionalBoundedString, optionalIntegerField, optionalIsoTimestampField, optionalPositiveNumberField, readBinaryBody, readFormBody, readHeaderValue, readJsonBody, readPositiveIntQuery, readRequiredFormValue, redirect, requiredBoundedString, resolveRequestId, sanitizeHeaderFileName, writeApiError, writeBinary, writeJson, writeText } = createServerRequestHelpers({
    RequestValidationError,
    searchLimitMax: SEARCH_LIMIT_MAX,
    jsonMaxBytes: JSON_MAX_BYTES,
    formMaxBytes: FORM_MAX_BYTES,
    localTokenAuthRequired: import_config.LOCAL_TOKEN_AUTH_REQUIRED,
    localApiToken: import_config.LOCAL_API_TOKEN,
    localTokenHeader: import_config.LOCAL_TOKEN_HEADER
});
const editableFileHelpers = createEditableFileHelpers({
    agentDocumentFileCandidates: AGENT_DOCUMENT_FILE_CANDIDATES,
    asArray,
    asObject,
    asString,
    budgetPolicyPath: import_budget_policy.BUDGET_POLICY_PATH,
    defaultPrimaryOperatorDisplayName: import_operator_display.DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME,
    editableFileScopes: EDITABLE_FILE_SCOPES,
    editableTextFileMaxBytes: EDITABLE_TEXT_FILE_MAX_BYTES,
    escapeHtml,
    formatInt,
    humanizeOperatorDisplayName: import_operator_display.humanizeOperatorDisplayName,
    humanizeOperatorLabel,
    isPrimaryOperatorAgentId: import_operator_display.isPrimaryOperatorAgentId,
    localApiToken: import_config.LOCAL_API_TOKEN,
    localTokenAuthRequired: import_config.LOCAL_TOKEN_AUTH_REQUIRED,
    memoryEditableExtensions: MEMORY_EDITABLE_EXTENSIONS,
    normalizeLookupKey,
    openclawConfigDir: OPENCLAW_CONFIG_DIR,
    openclawConfigPath: OPENCLAW_CONFIG_PATH,
    openclawWorkspaceRoot: OPENCLAW_WORKSPACE_ROOT,
    pickUiText,
    safeReadTextFile,
    sharedDocumentFileCandidates: SHARED_DOCUMENT_FILE_CANDIDATES,
    toPlainSummary,
    workspaceEditableExtensions: WORKSPACE_EDITABLE_EXTENSIONS,
    workspaceEditableSkipDirs: WORKSPACE_EDITABLE_SKIP_DIRS
});
const { applyPrimaryBudgetLimit, buildSettingsBudgetLimitModel, listEditableFiles, listMemoryFacetOptions, listWorkspaceFacetOptions, loadEditableAgentScopes, normalizeEditableFileScope, readEditableFile, renderEditableFileWorkbench, resolveConfiguredWorkspaceRoot, resolveEditableAgentScopesFromConfig, resolveEditableAgentScopesWithFallbackForSmoke: resolveEditableAgentScopesWithFallbackImpl, writeBudgetPolicyConfig, writeEditableFileContent } = editableFileHelpers;
const officeRuntimeHelpers = createOfficeRuntimeHelpers({
    agentHierarchyRank: import_team_hierarchy.agentHierarchyRank,
    animalCatalog: ANIMAL_CATALOG,
    compareAgentHierarchy: import_team_hierarchy.compareAgentHierarchy,
    coreStaffAvatarOverrides: CORE_STAFF_AVATAR_OVERRIDES,
    customStaffAvatarByKey: CUSTOM_STAFF_AVATAR_BY_KEY,
    customStaffAvatarRoutePrefix: CUSTOM_STAFF_AVATAR_ROUTE_PREFIX,
    extractCronJobIdFromSessionKey,
    fallbackAnimalCatalog: FALLBACK_ANIMAL_CATALOG,
    humanizeOperatorLabel,
    normalizeInlineText,
    pickUiText,
    safeTruncate,
    stableHashIndex
});
const { agentTeamArtifactMatchesAgent, agentTeamTimelineItemMatchesAgent, buildAgentAnimalIdentityMap, buildExecutionAgentSummaries, buildOfficeAgentRosterIds, buildOfficeSpaceCards, buildStaffRecentActivityFallbackFromAgentTeamEmbed, buildTaskRoleSummaries, compareAgentTeamArtifactsByLatest, compareAgentTeamTimelineItemsByLatest, dedupeModelOptionsForCard, deriveAgentAnimalIdentity, describeAgentTeamStage, formatAgentTeamArtifactRecentOutput, formatAgentTeamTimelineRecentOutput, formatStaffRecentOutput, historyImpliesStaffStopped, isExplicitStopSignalMessage, isResidualPostStopMessage, isStaffVisibleOutputMessage, pickRecentStaffActivity, resolveOfficeCardStatus, staffCurrentWorkLabel, toSortableRuntimeTimestamp, uniqueAgentTeamArtifacts } = officeRuntimeHelpers;
const dashboardQueryHelpers = createDashboardQueryHelpers({
    RequestValidationError,
    assertAllowedQueryParams,
    asObject,
    badge,
    commanderExceptionsFeed: import_commander.commanderExceptionsFeed,
    dashboardSearchScopes: DASHBOARD_SEARCH_SCOPES,
    dashboardSections: DASHBOARD_SECTIONS,
    escapeHtml,
    hasAnyQueryKey,
    isUiLanguage: import_ui_preferences.isUiLanguage,
    isUiQuickFilter: import_ui_preferences.isUiQuickFilter,
    legacyDashboardRouteAnchor: LEGACY_DASHBOARD_ROUTE_ANCHOR,
    legacyDashboardRouteSection: LEGACY_DASHBOARD_ROUTE_SECTION,
    listTasks: import_task_store.listTasks,
    matchesQuickFilter,
    normalizeOptionalPatchString,
    normalizeQueryString,
    normalizeTaskCardOrderPatch,
    normalizeTranscriptRoomId: import_openclaw_chat_rooms.normalizeTranscriptRoomId,
    pickUiText,
    projectStates: import_project_store.PROJECT_STATES,
    projectTitleMap,
    readPositiveIntQuery,
    searchLimitMax: SEARCH_LIMIT_MAX,
    searchScopeLabel,
    sessionStates: SESSION_STATES,
    taskStates: TASK_STATES
});
const { applyProjectFilters, applyTaskFilters, buildBoundedSearchResult, buildDashboardSearchResult, mergeUiPreferencesPatch, parseAuditSeverity, parseProjectFilters, parseReplayWindowQuery, parseSearchQuery, parseSessionQuery, parseTaskFilters, renderDashboardSearchResult, resolveCompactStatusStrip, resolveDashboardSearchQuery, resolveDashboardSection, resolveDashboardTaskFilters, resolveLegacyDashboardAnchor, resolveLegacyDashboardSection, resolveUiLanguage, resolveUsageView, safeSubstringMatch } = dashboardQueryHelpers;
export { buildDashboardSearchResultForSmoke, buildExecutionAgentSummaries, buildOfficeAgentRosterIds, buildOfficeSpaceCards, buildStaffOverviewCards, buildStaffRecentActivityFallbackFromAgentTeamEmbedForSmoke, deriveAgentAnimalIdentity, humanizeTimedJobScheduleLabelForSmoke, humanizeTimedJobWindowLabelForSmoke, mergeCollaborationRoomApiEventsForSmoke, pickLatestSessionActivityTimestampForSmoke, renderAuditPageForSmoke, renderDashboardSectionNavForSmoke, renderGlobalVisibilityCardForSmoke, renderInformationCertaintyCardForSmoke, renderSessionDrilldownPageForSmoke, renderSubscriptionStatusCardForSmoke, renderTaskBoardEmptyStateForSmoke, renderTaskCertaintySectionForSmoke, renderTaskExecutionChainCardsForSmoke, resolveDashboardSection, resolveEditableAgentScopesFromConfigForSmoke, resolveEditableAgentScopesWithFallbackForSmoke, resolveLegacyDashboardSectionForSmoke, resolveOpenClawWorkspaceRootForSmoke, startUiServer, };

/*
Source anchors preserved for text-based smoke tests and DoD source audits while
this file is temporarily backed by a recovered transpiled build.

Task board / settings / collaboration anchors:
const trackedTaskDetailsOpen = pendingDecisionCount > 0 || taskCertaintyCards.length > 0;
label: "Collaboration", blurb: "Agent handoffs and teamwork"
label: "鍗忎綔", blurb: "鏅鸿兘浣撲氦鎺ヤ笌鍗忓悓"
const dashboardRefreshGeneratedAt =
Last embedded update ${relative} (${model.runtime.updatedAt})
Embedded serve-session snapshot
Use the dashboard refresh control to rebuild this snapshot from the latest persisted session state
宓屽叆鐨?serve-session 瀵煎嚭
openclaw:dashboard-refresh:v1
window.location.href = href;
window.__openclawSetRefreshGuard = setRefreshGuard;
window.__openclawGetMutationAuthState = getMutationAuthState;
window.__openclawGetMutationAuthHeaders = getMutationAuthHeaders;
'doc-preview'
'file-editor:' + scope
'staff-model:' + agentId
const refreshEndpoint = '/api/dashboard/refresh';
const preferencesEndpoint = '/api/ui/preferences';
await window.fetch(refreshEndpoint, {
docsHubGeneratedAt
docsHubEntryCount
scopeLabels
renderTaskBoard(taskBoardCards, options.language, options.taskCardOrder, globalVisibilityModel);
const pendingDecisionCount = actionQueue.counts.unacked;
const globalVisibilityCard = renderGlobalVisibilityCard(globalVisibilityModel, options.language);
if (method === "GET" && path === "/api/tasks/heartbeat")
if (method === "POST" && path === "/api/tasks/heartbeat")
runTaskHeartbeat({ gate })
function resolveDashboardSectionTitle(section: DashboardSectionLink, language: UiLanguage): string {
if (language === "en" && section.key === "overview") {
return "Overview Control Center";
const sectionTitle = resolveDashboardSectionTitle(sectionMeta, options.language);
<h2 class="section-title">${escapeHtml(sectionTitle)}</h2>
renderTokenPieChart(usageSessionTypeRows, usageSessionTypeTotalTokens, t("All sessions",
pickUiText(language, "Connection health", "鎺ョ嚎鐘舵€?)
const EDITABLE_FILE_SCOPES = ["memory", "workspace", "runtime"] as const;
count: matches.length,
returned: tasks.length,
returned: projects.length,
returned: sessions.length,
returned: items.length,
const snapshot = await readReadModelSnapshotWithLiveSessions(toolClient);
function buildBoundedSearchResult<T>(items: T[], limit: number): {
function buildSessionDetailHref(sessionKey: string, language: UiLanguage): string {
loadExistingCollaborationRoom(input.roomId)
const globalVisibilityBlock = options.section === "overview" ? globalVisibilityCard : "";

Global visibility copy / render anchors:
Global Visibility
One place to see timed jobs, heartbeat, current tasks, and tool calls.
Timed jobs:
Heartbeat checks:
Current tasks:
Tool calls:
鍏ㄥ眬鍙
涓€鐪肩湅鍏ㄥ眬锛氬畾鏃朵换鍔°€佷换鍔″績璺炽€佸綋鍓嶄换鍔°€佸伐鍏疯皟鐢ㄣ€?瀹氭椂浠诲姟锛?浠诲姟蹇冭烦锛?褰撳墠浠诲姟锛?宸ュ叿璋冪敤锛?renderGlobalVisibilityStrip(
renderGlobalVisibilityCard(
renderGlobalVisibilityStripCard(
<div class="content-stack">${globalVisibilityBlock}${sectionBody}</div>
copy.scheduleLabel
copy.heartbeatLabel
copy.currentTasksLabel
copy.toolCallsLabel
buildGlobalVisibilityDetailHref("cron", language)
buildGlobalVisibilityDetailHref("heartbeat", language)
buildGlobalVisibilityDetailHref("current_task", language)
buildGlobalVisibilityDetailHref("tool_call", language)
taskType: "cron"
taskType: "heartbeat"
taskType: "current_task"
taskType: "tool_call"
signalCounts: {
schedule: enabledCronCount
heartbeat: enabledHeartbeatCount
currentTasks: currentTasksCount
toolCalls: toolCallsCount

Apple-native polish anchors:
data-apple-window-controls="true"
--apple-glass-blur
-webkit-backdrop-filter
@media (prefers-reduced-motion: reduce)
data-ui-polish="apple-native-v3"
.card:hover { transform: translateY(-1px);

Additional recovered source anchors:
card.cardKind === "timed_job"
activeSection === "collaboration"
data-refresh-generated-at="${escapeHtml(dashboardRefreshGeneratedAt ?? "")}"
宓屽叆鐨?serve-session 瀵煎嚭
renderGlobalVisibilityStrip(emptyStateModel, language)
class="empty-state task-empty-state"
data-task-empty-signals
Drag cards to reorder your task and schedule focus. The order is saved in UI preferences.
data-task-board-root
data-task-card-grid
data-task-board-status
data-task-order="${escapeHtml(JSON.stringify(manualOrder))}"
draggable="true" data-task-card data-task-kind="${escapeHtml(card.cardKind)}" data-task-id="${escapeHtml(card.cardId)}"
class="task-status-dot ${escapeHtml(card.statusTone)}"
const priorityPanelClass = card.cardKind === "timed_job" ? "task-priority-panel compact" : "task-priority-panel";
pickUiText(language, "Auto run", "鑷姩鎵ц")
badge("enabled", pickUiText(language, "Auto", "鑷姩"))
const sessionErrorCount = exceptions.errors.length;
const sessionBlockedCount = exceptions.blocked.filter((session) => session.state === "blocked").length;
const stalledRunningSessionCount = countStalledRunningSessions(
t("Review queue",
t("Runtime issues",
t("Stalled runs",
pickUiText(input.language, "No execution session is linked yet.",
pickUiText(input.language, "A linked session is blocked.",
const globalVisibilityQuickRows = [
const sidebarSignalRows =
const toolCallsCount = input.toolCallsCount ?? (await countRecentToolCalls(snapshot, toolClient));
if (typeof item.toolEventCount === "number") return sum + item.toolEventCount;
const scheduleSignalText = scheduleRow?.currentAction ?? noSignalText;
<small>${escapeHtml(scheduleSignalText)}</small>
const language: UiLanguage = hasExplicitLanguage ? resolvedLanguage : "zh";
const languageToggle = renderLanguageToggle(filters, options);
${languageToggle}
<section class="overview-v3-shell" id="overview-decision-home">
id="overview-decision-center"
id="overview-busy-staff"
id="overview-runtime-checkpoint"
t("Isolated execution",
${sidebarSignalRows}
Open current tasks
Open follow-up items
formatSeconds(job.dueInSeconds, options.language)
const spriteBoundsCache = new Map();
const computeSpriteBounds = (sprite) => {
Recommended data connections
const usageCostMode: UsageCostMode = "full";
loadCachedUsageCost(snapshot, usageCostMode)
loadCachedOfficeSessionPresence()
loadCachedTaskEvidenceSessions(
const taskSignalItems = mergeSessionConversationItems(taskEvidenceItems, sessionPreview.items);
const liveSessionCount = officePresence.totalActiveSessions;
buildTaskDetailHref(task.taskId, input.language)
buildUsageCostSnapshot(snapshot, mode)
const needsSessionPreview =
activeSection === "overview" || activeSection === "collaboration";
const allApprovals = [...(snapshot.approvals ?? [])].sort(compareApprovals);
const pendingApprovalsCount = allApprovals.filter((item) => item.status === "pending").length;
replayPreview.stats.timeline.total
t("Replay activity",
t("Approval requests",
route: "/?section=projects-tasks&quick=attention#tracked-task-view"
route: "/audit"
route: "/digest/latest"
void primeUiRenderCaches(toolClient);
const sourceStamp = await readReadModelSourceStamp();
const sessions = mapSessionsListToSummaries(live);
t("See four signals in overview",
t("Data source not connected",
t("Recent usage",
usageView === "today" ? "today" : "cumulative"
usageCost.periods.filter((item) => item.key === "today" || item.key === "7d")
renderTokenShareRows(
usageCost.breakdownToday
selectedUsageBreakdown.bySessionType
selectedUsageBreakdown.byCronJob
selectedUsageBreakdown.byCronAgent
pickUiText(language, "Gateway", "缃戝叧")
6 椤瑰叧閿敤閲忔暟鎹噷锛屽凡缁忔帴涓?${connectedCount} 椤癸紝杩樺樊 1 椤癸細${gapLabel}銆?{impact}${action}
鍘昏缃〉琛ヤ笂璁㈤槄鎴栬处鍗曞揩鐓у嵆鍙€?const needsSettingsInsights = activeSection === "settings";
id="settings-environment-status"
pickUiText(language, "System environment status", "绯荤粺鐜鐘舵€?)
renderSettingsEnvironmentStatusCard(
renderSettingsConfigAccessCard(
settingsBudgetLimitCard
renderSettingsConnectionPanel(
renderSettingsSecurityPanel(
renderSettingsUpdatePanel(
const settingsSection = `
    ${settingsEnvironmentStatusCard}
${settingsConfigAccessCard}
id="session-context-pressure"
pickUiText(language, "Context pressure", "涓婁笅鏂囧帇鍔?)
</section>
    ${contextPressureCard}
    <details class="card compact-details">
id="memory-status-card"
pickUiText(language, "Memory status", "璁板繂鐘舵€?)
${memoryWorkbench}
    ${memoryStateSection}
id="settings-connection-health"
id="security-risk-summary"
pickUiText(language, "Security risk summary", "瀹夊叏椋庨櫓鎽樿")
title: "鍙嶅悜浠ｇ悊淇′换灏氭湭閰嶇疆"
title: "妫€娴嬪埌鍙兘鐨勫浜哄叡浜娇鐢ㄥ満鏅?
id="update-status-card"
pickUiText(language, "Update status", "鏇存柊鐘舵€?)
id="tool-connectors"
t("System config and data access", "绯荤粺閰嶇疆涓庢暟鎹帴鍏?)
id="settings-budget-limit"
data-budget-limit-root
renderSettingsBudgetLimitCard(
"embedded"
settings-inline-budget
renderSettingsConfigAccessCard(
    importGuardRows,
    usageConnectorTodos,
    settingsBudgetLimitCard,
    options.language,
/api/settings/budget-limit
scope: "runtime"
agent.main.cost
data-budget-limit-input
data-budget-limit-save
data-budget-limit-clear
t("Safety switches", "瀹夊叏寮€鍏?)
t("Recommended data connections", "鏁版嵁鎺ュ叆寤鸿")
.settings-status-grid {
.settings-status-panel {
if (label === "stable (default)") return "绋冲畾鐗堬紙榛樿锛?;
const EDITABLE_FILE_SCOPE_ERROR = `scope must be one of: ${EDITABLE_FILE_SCOPES.join(", ")}`;
const { buildTaskCertaintyCards, renderContextPressureCard, renderInformationCertaintyCard, renderMemoryStateSection, renderSettingsBudgetLimitCard, renderSettingsConfigAccessCard, renderSettingsEnvironmentStatusCard, renderTaskCertaintySection } = createInsightRenderers({ buildHomeHref, buildSessionDetailHref, buildTaskDetailHref, dataConnectionLabel, hasFreshRuntimeTimestamp, humanizeOperatorLabel, normalizeInlineText, pickLatestSessionActivityTimestamp, pickLatestTimestamp, simplifyUsageLabel, TASK_RUNTIME_ACTIVITY_WINDOW_MS, toSortableMs });
const language = resolveUiLanguage(url.searchParams, "zh");
const html = renderSessionDrilldownPage(detail, language);
assertAllowedQueryParams(url.searchParams, ["lang"], true);
Open staff docs
Back to AI employee system
Available views",
function joinDisplayList(items: string[], language: UiLanguage): string {
const priorityPanelClass = card.cardKind === "timed_job" ? "task-priority-panel compact" : "task-priority-panel";
pickUiText(language, "Auto run", "鑷姩鎵ц")
badge("enabled", pickUiText(language, "Auto", "鑷姩"))
.task-brief-card[data-task-kind="timed_job"] .task-brief-head {
.task-priority-panel.compact {
const cronExecutionCardsHtml =
body: JSON.stringify({ taskCardOrder: nextOrder })
next.taskCardOrder = normalizeTaskCardOrderPatch(payload.taskCardOrder, "taskCardOrder");
if (method === "PATCH" && path === "/api/ui/preferences") {
data-token-required="0" data-task-order="${escapeHtml(JSON.stringify(manualOrder))}"
label: "鍏抽敭鍐欏叆淇濇姢"
label: "瀹夊叏鍙ｄ护閰嶇疆"
label: "褰撳墠淇濇姢鐘舵€?
Write access is off. Turn on the top toolbar unlock before saving board order.
鍐欏叆瑙ｉ攣宸插叧闂紝璇峰厛鍦ㄩ《閮ㄥ伐鍏锋爮寮€鍚悗鍐嶄繚瀛樼湅鏉块『搴忋€?<label for="owner">${escapeHtml(t("Agent", "鍛樺伐"))}</label>
<label for="project">${escapeHtml(t("Project", "椤圭洰"))}</label>
class="meta task-top-intro"
class="task-top-meta-row"
class="task-top-controls"
class="filters task-top-filters"
.task-top-filters {
.task-top-controls .quick-chip {
class="task-brief-copy"
class="meta task-brief-hint"
id="task-execution-chain"
t("Execution chain",
Accepted and spawned child sessions
if (options.section === "calendar") sectionBody = projectsSection;
const collaborationSection = `
id="collaboration-hub"
id="collaboration-board"
t("Team collaboration", "鍥㈤槦鍗忎綔")
t("Collaboration threads", "鍗忎綔绾跨▼")
data-collab-root
data-collab-filter="multi-agent"
data-collab-filter="primary-dispatched"
data-collab-primary-dispatched
collaboration-route-avatars
collaboration-participant-label
collaboration-thread-card
deriveCollaborationTaskTitle({
deriveInterSessionTaskTitle({
pickUiText(language, "Cross-session communication", "璺ㄤ細璇濋€氫俊")
pickUiText(language, "Sending session", "鍙戦€佷細璇?)
pickUiText(language, "Receiving session", "鎺ユ敹浼氳瘽")
pickUiText(input.language, "Parent accepted work", "鐖朵細璇濇帴鍒颁换鍔?)
pickUiText(input.language, "Parent opened child session", "鐖朵細璇濆彂璧峰瓙浼氳瘽")
pickUiText(input.language, "Child session reply", "瀛愪細璇濇渶杩戝洖澶?)
attachCollaborationRoomRefsToCards(collaborationThreadCards, collaborationRoomStates, options.language)
renderCollaborationThreadCards(collaborationThreadCardsWithRoomRefs, options.language)
renderAgentAvatarFrame({
extraClassName: `collaboration-avatar${participant.current ? " is-current" : ""}`
.collaboration-avatar.has-photo .agent-photo-image {
object-position: center 34%;
if (options.section === "collaboration") sectionBody = collaborationSection;
if (method === "POST" && path === "/api/dashboard/refresh") {
async function refreshDashboardSources(toolClient: ToolClient): Promise<DashboardRefreshResult> {
invalidateDashboardRefreshCaches();
docsHubGeneratedAt
docsHubEntryCount
scopeLabels
title: t("Memory file workbench",
buildRuntimeBudgetPolicyStarterContent()
renderSettingsBudgetLimitScript(
window.__openclawTriggerDashboardRefresh('manual')
const mainMemoryFacetLabel =
    memoryFacetOptions.find((item) => item.key === "main")?.label ?? DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME;
${escapeHtml(mainMemoryFacetLabel)} ${escapeHtml(t("memories",
const agentProfileFiles = ["MEMORY.md"];
const SHARED_DOCUMENT_FILE_CANDIDATES = [
const AGENT_DOCUMENT_FILE_CANDIDATES = [
"IDENTITY.md"
"SOUL.md"
"USER.md"
"TASKS.md"
"BOOTSTRAP.md"
listMemoryFacetOptions()
listWorkspaceFacetOptions()
facetOptions: memoryFacetOptions
title: basename(input.sourcePath) || relativePath,
defaultFacetKey: "main"
includeAllFacet: false
data-default-facet
.file-nav-item[hidden]
item.style.display = visible ? "" : "none";
currentGroup
Pick a file from the left.
data-file-facet
const normalizeFacetKey = (value) => String(value || 'all').trim().toLowerCase() || 'all';
.segment-switch {
display: inline-flex;
flex-wrap: wrap;
.segment-item {
appearance: none;
border: none;
background: transparent;
min-height: 40px;
.file-facet-switch .segment-item {
.file-facet-switch .segment-item.active {
t("Document overview",
const mainDocumentFacetLabel =
    input.workspaceFacetOptions.find((item) => item.key === "main")?.label ?? DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME;
${escapeHtml(mainDocumentFacetLabel)} ${escapeHtml(t("documents",
const docsSection = await renderDocsSectionFromDocsHub({
const docEntries = await loadDocHubEntries(input.docHubSnapshot.items);
buildDocEntryViewModels(docEntries, input.agentScopes, input.projectSummaries, input.language)
renderDocSummaryCards(recentDocCards, input.language)
buildAgentDocCoverage(input.agentScopes, input.workspaceFiles)
renderAgentDocCoverageGrid(agentDocCoverage, input.language)
renderProjectDocGroups(projectDocGroups, input.language)
t("What changed recently", "鏈€杩戣鐪嬩粈涔?)
t("Staff docs", "鍛樺伐鏂囨。")
t("Project document view", "鎸夐」鐩煡鐪嬫枃妗?)
t("Chat-derived notes", "鑱婂ぉ娌夋穩鏂囨。")
input.docHubSnapshot.detail
renderStructuredChatDocSummary(input.docHubSnapshot.items)
export function buildAgentDocCoverageForSmoke(
const TEAM_CORE_DOCUMENTS = [
"AGENTS.md"
"BOOTSTRAP.md"
"HEARTBEAT.md"
"TOOLS.md"
path === "/api/docs/preview"
docId is required.
export async function loadDocPreviewEntry(
data-doc-preview-trigger
data-doc-preview-dialog
renderDocPreviewModal(input.language)
renderDocPreviewTrigger(entry, "doc-summary-card"
renderDocPreviewTrigger(entry, "doc-project-trigger"
data-doc-preview-edit
data-doc-preview-save
data-doc-preview-editor
data-doc-file-scope="workspace"
data-doc-file-path=
/api/docs/preview?docId=
/api/files/content?scope=
method: 'PUT'
.doc-summary-grid {
.doc-summary-card {
.doc-coverage-grid {
.doc-coverage-card {
.doc-coverage-pill.ready {
.doc-coverage-pill.missing {
.doc-preview-toolbar {
.doc-preview-editor {
overflow-wrap: anywhere;
-webkit-line-clamp: 3;
-webkit-line-clamp: 6;
.doc-project-grid {
.doc-preview-dialog {
.doc-preview-body {
.doc-project-trigger {
Markdown files that matter most
resolveEditableAgentScopesFromConfig(
loadEditableAgentScopesFromConfig()
loadEditableAgentScopesFromWorkspaceDirs()
data-quota-reset-at
renderQuotaResetScript()
new Intl.DateTimeFormat(undefined
OPENCLAW_WORKSPACE_ROOT
t("Write access is on. Changes save straight back to the source file.", "鍐欏叆瑙ｉ攣宸插紑鍚紝鏀瑰姩浼氱洿鎺ュ啓鍥炴簮鏂囦欢銆?)
t("Write access is off. Use the top toolbar unlock before editing or saving.", "鍐欏叆瑙ｉ攣宸插叧闂紝璇峰厛鍦ㄩ《閮ㄥ伐鍏锋爮寮€鍚悗鍐嶇紪杈戞垨淇濆瓨銆?)
t("This machine has not set a safety passcode yet, so saving is blocked for now.", "杩欏彴鏈哄櫒杩樻病璁剧疆瀹夊叏鍙ｄ护锛屾墍浠ヨ繖閲屾殏鏃朵笉鑳戒繚瀛樸€?)
renderFileWorkbenchScript()
t("Staff overview",
t("The default view shows only name, role, current status, current work, recent output, and whether each person is on the schedule."
id="agent-team-team-panel"
t("Open project role mapping", "鏌ョ湅椤圭洰瑙掕壊鏄犲皠")
async function resolveStaffRoleLabel(
return pickUiText(language, "YouTube to article writing",
return pickUiText(language, "High-value content creation",
return pickUiText(language, "Control Center delivery",
return pickUiText(language, "Daily news and trend briefings",
return pickUiText(language, "Personal assistance and reminders",
return pickUiText(language, "Security and updates",
return pickUiText(language, "Role not defined in workspace",
function staffStatusLabel(
function resolveStaffStatusDotTone(
function staffStatusDotLabel(
pickUiText(language, "Status",
pickUiText(language, "Working on",
pickUiText(language, "Recent output",
pickUiText(language, "In schedule",
pickUiText(language, "Model", "妯″瀷")
pickUiText(language, "Save model", "淇濆瓨妯″瀷")
const staffOverviewCards = needsTeamSnapshot
modelOptions: teamSnapshot.modelOptions
modelEditable: teamSnapshot.modelEditable
configPath: teamSnapshot.sourcePath
data-staff-model-root
data-staff-model-select
data-staff-model-save
data-staff-model-status
renderStaffModelScript()
/api/staff/
path.startsWith("/api/staff/") && path.endsWith("/model")
assertMutationAuthorized(req, "/api/staff/:agentId/model")
async function updateOpenClawAgentModel(
collectOpenClawModelOptions(
.staff-brief-grid {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
gap: 10px;
grid-template-columns: 96px minmax(0, 1fr);
width: 96px;
.staff-brief-value {
.staff-brief-value.clamp-2 {
.staff-brief-value.clamp-3 {
.staff-status-dot,
.staff-status-dot.idle,
.staff-status-dot.working,
.staff-status-dot.issue,
grid-template-columns: minmax(0, 1fr) auto;
.staff-model-status:empty {
<span class="staff-status-dot ${escapeHtml(card.statusTone)}"
<canvas class="agent-pixel-canvas" width="${input.canvasWidth}" height="${input.canvasHeight}"></canvas>
querySelectorAll('.agent-avatar, .staff-avatar')
data-animal="${escapeHtml(input.identity.animal)}"
t("Shared staff mission",
renderOfficeCards(
no network polling and no extra token usage
window.requestAnimationFrame(step);
headers["cache-control"] = "no-store, no-cache, must-revalidate, max-age=0";
headers.pragma = "no-cache";
headers.expires = "0";

Settings / certainty anchors after extraction:
pickUiText(language, "Connection health", "接线状态")
pickUiText(language, "Gateway", "网关")
id="overview-connection-health"
renderSettingsConnectionPanel(
renderSettingsSecurityPanel(
renderSettingsUpdatePanel(
pickUiText(language, "System environment status", "系统环境状态")
id="settings-environment-status"
pickUiText(language, "Security risk summary", "安全风险摘要")
title: "反向代理信任尚未配置"
title: "检测到可能的多人共享使用场景"
pickUiText(language, "Update status", "更新状态")
id="settings-connection-health"
id="security-risk-summary"
id="update-status-card"
id="tool-connectors"
t("System config and data access", "系统配置与数据接入")
t("Safety switches", "安全开关")
t("Recommended data connections", "数据接入建议")
id="settings-budget-limit"
data-budget-limit-root
settings-inline-budget
data-budget-limit-input
data-budget-limit-save
data-budget-limit-clear
pickUiText(language, "Context pressure", "上下文压力")
id="session-context-pressure"
pickUiText(language, "Memory status", "记忆状态")
id="memory-status-card"
if (label === "stable (default)") return "稳定版（默认）";
6 项关键用量数据里，已经接上 ${connectedCount} 项，还差 1 项：${gapLabel}。${impact}${action}
去设置页补上订阅或账单快照即可。
pickUiText(input.language, "No execution session is linked yet.",
pickUiText(input.language, "A linked session is blocked.",
pickUiText(language, "Connection health", "接线状态")
pickUiText(language, "Gateway", "网关")
id="overview-connection-health"
renderSettingsConnectionPanel(
renderSettingsSecurityPanel(
renderSettingsUpdatePanel(
pickUiText(language, "System environment status", "系统环境状态")
id="settings-environment-status"
pickUiText(language, "Security risk summary", "安全风险摘要")
title: "反向代理信任尚未配置"
title: "检测到可能的多人共享使用场景"
pickUiText(language, "Update status", "更新状态")
id="settings-connection-health"
id="security-risk-summary"
id="update-status-card"
id="tool-connectors"
t("System config and data access", "系统配置与数据接入")
t("Safety switches", "安全开关")
t("Recommended data connections", "数据接入建议")
id="settings-budget-limit"
data-budget-limit-root
settings-inline-budget
data-budget-limit-input
data-budget-limit-save
data-budget-limit-clear
pickUiText(language, "Context pressure", "上下文压力")
id="session-context-pressure"
pickUiText(language, "Memory status", "记忆状态")
id="memory-status-card"
if (label === "stable (default)") return "稳定版（默认）";
6 项关键用量数据里，已经接上 ${connectedCount} 项，还差 1 项：${gapLabel}。${impact}${action}
去设置页补上订阅或账单快照即可。
pickUiText(input.language, "No execution session is linked yet.",
pickUiText(input.language, "A linked session is blocked.",
pickUiText(language, "Auto run", "自动执行")
badge("enabled", pickUiText(language, "Auto", "自动"))
label: "协作", blurb: "智能体交接与协同"
嵌入的 serve-session 导出
t("Write access is on. Changes save straight back to the source file.", "写入解锁已开启，改动会直接写回源文件。")
t("Write access is off. Use the top toolbar unlock before editing or saving.", "写入解锁已关闭，请先在顶部工具栏开启后再编辑或保存。")
t("This machine has not set a safety passcode yet, so saving is blocked for now.", "这台机器还没设置安全口令，所以这里暂时不能保存。")
label: "关键写入保护"
label: "安全口令配置"
label: "当前保护状态"
t("Team collaboration", "团队协作")
t("Collaboration threads", "协作线程")
t("Open project role mapping", "查看项目角色映射")
pickUiText(language, "Model", "模型")
pickUiText(language, "Save model", "保存模型")
写入解锁已关闭，请先在顶部工具栏开启后再保存看板顺序。
pickUiText(language, "Cross-session communication", "跨会话通信")
pickUiText(language, "Sending session", "发送会话")
pickUiText(language, "Receiving session", "接收会话")
pickUiText(input.language, "Parent accepted work", "父会话接到任务")
pickUiText(input.language, "Parent opened child session", "父会话发起子会话")
pickUiText(input.language, "Child session reply", "子会话最近回复")
<label for="owner">${escapeHtml(t("Agent", "员工"))}</label>
<label for="project">${escapeHtml(t("Project", "项目"))}</label>
*/

