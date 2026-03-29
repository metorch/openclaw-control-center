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
      education: {
        aiTakeoverEnabled: false,
        mode: "operator_only",
        updatedAt: "2026-03-25T01:00:00.000Z",
      },
      prediction: {
        aiTakeoverEnabled: false,
        mode: "operator_only",
        updatedAt: "2026-03-25T01:00:00.000Z",
      },
    },
    filters: { quick: "all" },
    aiEducationState: {
      config: {
        mode: "self_hosted",
        baseUrl: "http://127.0.0.1:3000",
        repoDir: "",
        accessCodeConfigured: false,
      },
      health: {
        status: "unknown",
        baseUrl: "http://127.0.0.1:3000",
        capabilities: {
          webSearch: false,
          imageGeneration: false,
          videoGeneration: false,
          tts: false,
        },
      },
      latestJob: {
        status: "idle",
      },
      launchUrl: "http://127.0.0.1:3000",
      embedUrl: "http://127.0.0.1:3000",
      ready: true,
      updatedAt: "2026-03-25T01:00:00.000Z",
      version: 1,
    },
    aiPredictionState: {
      config: {
        frontendBaseUrl: "http://127.0.0.1:3002",
        backendBaseUrl: "http://127.0.0.1:5002",
        repoDir: "C:\\MiroFish",
      },
      health: {
        status: "unknown",
        frontend: {
          ok: false,
          checkedUrl: "http://127.0.0.1:3002",
        },
        backend: {
          ok: false,
          checkedUrl: "http://127.0.0.1:5002/health",
        },
        message: "Run a health check after starting MiroFish.",
      },
      launchUrl: "http://127.0.0.1:3002",
      embedUrl: "http://127.0.0.1:3002",
      externalOpenUrl: "http://127.0.0.1:3002",
      demoUrl: "https://666ghj.github.io/mirofish-demo/",
      ready: false,
      updatedAt: "2026-03-25T01:00:00.000Z",
      version: 1,
    },
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
  assert(html.includes("AI Education"));
  assert(html.includes("Open AI Education"));
  assert(html.includes("feature=education"));
  assert(html.includes("AI Prediction"));
  assert(html.includes("Open AI Prediction"));
  assert(html.includes("feature=prediction"));
  assert(html.includes("data-features-root"));
  assert(!html.includes('data-feature-toggle="geo"'));
  assert(html.includes("Run the full GEO suite with one click"));
  assert(!html.includes("data-geo-workbench-root"));
  assert(html.indexOf("feature=geo") < html.indexOf("feature=education"));
  assert(html.indexOf("feature=education") < html.indexOf("feature=prediction"));
});

