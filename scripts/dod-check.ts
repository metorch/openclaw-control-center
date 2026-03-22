import { spawn } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

interface DoDCheckResult {
  id: string;
  passed: boolean;
  detail: string;
}

type DoDStatus = "DONE" | "NOT_DONE";

interface DoDStatusArtifact {
  generatedAt: string;
  runtimeDir: string;
  status: DoDStatus;
  passed: boolean;
  checks: DoDCheckResult[];
}

interface WorkerProgress {
  cycle?: number;
  lastStep?: {
    id?: string;
    exitCode?: number;
  };
}

interface ProductDoDDefinition {
  fullChinese: boolean;
  nonTechnicalCopy: boolean;
  middleSchoolReadable: boolean;
  globalVisibility: boolean;
  appleNativeUI?: boolean;
  realSubscriptionConnected?: boolean;
  tiApproval?: boolean;
  notes?: string;
}

interface ProductSourceAudit {
  fullChinese: boolean;
  nonTechnicalCopy: boolean;
  middleSchoolReadable: boolean;
  globalVisibility: boolean;
  appleNativeUI: boolean;
  details: {
    fullChinese: string;
    nonTechnicalCopy: string;
    middleSchoolReadable: string;
    globalVisibility: string;
    appleNativeUI: string;
  };
}

interface RealSubscriptionAudit {
  connected: boolean;
  detail: string;
  sourcePath?: string;
}

interface PhraseGroup {
  id: string;
  options: string[];
}

const REQUIRED_ZH_GROUPS: PhraseGroup[] = [
  { id: "overview", options: ["\\u5168\\u5C40", "鍏ㄥ眬"] },
  { id: "schedule", options: ["\\u5B9A\\u65F6\\u4EFB\\u52A1", "瀹氭椂浠诲姟"] },
  { id: "heartbeat", options: ["\\u4EFB\\u52A1\\u5FC3\\u8DF3", "\\u5FC3\\u8DF3\\u68C0\\u67E5", "浠诲姟蹇冭烦", "蹇冭烦妫€鏌"] },
  { id: "currentTasks", options: ["\\u5F53\\u524D\\u4EFB\\u52A1", "\\u8FDB\\u884C\\u4E2D\\u4EFB\\u52A1", "褰撳墠浠诲姟", "杩涜涓换鍔"] },
  { id: "toolCalls", options: ["\\u5DE5\\u5177\\u8C03\\u7528", "宸ュ叿璋冪敤"] },
];

const REQUIRED_EN_GROUPS: PhraseGroup[] = [
  { id: "title", options: ["Global Visibility"] },
  {
    id: "summary",
    options: [
      "One place to see cron, heartbeat, current tasks, and tool calls.",
      "One place to see timed jobs, heartbeat, current tasks, and tool calls.",
      "At a glance: timed jobs, heartbeat, current tasks, and tool calls.",
      "Simple view: schedule checks (cron), heartbeat checks, current tasks, and tool calls.",
      "Simple view: schedule (cron), heartbeat, tasks in progress, and tool calls.",
    ],
  },
  { id: "schedule", options: ["Cron:", "Timed jobs:", "Schedule checks (cron):", "Schedule (cron):"] },
  { id: "heartbeat", options: ["Heartbeat:", "Heartbeat checks:"] },
  { id: "currentTasks", options: ["Current tasks:", "Tasks in progress:"] },
  { id: "toolCalls", options: ["Tool calls:"] },
];

const GLOBAL_VISIBILITY_RENDER_TOKENS = [
  "renderGlobalVisibilityStrip(",
  "renderGlobalVisibilityCard(",
  "renderGlobalVisibilityStripCard(",
  '<div class="content-stack">${globalVisibilityBlock}${sectionBody}</div>',
  "copy.scheduleLabel",
  "copy.heartbeatLabel",
  "copy.currentTasksLabel",
  "copy.toolCallsLabel",
  'buildGlobalVisibilityDetailHref("cron", language)',
  'buildGlobalVisibilityDetailHref("heartbeat", language)',
  'buildGlobalVisibilityDetailHref("current_task", language)',
  'buildGlobalVisibilityDetailHref("tool_call", language)',
  'taskType: "cron"',
  'taskType: "heartbeat"',
  'taskType: "current_task"',
  'taskType: "tool_call"',
  "signalCounts: {",
  "schedule: enabledCronCount",
  "heartbeat: enabledHeartbeatCount",
  "currentTasks: currentTasksCount",
  "toolCalls: toolCallsCount",
];

