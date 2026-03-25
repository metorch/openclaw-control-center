import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const GEO_AUDIT_ARTIFACT_NAMES = [
  "standalone-audit.json",
  "GEO-AUDIT-REPORT.md",
  "GEO-REPORT.pdf",
  "llms.txt",
  "llms-full.txt",
] as const;

export type GeoAuditArtifactName = (typeof GEO_AUDIT_ARTIFACT_NAMES)[number];
export type GeoAuditRunStatus =
  | "idle"
  | "running"
  | "completed"
  | "completed_with_warnings"
  | "failed";

export interface GeoAuditRunInput {
  url: string;
  brandName?: string;
  maxPages?: number;
  insecure?: boolean;
  outputDir?: string;
}

export interface GeoAuditArtifactDescriptor {
  name: GeoAuditArtifactName;
  path?: string;
  relativePath?: string;
  exists: boolean;
  previewable: boolean;
  contentType: string;
  sizeBytes?: number;
  updatedAt?: string;
}

export interface GeoAuditRunState {
  runId: string;
  status: GeoAuditRunStatus;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  message?: string;
  warnings: string[];
  params: {
    url?: string;
    brandName?: string;
    maxPages?: number;
    insecure?: boolean;
    outputDir?: string;
    outputDirResolved?: string;
  };
  projectRoot: string;
  scriptPath: string;
  runtimeDir: string;
  statePath: string;
  outputDir?: string;
  command: {
    file: string;
    args: string[];
  };
  stdoutTail: string;
  stderrTail: string;
  artifacts: GeoAuditArtifactDescriptor[];
  lastUpdatedAt: string;
  processId?: number;
}

export interface GeoAuditArtifactContent {
  descriptor: GeoAuditArtifactDescriptor;
  buffer: Buffer;
}

export interface GeoAuditSummaryData {
  available: boolean;
  artifactName: "standalone-audit.json";
  artifactPath?: string;
  artifactRelativePath?: string;
  artifactUpdatedAt?: string;
  loadedAt: string;
  error?: string;
  data?: Record<string, any>;
}

const DEFAULT_GEO_PROJECT_ROOT = resolve(
  process.env.GEO_AUDIT_PROJECT_ROOT?.trim() ||
    "C:\\Users\\45441\\.openclaw\\workspace\\projects\\3-24-19-54-09\\geo-seo-claude",
);
const DEFAULT_RUNTIME_DIR = resolve(
  process.env.GEO_AUDIT_RUNTIME_DIR?.trim() || join(process.cwd(), "runtime", "geo-audits"),
);
const CURRENT_STATE_FILE_NAME = "state.json";
const DEFAULT_MAX_PAGES = 5;
const OUTPUTS_DIR_NAME = "outputs";
const STDOUT_TAIL_MAX_CHARS = 8_000;
const DEFAULT_OUTPUT_DISCOVERY_SKEW_MS = 30_000;
const POWERSHELL_EXECUTABLE = "powershell.exe";
const DEFAULT_ARTIFACT_CONTENT_TYPES: Record<GeoAuditArtifactName, string> = {
  "standalone-audit.json": "application/json; charset=utf-8",
  "GEO-AUDIT-REPORT.md": "text/markdown; charset=utf-8",
  "GEO-REPORT.pdf": "application/pdf",
  "llms.txt": "text/plain; charset=utf-8",
  "llms-full.txt": "text/plain; charset=utf-8",
};

type GeoAuditDefaultOutputSnapshot = Array<{ name: string; path: string; updatedAtMs: number }>;

let activeRunPromise: Promise<GeoAuditRunState> | undefined;
let activeRunState: GeoAuditRunState | undefined;
let activeChildProcess: ChildProcessWithoutNullStreams | undefined;
let persistGeoAuditStateQueue: Promise<void> = Promise.resolve();