test("AI Education workbench renders the embedded shell instead of the old classroom job form", () => {
  const html = featureRenderers.renderFeaturesSection({
    compactStatusStrip: false,
    feature: "education",
    featureControl: {
      education: {
        aiTakeoverEnabled: true,
        mode: "openclaw_ai_scoped",
        updatedAt: "2026-03-27T08:00:00.000Z",
      },
    },
    filters: { quick: "all" },
    aiEducationState: {
      config: {
        mode: "self_hosted",
        baseUrl: "http://127.0.0.1:3000",
        repoDir: "C:\\openmaic",
        accessCodeConfigured: false,
        llmProviderPreset: "openai",
        llmModel: "gpt-4.1-mini",
        llmApiKeyConfigured: true,
        llmBaseUrl: "https://api.openai.com/v1",
        pdfProvider: "mineru",
        pdfApiKeyConfigured: true,
        pdfBaseUrl: "http://127.0.0.1:8888",
      },
      health: {
        status: "ok",
        checkedAt: "2026-03-27T08:10:00.000Z",
        baseUrl: "http://127.0.0.1:3000",
        message: "OpenMAIC is reachable.",
        version: "1.0.0",
        capabilities: {
          webSearch: true,
          imageGeneration: true,
          videoGeneration: false,
          tts: true,
        },
        pdfProviderVerification: {
          status: "ok",
          checkedAt: "2026-03-27T08:10:00.000Z",
          message: "MinerU verification succeeded.",
        },
      },
      latestJob: {
        status: "succeeded",
        jobId: "job-123",
        step: "classroom_ready",
        classroomUrl: "http://127.0.0.1:3000/classroom/abc",
      },
      openmaicConfigSync: {
        status: "pending_restart",
        updatedAt: "2026-03-27T08:10:00.000Z",
        message: "Restart OpenMAIC to reload server providers.",
      },
      observedServerProviders: {
        checkedAt: "2026-03-27T08:10:00.000Z",
        providers: {
          openai: {
            models: ["gpt-4.1-mini"],
          },
        },
        pdf: {
          mineru: {
            baseUrl: "http://127.0.0.1:8888",
          },
        },
        tts: {},
        asr: {},
        image: {},
        video: {},
        webSearch: {},
      },
      launchUrl: "http://127.0.0.1:3000",
      embedUrl: "http://127.0.0.1:3000",
      ready: true,
      updatedAt: "2026-03-27T08:10:00.000Z",
      version: 1,
    },
    language: "en",
    usageView: "cumulative",
  });

  assert(html.includes('data-ai-education-root'));
  assert(html.includes('data-ai-education-iframe'));
  assert(html.includes('data-ai-education-fullscreen-target'));
  assert(html.includes('data-ai-education-fullscreen'));
  assert(html.includes('data-ai-education-fullscreen-state'));
  assert(html.includes('data-ai-education-embed-status'));
  assert(html.includes('data-ai-education-reload-embed'));
  assert(html.includes("Workspace controls"));
  assert(html.includes("Fullscreen workspace"));
  assert(html.includes("Open in new tab"));
  assert(html.includes("Connection"));
  assert(html.includes("LLM API"));
  assert(html.includes("Document parsing"));
  assert(html.includes("Runtime / sync status"));
  assert(html.includes('data-ai-education-llm-form'));
  assert(html.includes('data-ai-education-pdf-form'));
  assert(html.includes('data-ai-education-apply-openmaic-config'));
  assert(html.includes('data-ai-education-sync-status'));
  assert(html.includes('data-ai-education-observed-providers'));
  assert(html.includes("Write provider config into OpenMAIC") || html.includes("Write model config into OpenMAIC"));
  assert(html.includes('data-feature-toggle="education"'));
  assert(html.includes("AI takeover enabled"));
  assert(html.indexOf('data-ai-education-fullscreen-target') < html.indexOf("Connection"));
  assert(!html.includes('data-ai-education-job-form'));
  assert(!html.includes("Generate classroom"));
});

test("AI Education workbench renders a fallback card and hosted recovery when local OpenMAIC is offline", () => {
  const html = featureRenderers.renderFeaturesSection({
    compactStatusStrip: false,
    feature: "education",
    featureControl: {
      education: {
        aiTakeoverEnabled: false,
        mode: "operator_only",
        updatedAt: "2026-03-27T08:00:00.000Z",
      },
    },
    filters: { quick: "all" },
    aiEducationState: {
      config: {
        mode: "self_hosted",
        baseUrl: "http://127.0.0.1:3000",
        repoDir: "",
        accessCodeConfigured: false,
      },
      health: {
        status: "error",
        baseUrl: "http://127.0.0.1:3000",
        message: "Local OpenMAIC is not reachable at http://127.0.0.1:3000. Start the local OpenMAIC service or switch to hosted OpenMAIC.",
        capabilities: {
          webSearch: false,
          imageGeneration: false,
          videoGeneration: false,
          tts: false,
        },
      },
      latestJob: {
        status: "idle",
      },
      launchUrl: "http://127.0.0.1:3000",
      embedUrl: "http://127.0.0.1:3000",
      ready: false,
      embedBlockedReason: "Local OpenMAIC is not reachable at http://127.0.0.1:3000. Start the local OpenMAIC service or switch to hosted OpenMAIC.",
      updatedAt: "2026-03-27T08:10:00.000Z",
      version: 1,
    },
    language: "en",
    usageView: "cumulative",
  });

  assert(html.includes('data-ai-education-fallback'));
  assert(html.includes("Embedded workspace unavailable"));
  assert(html.includes("Local OpenMAIC is not reachable at http://127.0.0.1:3000."));
  assert(html.includes("Use hosted now"));
  assert(html.includes("Open hosted directly"));
  assert(html.includes('src="about:blank"'));
  assert(!html.includes('data-ai-education-job-form'));
});

