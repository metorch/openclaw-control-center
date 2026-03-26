// @ts-nocheck

const {
  badge,
  escapeHtml,
  formatInt,
  formatTimeAgoFromNow,
  pickUiText,
  safeTruncate,
} = require("./server-shared");
const { buildSessionLinkAttrs } = require("./server-session-room-links");

function createInsightRenderers(deps) {
  const {
    buildSessionDetailHref,
    buildTaskDetailHref,
    dataConnectionLabel,
    hasFreshRuntimeTimestamp,
    humanizeOperatorLabel,
    normalizeInlineText,
    pickLatestSessionActivityTimestamp,
    pickLatestTimestamp,
    simplifyUsageLabel,
    TASK_RUNTIME_ACTIVITY_WINDOW_MS,
    toSortableMs,
  } = deps;

  function insightStatusLabel(status, language) {
    if (status === "ok") return pickUiText(language, "Healthy", "正常");
    if (status === "warn") return pickUiText(language, "Attention", "需关注");
    if (status === "blocked") return pickUiText(language, "Blocked", "阻塞");
    if (status === "info") return pickUiText(language, "Partial", "部分可用");
    return pickUiText(language, "Unknown", "未知");
  }

  function connectorInsightStatus(snapshot, language) {
    const statuses = [
      snapshot.connectors.modelContextCatalog,
      snapshot.connectors.digestHistory,
      snapshot.connectors.requestCounts,
      snapshot.connectors.budgetLimit,
      snapshot.connectors.providerAttribution,
      snapshot.connectors.subscriptionUsage,
    ];
    const totalCount = statuses.length;
    const connectedCount = statuses.filter((item) => item === "connected").length;
    const partialCount = statuses.filter((item) => item === "partial").length;
    const missingCount = totalCount - connectedCount;

    const connectorGapLabel = (id) => {
      if (id === "subscription_usage") return pickUiText(language, "subscription or billing snapshot", "订阅或账单快照");
      if (id === "cost_budget_limit") return pickUiText(language, "budget limit", "预算上限");
      if (id === "request_counter") return pickUiText(language, "request counts", "请求计数");
      if (id === "digest_history") return pickUiText(language, "trend history", "趋势历史");
      if (id === "context_catalog") return pickUiText(language, "context capacity", "上下文容量");
      if (id === "provider_mapping") return pickUiText(language, "provider mapping", "模型归因映射");
      return pickUiText(language, "usage data", "用量数据");
    };

    const connectorGapImpact = (id) => {
      if (id === "subscription_usage") {
        return pickUiText(language, "Quota windows will remain estimated or disconnected.", "额度窗口会继续显示估算值或未连接状态。");
      }
      if (id === "cost_budget_limit") {
        return pickUiText(language, "Budget risk can only be judged from spend so far.", "预算风险只能按已花费用粗略判断。");
      }
      if (id === "request_counter") {
        return pickUiText(language, "Request counts and part of the trend view will stay incomplete.", "请求次数和部分趋势视图会继续不完整。");
      }
      if (id === "digest_history") {
        return pickUiText(language, "7d / 30d trends will stay incomplete.", "7 天 / 30 天趋势会继续不完整。");
      }
      if (id === "context_catalog") {
        return pickUiText(language, "Context pressure will miss full capacity data.", "上下文压力会缺少完整容量数据。");
      }
      if (id === "provider_mapping") {
        return pickUiText(language, "Some usage will still fall under unknown provider.", "部分用量仍会落到“未知供应商”。");
      }
      return pickUiText(language, "Some usage panels will stay incomplete.", "部分用量面板仍会不完整。");
    };

    const connectorGapAction = (id) => {
      if (id === "subscription_usage") {
        return pickUiText(language, "Open Settings and connect the subscription or billing source.", "去设置页补上订阅或账单数据源。");
      }
      if (id === "cost_budget_limit") {
        return pickUiText(language, "Open Settings and add a budget limit.", "去设置页补上预算上限。");
      }
      if (id === "request_counter") {
        return pickUiText(language, "Open Settings and connect request-count data.", "去设置页接入请求计数数据。");
      }
      if (id === "digest_history") {
        return pickUiText(language, "Keep monitoring running or complete the history source in Settings.", "保持监控运行，或去设置页补齐历史数据源。");
      }
      if (id === "context_catalog") {
        return pickUiText(language, "Open Settings and connect model context capacity data.", "去设置页接入模型上下文容量数据。");
      }
      if (id === "provider_mapping") {
        return pickUiText(language, "Open Settings and complete the model-to-provider mapping.", "去设置页补齐模型到供应商的映射。");
      }
      return pickUiText(language, "Open Settings and finish the remaining data connections.", "去设置页补齐剩余数据连接。");
    };

    if (connectedCount === totalCount) {
      return {
        status: "ok",
        connectedCount,
        totalCount,
        missingCount: 0,
        detail: pickUiText(language, "All six key usage sources are connected.", "6 项关键用量源已全部接通。"),
        value: pickUiText(language, "Complete", "完整"),
      };
    }

    if (connectedCount === 0 && partialCount === 0) {
      return {
        status: "blocked",
        connectedCount,
        totalCount,
        missingCount,
        detail: pickUiText(language, "None of the six key usage sources are connected yet.", "6 项关键用量源都还没接通。"),
        value: pickUiText(language, "Needs setup", "待接入"),
      };
    }

    const firstGap = snapshot.connectors.todos?.[0];
    if (!firstGap) {
      return {
        status: "warn",
        connectedCount,
        totalCount,
        missingCount,
        detail: pickUiText(language, `${connectedCount} of ${totalCount} key usage sources are connected.`, `6 项关键用量源里，已接通 ${connectedCount} 项。`),
        value: pickUiText(language, `Missing ${missingCount}`, `差 ${missingCount} 项`),
      };
    }

    const gapLabel = connectorGapLabel(firstGap.id);
    return {
      status: "warn",
      connectedCount,
      totalCount,
      missingCount,
      detail: pickUiText(
        language,
        `${connectedCount} of ${totalCount} key usage sources are connected. Biggest gap: ${gapLabel}. ${connectorGapImpact(firstGap.id)} ${connectorGapAction(firstGap.id)}`,
        `6 项关键用量源里，已接通 ${connectedCount} 项。当前最大缺口是 ${gapLabel}。${connectorGapImpact(firstGap.id)}${connectorGapAction(firstGap.id)}`,
      ),
      value: pickUiText(language, `Missing ${missingCount}`, `差 ${missingCount} 项`),
    };
  }

  function localizeConnectionInsightValue(item, language) {
    if (item.value === "loading") return pickUiText(language, "Loading", "读取中");
    if (item.key === "gateway") {
      return item.status === "ok" ? pickUiText(language, "Connected", "已连接") : pickUiText(language, "Unavailable", "不可用");
    }
    if (item.key === "config") {
      return item.status === "ok" ? pickUiText(language, "Ready", "已就绪") : pickUiText(language, "Needs fix", "待修复");
    }
    return item.value;
  }

  function localizeConnectionInsightDetail(item, language) {
    if (item.key === "gateway") {
      if (item.detail === "Gateway status is still loading") {
        return pickUiText(language, "Gateway status is still loading.", "正在读取 Gateway 状态。");
      }
      return item.status === "ok" ? item.detail : pickUiText(language, "Gateway is not reachable.", "当前还无法连接到 Gateway。");
    }

    if (item.key === "config") {
      if (item.detail === "Config status is still loading") {
        return pickUiText(language, "Config status is still loading.", "正在读取配置状态。");
      }
      const allowedOriginsMatch = item.detail.match(/^(\d+) allowed origin/);
      if (allowedOriginsMatch) {
        const count = Number.parseInt(allowedOriginsMatch[1] ?? "0", 10);
        return pickUiText(language, `${count} allowed origin${count === 1 ? "" : "s"}`, `已配置 ${count} 个允许来源`);
      }
      if (item.detail === "Local-only by default") {
        return pickUiText(language, "Local-only by default.", "默认仅允许本机访问。");
      }
      return pickUiText(language, "openclaw.json is missing or invalid.", "openclaw.json 缺失或无效。");
    }

    const runtimeVisibleMatch = item.detail.match(/^(\d+) session(?:s)? visible across (\d+) agent/);
    if (runtimeVisibleMatch) {
      const sessionCount = Number.parseInt(runtimeVisibleMatch[1] ?? "0", 10);
      const agentCount = Number.parseInt(runtimeVisibleMatch[2] ?? "0", 10);
      return pickUiText(language, `${sessionCount} session${sessionCount === 1 ? "" : "s"} visible across ${agentCount} agent${agentCount === 1 ? "" : "s"}`, `已看到 ${sessionCount} 个会话，覆盖 ${agentCount} 个智能体`);
    }

    const configuredMatch = item.detail.match(/^(\d+) agent(?:s)? configured, but no recent sessions yet$/);
    if (configuredMatch) {
      const agentCount = Number.parseInt(configuredMatch[1] ?? "0", 10);
      return pickUiText(language, `${agentCount} agent${agentCount === 1 ? "" : "s"} configured, but no recent sessions yet`, `已配置 ${agentCount} 个智能体，但最近还没有会话`);
    }

    if (item.detail === "Runtime status is still loading") {
      return pickUiText(language, "Runtime status is still loading.", "正在读取运行时状态。");
    }

    return pickUiText(language, "No runtime sessions are visible yet.", "当前还没有可见的运行时会话。");
  }

  function localizeSecurityFinding(item, language) {
    if (language === "en") return { title: item.title, detail: item.detail, remediation: item.remediation };
    if (item.checkId === "summary.attack_surface") {
      return {
        title: "当前暴露面概览",
        detail: "当前环境更接近单人可信操作边界，而不是多人隔离环境；高权限工具与内部钩子仍可用。",
      };
    }
    if (item.checkId === "gateway.trusted_proxies_missing") {
      return {
        title: "反向代理信任未配置",
        detail: "如果你通过反向代理暴露控制中心，当前还没有声明可信代理来源，转发头信息可能被误信。",
        remediation: "如需继续通过反向代理访问，请把可信代理 IP 配到 gateway.trustedProxies；否则保持仅本机访问。",
      };
    }
    if (item.checkId === "gateway.tailscale_serve") {
      return {
        title: "Gateway 已通过 Tailscale Serve 暴露",
        detail: "当前 Gateway 已暴露到 tailnet，可访问范围不再只限于本机。",
      };
    }
    if (item.checkId === "security.trust_model.multi_user_heuristic") {
      return {
        title: "检测到可能的多人共享使用",
        detail: "当前环境看起来不只是单人自用，但 OpenClaw 默认更适合单一可信操作者，不适合同一 Gateway 多人混用。",
        remediation: "如果确实给多人使用，最好拆成独立 Gateway 或独立系统账户；至少先收紧沙箱、文件访问和高权限工具范围。",
      };
    }
    return { title: item.title, detail: item.detail, remediation: item.remediation };
  }

  function localizeUpdateChannelLabel(label, language) {
    if (!label) return "-";
    if (language === "en") return label;
    if (label === "stable (default)") return "稳定版（默认）";
    if (label === "stable") return "稳定版";
    if (label === "beta") return "测试版";
    if (label === "dev") return "开发版";
    return label;
  }

  function localizeUpdateInstallKind(kind, language) {
    if (!kind) return "-";
    if (language === "en") return kind;
    if (kind === "package") return "软件包";
    if (kind === "git") return "Git";
    return kind;
  }

  function localizeCurrentVersionValue(summary, language) {
    if (summary.currentVersion) return summary.currentVersion;
    if (summary.latestVersion) return pickUiText(language, "Loading", "读取中");
    return "-";
  }

  function mergeInsightStatuses(statuses) {
    const normalized = statuses.filter(Boolean);
    if (normalized.some((status) => status === "blocked")) return "blocked";
    if (normalized.some((status) => status === "warn")) return "warn";
    if (normalized.some((status) => status === "info")) return "info";
    return "ok";
  }

  function buildOpenClawConnectionState(summary, usageCost, language) {
    const usageSourceSummary = connectorInsightStatus(usageCost, language);
    const rows = [
      ...summary.items.map((item) => ({
        label:
          item.key === "gateway"
            ? pickUiText(language, "Gateway", "网关")
            : item.key === "config"
              ? pickUiText(language, "Config", "配置")
              : pickUiText(language, "Runtime", "运行时"),
        status: item.status,
        detail: localizeConnectionInsightDetail(item, language),
        value: localizeConnectionInsightValue(item, language),
      })),
      {
        label: pickUiText(language, "Usage sources", "用量数据"),
        status: usageSourceSummary.status,
        detail: usageSourceSummary.detail,
        value: usageSourceSummary.value,
      },
    ];
    const connectedCount = rows.filter((item) => item.status === "ok").length;
    const overallStatus = mergeInsightStatuses([summary.status, usageSourceSummary.status]);
    const headline =
      overallStatus === "ok"
        ? pickUiText(language, "Control Center is fully connected to this OpenClaw environment.", "控制中心已经完整接上这套 OpenClaw 环境。")
        : overallStatus === "blocked"
          ? pickUiText(language, "Some core links are still blocked.", "仍有关键连接没有打通。")
          : pickUiText(language, "Control Center is usable, but some panels are still in partial mode.", "控制中心已可用，但部分面板仍是半连通状态。");
    return { rows, connectedCount, overallStatus, headline };
  }

  function renderSettingsConnectionPanel(summary, usageCost, language) {
    if (!summary) {
      return `<section class="settings-status-panel" id="settings-connection-health">
      <div class="overview-command-head">
        <h3>${escapeHtml(pickUiText(language, "Connection health", "连接状态"))}</h3>
        <div>${badge("info", pickUiText(language, "Loading", "读取中"))}</div>
      </div>
      <div class="empty-state">${escapeHtml(pickUiText(language, "Connection signals are loading.", "正在读取连接状态。"))}</div>
    </section>`;
    }

    const connectionState = buildOpenClawConnectionState(summary, usageCost, language);
    return `<section class="settings-status-panel" id="settings-connection-health">
    <div class="overview-command-head">
      <div>
        <h3>${escapeHtml(pickUiText(language, "Connection health", "连接状态"))}</h3>
        <div class="meta">${escapeHtml(connectionState.headline)}</div>
      </div>
      <div>${badge(connectionState.overallStatus, insightStatusLabel(connectionState.overallStatus, language))}</div>
    </div>
    <div class="status-strip compact">
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Healthy links", "已接通"))}</span><strong>${connectionState.connectedCount}/${connectionState.rows.length}</strong></div>
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Updated", "更新"))}</span><strong>${escapeHtml(formatTimeAgoFromNow(summary.generatedAt, language))}</strong></div>
    </div>
    <div class="decision-list">${connectionState.rows.map((item) => `<div class="decision-row">
          <div class="decision-row-copy">
            <strong>${escapeHtml(item.label)}</strong>
            <div class="meta">${badge(item.status, insightStatusLabel(item.status, language))} ${escapeHtml(item.detail)}</div>
          </div>
          <div class="decision-row-value">${escapeHtml(item.value)}</div>
        </div>`).join("")}</div>
  </section>`;
  }

  function renderSettingsSecurityPanel(summary, language) {
    if (!summary) {
      return `<section class="settings-status-panel" id="security-risk-summary">
      <div class="overview-command-head">
        <h3>${escapeHtml(pickUiText(language, "Security risk summary", "安全风险摘要"))}</h3>
        <div>${badge("info", pickUiText(language, "Loading", "读取中"))}</div>
      </div>
      <div class="empty-state">${escapeHtml(pickUiText(language, "Security audit is loading.", "正在读取安全审计。"))}</div>
    </section>`;
    }

    const headline =
      summary.status === "blocked"
        ? pickUiText(language, "There are critical security issues to address.", "当前有需要立刻处理的安全风险。")
        : summary.status === "warn"
          ? pickUiText(language, "There are a few configuration risks worth reviewing.", "当前有几项配置风险值得检查。")
          : summary.status === "info"
            ? pickUiText(language, "Security looks stable, with informational notes only.", "当前整体安全稳定，仅有提示信息。")
            : pickUiText(language, "No actionable security risk is visible right now.", "当前没有需要处理的安全风险。");

    const findingsHtml =
      summary.findings.length === 0
        ? `<div class="empty-state">${escapeHtml(pickUiText(language, "No audit findings yet.", "当前没有审计结果。"))}</div>`
        : `<ul class="story-list">${summary.findings.slice(0, 4).map((item) => {
            const tone = item.severity === "critical" ? "blocked" : item.severity === "warn" ? "warn" : "info";
            const localized = localizeSecurityFinding(item, language);
            return `<li>${badge(tone, insightStatusLabel(tone, language))} <strong>${escapeHtml(localized.title)}</strong><div class="meta">${escapeHtml(safeTruncate(normalizeInlineText(localized.detail), 200))}</div>${localized.remediation ? `<div class="meta">${escapeHtml(pickUiText(language, "Next step", "下一步"))}：${escapeHtml(safeTruncate(normalizeInlineText(localized.remediation), 180))}</div>` : ""}</li>`;
          }).join("")}</ul>`;

    return `<section class="settings-status-panel" id="security-risk-summary">
    <div class="overview-command-head">
      <div>
        <h3>${escapeHtml(pickUiText(language, "Security risk summary", "安全风险摘要"))}</h3>
        <div class="meta">${escapeHtml(headline)}</div>
      </div>
      <div>${badge(summary.status, insightStatusLabel(summary.status, language))}</div>
    </div>
    <div class="status-strip compact">
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Critical", "高风险"))}</span><strong>${summary.counts.critical}</strong></div>
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Warnings", "需关注"))}</span><strong>${summary.counts.warn}</strong></div>
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Info", "提示"))}</span><strong>${summary.counts.info}</strong></div>
    </div>
    ${findingsHtml}
  </section>`;
  }

  function renderSettingsUpdatePanel(summary, language) {
    if (!summary) {
      return `<section class="settings-status-panel" id="update-status-card">
      <div class="overview-command-head">
        <h3>${escapeHtml(pickUiText(language, "Update status", "更新状态"))}</h3>
        <div>${badge("info", pickUiText(language, "Loading", "读取中"))}</div>
      </div>
      <div class="empty-state">${escapeHtml(pickUiText(language, "Update status is loading.", "正在读取更新状态。"))}</div>
    </section>`;
    }

    const headline = summary.updateAvailable
      ? pickUiText(language, "A newer OpenClaw version is available.", "发现了更新版本。")
      : pickUiText(language, "This OpenClaw runtime is already up to date.", "当前 OpenClaw 已是最新。");

    return `<section class="settings-status-panel" id="update-status-card">
    <div class="overview-command-head">
      <div>
        <h3>${escapeHtml(pickUiText(language, "Update status", "更新状态"))}</h3>
        <div class="meta">${escapeHtml(headline)}</div>
      </div>
      <div>${badge(summary.status, insightStatusLabel(summary.status, language))}</div>
    </div>
    <div class="status-strip compact">
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Current", "当前版本"))}</span><strong>${escapeHtml(localizeCurrentVersionValue(summary, language))}</strong></div>
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Latest", "最新版本"))}</span><strong>${escapeHtml(summary.latestVersion ?? "-")}</strong></div>
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Channel", "更新通道"))}</span><strong>${escapeHtml(localizeUpdateChannelLabel(summary.channelLabel, language))}</strong></div>
    </div>
    <div class="meta">${escapeHtml(pickUiText(language, "Install method", "安装方式"))} ${escapeHtml(localizeUpdateInstallKind(summary.installKind, language))} · ${escapeHtml(pickUiText(language, "Package manager", "包管理器"))} ${escapeHtml(summary.packageManager ?? "-")}</div>
  </section>`;
  }

  function renderSettingsDataConnectionsPanel(usageConnectorTodos, settingsBudgetLimitCard, language) {
    const t = (en, zh) => pickUiText(language, en, zh);
    const todosMarkup = String(usageConnectorTodos || "");
    const hasAllConnectedCopy = todosMarkup.includes("All usage connectors are enabled.") || todosMarkup.includes("所有用量连接器均已启用。");
    const todoCount = hasAllConnectedCopy ? 0 : Array.from(todosMarkup.matchAll(/<li\b/gi)).length;
    return `<section class="settings-status-panel" id="settings-data-connections">
      <div class="overview-command-head">
        <div>
      <h3>${escapeHtml(t("Recommended data connections", "推荐数据接入"))}</h3>
      <div class="meta">${escapeHtml(t("Use this list to finish the missing inputs that still keep some panels in partial mode.", "这里会集中提醒还没接上的数据输入，避免有些面板一直停在部分可用。"))}</div>
      <ul class="story-list settings-connector-list">${usageConnectorTodos}</ul>
      ${settingsBudgetLimitCard}
    </section>`;
  }

  function renderSettingsEnvironmentStatusCard(
    connectionSummary,
    usageCost,
    securitySummary,
    updateSummary,
    usageConnectorTodos,
    settingsBudgetLimitCard,
    language,
  ) {
    const overallStatus = mergeInsightStatuses([
      connectionSummary ? buildOpenClawConnectionState(connectionSummary, usageCost, language).overallStatus : "info",
      securitySummary?.status,
      updateSummary?.status,
    ]);
    const headline =
      overallStatus === "blocked"
        ? pickUiText(language, "Some environment issues need action before you trust the whole system state.", "有环境问题需要先处理，再继续信任整套系统状态。")
        : overallStatus === "warn"
          ? pickUiText(language, "The environment is usable, but there are still a few items worth checking.", "当前环境可用，但还有几项值得顺手检查。")
          : pickUiText(language, "Connection, security, and update state are now grouped in one place.", "连接、安全和更新状态已收在同一处。");

    return `<section class="card" id="settings-environment-status">
    <div class="overview-command-head">
      <div>
        <h2>${escapeHtml(pickUiText(language, "System environment status", "系统环境状态"))}</h2>
        <div class="meta">${escapeHtml(headline)}</div>
      </div>
      <div>${badge(overallStatus, insightStatusLabel(overallStatus, language))}</div>
    </div>
    <div class="settings-status-grid">
      ${renderSettingsConnectionPanel(connectionSummary, usageCost, language)}
      <div class="settings-status-stack settings-security-stack">
        ${renderSettingsSecurityPanel(securitySummary, language)}
        ${renderSettingsDataConnectionsPanel(usageConnectorTodos, settingsBudgetLimitCard, language)}
      </div>
      ${renderSettingsUpdatePanel(updateSummary, language)}
    </div>
  </section>`;
  }

  function renderSettingsConfigAccessCard(importGuardRows, language) {
    const t = (en, zh) => pickUiText(language, en, zh);
    return `<section class="card" id="tool-connectors">
    <div class="overview-command-head">
      <div>
        <h2>${escapeHtml(t("System config and data access", "系统配置与数据接入"))}</h2>
        <div class="meta">${escapeHtml(t("Keep the local safety gates in one place, so write permissions are easier to scan and adjust.", "把本地安全开关集中放在一处，便于快速查看和调整写入权限。"))}</div>
      </div>
    </div>
    <div class="settings-status-grid">
      <section class="settings-status-panel" id="settings-safety-switches" data-settings-safety-root data-language="${escapeHtml(language)}">
        <h3>${escapeHtml(t("Safety switches", "安全开关"))}</h3>
        <div class="meta">${escapeHtml(t("These controls decide which higher-risk write paths are allowed in the current environment.", "这些开关决定当前环境里哪些高风险写入路径可以放行。"))}</div>
        <div class="settings-switch-table-wrap">
          <table class="settings-switch-table">
            <colgroup>
              <col class="settings-switch-col-label" />
              <col class="settings-switch-col-state" />
              <col class="settings-switch-col-value" />
              <col class="settings-switch-col-note" />
            </colgroup>
          <thead><tr><th>${escapeHtml(t("Item", "项目"))}</th><th>${escapeHtml(t("State", "状态"))}</th><th>${escapeHtml(t("Current value", "当前值"))}</th><th>${escapeHtml(t("Note", "说明"))}</th></tr></thead>
          <tbody>${importGuardRows}</tbody>
          </table>
        </div>
        <div class="meta settings-safety-status" data-settings-safety-status>${escapeHtml(t("Changes here will update local safety settings and restart the page automatically.", "这里保存后会更新本地安全设置，并自动重启页面。"))}</div>
      </section>
    </div>
  </section>`;
  }

  function renderSettingsBudgetLimitCard(model, language, variant = "standalone") {
    const t = (en, zh) => pickUiText(language, en, zh);
    const configured = typeof model.currentLimit === "number" && Number.isFinite(model.currentLimit);
    const rootClass = variant === "embedded" ? "card settings-inline-budget" : "card";
    const issueText = model.issues.length > 0 ? model.issues.join(" | ") : "";
    return `<section class="${escapeHtml(rootClass)}" id="settings-budget-limit" data-budget-limit-root data-language="${escapeHtml(language)}" data-current-limit="${escapeHtml(configured ? String(model.currentLimit) : "")}">
    <div class="overview-command-head">
      <div>
        <h2>${escapeHtml(t("Budget limit", "预算上限"))}</h2>
        <div class="meta">${escapeHtml(t("Enter a number to enable a cap, or leave it empty for unlimited spend.", "填数字就启用上限，留空则代表无上限、没有任何预算限制。"))}</div>
      </div>
      <div>${badge(configured ? "ok" : "info", configured ? t("Configured", "已配置") : t("Unlimited", "无上限"))}</div>
    </div>
    <div class="status-strip compact">
      <div class="status-chip"><span>${escapeHtml(t("Current limit", "当前上限"))}</span><strong data-budget-limit-current>${escapeHtml(configured ? model.currentLimit.toFixed(2) : t("Unlimited", "无上限"))}</strong></div>
      <div class="status-chip"><span>${escapeHtml(t("Save target", "保存位置"))}</span><strong>${escapeHtml(model.relativePath)}</strong></div>
      <div class="status-chip"><span>${escapeHtml(t("Warn ratio", "预警比例"))}</span><strong>${escapeHtml(model.warnRatio !== void 0 ? `${Math.round(model.warnRatio * 100)}%` : "-")}</strong></div>
    </div>
    <div class="settings-budget-form">
      <label class="settings-budget-field">
        <span>${escapeHtml(t("Budget limit value", "预算上限数值（留空为无上限）"))}</span>
        <input
          class="settings-budget-input"
          type="number"
          min="0.01"
          step="0.01"
          inputmode="decimal"
          placeholder="${escapeHtml(t("Example: 20", "例如：20"))}"
          value="${escapeHtml(configured ? String(model.currentLimit) : "")}"
          data-budget-limit-input
        />
      </label>
      <div class="settings-budget-actions">
        <button class="btn primary" type="button" data-budget-limit-save>${escapeHtml(t("Save", "保存"))}</button>
        <button class="btn" type="button" data-budget-limit-clear>${escapeHtml(t("No limit", "设为无上限"))}</button>
      </div>
    </div>
    ${issueText ? `<div class="meta" data-card-help-keep="true">${escapeHtml(issueText)}</div>` : ""}
    <div class="meta" data-budget-limit-status></div>
  </section>`;
  }

  function renderSettingsBudgetLimitCardV2(model, language, variant = "standalone") {
    if (variant !== "compact") {
      return renderSettingsBudgetLimitCard(model, language, variant);
    }

    const t = (en, zh) => pickUiText(language, en, zh);
    const configured = typeof model.currentLimit === "number" && Number.isFinite(model.currentLimit);
    const issueText = model.issues.length > 0 ? model.issues.join(" | ") : "";
    const storageLabel = model.loadedFromFile
      ? t("Runtime file", "\u8fd0\u884c\u65f6\u6587\u4ef6")
      : t("Create on save", "\u4fdd\u5b58\u65f6\u521b\u5efa");
    const storageText = t(
      "Stored in runtime/budgets.json.",
      "\u4fdd\u5b58\u5230 runtime/budgets.json\u3002",
    );
    return `<section class="card settings-inline-budget settings-inline-budget-compact" id="settings-budget-limit" data-budget-limit-root data-language="${escapeHtml(language)}" data-current-limit="${escapeHtml(configured ? String(model.currentLimit) : "")}">
      <div class="overview-command-head">
        <div>
          <h2>${escapeHtml(t("Budget limit", "\u9884\u7b97\u4e0a\u9650"))}</h2>
          <div class="meta">${escapeHtml(t("Enter a number to enable a cap, or leave it empty for unlimited spend.", "\u586b\u6570\u5b57\u5c31\u542f\u7528\u4e0a\u9650\uff0c\u7559\u7a7a\u5219\u4ee3\u8868\u65e0\u4e0a\u9650\u3001\u6ca1\u6709\u4efb\u4f55\u9884\u7b97\u9650\u5236\u3002"))}</div>
        </div>
        <div>${badge(configured ? "ok" : "info", configured ? t("Configured", "\u5df2\u914d\u7f6e") : t("Unlimited", "\u65e0\u4e0a\u9650"))}</div>
      </div>
      <div class="status-strip compact">
        <div class="status-chip"><span>${escapeHtml(t("Current", "\u5f53\u524d\u4e0a\u9650"))}</span><strong data-budget-limit-current>${escapeHtml(configured ? model.currentLimit.toFixed(2) : t("Unlimited", "\u65e0\u4e0a\u9650"))}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Warn", "\u9884\u8b66\u6bd4\u4f8b"))}</span><strong>${escapeHtml(model.warnRatio !== void 0 ? `${Math.round(model.warnRatio * 100)}%` : "-")}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Storage", "\u5199\u5165"))}</span><strong>${escapeHtml(storageLabel)}</strong></div>
      </div>
      <div class="settings-budget-form">
        <label class="settings-budget-field">
          <span>${escapeHtml(t("Limit", "\u9884\u7b97\u503c\uff08\u7559\u7a7a\u4e3a\u65e0\u4e0a\u9650\uff09"))}</span>
          <input
            class="settings-budget-input"
            type="number"
            min="0.01"
            step="0.01"
            inputmode="decimal"
            placeholder="${escapeHtml(t("Example: 20", "\u4f8b\u5982\uff1a20"))}"
            value="${escapeHtml(configured ? String(model.currentLimit) : "")}"
            data-budget-limit-input
          />
        </label>
        <div class="settings-budget-actions">
          <button class="btn primary" type="button" data-budget-limit-save>${escapeHtml(t("Save", "\u4fdd\u5b58"))}</button>
          <button class="btn" type="button" data-budget-limit-clear>${escapeHtml(t("No limit", "\u8bbe\u4e3a\u65e0\u4e0a\u9650"))}</button>
        </div>
      </div>
      <div class="meta">${escapeHtml(storageText)} · ${escapeHtml(issueText)}</div>
      <div class="meta" data-budget-limit-status></div>
    </section>`;
  }

  function renderSettingsDataConnectionsPanelV2(_usageConnectorTodos, settingsBudgetLimitCard) {
    return settingsBudgetLimitCard;
  }

  function renderSettingsEnvironmentStatusCardV2(
    connectionSummary,
    usageCost,
    securitySummary,
    updateSummary,
    usageConnectorTodos,
    settingsBudgetLimitCard,
    language,
  ) {
    const overallStatus = mergeInsightStatuses([
      connectionSummary ? buildOpenClawConnectionState(connectionSummary, usageCost, language).overallStatus : "info",
      securitySummary?.status,
      updateSummary?.status,
    ]);
    const headline =
      overallStatus === "blocked"
        ? pickUiText(language, "Some environment issues need action before you trust the whole system state.", "有环境问题需要先处理，再继续信任整套系统状态。")
        : overallStatus === "warn"
          ? pickUiText(language, "The environment is usable, but there are still a few items worth checking.", "当前环境可用，但还有几项值得顺手检查。")
          : pickUiText(language, "Connection, security, update, and data access are all readable here.", "连接、安全、更新和数据接入都可以在这里统一查看。");

    return `<section class="card" id="settings-environment-status">
      <div class="overview-command-head">
        <div>
          <h2>${escapeHtml(pickUiText(language, "System environment status", "系统环境状态"))}</h2>
          <div class="meta">${escapeHtml(headline)}</div>
        </div>
        <div>${badge(overallStatus, insightStatusLabel(overallStatus, language))}</div>
      </div>
      <div class="settings-status-grid settings-environment-grid">
        ${renderSettingsConnectionPanel(connectionSummary, usageCost, language)}
        ${renderSettingsSecurityPanel(securitySummary, language)}
        ${renderSettingsUpdatePanel(updateSummary, language)}
        ${renderSettingsDataConnectionsPanelV2(usageConnectorTodos, settingsBudgetLimitCard, language)}
      </div>
    </section>`;
  }

  function renderContextPressureCard(snapshot, language) {
    if (snapshot.contextWindows.length === 0) {
      return `<section class="card" id="session-context-pressure">
      <h2>${escapeHtml(pickUiText(language, "Context pressure", "上下文压力"))}</h2>
      <div class="empty-state">${escapeHtml(pickUiText(language, "No session context data yet.", "当前还没有会话上下文数据。"))}</div>
    </section>`;
    }

    const ranked = [...snapshot.contextWindows].sort((a, b) => {
      const rankA = a.thresholdState === "critical" ? 0 : a.thresholdState === "warn" ? 1 : a.thresholdState === "ok" ? 2 : 3;
      const rankB = b.thresholdState === "critical" ? 0 : b.thresholdState === "warn" ? 1 : b.thresholdState === "ok" ? 2 : 3;
      if (rankA !== rankB) return rankA - rankB;
      return (b.usagePercent ?? 0) - (a.usagePercent ?? 0);
    });

    const criticalCount = ranked.filter((item) => item.thresholdState === "critical").length;
    const warnCount = ranked.filter((item) => item.thresholdState === "warn").length;
    const topUsage = ranked[0];
    const headline =
      criticalCount > 0
        ? pickUiText(language, "Some sessions are close to their context ceiling.", "有会话已经接近上下文上限。")
        : warnCount > 0
          ? pickUiText(language, "A few sessions are worth watching.", "有几条会话值得继续盯住。")
          : pickUiText(language, "Context pressure looks healthy right now.", "当前上下文压力整体正常。");

    return `<section class="card" id="session-context-pressure">
    <div class="overview-command-head">
      <div>
        <h2>${escapeHtml(pickUiText(language, "Context pressure", "上下文压力"))}</h2>
        <div class="meta">${escapeHtml(headline)}</div>
      </div>
      <div>${badge(criticalCount > 0 ? "warn" : warnCount > 0 ? "info" : "ok", criticalCount > 0 ? pickUiText(language, "High", "偏高") : warnCount > 0 ? pickUiText(language, "Watch", "观察中") : pickUiText(language, "Healthy", "正常"))}</div>
    </div>
    <div class="status-strip">
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Critical", "临界"))}</span><strong>${criticalCount}</strong></div>
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Warning", "预警"))}</span><strong>${warnCount}</strong></div>
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Highest usage", "最高占比"))}</span><strong>${escapeHtml(topUsage?.usagePercent !== void 0 ? `${topUsage.usagePercent.toFixed(1)}%` : "-")}</strong></div>
    </div>
    <div class="decision-list">${ranked.slice(0, 6).map((item) => {
      const sessionLinkAttrs = buildSessionLinkAttrs({
        sessionKey: item.sessionKey,
        language,
        buildSessionDetailHref,
        escapeHtml,
        source: "usage-context-pressure",
      });
      const tone = item.thresholdState === "critical" ? "warn" : item.thresholdState === "warn" ? "info" : item.thresholdState === "ok" ? "ok" : "blocked";
      const usageText = item.usagePercent !== void 0 ? `${item.usagePercent.toFixed(1)}%` : pickUiText(language, "Unavailable", "不可用");
      const stateLabel =
        item.thresholdState === "critical"
          ? pickUiText(language, "Critical", "临界")
          : item.thresholdState === "warn"
            ? pickUiText(language, "Warning", "预警")
            : item.thresholdState === "ok"
              ? pickUiText(language, "Healthy", "正常")
              : pickUiText(language, "Unknown", "未知");
      return `<a class="decision-row" ${sessionLinkAttrs}>
          <div class="decision-row-copy">
            <strong>${escapeHtml(simplifyUsageLabel(item.sessionLabel))}</strong>
            <div class="meta">${badge(tone, stateLabel)} ${escapeHtml(humanizeOperatorLabel(item.agentId))} · ${escapeHtml(item.model)}</div>
            <div class="meta">${escapeHtml(pickUiText(language, "Used", "已用"))} ${formatInt(item.usedTokens)} / ${item.contextLimitTokens ? formatInt(item.contextLimitTokens) : "-"} · ${escapeHtml(item.paceLabel)}</div>
          </div>
          <div class="decision-row-value">${escapeHtml(usageText)}</div>
        </a>`;
    }).join("")}</div>
  </section>`;
  }

  function renderMemoryStateSection(summary, language) {
    if (!summary) {
      return `<section class="card" id="memory-status-card">
      <h2>${escapeHtml(pickUiText(language, "Memory status", "记忆状态"))}</h2>
      <div class="empty-state">${escapeHtml(pickUiText(language, "Memory status is loading.", "正在读取记忆状态。"))}</div>
    </section>`;
    }

    const headline =
      summary.status === "blocked"
        ? pickUiText(language, "Some agents still do not have usable memory.", "仍有智能体的记忆不可用。")
        : summary.status === "warn"
          ? pickUiText(language, "Memory works, but some agents still need attention.", "记忆整体可用，但部分智能体仍需检查。")
          : pickUiText(language, "Memory looks healthy for the visible agents.", "当前可见智能体的记忆状态正常。");

    return `<section class="card" id="memory-status-card">
    <div class="overview-command-head">
      <div>
        <h2>${escapeHtml(pickUiText(language, "Memory status", "记忆状态"))}</h2>
        <div class="meta">${escapeHtml(headline)}</div>
      </div>
      <div>${badge(summary.status, insightStatusLabel(summary.status, language))}</div>
    </div>
    <div class="status-strip">
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Healthy", "正常"))}</span><strong>${summary.okCount}</strong></div>
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Needs attention", "需关注"))}</span><strong>${summary.warnCount}</strong></div>
      <div class="status-chip"><span>${escapeHtml(pickUiText(language, "Unavailable", "不可用"))}</span><strong>${summary.blockedCount}</strong></div>
    </div>
    <div class="decision-list">${summary.agents.map((item) => {
      const detailParts = [
        `${formatInt(item.files)} ${pickUiText(language, "files", "份记忆")}`,
        `${formatInt(item.chunks)} ${pickUiText(language, "chunks", "个块")}`,
        item.searchable ? pickUiText(language, "searchable", "可搜索") : pickUiText(language, "search not ready", "搜索未就绪"),
      ];
      if (item.issuesCount > 0) {
        detailParts.push(pickUiText(language, `${item.issuesCount} issue(s)`, `${item.issuesCount} 个异常`));
      } else if (item.dirty) {
        detailParts.push(pickUiText(language, "refresh pending", "待刷新"));
      }
      if (item.lastUpdateAt) {
        detailParts.push(pickUiText(language, `updated ${formatTimeAgoFromNow(item.lastUpdateAt, language)}`, `${formatTimeAgoFromNow(item.lastUpdateAt, language)} 更新`));
      }
      return `<div class="decision-row">
          <div class="decision-row-copy">
            <strong>${escapeHtml(humanizeOperatorLabel(item.agentId))}</strong>
            <div class="meta">${badge(item.status, insightStatusLabel(item.status, language))} ${escapeHtml(detailParts.join(" · "))}</div>
          </div>
          <div class="decision-row-value">${escapeHtml(item.searchable ? pickUiText(language, "Ready", "可用") : pickUiText(language, "Check", "检查"))}</div>
        </div>`;
    }).join("")}</div>
  </section>`;
  }

  function scoreCoverageStatus(status) {
    if (status === "connected") return 100;
    if (status === "partial") return 55;
    return 0;
  }

  function snapshotFreshnessSignal(generatedAt, language) {
    const ageMs = Math.max(0, Date.now() - toSortableMs(generatedAt));
    const ageLabel = formatTimeAgoFromNow(generatedAt, language);
    if (ageMs <= 10 * 60 * 1000) {
      return {
        key: "freshness",
        label: pickUiText(language, "Live picture", "实时画面"),
        status: "connected",
        detail: pickUiText(language, `Updated ${ageLabel}; suitable for deciding what is happening now.`, `更新于 ${ageLabel}，适合直接判断当前状态。`),
      };
    }
    if (ageMs <= 30 * 60 * 1000) {
      return {
        key: "freshness",
        label: pickUiText(language, "Live picture", "实时画面"),
        status: "partial",
        detail: pickUiText(language, `Updated ${ageLabel}; still useful, but not precise enough for second-by-second judgement.`, `更新于 ${ageLabel}，仍可参考，但不适合做秒级判断。`),
      };
    }
    return {
      key: "freshness",
      label: pickUiText(language, "Live picture", "实时画面"),
      status: "not_connected",
      detail: pickUiText(language, `Last refresh was ${ageLabel}; treat the current picture as delayed.`, `最近一次刷新是 ${ageLabel}，当前画面应视为有延迟。`),
    };
  }

  function usageCoverageStatus(usage) {
    if (usage.connectors.requestCounts === "connected" && usage.connectors.providerAttribution !== "not_connected") return "connected";
    if (usage.connectors.requestCounts !== "not_connected" || usage.connectors.digestHistory !== "not_connected" || usage.connectors.providerAttribution !== "not_connected") {
      return "partial";
    }
    return "not_connected";
  }

  function historyCoverageStatus(replay) {
    if (replay.timeline.entries.length > 0 && replay.digests.length > 0) return "connected";
    if (replay.timeline.entries.length > 0 || replay.digests.length > 0 || replay.exportSnapshots.length > 0 || replay.exportBundles.length > 0) {
      return "partial";
    }
    return "not_connected";
  }

  function buildInformationCertaintyModel(input) {
    const { snapshot, officeRoster, officePresence, usageCost, replayPreview, language } = input;
    const freshness = snapshotFreshnessSignal(snapshot.generatedAt, language);
    const usageStatus = usageCoverageStatus(usageCost);
    const historyStatus = historyCoverageStatus(replayPreview);
    const signals = [
      freshness,
      {
        key: "roster",
        label: pickUiText(language, "Staff and owners", "员工与负责人"),
        status: officeRoster.status,
        detail:
          officeRoster.status === "connected"
            ? pickUiText(language, "Staff roster and ownership signals are readable.", "员工名单和负责人信号可读。")
            : officeRoster.status === "partial"
              ? pickUiText(language, "Only part of the staff roster is visible.", "目前只能看到部分员工名单。")
              : pickUiText(language, "Staff roster is missing, so ownership may be incomplete.", "员工名单未连上，负责人视图可能不完整。"),
      },
      {
        key: "live_sessions",
        label: pickUiText(language, "Live execution", "实时执行"),
        status: officePresence.status,
        detail:
          officePresence.status === "connected"
            ? officePresence.totalActiveSessions > 0
              ? pickUiText(language, `${officePresence.totalActiveSessions} live sessions are visible right now.`, `当前可见 ${officePresence.totalActiveSessions} 个实时执行中的会话。`)
              : pickUiText(language, "Live session signal is connected; nothing is actively running right now.", "实时会话信号已连上；当前没有执行中的会话。")
            : officePresence.status === "partial"
              ? pickUiText(language, "Only part of the live execution signal is visible.", "当前只能看到部分实时执行信号。")
              : pickUiText(language, "Only static snapshot data is visible, so current execution may be under-reported.", "当前只能看到静态快照，实时执行可能看不全。"),
      },
      {
        key: "usage",
        label: pickUiText(language, "AI usage and cost", "AI 用量与费用"),
        status: usageStatus,
        detail:
          usageStatus === "connected"
            ? pickUiText(language, "Usage and cost data are connected.", "用量和费用数据已连上。")
            : usageStatus === "partial"
              ? pickUiText(language, "Usage trend is visible, but some cost or provider detail is still incomplete.", "已经能看到用量趋势，但费用或供应商细节还不完整。")
              : pickUiText(language, "Usage and cost are still a blind spot.", "用量和费用目前仍是盲区。"),
      },
      {
        key: "subscription",
        label: pickUiText(language, "Subscription room", "订阅额度"),
        status: usageCost.subscription.status,
        detail:
          usageCost.subscription.status === "connected"
            ? pickUiText(language, "Subscription remaining and reset window are visible.", "订阅剩余额度和重置窗口可见。")
            : usageCost.subscription.status === "partial"
              ? pickUiText(language, "Subscription data exists, but part of the billing picture is missing.", "订阅数据已经有了，但账单画面还不完整。")
              : pickUiText(language, "Remaining subscription room is not confirmed yet.", "剩余额度目前还不能完全确认。"),
      },
      {
        key: "history",
        label: pickUiText(language, "Replay history", "回放历史"),
        status: historyStatus,
        detail:
          historyStatus === "connected"
            ? pickUiText(language, "Recent activity and trend history can both be replayed.", "最近活动和趋势历史都可以回看。")
            : historyStatus === "partial"
              ? pickUiText(language, "Only part of the replay history is visible.", "目前只能回看部分历史。")
              : pickUiText(language, "Replay history is still too thin to explain change over time.", "回放历史还不够厚，难以解释长期变化。"),
      },
    ];
    const weights = new Map([["freshness", 24], ["roster", 12], ["live_sessions", 18], ["usage", 20], ["subscription", 10], ["history", 16]]);
    const totalWeight = [...weights.values()].reduce((sum, value) => sum + value, 0);
    const score = Math.round(signals.reduce((sum, signal) => sum + scoreCoverageStatus(signal.status) * (weights.get(signal.key) ?? 0), 0) / Math.max(1, totalWeight));
    const strengths = signals.filter((signal) => signal.status === "connected").slice(0, 3).map((signal) => {
      if (signal.key === "freshness") return pickUiText(language, "The home picture is fresh enough for current-state decisions.", "首页画面够新，可以直接拿来判断当前状态。");
      if (signal.key === "live_sessions") return pickUiText(language, "Current execution is visible, not just task records on a board.", "现在能看到真实执行中的会话，而不只是任务板上的记录。");
      if (signal.key === "usage") return pickUiText(language, "AI usage and spending can be watched before they become a surprise.", "AI 用量和花费可以提前观察，不容易突然失控。");
      if (signal.key === "history") return pickUiText(language, "You can look back at recent activity instead of relying on memory.", "可以回看最近发生了什么，不必只靠记忆。");
      if (signal.key === "subscription") return pickUiText(language, "Remaining subscription room is visible.", "订阅剩余额度是可见的。");
      return pickUiText(language, "The people-and-ownership view is readable.", "人员和负责关系是可读的。");
    });
    const gaps = signals.filter((signal) => signal.status !== "connected").slice(0, 3).map((signal) => {
      if (signal.key === "freshness") return pickUiText(language, "This picture is delayed, so fast changes may not be reflected yet.", "当前画面有延迟，快速变化可能还没有反映出来。");
      if (signal.key === "live_sessions") return pickUiText(language, "You may not be seeing every session that is still running.", "你可能还看不全所有正在执行的会话。");
      if (signal.key === "usage") return pickUiText(language, "AI spending is only partially visible, so cost judgement is conservative.", "AI 花费目前只能看见一部分，因此费用判断会偏保守。");
      if (signal.key === "subscription") return pickUiText(language, "Remaining package room is still unconfirmed.", "套餐剩余额度目前还没有被完全确认。");
      if (signal.key === "history") return pickUiText(language, "History is thin, so long-term explanations may be weak.", "历史记录偏薄，长期变化的解释力会比较弱。");
      return pickUiText(language, "Some staff or ownership signals are still missing.", "部分人员或负责关系信号还缺失。");
    });
    if (strengths.length === 0) strengths.push(pickUiText(language, "At least the current dashboard structure is readable even while signals are still sparse.", "即使信号还稀疏，当前看板结构本身仍然可读。"));
    if (gaps.length === 0) gaps.push(pickUiText(language, "No obvious blind spot is standing out right now.", "当前没有明显突出的盲区。"));
    if (score >= 80) {
      return {
        score,
        badgeStatus: "ok",
        badgeLabel: pickUiText(language, "High certainty", "高确定性"),
        headline: pickUiText(language, "This picture is trustworthy enough for day-to-day decisions.", "这张画面已经足够支撑日常判断。"),
        summary: pickUiText(language, "Most key signals are connected, so you can judge the AI employee system from one screen with relatively high confidence.", "大部分关键信号都已连上，可以比较放心地用这一屏判断 AI 员工系统的当前状态。"),
        strengths,
        gaps,
        signals,
      };
    }
    if (score >= 55) {
      return {
        score,
        badgeStatus: "warn",
        badgeLabel: pickUiText(language, "Medium certainty", "中等确定性"),
        headline: pickUiText(language, "The main picture is visible, but there are still blind spots.", "主画面已经能看，但仍然有盲区。"),
        summary: pickUiText(language, "You can judge the main direction, but some parts still need more evidence before you fully trust them.", "大方向已经能判断，但其中有些区域还需要更多证据才能完全放心。"),
        strengths,
        gaps,
        signals,
      };
    }
    return {
      score,
      badgeStatus: "blocked",
      badgeLabel: pickUiText(language, "Low certainty", "低确定性"),
      headline: pickUiText(language, "Important parts of the picture are still missing.", "这张画面还有关键缺口。"),
      summary: pickUiText(language, "The dashboard is usable, but some information should still be treated as a clue rather than a confirmed fact.", "当前看板虽然可用，但其中一部分信息还更像线索，不适合当作已经确认的事实。"),
      strengths,
      gaps,
      signals,
    };
  }

  function renderInformationCertaintyCard(model, language = "zh") {
    const connectedCount = model.signals.filter((signal) => signal.status === "connected").length;
    const partialCount = model.signals.filter((signal) => signal.status === "partial").length;
    const blindSpotCount = model.signals.filter((signal) => signal.status === "not_connected").length;
    return `<section class="card" id="information-certainty">
      <div class="overview-command-head">
        <div>
          <h2>${escapeHtml(pickUiText(language, "Information certainty", "信息确定性"))}</h2>
          <div class="meta">${escapeHtml(pickUiText(language, "Shows how much of the current system picture is safe to trust.", "说明当前画面里哪些信息可以直接相信。"))}</div>
        </div>
        <div>${badge(model.badgeStatus, model.badgeLabel)}</div>
      </div>
      <div class="task-hub-stat-grid">
        <article class="task-hub-stat">
          <span>${escapeHtml(pickUiText(language, "Certainty score", "确定性分数"))}</span>
          <strong>${model.score}</strong>
          <small>${escapeHtml(model.headline)}</small>
        </article>
        <article class="task-hub-stat">
          <span>${escapeHtml(pickUiText(language, "Reliable areas", "可靠区域"))}</span>
          <strong>${connectedCount}</strong>
          <small>${escapeHtml(pickUiText(language, "Areas already backed by connected signals", "已经有完整信号支撑的区域"))}</small>
        </article>
        <article class="task-hub-stat">
          <span>${escapeHtml(pickUiText(language, "Blind spots", "盲区"))}</span>
          <strong>${blindSpotCount}</strong>
          <small>${escapeHtml(pickUiText(language, "Areas that still need more evidence", "仍然需要补证据的区域"))}</small>
        </article>
      </div>
      <div class="meta">${escapeHtml(model.summary)}</div>
      <div style="height:10px;"></div>
      <div class="task-hub-grid task-hub-board-grid">
        <section class="card">
          <h3 style="margin:0 0 6px 0;">${escapeHtml(pickUiText(language, "What you can trust now", "目前可以放心看的"))}</h3>
          <ul class="story-list">${model.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
        <section class="card">
          <h3 style="margin:0 0 6px 0;">${escapeHtml(pickUiText(language, "What may still be incomplete", "可能还不完整的地方"))}</h3>
          <ul class="story-list">${model.gaps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
      </div>
      <details class="compact-table-details" style="margin-top:12px;" open>
        <summary>${escapeHtml(pickUiText(language, "Open certainty breakdown", "展开确定性拆解"))} · ${connectedCount}/${model.signals.length} ${escapeHtml(pickUiText(language, "connected", "已连上"))} · ${partialCount} ${escapeHtml(pickUiText(language, "partial", "部分"))} · ${blindSpotCount} ${escapeHtml(pickUiText(language, "blind spot", "盲区"))}</summary>
        <div class="fold-body">
          <table>
            <thead><tr><th>${escapeHtml(pickUiText(language, "Area", "区域"))}</th><th>${escapeHtml(pickUiText(language, "Status", "状态"))}</th><th>${escapeHtml(pickUiText(language, "What it means", "这意味着什么"))}</th></tr></thead>
            <tbody>${model.signals.map((signal) => `<tr><td>${escapeHtml(signal.label)}</td><td>${badge(signal.status, dataConnectionLabel(signal.status, language))}</td><td>${escapeHtml(signal.detail)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      </details>
    </section>`;
  }

  function buildTaskCertaintyCards(input) {
    const previewByKey = new Map(input.sessionItems.map((item) => [item.sessionKey, item]));
    const snapshotByKey = new Map(input.sessions.map((session) => [session.sessionKey, session]));
    const pendingApprovalSessionKeys = new Set(input.approvals.filter((item) => item.status === "pending" && typeof item.sessionKey === "string" && item.sessionKey.trim()).map((item) => item.sessionKey.trim()));
    const nowMs = Date.now();
    return input.tasks.filter((task) => task.status !== "done").map((task) => {
      const linkedSessionKeys = [...new Set(task.sessionKeys.map((item) => item.trim()).filter(Boolean))];
      let visibleSessionCount = 0;
      let liveSessionCount = 0;
      let blockedSessionCount = 0;
      let errorSessionCount = 0;
      let waitingApprovalSessionCount = 0;
      let recentActivityCount = 0;
      let executionEvidenceCount = 0;
      let toolEvidenceCount = 0;
      const signalTimes = [];
      for (const sessionKey of linkedSessionKeys) {
        const preview = previewByKey.get(sessionKey);
        const snapshotSession = snapshotByKey.get(sessionKey);
        if (preview || snapshotSession) visibleSessionCount += 1;
        const state = preview?.state ?? snapshotSession?.state;
        if (state === "running") liveSessionCount += 1;
        if (state === "blocked") blockedSessionCount += 1;
        if (state === "error") errorSessionCount += 1;
        if (state === "waiting_approval") waitingApprovalSessionCount += 1;
        const latestAt = pickLatestSessionActivityTimestamp(preview?.latestHistoryAt, preview?.lastMessageAt, snapshotSession?.lastMessageAt);
        signalTimes.push(latestAt);
        if (hasFreshRuntimeTimestamp(latestAt, nowMs, TASK_RUNTIME_ACTIVITY_WINDOW_MS)) recentActivityCount += 1;
        if (preview?.executionChain?.accepted || preview?.executionChain?.spawned) executionEvidenceCount += 1;
        if ((preview?.toolEventCount ?? 0) > 0 || preview?.latestKind === "tool_event") toolEvidenceCount += 1;
      }
      const latestSignalAt = pickLatestTimestamp(signalTimes);
      const pendingApprovals = linkedSessionKeys.filter((sessionKey) => pendingApprovalSessionKeys.has(sessionKey)).length;
      const staleLinkedSessions = linkedSessionKeys.length > 0 && visibleSessionCount > 0 && liveSessionCount === 0 && recentActivityCount === 0;
      let score = 24;
      if (linkedSessionKeys.length > 0) score += 24;
      if (visibleSessionCount > 0) score += 12;
      if (liveSessionCount > 0) score += 18;
      if (recentActivityCount > 0) score += 16;
      if (toolEvidenceCount > 0) score += 8;
      if (executionEvidenceCount > 0) score += 10;
      if (pendingApprovals > 0) score -= Math.min(18, pendingApprovals * 8);
      if (waitingApprovalSessionCount > 0) score -= 14;
      if (blockedSessionCount > 0) score -= 24;
      if (errorSessionCount > 0) score -= 30;
      if (staleLinkedSessions) score -= 12;
      score = Math.max(0, Math.min(100, score));
      const evidence = [];
      const gaps = [];
      if (linkedSessionKeys.length > 0) {
        evidence.push(pickUiText(input.language, `${linkedSessionKeys.length} linked session(s)`, `已关联 ${linkedSessionKeys.length} 个会话`));
      } else {
        gaps.push(pickUiText(input.language, "No execution session is linked yet.", "还没有关联执行会话。"));
      }
      if (visibleSessionCount > 0) {
        evidence.push(pickUiText(input.language, `${visibleSessionCount} linked session(s) are visible in runtime.`, `运行时里可见 ${visibleSessionCount} 个关联会话。`));
      } else if (linkedSessionKeys.length > 0) {
        gaps.push(pickUiText(input.language, "Session keys exist, but runtime details are still missing.", "已经写了会话键，但运行时详情还没出现。"));
      }
      if (liveSessionCount > 0) {
        evidence.push(pickUiText(input.language, `${liveSessionCount} live session(s) are still running.`, `当前仍有 ${liveSessionCount} 个执行中的会话。`));
      }
      if (recentActivityCount > 0 && latestSignalAt) {
        evidence.push(pickUiText(input.language, `Recent activity was seen ${formatTimeAgoFromNow(latestSignalAt, input.language)}.`, `最近活动发生在${formatTimeAgoFromNow(latestSignalAt, input.language)}。`));
      } else if (linkedSessionKeys.length > 0) {
        gaps.push(pickUiText(input.language, "No fresh runtime activity was seen in the last 6 hours.", "最近 6 小时还没有看到新的运行信号。"));
      }
      if (toolEvidenceCount > 0) evidence.push(pickUiText(input.language, "Tool activity is visible.", "已经看到工具调用痕迹。"));
      if (executionEvidenceCount > 0) evidence.push(pickUiText(input.language, "Accepted/spawned execution evidence is visible.", "已经看到接单/派发执行证据。"));
      if (pendingApprovals > 0) gaps.push(pickUiText(input.language, `${pendingApprovals} linked approval item(s) are still waiting.`, `还有 ${pendingApprovals} 个关联审批在等待处理。`));
      if (waitingApprovalSessionCount > 0) gaps.push(pickUiText(input.language, "A linked session is waiting for approval.", "有会话卡在等待审批。"));
      if (blockedSessionCount > 0) gaps.push(pickUiText(input.language, "A linked session is blocked.", "有会话已经进入阻塞状态。"));
      if (errorSessionCount > 0) gaps.push(pickUiText(input.language, "A linked session is in error state.", "有会话已经进入异常状态。"));
      const tone = errorSessionCount > 0 ? "blocked" : score >= 78 && blockedSessionCount === 0 && waitingApprovalSessionCount === 0 && pendingApprovals === 0 && !staleLinkedSessions ? "ok" : score >= 50 ? "warn" : "blocked";
      const toneLabel = tone === "ok" ? pickUiText(input.language, "Evidence is strong", "证据充分") : tone === "warn" ? pickUiText(input.language, "Needs follow-up", "还需跟进") : pickUiText(input.language, "Evidence is weak", "证据偏弱");
      const summary = tone === "ok"
        ? pickUiText(input.language, "Runtime shows this task is actively being carried.", "运行时已经证明这个任务正在被真正执行。")
        : errorSessionCount > 0
          ? pickUiText(input.language, "A linked session is failing, so this task needs intervention.", "关联会话已经报错，这个任务现在需要介入。")
          : blockedSessionCount > 0 || waitingApprovalSessionCount > 0 || pendingApprovals > 0
            ? pickUiText(input.language, "Runtime shows the task exists, but it is waiting on a blocker or approval.", "运行时已经看到这个任务，但它现在卡在阻塞或审批上。")
            : staleLinkedSessions
              ? pickUiText(input.language, "This task has historical traces, but no fresh runtime signal right now.", "这个任务有历史痕迹，但现在没有新的运行信号。")
              : pickUiText(input.language, "Right now there is not enough runtime evidence to say this task is truly moving.", "目前还没有足够的运行证据证明这个任务真的在推进。");
      return {
        taskId: task.taskId,
        title: task.title,
        projectTitle: task.projectTitle,
        owner: task.owner,
        score,
        tone,
        toneLabel,
        summary,
        evidence: evidence.slice(0, 4),
        gaps: gaps.slice(0, 4),
        detailHref: buildTaskDetailHref(task.taskId, input.language),
      };
    }).sort((a, b) => {
      const toneRank = taskCertaintyToneRank(a.tone) - taskCertaintyToneRank(b.tone);
      if (toneRank !== 0) return toneRank;
      if (a.score !== b.score) return a.score - b.score;
      return a.taskId.localeCompare(b.taskId);
    });
  }

  function taskCertaintyToneRank(tone) {
    if (tone === "blocked") return 0;
    if (tone === "warn") return 1;
    return 2;
  }

  function renderTaskCertaintySection(cards, language = "zh") {
    if (cards.length === 0) {
      return `<section class="card" id="task-certainty-board">
        <h2>${escapeHtml(pickUiText(language, "Execution certainty", "执行确定性"))}</h2>
        <div class="meta">${escapeHtml(pickUiText(language, "Shows whether the task is truly moving, not just listed on the board.", "说明这个任务是否真在推进，而不只是写在看板上。"))}</div>
        <div class="empty-state">${escapeHtml(pickUiText(language, "There is no in-flight task under the current filter.", "当前筛选下没有需要判断执行确定性的进行中任务。"))}</div>
      </section>`;
    }
    const strongCount = cards.filter((item) => item.tone === "ok").length;
    const followupCount = cards.filter((item) => item.tone === "warn").length;
    const weakCount = cards.filter((item) => item.tone === "blocked").length;
    return `<section class="card" id="task-certainty-board">
      <div class="overview-command-head">
        <div>
          <h2>${escapeHtml(pickUiText(language, "Execution certainty", "执行确定性"))}</h2>
          <div class="meta">${escapeHtml(pickUiText(language, "Shows whether the task is truly moving, not just listed on the board.", "说明这个任务是否真在推进，而不只是写在看板上。"))}</div>
        </div>
        <div>${badge(weakCount > 0 ? "warn" : "ok", weakCount > 0 ? pickUiText(language, "Needs follow-up", "需要跟进") : pickUiText(language, "Clear enough", "比较清楚"))}</div>
      </div>
      <div class="task-hub-stat-grid">
        <article class="task-hub-stat">
          <span>${escapeHtml(pickUiText(language, "Evidence is strong", "证据充分"))}</span>
          <strong>${strongCount}</strong>
          <small>${escapeHtml(pickUiText(language, "Tasks already backed by live evidence", "已经有实时证据支撑的任务"))}</small>
        </article>
        <article class="task-hub-stat">
          <span>${escapeHtml(pickUiText(language, "Needs follow-up", "还需跟进"))}</span>
          <strong>${followupCount}</strong>
          <small>${escapeHtml(pickUiText(language, "Tasks that are visible but still need one more proof point", "已经能看见，但还缺一块证据的任务"))}</small>
        </article>
        <article class="task-hub-stat">
          <span>${escapeHtml(pickUiText(language, "Evidence is weak", "证据偏弱"))}</span>
          <strong>${weakCount}</strong>
          <small>${escapeHtml(pickUiText(language, "Tasks that still look uncertain", "目前仍然看起来不够确定的任务"))}</small>
        </article>
      </div>
      <div class="decision-list">${cards.slice(0, 8).map((card) => `<a class="decision-row" href="${escapeHtml(card.detailHref)}">
              <div class="decision-row-copy">
                <strong>${escapeHtml(card.title)}</strong>
                <div class="meta">${badge(card.tone, card.toneLabel)} · ${escapeHtml(card.projectTitle)} · ${escapeHtml(pickUiText(language, "Owner", "负责人"))} ${escapeHtml(card.owner)}</div>
                <div class="meta">${escapeHtml(card.summary)}</div>
                <div class="meta">${escapeHtml(pickUiText(language, "Confirmed", "已确认"))}：${escapeHtml(card.evidence.join(" · ") || pickUiText(language, "No direct evidence yet.", "暂时没有直接证据。"))}</div>
                <div class="meta">${escapeHtml(pickUiText(language, "Still missing", "仍待确认"))}：${escapeHtml(card.gaps.join(" · ") || pickUiText(language, "No obvious gap right now.", "当前没有明显缺口。"))}</div>
              </div>
              <div class="decision-row-value">${card.score}</div>
            </a>`).join("")}</div>
    </section>`;
  }

  return {
    buildTaskCertaintyCards,
    renderContextPressureCard,
    renderInformationCertaintyCard,
    renderMemoryStateSection,
    renderSettingsBudgetLimitCard: renderSettingsBudgetLimitCardV2,
    renderSettingsConfigAccessCard,
    renderSettingsEnvironmentStatusCard: renderSettingsEnvironmentStatusCardV2,
    renderTaskCertaintySection,
  };
}

export { createInsightRenderers };
