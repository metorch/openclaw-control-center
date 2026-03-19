import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  invalidateOpenClawCliInvocationCache,
  probeOpenClawGatewayHealth,
  resolveOpenClawCliInvocation,
} from "../src/runtime/openclaw-cli";

test("resolveOpenClawCliInvocation maps Windows npm shim to node module entrypoint", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-cli-"));
  try {
    const binDir = join(root, "bin");
    const packageDir = join(binDir, "node_modules", "openclaw");
    await mkdir(packageDir, { recursive: true });
    await writeFile(join(binDir, "openclaw.cmd"), "@echo off\r\n", "utf8");
    await writeFile(join(packageDir, "openclaw.mjs"), "console.log('ok');\n", "utf8");

    const resolved = await resolveOpenClawCliInvocation({
      platform: "win32",
      pathEnv: binDir,
    });

    assert.equal(resolved.command, process.execPath);
    assert.deepEqual(resolved.prefixArgs, [join(packageDir, "openclaw.mjs")]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("resolveOpenClawCliInvocation keeps bare command on non-Windows platforms", async () => {
  const resolved = await resolveOpenClawCliInvocation({
    platform: "linux",
    pathEnv: "",
  });

  assert.equal(resolved.command, "openclaw");
  assert.deepEqual(resolved.prefixArgs, []);
});

test("probeOpenClawGatewayHealth returns ok when CLI health probe succeeds", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-health-ok-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    await writeFile(
      scriptPath,
      [
        "const args = process.argv.slice(2);",
        "if (args[0] === 'health') {",
        "  console.log(JSON.stringify({ ok: true, rpc: { ok: true } }));",
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

    const result = await probeOpenClawGatewayHealth({ timeoutMs: 750 });

    assert.equal(result.ok, true);
    assert.equal((result.rawJson as { ok?: unknown } | undefined)?.ok, true);
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    invalidateOpenClawCliInvocationCache();
    await rm(root, { recursive: true, force: true });
  }
});

test("probeOpenClawGatewayHealth surfaces gateway connectivity failures cleanly", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-health-fail-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  try {
    const scriptPath = join(root, "fake-openclaw.mjs");
    await writeFile(
      scriptPath,
      [
        "console.error('gateway not connected');",
        "process.exit(1);",
        "",
      ].join("\n"),
      "utf8",
    );
    process.env.OPENCLAW_CLI_PATH = scriptPath;
    invalidateOpenClawCliInvocationCache();

    const result = await probeOpenClawGatewayHealth({ timeoutMs: 750 });

    assert.equal(result.ok, false);
    assert.match(result.failureReason ?? "", /gateway is unavailable/i);
    assert.match(result.rawText, /gateway not connected/i);
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    invalidateOpenClawCliInvocationCache();
    await rm(root, { recursive: true, force: true });
  }
});

test("probeOpenClawGatewayHealth identifies missing CLI binaries before dispatch", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-health-missing-"));
  const previousCliPath = process.env.OPENCLAW_CLI_PATH;
  try {
    process.env.OPENCLAW_CLI_PATH = join(root, "missing-openclaw");
    invalidateOpenClawCliInvocationCache();

    const result = await probeOpenClawGatewayHealth({ timeoutMs: 750 });

    assert.equal(result.ok, false);
    assert.match(result.failureReason ?? "", /CLI is unavailable/i);
    assert.match(result.failureReason ?? "", /ENOENT/i);
  } finally {
    process.env.OPENCLAW_CLI_PATH = previousCliPath;
    invalidateOpenClawCliInvocationCache();
    await rm(root, { recursive: true, force: true });
  }
});
