import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const geoSuiteModuleHref = pathToFileURL(join(process.cwd(), "src", "runtime", "geo-suite.ts")).href;

interface GeoSuiteModule {
  startGeoSuiteModuleRun(input: {
    module: string;
    action?: string;
    url?: string;
    brandName?: string;
    domain?: string;
  }): Promise<{
    module: string;
    status: string;
    action?: string;
    command: { file: string; args: string[] };
    params: { url?: string; brandName?: string; domain?: string; sourceAuditPath?: string };
  }>;
  waitForGeoSuiteModuleRunToFinishForTest(
    module: string,
    timeoutMs?: number,
  ): Promise<{
    module: string;
    status: string;
    exitCode?: number;
    action?: string;
    warnings: string[];
    artifacts: Array<{ name: string; exists: boolean; path?: string }>;
    stdoutTail: string;
    stderrTail: string;
    params: { url?: string; brandName?: string; domain?: string; sourceAuditPath?: string };
  }>;
  readGeoSuiteModuleArtifact(
    module: string,
    artifact: string,
  ): Promise<{
    descriptor: { name: string };
    buffer: Buffer;
  }>;
  resetGeoSuiteRuntimeForTest(): Promise<void>;
}

interface GeoSuiteHarness {
  projectRoot: string;
  runtimeDir: string;
  auditRuntimeDir: string;
  seedGeoAuditState(): Promise<{ artifactPath: string }>;
  cleanup(): Promise<void>;
  importModule(): Promise<GeoSuiteModule>;
}

let sharedHarness: GeoSuiteHarness | undefined;
let sharedModule: GeoSuiteModule | undefined;

test.before(async () => {
  sharedHarness = await createGeoSuiteHarness();
  sharedModule = await sharedHarness.importModule();
});

test.after(async () => {
  if (sharedModule) {
    await sharedModule.resetGeoSuiteRuntimeForTest();
  }
  if (sharedHarness) {
    await sharedHarness.cleanup();
  }
});

test("technical GEO module produces a controlled result artifact", async () => {
  const mod = assertDefined(sharedModule);
  await mod.resetGeoSuiteRuntimeForTest();

  try {
    const started = await mod.startGeoSuiteModuleRun({
      module: "technical",
      url: "https://example.com/page",
    });
    const finished = await mod.waitForGeoSuiteModuleRunToFinishForTest("technical");

    assert.equal(started.module, "technical");
    assert.equal(started.command.file, process.execPath);
    assert.match(started.command.args[0] || "", /fetch_page\.py$/i);
    assert.equal(started.command.args[2], "page");

    assert.equal(finished.status, "completed");
    assert.equal(finished.exitCode, 0);
    assert.match(finished.stdoutTail, /"mode":"page"/i);
    assert.match(finished.stderrTail, /technical stderr/i);
    assert.deepEqual(
      finished.artifacts.filter((artifact) => artifact.exists).map((artifact) => artifact.name),
      ["result.json"],
    );

    const artifact = await mod.readGeoSuiteModuleArtifact("technical", "result.json");
    const payload = JSON.parse(artifact.buffer.toString("utf8")) as {
      url: string;
      mode: string;
      status_code: number;
    };
    assert.equal(payload.url, "https://example.com/page");
    assert.equal(payload.mode, "page");
    assert.equal(payload.status_code, 200);
  } finally {
    await mod.resetGeoSuiteRuntimeForTest();
  }
});

