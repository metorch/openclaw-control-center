import type { UiPreferencesCollaborationChat } from "../runtime/ui-preferences";
import type {
  CollaborationChatLabels,
  CollaborationChatParticipant,
  SerializablePreferences,
} from "./collaboration-chat-widget-types";

function normalizePreferences(input: Partial<UiPreferencesCollaborationChat>): SerializablePreferences {
  const activeRoomId = typeof input.activeRoomId === "string" && input.activeRoomId.trim() !== ""
    ? input.activeRoomId.trim()
    : "global";
  const lastReadSequence =
    typeof input.lastReadSequence === "number" && Number.isInteger(input.lastReadSequence) && input.lastReadSequence >= 0
      ? input.lastReadSequence
      : 0;
  const roomReadCursors = input.roomReadCursors && typeof input.roomReadCursors === "object"
    ? Object.fromEntries(
        Object.entries(input.roomReadCursors).filter((entry): entry is [string, number] => {
          return typeof entry[0] === "string" && typeof entry[1] === "number" && entry[1] >= 0;
        }),
      )
    : {};
  if (!(activeRoomId in roomReadCursors)) {
    roomReadCursors[activeRoomId] = lastReadSequence;
  }
  return {
    expanded: input.expanded === true,
    autoRefresh: input.autoRefresh !== false,
    activeRoomId,
    lastReadSequence,
    roomReadCursors,
  };
}

function renderParticipantChip(participant: CollaborationChatParticipant): string {
  return `<button class="collab-chat-person${participant.primary ? " is-primary" : ""}" type="button" data-person-agent="${escapeHtml(participant.agentId)}" aria-label="${escapeHtml(participant.displayName)}">
    ${renderParticipantAvatar(participant)}
    <span class="collab-chat-person-label">${escapeHtml(participant.displayName)}</span>
  </button>`;
}

function renderParticipantAvatar(participant: CollaborationChatParticipant): string {
  const accent = participant.identity.accent?.trim() || "#0f766e";
  const imageHref = participant.identity.imageHref?.trim() || "";
  const tone = normalizeParticipantStatusTone(participant.statusTone);
  const dotLabel = participant.statusDotLabel?.trim() || "";
  return `<span class="collab-chat-avatar-wrap">
    <span class="collab-chat-avatar${imageHref ? " has-photo" : ""}" style="--avatar-accent:${escapeHtml(accent)}">
      ${imageHref
        ? `<img class="collab-chat-avatar-image" src="${escapeHtml(imageHref)}" alt="${escapeHtml(participant.displayName)}" />`
        : `<span>${escapeHtml(participant.displayName.slice(0, 1).toUpperCase())}</span>`}
    </span>
    <span class="collab-chat-avatar-state ${escapeHtml(tone)}" title="${escapeHtml(dotLabel)}" aria-hidden="true"></span>
  </span>`;
}

function normalizeParticipantStatusTone(value: unknown): "idle" | "working" | "issue" {
  if (value === "working" || value === "issue") return value;
  return "idle";
}

function defaultStatusDotLabel(
  tone: CollaborationChatParticipant["statusTone"] | undefined,
  labels: Pick<CollaborationChatLabels, "idleState" | "workingState" | "issueDetected">,
): string {
  if (tone === "working") return labels.workingState;
  if (tone === "issue") return labels.issueDetected;
  return labels.idleState;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export {
  defaultStatusDotLabel,
  escapeHtml,
  normalizeParticipantStatusTone,
  normalizePreferences,
  renderParticipantChip,
};
