// @ts-nocheck

const __name = (target, value) => Object.defineProperty(target, "name", { value, configurable: true });
const { badge, escapeHtml, formatInt, formatTimeAgoFromNow, pickUiText, safeTruncate, toSortableMs } = require("./server-shared");

function agentTeamHumanizeToken(value) {
    if (!value)
        return "";
    return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, char => char.toUpperCase());
}

function agentTeamPhaseLabel(value, language) {
    if (!value)
        return pickUiText(language, "Not available", "\u6682\u65E0");
    if (value === "max_ticks_reached")
        return pickUiText(language, "Tick limit reached", "\u8FBE\u5230\u8F6E\u8BE2\u4E0A\u9650");
    if (value === "idle")
        return pickUiText(language, "Idle", "\u7A7A\u95F2");
    if (value === "running")
        return pickUiText(language, "Running", "\u8FD0\u884C\u4E2D");
    if (value === "paused")
        return pickUiText(language, "Paused", "\u5DF2\u6682\u505C");
    if (value === "stopped")
        return pickUiText(language, "Stopped", "\u5DF2\u505C\u6B62");
    return agentTeamHumanizeToken(value);
}

function agentTeamDecisionModeLabel(value, language) {
    if (!value)
        return pickUiText(language, "Unknown", "\u672A\u77E5");
    if (value === "auto")
        return pickUiText(language, "Automatic", "\u81EA\u52A8");
    if (value === "manual")
        return pickUiText(language, "Manual", "\u624B\u52A8");
    return agentTeamHumanizeToken(value);
}

function agentTeamFreshnessLabel(value, language) {
    if (!value)
        return pickUiText(language, "Unknown", "\u672A\u77E5");
    if (value === "fresh")
        return pickUiText(language, "Fresh", "\u65B0\u9C9C");
    if (value === "aging")
        return pickUiText(language, "Aging", "\u6E10\u65E7");
    if (value === "stale")
        return pickUiText(language, "Stale", "\u8FC7\u65E7");
    return agentTeamHumanizeToken(value);
}

function agentTeamActionLabel(value, language) {
    if (!value)
        return pickUiText(language, "No action suggested", "\u6682\u65E0\u5EFA\u8BAE\u52A8\u4F5C");
    if (value === "inspect-supervision")
        return pickUiText(language, "Inspect supervision", "\u67E5\u770B\u76D1\u7763\u9879");
    if (value === "inspect-status")
        return pickUiText(language, "Inspect runtime status", "\u67E5\u770B\u8FD0\u884C\u72B6\u6001");
    if (value === "resume-runner")
        return pickUiText(language, "Resume runner", "\u6062\u590D\u8FD0\u884C\u5668");
    if (value === "consume-queue")
        return pickUiText(language, "Consume queue", "\u5904\u7406\u961F\u5217");
    if (value === "consume-controls")
        return pickUiText(language, "Consume controls", "\u5904\u7406\u63A7\u5236\u8BF7\u6C42");
    return agentTeamHumanizeToken(value);
}

function agentTeamSourceKindLabel(value, language) {
    if (value === "runtime") {
        return pickUiText(language, "Embedded serve-session snapshot", "\u5D4C\u5165 serve-session \u5FEB\u7167");
    }
    return pickUiText(language, "Example fixture fallback", "\u793A\u4F8B\u5939\u5177\u56DE\u9000");
}

function agentTeamEmbeddedUpdatedLabel(model, language) {
    if (!model.runtime.updatedAt)
        return void 0;
    const relative2 = formatTimeAgoFromNow(model.runtime.updatedAt, language);
    return pickUiText(language, `Last embedded update ${relative2} (${model.runtime.updatedAt})`, `\u6700\u8FD1\u4E00\u6B21\u5D4C\u5165\u5FEB\u7167\u66F4\u65B0\u65F6\u95F4\uFF1A${relative2}\uFF08${model.runtime.updatedAt}\uFF09`);
}

function agentTeamSnapshotRefreshHintLegacy(model, language) {
    if (model.sourceKind === "runtime") {
        return pickUiText(language, "Reloading the page only re-reads the embedded serve-session export. Use the dashboard refresh control to rebuild this snapshot from the latest persisted session state, then re-scan docs and related memory/info panels; the runtime itself must still run before new work appears here.", "\u76F4\u63A5\u91CD\u8F7D\u9875\u9762\u53EA\u4F1A\u91CD\u65B0\u8BFB\u53D6\u5D4C\u5165\u7684 serve-session \u5BFC\u51FA\u3002\u4F7F\u7528\u9876\u90E8\u5237\u65B0\u63A7\u4EF6\u4F1A\u57FA\u4E8E\u6700\u65B0\u6301\u4E45\u5316 session \u91CD\u65B0\u6784\u5EFA\u8FD9\u4E2A\u5FEB\u7167\uFF0C\u5E76\u987A\u5E26\u91CD\u65B0\u626B\u63CF\u6587\u6863\u4EE5\u53CA\u76F8\u5173\u8BB0\u5FC6/\u4FE1\u606F\u9762\u677F\uFF1B\u82E5\u8981\u8BA9\u65B0\u7684\u4EFB\u52A1\u8FDB\u5C55\u51FA\u73B0\u5728\u8FD9\u91CC\uFF0C\u4ECD\u7136\u9700\u8981\u4E0A\u6E38\u8FD0\u884C\u65F6\u7EE7\u7EED\u6267\u884C\u3002");
        return pickUiText(language, "Reloading the page only re-reads the embedded serve-session export. Use the dashboard refresh control to rebuild this snapshot from the latest persisted session state; the runtime itself must still run before new work appears here.", "\u76F4\u63A5\u91CD\u8F7D\u9875\u9762\u53EA\u4F1A\u91CD\u65B0\u8BFB\u53D6\u5D4C\u5165\u7684 serve-session \u5BFC\u51FA\u3002\u4F7F\u7528\u9762\u677F\u91CC\u7684\u5237\u65B0\u63A7\u4EF6\u4F1A\u57FA\u4E8E\u6700\u65B0\u6301\u4E45\u5316 session \u91CD\u65B0\u6253\u5305\u8FD9\u4E2A\u5FEB\u7167\uFF1B\u82E5\u8981\u8BA9\u65B0\u7684\u4EFB\u52A1\u8FDB\u5C55\u51FA\u73B0\u5728\u8FD9\u91CC\uFF0C\u4ECD\u7136\u9700\u8981\u4E0A\u6E38\u8FD0\u884C\u65F6\u7EE7\u7EED\u6267\u884C\u3002");
    }
    return pickUiText(language, "This panel is still using the example fixture bundle. The dashboard refresh control will keep checking for a real serve-session export and will still re-scan docs plus related memory/info panels in the meantime.", "\u5F53\u524D\u9762\u677F\u4ECD\u5728\u4F7F\u7528\u793A\u4F8B\u5939\u5177\u5305\uFF1B\u5728\u771F\u6B63\u7684 serve-session \u5BFC\u51FA\u53EF\u7528\u4E4B\u524D\uFF0C\u5237\u65B0\u63A7\u4EF6\u4F1A\u6301\u7EED\u68C0\u67E5\u4E0A\u6E38\u8F93\u51FA\uFF0C\u540C\u65F6\u4ECD\u4F1A\u91CD\u65B0\u626B\u63CF\u6587\u6863\u548C\u76F8\u5173\u8BB0\u5FC6/\u4FE1\u606F\u9762\u677F\u3002");
    return pickUiText(language, "This panel is still using the example fixture bundle. The dashboard refresh control will keep reloading that bundle until a serve-session export becomes available.", "\u5F53\u524D\u9762\u677F\u4ECD\u5728\u4F7F\u7528\u793A\u4F8B\u5939\u5177\u5305\uFF1B\u5728\u771F\u6B63\u7684 serve-session \u5BFC\u51FA\u53EF\u7528\u4E4B\u524D\uFF0C\u5237\u65B0\u63A7\u4EF6\u4E5F\u53EA\u80FD\u53CD\u590D\u91CD\u8F7D\u8FD9\u4E00\u5957\u793A\u4F8B\u6570\u636E\u3002");
}

