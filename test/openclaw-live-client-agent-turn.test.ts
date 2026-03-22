import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildAgentTurnCliArgsForSmoke,
  inspectAgentTurnCompletionForSmoke,
  OpenClawLiveClient,
  resolveRequestedAgentTurnSessionBindingForSmoke,
} from "../src/clients/openclaw-live-client";
import {
  resolveOpenClawAgentModelOverridesPath,
  updateOpenClawAgentModelRecord,
} from "../src/runtime/openclaw-agent-models";
import { invalidateOpenClawCliInvocationCache } from "../src/runtime/openclaw-cli";

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

test("agentTurn extracts nested result payloads and flags nested interrupted turns as incomplete", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-live-agent-nested-result-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    await writeFile(
      scriptPath,
      [
        "const args = process.argv.slice(2);",
        "if (args[0] === 'sessions' && args[1] === '--json') {",
        "  console.log(JSON.stringify({ sessions: [] }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'agent') {",
        "  console.log(JSON.stringify({",
        "    status: 'ok',",
        "    result: {",
        "      payloads: [{ content: [{ type: 'text', text: 'continue the same stage now' }, { type: 'toolCall', name: 'write', arguments: { path: 'runtime/report.md' } }] }],",
        "      meta: { aborted: true },",
        "      stopReason: 'toolUse'",
        "    }",
        "  }));",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(1);",
        "",
      ].join("\n"),
      "utf8",
    );
    process.env.OPENCLAW_CLI_PATH = scriptPath;
    invalidateOpenClawCliInvocationCache();

    const client = new OpenClawLiveClient();
    const response = await client.agentTurn({
      agentId: "main",
      message: "resume the task",
      timeoutSeconds: 20,
    });

    assert.equal(response.ok, true);
    assert.equal(response.replyText, "continue the same stage now");
    assert.equal(response.stopReason, "toolUse");
    assert.equal(response.incomplete, true);
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    invalidateOpenClawCliInvocationCache();
    await rm(root, { recursive: true, force: true });
  }
});

test("agentTurn continues even when the health probe is a false negative", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-live-agent-turn-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    await writeFile(
      scriptPath,
      [
        "const args = process.argv.slice(2);",
        "if (args[0] === 'health') {",
        "  console.error('[openclaw] Failed to start CLI: Error: gateway timeout after 2500ms');",
        "  process.exit(1);",
        "}",
        "if (args[0] === 'sessions' && args[1] === '--json') {",
        "  console.log(JSON.stringify({ sessions: [] }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'agent') {",
        "  console.log(JSON.stringify({ payloads: [{ text: 'pong' }], stopReason: 'stop' }));",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(1);",
        "",
      ].join("\n"),
      "utf8",
    );
    process.env.OPENCLAW_CLI_PATH = scriptPath;
    invalidateOpenClawCliInvocationCache();

    const client = new OpenClawLiveClient();
    const response = await client.agentTurn({
      agentId: "main",
      message: "ping",
      timeoutSeconds: 20,
    });

    assert.equal(response.ok, true);
    assert.equal(response.replyText, "pong");
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    invalidateOpenClawCliInvocationCache();
    await rm(root, { recursive: true, force: true });
  }
});

test("agentTurn includes stderr details when the CLI command fails", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-live-agent-error-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    await writeFile(
      scriptPath,
      [
        "const args = process.argv.slice(2);",
        "if (args[0] === 'sessions' && args[1] === '--json') {",
        "  console.log(JSON.stringify({ sessions: [] }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'agent') {",
        "  console.error('gateway url override requires explicit credentials');",
        "  process.exit(1);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(1);",
        "",
      ].join("\n"),
      "utf8",
    );
    process.env.OPENCLAW_CLI_PATH = scriptPath;
    invalidateOpenClawCliInvocationCache();

    const client = new OpenClawLiveClient();
    const response = await client.agentTurn({
      agentId: "main",
      message: "ping",
      timeoutSeconds: 20,
    });

    assert.equal(response.ok, false);
    assert.match(response.failureReason ?? "", /requires explicit credentials/i);
    assert.match(response.rawText, /requires explicit credentials/i);
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    invalidateOpenClawCliInvocationCache();
    await rm(root, { recursive: true, force: true });
  }
});

