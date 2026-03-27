import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { ReadModelSnapshot } from "../src/types";

test("usage-cost snapshot marks disconnected sources with explicit placeholders", async () => {
  const { computeUsageCostSnapshot } = await import("../src/runtime/usage-cost");
  const snapshot = buildSnapshotFixture();

  const usage = computeUsageCostSnapshot(snapshot, [], []);
  const today = usage.periods.find((item) => item.key === "today");

  assert(today, "Expected today usage period.");
  assert.equal(today.requestCountStatus, "not_connected");
  assert.equal(usage.contextWindows[0]?.thresholdState, "not_connected");
  assert.equal(usage.budget.status, "ok");
  assert.equal(usage.budget.isUnlimited, true);
  assert.equal(usage.connectors.budgetLimit, "connected");
  assert(usage.connectors.todos.some((item) => item.id === "request_counter"));
  assert(usage.connectors.todos.some((item) => item.id === "context_catalog"));
  assert(!usage.connectors.todos.some((item) => item.id === "cost_budget_limit"));
});

test("usage-cost snapshot computes context percent and burn-rate status when sources exist", async () => {
  const { computeUsageCostSnapshot } = await import("../src/runtime/usage-cost");
  const snapshot = buildSnapshotFixture({
    model: "gpt-4o",
    tokensIn: 64000,
    tokensOut: 6000,
    cost: 30,
    costLimit: 100,
  });
  const todayIso = new Date().toISOString().slice(0, 10);

  const usage = computeUsageCostSnapshot(
    snapshot,
    [
      {
        date: todayIso,
        usage: {
          statuses: 1,
          totalTokensIn: 64000,
          totalTokensOut: 6000,
          totalCost: 90,
        },
      },
    ],
    [{ match: "gpt-4o", contextWindowTokens: 128000, provider: "OpenAI" }],
  );

  assert.equal(usage.contextWindows[0]?.dataStatus, "connected");
  assert.equal(Math.round(usage.contextWindows[0]?.usagePercent ?? 0), 55);
  assert.equal(usage.budget.status, "warn");
  assert.equal(usage.connectors.modelContextCatalog, "connected");
  assert.equal(usage.periods.find((item) => item.key === "today")?.sourceStatus, "connected");
});

