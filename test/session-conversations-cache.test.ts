import assert from "node:assert/strict";
import test from "node:test";
import { listSessionConversations } from "../src/runtime/session-conversations";

test("listSessionConversations reuses cached session history for repeated reads", async () => {
  let calls = 0;
  const client = {
    async sessionsHistory(): Promise<{ json: { history: string[] }; rawText: string }> {
      calls += 1;
      return {
        json: {
          history: ["first", "second", "third", "fourth"],
        },
        rawText: "",
      };
    },
  };
  const snapshot = {
    sessions: [
      {
        sessionKey: "agent:main:main",
        label: "Jarvis",
        agentId: "main",
        state: "idle",
        lastMessageAt: "2026-03-18T10:00:00.000Z",
      },
    ],
    statuses: [],
  };

  const first = await listSessionConversations({
    snapshot: snapshot as any,
    client: client as any,
    filters: {},
    page: 1,
    pageSize: 1,
    historyLimit: 3,
  });
  const second = await listSessionConversations({
    snapshot: snapshot as any,
    client: client as any,
    filters: {},
    page: 1,
    pageSize: 1,
    historyLimit: 2,
  });

  assert.equal(calls, 1);
  assert.equal(first.items[0]?.historyCount, 3);
  assert.equal(second.items[0]?.historyCount, 2);
  assert.equal(second.items[0]?.latestSnippet, "fourth");
});
