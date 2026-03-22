// @ts-nocheck

const { basename } = require("node:path");

function createOfficeRuntimeHelpers(deps) {
  const {
    agentHierarchyRank,
    animalCatalog,
    compareAgentHierarchy,
    coreStaffAvatarOverrides,
    customStaffAvatarByKey,
    customStaffAvatarRoutePrefix,
    extractCronJobIdFromSessionKey,
    fallbackAnimalCatalog,
    humanizeOperatorLabel,
    normalizeInlineText,
    pickUiText,
    safeTruncate,
    stableHashIndex,
  } = deps;

  function normalizeLookupKey(input) {
    return input.trim().toLowerCase();
  }

  function buildCustomStaffAvatarIdentity(avatarKey) {
    const asset = customStaffAvatarByKey.get(avatarKey);
    if (!asset) {
      return void 0;
    }
    return {
      animal: asset.key,
      title: asset.title,
      accent: asset.accent,
      sprite: "",
      imageHref: `${customStaffAvatarRoutePrefix}${encodeURIComponent(asset.fileName)}`,
    };
  }

  function deriveGeneratedAgentAnimalIdentity(agentId) {
    const normalized = agentId.trim().toLowerCase();
    const compact = normalized.replace(/[^a-z0-9]/g, "");
    if (!compact) {
      const fallback = fallbackAnimalCatalog[0];
      return { animal: fallback.key, title: fallback.title, accent: fallback.accent, sprite: fallback.sprite };
    }
    const matched = animalCatalog.find((item) => item.keywords.some((keyword) => compact.includes(keyword)));
    if (matched) {
      return { animal: matched.key, title: matched.title, accent: matched.accent, sprite: matched.sprite };
    }
    const index = stableHashIndex(compact) % fallbackAnimalCatalog.length;
    const fallback = fallbackAnimalCatalog[index];
    return { animal: fallback.key, title: fallback.title, accent: fallback.accent, sprite: fallback.sprite };
  }

  function deriveCustomStaffAvatarIdentity(agentId) {
    const key = normalizeLookupKey(agentId);
    if (!key) {
      return void 0;
    }
    const reservedKey = coreStaffAvatarOverrides.get(key);
    if (reservedKey) {
      return buildCustomStaffAvatarIdentity(reservedKey);
    }
    return void 0;
  }

  function deriveAgentAnimalIdentity(agentId) {
    const customIdentity = deriveCustomStaffAvatarIdentity(agentId);
    if (customIdentity) {
      return customIdentity;
    }
    return deriveGeneratedAgentAnimalIdentity(agentId);
  }

  function buildAgentAnimalIdentityMap(agentIds) {
    const normalizedAgentIds = [...new Set(agentIds.map((item) => item.trim()).filter(Boolean))].sort(compareAgentHierarchy);
    const identityByKey = new Map();
    if (normalizedAgentIds.length === 0) {
      return identityByKey;
    }
    for (const agentId of normalizedAgentIds) {
      const key = normalizeLookupKey(agentId);
      const reservedKey = coreStaffAvatarOverrides.get(key);
      if (!reservedKey) {
        continue;
      }
      const identity = buildCustomStaffAvatarIdentity(reservedKey);
      if (!identity) {
        continue;
      }
      identityByKey.set(key, identity);
    }
    for (const agentId of normalizedAgentIds) {
      const key = normalizeLookupKey(agentId);
      if (identityByKey.has(key)) {
        continue;
      }
      identityByKey.set(key, deriveGeneratedAgentAnimalIdentity(agentId));
    }
    return identityByKey;
  }

  function buildOfficeAgentRosterIds(snapshot, _tasks, knownAgentIds = []) {
    const configuredAgentIds = knownAgentIds.map((agentId) => agentId.trim()).filter(Boolean);
    if (configuredAgentIds.length > 0) {
      return [...new Set(configuredAgentIds)].sort((a, b) => a.localeCompare(b));
    }
    const agentIds = new Set();
    for (const session of snapshot.sessions) {
      if (session.agentId?.trim()) {
        agentIds.add(session.agentId.trim());
      }
    }
    for (const budget of snapshot.tasks.agentBudgets) {
      if (budget.agentId.trim()) {
        agentIds.add(budget.agentId.trim());
      }
    }
    return [...agentIds];
  }

  function resolveOfficeCardStatus(states, activeSessionCount, activeTaskCount) {
    if (states.includes("error")) return "error";
    if (states.includes("blocked")) return "blocked";
    if (states.includes("waiting_approval")) return "waiting_approval";
    if (states.includes("running")) return "running";
    if (activeSessionCount > 0) return "running";
    if (activeTaskCount > 0) return "idle";
    if (states.includes("idle")) return "idle";
    return "inactive";
  }

  function officeStatusRank(status) {
    if (status === "error") return 0;
    if (status === "blocked") return 1;
    if (status === "waiting_approval") return 2;
    if (status === "running") return 3;
    if (status === "mixed") return 4;
    if (status === "idle") return 5;
    return 6;
  }

  function officeStatusLabel(status, language = "zh") {
    if (status === "running") return pickUiText(language, "Running", "执行中");
    if (status === "waiting_approval") return pickUiText(language, "Waiting for approval", "等待审批");
    if (status === "blocked") return pickUiText(language, "Needs support", "需要支援");
    if (status === "error") return pickUiText(language, "Issue detected", "发现异常");
    if (status === "idle") return pickUiText(language, "Standing by", "待命");
    if (status === "mixed") return pickUiText(language, "Mixed state", "混合状态");
    return pickUiText(language, "No active load", "无活跃负载");
  }

  function officeZoneFromStatus(status) {
    if (status === "running") return "Builder Desks";
    if (status === "waiting_approval") return "Approval Desk";
    if (status === "blocked" || status === "error" || status === "mixed") return "Support Bay";
    return "Standby Pods";
  }

  function officeZoneLabel(zone, language = "zh") {
    if (zone === "Builder Desks") return pickUiText(language, "Builder Desks", "执行工位");
    if (zone === "Approval Desk") return pickUiText(language, "Approval Desk", "审批工位");
    if (zone === "Support Bay") return pickUiText(language, "Support Bay", "支援工位");
    return pickUiText(language, "Standby Pods", "待命工位");
  }

  function animalLabel(animal, language = "zh") {
    if (animal === "robot") return pickUiText(language, "Robot", "机器人");
    if (animal === "bird") return pickUiText(language, "Bird", "白鸟");
    if (animal === "cat") return pickUiText(language, "Cat", "橘猫");
    if (animal === "deer") return pickUiText(language, "Deer", "小鹿");
    if (animal === "elephant") return pickUiText(language, "Elephant", "大象");
    if (animal === "lion") return pickUiText(language, "Lion", "狮子");
    if (animal === "panda") return pickUiText(language, "Panda", "熊猫");
    if (animal === "monkey") return pickUiText(language, "Monkey", "猴子");
    if (animal === "dolphin") return pickUiText(language, "Dolphin", "海豚");
    if (animal === "owl") return pickUiText(language, "Owl", "猫头鹰");
    if (animal === "fox") return pickUiText(language, "Fox", "狐狸");
    if (animal === "bear") return pickUiText(language, "Bear", "棕熊");
    if (animal === "eagle") return pickUiText(language, "Eagle", "鹰");
    if (animal === "shiba") return pickUiText(language, "Shiba", "柴犬");
    if (animal === "tiger") return pickUiText(language, "Tiger", "老虎");
    if (animal === "otter") return pickUiText(language, "Otter", "水獭");
    if (animal === "rooster") return pickUiText(language, "Rooster", "公鸡");
    return pickUiText(language, "Animal", "动物");
  }

  function buildOfficeSummary(status, focusItems, sessionCount, language = "zh") {
    if (focusItems.length === 0 && sessionCount === 0) return pickUiText(language, "No live task right now.", "当前没有实时任务。");
    if (status === "running" && focusItems.length > 0) return pickUiText(language, `Working on: ${focusItems[0]}`, `正在处理：${focusItems[0]}`);
    if (status === "waiting_approval") return pickUiText(language, "Waiting for approval before continuing.", "等待审批，暂时暂停。");
    if (status === "blocked" || status === "error") return pickUiText(language, "Clear blockers before continuing.", "继续前需要先解决阻塞。");
    if (focusItems.length > 0) return pickUiText(language, `Currently tracking: ${focusItems[0]}`, `当前跟进：${focusItems[0]}`);
    if (sessionCount > 0) return pickUiText(language, "Session is open and waiting for the next instruction.", "会话已开启，等待下一步指令。");
    return pickUiText(language, "Standing by.", "待命中。");
  }

  function buildOfficeSpaceCards(snapshot, tasks, knownAgentIds = [], runtimeActiveSessionsByAgent = new Map(), language = "zh") {
    const configuredAgentKeys = new Set(knownAgentIds.map((agentId) => normalizeLookupKey(agentId)).filter((agentId) => agentId.length > 0));
    const allowUnknownAgents = configuredAgentKeys.size === 0;
    const agentIds = new Set(buildOfficeAgentRosterIds(snapshot, tasks, knownAgentIds));
    for (const [agentId, activeCount] of runtimeActiveSessionsByAgent.entries()) {
      if (!agentId.trim() || activeCount <= 0) continue;
      if (!allowUnknownAgents && !configuredAgentKeys.has(normalizeLookupKey(agentId))) continue;
      agentIds.add(agentId.trim());
    }
    const avatarIdentityByKey = buildAgentAnimalIdentityMap([...agentIds]);
    const tasksBySession = new Map();
    for (const task of tasks) {
      for (const sessionKey of task.sessionKeys) {
        const current = tasksBySession.get(sessionKey) ?? [];
        current.push(task);
        tasksBySession.set(sessionKey, current);
      }
    }
    const cards = [...agentIds].map((agentId) => {
      const sessions = snapshot.sessions.filter((session) => session.agentId === agentId);
      const runtimeActiveSessions = Math.max(0, runtimeActiveSessionsByAgent.get(agentId) ?? 0);
      const snapshotActiveSessions = sessions.filter((session) => session.state !== "idle").length;
      const activeSessions = Math.max(snapshotActiveSessions, runtimeActiveSessions);
      const ownedActiveTasks = tasks.filter((task) => task.owner.toLowerCase() === agentId.toLowerCase() && task.status !== "done");
      const sessionTaskSet = new Map();
      for (const session of sessions) {
        const linked = tasksBySession.get(session.sessionKey) ?? [];
        for (const task of linked) {
          if (task.status === "done") continue;
          sessionTaskSet.set(`${task.projectId}:${task.taskId}`, task);
        }
      }
      const sessionActiveTasks = [...sessionTaskSet.values()];
      const focusItems = [...sessionActiveTasks.map((task) => task.title), ...ownedActiveTasks.map((task) => task.title)].filter(
        (value, idx, arr) => arr.indexOf(value) === idx,
      );
      const status = resolveOfficeCardStatus(sessions.map((item) => item.state), activeSessions, focusItems.length);
      const statusLabel = officeStatusLabel(status, language);
      const officeZone = officeZoneFromStatus(status);
      const summary = buildOfficeSummary(status, focusItems, activeSessions, language);
      return {
        agentId,
        identity: avatarIdentityByKey.get(normalizeLookupKey(agentId)) ?? deriveAgentAnimalIdentity(agentId),
        status,
        statusLabel,
        officeZone,
        activeSessions,
        activeTasks: focusItems.length,
        focusItems: focusItems.slice(0, 3),
        summary,
      };
    });
    return cards.sort((a, b) => {
      const hierarchyRank = agentHierarchyRank(a.agentId) - agentHierarchyRank(b.agentId);
      if (hierarchyRank !== 0) return hierarchyRank;
      const rank = officeStatusRank(a.status) - officeStatusRank(b.status);
      if (rank !== 0) return rank;
      return compareAgentHierarchy(a.agentId, b.agentId);
    });
  }

  function inferCronOwnerAgentIdsFromSessions(sessions) {
    const owners = new Map();
    for (const session of sessions) {
      const sessionKey = session.sessionKey?.trim();
      const agentId = session.agentId?.trim();
      if (!sessionKey || !agentId) continue;
      const jobId = extractCronJobIdFromSessionKey(sessionKey);
      if (!jobId) continue;
      const key = jobId.trim().toLowerCase();
      if (!owners.has(key)) owners.set(key, agentId);
    }
    return owners;
  }

  function buildExecutionAgentSummaries(snapshot, tasks, cronJobs, rosterEntries, usageAgentTokensByKey) {
    const configuredRosterKeys = new Set(rosterEntries.map((entry) => normalizeLookupKey(entry.agentId)).filter((key) => key.length > 0));
    const allowUnknownAgents = configuredRosterKeys.size === 0;
    const canonicalIdByKey = new Map();
    const displayNameByKey = new Map();
    const cronOwnerByJobId = inferCronOwnerAgentIdsFromSessions(snapshot.sessions);
    const registerAgent = (agentId, displayName) => {
      const normalized = agentId.trim();
      if (!normalized) return;
      const key = normalizeLookupKey(normalized);
      if (!allowUnknownAgents && !configuredRosterKeys.has(key)) return;
      if (!canonicalIdByKey.has(key)) canonicalIdByKey.set(key, normalized);
      if (!displayNameByKey.has(key)) displayNameByKey.set(key, displayName?.trim() || humanizeOperatorLabel(normalized));
    };
    for (const entry of rosterEntries) registerAgent(entry.agentId, entry.displayName);
    for (const session of snapshot.sessions) if (session.agentId?.trim()) registerAgent(session.agentId);
    for (const job of cronJobs) {
      const ownerAgentId = job.ownerAgentId?.trim() || cronOwnerByJobId.get(job.jobId.trim().toLowerCase());
      if (ownerAgentId) registerAgent(ownerAgentId);
    }
    for (const key of usageAgentTokensByKey.keys()) registerAgent(key);
    const activeSessionCountByKey = new Map();
    for (const session of snapshot.sessions) {
      if (!session.agentId?.trim() || session.state === "idle") continue;
      const key = normalizeLookupKey(session.agentId);
      if (!allowUnknownAgents && !configuredRosterKeys.has(key)) continue;
      activeSessionCountByKey.set(key, (activeSessionCountByKey.get(key) ?? 0) + 1);
    }
    const activeTaskCountByKey = new Map();
    for (const task of tasks) {
      if (task.status === "done") continue;
      const owner = task.owner.trim();
      if (!owner) continue;
      const key = normalizeLookupKey(owner);
      if (!allowUnknownAgents && !configuredRosterKeys.has(key)) continue;
      activeTaskCountByKey.set(key, (activeTaskCountByKey.get(key) ?? 0) + 1);
    }
    const enabledCronNamesByKey = new Map();
    for (const job of cronJobs) {
      if (!job.enabled) continue;
      const ownerAgentId = job.ownerAgentId?.trim() || cronOwnerByJobId.get(job.jobId.trim().toLowerCase());
      if (!ownerAgentId) continue;
      const key = normalizeLookupKey(ownerAgentId);
      if (!allowUnknownAgents && !configuredRosterKeys.has(key)) continue;
      const bucket = enabledCronNamesByKey.get(key) ?? [];
      bucket.push(job.name);
      enabledCronNamesByKey.set(key, bucket);
    }
    const rows = [];
    for (const [key, agentId] of canonicalIdByKey.entries()) {
      const cronNames = [...new Set((enabledCronNamesByKey.get(key) ?? []).map((item) => item.trim()).filter(Boolean))];
      rows.push({
        agentId,
        displayName: displayNameByKey.get(key) ?? humanizeOperatorLabel(agentId),
        activeSessions: activeSessionCountByKey.get(key) ?? 0,
        activeTasks: activeTaskCountByKey.get(key) ?? 0,
        enabledCronJobs: cronNames.length,
        cronJobNames: cronNames,
        recentTokens30d: usageAgentTokensByKey.get(key) ?? 0,
      });
    }
    return rows.sort((a, b) => {
      const hierarchyRank = agentHierarchyRank(a.agentId) - agentHierarchyRank(b.agentId);
      if (hierarchyRank !== 0) return hierarchyRank;
      const loadA = a.activeSessions + a.activeTasks + a.enabledCronJobs;
      const loadB = b.activeSessions + b.activeTasks + b.enabledCronJobs;
      if (loadB !== loadA) return loadB - loadA;
      if (b.recentTokens30d !== a.recentTokens30d) return b.recentTokens30d - a.recentTokens30d;
      return compareAgentHierarchy(a.agentId, b.agentId);
    });
  }

  function buildTaskRoleSummaries(tasks) {
    const buckets = new Map();
    for (const task of tasks) {
      if (task.status === "done") continue;
      const owner = task.owner.trim() || "Unassigned";
      const key = normalizeLookupKey(owner);
      const current = buckets.get(key) ?? { owner, activeTasks: 0, sampleTaskIds: [] };
      current.activeTasks += 1;
      if (current.sampleTaskIds.length < 3 && !current.sampleTaskIds.includes(task.taskId)) current.sampleTaskIds.push(task.taskId);
      buckets.set(key, current);
    }
    return [...buckets.values()].sort((a, b) => {
      if (b.activeTasks !== a.activeTasks) return b.activeTasks - a.activeTasks;
      return a.owner.localeCompare(b.owner);
    });
  }

  function staffStatusLabel(status, language = "zh") {
    switch (status) {
      case "running": return pickUiText(language, "Working", "工作中");
      case "waiting_approval": return pickUiText(language, "Awaiting review", "等待审核");
      case "blocked": return pickUiText(language, "Needs support", "需要支援");
      case "error": return pickUiText(language, "Needs attention", "需要关注");
      case "mixed": return pickUiText(language, "Handling mixed work", "处理中");
      case "idle":
      case "inactive":
      default: return pickUiText(language, "Standing by", "待命");
    }
  }

  function resolveStaffStatusDotTone(status) {
    switch (status) {
      case "running":
      case "waiting_approval": return "working";
      case "blocked":
      case "error":
      case "mixed": return "issue";
      case "idle":
      case "inactive":
      default: return "idle";
    }
  }

  function staffStatusDotLabel(tone, language = "zh") {
    if (tone === "working") return pickUiText(language, "Working", "工作中");
    if (tone === "issue") return pickUiText(language, "Issue detected", "出现故障");
    return pickUiText(language, "Idle", "暂时闲置");
  }

  function staffCurrentWorkLabel(input) {
    const { office, execution, language } = input;
    const currentLabel = pickUiText(language, "Working on", "正在处理什么");
    const nextLabel = pickUiText(language, "Next up", "下一项");
    const focus = office?.focusItems[0]?.trim();
    if (office?.status === "waiting_approval") return { label: currentLabel, value: pickUiText(language, "Waiting for approval", "等待审批") };
    if (office?.status === "blocked" || office?.status === "error") {
      return { label: currentLabel, value: pickUiText(language, "Blocked and waiting for support", "阻塞中，等待支援") };
    }
    const cronName = execution?.cronJobNames.find((name) => name.trim())?.trim();
    if (office?.status === "running") {
      if (focus) return { label: currentLabel, value: focus };
      if (cronName) return { label: currentLabel, value: safeTruncate(cronName, 72) };
      if ((office?.activeSessions ?? 0) > 0) return { label: currentLabel, value: pickUiText(language, "Handling a live session", "正在处理实时会话") };
      return { label: currentLabel, value: pickUiText(language, "Handling active work", "正在处理当前工作") };
    }
    if (focus) return { label: nextLabel, value: focus };
    if (cronName) return { label: nextLabel, value: safeTruncate(cronName, 72) };
    return { label: currentLabel, value: pickUiText(language, "No live work right now", "当前无实时任务") };
  }

  function uniqueAgentTeamArtifacts(items) {
    const output = [];
    const seen = new Set();
    for (const item of items) {
      if (!item?.file) continue;
      const key = item.file.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      output.push(item);
    }
    return output;
  }

  function agentTeamTimelineItemMatchesAgent(item, agentKey) {
    const stageKey = normalizeLookupKey(item.stage ?? "");
    if (stageKey && stageKey === agentKey) return true;
    const detail = normalizeLookupKey(item.detail ?? "");
    return agentKey.length > 2 && detail.includes(agentKey);
  }

  function agentTeamArtifactMatchesAgent(artifact, agentKey) {
    const stageKey = normalizeLookupKey(artifact.sourceRole ?? artifact.stage ?? "");
    if (stageKey && stageKey === agentKey) return true;
    const fileKey = normalizeLookupKey(basename(artifact.file));
    return agentKey.length > 2 && fileKey.includes(agentKey);
  }

  function toSortableRuntimeTimestamp(value) {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function compareAgentTeamTimelineItemsByLatest(left, right) {
    const byTime = toSortableRuntimeTimestamp(right.timestamp) - toSortableRuntimeTimestamp(left.timestamp);
    if (byTime !== 0) return byTime;
    return (right.detail ?? "").localeCompare(left.detail ?? "");
  }

  function compareAgentTeamArtifactsByLatest(left, right) {
    const byTime = toSortableRuntimeTimestamp(right.updatedAt) - toSortableRuntimeTimestamp(left.updatedAt);
    if (byTime !== 0) return byTime;
    return right.file.localeCompare(left.file);
  }

  function describeAgentTeamStage(stage, language) {
    const key = normalizeLookupKey(stage ?? "");
    if (!key) return void 0;
    if (key === "main") return pickUiText(language, "Jarvis orchestration", "Jarvis 主控");
    if (key === "dispatcher") return pickUiText(language, "dispatch planning", "调度拆解");
    if (key === "architect") return pickUiText(language, "architecture", "架构设计");
    if (key === "backend") return pickUiText(language, "backend delivery", "后端实现");
    if (key === "frontend") return pickUiText(language, "frontend delivery", "前端交付");
    if (key === "qa") return pickUiText(language, "quality validation", "质量验证");
    if (key === "ops") return pickUiText(language, "release operations", "上线运维");
    if (key === "heart-rate-monitor" || key === "heartratemonitor" || key === "heartbeatmonitor" || key === "heartbeat" || key === "watchdog" || key === "monitor") {
      return pickUiText(language, "heartbeat supervision", "心跳监控");
    }
    return safeTruncate(stage?.trim() ?? "", 24) || void 0;
  }

  function formatAgentTeamTimelineRecentOutput(item, language) {
    const stageLabel = describeAgentTeamStage(item.stage, language);
    if (normalizeLookupKey(item.kind ?? "") === "stage_validated" && stageLabel) {
      return pickUiText(language, `${stageLabel} cleared the latest team-run checkpoint.`, `最近完成了${stageLabel}阶段校验。`);
    }
    if (stageLabel) {
      return pickUiText(language, `Latest team run progressed in ${stageLabel}.`, `最近团队运行推进到了${stageLabel}阶段。`);
    }
    return pickUiText(language, "Recently contributed to the latest team run.", "最近参与过一次团队运行。");
  }

  function formatAgentTeamArtifactRecentOutput(artifact, run, language) {
    const stageLabel = describeAgentTeamStage(artifact.sourceRole ?? artifact.stage, language);
    const hasWarnings = (run?.warningCount ?? 0) > 0 || normalizeLookupKey(run?.status ?? "") === "attention";
    if (stageLabel && hasWarnings) {
      return pickUiText(language, `${stageLabel} delivered a run artifact and left follow-up notes.`, `最近提交了${stageLabel}阶段交付物，并留下了后续跟进项。`);
    }
    if (stageLabel) {
      return pickUiText(language, `${stageLabel} delivered a team-run artifact.`, `最近提交了${stageLabel}阶段交付物。`);
    }
    return pickUiText(language, "Recently delivered a team-run artifact.", "最近提交过一次团队运行交付物。");
  }

  function buildStaffRecentActivityFallbackFromAgentTeamEmbed(embed, agentIds, language) {
    const output = new Map();
    if (!embed.available || agentIds.length === 0) return output;
    const timeline = [...embed.timeline].sort(compareAgentTeamTimelineItemsByLatest);
    const artifacts = uniqueAgentTeamArtifacts([embed.previewArtifact, ...embed.artifacts]).sort(compareAgentTeamArtifactsByLatest);
    const fallbackRun = embed.focusedRun ?? embed.runs[0];
    for (const agentId of agentIds) {
      const key = normalizeLookupKey(agentId);
      if (!key || output.has(key)) continue;
      const recentTimeline = timeline.find((item) => agentTeamTimelineItemMatchesAgent(item, key));
      if (recentTimeline) {
        output.set(key, { recentOutput: formatAgentTeamTimelineRecentOutput(recentTimeline, language), recentOutputAt: recentTimeline.timestamp });
        continue;
      }
      const recentArtifact = artifacts.find((item) => agentTeamArtifactMatchesAgent(item, key));
      if (recentArtifact) {
        output.set(key, {
          recentOutput: formatAgentTeamArtifactRecentOutput(recentArtifact, fallbackRun, language),
          recentOutputAt: recentArtifact.updatedAt ?? fallbackRun?.updatedAt,
        });
      }
    }
    return output;
  }

  function sanitizeStaffOutputContent(content) {
    let normalized = normalizeInlineText(content);
    if (!normalized) return normalized;
    normalized = normalized.replace(/^\[\[reply_to_current\]\]\s*/i, "");
    normalized = normalized.replace(/^\[[^\]]+\]\s*/, "");
    normalized = normalized.replace(/^warning:\s*background execution is disabled; running synchronously\.\s*/i, "");
    return normalized.trim();
  }

  function isExplicitStopSignalMessage(message) {
    const content = sanitizeStaffOutputContent(message.content);
    if (!content) return false;
    const lower = content.toLowerCase();
    return lower.includes("停止当前任务并进入待命状态") || lower.includes("立即停止你当前的所有活动") || lower.includes("stop current task and enter standby") || lower.includes("不再继续当前") || lower.includes("不再处理任何当前任务") || lower.includes("从现在起进入待命状态") || lower.includes("enter standby state");
  }

  function isResidualPostStopMessage(message) {
    if (message.kind === "tool_event") return false;
    const content = sanitizeStaffOutputContent(message.content);
    if (!content) return true;
    const lower = content.toLowerCase();
    return lower === "reply_skip" || lower === "announce_skip" || lower.startsWith("thinking ") || lower.startsWith("reasoning ") || lower.includes("agent-to-agent announce step");
  }

  function isStaffVisibleOutputMessage(message) {
    if (message.kind === "accepted" || message.kind === "spawn") return false;
    if (message.kind === "tool_event") return true;
    const role = message.role.trim().toLowerCase();
    if (role === "user" || role === "system") return false;
    if (isExplicitStopSignalMessage(message)) return false;
    const content = sanitizeStaffOutputContent(message.content);
    if (!content) return false;
    const lower = content.toLowerCase();
    if (lower === "no_reply" || lower === "noop") return false;
    if (lower === "reply_skip" || lower === "announce_skip") return false;
    if (lower.startsWith("thinking ")) return false;
    if (lower.startsWith("reasoning ")) return false;
    if (lower.startsWith("text msg_")) return false;
    if (lower.startsWith("toolcall ")) return false;
    if (lower.includes("agent-to-agent announce step")) return false;
    if (lower.includes('"encrypted_content"')) return false;
    if (lower.includes("openclaw runtime context (internal)")) return false;
    if (lower.includes("conversation info (untrusted metadata)")) return false;
    if (lower.includes("internal_write_only")) return false;
    if (lower.includes("read heartbeat.md if it exists")) return false;
    if (content.includes("继续推进当前目标")) return false;
    if (content.includes("Alex Finn 流程最终验收")) return false;
    return true;
  }

  function formatStaffRecentOutput(message, language) {
    if (message.kind === "tool_event") {
      return message.toolName?.trim()
        ? pickUiText(language, `Completed tool step: ${message.toolName}.`, `最近完成工具步骤：${message.toolName}。`)
        : pickUiText(language, "Completed a recent tool step.", "最近完成一次工具步骤。");
    }
    const content = sanitizeStaffOutputContent(message.content);
    if (!content) return pickUiText(language, "No recent output yet.", "最近暂无产出。");
    if (content === "NOOP") return pickUiText(language, "Recent check completed with no action needed.", "最近完成一次检查，无需动作。");
    if (content === "NO_REPLY") return pickUiText(language, "Recent task completed without a user reply.", "最近完成一次任务，无需额外回复。");
    if (content.toLowerCase().startsWith("successfully wrote ")) {
      return pickUiText(language, "Updated a memory or workspace file.", "最近更新了一份记忆或工作文件。");
    }
    if (content.startsWith("{") || content.startsWith("[") || content.startsWith("```json") || content.includes('{"ok":') || content.includes('"message_id"')) {
      return pickUiText(language, "Recent task completed and returned a structured result.", "最近完成一次任务，并返回结构化结果。");
    }
    return safeTruncate(content, 88);
  }

  function pickRecentStaffActivity(history, language) {
    for (let idx = history.length - 1; idx >= 0; idx -= 1) {
      const message = history[idx];
      if (!isStaffVisibleOutputMessage(message)) continue;
      return { recentOutput: formatStaffRecentOutput(message, language), recentOutputAt: message.timestamp };
    }
    return void 0;
  }

  function historyImpliesStaffStopped(history) {
    for (let idx = history.length - 1; idx >= 0; idx -= 1) {
      const message = history[idx];
      if (isResidualPostStopMessage(message)) continue;
      if (isExplicitStopSignalMessage(message)) return true;
      return false;
    }
    return false;
  }

  function compareSessionSummariesByLatest(a, b) {
    const left = Date.parse(a.lastMessageAt ?? "");
    const right = Date.parse(b.lastMessageAt ?? "");
    const leftMs = Number.isNaN(left) ? 0 : left;
    const rightMs = Number.isNaN(right) ? 0 : right;
    if (leftMs !== rightMs) return rightMs - leftMs;
    return a.sessionKey.localeCompare(b.sessionKey);
  }

  function dedupeModelOptionsForCard(currentModel, options) {
    const merged = new Map();
    const currentValues = Array.isArray(currentModel) ? currentModel : [currentModel];
    for (const value of currentValues) {
      const normalizedCurrent = String(value || "").trim();
      if (!normalizedCurrent || merged.has(normalizedCurrent)) continue;
      merged.set(normalizedCurrent, { value: normalizedCurrent, label: normalizedCurrent });
    }
    for (const option of options) {
      const value = option.value.trim();
      if (!value || merged.has(value)) continue;
      merged.set(value, option);
    }
    return [...merged.values()];
  }

  function renderAgentAvatarFrame(input) {
    const avatarClassName = [input.className, input.extraClassName?.trim(), input.identity.imageHref ? "has-photo" : ""].filter(Boolean).join(" ");
    const stageContent = input.identity.imageHref
      ? `<img class="agent-photo-image" src="${input.escapeHtml(input.identity.imageHref)}" alt="" loading="eager" decoding="async" />`
      : `<canvas class="agent-pixel-canvas" width="${input.canvasWidth}" height="${input.canvasHeight}"></canvas>`;
    const animalLabelHtml = input.showAnimalLabel ? `<div class="agent-animal-label">${input.escapeHtml(animalLabel(input.identity.animal, input.language ?? "zh"))}</div>` : "";
    const ariaLabelAttr = input.ariaLabel?.trim() ? ` aria-label="${input.escapeHtml(input.ariaLabel)}"` : "";
    return `<div class="${avatarClassName}" style="--agent-accent:${input.escapeHtml(input.identity.accent)};" data-agent-id="${input.escapeHtml(input.agentId)}" data-animal="${input.escapeHtml(input.identity.animal)}"${ariaLabelAttr}>
    <div class="agent-stage" aria-hidden="true">
      ${stageContent}
    </div>
    ${animalLabelHtml}
  </div>`;
  }

  return {
    agentTeamArtifactMatchesAgent,
    agentTeamTimelineItemMatchesAgent,
    animalLabel,
    buildAgentAnimalIdentityMap,
    buildExecutionAgentSummaries,
    buildOfficeAgentRosterIds,
    buildOfficeSpaceCards,
    buildStaffRecentActivityFallbackFromAgentTeamEmbed,
    buildTaskRoleSummaries,
    compareAgentTeamArtifactsByLatest,
    compareAgentTeamTimelineItemsByLatest,
    compareSessionSummariesByLatest,
    dedupeModelOptionsForCard,
    describeAgentTeamStage,
    deriveAgentAnimalIdentity,
    formatAgentTeamArtifactRecentOutput,
    formatAgentTeamTimelineRecentOutput,
    formatStaffRecentOutput,
    historyImpliesStaffStopped,
    isExplicitStopSignalMessage,
    isResidualPostStopMessage,
    isStaffVisibleOutputMessage,
    officeZoneLabel,
    pickRecentStaffActivity,
    renderAgentAvatarFrame,
    resolveOfficeCardStatus,
    resolveStaffStatusDotTone,
    sanitizeStaffOutputContent,
    staffCurrentWorkLabel,
    staffStatusDotLabel,
    staffStatusLabel,
    toSortableRuntimeTimestamp,
    uniqueAgentTeamArtifacts,
  };
}

export { createOfficeRuntimeHelpers };
