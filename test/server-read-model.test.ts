import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, stat, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createReadModelHelpers } from "../src/ui/server-read-model";

test("read model invalidates snapshot cache on room deletion and filters deleted room-scoped sessions", async () => {
  const root = await mkdtemp(join(tmpdir(), "server-read-model-collab-"));
  const snapshotPath = join(root, "last-snapshot.json");
  const projectsPath = join(root, "projects.json");
  const tasksPath = join(root, "tasks.json");
  const budgetPolicyPath = join(root, "budget-policy.json");
  const existingRoomId = "12345678-1234-4abc-8def-666666666666";
  const deletedRoomId = "12345678-1234-4abc-8def-777777777777";
  const deletedSessionKey = `agent:main:thread:collab-${deletedRoomId}`;
  const keptSessionKey = `agent:main:thread:collab-${existingRoomId}`;
  const directSessionKey = "agent:main:main";

  let roomSummaries = [
    {
      roomId: existingRoomId,
      updatedAt: "2026-03-26T08:20:00.000Z",
      lastSequence: 3,
    },
    {
      roomId: deletedRoomId,
      updatedAt: "2026-03-26T08:10:00.000Z",
      lastSequence: 2,
    },
  ];

  try {
    await writeFile(
      snapshotPath,
      JSON.stringify(
        {
          sessions: [
            { sessionKey: keptSessionKey, agentId: "main", lastMessageAt: "2026-03-26T08:20:00.000Z", state: "running" },
            { sessionKey: deletedSessionKey, agentId: "main", lastMessageAt: "2026-03-26T08:10:00.000Z", state: "blocked" },
          ],
          statuses: [
            { sessionKey: keptSessionKey, updatedAt: "2026-03-26T08:20:00.000Z" },
            { sessionKey: deletedSessionKey, updatedAt: "2026-03-26T08:10:00.000Z" },
          ],
          cronJobs: [],
          approvals: [],
          generatedAt: "2026-03-26T08:20:00.000Z",
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(projectsPath, "{}\n", "utf8");
    await writeFile(tasksPath, "{}\n", "utf8");
    await writeFile(budgetPolicyPath, "{}\n", "utf8");

    const helpers = createReadModelHelpers({
      budgetPolicyPath,
      buildBudgetSummary: () => ({ total: 0, ok: 0, warn: 0, over: 0, evaluations: [] }),
      compareSessionSummariesByLatest: (left: { lastMessageAt?: string }, right: { lastMessageAt?: string }) =>
        Date.parse(right?.lastMessageAt ?? "") - Date.parse(left?.lastMessageAt ?? ""),
      computeProjectSummaries: () => [],
      computeTasksSummary: () => ({ tasks: 0 }),
      defaultSnapshot: () => ({
        sessions: [],
        statuses: [],
        cronJobs: [],
        approvals: [],
        projects: { projects: [] },
        tasks: {},
        tasksSummary: { tasks: 0 },
        budgetSummary: { total: 0, ok: 0, warn: 0, over: 0, evaluations: [] },
        generatedAt: "2026-03-26T08:20:00.000Z",
      }),
      delay: async () => undefined,
      htmlLiveSessionsCacheTtlMs: 60_000,
      htmlSnapshotCacheTtlMs: 60_000,
      loadBudgetPolicy: async () => ({ path: budgetPolicyPath, issues: [], policy: {} }),
      listCollaborationRooms: async () => roomSummaries,
      loadProjectStore: async () => ({ projects: [] }),
      loadTaskStore: async () => ({}),
      mapSessionsListToSummaries: (input: { sessions?: Array<Record<string, unknown>> }) =>
        (input.sessions ?? []).map((item) => ({
          sessionKey: String(item.sessionKey ?? item.key ?? ""),
          agentId: String(item.agentId ?? ""),
          lastMessageAt:
            typeof item.updatedAt === "string"
              ? item.updatedAt
              : typeof item.updatedAtMs === "number"
                ? new Date(item.updatedAtMs).toISOString()
                : undefined,
          state: String(item.state ?? (item.active ? "running" : "idle")),
        })),
      projectsPath,
      readFile,
      snapshotPath,
      stat,
      tasksPath,
    });

    const beforeDelete = await helpers.readReadModelSnapshot();
    assert(beforeDelete.sessions.some((session: { sessionKey: string }) => session.sessionKey === deletedSessionKey));

    roomSummaries = [
      {
        roomId: existingRoomId,
        updatedAt: "2026-03-26T08:20:00.000Z",
        lastSequence: 4,
      },
    ];

    const afterDelete = await helpers.readReadModelSnapshotWithLiveSessions({
      sessionsList: async () => ({
        sessions: [
          {
            sessionKey: deletedSessionKey,
            key: deletedSessionKey,
            agentId: "main",
            updatedAtMs: Date.parse("2026-03-26T08:30:00.000Z"),
            active: true,
            state: "running",
          },
          {
            sessionKey: keptSessionKey,
            key: keptSessionKey,
            agentId: "main",
            updatedAtMs: Date.parse("2026-03-26T08:31:00.000Z"),
            active: true,
            state: "running",
          },
          {
            sessionKey: directSessionKey,
            key: directSessionKey,
            agentId: "main",
            updatedAtMs: Date.parse("2026-03-26T08:32:00.000Z"),
            active: true,
            state: "running",
          },
        ],
      }),
    });

    assert(!afterDelete.sessions.some((session: { sessionKey: string }) => session.sessionKey === deletedSessionKey));
    assert(!afterDelete.statuses.some((status: { sessionKey: string }) => status.sessionKey === deletedSessionKey));
    assert(afterDelete.sessions.some((session: { sessionKey: string }) => session.sessionKey === keptSessionKey));
    assert(afterDelete.sessions.some((session: { sessionKey: string }) => session.sessionKey === directSessionKey));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
