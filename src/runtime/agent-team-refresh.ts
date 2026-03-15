import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REFRESH_TIMEOUT_MS = 60_000;
const REFRESH_MAX_BUFFER = 8 * 1024 * 1024;
const REFRESH_LIMIT = 5;
const PYTHON_COMMAND_CANDIDATES = ["py", "python", "python3"] as const;

type ContractFixturesPayload = {
  fixture_dir?: string;
  files?: Record<string, unknown>;
};

type StatusRefreshPayload = {
  status_file?: string;
  status?: Record<string, unknown>;
};

export interface AgentTeamRefreshResult {
  workspaceRoot: string;
  targetDir: string;
  fixtureDir: string;
  manifestPath?: string;
  statusPath: string;
  dashboardPath: string;
  schedulerStatusPath: string;
  command: string;
  args: string[];
  refreshedAt: string;
  schedulerStatusUpdatedAt?: string;
  statusFileUpdatedAt?: string;
  dashboardFileUpdatedAt?: string;
}

let refreshInFlight: Promise<AgentTeamRefreshResult> | undefined;

export async function refreshAgentTeamServeSessionSnapshot(input: {
  workspaceRoot: string;
  targetDir?: string;
  limit?: number;
}): Promise<AgentTeamRefreshResult> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = refreshAgentTeamServeSessionSnapshotUncached(input).finally(() => {
    refreshInFlight = undefined;
  });
  return refreshInFlight;
}

async function refreshAgentTeamServeSessionSnapshotUncached(input: {
  workspaceRoot: string;
  targetDir?: string;
  limit?: number;
}): Promise<AgentTeamRefreshResult> {
  const workspaceRoot = input.workspaceRoot.trim();
  const targetDir = input.targetDir?.trim() || join(workspaceRoot, "team", "runtime", "runs", "serve-session");
  const limit = Number.isFinite(input.limit) && (input.limit ?? 0) > 0 ? Math.floor(input.limit as number) : REFRESH_LIMIT;
  const statusRefreshArgs = [
    "-m",
    "team_runtime.cli",
    "--workspace",
    workspaceRoot,
    "--out-dir",
    targetDir,
    "--mode",
    "status-refresh",
  ];
  const args = [
    "-m",
    "team_runtime.cli",
    "--workspace",
    workspaceRoot,
    "--out-dir",
    targetDir,
    "--mode",
    "contract-fixtures",
    "--limit",
    String(limit),
  ];

  const statusRefresh = await runPythonCommand(statusRefreshArgs, workspaceRoot);
  const statusRefreshPayload = parseStatusRefreshPayload(statusRefresh.stdout);
  const schedulerStatusPath =
    asNonEmptyString(statusRefreshPayload?.status_file) ?? join(targetDir, "status.json");
  const schedulerStatusUpdatedAt =
    asNonEmptyString(asRecord(statusRefreshPayload?.status)["updated_at"]) ??
    (await readFileUpdatedAt(schedulerStatusPath));
  const executed = await runPythonCommand(args, workspaceRoot);
  const payload = parseContractFixturesPayload(executed.stdout);
  const fixtureDir = asNonEmptyString(payload?.fixture_dir) ?? join(targetDir, "control-ui-fixtures");
  const files = asRecord(payload?.files);
  const manifestPath = asNonEmptyString(files["manifest.json"]);
  const statusPath = asNonEmptyString(files["status.json"]) ?? join(fixtureDir, "status.json");
  const dashboardPath = asNonEmptyString(files["dashboard.json"]) ?? join(fixtureDir, "dashboard.json");
  const [statusFileUpdatedAt, dashboardFileUpdatedAt] = await Promise.all([
    readFileUpdatedAt(statusPath),
    readFileUpdatedAt(dashboardPath),
  ]);

  return {
    workspaceRoot,
    targetDir,
    fixtureDir,
    manifestPath,
    statusPath,
    dashboardPath,
    schedulerStatusPath,
    command: executed.command,
    args,
    refreshedAt: new Date().toISOString(),
    schedulerStatusUpdatedAt,
    statusFileUpdatedAt,
    dashboardFileUpdatedAt,
  };
}

async function runPythonCommand(
  args: string[],
  cwd: string,
): Promise<{ command: string; stdout: string }> {
  let lastError: unknown;
  for (const command of PYTHON_COMMAND_CANDIDATES) {
    try {
      const { stdout } = await execFileAsync(command, args, {
        cwd,
        timeout: REFRESH_TIMEOUT_MS,
        maxBuffer: REFRESH_MAX_BUFFER,
      });
      return { command, stdout };
    } catch (error) {
      if (isMissingCommandError(error)) {
        lastError = error;
        continue;
      }
      throw decorateRefreshError(command, args, error);
    }
  }
  throw decorateRefreshError(PYTHON_COMMAND_CANDIDATES[0], args, lastError);
}

function decorateRefreshError(command: string, args: string[], error: unknown): Error {
  const detail = error instanceof Error ? error.message : "unknown refresh error";
  return new Error(`Failed to refresh embedded serve-session snapshot via "${command} ${args.join(" ")}": ${detail}`);
}

function isMissingCommandError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      ((error as { code?: unknown }).code === "ENOENT" || (error as { code?: unknown }).code === 9009),
  );
}

function parseContractFixturesPayload(stdout: string): ContractFixturesPayload | undefined {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    return asRecord(parsed) as ContractFixturesPayload;
  } catch {
    return undefined;
  }
}

function parseStatusRefreshPayload(stdout: string): StatusRefreshPayload | undefined {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    return asRecord(parsed) as StatusRefreshPayload;
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

async function readFileUpdatedAt(path: string): Promise<string | undefined> {
  try {
    const meta = await stat(path);
    return meta.mtime.toISOString();
  } catch {
    return undefined;
  }
}
