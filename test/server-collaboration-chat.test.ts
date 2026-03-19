import assert from "node:assert/strict";
import test from "node:test";
import { createCollaborationChatHelpers } from "../src/ui/server-collaboration-chat";

function buildHelper() {
  return createCollaborationChatHelpers({
    buildCollaborationAttachmentSummary: () => "",
    buildSessionDetailHref: () => "",
    createRequestValidationError: (message: string, statusCode = 400) => {
      const error = new Error(message) as Error & { statusCode: number };
      error.statusCode = statusCode;
      return error;
    },
    describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
    formatBytesCompact: () => "",
    formatCollaborationDuration: () => "",
    getOpenClawHomeDir: () => "C:/Users/demo/.openclaw",
    getOpenClawWorkspaceRoot: () => "C:/Users/demo/.openclaw/workspace",
    isUiLanguage: () => true,
    normalizeCollaborationAttachmentIds: () => [],
    normalizeCollaborationRoomIdPayload: async (value: string) => value,
    normalizeLookupKey: (value: string) => String(value || "").trim().toLowerCase(),
    optionalBoundedString: (value: string) => value,
    pickUiText: (_language: string, english: string) => english,
    resolveCollaborationParticipantName: (_directory: unknown, agentId: string) => agentId,
    safeTruncate: (value: string, maxLength: number) => String(value || "").slice(0, maxLength),
    toCollaborationApiAttachment: () => ({}),
  });
}

test("reply output strips stage_result markup and keeps artifact paths for attachment hydration", () => {
  const helper = buildHelper();
  const artifactPath = "C:\\Users\\demo\\.openclaw\\workspace\\projects\\demo\\artifacts\\weather.html";
  const replyText = [
    "Weather report is ready.",
    "",
    `Saved to: \`${artifactPath}\``,
    "",
    "<stage_result>",
    JSON.stringify({
      taskId: "task-weather",
      projectId: "proj-weather",
      agentId: "main",
      resultState: "awaiting_review",
      summary: "Weather report generated.",
      artifacts: [{ label: "HTML", location: artifactPath }],
      completionChecklist: ["Provide a concrete user-facing update."],
      blockers: [],
      nextSuggestion: "",
      reportedAt: "2026-03-18T10:00:00.000Z",
    }),
    "</stage_result>",
  ].join("\n");

  const output = helper.describeCollaborationAgentTurnOutput(
    {
      replyText,
      rawText: replyText,
      rawJson: {},
    },
    {
      taskId: "task-weather",
      projectId: "proj-weather",
      agentId: "main",
      reportedAt: "2026-03-18T10:00:00.000Z",
    },
  );

  assert.equal(output.replyText, "Weather report is ready.");
  assert.deepEqual(output.rawPaths, [artifactPath]);
  assert.deepEqual(output.parsedStageResult.envelope?.artifacts, [{ label: "HTML", location: artifactPath }]);
});
