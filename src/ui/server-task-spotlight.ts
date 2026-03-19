// @ts-nocheck

function createTaskSpotlightHelpers(deps) {
  const {
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
    summarizeVisibleSessionSnippet,
    taskStateLabel,
    taskRuntimeActivityWindowMs,
    toSortableMs,
  } = deps;

  function countStalledRunningSessions(sessions, sessionItems, nowMs, windowMs) {
    const latestBySessionKey = new Map(
      sessionItems.map((item) => [item.sessionKey, pickLatestSessionActivityTimestamp(item.latestHistoryAt, item.lastMessageAt)]),
    );
    return sessions.filter((session) => {
      if (session.state !== "running") {
        return false;
      }
      const latestAt = pickLatestSessionActivityTimestamp(latestBySessionKey.get(session.sessionKey), session.lastMessageAt);
      return isStaleRuntimeTimestamp(latestAt, nowMs, windowMs);
    }).length;
  }

  function resolveTaskSpotlightTone(input) {
    if (
      input.task.status === "blocked" ||
      input.certainty?.tone === "blocked" ||
      input.errorSessionCount > 0 ||
      input.blockedSessionCount > 0 ||
      input.waitingApprovalSessionCount > 0 ||
      input.pendingApprovals > 0
    ) {
      return "issue";
    }
    if (
      input.task.status === "in_progress" ||
      input.certainty?.tone === "ok" ||
      input.liveSessionCount > 0 ||
      input.recentActivityCount > 0
    ) {
      return "working";
    }
    return "idle";
  }

  function resolveTaskSpotlightPriorityBucket(input) {
    if (input.statusTone === "issue" && input.overdue) return 0;
    if (input.statusTone === "issue") return 1;
    if (input.statusTone === "working" && (input.overdue || input.dueSoon)) return 2;
    if (input.statusTone === "working") return 3;
    if (input.task.status === "done") return 6;
    if (input.dueSoon) return 4;
    return 5;
  }

  function taskSpotlightStatusLabel(input, language) {
    if (input.task.status === "done") return pickUiText(language, "Completed", "已完成");
    if (input.statusTone === "issue") {
      if (input.errorSessionCount > 0) return pickUiText(language, "Failed and needs fixing", "失败待修复");
      if (input.blockedSessionCount > 0 || input.task.status === "blocked") {
        return pickUiText(language, "Blocked and unresolved", "阻塞待处理");
      }
      if (input.waitingApprovalSessionCount > 0 || input.pendingApprovals > 0) {
        return pickUiText(language, "Waiting on review", "等待处理");
      }
      return pickUiText(language, "Needs attention", "需要处理");
    }
    if (input.statusTone === "working") return pickUiText(language, "In progress", "工作中");
    return pickUiText(language, "Queued", "排队中");
  }

  function taskSpotlightStatusDotLabel(input, language) {
    if (input.task.status === "done") return pickUiText(language, "Completed", "已完成");
    if (input.statusTone === "working") return pickUiText(language, "Working now", "工作中");
    if (input.statusTone === "issue") {
      if (input.errorSessionCount > 0) return pickUiText(language, "Failure not resolved", "报错未解决");
      if (input.blockedSessionCount > 0 || input.task.status === "blocked") {
        return pickUiText(language, "Blocked and unresolved", "阻塞未解决");
      }
      if (input.waitingApprovalSessionCount > 0 || input.pendingApprovals > 0) {
        return pickUiText(language, "Waiting on decision", "等待决策");
      }
      return pickUiText(language, "Issue detected", "出现问题");
    }
    return pickUiText(language, "Queued", "排队中");
  }

  function taskSpotlightPriorityLabel(priorityBucket, language) {
    switch (priorityBucket) {
      case 0:
        return pickUiText(language, "Immediate", "立即处理");
      case 1:
        return pickUiText(language, "High priority", "高优先级");
      case 2:
        return pickUiText(language, "Follow closely", "重点跟进");
      case 3:
        return pickUiText(language, "Moving", "持续推进");
      case 4:
        return pickUiText(language, "Start soon", "准备启动");
      case 6:
        return pickUiText(language, "Completed", "已完成");
      default:
        return pickUiText(language, "Queued", "排队中");
    }
  }

  function taskSpotlightSummary(input, language) {
    if (input.task.status === "done") {
      return pickUiText(language, "This task is complete and kept here for quick review.", "这项任务已完成，保留在这里便于快速回看。");
    }
    if (input.statusTone === "issue") {
      if (input.errorSessionCount > 0) {
        return pickUiText(language, "A linked execution is failing, so the task has not closed the loop yet.", "关联执行已经报错，这项任务目前还没有闭环。");
      }
      if (input.blockedSessionCount > 0 || input.task.status === "blocked") {
        return pickUiText(language, "The task is blocked and needs the obstacle removed before work can continue.", "任务已经被阻塞，先解除问题后才能继续推进。");
      }
      if (input.waitingApprovalSessionCount > 0 || input.pendingApprovals > 0) {
        return pickUiText(language, "The task is waiting for approval or a manual decision before it can continue.", "任务正在等待审批或人工决定，暂时不能继续。");
      }
      if (input.overdue) {
        return pickUiText(language, "The task is already overdue and still does not have a stable execution path.", "任务已经逾期，而且还没有形成稳定的执行路径。");
      }
      return (
        input.certainty?.summary ??
        pickUiText(language, "This task still needs manual follow-up before it can move safely.", "这项任务还需要人工跟进后，才能继续安全推进。")
      );
    }
    if (input.statusTone === "working") {
      if (input.liveSessionCount > 0) {
        return pickUiText(language, "Live runtime signals show that an employee is actively carrying this task.", "实时运行信号显示，这项任务正在被员工实际处理。");
      }
      if (input.recentActivityCount > 0) {
        return pickUiText(language, "Recent runtime traces show this task is still moving.", "最近的运行痕迹表明，这项任务还在持续推进。");
      }
      return (
        input.certainty?.summary ??
        pickUiText(language, "The task has already started and now needs steady follow-through.", "这项任务已经启动，接下来需要持续跟进。")
      );
    }
    return pickUiText(language, "The task is already in the queue and is waiting to be started.", "这项任务已经进入队列，正在等待启动。");
  }

  function taskSpotlightRecentSignal(input, language) {
    if (input.latestSignalSnippet?.trim()) {
      return summarizeVisibleSessionSnippet(input.latestSignalSnippet, language, 88);
    }
    if (input.latestSignalAt) {
      return pickUiText(
        language,
        `Latest runtime signal ${formatTimeAgoFromNow(input.latestSignalAt, language)}.`,
        `最近运行信号：${formatTimeAgoFromNow(input.latestSignalAt, language)}。`,
      );
    }
    if (input.task.updatedAt) {
      return pickUiText(
        language,
        `Latest board update ${formatTimeAgoFromNow(input.task.updatedAt, language)}.`,
        `最近看板更新：${formatTimeAgoFromNow(input.task.updatedAt, language)}。`,
      );
    }
    return pickUiText(language, "No recent signal yet.", "还没有最近信号。");
  }

  function taskSpotlightNextStep(input, language) {
    if (input.task.status === "done") {
      return pickUiText(language, "Open the detail page if you want to review the sessions or deliverables.", "如果要复盘会话或交付物，可以打开详情页。");
    }
    if (input.errorSessionCount > 0) {
      return input.certainty?.gaps[0] ?? pickUiText(language, "Repair the failing execution first.", "先修复已经失败的执行。");
    }
    if (input.blockedSessionCount > 0 || input.task.status === "blocked") {
      return input.certainty?.gaps[0] ?? pickUiText(language, "Clear the blocker before asking the employee to continue.", "先解除阻塞，再让员工继续。");
    }
    if (input.waitingApprovalSessionCount > 0 || input.pendingApprovals > 0) {
      return input.certainty?.gaps[0] ?? pickUiText(language, "Handle the approval or manual decision first.", "先处理审批或人工确认。");
    }
    if (input.overdue) {
      return pickUiText(language, "Confirm whether to continue now or reset the due time.", "先确认是否立即继续，或重新安排截止时间。");
    }
    if (input.task.status === "todo") {
      return pickUiText(language, "Assign and launch the work when the owner is ready.", "在负责人准备好后分派并启动执行。");
    }
    if (input.certainty?.gaps[0]) return input.certainty.gaps[0];
    return pickUiText(language, "Keep the progress moving and update the result as it lands.", "继续推进任务，并及时更新结果。");
  }

  function taskSpotlightDueLabel(task, dueAtMs, nowMs, language) {
    if (task.status === "done") return pickUiText(language, "Completed", "已完成");
    if (!dueAtMs) return pickUiText(language, "No due time", "未设置截止");
    const diffMs = dueAtMs - nowMs;
    if (diffMs <= 0) return pickUiText(language, "Past due", "已逾期");
    if (diffMs <= 60 * 60 * 1000) return pickUiText(language, "Due within 1 hour", "1 小时内截止");
    if (diffMs <= 24 * 60 * 60 * 1000) return pickUiText(language, "Due today", "今天截止");
    if (diffMs <= 48 * 60 * 60 * 1000) return pickUiText(language, "Due tomorrow", "明天截止");
    return pickUiText(language, "Due later", "后续截止");
  }

  function compareTaskSpotlightCardsWithManualOrder(a, b, manualOrderByTaskId) {
    const aManualIndex = manualOrderByTaskId?.get(a.cardId);
    const bManualIndex = manualOrderByTaskId?.get(b.cardId);
    if (aManualIndex !== void 0 || bManualIndex !== void 0) {
      if (aManualIndex !== void 0 && bManualIndex !== void 0) return aManualIndex - bManualIndex;
      return aManualIndex !== void 0 ? -1 : 1;
    }
    if (a.priorityBucket !== b.priorityBucket) return a.priorityBucket - b.priorityBucket;
    if (a.dueSortValue !== b.dueSortValue) return a.dueSortValue - b.dueSortValue;
    if (b.liveSignalCount !== a.liveSignalCount) return b.liveSignalCount - a.liveSignalCount;
    if (b.updatedSortValue !== a.updatedSortValue) return b.updatedSortValue - a.updatedSortValue;
    return a.cardId.localeCompare(b.cardId);
  }

  function compareTaskSpotlightCards(a, b) {
    return compareTaskSpotlightCardsWithManualOrder(a, b);
  }

  function buildTaskCardManualOrderLookup(taskIds) {
    const lookup = new Map();
    taskIds.forEach((taskId, index) => {
      const normalized = taskId.trim();
      if (!normalized || lookup.has(normalized)) return;
      lookup.set(normalized, index);
    });
    return lookup;
  }

  function buildTaskSpotlightCards(input) {
    const certaintyByTaskId = new Map(input.certaintyCards.map((item) => [item.taskId, item]));
    const previewByKey = new Map(input.sessionItems.map((item) => [item.sessionKey, item]));
    const snapshotByKey = new Map(input.sessions.map((session) => [session.sessionKey, session]));
    const manualOrderByTaskId = buildTaskCardManualOrderLookup(input.manualOrder);
    const pendingApprovalSessionKeys = new Set(
      input.approvals
        .filter((item) => item.status === "pending" && typeof item.sessionKey === "string" && item.sessionKey.trim())
        .map((item) => item.sessionKey.trim()),
    );
    const nowMs = Date.now();

    return input.tasks
      .map((task) => {
        const certainty = certaintyByTaskId.get(task.taskId);
        const linkedSessionKeys = [...new Set(task.sessionKeys.map((item) => item.trim()).filter(Boolean))];
        let liveSessionCount = 0;
        let blockedSessionCount = 0;
        let errorSessionCount = 0;
        let waitingApprovalSessionCount = 0;
        let recentActivityCount = 0;
        let latestSignalAt;
        let latestSignalSnippet;

        for (const sessionKey of linkedSessionKeys) {
          const preview = previewByKey.get(sessionKey);
          const snapshotSession = snapshotByKey.get(sessionKey);
          const state = preview?.state ?? snapshotSession?.state;
          if (state === "running") liveSessionCount += 1;
          if (state === "blocked") blockedSessionCount += 1;
          if (state === "error") errorSessionCount += 1;
          if (state === "waiting_approval") waitingApprovalSessionCount += 1;
          const signalAt = preview?.latestHistoryAt ?? preview?.lastMessageAt ?? snapshotSession?.lastMessageAt;
          if (hasFreshRuntimeTimestamp(signalAt, nowMs, taskRuntimeActivityWindowMs)) {
            recentActivityCount += 1;
          }
          if (toSortableMs(signalAt) >= toSortableMs(latestSignalAt)) {
            latestSignalAt = signalAt;
            latestSignalSnippet = preview?.latestSnippet;
          }
        }

        const pendingApprovals = linkedSessionKeys.filter((sessionKey) => pendingApprovalSessionKeys.has(sessionKey)).length;
        const dueAtMs = toSortableMs(task.dueAt);
        const overdue = task.status !== "done" && dueAtMs > 0 && dueAtMs <= nowMs;
        const dueSoon = task.status !== "done" && dueAtMs > nowMs && dueAtMs - nowMs <= 24 * 60 * 60 * 1000;
        const statusTone = resolveTaskSpotlightTone({
          task,
          certainty,
          liveSessionCount,
          blockedSessionCount,
          errorSessionCount,
          waitingApprovalSessionCount,
          pendingApprovals,
          recentActivityCount,
        });
        const priorityBucket = resolveTaskSpotlightPriorityBucket({ task, statusTone, overdue, dueSoon });
        const ownerLabel = humanizeOperatorLabel(task.owner);

        return {
          cardId: task.taskId,
          cardKind: "task",
          taskId: task.taskId,
          title: task.title,
          projectTitle: task.projectTitle,
          taskStatus: task.status,
          ownerLabel,
          statusTone,
          statusLabel: taskSpotlightStatusLabel(
            { task, statusTone, errorSessionCount, blockedSessionCount, waitingApprovalSessionCount, pendingApprovals },
            input.language,
          ),
          statusDotLabel: taskSpotlightStatusDotLabel(
            { task, statusTone, errorSessionCount, blockedSessionCount, waitingApprovalSessionCount, pendingApprovals },
            input.language,
          ),
          priorityLabel: taskSpotlightPriorityLabel(priorityBucket, input.language),
          boardStatusLabel: taskStateLabel(task.status, input.language),
          boardStatusTone:
            task.status === "done"
              ? "done"
              : task.status === "in_progress"
                ? "in_progress"
                : task.status === "blocked"
                  ? "blocked"
                  : "enabled",
          summary: taskSpotlightSummary(
            {
              task,
              statusTone,
              certainty,
              liveSessionCount,
              blockedSessionCount,
              errorSessionCount,
              waitingApprovalSessionCount,
              pendingApprovals,
              overdue,
              recentActivityCount,
            },
            input.language,
          ),
          recentSignal: taskSpotlightRecentSignal({ task, latestSignalAt, latestSignalSnippet }, input.language),
          nextStep: taskSpotlightNextStep(
            { task, certainty, errorSessionCount, blockedSessionCount, waitingApprovalSessionCount, pendingApprovals, overdue },
            input.language,
          ),
          scheduleLabel: task.dueAt ? pickUiText(input.language, "Due date set", "已设截止") : pickUiText(input.language, "No due date", "未设截止"),
          dueLabel: taskSpotlightDueLabel(task, dueAtMs, nowMs, input.language),
          updatedLabel: task.updatedAt
            ? pickUiText(input.language, `Updated ${formatTimeAgoFromNow(task.updatedAt, input.language)}`, `更新于 ${formatTimeAgoFromNow(task.updatedAt, input.language)}`)
            : pickUiText(input.language, "Update time unavailable", "更新时间未知"),
          detailHref: buildTaskDetailHref(task.taskId, input.language),
          priorityBucket,
          dueSortValue: dueAtMs > 0 ? dueAtMs : Number.POSITIVE_INFINITY,
          updatedSortValue: toSortableMs(task.updatedAt),
          liveSignalCount: liveSessionCount + recentActivityCount,
        };
      })
      .sort((left, right) => compareTaskSpotlightCardsWithManualOrder(left, right, manualOrderByTaskId));
  }

  function buildTimedJobSpotlightCards(input) {
    return input.jobs
      .map((job) => {
        const scheduleLabel = humanizeTimedJobScheduleLabel(job.schedule, input.language);
        const dueSortValue = toSortableMs(job.nextRun);
        const dueLabel =
          job.nextRun && job.nextRun !== "-"
            ? humanizeTimedJobWindowLabel(job.nextRun, job.dueInSeconds, input.language)
            : pickUiText(input.language, "Waiting for sync", "等待同步");
        const dueInLabel = Number.isFinite(job.dueInSeconds)
          ? pickUiText(input.language, `Due in ${formatSeconds(job.dueInSeconds, input.language)}`, `${formatSeconds(job.dueInSeconds, input.language)}后执行`)
          : pickUiText(input.language, "Waiting for next runtime update", "等待下一次运行时更新");
        const nextStep =
          job.status === "disabled"
            ? pickUiText(input.language, "Enable or adjust this timed job before it can run again.", "启用或调整后，这个定时任务才会再次执行。")
            : pickUiText(input.language, "Watch the next scheduled run and confirm the employee picks it up.", "关注下一次执行时间，并确认对应员工已接手。");
        return {
          cardId: `cron:${job.jobId}`,
          cardKind: "timed_job",
          taskId: job.jobId,
          title: job.name,
          projectTitle: job.sourceLabel,
          taskStatus: "scheduled",
          ownerLabel: job.owner,
          statusTone: "scheduled",
          statusLabel: pickUiText(input.language, "Timed job", "定时任务"),
          statusDotLabel: pickUiText(input.language, "Timed job schedule", "定时任务排程"),
          priorityLabel:
            job.status === "disabled"
              ? pickUiText(input.language, "Paused", "已暂停")
              : Number.isFinite(job.dueInSeconds) && job.dueInSeconds <= 60 * 60
                ? pickUiText(input.language, "Run soon", "即将执行")
                : pickUiText(input.language, "Scheduled", "已排程"),
          boardStatusLabel: job.statusLabel,
          boardStatusTone: job.status === "disabled" ? "blocked" : job.status === "ok" || job.status === "enabled" ? "ok" : "warn",
          summary: sanitizeCronPurposeText(job.purpose, input.language, 120),
          recentSignal: `${job.sourceLabel} · ${job.statusLabel}`,
          nextStep,
          scheduleLabel,
          dueLabel,
          updatedLabel: dueInLabel,
          detailHref: buildCronDetailHref(job.jobId, input.language),
          priorityBucket: job.status === "disabled" ? 6 : Number.isFinite(job.dueInSeconds) && job.dueInSeconds <= 60 * 60 ? 3 : 4,
          dueSortValue: dueSortValue > 0 ? dueSortValue : Number.POSITIVE_INFINITY,
          updatedSortValue: Number.isFinite(job.dueInSeconds) ? -Math.max(0, job.dueInSeconds ?? 0) : 0,
          liveSignalCount: job.status === "ok" || job.status === "enabled" ? 1 : 0,
        };
      })
      .sort(compareTaskSpotlightCards);
  }

  function buildUnifiedTaskBoardCards(input) {
    const manualOrderByTaskId = buildTaskCardManualOrderLookup(input.manualOrder);
    return [...input.taskCards, ...input.timedJobCards].sort((left, right) =>
      compareTaskSpotlightCardsWithManualOrder(left, right, manualOrderByTaskId),
    );
  }

  return {
    buildTaskCardManualOrderLookup,
    buildTaskSpotlightCards,
    buildTimedJobSpotlightCards,
    buildUnifiedTaskBoardCards,
    compareTaskSpotlightCards,
    compareTaskSpotlightCardsWithManualOrder,
    countStalledRunningSessions,
    resolveTaskSpotlightPriorityBucket,
    resolveTaskSpotlightTone,
    taskSpotlightDueLabel,
    taskSpotlightNextStep,
    taskSpotlightPriorityLabel,
    taskSpotlightRecentSignal,
    taskSpotlightStatusDotLabel,
    taskSpotlightStatusLabel,
    taskSpotlightSummary,
  };
}

export { createTaskSpotlightHelpers };
