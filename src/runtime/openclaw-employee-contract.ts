import { runOpenClawCommand } from "./openclaw-cli";

const CONTRACT_CACHE_TTL_MS = 15_000;
const CONTRACT_STATUS_PROBE_TIMEOUT_MS = 8_000;
const CONTRACT_GATEWAY_STATUS_PROBE_TIMEOUT_MS = 15_000;
const CONTRACT_SESSIONS_PROBE_TIMEOUT_MS = 10_000;
const CONTRACT_CRON_LIST_PROBE_TIMEOUT_MS = 8_000;
const CONTRACT_APPROVALS_PROBE_TIMEOUT_MS = 8_000;
const CONTRACT_AGENT_HELP_PROBE_TIMEOUT_MS = 6_000;
const CONTRACT_PROBE_MAX_BUFFER = 4 * 1024 * 1024;
const VALIDATED_OPENCLAW_FLOOR = "2026.3.23";
const VALIDATED_OPENCLAW_YEAR = 2026;
const REQUIRED_AGENT_HELP_FLAGS = ["--agent", "--message", "--session-id", "--json", "--timeout"] as const;

type TimedSourceCache<T> = {
  key: string;
  value: T;
  expiresAt: number;
};

export type OpenClawEmployeeContractStatus = "ok" | "warn" | "blocked" | "info";

export interface OpenClawEmployeeContractItem {
  key:
    | "version"
    | "sessions-json"
    | "cron-list-json"
    | "approvals-json"
    | "agent-help"
    | "gateway-rpc";
  status: OpenClawEmployeeContractStatus;
  value: string;
  detail: string;
  requiredFor: Array<"read" | "dispatch" | "abort" | "settings">;
}

export interface OpenClawEmployeeContractSummary {
  generatedAt: string;
  status: OpenClawEmployeeContractStatus;
  validatedFloor: string;
  currentVersion?: string;
  gatewayVersion?: string;
  readReady: boolean;
  dispatchReady: boolean;
  abortReady: boolean;
  items: OpenClawEmployeeContractItem[];
  warnings: string[];
  blockingReasons: string[];
}

export interface OpenClawEmployeeContractProbeSnapshot {
  versionProbe?: TextProbeResult;
  statusProbe?: JsonProbeResult;
  gatewayStatusProbe?: JsonProbeResult;
  sessionsProbe?: JsonProbeResult;
  cronListProbe?: JsonProbeResult;
  approvalsProbe?: JsonProbeResult;
  agentHelpProbe?: TextProbeResult;
}

interface TextProbeResult {
  ok: boolean;
  text: string;
}

interface JsonProbeResult {
  ok: boolean;
  rawText: string;
  json?: unknown;
}

interface ParsedOpenClawVersion {
  raw: string;
  year: number;
  month: number;
  day: number;
  correction: number;
}

let contractCache: TimedSourceCache<OpenClawEmployeeContractSummary> | undefined;
let contractInFlight: Promise<OpenClawEmployeeContractSummary> | undefined;
let contractInFlightKey: string | undefined;

export function invalidateOpenClawEmployeeContractCache(): void {
  contractCache = undefined;
  contractInFlight = undefined;
  contractInFlightKey = undefined;
}

export function primeOpenClawEmployeeContract(): void {
  void loadCachedOpenClawEmployeeContractSummary();
}

export async function loadCachedOpenClawEmployeeContractSummary(): Promise<OpenClawEmployeeContractSummary> {
  const now = Date.now();
  const cacheKey = buildContractCacheKey();
  if (contractCache && contractCache.key === cacheKey && contractCache.expiresAt > now) {
    return contractCache.value;
  }
  if (contractInFlight && contractInFlightKey === cacheKey) {
    return contractInFlight;
  }
  const nextValue = probeOpenClawEmployeeContract();
  contractInFlight = nextValue;
  contractInFlightKey = cacheKey;
  try {
    const value = await nextValue;
    contractCache = {
      key: cacheKey,
      value,
      expiresAt: Date.now() + CONTRACT_CACHE_TTL_MS,
    };
    return value;
  } finally {
    contractInFlight = undefined;
    contractInFlightKey = undefined;
  }
}

