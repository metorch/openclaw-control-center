import {
  defaultStatusDotLabel,
  escapeHtml,
  normalizeParticipantStatusTone,
  normalizePreferences,
  renderParticipantChip,
} from "./collaboration-chat-widget-helpers";
import { buildLabels } from "./collaboration-chat-widget-labels";
import { renderCollaborationChatScriptActions } from "./collaboration-chat-widget-script-actions";
import { renderCollaborationChatScriptBoot } from "./collaboration-chat-widget-script-boot";
import { renderCollaborationChatScriptPrelude } from "./collaboration-chat-widget-script-prelude";
import { renderCollaborationChatScriptRendering } from "./collaboration-chat-widget-script-rendering";
import { renderCollaborationChatStyles as renderCollaborationChatStylesMarkup } from "./collaboration-chat-widget-styles";
import type {
  CollaborationChatLabels,
  CollaborationChatOverlayInput,
  CollaborationChatParticipant,
  CollaborationChatScriptRenderInput,
  SerializablePreferences,
} from "./collaboration-chat-widget-types";

export function renderCollaborationChatOverlay(input: CollaborationChatOverlayInput): string {
  const labels: CollaborationChatLabels = {
    ...buildLabels(input.language, input.primaryDisplayName),
    idleState: input.language === "zh" ? "空闲" : "Idle",
    workingState: input.language === "zh" ? "工作中" : "Working",
    issueDetected: input.language === "zh" ? "出现故障" : "Issue detected",
    latestUpdate: input.language === "zh" ? "最近动态" : "Latest update",
  };
  const preferences = normalizePreferences(input.preferences);
  const participants = input.participants.map((participant) => ({
    agentId: participant.agentId,
    displayName: participant.displayName,
    aliases: participant.aliases,
    mention: participant.mention?.trim() || "",
    primary: participant.primary,
    statusTone: normalizeParticipantStatusTone(participant.statusTone),
    statusDotLabel: participant.statusDotLabel?.trim() || defaultStatusDotLabel(participant.statusTone, labels),
    currentWorkLabel: participant.currentWorkLabel?.trim() || "",
    currentWork: participant.currentWork?.trim() || "",
    recentOutput: participant.recentOutput?.trim() || "",
    executionState: participant.executionState?.trim() || "",
    executionStateLabel: participant.executionStateLabel?.trim() || "",
    currentProjectTitle: participant.currentProjectTitle?.trim() || "",
    currentStage: participant.currentStage?.trim() || "",
    currentTaskId: participant.currentTaskId?.trim() || "",
    currentTaskTitle: participant.currentTaskTitle?.trim() || "",
    lastHeartbeatAt: participant.lastHeartbeatAt?.trim() || "",
    identity: {
      accent: participant.identity.accent ?? "",
      imageHref: participant.identity.imageHref ?? "",
    },
  }));

  const participantRail = participants.length > 0
    ? participants.map((participant) => renderParticipantChip(participant)).join("")
    : `<span class="collab-chat-empty-line">${escapeHtml(labels.noRooms)}</span>`;

  return `
<style>
${renderCollaborationChatStyles()}
</style>
<section
  class="collab-chat-shell"
  data-collab-chat
  data-language="${escapeHtml(input.language)}"
  data-expanded="${preferences.expanded ? "1" : "0"}"
  data-auto-refresh="${preferences.autoRefresh ? "1" : "0"}"
  data-room-id="${escapeHtml(preferences.activeRoomId)}"
  data-last-read-sequence="${escapeHtml(String(preferences.lastReadSequence))}"
  data-write-enabled="${input.writeAccessEnabled ? "1" : "0"}"
  data-write-available="${input.writeAccessAvailable ? "1" : "0"}"
>
  <button
    class="collab-chat-launcher${preferences.expanded ? " is-open" : ""}"
    type="button"
    data-collab-chat-toggle
    aria-expanded="${preferences.expanded ? "true" : "false"}"
    aria-controls="collab-chat-panel"
  >
    <span class="collab-chat-launcher-copy">
      <strong>${escapeHtml(labels.title)}</strong>
      <small data-collab-chat-launcher-status>${escapeHtml(labels.subtitle)}</small>
    </span>
    <span class="collab-chat-launcher-unread" data-collab-chat-unread hidden>0</span>
  </button>
  <aside class="collab-chat-panel${preferences.expanded ? " is-open" : ""}" id="collab-chat-panel" data-collab-chat-panel>
    <div class="collab-chat-resize-handle" data-collab-chat-resize title="${escapeHtml(
      input.language === "zh" ? "拖拽调整窗口大小" : "Drag to resize the panel",
    )}" aria-hidden="true"></div>
    <div class="collab-chat-layout">
      <section class="collab-chat-sidebar" aria-label="${escapeHtml(labels.participantsHeading)}">
        <div class="collab-chat-roster" data-collab-chat-roster>
          ${participantRail}
        </div>
      </section>
      <div class="collab-chat-main">
        <header class="collab-chat-header">
          <div class="collab-chat-header-copy">
            <div class="collab-chat-kicker">${escapeHtml(labels.conversation)}</div>
            <h2 data-collab-chat-room-title>${escapeHtml(labels.title)}</h2>
            <p data-collab-chat-room-meta>${escapeHtml(labels.subtitle)}</p>
          </div>
          <div class="collab-chat-header-actions">
            <button class="collab-chat-ghost" type="button" data-collab-room-create>${escapeHtml(labels.newChat)}</button>
            <button class="collab-chat-ghost" type="button" data-collab-chat-refresh>${escapeHtml(labels.refresh)}</button>
            <button class="collab-chat-toggle" type="button" data-collab-chat-auto aria-pressed="${preferences.autoRefresh ? "true" : "false"}">${escapeHtml(preferences.autoRefresh ? labels.autoOn : labels.autoOff)}</button>
          </div>
        </header>
        <div class="collab-chat-room-outcomes" aria-label="${escapeHtml(labels.stateLabel)}">
          <button
            class="collab-chat-ghost collab-chat-room-outcome"
            type="button"
            data-collab-room-adjudicate
            data-collab-room-adjudicate-outcome="done"
          >${escapeHtml(labels.markDone)}</button>
          <button
            class="collab-chat-ghost collab-chat-room-outcome"
            type="button"
            data-collab-room-adjudicate
            data-collab-room-adjudicate-outcome="follow_up"
          >${escapeHtml(labels.markFollowUp)}</button>
          <button
            class="collab-chat-ghost collab-chat-room-outcome"
            type="button"
            data-collab-room-adjudicate
            data-collab-room-adjudicate-outcome="error"
          >${escapeHtml(labels.markError)}</button>
        </div>
        <div class="collab-chat-toolbar">
          <div class="collab-chat-toolbar-group">
            <span class="collab-chat-status-dot" data-collab-chat-presence></span>
            <span class="collab-chat-toolbar-copy" data-collab-chat-route>${escapeHtml(labels.routeDefault)}</span>
          </div>
          <div class="collab-chat-toolbar-group">
            <span class="collab-chat-badge" data-collab-chat-panel-unread hidden>0</span>
            <span class="collab-chat-toolbar-copy" data-collab-chat-write-state>${escapeHtml(
              input.writeAccessEnabled ? labels.writeReady : input.writeAccessAvailable ? labels.writeLocked : labels.writeUnavailable,
            )}</span>
          </div>
        </div>
        <section class="collab-chat-project-strip" data-collab-chat-project>
          <div class="collab-chat-project-main">
            <span class="collab-chat-project-kicker">${escapeHtml(labels.projectLabel)}</span>
            <strong data-collab-chat-project-title>${escapeHtml(labels.title)}</strong>
          </div>
          <div class="collab-chat-project-meta">
            <span data-collab-chat-project-summary>${escapeHtml(labels.loading)}</span>
            <span data-collab-chat-project-open-tasks>${escapeHtml(labels.openTasksLabel)} 0</span>
          </div>
        </section>
        <section class="collab-chat-section">
          <div class="collab-chat-section-head">
            <span>${escapeHtml(labels.roomsHeading)}</span>
          </div>
          <div class="collab-chat-room-select">
            <button class="collab-chat-room-trigger" type="button" data-collab-room-trigger aria-expanded="false">
              <span class="collab-chat-room-trigger-copy">
                <strong data-collab-room-trigger-title>${escapeHtml(labels.title)}</strong>
                <span data-collab-room-trigger-meta>${escapeHtml(labels.subtitle)}</span>
              </span>
              <span class="collab-chat-room-trigger-caret" aria-hidden="true"></span>
            </button>
            <div class="collab-chat-room-dropdown" data-collab-room-list hidden></div>
          </div>
        </section>
        <section class="collab-chat-feed" data-collab-chat-feed>
          <div class="collab-chat-empty" data-collab-chat-empty>${escapeHtml(labels.loading)}</div>
          <ol class="collab-chat-events" data-collab-chat-events hidden></ol>
        </section>
        <footer class="collab-chat-composer" data-collab-chat-composer>
          <div class="collab-chat-drop-hint" data-collab-chat-drop-hint hidden>${escapeHtml(
            input.language === "zh" ? "拖拽文件到这里，或直接粘贴图片 / 截图" : "Drop files here, or paste images / screenshots",
          )}</div>
          <div class="collab-chat-upload-list" data-collab-chat-upload-list></div>
          <label class="collab-chat-attach">
            <input type="file" data-collab-chat-files multiple />
            <span>${escapeHtml(labels.attach)}</span>
          </label>
          <div class="collab-chat-input-wrap">
            <div class="collab-chat-input-shell" data-collab-chat-input-shell>
              <textarea
                data-collab-chat-input
                rows="4"
                placeholder="${escapeHtml(labels.typingHint)}"
              ></textarea>
              <div class="collab-chat-input-actions">
                <button class="collab-chat-danger collab-chat-stop" type="button" data-collab-chat-terminate>${escapeHtml(labels.terminate)}</button>
                <button class="collab-chat-send" type="button" data-collab-chat-send>${escapeHtml(labels.send)}</button>
              </div>
            </div>
            <div class="collab-chat-mentions" data-collab-mentions hidden></div>
          </div>
          <div class="collab-chat-composer-actions">
            <div class="collab-chat-status" data-collab-chat-status role="status" aria-live="polite">${escapeHtml(labels.justNow)}</div>
          </div>
        </footer>
      </div>
    </div>
    <div class="collab-chat-person-card" data-collab-chat-person-card hidden></div>
    <div class="collab-chat-dialog-backdrop" data-collab-chat-delete-dialog hidden>
      <div
        class="collab-chat-dialog"
        data-collab-chat-delete-surface
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="collab-chat-delete-title"
        aria-describedby="collab-chat-delete-message"
      >
        <div class="collab-chat-dialog-copy">
          <strong id="collab-chat-delete-title" data-collab-chat-delete-title>${escapeHtml(
            input.language === "zh" ? "确认删除对话" : "Delete chat",
          )}</strong>
          <p id="collab-chat-delete-message" data-collab-chat-delete-message>${escapeHtml(labels.deleteConfirm)}</p>
        </div>
        <div class="collab-chat-dialog-actions">
          <button class="collab-chat-ghost" type="button" data-collab-chat-delete-cancel>${escapeHtml(
            input.language === "zh" ? "取消" : "Cancel",
          )}</button>
          <button class="collab-chat-danger" type="button" data-collab-chat-delete-confirm>${escapeHtml(
            input.language === "zh" ? "是，删除" : "Yes, delete",
          )}</button>
        </div>
      </div>
    </div>
  </aside>
</section>
${renderCollaborationChatScript({
  language: input.language,
  labels,
  preferences,
  participants,
  primaryAgentId: input.primaryAgentId,
  primaryDisplayName: input.primaryDisplayName,
})}`;
}
function renderCollaborationChatStyles(): string { return renderCollaborationChatStylesMarkup(); }

function renderCollaborationChatScript(input: CollaborationChatScriptRenderInput): string {
  return [
    renderCollaborationChatScriptPrelude(input),
    renderCollaborationChatScriptRendering(input),
    renderCollaborationChatScriptActions(input),
    renderCollaborationChatScriptBoot(input),
  ].join("");
}