test("usage-cost snapshot uses runtime session events for real requests, trends, and breakdown rows", async () => {
  const { computeUsageCostSnapshot } = await import("../src/runtime/usage-cost");
  const snapshot = buildSnapshotFixture({
    model: "gpt-5.3-codex",
    tokensIn: 64000,
    tokensOut: 6000,
    cost: 10,
    costLimit: 50,
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const now = Date.parse(`${todayIso}T12:00:00.000Z`);
  const usage = computeUsageCostSnapshot(snapshot, [], [], {
    sourceStatus: "connected",
    sessionContexts: [
      {
        sessionKey: "s-1",
        sessionId: "sid-1",
        agentId: "pandas",
        model: "gpt-5.3-codex",
        provider: "OpenAI",
        contextWindowTokens: 100000,
      },
    ],
    events: [
      runtimeEvent(now, 1000, 1),
      runtimeEvent(now - 2 * 60 * 60 * 1000, 2000, 2),
      runtimeEvent(now - 1 * 24 * 60 * 60 * 1000, 4000, 3),
      runtimeEvent(now - 8 * 24 * 60 * 60 * 1000, 5000, 4),
    ],
  });

  const today = usage.periods.find((item) => item.key === "today");
  const seven = usage.periods.find((item) => item.key === "7d");
  const thirty = usage.periods.find((item) => item.key === "30d");
  assert(today && seven && thirty);

  assert.equal(today.tokens, 3000);
  assert.equal(today.requestCount, 2);
  assert.equal(today.requestCountStatus, "connected");
  assert.equal(seven.tokens, 7000);
  assert.equal(seven.requestCount, 3);
  assert.equal(thirty.tokens, 12000);
  assert.equal(thirty.requestCount, 4);

  assert.equal(usage.contextWindows[0]?.dataStatus, "connected");
  assert.equal(Math.round(usage.contextWindows[0]?.usagePercent ?? 0), 70);
  assert.equal(usage.breakdown.byAgent[0]?.label, "pandas");
  assert.equal(usage.breakdown.byAgent[0]?.requests, 4);
  assert.equal(usage.breakdown.byTask[0]?.label, "p1/t1 · pandas · session");
  assert.equal(usage.breakdown.byTask[0]?.tokens, 12000);
  assert.equal(usage.breakdown.byTask[0]?.requests, 4);
  assert.equal(usage.breakdownToday.byAgent[0]?.label, "pandas");
  assert.equal(usage.breakdownToday.byAgent[0]?.tokens, 3000);
  assert.equal(usage.breakdownToday.byAgent[0]?.requests, 2);
  assert.equal(usage.breakdownToday.byTask[0]?.tokens, 3000);
  assert(usage.breakdownToday.bySessionType[0]?.label?.startsWith("Jarvis/"));
  assert.equal(usage.connectors.requestCounts, "connected");
  assert(!usage.connectors.todos.some((item) => item.id === "request_counter"));
  assert(!usage.connectors.todos.some((item) => item.id === "context_catalog"));
});

test("usage-cost summary mode backfills period cost from runtime session events", async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), "openclaw-usage-summary-"));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const runtimeDir = join(tempRoot, "runtime");
  const digestDir = join(runtimeDir, "digests");
  const openclawHome = join(tempRoot, ".openclaw-home");
  const codexHome = join(tempRoot, ".codex-home");
  const agentSessionsDir = join(openclawHome, "agents", "main", "sessions");
  await mkdir(digestDir, { recursive: true });
  await mkdir(agentSessionsDir, { recursive: true });
  await mkdir(codexHome, { recursive: true });

  const todayIso = new Date().toISOString().slice(0, 10);
  await writeFile(
    join(digestDir, `${todayIso}.json`),
    JSON.stringify({
      date: todayIso,
      usage: {
        statuses: 1,
        totalTokensIn: 100,
        totalTokensOut: 50,
        totalCost: 0,
      },
    }),
    "utf8",
  );

  await writeFile(
    join(agentSessionsDir, "sessions.json"),
    JSON.stringify({
      "s-1": {
        sessionId: "sid-1",
        model: "gpt-5.3-codex",
        modelProvider: "OpenAI",
        contextTokens: 200000,
        totalTokens: 1500,
      },
    }),
    "utf8",
  );

  await writeFile(
    join(agentSessionsDir, "sid-1.jsonl"),
    [
      JSON.stringify({
        timestamp: new Date().toISOString(),
        type: "message",
        message: {
          role: "assistant",
          model: "gpt-5.3-codex",
          provider: "OpenAI",
          usage: {
            totalTokens: 1500,
            cost: {
              total: 4.25,
            },
          },
        },
      }),
    ].join("\n"),
    "utf8",
  );

  const snapshot = buildSnapshotFixture({
    model: "gpt-5.3-codex",
    tokensIn: 10,
    tokensOut: 5,
    cost: 0,
  });

  const tsxLoaderUrl = new URL("../node_modules/tsx/dist/loader.mjs", import.meta.url).href;
  const moduleUrl = new URL("../src/runtime/usage-cost.ts", import.meta.url).href;
  const script = [
    'const mod = await import(process.env.USAGE_COST_MODULE_URL);',
    "const buildUsageCostSnapshot = mod.buildUsageCostSnapshot ?? mod.default?.buildUsageCostSnapshot;",
    'if (typeof buildUsageCostSnapshot !== "function") throw new TypeError("buildUsageCostSnapshot export missing");',
    "const snapshot = JSON.parse(process.env.USAGE_COST_SNAPSHOT_JSON);",
    'const usage = await buildUsageCostSnapshot(snapshot, "summary");',
    'const today = usage.periods.find((item) => item.key === "today");',
    'const thirty = usage.periods.find((item) => item.key === "30d");',
    "console.log(JSON.stringify({ today, thirty }));",
  ].join(" ");

  const result = spawnSync(process.execPath, ["--import", tsxLoaderUrl, "-e", script], {
    cwd: tempRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      OPENCLAW_HOME: openclawHome,
      CODEX_HOME: codexHome,
      USAGE_COST_MODULE_URL: moduleUrl,
      USAGE_COST_SNAPSHOT_JSON: JSON.stringify(snapshot),
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout.trim()) as {
    today?: { estimatedCost?: number; tokens?: number; requestCount?: number; sourceStatus?: string };
    thirty?: { estimatedCost?: number; tokens?: number; requestCount?: number; sourceStatus?: string };
  };

  assert.equal(parsed.today?.estimatedCost, 4.25);
  assert.equal(parsed.today?.tokens, 1500);
  assert.equal(parsed.today?.requestCount, 1);
  assert.equal(parsed.today?.sourceStatus, "connected");
  assert.equal(parsed.thirty?.estimatedCost, 4.25);
});