export async function assertOpenClawEmployeeDispatchReady(): Promise<OpenClawEmployeeContractSummary> {
  const summary = await loadCachedOpenClawEmployeeContractSummary();
  if (!summary.dispatchReady) {
    throw new Error(buildOpenClawEmployeeDispatchFailureMessage(summary));
  }
  return summary;
}

export function buildOpenClawEmployeeDispatchFailureMessage(
  summary: Pick<OpenClawEmployeeContractSummary, "blockingReasons" | "warnings">,
): string {
  const primaryReason =
    summary.blockingReasons[0] ??
    "The guarded OpenClaw contract probe found an incompatible employee-system surface.";
  const warningText =
    summary.warnings.length > 0
      ? ` ${summary.warnings.slice(0, 2).join(" ")}`
      : "";
  return `AI 员工系统已阻止当前分发：${primaryReason} 请先适配 OpenClaw 边界层或回退版本。 / AI employee dispatch is blocked: ${primaryReason}${warningText}`;
}

export function summarizeOpenClawEmployeeContract(
  snapshot: OpenClawEmployeeContractProbeSnapshot,
): OpenClawEmployeeContractSummary {
  const statusRoot = asObject(snapshot.statusProbe?.json);
  const gatewayStatusRoot = asObject(snapshot.gatewayStatusProbe?.json);
  const sessionsRoot = asObject(snapshot.sessionsProbe?.json);
  const cronRoot = asObject(snapshot.cronListProbe?.json);
  const approvalsRoot = asObject(snapshot.approvalsProbe?.json);

  const currentVersion =
    asNonEmptyString(statusRoot?.runtimeVersion) ||
    parseOpenClawVersionFromText(snapshot.versionProbe?.ok ? snapshot.versionProbe.text : undefined)?.raw;
  const gatewayVersion =
    asNonEmptyString(asObject(statusRoot?.gateway)?.self && asObject(asObject(statusRoot?.gateway)?.self)?.version) ||
    undefined;
  const parsedCurrentVersion = parseOpenClawVersion(currentVersion);
  const parsedValidatedFloor = parseOpenClawVersion(VALIDATED_OPENCLAW_FLOOR);
  const warnings: string[] = [];
  const blockingReasons: string[] = [];
  const items: OpenClawEmployeeContractItem[] = [];

  const versionItem = summarizeVersionContractItem({
    currentVersion,
    gatewayVersion,
    parsedCurrentVersion,
    parsedValidatedFloor,
    warnings,
    blockingReasons,
  });
  items.push(versionItem);

  items.push(
    summarizeJsonCollectionContractItem({
      key: "sessions-json",
      probe: snapshot.sessionsProbe,
      root: sessionsRoot,
      collectionKey: "sessions",
      okValue: Array.isArray(sessionsRoot?.sessions) ? `${sessionsRoot.sessions.length} sessions` : "ready",
      okDetail: "sessions --json still returns a sessions[] payload that the AI employee system can normalize.",
      unavailableDetail: "sessions --json probe is unavailable, so compatibility stays in best-effort mode until the next successful read.",
      blockedDetail: "sessions --json no longer exposes a sessions[] payload. The room timeline and usage snapshots must not trust an unknown shape.",
      requiredFor: ["read", "settings"],
      blockingReasons,
    }),
  );

  items.push(
    summarizeJsonCollectionContractItem({
      key: "cron-list-json",
      probe: snapshot.cronListProbe,
      root: cronRoot,
      collectionKey: "jobs",
      okValue: Array.isArray(cronRoot?.jobs) ? `${cronRoot.jobs.length} jobs` : "ready",
      okDetail: "cron list --json still exposes jobs[] for the task and schedule surfaces.",
      unavailableDetail: "cron list --json probe is unavailable, so timed-job compatibility cannot be fully verified yet.",
      blockedDetail: "cron list --json no longer exposes jobs[]. Timed-job rows should stay protected until the boundary adapter is updated.",
      requiredFor: ["read", "settings"],
      blockingReasons,
    }),
  );

  items.push(
    summarizeApprovalsContractItem({
      probe: snapshot.approvalsProbe,
      root: approvalsRoot,
      warnings,
    }),
  );

  items.push(
    summarizeAgentHelpContractItem({
      probe: snapshot.agentHelpProbe,
      warnings,
      blockingReasons,
    }),
  );

  items.push(
    summarizeGatewayRpcContractItem({
      statusRoot,
      gatewayStatusRoot,
      probe: snapshot.gatewayStatusProbe,
      warnings,
    }),
  );

  const readReady = !items.some((item) => item.status === "blocked" && item.requiredFor.includes("read"));
  const dispatchReady = !items.some((item) => item.status === "blocked" && item.requiredFor.includes("dispatch"));
  const gatewayRpcReachable = items.find((item) => item.key === "gateway-rpc")?.status === "ok";
  const abortReady = dispatchReady && gatewayRpcReachable;
  const overallStatus = foldContractStatuses(items.map((item) => item.status), warnings, blockingReasons);

  return {
    generatedAt: new Date().toISOString(),
    status: overallStatus,
    validatedFloor: VALIDATED_OPENCLAW_FLOOR,
    currentVersion,
    gatewayVersion,
    readReady,
    dispatchReady,
    abortReady,
    items,
    warnings,
    blockingReasons,
  };
}