function agentTeamSnapshotRefreshHint(model, language) {
    if (model.sourceKind === "runtime") {
        return pickUiText(language, "Reloading the page only re-reads the embedded serve-session export. Use the dashboard refresh control to rebuild this snapshot from the latest persisted session state, then re-scan docs and related memory/info panels; the runtime itself must still run before new work appears here.", "\u76F4\u63A5\u91CD\u8F7D\u9875\u9762\u53EA\u4F1A\u91CD\u65B0\u8BFB\u53D6\u5D4C\u5165\u7684 serve-session \u5BFC\u51FA\u3002\u4F7F\u7528\u9876\u90E8\u5237\u65B0\u63A7\u4EF6\u4F1A\u57FA\u4E8E\u6700\u65B0\u6301\u4E45\u5316 session \u91CD\u65B0\u6784\u5EFA\u8FD9\u4E2A\u5FEB\u7167\uFF0C\u5E76\u987A\u5E26\u91CD\u65B0\u626B\u63CF\u6587\u6863\u4EE5\u53CA\u76F8\u5173\u8BB0\u5FC6/\u4FE1\u606F\u9762\u677F\uFF1B\u82E5\u8981\u8BA9\u65B0\u7684\u4EFB\u52A1\u8FDB\u5C55\u51FA\u73B0\u5728\u8FD9\u91CC\uFF0C\u4ECD\u7136\u9700\u8981\u4E0A\u6E38\u8FD0\u884C\u65F6\u7EE7\u7EED\u6267\u884C\u3002");
    }
    return pickUiText(language, "This panel is still using the example fixture bundle. The dashboard refresh control will keep checking for a real serve-session export and will still re-scan docs plus related memory/info panels in the meantime.", "\u5F53\u524D\u9762\u677F\u4ECD\u5728\u4F7F\u7528\u793A\u4F8B\u5939\u5177\u5305\uFF1B\u5728\u771F\u6B63\u7684 serve-session \u5BFC\u51FA\u53EF\u7528\u4E4B\u524D\uFF0C\u5237\u65B0\u63A7\u4EF6\u4F1A\u6301\u7EED\u68C0\u67E5\u4E0A\u6E38\u8F93\u51FA\uFF0C\u540C\u65F6\u4ECD\u4F1A\u91CD\u65B0\u626B\u63CF\u6587\u6863\u548C\u76F8\u5173\u8BB0\u5FC6/\u4FE1\u606F\u9762\u677F\u3002");
}

function agentTeamSuggestedPanelHref(model, links) {
    const pageKey = (model.runtime.primaryActionPage ?? "").trim().toLowerCase();
    if (pageKey.includes("run"))
        return links.projects;
    if (pageKey.includes("supervision"))
        return links.team;
    if (pageKey.includes("runner"))
        return links.settings;
    return links.projects;
}

function agentTeamRunStatusLabel(value, language) {
    if (!value)
        return pickUiText(language, "Unknown", "\u672A\u77E5");
    if (value === "attention")
        return pickUiText(language, "Needs attention", "\u9700\u8981\u5173\u6CE8");
    if (value === "completed")
        return pickUiText(language, "Completed", "\u5DF2\u5B8C\u6210");
    if (value === "running")
        return pickUiText(language, "Running", "\u8FD0\u884C\u4E2D");
    if (value === "blocked")
        return pickUiText(language, "Blocked", "\u5DF2\u963B\u585E");
    return agentTeamHumanizeToken(value);
}

function agentTeamFinalActionLabel(value, language) {
    if (!value)
        return pickUiText(language, "Not recorded", "\u672A\u8BB0\u5F55");
    if (value === "completed")
        return pickUiText(language, "Completed", "\u5DF2\u5B8C\u6210");
    if (value === "retry")
        return pickUiText(language, "Retry", "\u91CD\u8BD5");
    if (value === "blocked")
        return pickUiText(language, "Blocked", "\u963B\u585E");
    return agentTeamHumanizeToken(value);
}

function agentTeamFreshnessTone(value) {
    if (value === "fresh")
        return "ok";
    if (value === "aging")
        return "warn";
    if (value === "stale")
        return "blocked";
    return "info";
}

function agentTeamRunTone(run) {
    if (run.failureCount > 0 || run.status === "blocked")
        return "blocked";
    if (run.warningCount > 0 || run.status === "attention")
        return "warn";
    if (run.finalAction === "completed" || run.status === "completed")
        return "ok";
    return "info";
}

function agentTeamRuntimeSummaryLegacy(model, language) {
    if (!model.available) {
        return pickUiText(language, "Embedded agent-team data is not available yet.", "\u6682\u672A\u8BFB\u53D6\u5230\u5D4C\u5165\u7684 Agent Team \u6570\u636E\u3002");
    }
    if (model.summary.activeSupervisionCount > 0) {
        return pickUiText(language, `${model.summary.activeSupervisionCount} supervision item(s) still need attention.`, `\u8FD8\u6709 ${model.summary.activeSupervisionCount} \u4E2A\u76D1\u7763\u4E8B\u9879\u5F85\u5904\u7406\u3002`);
    }
    if (model.summary.pendingJobCount > 0) {
        return pickUiText(language, `${model.summary.pendingJobCount} queued job(s) are still waiting to run.`, `\u8FD8\u6709 ${model.summary.pendingJobCount} \u4E2A\u6392\u961F\u4EFB\u52A1\u7B49\u5F85\u6267\u884C\u3002`);
    }
    if (model.runtime.freshnessState === "stale") {
        const updatedLabel = agentTeamEmbeddedUpdatedLabel(model, language);
        return pickUiText(language, updatedLabel ? `Embedded serve-session snapshot is stale, so docs and memory highlights may lag. ${updatedLabel}.` : "Embedded serve-session snapshot is stale, so docs and memory highlights may lag.", updatedLabel ? `\u5D4C\u5165\u7684 serve-session \u5FEB\u7167\u5DF2\u7ECF\u504F\u65E7\uFF0C\u6587\u6863\u4E0E\u8BB0\u5FC6\u6458\u8981\u53EF\u80FD\u4F1A\u6EDE\u540E\u3002${updatedLabel}\u3002` : "\u5D4C\u5165\u7684 serve-session \u5FEB\u7167\u5DF2\u7ECF\u504F\u65E7\uFF0C\u6587\u6863\u4E0E\u8BB0\u5FC6\u6458\u8981\u53EF\u80FD\u4F1A\u6EDE\u540E\u3002");
        return pickUiText(language, updatedLabel ? `Embedded serve-session snapshot is stale. ${updatedLabel}.` : "Embedded serve-session snapshot is stale.", updatedLabel ? `\u5D4C\u5165\u7684 serve-session \u5FEB\u7167\u5DF2\u7ECF\u504F\u65E7\uFF0C${updatedLabel}\u3002` : "\u5D4C\u5165\u7684 serve-session \u5FEB\u7167\u5DF2\u7ECF\u504F\u65E7\u3002");
    }
    return pickUiText(language, "The embedded team runtime looks ready for the next operator action.", "\u5D4C\u5165\u7684\u56E2\u961F\u8FD0\u884C\u6001\u5DF2\u7ECF\u6574\u7406\u597D\uFF0C\u53EF\u4EE5\u7EE7\u7EED\u6267\u884C\u4E0B\u4E00\u6B65\u64CD\u4F5C\u3002");
}