export async function startGeoAuditRun(input: GeoAuditRunInput): Promise<GeoAuditRunState> {
  if (activeRunState?.status === "running") {
    throw new Error("A GEO audit is already running. Please wait for the current run to finish.");
  }

  const paths = resolveGeoAuditPaths();
  const params = normalizeGeoAuditInput(input, paths);
  await ensureGeoAuditPaths(paths);
  await assertGeoProjectIsReady(paths.projectRoot, paths.scriptPath);

  const runId = `geo-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const startedAt = new Date().toISOString();
  const explicitOutputDir = params.outputDirResolved;
  const defaultOutputSnapshot = explicitOutputDir ? [] : await listDefaultOutputDirs(paths.projectDefaultOutputRoot);
  const args = buildGeoAuditCommandArgs(paths.scriptPath, params);
  const nextState: GeoAuditRunState = {
    runId,
    status: "running",
    startedAt,
    warnings: [],
    params: {
      url: params.url,
      brandName: params.brandName,
      maxPages: params.maxPages,
      insecure: params.insecure,
      outputDir: params.outputDir,
      outputDirResolved: params.outputDirResolved,
    },
    projectRoot: paths.projectRoot,
    scriptPath: paths.scriptPath,
    runtimeDir: paths.runtimeDir,
    statePath: paths.statePath,
    outputDir: explicitOutputDir,
    command: {
      file: POWERSHELL_EXECUTABLE,
      args,
    },
    stdoutTail: "",
    stderrTail: "",
    artifacts: buildGeoArtifactDescriptors(),
    lastUpdatedAt: startedAt,
    processId: process.pid,
  };

  activeRunState = nextState;
  await persistGeoAuditState(nextState);

  const child = spawn(POWERSHELL_EXECUTABLE, args, {
    cwd: paths.projectRoot,
    env: process.env,
    windowsHide: true,
  });
  activeChildProcess = child;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    void updateActiveRunState((current) => ({
      ...current,
      stdoutTail: appendTail(current.stdoutTail, chunk),
      lastUpdatedAt: new Date().toISOString(),
    }));
  });
  child.stderr.on("data", (chunk: string) => {
    void updateActiveRunState((current) => ({
      ...current,
      stderrTail: appendTail(current.stderrTail, chunk),
      lastUpdatedAt: new Date().toISOString(),
    }));
  });

  activeRunPromise = new Promise<GeoAuditRunState>((resolveRun) => {
    let settled = false;
    const finalizeOnce = (payload: { exitCode: number; message?: string }) => {
      if (settled) return;
      settled = true;
      void finalizeGeoAuditRun({
        resolveRun,
        paths,
        exitCode: payload.exitCode,
        message: payload.message,
        defaultOutputSnapshot,
      });
    };
    child.on("error", (error) => {
      finalizeOnce({
        exitCode: 1,
        message: `Failed to start GEO audit: ${error.message}`,
      });
    });
    child.on("close", (code) => {
      finalizeOnce({
        exitCode: typeof code === "number" ? code : 1,
      });
    });
  }).finally(() => {
    activeRunPromise = undefined;
    activeChildProcess = undefined;
  });

  return nextState;
}

export async function getGeoAuditState(): Promise<GeoAuditRunState> {
  if (activeRunState) {
    return activeRunState;
  }
  const paths = resolveGeoAuditPaths();
  try {
    const raw = await readFile(paths.statePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<GeoAuditRunState>;
    const hydrated = hydrateGeoAuditState(parsed, paths);
    if (hydrated.status === "running") {
      const recovered = {
        ...hydrated,
        status: "failed" as GeoAuditRunStatus,
        finishedAt: new Date().toISOString(),
        message:
          hydrated.message ||
          "The UI server no longer has a live GEO worker for this run. The previous running state was cleared.",
        warnings: uniqueStrings([...hydrated.warnings, "Recovered a stale running state from disk."]),
        lastUpdatedAt: new Date().toISOString(),
        processId: process.pid,
      };
      await persistGeoAuditState(recovered);
      activeRunState = recovered;
      return recovered;
    }
    activeRunState = hydrated;
    return hydrated;
  } catch {
    return buildIdleGeoAuditState(paths);
  }
}

export async function readGeoAuditArtifact(name: string): Promise<GeoAuditArtifactContent> {
  const normalizedName = normalizeGeoAuditArtifactName(name);
  if (!normalizedName) {
    throw new Error("Unsupported GEO artifact requested.");
  }
  const state = await getGeoAuditState();
  const descriptor = state.artifacts.find((item) => item.name === normalizedName);
  if (!descriptor?.exists || !descriptor.path) {
    throw new Error(`GEO artifact "${normalizedName}" is not available for the latest run.`);
  }
  const buffer = await readFile(descriptor.path);
  return {
    descriptor,
    buffer,
  };
}

export async function getGeoAuditSummary(): Promise<GeoAuditSummaryData> {
  const loadedAt = new Date().toISOString();
  const state = await getGeoAuditState();
  const descriptor = state.artifacts.find((item) => item.name === "standalone-audit.json");
  if (!descriptor?.exists || !descriptor.path) {
    return {
      available: false,
      artifactName: "standalone-audit.json",
      loadedAt,
    };
  }

  try {
    const raw = await readFile(descriptor.path, "utf8");
    const normalized = raw.replace(/^\uFEFF/, "");
    const parsed = JSON.parse(normalized) as Record<string, any>;
    return {
      available: true,
      artifactName: "standalone-audit.json",
      artifactPath: descriptor.path,
      artifactRelativePath: descriptor.relativePath,
      artifactUpdatedAt: descriptor.updatedAt,
      loadedAt,
      data: parsed,
    };
  } catch (error) {
    return {
      available: false,
      artifactName: "standalone-audit.json",
      artifactPath: descriptor.path,
      artifactRelativePath: descriptor.relativePath,
      artifactUpdatedAt: descriptor.updatedAt,
      loadedAt,
      error: error instanceof Error ? error.message : "Unable to parse standalone-audit.json.",
    };
  }
}

export async function waitForGeoAuditRunToFinishForTest(timeoutMs = 15_000): Promise<GeoAuditRunState> {
  if (!activeRunPromise) {
    return await getGeoAuditState();
  }
  return await Promise.race([
    activeRunPromise,
    new Promise<GeoAuditRunState>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms waiting for GEO audit run.`)), timeoutMs);
    }),
  ]);
}