test("AI Prediction workbench renders the embedded shell, connection controls, and runtime health cards", () => {
  const html = featureRenderers.renderFeaturesSection({
    compactStatusStrip: false,
    feature: "prediction",
    featureControl: {
      prediction: {
        aiTakeoverEnabled: true,
        mode: "openclaw_ai_scoped",
        updatedAt: "2026-03-30T01:00:00.000Z",
      },
    },
    filters: { quick: "all" },
    aiPredictionState: {
      config: {
        frontendBaseUrl: "http://127.0.0.1:3002",
        backendBaseUrl: "http://127.0.0.1:5002",
        repoDir: "C:\\MiroFish",
      },
      health: {
        status: "ok",
        checkedAt: "2026-03-30T01:05:00.000Z",
        frontend: {
          ok: true,
          checkedUrl: "http://127.0.0.1:3002",
          statusCode: 200,
          message: "ok",
        },
        backend: {
          ok: true,
          checkedUrl: "http://127.0.0.1:5002/health",
          statusCode: 200,
          message: "{\"status\":\"ok\"}",
        },
        message: "MiroFish frontend and backend are reachable.",
      },
      launchUrl: "http://127.0.0.1:3002",
      embedUrl: "http://127.0.0.1:3002",
      externalOpenUrl: "http://127.0.0.1:3002",
      demoUrl: "https://666ghj.github.io/mirofish-demo/",
      ready: true,
      updatedAt: "2026-03-30T01:05:00.000Z",
      version: 1,
    },
    language: "en",
    usageView: "cumulative",
  });

  assert(html.includes('data-ai-prediction-root'));
  assert(html.includes('data-ai-prediction-iframe'));
  assert(html.includes('data-ai-prediction-fullscreen-target'));
  assert(html.includes('data-ai-prediction-fullscreen'));
  assert(html.includes('data-ai-prediction-fullscreen-state'));
  assert(html.includes('data-ai-prediction-embed-status'));
  assert(html.includes('data-ai-prediction-config-form'));
  assert(html.includes('data-ai-prediction-health-summary'));
  assert(html.includes('data-ai-prediction-frontend-health'));
  assert(html.includes('data-ai-prediction-backend-health'));
  assert(html.includes('data-ai-prediction-open-demo'));
  assert(html.includes('data-feature-toggle="prediction"'));
  assert(html.includes("AI takeover enabled"));
  assert(html.includes("Open demo"));
  assert(html.includes("Frontend URL"));
  assert(html.includes("Backend URL"));
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
  assert(script.includes("/api/features/education/state"));
  assert(script.includes("/api/features/education/config"));
  assert(script.includes("/api/features/education/health"));
  assert(script.includes("/api/features/education/apply-openmaic-config"));
  assert(script.includes("/api/features/prediction/state"));
  assert(script.includes("/api/features/prediction/config"));
  assert(script.includes("/api/features/prediction/health"));
  assert(script.includes("[data-ai-education-root]"));
  assert(script.includes("data-ai-education-iframe"));
  assert(script.includes("data-ai-education-reload-embed"));
  assert(script.includes("data-ai-education-use-hosted"));
  assert(script.includes("data-ai-education-fullscreen-target"));
  assert(script.includes("data-ai-education-fullscreen"));
  assert(script.includes("data-ai-education-fullscreen-state"));
  assert(script.includes("data-ai-education-apply-openmaic-config"));
  assert(script.includes("data-ai-education-sync-status"));
  assert(script.includes("data-ai-education-observed-providers"));
  assert(script.includes("[data-ai-prediction-root]"));
  assert(script.includes("data-ai-prediction-iframe"));
  assert(script.includes("data-ai-prediction-reload-embed"));
  assert(script.includes("data-ai-prediction-fullscreen-target"));
  assert(script.includes("data-ai-prediction-fullscreen"));
  assert(script.includes("data-ai-prediction-fullscreen-state"));
  assert(script.includes("data-ai-prediction-open-demo"));
  assert(script.includes("const collectConfigBody = () => {"));
  assert(script.includes("const applyOpenMaicConfig = async () => {"));
  assert(script.includes("about:blank"));
  assert(script.includes("contentWindow?.location?.href === 'about:blank'"));
  assert(script.includes("const normalizeEmbedUrl = (value) => {"));
  assert(script.includes("const syncIframeNavigation = (embedUrl, forceReload = false) => {"));
  assert(script.includes("const canFullscreen = () => fullscreenTarget instanceof HTMLElement && typeof fullscreenTarget.requestFullscreen === 'function';"));
  assert(script.includes("const toggleFullscreenWorkspace = async () => {"));
  assert(script.includes("document.addEventListener('fullscreenchange', updateFullscreenUi);"));
  assert(script.includes("applyState(saved, toText(saved.embedBlockedReason || saved.health?.message, l.reloadEmbed), true);"));
  assert(!script.includes("if (iframeNode.src !== embedUrl) {"));
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
