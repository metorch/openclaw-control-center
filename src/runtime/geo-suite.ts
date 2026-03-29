import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { URL } from "node:url";
import { getGeoAuditState } from "./geo-audit";

export const GEO_SUITE_MODULE_KEYS = [
  "citability",
  "crawlers",
  "llms",
  "brand",
  "technical",
  "schema",
  "content",
  "report",
] as const;

export type GeoSuiteModuleKey = (typeof GEO_SUITE_MODULE_KEYS)[number];
export type GeoSuiteModuleRunStatus =
  | "idle"
  | "running"
  | "completed"
  | "completed_with_warnings"
  | "failed";

export interface GeoSuiteModuleRunInput {
  module: GeoSuiteModuleKey;
  action?: string;
  url?: string;
  brandName?: string;
  domain?: string;
}

export interface GeoSuiteArtifactDescriptor {
  name: string;
  path?: string;
  relativePath?: string;
  exists: boolean;
  previewable: boolean;
  contentType: string;
  sizeBytes?: number;
  updatedAt?: string;
}

export interface GeoSuiteModuleRunState {
  module: GeoSuiteModuleKey;
  action?: string;
  runId: string;
  status: GeoSuiteModuleRunStatus;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  message?: string;
  warnings: string[];
  params: {
    url?: string;
    brandName?: string;
    domain?: string;
    sourceAuditPath?: string;
  };
  projectRoot: string;
  runtimeDir: string;
  statePath: string;
  outputDir?: string;
  command: {
    file: string;
    args: string[];
  };
  stdoutTail: string;
  stderrTail: string;
  artifacts: GeoSuiteArtifactDescriptor[];
  lastUpdatedAt: string;
  processId?: number;
}

export interface GeoSuiteArtifactContent {
  descriptor: GeoSuiteArtifactDescriptor;
  buffer: Buffer;
}

const DEFAULT_GEO_PROJECT_ROOT = resolve(
  process.env.GEO_SUITE_PROJECT_ROOT?.trim() ||
    "C:\\Users\\45441\\.openclaw\\workspace\\projects\\features\\GEO",
);
const DEFAULT_RUNTIME_DIR = resolve(
  process.env.GEO_SUITE_RUNTIME_DIR?.trim() || join(process.cwd(), "runtime", "geo-suite"),
);
const DEFAULT_PYTHON_EXE = process.env.GEO_SUITE_PYTHON_EXE?.trim() || "";
const CURRENT_STATE_FILE_NAME = "state.json";
const OUTPUTS_DIR_NAME = "outputs";
const STDOUT_TAIL_MAX_CHARS = 8_000;
const DEFAULT_ARTIFACT_CONTENT_TYPES: Record<string, string> = {
  "result.json": "application/json; charset=utf-8",
  "llms.txt": "text/plain; charset=utf-8",
  "llms-full.txt": "text/plain; charset=utf-8",
  "result.txt": "text/plain; charset=utf-8",
  "GEO-REPORT.pdf": "application/pdf",
};

const activeRunStates = new Map<GeoSuiteModuleKey, GeoSuiteModuleRunState>();
const activeRunPromises = new Map<GeoSuiteModuleKey, Promise<GeoSuiteModuleRunState>>();
const activeChildProcesses = new Map<GeoSuiteModuleKey, ChildProcessWithoutNullStreams>();
const persistQueues = new Map<GeoSuiteModuleKey, Promise<void>>();

