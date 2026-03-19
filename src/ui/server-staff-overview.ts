// @ts-nocheck

function createStaffOverviewHelpers(deps) {
  const {
    defaultPrimaryOperatorDisplayName,
    extractLabeledField,
    joinPath,
    normalizeEvidenceText,
    normalizeLookupKey,
    openclawConfigDir,
    openclawConfigPath,
    openclawCronJobsCandidates,
    openclawWorkspaceRoot,
    pickUiText,
    resolvePath,
    safeReadTextFile,
    staffRoleEvidenceFileCandidates,
  } = deps;

  function resolveStaffWorkspaceRoot(member) {
    const key = normalizeLookupKey(member.agentId);
    if (key === "main") return openclawWorkspaceRoot;
    const workspace = member.workspace.trim();
    if (workspace && workspace !== "未标注" && workspace !== "unlisted") {
      return resolvePath(openclawConfigDir, workspace);
    }
    return joinPath(openclawWorkspaceRoot, "agents", member.agentId);
  }

  async function loadStaffRoleEvidence(member) {
    const output = [];
    const workspaceRoot = resolveStaffWorkspaceRoot(member);
    for (const fileName of staffRoleEvidenceFileCandidates) {
      const raw = await safeReadTextFile(joinPath(workspaceRoot, fileName));
      if (raw?.trim()) output.push(raw);
    }
    const openclawConfig = await safeReadTextFile(openclawConfigPath);
    if (openclawConfig?.trim()) output.push(openclawConfig);
    for (const candidate of openclawCronJobsCandidates) {
      const cronJobs = await safeReadTextFile(candidate);
      if (cronJobs?.trim()) {
        output.push(cronJobs);
        break;
      }
    }
    return output;
  }

  function resolveCoreTeamDutyLabel(agentId, language = "zh") {
    switch (normalizeLookupKey(agentId)) {
      case "main":
      case "jarvis":
        return pickUiText(language, "Team lead", "总协调中枢");
      case "dispatcher":
      case "productdispatcher":
      case "product":
        return pickUiText(language, "Task dispatch", "任务编排");
      case "architect":
      case "architecture":
        return pickUiText(language, "System design", "架构设计");
      case "backend":
      case "api":
      case "server":
        return pickUiText(language, "Backend build", "后端实现");
      case "frontend":
      case "ui":
      case "client":
        return pickUiText(language, "Frontend UI", "前端交互");
      case "qa":
      case "quality":
      case "test":
        return pickUiText(language, "QA review", "质量验收");
      case "ops":
      case "devops":
      case "release":
      case "sre":
        return pickUiText(language, "Release ops", "发布运维");
      default:
        return void 0;
    }
  }

  async function resolveStaffRoleLabel(member, language = "zh") {
    const coreTeamDutyLabel = resolveCoreTeamDutyLabel(member.agentId, language);
    if (coreTeamDutyLabel) {
      return coreTeamDutyLabel;
    }
    const roleEvidence = await loadStaffRoleEvidence(member);
    const combined = roleEvidence.join("\n");
    const normalized = normalizeEvidenceText(combined);
    const explicitRole =
      roleEvidence
        .map((entry) => extractLabeledField(entry, ["Role", "职责", "角色"]))
        .find((value) => value && value.trim().length > 0) ?? "";
    const explicitMission =
      roleEvidence
        .map((entry) => extractLabeledField(entry, ["Mission", "任务", "目标"]))
        .find((value) => value && value.trim().length > 0) ?? "";
    const key = normalizeLookupKey(member.agentId);
    if (
      key === "monkey" &&
      (normalized.includes("youtube-to-article") ||
        combined.includes("把 YouTube 视频转成增值长文章") ||
        combined.includes("YouTube 视频转成增值长文章"))
    ) {
      return pickUiText(language, "YouTube to article writing", "YouTube 视频转长文");
    }
    if (
      key === "dolphin" &&
      (normalized.includes("value_add_creator") ||
        combined.includes("高价值、可直接发布的最终内容") ||
        combined.includes("增值型创作者"))
    ) {
      return pickUiText(language, "High-value content creation", "高价值内容创作");
    }
    if (
      key === "pandas" &&
      (normalized.includes("control-center project end-to-end") ||
        normalized.includes("control center project end to end") ||
        combined.includes("控制中心") ||
        combined.includes("唯一主任务"))
    ) {
      return pickUiText(language, "Control Center delivery", "控制中心开发与交付");
    }
    if (
      key === "coq" &&
      (combined.includes("Coq-每日新闻") ||
        normalized.includes("morning research") ||
        normalized.includes("trend report") ||
        combined.includes("每日报告"))
    ) {
      return pickUiText(language, "Daily news and trend briefings", "每日情报与趋势简报");
    }
    if (
      key === "otter" &&
      (combined.includes("晨报") ||
        combined.includes("邮箱提醒") ||
        normalized.includes("calendar") ||
        normalized.includes("weather") ||
        normalized.includes("assistant"))
    ) {
      return pickUiText(language, "Personal assistance and reminders", "私人助理与提醒");
    }
    if (
      key === "tiger" &&
      (normalized.includes("tiger-security") ||
        normalized.includes("security-audit") ||
        normalized.includes("update-status") ||
        (normalized.includes("security") && normalized.includes("update")) ||
        (combined.includes("安全") && combined.includes("更新")))
    ) {
      return pickUiText(language, "Security and updates", "安全和更新");
    }
    if (
      key === "main" &&
      (combined.includes("Lion") ||
        normalized.includes("lion bot account") ||
        normalized.includes("assistant name: lion") ||
        combined.includes("指挥官"))
    ) {
      return pickUiText(
        language,
        `${defaultPrimaryOperatorDisplayName} control and coordination`,
        `${defaultPrimaryOperatorDisplayName} 主控与协调`,
      );
    }
    if (key === "codex" || normalized.includes("codex")) {
      return pickUiText(language, "Coding automation", "自动化编码执行");
    }
    const explicit = `${explicitRole} ${explicitMission}`.trim();
    if (explicit && (normalizeEvidenceText(explicit).includes("youtube") || normalizeEvidenceText(explicit).includes("article"))) {
      return pickUiText(language, "YouTube to article writing", "YouTube 视频转长文");
    }
    if (explicit && (normalizeEvidenceText(explicit).includes("control-center") || explicit.includes("控制中心"))) {
      return pickUiText(language, "Control Center delivery", "控制中心开发与交付");
    }
    if (explicit && (normalizeEvidenceText(explicit).includes("news") || explicit.includes("日报") || explicit.includes("简报"))) {
      return pickUiText(language, "Daily news and trend briefings", "每日情报与趋势简报");
    }
    if (explicit && (normalizeEvidenceText(explicit).includes("assistant") || explicit.includes("提醒"))) {
      return pickUiText(language, "Personal assistance and reminders", "私人助理与提醒");
    }
    if (explicit && (normalizeEvidenceText(explicit).includes("security") || explicit.includes("安全"))) {
      return pickUiText(language, "Security and updates", "安全和更新");
    }
    if (explicit) {
      return explicit;
    }
    return pickUiText(language, "Role not defined in workspace", "工作区里还没有定义这个角色");
  }

  return {
    loadStaffRoleEvidence,
    resolveCoreTeamDutyLabel,
    resolveStaffRoleLabel,
    resolveStaffWorkspaceRoot,
  };
}

export { createStaffOverviewHelpers };
