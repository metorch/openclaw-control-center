import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const moduleHref = pathToFileURL(join(process.cwd(), "src", "runtime", "ai-prediction.ts")).href;

async function rmWithRetries(targetPath: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = error && typeof error === "object" ? (error as { code?: string }).code : undefined;
      if (code !== "EBUSY" && code !== "EPERM") {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
  await rm(targetPath, { recursive: true, force: true });
}

async function withTempProject(
  run: (root: string, mod: typeof import("../src/runtime/ai-prediction")) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "ai-prediction-"));
  const previousStatePath = process.env.OPENCLAW_AI_PREDICTION_STATE_PATH;
  try {
    process.env.OPENCLAW_AI_PREDICTION_STATE_PATH = join(root, "runtime", "ai-prediction.json");
    const imported = await import(`${moduleHref}?ai-prediction-test=${Date.now()}-${Math.random()}`);
    const mod = (imported.default || imported) as typeof import("../src/runtime/ai-prediction");
    await run(root, mod);
  } finally {
    if (typeof previousStatePath === "string") {
      process.env.OPENCLAW_AI_PREDICTION_STATE_PATH = previousStatePath;
    } else {
      delete process.env.OPENCLAW_AI_PREDICTION_STATE_PATH;
    }
    await rmWithRetries(root);
  }
}

async function withMockFetch(
  handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response> | Response,
  run: () => Promise<void>,
): Promise<void> {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => handler(input, init)) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = previousFetch;
  }
}

test("default AI prediction public state points at the feature-folder MiroFish workspace", async () => {
  await withTempProject(async (_root, mod) => {
    const state = mod.defaultAiPredictionPublicState();
    assert.equal(state.config.frontendBaseUrl, "http://127.0.0.1:3002");
    assert.equal(state.config.backendBaseUrl, "http://127.0.0.1:5002");
    assert.match(state.config.repoDir, /features\\MiroFish$/i);
    assert.equal(state.ready, false);
    assert.equal(state.demoUrl, "https://666ghj.github.io/mirofish-demo/");
  });
});

test("AI prediction health succeeds only when both frontend and backend are reachable", async () => {
  await withTempProject(async (_root, mod) => {
    await withMockFetch(async (input) => {
      const url = String(input);
      if (url === "http://127.0.0.1:3002") {
        return new Response("<html><title>MiroFish</title></html>", { status: 200, headers: { "content-type": "text/html" } });
      }
      if (url === "http://127.0.0.1:5002/health") {
        return new Response(JSON.stringify({ status: "ok", service: "MiroFish Backend" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    }, async () => {
      const checked = await mod.checkAiPredictionHealth();
      assert.equal(checked.state.health.status, "ok");
      assert.equal(checked.state.health.frontend.ok, true);
      assert.equal(checked.state.health.backend.ok, true);
      assert.equal(checked.state.ready, true);
      assert.equal(checked.state.embedBlockedReason, "");
    });
  });
});

test("AI prediction allows shell embedding when the frontend is reachable but backend is still offline", async () => {
  await withTempProject(async (_root, mod) => {
    await withMockFetch(async (input) => {
      const url = String(input);
      if (url === "http://127.0.0.1:3002") {
        return new Response("<html><title>MiroFish</title></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return new Response("offline", { status: 503 });
    }, async () => {
      const checked = await mod.checkAiPredictionHealth();
      assert.equal(checked.state.health.status, "error");
      assert.equal(checked.state.health.frontend.ok, true);
      assert.equal(checked.state.health.backend.ok, false);
      assert.equal(checked.state.ready, true);
      assert.equal(checked.state.embedBlockedReason, "");
      assert.match(checked.state.health.message || "", /Backend health is not reachable/i);
    });
  });
});