export async function startGeoSuiteModuleRun(
  input: GeoSuiteModuleRunInput,
): Promise<GeoSuiteModuleRunState> {
  const module = normalizeGeoSuiteModuleKey(input.module);
  if (!module) {
    throw new Error(`module must be one of: ${GEO_SUITE_MODULE_KEYS.join(", ")}`);
  }
  const current = activeRunStates.get(module);
  if (current?.status === "running") {
    throw new Error(`The GEO ${module} module is already running.`);
  }

  const paths = resolveGeoSuitePaths(module);
  await ensureGeoSuitePaths(paths);
  const params = await normalizeGeoSuiteRunInput(module, input, paths);
  const command = buildGeoSuiteCommand(module, params, paths);
  await assertGeoSuiteProjectIsReady(paths.projectRoot, command.args[0]);
  const runId = `geo-suite-${module}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const startedAt = new Date().toISOString();
  const nextState: GeoSuiteModuleRunState = {
    module,
    action: params.action,
    runId,
    status: "running",
    startedAt,
    warnings: [],
    params: {
      url: params.url,
      brandName: params.brandName,
      domain: params.domain,
      sourceAuditPath: params.sourceAuditPath,
    },
    projectRoot: paths.projectRoot,
    runtimeDir: paths.moduleRuntimeDir,
    statePath: paths.statePath,
    outputDir: paths.outputDir,
    command,
    stdoutTail: "",
    stderrTail: "",
    artifacts: [],
    lastUpdatedAt: startedAt,
    processId: process.pid,
  };

  activeRunStates.set(module, nextState);
  await persistGeoSuiteState(nextState);

  let stdoutFull = "";
  let stderrFull = "";
  const child = spawn(command.file, command.args, {
    cwd: paths.projectRoot,
    env: process.env,
    windowsHide: true,
  });
  activeChildProcesses.set(module, child);

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdoutFull += chunk;
    void updateActiveGeoSuiteRunState(module, (state) => ({
      ...state,
      stdoutTail: appendTail(state.stdoutTail, chunk),
      lastUpdatedAt: new Date().toISOString(),
    }));
  });
  child.stderr.on("data", (chunk: string) => {
    stderrFull += chunk;
    void updateActiveGeoSuiteRunState(module, (state) => ({
      ...state,
      stderrTail: appendTail(state.stderrTail, chunk),
      lastUpdatedAt: new Date().toISOString(),
    }));
  });

  const runPromise = new Promise<GeoSuiteModuleRunState>((resolveRun) => {
    let settled = false;
    const finalizeOnce = (exitCode: number, message?: string) => {
      if (settled) return;
      settled = true;
      void finalizeGeoSuiteModuleRun({
        module,
        resolveRun,
        paths,
        params,
        exitCode,
        message,
        stdoutFull,
        stderrFull,
      });
    };
    child.on("error", (error) => finalizeOnce(1, `Failed to start GEO ${module} module: ${error.message}`));
    child.on("close", (code) => finalizeOnce(typeof code === "number" ? code : 1));
  }).finally(() => {
    activeRunPromises.delete(module);
    activeChildProcesses.delete(module);
  });

  activeRunPromises.set(module, runPromise);
  return nextState;
}

export async function getGeoSuiteModuleState(
  moduleInput: string,
): Promise<GeoSuiteModuleRunState> {
  const module = normalizeGeoSuiteModuleKey(moduleInput);
  if (!module) {
    throw new Error(`module must be one of: ${GEO_SUITE_MODULE_KEYS.join(", ")}`);
  }
  const active = activeRunStates.get(module);
  if (active) {
    return active;
  }

  const paths = resolveGeoSuitePaths(module);
  try {
    const raw = await readFile(paths.statePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<GeoSuiteModuleRunState>;
    const previousProjectRoot = typeof parsed.projectRoot === "string" ? parsed.projectRoot.trim() : "";
    const hydrated = hydrateGeoSuiteState(module, parsed, paths);
    const rebasedFromPreviousProjectRoot =
      previousProjectRoot && resolve(previousProjectRoot) !== resolve(paths.projectRoot);
    if (hydrated.status === "running") {
      const recovered: GeoSuiteModuleRunState = {
        ...hydrated,
        status: "failed",
        finishedAt: new Date().toISOString(),
        message:
          hydrated.message ||
          `The UI server no longer has a live GEO ${module} worker for this run. The previous running state was cleared.`,
        warnings: uniqueStrings([...hydrated.warnings, "Recovered a stale running state from disk."]),
        lastUpdatedAt: new Date().toISOString(),
        processId: process.pid,
      };
      await persistGeoSuiteState(recovered);
      activeRunStates.set(module, recovered);
      return recovered;
    }
    if (rebasedFromPreviousProjectRoot) {
      await persistGeoSuiteState(hydrated);
    }
    activeRunStates.set(module, hydrated);
    return hydrated;
  } catch {
    return buildIdleGeoSuiteState(module, paths);
  }
}

export async function readGeoSuiteModuleArtifact(
  moduleInput: string,
  artifactName: string,
): Promise<GeoSuiteArtifactContent> {
  const module = normalizeGeoSuiteModuleKey(moduleInput);
  if (!module) {
    throw new Error(`module must be one of: ${GEO_SUITE_MODULE_KEYS.join(", ")}`);
  }
  const state = await getGeoSuiteModuleState(module);
  const descriptor = state.artifacts.find((item) => item.name === artifactName.trim());
  if (!descriptor?.exists || !descriptor.path) {
    throw new Error(`GEO module artifact "${artifactName}" is not available for ${module}.`);
  }
  if (!isPathInsideRoot(descriptor.path, resolveGeoSuitePaths(module).moduleRuntimeDir)) {
    throw new Error("Requested GEO module artifact escaped the controlled module runtime directory.");
  }
  return {
    descriptor,
    buffer: await readFile(descriptor.path),
  };
}

export async function resetGeoSuiteRuntimeForTest(): Promise<void> {
  for (const child of activeChildProcesses.values()) {
    child.removeAllListeners();
  }
  activeChildProcesses.clear();
  activeRunPromises.clear();
  activeRunStates.clear();
  persistQueues.clear();
  await rm(DEFAULT_RUNTIME_DIR, { recursive: true, force: true });
}

export async function waitForGeoSuiteModuleRunToFinishForTest(
  moduleInput: string,
  timeoutMs = 15_000,
): Promise<GeoSuiteModuleRunState> {
  const module = normalizeGeoSuiteModuleKey(moduleInput);
  if (!module) {
    throw new Error(`module must be one of: ${GEO_SUITE_MODULE_KEYS.join(", ")}`);
  }
  const activePromise = activeRunPromises.get(module);
  if (!activePromise) {
    return await getGeoSuiteModuleState(module);
  }
  return await Promise.race([
    activePromise,
    new Promise<GeoSuiteModuleRunState>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out waiting for GEO ${module} module to finish.`)), timeoutMs);
    }),
  ]);
}