test("llms generate downgrades embedded upstream errors into completed_with_warnings", async () => {
  const mod = assertDefined(sharedModule);
  await mod.resetGeoSuiteRuntimeForTest();

  try {
    await mod.startGeoSuiteModuleRun({
      module: "llms",
      action: "generate",
      url: "https://example.com/warn-llms",
    });
    const finished = await mod.waitForGeoSuiteModuleRunToFinishForTest("llms");

    assert.equal(finished.status, "completed_with_warnings");
    assert.equal(finished.exitCode, 0);
    assert.equal(finished.action, "generate");
    assert(
      finished.warnings.some((warning) => /Failed to fetch homepage/i.test(warning)),
      `expected upstream error warning, got: ${finished.warnings.join(" | ")}`,
    );
    assert(
      finished.warnings.some((warning) => /did not generate llms\.txt content/i.test(warning)),
      `expected llms.txt warning, got: ${finished.warnings.join(" | ")}`,
    );
    assert(
      finished.warnings.some((warning) => /did not generate llms-full\.txt content/i.test(warning)),
      `expected llms-full.txt warning, got: ${finished.warnings.join(" | ")}`,
    );
    assert(finished.artifacts.some((artifact) => artifact.name === "result.json" && artifact.exists));
    assert(finished.artifacts.some((artifact) => artifact.name === "llms.txt" && artifact.exists === false));
    assert(finished.artifacts.some((artifact) => artifact.name === "llms-full.txt" && artifact.exists === false));
  } finally {
    await mod.resetGeoSuiteRuntimeForTest();
  }
});

test("report GEO module reuses the latest controlled audit artifact and writes a PDF", async () => {
  const harness = assertDefined(sharedHarness);
  const mod = assertDefined(sharedModule);
  await mod.resetGeoSuiteRuntimeForTest();

  try {
    const seeded = await harness.seedGeoAuditState();
    const started = await mod.startGeoSuiteModuleRun({
      module: "report",
    });
    const finished = await mod.waitForGeoSuiteModuleRunToFinishForTest("report");

    assert.equal(started.module, "report");
    assert.equal(started.action, "generate_pdf");
    assert.equal(started.params.sourceAuditPath, seeded.artifactPath);
    assert.equal(finished.status, "completed");
    assert.equal(finished.exitCode, 0);
    assert(finished.artifacts.some((artifact) => artifact.name === "GEO-REPORT.pdf" && artifact.exists));
    assert(finished.artifacts.some((artifact) => artifact.name === "result.txt" && artifact.exists));

    const pdf = await mod.readGeoSuiteModuleArtifact("report", "GEO-REPORT.pdf");
    assert.match(pdf.buffer.toString("ascii"), /^%PDF-1\.4/);
  } finally {
    await mod.resetGeoSuiteRuntimeForTest();
  }
});

test("GEO module runtime keeps one active run per module and rejects concurrent launches", async () => {
  const mod = assertDefined(sharedModule);
  await mod.resetGeoSuiteRuntimeForTest();

  try {
    await mod.startGeoSuiteModuleRun({
      module: "technical",
      url: "https://example.com/slow-technical",
    });

    await assert.rejects(
      () =>
        mod.startGeoSuiteModuleRun({
          module: "technical",
          url: "https://example.com/second-technical",
        }),
      /already running/i,
    );

    const finished = await mod.waitForGeoSuiteModuleRunToFinishForTest("technical", 20_000);
    assert.equal(finished.status, "completed");
  } finally {
    await mod.resetGeoSuiteRuntimeForTest();
  }
});

test("GEO module artifacts stay bounded to controlled outputs", async () => {
  const mod = assertDefined(sharedModule);
  await mod.resetGeoSuiteRuntimeForTest();

  try {
    await mod.startGeoSuiteModuleRun({
      module: "technical",
      url: "https://example.com/bounded-artifact",
    });
    await mod.waitForGeoSuiteModuleRunToFinishForTest("technical");

    await assert.rejects(
      () => mod.readGeoSuiteModuleArtifact("technical", "outside.txt"),
      /not available/i,
    );
  } finally {
    await mod.resetGeoSuiteRuntimeForTest();
  }
});