test("usage-cost full mode prefers local Codex rate-limit windows before waiting on WHAM", async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), "openclaw-usage-full-"));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const openclawHome = join(tempRoot, ".openclaw-home");
  const codexHome = join(tempRoot, ".codex-home");
  const codexSessionDir = join(codexHome, "sessions", "2026", "03");
  await mkdir(codexSessionDir, { recursive: true });

  await writeFile(
    join(codexHome, "auth.json"),
    JSON.stringify({
      tokens: {
        access_token: "test-token",
      },
    }),
    "utf8",
  );

  await writeFile(
    join(codexSessionDir, "codex-session.jsonl"),
    JSON.stringify({
      timestamp: "2026-03-06T11:38:10.056Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        rate_limits: {
          limit_id: "codex",
          primary: { used_percent: 2, window_minutes: 300, resets_at: 1772812807 },
          secondary: { used_percent: 45, window_minutes: 10080, resets_at: 1773264817 },
          plan_type: "pro",
        },
      },
    }),
    "utf8",
  );

  const snapshot = buildSnapshotFixture({
    model: "gpt-5.3-codex",
    tokensIn: 10,
    tokensOut: 5,
    cost: 0,
  });

  const tsxLoaderUrl = new URL("../node_modules/tsx/dist/loader.mjs", import.meta.url).href;
  const moduleUrl = new URL("../src/runtime/usage-cost.ts", import.meta.url).href;
  const script = [
    "globalThis.__fetchCalls = 0;",
    "globalThis.fetch = async () => {",
    "  globalThis.__fetchCalls += 1;",
    "  await new Promise((resolve) => setTimeout(resolve, 1200));",
    "  return { ok: false, json: async () => ({}) };",
    "};",
    "const startedAt = Date.now();",
    "const mod = await import(process.env.USAGE_COST_MODULE_URL);",
    "const buildUsageCostSnapshot = mod.buildUsageCostSnapshot ?? mod.default?.buildUsageCostSnapshot;",
    'if (typeof buildUsageCostSnapshot !== "function") throw new TypeError("buildUsageCostSnapshot export missing");',
    "const snapshot = JSON.parse(process.env.USAGE_COST_SNAPSHOT_JSON);",
    'const usage = await buildUsageCostSnapshot(snapshot, "full");',
    "console.log(JSON.stringify({",
    "  durationMs: Date.now() - startedAt,",
    "  fetchCalls: globalThis.__fetchCalls,",
    "  sourcePath: usage.subscription.sourcePath,",
    "  primaryWindowLabel: usage.subscription.primaryWindowLabel,",
    "}));",
  ].join(" ");

  const result = spawnSync(process.execPath, ["--import", tsxLoaderUrl, "-e", script], {
    cwd: tempRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      OPENCLAW_HOME: openclawHome,
      CODEX_HOME: codexHome,
      USAGE_COST_MODULE_URL: moduleUrl,
      USAGE_COST_SNAPSHOT_JSON: JSON.stringify(snapshot),
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout.trim()) as {
    durationMs: number;
    fetchCalls: number;
    sourcePath?: string;
    primaryWindowLabel?: string;
  };

  assert.equal(parsed.fetchCalls, 0);
  assert(parsed.durationMs < 1000, `expected local rate-limit shortcut, got ${parsed.durationMs}ms`);
  assert.match(parsed.sourcePath ?? "", /Codex token_count rate_limits/);
  assert.equal(parsed.primaryWindowLabel, "5h");
});