test("agentTurn prefers the final assistant reply recorded in session history over an intermediate CLI wrapper payload", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-live-agent-history-final-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    const sessionFile = join(root, "main-session.jsonl").replace(/\\/g, "\\\\");
    await writeFile(
      scriptPath,
      [
        "import { writeFileSync } from 'node:fs';",
        `const sessionFile = "${sessionFile}";`,
        "const args = process.argv.slice(2);",
        "if (args[0] === 'sessions' && args[1] === '--json') {",
        "  console.log(JSON.stringify({ sessions: [{ sessionId: 'session-main', sessionKey: 'agent:main:thread:collab-room', agentId: 'main', sessionFile, updatedAt: Date.now(), active: true, state: 'active' }] }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'agent') {",
        "  const startedAt = Date.now();",
        "  const finalText = '[[reply_to_current]]已交付最终结果。\\n<stage_result>{\"taskId\":\"task-1\",\"projectId\":\"proj-1\",\"agentId\":\"main\",\"resultState\":\"awaiting_review\",\"summary\":\"ready for review\",\"artifacts\":[\"projects/proj-1/index.html\"],\"completionChecklist\":[\"done\"],\"blockers\":[],\"nextSuggestion\":\"\"}</stage_result>';",
        "  const historyLines = [",
        "    JSON.stringify({ type: 'message', timestamp: new Date(startedAt).toISOString(), message: { role: 'assistant', content: [{ type: 'toolCall', name: 'sessions_yield', arguments: { message: 'working' } }], stopReason: 'toolUse' } }),",
        "    JSON.stringify({ type: 'message', timestamp: new Date(startedAt + 25).toISOString(), message: { role: 'assistant', content: [{ type: 'text', text: finalText, textSignature: '{\"phase\":\"final_answer\"}' }], stopReason: 'stop' } }),",
        "  ];",
        "  writeFileSync(sessionFile, historyLines.join('\\n') + '\\n', 'utf8');",
        "  console.log(JSON.stringify({ payloads: [{ text: 'intermediate wrapper status' }], stopReason: 'toolUse' }));",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(1);",
        "",
      ].join("\n"),
      "utf8",
    );
    process.env.OPENCLAW_CLI_PATH = scriptPath;
    invalidateOpenClawCliInvocationCache();

    const client = new OpenClawLiveClient();
    const response = await client.agentTurn({
      agentId: "main",
      sessionKey: "agent:main:thread:collab-room",
      message: "finish the current stage",
      timeoutSeconds: 20,
    });

    assert.equal(response.ok, true);
    assert.match(response.replyText, /已交付最终结果/);
    assert.match(response.replyText, /<stage_result>/);
    assert.equal(response.stopReason, "stop");
    assert.equal(response.incomplete, false);
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    invalidateOpenClawCliInvocationCache();
    await rm(root, { recursive: true, force: true });
  }
});

test("agentTurn treats a later final session reply as success even when the CLI command exits with an error", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-live-agent-history-error-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    const sessionFile = join(root, "main-session.jsonl").replace(/\\/g, "\\\\");
    await writeFile(
      scriptPath,
      [
        "import { writeFileSync } from 'node:fs';",
        `const sessionFile = "${sessionFile}";`,
        "const args = process.argv.slice(2);",
        "if (args[0] === 'sessions' && args[1] === '--json') {",
        "  console.log(JSON.stringify({ sessions: [{ sessionId: 'session-main', sessionKey: 'agent:main:thread:collab-room', agentId: 'main', sessionFile, updatedAt: Date.now(), active: true, state: 'active' }] }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'agent') {",
        "  const startedAt = Date.now();",
        "  const finalText = 'All set.\\n<stage_result>{\"taskId\":\"task-2\",\"projectId\":\"proj-2\",\"agentId\":\"main\",\"resultState\":\"awaiting_review\",\"summary\":\"ready after transport retry\",\"artifacts\":[],\"completionChecklist\":[\"done\"],\"blockers\":[],\"nextSuggestion\":\"\"}</stage_result>';",
        "  const historyLines = [",
        "    JSON.stringify({ type: 'message', timestamp: new Date(startedAt + 10).toISOString(), message: { role: 'assistant', content: [{ type: 'text', text: finalText, textSignature: '{\"phase\":\"final_answer\"}' }], stopReason: 'stop' } }),",
        "  ];",
        "  writeFileSync(sessionFile, historyLines.join('\\n') + '\\n', 'utf8');",
        "  console.error('request timed out before a response was generated');",
        "  process.exit(1);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(1);",
        "",
      ].join("\n"),
      "utf8",
    );
    process.env.OPENCLAW_CLI_PATH = scriptPath;
    invalidateOpenClawCliInvocationCache();

    const client = new OpenClawLiveClient();
    const response = await client.agentTurn({
      agentId: "main",
      sessionKey: "agent:main:thread:collab-room",
      message: "deliver the stage",
      timeoutSeconds: 20,
    });

    assert.equal(response.ok, true);
    assert.match(response.replyText, /ready after transport retry/);
    assert.equal(response.failureReason, undefined);
    assert.equal(response.stopReason, "stop");
    assert.equal(response.incomplete, false);
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    invalidateOpenClawCliInvocationCache();
    await rm(root, { recursive: true, force: true });
  }
});