function agentTeamRuntimeSummary(model, language) {
    if (!model.available) {
        return pickUiText(language, "Embedded agent-team data is not available yet.", "\u6682\u672A\u8BFB\u53D6\u5230\u5D4C\u5165\u7684 Agent Team \u6570\u636E\u3002");
    }
    if (model.summary.activeSupervisionCount > 0) {
        return pickUiText(language, `${model.summary.activeSupervisionCount} supervision item(s) still need attention.`, `\u8FD8\u6709 ${model.summary.activeSupervisionCount} \u4E2A\u76D1\u7763\u4E8B\u9879\u5F85\u5904\u7406\u3002`);
    }
    if (model.summary.pendingJobCount > 0) {
        return pickUiText(language, `${model.summary.pendingJobCount} queued job(s) are still waiting to run.`, `\u8FD8\u6709 ${model.summary.pendingJobCount} \u4E2A\u6392\u961F\u4EFB\u52A1\u7B49\u5F85\u6267\u884C\u3002`);
    }
    if (model.runtime.freshnessState === "stale") {
        const updatedLabel = agentTeamEmbeddedUpdatedLabel(model, language);
        return pickUiText(language, updatedLabel ? `Embedded serve-session snapshot is stale, so docs and memory highlights may lag. ${updatedLabel}.` : "Embedded serve-session snapshot is stale, so docs and memory highlights may lag.", updatedLabel ? `\u5D4C\u5165\u7684 serve-session \u5FEB\u7167\u5DF2\u7ECF\u504F\u65E7\uFF0C\u6587\u6863\u4E0E\u8BB0\u5FC6\u6458\u8981\u53EF\u80FD\u4F1A\u6EDE\u540E\u3002${updatedLabel}\u3002` : "\u5D4C\u5165\u7684 serve-session \u5FEB\u7167\u5DF2\u7ECF\u504F\u65E7\uFF0C\u6587\u6863\u4E0E\u8BB0\u5FC6\u6458\u8981\u53EF\u80FD\u4F1A\u6EDE\u540E\u3002");
    }
    return pickUiText(language, "The embedded team runtime looks ready for the next operator action.", "\u5D4C\u5165\u7684\u56E2\u961F\u8FD0\u884C\u6001\u5DF2\u7ECF\u6574\u7406\u597D\uFF0C\u53EF\u4EE5\u7EE7\u7EED\u6267\u884C\u4E0B\u4E00\u6B65\u64CD\u4F5C\u3002");
}

function agentTeamFileLabel(file) {
    if (file.length <= 56)
        return file;
    return `...${file.slice(-56)}`;
}

function renderAgentTeamContextList(items, language, kind) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (items.length === 0) {
        return `<div class="empty-state">${escapeHtml(t("No embedded items yet.", "\u8FD8\u6CA1\u6709\u5D4C\u5165\u6761\u76EE\u3002"))}</div>`;
    }
    return `<ul class="story-list">${items.slice(0, 8).map(item => {
        const primaryMeta = kind === "team" ? item.role ?? item.id ?? t("Team role", "\u56E2\u961F\u89D2\u8272") : item.section ?? t("Project record", "\u9879\u76EE\u8BB0\u5F55");
        const updatedMeta = item.updatedAt ? `${t("Updated", "\u66F4\u65B0")} ${formatTimeAgoFromNow(item.updatedAt, language)}` : t("Time unavailable", "\u65F6\u95F4\u672A\u77E5");
        const secondaryMeta = kind === "team" ? `${updatedMeta} \u8DEF ${agentTeamFileLabel(item.file)}` : `${primaryMeta} \u8DEF ${updatedMeta}`;
        return `<li>
        <strong>${escapeHtml(item.name ?? item.title)}</strong>
        <div class="meta">${escapeHtml(primaryMeta)}</div>
        <div class="meta">${escapeHtml(secondaryMeta)}</div>
      </li>`;
    }).join("")}</ul>`;
}

function renderAgentTeamRunList(runs, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (runs.length === 0) {
        return `<div class="empty-state">${escapeHtml(t("No persisted runtime bundles were found yet.", "\u6682\u672A\u53D1\u73B0\u6301\u4E45\u5316\u8FD0\u884C\u5305\u3002"))}</div>`;
    }
    return `<ul class="story-list">${runs.slice(0, 6).map(run => {
        const label = run.pipeline ?? run.jobId ?? run.runId;
        const counts = [`${run.artifactCount} ${t("artifacts", "\u5DE5\u4EF6")}`, `${run.eventCount} ${t("events", "\u4E8B\u4EF6")}`, `${run.warningCount} ${t("warnings", "\u8B66\u544A")}`].join(" \u8DEF ");
        const meta = [run.finalAction ? `${t("Final action", "\u6700\u7EC8\u52A8\u4F5C")} ${agentTeamFinalActionLabel(run.finalAction, language)}` : "", run.updatedAt ? `${t("Updated", "\u66F4\u65B0")} ${formatTimeAgoFromNow(run.updatedAt, language)}` : "", run.jobId ? `${t("Job", "\u4EFB\u52A1")} ${run.jobId}` : ""].filter(Boolean).join(" \u8DEF ");
        return `<li>
        <div class="group-item-head"><strong>${escapeHtml(label)}</strong>${badge(agentTeamRunTone(run), agentTeamRunStatusLabel(run.status, language))}</div>
        <div class="meta">${escapeHtml(counts)}</div>
        <div class="meta">${escapeHtml(meta)}</div>
      </li>`;
    }).join("")}</ul>`;
}

function renderAgentTeamArtifactList(artifacts, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (artifacts.length === 0) {
        return `<div class="empty-state">${escapeHtml(t("No embedded artifacts yet.", "\u6682\u672A\u53D1\u73B0\u5D4C\u5165\u5DE5\u4EF6\u3002"))}</div>`;
    }
    return `<ul class="story-list">${artifacts.slice(0, 5).map(artifact => {
        const identity = [artifact.stage ? agentTeamHumanizeToken(artifact.stage) : t("Stage unknown", "\u9636\u6BB5\u672A\u77E5"), artifact.schema ?? t("Schema unknown", "\u7ED3\u6784\u672A\u77E5")].join(" \u8DEF ");
        const detail = [artifact.mode ? agentTeamHumanizeToken(artifact.mode) : "", artifact.noteCount > 0 ? `${artifact.noteCount} ${t("notes", "\u6CE8\u8BB0")}` : "", artifact.updatedAt ? `${t("Updated", "\u66F4\u65B0")} ${formatTimeAgoFromNow(artifact.updatedAt, language)}` : ""].filter(Boolean).join(" \u8DEF ");
        return `<li>
        <strong>${escapeHtml(artifact.file)}</strong>
        <div class="meta">${escapeHtml(identity)}</div>
        <div class="meta">${escapeHtml(detail)}</div>
      </li>`;
    }).join("")}</ul>`;
}

