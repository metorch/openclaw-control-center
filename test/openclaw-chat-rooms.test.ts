import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  deleteOpenClawChatRoom,
  loadActiveOpenClawChatRoomId,
  purgeOpenClawRoomScopedSessionEntries,
  readOpenClawChatRoomHistory,
} from "../src/runtime/openclaw-chat-rooms";
import { normalizeSessionHistoryMessages } from "../src/runtime/session-conversations";

test("openclaw room history can read transcript messages from a selected room", async () => {
  const openclawHome = await mkdtemp(join(tmpdir(), "openclaw-room-history-"));
  try {
    const roomId = "12345678-1234-4abc-8def-1234567890ab";
    const sessionsDir = join(openclawHome, "agents", "main", "sessions");
    await mkdir(sessionsDir, { recursive: true });
    await writeFile(
      join(sessionsDir, `${roomId}.jsonl`),
      [
        JSON.stringify({
          type: "session",
          version: 3,
          id: roomId,
          timestamp: "2026-03-16T12:00:00.000Z",
        }),
        JSON.stringify({
          type: "message",
          timestamp: "2026-03-16T12:00:01.000Z",
          message: {
            role: "user",
            content: [{ type: "text", text: "Hello Jarvis" }],
            timestamp: "2026-03-16T12:00:01.000Z",
          },
        }),
        JSON.stringify({
          type: "message",
          timestamp: "2026-03-16T12:00:02.000Z",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Hi there" }],
            timestamp: "2026-03-16T12:00:02.000Z",
          },
        }),
      ].join("\n"),
      "utf8",
    );

    const history = await readOpenClawChatRoomHistory({
      agentId: "main",
      roomId,
      openclawHomeDir: openclawHome,
      limit: 10,
    });
    assert(history);

    const messages = normalizeSessionHistoryMessages(history, 10);
    assert.deepEqual(
      messages.map((message) => ({ role: message.role, content: message.content })),
      [
        { role: "user", content: "Hello Jarvis" },
        { role: "assistant", content: "Hi there" },
      ],
    );
  } finally {
    await rm(openclawHome, { recursive: true, force: true });
  }
});

test("openclaw room history keeps recent chat messages even when transcript tails with metadata noise", async () => {
  const openclawHome = await mkdtemp(join(tmpdir(), "openclaw-room-history-tail-"));
  try {
    const roomId = "abcdef12-3456-4abc-8def-abcdef123456";
    const sessionsDir = join(openclawHome, "agents", "main", "sessions");
    await mkdir(sessionsDir, { recursive: true });
    await writeFile(
      join(sessionsDir, `${roomId}.jsonl`),
      [
        JSON.stringify({
          type: "session",
          version: 3,
          id: roomId,
          timestamp: "2026-03-16T12:10:00.000Z",
        }),
        JSON.stringify({
          type: "message",
          timestamp: "2026-03-16T12:10:01.000Z",
          message: {
            role: "user",
            content: [{ type: "text", text: "Need the latest status" }],
            timestamp: "2026-03-16T12:10:01.000Z",
          },
        }),
        JSON.stringify({
          type: "message",
          timestamp: "2026-03-16T12:10:02.000Z",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Working on it now." }],
            timestamp: "2026-03-16T12:10:02.000Z",
          },
        }),
        JSON.stringify({ type: "model_change", timestamp: "2026-03-16T12:10:03.000Z", modelId: "gpt-5-codex-mini" }),
        JSON.stringify({ type: "thinking_level_change", timestamp: "2026-03-16T12:10:04.000Z", thinkingLevel: "off" }),
        JSON.stringify({
          type: "custom",
          customType: "model-snapshot",
          timestamp: "2026-03-16T12:10:05.000Z",
          data: { modelId: "gpt-5-codex-mini" },
        }),
      ].join("\n"),
      "utf8",
    );

    const history = await readOpenClawChatRoomHistory({
      agentId: "main",
      roomId,
      openclawHomeDir: openclawHome,
      limit: 2,
    });
    assert(history);

    const messages = normalizeSessionHistoryMessages(history, 2);
    assert.deepEqual(
      messages.map((message) => ({ role: message.role, content: message.content })),
      [
        { role: "user", content: "Need the latest status" },
        { role: "assistant", content: "Working on it now." },
      ],
    );
  } finally {
    await rm(openclawHome, { recursive: true, force: true });
  }
});