test("usage-cost snapshot surfaces connected subscription consumption and remaining contract", async () => {
  const { computeUsageCostSnapshot } = await import("../src/runtime/usage-cost");
  const usage = computeUsageCostSnapshot(buildSnapshotFixture(), [], [], undefined, {
    status: "connected",
    planLabel: "Pro Monthly",
    consumed: 120,
    remaining: 80,
    limit: 200,
    usagePercent: 60,
    unit: "USD",
    cycleStart: "2026-03-01",
    cycleEnd: "2026-03-31",
    sourcePath: "/tmp/subscription.json",
    detail: "Used 120 USD. Remaining 80 USD.",
    connectHint: "Provide one of: /tmp/subscription.json",
    reasonCode: "provider_connected",
  });

  assert.equal(usage.subscription.status, "connected");
  assert.equal(usage.subscription.remaining, 80);
  assert.equal(usage.subscription.cycleEnd, "2026-03-31");
  assert.equal(usage.connectors.subscriptionUsage, "connected");
  assert(!usage.connectors.todos.some((item) => item.id === "subscription_usage"));
});

test("usage-cost snapshot surfaces unavailable subscription with explicit connector todo", async () => {
  const { computeUsageCostSnapshot } = await import("../src/runtime/usage-cost");
  const usage = computeUsageCostSnapshot(buildSnapshotFixture(), [], [], undefined, {
    status: "not_connected",
    planLabel: "Not connected",
    unit: "USD",
    detail: "Subscription usage source is not connected.",
    connectHint: "Provide one of: /tmp/subscription.json",
  });

  assert.equal(usage.subscription.status, "not_connected");
  assert.equal(usage.connectors.subscriptionUsage, "not_connected");
  assert(usage.connectors.todos.some((item) => item.id === "subscription_usage"));
  assert(usage.connectors.todos.some((item) => item.detail.includes("/tmp/subscription.json")));
});

test("usage-cost wham parser surfaces real Codex App quota windows", async () => {
  const { parseCodexWhamUsageResponseForSmoke } = await import("../src/runtime/usage-cost");
  const usage = parseCodexWhamUsageResponseForSmoke({
    plan_type: "team",
    rate_limit: {
      primary_window: {
        used_percent: 41,
        limit_window_seconds: 18_000,
        reset_at: 1_778_675_162,
      },
      secondary_window: {
        used_percent: 25,
        limit_window_seconds: 604_800,
        reset_at: 1_779_228_684,
      },
    },
  });

  assert(usage);
  assert.equal(usage.status, "connected");
  assert.equal(usage.primaryWindowLabel, "5h");
  assert.equal(usage.primaryUsedPercent, 41);
  assert.equal(usage.primaryRemainingPercent, 59);
  assert.equal(usage.secondaryWindowLabel, "7d");
  assert.equal(usage.secondaryUsedPercent, 25);
  assert.equal(usage.secondaryRemainingPercent, 75);
});

