import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildAgentTurnCliArgsForSmoke,
  buildSessionHistoryRecoveryPlanForSmoke,
  inspectAgentTurnCompletionForSmoke,
  OpenClawLiveClient,
  recoverFinalAssistantReplyFromHistoryForSmoke,
  resolveRequestedAgentTurnSessionBindingForSmoke,
} from "../src/clients/openclaw-live-client";
import {
  resolveOpenClawAgentModelOverridesPath,
  updateOpenClawAgentModelRecord,
} from "../src/runtime/openclaw-agent-models";
import { invalidateOpenClawCliInvocationCache } from "../src/runtime/openclaw-cli";
import { invalidateOpenClawEmployeeContractCache } from "../src/runtime/openclaw-employee-contract";

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

test("agentTurn streams through the upstream /v1/responses endpoint when gateway priority is not requested", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-live-agent-http-stream-"));
  const configPath = join(root, "openclaw.json");
  const previousGatewayUrl = process.env.GATEWAY_URL;
  const previousHome = process.env.OPENCLAW_HOME;
  const previousWebSocketDescriptor = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  const streamEvents: Array<{ state: string; text?: string; deltaText?: string; runId?: string }> = [];
  const requests: Array<{ authorization?: string; sessionKey?: string; body: string }> = [];

  const server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/responses") {
      res.statusCode = 404;
      res.end("not found");
      return;
    }

    let body = "";
    for await (const chunk of req) {
      body += chunk.toString();
    }
    requests.push({
      authorization: Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : req.headers.authorization,
      sessionKey: Array.isArray(req.headers["x-openclaw-session-key"])
        ? req.headers["x-openclaw-session-key"][0]
        : req.headers["x-openclaw-session-key"],
      body,
    });

    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
    });
    res.write(
      `event: response.created\ndata: ${JSON.stringify({
        type: "response.created",
        response: {
          id: "resp-http-stream-1",
          status: "in_progress",
          model: "openclaw:main",
          output: [],
        },
      })}\n\n`,
    );
    res.write(
      `event: response.output_text.delta\ndata: ${JSON.stringify({
        type: "response.output_text.delta",
        delta: "HTTP ",
      })}\n\n`,
    );
    res.write(
      `event: response.output_text.delta\ndata: ${JSON.stringify({
        type: "response.output_text.delta",
        delta: "stream",
      })}\n\n`,
    );
    res.write(
      `event: response.completed\ndata: ${JSON.stringify({
        type: "response.completed",
        response: {
          id: "resp-http-stream-1",
          status: "completed",
          model: "openclaw:main",
          output: [
            {
              type: "message",
              id: "msg-http-1",
              role: "assistant",
              status: "completed",
              content: [{ type: "output_text", text: "HTTP stream" }],
            },
          ],
        },
      })}\n\n`,
    );
    res.write("data: [DONE]\n\n");
    res.end();
  });

  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    process.env.GATEWAY_URL = `http://127.0.0.1:${port}`;
    process.env.OPENCLAW_HOME = root;
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          gateway: {
            auth: {
              mode: "token",
              token: "test-gateway-token",
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: class ForbiddenWebSocket {
        constructor() {
          throw new Error("WebSocket should not be used when /v1/responses streaming succeeds.");
        }
      },
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
    let sessionsListCalls = 0;
    patchedClient.sessionsList = async () => {
      sessionsListCalls += 1;
      return sessionsListCalls === 1
        ? { sessions: [] }
        : {
            sessions: [
              {
                sessionId: "session-http-stream",
                sessionKey: "agent:main:thread:collab-room-http",
                agentId: "main",
                updatedAtMs: Date.now(),
                active: true,
                state: "active",
              },
            ],
          };
    };
    patchedClient.sessionsHistory = async () => ({ rawText: "" });

      const response = await client.agentTurn({
        agentId: "main",
        sessionKey: "agent:main:thread:collab-room-http",
        message: "stream through responses",
        timeoutSeconds: 20,
        preferGatewayStream: false,
        onStreamEvent: async (event) => {
          streamEvents.push({
            state: event.state,
          text: event.text,
          deltaText: event.deltaText,
          runId: event.runId,
        });
      },
    });

    assert.equal(response.ok, true);
    assert.equal(response.runId, "resp-http-stream-1");
    assert.equal(response.replyText, "HTTP stream");
    assert.equal(response.stopReason, "completed");
    assert.equal(response.incomplete, false);
    assert.deepEqual(
      streamEvents.map((event) => ({ state: event.state, text: event.text, deltaText: event.deltaText })),
      [
        { state: "started", text: undefined, deltaText: undefined },
        { state: "delta", text: "HTTP ", deltaText: "HTTP " },
        { state: "delta", text: "HTTP stream", deltaText: "stream" },
        { state: "final", text: "HTTP stream", deltaText: undefined },
      ],
    );
    assert.equal(streamEvents[0]?.runId, "resp-http-stream-1");
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.authorization, "Bearer test-gateway-token");
    assert.equal(requests[0]?.sessionKey, "agent:main:thread:collab-room-http");
    assert.deepEqual(JSON.parse(requests[0]?.body ?? "{}"), {
      model: "openclaw:main",
      stream: true,
      input: [{ type: "message", role: "user", content: "stream through responses" }],
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    process.env.GATEWAY_URL = previousGatewayUrl;
    process.env.OPENCLAW_HOME = previousHome;
    if (previousWebSocketDescriptor) {
      Object.defineProperty(globalThis, "WebSocket", previousWebSocketDescriptor);
    } else {
      delete (globalThis as { WebSocket?: unknown }).WebSocket;
    }
    await rm(root, { recursive: true, force: true });
  }
});