function summarizeVersionContractItem(input: {
  currentVersion?: string;
  gatewayVersion?: string;
  parsedCurrentVersion?: ParsedOpenClawVersion;
  parsedValidatedFloor?: ParsedOpenClawVersion;
  warnings: string[];
  blockingReasons: string[];
}): OpenClawEmployeeContractItem {
  if (!input.currentVersion || !input.parsedCurrentVersion || !input.parsedValidatedFloor) {
    return {
      key: "version",
      status: "info",
      value: input.currentVersion ?? "unknown",
      detail:
        "OpenClaw version probe is unavailable, so the employee-system boundary falls back to shape probes only.",
      requiredFor: ["read", "dispatch", "settings"],
    };
  }

  const versionValue = input.currentVersion;
  if (compareParsedOpenClawVersion(input.parsedCurrentVersion, input.parsedValidatedFloor) < 0) {
    const detail = `OpenClaw ${versionValue} is below the guarded employee-system floor ${VALIDATED_OPENCLAW_FLOOR}.`;
    input.blockingReasons.push(detail);
    return {
      key: "version",
      status: "blocked",
      value: versionValue,
      detail,
      requiredFor: ["read", "dispatch", "settings"],
    };
  }

  if (input.parsedCurrentVersion.year !== VALIDATED_OPENCLAW_YEAR) {
    const detail =
      `OpenClaw ${versionValue} is outside the currently validated ${VALIDATED_OPENCLAW_YEAR} compatibility train. ` +
      "Surface probes passed, but this upgrade should be re-tested before trusting room dispatch at scale.";
    input.warnings.push(detail);
    return {
      key: "version",
      status: "warn",
      value: versionValue,
      detail,
      requiredFor: ["read", "dispatch", "settings"],
    };
  }

  if (input.gatewayVersion && input.gatewayVersion !== input.currentVersion) {
    const detail =
      `CLI version ${input.currentVersion} and gateway self-version ${input.gatewayVersion} do not match. ` +
      "This usually means the service was not fully restarted after an upgrade.";
    input.warnings.push(detail);
    return {
      key: "version",
      status: "warn",
      value: versionValue,
      detail,
      requiredFor: ["read", "dispatch", "settings"],
    };
  }

  return {
    key: "version",
    status: "ok",
    value: versionValue,
    detail: `OpenClaw ${versionValue} is inside the guarded employee-system train (>= ${VALIDATED_OPENCLAW_FLOOR}).`,
    requiredFor: ["read", "dispatch", "settings"],
  };
}