async function createGeoSuiteHarness(): Promise<GeoSuiteHarness> {
  const root = await mkdtemp(join(tmpdir(), "geo-suite-runtime-"));
  const projectRoot = join(root, "geo-project");
  const runtimeDir = join(root, "geo-suite-runtime");
  const auditRuntimeDir = join(root, "geo-audit-runtime");
  const scriptsDir = join(projectRoot, "scripts");

  await mkdir(projectRoot, { recursive: true });
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(auditRuntimeDir, { recursive: true });
  await mkdir(scriptsDir, { recursive: true });

  await writeFile(join(projectRoot, "run-standalone-audit.ps1"), "Write-Output 'stub'\n", "utf8");
  await writeFile(join(scriptsDir, "fetch_page.py"), buildFetchPageHarnessScript(), "utf8");
  await writeFile(join(scriptsDir, "llmstxt_generator.py"), buildLlmsHarnessScript(), "utf8");
  await writeFile(join(scriptsDir, "generate_pdf_report.py"), buildReportHarnessScript(), "utf8");
  await writeFile(join(scriptsDir, "brand_scanner.py"), buildBrandHarnessScript(), "utf8");
  await writeFile(join(scriptsDir, "citability_scorer.py"), buildCitabilityHarnessScript(), "utf8");

  return {
    projectRoot,
    runtimeDir,
    auditRuntimeDir,
    async seedGeoAuditState() {
      const outputDir = join(auditRuntimeDir, "outputs", "seeded-audit");
      const artifactPath = join(outputDir, "standalone-audit.json");
      const statePath = join(auditRuntimeDir, "state.json");
      await mkdir(outputDir, { recursive: true });
      await writeFile(
        artifactPath,
        `${JSON.stringify(
          {
            url: "https://example.com/report-source",
            brand_name: "Report Source",
            geo_score: 72,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      await writeFile(
        statePath,
        `${JSON.stringify(
          {
            runId: "seeded-audit",
            status: "completed",
            warnings: [],
            params: {
              url: "https://example.com/report-source",
            },
            projectRoot,
            scriptPath: join(projectRoot, "run-standalone-audit.ps1"),
            runtimeDir: auditRuntimeDir,
            statePath,
            outputDir,
            command: {
              file: "powershell.exe",
              args: [],
            },
            stdoutTail: "",
            stderrTail: "",
            artifacts: [
              {
                name: "standalone-audit.json",
                exists: true,
                previewable: true,
                path: artifactPath,
                relativePath: "outputs/seeded-audit/standalone-audit.json",
                contentType: "application/json; charset=utf-8",
              },
            ],
            lastUpdatedAt: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      return { artifactPath };
    },
    async cleanup() {
      await rm(root, { recursive: true, force: true });
    },
    async importModule() {
      const previousSuiteProjectRoot = process.env.GEO_SUITE_PROJECT_ROOT;
      const previousSuiteRuntimeDir = process.env.GEO_SUITE_RUNTIME_DIR;
      const previousSuitePythonExe = process.env.GEO_SUITE_PYTHON_EXE;
      const previousAuditProjectRoot = process.env.GEO_AUDIT_PROJECT_ROOT;
      const previousAuditRuntimeDir = process.env.GEO_AUDIT_RUNTIME_DIR;
      process.env.GEO_SUITE_PROJECT_ROOT = projectRoot;
      process.env.GEO_SUITE_RUNTIME_DIR = runtimeDir;
      process.env.GEO_SUITE_PYTHON_EXE = process.execPath;
      process.env.GEO_AUDIT_PROJECT_ROOT = projectRoot;
      process.env.GEO_AUDIT_RUNTIME_DIR = auditRuntimeDir;

      try {
        return (await import(
          `${geoSuiteModuleHref}?test=${Date.now()}-${Math.random().toString(16).slice(2)}`
        )) as GeoSuiteModule;
      } finally {
        restoreEnv("GEO_SUITE_PROJECT_ROOT", previousSuiteProjectRoot);
        restoreEnv("GEO_SUITE_RUNTIME_DIR", previousSuiteRuntimeDir);
        restoreEnv("GEO_SUITE_PYTHON_EXE", previousSuitePythonExe);
        restoreEnv("GEO_AUDIT_PROJECT_ROOT", previousAuditProjectRoot);
        restoreEnv("GEO_AUDIT_RUNTIME_DIR", previousAuditRuntimeDir);
      }
    },
  };
}

function buildFetchPageHarnessScript(): string {
  return `
#!/usr/bin/env node
const [url = '', mode = 'page'] = process.argv.slice(2);

const emit = () => {
  if (mode === 'robots') {
    process.stdout.write(JSON.stringify({
      url,
      mode,
      exists: true,
      ai_crawler_status: {
        GPTBot: { status: 'ALLOW', platform: 'OpenAI' },
      },
      errors: url.includes('warn') ? ['crawler warning'] : [],
    }));
    process.stderr.write('technical stderr\\n');
    return;
  }
  process.stdout.write(JSON.stringify({
    url,
    mode,
    status_code: 200,
    canonical: url,
    has_ssr_content: true,
    structured_data: [{ '@type': 'Organization' }],
    word_count: 123,
    errors: url.includes('warn') ? ['fetch warning'] : [],
  }));
  process.stderr.write('technical stderr\\n');
};

if (url.includes('slow')) {
  setTimeout(emit, 1200);
} else {
  emit();
}
`.trimStart();
}

function buildLlmsHarnessScript(): string {
  return `
#!/usr/bin/env node
const [url = '', action = 'validate'] = process.argv.slice(2);

if (action === 'validate') {
  process.stdout.write(JSON.stringify({
    url,
    exists: true,
    format_valid: true,
    issues: [],
    suggestions: ['Add more key pages'],
    full_version: { exists: true },
  }));
  process.exit(0);
}

if (url.includes('warn-llms')) {
  process.stdout.write(JSON.stringify({
    error: 'Failed to fetch homepage: simulated SSL error',
    generated_llmstxt: '',
    generated_llmstxt_full: '',
    pages_analyzed: 0,
    sections: {},
  }));
  process.exit(0);
}

process.stdout.write(JSON.stringify({
  generated_llmstxt: '# Example\\n> Summary\\n\\n## Main Pages\\n- [Home](https://example.com/): Homepage',
  generated_llmstxt_full: '# Example Full\\n> Full summary',
  pages_analyzed: 4,
  sections: {
    'Main Pages': [{ url, title: 'Home' }],
  },
}));
`.trimStart();
}

function buildReportHarnessScript(): string {
  return `
#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const [, , sourceAuditPath = '', outputPdf = ''] = process.argv;

fs.mkdirSync(path.dirname(outputPdf), { recursive: true });
fs.writeFileSync(outputPdf, Buffer.from('%PDF-1.4 fake geo suite report'));
process.stdout.write(JSON.stringify({ sourceAuditPath, outputPdf }));
`.trimStart();
}

function buildBrandHarnessScript(): string {
  return `
#!/usr/bin/env node
const [brandName = '', domain = ''] = process.argv.slice(2);
process.stdout.write(JSON.stringify({
  brandName,
  domain,
  platforms: {
    wikipedia: { has_wikipedia_page: false, has_wikidata_entry: true },
    linkedin: { has_company_page: true },
  },
  recommendations: ['Claim more profiles'],
}));
`.trimStart();
}

function buildCitabilityHarnessScript(): string {
  return `
#!/usr/bin/env node
const [url = ''] = process.argv.slice(2);
process.stdout.write(JSON.stringify({
  url,
  average_citability_score: 81,
  total_blocks_analyzed: 5,
  top_5_citable: [
    { heading: 'Why us', total_score: 88, grade: 'A' },
  ],
}));
`.trimStart();
}

function restoreEnv(name: string, value: string | undefined) {
  if (typeof value === "string") {
    process.env[name] = value;
  } else {
    delete process.env[name];
  }
}

function assertDefined<T>(value: T | undefined): T {
  assert.notEqual(value, undefined);
  return value;
}