function resolveGeoSuitePaths(module: GeoSuiteModuleKey) {
  const projectRoot = DEFAULT_GEO_PROJECT_ROOT;
  const runtimeRoot = DEFAULT_RUNTIME_DIR;
  const moduleRuntimeDir = join(runtimeRoot, module);
  const outputsRoot = join(moduleRuntimeDir, OUTPUTS_DIR_NAME);
  return {
    module,
    projectRoot,
    runtimeRoot,
    moduleRuntimeDir,
    outputsRoot,
    outputDir: join(outputsRoot, "latest"),
    statePath: join(moduleRuntimeDir, CURRENT_STATE_FILE_NAME),
    scriptsDir: join(projectRoot, "scripts"),
    pythonExe: DEFAULT_PYTHON_EXE || join(projectRoot, ".venv", "Scripts", "python.exe"),
  };
}

async function normalizeGeoSuiteRunInput(
  module: GeoSuiteModuleKey,
  input: GeoSuiteModuleRunInput,
  paths: ReturnType<typeof resolveGeoSuitePaths>,
): Promise<{
  module: GeoSuiteModuleKey;
  action: string;
  url?: string;
  brandName?: string;
  domain?: string;
  sourceAuditPath?: string;
}> {
  const action = normalizeGeoSuiteAction(module, input.action);
  const url = normalizeOptionalUrl(input.url);
  const brandName = normalizeOptionalText(input.brandName, 240);
  const domain = normalizeOptionalDomain(input.domain, url);

  if (module === "brand") {
    const derivedBrandName = brandName || deriveBrandNameFromUrl(url);
    if (!derivedBrandName) {
      throw new Error("brandName is required for the GEO brand module when it cannot be derived from the current URL.");
    }
    return {
      module,
      action,
      url,
      brandName: derivedBrandName,
      domain,
    };
  }

  if (module === "report") {
    const auditState = await getGeoAuditState();
    const auditArtifact = auditState.artifacts.find((item) => item.name === "standalone-audit.json");
    if (!auditArtifact?.exists || !auditArtifact.path) {
      throw new Error("The GEO report module requires a successful standalone audit with standalone-audit.json available.");
    }
    return {
      module,
      action,
      sourceAuditPath: auditArtifact.path,
    };
  }

  if (!url) {
    throw new Error(`url is required for the GEO ${module} module.`);
  }

  return {
    module,
    action,
    url,
    brandName,
    domain,
  };
}

