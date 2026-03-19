import type { UiLanguage, UiPreferencesCollaborationChat } from "../runtime/ui-preferences";

interface CollaborationChatParticipantIdentity {
  accent?: string;
  imageHref?: string;
}

interface CollaborationChatParticipant {
  agentId: string;
  displayName: string;
  aliases: string[];
  mention?: string;
  primary: boolean;
  identity: CollaborationChatParticipantIdentity;
  statusTone: "idle" | "working" | "issue";
  statusDotLabel: string;
  currentWorkLabel?: string;
  currentWork?: string;
  recentOutput?: string;
  executionState?: string;
  executionStateLabel?: string;
  currentProjectTitle?: string;
  currentStage?: string;
  currentTaskId?: string;
  currentTaskTitle?: string;
  lastHeartbeatAt?: string;
}

interface CollaborationChatOverlayInput {
  language: UiLanguage;
  preferences: Partial<UiPreferencesCollaborationChat>;
  primaryAgentId: string;
  primaryDisplayName: string;
  participants: CollaborationChatParticipant[];
  writeAccessEnabled: boolean;
  writeAccessAvailable: boolean;
}

interface CollaborationChatLabels {
  title: string;
  subtitle: string;
  open: string;
  close: string;
  refresh: string;
  autoOn: string;
  autoOff: string;
  creating: string;
  deleting: string;
  newChat: string;
  deleteChat: string;
  send: string;
  attach: string;
  upload: string;
  mentions: string;
  route: string;
  unread: string;
  typingHint: string;
  routeDefault: string;
  routePrefix: string;
  roomLocked: string;
  roomUnavailable: string;
  noEvents: string;
  noRooms: string;
  save: string;
  openFile: string;
  download: string;
  preview: string;
  queued: string;
  dispatching: string;
  idle: string;
  failed: string;
  retrying: string;
  createPrompt: string;
  projectPrompt: string;
  projectRequired: string;
  deleteConfirm: string;
  sending: string;
  loading: string;
  refreshed: string;
  writeUnavailable: string;
  writeLocked: string;
  writeReady: string;
  pickedFiles: string;
  remove: string;
  roomsHeading: string;
  participantsHeading: string;
  currentRoom: string;
  conversation: string;
  justNow: string;
  projectLabel: string;
  projectSummaryLabel: string;
  openTasksLabel: string;
  stateLabel: string;
  stageLabel: string;
  taskLabel: string;
  heartbeatLabel: string;
  idleState: string;
  workingState: string;
  issueDetected: string;
  latestUpdate: string;
}

type BaseCollaborationChatLabels = Omit<
  CollaborationChatLabels,
  "idleState" | "workingState" | "issueDetected" | "latestUpdate"
>;

interface SerializablePreferences {
  expanded: boolean;
  autoRefresh: boolean;
  activeRoomId: string;
  lastReadSequence: number;
  roomReadCursors: Record<string, number>;
}

interface CollaborationChatScriptRenderInput {
  language: UiLanguage;
  labels: CollaborationChatLabels;
  preferences: SerializablePreferences;
  participants: CollaborationChatParticipant[];
  primaryAgentId: string;
  primaryDisplayName: string;
}

export type {
  BaseCollaborationChatLabels,
  CollaborationChatLabels,
  CollaborationChatOverlayInput,
  CollaborationChatParticipant,
  CollaborationChatParticipantIdentity,
  CollaborationChatScriptRenderInput,
  SerializablePreferences,
};
