import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { dirname, delimiter, extname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_OPENCLAW_COMMAND = "openclaw";
const DEFAULT_POWERSHELL_COMMAND = "powershell.exe";
const OPENCLAW_MODULE_ENTRYPOINT = ["node_modules", "openclaw", "openclaw.mjs"] as const;

export interface OpenClawCommandResult {
  stdout: string;
  stderr: string;
}

export interface OpenClawCommandOptions {
  timeoutMs?: number;
  maxBuffer?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
}

export interface OpenClawCliInvocation {
  command: string;
  prefixArgs: string[];
}

export interface OpenClawGatewayHealthResult {
  ok: boolean;
  failureReason?: string;
  rawText: string;
  rawJson?: Record<string, unknown>;
}

export interface ResolveOpenClawCliInvocationOptions {
  platform?: NodeJS.Platform;
  pathEnv?: string;
  commandOverride?: string;
}

let cachedInvocationPromise: Promise<OpenClawCliInvocation> | undefined;
const DEFAULT_GATEWAY_HEALTH_TIMEOUT_MS = 2_500;
const DEFAULT_GATEWAY_HEALTH_EXEC_TIMEOUT_BUFFER_MS = 1_500;
const DEFAULT_GATEWAY_HEALTH_MAX_BUFFER = 512 * 1024;

export function invalidateOpenClawCliInvocationCache(): void {
  cachedInvocationPromise = undefined;
}

export async function resolveOpenClawCliInvocation(
  options: ResolveOpenClawCliInvocationOptions = {},
): Promise<OpenClawCliInvocation> {
  const useCache =
    options.platform === undefined &&
    options.pathEnv === undefined &&
    options.commandOverride === undefined;
  if (useCache && cachedInvocationPromise) {
    return cachedInvocationPromise;
  }

  const nextValue = resolveOpenClawCliInvocationUncached({
    platform: options.platform ?? process.platform,
    pathEnv: options.pathEnv ?? process.env.PATH ?? "",
    commandOverride: options.commandOverride ?? process.env.OPENCLAW_CLI_PATH ?? "",
  });

  if (useCache) {
    cachedInvocationPromise = nextValue;
  }

  return nextValue;
}

export async function runOpenClawCommand(
  args: string[],
  options: OpenClawCommandOptions = {},
): Promise<OpenClawCommandResult> {
  const invocation = await resolveOpenClawCliInvocation();
  const { stdout, stderr } = await execFileAsync(invocation.command, [...invocation.prefixArgs, ...args], {
    timeout: options.timeoutMs ?? 20_000,
    maxBuffer: options.maxBuffer ?? 2 * 1024 * 1024,
    cwd: options.cwd,
    env: options.env,
    signal: options.signal,
    windowsHide: true,
  });
  return {
    stdout,
    stderr,
  };
}

export async function probeOpenClawGatewayHealth(options?: {
  timeoutMs?: number;
}): Promise<OpenClawGatewayHealthResult> {
  const timeoutMs = normalizeGatewayHealthTimeout(options?.timeoutMs);
  const args = buildGatewayHealthArgs(timeoutMs);

  try {
    const { stdout, stderr } = await runOpenClawCommand(args, {
      timeoutMs: timeoutMs + DEFAULT_GATEWAY_HEALTH_EXEC_TIMEOUT_BUFFER_MS,
      maxBuffer: DEFAULT_GATEWAY_HEALTH_MAX_BUFFER,
    });
    const rawText = joinTextParts(stdout, stderr);
    const rawJson = parseJsonRecord(stdout) ?? parseJsonRecord(rawText);
    const failureReason = summarizeGatewayHealthFailure(rawJson, rawText);
    if (failureReason) {
      return {
        ok: false,
        failureReason,
        rawText,
        rawJson,
      };
    }
    return {
      ok: true,
      rawText,
      rawJson,
    };
  } catch (error) {
    const stdout = normalizeNonEmpty(asString(asUnknownRecord(error)?.stdout));
    const stderr = normalizeNonEmpty(asString(asUnknownRecord(error)?.stderr));
    const message = error instanceof Error ? error.message : "OpenClaw gateway health check failed.";
    const rawText = joinTextParts(stdout ?? "", stderr ?? "", message);
    const rawJson = parseJsonRecord(stdout ?? "") ?? parseJsonRecord(stderr ?? "") ?? parseJsonRecord(rawText);
    return {
      ok: false,
      failureReason: summarizeGatewayHealthFailure(rawJson, rawText) ?? normalizeGatewayHealthFailureMessage(message),
      rawText,
      rawJson,
    };
  }
}

async function resolveOpenClawCliInvocationUncached(
  options: Required<ResolveOpenClawCliInvocationOptions>,
): Promise<OpenClawCliInvocation> {
  const commandOverride = normalizeNonEmpty(options.commandOverride);
  if (commandOverride) {
    return await resolveExplicitInvocation(commandOverride, options.platform);
  }

  if (options.platform !== "win32") {
    return {
      command: DEFAULT_OPENCLAW_COMMAND,
      prefixArgs: [],
    };
  }

  const pathEntries = splitPathEnv(options.pathEnv);
  for (const dirPath of pathEntries) {
    const executablePath = join(dirPath, "openclaw.exe");
    if (await fileExists(executablePath)) {
      return {
        command: executablePath,
        prefixArgs: [],
      };
    }

    const scriptModulePath = join(dirPath, ...OPENCLAW_MODULE_ENTRYPOINT);
    const commandModuleExists = await fileExists(scriptModulePath);
    if (
      commandModuleExists &&
      (await fileExists(join(dirPath, "openclaw.cmd")) || await fileExists(join(dirPath, "openclaw.bat")))
    ) {
      return {
        command: process.execPath,
        prefixArgs: [scriptModulePath],
      };
    }

    const powershellShimPath = join(dirPath, "openclaw.ps1");
    if (await fileExists(powershellShimPath)) {
      if (commandModuleExists) {
        return {
          command: process.execPath,
          prefixArgs: [scriptModulePath],
        };
      }
      return {
        command: DEFAULT_POWERSHELL_COMMAND,
        prefixArgs: ["-NoProfile", "-File", powershellShimPath],
      };
    }
  }

  return {
    command: DEFAULT_OPENCLAW_COMMAND,
    prefixArgs: [],
  };
}

async function resolveExplicitInvocation(
  commandOverride: string,
  platform: NodeJS.Platform,
): Promise<OpenClawCliInvocation> {
  const extension = extname(commandOverride).toLowerCase();
  if (extension === ".mjs" || extension === ".js" || extension === ".cjs") {
    return {
      command: process.execPath,
      prefixArgs: [commandOverride],
    };
  }

  if (platform === "win32" && (extension === ".cmd" || extension === ".bat")) {
    const commandModulePath = join(dirname(commandOverride), ...OPENCLAW_MODULE_ENTRYPOINT);
    if (await fileExists(commandModulePath)) {
      return {
        command: process.execPath,
        prefixArgs: [commandModulePath],
      };
    }
  }

  if (platform === "win32" && extension === ".ps1") {
    return {
      command: DEFAULT_POWERSHELL_COMMAND,
      prefixArgs: ["-NoProfile", "-File", commandOverride],
    };
  }

  return {
    command: commandOverride,
    prefixArgs: [],
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const file = await stat(path);
    return file.isFile();
  } catch {
    return false;
  }
}

function splitPathEnv(pathEnv: string): string[] {
  return pathEnv
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

function normalizeNonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildGatewayHealthArgs(timeoutMs: number): string[] {
  return ["health", "--json", "--timeout", String(timeoutMs)];
}

function normalizeGatewayHealthTimeout(input: number | undefined): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return DEFAULT_GATEWAY_HEALTH_TIMEOUT_MS;
  }
  return Math.max(500, Math.min(15_000, Math.trunc(input)));
}