function summarizeJsonCollectionContractItem(input: {
  key: OpenClawEmployeeContractItem["key"];
  probe?: JsonProbeResult;
  root?: Record<string, unknown>;
  collectionKey: string;
  okValue: string;
  okDetail: string;
  unavailableDetail: string;
  blockedDetail: string;
  requiredFor: Array<"read" | "dispatch" | "abort" | "settings">;
  blockingReasons: string[];
}): OpenClawEmployeeContractItem {
  if (!input.probe?.ok || !input.root) {
    return {
      key: input.key,
      status: "info",
      value: "probe unavailable",
      detail: input.unavailableDetail,
      requiredFor: input.requiredFor,
    };
  }

  if (Array.isArray(input.root[input.collectionKey])) {
    return {
      key: input.key,
      status: "ok",
      value: input.okValue,
      detail: input.okDetail,
      requiredFor: input.requiredFor,
    };
  }

  input.blockingReasons.push(input.blockedDetail);
  return {
    key: input.key,
    status: "blocked",
    value: "shape changed",
    detail: input.blockedDetail,
    requiredFor: input.requiredFor,
  };
}

function summarizeApprovalsContractItem(input: {
  probe?: JsonProbeResult;
  root?: Record<string, unknown>;
  warnings: string[];
}): OpenClawEmployeeContractItem {
  if (!input.probe?.ok || !input.root) {
    return {
      key: "approvals-json",
      status: "info",
      value: "probe unavailable",
      detail:
        "approvals get --json probe is unavailable. The review queue can still degrade gracefully, but approval details are not fully verified.",
      requiredFor: ["settings"],
    };
  }

  return {
    key: "approvals-json",
    status: "ok",
    value: "ready",
    detail: "approvals get --json still returns an object payload that the review queue can inspect safely.",
    requiredFor: ["settings"],
  };
}

function summarizeAgentHelpContractItem(input: {
  probe?: TextProbeResult;
  warnings: string[];
  blockingReasons: string[];
}): OpenClawEmployeeContractItem {
  if (!input.probe?.ok || !input.probe.text.trim()) {
    return {
      key: "agent-help",
      status: "info",
      value: "probe unavailable",
      detail:
        "agent --help probe is unavailable, so dispatch compatibility stays best-effort until the next successful capability read.",
      requiredFor: ["dispatch", "settings"],
    };
  }

  const helpText = input.probe.text;
  const looksLikeHelpSurface =
    /usage:\s*openclaw\s+agent/i.test(helpText) ||
    (helpText.includes("--agent") && helpText.includes("--message")) ||
    /options:/i.test(helpText);
  if (!looksLikeHelpSurface) {
    return {
      key: "agent-help",
      status: "info",
      value: "probe ambiguous",
      detail:
        "agent --help returned a non-help payload, so dispatch compatibility stays best-effort until a real help surface is observed.",
      requiredFor: ["dispatch", "settings"],
    };
  }

  const missingFlags = REQUIRED_AGENT_HELP_FLAGS.filter((flag) => !input.probe?.text.includes(flag));
  if (missingFlags.length > 0) {
    const detail = `openclaw agent help no longer advertises the required guarded flags: ${missingFlags.join(", ")}.`;
    input.blockingReasons.push(detail);
    return {
      key: "agent-help",
      status: "blocked",
      value: "shape changed",
      detail,
      requiredFor: ["dispatch", "settings"],
    };
  }

  return {
    key: "agent-help",
    status: "ok",
    value: `${REQUIRED_AGENT_HELP_FLAGS.length} flags`,
    detail: "openclaw agent still exposes the guarded flags that the AI employee system uses for controlled dispatch.",
    requiredFor: ["dispatch", "settings"],
  };
}

