import assert from "node:assert/strict";
import { readFile, rm, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildOpenClawEmployeeDispatchFailureMessage,
  invalidateOpenClawEmployeeContractCache,
  loadCachedOpenClawEmployeeContractSummary,
  summarizeOpenClawEmployeeContract,
} from "../src/runtime/openclaw-employee-contract";
import { invalidateOpenClawCliInvocationCache } from "../src/runtime/openclaw-cli";

test("employee contract summary stays healthy when guarded surfaces are present", () => {
  const summary = summarizeOpenClawEmployeeContract({
    versionProbe: {
      ok: true,
      text: "OpenClaw 2026.3.24 (cff6dc9)",
    },
    statusProbe: {
      ok: true,
      rawText: "",
      json: {
        runtimeVersion: "2026.3.24",
        gateway: {
          reachable: true,
          self: { version: "2026.3.24" },
        },
      },
    },
    gatewayStatusProbe: {
      ok: true,
      rawText: "",
      json: {
        rpc: { ok: true, url: "ws://127.0.0.1:18789" },
        gateway: { probeUrl: "ws://127.0.0.1:18789" },
      },
    },
    sessionsProbe: {
      ok: true,
      rawText: "",
      json: { sessions: [] },
    },
    cronListProbe: {
      ok: true,
      rawText: "",
      json: { jobs: [] },
    },
    approvalsProbe: {
      ok: true,
      rawText: "",
      json: { path: "C:\\Users\\demo\\.openclaw\\exec-approvals.json", exists: true },
    },
    agentHelpProbe: {
      ok: true,
      text: "Usage: openclaw agent [options]\n--agent\n--message\n--session-id\n--json\n--timeout",
    },
  });

  assert.equal(summary.status, "ok");
  assert.equal(summary.readReady, true);
  assert.equal(summary.dispatchReady, true);
  assert.equal(summary.abortReady, true);
  assert.equal(summary.items.find((item) => item.key === "agent-help")?.status, "ok");
});

test("employee contract summary blocks dispatch when the guarded agent CLI flags disappear", () => {
  const summary = summarizeOpenClawEmployeeContract({
    versionProbe: {
      ok: true,
      text: "OpenClaw 2026.3.24 (cff6dc9)",
    },
    statusProbe: {
      ok: true,
      rawText: "",
      json: {
        runtimeVersion: "2026.3.24",
        gateway: {
          reachable: true,
          self: { version: "2026.3.24" },
        },
      },
    },
    gatewayStatusProbe: {
      ok: true,
      rawText: "",
      json: {
        rpc: { ok: true },
        gateway: { probeUrl: "ws://127.0.0.1:18789" },
      },
    },
    sessionsProbe: {
      ok: true,
      rawText: "",
      json: { sessions: [] },
    },
    cronListProbe: {
      ok: true,
      rawText: "",
      json: { jobs: [] },
    },
    approvalsProbe: {
      ok: true,
      rawText: "",
      json: { exists: true },
    },
    agentHelpProbe: {
      ok: true,
      text: "Usage: openclaw agent [options]\n--agent\n--message\n--json\n--timeout",
    },
  });

  assert.equal(summary.status, "blocked");
  assert.equal(summary.dispatchReady, false);
  assert.match(summary.blockingReasons[0] ?? "", /--session-id/);
  assert.match(buildOpenClawEmployeeDispatchFailureMessage(summary), /阻止当前分发/);
});

test("employee contract summary warns when OpenClaw moves outside the validated year train", () => {
  const summary = summarizeOpenClawEmployeeContract({
    versionProbe: {
      ok: true,
      text: "OpenClaw 2027.1.2 (future)",
    },
    statusProbe: {
      ok: true,
      rawText: "",
      json: {
        runtimeVersion: "2027.1.2",
        gateway: {
          reachable: true,
          self: { version: "2027.1.2" },
        },
      },
    },
    gatewayStatusProbe: {
      ok: true,
      rawText: "",
      json: {
        rpc: { ok: true },
      },
    },
    sessionsProbe: {
      ok: true,
      rawText: "",
      json: { sessions: [] },
    },
    cronListProbe: {
      ok: true,
      rawText: "",
      json: { jobs: [] },
    },
    approvalsProbe: {
      ok: true,
      rawText: "",
      json: { exists: true },
    },
    agentHelpProbe: {
      ok: true,
      text: "Usage: openclaw agent [options]\n--agent\n--message\n--session-id\n--json\n--timeout",
    },
  });

  assert.equal(summary.status, "warn");
  assert.equal(summary.dispatchReady, true);
  assert.match(summary.warnings[0] ?? "", /validated 2026 compatibility train/);
});