function buildGeoSuiteCommand(
  module: GeoSuiteModuleKey,
  params: Awaited<ReturnType<typeof normalizeGeoSuiteRunInput>>,
  paths: ReturnType<typeof resolveGeoSuitePaths>,
): { file: string; args: string[] } {
  const pythonExe = paths.pythonExe;
  const commandFile = pythonExe;
  const args: string[] = [];
  if (DEFAULT_PYTHON_EXE === "" && basename(pythonExe).toLowerCase() === "python.exe") {
    // no-op, keep direct python
  }

  if (module === "citability") {
    args.push(join(paths.scriptsDir, "citability_scorer.py"), String(params.url));
    return { file: commandFile, args };
  }
  if (module === "crawlers") {
    args.push(join(paths.scriptsDir, "fetch_page.py"), String(params.url), "robots");
    return { file: commandFile, args };
  }
  if (module === "llms") {
    args.push(join(paths.scriptsDir, "llmstxt_generator.py"), String(params.url), params.action);
    return { file: commandFile, args };
  }
  if (module === "brand") {
    args.push(join(paths.scriptsDir, "brand_scanner.py"), String(params.brandName));
    if (params.domain) {
      args.push(params.domain);
    }
    return { file: commandFile, args };
  }
  if (module === "technical" || module === "schema") {
    args.push(join(paths.scriptsDir, "fetch_page.py"), String(params.url), "page");
    return { file: commandFile, args };
  }
  if (module === "content") {
    args.push(join(paths.scriptsDir, "fetch_page.py"), String(params.url), "blocks");
    return { file: commandFile, args };
  }
  if (module === "report") {
    args.push(
      join(paths.scriptsDir, "generate_pdf_report.py"),
      String(params.sourceAuditPath),
      join(paths.outputDir, "GEO-REPORT.pdf"),
    );
    return { file: commandFile, args };
  }
  throw new Error(`Unsupported GEO suite module: ${module}`);
}

function normalizeGeoSuiteAction(module: GeoSuiteModuleKey, actionInput: string | undefined): string {
  const value = String(actionInput || "").trim().toLowerCase();
  if (module === "llms") {
    return value === "generate" ? "generate" : "validate";
  }
  if (module === "report") {
    return "generate_pdf";
  }
  return "run";
}

async function finalizeGeoSuiteModuleRun(input: {
  module: GeoSuiteModuleKey;
  resolveRun: (state: GeoSuiteModuleRunState) => void;
  paths: ReturnType<typeof resolveGeoSuitePaths>;
  params: Awaited<ReturnType<typeof normalizeGeoSuiteRunInput>>;
  exitCode: number;
  message?: string;
  stdoutFull: string;
  stderrFull: string;
}) {
  const finishedAt = new Date().toISOString();
  const previousState = activeRunStates.get(input.module) ?? buildIdleGeoSuiteState(input.module, input.paths);
  let artifacts: GeoSuiteArtifactDescriptor[] = [];
  const warnings: string[] = [];
  let nextStatus: GeoSuiteModuleRunStatus =
    input.exitCode === 0
      ? "completed"
      : input.exitCode === 2
        ? "completed_with_warnings"
        : "failed";
  let nextMessage = input.message;

  try {
    await mkdir(input.paths.outputDir, { recursive: true });
    if (input.exitCode === 0 || input.exitCode === 2) {
      const materialized = await materializeGeoSuiteArtifacts(
        input.module,
        input.params,
        input.paths.outputDir,
        input.stdoutFull,
      );
      artifacts = materialized.artifacts;
      warnings.push(...materialized.warnings);
      if (artifacts.length === 0) {
        warnings.push(`The GEO ${input.module} module did not register any output artifacts.`);
        nextStatus = "completed_with_warnings";
      }
      if (input.exitCode === 2) {
        warnings.push(`The GEO ${input.module} module exited with warning code 2.`);
      }
    } else {
      warnings.push(
        input.message || `The GEO ${input.module} module exited with code ${input.exitCode}.`,
      );
    }
  } catch (error) {
    nextStatus = "failed";
    warnings.push(error instanceof Error ? error.message : `Failed to finalize GEO ${input.module} output.`);
  }

  if (nextStatus === "completed" && warnings.length > 0) {
    nextStatus = "completed_with_warnings";
  }

  if (!nextMessage) {
    nextMessage =
      nextStatus === "completed"
        ? `GEO ${input.module} finished successfully.`
        : nextStatus === "completed_with_warnings"
          ? `GEO ${input.module} finished with warnings.`
          : `GEO ${input.module} failed.`;
  }

  const nextState: GeoSuiteModuleRunState = {
    ...previousState,
    action: input.params.action,
    status: nextStatus,
    finishedAt,
    exitCode: input.exitCode,
    message: nextMessage,
    warnings: uniqueStrings(warnings),
    outputDir: input.paths.outputDir,
    artifacts,
    lastUpdatedAt: finishedAt,
    processId: process.pid,
  };
  activeRunStates.set(input.module, nextState);
  await persistGeoSuiteState(nextState);
  input.resolveRun(nextState);
}