const GLOBAL_VISIBILITY_RENDER_GROUPS: PhraseGroup[] = [
  {
    id: "overview-block",
    options: [
      'const globalVisibilityBlock = options.section === "overview" ? globalVisibilityCard : globalVisibilityStripCard;',
      'const globalVisibilityBlock = options.section === "overview" ? globalVisibilityCard : "";',
    ],
  },
];

const APPLE_NATIVE_UI_RENDER_TOKENS = [
  'data-apple-window-controls="true"',
  "--apple-glass-blur",
  "-webkit-backdrop-filter",
  "@media (prefers-reduced-motion: reduce)",
];

const APPLE_NATIVE_UI_RENDER_GROUPS: PhraseGroup[] = [
  {
    id: "polish-marker",
    options: [
      'data-ui-polish="apple-native-v1"',
      'data-ui-polish="apple-native-v2"',
      'data-ui-polish="apple-native-v3"',
    ],
  },
  {
    id: "hover-elevation",
    options: [".card:hover { transform: translateY(-1px);", ".card:hover {"],
  },
];

const NON_TECH_JARGON = ["telemetry", "instrumentation", "payload", "schema", "protocol", "sdk"];

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}

async function runNodeScript(
  scriptPath: string,
  args: string[],
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, ["--import", "tsx", scriptPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
  });
}

async function readProgress(path: string): Promise<WorkerProgress | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as WorkerProgress;
  } catch {
    return null;
  }
}

async function readProductDoD(path: string): Promise<ProductDoDDefinition | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as ProductDoDDefinition;
  } catch {
    return null;
  }
}

function findMissingPhrases(input: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => !input.includes(phrase));
}

function findMissingGroups(input: string, groups: PhraseGroup[]): string[] {
  return groups
    .filter((group) => group.options.every((phrase) => !input.includes(phrase)))
    .map((group) => `${group.id}(${group.options.join(" | ")})`);
}

function extractAnchoredSection(source: string, startMarker: string, endMarker?: string): string {
  const start = source.indexOf(startMarker);
  if (start < 0) return "";
  const sliceStart = start + startMarker.length;
  if (!endMarker) return source.slice(sliceStart).trim();
  const end = source.indexOf(endMarker, sliceStart);
  return source.slice(sliceStart, end >= 0 ? end : undefined).trim();
}

function joinDefinedSections(parts: Array<string | undefined | null>): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join("\n\n");
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\r\n/g, "\n");
}

