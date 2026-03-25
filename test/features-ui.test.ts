import assert from "node:assert/strict";
import test from "node:test";
import { renderDashboardSectionNavForSmoke } from "../src/ui/server";
import { createFeatureRenderers } from "../src/ui/server-features";
import { renderFeaturesScript } from "../src/ui/server-inline-scripts-features";

const featureRenderers = createFeatureRenderers({
  buildHomeQuery(
    _filters: Record<string, string>,
    compactStatusStrip: boolean,
    section = "overview",
    language = "en",
    usageView = "cumulative",
    extraParams: Record<string, string> = {},
  ) {
    const params = new URLSearchParams();
    params.set("compact", compactStatusStrip ? "1" : "0");
    params.set("section", section);
    params.set("lang", language);
    params.set("usage_view", usageView);
    for (const [key, value] of Object.entries(extraParams)) {
      if (String(value || "").trim()) {
        params.set(key, value);
      }
    }
    return params.toString();
  },
  escapeHtml(value: unknown) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },
  formatInt(value: number) {
    return String(value);
  },
  formatTimeAgoFromNow(value: string) {
    return `ago:${value}`;
  },
  pickUiText(language: string, english: string, chinese: string) {
    return language === "zh" ? chinese : english;
  },
});

const geoSummary = {
  available: true,
  artifactName: "standalone-audit.json",
  artifactUpdatedAt: "2026-03-25T01:00:30.000Z",
  loadedAt: "2026-03-25T01:00:31.000Z",
  data: {
    url: "https://example.com",
    brand_name: "Acme",
    date: "2026-03-25",
    geo_score: 78,
    executive_summary: "Example executive summary.",
    findings: [
      {
        severity: "high",
        title: "Entity coverage gap",
        description: "Add more machine-readable brand evidence.",
      },
    ],
    quick_wins: ["Publish llms.txt"],
    medium_term: ["Expand schema coverage"],
    strategic: ["Grow off-site brand authority"],
    platforms: {
      chatgpt: 81,
      perplexity: 74,
    },
    crawler_access: {
      GPTBot: {
        platform: "OpenAI",
        status: "ALLOW",
        recommendation: "Keep allowed.",
      },
    },
    technical_findings: {
      homepage: {
        status_code: 200,
        has_ssr_content: true,
        canonical: "https://example.com",
        errors: [],
      },
      sitemap_page_count: 12,
    },
    schema_findings: {
      count: 2,
      types: ["Organization", "FAQPage"],
    },
    content_findings: {
      pages_requested: 5,
      pages_analyzed: 3,
      homepage_citability: {
        average_citability_score: 73,
        total_blocks_analyzed: 6,
        optimal_length_passages: 4,
        top_5_citable: [
          {
            heading: "Why Acme",
            total_score: 81,
            grade: "A",
          },
        ],
      },
      pages: [
        {
          title: "Pricing",
          citability_score: 70,
          word_count: 420,
        },
      ],
    },
    brand_findings: {
      overall_recommendations: ["Claim more entity profiles"],
      platforms: {
        wikipedia: {
          has_wikipedia_page: false,
          has_wikidata_entry: true,
        },
        linkedin: {
          has_company_page: true,
        },
        youtube: {
          has_channel: false,
        },
      },
    },
    raw: {
      llms_validation: {
        exists: true,
        format_valid: true,
        issues: [],
        suggestions: ["Add more URL coverage"],
        full_version: {
          exists: true,
        },
      },
    },
  },
};

test("dashboard navigation exposes the top-level Features entry in both languages", () => {
  const en = renderDashboardSectionNavForSmoke("features", "en");
  const zh = renderDashboardSectionNavForSmoke("features", "zh");

  assert(en.includes('data-nav-link-key="features"'));
  assert(en.includes("Features"));
  assert(en.includes("Standalone tools and workbenches"));
  assert(zh.includes('data-nav-link-key="features"'));
  assert(zh.includes("\u529f\u80fd"));
  assert(zh.includes("\u72EC\u7ACB\u5DE5\u5177\u4E0E\u53EF\u89C6\u5316\u5DE5\u4F5C\u53F0"));
});

test("feature hub keeps GEO as the first controlled card without mounting the workbench root", () => {
  const html = featureRenderers.renderFeaturesSection({
    compactStatusStrip: false,
    feature: undefined,
    featureControl: {
      geo: {
        aiTakeoverEnabled: false,
        mode: "operator_only",
        updatedAt: "2026-03-25T01:00:00.000Z",
      },
    },
    filters: { quick: "all" },
    geoProjectRoot: "C:\\geo-root",
    geoState: {
      status: "idle",
      warnings: [],
      params: {},
      artifacts: [],
      stdoutTail: "",
      stderrTail: "",
    },
    language: "en",
    usageView: "cumulative",
  });

  assert(html.includes("Function hub"));
  assert(html.includes("GEO Suite"));
  assert(html.includes("Open GEO"));
  assert(html.includes("feature=geo"));
  assert(html.includes("data-features-root"));
  assert(!html.includes('data-feature-toggle="geo"'));
  assert(html.includes("one-click full-suite flow"));
  assert(!html.includes("data-geo-workbench-root"));
});

