import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createCollaborationChatHelpers } from "../src/ui/server-collaboration-chat";

const execFileAsync = promisify(execFile);
const tsxLoaderHref = pathToFileURL(join(process.cwd(), "node_modules", "tsx", "dist", "loader.mjs")).href;
const collaborationChatModuleHref = pathToFileURL(
  join(process.cwd(), "src", "ui", "server-collaboration-chat.ts"),
).href;
const openclawChatRoomsModuleHref = pathToFileURL(
  join(process.cwd(), "src", "runtime", "openclaw-chat-rooms.ts"),
).href;
const collaborationRoomModuleHref = pathToFileURL(
  join(process.cwd(), "src", "runtime", "collaboration-room.ts"),
).href;
const projectStoreModuleHref = pathToFileURL(
  join(process.cwd(), "src", "runtime", "project-store.ts"),
).href;
const taskStoreModuleHref = pathToFileURL(join(process.cwd(), "src", "runtime", "task-store.ts")).href;
const projectMemoryModuleHref = pathToFileURL(
  join(process.cwd(), "src", "runtime", "collaboration-project-memory.ts"),
).href;

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
    sanitizeCollaborationDisplayText: (value: string) =>
      String(value || "")
        .replace(/<openclaw_coordination>[\s\S]*?<\/openclaw_coordination>/gi, " ")
        .replace(/^\[\[reply_to_current\]\]\s*/i, "")
        .replace(/<stage_result[\s\S]*?<\/stage_result>/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    safeTruncate: (value: string, maxLength: number) => String(value || "").slice(0, maxLength),
    toCollaborationApiAttachment: () => ({}),
  });
}