async function auditProductSource(uiServerPath: string): Promise<ProductSourceAudit> {
  let source = "";
  let sourceAnchors = "";

  try {
    source = await readFile(uiServerPath, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      fullChinese: false,
      nonTechnicalCopy: false,
      middleSchoolReadable: false,
      globalVisibility: false,
      appleNativeUI: false,
      details: {
        fullChinese: `unable to read ${uiServerPath}: ${detail}`,
        nonTechnicalCopy: `unable to read ${uiServerPath}: ${detail}`,
        middleSchoolReadable: `unable to read ${uiServerPath}: ${detail}`,
        globalVisibility: `unable to read ${uiServerPath}: ${detail}`,
        appleNativeUI: `unable to read ${uiServerPath}: ${detail}`,
      },
    };
  }

  try {
    sourceAnchors = await readFile(resolve(process.cwd(), "src", "ui", "server.source-anchors.txt"), "utf8");
  } catch {
    sourceAnchors = "";
  }

  const normalizedSource = normalizeWhitespace(source);
  const normalizedAnchors = normalizeWhitespace(sourceAnchors);
  const combinedSource = joinDefinedSections([normalizedSource, normalizedAnchors]);
  const topCommentBlock = normalizedSource.match(/\/\*[\s\S]*?\*\//)?.[0] ?? "";
  const anchorVisibilityBlock = extractAnchoredSection(
    normalizedAnchors,
    "Global visibility copy / render anchors:",
    "Apple-native polish anchors:",
  );
  const anchorAppleBlock = extractAnchoredSection(
    normalizedAnchors,
    "Apple-native polish anchors:",
    "Additional recovered source anchors:",
  );
  const modelBlock = combinedSource.match(
    /async function buildGlobalVisibilityViewModel[\s\S]*?function dashboardSectionLinks/,
  )?.[0];

  const englishCopyCorpus = joinDefinedSections([anchorVisibilityBlock, topCommentBlock]);
  const chineseCopyCorpus = joinDefinedSections([anchorVisibilityBlock, normalizedSource]);
  const renderCorpus = joinDefinedSections([anchorVisibilityBlock, modelBlock, normalizedSource]);
  const appleNativeCorpus = joinDefinedSections([anchorAppleBlock, combinedSource]);

  const missingZh = findMissingGroups(chineseCopyCorpus, REQUIRED_ZH_GROUPS);
  const missingEn = findMissingGroups(englishCopyCorpus, REQUIRED_EN_GROUPS);
  const missingRender = findMissingPhrases(renderCorpus, GLOBAL_VISIBILITY_RENDER_TOKENS);
  const missingRenderGroups = findMissingGroups(renderCorpus, GLOBAL_VISIBILITY_RENDER_GROUPS);
  const missingAppleNativeTokens = findMissingPhrases(appleNativeCorpus, APPLE_NATIVE_UI_RENDER_TOKENS);
  const missingAppleNativeGroups = findMissingGroups(appleNativeCorpus, APPLE_NATIVE_UI_RENDER_GROUPS);
  const matchedJargon = NON_TECH_JARGON.filter((token) => englishCopyCorpus.toLowerCase().includes(token));

  const readabilitySamples = [
    ...REQUIRED_EN_GROUPS.flatMap((group) => group.options),
    "Tasks checked:",
    "Tasks selected:",
    "Tasks started:",
    "Recent tool calls:",
    "Tool calls in recent activity:",
  ];
  const longPhrases = readabilitySamples.filter((phrase) => phrase.length > 90);
  const hardWords = readabilitySamples
    .flatMap((phrase) => phrase.split(/[^A-Za-z]+/))
    .filter((word) => word.length >= 14);

  return {
    fullChinese: missingZh.length === 0,
    nonTechnicalCopy: missingEn.length === 0 && matchedJargon.length === 0,
    middleSchoolReadable: longPhrases.length === 0 && hardWords.length === 0,
    globalVisibility: missingRender.length === 0 && missingRenderGroups.length === 0,
    appleNativeUI: missingAppleNativeTokens.length === 0 && missingAppleNativeGroups.length === 0,
    details: {
      fullChinese:
        missingZh.length === 0
          ? "global visibility source includes Chinese operator-facing labels"
          : `missing zh groups: ${missingZh.join(", ")}`,
      nonTechnicalCopy:
        missingEn.length === 0 && matchedJargon.length === 0
          ? "global visibility copy remains plain-language and operator-facing"
          : `missing en groups: ${missingEn.join(", ") || "none"}; jargon: ${matchedJargon.join(", ") || "none"}`,
      middleSchoolReadable:
        longPhrases.length === 0 && hardWords.length === 0
          ? "global visibility copy length/wording stays middle-school readable"
          : `long phrases=${longPhrases.join(" | ") || "none"} hard words=${hardWords.join(", ") || "none"}`,
      globalVisibility:
        missingRender.length === 0 && missingRenderGroups.length === 0
          ? "strip + card render all four signals (cron/heartbeat/current tasks/tool calls) across sections"
          : `missing render tokens: ${[...missingRender, ...missingRenderGroups].join(", ")}`,
      appleNativeUI:
        missingAppleNativeTokens.length === 0 && missingAppleNativeGroups.length === 0
          ? "apple-native polish markers present (glass surfaces, window controls, reduced-motion safety)"
          : `missing apple-native tokens: ${[...missingAppleNativeTokens, ...missingAppleNativeGroups].join(", ")}`,
    },
  };
}

function subscriptionSnapshotPaths(runtimeDir: string): string[] {
  const openclawHome = process.env.OPENCLAW_HOME?.trim() || join(homedir(), ".openclaw");
  const paths = [
    process.env.OPENCLAW_SUBSCRIPTION_SNAPSHOT_PATH?.trim(),
    resolve(runtimeDir, "subscription-snapshot.json"),
    join(openclawHome, "subscription.json"),
    join(openclawHome, "subscription-snapshot.json"),
    join(openclawHome, "billing", "subscription.json"),
    join(openclawHome, "billing", "subscription-snapshot.json"),
    join(openclawHome, "billing", "usage.json"),
    join(openclawHome, "usage", "subscription.json"),
    join(openclawHome, "usage", "subscription-snapshot.json"),
  ].filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return [...new Set(paths)];
}

function asObjectValue(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

function asStringValue(input: unknown): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function pickFirstNonNegative(values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  }
  return undefined;
}

function parseSubscriptionSnapshotSignal(raw: unknown): {
  consumed?: number;
  remaining?: number;
  limit?: number;
  unit: string;
  planLabel: string;
} {
  const root = asObjectValue(raw) ?? {};
  const subscription = asObjectValue(root.subscription) ?? {};
  const usage = asObjectValue(root.usage) ?? asObjectValue(subscription.usage) ?? {};
  const rootCost = asObjectValue(root.cost) ?? {};
  const subscriptionCost = asObjectValue(subscription.cost) ?? {};
  const plan = asObjectValue(root.plan) ?? asObjectValue(subscription.plan) ?? {};

  const consumed = pickFirstNonNegative([
    root.consumed,
    root.used,
    root.spent,
    subscription.consumed,
    subscription.used,
    subscription.spent,
    usage.consumed,
    usage.used,
    usage.spent,
    rootCost.used,
    rootCost.spent,
    subscriptionCost.used,
    subscriptionCost.spent,
  ]);
  const limit = pickFirstNonNegative([
    root.limit,
    root.total,
    root.quota,
    root.cap,
    subscription.limit,
    subscription.total,
    subscription.quota,
    subscription.cap,
    usage.limit,
    usage.total,
    usage.quota,
    rootCost.limit,
    subscriptionCost.limit,
  ]);
  const remaining = pickFirstNonNegative([
    root.remaining,
    root.left,
    subscription.remaining,
    subscription.left,
    usage.remaining,
    usage.left,
    typeof limit === "number" && typeof consumed === "number" ? Math.max(0, limit - consumed) : undefined,
  ]);

  const unit =
    asStringValue(root.unit) ??
    asStringValue(subscription.unit) ??
    asStringValue(usage.unit) ??
    asStringValue(root.currency) ??
    asStringValue(subscription.currency) ??
    asStringValue(usage.currency) ??
    "USD";
  const planLabel =
    asStringValue(plan.name) ??
    asStringValue(root.planLabel) ??
    asStringValue(root.planName) ??
    asStringValue(root.plan) ??
    asStringValue(root.tier) ??
    asStringValue(subscription.planLabel) ??
    asStringValue(subscription.planName) ??
    asStringValue(subscription.plan) ??
    asStringValue(subscription.tier) ??
    "Subscription";

  return {
    consumed,
    remaining,
    limit,
    unit,
    planLabel,
  };
}

async function auditRealSubscriptionSource(runtimeDir: string): Promise<RealSubscriptionAudit> {
  const paths = subscriptionSnapshotPaths(runtimeDir);
  const partial: string[] = [];
  const unreadable: string[] = [];
  const missing: string[] = [];

  for (const path of paths) {
    try {
      const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
      const parsed = parseSubscriptionSnapshotSignal(raw);
      const hasAllFields =
        typeof parsed.consumed === "number" && typeof parsed.remaining === "number" && typeof parsed.limit === "number";
      if (hasAllFields) {
        return {
          connected: true,
          sourcePath: path,
          detail: `provider snapshot connected at ${path} (${parsed.planLabel}; ${parsed.unit})`,
        };
      }
      const missingFields = [
        typeof parsed.consumed === "number" ? "" : "consumed",
        typeof parsed.remaining === "number" ? "" : "remaining",
        typeof parsed.limit === "number" ? "" : "limit",
      ].filter((item) => item !== "");
      partial.push(`${path} missing ${missingFields.join("/") || "required fields"}`);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error && typeof (error as { code?: unknown }).code === "string"
          ? (error as { code: string }).code
          : undefined;
      if (code === "ENOENT") {
        missing.push(path);
      } else {
        unreadable.push(`${path}${code ? ` (${code})` : ""}`);
      }
    }
  }

  if (partial.length > 0) {
    return {
      connected: false,
      detail: `provider snapshot found but incomplete: ${partial.join("; ")}`,
    };
  }
  if (unreadable.length > 0) {
    return {
      connected: false,
      detail: `provider snapshot unreadable: ${unreadable.join("; ")}`,
    };
  }
  return {
    connected: false,
    detail: missing.length > 0 ? `provider snapshot missing at: ${missing.join(", ")}` : "provider snapshot paths not configured",
  };
}

function toProductChecks(
  product: ProductDoDDefinition | null,
  sourceAudit: ProductSourceAudit,
  subscriptionAudit: RealSubscriptionAudit,
  requireTiApproval: boolean,
): DoDCheckResult[] {
  const declared = product ?? null;
  const checks: DoDCheckResult[] = [
    {
      id: "product-dod-definition",
      passed: declared !== null,
      detail: declared ? "runtime/evidence/product-dod.json present" : "missing runtime/evidence/product-dod.json",
    },
  ];

  const declaredFullChinese = declared?.fullChinese === true;
  checks.push({
    id: "product-full-chinese",
    passed: declaredFullChinese && sourceAudit.fullChinese,
    detail: `declared=${declaredFullChinese ? "pass" : "fail"} source=${sourceAudit.fullChinese ? "pass" : "fail"} ${sourceAudit.details.fullChinese}`,
  });

  const declaredNonTechnical = declared?.nonTechnicalCopy === true;
  checks.push({
    id: "product-non-technical-copy",
    passed: declaredNonTechnical && sourceAudit.nonTechnicalCopy,
    detail: `declared=${declaredNonTechnical ? "pass" : "fail"} source=${sourceAudit.nonTechnicalCopy ? "pass" : "fail"} ${sourceAudit.details.nonTechnicalCopy}`,
  });

  const declaredReadable = declared?.middleSchoolReadable === true;
  checks.push({
    id: "product-middle-school-readable",
    passed: declaredReadable && sourceAudit.middleSchoolReadable,
    detail: `declared=${declaredReadable ? "pass" : "fail"} source=${sourceAudit.middleSchoolReadable ? "pass" : "fail"} ${sourceAudit.details.middleSchoolReadable}`,
  });

  const declaredGlobalVisibility = declared?.globalVisibility === true;
  checks.push({
    id: "product-global-visibility",
    passed: declaredGlobalVisibility && sourceAudit.globalVisibility,
    detail: `declared=${declaredGlobalVisibility ? "pass" : "fail"} source=${sourceAudit.globalVisibility ? "pass" : "fail"} ${sourceAudit.details.globalVisibility}`,
  });

  const declaredAppleNativeUI = declared?.appleNativeUI === true;
  checks.push({
    id: "product-apple-native-ui",
    passed: declaredAppleNativeUI && sourceAudit.appleNativeUI,
    detail: `declared=${declaredAppleNativeUI ? "pass" : "fail"} source=${sourceAudit.appleNativeUI ? "pass" : "fail"} ${sourceAudit.details.appleNativeUI}`,
  });

  const declaredRealSubscriptionConnected = declared?.realSubscriptionConnected === true;
  checks.push({
    id: "product-real-subscription-connected",
    passed: declaredRealSubscriptionConnected && subscriptionAudit.connected,
    detail: `declared=${declaredRealSubscriptionConnected ? "pass" : "fail"} source=${subscriptionAudit.connected ? "pass" : "fail"} ${subscriptionAudit.detail}`,
  });

  const tiApproved = declared?.tiApproval === true;
  checks.push({
    id: "product-ti-approval",
    passed: requireTiApproval ? tiApproved : true,
    detail: requireTiApproval
      ? tiApproved
        ? "Ti approval recorded (strict mode)"
        : "Ti approval missing (strict mode)"
      : tiApproved
        ? "Ti approval recorded (non-blocking)"
        : "Ti approval pending (non-blocking)",
  });

  return checks;
}

async function runChecks(runtimeDir: string): Promise<DoDCheckResult[]> {
  const checks: DoDCheckResult[] = [];
  const goalPath = resolve(runtimeDir, "goal-state.json");
  const evidencePath = resolve(runtimeDir, "evidence", "latest.json");
  const progressPath = resolve(runtimeDir, "evidence", "worker-progress.json");
  const productDoDPath = resolve(runtimeDir, "evidence", "product-dod.json");
  const uiServerPath = resolve(process.cwd(), "src", "ui", "server.ts");
  const requireTiApproval = (process.env.DOD_REQUIRE_TI_APPROVAL ?? "false").toLowerCase() === "true";

  const goalGate = await runNodeScript(resolve(process.cwd(), "scripts", "goal-gate.ts"), [goalPath]);
  checks.push({
    id: "goal-gate",
    passed: goalGate.code === 0,
    detail: goalGate.code === 0 ? "goal gate passed" : goalGate.stderr.trim() || goalGate.stdout.trim() || "goal gate failed",
  });

  const evidenceGate = await runNodeScript(resolve(process.cwd(), "scripts", "evidence-gate.ts"), [
    "validate",
    evidencePath,
  ]);
  checks.push({
    id: "evidence-gate",
    passed: evidenceGate.code === 0,
    detail:
      evidenceGate.code === 0
        ? "evidence bundle valid"
        : evidenceGate.stderr.trim() || evidenceGate.stdout.trim() || "evidence validation failed",
  });

  const progress = await readProgress(progressPath);
  const stepPassed = progress?.lastStep?.exitCode === 0;
  checks.push({
    id: "worker-last-step",
    passed: stepPassed,
    detail: stepPassed
      ? `cycle=${progress?.cycle ?? "unknown"} step=${progress?.lastStep?.id ?? "unknown"} exit=0`
      : "missing or failing worker-progress lastStep.exitCode",
  });

  const product = await readProductDoD(productDoDPath);
  const sourceAudit = await auditProductSource(uiServerPath);
  const subscriptionAudit = await auditRealSubscriptionSource(runtimeDir);
  checks.push(...toProductChecks(product, sourceAudit, subscriptionAudit, requireTiApproval));

  return checks;
}

async function main(): Promise<void> {
  const runtimeDir = resolve(process.argv[2] ?? join(process.cwd(), "runtime"));
  const statusPath = resolve(process.argv[3] ?? join(runtimeDir, "evidence", "dod-status.json"));

  let checks: DoDCheckResult[] = [];
  try {
    checks = await runChecks(runtimeDir);
  } catch (error) {
    checks = [
      {
        id: "dod-check-runtime",
        passed: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    ];
  }

  const passed = checks.every((check) => check.passed);
  const artifact: DoDStatusArtifact = {
    generatedAt: new Date().toISOString(),
    runtimeDir,
    status: passed ? "DONE" : "NOT_DONE",
    passed,
    checks,
  };

  await writeJsonAtomic(statusPath, artifact);

  if (!artifact.passed) {
    console.error(`NOT_DONE status=${statusPath}`);
    process.exit(1);
  }

  console.log(`DONE status=${statusPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
