import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  maybeClearStaleSessionLockForSmoke,
  parseSessionLockFailureDetailsForSmoke,
  shouldRetryTemporary502AgentTurnForSmoke,
  shouldRetryTransientAgentTurnForSmoke,
} from "../src/clients/openclaw-live-client";

test("agent turn retry matcher keeps retrying temporary 502 failures", () => {
  assert.equal(
    shouldRetryTemporary502AgentTurnForSmoke({
      ok: false,
      failureReason: "The AI service is temporarily unavailable (HTTP 502). Please try again in a moment.",
      replyText: "",
      rawText: "",
      rawJson: undefined,
    }),
    true,
  );

  assert.equal(
    shouldRetryTemporary502AgentTurnForSmoke({
      ok: false,
      failureReason: "502 Bad gateway",
      replyText: "",
      rawText: "",
      rawJson: undefined,
    }),
    true,
  );

  assert.equal(
    shouldRetryTemporary502AgentTurnForSmoke({
      ok: false,
      failureReason:
        "An error occurred while processing your request. You can retry your request, or contact us through our help center at help.openai.com if the error persists. Please include the request ID 64091f30-4f91-4cc9-a080-9651dc23d0f7 in your message.",
      replyText: "",
      rawText: "",
      rawJson: undefined,
    }),
    true,
  );
});

test("agent turn retry matcher ignores non-retryable failures", () => {
  assert.equal(
    shouldRetryTemporary502AgentTurnForSmoke({
      ok: false,
      failureReason: "401 Unauthorized",
      replyText: "",
      rawText: "",
      rawJson: undefined,
    }),
    false,
  );

  assert.equal(
    shouldRetryTemporary502AgentTurnForSmoke({
      ok: true,
      failureReason: "The AI service is temporarily unavailable (HTTP 502).",
      replyText: "",
      rawText: "",
      rawJson: undefined,
    }),
    false,
  );
});

test("agent turn transient retry matcher retries locked-session and gateway hiccups", () => {
  assert.equal(
    shouldRetryTransientAgentTurnForSmoke({
      ok: false,
      failureReason: "FailoverError: session file locked (timeout 10000ms): pid=49260 C:\\Users\\demo\\.openclaw\\agents\\main\\sessions\\room.jsonl.lock",
      replyText: "",
      rawText: "",
      rawJson: undefined,
    }),
    true,
  );

  assert.equal(
    shouldRetryTransientAgentTurnForSmoke({
      ok: false,
      failureReason: "gateway connect failed: Error: gateway not connected\nFailoverError: session file locked (timeout 10000ms)",
      replyText: "",
      rawText: "",
      rawJson: undefined,
    }),
    true,
  );
});

test("agent turn transient retry matcher ignores stable configuration failures", () => {
  assert.equal(
    shouldRetryTransientAgentTurnForSmoke({
      ok: false,
      failureReason: "spawn openclaw ENOENT",
      replyText: "",
      rawText: "",
      rawJson: undefined,
    }),
    false,
  );
});

test("session lock parser extracts pid and lock path inside the active OpenClaw home", async () => {
  const root = await mkdtempForOpenClawHome("openclaw-lock-parse-");
  const previousHome = process.env.OPENCLAW_HOME;
  try {
    process.env.OPENCLAW_HOME = root;
    const lockPath = join(root, "agents", "main", "sessions", "room.jsonl.lock");
    const details = parseSessionLockFailureDetailsForSmoke(
      `FailoverError: session file locked (timeout 10000ms): pid=49260 ${lockPath}`,
    );

    assert.equal(details.lockPath, lockPath);
    assert.equal(details.ownerPid, 49260);
  } finally {
    process.env.OPENCLAW_HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
});

test("stale session lock cleanup removes abandoned session lock files", async () => {
  const root = await mkdtempForOpenClawHome("openclaw-lock-stale-");
  const previousHome = process.env.OPENCLAW_HOME;
  try {
    process.env.OPENCLAW_HOME = root;
    const lockPath = join(root, "agents", "main", "sessions", "room.jsonl.lock");
    await mkdir(join(root, "agents", "main", "sessions"), { recursive: true });
    await writeFile(lockPath, '{"pid":999999}\n', "utf8");
    const staleAt = new Date(Date.now() - 5 * 60 * 1000);
    await utimes(lockPath, staleAt, staleAt);

    const cleared = await maybeClearStaleSessionLockForSmoke(
      `FailoverError: session file locked (timeout 10000ms): pid=999999 ${lockPath}`,
      { minAgeMs: 1_000, forceAgeMs: 1_000 },
    );

    assert.equal(cleared, true);
    await assert.rejects(() => stat(lockPath));
  } finally {
    process.env.OPENCLAW_HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
});

test("fresh session lock files are preserved during transient retries", async () => {
  const root = await mkdtempForOpenClawHome("openclaw-lock-fresh-");
  const previousHome = process.env.OPENCLAW_HOME;
  try {
    process.env.OPENCLAW_HOME = root;
    const lockPath = join(root, "agents", "main", "sessions", "room.jsonl.lock");
    await mkdir(join(root, "agents", "main", "sessions"), { recursive: true });
    await writeFile(lockPath, '{"pid":999999}\n', "utf8");

    const cleared = await maybeClearStaleSessionLockForSmoke(
      `FailoverError: session file locked (timeout 10000ms): pid=999999 ${lockPath}`,
      { minAgeMs: 60_000, forceAgeMs: 60_000 },
    );

    assert.equal(cleared, false);
    assert.equal((await stat(lockPath)).isFile(), true);
  } finally {
    process.env.OPENCLAW_HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
});

async function mkdtempForOpenClawHome(prefix: string): Promise<string> {
  return await mkdtemp(join(tmpdir(), prefix));
}