function renderAgentTeamTimelineList(items, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (items.length === 0) {
        return `<div class="empty-state">${escapeHtml(t("No embedded timeline events yet.", "\u6682\u672A\u53D1\u73B0\u5D4C\u5165\u65F6\u95F4\u7EBF\u4E8B\u4EF6\u3002"))}</div>`;
    }
    return `<ul class="story-list">${items.slice(0, 6).map(item => {
        const headline = agentTeamHumanizeToken(item.kind) || t("Runtime event", "\u8FD0\u884C\u4E8B\u4EF6");
        const meta = [item.stage ? agentTeamHumanizeToken(item.stage) : t("Runtime", "\u8FD0\u884C\u6001"), item.source ? agentTeamHumanizeToken(item.source) : "", item.timestamp ? formatTimeAgoFromNow(item.timestamp, language) : ""].filter(Boolean).join(" \u8DEF ");
        return `<li>
        <strong>${escapeHtml(headline)}</strong>
        <div class="meta">${escapeHtml(item.detail ?? t("No further detail yet.", "\u6682\u672A\u63D0\u4F9B\u66F4\u591A\u7EC6\u8282\u3002"))}</div>
        <div class="meta">${escapeHtml(meta)}</div>
      </li>`;
    }).join("")}</ul>`;
}

function renderAgentTeamSidebarCard(model, language, links) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (!model.available) {
        return "";
    }
    return `
    <section class="card" style="margin-top:10px;" id="agent-team-sidebar">
      <h2>${escapeHtml(t("Agent team", "Agent \u56E2\u961F"))}</h2>
      <div class="meta">${escapeHtml(agentTeamRuntimeSummary(model, language))}</div>
      <div class="status-strip compact">
        <div class="status-chip"><span>${escapeHtml(t("Members", "\u6210\u5458"))}</span><strong>${formatInt(model.summary.memberCount)}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Docs", "\u6587\u6863"))}</span><strong>${formatInt(model.summary.keyDocCount)}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Memory", "\u8BB0\u5FC6"))}</span><strong>${formatInt(model.summary.memoryCount)}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Runs", "\u8FD0\u884C"))}</span><strong>${formatInt(model.summary.runCount)}</strong></div>
      </div>
      <div class="meta">${escapeHtml(t("Source", "\u6765\u6E90"))} ${escapeHtml(agentTeamSourceKindLabel(model.sourceKind, language))} \u8DEF ${escapeHtml(t("Mode", "\u6A21\u5F0F"))} ${escapeHtml(agentTeamDecisionModeLabel(model.runtime.decisionMode, language))}${model.scenarioKey ? ` \u8DEF ${escapeHtml(t("Scenario", "\u573A\u666F"))} ${escapeHtml(model.scenarioKey)}` : ""}</div>
      <div class="meta">${escapeHtml(agentTeamSnapshotRefreshHint(model, language))}</div>
      ${model.focusedRun ? `<div class="meta">${escapeHtml(t("Focus run", "\u805A\u7126\u8FD0\u884C"))} ${escapeHtml(model.focusedRun.pipeline ?? model.focusedRun.jobId ?? model.focusedRun.runId)} \u8DEF ${badge(agentTeamRunTone(model.focusedRun), agentTeamRunStatusLabel(model.focusedRun.status, language))}</div>` : ""}
      <div class="meta"><a href="${escapeHtml(links.team)}">${escapeHtml(t("Open team", "\u6253\u5F00\u56E2\u961F"))}</a> \u8DEF <a href="${escapeHtml(links.docs)}">${escapeHtml(t("Open docs", "\u6253\u5F00\u6587\u6863"))}</a></div>
      <div class="meta"><a href="${escapeHtml(links.memory)}">${escapeHtml(t("Open memory", "\u6253\u5F00\u8BB0\u5FC6"))}</a> \u8DEF <a href="${escapeHtml(links.projects)}">${escapeHtml(t("Open runs", "\u6253\u5F00\u8FD0\u884C"))}</a></div>
    </section>
  `;
}

function renderAgentTeamOverviewBlock(model, language, links) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (!model.available) {
        return "";
    }
    const suggestedActionKind = model.runtime.primaryActionKind ?? model.dashboard.primaryActionKind;
    const suggestedReason = model.dashboard.primaryActionReason ?? model.runtime.reasonSummary ?? t("The runtime is ready for the next visible operator action.", "\u8FD0\u884C\u72B6\u6001\u5DF2\u7ECF\u6574\u7406\u597D\uFF0C\u53EF\u4EE5\u7EE7\u7EED\u6267\u884C\u4E0B\u4E00\u6B65\u53EF\u89C1\u64CD\u4F5C\u3002");
    const suggestedHref = agentTeamSuggestedPanelHref(model, links);
    const sourceLabel = agentTeamSourceKindLabel(model.sourceKind, language);
    const embeddedUpdatedLabel = agentTeamEmbeddedUpdatedLabel(model, language);
    const refreshHint = agentTeamSnapshotRefreshHint(model, language);
    return `
    <section class="overview-decision-grid" id="agent-team-overview">
      <article class="card">
        <div class="overview-command-head">
          <h2>${escapeHtml(t("Agent team runtime", "Agent Team \u8FD0\u884C\u6982\u51B5"))}</h2>
          <div>${badge(agentTeamFreshnessTone(model.runtime.freshnessState), agentTeamFreshnessLabel(model.runtime.freshnessState, language))}</div>
        </div>
        <div class="meta">${escapeHtml(agentTeamRuntimeSummary(model, language))}</div>
        <div class="status-strip compact">
          <div class="status-chip"><span>${escapeHtml(t("Runner phase", "\u8FD0\u884C\u9636\u6BB5"))}</span><strong>${escapeHtml(agentTeamPhaseLabel(model.runtime.phase, language))}</strong></div>
          <div class="status-chip"><span>${escapeHtml(t("Decision mode", "\u51B3\u7B56\u6A21\u5F0F"))}</span><strong>${escapeHtml(agentTeamDecisionModeLabel(model.runtime.decisionMode, language))}</strong></div>
          <div class="status-chip"><span>${escapeHtml(t("Supervision", "\u76D1\u7763\u9879"))}</span><strong>${formatInt(model.summary.activeSupervisionCount)}</strong></div>
          <div class="status-chip"><span>${escapeHtml(t("Persisted runs", "\u6301\u4E45\u5316\u8FD0\u884C"))}</span><strong>${formatInt(model.summary.runCount)}</strong></div>
        </div>
        <div class="meta">${escapeHtml(t("Suggested next action", "\u5EFA\u8BAE\u4E0B\u4E00\u6B65"))} ${escapeHtml(agentTeamActionLabel(suggestedActionKind, language))}</div>
        <div class="mission-banner">${escapeHtml(agentTeamActionLabel(suggestedActionKind, language))} \xB7 ${escapeHtml(suggestedReason)}</div>
        <div class="overview-quick-links">
          <a class="btn" href="${escapeHtml(suggestedHref)}">${escapeHtml(t("Open suggested panel", "\u6253\u5F00\u5EFA\u8BAE\u9762\u677F"))}</a>
          <a class="btn" href="${escapeHtml(links.projects)}">${escapeHtml(t("Open runs", "\u67E5\u770B\u8FD0\u884C"))}</a>
          <a class="btn" href="${escapeHtml(links.team)}">${escapeHtml(t("Open team", "\u67E5\u770B\u56E2\u961F"))}</a>
        </div>
      </article>
      <article class="card overview-context-card">
        <div class="overview-command-head">
          <h2>${escapeHtml(t("Project context snapshot", "\u9879\u76EE\u4E0A\u4E0B\u6587\u5FEB\u7167"))}</h2>
          <a class="btn" href="${escapeHtml(links.docs)}">${escapeHtml(t("Open docs", "\u67E5\u770B\u6587\u6863"))}</a>
        </div>
        <div class="status-strip compact">
          <div class="status-chip"><span>${escapeHtml(t("Members", "\u6210\u5458"))}</span><strong>${formatInt(model.summary.memberCount)}</strong></div>
          <div class="status-chip"><span>${escapeHtml(t("Key docs", "\u6838\u5FC3\u6587\u6863"))}</span><strong>${formatInt(model.summary.keyDocCount)}</strong></div>
          <div class="status-chip"><span>${escapeHtml(t("Pilot assets", "\u8BD5\u8FD0\u884C\u8D44\u6599"))}</span><strong>${formatInt(model.summary.pilotAssetCount)}</strong></div>
          <div class="status-chip"><span>${escapeHtml(t("Recent memory", "\u8FD1\u671F\u8BB0\u5FC6"))}</span><strong>${formatInt(model.summary.memoryCount)}</strong></div>
        </div>
        <div class="overview-context-note">
          <strong>${escapeHtml(t("Snapshot source", "\u5FEB\u7167\u6765\u6E90"))}</strong>
          <div class="meta">${escapeHtml(sourceLabel)}${model.scenarioKey ? ` \xB7 ${escapeHtml(t("Scenario", "\u573A\u666F"))} ${escapeHtml(model.scenarioKey)}` : ""}</div>
          ${embeddedUpdatedLabel ? `<div class="meta">${escapeHtml(embeddedUpdatedLabel)}</div>` : ""}
        </div>
        <div class="overview-context-note">
          <strong>${escapeHtml(t("Refresh behavior", "\u5237\u65B0\u65B9\u5F0F"))}</strong>
          <div class="meta">${escapeHtml(refreshHint)}</div>
        </div>
        <div class="overview-context-links">
          <a class="btn" href="${escapeHtml(links.docs)}">${escapeHtml(t("Open docs", "\u67E5\u770B\u6587\u6863"))}</a>
          <a class="btn" href="${escapeHtml(links.memory)}">${escapeHtml(t("Open memory", "\u67E5\u770B\u8BB0\u5FC6"))}</a>
          <a class="btn" href="${escapeHtml(links.projects)}">${escapeHtml(t("Open runs", "\u67E5\u770B\u8FD0\u884C"))}</a>
        </div>
        <div class="meta">${escapeHtml(t("Workspace", "\u5DE5\u4F5C\u533A"))} ${escapeHtml(model.workspaceLabel)}</div>
        <div class="meta">${escapeHtml(t("Generated", "\u751F\u6210\u65F6\u95F4"))} ${escapeHtml(model.generatedAt ?? t("Not available", "\u6682\u65E0"))}</div>
      </article>
    </section>
  `;
}