export async function resetGeoAuditRuntimeForTest(): Promise<void> {
  const paths = resolveGeoAuditPaths();
  activeChildProcess?.removeAllListeners();
  activeChildProcess = undefined;
  activeRunPromise = undefined;
  activeRunState = undefined;
  persistGeoAuditStateQueue = Promise.resolve();
  await rm(paths.statePath, { force: true });
  await rm(paths.runtimeOutputsRoot, { recursive: true, force: true });
  await rm(paths.projectDefaultOutputRoot, { recursive: true, force: true });
}

function resolveGeoAuditPaths() {
  const projectRoot = DEFAULT_GEO_PROJECT_ROOT;
  const runtimeDir = DEFAULT_RUNTIME_DIR;
  const statePath = join(runtimeDir, CURRENT_STATE_FILE_NAME);
  const scriptPath = join(projectRoot, "run-standalone-audit.ps1");
  const runtimeOutputsRoot = join(runtimeDir, OUTPUTS_DIR_NAME);
  const projectDefaultOutputRoot = join(projectRoot, "standalone-output");
  return {
    projectRoot,
    runtimeDir,
    statePath,
    scriptPath,
    runtimeOutputsRoot,
    projectDefaultOutputRoot,
    allowedExplicitOutputRoots: [runtimeOutputsRoot, projectDefaultOutputRoot],
  };
}