async function materializeGeoSuiteArtifacts(
  module: GeoSuiteModuleKey,
  params: Awaited<ReturnType<typeof normalizeGeoSuiteRunInput>>,
  outputDir: string,
  stdoutFull: string,
): Promise<{ artifacts: GeoSuiteArtifactDescriptor[]; warnings: string[] }> {
  const warnings: string[] = [];
  if (module === "report") {
    const pdfPath = join(outputDir, "GEO-REPORT.pdf");
    const metaPath = join(outputDir, "result.txt");
    await writeFile(metaPath, `Generated from ${params.sourceAuditPath}\n`, "utf8");
    return {
      artifacts: await buildGeoSuiteArtifactDescriptors(outputDir, ["GEO-REPORT.pdf", "result.txt"]),
      warnings,
    };
  }

  const parsed = parseJsonOutput(stdoutFull, module);
  warnings.push(...collectGeoSuiteOutputWarnings(module, parsed));
  const resultPath = join(outputDir, "result.json");
  await writeFile(resultPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

  if (module === "llms" && params.action === "generate") {
    const generated = parsed as Record<string, unknown>;
    const llms = typeof generated.generated_llmstxt === "string" ? generated.generated_llmstxt : "";
    const llmsFull =
      typeof generated.generated_llmstxt_full === "string" ? generated.generated_llmstxt_full : "";
    if (llms.trim()) {
      await writeFile(join(outputDir, "llms.txt"), llms, "utf8");
    }
    if (llmsFull.trim()) {
      await writeFile(join(outputDir, "llms-full.txt"), llmsFull, "utf8");
    }
    return {
      artifacts: await buildGeoSuiteArtifactDescriptors(outputDir, [
        "result.json",
        "llms.txt",
        "llms-full.txt",
      ]),
      warnings,
    };
  }

  return {
    artifacts: await buildGeoSuiteArtifactDescriptors(outputDir, ["result.json"]),
    warnings,
  };
}

async function buildGeoSuiteArtifactDescriptors(
  outputDir: string,
  names: string[],
): Promise<GeoSuiteArtifactDescriptor[]> {
  const descriptors = await Promise.all(
    names.map(async (name) => {
      const artifactPath = join(outputDir, name);
      const meta = await safeStat(artifactPath);
      const contentType = getGeoSuiteArtifactContentType(name);
      if (!meta?.isFile()) {
        return {
          name,
          exists: false,
          previewable: isGeoSuiteArtifactPreviewable(name),
          contentType,
        };
      }
      return {
        name,
        exists: true,
        previewable: isGeoSuiteArtifactPreviewable(name),
        contentType,
        path: artifactPath,
        relativePath: relative(process.cwd(), artifactPath) || basename(artifactPath),
        sizeBytes: meta.size,
        updatedAt: meta.mtime.toISOString(),
      };
    }),
  );
  return descriptors;
}

function parseJsonOutput(stdout: string, module: GeoSuiteModuleKey): Record<string, unknown> | unknown[] {
  const normalized = stdout.trim().replace(/^\uFEFF/, "");
  try {
    return JSON.parse(normalized);
  } catch (error) {
    throw new Error(`The GEO ${module} module returned non-JSON output and could not be parsed.`);
  }
}

function collectGeoSuiteOutputWarnings(
  module: GeoSuiteModuleKey,
  parsed: Record<string, unknown> | unknown[],
): string[] {
  const warnings: string[] = [];
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      warnings.push(`The GEO ${module} module returned an empty result set.`);
    }
    return warnings;
  }
  const errorText = typeof parsed.error === "string" ? parsed.error.trim() : "";
  if (errorText) {
    warnings.push(errorText);
  }
  const errors = Array.isArray(parsed.errors) ? parsed.errors.filter((item) => typeof item === "string") : [];
  warnings.push(...errors);
  if (module === "llms" && typeof parsed.generated_llmstxt === "string" && parsed.generated_llmstxt.trim() === "") {
    warnings.push("The GEO llms module did not generate llms.txt content.");
  }
  if (module === "llms" && typeof parsed.generated_llmstxt_full === "string" && parsed.generated_llmstxt_full.trim() === "") {
    warnings.push("The GEO llms module did not generate llms-full.txt content.");
  }
  return uniqueStrings(warnings);
}

