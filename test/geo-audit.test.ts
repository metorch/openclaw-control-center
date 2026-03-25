import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const geoAuditModuleHref = pathToFileURL(join(process.cwd(), "src", "runtime", "geo-audit.ts")).href;

interface GeoAuditModule {
  startGeoAuditRun(input: {
    url: string;
    brandName?: string;
    maxPages?: number;
    insecure?: boolean;
    outputDir?: string;
  }): Promise<{
    command: { args: string[] };
    params: { outputDirResolved?: string };
  }>;
  waitForGeoAuditRunToFinishForTest(timeoutMs?: number): Promise<{
    status: string;
    exitCode?: number;
    outputDir?: string;
    warnings: string[];
    stdoutTail: string;
    stderrTail: string;
    artifacts: Array<{ name: string; exists: boolean; path?: string }>;
    params: { outputDirResolved?: string };
  }>;
  readGeoAuditArtifact(name: string): Promise<{
    descriptor: { name: string };
    buffer: Buffer;
  }>;
  getGeoAuditSummary(): Promise<{
    available: boolean;
    artifactName: string;
    artifactPath?: string;
    artifactRelativePath?: string;
    artifactUpdatedAt?: string;
    loadedAt: string;
    error?: string;
    data?: {
      url?: string;
      brandName?: string;
      maxPages?: number;
      insecure?: boolean;
      outputDir?: string;
    };
  }>;
  resetGeoAuditRuntimeForTest(): Promise<void>;
}

interface GeoHarnessOptions {
  defaultExitCode?: 0 | 1 | 2;
}

interface GeoHarness {
  projectRoot: string;
  runtimeDir: string;
  cleanup(): Promise<void>;
  importModule(): Promise<GeoAuditModule>;
}

let sharedHarness: GeoHarness | undefined;
let sharedModule: GeoAuditModule | undefined;

test.before(async () => {
  sharedHarness = await createGeoHarness();
  sharedModule = await sharedHarness.importModule();
});

test.after(async () => {
  if (sharedModule) {
    await sharedModule.resetGeoAuditRuntimeForTest();
  }
  if (sharedHarness) {
    await sharedHarness.cleanup();
  }
});

test("GEO runner maps form parameters to PowerShell and exposes whitelisted artifacts", async () => {
  const harness = assertDefined(sharedHarness);
  const mod = assertDefined(sharedModule);
  await mod.resetGeoAuditRuntimeForTest();

  try {
    const started = await mod.startGeoAuditRun({
      url: "https://example.com/launch",
      brandName: "Acme Geo",
      maxPages: 9,
      insecure: true,
      outputDir: "batch-one",
    });
    const finished = await mod.waitForGeoAuditRunToFinishForTest();

    assert.equal(started.params.outputDirResolved, join(harness.runtimeDir, "outputs", "batch-one"));
    assert.deepEqual(started.command.args.slice(0, 3), ["-ExecutionPolicy", "Bypass", "-File"]);
    assert(started.command.args.includes("-Url"));
    assert(started.command.args.includes("https://example.com/launch"));
    assert(started.command.args.includes("-BrandName"));
    assert(started.command.args.includes("Acme Geo"));
    assert(started.command.args.includes("-MaxPages"));
    assert(started.command.args.includes("9"));
    assert(started.command.args.includes("-Insecure"));

    assert.equal(finished.status, "completed");
    assert.equal(finished.exitCode, 0);
    assert.equal(finished.outputDir, join(harness.runtimeDir, "outputs", "batch-one"));
    assert.match(finished.stdoutTail, /stdout marker/i);
    assert.match(finished.stderrTail, /stderr marker/i);
    assert.equal(finished.artifacts.filter((artifact) => artifact.exists).length, 5);

    const auditJson = await mod.readGeoAuditArtifact("standalone-audit.json");
    const payload = JSON.parse(auditJson.buffer.toString("utf8").replace(/^\uFEFF/, "")) as {
      url: string;
      brandName?: string;
      maxPages: number;
      insecure: boolean;
      outputDir: string;
    };
    assert.equal(payload.url, "https://example.com/launch");
    assert.equal(payload.brandName, "Acme Geo");
    assert.equal(payload.maxPages, 9);
    assert.equal(payload.insecure, true);
    assert.equal(payload.outputDir, join(harness.runtimeDir, "outputs", "batch-one"));
  } finally {
    await mod.resetGeoAuditRuntimeForTest();
  }
});