function renderAgentTeamTeamBlock(model, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (!model.available) {
        return "";
    }
    return `
    <details class="compact-table-details" id="agent-team-team-panel" style="margin-top:12px;">
      <summary>${escapeHtml(t("Open project role mapping", "\u67E5\u770B\u9879\u76EE\u89D2\u8272\u6620\u5C04"))}</summary>
      <div class="fold-body">
        <div class="meta">${escapeHtml(t("These roles come from the agent-team project context and are merged into the native staff view instead of replacing it.", "\u8FD9\u4E9B\u89D2\u8272\u6765\u81EA agent team \u9879\u76EE\u4E0A\u4E0B\u6587\uFF0C\u5DF2\u5408\u5E76\u8FDB\u5F53\u524D\u539F\u751F\u56E2\u961F\u89C6\u56FE\uFF0C\u800C\u4E0D\u662F\u66FF\u6362\u539F\u6709\u5458\u5DE5\u89C6\u56FE\u3002"))}</div>
        ${renderAgentTeamContextList(model.teamMembers, language, "team")}
      </div>
    </details>
  `;
}

function renderAgentTeamMemoryBlock(model, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (!model.available) {
        return "";
    }
    return `
    <section class="card" id="agent-team-memory-panel">
      <h2>${escapeHtml(t("Project memory feed", "\u9879\u76EE\u8BB0\u5FC6\u6D41"))}</h2>
      <div class="meta">${escapeHtml(t("Recent team memory from the agent-team workspace, surfaced here in the native memory panel.", "\u8FD9\u91CC\u5C55\u793A\u7684\u662F agent team \u5DE5\u4F5C\u533A\u7684\u8FD1\u671F\u9879\u76EE\u8BB0\u5FC6\uFF0C\u5E76\u4E14\u76F4\u63A5\u5408\u5E76\u5230\u539F\u751F\u8BB0\u5FC6\u9762\u677F\u4E2D\u3002"))}</div>
      ${renderAgentTeamContextList(model.recentMemory, language, "memory")}
    </section>
  `;
}

function renderAgentTeamDocsBlock(model, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (!model.available) {
        return "";
    }
    return `
    <section class="task-hub-grid" id="agent-team-docs-panel">
      <section class="card">
        <h2>${escapeHtml(t("Key project docs", "\u6838\u5FC3\u9879\u76EE\u6587\u6863"))}</h2>
        <div class="meta">${escapeHtml(t("The most important handoff and runtime docs from the agent-team mainline.", "\u6765\u81EA agent team \u4E3B\u7EBF\u7684\u5173\u952E\u4EA4\u63A5\u6587\u6863\u4E0E\u8FD0\u884C\u6587\u6863\u3002"))}</div>
        ${renderAgentTeamContextList(model.keyDocs, language, "docs")}
      </section>
      <section class="card">
        <h2>${escapeHtml(t("Pilot assets", "\u8BD5\u8FD0\u884C\u8D44\u6599"))}</h2>
        <div class="meta">${escapeHtml(t("These pilot packets and playbooks stay close to the docs view so they can be used while operating the system.", "\u8FD9\u4E9B\u8BD5\u8FD0\u884C\u5305\u4E0E\u6F14\u7EC3\u8BF4\u660E\u4F1A\u4E0E\u6587\u6863\u89C6\u56FE\u653E\u5728\u4E00\u8D77\uFF0C\u4FBF\u4E8E\u8FB9\u64CD\u4F5C\u7CFB\u7EDF\u8FB9\u5F15\u7528\u3002"))}</div>
        ${renderAgentTeamContextList(model.pilotAssets, language, "assets")}
      </section>
    </section>
  `;
}