test("usage-cost snapshot backfills subscription consumed from runtime usage when provider snapshot is missing", async () => {
  const { computeUsageCostSnapshot } = await import("../src/runtime/usage-cost");
  const now = Date.now();
  const usage = computeUsageCostSnapshot(
    buildSnapshotFixture({
      cost: 0,
    }),
    [],
    [],
    {
      sourceStatus: "connected",
      sessionContexts: [
        {
          sessionKey: "s-1",
          sessionId: "sid-1",
          agentId: "pandas",
        },
      ],
      events: [runtimeEvent(now, 1000, 1), runtimeEvent(now - 30 * 60 * 1000, 1200, 2)],
    },
  );

  assert.equal(usage.subscription.status, "not_connected");
  assert.equal(usage.subscription.consumed, 3);
  assert.equal(usage.subscription.remaining, undefined);
  assert.equal(usage.subscription.limit, undefined);
  assert(usage.subscription.detail.includes("Provider remaining/limit cannot be derived"));
  assert.equal(usage.subscription.reasonCode, "runtime_backfill_only");
  assert(usage.subscription.sourcePath?.replace(/\\/g, "/").includes("sessions/*.jsonl"));
  assert.equal(usage.connectors.subscriptionUsage, "not_connected");
  assert(
    usage.connectors.todos.some(
      (item) =>
        item.id === "subscription_usage" &&
        item.detail.includes("Provider remaining/limit cannot be derived"),
    ),
  );
});

test("usage-cost snapshot backfills subscription limit and remaining from budget when provider snapshot is missing", async () => {
  const { computeUsageCostSnapshot } = await import("../src/runtime/usage-cost");
  const now = Date.now();
  const usage = computeUsageCostSnapshot(
    buildSnapshotFixture({
      cost: 0,
      costLimit: 10,
    }),
    [],
    [],
    {
      sourceStatus: "connected",
      sessionContexts: [
        {
          sessionKey: "s-1",
          sessionId: "sid-1",
          agentId: "pandas",
        },
      ],
      events: [runtimeEvent(now, 1000, 1), runtimeEvent(now - 30 * 60 * 1000, 1200, 2)],
    },
  );

  assert.equal(usage.subscription.status, "not_connected");
  assert.equal(usage.subscription.planLabel, "Estimated budget envelope");
  assert.equal(usage.subscription.consumed, 3);
  assert.equal(usage.subscription.limit, 10);
  assert.equal(usage.subscription.remaining, 7);
  assert.equal(usage.subscription.usagePercent, 30);
  assert(usage.subscription.sourcePath?.includes("budgetSummary"));
  assert(usage.subscription.detail.includes("Remaining/limit are derived from configured 30d cost budget"));
  assert.equal(usage.connectors.subscriptionUsage, "not_connected");
  assert(usage.connectors.todos.some((item) => item.id === "subscription_usage"));
});

test("usage-cost snapshot reports session-type share and cron-job share from deduped session totals", async () => {
  const { computeUsageCostSnapshot } = await import("../src/runtime/usage-cost");
  const usage = computeUsageCostSnapshot(
    buildSnapshotFixture(),
    [],
    [],
    {
      sourceStatus: "connected",
      sessionContexts: [
        {
          sessionKey: "agent:main:cron:job-a",
          sessionId: "sid-1",
          agentId: "main",
          totalTokens: 1000,
        },
        {
          sessionKey: "agent:main:cron:job-a:run:r-1",
          sessionId: "sid-1",
          agentId: "main",
          totalTokens: 1000,
        },
        {
          sessionKey: "agent:main:discord:channel:123",
          sessionId: "sid-2",
          agentId: "main",
          totalTokens: 100,
          channel: "discord",
        },
        {
          sessionKey: "agent:coq:telegram:direct:123",
          sessionId: "sid-3",
          agentId: "coq",
          totalTokens: 50,
          channel: "telegram",
        },
        {
          sessionKey: "agent:main:main",
          sessionId: "sid-4",
          agentId: "main",
          totalTokens: 25,
        },
      ],
      events: [],
    },
    undefined,
    new Map([["job-a", "job-alpha"]]),
  );

  const byType = usage.breakdown.bySessionType;
  assert.equal(byType.find((item) => item.label === "Cron")?.tokens, 1000);
  assert.equal(byType.find((item) => item.label === "Discord")?.tokens, 100);
  assert.equal(byType.find((item) => item.label === "Telegram")?.tokens, 50);
  assert.equal(byType.find((item) => item.label.startsWith("Jarvis/"))?.tokens, 25);

  const cronTop = usage.breakdown.byCronJob[0];
  assert(cronTop);
  assert.equal(cronTop.tokens, 1000);
  assert(cronTop.label.includes("job-alpha"));
  assert(cronTop.label.includes("job-a"));
  assert.equal(cronTop.sessions, 1);
  assert.equal(usage.breakdown.byCronAgent[0]?.label, "main");
  assert.equal(usage.breakdown.byCronAgent[0]?.tokens, 1000);
});

