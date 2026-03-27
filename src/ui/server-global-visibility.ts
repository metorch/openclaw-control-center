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
        title: "\u5168\u5C40\u603B\u89C8",
        summary: "\u4E00\u773C\u770B\u56DB\u4EF6\u4E8B\uFF1A\u5B9A\u65F6\u4EFB\u52A1\u3001\u4EFB\u52A1\u5FC3\u8DF3\u3001\u5F53\u524D\u4EFB\u52A1\u3001\u5DE5\u5177\u8C03\u7528\u3002",
        scheduleLabel: "\u5B9A\u65F6\u4EFB\u52A1\uFF1A",
        heartbeatLabel: "\u4EFB\u52A1\u5FC3\u8DF3\uFF1A",
        currentTasksLabel: "\u5F53\u524D\u4EFB\u52A1\uFF1A",
        toolCallsLabel: "\u5DE5\u5177\u8C03\u7528\uFF1A",
        scheduleLinkLabel: "\u67E5\u770B\u5B9A\u65F6\u4EFB\u52A1",
        heartbeatLinkLabel: "\u67E5\u770B\u4EFB\u52A1\u5FC3\u8DF3",
        currentTasksLinkLabel: "\u67E5\u770B\u5F53\u524D\u4EFB\u52A1",
        toolCallsLinkLabel: "\u67E5\u770B\u5DE5\u5177\u8C03\u7528",
        doneLabel: "\u5DF2\u5B8C\u6210",
        notDoneLabel: "\u672A\u5B8C\u6210",
        taskTypeLabel: "\u7C7B\u578B",
        taskNameLabel: "\u4E8B\u9879",
        executorLabel: "\u667A\u80FD\u4F53",
        currentActionLabel: "\u6B63\u5728\u505A\u4EC0\u4E48",
        nextRunLabel: "\u4E0B\u6B21\u68C0\u67E5",
        latestResultLabel: "\u6700\u8FD1\u7ED3\u679C",
        statusLabel: "\u72B6\u6001",
        nextActionLabel: "\u4E0B\u4E00\u6B65",
        detailsLabel: "\u8BE6\u60C5",
        doneStatusText: "\u5DF2\u5B8C\u6210",
        notDoneStatusText: "\u672A\u5B8C\u6210",
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
    const noSignalText = pickUiText(language, "No update yet.", "\u6682\u65E0\u66F4\u65B0\u3002");
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
    const stripSummary = pickUiText(
      language,
      `${model.doneCount} ready · ${model.notDoneCount} need follow-up`,
      `\u5DF2\u5C31\u7EEA ${model.doneCount} \u9879 \xB7 \u8FD8\u9700\u8DDF\u8FDB ${model.notDoneCount} \u9879`,
    );
    return `<div class="status-strip compact dashboard-strip">
      ${renderSignalCard({ label: copy.scheduleLabel, value: model.signalCounts.schedule, status: scheduleStatus, statusLabel: scheduleStatus === "done" ? doneStatusLabel : notDoneStatusLabel, signalText: scheduleSignalText, signalSmallHtml: scheduleSignalSmall, href: scheduleHref, linkLabel: copy.scheduleLinkLabel })}
      ${renderSignalCard({ label: copy.heartbeatLabel, value: model.signalCounts.heartbeat, status: heartbeatStatus, statusLabel: heartbeatStatus === "done" ? doneStatusLabel : notDoneStatusLabel, signalText: heartbeatSignalText, href: heartbeatHref, linkLabel: copy.heartbeatLinkLabel })}
      ${renderSignalCard({ label: copy.currentTasksLabel, value: model.signalCounts.currentTasks, status: currentTasksStatus, statusLabel: currentTasksStatus === "done" ? doneStatusLabel : notDoneStatusLabel, signalText: currentTasksSignalText, href: currentTasksHref, linkLabel: copy.currentTasksLinkLabel })}
      ${renderSignalCard({ label: copy.toolCallsLabel, value: model.signalCounts.toolCalls, status: toolCallsStatus, statusLabel: toolCallsStatus === "done" ? doneStatusLabel : notDoneStatusLabel, signalText: toolCallsSignalText, href: toolCallsHref, linkLabel: copy.toolCallsLinkLabel })}
      <div class="dashboard-strip-summary"><strong>${copy.doneLabel} ${model.doneCount}</strong><span>${stripSummary}</span></div>
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
        ? pickUiText(language, `${enabledCronCount} jobs enabled`, `\u5DF2\u542F\u7528 ${enabledCronCount} \u4E2A`)
        : pickUiText(language, "No timed jobs", "\u6682\u65E0\u5B9A\u65F6\u4EFB\u52A1");
    const cronOwner =
      enabledOpenclawCronJobs.length > 0
        ? summarizeNames(
            enabledOpenclawCronJobs.map((job) => job.owner),
            language,
            pickUiText(language, "Scheduler", "\u8C03\u5EA6\u5668"),
          )
        : formatExecutorAgentLabel("system-cron", language);
    const cronPurpose =
      (enabledOpenclawCronJobs[0]?.purpose
        ? sanitizeCronPurposeText(enabledOpenclawCronJobs[0]?.purpose, language, 56)
        : "") ||
      (enabledRuntimeCronJobs[0]
        ? cronRuntimePurpose(enabledRuntimeCronJobs[0].jobId, language)
        : pickUiText(language, "No timed job is running.", "\u5F53\u524D\u6CA1\u6709\u5B9A\u65F6\u4EFB\u52A1\u5728\u8FD0\u884C\u3002"));
    const cronNextRun =
      nonHeartbeatRuntimeCronJobs.find((job) => job.enabled)?.nextRunAt ??
      cronOverview.nextRunAt ??
      pickUiText(language, "Not scheduled", "\u672A\u6392\u7A0B");
    const heartbeatNextRun =
      heartbeatJobs.find((job) => job.enabled)?.nextRunAt ??
      heartbeatJobs[0]?.nextRunAt ??
      pickUiText(language, "Not scheduled", "\u672A\u6392\u7A0B");
    const heartbeatTaskName = pickUiText(language, "Task heartbeat service", "\u4EFB\u52A1\u5FC3\u8DF3\u670D\u52A1");
    const heartbeatLatestResult = heartbeatEnabled
      ? latestHeartbeatRun
        ? pickUiText(
            language,
            `Last heartbeat: selected ${latestHeartbeatRun.selected} tasks, started ${latestHeartbeatRun.executed}.`,
            `\u6700\u8FD1\u5FC3\u8DF3\uFF1A\u9009\u4E2D ${latestHeartbeatRun.selected} \u4E2A\u4EFB\u52A1\uFF0C\u542F\u52A8 ${latestHeartbeatRun.executed} \u4E2A\u3002`,
          )
        : pickUiText(
            language,
            `Active heartbeat checks: ${enabledHeartbeatCount}.`,
            `\u5DF2\u542F\u7528 ${enabledHeartbeatCount} \u4E2A\u5FC3\u8DF3\u68C0\u67E5\u3002`,
          )
      : pickUiText(language, "No heartbeat check yet.", "\u8FD8\u6CA1\u6709\u5FC3\u8DF3\u68C0\u67E5\u8BB0\u5F55\u3002");
    const heartbeatPurpose = pickUiText(
      language,
      "Check assigned tasks and start the picked ones.",
      "\u68C0\u67E5\u5DF2\u5206\u914D\u4EFB\u52A1\u5E76\u542F\u52A8\u88AB\u9009\u4E2D\u7684\u9879\u3002",
    );
    const scheduleReady = enabledCronCount > 0;
    const rows = [
      {
        taskType: "cron",
        taskTypeLabel: pickUiText(language, "Timed jobs", "\u5B9A\u65F6\u4EFB\u52A1"),
        taskName: cronTaskName,
        executor: cronOwner,
        currentAction: scheduleReady
          ? pickUiText(language, `Now running: ${cronPurpose}`, `\u6B63\u5728\u8FD0\u884C\uFF1A${cronPurpose}`)
          : pickUiText(language, "Timed jobs are off.", "\u5B9A\u65F6\u4EFB\u52A1\u8FD8\u672A\u5F00\u542F\u3002"),
        nextRun: cronNextRun,
        latestResult: scheduleReady
          ? pickUiText(
              language,
              `Active timed jobs: ${enabledCronCount}.`,
              `\u5DF2\u542F\u7528 ${enabledCronCount} \u4E2A\u5B9A\u65F6\u4EFB\u52A1\u3002`,
            )
          : pickUiText(language, "No timed job yet.", "\u8FD8\u6CA1\u6709\u5B9A\u65F6\u4EFB\u52A1\u8BB0\u5F55\u3002"),
        status: scheduleReady ? "done" : "not_done",
        nextAction: scheduleReady
          ? pickUiText(
              language,
              "Keep timed jobs on and keep each job goal clear.",
              "\u4FDD\u6301\u5B9A\u65F6\u4EFB\u52A1\u5F00\u542F\uFF0C\u5E76\u786E\u8BA4\u6BCF\u4E2A\u4EFB\u52A1\u76EE\u6807\u6E05\u695A\u3002",
            )
          : pickUiText(language, "Turn on one timed job.", "\u5148\u6DFB\u52A0\u4E00\u4E2A\u5B9A\u65F6\u4EFB\u52A1\u3002"),
        detailsHref: buildGlobalVisibilityDetailHref("cron", language),
        detailsLabel: pickUiText(language, "See timed jobs", "\u67E5\u770B\u5B9A\u65F6\u4EFB\u52A1"),
      },
      {
        taskType: "heartbeat",
        taskTypeLabel: pickUiText(language, "Heartbeat", "\u4EFB\u52A1\u5FC3\u8DF3"),
        taskName: heartbeatTaskName,
        executor: formatExecutorAgentLabel("task-heartbeat-worker", language),
        currentAction: heartbeatEnabled
          ? pickUiText(
              language,
              `Heartbeat is on: ${heartbeatPurpose}`,
              `\u5FC3\u8DF3\u5DF2\u5F00\u542F\uFF1A${heartbeatPurpose}`,
            )
          : pickUiText(language, "Heartbeat is off.", "\u5FC3\u8DF3\u8FD8\u672A\u5F00\u542F\u3002"),
        nextRun: heartbeatNextRun,
        latestResult: heartbeatLatestResult,
        status: heartbeatEnabled ? "done" : "not_done",
        nextAction: heartbeatEnabled
          ? pickUiText(
              language,
              "Check picked tasks and confirm the choices look right.",
              "\u68C0\u67E5\u88AB\u9009\u4E2D\u7684\u4EFB\u52A1\uFF0C\u786E\u8BA4\u6311\u9009\u7ED3\u679C\u5408\u7406\u3002",
            )
          : pickUiText(language, "Turn on heartbeat.", "\u5728\u5B9A\u65F6\u4EFB\u52A1\u91CC\u5F00\u542F\u5FC3\u8DF3\u3002"),
        detailsHref: buildGlobalVisibilityDetailHref("heartbeat", language),
        detailsLabel: pickUiText(language, "See heartbeat checks", "\u67E5\u770B\u4EFB\u52A1\u5FC3\u8DF3"),
      },
      {
        taskType: "current_task",
        taskTypeLabel: pickUiText(language, "Current tasks", "\u5F53\u524D\u4EFB\u52A1"),
        taskName: pickUiText(language, "Current tasks", "\u5F53\u524D\u4EFB\u52A1"),
        executor: pickUiText(language, "Task owners", "\u4EFB\u52A1\u8D1F\u8D23\u4EBA"),
        currentAction:
          currentTasksCount > 0
            ? hasWeakEvidence
              ? pickUiText(
                  language,
                  "Some current tasks still need follow-up.",
                  "\u6709\u4E9B\u5F53\u524D\u4EFB\u52A1\u8FD8\u9700\u8981\u8DDF\u8FDB\u3002",
                )
              : pickUiText(
                  language,
                  "Current tasks are visible in runtime.",
                  "\u5F53\u524D\u4EFB\u52A1\u5DF2\u80FD\u5728\u8FD0\u884C\u4FE1\u53F7\u4E2D\u770B\u89C1\u3002",
                )
            : pickUiText(language, "No current task signal is visible now.", "\u5F53\u524D\u8FD8\u6CA1\u6709\u53EF\u89C1\u7684\u4EFB\u52A1\u6267\u884C\u4FE1\u53F7\u3002"),
        nextRun: pickUiText(language, "Live update", "\u5B9E\u65F6\u66F4\u65B0"),
        latestResult:
          currentTasksCount > 0
            ? hasWeakEvidence
              ? pickUiText(
                  language,
                  `${strongTaskEvidenceCount} confirmed live, ${followupTaskEvidenceCount} need follow-up, ${weakTaskEvidenceCount} need inspection.`,
                  `\u5DF2\u786E\u8BA4\u5728\u8DD1 ${strongTaskEvidenceCount} \u4E2A\uFF0C\u9700\u8981\u8DDF\u8FDB ${followupTaskEvidenceCount} \u4E2A\uFF0C\u9700\u8981\u6392\u67E5 ${weakTaskEvidenceCount} \u4E2A\u3002`,
                )
              : pickUiText(
                  language,
                  `${currentTasksCount} current tasks are backed by runtime signals.`,
                  `\u5DF2\u6709\u8FD0\u884C\u4FE1\u53F7\u652F\u6491\u7684\u5F53\u524D\u4EFB\u52A1 ${currentTasksCount} \u4E2A\u3002`,
                )
            : pickUiText(language, "No current task signal yet.", "\u5F53\u524D\u8FD8\u6CA1\u6709\u4EFB\u52A1\u6267\u884C\u4FE1\u53F7\u3002"),
        status: currentTasksCount > 0 && !hasWeakEvidence ? "done" : "not_done",
        nextAction:
          currentTasksCount > 0
            ? hasWeakEvidence
              ? pickUiText(
                  language,
                  "Open current tasks and inspect the follow-up items first.",
                  "\u6253\u5F00\u5F53\u524D\u4EFB\u52A1\uFF0C\u5148\u68C0\u67E5\u9700\u8DDF\u8FDB\u7684\u9879\u3002",
                )
              : pickUiText(language, "Keep following the runtime signals.", "\u7EE7\u7EED\u76EF\u4F4F\u8FD0\u884C\u4FE1\u53F7\u5373\u53EF\u3002")
            : pickUiText(
                language,
                "Start one task and let runtime evidence appear first.",
                "\u5148\u542F\u52A8\u4E00\u4E2A\u4EFB\u52A1\uFF0C\u8BA9\u8FD0\u884C\u8BC1\u636E\u51FA\u73B0\u3002",
              ),
        detailsHref: buildGlobalVisibilityDetailHref("current_task", language),
        detailsLabel: pickUiText(language, "See current tasks", "\u67E5\u770B\u5F53\u524D\u4EFB\u52A1"),
      },
      {
        taskType: "tool_call",
        taskTypeLabel: pickUiText(language, "Tool calls", "\u5DE5\u5177\u8C03\u7528"),
        taskName: pickUiText(language, "Tool calls", "\u5DE5\u5177\u8C03\u7528"),
        executor: pickUiText(language, "Active sessions", "\u6D3B\u8DC3\u4F1A\u8BDD"),
        currentAction:
          toolCallsCount > 0
            ? pickUiText(language, "Tools were used recently.", "\u6700\u8FD1\u6709\u5DE5\u5177\u5728\u4F7F\u7528\u3002")
            : pickUiText(language, "No tool use yet.", "\u6700\u8FD1\u8FD8\u6CA1\u6709\u5DE5\u5177\u4F7F\u7528\u3002"),
        nextRun: pickUiText(language, "Live update", "\u5B9E\u65F6\u66F4\u65B0"),
        latestResult:
          toolCallsCount > 0
            ? pickUiText(
                language,
                `Tool calls in recent activity: ${toolCallsCount}.`,
                `\u6700\u8FD1\u5DE5\u5177\u8C03\u7528 ${toolCallsCount} \u6B21\u3002`,
              )
            : pickUiText(language, "No tool calls yet.", "\u5C1A\u65E0\u5DE5\u5177\u8C03\u7528\u8BB0\u5F55\u3002"),
        status: toolCallsCount > 0 ? "done" : "not_done",
        nextAction:
          toolCallsCount > 0
            ? pickUiText(language, "Review results and keep going.", "\u770B\u4E0B\u7ED3\u679C\u540E\u7EE7\u7EED\u5373\u53EF\u3002")
            : pickUiText(language, "Run one small tool step.", "\u5148\u8DD1\u4E00\u6B21\u5C0F\u5DE5\u5177\u6B65\u9AA4\u3002"),
        detailsHref: buildGlobalVisibilityDetailHref("tool_call", language),
        detailsLabel: pickUiText(language, "See tool calls", "\u67E5\u770B\u5DE5\u5177\u8C03\u7528"),
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
        "\u6682\u65E0\u5B9A\u65F6\u4EFB\u52A1\u3001\u4EFB\u52A1\u5FC3\u8DF3\u3001\u5F53\u524D\u4EFB\u52A1\u6216\u5DE5\u5177\u8C03\u7528\u3002",
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