function renderAgentTeamProjectsBlock(model, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (!model.available) {
        return "";
    }
    return `
    <section class="task-hub-grid" id="agent-team-runs-panel">
      <section class="card">
        <h2>${escapeHtml(t("Persisted runtime bundles", "\u6301\u4E45\u5316\u8FD0\u884C\u5305"))}</h2>
        <div class="meta">${escapeHtml(t("This merges the agent-team runtime bundle inventory into the native task/work panel.", "\u8FD9\u91CC\u628A agent team \u7684\u8FD0\u884C\u5305\u6E05\u5355\u5E76\u5165\u539F\u751F\u4EFB\u52A1\u5DE5\u4F5C\u9762\u677F\u4E2D\u3002"))}</div>
        ${renderAgentTeamRunList(model.runs, language)}
      </section>
      <section class="card">
        <h2>${escapeHtml(t("Latest deliverables", "\u6700\u65B0\u4EA4\u4ED8\u7269"))}</h2>
        <div class="meta">${escapeHtml(t("Artifact previews are simplified for operators here; raw payloads stay behind the control surfaces.", "\u8FD9\u91CC\u7ED9\u64CD\u4F5C\u5458\u5C55\u793A\u7684\u662F\u7B80\u5316\u540E\u7684\u4EA4\u4ED8\u7269\u6458\u8981\uFF0C\u5E95\u5C42\u539F\u59CB\u5185\u5BB9\u4ECD\u7136\u7559\u5728\u63A7\u5236\u9762\u540E\u65B9\u3002"))}</div>
        ${renderAgentTeamArtifactList(model.artifacts, language)}
      </section>
    </section>
    <details class="card compact-details" id="agent-team-run-timeline">
      <summary>${escapeHtml(t("Agent team execution timeline", "Agent Team \u6267\u884C\u65F6\u95F4\u7EBF"))}</summary>
      <div class="fold-body">
        <div class="meta">${escapeHtml(t("Recent runtime events from the embedded agent-team run.", "\u8FD9\u91CC\u5C55\u793A\u7684\u662F\u5D4C\u5165\u7684 agent team \u8FD0\u884C\u6700\u8FD1\u4E8B\u4EF6\u3002"))}</div>
        ${renderAgentTeamTimelineList(model.timeline, language)}
      </div>
    </details>
  `;
}

function renderAgentTeamSettingsBlock(model, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (!model.available) {
        return "";
    }
    const sourceExplanation = model.sourceKind === "runtime" ? t("The open-source shell remains intact. Agent-team panels read the current team_runtime serve-session export first and only fall back to example fixtures when that embedded export is missing.", "\u5F00\u6E90\u9879\u76EE\u539F\u6709\u6846\u67B6\u4FDD\u6301\u4E0D\u53D8\u3002\u5F53\u524D Agent Team \u9762\u677F\u4F1A\u4F18\u5148\u8BFB\u53D6 team_runtime \u7684 serve-session \u5D4C\u5165\u5BFC\u51FA\uFF0C\u53EA\u6709\u5728\u8FD9\u4EFD\u5BFC\u51FA\u4E0D\u5B58\u5728\u65F6\u624D\u4F1A\u56DE\u9000\u5230\u793A\u4F8B\u5939\u5177\u3002") : t("The open-source shell remains intact. Agent-team panels are currently using the example fixture bundle because a serve-session export is not available yet.", "\u5F00\u6E90\u9879\u76EE\u539F\u6709\u6846\u67B6\u4FDD\u6301\u4E0D\u53D8\u3002\u5F53\u524D Agent Team \u9762\u677F\u4ECD\u5728\u4F7F\u7528\u793A\u4F8B\u5939\u5177\u5305\uFF0C\u56E0\u4E3A serve-session \u5BFC\u51FA\u6682\u65F6\u4E0D\u53EF\u7528\u3002");
    const rows = [[t("Workspace root", "\u5DE5\u4F5C\u533A\u6839\u76EE\u5F55"), model.sources.workspaceRoot], [t("Source kind", "\u6570\u636E\u6E90\u7C7B\u578B"), agentTeamSourceKindLabel(model.sourceKind, language)], [t("Snapshot updated", "\u5FEB\u7167\u66F4\u65B0\u65F6\u95F4"), agentTeamEmbeddedUpdatedLabel(model, language) ?? t("Not available", "\u6682\u65E0")], [t("Active snapshot root", "\u5F53\u524D\u5FEB\u7167\u6839\u76EE\u5F55"), model.sources.publicDir], [t("Project context", "\u9879\u76EE\u4E0A\u4E0B\u6587"), model.sources.projectContextPath], [t("Snapshot manifest", "\u5FEB\u7167\u6E05\u5355"), model.sources.fixtureManifestPath], [t("Scenario", "\u573A\u666F"), model.scenarioKey ?? t("Not available", "\u6682\u65E0")], [t("Status payload", "\u72B6\u6001\u8F7D\u8377"), model.sources.statusPath ?? t("Not available", "\u6682\u65E0")], [t("Runs payload", "\u8FD0\u884C\u6E05\u5355\u8F7D\u8377"), model.sources.runsDashboardPath ?? t("Not available", "\u6682\u65E0")], [t("Run detail payload", "\u8FD0\u884C\u8BE6\u60C5\u8F7D\u8377"), model.sources.runDetailPath ?? t("Not available", "\u6682\u65E0")], [t("Artifact preview payload", "\u5DE5\u4EF6\u9884\u89C8\u8F7D\u8377"), model.sources.runArtifactPath ?? t("Not available", "\u6682\u65E0")]];
    return `
    <section class="card" id="agent-team-settings-panel">
      <h2>${escapeHtml(t("Agent team embedding", "Agent Team \u5D4C\u5165\u4FE1\u606F"))}</h2>
      <div class="meta">${escapeHtml(sourceExplanation)}</div>
      <table>
        <thead><tr><th>${escapeHtml(t("Item", "\u9879\u76EE"))}</th><th>${escapeHtml(t("Current value", "\u5F53\u524D\u503C"))}</th></tr></thead>
        <tbody>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td><code>${escapeHtml(value)}</code></td></tr>`).join("")}</tbody>
      </table>
    </section>
  `;
}

function renderAgentTeamInspectorSummary(model, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (!model.available) {
        return "";
    }
    return `
    <div class="meta">${escapeHtml(t("Agent team runner", "Agent Team \u8FD0\u884C\u5668"))} ${badge(agentTeamFreshnessTone(model.runtime.freshnessState), agentTeamPhaseLabel(model.runtime.phase, language))}</div>
    <div class="meta">${escapeHtml(t("Decision", "\u51B3\u7B56"))} ${escapeHtml(agentTeamDecisionModeLabel(model.runtime.decisionMode, language))} \u8DEF ${escapeHtml(t("Supervision", "\u76D1\u7763"))} ${formatInt(model.summary.activeSupervisionCount)}</div>
    <div class="meta">${escapeHtml(t("Persisted runs", "\u6301\u4E45\u5316\u8FD0\u884C"))} ${formatInt(model.summary.runCount)} \u8DEF ${escapeHtml(t("Suggested action", "\u5EFA\u8BAE\u52A8\u4F5C"))} ${escapeHtml(agentTeamActionLabel(model.runtime.primaryActionKind, language))}</div>
  `;
}

function agentTeamFactLabel(key, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    switch (key.trim().toLowerCase()) {
        case "goal": return t("Goal", "\u76EE\u6807");
        case "pipeline": return t("Pipeline", "\u6D41\u6C34\u7EBF");
        case "stop_reason": return t("Stop reason", "\u505C\u6B62\u539F\u56E0");
        case "mode": return t("Mode", "\u6A21\u5F0F");
        case "tick_count": return t("Ticks", "\u6267\u884C\u8F6E\u6B21");
        case "remaining_job_ids": return t("Remaining jobs", "\u5269\u4F59\u4EFB\u52A1");
        case "processed_count": return t("Processed controls", "\u5DF2\u5904\u7406\u63A7\u5236");
        default: return agentTeamHumanizeToken(key) || key;
    }
}

function agentTeamPreviewSourceLabel(value, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    switch ((value ?? "").trim().toLowerCase()) {
        case "embedded_payload": return t("Embedded payload", "\u5D4C\u5165\u8F7D\u8377");
        case "artifact_file": return t("Artifact file", "\u5DE5\u4EF6\u6587\u4EF6");
        default: return agentTeamHumanizeToken(value) || t("Preview source", "\u9884\u89C8\u6765\u6E90");
    }
}

function agentTeamPreviewExcerpt(value, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (!value) {
        return t("No preview content is ready yet.", "\u6682\u65F6\u8FD8\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u9884\u89C8\u5185\u5BB9\u3002");
    }
    const lines = value.split(/\r?\n/g).map(line => line.replace(/^[#>*`\-\s]+/g, "").trim()).filter(line => line !== "");
    if (lines.length === 0) {
        return t("No preview content is ready yet.", "\u6682\u65F6\u8FD8\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u9884\u89C8\u5185\u5BB9\u3002");
    }
    return safeTruncate(lines.slice(0, 3).join(" / "), 220);
}