test("agentTurn prefers the abortable gateway stream before /v1/responses when requested", async () => {
  const previousGatewayUrl = process.env.GATEWAY_URL;
  const previousWebSocketDescriptor = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  const previousFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const streamEvents: Array<{ state: string; text?: string; runId?: string }> = [];
  let fetchCalls = 0;

  class FakeGatewayPriorityWebSocket {
    private listeners = new Map<string, Array<(event: unknown) => void>>();

    constructor(_url: string) {
      setTimeout(() => {
        this.emit("message", {
          data: JSON.stringify({
            type: "event",
            event: "connect.challenge",
            payload: { nonce: "nonce-stream-priority" },
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
              payload: { protocol: 3 },
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
              payload: { runId: "run-stream-priority-1" },
            }),
          });
        }, 0);
        setTimeout(() => {
          this.emit("message", {
            data: JSON.stringify({
              type: "event",
              event: "chat",
              payload: {
                runId: "run-stream-priority-1",
                sessionKey: frame.params?.sessionKey,
                seq: 1,
                state: "delta",
                text: "Gateway priority answer",
              },
            }),
          });
        }, 20);
        setTimeout(() => {
          this.emit("message", {
            data: JSON.stringify({
              type: "event",
              event: "chat",
              payload: {
                runId: "run-stream-priority-1",
                sessionKey: frame.params?.sessionKey,
                seq: 2,
                state: "final",
                text: "Gateway priority answer",
                stopReason: "stop",
              },
            }),
          });
        }, 40);
      }
    }

    close(): void {
      // No-op in the fake socket.
    }

    private emit(type: string, event: unknown): void {
      for (const listener of this.listeners.get(type) ?? []) {
        listener(event);
      }
    }
  }

  try {
    process.env.GATEWAY_URL = "ws://127.0.0.1:18789";
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: async () => {
        fetchCalls += 1;
        return new Response("responses should not be used when gateway priority is requested", {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      },
    });
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: FakeGatewayPriorityWebSocket,
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
          sessionKey: "agent:main:thread:collab-room-priority",
          agentId: "main",
          updatedAtMs: Date.now(),
          active: true,
          state: "active",
        },
      ],
    });
    patchedClient.sessionsHistory = async () => ({
      rawText: [
        JSON.stringify({
          type: "message",
          timestamp: new Date(Date.now() + 10).toISOString(),
          message: {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "Gateway priority answer",
                textSignature: '{"phase":"final_answer"}',
              },
            ],
            stopReason: "stop",
          },
        }),
      ].join("\n"),
    });

    const response = await client.agentTurn({
      agentId: "main",
      sessionKey: "agent:main:thread:collab-room-priority",
      message: "prefer the gateway stream first",
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
    assert.equal(response.runId, "run-stream-priority-1");
    assert.equal(response.replyText, "Gateway priority answer");
    assert.equal(response.stopReason, "stop");
    assert.equal(fetchCalls, 0);
    assert.deepEqual(
      streamEvents.map((event) => event.state),
      ["started", "delta", "final"],
    );
  } finally {
    process.env.GATEWAY_URL = previousGatewayUrl;
    if (previousFetchDescriptor) {
      Object.defineProperty(globalThis, "fetch", previousFetchDescriptor);
    } else {
      delete (globalThis as { fetch?: unknown }).fetch;
    }
    if (previousWebSocketDescriptor) {
      Object.defineProperty(globalThis, "WebSocket", previousWebSocketDescriptor);
    } else {
      delete (globalThis as { WebSocket?: unknown }).WebSocket;
    }
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

test("agentTurn blocks dispatch when the guarded OpenClaw agent CLI surface loses session-id support", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-live-agent-contract-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  const previousForceHelpProbe = process.env.OPENCLAW_EMPLOYEE_CONTRACT_FORCE_HELP_PROBE;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    const callsPath = join(root, "agent-calls.txt");
    await writeFile(
      scriptPath,
      [
        "import { appendFileSync } from 'node:fs';",
        `const callsPath = ${JSON.stringify(callsPath)};`,
        "const args = process.argv.slice(2);",
        "if (args[0] === '--version') {",
        "  console.log('OpenClaw 2026.3.24 (fake)');",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'status' && args[1] === '--json') {",
        "  console.log(JSON.stringify({ runtimeVersion: '2026.3.24', gateway: { reachable: true, self: { version: '2026.3.24' } } }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'gateway' && args[1] === 'status' && args[2] === '--json') {",
        "  console.log(JSON.stringify({ rpc: { ok: true } }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'sessions' && args[1] === '--json') {",
        "  console.log(JSON.stringify({ sessions: [] }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'cron' && args[1] === 'list' && args[2] === '--json') {",
        "  console.log(JSON.stringify({ jobs: [] }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'approvals' && args[1] === 'get' && args[2] === '--json') {",
        "  console.log(JSON.stringify({ exists: true }));",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'agent' && args[1] === '--help') {",
        "  console.log('Usage: openclaw agent [options]\\n--agent\\n--message\\n--json\\n--timeout');",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'agent') {",
        "  appendFileSync(callsPath, args.join(' ') + '\\n');",
        "  console.log(JSON.stringify({ payloads: [{ text: 'should never run' }], stopReason: 'stop' }));",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(1);",
        "",
      ].join("\n"),
      "utf8",
    );

    process.env.OPENCLAW_CLI_PATH = scriptPath;
    process.env.OPENCLAW_EMPLOYEE_CONTRACT_FORCE_HELP_PROBE = "1";
    invalidateOpenClawCliInvocationCache();
    invalidateOpenClawEmployeeContractCache();

    const client = new OpenClawLiveClient();
    const response = await client.agentTurn({
      agentId: "main",
      message: "guard the room dispatch",
      timeoutSeconds: 20,
    });

    assert.equal(response.ok, false);
    assert.match(response.failureReason ?? "", /阻止当前分发/);
    await assert.rejects(readFile(callsPath, "utf8"));
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    process.env.OPENCLAW_EMPLOYEE_CONTRACT_FORCE_HELP_PROBE = previousForceHelpProbe;
    invalidateOpenClawCliInvocationCache();
    invalidateOpenClawEmployeeContractCache();
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
  const previousFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const streamEvents: Array<{ state: string; text?: string; runId?: string }> = [];
  const connectRequests: Array<{ minProtocol?: number; maxProtocol?: number }> = [];

  class FakeGatewayWebSocket {
    private listeners = new Map<string, Array<(event: unknown) => void>>();

    constructor(_url: string) {
      setTimeout(() => {
        this.emit("message", {
          data: JSON.stringify({
            type: "event",
            event: "connect.challenge",
            payload: { nonce: "nonce-stream-1" },
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
        params?: { sessionKey?: string; minProtocol?: number; maxProtocol?: number };
      };
      if (frame.method === "connect") {
        connectRequests.push({
          minProtocol: frame.params?.minProtocol,
          maxProtocol: frame.params?.maxProtocol,
        });
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
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: async () =>
        new Response("responses endpoint unavailable in this test", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    });
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
    assert.deepEqual(connectRequests, [{ minProtocol: 3, maxProtocol: 3 }]);
    assert.deepEqual(
      streamEvents.map((event) => event.state),
      ["started", "delta", "final"],
    );
    assert.equal(streamEvents[0]?.runId, "run-stream-1");
    assert.equal(streamEvents[1]?.text, "Streaming a partial visible answer...");
  } finally {
    process.env.GATEWAY_URL = previousGatewayUrl;
    if (previousFetchDescriptor) {
      Object.defineProperty(globalThis, "fetch", previousFetchDescriptor);
    } else {
      delete (globalThis as { fetch?: unknown }).fetch;
    }
    if (previousWebSocketDescriptor) {
      Object.defineProperty(globalThis, "WebSocket", previousWebSocketDescriptor);
    } else {
      delete (globalThis as { WebSocket?: unknown }).WebSocket;
    }
  }
});

test("gateway final timeout recovery keeps polling long enough for a simulated 24-second-late final session reply", async () => {
  const startedAtMs = Date.now();
  const finalReply = [
    "[[reply_to_current]]Final reply landed after the gateway timeout.",
    '<stage_result>{"taskId":"task-gateway-timeout","projectId":"proj-gateway-timeout","agentId":"main","resultState":"awaiting_review","summary":"late final reply recovered","artifacts":[],"completionChecklist":["done"],"blockers":[],"nextSuggestion":"","reportedAt":"2026-03-24T10:07:50.223Z"}</stage_result>',
  ].join("\n");
  const finalHistory = {
    rawText: [
      JSON.stringify({
        type: "message",
        timestamp: new Date(startedAtMs + 24_000).toISOString(),
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
  const timings = {
    defaultTimeoutMs: 40,
    gatewayFinalTimeoutMs: 220,
    pollIntervalMs: 10,
  };
  const plan = buildSessionHistoryRecoveryPlanForSmoke({
    waitForFinal: true,
    errorMessage: "Gateway chat stream timed out before a final event arrived.",
    timings,
  });
  assert.equal(plan.extendedForGatewayFinalTimeout, true);
  assert.equal(plan.timeoutMs, 220);

  const buildDelayedReader = () => {
    let calls = 0;
    return {
      getCalls: () => calls,
      readHistory: async () => {
        calls += 1;
        if (calls < 10) {
          return { rawText: "" };
        }
        return finalHistory;
      },
    };
  };

  const genericReader = buildDelayedReader();
  const genericRecovered = await recoverFinalAssistantReplyFromHistoryForSmoke({
    waitForFinal: true,
    errorMessage: "Gateway chat stream closed before a final event arrived.",
    startedAtMs,
    timings,
    readHistory: genericReader.readHistory,
  });
  assert.equal(genericRecovered, undefined);
  assert.ok(genericReader.getCalls() <= 6);

  const gatewayReader = buildDelayedReader();
  const gatewayRecovered = await recoverFinalAssistantReplyFromHistoryForSmoke({
    waitForFinal: true,
    errorMessage: "Gateway chat stream timed out before a final event arrived.",
    startedAtMs,
    timings,
    readHistory: gatewayReader.readHistory,
  });
  assert.match(gatewayRecovered?.replyText ?? "", /Final reply landed after the gateway timeout/);
  assert.equal(gatewayRecovered?.stopReason, "stop");
  assert.equal(gatewayRecovered?.timestampMs, startedAtMs + 24_000);
  assert.ok(gatewayReader.getCalls() >= 10);
});

test("gateway final timeout recovery can surface interrupted session progress before a final reply exists", async () => {
  const startedAtMs = Date.now();
  const interruptedHistory = {
    rawText: [
      JSON.stringify({
        type: "message",
        timestamp: new Date(startedAtMs + 5_000).toISOString(),
        message: {
          role: "assistant",
          content: [
            {
              type: "text",
              text: "Still installing dependencies and running the smoke checks.",
            },
            {
              type: "toolCall",
              name: "process",
              arguments: { action: "poll", sessionId: "brisk-canyon" },
            },
          ],
          stopReason: "toolUse",
        },
      }),
    ].join("\n"),
  };

  const genericRecovered = await recoverFinalAssistantReplyFromHistoryForSmoke({
    waitForFinal: true,
    errorMessage: "Gateway chat stream closed before a final event arrived.",
    startedAtMs,
    readHistory: async () => interruptedHistory,
  });
  assert.equal(genericRecovered, undefined);

  const gatewayRecovered = await recoverFinalAssistantReplyFromHistoryForSmoke({
    waitForFinal: true,
    errorMessage: "Gateway chat stream timed out before a final event arrived.",
    startedAtMs,
    readHistory: async () => interruptedHistory,
  });
  assert.equal(gatewayRecovered?.replyText, "Still installing dependencies and running the smoke checks.");
  assert.equal(gatewayRecovered?.stopReason, "toolUse");
  assert.equal(gatewayRecovered?.incomplete, true);
});

test("agentTurn tolerates gateway delta-only payload variants and final-state aliases", async () => {
  const previousGatewayUrl = process.env.GATEWAY_URL;
  const previousWebSocketDescriptor = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  const previousFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const streamEvents: Array<{ state: string; text?: string; deltaText?: string }> = [];

  class FakeGatewayVariantWebSocket {
    private listeners = new Map<string, Array<(event: unknown) => void>>();

    constructor(_url: string) {
      setTimeout(() => {
        this.emit("message", {
          data: JSON.stringify({
            type: "event",
            event: "connect.challenge",
            payload: { nonce: "nonce-stream-variant" },
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
              payload: { protocol: 3 },
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
              payload: { runId: "run-stream-variant" },
            }),
          });
          this.emit("message", {
            data: JSON.stringify({
              type: "event",
              event: "chat",
              payload: {
                runId: "run-stream-variant",
                sessionKey: frame.params?.sessionKey,
                state: "partial",
                seq: 1,
                data: { text: "Hello", delta: "Hello" },
              },
            }),
          });
          this.emit("message", {
            data: JSON.stringify({
              type: "event",
              event: "chat",
              payload: {
                runId: "run-stream-variant",
                sessionKey: frame.params?.sessionKey,
                state: "delta",
                seq: 2,
                deltaText: " world",
              },
            }),
          });
          this.emit("message", {
            data: JSON.stringify({
              type: "event",
              event: "chat",
              payload: {
                runId: "run-stream-variant",
                sessionKey: frame.params?.sessionKey,
                state: "completed",
                seq: 3,
                stopReason: "stop",
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
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: async () =>
        new Response("responses endpoint unavailable in this test", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    });
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: FakeGatewayVariantWebSocket,
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
    patchedClient.sessionsHistory = async () => ({
      rawText: [
        JSON.stringify({
          type: "message",
          timestamp: new Date(Date.now() + 10).toISOString(),
          message: {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "Hello world",
                textSignature: '{"phase":"final_answer"}',
              },
            ],
            stopReason: "stop",
          },
        }),
      ].join("\n"),
    });

    const response = await client.agentTurn({
      agentId: "main",
      sessionKey: "agent:main:thread:collab-room",
      message: "stream the answer through the gateway",
      timeoutSeconds: 20,
      preferGatewayStream: true,
      onStreamEvent: async (event) => {
        streamEvents.push({
          state: event.state,
          text: event.text,
          deltaText: event.deltaText,
        });
      },
    });

    assert.equal(response.ok, true);
    assert.equal(response.runId, "run-stream-variant");
    assert.equal(response.replyText, "Hello world");
    assert.equal(response.stopReason, "stop");
    assert.equal(response.incomplete, false);
    assert.deepEqual(
      streamEvents.map((event) => ({ state: event.state, text: event.text, deltaText: event.deltaText })),
      [
        { state: "started", text: undefined, deltaText: undefined },
        { state: "delta", text: "Hello", deltaText: "Hello" },
        { state: "delta", text: "Hello world", deltaText: " world" },
        { state: "final", text: "Hello world", deltaText: undefined },
      ],
    );
  } finally {
    process.env.GATEWAY_URL = previousGatewayUrl;
    if (previousFetchDescriptor) {
      Object.defineProperty(globalThis, "fetch", previousFetchDescriptor);
    } else {
      delete (globalThis as { fetch?: unknown }).fetch;
    }
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