function summarizeGatewayRpcContractItem(input: {
  statusRoot?: Record<string, unknown>;
  gatewayStatusRoot?: Record<string, unknown>;
  probe?: JsonProbeResult;
  warnings: string[];
}): OpenClawEmployeeContractItem {
  if (!input.probe?.ok || !input.gatewayStatusRoot) {
    return {
      key: "gateway-rpc",
      status: "info",
      value: "probe unavailable",
      detail:
        "gateway status --json probe is unavailable, so abort compatibility cannot be fully verified yet.",
      requiredFor: ["abort", "settings"],
    };
  }

  const gatewayFromStatus = asObject(input.statusRoot?.gateway);
  const rpcOk =
    asBoolean(asObject(input.gatewayStatusRoot.rpc)?.ok) === true ||
    asBoolean(gatewayFromStatus?.reachable) === true;
  const probeUrl =
    asNonEmptyString(asObject(input.gatewayStatusRoot.gateway)?.probeUrl) ||
    asNonEmptyString(gatewayFromStatus?.url) ||
    asNonEmptyString(asObject(input.gatewayStatusRoot.rpc)?.url) ||
    "configured gateway";
  if (rpcOk) {
    return {
      key: "gateway-rpc",
      status: "ok",
      value: "reachable",
      detail: `Gateway RPC is reachable at ${probeUrl}, so room aborts still have a live upstream path.`,
      requiredFor: ["abort", "settings"],
    };
  }

  const detail =
    "Gateway RPC is currently unreachable. This is a runtime liveness issue rather than a contract break, " +
    "but aborts and live stream dispatch can fail until the gateway recovers.";
  input.warnings.push(detail);
  return {
    key: "gateway-rpc",
    status: "warn",
    value: "unreachable",
    detail,
    requiredFor: ["abort", "settings"],
  };
}

function foldContractStatuses(
  itemStatuses: OpenClawEmployeeContractStatus[],
  warnings: string[],
  blockingReasons: string[],
): OpenClawEmployeeContractStatus {
  if (blockingReasons.length > 0 || itemStatuses.some((status) => status === "blocked")) {
    return "blocked";
  }
  if (warnings.length > 0 || itemStatuses.some((status) => status === "warn")) {
    return "warn";
  }
  if (itemStatuses.some((status) => status === "info")) {
    return "info";
  }
  return "ok";
}

async function probeOpenClawEmployeeContract(): Promise<OpenClawEmployeeContractSummary> {
  const shouldProbeAgentHelp =
    !asNonEmptyString(process.env.OPENCLAW_CLI_PATH) ||
    process.env.OPENCLAW_EMPLOYEE_CONTRACT_FORCE_HELP_PROBE === "1";
  const [versionProbe, statusProbe, gatewayStatusProbe, sessionsProbe, cronListProbe, approvalsProbe, agentHelpProbe] =
    await Promise.all([
      runTextProbe(["--version"], { timeoutMs: CONTRACT_STATUS_PROBE_TIMEOUT_MS }),
      runJsonProbe(["status", "--json"], { timeoutMs: CONTRACT_STATUS_PROBE_TIMEOUT_MS }),
      runJsonProbe(["gateway", "status", "--json"], { timeoutMs: CONTRACT_GATEWAY_STATUS_PROBE_TIMEOUT_MS }),
      runJsonProbe(["sessions", "--json"], { timeoutMs: CONTRACT_SESSIONS_PROBE_TIMEOUT_MS }),
      runJsonProbe(["cron", "list", "--json"], { timeoutMs: CONTRACT_CRON_LIST_PROBE_TIMEOUT_MS }),
      runJsonProbe(["approvals", "get", "--json"], { timeoutMs: CONTRACT_APPROVALS_PROBE_TIMEOUT_MS }),
      shouldProbeAgentHelp
        ? runTextProbe(["agent", "--help"], { timeoutMs: CONTRACT_AGENT_HELP_PROBE_TIMEOUT_MS })
        : Promise.resolve(undefined),
    ]);

  return summarizeOpenClawEmployeeContract({
    versionProbe,
    statusProbe,
    gatewayStatusProbe,
    sessionsProbe,
    cronListProbe,
    approvalsProbe,
    agentHelpProbe,
  });
}