test("employee contract probe stays ready when slower OpenClaw 3.24 commands still finish inside command-specific budgets", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-employee-contract-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  const previousForceHelpProbe = process.env.OPENCLAW_EMPLOYEE_CONTRACT_FORCE_HELP_PROBE;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    await writeFile(
      scriptPath,
      [
        "const args = process.argv.slice(2);",
        "const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));",
        "const print = (payload) => console.log(JSON.stringify(payload));",
        "if (args[0] === '--version') {",
        "  console.log('OpenClaw 2026.3.24 (fake)');",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'status' && args[1] === '--json') {",
        "  await sleep(120);",
        "  print({ runtimeVersion: '2026.3.24', gateway: { reachable: true, self: { version: '2026.3.24' } } });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'gateway' && args[1] === 'status' && args[2] === '--json') {",
        "  await sleep(12500);",
        "  print({ rpc: { ok: true, url: 'ws://127.0.0.1:18789' }, gateway: { probeUrl: 'ws://127.0.0.1:18789' } });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'sessions' && args[1] === '--json') {",
        "  await sleep(6200);",
        "  print({ sessions: [{ key: 'agent:main:main' }] });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'cron' && args[1] === 'list' && args[2] === '--json') {",
        "  await sleep(120);",
        "  print({ jobs: [{ id: 'job-1' }] });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'approvals' && args[1] === 'get' && args[2] === '--json') {",
        "  await sleep(6100);",
        "  print({ exists: true, path: 'C:/Users/demo/.openclaw/exec-approvals.json' });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'agent' && args[1] === '--help') {",
        "  console.log('Usage: openclaw agent [options]\\n--agent\\n--message\\n--session-id\\n--json\\n--timeout');",
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

    const summary = await loadCachedOpenClawEmployeeContractSummary();

    assert.equal(summary.status, "ok");
    assert.equal(summary.readReady, true);
    assert.equal(summary.dispatchReady, true);
    assert.equal(summary.abortReady, true);
    assert.equal(summary.items.find((item) => item.key === "gateway-rpc")?.status, "ok");
    assert.equal(summary.items.find((item) => item.key === "sessions-json")?.status, "ok");
    assert.equal(summary.items.find((item) => item.key === "approvals-json")?.status, "ok");
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    process.env.OPENCLAW_EMPLOYEE_CONTRACT_FORCE_HELP_PROBE = previousForceHelpProbe;
    invalidateOpenClawCliInvocationCache();
    invalidateOpenClawEmployeeContractCache();
    await rm(root, { recursive: true, force: true });
  }
});

test("employee contract cache stays warm from probe completion time", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-employee-contract-cache-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  const previousForceHelpProbe = process.env.OPENCLAW_EMPLOYEE_CONTRACT_FORCE_HELP_PROBE;
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
        "if (args[0] === '--version') {",
        "  console.log('OpenClaw 2026.3.24 (fake)');",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'status' && args[1] === '--json') {",
        "  print({ runtimeVersion: '2026.3.24', gateway: { reachable: true, self: { version: '2026.3.24' } } });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'gateway' && args[1] === 'status' && args[2] === '--json') {",
        "  print({ rpc: { ok: true }, gateway: { probeUrl: 'ws://127.0.0.1:18789' } });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'sessions' && args[1] === '--json') {",
        "  print({ sessions: [] });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'cron' && args[1] === 'list' && args[2] === '--json') {",
        "  print({ jobs: [] });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'approvals' && args[1] === 'get' && args[2] === '--json') {",
        "  print({ exists: true, path: 'C:/Users/demo/.openclaw/exec-approvals.json' });",
        "  process.exit(0);",
        "}",
        "if (args[0] === 'agent' && args[1] === '--help') {",
        "  console.log('Usage: openclaw agent [options]\\n--agent\\n--message\\n--session-id\\n--json\\n--timeout');",
        "  process.exit(0);",
        "}",
        "console.error('unexpected args: ' + args.join(' '));",
        "process.exit(1);",
        "",
      ].join("\n"),
      "utf8",
    );

    const fakeNowValues = [1000, 20_000, 20_010];
    let lastNow = fakeNowValues[fakeNowValues.length - 1] ?? 20_010;
    Date.now = () => {
      if (fakeNowValues.length > 0) {
        lastNow = fakeNowValues.shift() ?? lastNow;
      }
      return lastNow;
    };

    process.env.OPENCLAW_CLI_PATH = scriptPath;
    process.env.OPENCLAW_EMPLOYEE_CONTRACT_FORCE_HELP_PROBE = "1";
    process.env.OPENCLAW_CLI_TEST_COUNT_PATH = countPath;
    invalidateOpenClawCliInvocationCache();
    invalidateOpenClawEmployeeContractCache();

    await loadCachedOpenClawEmployeeContractSummary();
    await loadCachedOpenClawEmployeeContractSummary();

    const invocations = (await readFile(countPath, "utf8")).trim().split(/\r?\n/).filter(Boolean);
    assert.equal(invocations.length, 7);
    assert(invocations.includes("--version"));
    assert(invocations.includes("agent --help"));
  } finally {
    Date.now = previousNow;
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    process.env.OPENCLAW_EMPLOYEE_CONTRACT_FORCE_HELP_PROBE = previousForceHelpProbe;
    process.env.OPENCLAW_CLI_TEST_COUNT_PATH = previousCountPath;
    invalidateOpenClawCliInvocationCache();
    invalidateOpenClawEmployeeContractCache();
    await rm(root, { recursive: true, force: true });
  }
});