function hydrateGeoSuiteState(
  module: GeoSuiteModuleKey,
  parsed: Partial<GeoSuiteModuleRunState>,
  paths: ReturnType<typeof resolveGeoSuitePaths>,
): GeoSuiteModuleRunState {
  const previousProjectRoot = typeof parsed.projectRoot === "string" ? parsed.projectRoot.trim() : "";
  const nextState: GeoSuiteModuleRunState = {
    module,
    action: typeof parsed.action === "string" ? parsed.action : undefined,
    runId: typeof parsed.runId === "string" ? parsed.runId : `geo-suite-${module}-idle`,
    status: normalizeGeoSuiteRunStatus(parsed.status),
    startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : undefined,
    finishedAt: typeof parsed.finishedAt === "string" ? parsed.finishedAt : undefined,
    exitCode: typeof parsed.exitCode === "number" ? parsed.exitCode : undefined,
    message: typeof parsed.message === "string" ? parsed.message : undefined,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter((item): item is string => typeof item === "string") : [],
    params: {
      url: normalizeOptionalText(parsed.params?.url, 4096),
      brandName: normalizeOptionalText(parsed.params?.brandName, 240),
      domain: normalizeOptionalText(parsed.params?.domain, 240),
      sourceAuditPath: normalizeOptionalText(parsed.params?.sourceAuditPath, 4096),
    },
    projectRoot: paths.projectRoot,
    runtimeDir: paths.moduleRuntimeDir,
    statePath: paths.statePath,
    outputDir: typeof parsed.outputDir === "string" ? parsed.outputDir : undefined,
    command: {
      file: typeof parsed.command?.file === "string" ? parsed.command.file : paths.pythonExe,
      args: Array.isArray(parsed.command?.args) ? parsed.command.args.filter((item): item is string => typeof item === "string") : [],
    },
    stdoutTail: typeof parsed.stdoutTail === "string" ? parsed.stdoutTail : "",
    stderrTail: typeof parsed.stderrTail === "string" ? parsed.stderrTail : "",
    artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts.map(hydrateGeoSuiteArtifactDescriptor) : [],
    lastUpdatedAt:
      typeof parsed.lastUpdatedAt === "string"
        ? parsed.lastUpdatedAt
        : parsed.finishedAt || parsed.startedAt || new Date().toISOString(),
    processId: typeof parsed.processId === "number" ? parsed.processId : process.pid,
  };
  return rebaseGeoSuiteStatePaths(nextState, previousProjectRoot, paths.projectRoot);
}

function hydrateGeoSuiteArtifactDescriptor(parsed: Partial<GeoSuiteArtifactDescriptor>): GeoSuiteArtifactDescriptor {
  const name = typeof parsed.name === "string" ? parsed.name : "result.json";
  return {
    name,
    path: typeof parsed.path === "string" ? parsed.path : undefined,
    relativePath: typeof parsed.relativePath === "string" ? parsed.relativePath : undefined,
    exists: parsed.exists === true,
    previewable:
      typeof parsed.previewable === "boolean" ? parsed.previewable : isGeoSuiteArtifactPreviewable(name),
    contentType: typeof parsed.contentType === "string" ? parsed.contentType : getGeoSuiteArtifactContentType(name),
    sizeBytes: typeof parsed.sizeBytes === "number" ? parsed.sizeBytes : undefined,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
  };
}