test("agentTurn can consume the upstream gateway event stream while still recovering the final raw reply from session history", async () => {
  const previousGatewayUrl = process.env.GATEWAY_URL;
  const previousWebSocketDescriptor = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  const streamEvents: Array<{ state: string; text?: string; runId?: string }> = [];

  class FakeGatewayWebSocket {
    private listeners = new Map<string, Array<(event: unknown) => void>>();

    constructor(_url: string) {
      setTimeout(() => {
        this.emit("message", {
          data: JSON.stringify({
            type: "event",
            event: "connect.challenge",
          }),
        });
      }, 0);
    }

    addEventListener(type: string, listener: (event: unknown) => void): void {
      const current = this.listeners.get(type) ?? [];
      current.push(listener);
      this.listeners.set(type, current);
    }

    send(data: string): void {
      const frame = JSON.parse(data) as {
        id?: string;
        method?: string;
        params?: { sessionKey?: string };
      };
      if (frame.method === "connect") {
        setTimeout(() => {
          this.emit("message", {
            data: JSON.stringify({
              type: "res",
              id: frame.id,
              ok: true,
              payload: { protocol: 1 },
            }),
          });
        }, 0);
        return;
      }
      if (frame.method === "chat.send") {
        setTimeout(() => {
          this.emit("message", {
            data: JSON.stringify({
              type: "res",
              id: frame.id,
              ok: true,
              payload: { runId: "run-stream-1" },
            }),
          });
          this.emit("message", {
            data: JSON.stringify({
              type: "event",
              event: "chat",
              payload: {
                runId: "run-stream-1",
                sessionKey: frame.params?.sessionKey,
                state: "delta",
                seq: 1,
                message: { text: "Streaming a partial visible answer..." },
              },
            }),
          });
          this.emit("message", {
            data: JSON.stringify({
              type: "event",
              event: "chat",
              payload: {
                runId: "run-stream-1",
                sessionKey: frame.params?.sessionKey,
                state: "final",
                seq: 2,
                stopReason: "stop",
                message: { text: "Streaming a partial visible answer..." },
              },
            }),
          });
        }, 0);
      }
    }

    close(): void {
      // No-op for the fake socket.
    }

    private emit(type: string, event: unknown): void {
      for (const listener of this.listeners.get(type) ?? []) {
        listener(event);
      }
    }
  }

  try {
    process.env.GATEWAY_URL = "ws://127.0.0.1:18789";
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: FakeGatewayWebSocket,
    });

    const client = new OpenClawLiveClient();
    const patchedClient = client as OpenClawLiveClient & {
      sessionsList: () => Promise<{
        sessions: Array<{
          sessionId: string;
          sessionKey: string;
          agentId: string;
          updatedAtMs: number;
          active: boolean;
          state: string;
        }>;
      }>;
      sessionsHistory: (request: { sessionKey: string; limit?: number }) => Promise<{ rawText: string }>;
    };

    patchedClient.sessionsList = async () => ({
      sessions: [
        {
          sessionId: "session-main",
          sessionKey: "agent:main:thread:collab-room",
          agentId: "main",
          updatedAtMs: Date.now(),
          active: true,
          state: "active",
        },
      ],
    });
    patchedClient.sessionsHistory = async () => {
      const finalReply = [
        "[[reply_to_current]]Final shared-room answer.",
        '<stage_result>{"taskId":"task-stream","projectId":"proj-stream","agentId":"main","resultState":"awaiting_review","summary":"ready for review","artifacts":[],"completionChecklist":["done"],"blockers":[],"nextSuggestion":"","reportedAt":"2026-03-23T08:10:00.000Z"}</stage_result>',
      ].join("\n");
      return {
        rawText: [
          JSON.stringify({
            type: "message",
            timestamp: new Date(Date.now() + 10).toISOString(),
            message: {
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: finalReply,
                  textSignature: '{"phase":"final_answer"}',
                },
              ],
              stopReason: "stop",
            },
          }),
        ].join("\n"),
      };
    };

    const response = await client.agentTurn({
      agentId: "main",
      sessionKey: "agent:main:thread:collab-room",
      message: "finish the shared-room task",
      timeoutSeconds: 20,
      preferGatewayStream: true,
      onStreamEvent: async (event) => {
        streamEvents.push({
          state: event.state,
          text: event.text,
          runId: event.runId,
        });
      },
    });

    assert.equal(response.ok, true);
    assert.equal(response.runId, "run-stream-1");
    assert.match(response.replyText, /Final shared-room answer/);
    assert.match(response.replyText, /<stage_result>/);
    assert.equal(response.stopReason, "stop");
    assert.equal(response.incomplete, false);
    assert.deepEqual(
      streamEvents.map((event) => event.state),
      ["started", "delta", "final"],
    );
    assert.equal(streamEvents[0]?.runId, "run-stream-1");
    assert.equal(streamEvents[1]?.text, "Streaming a partial visible answer...");
  } finally {
    process.env.GATEWAY_URL = previousGatewayUrl;
    if (previousWebSocketDescriptor) {
      Object.defineProperty(globalThis, "WebSocket", previousWebSocketDescriptor);
    } else {
      delete (globalThis as { WebSocket?: unknown }).WebSocket;
    }
  }
});

