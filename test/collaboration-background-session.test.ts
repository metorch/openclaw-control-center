import assert from "node:assert/strict";
import test from "node:test";
import { createCollaborationChatHelpers } from "../src/ui/server-collaboration-chat";

function createHelpersForSmoke() {
  return createCollaborationChatHelpers({
    buildCollaborationAttachmentSummary: () => "",
    buildSessionDetailHref: () => "",
    createRequestValidationError: (message: string) => new Error(message),
    describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
    formatBytesCompact: () => "",
    formatCollaborationDuration: () => "",
    getOpenClawHomeDir: () => "",
    getOpenClawWorkspaceRoot: () => "",
    isUiLanguage: () => true,
    normalizeCollaborationAttachmentIds: () => [],
    normalizeCollaborationRoomIdPayload: async (roomId: string) => roomId,
    normalizeLookupKey: (value: string) => String(value ?? "").trim().toLowerCase(),
    optionalBoundedString: (value: unknown) => (typeof value === "string" ? value : undefined),
    pickUiText: (_language: string, english: string) => english,
    resolveCollaborationParticipantName: (_directory: unknown, agentId: string) => agentId,
    safeTruncate: (value: string) => String(value ?? ""),
    toCollaborationApiAttachment: () => ({}),
  });
}

test("collaboration dispatches use a deterministic background session key per room and agent", () => {
  const helpers = createHelpersForSmoke();

  assert.equal(
    helpers.buildCollaborationBackgroundSessionKey(
      "ddfbd24c-4507-444d-a20b-22d3bcc15996",
      "Main",
    ),
    "agent:main:thread:collab-ddfbd24c-4507-444d-a20b-22d3bcc15996",
  );
});

test("legacy visible main-session bindings are ignored for collaboration dispatches", () => {
  const helpers = createHelpersForSmoke();

  assert.deepEqual(
    helpers.resolveCollaborationAgentSessionBinding(
      "ddfbd24c-4507-444d-a20b-22d3bcc15996",
      "main",
      {
        agentId: "main",
        sessionId: "session-visible",
        sessionKey: "agent:main:main",
      },
    ),
    {
      sessionKey: "agent:main:thread:collab-ddfbd24c-4507-444d-a20b-22d3bcc15996",
    },
  );
});

test("matching collaboration background bindings keep their existing session id", () => {
  const helpers = createHelpersForSmoke();

  assert.deepEqual(
    helpers.resolveCollaborationAgentSessionBinding(
      "ddfbd24c-4507-444d-a20b-22d3bcc15996",
      "jarvis",
      {
        agentId: "jarvis",
        sessionId: "session-collab",
        sessionKey: "agent:jarvis:thread:collab-ddfbd24c-4507-444d-a20b-22d3bcc15996",
      },
    ),
    {
      sessionId: "session-collab",
      sessionKey: "agent:jarvis:thread:collab-ddfbd24c-4507-444d-a20b-22d3bcc15996",
    },
  );
});

test("collaboration failures are summarized without leaking raw command scaffolding", () => {
  const helpers = createHelpersForSmoke();

  const summary = helpers.summarizeCollaborationFailure({
    language: "en",
    failureReason:
      "Command failed: openclaw agent --session-key agent:jarvis:thread:collab-room-alpha\nerror: unknown option '--session-key' (Did you mean --session-id?)",
    rawText: "",
  });

  assert.match(summary, /does not support --session-key/i);
  assert.equal(summary.includes("Command failed:"), false);
});

test("collaboration failures collapse upstream provider internal errors into retryable copy", () => {
  const helpers = createHelpersForSmoke();

  const summary = helpers.summarizeCollaborationFailure({
    language: "en",
    failureReason:
      "An error occurred while processing your request. You can retry your request, or contact us through our help center at help.openai.com if the error persists. Please include the request ID 64091f30-4f91-4cc9-a080-9651dc23d0f7 in your message.",
    rawText: "",
  });

  assert.match(summary, /upstream model service hit an internal error/i);
  assert.equal(summary.includes("request ID"), false);
});

test("interrupted agent turns are detected from aborted stop reasons", () => {
  const helpers = createHelpersForSmoke();

  assert.equal(
    helpers.isInterruptedCollaborationAgentTurn({
      ok: true,
      stopReason: "aborted",
      errorMessage: "Request was aborted",
    }),
    true,
  );
});

test("resume prompt asks the agent to continue instead of restarting", () => {
  const helpers = createHelpersForSmoke();

  const prompt = helpers.buildInterruptedCollaborationResumePrompt({
    language: "en",
    directory: {
      entries: [],
    },
    targetAgentId: "jarvis",
  });

  assert.match(prompt, /continue the same session/i);
  assert.match(prompt, /without restarting the task/i);
});