function rebaseGeoSuiteStatePaths(
  state: GeoSuiteModuleRunState,
  previousProjectRoot: string,
  nextProjectRoot: string,
): GeoSuiteModuleRunState {
  if (!previousProjectRoot || resolve(previousProjectRoot) === resolve(nextProjectRoot)) {
    return state;
  }
  const rebasedOutputDir = rebaseProjectPath(state.outputDir, previousProjectRoot, nextProjectRoot);
  const rebasedStdoutTail = replaceProjectRootInText(state.stdoutTail, previousProjectRoot, nextProjectRoot);
  const rebasedStderrTail = replaceProjectRootInText(state.stderrTail, previousProjectRoot, nextProjectRoot);
  const rebasedArtifacts = state.artifacts.map((artifact) => {
    const path = rebaseProjectPath(artifact.path, previousProjectRoot, nextProjectRoot);
    return {
      ...artifact,
      path,
      relativePath: path ? relative(process.cwd(), path) || basename(path) : artifact.relativePath,
    };
  });
  return {
    ...state,
    projectRoot: nextProjectRoot,
    outputDir: rebasedOutputDir,
    params: {
      ...state.params,
      sourceAuditPath: rebaseProjectPath(state.params.sourceAuditPath, previousProjectRoot, nextProjectRoot),
    },
    command: {
      file: rebaseProjectPath(state.command.file, previousProjectRoot, nextProjectRoot) || state.command.file,
      args: state.command.args.map((arg) => rebaseProjectPath(arg, previousProjectRoot, nextProjectRoot) || arg),
    },
    stdoutTail: rebasedStdoutTail,
    stderrTail: rebasedStderrTail,
    artifacts: rebasedArtifacts,
  };
}

function buildIdleGeoSuiteState(
  module: GeoSuiteModuleKey,
  paths: ReturnType<typeof resolveGeoSuitePaths>,
): GeoSuiteModuleRunState {
  return {
    module,
    runId: `geo-suite-${module}-idle`,
    status: "idle",
    warnings: [],
    params: {},
    projectRoot: paths.projectRoot,
    runtimeDir: paths.moduleRuntimeDir,
    statePath: paths.statePath,
    command: {
      file: paths.pythonExe,
      args: [],
    },
    stdoutTail: "",
    stderrTail: "",
    artifacts: [],
    lastUpdatedAt: new Date().toISOString(),
    processId: process.pid,
  };
}

async function ensureGeoSuitePaths(paths: ReturnType<typeof resolveGeoSuitePaths>): Promise<void> {
  await mkdir(paths.moduleRuntimeDir, { recursive: true });
  await mkdir(paths.outputsRoot, { recursive: true });
  const pythonMeta = await safeStat(paths.pythonExe);
  if (!pythonMeta?.isFile()) {
    throw new Error(
      `Python runtime for GEO modules was not found at ${paths.pythonExe}. Run the standalone GEO audit once or set GEO_SUITE_PYTHON_EXE explicitly.`,
    );
  }
}

async function assertGeoSuiteProjectIsReady(projectRoot: string, scriptPath: string): Promise<void> {
  const projectRootMeta = await safeStat(projectRoot);
  if (!projectRootMeta?.isDirectory()) {
    throw new Error(`The GEO suite project root was not found at ${projectRoot}.`);
  }
  const scriptMeta = await safeStat(scriptPath);
  if (!scriptMeta?.isFile()) {
    throw new Error(`The GEO suite module script was not found at ${scriptPath}.`);
  }
}