function joinTextParts(...parts: string[]): string {
  return parts.map((part) => part.trim()).filter((part) => part !== "").join("\n");
}

function parseJsonRecord(input: string): Record<string, unknown> | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  try {
    return asUnknownRecord(JSON.parse(trimmed));
  } catch {
    return undefined;
  }
}

function summarizeGatewayHealthFailure(
  rawJson: Record<string, unknown> | undefined,
  rawText: string,
): string | undefined {
  if (rawJson) {
    if (rawJson.ok === true) {
      return undefined;
    }
    const jsonReason =
      normalizeNonEmpty(asString(asUnknownRecord(rawJson.rpc)?.error)) ??
      normalizeNonEmpty(asString(asUnknownRecord(rawJson.gateway)?.error)) ??
      normalizeNonEmpty(asString(asUnknownRecord(rawJson.error)?.message)) ??
      normalizeNonEmpty(asString(asUnknownRecord(rawJson.error)?.error)) ??
      normalizeNonEmpty(asString(asUnknownRecord(rawJson.status)?.error)) ??
      normalizeNonEmpty(asString(asUnknownRecord(rawJson.health)?.error)) ??
      normalizeNonEmpty(asString(rawJson.error)) ??
      normalizeNonEmpty(asString(rawJson.message));
    if (jsonReason) {
      return normalizeGatewayHealthFailureMessage(jsonReason);
    }
    if (rawJson.ok === false) {
      return "OpenClaw gateway health check reported a failure.";
    }
  }

  const normalized = rawText.trim();
  if (!normalized) return undefined;
  if (/\benoent\b/i.test(normalized)) {
    return `OpenClaw CLI is unavailable: ${firstFailureLine(normalized)}`;
  }
  if (
    /(gateway not connected|connect failed|econnrefused|rpc probe failed|unable to connect|connection refused|timed out)/i.test(
      normalized,
    )
  ) {
    return `OpenClaw gateway is unavailable: ${firstFailureLine(normalized)}`;
  }
  if (/\b(error|failed|failure)\b/i.test(normalized)) {
    return firstFailureLine(normalized);
  }
  return undefined;
}

function normalizeGatewayHealthFailureMessage(message: string): string {
  const firstLine = firstFailureLine(message);
  if (/\benoent\b/i.test(firstLine)) {
    return `OpenClaw CLI is unavailable: ${firstLine}`;
  }
  if (
    /(gateway not connected|connect failed|econnrefused|rpc probe failed|unable to connect|connection refused|timed out)/i.test(
      firstLine,
    )
  ) {
    return `OpenClaw gateway is unavailable: ${firstLine}`;
  }
  return firstLine;
}

function firstFailureLine(input: string): string {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== "") ?? "OpenClaw gateway health check failed.";
}

function asUnknownRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
