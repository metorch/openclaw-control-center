import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  invalidateOpenClawCliInsightsCache,
  loadCachedOpenClawConnectionSummary,
  loadCachedOpenClawUpdateSummary,
  recoverOpenClawCommandJson,
  summarizeOpenClawConnection,
  summarizeOpenClawMemory,
  summarizeOpenClawSecurity,
  summarizeOpenClawUpdate,
} from "../src/runtime/openclaw-cli-insights";
import { invalidateOpenClawCliInvocationCache } from "../src/runtime/openclaw-cli";

test("summarizeOpenClawConnection reports gateway, config, runtime, and blocked states", () => {
  const summary = summarizeOpenClawConnection(
    {
      sessions: { count: 12 },
      agents: { agents: [{ agentId: "main", sessionsCount: 12 }, { agentId: "coq", sessionsCount: 0 }] },
    },
    {
      service: { runtime: { status: "running" } },
      rpc: { ok: true },
      gateway: { probeUrl: "ws://127.0.0.1:18789" },
      config: {
        cli: { exists: true, valid: true, controlUi: { allowedOrigins: ["https://example.com"] } },
        daemon: { exists: true, valid: true },
      },
    },
  );

  assert.equal(summary.status, "ok");
  assert.equal(summary.items[0]?.key, "gateway");
  assert.equal(summary.items[0]?.status, "ok");
  assert.equal(summary.items[1]?.key, "config");
  assert.equal(summary.items[1]?.value, "Ready");
  assert.equal(summary.items[2]?.key, "runtime");
  assert.equal(summary.items[2]?.value, "12");
});

test("summarizeOpenClawUpdate distinguishes current and latest versions", () => {
  const summary = summarizeOpenClawUpdate(
    { runtimeVersion: "2026.3.11" },
    {
      update: { installKind: "package", packageManager: "pnpm", registry: { latestVersion: "2026.3.12" } },
      channel: { label: "stable (default)" },
      availability: { available: true, latestVersion: "2026.3.12" },
    },
  );

  assert.equal(summary.status, "info");
  assert.equal(summary.currentVersion, "2026.3.11");
  assert.equal(summary.latestVersion, "2026.3.12");
  assert.equal(summary.updateAvailable, true);
  assert.equal(summary.channelLabel, "stable (default)");
});

test("summarizeOpenClawConnection and update keep loading semantics when status payload is missing", () => {
  const connection = summarizeOpenClawConnection(
    {},
    {
      service: { runtime: { status: "running" } },
      rpc: { ok: true },
      gateway: { probeUrl: "ws://127.0.0.1:18789" },
      config: {
        cli: { exists: true, valid: true, controlUi: { allowedOrigins: ["https://example.com"] } },
        daemon: { exists: true, valid: true },
      },
    },
  );
  const update = summarizeOpenClawUpdate(
    {},
    {
      availability: { available: true, latestVersion: "2026.3.12" },
      channel: { label: "stable (default)" },
    },
  );

  assert.equal(connection.items[2]?.status, "info");
  assert.equal(connection.items[2]?.value, "loading");
  assert.equal(connection.items[2]?.detail, "Runtime status is still loading");
  assert.equal(update.status, "info");
  assert.equal(update.currentVersion, undefined);
  assert.equal(update.latestVersion, "2026.3.12");
});

test("summarizeOpenClawConnection keeps gateway and config in loading state when gateway payload is missing", () => {
  const connection = summarizeOpenClawConnection(
    {
      sessions: { count: 10 },
      agents: { agents: [{ agentId: "main", sessionsCount: 10 }] },
    },
    {},
  );

  assert.equal(connection.status, "info");
  assert.deepEqual(
    connection.items.map((item) => ({ key: item.key, status: item.status, value: item.value, detail: item.detail })),
    [
      {
        key: "gateway",
        status: "info",
        value: "loading",
        detail: "Gateway status is still loading",
      },
      {
        key: "config",
        status: "info",
        value: "loading",
        detail: "Config status is still loading",
      },
      {
        key: "runtime",
        status: "ok",
        value: "10",
        detail: "10 sessions visible across 1 agent",
      },
    ],
  );
});