test("codex rate-limit parser prefers canonical codex window over model-specific window", async () => {
  const { parseCodexRateLimitFromSessionLogForSmoke } = await import("../src/runtime/usage-cost");

  const raw = [
    JSON.stringify({
      timestamp: "2026-03-06T11:38:10.057Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        rate_limits: {
          limit_id: "codex_bengalfox",
          limit_name: "GPT-5.3-Codex-Spark",
          primary: { used_percent: 0, window_minutes: 300, resets_at: 1772809458 },
          secondary: { used_percent: 2, window_minutes: 10080, resets_at: 1773249479 },
          plan_type: "pro",
        },
      },
    }),
    JSON.stringify({
      timestamp: "2026-03-06T11:38:10.056Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        rate_limits: {
          limit_id: "codex",
          limit_name: null,
          primary: { used_percent: 2, window_minutes: 300, resets_at: 1772812807 },
          secondary: { used_percent: 45, window_minutes: 10080, resets_at: 1773264817 },
          plan_type: "pro",
        },
      },
    }),
  ].join("\n");

  const parsed = parseCodexRateLimitFromSessionLogForSmoke(raw, "/tmp/codex.jsonl", Date.parse("2026-03-06T11:40:00.000Z"));
  assert(parsed, "expected parsed codex rate-limit snapshot");
  assert.equal(parsed.primaryUsedPercent, 2);
  assert.equal(parsed.secondaryUsedPercent, 45);
  assert.equal(parsed.primaryResetAt, "2026-03-06T16:00:07.000Z");
  assert.equal(parsed.secondaryResetAt, "2026-03-11T21:33:37.000Z");
  assert.equal(parsed.detail, "codex");
});

test("codex rate-limit parser falls back to model-specific window when canonical codex window is absent", async () => {
  const { parseCodexRateLimitFromSessionLogForSmoke } = await import("../src/runtime/usage-cost");

  const raw = JSON.stringify({
    timestamp: "2026-03-06T11:38:10.057Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      rate_limits: {
        limit_id: "codex_bengalfox",
        limit_name: "GPT-5.3-Codex-Spark",
        primary: { used_percent: 0, window_minutes: 300, resets_at: 1772809458 },
        secondary: { used_percent: 2, window_minutes: 10080, resets_at: 1773249479 },
        plan_type: "pro",
      },
    },
  });

  const parsed = parseCodexRateLimitFromSessionLogForSmoke(raw, "/tmp/codex.jsonl", Date.parse("2026-03-06T11:40:00.000Z"));
  assert(parsed, "expected parsed model-specific codex rate-limit snapshot");
  assert.equal(parsed.primaryUsedPercent, 0);
  assert.equal(parsed.secondaryUsedPercent, 2);
  assert.equal(parsed.detail, "codex_bengalfox");
});