async function runCollaborationChatModuleForTest(tempRoot: string, source: string): Promise<string> {
  const result = await execFileAsync(
    "node",
    ["--input-type=module", "--import", tsxLoaderHref, "-e", source],
    {
      cwd: tempRoot,
      env: process.env,
    },
  );
  return result.stdout.trim();
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

test("artifact replies can auto-promote an in-progress stage result into a reviewable completion", () => {
  const helper = buildHelper();

  assert.equal(
    helper.shouldAutoPromoteCollaborationStageResult({
      envelope: {
        resultState: "in_progress",
        blockers: [],
        artifacts: [{ location: "C:\\Users\\demo\\artifact.html" }],
      },
      replyAttachments: [{ attachmentId: "artifact-1" }],
    }),
    true,
  );

  assert.equal(
    helper.shouldAutoPromoteCollaborationStageResult({
      envelope: {
        resultState: "in_progress",
        blockers: [],
        artifacts: [],
      },
      replyAttachments: [],
    }),
    false,
  );

  assert.equal(
    helper.shouldAutoPromoteCollaborationStageResult({
      envelope: {
        resultState: "in_progress",
        blockers: [],
        artifacts: [],
      },
      dispatchRecord: {
        goal: "Verify the existing HTML artifact and reply with pass/fail only. Do not modify the file.",
      },
      directory: {
        entries: [
          { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"] },
          { agentId: "qa", displayName: "QA", aliases: ["qa"] },
        ],
      },
      targetAgentId: "qa",
      replyText: "QA: Reviewable.",
      replyAttachments: [],
    }),
    true,
  );
});

test("Jarvis user-confirmation detection stays scoped to primary direct checkpoints", () => {
  const helper = buildHelper();
  const directory = {
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    entries: [
      { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"] },
      { agentId: "qa", displayName: "QA", aliases: ["qa"] },
    ],
  };

  assert.equal(
    helper.isJarvisWaitingForUserConfirmation({
      replyText: "I drafted two rollout options. Please choose one and I will continue.",
      directory,
      targetAgentId: "jarvis",
      currentRouteAgentIds: ["jarvis"],
      language: "en",
    }),
    true,
  );
  assert.equal(
    helper.isJarvisWaitingForUserConfirmation({
      replyText: "Option A is faster. Option B is safer. I'll wait for your confirmation before I continue.",
      envelope: { resultState: "in_progress" },
      directory,
      targetAgentId: "jarvis",
      currentRouteAgentIds: ["jarvis"],
      language: "en",
    }),
    true,
  );
  assert.equal(
    helper.isJarvisWaitingForUserConfirmation({
      replyText: "I drafted both options. I'll wait for your confirmation before I continue.",
      envelope: { resultState: "in_progress" },
      directory,
      targetAgentId: "jarvis",
      currentRouteAgentIds: ["jarvis", "qa"],
      language: "en",
    }),
    true,
  );
  assert.equal(
    helper.isJarvisWaitingForUserConfirmation({
      replyText:
        "Here are two options. Reply with 1, 2, or blend both, and I'll continue from there.",
      envelope: {
        resultState: "awaiting_review",
        summary: "Proposed two options and waiting for user confirmation.",
        nextSuggestion: "Reply with 1, 2, or blend both so I can continue.",
      },
      directory,
      targetAgentId: "jarvis",
      currentRouteAgentIds: ["jarvis"],
      language: "en",
    }),
    true,
  );
  assert.equal(
    helper.isJarvisWaitingForUserConfirmation({
      replyText: "I will coordinate this with @qa. @qa please verify the draft.",
      directory,
      targetAgentId: "jarvis",
      currentRouteAgentIds: ["jarvis"],
      language: "en",
    }),
    false,
  );
  assert.equal(
    helper.isJarvisWaitingForUserConfirmation({
      replyText: "Please choose one and I will continue.",
      directory,
      targetAgentId: "qa",
      currentRouteAgentIds: ["qa"],
      language: "en",
    }),
    false,
  );
});

test("artifact replies without stage_result can synthesize a reviewable completion when they stay local to the task", () => {
  const helper = buildHelper();

  const envelope = helper.buildSyntheticCollaborationArtifactStageResult({
    envelope: undefined,
    dispatchRecord: {
      taskId: "task-hello",
      goal: "Build hello.html inside the current collaboration project.",
      expectedArtifacts: ["Provide a file path or attach the generated artifact when applicable."],
      definitionOfDone: [
        "Provide a concrete user-facing update.",
        "Emit a <stage_result> envelope when the phase reaches a reviewable checkpoint.",
      ],
    },
    replyAttachments: [
      {
        attachmentId: "artifact-1",
        sourceLocalPath: "C:\\Users\\demo\\.openclaw\\workspace\\projects\\demo\\artifacts\\hello.html",
      },
    ],
    replyText: "Ready — I saved the HTML page in the current collaboration project.",
    project: {
      projectId: "proj-hello",
    },
    targetAgentId: "main",
    directory: {
      entries: [
        { agentId: "main", displayName: "Jarvis", aliases: ["jarvis", "main"] },
        { agentId: "qa", displayName: "QA", aliases: ["qa"] },
      ],
    },
    language: "en",
    reportedAt: "2026-03-22T09:30:00.000Z",
  });

  assert.equal(envelope?.resultState, "awaiting_review");
  assert.equal(envelope?.projectId, "proj-hello");
  assert.deepEqual(envelope?.artifacts, [
    { location: "C:\\Users\\demo\\.openclaw\\workspace\\projects\\demo\\artifacts\\hello.html" },
  ]);
});

test("artifact replies without stage_result do not auto-complete when they delegate follow-up mentions", () => {
  const helper = buildHelper();

  const envelope = helper.buildSyntheticCollaborationArtifactStageResult({
    envelope: undefined,
    dispatchRecord: {
      taskId: "task-hello-fanout",
      goal: "Build hello.html and then ask QA to verify it.",
      expectedArtifacts: ["Provide a file path or attach the generated artifact when applicable."],
      definitionOfDone: [
        "Provide a concrete user-facing update.",
        "Emit a <stage_result> envelope when the phase reaches a reviewable checkpoint.",
      ],
    },
    replyAttachments: [
      {
        attachmentId: "artifact-1",
        sourceLocalPath: "C:\\Users\\demo\\.openclaw\\workspace\\projects\\demo\\artifacts\\hello.html",
      },
    ],
    replyText: "Built hello.html in the current collaboration project. @qa verify the existing artifact and reply with pass/fail only.",
    project: {
      projectId: "proj-hello",
    },
    targetAgentId: "jarvis",
    directory: {
      entries: [
        { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis", "main"] },
        { agentId: "qa", displayName: "QA", aliases: ["qa"] },
      ],
    },
    language: "en",
    reportedAt: "2026-03-22T09:30:00.000Z",
  });

  assert.equal(envelope, undefined);
});

test("artifact reply hints recognize Chinese attachment requests", () => {
  const helper = buildHelper();

  assert.equal(
    helper.shouldHintCollaborationArtifactReply("把成都天气做成 html 文件发给我下载保存", []),
    true,
  );
  assert.equal(helper.shouldHintCollaborationArtifactReply("继续总结今天的进展，直接说结论就行", []), false);
});

test("artifact reply hints keep verification-only follow-ups read-only", () => {
  const helper = buildHelper();
  const followUpMessage = [
    "Original user request:",
    "Build a small HTML status page and save it as status.html.",
    "",
    "Jarvis coordination instruction:",
    "Verify the existing HTML artifact and reply with pass/fail only. Do not modify the file.",
  ].join("\n");

  assert.equal(
    helper.shouldHintCollaborationArtifactReply(followUpMessage, [{ attachmentId: "artifact-1" }]),
    false,
  );
  assert.equal(
    helper.shouldHintCollaborationArtifactReply(
      "Fix the attached HTML file and send the updated file back.",
      [{ attachmentId: "artifact-1" }],
    ),
    true,
  );
});

test("reply output hides reply control tokens and attribute-style stage_result payloads", () => {
  const helper = buildHelper();
  const artifactPath = "C:\\Users\\demo\\.openclaw\\workspace\\projects\\demo\\artifacts\\weather.html";
  const replyText = [
    "[[reply_to_current]] HTML 已经做好，可以直接打开。",
    "",
    '<stage_result resultState="awaiting_review">',
    "  <summary>HTML 已生成。</summary>",
    "  <artifacts>",
    `    <artifact path="${artifactPath}" />`,
    "  </artifacts>",
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
      reportedAt: "2026-03-20T08:00:00.000Z",
    },
  );

  assert.equal(output.replyText, "HTML 已经做好，可以直接打开。");
  assert.deepEqual(output.rawPaths, [artifactPath]);
  assert.equal(output.parsedStageResult.envelope?.resultState, "awaiting_review");
});

test("reply output hides stage_result payloads even when the closing tag is escaped", () => {
  const helper = buildHelper();
  const replyText = [
    "可以，我这边就是一个目标。",
    '<stage_result>{"taskId":"collab-main","projectId":"proj-collab","agentId":"main","resultState":"in_progress","summary":"Waiting on a concrete target.","artifacts":[],"completionChecklist":["等待用户确认发送目标"],"blockers":["未指定群目标"],"nextSuggestion":"请直接回复目标群。","reportedAt":"2026-03-22T02:29:43.000Z"}<\\/stage_result>',
  ].join("\n");

  const output = helper.describeCollaborationAgentTurnOutput(
    {
      replyText,
      rawText: replyText,
      rawJson: {},
    },
    {
      taskId: "collab-main",
      projectId: "proj-collab",
      agentId: "main",
      reportedAt: "2026-03-22T02:29:43.000Z",
    },
  );

  assert.equal(output.replyText, "可以，我这边就是一个目标。");
  assert.equal(output.parsedStageResult.envelope?.resultState, "in_progress");
});

test("reply output falls back to stage_result summary when the visible body is empty", () => {
  const helper = buildHelper();
  const replyText = [
    '<stage_result resultState="awaiting_review">',
    "  <summary>1</summary>",
    "</stage_result>",
  ].join("\n");

  const output = helper.describeCollaborationAgentTurnOutput(
    {
      replyText,
      rawText: replyText,
      rawJson: {},
    },
    {
      taskId: "task-main-broadcast",
      projectId: "proj-main-broadcast",
      agentId: "main",
      reportedAt: "2026-03-22T08:00:00.000Z",
    },
  );

  assert.equal(output.replyText, "1");
  assert.equal(output.parsedStageResult.envelope?.summary, "1");
});

test("reply output does not expose machine-only payloads or NO_REPLY placeholders", () => {
  const helper = buildHelper();
  const payloadOnlyRawText = JSON.stringify({
    payloads: [],
    meta: {
      agentMeta: {
        model: "gpt-5.4",
      },
      systemPromptReport: {
        sessionKey: "agent:main:main",
      },
    },
  });

  assert.equal(
    helper.extractVisibleCollaborationTurnReplyText({
      replyText: "",
      rawText: payloadOnlyRawText,
    }),
    "",
  );
  assert.equal(
    helper.extractVisibleCollaborationTurnReplyText({
      replyText: "",
      rawText: "NO_REPLY",
    }),
    "",
  );

  const output = helper.describeCollaborationAgentTurnOutput(
    {
      replyText: "",
      rawText: payloadOnlyRawText,
      rawJson: {},
    },
    {
      taskId: "task-machine-noise",
      projectId: "proj-machine-noise",
      agentId: "main",
      reportedAt: "2026-03-22T14:00:00.000Z",
    },
  );

  assert.equal(output.replyText, "");
});

test("reply output ignores echoed collaboration prompts from rawText fallbacks", () => {
  const helper = buildHelper();
  const promptEcho = [
    "User request:",
    "Please coordinate QA and Architect in this room.",
    "",
    "<openclaw_coordination>",
    "projectSummary: none",
    "recentCollaborationSummary:",
    "- none",
    "contextRefs:",
    "C:\\Users\\demo\\.openclaw\\workspace\\projects\\demo\\PROJECT.md",
    "projectRoot: C:\\Users\\demo\\.openclaw\\workspace\\projects\\demo",
    "projectArtifactsDir: C:\\Users\\demo\\.openclaw\\workspace\\projects\\demo\\artifacts",
    "sessionBinding: none",
    "</openclaw_coordination>",
  ].join("\n");

  const output = helper.describeCollaborationAgentTurnOutput(
    {
      replyText: "",
      rawText: promptEcho,
      rawJson: {},
    },
    {
      taskId: "task-prompt-echo",
      projectId: "proj-prompt-echo",
      agentId: "main",
      reportedAt: "2026-03-22T16:00:00.000Z",
    },
  );

  assert.equal(output.replyText, "");
  assert.deepEqual(output.rawPaths, []);
  assert.equal(
    helper.summarizeCollaborationFailure({
      language: "en",
      failureReason: "",
      rawText: promptEcho,
    }),
    "Unknown agent failure.",
  );
});

test("recent collaboration summary stays inside the current room and strips machine-only noise", async () => {
  const helper = buildHelper();
  const roomState = {
    version: 3,
    roomId: "room-summary",
    title: "Summary room",
    titleMode: "manual",
    projectId: "proj-summary",
    createdAt: "2026-03-21T09:00:00.000Z",
    lastSequence: 7,
    events: [
      {
        sequence: 1,
        eventId: "evt-1",
        type: "user_message",
        createdAt: "2026-03-21T09:00:00.000Z",
        authorRole: "user",
        message: "Release pipeline still fails after deploy.",
      },
      {
        sequence: 2,
        eventId: "evt-2",
        type: "dispatch_started",
        createdAt: "2026-03-21T09:00:05.000Z",
        authorRole: "system",
        agentId: "qa",
        detail: "Queued for QA.",
      },
      {
        sequence: 3,
        eventId: "evt-3",
        type: "agent_reply",
        createdAt: "2026-03-21T09:00:20.000Z",
        authorRole: "agent",
        agentId: "qa",
        message: [
          "[[reply_to_current]] Found the broken migration path.",
          "",
          'Saved to: `C:\\Users\\demo\\.openclaw\\workspace\\projects\\demo\\artifacts\\migration.txt`',
          "",
          "<stage_result>",
          '{"summary":"hidden"}',
          "</stage_result>",
        ].join("\n"),
      },
      {
        sequence: 4,
        eventId: "evt-4",
        type: "system_note",
        createdAt: "2026-03-21T09:00:30.000Z",
        authorRole: "system",
        message: "Blocked on missing migration checksum.",
        detail: "QA reported a blocker.",
      },
      {
        sequence: 5,
        eventId: "evt-5",
        type: "dispatch_fallback",
        createdAt: "2026-03-21T09:00:45.000Z",
        authorRole: "system",
        agentId: "qa",
        detail: "Primary review fell back to Jarvis.",
      },
      {
        sequence: 6,
        eventId: "evt-6",
        type: "dispatch_started",
        createdAt: "2026-03-21T09:00:50.000Z",
        authorRole: "system",
        agentId: "architect",
        detail: "Queued for Architect from Jarvis's coordination reply.",
      },
      {
        sequence: 7,
        eventId: "evt-7",
        type: "user_message",
        createdAt: "2026-03-21T09:01:00.000Z",
        authorRole: "user",
        message: "Continue from the latest room context.",
      },
    ],
    attachments: [],
    sessionBindings: [],
    dispatchRecords: [],
    taskReceipts: [],
    updatedAt: "2026-03-21T09:01:00.000Z",
  };
  const directory = {
    primaryAgentId: "jarvis",
    primaryDisplayName: "Jarvis",
    entries: [
      { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"] },
      { agentId: "qa", displayName: "QA", aliases: ["qa"] },
      { agentId: "architect", displayName: "Architect", aliases: ["architect"] },
    ],
  };

  const summaryLines = helper.buildRecentCollaborationSummaryLines({
    roomState,
    sourceEvent: roomState.events.at(-1),
    language: "en",
    directory,
    attachmentsById: new Map(),
  });
  const summaryBlock = summaryLines.join("\n");

  assert(summaryLines.length > 0);
  assert.match(summaryBlock, /Release pipeline still fails after deploy\./);
  assert.match(summaryBlock, /Found the broken migration path\./);
  assert.match(summaryBlock, /Blocked on missing migration checksum\./);
  assert.match(summaryBlock, /Primary review fell back to Jarvis\./);
  assert.match(summaryBlock, /Queued for Architect from Jarvis's coordination reply\./);
  assert.doesNotMatch(summaryBlock, /Queued for QA\./);
  assert.doesNotMatch(summaryBlock, /\[\[reply_to_current\]\]/);
  assert.doesNotMatch(summaryBlock, /stage_result/i);
  assert.doesNotMatch(summaryBlock, /sessionKey|sessionId/i);
  assert.doesNotMatch(summaryBlock, /C:\\Users\\demo/i);

  const prompt = await helper.buildCollaborationAgentPromptV2({
    roomId: roomState.roomId,
    sourceEvent: roomState.events.at(-1),
    targetAgentId: "qa",
    targetAgentIds: ["qa"],
    attachmentRecords: [],
    language: "en",
    agentWorkspaceRoot: "C:/Users/demo/.openclaw/workspace/agents/qa",
    project: {
      projectId: "proj-summary",
      title: "Summary room",
    },
    projectMemory: {
      summaryText: "Current project summary",
      files: {
        projectDir: "C:/Users/demo/.openclaw/workspace/projects/proj-summary",
        projectSummaryPath: "projects/proj-summary/PROJECT.md",
        openTasksPath: "projects/proj-summary/memory/open-tasks.json",
        decisionsPath: "projects/proj-summary/memory/decisions.md",
        stageLogPath: "projects/proj-summary/memory/stage-log.jsonl",
        artifactsDir: "C:/Users/demo/.openclaw/workspace/projects/proj-summary/artifacts",
      },
    },
    dispatchRecord: {
      taskId: "task-summary",
      stage: "delivery",
      requiredContextRefs: [],
      definitionOfDone: ["Provide a concrete user-facing update."],
      expectedArtifacts: [],
    },
    directory,
    roomStateOverride: roomState,
  });

  assert.match(prompt, /recentCollaborationSummary:/);
  assert.match(prompt, /projectSummary: Current project summary/);
  assert.match(prompt, /projectRoot: C:\/Users\/demo\/\.openclaw\/workspace\/projects\/proj-summary/);
  assert.match(prompt, /projectArtifactsDir: C:\/Users\/demo\/\.openclaw\/workspace\/projects\/proj-summary\/artifacts/);
  assert.match(prompt, /Treat C:\/Users\/demo\/\.openclaw\/workspace\/projects\/proj-summary as the current collaboration project root/);
  assert.match(prompt, /Found the broken migration path\./);
  assert.doesNotMatch(prompt, /\[\[reply_to_current\]\]/);
  assert.doesNotMatch(prompt, /C:\\Users\\demo/i);
  assert.doesNotMatch(prompt, /hidden/);
});

test("artifact path resolution stays inside the current collaboration project when project files are available", () => {
  const helper = buildHelper();
  const projectDir = "C:\\Users\\demo\\.openclaw\\workspace\\projects\\proj-scope";
  const artifactsDir = join(projectDir, "artifacts");
  const insideProjectArtifact = join(artifactsDir, "status.html");
  const outsideProjectArtifact = "C:\\Users\\demo\\.openclaw\\workspace\\mini-collab-smoke\\index.html";

  const resolved = helper.resolveCollaborationArtifactPaths({
    rawPaths: [
      insideProjectArtifact,
      outsideProjectArtifact,
      "projects\\proj-scope\\artifacts\\status.html",
      "status.html",
    ],
    workspaceRoot: "C:\\Users\\demo\\.openclaw\\workspace",
    projectFiles: {
      projectDir,
      artifactsDir,
    },
  });

  assert(resolved.includes(insideProjectArtifact));
  assert.equal(resolved.some((item: string) => item === outsideProjectArtifact), false);
  assert.equal(resolved.some((item: string) => /mini-collab-smoke/i.test(item)), false);
});

test("primary coordinator prompts still require a direct visible reply on all-hands turns", async () => {
  const helper = buildHelper();
  const roomState = {
    version: 3,
    roomId: "room-main-all-hands",
    title: "All hands room",
    titleMode: "manual",
    projectId: "proj-main-all-hands",
    createdAt: "2026-03-22T09:00:00.000Z",
    lastSequence: 1,
    events: [
      {
        sequence: 1,
        eventId: "evt-1",
        type: "user_message",
        createdAt: "2026-03-22T09:00:00.000Z",
        authorRole: "user",
        message: "Everyone in this room reply with 1.",
      },
    ],
    attachments: [],
    sessionBindings: [],
    dispatchRecords: [],
    taskReceipts: [],
    updatedAt: "2026-03-22T09:00:00.000Z",
  };
  const directory = {
    primaryAgentId: "main",
    primaryDisplayName: "Jarvis",
    entries: [
      { agentId: "main", displayName: "Jarvis", aliases: ["jarvis", "main"] },
      { agentId: "qa", displayName: "QA", aliases: ["qa"] },
    ],
  };

  const prompt = await helper.buildCollaborationAgentPromptV2({
    roomId: roomState.roomId,
    sourceEvent: roomState.events.at(-1),
    targetAgentId: "main",
    targetAgentIds: ["main", "qa"],
    attachmentRecords: [],
    language: "en",
    agentWorkspaceRoot: "C:/Users/demo/.openclaw/workspace",
    project: {
      projectId: "proj-main-all-hands",
      title: "All hands room",
    },
    projectMemory: {
      summaryText: "Broadcast room summary",
      files: {
        projectSummaryPath: "projects/proj-main-all-hands/PROJECT.md",
        openTasksPath: "projects/proj-main-all-hands/memory/open-tasks.json",
        decisionsPath: "projects/proj-main-all-hands/memory/decisions.md",
        stageLogPath: "projects/proj-main-all-hands/memory/stage-log.jsonl",
      },
    },
    dispatchRecord: {
      taskId: "task-main-all-hands",
      stage: "delivery",
      requiredContextRefs: [],
      definitionOfDone: ["Provide a concrete user-facing update."],
      expectedArtifacts: [],
    },
    directory,
    roomStateOverride: roomState,
  });

  assert.match(
    prompt,
    /Even as the primary coordinator, you are directly assigned on this user turn\./,
  );
  assert.match(
    prompt,
    /If you need the user's confirmation, decision, or option selection before continuing, use resultState="awaiting_review"/,
  );
  assert.match(prompt, /teamHandles:/);
  assert.match(prompt, /@qa => QA/);
  assert.match(
    prompt,
    /explicitly mention them in your visible reply with their room handle such as @qa or @architect/i,
  );
  assert.match(
    prompt,
    /Do not claim another employee has confirmed, completed, or replied unless that employee has already replied in this room/i,
  );
});

test("local-only canonical rooms default to the primary controller route without a transcript anchor", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-chat-local-only-"));

  try {
    const output = await runCollaborationChatModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const chatMod = unwrap(await import(${JSON.stringify(collaborationChatModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const openclawChatRooms = unwrap(await import(${JSON.stringify(openclawChatRoomsModuleHref)}));
        const { join } = await import("node:path");

        const helpers = chatMod.createCollaborationChatHelpers({
          buildCollaborationAttachmentSummary: () => "",
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message, statusCode = 400) => {
            const error = new Error(message);
            error.statusCode = statusCode;
            return error;
          },
          describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
          formatBytesCompact: () => "",
          formatCollaborationDuration: (value) => String(value || 0) + "ms",
          getOpenClawHomeDir: () => process.cwd(),
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          isUiLanguage: (value) => value === "en" || value === "zh",
          normalizeCollaborationAttachmentIds: (input) => Array.isArray(input) ? input : [],
          normalizeCollaborationRoomIdPayload: async (value) => value,
          normalizeLookupKey: (value) => String(value || "").trim().toLowerCase(),
          optionalBoundedString: (value) => typeof value === "string" ? value : undefined,
          pickUiText: (language, english, chinese) => language === "zh" ? chinese : english,
          resolveCollaborationParticipantName: (directory, agentId) =>
            directory.entries.find((entry) => String(entry.agentId || "").toLowerCase() === String(agentId || "").toLowerCase())?.displayName || agentId,
          sanitizeCollaborationDisplayText: (value) => String(value || "").trim(),
          safeTruncate: (value, maxLength) => String(value || "").slice(0, maxLength),
          toCollaborationApiAttachment: (attachment) => attachment,
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const room = await collaborationRoom.createCollaborationRoom({
          roomId: "room-local-only",
          title: "Local only dispatch room",
          titleMode: "manual",
          projectId: "proj-local-only",
        });
        const requests = [];
        const toolClient = {
          agentTurn: async ({ agentId, message, sessionKey }) => {
            requests.push({ agentId, message, sessionKey });
            return {
              ok: true,
              replyText: agentId + " handled the local-only room.",
              rawText: agentId + " handled the local-only room.",
              rawJson: {},
              durationMs: 18,
              sessionId: "session-" + agentId,
              sessionKey,
            };
          },
        };
        const directory = {
          primaryAgentId: "jarvis",
          primaryDisplayName: "Jarvis",
          entries: [
            { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"], workspaceRoot },
            { agentId: "qa", displayName: "QA", aliases: ["qa"], workspaceRoot: join(workspaceRoot, "agents", "qa") },
          ],
        };

        const created = await helpers.createCollaborationRoomMessage(
          {
            roomId: room.roomId,
            text: "Please keep this flow collaborative and let the whole room inspect it.",
          },
          toolClient,
          directory,
          "en",
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        const roomState = await collaborationRoom.loadCollaborationRoom(room.roomId);
        const transcriptRooms = await openclawChatRooms.listOpenClawChatRooms({
          agentId: "jarvis",
          workspaceRoot,
          openclawHomeDir: process.cwd(),
          createIfEmpty: false,
        });

        process.stdout.write(JSON.stringify({
          createdTargets: created.targetAgentIds,
          requestAgents: requests.map((request) => request.agentId),
          requestSessionKeys: requests.map((request) => request.sessionKey),
          roomEventTypes: roomState.events.map((event) => event.type),
          roomReplyAgents: roomState.events.filter((event) => event.type === "agent_reply").map((event) => event.agentId),
          transcriptRoomIds: transcriptRooms.map((room) => room.roomId),
        }));
      `,
    );

    const parsed = JSON.parse(output);
    assert.deepEqual(parsed.createdTargets, ["jarvis"]);
    assert.deepEqual(parsed.requestAgents, ["jarvis"]);
    assert.equal(parsed.requestSessionKeys.length, 1);
    assert(parsed.requestSessionKeys.every((value: string) => /^agent:jarvis:thread:collab-room-local-only$/.test(value)));
    assert.deepEqual(parsed.roomEventTypes, ["user_message", "dispatch_started", "agent_reply"]);
    assert.deepEqual(parsed.roomReplyAgents, ["jarvis"]);
    assert.deepEqual(parsed.transcriptRoomIds, []);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("failed turns do not backfill project memory files as generated attachments when rawText echoes the prompt", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-chat-failed-echo-"));

  try {
    const output = await runCollaborationChatModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const chatMod = unwrap(await import(${JSON.stringify(collaborationChatModuleHref)}));
        const openclawChatRooms = unwrap(await import(${JSON.stringify(openclawChatRoomsModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const { join } = await import("node:path");

        const helpers = chatMod.createCollaborationChatHelpers({
          buildCollaborationAttachmentSummary: () => "",
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message, statusCode = 400) => {
            const error = new Error(message);
            error.statusCode = statusCode;
            return error;
          },
          describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
          formatBytesCompact: () => "",
          formatCollaborationDuration: (value) => String(value || 0) + "ms",
          getOpenClawHomeDir: () => process.cwd(),
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          isUiLanguage: (value) => value === "en" || value === "zh",
          normalizeCollaborationAttachmentIds: (input) => Array.isArray(input) ? input : [],
          normalizeCollaborationRoomIdPayload: async (value) => value,
          normalizeLookupKey: (value) => String(value || "").trim().toLowerCase(),
          optionalBoundedString: (value) => typeof value === "string" ? value : undefined,
          pickUiText: (language, english, chinese) => language === "zh" ? chinese : english,
          resolveCollaborationParticipantName: (directory, agentId) =>
            directory.entries.find((entry) => String(entry.agentId || "").toLowerCase() === String(agentId || "").toLowerCase())?.displayName || agentId,
          sanitizeCollaborationDisplayText: (value) => String(value || "").trim(),
          safeTruncate: (value, maxLength) => String(value || "").slice(0, maxLength),
          toCollaborationApiAttachment: (attachment) => attachment,
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const transcriptRoom = await openclawChatRooms.createOpenClawChatRoom({
          agentId: "jarvis",
          workspaceRoot,
          openclawHomeDir: process.cwd(),
          title: "Failed echo room",
        });
        await collaborationRoom.saveCollaborationRoom(
          collaborationRoom.defaultCollaborationRoomState({
            roomId: transcriptRoom.roomId,
            title: "Failed echo room",
            titleMode: "manual",
          }),
        );

        const directory = {
          primaryAgentId: "jarvis",
          primaryDisplayName: "Jarvis",
          entries: [
            { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"], workspaceRoot },
          ],
        };

        const toolClient = {
          agentTurn: async (request) => ({
            ok: false,
            replyText: "",
            rawText: request.message,
            rawJson: {},
            durationMs: 25,
            sessionId: "session-jarvis",
            sessionKey: "agent:jarvis:main",
          }),
        };

        const created = await helpers.createCollaborationRoomMessage(
          {
            roomId: transcriptRoom.roomId,
            text: "Please coordinate QA and Architect in this room.",
          },
          toolClient,
          directory,
          "en",
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        const roomState = await collaborationRoom.loadCollaborationRoom(transcriptRoom.roomId);
        const failedEvents = roomState.events.filter((event) => event.type === "dispatch_failed");

        process.stdout.write(JSON.stringify({
          createdTargets: created.targetAgentIds,
          attachmentCount: roomState.attachments.length,
          systemNoteCount: roomState.events.filter((event) => event.type === "system_note").length,
          failedReasons: failedEvents.map((event) => event.failureReason || ""),
        }));
      `,
    );

    const parsed = JSON.parse(output) as {
      createdTargets: string[];
      attachmentCount: number;
      systemNoteCount: number;
      failedReasons: string[];
    };

    assert.deepEqual(parsed.createdTargets, ["jarvis"]);
    assert.equal(parsed.attachmentCount, 0);
    assert.equal(parsed.systemNoteCount, 0);
    assert.deepEqual(parsed.failedReasons, ["Unknown agent failure."]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("explicit multi-mentions keep main's direct reply visible alongside review notes", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-chat-main-broadcast-"));

  try {
    const output = await runCollaborationChatModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const chatMod = unwrap(await import(${JSON.stringify(collaborationChatModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const { join } = await import("node:path");

        const helpers = chatMod.createCollaborationChatHelpers({
          buildCollaborationAttachmentSummary: () => "",
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message, statusCode = 400) => {
            const error = new Error(message);
            error.statusCode = statusCode;
            return error;
          },
          describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
          formatBytesCompact: () => "",
          formatCollaborationDuration: (value) => String(value || 0) + "ms",
          getOpenClawHomeDir: () => process.cwd(),
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          isUiLanguage: (value) => value === "en" || value === "zh",
          normalizeCollaborationAttachmentIds: (input) => Array.isArray(input) ? input : [],
          normalizeCollaborationRoomIdPayload: async (value) => value,
          normalizeLookupKey: (value) => String(value || "").trim().toLowerCase(),
          optionalBoundedString: (value) => typeof value === "string" ? value : undefined,
          pickUiText: (language, english, chinese) => language === "zh" ? chinese : english,
          resolveCollaborationParticipantName: (directory, agentId) =>
            directory.entries.find((entry) => String(entry.agentId || "").toLowerCase() === String(agentId || "").toLowerCase())?.displayName || agentId,
          sanitizeCollaborationDisplayText: (value) => String(value || "").trim(),
          safeTruncate: (value, maxLength) => String(value || "").slice(0, maxLength),
          toCollaborationApiAttachment: (attachment) => attachment,
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const room = await collaborationRoom.createCollaborationRoom({
          roomId: "room-main-broadcast",
          title: "Main broadcast room",
          titleMode: "manual",
          projectId: "proj-main-broadcast",
        });
        const requests = [];
        const toolClient = {
          agentTurn: async ({ agentId, message, sessionKey }) => {
            requests.push({ agentId, message, sessionKey });
            const replyText =
              agentId === "main"
                ? [
                    '<stage_result resultState="awaiting_review">',
                    "  <summary>1</summary>",
                    "</stage_result>",
                  ].join("\\n")
                : [
                    "[[reply_to_current]] 1",
                    "",
                    '<stage_result resultState="awaiting_review">',
                    "  <summary>1</summary>",
                    "</stage_result>",
                  ].join("\\n");
            return {
              ok: true,
              replyText,
              rawText: replyText,
              rawJson: {},
              durationMs: 18,
              sessionId: "session-" + agentId,
              sessionKey: sessionKey ?? ("agent:" + agentId + ":main"),
            };
          },
        };
        const directory = {
          primaryAgentId: "main",
          primaryDisplayName: "Jarvis",
          entries: [
            { agentId: "main", displayName: "Jarvis", aliases: ["jarvis", "main"], workspaceRoot },
            { agentId: "qa", displayName: "QA", aliases: ["qa"], workspaceRoot },
          ],
        };

        const created = await helpers.createCollaborationRoomMessage(
          {
            roomId: room.roomId,
            text: "@jarvis @qa reply with 1.",
          },
          toolClient,
          directory,
          "en",
        );

        await new Promise((resolve) => setTimeout(resolve, 600));

        const roomState = await collaborationRoom.loadCollaborationRoom(room.roomId);

        process.stdout.write(JSON.stringify({
          createdTargets: created.targetAgentIds,
          requestAgents: requests.map((request) => request.agentId),
          replyMessages: roomState.events
            .filter((event) => event.type === "agent_reply")
            .map((event) => ({ agentId: event.agentId, message: event.message || "" })),
          systemNoteAgents: roomState.events
            .filter((event) => event.type === "system_note")
            .map((event) => event.agentId || ""),
        }));
      `,
    );

    const parsed = JSON.parse(output) as {
      createdTargets: string[];
      requestAgents: string[];
      replyMessages: Array<{ agentId: string; message: string }>;
      systemNoteAgents: string[];
    };

    assert.deepEqual([...parsed.createdTargets].sort(), ["main", "qa"]);
    assert.deepEqual([...parsed.requestAgents].sort(), ["main", "qa"]);
    assert.deepEqual(
      [...parsed.replyMessages].sort((left, right) => left.agentId.localeCompare(right.agentId)),
      [
        { agentId: "main", message: "1" },
        { agentId: "qa", message: "1" },
      ],
    );
    assert(parsed.systemNoteAgents.includes("main"));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("explicit mentions dispatch employees with Team OS coordination prompts and task records", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-chat-dispatch-"));

  try {
    const output = await runCollaborationChatModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const chatMod = unwrap(await import(${JSON.stringify(collaborationChatModuleHref)}));
        const openclawChatRooms = unwrap(await import(${JSON.stringify(openclawChatRoomsModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const projectStore = unwrap(await import(${JSON.stringify(projectStoreModuleHref)}));
        const taskStore = unwrap(await import(${JSON.stringify(taskStoreModuleHref)}));
        const { join } = await import("node:path");

        const helpers = chatMod.createCollaborationChatHelpers({
          buildCollaborationAttachmentSummary: () => "",
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message, statusCode = 400) => {
            const error = new Error(message);
            error.statusCode = statusCode;
            return error;
          },
          describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
          formatBytesCompact: () => "",
          formatCollaborationDuration: (value) => String(value || 0) + "ms",
          getOpenClawHomeDir: () => process.cwd(),
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          isUiLanguage: (value) => value === "en" || value === "zh",
          normalizeCollaborationAttachmentIds: (input) => Array.isArray(input) ? input : [],
          normalizeCollaborationRoomIdPayload: async (value) => value,
          normalizeLookupKey: (value) => String(value || "").trim().toLowerCase(),
          optionalBoundedString: (value) => typeof value === "string" ? value : undefined,
          pickUiText: (language, english, chinese) => language === "zh" ? chinese : english,
          resolveCollaborationParticipantName: (directory, agentId) =>
            directory.entries.find((entry) => String(entry.agentId || "").toLowerCase() === String(agentId || "").toLowerCase())?.displayName || agentId,
          sanitizeCollaborationDisplayText: (value) => String(value || "").trim(),
          safeTruncate: (value, maxLength) => String(value || "").slice(0, maxLength),
          toCollaborationApiAttachment: (attachment) => attachment,
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const transcriptRoom = await openclawChatRooms.createOpenClawChatRoom({
          agentId: "jarvis",
          workspaceRoot,
          openclawHomeDir: process.cwd(),
          title: "Dispatch room",
        });
        await collaborationRoom.saveCollaborationRoom(
          collaborationRoom.defaultCollaborationRoomState({
            roomId: transcriptRoom.roomId,
            title: "Dispatch room",
            titleMode: "manual",
          }),
        );

        const directory = {
          primaryAgentId: "jarvis",
          primaryDisplayName: "Jarvis",
          entries: [
            { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"], workspaceRoot },
            { agentId: "qa", displayName: "QA", aliases: ["qa"], workspaceRoot },
            { agentId: "architect", displayName: "Architect", aliases: ["architect"], workspaceRoot },
          ],
        };

        const requests = [];
        const toolClient = {
          agentTurn: async (request) => {
            requests.push({
              agentId: request.agentId,
              message: request.message,
              sessionKey: request.sessionKey,
            });
            const replyText = [
              "[[reply_to_current]] " + request.agentId + " accepted the task.",
              "",
              '<stage_result resultState="awaiting_review">',
              "<summary>" + request.agentId + " finished the assigned work.</summary>",
              "</stage_result>",
            ].join("\\n");
            return {
              ok: true,
              replyText,
              rawText: replyText,
              rawJson: {},
              durationMs: 25,
              sessionId: "session-" + request.agentId,
              sessionKey: "agent:" + request.agentId + ":main",
            };
          },
        };

        const created = await helpers.createCollaborationRoomMessage(
          {
            roomId: transcriptRoom.roomId,
            text: "@qa @architect please split this task and work under Team OS.",
          },
          toolClient,
          directory,
          "en",
        );

        await new Promise((resolve) => setTimeout(resolve, 1200));

        const roomState = await collaborationRoom.loadCollaborationRoom(transcriptRoom.roomId);
        const projects = await projectStore.loadProjectStore();
        const tasks = await taskStore.loadTaskStore();

        process.stdout.write(JSON.stringify({
          createdTargets: created.targetAgentIds,
          requestAgents: requests.map((request) => request.agentId),
          coordinationFlags: requests.map((request) => request.message.includes("<openclaw_coordination>")),
          jarvisOwnerFlags: requests.map((request) => request.message.includes("createdBy: jarvis")),
          ownerLines: requests.map((request) =>
            request.message.split("\\n").find((line) => line.startsWith("ownerAgentId: ")) || ""
          ),
          dispatchOwners: roomState.dispatchRecords.map((record) => record.ownerAgentId),
          receiptReporters: roomState.taskReceipts.map((receipt) => receipt.lastReportedBy),
          taskStatuses: tasks.tasks.map((task) => ({ owner: task.owner, status: task.status })),
          projectCount: projects.projects.length,
        }));
      `,
    );

    const parsed = JSON.parse(output) as {
      createdTargets: string[];
      requestAgents: string[];
      coordinationFlags: boolean[];
      jarvisOwnerFlags: boolean[];
      ownerLines: string[];
      dispatchOwners: string[];
      receiptReporters: string[];
      taskStatuses: Array<{ owner: string; status: string }>;
      projectCount: number;
    };

    assert.deepEqual([...parsed.createdTargets].sort(), ["architect", "qa"]);
    assert(parsed.requestAgents.includes("architect"));
    assert(parsed.requestAgents.includes("qa"));
    assert(parsed.requestAgents.every((agentId) => agentId === "architect" || agentId === "qa" || agentId === "jarvis"));
    assert(parsed.coordinationFlags.every(Boolean));
    assert(parsed.jarvisOwnerFlags.every(Boolean));
    assert(parsed.ownerLines.includes("ownerAgentId: architect"));
    assert(parsed.ownerLines.includes("ownerAgentId: qa"));
    assert(parsed.ownerLines.every((line) => line === "ownerAgentId: architect" || line === "ownerAgentId: qa" || line === "ownerAgentId: jarvis"));
    assert(parsed.dispatchOwners.includes("architect"));
    assert(parsed.dispatchOwners.includes("qa"));
    assert(parsed.dispatchOwners.every((agentId) => agentId === "architect" || agentId === "qa" || agentId === "jarvis"));
    assert(parsed.receiptReporters.includes("architect"));
    assert(parsed.receiptReporters.includes("qa"));
    assert(parsed.receiptReporters.every((agentId) => agentId === "architect" || agentId === "qa" || agentId === "jarvis"));
    assert.equal(parsed.projectCount, 1);
    assert.deepEqual(
      parsed.taskStatuses
        .filter((task) => task.owner === "qa" || task.owner === "architect")
        .map((task) => ({ ...task }))
        .sort((a, b) => a.owner.localeCompare(b.owner)),
      [
        { owner: "architect", status: "done" },
        { owner: "qa", status: "done" },
      ],
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("jarvis reply mentions can fan work out to employees with the original request and coordinator instruction", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-chat-reply-mention-"));

  try {
    const output = await runCollaborationChatModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const chatMod = unwrap(await import(${JSON.stringify(collaborationChatModuleHref)}));
        const openclawChatRooms = unwrap(await import(${JSON.stringify(openclawChatRoomsModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const taskStore = unwrap(await import(${JSON.stringify(taskStoreModuleHref)}));
        const { join } = await import("node:path");

        const helpers = chatMod.createCollaborationChatHelpers({
          buildCollaborationAttachmentSummary: () => "",
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message, statusCode = 400) => {
            const error = new Error(message);
            error.statusCode = statusCode;
            return error;
          },
          describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
          formatBytesCompact: () => "",
          formatCollaborationDuration: (value) => String(value || 0) + "ms",
          getOpenClawHomeDir: () => process.cwd(),
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          isUiLanguage: (value) => value === "en" || value === "zh",
          normalizeCollaborationAttachmentIds: (input) => Array.isArray(input) ? input : [],
          normalizeCollaborationRoomIdPayload: async (value) => value,
          normalizeLookupKey: (value) => String(value || "").trim().toLowerCase(),
          optionalBoundedString: (value) => typeof value === "string" ? value : undefined,
          pickUiText: (language, english, chinese) => language === "zh" ? chinese : english,
          resolveCollaborationParticipantName: (directory, agentId) =>
            directory.entries.find((entry) => String(entry.agentId || "").toLowerCase() === String(agentId || "").toLowerCase())?.displayName || agentId,
          sanitizeCollaborationDisplayText: (value) => String(value || "").trim(),
          safeTruncate: (value, maxLength) => String(value || "").slice(0, maxLength),
          toCollaborationApiAttachment: (attachment) => attachment,
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const transcriptRoom = await openclawChatRooms.createOpenClawChatRoom({
          agentId: "jarvis",
          workspaceRoot,
          openclawHomeDir: process.cwd(),
          title: "Reply mention room",
        });
        await collaborationRoom.saveCollaborationRoom(
          collaborationRoom.defaultCollaborationRoomState({
            roomId: transcriptRoom.roomId,
            title: "Reply mention room",
            titleMode: "manual",
          }),
        );

        const directory = {
          primaryAgentId: "jarvis",
          primaryDisplayName: "Jarvis",
          entries: [
            { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"], workspaceRoot },
            { agentId: "qa", displayName: "QA", aliases: ["qa"], workspaceRoot },
            { agentId: "architect", displayName: "Architect", aliases: ["architect"], workspaceRoot },
          ],
        };

        const requests = [];
        let jarvisTurnCount = 0;
        const toolClient = {
          agentTurn: async (request) => {
            requests.push({
              agentId: request.agentId,
              message: request.message,
            });
            if (request.agentId === "jarvis") {
              jarvisTurnCount += 1;
              const replyText =
                jarvisTurnCount === 1
                  ? [
                      "[[reply_to_current]] I will coordinate this with @qa and @architect.",
                      "",
                      "QA should verify the behavior and Architect should review the structure.",
                    ].join("\\n")
                  : "[[reply_to_current]] QA and Architect both reported back. I am summarizing the delegated results now.";
              return {
                ok: true,
                replyText,
                rawText: replyText,
                rawJson: {},
                durationMs: 25,
                sessionId: "session-jarvis",
                sessionKey: "agent:jarvis:main",
              };
            }
            const replyText = [
              "[[reply_to_current]] " + request.agentId + " finished the assigned follow-up.",
              "",
              '<stage_result resultState="awaiting_review">',
              "<summary>" + request.agentId + " completed the delegated follow-up.</summary>",
              "</stage_result>",
            ].join("\\n");
            return {
              ok: true,
              replyText,
              rawText: replyText,
              rawJson: {},
              durationMs: 25,
              sessionId: "session-" + request.agentId,
              sessionKey: "agent:" + request.agentId + ":main",
            };
          },
        };

        const created = await helpers.createCollaborationRoomMessage(
          {
            roomId: transcriptRoom.roomId,
            text: "@jarvis Please inspect this release flow and tell me what to fix.",
          },
          toolClient,
          directory,
          "en",
        );

        await new Promise((resolve) => setTimeout(resolve, 1200));

        const roomState = await collaborationRoom.loadCollaborationRoom(transcriptRoom.roomId);
        const tasks = await taskStore.loadTaskStore();
        const workerRequests = requests.filter((request) => request.agentId !== "jarvis");

        process.stdout.write(JSON.stringify({
          createdTargets: created.targetAgentIds,
          requestAgents: requests.map((request) => request.agentId),
          workerOwnerLines: workerRequests.map((request) =>
            request.message.split("\\n").find((line) => line.startsWith("ownerAgentId: ")) || ""
          ),
          workerPromptHasOriginalRequest: workerRequests.map((request) =>
            request.message.includes("Original user request:") &&
            request.message.includes("Please inspect this release flow and tell me what to fix.")
          ),
          workerPromptHasCoordinatorInstruction: workerRequests.map((request) =>
            request.message.includes("Jarvis coordination instruction:") &&
            request.message.includes("@qa and @architect")
          ),
          workerPromptHasReturnInstruction: requests
            .filter((request) => request.agentId === "jarvis")
            .slice(1)
            .map((request) =>
              request.message.includes("Latest worker updates:") &&
              request.message.includes("- QA:") &&
              request.message.includes("- Architect:")
            ),
          dispatchOwners: roomState.dispatchRecords.map((record) => record.ownerAgentId),
          roomReplyAgents: roomState.events
            .filter((event) => event.type === "agent_reply")
            .map((event) => event.agentId),
          roomReplyMessages: roomState.events
            .filter((event) => event.type === "agent_reply")
            .map((event) => event.message || ""),
          taskStatuses: tasks.tasks.map((task) => ({ owner: task.owner, status: task.status })),
        }));
        setTimeout(() => process.exit(0), 0);
      `,
    );

    const parsed = JSON.parse(output) as {
      createdTargets: string[];
      requestAgents: string[];
      workerOwnerLines: string[];
      workerPromptHasOriginalRequest: boolean[];
      workerPromptHasCoordinatorInstruction: boolean[];
      workerPromptHasReturnInstruction: boolean[];
      dispatchOwners: string[];
      roomReplyAgents: string[];
      roomReplyMessages: string[];
      taskStatuses: Array<{ owner: string; status: string }>;
    };

    assert.deepEqual(parsed.createdTargets, ["jarvis"]);
    assert.equal(parsed.requestAgents[0], "jarvis");
    assert.equal(parsed.requestAgents.filter((agentId) => agentId === "jarvis").length, 2);
    assert.deepEqual(
      [...parsed.requestAgents.filter((agentId) => agentId !== "jarvis")].sort(),
      ["architect", "qa"],
    );
    assert.deepEqual([...parsed.workerOwnerLines].sort(), ["ownerAgentId: architect", "ownerAgentId: qa"]);
    assert.deepEqual(parsed.workerPromptHasOriginalRequest, [true, true]);
    assert.deepEqual(parsed.workerPromptHasCoordinatorInstruction, [true, true]);
    assert.deepEqual(parsed.workerPromptHasReturnInstruction, [true]);
    assert.deepEqual([...parsed.dispatchOwners].sort(), ["architect", "jarvis", "jarvis", "qa"]);
    assert.deepEqual([...parsed.roomReplyAgents].sort(), ["architect", "jarvis", "jarvis", "qa"]);
    assert(parsed.roomReplyMessages.some((message) => /both reported back/i.test(message)));
    const relevantStatuses = parsed.taskStatuses.filter(
      (task) => task.owner === "jarvis" || task.owner === "qa" || task.owner === "architect",
    );
    assert.equal(
      relevantStatuses.filter((task) => task.owner === "qa" && task.status === "done").length >= 1,
      true,
    );
    assert.equal(
      relevantStatuses.filter((task) => task.owner === "architect" && task.status === "done").length >= 1,
      true,
    );
    assert.equal(
      relevantStatuses.filter((task) => task.owner === "jarvis" && task.status === "in_progress").length >= 1,
      true,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("Jarvis confirmation checkpoints persist as waiting-for-user-confirmation without auto-approving artifacts", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-chat-user-confirm-"));

  try {
    const output = await runCollaborationChatModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const chatMod = unwrap(await import(${JSON.stringify(collaborationChatModuleHref)}));
        const openclawChatRooms = unwrap(await import(${JSON.stringify(openclawChatRoomsModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const taskStore = unwrap(await import(${JSON.stringify(taskStoreModuleHref)}));
        const projectMemory = unwrap(await import(${JSON.stringify(projectMemoryModuleHref)}));
        const { join } = await import("node:path");

        const helpers = chatMod.createCollaborationChatHelpers({
          buildCollaborationAttachmentSummary: () => "",
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message, statusCode = 400) => {
            const error = new Error(message);
            error.statusCode = statusCode;
            return error;
          },
          describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
          formatBytesCompact: () => "",
          formatCollaborationDuration: (value) => String(value || 0) + "ms",
          getOpenClawHomeDir: () => process.cwd(),
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          isUiLanguage: (value) => value === "en" || value === "zh",
          normalizeCollaborationAttachmentIds: (input) => Array.isArray(input) ? input : [],
          normalizeCollaborationRoomIdPayload: async (value) => value,
          normalizeLookupKey: (value) => String(value || "").trim().toLowerCase(),
          optionalBoundedString: (value) => typeof value === "string" ? value : undefined,
          pickUiText: (language, english, chinese) => language === "zh" ? chinese : english,
          resolveCollaborationParticipantName: (directory, agentId) =>
            directory.entries.find((entry) => String(entry.agentId || "").toLowerCase() === String(agentId || "").toLowerCase())?.displayName || agentId,
          sanitizeCollaborationDisplayText: (value) => String(value || "").trim(),
          safeTruncate: (value, maxLength) => String(value || "").slice(0, maxLength),
          toCollaborationApiAttachment: (attachment) => attachment,
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const transcriptRoom = await openclawChatRooms.createOpenClawChatRoom({
          agentId: "jarvis",
          workspaceRoot,
          openclawHomeDir: process.cwd(),
          title: "User confirmation room",
        });
        await collaborationRoom.saveCollaborationRoom(
          collaborationRoom.defaultCollaborationRoomState({
            roomId: transcriptRoom.roomId,
            title: "User confirmation room",
            titleMode: "manual",
          }),
        );

        const directory = {
          primaryAgentId: "jarvis",
          primaryDisplayName: "Jarvis",
          entries: [
            { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"], workspaceRoot },
          ],
        };

        let turnCount = 0;
        const toolClient = {
          agentTurn: async () => {
            turnCount += 1;
            const replyText =
              turnCount === 1
                ? "[[reply_to_current]] I drafted two rollout options. Please choose one and I will continue."
                : "[[reply_to_current]] Continuing with option A while I prepare the next step.";
            return {
              ok: true,
              replyText,
              rawText: replyText,
              rawJson: {},
              durationMs: 25,
              sessionId: "session-jarvis",
              sessionKey: "agent:jarvis:main",
            };
          },
        };

        await helpers.createCollaborationRoomMessage(
          {
            roomId: transcriptRoom.roomId,
            text: "@jarvis Prepare the rollout plan.",
          },
          toolClient,
          directory,
          "en",
        );

        await new Promise((resolve) => setTimeout(resolve, 700));

        const firstRoomState = await collaborationRoom.loadCollaborationRoom(transcriptRoom.roomId);
        const firstReceipt = firstRoomState.taskReceipts.find((receipt) => receipt.waitingFor === "user_confirmation");
        const firstTaskId = firstReceipt?.taskId || "";
        const firstTasks = await taskStore.loadTaskStore();
        const firstTaskStatus = firstTasks.tasks.find((task) => task.taskId === firstTaskId)?.status ?? null;
        const firstMemory = await projectMemory.loadCollaborationProjectMemory({
          workspaceRoot,
          projectId: firstRoomState.projectId,
          projectTitle: "User confirmation room",
        });

        await helpers.createCollaborationRoomMessage(
          {
            roomId: transcriptRoom.roomId,
            text: "Option A. Continue.",
          },
          toolClient,
          directory,
          "en",
        );

        await new Promise((resolve) => setTimeout(resolve, 700));

        const secondRoomState = await collaborationRoom.loadCollaborationRoom(transcriptRoom.roomId);
        const nextTaskId = secondRoomState.dispatchRecords.find((record) => record.taskId !== firstTaskId)?.taskId || "";
        const closedReceipt = secondRoomState.taskReceipts.find((receipt) => receipt.taskId === firstTaskId);
        const secondTasks = await taskStore.loadTaskStore();
        const secondMemory = await projectMemory.loadCollaborationProjectMemory({
          workspaceRoot,
          projectId: secondRoomState.projectId,
          projectTitle: "User confirmation room",
        });

        process.stdout.write(JSON.stringify({
          firstReceipt: firstReceipt
            ? {
                reviewState: firstReceipt.reviewState || null,
                lastResultState: firstReceipt.lastResultState || null,
                waitingFor: firstReceipt.waitingFor || null,
              }
            : null,
          firstTaskStatus,
          firstStageLogCount: firstMemory.recentStageLogs.length,
          firstSummaryText: firstMemory.summaryText,
          closedReceipt: closedReceipt
            ? {
                reviewState: closedReceipt.reviewState || null,
                waitingFor: closedReceipt.waitingFor || null,
              }
            : null,
          secondTaskStatus: secondTasks.tasks.find((task) => task.taskId === nextTaskId)?.status ?? null,
          oldTaskStatus: secondTasks.tasks.find((task) => task.taskId === firstTaskId)?.status ?? null,
          openTaskIdsAfterSecond: secondMemory.openTasks.tasks.map((task) => task.taskId),
          secondStageLogCount: secondMemory.recentStageLogs.length,
          secondSummaryText: secondMemory.summaryText,
        }));
      `,
    );

    const parsed = JSON.parse(output) as {
      firstReceipt: null | {
        reviewState: string | null;
        lastResultState: string | null;
        waitingFor: string | null;
      };
      firstTaskStatus: string | null;
      firstStageLogCount: number;
      firstSummaryText: string;
      closedReceipt: null | {
        reviewState: string | null;
        waitingFor: string | null;
      };
      secondTaskStatus: string | null;
      oldTaskStatus: string | null;
      openTaskIdsAfterSecond: string[];
      secondStageLogCount: number;
      secondSummaryText: string;
    };

    assert.deepEqual(parsed.firstReceipt, {
      reviewState: "awaiting_review",
      lastResultState: "awaiting_review",
      waitingFor: "user_confirmation",
    });
    assert.equal(parsed.firstTaskStatus, "in_progress");
    assert.equal(parsed.firstStageLogCount, 0);
    assert.match(parsed.firstSummaryText, /No approved stage summary yet\./);
    assert.equal(parsed.closedReceipt?.reviewState, "approved");
    assert.equal(parsed.closedReceipt?.waitingFor, null);
    assert.equal(parsed.oldTaskStatus, "done");
    assert.equal(parsed.secondTaskStatus, "in_progress");
    assert.equal(parsed.openTaskIdsAfterSecond.length, 1);
    assert.equal(parsed.secondStageLogCount, 0);
    assert.match(parsed.secondSummaryText, /No approved stage summary yet\./);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("Jarvis explicit awaiting-review stage results still stay in the user-confirmation waiting branch", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-chat-user-confirm-stage-result-"));

  try {
    const output = await runCollaborationChatModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const chatMod = unwrap(await import(${JSON.stringify(collaborationChatModuleHref)}));
        const openclawChatRooms = unwrap(await import(${JSON.stringify(openclawChatRoomsModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const taskStore = unwrap(await import(${JSON.stringify(taskStoreModuleHref)}));
        const projectMemory = unwrap(await import(${JSON.stringify(projectMemoryModuleHref)}));
        const { join } = await import("node:path");

        const helpers = chatMod.createCollaborationChatHelpers({
          buildCollaborationAttachmentSummary: () => "",
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message, statusCode = 400) => {
            const error = new Error(message);
            error.statusCode = statusCode;
            return error;
          },
          describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
          formatBytesCompact: () => "",
          formatCollaborationDuration: (value) => String(value || 0) + "ms",
          getOpenClawHomeDir: () => process.cwd(),
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          isUiLanguage: (value) => value === "en" || value === "zh",
          normalizeCollaborationAttachmentIds: (input) => Array.isArray(input) ? input : [],
          normalizeCollaborationRoomIdPayload: async (value) => value,
          normalizeLookupKey: (value) => String(value || "").trim().toLowerCase(),
          optionalBoundedString: (value) => typeof value === "string" ? value : undefined,
          pickUiText: (language, english, chinese) => language === "zh" ? chinese : english,
          resolveCollaborationParticipantName: (directory, agentId) =>
            directory.entries.find((entry) => String(entry.agentId || "").toLowerCase() === String(agentId || "").toLowerCase())?.displayName || agentId,
          sanitizeCollaborationDisplayText: (value) => String(value || "").trim(),
          safeTruncate: (value, maxLength) => String(value || "").slice(0, maxLength),
          toCollaborationApiAttachment: (attachment) => attachment,
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const transcriptRoom = await openclawChatRooms.createOpenClawChatRoom({
          agentId: "jarvis",
          workspaceRoot,
          openclawHomeDir: process.cwd(),
          title: "Explicit confirmation room",
        });
        await collaborationRoom.saveCollaborationRoom(
          collaborationRoom.defaultCollaborationRoomState({
            roomId: transcriptRoom.roomId,
            title: "Explicit confirmation room",
            titleMode: "manual",
          }),
        );

        const directory = {
          primaryAgentId: "jarvis",
          primaryDisplayName: "Jarvis",
          entries: [
            { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"], workspaceRoot },
          ],
        };

        const toolClient = {
          agentTurn: async () => {
            const replyText = [
              "[[reply_to_current]] Here are two one-line directions:",
              "",
              "1. Option A",
              "2. Option B",
              "",
              "Reply with 1, 2, or blend both, and I'll continue from there.",
              "",
              '<stage_result resultState="awaiting_review">',
              "  <summary>Proposed two one-line pitch directions and waiting for user confirmation.</summary>",
              "  <nextSuggestion>Reply with 1, 2, or blend both so I can develop the pitch.</nextSuggestion>",
              "</stage_result>",
            ].join("\\n");
            return {
              ok: true,
              replyText,
              rawText: replyText,
              rawJson: {},
              durationMs: 25,
              sessionId: "session-jarvis",
              sessionKey: "agent:jarvis:main",
            };
          },
        };

        await helpers.createCollaborationRoomMessage(
          {
            roomId: transcriptRoom.roomId,
            text: "@jarvis Prepare the next rollout checkpoint.",
          },
          toolClient,
          directory,
          "en",
        );

        await new Promise((resolve) => setTimeout(resolve, 700));

        const roomState = await collaborationRoom.loadCollaborationRoom(transcriptRoom.roomId);
        const receipt = roomState.taskReceipts.find((item) => item.lastReportedBy === "jarvis");
        const taskId = receipt?.taskId || "";
        const tasks = await taskStore.loadTaskStore();
        const memory = await projectMemory.loadCollaborationProjectMemory({
          workspaceRoot,
          projectId: roomState.projectId,
          projectTitle: "Explicit confirmation room",
        });

        process.stdout.write(JSON.stringify({
          receipt: receipt
            ? {
                reviewState: receipt.reviewState || null,
                lastResultState: receipt.lastResultState || null,
                waitingFor: receipt.waitingFor || null,
              }
            : null,
          taskStatus: tasks.tasks.find((task) => task.taskId === taskId)?.status ?? null,
          stageLogCount: memory.recentStageLogs.length,
          summaryText: memory.summaryText,
        }));
      `,
    );

    const parsed = JSON.parse(output) as {
      receipt: null | {
        reviewState: string | null;
        lastResultState: string | null;
        waitingFor: string | null;
      };
      taskStatus: string | null;
      stageLogCount: number;
      summaryText: string;
    };

    assert.deepEqual(parsed.receipt, {
      reviewState: "awaiting_review",
      lastResultState: "awaiting_review",
      waitingFor: "user_confirmation",
    });
    assert.equal(parsed.taskStatus, "in_progress");
    assert.equal(parsed.stageLogCount, 0);
    assert.match(parsed.summaryText, /No approved stage summary yet\./);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("verification-only follow-up tasks can complete without attaching a new artifact", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-chat-verify-only-"));

  try {
    const output = await runCollaborationChatModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const chatMod = unwrap(await import(${JSON.stringify(collaborationChatModuleHref)}));
        const openclawChatRooms = unwrap(await import(${JSON.stringify(openclawChatRoomsModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const taskStore = unwrap(await import(${JSON.stringify(taskStoreModuleHref)}));
        const { mkdir, writeFile } = await import("node:fs/promises");
        const { join } = await import("node:path");

        const helpers = chatMod.createCollaborationChatHelpers({
          buildCollaborationAttachmentSummary: () => "",
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message, statusCode = 400) => {
            const error = new Error(message);
            error.statusCode = statusCode;
            return error;
          },
          describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
          formatBytesCompact: () => "",
          formatCollaborationDuration: (value) => String(value || 0) + "ms",
          getOpenClawHomeDir: () => process.cwd(),
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          isUiLanguage: (value) => value === "en" || value === "zh",
          normalizeCollaborationAttachmentIds: (input) => Array.isArray(input) ? input : [],
          normalizeCollaborationRoomIdPayload: async (value) => value,
          normalizeLookupKey: (value) => String(value || "").trim().toLowerCase(),
          optionalBoundedString: (value) => typeof value === "string" ? value : undefined,
          pickUiText: (language, english, chinese) => language === "zh" ? chinese : english,
          resolveCollaborationParticipantName: (directory, agentId) =>
            directory.entries.find((entry) => String(entry.agentId || "").toLowerCase() === String(agentId || "").toLowerCase())?.displayName || agentId,
          sanitizeCollaborationDisplayText: (value) => String(value || "").trim(),
          safeTruncate: (value, maxLength) => String(value || "").slice(0, maxLength),
          toCollaborationApiAttachment: (attachment) => attachment,
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const transcriptRoom = await openclawChatRooms.createOpenClawChatRoom({
          agentId: "jarvis",
          workspaceRoot,
          openclawHomeDir: process.cwd(),
          title: "Verify-only follow-up room",
        });
        await collaborationRoom.saveCollaborationRoom(
          collaborationRoom.defaultCollaborationRoomState({
            roomId: transcriptRoom.roomId,
            title: "Verify-only follow-up room",
            titleMode: "manual",
          }),
        );

        const directory = {
          primaryAgentId: "jarvis",
          primaryDisplayName: "Jarvis",
          entries: [
            { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"], workspaceRoot },
            { agentId: "qa", displayName: "QA", aliases: ["qa"], workspaceRoot },
          ],
        };

        const requests = [];
        let jarvisTurnCount = 0;
        const toolClient = {
          agentTurn: async (request) => {
            requests.push({
              agentId: request.agentId,
              message: request.message,
            });
            if (request.agentId === "jarvis") {
              jarvisTurnCount += 1;
              const replyText =
                jarvisTurnCount === 1
                  ? (() => {
                      const projectArtifactsDirMatch = request.message.match(/^projectArtifactsDir:\s*(.+)$/m);
                      const projectRootMatch = request.message.match(/^projectRoot:\s*(.+)$/m);
                      const artifactDir =
                        projectArtifactsDirMatch?.[1]?.trim() || projectRootMatch?.[1]?.trim() || join(workspaceRoot, "verify-only-artifacts");
                      const artifactPath = join(artifactDir, "status.html");
                      return mkdir(artifactDir, { recursive: true }).then(async () => {
                        await writeFile(artifactPath, "<!doctype html><html><body>Status OK</body></html>");
                        return [
                          "[[reply_to_current]] Built the status page at " + artifactPath + ". @qa verify the existing HTML artifact and reply with pass/fail only.",
                          "",
                          "Do not modify the file or create a new artifact unless you find a blocker.",
                        ].join("\\n");
                      });
                    })()
                  : Promise.resolve(
                      "[[reply_to_current]] QA reported pass on the existing HTML artifact. I am closing the verification loop.",
                    );
              return {
                ok: true,
                replyText: await replyText,
                rawText: await replyText,
                rawJson: {},
                durationMs: 25,
                sessionId: "session-jarvis",
                sessionKey: "agent:jarvis:main",
              };
            }
            const replyText = [
              "[[reply_to_current]] QA verified the existing HTML artifact: pass.",
              "",
              '<stage_result resultState="in_progress">',
              "<summary>QA verified the existing HTML artifact and reported pass/fail only.</summary>",
              "<nextSuggestion>Jarvis can review the pass/fail verdict.</nextSuggestion>",
              "</stage_result>",
            ].join("\\n");
            return {
              ok: true,
              replyText,
              rawText: replyText,
              rawJson: {},
              durationMs: 25,
              sessionId: "session-qa",
              sessionKey: "agent:qa:main",
            };
          },
        };

        const created = await helpers.createCollaborationRoomMessage(
          {
            roomId: transcriptRoom.roomId,
            text: "@jarvis Build a small HTML status page and save it as status.html.",
          },
          toolClient,
          directory,
          "en",
        );

        await new Promise((resolve) => setTimeout(resolve, 1200));

        const roomState = await collaborationRoom.loadCollaborationRoom(transcriptRoom.roomId);
        const tasks = await taskStore.loadTaskStore();
        const qaDispatch = roomState.dispatchRecords.find((record) => record.ownerAgentId === "qa");
        const qaTask = tasks.tasks.find((task) => task.owner === "qa");
        const qaRequest = requests.find((request) => request.agentId === "qa");

        process.stdout.write(JSON.stringify({
          createdTargets: created.targetAgentIds,
          roomAttachmentCount: roomState.attachments.length,
          qaExpectedArtifacts: qaDispatch?.expectedArtifacts ?? null,
          qaTaskStatus: qaTask?.status ?? null,
          qaPromptHasOriginalRequest: qaRequest?.message.includes("Build a small HTML status page and save it as status.html.") ?? false,
          qaPromptHasVerifyInstruction:
            qaRequest?.message.toLowerCase().includes("verify the existing html artifact and reply with pass/fail only") ?? false,
          jarvisTurnCount,
        }));
        setTimeout(() => process.exit(0), 0);
      `,
    );

    const parsed = JSON.parse(output) as {
      createdTargets: string[];
      roomAttachmentCount: number;
      qaExpectedArtifacts: string[] | null;
      qaTaskStatus: string | null;
      qaPromptHasOriginalRequest: boolean;
      qaPromptHasVerifyInstruction: boolean;
      jarvisTurnCount: number;
    };

    assert.deepEqual(parsed.createdTargets, ["jarvis"]);
    assert(parsed.roomAttachmentCount > 0);
    assert.deepEqual(parsed.qaExpectedArtifacts, []);
    assert.equal(parsed.qaTaskStatus, "done");
    assert.equal(parsed.qaPromptHasOriginalRequest, true);
    assert.equal(parsed.qaPromptHasVerifyInstruction, true);
    assert.equal(parsed.jarvisTurnCount, 2);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("artifact-producing primary replies without stage_result still auto-close as reviewable project work", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "collab-chat-artifact-autoclose-"));

  try {
    const output = await runCollaborationChatModuleForTest(
      tempRoot,
      `
        const unwrap = (mod) => mod.default ?? mod["module.exports"] ?? mod;
        const chatMod = unwrap(await import(${JSON.stringify(collaborationChatModuleHref)}));
        const openclawChatRooms = unwrap(await import(${JSON.stringify(openclawChatRoomsModuleHref)}));
        const collaborationRoom = unwrap(await import(${JSON.stringify(collaborationRoomModuleHref)}));
        const taskStore = unwrap(await import(${JSON.stringify(taskStoreModuleHref)}));
        const { mkdir, writeFile } = await import("node:fs/promises");
        const { join } = await import("node:path");

        const helpers = chatMod.createCollaborationChatHelpers({
          buildCollaborationAttachmentSummary: () => "",
          buildSessionDetailHref: () => "",
          createRequestValidationError: (message, statusCode = 400) => {
            const error = new Error(message);
            error.statusCode = statusCode;
            return error;
          },
          describeCollaborationRoomEvent: () => ({ label: "", detail: "" }),
          formatBytesCompact: () => "",
          formatCollaborationDuration: (value) => String(value || 0) + "ms",
          getOpenClawHomeDir: () => process.cwd(),
          getOpenClawWorkspaceRoot: () => join(process.cwd(), "workspace"),
          isUiLanguage: (value) => value === "en" || value === "zh",
          normalizeCollaborationAttachmentIds: (input) => Array.isArray(input) ? input : [],
          normalizeCollaborationRoomIdPayload: async (value) => value,
          normalizeLookupKey: (value) => String(value || "").trim().toLowerCase(),
          optionalBoundedString: (value) => typeof value === "string" ? value : undefined,
          pickUiText: (language, english, chinese) => language === "zh" ? chinese : english,
          resolveCollaborationParticipantName: (directory, agentId) =>
            directory.entries.find((entry) => String(entry.agentId || "").toLowerCase() === String(agentId || "").toLowerCase())?.displayName || agentId,
          sanitizeCollaborationDisplayText: (value) => String(value || "").trim(),
          safeTruncate: (value, maxLength) => String(value || "").slice(0, maxLength),
          toCollaborationApiAttachment: (attachment) => attachment,
        });

        const workspaceRoot = join(process.cwd(), "workspace");
        const transcriptRoom = await openclawChatRooms.createOpenClawChatRoom({
          agentId: "jarvis",
          workspaceRoot,
          openclawHomeDir: process.cwd(),
          title: "Artifact autoclose room",
        });
        await collaborationRoom.saveCollaborationRoom(
          collaborationRoom.defaultCollaborationRoomState({
            roomId: transcriptRoom.roomId,
            title: "Artifact autoclose room",
            titleMode: "manual",
          }),
        );

        const directory = {
          primaryAgentId: "jarvis",
          primaryDisplayName: "Jarvis",
          entries: [
            { agentId: "jarvis", displayName: "Jarvis", aliases: ["jarvis"], workspaceRoot },
            { agentId: "qa", displayName: "QA", aliases: ["qa"], workspaceRoot },
          ],
        };

        const toolClient = {
          agentTurn: async (request) => {
            const projectArtifactsDirMatch = request.message.match(/^projectArtifactsDir:\\s*(.+)$/m);
            const projectRootMatch = request.message.match(/^projectRoot:\\s*(.+)$/m);
            const artifactDir =
              projectArtifactsDirMatch?.[1]?.trim() || projectRootMatch?.[1]?.trim() || join(workspaceRoot, "fallback-artifacts");
            const artifactPath = join(artifactDir, "hello.html");
            await mkdir(artifactDir, { recursive: true });
            await writeFile(artifactPath, "<!doctype html><html><body>Hello autoclose</body></html>");
            const replyText = [
              "[[reply_to_current]] Ready — I saved the HTML page in the current collaboration project.",
              "",
              "[[openclaw-files]]",
              artifactPath,
              "[[/openclaw-files]]",
            ].join("\\n");
            return {
              ok: true,
              replyText,
              rawText: replyText,
              rawJson: {},
              durationMs: 25,
              sessionId: "session-jarvis",
              sessionKey: "agent:jarvis:main",
            };
          },
        };

        await helpers.createCollaborationRoomMessage(
          {
            roomId: transcriptRoom.roomId,
            text: "@jarvis Build a tiny HTML page and save it inside the current collaboration project only.",
          },
          toolClient,
          directory,
          "en",
        );

        await new Promise((resolve) => setTimeout(resolve, 350));

        const roomState = await collaborationRoom.loadCollaborationRoom(transcriptRoom.roomId);
        const tasks = await taskStore.loadTaskStore();
        const jarvisReceipt = roomState.taskReceipts.filter((receipt) => receipt.lastReportedBy === "jarvis").at(-1);
        const jarvisTask = tasks.tasks.filter((task) => task.owner === "jarvis").at(-1);

        process.stdout.write(JSON.stringify({
          roomAttachmentCount: roomState.attachments.length,
          roomAttachmentPaths: roomState.attachments.map((attachment) => attachment.sourceLocalPath || attachment.localPath || attachment.storedPath || ""),
          jarvisReceipt: jarvisReceipt
            ? {
                reviewState: jarvisReceipt.reviewState || null,
                lastResultState: jarvisReceipt.lastResultState,
                summary: jarvisReceipt.summary,
              }
            : null,
          jarvisTaskStatus: jarvisTask?.status ?? null,
        }));
      `,
    );

    const parsed = JSON.parse(output) as {
      roomAttachmentCount: number;
      roomAttachmentPaths: string[];
      jarvisReceipt: null | {
        reviewState: string | null;
        lastResultState: string;
        summary: string;
      };
      jarvisTaskStatus: string | null;
    };

    assert(parsed.roomAttachmentCount > 0);
    assert(parsed.roomAttachmentPaths.every((item) => /workspace[\\/]projects[\\/]/i.test(item)));
    assert.equal(parsed.jarvisReceipt?.reviewState, "approved");
    assert.equal(parsed.jarvisReceipt?.lastResultState, "awaiting_review");
    assert.equal(parsed.jarvisTaskStatus, "done");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
