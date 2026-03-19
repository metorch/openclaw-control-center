// @ts-nocheck

function createRuntimeLabelHelpers(deps) {
  const { formatSeconds, humanizeOperatorLabel, normalizeInlineText, pickUiText, safeTruncate, toSortableMs } = deps;

  function formatExecutorAgentLabel(agentId, language) {
    const normalized = agentId.trim().toLowerCase();
    if (!normalized || normalized === "system") {
      return pickUiText(language, "System service", "\u7CFB\u7EDF\u670D\u52A1");
    }
    if (normalized === "system-cron") {
      return pickUiText(language, "Scheduler", "\u8C03\u5EA6\u5668");
    }
    if (normalized === "task-heartbeat-worker") {
      return pickUiText(language, "Heartbeat service", "\u4EFB\u52A1\u5FC3\u8DF3\u670D\u52A1");
    }
    return humanizeOperatorLabel(agentId);
  }

  function sanitizeCronPurposeText(input, language, maxLength = 72) {
    const normalized = normalizeInlineText(input);
    if (!normalized) {
      return pickUiText(language, "No purpose description.", "\u672A\u63D0\u4F9B\u4EFB\u52A1\u76EE\u7684\u3002");
    }
    const lower = normalized.toLowerCase();
    if (
      lower.includes("run exactly one command via exec tool") ||
      lower.includes("cd /") ||
      lower.includes("&&") ||
      lower.includes("/opt/homebrew/") ||
      lower.includes("/users/")
    ) {
      return pickUiText(
        language,
        "Run one automation script and update status.",
        "\u6267\u884C\u4E00\u6B21\u81EA\u52A8\u5316\u811A\u672C\u5E76\u66F4\u65B0\u72B6\u6001\u3002",
      );
    }
    return safeTruncate(normalized, maxLength);
  }

  function summarizeCronCommandPurpose(command, language) {
    const normalized = command.trim().toLowerCase();
    if (!normalized) {
      return pickUiText(language, "Run scheduled command.", "\u6267\u884C\u5B9A\u65F6\u547D\u4EE4\u3002");
    }
    if (normalized.includes("node")) {
      return pickUiText(language, "Run Node automation script.", "\u8FD0\u884C Node \u81EA\u52A8\u5316\u811A\u672C\u3002");
    }
    if (normalized.includes("python")) {
      return pickUiText(language, "Run Python automation script.", "\u8FD0\u884C Python \u81EA\u52A8\u5316\u811A\u672C\u3002");
    }
    if (normalized.includes("curl")) {
      return pickUiText(
        language,
        "Fetch external data and update status.",
        "\u62C9\u53D6\u5916\u90E8\u6570\u636E\u5E76\u66F4\u65B0\u72B6\u6001\u3002",
      );
    }
    return pickUiText(language, "Run scheduled command.", "\u6267\u884C\u5B9A\u65F6\u547D\u4EE4\u3002");
  }

  function parseSessionTargetOwner(value) {
    if (!value) {
      return void 0;
    }
    const normalized = value.trim();
    if (!normalized) {
      return void 0;
    }
    if (normalized.startsWith("agent:")) {
      const parts = normalized.split(":");
      if (parts.length >= 2 && parts[1]?.trim()) {
        return parts[1].trim();
      }
    }
    return void 0;
  }

  function cronRuntimePurpose(jobId, language) {
    const id = jobId.toLowerCase();
    if (id.includes("task-heartbeat")) {
      return pickUiText(
        language,
        "Scan assigned backlog and trigger heartbeat pickup.",
        "\u626B\u63CF\u5DF2\u5206\u914D\u5F85\u529E\u4EFB\u52A1\uFF0C\u5E76\u6309\u5FC3\u8DF3\u89C4\u5219\u63A8\u8FDB\u3002",
      );
    }
    if (id.includes("monitor")) {
      return pickUiText(
        language,
        "Refresh runtime snapshot and keep dashboard state updated.",
        "\u5237\u65B0\u8FD0\u884C\u65F6\u5FEB\u7167\uFF0C\u4FDD\u6301\u63A7\u5236\u4E2D\u5FC3\u6570\u636E\u66F4\u65B0\u3002",
      );
    }
    return pickUiText(language, "Run scheduled system checks.", "\u6267\u884C\u7CFB\u7EDF\u5B9A\u65F6\u68C0\u67E5\u3002");
  }

  function cronPayloadPurpose(payload, language) {
    if (!payload) {
      return pickUiText(language, "No purpose description.", "\u672A\u63D0\u4F9B\u4EFB\u52A1\u76EE\u7684\u3002");
    }
    const kind = typeof payload.kind === "string" ? payload.kind.trim() : "";
    if (kind === "agentTurn" && typeof payload.message === "string" && payload.message.trim()) {
      return sanitizeCronPurposeText(payload.message, language);
    }
    if (kind === "command") {
      const command = typeof payload.command === "string" ? payload.command.trim() : "";
      if (command) {
        return summarizeCronCommandPurpose(command, language);
      }
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return sanitizeCronPurposeText(payload.message, language);
    }
    return pickUiText(language, "No purpose description.", "\u672A\u63D0\u4F9B\u4EFB\u52A1\u76EE\u7684\u3002");
  }

  function cronPayloadOwner(payload, language) {
    if (!payload) {
      return pickUiText(language, "Scheduler", "\u8C03\u5EA6\u5668");
    }
    const ownerAgentId = cronPayloadOwnerAgentId(payload);
    if (ownerAgentId) {
      return humanizeOperatorLabel(ownerAgentId);
    }
    const sessionOwner = parseSessionTargetOwner(typeof payload.sessionTarget === "string" ? payload.sessionTarget : void 0);
    if (sessionOwner) {
      return humanizeOperatorLabel(sessionOwner);
    }
    return pickUiText(language, "Scheduler", "\u8C03\u5EA6\u5668");
  }

  function cronPayloadOwnerAgentId(payload) {
    if (!payload) {
      return void 0;
    }
    if (typeof payload.agentId === "string" && payload.agentId.trim()) {
      return payload.agentId.trim();
    }
    return parseSessionTargetOwner(typeof payload.sessionTarget === "string" ? payload.sessionTarget : void 0);
  }

  function cronScheduleLabel(schedule, language) {
    if (!schedule) {
      return pickUiText(language, "Not scheduled", "\u672A\u914D\u7F6E");
    }
    const kind = typeof schedule.kind === "string" ? schedule.kind.trim().toLowerCase() : "";
    if (kind === "cron") {
      const expr = typeof schedule.expr === "string" ? schedule.expr.trim() : "";
      return expr ? `cron ${expr}` : "cron";
    }
    if (kind === "interval") {
      const everyMs =
        typeof schedule.everyMs === "number" && Number.isFinite(schedule.everyMs)
          ? Math.max(0, Math.round(schedule.everyMs))
          : void 0;
      if (everyMs && everyMs > 0) {
        const seconds = Math.round(everyMs / 1e3);
        return pickUiText(language, `every ${seconds}s`, `\u6BCF ${seconds} \u79D2`);
      }
      return pickUiText(language, "interval", "\u95F4\u9694");
    }
    if (kind === "every") {
      const everyMs =
        typeof schedule.everyMs === "number" && Number.isFinite(schedule.everyMs)
          ? Math.max(0, Math.round(schedule.everyMs))
          : void 0;
      if (everyMs && everyMs > 0) {
        const seconds = Math.round(everyMs / 1e3);
        return pickUiText(language, `every ${seconds}s`, `\u6BCF ${seconds} \u79D2`);
      }
      return pickUiText(language, "every", "\u6BCF\u6B21");
    }
    return kind ? kind : pickUiText(language, "Not scheduled", "\u672A\u914D\u7F6E");
  }

  function displayCronScheduleLabel(scheduleLabel, language) {
    const normalized = scheduleLabel.trim().toLowerCase();
    if (!normalized || normalized === "-") {
      return pickUiText(language, "Not scheduled", "\u672A\u6392\u7A0B");
    }
    if (normalized.startsWith("cron ")) {
      return pickUiText(language, "Fixed schedule", "\u56FA\u5B9A\u65F6\u95F4\u8868");
    }
    if (normalized.startsWith("every") || normalized.startsWith("\u6BCF ")) {
      return scheduleLabel;
    }
    if (normalized === "system interval") {
      return pickUiText(language, "System interval", "\u7CFB\u7EDF\u95F4\u9694");
    }
    return safeTruncate(scheduleLabel, 18);
  }

  function parseCronExpressionParts(scheduleLabel) {
    const trimmed = scheduleLabel.trim();
    if (!trimmed.toLowerCase().startsWith("cron ")) {
      return void 0;
    }
    const expr = trimmed.slice(5).trim();
    const parts = expr.split(/\s+/).filter(Boolean);
    return parts.length === 5 ? parts : void 0;
  }

  function cronWeekdayLabel(day, language) {
    const normalized = day.trim().toUpperCase();
    const zhMap = new Map([
      ["0", "\u5468\u65E5"],
      ["7", "\u5468\u65E5"],
      ["SUN", "\u5468\u65E5"],
      ["1", "\u5468\u4E00"],
      ["MON", "\u5468\u4E00"],
      ["2", "\u5468\u4E8C"],
      ["TUE", "\u5468\u4E8C"],
      ["3", "\u5468\u4E09"],
      ["WED", "\u5468\u4E09"],
      ["4", "\u5468\u56DB"],
      ["THU", "\u5468\u56DB"],
      ["5", "\u5468\u4E94"],
      ["FRI", "\u5468\u4E94"],
      ["6", "\u5468\u516D"],
      ["SAT", "\u5468\u516D"],
    ]);
    const enMap = new Map([
      ["0", "Sun"],
      ["7", "Sun"],
      ["SUN", "Sun"],
      ["1", "Mon"],
      ["MON", "Mon"],
      ["2", "Tue"],
      ["TUE", "Tue"],
      ["3", "Wed"],
      ["WED", "Wed"],
      ["4", "Thu"],
      ["THU", "Thu"],
      ["5", "Fri"],
      ["FRI", "Fri"],
      ["6", "Sat"],
      ["SAT", "Sat"],
    ]);
    return language === "zh" ? zhMap.get(normalized) : enMap.get(normalized);
  }

  function formatClockTime(hours, minutes) {
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  }

  function humanizeTimedJobScheduleLabel(scheduleLabel, language) {
    const normalized = scheduleLabel.trim().toLowerCase();
    if (!normalized || normalized === "-") {
      return pickUiText(language, "Not scheduled", "\u672A\u6392\u597D");
    }
    if (normalized === "system interval") {
      return pickUiText(language, "Auto loop", "\u81EA\u52A8\u8F6E\u8BE2");
    }
    if (normalized.startsWith("every ")) {
      const value = scheduleLabel.trim().replace(/^every\s+/i, "");
      return pickUiText(language, `Every ${value}`, scheduleLabel.trim());
    }
    if (normalized.startsWith("\u6BCF ")) {
      return scheduleLabel.trim();
    }
    const parts = parseCronExpressionParts(scheduleLabel);
    if (!parts) {
      return displayCronScheduleLabel(scheduleLabel, language);
    }
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      return pickUiText(language, `Daily ${formatClockTime(hour, minute)}`, `\u6BCF\u5929 ${formatClockTime(hour, minute)}`);
    }
    if (/^\d+$/.test(minute) && /^\*\/\d+$/.test(hour) && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      const everyHours = hour.slice(2);
      return pickUiText(language, `Every ${everyHours}h`, `\u6BCF ${everyHours} \u5C0F\u65F6`);
    }
    if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
      const weekday = cronWeekdayLabel(dayOfWeek, language);
      if (weekday) {
        return language === "zh" ? `${weekday} ${formatClockTime(hour, minute)}` : `${weekday} ${formatClockTime(hour, minute)}`;
      }
    }
    return displayCronScheduleLabel(scheduleLabel, language);
  }

  function humanizeTimedJobWindowLabel(nextRun, dueInSeconds, language) {
    if (Number.isFinite(dueInSeconds)) {
      const relative = formatSeconds(dueInSeconds, language);
      return language === "zh" ? `${relative}\u540E` : `In ${relative}`;
    }
    const parsed = toSortableMs(nextRun);
    if (!parsed) {
      return pickUiText(language, "Waiting for sync", "\u7B49\u5F85\u540C\u6B65");
    }
    const date = new Date(parsed);
    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow =
      date.getFullYear() === tomorrow.getFullYear() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getDate() === tomorrow.getDate();
    const timeText = formatClockTime(String(date.getHours()), String(date.getMinutes()));
    if (sameDay) {
      return pickUiText(language, `Today ${timeText}`, `\u4ECA\u5929 ${timeText}`);
    }
    if (isTomorrow) {
      return pickUiText(language, `Tomorrow ${timeText}`, `\u660E\u5929 ${timeText}`);
    }
    if (date.getFullYear() === now.getFullYear()) {
      return language === "zh"
        ? `${date.getMonth() + 1}\u6708${date.getDate()}\u65E5 ${timeText}`
        : `${date.toLocaleString("en-US", { month: "short" })} ${date.getDate()} ${timeText}`;
    }
    return language === "zh"
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${timeText}`
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${timeText}`;
  }

  function summarizeNames(items, language, emptyLabel) {
    const uniq = [...new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))];
    if (uniq.length === 0) {
      return emptyLabel;
    }
    return uniq.join("\u3001");
  }

  function cronHealthLabel(health, language) {
    const normalized = health.trim().toLowerCase();
    if (normalized === "scheduled") {
      return pickUiText(language, "Scheduled", "\u5DF2\u6392\u7A0B");
    }
    if (normalized === "due") {
      return pickUiText(language, "Due", "\u5230\u70B9\u5F85\u6267\u884C");
    }
    if (normalized === "late") {
      return pickUiText(language, "Late", "\u6267\u884C\u5EF6\u8FDF");
    }
    if (normalized === "disabled") {
      return pickUiText(language, "Disabled", "\u672A\u542F\u7528");
    }
    if (normalized === "enabled") {
      return pickUiText(language, "Enabled", "\u5DF2\u542F\u7528");
    }
    return pickUiText(language, "Unknown", "\u672A\u77E5");
  }

  function heartbeatModeLabel(mode, language) {
    const normalized = mode.trim().toLowerCase();
    if (normalized === "dry_run" || normalized === "dry-run") {
      return pickUiText(language, "Dry run", "\u6F14\u7EC3");
    }
    if (normalized === "live" || normalized === "execute") {
      return pickUiText(language, "Live", "\u6267\u884C");
    }
    return mode;
  }

  function sessionStateLabel(state) {
    if (state === "running") {
      return "\u6267\u884C\u4E2D";
    }
    if (state === "waiting_approval") {
      return "\u5F85\u5BA1\u6279";
    }
    if (state === "blocked") {
      return "\u963B\u585E";
    }
    if (state === "error") {
      return "\u5F02\u5E38";
    }
    return "\u5F85\u547D";
  }

  return {
    cronHealthLabel,
    cronPayloadOwner,
    cronPayloadOwnerAgentId,
    cronPayloadPurpose,
    cronRuntimePurpose,
    cronScheduleLabel,
    formatExecutorAgentLabel,
    heartbeatModeLabel,
    humanizeTimedJobScheduleLabel,
    humanizeTimedJobWindowLabel,
    sanitizeCronPurposeText,
    sessionStateLabel,
    summarizeNames,
  };
}

export { createRuntimeLabelHelpers };
