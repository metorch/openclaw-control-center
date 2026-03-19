import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { OpenClawLiveClient } from "../src/clients/openclaw-live-client";
import { invalidateOpenClawCliInvocationCache } from "../src/runtime/openclaw-cli";

function attachSessionFile(client: OpenClawLiveClient, sessionKey: string, sessionFile: string): void {
  const internalClient = client as OpenClawLiveClient & {
    sessionCache: Map<string, { sessionFile?: string }>;
  };
  internalClient.sessionCache.set(sessionKey, { sessionFile });
}

test("sessionsHistory reads recent history from large cached session files", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "openclaw-history-"));
  try {
    const sessionKey = "agent:main:cron:demo:run:child";
    const sessionFile = join(tempDir, "session.jsonl");
    const payload = "x".repeat(2048);
    const lines = Array.from({ length: 120 }, (_, index) =>
      JSON.stringify({ seq: index + 1, message: `entry-${index + 1}`, payload }),
    );
    await writeFile(sessionFile, `${lines.join("\n")}\n`, "utf8");

    const client = new OpenClawLiveClient();
    attachSessionFile(client, sessionKey, sessionFile);

    const response = await client.sessionsHistory({ sessionKey, limit: 3 });
    const history = Array.isArray(response.json?.history) ? response.json.history : [];

    assert.deepEqual(
      history.map((item) => (typeof item === "string" ? item : item.seq)),
      [118, 119, 120],
    );
    assert.match(response.rawText, /"seq":118/);
    assert.match(response.rawText, /"seq":120/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("sessionsHistory keeps the last line when the history file has no trailing newline", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "openclaw-history-"));
  try {
    const sessionKey = "agent:coq:main";
    const sessionFile = join(tempDir, "session.jsonl");
    const lines = [
      JSON.stringify({ seq: 1, message: "first" }),
      JSON.stringify({ seq: 2, message: "second" }),
      JSON.stringify({ seq: 3, message: "third" }),
    ];
    await writeFile(sessionFile, lines.join("\n"), "utf8");

    const client = new OpenClawLiveClient();
    attachSessionFile(client, sessionKey, sessionFile);

    const response = await client.sessionsHistory({ sessionKey, limit: 2 });
    const history = Array.isArray(response.json?.history) ? response.json.history : [];

    assert.deepEqual(
      history.map((item) => (typeof item === "string" ? item : item.seq)),
      [2, 3],
    );
    assert.equal(response.rawText.trim().split("\n").length, 2);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("sessionsHistory falls back to bounded CLI recovery when the cached session file is stale", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "openclaw-history-cli-"));
  const originalCliPath = process.env.OPENCLAW_CLI_PATH;
  try {
    const sessionKey = "agent:jarvis:main";
    const missingSessionFile = join(tempDir, "missing-session.jsonl");
    const cliScript = join(tempDir, "fake-openclaw.js");
    await writeFile(
      cliScript,
      [
        "const args = process.argv.slice(2);",
        "if (args[0] === 'sessions' && args[1] === 'history') {",
        "  process.stdout.write(JSON.stringify({ history: [{ seq: 1 }, { seq: 2 }, { seq: 3 }] }));",
        "  process.exit(0);",
        "}",
        "process.stderr.write(`unexpected args: ${args.join(' ')}`);",
        "process.exit(1);",
      ].join("\n"),
      "utf8",
    );

    process.env.OPENCLAW_CLI_PATH = cliScript;
    invalidateOpenClawCliInvocationCache();

    const client = new OpenClawLiveClient();
    attachSessionFile(client, sessionKey, missingSessionFile);

    const response = await client.sessionsHistory({ sessionKey, limit: 2 });
    const history = Array.isArray(response.json?.history) ? response.json.history : [];

    assert.deepEqual(
      history.map((item) => (typeof item === "string" ? item : item.seq)),
      [1, 2, 3],
    );
    assert.match(response.rawText, /"seq":1/);
    assert.match(response.rawText, /"seq":3/);
  } finally {
    if (originalCliPath === undefined) {
      delete process.env.OPENCLAW_CLI_PATH;
    } else {
      process.env.OPENCLAW_CLI_PATH = originalCliPath;
    }
    invalidateOpenClawCliInvocationCache();
    await rm(tempDir, { recursive: true, force: true });
  }
});
