import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  loadOpenClawAgentModelRecord,
  resolveOpenClawAgentModelOverridesPath,
  swapOpenClawAgentToFallbackModel,
  updateOpenClawAgentModelRecord,
} from "../src/runtime/openclaw-agent-models";

test("agent model helpers keep fallback models in a sidecar runtime file instead of openclaw.json", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-agent-models-"));
  const configPath = join(root, "openclaw.json");
  const fallbackStatePath = resolveOpenClawAgentModelOverridesPath(configPath);
  try {
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          agents: {
            defaults: {
              model: { primary: "provider/model-primary" },
              models: {
                "provider/model-primary": { alias: "Primary" },
                "provider/model-fallback": { alias: "Fallback" },
                "provider/model-third": { alias: "Third" },
              },
            },
            list: [
              {
                id: "main",
                name: "main",
                model: "provider/model-primary",
                workspace: "projects/control-center",
                tools: { profile: "default" },
              },
            ],
          },
          models: { providers: {} },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const initial = await updateOpenClawAgentModelRecord(
      "main",
      {
        model: "provider/model-primary",
        fallbackModel: "provider/model-fallback",
      },
      configPath,
    );
    assert.equal(initial?.model, "provider/model-primary");
    assert.equal(initial?.fallbackModel, "provider/model-fallback");

    const loaded = await loadOpenClawAgentModelRecord("main", configPath);
    assert.equal(loaded?.fallbackModel, "provider/model-fallback");

    const updated = await updateOpenClawAgentModelRecord(
      "main",
      {
        model: "provider/model-third",
        fallbackModel: "provider/model-primary",
      },
      configPath,
    );
    assert.equal(updated?.model, "provider/model-third");
    assert.equal(updated?.fallbackModel, "provider/model-primary");

    const swapped = await swapOpenClawAgentToFallbackModel("main", configPath);
    assert.equal(swapped?.model, "provider/model-primary");
    assert.equal(swapped?.fallbackModel, "provider/model-third");
    assert.equal(swapped?.previousModel, "provider/model-third");
    assert.equal(swapped?.previousFallbackModel, "provider/model-primary");

    const persistedConfig = JSON.parse(await readFile(configPath, "utf8")) as {
      agents?: { list?: Array<{ id?: string; model?: string; fallbackModel?: string }> };
    };
    const mainAgent = persistedConfig.agents?.list?.find((item) => item.id === "main");
    assert.equal(mainAgent?.model, "provider/model-primary");
    assert.equal("fallbackModel" in (mainAgent ?? {}), false);

    const persistedFallbackState = JSON.parse(await readFile(fallbackStatePath, "utf8")) as {
      agents?: Record<string, { fallbackModel?: string }>;
    };
    assert.equal(persistedFallbackState.agents?.main?.fallbackModel, "provider/model-third");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("agent model helpers migrate legacy fallbackModel keys out of openclaw.json", async () => {
  const root = await mkdtemp(join(tmpdir(), "openclaw-agent-models-migrate-"));
  const configPath = join(root, "openclaw.json");
  const fallbackStatePath = resolveOpenClawAgentModelOverridesPath(configPath);
  try {
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          agents: {
            defaults: {
              model: { primary: "provider/model-primary" },
              models: {
                "provider/model-primary": { alias: "Primary" },
                "provider/model-fallback": { alias: "Fallback" },
              },
            },
            list: [
              {
                id: "main",
                name: "main",
                model: "provider/model-primary",
                fallbackModel: "provider/model-fallback",
                workspace: "projects/control-center",
                tools: { profile: "default" },
              },
            ],
          },
          models: { providers: {} },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const loaded = await loadOpenClawAgentModelRecord("main", configPath);
    assert.equal(loaded?.fallbackModel, "provider/model-fallback");

    const persistedConfig = JSON.parse(await readFile(configPath, "utf8")) as {
      agents?: { list?: Array<{ id?: string; fallbackModel?: string }> };
    };
    assert.equal("fallbackModel" in (persistedConfig.agents?.list?.[0] ?? {}), false);

    const persistedFallbackState = JSON.parse(await readFile(fallbackStatePath, "utf8")) as {
      agents?: Record<string, { fallbackModel?: string }>;
    };
    assert.equal(persistedFallbackState.agents?.main?.fallbackModel, "provider/model-fallback");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