test("GEO runner discovers default standalone-output folders and preserves warning exit code 2", async () => {
  const harness = assertDefined(sharedHarness);
  const mod = assertDefined(sharedModule);
  await mod.resetGeoAuditRuntimeForTest();

  try {
    await mod.startGeoAuditRun({
      url: "https://example.com/warn-case",
      maxPages: 4,
    });
    const finished = await mod.waitForGeoAuditRunToFinishForTest();

    assert.equal(finished.status, "completed_with_warnings");
    assert.equal(finished.exitCode, 2);
    assert(finished.outputDir);
    assert.match(String(finished.outputDir), /standalone-output/i);
    assert(finished.warnings.some((warning) => /warning code 2/i.test(warning)));
    assert.equal(finished.artifacts.filter((artifact) => artifact.exists).length, 5);
  } finally {
    await mod.resetGeoAuditRuntimeForTest();
  }
});

test("GEO runner marks missing deliverables as warnings instead of a hard failure", async () => {
  const harness = assertDefined(sharedHarness);
  const mod = assertDefined(sharedModule);
  await mod.resetGeoAuditRuntimeForTest();

  try {
    await mod.startGeoAuditRun({
      url: "https://example.com/missing-deliverables",
      outputDir: "missing-case",
    });
    const finished = await mod.waitForGeoAuditRunToFinishForTest();

    assert.equal(finished.status, "completed_with_warnings");
    assert.equal(finished.exitCode, 0);
    assert(finished.warnings.some((warning) => /Missing GEO deliverables/i.test(warning)));
    assert.deepEqual(
      finished.artifacts.filter((artifact) => artifact.exists).map((artifact) => artifact.name).sort(),
      ["GEO-AUDIT-REPORT.md", "standalone-audit.json"].sort(),
    );
  } finally {
    await mod.resetGeoAuditRuntimeForTest();
  }
});

test("GEO runner keeps a single active run and rejects concurrent launches", async () => {
  const harness = assertDefined(sharedHarness);
  const mod = assertDefined(sharedModule);
  await mod.resetGeoAuditRuntimeForTest();

  try {
    await mod.startGeoAuditRun({
      url: "https://example.com/slow-run",
      outputDir: "slow-case",
    });

    await assert.rejects(
      () =>
        mod.startGeoAuditRun({
          url: "https://example.com/second-run",
          outputDir: "second-case",
        }),
      /already running/i,
    );

    const finished = await mod.waitForGeoAuditRunToFinishForTest(20_000);
    assert.equal(finished.status, "completed");
  } finally {
    await mod.resetGeoAuditRuntimeForTest();
  }
});

test("GEO runner enforces output boundaries and artifact whitelist reads", async () => {
  const harness = assertDefined(sharedHarness);
  const mod = assertDefined(sharedModule);
  const outsideDir = join(tmpdir(), "geo-audit-outside-root");
  await mod.resetGeoAuditRuntimeForTest();

  try {
    await assert.rejects(
      () =>
        mod.startGeoAuditRun({
          url: "https://example.com/outside-root",
          outputDir: outsideDir,
        }),
      /must stay inside/i,
    );

    await assert.rejects(() => mod.readGeoAuditArtifact("notes.txt"), /Unsupported GEO artifact/i);
  } finally {
    await mod.resetGeoAuditRuntimeForTest();
  }
});

test("GEO summary stays bounded to the latest standalone audit artifact", async () => {
  const harness = assertDefined(sharedHarness);
  const mod = assertDefined(sharedModule);
  await mod.resetGeoAuditRuntimeForTest();

  try {
    const beforeRun = await mod.getGeoAuditSummary();
    assert.equal(beforeRun.available, false);
    assert.equal(beforeRun.artifactName, "standalone-audit.json");

    await mod.startGeoAuditRun({
      url: "https://example.com/summary-case",
      brandName: "Summary Brand",
      maxPages: 6,
      outputDir: "summary-case",
    });
    await mod.waitForGeoAuditRunToFinishForTest();

    const summary = await mod.getGeoAuditSummary();
    assert.equal(summary.available, true);
    assert.equal(summary.artifactName, "standalone-audit.json");
    assert(summary.artifactPath);
    assert(summary.artifactRelativePath);
    assert(summary.artifactUpdatedAt);
    assert(summary.loadedAt);
    assert.equal(summary.data?.url, "https://example.com/summary-case");
    assert.equal(summary.data?.brandName, "Summary Brand");
    assert.equal(summary.data?.maxPages, 6);
    assert.equal(summary.data?.insecure, false);
    assert.equal(summary.data?.outputDir, join(harness.runtimeDir, "outputs", "summary-case"));
  } finally {
    await mod.resetGeoAuditRuntimeForTest();
  }
});