function buildIdleGeoAuditState(paths = resolveGeoAuditPaths()): GeoAuditRunState {
  const now = new Date().toISOString();
  return {
    runId: "idle",
    status: "idle",
    warnings: [],
    params: {},
    projectRoot: paths.projectRoot,
    scriptPath: paths.scriptPath,
    runtimeDir: paths.runtimeDir,
    statePath: paths.statePath,
    command: {
      file: POWERSHELL_EXECUTABLE,
      args: [],
    },
    stdoutTail: "",
    stderrTail: "",
    artifacts: buildGeoArtifactDescriptors(),
    lastUpdatedAt: now,
    processId: process.pid,
  };
}

function hydrateGeoAuditState(
  parsed: Partial<GeoAuditRunState> | undefined,
  paths = resolveGeoAuditPaths(),
): GeoAuditRunState {
  const idle = buildIdleGeoAuditState(paths);
  const status = normalizeGeoAuditStatus(parsed?.status);
  return {
    ...idle,
    ...parsed,
    status,
    runId: typeof parsed?.runId === "string" && parsed.runId.trim() ? parsed.runId.trim() : idle.runId,
    warnings: Array.isArray(parsed?.warnings)
      ? uniqueStrings(parsed.warnings.filter((item): item is string => typeof item === "string"))
      : [],
    params: {
      ...idle.params,
      ...(parsed?.params ?? {}),
    },
    command: {
      file: parsed?.command?.file?.trim() || idle.command.file,
      args: Array.isArray(parsed?.command?.args) ? parsed.command.args.filter((item): item is string => typeof item === "string") : [],
    },
    stdoutTail: typeof parsed?.stdoutTail === "string" ? parsed.stdoutTail : "",
    stderrTail: typeof parsed?.stderrTail === "string" ? parsed.stderrTail : "",
    artifacts: Array.isArray(parsed?.artifacts) ? parsed.artifacts.map((artifact) => hydrateArtifactDescriptor(artifact)) : buildGeoArtifactDescriptors(),
    processId: process.pid,
    projectRoot: paths.projectRoot,
    scriptPath: paths.scriptPath,
    runtimeDir: paths.runtimeDir,
    statePath: paths.statePath,
    lastUpdatedAt:
      typeof parsed?.lastUpdatedAt === "string" && parsed.lastUpdatedAt.trim()
        ? parsed.lastUpdatedAt
        : idle.lastUpdatedAt,
  };
}

function hydrateArtifactDescriptor(input: Partial<GeoAuditArtifactDescriptor>): GeoAuditArtifactDescriptor {
  const normalizedName = normalizeGeoAuditArtifactName(input.name);
  const fallbackName = GEO_AUDIT_ARTIFACT_NAMES.find((item) => item === input.name) ?? GEO_AUDIT_ARTIFACT_NAMES[0];
  const name = normalizedName ?? fallbackName;
  return {
    name,
    path: typeof input.path === "string" && input.path.trim() ? input.path.trim() : undefined,
    relativePath:
      typeof input.relativePath === "string" && input.relativePath.trim() ? input.relativePath.trim() : undefined,
    exists: input.exists === true,
    previewable: input.previewable !== false && name !== "GEO-REPORT.pdf",
    contentType:
      typeof input.contentType === "string" && input.contentType.trim()
        ? input.contentType.trim()
        : DEFAULT_ARTIFACT_CONTENT_TYPES[name],
    sizeBytes: typeof input.sizeBytes === "number" && Number.isFinite(input.sizeBytes) ? input.sizeBytes : undefined,
    updatedAt: typeof input.updatedAt === "string" && input.updatedAt.trim() ? input.updatedAt.trim() : undefined,
  };
}

function normalizeGeoAuditStatus(value: unknown): GeoAuditRunStatus {
  if (
    value === "idle" ||
    value === "running" ||
    value === "completed" ||
    value === "completed_with_warnings" ||
    value === "failed"
  ) {
    return value;
  }
  return "idle";
}