test("summarizeOpenClawSecurity keeps counts and remediation", () => {
  const summary = summarizeOpenClawSecurity({
    summary: { critical: 1, warn: 2, info: 1 },
    findings: [
      {
        checkId: "gateway.trusted_proxies_missing",
        severity: "warn",
        title: "Reverse proxy headers are not trusted",
        detail: "gateway.trustedProxies is empty",
        remediation: "Set trusted proxies",
      },
    ],
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.counts.critical, 1);
  assert.equal(summary.counts.warn, 2);
  assert.equal(summary.findings[0]?.remediation, "Set trusted proxies");
});

test("summarizeOpenClawMemory classifies searchable, warning, and blocked agents", () => {
  const summary = summarizeOpenClawMemory([
    {
      agentId: "main",
      status: {
        files: 12,
        chunks: 12,
        dirty: false,
        vector: { available: true },
        custom: { qmd: { lastUpdateAt: "2026-03-12T10:00:00.000Z" } },
      },
      scan: { issues: [] },
    },
    {
      agentId: "coq",
      status: {
        files: 4,
        chunks: 4,
        dirty: true,
        vector: { available: true },
      },
      scan: { issues: [] },
    },
    {
      agentId: "otter",
      status: {
        files: 0,
        chunks: 0,
        dirty: false,
        vector: { available: false },
      },
      scan: { issues: [{ code: "missing" }] },
    },
  ]);

  assert.equal(summary.status, "blocked");
  assert.equal(summary.okCount, 1);
  assert.equal(summary.warnCount, 1);
  assert.equal(summary.blockedCount, 1);
  assert.equal(summary.agents[0]?.agentId, "otter");
  assert.equal(summary.agents[2]?.agentId, "main");
});

test("recoverOpenClawCommandJson keeps valid stdout JSON from failed commands", () => {
  const recovered = recoverOpenClawCommandJson({
    code: 1,
    stdout: '{ "runtimeVersion": "2026.3.11" }',
  });

  assert.deepEqual(recovered, { runtimeVersion: "2026.3.11" });
  assert.equal(recoverOpenClawCommandJson({ code: 1, stdout: "not-json" }), undefined);
});

test("recoverOpenClawCommandJson extracts JSON after plugin log prelude", () => {
  const recovered = recoverOpenClawCommandJson({
    code: 1,
    stdout: `[plugins] [lcm] Plugin loaded (enabled=true)
[plugins] [lcm] Plugin loaded (enabled=true)
{ "rpc": { "ok": true }, "config": { "cli": { "exists": true, "valid": true } } }`,
  });

  assert.deepEqual(recovered, {
    rpc: { ok: true },
    config: { cli: { exists: true, valid: true } },
  });
});

test("cli insights keep settings connection and update healthy when cold-start probes are slow but still within guarded budgets", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-cli-insights-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    await writeFile(
      scriptPath,
      [
        "const args = process.argv.slice(2);",
        "const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));",
        "const print = (payload) => console.log(JSON.stringify(payload));",
        "if (args[0] === 'status' && args[1] === '--json') {",
        "  await sleep(8500);",
        "  print({ runtimeVersion: '2026.3.24', sessions: { count: 9 }, agents: { agents: [{ agentId: 'main', sessionsCount: 9 }] } });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'gateway' && args[1] === 'status' && args[2] === '--json') {",
        "  await sleep(12500);",
        "  print({",
        "    service: { runtime: { status: 'running' } },",
        "    rpc: { ok: true },",
        "    gateway: { probeUrl: 'ws://127.0.0.1:18789' },",
        "    config: { cli: { exists: true, valid: true }, daemon: { exists: true, valid: true } }",
        "  });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'update' && args[1] === 'status' && args[2] === '--json') {",
        "  await sleep(8500);",
        "  print({",
        "    update: { installKind: 'package', packageManager: 'pnpm', registry: { latestVersion: '2026.3.24' } },",
        "    channel: { label: 'stable (default)' },",
        "    availability: { available: false, latestVersion: '2026.3.24' }",
        "  });",
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
    invalidateOpenClawCliInsightsCache();

    const [connection, update] = await Promise.all([
      loadCachedOpenClawConnectionSummary(),
      loadCachedOpenClawUpdateSummary(),
    ]);

    assert.equal(connection.status, "ok");
    assert.equal(connection.items[0]?.status, "ok");
    assert.equal(connection.items[1]?.status, "ok");
    assert.equal(connection.items[2]?.value, "9");
    assert.equal(update.status, "ok");
    assert.equal(update.currentVersion, "2026.3.24");
    assert.equal(update.latestVersion, "2026.3.24");
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    invalidateOpenClawCliInvocationCache();
    invalidateOpenClawCliInsightsCache();
    await rm(root, { recursive: true, force: true });
  }
});

test("cli insights keep slow probe caches warm from completion time instead of request start", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-cli-insights-cache-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  const previousCountPath = process.env.OPENCLAW_CLI_TEST_COUNT_PATH;
  const previousNow = Date.now;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    const countPath = join(root, "invocations.log");
    await writeFile(
      scriptPath,
      [
        "import { appendFileSync } from 'node:fs';",
        "const args = process.argv.slice(2);",
        "const countPath = process.env.OPENCLAW_CLI_TEST_COUNT_PATH;",
        "if (countPath) appendFileSync(countPath, args.join(' ') + '\\n');",
        "const print = (payload) => console.log(JSON.stringify(payload));",
        "if (args[0] === 'status' && args[1] === '--json') {",
        "  print({ runtimeVersion: '2026.3.24', sessions: { count: 3 }, agents: { agents: [{ agentId: 'main', sessionsCount: 3 }] } });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'gateway' && args[1] === 'status' && args[2] === '--json') {",
        "  print({ service: { runtime: { status: 'running' } }, rpc: { ok: true }, gateway: { probeUrl: 'ws://127.0.0.1:18789' }, config: { cli: { exists: true, valid: true }, daemon: { exists: true, valid: true } } });",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(1);",
        "",
      ].join("\n"),
      "utf8",
    );

    const fakeNowValues = [1000, 1000, 20_000, 20_000, 20_010, 20_010];
    let lastNow = fakeNowValues[fakeNowValues.length - 1] ?? 20_010;
    Date.now = () => {
      if (fakeNowValues.length > 0) {
        lastNow = fakeNowValues.shift() ?? lastNow;
      }
      return lastNow;
    };

    process.env.OPENCLAW_CLI_PATH = scriptPath;
    process.env.OPENCLAW_CLI_TEST_COUNT_PATH = countPath;
    invalidateOpenClawCliInvocationCache();
    invalidateOpenClawCliInsightsCache();

    await loadCachedOpenClawConnectionSummary();
    await loadCachedOpenClawConnectionSummary();

    const invocations = (await readFile(countPath, "utf8")).trim().split(/\r?\n/).filter(Boolean);
    assert.equal(invocations.length, 2);
    assert(invocations.includes("status --json"));
    assert(invocations.includes("gateway status --json"));
  } finally {
    Date.now = previousNow;
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    process.env.OPENCLAW_CLI_TEST_COUNT_PATH = previousCountPath;
    invalidateOpenClawCliInvocationCache();
    invalidateOpenClawCliInsightsCache();
    await rm(root, { recursive: true, force: true });
  }
});