async function persistGeoSuiteState(state: GeoSuiteModuleRunState): Promise<void> {
  const currentQueue = persistQueues.get(state.module) ?? Promise.resolve();
  const nextWrite = currentQueue.catch(() => undefined).then(async () => {
    await mkdir(dirname(state.statePath), { recursive: true });
    const tempPath = `${state.statePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(tempPath, state.statePath);
  });
  persistQueues.set(state.module, nextWrite.catch(() => undefined));
  await nextWrite;
}

async function updateActiveGeoSuiteRunState(
  module: GeoSuiteModuleKey,
  mapper: (state: GeoSuiteModuleRunState) => GeoSuiteModuleRunState,
): Promise<void> {
  const current = activeRunStates.get(module);
  if (!current || current.status !== "running") {
    return;
  }
  const next = mapper(current);
  activeRunStates.set(module, next);
  await persistGeoSuiteState(next);
}

function normalizeGeoSuiteModuleKey(value: unknown): GeoSuiteModuleKey | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return GEO_SUITE_MODULE_KEYS.find((item) => item === value.trim().toLowerCase());
}

function normalizeGeoSuiteRunStatus(value: unknown): GeoSuiteModuleRunStatus {
  if (value === "running") return "running";
  if (value === "completed") return "completed";
  if (value === "completed_with_warnings") return "completed_with_warnings";
  if (value === "failed") return "failed";
  return "idle";
}

function normalizeOptionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, maxLength);
}

function normalizeOptionalUrl(value: unknown): string | undefined {
  const trimmed = normalizeOptionalText(value, 4096);
  if (!trimmed) {
    return undefined;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("URL must use http or https.");
    }
    return parsed.toString();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Invalid GEO module URL.");
  }
}

function normalizeOptionalDomain(value: unknown, urlValue: string | undefined): string | undefined {
  const explicit = normalizeOptionalText(value, 240);
  if (explicit) {
    return explicit;
  }
  if (!urlValue) {
    return undefined;
  }
  try {
    return new URL(urlValue).hostname;
  } catch {
    return undefined;
  }
}

function deriveBrandNameFromUrl(urlValue: string | undefined): string | undefined {
  if (!urlValue) {
    return undefined;
  }
  try {
    const hostname = new URL(urlValue).hostname.replace(/^www\./i, "");
    const primary = hostname.split(".")[0] || "";
    if (!primary) return undefined;
    return primary
      .split(/[-_]+/g)
      .filter(Boolean)
      .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
      .join(" ");
  } catch {
    return undefined;
  }
}

function appendTail(current: string, chunk: string): string {
  const combined = `${current}${chunk}`.replace(/\r\n/g, "\n");
  if (combined.length <= STDOUT_TAIL_MAX_CHARS) {
    return combined;
  }
  return combined.slice(-STDOUT_TAIL_MAX_CHARS);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function rebaseProjectPath(
  value: string | undefined,
  previousProjectRoot: string,
  nextProjectRoot: string,
): string | undefined {
  if (!value) {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const resolvedPrevious = resolve(previousProjectRoot);
  const resolvedNext = resolve(nextProjectRoot);
  const resolvedValue = resolve(trimmed);
  if (resolvedValue === resolvedPrevious) {
    return resolvedNext;
  }
  const relativeValue = relative(resolvedPrevious, resolvedValue);
  if (relativeValue === "" || relativeValue.startsWith("..") || relativeValue.includes(`..${sep}`)) {
    return trimmed;
  }
  return resolve(join(resolvedNext, relativeValue));
}

function replaceProjectRootInText(value: string, previousProjectRoot: string, nextProjectRoot: string): string {
  if (!value) {
    return value;
  }
  return value.split(previousProjectRoot).join(nextProjectRoot);
}

function getGeoSuiteArtifactContentType(name: string): string {
  return DEFAULT_ARTIFACT_CONTENT_TYPES[name] || inferGeoSuiteArtifactContentType(name);
}

function inferGeoSuiteArtifactContentType(name: string): string {
  const extension = extname(name).toLowerCase();
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".txt" || extension === ".md") return "text/plain; charset=utf-8";
  if (extension === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function isGeoSuiteArtifactPreviewable(name: string): boolean {
  return extname(name).toLowerCase() !== ".pdf";
}

async function safeStat(path: string) {
  try {
    return await stat(path);
  } catch {
    return undefined;
  }
}

function isPathInsideRoot(path: string, root: string): boolean {
  const resolvedPath = resolve(path);
  const resolvedRoot = resolve(root);
  if (resolvedPath === resolvedRoot) return true;
  const relativePath = relative(resolvedRoot, resolvedPath);
  return relativePath !== "" && !relativePath.startsWith("..") && !relativePath.includes(`..${sep}`);
}