test("codex rate-limit parser snaps near-week windows to a stable weekly label", async () => {
  const { parseCodexRateLimitFromSessionLogForSmoke } = await import("../src/runtime/usage-cost");

  const raw = JSON.stringify({
    timestamp: "2026-03-10T23:25:35.000Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      rate_limits: {
        limit_id: "codex",
        primary: { used_percent: 0, window_minutes: 300, resets_at: 1773228605 },
        secondary: { used_percent: 1, window_minutes: 10081, resets_at: 1773815465 },
        plan_type: "pro",
      },
    },
  });

  const parsed = parseCodexRateLimitFromSessionLogForSmoke(raw, "/tmp/codex.jsonl", Date.parse("2026-03-10T23:26:00.000Z"));
  assert(parsed, "expected parsed codex rate-limit snapshot");
  assert.equal(parsed.primaryWindowLabel, "5h");
  assert.equal(parsed.secondaryWindowLabel, "7d");
});

function buildSnapshotFixture(overrides?: {
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  costLimit?: number;
}): ReadModelSnapshot {
  const now = new Date().toISOString();
  const model = overrides?.model;
  const tokensIn = overrides?.tokensIn ?? 2000;
  const tokensOut = overrides?.tokensOut ?? 300;
  const cost = overrides?.cost ?? 2;
  const costLimit = overrides?.costLimit;

  return {
    sessions: [
      {
        sessionKey: "s-1",
        agentId: "pandas",
        label: "Pandas Session",
        state: "running",
        lastMessageAt: now,
      },
    ],
    statuses: [
      {
        sessionKey: "s-1",
        model,
        tokensIn,
        tokensOut,
        cost,
        updatedAt: now,
      },
    ],
    cronJobs: [],
    approvals: [],
    projects: {
      updatedAt: now,
      projects: [
        {
          projectId: "p1",
          title: "Project One",
          status: "active",
          owner: "pandas",
          budget: {},
          updatedAt: now,
        },
      ],
    },
    projectSummaries: [
      {
        projectId: "p1",
        title: "Project One",
        status: "active",
        owner: "pandas",
        totalTasks: 1,
        todo: 0,
        inProgress: 1,
        blocked: 0,
        done: 0,
        due: 0,
        updatedAt: now,
      },
    ],
    tasks: {
      updatedAt: now,
      agentBudgets: [],
      tasks: [
        {
          projectId: "p1",
          taskId: "t1",
          title: "Task One",
          status: "in_progress",
          owner: "pandas",
          definitionOfDone: [],
          artifacts: [],
          rollback: {
            strategy: "none",
            steps: [],
          },
          sessionKeys: ["s-1"],
          budget: {},
          updatedAt: now,
        },
      ],
    },
    tasksSummary: {
      projects: 1,
      tasks: 1,
      todo: 0,
      inProgress: 1,
      blocked: 0,
      done: 0,
      owners: 1,
      artifacts: 0,
    },
    budgetSummary: {
      total: costLimit ? 1 : 0,
      ok: costLimit ? 1 : 0,
      warn: 0,
      over: 0,
      evaluations: costLimit
        ? [
            {
              scope: "agent",
              scopeId: "pandas",
              label: "Pandas",
              thresholds: {
                cost: costLimit,
              },
              usage: {
                tokensIn,
                tokensOut,
                totalTokens: tokensIn + tokensOut,
                cost,
              },
              metrics: [
                {
                  metric: "cost",
                  used: cost,
                  limit: costLimit,
                  warnAt: costLimit * 0.8,
                  status: "ok",
                },
              ],
              status: "ok",
            },
          ]
        : [],
    },
    generatedAt: now,
  };
}

function runtimeEvent(timestampMs: number, tokens: number, cost: number) {
  const timestamp = new Date(timestampMs).toISOString();
  return {
    timestamp,
    day: timestamp.slice(0, 10),
    sessionId: "sid-1",
    sessionKey: "s-1",
    agentId: "pandas",
    model: "gpt-5.3-codex",
    provider: "OpenAI",
    tokens,
    cost,
  };
}
