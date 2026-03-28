import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import YAML from "yaml";

const moduleHref = pathToFileURL(join(process.cwd(), "src", "runtime", "ai-education.ts")).href;

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
  run: (root: string, mod: typeof import("../src/runtime/ai-education")) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "ai-education-"));
  const previousStatePath = process.env.OPENCLAW_AI_EDUCATION_STATE_PATH;

  try {
    process.env.OPENCLAW_AI_EDUCATION_STATE_PATH = join(root, "runtime", "ai-education.json");
    const imported = await import(`${moduleHref}?ai-education-test=${Date.now()}-${Math.random()}`);
    const mod = (imported.default || imported) as typeof import("../src/runtime/ai-education");
    await run(root, mod);
  } finally {
    if (typeof previousStatePath === "string") {
      process.env.OPENCLAW_AI_EDUCATION_STATE_PATH = previousStatePath;
    } else {
      delete process.env.OPENCLAW_AI_EDUCATION_STATE_PATH;
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

async function createOpenMaicRepo(root: string): Promise<{ repoDir: string; configPath: string }> {
  const repoDir = join(root, "openmaic");
  const configPath = join(repoDir, "server-providers.yml");
  await mkdir(join(repoDir, "app"), { recursive: true });
  await mkdir(join(repoDir, "lib", "server"), { recursive: true });
  await writeFile(join(repoDir, "package.json"), JSON.stringify({ name: "openmaic" }, null, 2), "utf8");
  await writeFile(join(repoDir, "app", "page.tsx"), "export default function Page() { return null; }\n", "utf8");
  await writeFile(join(repoDir, "lib", "server", "provider-config.ts"), "export const providerConfig = {};\n", "utf8");
  return { repoDir, configPath };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

test("default AI education public state is ready to embed the self-hosted workspace", { concurrency: false }, async () => {
  await withTempProject(async (_root, mod) => {
    const state = mod.defaultAiEducationPublicState();
    assert.equal(state.launchUrl, "http://127.0.0.1:3000");
    assert.equal(state.embedUrl, "http://127.0.0.1:3000");
    assert.equal(state.ready, true);
    assert.equal(state.config.llmProviderPreset, "openai");
    assert.equal(state.config.pdfProvider, "unpdf");
    assert.equal(state.config.llmApiKeyConfigured, false);
    assert.equal(state.config.pdfApiKeyConfigured, false);
    assert.equal(state.embedBlockedReason, undefined);
  });
});

test("public AI education state masks secrets and only exposes configured flags", { concurrency: false }, async () => {
  await withTempProject(async (_root, mod) => {
    const saved = await mod.patchAiEducationConfig({
      mode: "hosted",
      accessCode: "acc-12345678",
      llmApiKey: "sk-test-123",
      pdfProvider: "mineru",
      pdfApiKey: "mineru-secret",
    });

    assert.equal(saved.state.config.accessCodeConfigured, true);
    assert.match(saved.state.config.accessCodeHint || "", /acc\*\*\*5678/i);
    assert.equal(saved.state.config.llmApiKeyConfigured, true);
    assert.equal(saved.state.config.pdfApiKeyConfigured, true);
    assert.equal("accessCode" in saved.state.config, false);
    assert.equal("llmApiKey" in saved.state.config, false);
    assert.equal("pdfApiKey" in saved.state.config, false);
  });
});

test("health failures on the current endpoint block embedded launch", { concurrency: false }, async () => {
  await withTempProject(async (root, mod) => {
    await mkdir(join(root, "runtime"), { recursive: true });
    await writeFile(
      join(root, "runtime", "ai-education.json"),
      `${JSON.stringify(
        {
          version: 1,
          updatedAt: "2026-03-27T08:10:00.000Z",
          config: {
            mode: "self_hosted",
            baseUrl: "http://127.0.0.1:3000",
            repoDir: "",
            accessCode: "",
            llmProviderPreset: "openai",
            llmModel: "",
            llmApiKey: "",
            llmBaseUrl: "",
            pdfProvider: "unpdf",
            pdfApiKey: "",
            pdfBaseUrl: "",
          },
          health: {
            status: "error",
            checkedAt: "2026-03-27T08:09:00.000Z",
            baseUrl: "http://127.0.0.1:3000",
            message: "OpenMAIC is offline.",
            capabilities: {
              webSearch: false,
              imageGeneration: false,
              videoGeneration: false,
              tts: false,
            },
            pdfProviderVerification: {
              status: "skipped",
              checkedAt: "2026-03-27T08:09:00.000Z",
              message: "Using built-in unpdf parser.",
            },
          },
          latestJob: {
            status: "idle",
            updatedAt: "2026-03-27T08:10:00.000Z",
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const loaded = await mod.loadAiEducationState();
    assert.equal(loaded.state.ready, false);
    assert.equal(loaded.state.launchUrl, "http://127.0.0.1:3000");
    assert.match(loaded.state.embedBlockedReason || "", /offline/i);
  });
});

test("config changes reset stale health so a new endpoint can attempt embedding again", { concurrency: false }, async () => {
  await withTempProject(async (root, mod) => {
    await mkdir(join(root, "runtime"), { recursive: true });
    await writeFile(
      join(root, "runtime", "ai-education.json"),
      `${JSON.stringify(
        {
          version: 1,
          updatedAt: "2026-03-27T08:10:00.000Z",
          config: {
            mode: "self_hosted",
            baseUrl: "http://127.0.0.1:3000",
            repoDir: "",
            accessCode: "",
            llmProviderPreset: "openai",
            llmModel: "",
            llmApiKey: "",
            llmBaseUrl: "",
            pdfProvider: "unpdf",
            pdfApiKey: "",
            pdfBaseUrl: "",
          },
          health: {
            status: "error",
            checkedAt: "2026-03-27T08:09:00.000Z",
            baseUrl: "http://127.0.0.1:3000",
            message: "Old endpoint failed.",
            capabilities: {
              webSearch: false,
              imageGeneration: false,
              videoGeneration: false,
              tts: false,
            },
            pdfProviderVerification: {
              status: "skipped",
              checkedAt: "2026-03-27T08:09:00.000Z",
              message: "Using built-in unpdf parser.",
            },
          },
          latestJob: {
            status: "idle",
            updatedAt: "2026-03-27T08:10:00.000Z",
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const saved = await mod.patchAiEducationConfig({ baseUrl: "http://127.0.0.1:3100" });
    assert.equal(saved.state.health.status, "unknown");
    assert.equal(saved.state.launchUrl, "http://127.0.0.1:3100");
    assert.equal(saved.state.ready, true);
    assert.equal(saved.state.embedBlockedReason, undefined);
  });
});

test("apply-openmaic-config merges server-providers.yml and preserves unrelated sections", { concurrency: false }, async () => {
  await withTempProject(async (root, mod) => {
    const { repoDir, configPath } = await createOpenMaicRepo(root);
    await writeFile(
      configPath,
      [
        "providers:",
        "  legacy:",
        "    apiKey: keep-me",
        "pdf:",
        "  legacy_pdf:",
        "    enabled: true",
        "other:",
        "  keep: true",
        "",
      ].join("\n"),
      "utf8",
    );

    await mod.patchAiEducationConfig({
      repoDir,
      llmProviderPreset: "openai",
      llmModel: "gpt-4.1-mini",
      llmApiKey: "sk-openai",
      llmBaseUrl: "https://api.openai.com/v1",
      pdfProvider: "mineru",
      pdfBaseUrl: "http://127.0.0.1:8888",
      pdfApiKey: "mineru-key",
    });

    await withMockFetch(
      async (input) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.endsWith("/api/server-providers")) {
          return jsonResponse({ checkedAt: "2026-03-28T08:00:00.000Z", providers: {}, pdf: {} });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      },
      async () => {
        const applied = await mod.applyAiEducationOpenMaicConfig();
        assert.equal(applied.syncStatus, "pending_restart");
        assert.equal(applied.state.openmaicConfigSync.status, "pending_restart");

        const nextRoot = YAML.parse(await readFile(configPath, "utf8")) as Record<string, any>;
        assert.equal(nextRoot.other.keep, true);
        assert.equal(nextRoot.providers.legacy.apiKey, "keep-me");
        assert.equal(nextRoot.providers.openai.apiKey, "sk-openai");
        assert.deepEqual(nextRoot.providers.openai.models, ["gpt-4.1-mini"]);
        assert.equal(nextRoot.providers.openai.baseUrl, "https://api.openai.com/v1");
        assert.equal(nextRoot.pdf.legacy_pdf.enabled, true);
        assert.equal(nextRoot.pdf.mineru.baseUrl, "http://127.0.0.1:8888");
        assert.equal(nextRoot.pdf.mineru.apiKey, "mineru-key");
      },
    );
  });
});

test("apply-openmaic-config reports synced when the running OpenMAIC providers already match", { concurrency: false }, async () => {
  await withTempProject(async (root, mod) => {
    const { repoDir } = await createOpenMaicRepo(root);
    await mod.patchAiEducationConfig({
      repoDir,
      llmProviderPreset: "openai",
      llmModel: "gpt-4.1-mini",
      llmApiKey: "sk-openai",
      llmBaseUrl: "https://api.openai.com/v1",
      pdfProvider: "unpdf",
    });

    await withMockFetch(
      async (input) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.endsWith("/api/server-providers")) {
          return jsonResponse({
            checkedAt: "2026-03-28T08:00:00.000Z",
            providers: {
              openai: {
                baseUrl: "https://api.openai.com/v1",
                models: ["gpt-4.1-mini"],
              },
            },
            pdf: {},
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      },
      async () => {
        const applied = await mod.applyAiEducationOpenMaicConfig();
        assert.equal(applied.syncStatus, "synced");
        assert.equal(applied.state.openmaicConfigSync.status, "synced");
      },
    );
  });
});

test("health checks observe server providers and verify MinerU when enabled", { concurrency: false }, async () => {
  await withTempProject(async (_root, mod) => {
    await mod.patchAiEducationConfig({
      llmProviderPreset: "openai",
      llmModel: "gpt-4.1-mini",
      pdfProvider: "mineru",
      pdfBaseUrl: "http://127.0.0.1:8888",
      pdfApiKey: "mineru-key",
    });

    await withMockFetch(
      async (input) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.endsWith("/api/health")) {
          return jsonResponse({
            version: "1.0.0",
            capabilities: {
              webSearch: true,
              imageGeneration: false,
              videoGeneration: false,
              tts: true,
            },
          });
        }
        if (url.endsWith("/api/server-providers")) {
          return jsonResponse({
            checkedAt: "2026-03-28T08:00:00.000Z",
            providers: {
              openai: {
                models: ["gpt-4.1-mini"],
              },
            },
            pdf: {
              mineru: {
                baseUrl: "http://127.0.0.1:8888",
              },
            },
          });
        }
        if (url.endsWith("/api/verify-pdf-provider")) {
          return jsonResponse({
            data: {
              message: "MinerU verification succeeded.",
            },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      },
      async () => {
        const checked = await mod.checkAiEducationHealth();
        assert.equal(checked.state.health.status, "ok");
        assert.equal(checked.state.health.pdfProviderVerification.status, "ok");
        assert.equal(checked.state.observedServerProviders.providers.openai.models[0], "gpt-4.1-mini");
        assert.match(checked.state.health.message || "", /server-configured provider/i);
      },
    );
  });
});