async function runTextProbe(args: string[], options?: { timeoutMs?: number }): Promise<TextProbeResult> {
  try {
    const { stdout, stderr } = await runOpenClawCommand(args, {
      timeoutMs: options?.timeoutMs ?? CONTRACT_STATUS_PROBE_TIMEOUT_MS,
      maxBuffer: CONTRACT_PROBE_MAX_BUFFER,
    });
    return {
      ok: true,
      text: joinTextParts(stdout, stderr),
    };
  } catch (error) {
    return {
      ok: false,
      text: extractOpenClawProbeErrorText(error),
    };
  }
}

async function runJsonProbe(args: string[], options?: { timeoutMs?: number }): Promise<JsonProbeResult> {
  try {
    const { stdout, stderr } = await runOpenClawCommand(args, {
      timeoutMs: options?.timeoutMs ?? CONTRACT_STATUS_PROBE_TIMEOUT_MS,
      maxBuffer: CONTRACT_PROBE_MAX_BUFFER,
    });
    const rawText = joinTextParts(stdout, stderr);
    return {
      ok: true,
      rawText,
      json: parseEmbeddedJson(rawText),
    };
  } catch (error) {
    const rawText = extractOpenClawProbeErrorText(error);
    return {
      ok: false,
      rawText,
      json: parseEmbeddedJson(rawText),
    };
  }
}

function parseOpenClawVersionFromText(input: string | undefined): ParsedOpenClawVersion | undefined {
  const match = /OpenClaw\s+(\d{4}\.\d{1,2}\.\d{1,2}(?:-\d+)?)/i.exec(input ?? "");
  return parseOpenClawVersion(match?.[1]);
}

function parseOpenClawVersion(input: string | undefined): ParsedOpenClawVersion | undefined {
  const match = /^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:-(\d+))?$/.exec((input ?? "").trim());
  if (!match) {
    return undefined;
  }
  return {
    raw: match[0],
    year: Number.parseInt(match[1] ?? "", 10),
    month: Number.parseInt(match[2] ?? "", 10),
    day: Number.parseInt(match[3] ?? "", 10),
    correction: Number.parseInt(match[4] ?? "0", 10),
  };
}

function compareParsedOpenClawVersion(left: ParsedOpenClawVersion, right: ParsedOpenClawVersion): number {
  return (
    left.year - right.year ||
    left.month - right.month ||
    left.day - right.day ||
    left.correction - right.correction
  );
}

function parseEmbeddedJson(input: string): unknown {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // Some OpenClaw commands print logs before the JSON payload.
  }

  const candidateStarts: number[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const ch = input[index];
    if (ch === "{" || ch === "[") {
      candidateStarts.push(index);
    }
  }

  for (const start of candidateStarts) {
    const candidate = input.slice(start).trim();
    if (!candidate) {
      continue;
    }
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      continue;
    }
  }

  return undefined;
}

function extractOpenClawProbeErrorText(error: unknown): string {
  const root = asObject(error);
  const stdout = asString(root?.stdout);
  const stderr = asString(root?.stderr);
  const message = error instanceof Error ? error.message : "";
  return joinTextParts(stdout, stderr, message);
}

function joinTextParts(...parts: Array<string | undefined>): string {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part !== "")
    .join("\n");
}

function buildContractCacheKey(): string {
  return [
    process.env.OPENCLAW_CLI_PATH ?? "",
    process.env.OPENCLAW_HOME ?? "",
    process.env.GATEWAY_URL ?? "",
    process.env.OPENCLAW_EMPLOYEE_CONTRACT_FORCE_HELP_PROBE ?? "",
  ].join("\n");
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

function asString(input: unknown): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function asNonEmptyString(input: unknown): string | undefined {
  const value = asString(input)?.trim();
  return value ? value : undefined;
}

function asBoolean(input: unknown): boolean | undefined {
  return typeof input === "boolean" ? input : undefined;
}