function normalizeGeoAuditInput(input: GeoAuditRunInput, paths: ReturnType<typeof resolveGeoAuditPaths>) {
  const url = typeof input.url === "string" ? input.url.trim() : "";
  if (!url) {
    throw new Error("GEO audit URL is required.");
  }
  const brandName = typeof input.brandName === "string" && input.brandName.trim() ? input.brandName.trim() : undefined;
  const maxPages =
    typeof input.maxPages === "number" && Number.isInteger(input.maxPages)
      ? Math.max(1, Math.min(50, input.maxPages))
      : DEFAULT_MAX_PAGES;
  const insecure = input.insecure === true;
  const outputDir = typeof input.outputDir === "string" && input.outputDir.trim() ? input.outputDir.trim() : undefined;
  const outputDirResolved = outputDir ? resolveGeoAuditOutputDir(outputDir, paths) : undefined;
  return {
    url,
    brandName,
    maxPages,
    insecure,
    outputDir,
    outputDirResolved,
  };
}

function resolveGeoAuditOutputDir(rawOutputDir: string, paths: ReturnType<typeof resolveGeoAuditPaths>): string {
  const candidate = rawOutputDir.trim();
  const resolvedCandidate = isAbsolute(candidate)
    ? resolve(candidate)
    : resolve(join(paths.runtimeOutputsRoot, candidate));
  if (!isPathInsideAnyRoot(resolvedCandidate, paths.allowedExplicitOutputRoots)) {
    throw new Error(
      `GEO outputDir must stay inside ${paths.runtimeOutputsRoot} or ${paths.projectDefaultOutputRoot}.`,
    );
  }
  return resolvedCandidate;
}

async function ensureGeoAuditPaths(paths: ReturnType<typeof resolveGeoAuditPaths>): Promise<void> {
  await mkdir(paths.runtimeDir, { recursive: true });
  await mkdir(paths.runtimeOutputsRoot, { recursive: true });
}

async function assertGeoProjectIsReady(projectRoot: string, scriptPath: string): Promise<void> {
  const [projectMeta, scriptMeta] = await Promise.all([safeStat(projectRoot), safeStat(scriptPath)]);
  if (!projectMeta?.isDirectory()) {
    throw new Error(`GEO project root is missing: ${projectRoot}`);
  }
  if (!scriptMeta?.isFile()) {
    throw new Error(`GEO run script is missing: ${scriptPath}`);
  }
}

function buildGeoAuditCommandArgs(
  scriptPath: string,
  params: ReturnType<typeof normalizeGeoAuditInput>,
): string[] {
  const args = ["-ExecutionPolicy", "Bypass", "-File", scriptPath, "-Url", params.url];
  if (params.outputDirResolved) {
    args.push("-OutputDir", params.outputDirResolved);
  }
  if (params.brandName) {
    args.push("-BrandName", params.brandName);
  }
  if (typeof params.maxPages === "number") {
    args.push("-MaxPages", String(params.maxPages));
  }
  if (params.insecure) {
    args.push("-Insecure");
  }
  return args;
}