async function createGeoHarness(options: GeoHarnessOptions = {}): Promise<GeoHarness> {
  const root = await mkdtemp(join(tmpdir(), "geo-audit-runtime-"));
  const projectRoot = join(root, "geo-project");
  const runtimeDir = join(root, "geo-runtime");
  const scriptPath = join(projectRoot, "run-standalone-audit.ps1");

  await mkdir(projectRoot, { recursive: true });
  await mkdir(runtimeDir, { recursive: true });
  await writeFile(scriptPath, buildGeoHarnessScript(options.defaultExitCode ?? 0), "utf8");

  return {
    projectRoot,
    runtimeDir,
    async cleanup() {
      await rm(root, { recursive: true, force: true });
    },
    async importModule() {
      const previousProjectRoot = process.env.GEO_AUDIT_PROJECT_ROOT;
      const previousRuntimeDir = process.env.GEO_AUDIT_RUNTIME_DIR;
      process.env.GEO_AUDIT_PROJECT_ROOT = projectRoot;
      process.env.GEO_AUDIT_RUNTIME_DIR = runtimeDir;

      try {
        const mod = (await import(
          `${geoAuditModuleHref}?test=${Date.now()}-${Math.random().toString(16).slice(2)}`
        )) as GeoAuditModule;
        return mod;
      } finally {
        if (typeof previousProjectRoot === "string") {
          process.env.GEO_AUDIT_PROJECT_ROOT = previousProjectRoot;
        } else {
          delete process.env.GEO_AUDIT_PROJECT_ROOT;
        }
        if (typeof previousRuntimeDir === "string") {
          process.env.GEO_AUDIT_RUNTIME_DIR = previousRuntimeDir;
        } else {
          delete process.env.GEO_AUDIT_RUNTIME_DIR;
        }
      }
    },
  };
}

function buildGeoHarnessScript(defaultExitCode: number): string {
  return `
param(
  [Parameter(Mandatory = $true)]
  [string]$Url,
  [string]$BrandName,
  [int]$MaxPages = 5,
  [switch]$Insecure,
  [string]$OutputDir
)

$projectRoot = Split-Path -Parent $PSCommandPath
$mode = "normal"
if ($Url -match "warn") { $mode = "warn" }
elseif ($Url -match "missing") { $mode = "missing" }
elseif ($Url -match "slow") { $mode = "slow" }
elseif ($Url -match "fail") { $mode = "fail" }

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $defaultRoot = Join-Path $projectRoot "standalone-output"
  New-Item -ItemType Directory -Force -Path $defaultRoot | Out-Null
  $dirName = "default-" + $mode + "-" + [guid]::NewGuid().ToString("N")
  $OutputDir = Join-Path $defaultRoot $dirName
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Output ("stdout marker: " + $Url)
Write-Error "stderr marker"

if ($mode -eq "slow") {
  Start-Sleep -Milliseconds 1200
}

$payload = @{
  url = $Url
  brandName = $BrandName
  maxPages = $MaxPages
  insecure = [bool]$Insecure
  outputDir = $OutputDir
}
$payload | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $OutputDir "standalone-audit.json") -Encoding utf8
("# GEO report" + [Environment]::NewLine + [Environment]::NewLine + "Audit for " + $Url) | Set-Content -Path (Join-Path $OutputDir "GEO-AUDIT-REPORT.md") -Encoding utf8

if ($mode -ne "missing") {
  "llms summary for $Url" | Set-Content -Path (Join-Path $OutputDir "llms.txt") -Encoding utf8
  "llms full summary for $Url" | Set-Content -Path (Join-Path $OutputDir "llms-full.txt") -Encoding utf8
  [System.IO.File]::WriteAllBytes(
    (Join-Path $OutputDir "GEO-REPORT.pdf"),
    [System.Text.Encoding]::ASCII.GetBytes("%PDF-1.4 fake")
  )
}

if ($mode -eq "warn") {
  exit 2
}
if ($mode -eq "fail") {
  exit 1
}
exit ${defaultExitCode}
`.trimStart();
}

function assertDefined<T>(value: T | undefined): T {
  assert.notEqual(value, undefined);
  return value;
}
