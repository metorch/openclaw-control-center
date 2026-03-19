import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";
import { refreshAgentTeamServeSessionSnapshotForTest } from "../src/runtime/agent-team-refresh";

test("serve-session refresh clears disposable fixtures and retries contract rebuild after JSON decode failures", async () => {
  const workspaceRoot = "C:\\Users\\45441\\.openclaw\\workspace";
  const targetDir = join(workspaceRoot, "team", "runtime", "runs", "serve-session");
  const fixtureDir = join(targetDir, "control-ui-fixtures");
  const statusPath = join(targetDir, "status.json");
  const fixtureStatusPath = join(fixtureDir, "status.json");
  const dashboardPath = join(fixtureDir, "dashboard.json");
  const removed: string[] = [];
  const commandModes: string[] = [];
  let contractAttempt = 0;

  const result = await refreshAgentTeamServeSessionSnapshotForTest(
    {
      workspaceRoot,
      targetDir,
      limit: 5,
    },
    {
      removeDisposableFixtureDir: async (path) => {
        removed.push(path);
      },
      readFileUpdatedAt: async (path) => {
        if (path === fixtureStatusPath) return "2026-03-16T10:01:00.000Z";
        if (path === dashboardPath) return "2026-03-16T10:02:00.000Z";
        if (path === statusPath) return "2026-03-16T10:00:00.000Z";
        return undefined;
      },
      runPythonCommand: async (args) => {
        const modeIndex = args.indexOf("--mode");
        const mode = modeIndex >= 0 ? args[modeIndex + 1] : "unknown";
        commandModes.push(mode);
        if (mode === "status-refresh") {
          return {
            command: "py",
            stdout: JSON.stringify({
              status_file: statusPath,
              status: {
                updated_at: "2026-03-16T10:00:00.000Z",
              },
            }),
          };
        }
        contractAttempt += 1;
        if (contractAttempt === 1) {
          throw new Error(
            'Failed to refresh embedded serve-session snapshot via "py -m team_runtime.cli --mode contract-fixtures": json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes',
          );
        }
        return {
          command: "py",
          stdout: JSON.stringify({
            fixture_dir: fixtureDir,
            files: {
              "status.json": fixtureStatusPath,
              "dashboard.json": dashboardPath,
            },
          }),
        };
      },
    },
  );

  assert.deepEqual(commandModes, ["status-refresh", "contract-fixtures", "contract-fixtures"]);
  assert.deepEqual(removed, [fixtureDir, fixtureDir]);
  assert.equal(result.fixtureDir, fixtureDir);
  assert.equal(result.statusPath, fixtureStatusPath);
  assert.equal(result.dashboardPath, dashboardPath);
  assert.equal(result.schedulerStatusPath, statusPath);
  assert.equal(result.schedulerStatusUpdatedAt, "2026-03-16T10:00:00.000Z");
  assert.equal(result.statusFileUpdatedAt, "2026-03-16T10:01:00.000Z");
  assert.equal(result.dashboardFileUpdatedAt, "2026-03-16T10:02:00.000Z");
});

test("serve-session refresh does not retry contract rebuild for non-JSON failures", async () => {
  const workspaceRoot = "C:\\Users\\45441\\.openclaw\\workspace";
  const targetDir = join(workspaceRoot, "team", "runtime", "runs", "serve-session");
  const fixtureDir = join(targetDir, "control-ui-fixtures");
  const removed: string[] = [];
  let contractAttempt = 0;

  await assert.rejects(
    refreshAgentTeamServeSessionSnapshotForTest(
      {
        workspaceRoot,
        targetDir,
      },
      {
        removeDisposableFixtureDir: async (path) => {
          removed.push(path);
        },
        readFileUpdatedAt: async () => undefined,
        runPythonCommand: async (args) => {
          const modeIndex = args.indexOf("--mode");
          const mode = modeIndex >= 0 ? args[modeIndex + 1] : "unknown";
          if (mode === "status-refresh") {
            return {
              command: "py",
              stdout: JSON.stringify({ status_file: join(targetDir, "status.json") }),
            };
          }
          contractAttempt += 1;
          throw new Error("Failed to refresh embedded serve-session snapshot via \"py ...\": spawn failed");
        },
      },
    ),
    /spawn failed/,
  );

  assert.equal(contractAttempt, 1);
  assert.deepEqual(removed, [fixtureDir]);
});
