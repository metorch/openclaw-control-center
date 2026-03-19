import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgentTurnCliArgsForSmoke,
  inspectAgentTurnCompletionForSmoke,
  resolveRequestedAgentTurnSessionBindingForSmoke,
} from "../src/clients/openclaw-live-client";

test("agent turn command only forwards session id to the OpenClaw CLI", () => {
  const args = buildAgentTurnCliArgsForSmoke({
    agentId: "jarvis",
    message: "sync the project memory",
    sessionId: "session-alpha",
    sessionKey: "agent:jarvis:thread:collab-room-alpha",
    timeoutSeconds: 90,
  });

  assert.deepEqual(args, [
    "agent",
    "--json",
    "--agent",
    "jarvis",
    "--message",
    "sync the project memory",
    "--session-id",
    "session-alpha",
    "--timeout",
    "90",
  ]);
});

test("session key lookups resolve to an existing session id before invoking the CLI", () => {
  const resolved = resolveRequestedAgentTurnSessionBindingForSmoke(
    "jarvis",
    {
      sessions: [
        {
          sessionId: "session-alpha",
          sessionKey: "agent:jarvis:thread:collab-room-alpha",
          agentId: "jarvis",
        },
      ],
    },
    undefined,
    "agent:jarvis:thread:collab-room-alpha",
  );

  assert.deepEqual(resolved, {
    sessionId: "session-alpha",
    sessionKey: "agent:jarvis:thread:collab-room-alpha",
  });
});

test("agent turn completion marks aborted tool runs as incomplete", () => {
  const completion = inspectAgentTurnCompletionForSmoke({
    payloads: [
      {
        content: [
          { type: "text", text: "我把页面做得顺手点：手机和桌面打开都能直接看。" },
          {
            type: "toolCall",
            name: "write",
            arguments: {
              path: "C:\\Users\\demo\\.openclaw\\workspace\\projects\\test\\artifacts\\weather.html",
            },
          },
        ],
      },
    ],
    stopReason: "aborted",
    errorMessage: "Request was aborted",
  });

  assert.deepEqual(completion, {
    stopReason: "aborted",
    errorMessage: "Request was aborted",
    incomplete: true,
  });
});

test("agent turn completion keeps normal final replies as complete", () => {
  const completion = inspectAgentTurnCompletionForSmoke({
    payloads: [{ text: "已完成并附上文件。" }],
    stopReason: "endTurn",
  });

  assert.deepEqual(completion, {
    stopReason: "endTurn",
    errorMessage: undefined,
    incomplete: false,
  });
});