test("normalizeSessionHistoryMessages hides assistant thinking and commentary-only tool turns", () => {
  const history = {
    json: {
      history: [
        {
          type: "message",
          timestamp: "2026-03-18T15:48:20.000Z",
          message: {
            role: "user",
            content: [{ type: "text", text: "把成都未来几天的天气做成 html" }],
          },
        },
        {
          type: "message",
          timestamp: "2026-03-18T15:48:21.000Z",
          message: {
            role: "assistant",
            content: [
              { type: "thinking", thinking: "**Considering PowerShell alias**" },
              { type: "toolCall", name: "exec", arguments: { command: "curl -L ..." } },
            ],
          },
          stopReason: "toolUse",
        },
        {
          type: "message",
          timestamp: "2026-03-18T15:48:22.000Z",
          message: {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "我已经抓到 30 天页了，接下来提取 4 月 1–7 日的具体数据并生成 HTML。",
                textSignature: JSON.stringify({ phase: "commentary" }),
              },
              { type: "toolCall", name: "exec", arguments: { command: "curl.exe ..." } },
            ],
          },
          stopReason: "toolUse",
        },
        {
          type: "message",
          timestamp: "2026-03-18T15:48:23.000Z",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "HTML 已生成并附上。" }],
          },
        },
      ],
    },
    rawText: "",
  };

  const messages = normalizeSessionHistoryMessages(history, 10);
  assert.deepEqual(
    messages
      .filter((message) => message.role === "assistant")
      .map((message) => message.content),
    ["HTML 已生成并附上。"],
  );
});
test("deleting the active openclaw room switches the active room to a surviving transcript", async () => {
  const openclawHome = await mkdtemp(join(tmpdir(), "openclaw-room-delete-"));
  try {
    const workspaceRoot = join(openclawHome, "workspace");
    const sessionsDir = join(openclawHome, "agents", "main", "sessions");
    const deletedRoomId = "12345678-1234-4abc-8def-111111111111";
    const fallbackRoomId = "12345678-1234-4abc-8def-222222222222";

    const writeTranscript = async (roomId: string, text: string, timestamp: string) => {
      await writeFile(
        join(sessionsDir, `${roomId}.jsonl`),
        [
          JSON.stringify({
            type: "session",
            version: 3,
            id: roomId,
            timestamp,
            cwd: workspaceRoot,
          }),
          JSON.stringify({
            type: "message",
            timestamp,
            message: {
              role: "user",
              content: [{ type: "text", text }],
              timestamp,
            },
          }),
        ].join("\n"),
        "utf8",
      );
    };

    await mkdir(sessionsDir, { recursive: true });
    await writeTranscript(deletedRoomId, "Delete me", "2026-03-19T10:00:00.000Z");
    await writeTranscript(fallbackRoomId, "Keep me", "2026-03-19T10:05:00.000Z");
    await writeFile(
      join(sessionsDir, "sessions.json"),
      `${JSON.stringify(
        {
          "agent:main:main": {
            updatedAt: Date.now(),
            sessionFile: join(sessionsDir, `${deletedRoomId}.jsonl`),
            chatType: "direct",
            lastChannel: "webchat",
            origin: {
              provider: "webchat",
              surface: "webchat",
              chatType: "direct",
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const deleted = await deleteOpenClawChatRoom({
      agentId: "main",
      roomId: deletedRoomId,
      workspaceRoot,
      openclawHomeDir: openclawHome,
    });

    assert.deepEqual(deleted, {
      deletedRoomId,
      fallbackRoomId,
    });
    assert.equal(
      await loadActiveOpenClawChatRoomId({
        agentId: "main",
        workspaceRoot,
        openclawHomeDir: openclawHome,
      }),
      fallbackRoomId,
    );
  } finally {
    await rm(openclawHome, { recursive: true, force: true });
  }
});

test("deleting an openclaw room removes room-scoped session store entries for that room", async () => {
  const openclawHome = await mkdtemp(join(tmpdir(), "openclaw-room-delete-sessions-"));
  try {
    const workspaceRoot = join(openclawHome, "workspace");
    const sessionsDir = join(openclawHome, "agents", "main", "sessions");
    const deletedRoomId = "12345678-1234-4abc-8def-333333333333";
    const keptRoomId = "12345678-1234-4abc-8def-444444444444";

    await mkdir(sessionsDir, { recursive: true });
    await writeFile(join(sessionsDir, `${deletedRoomId}.jsonl`), "", "utf8");
    await writeFile(join(sessionsDir, `${keptRoomId}.jsonl`), "", "utf8");
    await writeFile(
      join(sessionsDir, "sessions.json"),
      `${JSON.stringify(
        {
          "agent:main:main": {
            updatedAt: Date.now(),
            sessionFile: join(sessionsDir, `${keptRoomId}.jsonl`),
            chatType: "direct",
            lastChannel: "webchat",
            origin: {
              provider: "webchat",
              surface: "webchat",
              chatType: "direct",
            },
          },
          [`agent:main:thread:collab-${deletedRoomId}`]: {
            sessionId: "thread-session-delete",
            sessionKey: `agent:main:thread:collab-${deletedRoomId}`,
            updatedAt: Date.now(),
            sessionFile: join(sessionsDir, "thread-session-delete-topic-collab-" + deletedRoomId + ".jsonl"),
          },
          [`agent:main:thread:collab-${keptRoomId}`]: {
            sessionId: "thread-session-keep",
            sessionKey: `agent:main:thread:collab-${keptRoomId}`,
            updatedAt: Date.now(),
            sessionFile: join(sessionsDir, "thread-session-keep-topic-collab-" + keptRoomId + ".jsonl"),
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const deleted = await deleteOpenClawChatRoom({
      agentId: "main",
      roomId: deletedRoomId,
      workspaceRoot,
      openclawHomeDir: openclawHome,
      ensureFallback: false,
    });

    assert.equal(deleted.deletedRoomId, deletedRoomId);
    const storeAfterDelete = JSON.parse(
      await readFile(join(sessionsDir, "sessions.json"), "utf8"),
    ) as Record<string, unknown>;
    assert(!(`agent:main:thread:collab-${deletedRoomId}` in storeAfterDelete));
    assert(`agent:main:thread:collab-${keptRoomId}` in storeAfterDelete);
    assert(`agent:main:main` in storeAfterDelete);
  } finally {
    await rm(openclawHome, { recursive: true, force: true });
  }
});

test("purging room-scoped sessions can clean matching entries across agent stores", async () => {
  const openclawHome = await mkdtemp(join(tmpdir(), "openclaw-room-purge-sessions-"));
  try {
    const roomId = "12345678-1234-4abc-8def-555555555555";
    const agents = ["main", "frontend"];
    for (const agentId of agents) {
      const sessionsDir = join(openclawHome, "agents", agentId, "sessions");
      await mkdir(sessionsDir, { recursive: true });
      await writeFile(
        join(sessionsDir, "sessions.json"),
        `${JSON.stringify(
          {
            [`agent:${agentId}:thread:collab-${roomId}`]: {
              sessionKey: `agent:${agentId}:thread:collab-${roomId}`,
              sessionFile: join(sessionsDir, `${agentId}-topic-collab-${roomId}.jsonl`),
            },
            [`agent:${agentId}:main`]: {
              sessionKey: `agent:${agentId}:main`,
              sessionFile: join(sessionsDir, `${agentId}-main.jsonl`),
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    }

    const result = await purgeOpenClawRoomScopedSessionEntries({
      roomId,
      openclawHomeDir: openclawHome,
    });

    assert.deepEqual(result.updatedAgentIds, ["frontend", "main"]);
    assert.deepEqual(result.removedSessionKeys, [
      `agent:frontend:thread:collab-${roomId}`,
      `agent:main:thread:collab-${roomId}`,
    ]);
    for (const agentId of agents) {
      const sessionsDir = join(openclawHome, "agents", agentId, "sessions");
      const store = JSON.parse(
        await readFile(join(sessionsDir, "sessions.json"), "utf8"),
      ) as Record<string, unknown>;
      assert(!(`agent:${agentId}:thread:collab-${roomId}` in store));
      assert(`agent:${agentId}:main` in store);
    }
  } finally {
    await rm(openclawHome, { recursive: true, force: true });
  }
});