function renderAgentTeamFactList(items, language, emptyText) {
    if (items.length === 0) {
        return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
    }
    return `<ul class="story-list">${items.slice(0, 6).map(item => `<li><strong>${escapeHtml(agentTeamFactLabel(item.key, language))}</strong><div class="meta">${escapeHtml(item.value)}</div></li>`).join("")}</ul>`;
}

function renderAgentTeamDeliverableList(items, language, emptyText) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (items.length === 0) {
        return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
    }
    return `<ul class="story-list">${items.slice(0, 5).map(item => { const meta = [agentTeamFactLabel(item.key, language), item.schema ? agentTeamHumanizeToken(item.schema) || item.schema : "", item.file ? `${t("File", "\u6587\u4EF6")} ${agentTeamFileLabel(item.file)}` : ""].filter(Boolean).join(" \u8DEF "); return `<li><strong>${escapeHtml(item.label)}</strong><div class="meta">${escapeHtml(meta)}</div></li>`; }).join("")}</ul>`;
}

function renderAgentTeamInspectorCard(model, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    if (!model.available) {
        return "";
    }
    const topRun = model.focusedRun ?? model.runs[0];
    const topTimeline = model.timeline[0];
    const previewArtifact = model.previewArtifact;
    return `
    <div class="card" style="margin-top:10px;" id="agent-team-inspector">
      <h2>${escapeHtml(t("Agent team focus", "Agent Team \u7126\u70B9"))}</h2>
      <div class="meta">${escapeHtml(agentTeamRuntimeSummary(model, language))}</div>
      ${topRun ? `<div class="meta">${escapeHtml(t("Latest run", "\u6700\u8FD1\u8FD0\u884C"))} ${escapeHtml(topRun.pipeline ?? topRun.jobId ?? topRun.runId)} \u8DEF ${badge(agentTeamRunTone(topRun), agentTeamRunStatusLabel(topRun.status, language))}</div>` : ""}
      ${model.focusedRun?.goal ? `<div class="meta">${escapeHtml(t("Current goal", "\u5F53\u524D\u76EE\u6807"))} ${escapeHtml(model.focusedRun.goal)}</div>` : ""}
      ${previewArtifact ? `<div class="meta">${escapeHtml(t("Focused artifact", "\u805A\u7126\u5DE5\u4EF6"))} ${escapeHtml(agentTeamFileLabel(previewArtifact.file))} \u8DEF ${escapeHtml(agentTeamPreviewSourceLabel(previewArtifact.previewSource, language))}</div>` : ""}
      ${topTimeline ? `<div class="meta">${escapeHtml(t("Latest event", "\u6700\u8FD1\u4E8B\u4EF6"))} ${escapeHtml(agentTeamHumanizeToken(topTimeline.kind) || t("Runtime event", "\u8FD0\u884C\u4E8B\u4EF6"))} \u8DEF ${escapeHtml(topTimeline.timestamp ? formatTimeAgoFromNow(topTimeline.timestamp, language) : t("time unavailable", "\u65F6\u95F4\u672A\u77E5"))}</div>` : ""}
    </div>
  `;
}

function renderAgentTeamRunSummaryCard(model, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    const run = model.focusedRun;
    if (!model.available || !run) {
        return "";
    }
    const primaryLabel = run.pipeline ?? run.jobId ?? run.runId;
    return `
    <section class="card" style="margin-top:10px;" id="agent-team-run-summary">
      <h2>${escapeHtml(t("Run summary", "\u8FD0\u884C\u6458\u8981"))}</h2>
      <div class="meta">${escapeHtml(t("This keeps the selected runtime bundle readable for operators without exposing the raw payload by default.", "\u8FD9\u91CC\u628A\u5F53\u524D\u8FD0\u884C\u5305\u6574\u7406\u6210\u4FBF\u4E8E\u64CD\u4F5C\u5458\u7406\u89E3\u7684\u6458\u8981\uFF0C\u4E0D\u9ED8\u8BA4\u66B4\u9732\u5E95\u5C42\u539F\u59CB\u8F7D\u8377\u3002"))}</div>
      <div class="status-strip compact">
        <div class="status-chip"><span>${escapeHtml(t("Pipeline", "\u6D41\u6C34\u7EBF"))}</span><strong>${escapeHtml(primaryLabel)}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Warnings", "\u8B66\u544A"))}</span><strong>${formatInt(run.warningCount)}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Failures", "\u5931\u8D25"))}</span><strong>${formatInt(run.failureCount)}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Control queue", "\u63A7\u5236\u961F\u5217"))}</span><strong>${formatInt(run.pendingCount)}</strong></div>
      </div>
      <div class="meta">${escapeHtml(t("Final action", "\u6700\u7EC8\u52A8\u4F5C"))} ${escapeHtml(agentTeamFinalActionLabel(run.finalAction, language))} \u8DEF ${escapeHtml(t("Updated", "\u66F4\u65B0\u65F6\u95F4"))} ${escapeHtml(run.updatedAt ? formatTimeAgoFromNow(run.updatedAt, language) : t("time unavailable", "\u65F6\u95F4\u672A\u77E5"))}</div>
      ${run.goal ? `<div class="meta">${escapeHtml(t("Current goal", "\u5F53\u524D\u76EE\u6807"))} ${escapeHtml(run.goal)}</div>` : ""}
      <div class="meta" style="margin-top:10px;">${escapeHtml(t("Deliverables", "\u4EA4\u4ED8\u7269"))}</div>
      ${renderAgentTeamDeliverableList(run.deliverables, language, t("No deliverables were extracted from the focused bundle yet.", "\u5F53\u524D\u805A\u7126\u8FD0\u884C\u5305\u91CC\u8FD8\u6CA1\u6709\u63D0\u53D6\u51FA\u4EA4\u4ED8\u7269\u3002"))}
      <div class="meta" style="margin-top:10px;">${escapeHtml(t("Key facts", "\u5173\u952E\u4FE1\u606F"))}</div>
      ${renderAgentTeamFactList(run.facts, language, t("No additional run facts are ready yet.", "\u5F53\u524D\u8FD8\u6CA1\u6709\u66F4\u591A\u53EF\u5C55\u793A\u7684\u8FD0\u884C\u5173\u952E\u4FE1\u606F\u3002"))}
    </section>
  `;
}