test("GEO workbench renders the controlled run form, suite modules, artifacts, and preview affordances", () => {
  const html = featureRenderers.renderFeaturesSection({
    compactStatusStrip: false,
    feature: "geo",
    featureControl: {
      geo: {
        aiTakeoverEnabled: true,
        mode: "openclaw_ai_scoped",
        updatedAt: "2026-03-25T01:00:00.000Z",
      },
    },
    filters: { quick: "all" },
    geoProjectRoot: "C:\\geo-root",
    geoState: {
      status: "completed_with_warnings",
      startedAt: "2026-03-25T01:00:00.000Z",
      finishedAt: "2026-03-25T01:00:30.000Z",
      exitCode: 2,
      message: "GEO audit finished with warnings.",
      warnings: ["Missing GEO deliverables: llms-full.txt."],
      params: {
        url: "https://example.com",
        brandName: "Acme",
        maxPages: 7,
        insecure: true,
        outputDir: "batch-one",
      },
      artifacts: [
        {
          name: "GEO-AUDIT-REPORT.md",
          exists: true,
          previewable: true,
          relativePath: "runtime/geo-audits/outputs/batch-one/GEO-AUDIT-REPORT.md",
          contentType: "text/markdown; charset=utf-8",
          sizeBytes: 128,
          updatedAt: "2026-03-25T01:00:30.000Z",
        },
        {
          name: "GEO-REPORT.pdf",
          exists: true,
          previewable: false,
          relativePath: "runtime/geo-audits/outputs/batch-one/GEO-REPORT.pdf",
          contentType: "application/pdf",
          sizeBytes: 512,
          updatedAt: "2026-03-25T01:00:30.000Z",
        },
      ],
      stdoutTail: "stdout ready",
      stderrTail: "stderr ready",
    },
    geoSummary,
    language: "en",
    usageView: "cumulative",
  });

  assert(html.includes("data-geo-workbench-root"));
  assert(html.includes("GEO Suite"));
  assert(!html.includes("GEO Suite Workbench"));
  assert(html.includes("data-geo-results-overview"));
  assert(html.includes("data-geo-results-capabilities"));
  assert(html.includes("data-geo-deliverables"));
  assert(html.includes("data-geo-advanced-settings"));
  assert(html.includes("data-geo-advanced-tools"));
  assert(html.includes("data-geo-debug-details"));
  assert(html.includes("data-geo-warnings-details"));
  assert(html.includes("data-geo-suite-actions"));
  assert(html.includes('data-geo-suite-toggle="citability"'));
  assert(!html.includes('data-geo-suite-card="overview"'));
  assert(html.includes('data-feature-toggle="geo"'));
  assert(html.includes("AI takeover enabled"));
  assert(html.includes("data-geo-run-form"));
  assert(html.includes('name="url"'));
  assert(html.includes('name="brandName"'));
  assert(html.includes('name="maxPages"'));
  assert(html.includes('name="outputDir"'));
  assert(html.includes('name="insecure" checked'));
  assert(html.includes("Run GEO suite"));
  assert(!html.includes("Project root: C:\\geo-root"));
  assert(html.includes("Completed with warnings"));
  assert(!html.includes("0 (success)"));
  assert(html.includes("2 (warnings)"));
  assert(html.includes('data-geo-preview-artifact="GEO-AUDIT-REPORT.md"'));
  assert(html.includes("/api/features/geo/artifact?artifact=GEO-AUDIT-REPORT.md"));
  assert(html.includes("/api/features/geo/artifact?artifact=GEO-REPORT.pdf&amp;download=1"));
  assert(html.includes("Source: standalone-audit.json"));
  assert(html.includes("stdout ready"));
  assert(html.includes("stderr ready"));
  assert(html.includes("Missing GEO deliverables: llms-full.txt."));
});

test("GEO feature script stays scoped to the workbench APIs, suite modules, and polling behavior", () => {
  const script = renderFeaturesScript("en");

  assert(script.includes("[data-features-root]"));
  assert(script.includes("/api/features/control"));
  assert(script.includes("/api/features/geo/state"));
  assert(script.includes("/api/features/geo/summary"));
  assert(script.includes("/api/features/geo/module/state?module="));
  assert(script.includes("/api/features/geo/module/run"));
  assert(script.includes("/api/features/geo/module/artifact?module="));
  assert(script.includes("/api/features/geo/run"));
  assert(script.includes("/api/features/geo/artifact?artifact="));
  assert(script.includes("window.__openclawGetMutationAuthState"));
  assert(script.includes("data-geo-advanced-tools"));
  assert(script.includes("openclaw:geo-suite:pending-refresh"));
  assert(script.includes("normalized === 'running' ? 3000 : 15000"));
  assert(script.includes("data-geo-suite-toggle"));
  assert(script.includes("data-geo-module-run"));
  assert(script.includes("data-geo-preview-artifact"));
  assert(script.includes("parseSummarySeed"));

  const body = script.replace(/^<script>/, "").replace(/<\/script>$/, "");
  assert.doesNotThrow(() => new Function(body));
});
