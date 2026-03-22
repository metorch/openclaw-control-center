import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { loadCurrentAgentCatalog } from "../src/runtime/current-agent-catalog";

test("current agent catalog filters internal monitor agents from the visible roster", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "openclaw-catalog-"));
  const configPath = join(tempDir, "openclaw.json");
  const previousConfigPath = process.env.OPENCLAW_CONFIG_PATH;

  try {
    await writeFile(
      configPath,
      JSON.stringify({
        agents: {
          list: [
            { id: "main", name: "Jarvis", workspace: "C:/workspace" },
            { id: "heart-rate-monitor", name: "Heart rate monitor", workspace: "C:/heartbeat" },
            { id: "qa", name: "QA", workspace: "C:/qa" },
          ],
        },
      }),
      "utf8",
    );

    process.env.OPENCLAW_CONFIG_PATH = configPath;
    const catalog = await loadCurrentAgentCatalog();

    assert.equal(catalog.status, "connected");
    assert.deepEqual(
      catalog.entries.map((entry) => entry.agentId),
      ["main", "qa"],
    );
    assert.match(catalog.detail, /filtered 1 internal system agent/i);
  } finally {
    if (previousConfigPath === undefined) {
      delete process.env.OPENCLAW_CONFIG_PATH;
    } else {
      process.env.OPENCLAW_CONFIG_PATH = previousConfigPath;
    }
    await rm(tempDir, { recursive: true, force: true });
  }
});