test("agentTurn swaps to a fallback model and retries without the previous session binding when the primary model is upstream-unavailable", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-live-agent-fallback-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  const previousHome = process.env.OPENCLAW_HOME;
  const configPath = join(root, "openclaw.json");
  const fallbackStatePath = resolveOpenClawAgentModelOverridesPath(configPath);
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    const callsFile = join(root, "cli-calls.jsonl").replace(/\\/g, "\\\\");
    const stateFile = join(root, "cli-state.json").replace(/\\/g, "\\\\");
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          agents: {
            defaults: {
              model: { primary: "provider/model-primary" },
              models: {
                "provider/model-primary": { alias: "Primary" },
                "provider/model-fallback": { alias: "Fallback" },
              },
            },
            list: [
              {
                id: "main",
                name: "main",
                model: "provider/model-primary",
                workspace: "projects/control-center",
                tools: { profile: "default" },
              },
            ],
          },
          models: { providers: {} },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await updateOpenClawAgentModelRecord(
      "main",
      {
        model: "provider/model-primary",
        fallbackModel: "provider/model-fallback",
      },
      configPath,
    );
    await writeFile(
      scriptPath,
      [
        "import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';",
        `const callsFile = "${callsFile}";`,
        `const stateFile = "${stateFile}";`,
        "const args = process.argv.slice(2);",
        "const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { agentCalls: 0 };",
        "appendFileSync(callsFile, JSON.stringify(args) + '\\n');",
        "if (args[0] === 'sessions' && args[1] === '--json') {",
        "  console.log(JSON.stringify({ sessions: [{ sessionId: 'session-alpha', sessionKey: 'agent:main:thread:collab-room-alpha', agentId: 'main', updatedAt: Date.now(), active: true, state: 'active' }] }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'agent') {",
        "  state.agentCalls += 1;",
        "  writeFileSync(stateFile, JSON.stringify(state), 'utf8');",
        "  if (state.agentCalls === 1) {",
        "    console.log(JSON.stringify({ payloads: [{ text: 'The AI service is temporarily unavailable (HTTP 521). Please try again in a moment.' }], stopReason: 'stop' }));",
        "    process.exit(0);",
        "  }",
        "  console.log(JSON.stringify({ payloads: [{ text: 'fallback succeeded' }], stopReason: 'stop' }));",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(1);",
        "",
      ].join("\n"),
      "utf8",
    );
    process.env.OPENCLAW_HOME = root;
    process.env.OPENCLAW_CLI_PATH = scriptPath;
    invalidateOpenClawCliInvocationCache();

    const client = new OpenClawLiveClient();
    const response = await client.agentTurn({
      agentId: "main",
      sessionKey: "agent:main:thread:collab-room-alpha",
      message: "retry this task on the fallback model if needed",
      timeoutSeconds: 20,
    });

    assert.equal(response.ok, true);
    assert.equal(response.replyText, "fallback succeeded");

    const rawCalls = await readFile(join(root, "cli-calls.jsonl"), "utf8");
    const agentCalls = rawCalls
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line) as string[])
      .filter((args) => args[0] === "agent");
    assert.equal(agentCalls.length, 2);
    assert.equal(agentCalls[0].includes("--session-id"), true);
    assert.equal(agentCalls[0].includes("session-alpha"), true);
    assert.equal(agentCalls[1].includes("--session-id"), false);

    const updatedConfig = JSON.parse(await readFile(configPath, "utf8")) as {
      agents?: { list?: Array<{ id?: string; model?: string; fallbackModel?: string }> };
    };
    const mainAgent = updatedConfig.agents?.list?.find((item) => item.id === "main");
    assert.equal(mainAgent?.model, "provider/model-fallback");
    assert.equal("fallbackModel" in (mainAgent ?? {}), false);

    const updatedFallbackState = JSON.parse(await readFile(fallbackStatePath, "utf8")) as {
      agents?: Record<string, { fallbackModel?: string }>;
    };
    assert.equal(updatedFallbackState.agents?.main?.fallbackModel, "provider/model-primary");
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    process.env.OPENCLAW_HOME = previousHome;
    invalidateOpenClawCliInvocationCache();
    await rm(root, { recursive: true, force: true });
  }
});