function renderAgentTeamArtifactPreviewCard(model, language) {
    const t = __name((en, zh) => pickUiText(language, en, zh), "t");
    const artifact = model.previewArtifact;
    if (!model.available || !artifact) {
        return "";
    }
    const artifactFacts = [];
    if (artifact.stage) {
        artifactFacts.push({ key: "stage", value: agentTeamHumanizeToken(artifact.stage) || artifact.stage });
    }
    if (artifact.schema) {
        artifactFacts.push({ key: "schema", value: artifact.schema });
    }
    if (artifact.mode) {
        artifactFacts.push({ key: "mode", value: agentTeamHumanizeToken(artifact.mode) || artifact.mode });
    }
    if (artifact.sourceRole) {
        artifactFacts.push({ key: "source_role", value: agentTeamHumanizeToken(artifact.sourceRole) || artifact.sourceRole });
    }
    return `
    <section class="card" style="margin-top:10px;" id="agent-team-artifact-preview">
      <h2>${escapeHtml(t("Artifact preview", "\u5DE5\u4EF6\u9884\u89C8"))}</h2>
      <div class="meta">${escapeHtml(t("A simplified evidence excerpt is pinned here so the operator can keep context while switching center panels.", "\u8FD9\u91CC\u56FA\u5B9A\u5C55\u793A\u7B80\u5316\u540E\u7684\u8BC1\u636E\u6458\u5F55\uFF0C\u4FBF\u4E8E\u64CD\u4F5C\u5458\u5728\u5207\u6362\u4E2D\u95F4\u5DE5\u4F5C\u533A\u65F6\u4FDD\u6301\u4E0A\u4E0B\u6587\u3002"))}</div>
      <div class="meta">${escapeHtml(t("Artifact", "\u5DE5\u4EF6"))} ${escapeHtml(agentTeamFileLabel(artifact.file))}</div>
      <div class="status-strip compact">
        <div class="status-chip"><span>${escapeHtml(t("Source", "\u6765\u6E90"))}</span><strong>${escapeHtml(agentTeamPreviewSourceLabel(artifact.previewSource, language))}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Lines", "\u884C\u6570"))}</span><strong>${formatInt(artifact.previewLineCount ?? 0)}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Characters", "\u5B57\u7B26"))}</span><strong>${formatInt(artifact.previewCharacterCount ?? 0)}</strong></div>
        <div class="status-chip"><span>${escapeHtml(t("Notes", "\u6CE8\u8BB0"))}</span><strong>${formatInt(artifact.noteCount)}</strong></div>
      </div>
      <div class="mission-banner">${escapeHtml(agentTeamPreviewExcerpt(artifact.previewContent, language))}</div>
      <div class="meta">${escapeHtml(t("Updated", "\u66F4\u65B0\u65F6\u95F4"))} ${escapeHtml(artifact.updatedAt ? formatTimeAgoFromNow(artifact.updatedAt, language) : t("time unavailable", "\u65F6\u95F4\u672A\u77E5"))} \u8DEF ${escapeHtml(t("Stored", "\u5DF2\u843D\u5E93"))} ${escapeHtml(artifact.exists ? t("Yes", "\u662F") : t("No", "\u5426"))}</div>
      <div class="meta">${escapeHtml(t("Input bundle", "\u8F93\u5165\u5305"))} ${escapeHtml(artifact.hasInputBundle ? t("Included", "\u5DF2\u5305\u542B") : t("Not included", "\u672A\u5305\u542B"))} \u8DEF ${escapeHtml(t("Embedded content", "\u5D4C\u5165\u5185\u5BB9"))} ${escapeHtml(artifact.hasEmbeddedContent ? t("Available", "\u53EF\u7528") : t("Unavailable", "\u4E0D\u53EF\u7528"))}</div>
      <div class="meta" style="margin-top:10px;">${escapeHtml(t("Artifact facts", "\u5DE5\u4EF6\u4FE1\u606F"))}</div>
      ${renderAgentTeamFactList(artifactFacts, language, t("No additional artifact facts are ready yet.", "\u5F53\u524D\u8FD8\u6CA1\u6709\u66F4\u591A\u53EF\u5C55\u793A\u7684\u5DE5\u4EF6\u4FE1\u606F\u3002"))}
      ${artifact.previewTruncated ? `<div class="meta">${escapeHtml(t("The preview is truncated for readability; the full artifact stays behind the runtime surface.", "\u4E3A\u4E86\u4FBF\u4E8E\u9605\u8BFB\uFF0C\u5F53\u524D\u9884\u89C8\u5DF2\u505A\u622A\u65AD\uFF1B\u5B8C\u6574\u5DE5\u4EF6\u4ECD\u4FDD\u7559\u5728\u8FD0\u884C\u65F6\u8868\u9762\u540E\u65B9\u3002"))}</div>` : ""}
    </section>
  `;
}

function pickLatestTimestamp(values) {
    let latestValue;
    let latestMs = 0;
    for (const value of values) {
        const parsed = toSortableMs(value);
        if (parsed > latestMs) {
            latestMs = parsed;
            latestValue = value;
        }
    }
    return latestValue;
}

function isSameLocalCalendarDay(value, nowMs) {
    const parsed = toSortableMs(value);
    if (!parsed)
        return false;
    const a = new Date(parsed);
    const b = new Date(nowMs);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function hasFreshRuntimeTimestamp(value, nowMs, windowMs) { const parsed = toSortableMs(value); return parsed > 0 && nowMs - parsed <= windowMs; }

function isStaleRuntimeTimestamp(value, nowMs, windowMs) { const parsed = toSortableMs(value); return parsed > 0 && nowMs - parsed > windowMs; }

function pickLatestSessionActivityTimestamp(...values) {
    let latest;
    let latestMs = Number.NEGATIVE_INFINITY;
    for (const value of values) {
        const parsed = toSortableMs(value);
        if (parsed <= 0 || parsed <= latestMs)
            continue;
        latest = value;
        latestMs = parsed;
    }
    return latest;
}

export {
  agentTeamHumanizeToken,
  agentTeamPhaseLabel,
  agentTeamDecisionModeLabel,
  agentTeamFreshnessLabel,
  agentTeamActionLabel,
  agentTeamSourceKindLabel,
  agentTeamEmbeddedUpdatedLabel,
  agentTeamSnapshotRefreshHintLegacy,
  agentTeamSnapshotRefreshHint,
  agentTeamSuggestedPanelHref,
  agentTeamRunStatusLabel,
  agentTeamFinalActionLabel,
  agentTeamFreshnessTone,
  agentTeamRunTone,
  agentTeamRuntimeSummaryLegacy,
  agentTeamRuntimeSummary,
  agentTeamFileLabel,
  renderAgentTeamContextList,
  renderAgentTeamRunList,
  renderAgentTeamArtifactList,
  renderAgentTeamTimelineList,
  renderAgentTeamSidebarCard,
  renderAgentTeamOverviewBlock,
  renderAgentTeamTeamBlock,
  renderAgentTeamMemoryBlock,
  renderAgentTeamDocsBlock,
  renderAgentTeamProjectsBlock,
  renderAgentTeamSettingsBlock,
  renderAgentTeamInspectorSummary,
  agentTeamFactLabel,
  agentTeamPreviewSourceLabel,
  agentTeamPreviewExcerpt,
  renderAgentTeamFactList,
  renderAgentTeamDeliverableList,
  renderAgentTeamInspectorCard,
  renderAgentTeamRunSummaryCard,
  renderAgentTeamArtifactPreviewCard,
  pickLatestTimestamp,
  isSameLocalCalendarDay,
  hasFreshRuntimeTimestamp,
  isStaleRuntimeTimestamp,
  pickLatestSessionActivityTimestamp,
};
