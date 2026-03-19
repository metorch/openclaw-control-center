// @ts-nocheck

function createDashboardFragmentHelpers(deps) {
  const {
    badge,
    escapeHtml,
    getDocLinks,
    pickUiText,
    projectStateLabel,
    projectStates,
    toSortableMs,
  } = deps;

  function renderProjectBoard(projects, language = "zh") {
    if (projects.length === 0) {
      return `<div class="empty-state">${escapeHtml(
        pickUiText(language, "No projects yet. They will appear after project data is connected.", "暂无项目。连接项目数据后会显示。"),
      )}</div>`;
    }
    const lanes = projectStates.map((state) => {
      const laneProjects = projects.filter((project) => project.status === state);
      const cards =
        laneProjects.length === 0
          ? `<div class="meta" style="margin-top:8px;">${escapeHtml(pickUiText(language, "None", "暂无"))}</div>`
          : laneProjects
              .map(
                (project) =>
                  `<div class="project-chip"><div><code>${escapeHtml(project.projectId)}</code> ${badge(
                    project.status,
                    projectStateLabel(state, language),
                  )}</div><div>${escapeHtml(project.title)}</div><div class="meta">${escapeHtml(
                    pickUiText(language, "Agent", "智能体"),
                  )}：${escapeHtml(project.owner)} | ${escapeHtml(pickUiText(language, "Done", "完成"))}：${project.done}/${
                    project.totalTasks
                  } | ${escapeHtml(pickUiText(language, "Due soon", "即将到期"))}：${project.due}</div></div>`,
              )
              .join("");
      return `<div class="lane"><h3>${escapeHtml(projectStateLabel(state, language))}</h3><div class="lane-count">${
        laneProjects.length
      } ${escapeHtml(pickUiText(language, "projects", "个项目"))}</div>${cards}</div>`;
    });
    return `<div class="board">${lanes.join("")}</div>`;
  }

  function renderActionQueue(center) {
    if (center.queue.length === 0) {
      return '<div class="empty-state">暂无决策队列。出现需处理告警后会显示。</div>';
    }
    const items = center.queue
      .slice(0, 20)
      .map((item) => {
        const ackMeta = item.acknowledged
          ? `<span class="meta">已确认于 ${escapeHtml(item.ackedAt ?? "暂无")}${
              item.ackExpiresAt ? ` · 到期 ${escapeHtml(item.ackExpiresAt)}` : ""
            }</span>`
          : `<form method="POST" action="/action-queue/ack" class="inline-form"><input type="hidden" name="itemId" value="${escapeHtml(
              item.itemId,
            )}" /><input type="password" name="localToken" placeholder="安全口令" style="max-width:150px;" /><button class="btn" type="submit">确认</button></form>`;
        const links =
          item.links.length === 0
            ? ""
            : `<div class="meta">相关链接：${item.links
                .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
                .join(" | ")}</div>`;
        return `<li class="queue-item"><div>${badge(item.level)} <code>${escapeHtml(
          item.itemId,
        )}</code></div><div class="meta">${escapeHtml(item.message)}</div>${links}<div class="queue-actions">${ackMeta}</div></li>`;
      })
      .join("");
    return `<ul class="queue-list">${items}</ul>`;
  }

  function pickPrimaryMetric(metrics) {
    return metrics.find((metric) => metric.metric === "totalTokens") ?? metrics[0];
  }

  function buildBudgetBars(evaluations, scope) {
    return evaluations
      .filter((item) => item.scope === scope)
      .map((item) => {
        const metric = pickPrimaryMetric(item.metrics);
        if (!metric) {
          return { label: item.label, status: item.status, metric: "n/a", used: 0, limit: 0, ratio: 0 };
        }
        return {
          label: item.label,
          status: item.status,
          metric: metric.metric,
          used: metric.used,
          limit: metric.limit,
          ratio: metric.limit > 0 ? metric.used / metric.limit : 0,
        };
      });
  }

  function renderBudgetBars(items) {
    if (items.length === 0) {
      return '<div class="meta">暂无数据</div>';
    }
    return items
      .map((item) => {
        const width = Math.max(0, Math.min(100, Math.round(item.ratio * 100)));
        return `<div class="bar-row"><div class="bar-meta"><span>${escapeHtml(item.label)}</span><span>${escapeHtml(
          item.metric,
        )} ${item.used.toFixed(2)}/${item.limit.toFixed(2)}</span></div><div class="bar-track"><div class="bar-fill ${escapeHtml(
          item.status,
        )}" style="width:${width}%"></div></div></div>`;
      })
      .join("");
  }

  function renderSelectOptions(options, selectedValue) {
    return options
      .map((option) => {
        const selected = option.value === selectedValue ? " selected" : "";
        return `<option value="${escapeHtml(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
      })
      .join("");
  }

  function renderExceptionsList(feed) {
    const top = feed.items.slice(0, 12);
    if (top.length === 0) {
      return "<li>暂无异常</li>";
    }
    return top
      .map(
        (item) =>
          `<li>${badge(item.level)} <strong>${escapeHtml(item.message)}</strong> <span class="meta-inline">${escapeHtml(
            item.sourceId,
          )} · ${escapeHtml(item.occurredAt ?? "-")}</span></li>`,
      )
      .join("");
  }

  function linkifyDocRef(docRef) {
    let linked = escapeHtml(docRef);
    for (const link of getDocLinks()) {
      const escapedLabel = escapeHtml(link.label);
      linked = linked.replaceAll(escapedLabel, `<a href="${link.href}">${escapedLabel}</a>`);
    }
    return linked;
  }

  function renderReadinessRows(checklist) {
    return checklist.readiness.categories
      .map(
        (item) =>
          `<div class="readiness-chip"><div class="label">${escapeHtml(item.category)}</div><div class="score">${
            item.score
          }</div><div class="meta">通过=${item.passed} 关注=${item.warn} 失败=${item.failed}</div></div>`,
      )
      .join("");
  }

  function renderChecklistRows(checklist) {
    const top = checklist.items.slice(0, 16);
    if (top.length === 0) {
      return '<tr><td colspan="5">暂无检查项</td></tr>';
    }
    return top
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.title)}</td><td>${badge(
            item.status,
          )}</td><td>${escapeHtml(item.detail)}</td><td>${linkifyDocRef(item.docRef)}</td></tr>`,
      )
      .join("");
  }

  function approvalStatusRank(status) {
    if (status === "pending") return 0;
    if (status === "unknown") return 1;
    if (status === "denied") return 2;
    if (status === "approved") return 3;
    return 4;
  }

  function compareApprovals(a, b) {
    const statusDiff = approvalStatusRank(a.status) - approvalStatusRank(b.status);
    if (statusDiff !== 0) {
      return statusDiff;
    }
    const timeDiff = toSortableMs(b.updatedAt ?? b.requestedAt) - toSortableMs(a.updatedAt ?? a.requestedAt);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.approvalId.localeCompare(b.approvalId);
  }

  function renderMetricSummary(item) {
    if (!Array.isArray(item.metrics) || item.metrics.length === 0) {
      return "-";
    }
    return item.metrics
      .map((metric) => `${escapeHtml(metric.metric)} ${metric.used.toFixed(2)}/${metric.limit.toFixed(2)}`)
      .join(", ");
  }

  function buildParitySurfaceRows(input) {
    return [
      {
        id: "sessions",
        name: "会话可见性",
        route: "/sessions",
        status: input.sessionCount > 0 ? "enabled" : "warn",
        detail: input.sessionCount > 0 ? `可见会话 ${input.sessionCount} 条。` : "页面可用，等待实时会话数据。",
      },
      {
        id: "approvals",
        name: "审批与决策队列",
        route: "/?section=projects-tasks&quick=attention#tracked-task-view",
        status: "enabled",
        detail: `待审批 ${input.pendingApprovals} 条，决策队列可用。`,
      },
      {
        id: "cron",
        name: "定时调度",
        route: "/cron",
        status: input.cronCount > 0 ? "enabled" : "warn",
        detail: input.cronCount > 0 ? `已追踪 ${input.cronCount} 个定时任务。` : "调度页面可用，但尚未上报任务。",
      },
      {
        id: "projects_tasks",
        name: "项目与任务",
        route: "/?section=projects-tasks",
        status: input.projectCount + input.taskCount > 0 ? "enabled" : "warn",
        detail: `${input.projectCount} 个项目，${input.taskCount} 个任务。`,
      },
      {
        id: "usage",
        name: "用量与费用",
        route: "/?section=usage-cost",
        status: input.usageConnected ? "enabled" : "warn",
        detail: input.usageConnected ? "运行时用量信号已连接。" : "页面可用，但数据源未连接。",
      },
      {
        id: "replay",
        name: "回放与审计",
        route: "/audit",
        status: input.replayCount > 0 ? "enabled" : "warn",
        detail: input.replayCount > 0 ? `可用时间线事件 ${input.replayCount} 条。` : "页面可用，但暂无时间线事件。",
      },
      {
        id: "health_digest",
        name: "健康与日报",
        route: "/digest/latest",
        status: input.digestConnected ? "enabled" : "warn",
        detail: input.digestConnected ? "健康与日报入口均可用。" : "健康入口可用，日报将在监控周期后生成。",
      },
      {
        id: "export_import",
        name: "导出 / 导入演练",
        route: "/?section=settings",
        status: input.importGuard.defaultMode === "blocked" ? "warn" : "enabled",
        detail: `导入默认模式：${input.importGuard.defaultMode}，导出入口可用。`,
      },
      {
        id: "pixel",
        name: "像素画布适配",
        route: "/view/pixel-state.json",
        status: "enabled",
        detail: "像素场景接口可用。",
      },
      {
        id: "subscription",
        name: "订阅用量与余额",
        route: "/?section=usage-cost",
        status: input.subscriptionConnected ? "enabled" : "warn",
        detail: input.subscriptionConnected
          ? `订阅数据已连接${input.budgetConnected ? "，预算预测已启用。" : "。"}`
          : "订阅页面可用，本地账单快照尚未连接。",
      },
    ];
  }

  function renderParitySurfaceRows(rows) {
    return rows
      .map(
        (row) =>
          `<tr><td>${escapeHtml(row.name)}</td><td>${badge(row.status)}</td><td><a href="${escapeHtml(
            row.route,
          )}">${escapeHtml(row.route)}</a></td><td>${escapeHtml(row.detail)}</td></tr>`,
      )
      .join("");
  }

  function parseSubscriptionConnectPaths(connectHint) {
    if (!connectHint) {
      return [];
    }
    const normalized = connectHint.trim();
    if (!normalized) {
      return [];
    }
    const marker = "Provide one of:";
    const body = normalized.startsWith(marker) ? normalized.slice(marker.length).trim() : normalized;
    if (!body) {
      return [];
    }
    return body
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return {
    buildParitySurfaceRows,
    buildBudgetBars,
    compareApprovals,
    parseSubscriptionConnectPaths,
    renderActionQueue,
    renderBudgetBars,
    renderChecklistRows,
    renderExceptionsList,
    renderMetricSummary,
    renderParitySurfaceRows,
    renderProjectBoard,
    renderReadinessRows,
    renderSelectOptions,
  };
}

module.exports = { createDashboardFragmentHelpers };