async function finalizeGeoAuditRun(input: {
  resolveRun: (state: GeoAuditRunState) => void;
  paths: ReturnType<typeof resolveGeoAuditPaths>;
  exitCode: number;
  message: string | undefined;
  defaultOutputSnapshot: GeoAuditDefaultOutputSnapshot;
}) {
  const previousState = activeRunState ?? buildIdleGeoAuditState(input.paths);
  const finishedAt = new Date().toISOString();
  const outputDir =
    previousState.outputDir ||
    (await discoverDefaultGeoOutputDir(input.paths.projectDefaultOutputRoot, input.defaultOutputSnapshot, previousState.startedAt));
  const artifacts = await buildGeoArtifactDescriptorsFromOutputDir(outputDir);
  const warnings = collectGeoAuditWarnings({
    exitCode: input.exitCode,
    message: input.message,
    outputDir,
    artifacts,
  });
  const nextStatus = resolveGeoAuditRunStatus(input.exitCode, outputDir, artifacts);
  const nextMessage =
    input.message ||
    (nextStatus === "completed"
      ? "GEO audit finished successfully."
      : nextStatus === "completed_with_warnings"
        ? "GEO audit finished with warnings."
        : "GEO audit failed.");
  const nextState: GeoAuditRunState = {
    ...previousState,
    status: nextStatus,
    finishedAt,
    exitCode: input.exitCode,
    message: nextMessage,
    warnings,
    outputDir,
    artifacts,
    lastUpdatedAt: finishedAt,
    processId: process.pid,
  };
  activeRunState = nextState;
  await persistGeoAuditState(nextState);
  input.resolveRun(nextState);
}

function resolveGeoAuditRunStatus(
  exitCode: number,
  outputDir: string | undefined,
  artifacts: GeoAuditArtifactDescriptor[],
): GeoAuditRunStatus {
  if (exitCode === 0) {
    if (!outputDir) {
      return "failed";
    }
    if (artifacts.every((artifact) => artifact.exists)) {
      return "completed";
    }
    return "completed_with_warnings";
  }
  if (exitCode === 2) {
    return "completed_with_warnings";
  }
  return "failed";
}

function collectGeoAuditWarnings(input: {
  exitCode: number;
  message: string | undefined;
  outputDir: string | undefined;
  artifacts: GeoAuditArtifactDescriptor[];
}): string[] {
  const warnings: string[] = [];
  if (input.message) {
    warnings.push(input.message);
  }
  if (!input.outputDir) {
    warnings.push("No GEO output directory could be located for the latest run.");
  }
  const missingArtifacts = input.artifacts.filter((artifact) => !artifact.exists).map((artifact) => artifact.name);
  if (missingArtifacts.length > 0) {
    warnings.push(`Missing GEO deliverables: ${missingArtifacts.join(", ")}.`);
  }
  if (input.exitCode === 2) {
    warnings.push("The standalone GEO runner exited with warning code 2.");
  }
  if (input.exitCode !== 0 && input.exitCode !== 2) {
    warnings.push(`The standalone GEO runner exited with code ${input.exitCode}.`);
  }
  return uniqueStrings(warnings);
}

async function buildGeoArtifactDescriptorsFromOutputDir(
  outputDir: string | undefined,
): Promise<GeoAuditArtifactDescriptor[]> {
  const descriptors = buildGeoArtifactDescriptors();
  if (!outputDir) {
    return descriptors;
  }
  const result = await Promise.all(
    descriptors.map(async (descriptor) => {
      const artifactPath = join(outputDir, descriptor.name);
      const meta = await safeStat(artifactPath);
      if (!meta?.isFile()) {
        return descriptor;
      }
      return {
        ...descriptor,
        path: artifactPath,
        relativePath: relative(process.cwd(), artifactPath) || basename(artifactPath),
        exists: true,
        sizeBytes: meta.size,
        updatedAt: meta.mtime.toISOString(),
      };
    }),
  );
  return result;
}

function buildGeoArtifactDescriptors(): GeoAuditArtifactDescriptor[] {
  return GEO_AUDIT_ARTIFACT_NAMES.map((name) => ({
    name,
    exists: false,
    previewable: name !== "GEO-REPORT.pdf",
    contentType: DEFAULT_ARTIFACT_CONTENT_TYPES[name],
  }));
}

