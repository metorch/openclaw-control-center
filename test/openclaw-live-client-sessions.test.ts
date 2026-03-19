import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { OpenClawLiveClient } from "../src/clients/openclaw-live-client";
import { invalidateOpenClawCliInvocationCache } from "../src/runtime/openclaw-cli";

test("sessionsList returns store sessions promptly when the CLI is slow", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "openclaw-sessions-"));
  const originalCliPath = process.env.OPENCLAW_CLI_PATH;
  const originalOpenClawHome = process.env.OPENCLAW_HOME;
  const originalOpenClawConfigPath = process.env.OPENCLAW_CONFIG_PATH;
  try {
    const openclawHome = join(tempDir, ".openclaw");
    const agentSessionsDir = join(openclawHome, "agents", "jarvis", "sessions");
    const cliScript = join(tempDir, "slow-openclaw.js");
    const sessionKey = "agent:jarvis:thread:alpha";

    await mkdir(agentSessionsDir, { recursive: true });
    await writeFile(
      join(agentSessionsDir, "sessions.json"),
      JSON.stringify({
        sessions: [
          {
            key: sessionKey,
            sessionId: "session-alpha",
            agentId: "jarvis",
            updatedAt: "2026-03-18T12:00:00.000Z",
            model: "gpt-5",
            inputTokens: 120,
            outputTokens: 80,
            totalTokens: 200,
            state: "running",
            active: true,
          },
        ],
      }),
      "utf8",
    );
    await writeFile(
      cliScript,
      [
        "const args = process.argv.slice(2);",
        "if (args[0] === 'sessions' && args[1] === '--json') {",
        "  setTimeout(() => {",
        "    process.stdout.write(JSON.stringify({ sessions: [{ key: 'agent:jarvis:thread:cli', agentId: 'jarvis' }] }));",
        "    process.exit(0);",
        "  }, 2500);",
        "} else {",
        "  process.stderr.write(`unexpected args: ${args.join(' ')}`);",
        "  process.exit(1);",
        "}",
      ].join("\n"),
      "utf8",
    );

    process.env.OPENCLAW_HOME = openclawHome;
    delete process.env.OPENCLAW_CONFIG_PATH;
    process.env.OPENCLAW_CLI_PATH = cliScript;
    invalidateOpenClawCliInvocationCache();

    const client = new OpenClawLiveClient();
    const startedAt = Date.now();
    const response = await client.sessionsList();
    const durationMs = Date.now() - startedAt;

    assert.equal(response.sessions?.length, 1);
    assert.equal(response.sessions?.[0]?.sessionKey, sessionKey);
    assert.equal(response.sessions?.[0]?.sessionId, "session-alpha");
    assert.equal(response.sessions?.[0]?.agentId, "jarvis");
    assert.equal(response.sessions?.[0]?.active, true);
    assert.ok(
      durationMs < 1000,
      `expected sessionsList to return from the local session store without waiting on the slow CLI, got ${durationMs}ms`,
    );
  } finally {
    if (originalCliPath === undefined) {
      delete process.env.OPENCLAW_CLI_PATH;
    } else {
      process.env.OPENCLAW_CLI_PATH = originalCliPath;
    }
    if (originalOpenClawHome === undefined) {
      delete process.env.OPENCLAW_HOME;
    } else {
      process.env.OPENCLAW_HOME = originalOpenClawHome;
    }
    if (originalOpenClawConfigPath === undefined) {
      delete process.env.OPENCLAW_CONFIG_PATH;
    } else {
      process.env.OPENCLAW_CONFIG_PATH = originalOpenClawConfigPath;
    }
    invalidateOpenClawCliInvocationCache();
    await rm(tempDir, { recursive: true, force: true });
  }
});
