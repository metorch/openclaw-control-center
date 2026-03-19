// @ts-nocheck

const { readFile } = require("node:fs/promises");

function createGlobalVisibilityRenderers(deps) {
  const {
    badge,
    buildCronOverview,
    buildHomeHref,
    cronPayloadOwner,
    cronPayloadOwnerAgentId,
    cronPayloadPurpose,
    cronPollingIntervalMs,
    cronRuntimePurpose,
    cronScheduleLabel,
    escapeHtml,
    formatExecutorAgentLabel,
    getOpenClawCronJobsCandidates,
    listSessionConversations,
    pickUiText,
    readTaskHeartbeatRuns,
    sanitizeCronPurposeText,
    summarizeNames,
    asObject,
  } = deps;

  function globalVisibilityCopy(language) {
    if (language === "zh") {
      return {
        title: "全局总览",
        summary: "一眼看四件事：定时任务、任务心跳、当前任务、工具调用。",
        scheduleLabel: "定时任务：",
        heartbeatLabel: "任务心跳：",
        currentTasksLabel: "当前任务：",
        toolCallsLabel: "工具调用：",
        scheduleLinkLabel: "查看定时任务",
        heartbeatLinkLabel: "查看任务心跳",
        currentTasksLinkLabel: "查看当前任务",
        toolCallsLinkLabel: "查看工具调用",
        doneLabel: "已完成",
        notDoneLabel: "未完成",
        taskTypeLabel: "类型",
        taskNameLabel: "事项",
        executorLabel: "智能体",
        currentActionLabel: "正在做什么",
        nextRunLabel: "下次检查",
        latestResultLabel: "最近结果",
        statusLabel: "状态",
        nextActionLabel: "下一步",
        detailsLabel: "详情",
        doneStatusText: "已完成",
        notDoneStatusText: "未完成",
      };
    }
    return {
      title: "Global Visibility",
      summary: "One place to see timed jobs, heartbeat, current tasks, and tool calls.",
      scheduleLabel: "Timed jobs:",
      heartbeatLabel: "Heartbeat checks:",
      currentTasksLabel: "Current tasks:",
      toolCallsLabel: "Tool calls:",
      scheduleLinkLabel: "See timed jobs",
      heartbeatLinkLabel: "See heartbeat checks",
      currentTasksLinkLabel: "See current tasks",
      toolCallsLinkLabel: "See tool calls",
      doneLabel: "Done",
      notDoneLabel: "Not done",
      taskTypeLabel: "Type",
      taskNameLabel: "Item",
      executorLabel: "Owner",
      currentActionLabel: "Now",
      nextRunLabel: "Next check",
      latestResultLabel: "Latest",
      statusLabel: "Status",
      nextActionLabel: "Next step",
      detailsLabel: "View",
      doneStatusText: "Done",
      notDoneStatusText: "Not done",
    };
  }

  function buildGlobalVisibilityDetailHref(taskType, language) {
    if (taskType === "cron") {
      return `${buildHomeHref({ quick: "all" }, true, "overview", language)}#cron-health`;
    }
    if (taskType === "heartbeat") {
      return `${buildHomeHref({ quick: "all" }, true, "overview", language)}#heartbeat-health`;
    }
    if (taskType === "current_task") {
      return `${buildHomeHref({ quick: "all" }, true, "projects-tasks", language)}#tracked-task-view`;
    }
    return `${buildHomeHref({ quick: "all" }, true, "overview", language)}#tool-activity`;
  }

  function resolveGlobalVisibilitySignalStatus(model, taskType) {
    const rows = model.tasks.filter((row) => row.taskType === taskType);
    if (rows.length === 0) return "not_done";
    return rows.some((row) => row.status === "not_done") ? "not_done" : "done";
  }

  function renderGlobalVisibilityStrip(model, language) {
    const copy = globalVisibilityCopy(language);
    const scheduleRow = model.tasks.find((row) => row.taskType === "cron");
    const heartbeatRow = model.tasks.find((row) => row.taskType === "heartbeat");
    const currentTasksRow = model.tasks.find((row) => row.taskType === "current_task");
    const toolCallsRow = model.tasks.find((row) => row.taskType === "tool_call");
    const scheduleHref = scheduleRow?.detailsHref ?? buildGlobalVisibilityDetailHref("cron", language);
    const heartbeatHref = heartbeatRow?.detailsHref ?? buildGlobalVisibilityDetailHref("heartbeat", language);
    const currentTasksHref = currentTasksRow?.detailsHref ?? buildGlobalVisibilityDetailHref("current_task", language);
    const toolCallsHref = toolCallsRow?.detailsHref ?? buildGlobalVisibilityDetailHref("tool_call", language);
    const noSignalText = pickUiText(language, "No update yet.", "暂无更新。");
    const scheduleSignalText = scheduleRow?.currentAction ?? noSignalText;
    const heartbeatSignalText = heartbeatRow?.currentAction ?? noSignalText;
    const currentTasksSignalText = currentTasksRow?.currentAction ?? noSignalText;
    const toolCallsSignalText = toolCallsRow?.currentAction ?? noSignalText;
    const scheduleStatus = resolveGlobalVisibilitySignalStatus(model, "cron");
    const heartbeatStatus = resolveGlobalVisibilitySignalStatus(model, "heartbeat");
    const currentTasksStatus = resolveGlobalVisibilitySignalStatus(model, "current_task");
    const toolCallsStatus = resolveGlobalVisibilitySignalStatus(model, "tool_call");
    const doneStatusLabel = copy.doneStatusText;
    const notDoneStatusLabel = copy.notDoneStatusText;
    const signalTotal =
      model.signalCounts.schedule +
      model.signalCounts.heartbeat +
      model.signalCounts.currentTasks +
      model.signalCounts.toolCalls;
    const scheduleSignalSmall = `<small>${escapeHtml(scheduleSignalText)}</small>`;
    const gaugeTone = (status) => (status === "done" ? "var(--ok)" : "var(--warn)");
    const gaugePct = (count, status) => {
      if (signalTotal <= 0) return status === "done" ? 32 : 14;
      const raw = Math.round((count / signalTotal) * 100);
      return status === "done" ? Math.max(34, raw) : Math.max(14, raw);
    };
    const renderSignalCard = (input) => {
      const pct = gaugePct(input.value, input.status);
      return `<div class="status-chip signal-gauge-card" data-signal-key="${escapeHtml(input.label)}" data-signal-value="${input.value}">
      <div class="signal-gauge-head"><span>${input.label}</span>${badge(input.status, input.statusLabel)}</div>
      <div class="signal-gauge-main">
        <div class="signal-gauge" style="--gauge-pct:${pct}; --gauge-tone:${gaugeTone(input.status)};">
          <div class="signal-gauge-core"><strong>${input.value}</strong></div>
        </div>
        <div class="signal-gauge-meta">
          ${input.signalSmallHtml ?? `<small>${escapeHtml(input.signalText)}</small>`}
          <a href="${escapeHtml(input.href)}">${input.linkLabel}</a>
        </div>
      </div>
    </div>`;
    };
    return `<div class="status-strip compact dashboard-strip">
      ${renderSignalCard({ label: copy.scheduleLabel, value: model.signalCounts.schedule, status: scheduleStatus, statusLabel: scheduleStatus === "done" ? doneStatusLabel : notDoneStatusLabel, signalText: scheduleSignalText, signalSmallHtml: scheduleSignalSmall, href: scheduleHref, linkLabel: copy.scheduleLinkLabel })}
      ${renderSignalCard({ label: copy.heartbeatLabel, value: model.signalCounts.heartbeat, status: heartbeatStatus, statusLabel: heartbeatStatus === "done" ? doneStatusLabel : notDoneStatusLabel, signalText: heartbeatSignalText, href: heartbeatHref, linkLabel: copy.heartbeatLinkLabel })}
      ${renderSignalCard({ label: copy.currentTasksLabel, value: model.signalCounts.currentTasks, status: currentTasksStatus, statusLabel: currentTasksStatus === "done" ? doneStatusLabel : notDoneStatusLabel, signalText: currentTasksSignalText, href: currentTasksHref, linkLabel: copy.currentTasksLinkLabel })}
      ${renderSignalCard({ label: copy.toolCallsLabel, value: model.signalCounts.toolCalls, status: toolCallsStatus, statusLabel: toolCallsStatus === "done" ? doneStatusLabel : notDoneStatusLabel, signalText: toolCallsSignalText, href: toolCallsHref, linkLabel: copy.toolCallsLinkLabel })}
      <div class="status-chip summary-gauge-card">
        <span>${copy.doneLabel}</span>
        <strong>${model.doneCount}</strong>
        <div class="summary-track"><div class="summary-fill" style="width:${Math.round((model.doneCount / Math.max(1, model.tasks.length)) * 100)}%;"></div></div>
      </div>
      <div class="status-chip summary-gauge-card">
        <span>${copy.notDoneLabel}</span>
        <strong>${model.notDoneCount}</strong>
        <div class="summary-track"><div class="summary-fill warn" style="width:${Math.round((model.notDoneCount / Math.max(1, model.tasks.length)) * 100)}%;"></div></div>
      </div>
    </div>`;
  }

  function renderGlobalVisibilityCard(model, language) {
    const copy = globalVisibilityCopy(language);
    if (model.tasks.length === 0) {
      return `<details class="card compact-details stack-gap global-visibility-card" id="global-visibility-card">
      <summary>${copy.title}</summary>
      <div class="fold-body">
        <div class="meta">${copy.summary}</div>
        ${renderGlobalVisibilityStrip(model, language)}
        <div class="empty-state">${escapeHtml(model.noTaskMessage)}</div>
      </div>
    </details>`;
    }
    const rows = model.tasks
      .map((row) => {
        const statusLabel = row.status === "done" ? copy.doneStatusText : copy.notDoneStatusText;
        return `<tr>
        <td>${escapeHtml(row.taskTypeLabel)}</td>
        <td>${escapeHtml(row.taskName)}</td>
        <td>${escapeHtml(row.executor)}</td>
        <td>${escapeHtml(row.currentAction)}</td>
        <td>${escapeHtml(row.nextRun)}</td>
        <td>${escapeHtml(row.latestResult)}</td>
        <td>${badge(row.status, statusLabel)}</td>
        <td>${escapeHtml(row.nextAction)}</td>
        <td><a href="${escapeHtml(row.detailsHref)}">${escapeHtml(row.detailsLabel)}</a></td>
      </tr>`;
      })
      .join("");
    return `<details class="card compact-details stack-gap global-visibility-card" id="global-visibility-card">
        <summary>${copy.title}</summary>
        <div class="fold-body">
          <div class="meta">${copy.summary}</div>
          ${renderGlobalVisibilityStrip(model, language)}
          <details class="compact-table-details">
            <summary>${copy.detailsLabel}（${model.tasks.length}）</summary>
            <table class="ops-board">
              <thead>
                <tr>
                  <th>${copy.taskTypeLabel}</th>
                  <th>${copy.taskNameLabel}</th>
                  <th>${copy.executorLabel}</th>
                  <th>${copy.currentActionLabel}</th>
                  <th>${copy.nextRunLabel}</th>
                  <th>${copy.latestResultLabel}</th>
                  <th>${copy.statusLabel}</th>
                  <th>${copy.nextActionLabel}</th>
                  <th>${copy.detailsLabel}</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </details>
        </div>
      </details>`;
  }

  function renderGlobalVisibilityStripCard(model, language) {
    const copy = globalVisibilityCopy(language);
    return `<section class="card stack-gap global-visibility-strip-card" id="global-visibility-strip">
      <header class="card-head">
        <h2>${copy.title}</h2>
        <div class="meta">${copy.summary}</div>
      </header>
      ${renderGlobalVisibilityStrip(model, language)}
    </section>`;
  }

  async function loadOpenclawCronCatalog(language) {
    for (const candidate of [...new Set(getOpenClawCronJobsCandidates())]) {
      try {
        const raw = JSON.parse(await readFile(candidate, "utf8"));
        const root = asObject(raw);
        const jobsRaw = root && Array.isArray(root.jobs) ? root.jobs : [];
        const jobs = [];
        for (const item of jobsRaw) {
          const obj = asObject(item);
          if (!obj) continue;
          const jobId = typeof obj.id === "string" ? obj.id.trim() : "";
          if (!jobId) continue;
          const name = typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : jobId;
          const payload = asObject(obj.payload);
          const schedule = asObject(obj.schedule);
          jobs.push({
            jobId,
            name,
            enabled: obj.enabled !== false,
            owner: cronPayloadOwner(payload, language),
            ownerAgentId: cronPayloadOwnerAgentId(payload),
            purpose: cronPayloadPurpose(payload, language),
            scheduleLabel: cronScheduleLabel(schedule, language),
            sourcePath: candidate,
          });
        }
        jobs.sort((a, b) => {
          if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        return jobs;
      } catch {
        continue;
      }
    }
    return [];
  }

  async function countRecentToolCalls(snapshot, toolClient) {
    if (!Array.isArray(snapshot.sessions) || snapshot.sessions.length === 0) return 0;
    const recentSessions = await listSessionConversations({
      snapshot,
      client: toolClient,
      filters: {},
      page: 1,
      pageSize: 20,
      historyLimit: 6,
    });
    return recentSessions.items.reduce((sum, item) => {
      if (typeof item.toolEventCount === "number") return sum + item.toolEventCount;
      return sum + (item.latestKind === "tool_event" ? 1 : 0);
    }, 0);
  }

  async function buildGlobalVisibilityViewModel(snapshot, toolClient, language, input = {}) {
    const cronOverview =
      input.cronOverview ?? (await buildCronOverview(snapshot, cronPollingIntervalMs));
    const openclawCronJobs = input.openclawCronJobs ?? (await loadOpenclawCronCatalog(language));
    const inProgressCount = snapshot.tasksSummary.inProgress ?? 0;
    const blockedCount = snapshot.tasksSummary.blocked ?? 0;
    const strongTaskEvidenceCount =
      typeof input.strongTaskEvidenceCount === "number"
        ? input.strongTaskEvidenceCount
        : Math.max(0, inProgressCount - blockedCount);
    const followupTaskEvidenceCount =
      typeof input.followupTaskEvidenceCount === "number" ? input.followupTaskEvidenceCount : 0;
    const weakTaskEvidenceCount =
      typeof input.weakTaskEvidenceCount === "number" ? input.weakTaskEvidenceCount : blockedCount;
    const currentTasksCount =
      input.currentTasksCount ??
      Math.max(
        inProgressCount + blockedCount,
        strongTaskEvidenceCount + followupTaskEvidenceCount + weakTaskEvidenceCount,
      );
    const hasWeakEvidence = weakTaskEvidenceCount > 0;
    const toolCallsCount = input.toolCallsCount ?? (await countRecentToolCalls(snapshot, toolClient));
    const nonHeartbeatRuntimeCronJobs = cronOverview.jobs.filter(
      (job) => !job.jobId.toLowerCase().includes("heartbeat"),
    );
    const heartbeatJobs = cronOverview.jobs.filter((job) =>
      job.jobId.toLowerCase().includes("heartbeat"),
    );
    const enabledRuntimeCronJobs = nonHeartbeatRuntimeCronJobs.filter((job) => job.enabled);
    const enabledOpenclawCronJobs = openclawCronJobs.filter((job) => job.enabled);
    const enabledCronCount = new Set([
      ...enabledRuntimeCronJobs.map((job) => job.jobId),
      ...enabledOpenclawCronJobs.map((job) => job.jobId),
    ]).size;
    const enabledHeartbeatCount = heartbeatJobs.filter((job) => job.enabled).length;
    const heartbeatEnabled = heartbeatJobs.some((job) => job.enabled);
    const latestHeartbeatRun = (await readTaskHeartbeatRuns(1)).runs[0];
    const cronTaskName =
      enabledCronCount > 0
        ? pickUiText(language, `${enabledCronCount} jobs enabled`, `已启用 ${enabledCronCount} 个任务`)
        : pickUiText(language, "No timed jobs", "暂无定时任务");
    const cronOwner =
      enabledOpenclawCronJobs.length > 0
        ? summarizeNames(
            enabledOpenclawCronJobs.map((job) => job.owner),
            language,
            pickUiText(language, "Scheduler", "调度器"),
          )
        : formatExecutorAgentLabel("system-cron", language);
    const cronPurpose =
      (enabledOpenclawCronJobs[0]?.purpose
        ? sanitizeCronPurposeText(enabledOpenclawCronJobs[0]?.purpose, language, 56)
        : "") ||
      (enabledRuntimeCronJobs[0]
        ? cronRuntimePurpose(enabledRuntimeCronJobs[0].jobId, language)
        : pickUiText(language, "No timed job is running.", "当前没有定时任务在运行。"));
    const cronNextRun =
      nonHeartbeatRuntimeCronJobs.find((job) => job.enabled)?.nextRunAt ??
      cronOverview.nextRunAt ??
      pickUiText(language, "Not scheduled", "未排程");
    const heartbeatNextRun =
      heartbeatJobs.find((job) => job.enabled)?.nextRunAt ??
      heartbeatJobs[0]?.nextRunAt ??
      pickUiText(language, "Not scheduled", "未排程");
    const heartbeatTaskName = pickUiText(language, "Task heartbeat service", "任务心跳服务");
    const heartbeatLatestResult = heartbeatEnabled
      ? latestHeartbeatRun
        ? pickUiText(
            language,
            `Last heartbeat: selected ${latestHeartbeatRun.selected} tasks, started ${latestHeartbeatRun.executed}.`,
            `最近心跳：挑出 ${latestHeartbeatRun.selected} 个任务，启动 ${latestHeartbeatRun.executed} 个。`,
          )
        : pickUiText(
            language,
            `Active heartbeat checks: ${enabledHeartbeatCount}.`,
            `已开启任务心跳：${enabledHeartbeatCount} 个。`,
          )
      : pickUiText(language, "No heartbeat check yet.", "还没有任务心跳记录。");
    const heartbeatPurpose = pickUiText(
      language,
      "Check assigned tasks and start the picked ones.",
      "检查已分配任务，并启动挑中的任务。",
    );
    const scheduleReady = enabledCronCount > 0;
    const rows = [
      {
        taskType: "cron",
        taskTypeLabel: pickUiText(language, "Timed jobs", "定时任务"),
        taskName: cronTaskName,
        executor: cronOwner,
        currentAction: scheduleReady
          ? pickUiText(language, `Now running: ${cronPurpose}`, `正在执行：${cronPurpose}`)
          : pickUiText(language, "Timed jobs are off.", "还没有设置定时任务。"),
        nextRun: cronNextRun,
        latestResult: scheduleReady
          ? pickUiText(
              language,
              `Active timed jobs: ${enabledCronCount}.`,
              `已开启定时任务：${enabledCronCount} 个。`,
            )
          : pickUiText(language, "No timed job yet.", "还没有定时任务记录。"),
        status: scheduleReady ? "done" : "not_done",
        nextAction: scheduleReady
          ? pickUiText(
              language,
              "Keep timed jobs on and keep each job goal clear.",
              "保持定时任务开启，并确认每个任务目标清楚。",
            )
          : pickUiText(language, "Turn on one timed job.", "先添加一个定时任务。"),
        detailsHref: buildGlobalVisibilityDetailHref("cron", language),
        detailsLabel: pickUiText(language, "See timed jobs", "查看定时任务"),
      },
      {
        taskType: "heartbeat",
        taskTypeLabel: pickUiText(language, "Heartbeat", "任务心跳"),
        taskName: heartbeatTaskName,
        executor: formatExecutorAgentLabel("task-heartbeat-worker", language),
        currentAction: heartbeatEnabled
          ? pickUiText(
              language,
              `Heartbeat is on: ${heartbeatPurpose}`,
              `任务心跳已开启：${heartbeatPurpose}`,
            )
          : pickUiText(language, "Heartbeat is off.", "还没有设置任务心跳。"),
        nextRun: heartbeatNextRun,
        latestResult: heartbeatLatestResult,
        status: heartbeatEnabled ? "done" : "not_done",
        nextAction: heartbeatEnabled
          ? pickUiText(
              language,
              "Check picked tasks and confirm the choices look right.",
              "查看挑出的任务，确认挑选结果是否合理。",
            )
          : pickUiText(language, "Turn on heartbeat.", "在定时任务里开启心跳。"),
        detailsHref: buildGlobalVisibilityDetailHref("heartbeat", language),
        detailsLabel: pickUiText(language, "See heartbeat checks", "查看任务心跳"),
      },
      {
        taskType: "current_task",
        taskTypeLabel: pickUiText(language, "Current tasks", "当前任务"),
        taskName: pickUiText(language, "Current tasks", "当前任务"),
        executor: pickUiText(language, "Task owners", "任务智能体"),
        currentAction:
          currentTasksCount > 0
            ? hasWeakEvidence
              ? pickUiText(
                  language,
                  "Some current tasks still need follow-up.",
                  "有些当前任务还需要继续跟进。",
                )
              : pickUiText(
                  language,
                  "Current tasks are visible in runtime.",
                  "当前任务已经能在运行时里看见。",
                )
            : pickUiText(language, "No current task signal is visible now.", "当前还没有看见任务执行信号。"),
        nextRun: pickUiText(language, "Live update", "实时更新"),
        latestResult:
          currentTasksCount > 0
            ? hasWeakEvidence
              ? pickUiText(
                  language,
                  `${strongTaskEvidenceCount} confirmed live, ${followupTaskEvidenceCount} need follow-up, ${weakTaskEvidenceCount} need inspection.`,
                  `${strongTaskEvidenceCount} 个已确认在跑，${followupTaskEvidenceCount} 个需跟进，${weakTaskEvidenceCount} 个需排查。`,
                )
              : pickUiText(
                  language,
                  `${currentTasksCount} current tasks are backed by runtime signals.`,
                  `${currentTasksCount} 个当前任务已有运行信号支撑。`,
                )
            : pickUiText(language, "No current task signal yet.", "当前还没有任务执行信号。"),
        status: currentTasksCount > 0 && !hasWeakEvidence ? "done" : "not_done",
        nextAction:
          currentTasksCount > 0
            ? hasWeakEvidence
              ? pickUiText(
                  language,
                  "Open current tasks and inspect the follow-up items first.",
                  "打开当前任务，先检查需要跟进的项。",
                )
              : pickUiText(language, "Keep following the runtime signals.", "继续盯住运行时信号即可。")
            : pickUiText(
                language,
                "Start one task and let runtime evidence appear first.",
                "先启动一个任务，让运行证据出现。",
              ),
        detailsHref: buildGlobalVisibilityDetailHref("current_task", language),
        detailsLabel: pickUiText(language, "See current tasks", "查看当前任务"),
      },
      {
        taskType: "tool_call",
        taskTypeLabel: pickUiText(language, "Tool calls", "工具调用"),
        taskName: pickUiText(language, "Tool calls", "工具调用"),
        executor: pickUiText(language, "Active sessions", "活跃会话"),
        currentAction:
          toolCallsCount > 0
            ? pickUiText(language, "Tools were used recently.", "最近有工具在使用。")
            : pickUiText(language, "No tool use yet.", "最近没有工具在使用。"),
        nextRun: pickUiText(language, "Live update", "实时更新"),
        latestResult:
          toolCallsCount > 0
            ? pickUiText(
                language,
                `Tool calls in recent activity: ${toolCallsCount}.`,
                `最近工具调用：${toolCallsCount} 次。`,
              )
            : pickUiText(language, "No tool calls yet.", "尚无工具调用记录。"),
        status: toolCallsCount > 0 ? "done" : "not_done",
        nextAction:
          toolCallsCount > 0
            ? pickUiText(language, "Review results and keep going.", "看下结果后继续。")
            : pickUiText(language, "Run one small tool step.", "先跑一次小工具步骤。"),
        detailsHref: buildGlobalVisibilityDetailHref("tool_call", language),
        detailsLabel: pickUiText(language, "See tool calls", "查看工具调用"),
      },
    ];
    const doneCount = rows.filter((row) => row.status === "done").length;
    return {
      tasks: rows,
      doneCount,
      notDoneCount: rows.length - doneCount,
      noTaskMessage: pickUiText(
        language,
        "No timed jobs, heartbeat, current tasks, or tool calls yet.",
        "暂无定时任务、任务心跳、当前任务或工具调用。",
      ),
      signalCounts: {
        schedule: enabledCronCount,
        heartbeat: enabledHeartbeatCount,
        currentTasks: currentTasksCount,
        toolCalls: toolCallsCount,
      },
    };
  }

  return {
    buildGlobalVisibilityDetailHref,
    buildGlobalVisibilityViewModel,
    globalVisibilityCopy,
    loadOpenclawCronCatalog,
    renderGlobalVisibilityCard,
    renderGlobalVisibilityStrip,
    renderGlobalVisibilityStripCard,
  };
}

export { createGlobalVisibilityRenderers };