async function listDefaultOutputDirs(root: string): Promise<GeoAuditDefaultOutputSnapshot> {
  const entries = await safeReadDir(root);
  const dirs = await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isDirectory()) return undefined;
      const fullPath = join(root, entry.name);
      const meta = await safeStat(fullPath);
      if (!meta?.isDirectory()) return undefined;
      return {
        name: entry.name,
        path: fullPath,
        updatedAtMs: meta.mtimeMs,
      };
    }),
  );
  return dirs.filter((item): item is GeoAuditDefaultOutputSnapshot[number] => Boolean(item));
}

async function discoverDefaultGeoOutputDir(
  root: string,
  before: GeoAuditDefaultOutputSnapshot,
  startedAt: string | undefined,
): Promise<string | undefined> {
  const after = await listDefaultOutputDirs(root);
  if (after.length === 0) {
    return undefined;
  }
  const beforeByPath = new Map(before.map((item) => [item.path, item.updatedAtMs]));
  const startedAtMs = startedAt ? Date.parse(startedAt) : Number.NaN;
  const discovered = after
    .map((entry) => ({
      ...entry,
      changed: !beforeByPath.has(entry.path) || (beforeByPath.get(entry.path) ?? 0) !== entry.updatedAtMs,
    }))
    .filter((entry) => {
      if (entry.changed) return true;
      if (!Number.isFinite(startedAtMs)) return false;
      return entry.updatedAtMs >= startedAtMs - DEFAULT_OUTPUT_DISCOVERY_SKEW_MS;
    })
    .sort((left, right) => right.updatedAtMs - left.updatedAtMs);
  return discovered[0]?.path;
}

async function persistGeoAuditState(state: GeoAuditRunState): Promise<void> {
  const writeOperation = async () => {
    await mkdir(dirname(state.statePath), { recursive: true });
    const tempPath = `${state.statePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(tempPath, state.statePath);
  };
  const nextWrite = persistGeoAuditStateQueue.catch(() => undefined).then(writeOperation);
  persistGeoAuditStateQueue = nextWrite.catch(() => undefined);
  await nextWrite;
}

async function updateActiveRunState(
  mapper: (current: GeoAuditRunState) => GeoAuditRunState,
): Promise<void> {
  if (!activeRunState || activeRunState.status !== "running") {
    return;
  }
  activeRunState = mapper(activeRunState);
  await persistGeoAuditState(activeRunState);
}

function appendTail(current: string, chunk: string): string {
  const combined = `${current}${chunk}`.replace(/\r\n/g, "\n");
  if (combined.length <= STDOUT_TAIL_MAX_CHARS) {
    return combined;
  }
  return combined.slice(-STDOUT_TAIL_MAX_CHARS);
}

function normalizeGeoAuditArtifactName(value: unknown): GeoAuditArtifactName | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return GEO_AUDIT_ARTIFACT_NAMES.find((item) => item === value.trim());
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isPathInsideAnyRoot(path: string, roots: string[]): boolean {
  return roots.some((root) => isPathInsideRoot(path, root));
}

function isPathInsideRoot(path: string, root: string): boolean {
  const resolvedPath = resolve(path);
  const resolvedRoot = resolve(root);
  if (resolvedPath === resolvedRoot) {
    return true;
  }
  const relativePath = relative(resolvedRoot, resolvedPath);
  return relativePath !== "" && !relativePath.startsWith("..") && !relativePath.includes(`..${sep}`);
}

async function safeStat(path: string) {
  try {
    return await stat(path);
  } catch {
    return undefined;
  }
}

async function safeReadDir(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
}

export function getGeoAuditProjectRootForUi(): string {
  return resolveGeoAuditPaths().projectRoot;
}

export function getGeoAuditRuntimeDirForUi(): string {
  return resolveGeoAuditPaths().runtimeDir;
}

export function getGeoAuditArtifactContentType(name: GeoAuditArtifactName): string {
  return DEFAULT_ARTIFACT_CONTENT_TYPES[name];
}

export function isGeoAuditArtifactPreviewable(name: GeoAuditArtifactName): boolean {
  return extname(name).toLowerCase() !== ".pdf";
}
