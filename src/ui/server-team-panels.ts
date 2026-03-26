// @ts-nocheck

const import_config = require("../config");
const { badge, escapeHtml, formatTimeAgoFromNow, pickUiText } = require("./server-shared");
const { buildSessionLinkAttrs } = require("./server-session-room-links");

function createTeamPanelRenderers(deps) {
  const {
    asPercent,
    collaborationParticipantRoleLabel,
    collaborationRoleAgentLabel,
    deriveAgentAnimalIdentity,
    executionChainCardTitle,
    executionChainSourceLabel,
    executionChainStageLabel,
    formatSubscriptionNumericField,
    humanizeOperatorLabel,
    normalizeQuotaWindowLabel,
    officeZoneLabel,
    renderAgentAvatarFrame,
    renderQuotaWindowRow,
    sessionStateLabel,
    summarizeVisibleSessionSnippet,
  } = deps;

  function renderStaffOverviewCards(cards, language = "zh", localMutationUnlock = false) {
    if (cards.length === 0) {
      return `<div class="empty-state">${escapeHtml(pickUiText(language, "No staff summary is available yet.", "\u5F53\u524D\u6CA1\u6709\u53EF\u663E\u793A\u7684\u5458\u5DE5\u6458\u8981\u3002"))}</div>`;
    }
    const modelCopy = {
      model: pickUiText(language, "Model", "\u6A21\u578B"),
      fallbackModel: pickUiText(language, "Fallback model", "\u5907\u7528\u6A21\u578B"),
      noFallback: pickUiText(language, "No fallback", "\u65E0\u5907\u7528"),
      save: pickUiText(language, "Save model", "\u4FDD\u5B58\u6A21\u578B"),
      more: pickUiText(language, "More settings", "\u66F4\u591A\u8BBE\u7F6E"),
      schedule: pickUiText(language, "Schedule", "\u6392\u73ED"),
      workspace: pickUiText(language, "Workspace", "\u5DE5\u4F5C\u533A"),
      tools: pickUiText(language, "Tools", "\u5DE5\u5177"),
      recentOutput: pickUiText(language, "Recent output", "\u6700\u8FD1\u4EA7\u51FA"),
      blocked: pickUiText(language, "Model change is blocked until this machine has a safety passcode.", "\u5F53\u524D\u673A\u5668\u8FD8\u6CA1\u8BBE\u7F6E\u5B89\u5168\u53E3\u4EE4\uFF0C\u6682\u65F6\u4E0D\u80FD\u4FDD\u5B58\u6A21\u578B\u3002"),
      locked: pickUiText(language, "Write access is off. Turn on the top toolbar unlock before changing models.", "\u5199\u5165\u89E3\u9501\u5DF2\u5173\u95ED\uFF0C\u8BF7\u5148\u5728\u9876\u90E8\u5DE5\u5177\u680F\u5F00\u542F\u540E\u518D\u4FEE\u6539\u6A21\u578B\u3002"),
      unavailable: pickUiText(language, "Model editing is unavailable until openclaw.json can be read.", "\u8981\u5148\u6210\u529F\u8BFB\u53D6 openclaw.json\uFF0C\u8FD9\u91CC\u624D\u80FD\u76F4\u63A5\u6539\u6A21\u578B\u3002"),
    };
    return `<div class="staff-brief-grid">${cards.map((card) => {
      const saveBlocked = import_config.LOCAL_TOKEN_AUTH_REQUIRED && (import_config.LOCAL_API_TOKEN === "" || !localMutationUnlock);
      const avatar = renderAgentAvatarFrame({ agentId: card.agentId, identity: card.identity, className: "staff-avatar", canvasWidth: 256, canvasHeight: 256 });
      return `<article class="staff-brief-card">
        <span class="staff-status-dot ${escapeHtml(card.statusTone)}" title="${escapeHtml(card.statusDotLabel)}" aria-hidden="true"></span>
        <div class="staff-brief-head">
          ${avatar}
          <div class="staff-brief-identity">
            <h3>${escapeHtml(card.displayName)}</h3>
            <div class="staff-role">${escapeHtml(card.roleLabel)}</div>
            <div class="staff-brief-status">${badge(card.statusTone, card.statusLabel)}</div>
          </div>
        </div>
        <div class="staff-brief-primary">
          <div class="staff-summary-block">
            <div class="staff-summary-label">${escapeHtml(card.currentWorkLabel)}</div>
            <div class="staff-summary-value clamp-2">${escapeHtml(card.currentWork)}</div>
          </div>
          <div class="staff-summary-block">
            <div class="staff-summary-label">${escapeHtml(modelCopy.recentOutput)}</div>
            <div class="staff-summary-value clamp-3">${escapeHtml(card.recentOutput)}</div>
          </div>
        </div>
        <div class="staff-chip-row">
          <span class="staff-chip">${escapeHtml(card.statusLabel)}</span>
          <span class="staff-chip">${escapeHtml(card.scheduledLabel)}</span>
        </div>
        <details class="compact-table-details staff-secondary-details">
          <summary>${escapeHtml(modelCopy.more)}</summary>
          <div class="fold-body">
            <div class="staff-secondary-grid">
              <div class="staff-secondary-item">
                <span>${escapeHtml(modelCopy.schedule)}</span>
                <strong class="clamp-2">${escapeHtml(card.scheduledLabel)}</strong>
              </div>
              <div class="staff-secondary-item">
                <span>${escapeHtml(modelCopy.workspace)}</span>
                <strong class="clamp-2">${escapeHtml(card.workspace)}</strong>
              </div>
              <div class="staff-secondary-item">
                <span>${escapeHtml(modelCopy.tools)}</span>
                <strong class="clamp-2">${escapeHtml(card.toolsProfile)}</strong>
              </div>
            </div>
            <div class="staff-model-shell">
              <div class="staff-summary-label">${escapeHtml(modelCopy.model)}</div>
              <div class="staff-model-editor" data-staff-model-root data-agent-id="${escapeHtml(card.agentId)}" data-language="${escapeHtml(language)}" data-current-model="${escapeHtml(card.model)}" data-current-fallback-model="${escapeHtml(card.fallbackModel ?? "")}" data-config-path="${escapeHtml(card.configPath)}" data-model-editable="${card.modelEditable ? "1" : "0"}">
                <div class="staff-model-field">
                  <div class="staff-model-field-label">${escapeHtml(modelCopy.model)}</div>
                  <select class="staff-model-select" data-staff-model-select ${card.modelEditable && !saveBlocked ? "" : "disabled"}>
                    ${card.modelOptions.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === card.model ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                </div>
                <div class="staff-model-field">
                  <div class="staff-model-field-label">${escapeHtml(modelCopy.fallbackModel)}</div>
                  <select class="staff-model-select" data-staff-fallback-model-select ${card.modelEditable && !saveBlocked ? "" : "disabled"}>
                    <option value="">${escapeHtml(modelCopy.noFallback)}</option>
                    ${card.modelOptions.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === (card.fallbackModel ?? "") ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                </div>
                <div class="staff-model-actions">
                  <button class="btn staff-model-save" type="button" data-staff-model-save ${card.modelEditable && !saveBlocked ? "" : "disabled"}>${escapeHtml(modelCopy.save)}</button>
                </div>
                <div class="meta staff-model-status" data-staff-model-status>${escapeHtml(card.modelEditable ? saveBlocked ? import_config.LOCAL_API_TOKEN === "" ? modelCopy.blocked : modelCopy.locked : "" : modelCopy.unavailable)}</div>
              </div>
            </div>
          </div>
        </details>
      </article>`;
    }).join("")}</div>`;
  }

  function renderTaskExecutionChainCards(cards, language = "zh") {
    if (cards.length === 0) {
      return `<div class="empty-state">${escapeHtml(pickUiText(language, "No accepted/spawn execution chains are visible yet. They will appear once isolated sessions are dispatched.", "\u5F53\u524D\u8FD8\u6CA1\u6709\u53EF\u89C1\u7684\u63A5\u5355/\u6D3E\u53D1\u6267\u884C\u94FE\u3002\u9694\u79BB\u4F1A\u8BDD\u5F00\u59CB\u6D3E\u53D1\u540E\u4F1A\u663E\u793A\u3002"))}</div>`;
    }
    return `<div class="execution-chain-list">${cards.slice(0, 10).map((item) => {
      const chain = item.executionChain;
      const acceptedBadge = badge(chain.accepted ? "ok" : "idle", pickUiText(language, "Accepted", "\u5DF2\u63A5\u5355"));
      const spawnedBadge = badge(chain.spawned ? "info" : "idle", pickUiText(language, "Spawned", "\u5DF2\u6D3E\u53D1"));
      const stageBadge = badge(chain.stage, executionChainStageLabel(chain.stage, language));
      const runStateBadge = badge(item.state, sessionStateLabel(item.state));
      const ownerLabel = humanizeOperatorLabel(item.owner);
      const title = executionChainCardTitle(item, language);
      const taskMeta = item.unmapped ? pickUiText(language, "No linked task", "\u672A\u5173\u8054\u4EFB\u52A1") : item.projectTitle ?? pickUiText(language, "Linked task", "\u5DF2\u5173\u8054\u4EFB\u52A1");
      const contextLine = [taskMeta, `${pickUiText(language, "Agent", "\u667A\u80FD\u4F53")} ${ownerLabel}`].filter(Boolean).join(" \xB7 ");
      const sessionFlow = [chain.parentSessionKey, chain.childSessionKey].filter((value, idx, arr) => Boolean(value) && arr.indexOf(value) === idx).map((value) => `<code>${escapeHtml(value)}</code>`).join(' <span class="execution-chain-arrow">\u2192</span> ');
      const latestLine = item.latestAt ? `${pickUiText(language, "Latest", "\u6700\u8FD1")} ${escapeHtml(item.latestAt)}` : escapeHtml(pickUiText(language, "No history yet", "\u6682\u65E0\u5386\u53F2"));
      const sourceLine = executionChainSourceLabel(chain, language);
      const summarySource = item.latestSnippet?.trim() ? item.latestSnippet : chain.detail;
      const summaryLine = escapeHtml(summarizeVisibleSessionSnippet(summarySource, language, 96));
      const roomAction = item.linkedRoomId
        ? `<button class="btn primary" type="button" data-collaboration-room-open="${escapeHtml(item.linkedRoomId)}" data-collaboration-room-source="execution-chain">${escapeHtml(pickUiText(language, "Open room", "\u67E5\u770B\u4F1A\u8BDD"))}</button>`
        : `<a class="btn" ${buildSessionLinkAttrs({ sessionKey: item.sessionKey, language, buildSessionDetailHref: () => item.sessionHref, escapeHtml, source: "execution-chain-card" })}>${escapeHtml(pickUiText(language, "Open session", "\u67E5\u770B\u4F1A\u8BDD"))}</a>`;
      const sessionDetailAction = item.linkedRoomId
        ? `<a class="btn" href="${escapeHtml(item.sessionHref)}">${escapeHtml(pickUiText(language, "Session page", "\u4F1A\u8BDD\u8BE6\u60C5\u9875"))}</a>`
        : "";
      return `<article class="execution-chain-card">
        <div class="execution-chain-head">
          <div class="execution-chain-copy">
            <strong>${escapeHtml(title)}</strong>
            <div class="execution-chain-context">${escapeHtml(contextLine)}</div>
          </div>
          <div class="execution-chain-badges">${stageBadge}${runStateBadge}${acceptedBadge}${spawnedBadge}</div>
        </div>
        <div class="execution-chain-meta-stack">
          <div class="execution-chain-meta-line">${escapeHtml(sourceLine)} \xB7 ${latestLine}</div>
          <div class="execution-chain-flow">${sessionFlow || `<code>${escapeHtml(item.sessionKey)}</code>`}</div>
          <div class="execution-chain-summary">${summaryLine}</div>
        </div>
        <div class="execution-chain-actions">
          ${roomAction}
          ${item.taskHref ? `<a class="btn" href="${escapeHtml(item.taskHref)}">${escapeHtml(pickUiText(language, "Open task", "\u67E5\u770B\u4EFB\u52A1"))}</a>` : ""}
          ${sessionDetailAction}
        </div>
      </article>`;
    }).join("")}</div>`;
  }

  function renderCollaborationThreadCards(cards, language = "zh") {
    if (cards.length === 0) {
      return `<div class="empty-state">${escapeHtml(pickUiText(language, "No collaboration threads are visible yet. They will appear once parent-child relays or cross-session messages show up.", "\u5F53\u524D\u8FD8\u6CA1\u6709\u53EF\u89C1\u7684\u534F\u4F5C\u7EBF\u7A0B\u3002\u7236\u5B50\u63A5\u529B\u6216\u8DE8\u4F1A\u8BDD\u6D88\u606F\u51FA\u73B0\u540E\uFF0C\u8FD9\u91CC\u5C31\u4F1A\u5F00\u59CB\u663E\u793A\u3002"))}</div>`;
    }
    return `<div class="collaboration-thread-list">${cards.map((card) => {
      const participantAvatars = card.participants.map((participant, index) => {
        const avatar = `<div class="collaboration-participant">
            ${renderAgentAvatarFrame({ agentId: participant.agentId, identity: participant.identity, className: "agent-avatar", extraClassName: `collaboration-avatar${participant.current ? " is-current" : ""}`, canvasWidth: 224, canvasHeight: 224, ariaLabel: participant.label })}
            <div class="collaboration-participant-label">${escapeHtml(participant.roleLabel)}</div>
          </div>`;
        const arrow = index < card.participants.length - 1 ? `<span class="collaboration-route-arrow" aria-hidden="true">${escapeHtml(card.routeJoiner)}</span>` : "";
        return `${avatar}${arrow}`;
      }).join("");
      const timelineHtml = card.timeline.map((step) => {
        const identity = deriveAgentAnimalIdentity(step.agentId);
        return `<li class="collaboration-timeline-step">
            <div class="collaboration-agent-pill" style="--agent-accent:${escapeHtml(identity.accent)};">
              <span class="collaboration-agent-pill-dot"></span>
              <strong>${escapeHtml(step.roleLabel ? `${step.roleLabel} \xB7 ${humanizeOperatorLabel(step.agentId)}` : humanizeOperatorLabel(step.agentId))}</strong>
            </div>
            <div class="collaboration-step-copy">
              <div class="collaboration-step-head">
                <strong>${escapeHtml(step.title)}</strong>
                <span>${escapeHtml(step.at ? formatTimeAgoFromNow(step.at, language) : pickUiText(language, "time unavailable", "\u65F6\u95F4\u672A\u77E5"))}</span>
              </div>
              <div class="meta">${escapeHtml(step.detail)}</div>
            </div>
          </li>`;
      }).join("");
      const technicalDetails = [
        card.parentSessionKey ? { label: card.kind === "inter_session" ? pickUiText(language, "Sending session", "\u53D1\u9001\u4F1A\u8BDD") : pickUiText(language, "Parent session", "\u7236\u4F1A\u8BDD"), value: card.parentSessionKey } : void 0,
        card.childSessionKey ? { label: card.kind === "inter_session" ? pickUiText(language, "Receiving session", "\u63A5\u6536\u4F1A\u8BDD") : pickUiText(language, "Child session", "\u5B50\u4F1A\u8BDD"), value: card.childSessionKey } : void 0,
      ].filter((item) => Boolean(item?.value)).filter((item, index, values) => values.findIndex((entry) => entry.value === item.value) === index).map((item) => `<li>${escapeHtml(item.label)}\uFF1A<code>${escapeHtml(item.value)}</code></li>`).join("");
      const foldedRunsList = card.aggregateCount > 1 ? `<ul class="story-list collaboration-folded-list">${card.aggregateItems.slice(0, 6).map((item) => `<li><a ${buildSessionLinkAttrs({ sessionKey: item.sessionKey, language, buildSessionDetailHref: () => item.sessionHref, escapeHtml, source: "collaboration-thread-folded" })}><code>${escapeHtml(item.sessionKey)}</code></a> \xB7 ${escapeHtml(item.latestAt ? formatTimeAgoFromNow(item.latestAt, language) : pickUiText(language, "time unavailable", "\u65F6\u95F4\u672A\u77E5"))}</li>`).join("")}${card.aggregateItems.length > 6 ? `<li>${escapeHtml(pickUiText(language, `${card.aggregateItems.length - 6} more runs are folded here.`, `\u5176\u4F59 ${card.aggregateItems.length - 6} \u6761\u76F8\u8FD1\u534F\u4F5C\u4E5F\u5DF2\u7ECF\u6298\u53E0\u5728\u8FD9\u91CC\u3002`))}</li>` : ""}</ul>` : "";
      const roomRefsHtml = card.roomRefs.length > 0 ? `<div class="collaboration-room-ref-block">
              <div class="meta collaboration-room-ref-head">${escapeHtml(pickUiText(language, "Group chat references", "\u7FA4\u804A\u5F15\u7528"))}</div>
              <ul class="story-list collaboration-room-ref-list">${card.roomRefs.map((ref) => `<li><strong>#${ref.sequence} \xB7 ${escapeHtml(ref.label)}</strong><div class="meta">${escapeHtml(formatTimeAgoFromNow(ref.createdAt, language))}</div><div class="meta">${escapeHtml(ref.detail)}</div></li>`).join("")}</ul>
            </div>` : "";
      const aggregateLabel = card.aggregateCount > 1 ? pickUiText(language, `${card.aggregateCount} runs folded`, `\u6298\u53E0 ${card.aggregateCount} \u6761`) : "";
      return `<details class="card collaboration-thread-card" data-collab-card data-collab-state="${escapeHtml(card.status)}" data-collab-multi-agent="${card.multiAgent ? "1" : "0"}" data-collab-primary-dispatched="${card.primaryDispatched ? "1" : "0"}">
        <summary class="collaboration-thread-summary">
          <div class="collaboration-thread-head">
            <div class="collaboration-route-avatars">${participantAvatars}</div>
            <div class="collaboration-thread-copy">
              <strong>${escapeHtml(card.taskTitle)}</strong>
              <div class="meta collaboration-thread-route">${escapeHtml(card.routeTitle)}</div>
            </div>
            <div class="collaboration-thread-badges">
              ${badge("idle", card.kindBadge)}
              ${badge(card.status === "completed" ? "ok" : card.status === "blocked" ? "warn" : "info", card.statusBadge)}
            </div>
          </div>
          <div class="collaboration-thread-teaser">
            <div class="meta collaboration-thread-meta">${escapeHtml(card.currentOwnerLabel)} \xB7 ${escapeHtml(card.latestAtLabel)}${aggregateLabel ? ` \xB7 ${escapeHtml(aggregateLabel)}` : ""}</div>
            <div class="collaboration-thread-summary-line clamp-2">${escapeHtml(card.summary)}</div>
            <div class="collaboration-latest-snippet clamp-2">${escapeHtml(card.latestSnippet)}</div>
          </div>
        </summary>
        <div class="collaboration-thread-body">
          <ol class="collaboration-timeline">${timelineHtml}</ol>
          ${card.aggregateCount > 1 ? `<div class="meta collaboration-folded-note">${escapeHtml(card.kind === "inter_session" ? pickUiText(language, `${card.aggregateCount} similar cross-session exchanges are folded into this card. The newest timeline stays visible here.`, `\u8FD9\u5F20\u5361\u91CC\u6298\u53E0\u4E86 ${card.aggregateCount} \u6761\u76F8\u8FD1\u7684\u8DE8\u4F1A\u8BDD\u901A\u4FE1\uFF0C\u5F53\u524D\u4FDD\u7559\u7684\u662F\u6700\u65B0\u4E00\u6761\u65F6\u95F4\u7EBF\u3002`) : pickUiText(language, `${card.aggregateCount} similar parent-child relays are folded into this card. The newest timeline stays visible here.`, `\u8FD9\u5F20\u5361\u91CC\u6298\u53E0\u4E86 ${card.aggregateCount} \u6761\u76F8\u8FD1\u7684\u7236\u5B50\u4F1A\u8BDD\u63A5\u529B\uFF0C\u5F53\u524D\u4FDD\u7559\u7684\u662F\u6700\u65B0\u4E00\u6761\u65F6\u95F4\u7EBF\u3002`))}</div>` : ""}
          ${roomRefsHtml}
          <div class="collaboration-thread-foot">
            <div class="meta">${escapeHtml(card.sourceLabel)}</div>
            <div class="collaboration-thread-actions">
              <a class="btn" ${buildSessionLinkAttrs({ sessionKey: card.sessionKey, language, buildSessionDetailHref: () => card.sessionHref, escapeHtml, source: "collaboration-thread-card" })}>${escapeHtml(pickUiText(language, "Open session", "\u67E5\u770B\u4F1A\u8BDD"))}</a>
              ${card.taskHref ? `<a class="btn" href="${escapeHtml(card.taskHref)}">${escapeHtml(pickUiText(language, "Open task", "\u67E5\u770B\u4EFB\u52A1"))}</a>` : ""}
            </div>
          </div>
          <details class="compact-table-details collaboration-technical-details">
            <summary>${escapeHtml(pickUiText(language, "Technical details", "\u6280\u672F\u7EC6\u8282"))}</summary>
            <div class="fold-body">
              <ul class="story-list">${technicalDetails}</ul>
              ${foldedRunsList}
            </div>
          </details>
        </div>
      </details>`;
    }).join("")}</div>`;
  }

  function renderOfficeCards(cards, language = "zh") {
    if (cards.length === 0) {
      return `<div class="empty-state">${escapeHtml(pickUiText(language, "No staff roster signal yet. It will appear after config or runtime data is connected.", "\u6682\u65E0\u52A9\u624B\u540D\u5F55\u4FE1\u53F7\u3002\u8FDE\u63A5\u914D\u7F6E\u6216\u8FD0\u884C\u6001\u540E\u4F1A\u663E\u793A\u3002"))}</div>`;
    }
    return `<div class="office-grid">${cards.map((card) => {
      const focusLabel = pickUiText(language, "Current focus", "\u5F53\u524D\u91CD\u70B9");
      const focus = card.focusItems.length === 0
        ? `<div class="meta">${escapeHtml(focusLabel)}\uFF1A${escapeHtml(pickUiText(language, "None", "\u6682\u65E0"))}</div>`
        : `<div class="office-focus-label">${escapeHtml(focusLabel)}</div><ul class="office-focus">${card.focusItems.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      const avatar = renderAgentAvatarFrame({ agentId: card.agentId, identity: card.identity, className: "agent-avatar", canvasWidth: 224, canvasHeight: 160, language, showAnimalLabel: true });
      return `<article class="office-card">
        <div class="office-head">
          ${avatar}
          <div class="office-info">
            <div class="topline"><strong>${escapeHtml(humanizeOperatorLabel(card.agentId))}</strong>${badge(card.status, card.statusLabel)}</div>
            <div class="office-summary clamp-2">${escapeHtml(card.summary)}</div>
            <div class="office-metrics">
              <span>${escapeHtml(pickUiText(language, "Active sessions", "\u6D3B\u8DC3\u4F1A\u8BDD"))}\uFF1A${card.activeSessions}</span>
              <span>${escapeHtml(pickUiText(language, "Active tasks", "\u6D3B\u8DC3\u4EFB\u52A1"))}\uFF1A${card.activeTasks}</span>
            </div>
          </div>
        </div>
        <div class="office-focus-block">${focus}</div>
      </article>`;
    }).join("")}</div>`;
  }

  function renderOfficeFloor(cards, language = "zh") {
    const zones = ["Builder Desks", "Approval Desk", "Support Bay", "Standby Pods"];
    return `<div class="office-floor">${zones.map((zone) => {
      const items = cards.filter((card) => card.officeZone === zone);
      const rows = items.length === 0 ? '<li class="desk-chip">\u5F53\u524D\u6CA1\u6709\u5206\u914D\u3002</li>' : items.map((card) => `<li class="desk-chip"><strong>${escapeHtml(humanizeOperatorLabel(card.agentId))}</strong><div class="meta">${escapeHtml(card.summary)}</div></li>`).join("");
      return `<section class="zone"><h3>${escapeHtml(officeZoneLabel(zone, language))}</h3><div class="meta">${escapeHtml(pickUiText(language, "Occupied", "\u5360\u7528\u6570"))}\uFF1A${items.length}</div><ul class="desk-list">${rows}</ul></section>`;
    }).join("")}</div>`;
  }

  function renderSubscriptionStatusCard(subscription, language = "zh") {
    const statusLabel = subscription.status === "connected" ? pickUiText(language, "Connected", "\u5DF2\u8FDE\u63A5") : subscription.status === "partial" ? pickUiText(language, "Partially connected", "\u90E8\u5206\u8FDE\u63A5") : pickUiText(language, "Not connected", "\u672A\u8FDE\u63A5");
    if (subscription.status === "not_connected") {
      const hasEstimatedWindow = typeof subscription.consumed === "number" || typeof subscription.remaining === "number" || typeof subscription.limit === "number";
      const estimateRows = hasEstimatedWindow ? [
        typeof subscription.consumed === "number" ? `<div class="meta">${escapeHtml(pickUiText(language, "Estimated used", "\u4F30\u7B97\u5DF2\u7528"))}\uFF1A${escapeHtml(formatSubscriptionNumericField(subscription.consumed, subscription.unit, "consumed", language))}</div>` : "",
        typeof subscription.remaining === "number" ? `<div class="meta">${escapeHtml(pickUiText(language, "Estimated remaining", "\u4F30\u7B97\u5269\u4F59"))}\uFF1A${escapeHtml(formatSubscriptionNumericField(subscription.remaining, subscription.unit, "remaining", language))}</div>` : "",
        typeof subscription.limit === "number" ? `<div class="meta">${escapeHtml(pickUiText(language, "Estimated total", "\u4F30\u7B97\u603B\u989D"))}\uFF1A${escapeHtml(formatSubscriptionNumericField(subscription.limit, subscription.unit, "limit", language))}</div>` : "",
      ].filter((item) => item.length > 0).join("") : "";
      return `<div class="empty-state">
      <div><strong>${escapeHtml(pickUiText(language, "Subscription data is not connected.", "\u8BA2\u9605\u6570\u636E\u672A\u63A5\u901A\u3002"))}</strong> ${escapeHtml(pickUiText(language, "Current balance is estimated.", "\u5F53\u524D\u4F59\u989D\u4E3A\u4F30\u7B97\u503C\u3002"))}</div>
      ${estimateRows}
      <div class="toolbar">
        <a class="btn" href="/?section=settings#tool-connectors">${escapeHtml(pickUiText(language, "Open data connection settings", "\u524D\u5F80\u6570\u636E\u8FDE\u63A5\u8BBE\u7F6E"))}</a>
      </div>
    </div>`;
    }
    if (subscription.primaryWindowLabel || subscription.secondaryUsedPercent !== void 0) {
      const primaryUsed = asPercent(subscription.primaryUsedPercent ?? subscription.usagePercent);
      const primaryRemaining = asPercent(subscription.primaryRemainingPercent ?? (typeof primaryUsed === "number" ? 100 - primaryUsed : void 0));
      const secondaryUsed = asPercent(subscription.secondaryUsedPercent);
      const secondaryRemaining = asPercent(subscription.secondaryRemainingPercent ?? (typeof secondaryUsed === "number" ? 100 - secondaryUsed : void 0));
      const primarySummary = `${pickUiText(language, "Primary window", "\u4E3B\u7A97\u53E3")} ${normalizeQuotaWindowLabel(subscription.primaryWindowLabel, "5h")} \xB7 ${pickUiText(language, "Used", "\u5DF2\u7528")} ${typeof primaryUsed === "number" ? `${primaryUsed.toFixed(1)}%` : "\u2014"} \xB7 ${pickUiText(language, "Remaining", "\u5269\u4F59")} ${typeof primaryRemaining === "number" ? `${primaryRemaining.toFixed(1)}%` : "\u2014"}`;
      const primaryReset = subscription.primaryResetAt?.trim() ? `<span>${escapeHtml(pickUiText(language, "Reset", "\u91CD\u7F6E"))} <span data-quota-reset-at="${escapeHtml(subscription.primaryResetAt)}" data-quota-window="${escapeHtml(normalizeQuotaWindowLabel(subscription.primaryWindowLabel, "5h"))}">${escapeHtml(pickUiText(language, "Loading...", "\u52A0\u8F7D\u4E2D..."))}</span></span>` : "";
      return `<div class="subscription-pill">
      <div><strong>${escapeHtml(pickUiText(language, "Quota windows", "\u989D\u5EA6\u7A97\u53E3"))}</strong> ${badge(subscription.status, statusLabel)}</div>
      <div class="meta">${escapeHtml(primarySummary)}${primaryReset ? ` \xB7 ${primaryReset}` : ""}</div>
      <div class="meta">${escapeHtml(pickUiText(language, "Only the key windows are shown: 5h and Week.", "\u4EC5\u663E\u793A\u5173\u952E\u989D\u5EA6\uFF1A5h \u4E0E Week\u3002"))}</div>
      <div class="quota-compact">
        ${renderQuotaWindowRow({ label: normalizeQuotaWindowLabel(subscription.primaryWindowLabel, "5h"), usedPercent: primaryUsed, remainingPercent: primaryRemaining, resetAt: subscription.primaryResetAt ?? subscription.cycleEnd }, language)}
        ${renderQuotaWindowRow({ label: normalizeQuotaWindowLabel(subscription.secondaryWindowLabel, "Week"), usedPercent: secondaryUsed, remainingPercent: secondaryRemaining, resetAt: subscription.secondaryResetAt }, language)}
      </div>
    </div>`;
    }
    const used = formatSubscriptionNumericField(subscription.consumed, subscription.unit, "consumed", language);
    const remaining = formatSubscriptionNumericField(subscription.remaining, subscription.unit, "remaining", language);
    const limit = formatSubscriptionNumericField(subscription.limit, subscription.unit, "limit", language);
    const cycleStart = subscription.cycleStart?.trim() ? subscription.cycleStart.trim() : pickUiText(language, "Not provided", "\u672A\u63D0\u4F9B");
    const cycleEnd = subscription.cycleEnd?.trim() ? subscription.cycleEnd.trim() : pickUiText(language, "Not provided", "\u672A\u63D0\u4F9B");
    const usagePercent = typeof subscription.usagePercent === "number" ? `${subscription.usagePercent.toFixed(1)}%` : pickUiText(language, "Not provided", "\u672A\u63D0\u4F9B");
    return `<div class="subscription-pill">
    <div><strong>${escapeHtml(subscription.planLabel)}</strong> ${badge(subscription.status, statusLabel)}</div>
    <div class="meta">${escapeHtml(pickUiText(language, "Used", "\u5DF2\u7528"))} ${escapeHtml(used)} \xB7 ${escapeHtml(pickUiText(language, "Remaining", "\u5269\u4F59"))} ${escapeHtml(remaining)}</div>
    <div class="meta">${escapeHtml(pickUiText(language, "Limit", "\u603B\u989D"))}\uFF1A${escapeHtml(limit)} \xB7 ${escapeHtml(pickUiText(language, "Usage", "\u4F7F\u7528\u7387"))}\uFF1A${escapeHtml(usagePercent)}</div>
    <div class="meta">${escapeHtml(pickUiText(language, "Cycle", "\u5468\u671F"))}\uFF1A${escapeHtml(cycleStart)} \u2192 ${escapeHtml(cycleEnd)}</div>
  </div>`;
  }

  return {
    renderCollaborationThreadCards,
    renderOfficeCards,
    renderOfficeFloor,
    renderStaffOverviewCards,
    renderSubscriptionStatusCard,
    renderTaskExecutionChainCards,
  };
}

export { createTeamPanelRenderers };
