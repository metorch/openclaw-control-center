// @ts-nocheck

const ROOM_SCOPED_COLLABORATION_SESSION_KEY_PATTERN = /(?:^|:)thread:collab-([^:\s]+)(?::|$)/i;

function extractCollaborationRoomIdFromSessionKey(sessionKey) {
  if (typeof sessionKey !== "string") {
    return undefined;
  }
  const normalized = sessionKey.trim();
  if (!normalized) {
    return undefined;
  }
  const matchedRoomId = normalized.match(ROOM_SCOPED_COLLABORATION_SESSION_KEY_PATTERN)?.[1]?.trim();
  return matchedRoomId || undefined;
}

function buildSessionLinkTarget(input) {
  const href = input.buildSessionDetailHref(input.sessionKey, input.language);
  const linkedRoomId = extractCollaborationRoomIdFromSessionKey(input.sessionKey);
  return {
    href,
    linkedRoomId,
    source: linkedRoomId ? String(input.source || "dashboard").trim() || "dashboard" : undefined,
  };
}

function buildSessionLinkAttrs(input) {
  const target = buildSessionLinkTarget(input);
  let attrs = `href="${input.escapeHtml(target.href)}"`;
  if (target.linkedRoomId) {
    attrs += ` data-collaboration-room-open="${input.escapeHtml(target.linkedRoomId)}"`;
    attrs += ` data-collaboration-room-source="${input.escapeHtml(target.source)}"`;
  }
  return attrs;
}

export {
  buildSessionLinkAttrs,
  buildSessionLinkTarget,
  extractCollaborationRoomIdFromSessionKey,
};
