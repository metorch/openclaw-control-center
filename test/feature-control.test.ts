import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const moduleHref = pathToFileURL(join(process.cwd(), "src", "runtime", "feature-control.ts")).href;

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

test("feature takeover control defaults to operator-only and persists scoped AI takeover toggles", async () => {
  const root = await mkdtemp(join(tmpdir(), "feature-control-"));
  const previousCwd = process.cwd();

  try {
    process.chdir(root);
    const mod = await import(`${moduleHref}?feature-control-test=${Date.now()}`);
    const loaded = await mod.loadFeatureControlState();
    assert.equal(loaded.state.features.geo.aiTakeoverEnabled, false);
    assert.equal(loaded.state.features.geo.mode, "operator_only");
    assert.equal(loaded.state.features.education.aiTakeoverEnabled, false);
    assert.equal(loaded.state.features.education.mode, "operator_only");

    const patched = await mod.patchFeatureControl({
      feature: "geo",
      aiTakeoverEnabled: true,
    });
    assert.equal(patched.state.features.geo.aiTakeoverEnabled, true);
    assert.equal(patched.state.features.geo.mode, "openclaw_ai_scoped");
    assert.equal(patched.state.features.education.aiTakeoverEnabled, false);
    assert.equal(patched.state.features.education.mode, "operator_only");

    const persisted = JSON.parse(await readFile(join(root, "runtime", "feature-control.json"), "utf8")) as {
      features: {
        geo: { aiTakeoverEnabled: boolean; mode: string };
        education: { aiTakeoverEnabled: boolean; mode: string };
      };
    };
    assert.equal(persisted.features.geo.aiTakeoverEnabled, true);
    assert.equal(persisted.features.geo.mode, "openclaw_ai_scoped");
    assert.equal(persisted.features.education.aiTakeoverEnabled, false);
    assert.equal(persisted.features.education.mode, "operator_only");
  } finally {
    process.chdir(previousCwd);
    await rmWithRetries(root);
  }
});
