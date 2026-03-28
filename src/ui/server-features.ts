// @ts-nocheck

const GEO_SUITE_MODULES = [
  { key: "overview", titleEn: "Audit overview", titleZh: "\u5BA1\u8BA1\u603B\u89C8", blurbEn: "Composite GEO score, executive summary, and priority actions.", blurbZh: "\u770B GEO \u603B\u5206\u3001\u6267\u884C\u6458\u8981\u548C\u4F18\u5148\u52A8\u4F5C\u3002" },
  { key: "platforms", titleEn: "Platforms", titleZh: "\u5E73\u53F0\u4F18\u5316", blurbEn: "ChatGPT, Perplexity, Gemini, Bing Copilot, and Google AIO readiness.", blurbZh: "\u67E5 ChatGPT\u3001Perplexity\u3001Gemini\u3001Bing Copilot \u548C Google AIO \u7684\u5C31\u7EEA\u5EA6\u3002" },
  { key: "citability", titleEn: "Citability", titleZh: "\u53EF\u5F15\u8FF0\u6027", blurbEn: "Homepage citation readiness and the strongest or weakest blocks.", blurbZh: "\u770B\u9996\u9875\u53EF\u5F15\u8FF0\u6027\u4EE5\u53CA\u6700\u5F3A/\u6700\u5F31\u5185\u5BB9\u5757\u3002" },
  { key: "crawlers", titleEn: "Crawler access", titleZh: "\u722C\u866B\u8BBF\u95EE", blurbEn: "Tier-1 AI crawler status and unblock recommendations.", blurbZh: "\u68C0\u67E5\u4E00\u7EA7 AI \u722C\u866B\u72B6\u6001\u548C\u89E3\u9501\u5EFA\u8BAE\u3002" },
  { key: "llms", titleEn: "llms.txt", titleZh: "llms.txt", blurbEn: "Validation, generation status, and reusable llms deliverables.", blurbZh: "\u770B llms.txt \u6821\u9A8C\u3001\u751F\u6210\u72B6\u6001\u548C\u53EF\u590D\u7528\u4EA7\u7269\u3002" },
  { key: "brand", titleEn: "Brand authority", titleZh: "\u54C1\u724C\u4FE1\u53F7", blurbEn: "Wikipedia, LinkedIn, YouTube, Reddit, and wider entity signals.", blurbZh: "\u770B Wikipedia\u3001LinkedIn\u3001YouTube\u3001Reddit \u7B49\u5B9E\u4F53\u4FE1\u53F7\u3002" },
  { key: "technical", titleEn: "Technical", titleZh: "\u6280\u672F\u57FA\u7840", blurbEn: "HTTP, SSR, canonical, headers, sitemap, and fetch warnings.", blurbZh: "\u67E5 HTTP\u3001SSR\u3001canonical\u3001\u5B89\u5168 header\u3001sitemap \u548C\u62C9\u53D6\u544A\u8B66\u3002" },
  { key: "schema", titleEn: "Schema", titleZh: "\u7ED3\u6784\u5316\u6570\u636E", blurbEn: "Detected JSON-LD types and schema coverage gaps.", blurbZh: "\u770B\u68C0\u6D4B\u5230\u7684 JSON-LD \u7C7B\u578B\u548C schema \u8986\u76D6\u7F3A\u53E3\u3002" },
  { key: "content", titleEn: "Content", titleZh: "\u5185\u5BB9\u5206\u6790", blurbEn: "Priority pages, per-page citability, and content opportunities.", blurbZh: "\u770B\u9AD8\u4EF7\u503C\u9875\u9762\u3001\u9875\u7EA7 citability \u548C\u5185\u5BB9\u7A7A\u95F4\u3002" },
  { key: "report", titleEn: "Report", titleZh: "\u62A5\u544A\u4EA4\u4ED8", blurbEn: "Findings, quick wins, medium-term work, and final deliverables.", blurbZh: "\u67E5\u770B\u5173\u952E\u53D1\u73B0\u3001\u5FEB\u901F\u6539\u8FDB\u3001\u4E2D\u671F\u8BA1\u5212\u548C\u6700\u7EC8\u4EA4\u4ED8\u7269\u3002" },
];
const GEO_DIRECT_MODULES = GEO_SUITE_MODULES.filter((module) => module.key !== "overview" && module.key !== "platforms");

function createFeatureRenderers(deps) {
  const { buildHomeQuery, escapeHtml, formatInt, formatTimeAgoFromNow, pickUiText } = deps;

  function normalizeDashboardFeature(value) {
    return value === "geo" || value === "education" ? value : void 0;
  }

  function buildFeaturesHref(input, feature) {
    const query = new URLSearchParams(
      buildHomeQuery(input.filters, input.compactStatusStrip, "features", input.language, input.usageView),
    );
    if (feature) {
      query.set("feature", feature);
    } else {
      query.delete("feature");
    }
    return `/?${query.toString()}`;
  }

  function geoRunStatusLabel(status, language) {
    if (status === "running") return pickUiText(language, "Running", "\u8FD0\u884C\u4E2D");
    if (status === "completed") return pickUiText(language, "Completed", "\u5DF2\u5B8C\u6210");
    if (status === "completed_with_warnings")
      return pickUiText(language, "Completed with warnings", "\u5DF2\u5B8C\u6210\uFF0C\u4F46\u6709\u544A\u8B66");
    if (status === "failed") return pickUiText(language, "Failed", "\u5931\u8D25");
    return pickUiText(language, "Not started", "\u672A\u542F\u52A8");
  }

  function geoRunTone(status) {
    if (status === "running") return "warn";
    if (status === "completed") return "done";
    if (status === "completed_with_warnings") return "warn";
    if (status === "failed") return "blocked";
    return "enabled";
  }

  function formatGeoExitCode(exitCode, language) {
    if (typeof exitCode !== "number" || !Number.isFinite(exitCode)) {
      return pickUiText(language, "Not available", "\u6682\u65E0");
    }
    if (exitCode === 0) {
      return pickUiText(language, "0 (success)", "0\uFF08\u6210\u529F\uFF09");
    }
    if (exitCode === 2) {
      return pickUiText(language, "2 (warnings)", "2\uFF08\u544A\u8B66\uFF09");
    }
    return `${exitCode} ${pickUiText(language, "(failure)", "\uFF08\u5931\u8D25\uFF09")}`;
  }

  function educationModeLabel(mode, language) {
    return mode === "hosted"
      ? pickUiText(language, "Hosted", "\u6258\u7BA1\u6A21\u5F0F")
      : pickUiText(language, "Self-hosted", "\u81EA\u6258\u7BA1");
  }

  function educationHealthStatusLabel(status, language) {
    if (status === "ok") return pickUiText(language, "Connected", "\u5DF2\u8FDE\u63A5");
    if (status === "error") return pickUiText(language, "Connection failed", "\u8FDE\u63A5\u5931\u8D25");
    return pickUiText(language, "Not checked", "\u5C1A\u672A\u68C0\u67E5");
  }

  function educationHealthTone(status) {
    if (status === "ok") return "done";
    if (status === "error") return "blocked";
    return "enabled";
  }

  function educationJobStatusLabel(status, language) {
    if (status === "queued") return pickUiText(language, "Queued", "\u6392\u961F\u4E2D");
    if (status === "running") return pickUiText(language, "Running", "\u8FD0\u884C\u4E2D");
    if (status === "succeeded") return pickUiText(language, "Ready", "\u5DF2\u5C31\u7EEA");
    if (status === "failed") return pickUiText(language, "Failed", "\u5931\u8D25");
    return pickUiText(language, "No job yet", "\u6682\u65E0\u4EFB\u52A1");
  }

  function educationJobTone(status) {
    if (status === "queued" || status === "running") return "warn";
    if (status === "succeeded") return "done";
    if (status === "failed") return "blocked";
    return "enabled";
  }

  function educationEmbedStatusLabel(state, language) {
    if (state.ready === true) {
      return pickUiText(language, "Embedded workspace ready", "\u5185\u5D4C\u5DE5\u4F5C\u533A\u5DF2\u5C31\u7EEA");
    }
    return pickUiText(language, "Attention required", "\u9700\u8981\u5904\u7406");
  }

  function educationEmbedTone(state) {
    if (state.ready === true && state.health?.status === "ok") return "done";
    if (state.ready === true) return "enabled";
    return "blocked";
  }

  function educationNeedsHostedRecovery(state) {
    return (
      state.config?.mode === "self_hosted" &&
      state.config?.baseUrl === "http://127.0.0.1:3000" &&
      state.health?.status === "error"
    );
  }

  function educationExternalOpenUrl(state) {
    if (educationNeedsHostedRecovery(state)) {
      return "https://open.maic.chat";
    }
    return state.launchUrl || state.config?.baseUrl || "https://open.maic.chat";
  }

  function educationExternalOpenLabel(state, language) {
    if (educationNeedsHostedRecovery(state)) {
      return pickUiText(language, "Open hosted OpenMAIC", "\u6253\u5F00 hosted OpenMAIC");
    }
    return pickUiText(language, "Open in new tab", "\u65B0\u6807\u7B7E\u6253\u5F00");
  }

  function getAiEducationState(input) {
    const state = input.aiEducationState || {};
    const config = state.config || {};
    const health = state.health || {};
    const latestJob = state.latestJob || {};
    const sync = state.openmaicConfigSync || {};
    const observed = state.observedServerProviders || {};
    return {
      ...state,
      config: {
        mode: config.mode === "hosted" ? "hosted" : "self_hosted",
        baseUrl: config.baseUrl || "",
        repoDir: config.repoDir || "",
        accessCodeConfigured: config.accessCodeConfigured === true,
        accessCodeHint: config.accessCodeHint || "",
        llmProviderPreset: config.llmProviderPreset || "openai",
        llmModel: config.llmModel || "",
        llmApiKeyConfigured: config.llmApiKeyConfigured === true,
        llmBaseUrl: config.llmBaseUrl || "",
        ttsProviderPreset: config.ttsProviderPreset || "openai-tts",
        ttsModel: config.ttsModel || "",
        ttsApiKeyConfigured: config.ttsApiKeyConfigured === true,
        ttsBaseUrl: config.ttsBaseUrl || "",
        imageProviderPreset: config.imageProviderPreset || "nano-banana",
        imageModel: config.imageModel || "",
        imageApiKeyConfigured: config.imageApiKeyConfigured === true,
        imageBaseUrl: config.imageBaseUrl || "",
        videoProviderPreset: config.videoProviderPreset || "veo",
        videoModel: config.videoModel || "",
        videoApiKeyConfigured: config.videoApiKeyConfigured === true,
        videoBaseUrl: config.videoBaseUrl || "",
        pdfProvider:
          config.pdfProvider === "mineru" || config.pdfProvider === "opendataloader"
            ? config.pdfProvider
            : "unpdf",
        pdfApiKeyConfigured: config.pdfApiKeyConfigured === true,
        pdfBaseUrl: config.pdfBaseUrl || "",
      },
      health: {
        status: health.status || "unknown",
        checkedAt: health.checkedAt,
        baseUrl: health.baseUrl || config.baseUrl || "",
        message: health.message || "",
        version: health.version || "",
        capabilities: {
          webSearch: health.capabilities?.webSearch === true,
          imageGeneration: health.capabilities?.imageGeneration === true,
          videoGeneration: health.capabilities?.videoGeneration === true,
          tts: health.capabilities?.tts === true,
        },
        pdfProviderVerification: {
          status: health.pdfProviderVerification?.status || "unknown",
          checkedAt: health.pdfProviderVerification?.checkedAt || "",
          message: health.pdfProviderVerification?.message || "",
        },
      },
      latestJob: {
        status: latestJob.status || "idle",
        jobId: latestJob.jobId || "",
        requirement: latestJob.requirement || "",
        step: latestJob.step || "",
        progress: latestJob.progress,
        message: latestJob.message || "",
        pollUrl: latestJob.pollUrl || "",
        pollIntervalMs: latestJob.pollIntervalMs,
        scenesGenerated: latestJob.scenesGenerated,
        totalScenes: latestJob.totalScenes,
        classroomId: latestJob.classroomId || "",
        classroomUrl: latestJob.classroomUrl || "",
        error: latestJob.error || "",
        updatedAt: latestJob.updatedAt || "",
      },
      openmaicConfigSync: {
        status: sync.status || "idle",
        updatedAt: sync.updatedAt || "",
        message: sync.message || "",
      },
      observedServerProviders: {
        checkedAt: observed.checkedAt || "",
        providers: observed.providers || {},
        tts: observed.tts || {},
        asr: observed.asr || {},
        pdf: observed.pdf || {},
        image: observed.image || {},
        video: observed.video || {},
        webSearch: observed.webSearch || {},
      },
      launchUrl: state.launchUrl || config.baseUrl || "",
      embedUrl: state.embedUrl || state.launchUrl || config.baseUrl || "",
      ready: state.ready === true,
      embedBlockedReason: state.embedBlockedReason || "",
    };
  }

  function renderEducationCapabilityBadges(capabilities, language) {
    const items = [
      {
        key: "webSearch",
        label: pickUiText(language, "Web search", "\u8054\u7F51\u641C\u7D22"),
      },
      {
        key: "imageGeneration",
        label: pickUiText(language, "Image", "\u56FE\u50CF"),
      },
      {
        key: "videoGeneration",
        label: pickUiText(language, "Video", "\u89C6\u9891"),
      },
      {
        key: "tts",
        label: pickUiText(language, "TTS", "\u8BED\u97F3"),
      },
    ];
    return `<div class="feature-card-actions">${items
      .map((item) => {
        const enabled = capabilities?.[item.key] === true;
        return `<span class="badge ${enabled ? "done" : "enabled"}">${escapeHtml(item.label)}${
          enabled ? "" : ` ${escapeHtml(pickUiText(language, "off", "\u5173"))}`
        }</span>`;
      })
      .join("")}</div>`;
  }

  function educationSyncStatusLabel(status, language) {
    if (status === "synced") return pickUiText(language, "Synced", "\u5DF2\u540C\u6B65");
    if (status === "pending_restart")
      return pickUiText(language, "Pending restart", "\u5F85\u91CD\u542F");
    if (status === "error") return pickUiText(language, "Sync error", "\u540C\u6B65\u5931\u8D25");
    return pickUiText(language, "Not applied", "\u672A\u5199\u5165");
  }

  function educationSyncTone(status) {
    if (status === "synced") return "done";
    if (status === "pending_restart") return "warn";
    if (status === "error") return "blocked";
    return "enabled";
  }

  function educationPdfVerificationLabel(state, language) {
    if (state?.status === "ok") return pickUiText(language, "Verified", "\u5DF2\u9A8C\u8BC1");
    if (state?.status === "error") return pickUiText(language, "Verification failed", "\u9A8C\u8BC1\u5931\u8D25");
    if (state?.status === "skipped") return pickUiText(language, "Skipped", "\u5DF2\u8DF3\u8FC7");
    return pickUiText(language, "Not checked", "\u5C1A\u672A\u68C0\u67E5");
  }

  function renderEducationProviderOptions(selectedValue) {
    const options = [
      ["openai", "OpenAI"],
      ["anthropic", "Anthropic"],
      ["google", "Google"],
      ["deepseek", "DeepSeek"],
      ["qwen", "Qwen"],
      ["kimi", "Kimi"],
      ["minimax", "MiniMax"],
      ["glm", "GLM"],
      ["siliconflow", "SiliconFlow"],
      ["doubao", "Doubao"],
      ["grok", "Grok"],
      ["custom_openai_compatible", "Custom OpenAI-compatible"],
    ];
    return options
      .map(
        ([value, label]) =>
          `<option value="${escapeHtml(value)}"${selectedValue === value ? " selected" : ""}>${escapeHtml(label)}</option>`,
      )
      .join("");
  }

  function renderEducationTtsProviderOptions(selectedValue) {
    const options = [
      ["openai-tts", "OpenAI TTS"],
      ["azure-tts", "Azure TTS"],
      ["glm-tts", "GLM TTS"],
      ["qwen-tts", "Qwen TTS"],
      ["doubao-tts", "Doubao TTS"],
      ["elevenlabs-tts", "ElevenLabs TTS"],
    ];
    return options
      .map(
        ([value, label]) =>
          `<option value="${escapeHtml(value)}"${selectedValue === value ? " selected" : ""}>${escapeHtml(label)}</option>`,
      )
      .join("");
  }

  function renderEducationImageProviderOptions(selectedValue) {
    const options = [
      ["seedream", "Seedream"],
      ["qwen-image", "Qwen Image"],
      ["nano-banana", "Nano Banana"],
      ["grok-image", "Grok Image"],
    ];
    return options
      .map(
        ([value, label]) =>
          `<option value="${escapeHtml(value)}"${selectedValue === value ? " selected" : ""}>${escapeHtml(label)}</option>`,
      )
      .join("");
  }

  function renderEducationVideoProviderOptions(selectedValue) {
    const options = [
      ["seedance", "Seedance"],
      ["kling", "Kling"],
      ["veo", "Veo"],
      ["sora", "Sora"],
      ["grok-video", "Grok Video"],
    ];
    return options
      .map(
        ([value, label]) =>
          `<option value="${escapeHtml(value)}"${selectedValue === value ? " selected" : ""}>${escapeHtml(label)}</option>`,
      )
      .join("");
  }

  function renderEducationObservedProviderSummary(observed, language) {
    const sections = [
      ["providers", pickUiText(language, "LLM", "LLM")],
      ["pdf", pickUiText(language, "PDF", "PDF")],
      ["tts", "TTS"],
      ["asr", "ASR"],
      ["image", pickUiText(language, "Image", "\u56FE\u50CF")],
      ["video", pickUiText(language, "Video", "\u89C6\u9891")],
      ["webSearch", pickUiText(language, "Search", "\u641C\u7D22")],
    ];
    const rows = sections
      .map(([key, label]) => {
        const names = Object.keys(observed?.[key] || {});
        if (names.length === 0) {
          return "";
        }
        return `<article class="status-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(names.join(", "))}</strong></article>`;
      })
      .filter(Boolean)
      .join("");
    if (!rows) {
      return `<div class="empty-state">${escapeHtml(
        pickUiText(language, "No server-configured providers observed yet.", "\u8FD8\u6CA1\u6709\u89C2\u5BDF\u5230 server-configured providers\u3002"),
      )}</div>`;
    }
    return `<div class="geo-status-strip">${rows}</div>`;
  }

  function featureTakeoverLabel(enabled, language) {
    return enabled
      ? pickUiText(language, "AI takeover enabled", "\u5DF2\u542F\u7528 AI \u63A5\u7BA1")
      : pickUiText(language, "Operator only", "\u4EC5\u9650\u4EBA\u5DE5");
  }

  function featureTakeoverNote(enabled, language) {
    return enabled
      ? pickUiText(
          language,
          "OpenClaw AI may use this feature's controlled APIs and take over supported flows, but it still cannot scan unrelated history or repositories.",
          "OpenClaw AI \u53EF\u4EE5\u63A5\u7BA1\u8FD9\u4E2A\u529F\u80FD\u7684\u53D7\u63A7 API \u548C\u540E\u7EED\u652F\u6301\u7684\u6D41\u7A0B\uFF0C\u4F46\u4ECD\u4E0D\u80FD\u626B\u63CF\u65E0\u5173\u5386\u53F2\u6216\u4ED3\u5E93\u3002",
        )
      : pickUiText(
          language,
          "The feature remains operator-run only until you explicitly authorize AI takeover here.",
          "\u5728\u4F60\u660E\u786E\u5728\u8FD9\u91CC\u6388\u6743\u4E4B\u524D\uFF0C\u8FD9\u4E2A\u529F\u80FD\u4ECD\u7136\u53EA\u80FD\u7531\u4EBA\u5DE5\u64CD\u4F5C\u3002",
        );
  }

  function renderFeatureTakeoverControl(featureKey, enabled, language) {
    return `<div class="feature-toggle-shell" data-feature-toggle-shell="${escapeHtml(featureKey)}">
      <div class="feature-toggle-copy">
        <div class="meta"><strong>${escapeHtml(
          pickUiText(language, "OpenClaw AI takeover", "OpenClaw AI \u63A5\u7BA1"),
        )}</strong></div>
        <div class="meta" data-feature-toggle-note="${escapeHtml(featureKey)}">${escapeHtml(
          featureTakeoverNote(enabled, language),
        )}</div>
      </div>
      <div class="feature-toggle-actions">
        <button class="feature-toggle${enabled ? " is-on" : ""}" type="button" role="switch" aria-checked="${
          enabled ? "true" : "false"
        }" data-feature-toggle="${escapeHtml(featureKey)}" data-next-value="${enabled ? "false" : "true"}">
          <span class="feature-toggle-track"><span class="feature-toggle-thumb"></span></span>
        </button>
        <span class="meta feature-toggle-state" data-feature-toggle-label="${escapeHtml(featureKey)}">${escapeHtml(
          featureTakeoverLabel(enabled, language),
        )}</span>
      </div>
    </div>`;
  }

  function renderGeoArtifacts(state, language) {
    const available = (state.artifacts ?? []).filter((artifact) => artifact.exists);
    if (available.length === 0) {
      return `<div class="geo-artifact-list" data-geo-artifact-list><div class="empty-state">${escapeHtml(
        pickUiText(
          language,
          "No GEO deliverables are available yet. Start a run to populate this panel.",
          "\u6682\u65E0 GEO \u4EA7\u7269\u3002\u542F\u52A8\u4E00\u6B21\u5BA1\u8BA1\u540E\uFF0C\u8FD9\u91CC\u4F1A\u51FA\u73B0\u5BF9\u5E94\u7ED3\u679C\u3002",
        ),
      )}</div></div>`;
    }
    return `<div class="geo-artifact-list" data-geo-artifact-list>${available
      .map((artifact) => {
        const previewButton = artifact.previewable
          ? `<button class="btn" type="button" data-geo-preview-artifact="${escapeHtml(artifact.name)}">${escapeHtml(
              pickUiText(language, "Preview", "\u9884\u89C8"),
            )}</button>`
          : "";
        const openHref = `/api/features/geo/artifact?artifact=${encodeURIComponent(artifact.name)}`;
        const downloadHref = `${openHref}&download=1`;
        return `<article class="geo-artifact-row" data-geo-artifact-row data-geo-artifact-name="${escapeHtml(
          artifact.name,
        )}">
          <div class="geo-artifact-copy">
            <strong>${escapeHtml(artifact.name)}</strong>
            <div class="meta">${escapeHtml(artifact.relativePath || artifact.path || artifact.name)}</div>
            <div class="meta">${escapeHtml(
              artifact.updatedAt
                ? `${pickUiText(language, "Updated", "\u66F4\u65B0")} ${formatTimeAgoFromNow(artifact.updatedAt, language)} \xB7 ${formatInt(
                    artifact.sizeBytes || 0,
                  )} bytes`
                : `${formatInt(artifact.sizeBytes || 0)} bytes`,
            )}</div>
          </div>
          <div class="geo-artifact-actions">
            ${previewButton}
            <a class="btn" href="${escapeHtml(openHref)}" target="_blank" rel="noreferrer">${escapeHtml(
              pickUiText(language, "Open", "\u6253\u5F00"),
            )}</a>
            <a class="btn" href="${escapeHtml(downloadHref)}">${escapeHtml(
              pickUiText(language, "Download", "\u4E0B\u8F7D"),
            )}</a>
          </div>
        </article>`;
      })
      .join("")}</div>`;
  }

  function renderGeoWarnings(state, language) {
    const warnings = Array.isArray(state.warnings) ? state.warnings : [];
    if (warnings.length === 0) {
      return "";
    }
    return `<section class="card geo-secondary-card" data-geo-warnings>
      <h3>${escapeHtml(pickUiText(language, "Warnings", "\u544A\u8B66"))}</h3>
      <ul class="story-list">${warnings
        .map((warning) => `<li>${escapeHtml(warning)}</li>`)
        .join("")}</ul>
    </section>`;
  }

  function pickGeoSuiteMetric(moduleKey, summary, language) {
    const data = summary?.data;
    if (!summary?.available || !data) {
      return pickUiText(language, "Run a GEO audit to unlock this module.", "\u5148\u8DD1\u4E00\u6B21 GEO \u5BA1\u8BA1\uFF0C\u518D\u770B\u8FD9\u4E2A\u6A21\u5757\u3002");
    }
    if (moduleKey === "overview") {
      return typeof data.geo_score === "number"
        ? pickUiText(language, `GEO score ${data.geo_score}/100`, `GEO \u603B\u5206 ${data.geo_score}/100`)
        : pickUiText(language, "Executive summary ready", "\u6267\u884C\u6458\u8981\u5DF2\u5C31\u7EEA");
    }
    if (moduleKey === "platforms") {
      const count = Object.keys(data.platforms || {}).length;
      return pickUiText(language, `${count} platform readiness scores`, `${count} \u4E2A\u5E73\u53F0\u5C31\u7EEA\u5206`);
    }
    if (moduleKey === "citability") {
      const score = data.content_findings?.homepage_citability?.average_citability_score;
      return typeof score === "number"
        ? pickUiText(language, `Homepage citability ${score}/100`, `\u9996\u9875 citability ${score}/100`)
        : pickUiText(language, "Block scoring ready", "\u5185\u5BB9\u5757\u8BC4\u5206\u5DF2\u5C31\u7EEA");
    }
    if (moduleKey === "crawlers") {
      const crawlerAccess = data.crawler_access || {};
      const total = Object.keys(crawlerAccess).length;
      const allowed = Object.values(crawlerAccess).filter((item) => /ALLOW/i.test(String(item?.status || ""))).length;
      return pickUiText(language, `Allowed ${allowed}/${total}`, `\u5141\u8BB8 ${allowed}/${total}`);
    }
    if (moduleKey === "llms") {
      const llmsValidation = data.raw?.llms_validation || {};
      if (llmsValidation.exists) {
        return pickUiText(language, "Live llms.txt detected", "\u5DF2\u68C0\u6D4B\u5230\u7EBF\u4E0A llms.txt");
      }
      return pickUiText(language, "Generated drafts ready", "\u5DF2\u751F\u6210 llms \u8349\u7A3F");
    }
    if (moduleKey === "brand") {
      const brandPlatforms = data.brand_findings?.platforms || {};
      let confirmed = 0;
      if (brandPlatforms.wikipedia?.has_wikipedia_page) confirmed += 1;
      if (brandPlatforms.wikipedia?.has_wikidata_entry) confirmed += 1;
      if (brandPlatforms.linkedin?.has_company_page) confirmed += 1;
      if (brandPlatforms.youtube?.has_channel) confirmed += 1;
      return pickUiText(language, `${confirmed} confirmed entity signals`, `${confirmed} \u4E2A\u5DF2\u786E\u8BA4\u5B9E\u4F53\u4FE1\u53F7`);
    }
    if (moduleKey === "technical") {
      const homepage = data.technical_findings?.homepage || {};
      const statusCode = homepage.status_code || "-";
      return pickUiText(language, `HTTP ${statusCode} · SSR ${homepage.has_ssr_content === false ? "partial" : "ready"}`, `HTTP ${statusCode} \xB7 SSR ${homepage.has_ssr_content === false ? "\u5F85\u6539\u5584" : "\u5C31\u7EEA"}`);
    }
    if (moduleKey === "schema") {
      const count = Number(data.schema_findings?.count || 0);
      return pickUiText(language, `${count} schema types`, `${count} \u4E2A schema \u7C7B\u578B`);
    }
    if (moduleKey === "content") {
      const count = Number(data.content_findings?.pages_analyzed || 0);
      return pickUiText(language, `${count} priority pages analyzed`, `\u5DF2\u5206\u6790 ${count} \u4E2A\u9AD8\u4EF7\u503C\u9875\u9762`);
    }
    const findings = Array.isArray(data.findings) ? data.findings.length : 0;
    const quickWins = Array.isArray(data.quick_wins) ? data.quick_wins.length : 0;
    return pickUiText(language, `${findings} findings · ${quickWins} quick wins`, `${findings} \u6761\u5173\u952E\u53D1\u73B0 \xB7 ${quickWins} \u6761\u5FEB\u901F\u6539\u8FDB`);
  }

  function renderGeoSuiteToolbar(language) {
    return `<div class="geo-suite-toolbar" data-geo-suite-toolbar>${GEO_SUITE_MODULES.map((module, index) => {
      const title = pickUiText(language, module.titleEn, module.titleZh);
      return `<button class="geo-suite-chip${index === 0 ? " is-active" : ""}" type="button" data-geo-suite-toggle="${escapeHtml(
        module.key,
      )}" aria-pressed="${index === 0 ? "true" : "false"}">${escapeHtml(title)}</button>`;
    }).join("")}</div>`;
  }

  function renderGeoSuiteCards(summary, language) {
    return `<div class="geo-suite-card-grid" data-geo-suite-card-grid>${GEO_SUITE_MODULES.map((module, index) => {
      const title = pickUiText(language, module.titleEn, module.titleZh);
      const blurb = pickUiText(language, module.blurbEn, module.blurbZh);
      const metric = pickGeoSuiteMetric(module.key, summary, language);
      return `<button class="feature-card geo-suite-card${index === 0 ? " is-active" : ""}" type="button" data-geo-suite-toggle="${escapeHtml(
        module.key,
      )}" data-geo-suite-card="${escapeHtml(module.key)}" aria-pressed="${index === 0 ? "true" : "false"}">
        <div class="feature-card-head">
          <div>
            <div class="feature-card-kicker">GEO</div>
            <h3>${escapeHtml(title)}</h3>
          </div>
        </div>
        <div class="meta">${escapeHtml(blurb)}</div>
        <div class="meta geo-suite-card-metric">${escapeHtml(metric)}</div>
      </button>`;
    }).join("")}</div>`;
  }

  function safeGeoSummarySeed(summary) {
    const fallback = {
      available: false,
      artifactName: "standalone-audit.json",
      loadedAt: new Date().toISOString(),
    };
    try {
      return escapeHtml(JSON.stringify(summary || fallback));
    } catch {
      return escapeHtml(JSON.stringify(fallback));
    }
  }

  function renderGeoList(items, language, emptyMessage) {
    const values = Array.isArray(items)
      ? items.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
    if (values.length === 0) {
      return `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
    }
    return `<ul class="story-list">${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function renderGeoFactGrid(items) {
    return `<div class="geo-suite-fact-grid">${items
      .map(
        (item) => `<article class="geo-suite-fact">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>`,
      )
      .join("")}</div>`;
  }

  function renderGeoResultsOverview(input) {
    const summary = input.geoSummary;
    const state = input.geoState;
    if (!summary?.available || !summary.data) {
      return `<section class="card geo-secondary-card" data-geo-results-overview>
        <h3>${escapeHtml(pickUiText(input.language, "Overview", "\u603B\u89C8"))}</h3>
        <div class="empty-state">${escapeHtml(
          state.status === "running"
            ? pickUiText(
                input.language,
                "The GEO suite is running. This summary will refresh automatically after the run finishes.",
                "GEO \u5957\u4EF6\u6B63\u5728\u8FD0\u884C\u3002\u8FD0\u884C\u7ED3\u675F\u540E\uFF0C\u603B\u89C8\u4F1A\u81EA\u52A8\u5237\u65B0\u3002",
              )
            : pickUiText(
                input.language,
                "Run the GEO suite once to generate the score, summary, and next-step recommendations.",
                "\u5148\u8DD1\u4E00\u6B21 GEO \u5957\u4EF6\uFF0C\u8FD9\u91CC\u624D\u4F1A\u751F\u6210 GEO \u5206\u6570\u3001\u603B\u7ED3\u548C\u4E0B\u4E00\u6B65\u5EFA\u8BAE\u3002",
              ),
        )}</div>
      </section>`;
    }
    const data = summary.data;
    return `<section class="card geo-secondary-card" data-geo-results-overview>
      <div class="overview-command-head">
        <div>
          <h3>${escapeHtml(pickUiText(input.language, "Overview", "\u603B\u89C8"))}</h3>
          <div class="meta">${escapeHtml(
            pickUiText(
              input.language,
              "Top-line GEO score, executive summary, and quick wins from the latest full-suite run.",
              "\u8FD9\u91CC\u663E\u793A\u6700\u65B0\u4E00\u6B21\u5B8C\u6574 GEO \u5957\u4EF6\u8FD0\u884C\u7684\u6838\u5FC3\u7ED3\u679C\u3001\u6267\u884C\u6458\u8981\u548C\u5FEB\u901F\u6539\u8FDB\u70B9\u3002",
            ),
          )}</div>
        </div>
        <div class="meta">${escapeHtml(
          pickUiText(input.language, `Source: ${summary.artifactName}`, `\u6570\u636E\u6E90\uFF1A${summary.artifactName}`),
        )}</div>
      </div>
      ${renderGeoFactGrid([
        {
          label: pickUiText(input.language, "GEO score", "GEO \u5206\u6570"),
          value:
            typeof data.geo_score === "number"
              ? `${data.geo_score}/100`
              : pickUiText(input.language, "Not available", "\u6682\u65E0"),
        },
        {
          label: pickUiText(input.language, "Brand", "\u54C1\u724C"),
          value: data.brand_name || pickUiText(input.language, "Not available", "\u6682\u65E0"),
        },
        {
          label: "URL",
          value: data.url || pickUiText(input.language, "Not available", "\u6682\u65E0"),
        },
        {
          label: pickUiText(input.language, "Warnings", "\u544A\u8B66"),
          value: String(Array.isArray(state.warnings) ? state.warnings.length : 0),
        },
      ])}
      <div class="meta geo-suite-summary">${escapeHtml(
        data.executive_summary ||
          pickUiText(input.language, "No executive summary is available yet.", "\u6682\u65E0\u6267\u884C\u6458\u8981\u3002"),
      )}</div>
      <section class="geo-suite-subcard">
        <h4>${escapeHtml(pickUiText(input.language, "Quick wins", "\u5FEB\u901F\u6539\u8FDB"))}</h4>
        ${renderGeoList(
          data.quick_wins,
          input.language,
          pickUiText(input.language, "No quick wins were extracted.", "\u6682\u65E0\u53EF\u76F4\u63A5\u6267\u884C\u7684\u5FEB\u901F\u6539\u8FDB\u3002"),
        )}
      </section>
    </section>`;
  }

  function renderGeoPlatformCapabilitySummary(input) {
    const summary = input.geoSummary;
    const state = input.geoState;
    if (!summary?.available || !summary.data) {
      return `<section class="card geo-secondary-card" data-geo-results-capabilities>
        <h3>${escapeHtml(pickUiText(input.language, "Platforms and capabilities", "\u5E73\u53F0\u4E0E\u80FD\u529B"))}</h3>
        <div class="empty-state">${escapeHtml(
          state.status === "running"
            ? pickUiText(
                input.language,
                "Platform readiness and capability summaries will appear automatically after the suite finishes.",
                "\u5957\u4EF6\u8FD0\u884C\u5B8C\u6210\u540E\uFF0C\u5E73\u53F0\u5C31\u7EEA\u5EA6\u548C\u80FD\u529B\u6458\u8981\u4F1A\u81EA\u52A8\u51FA\u73B0\u3002",
              )
            : pickUiText(
                input.language,
                "Run the GEO suite to unlock platform readiness and capability summaries.",
                "\u8FD0\u884C GEO \u5957\u4EF6\u540E\uFF0C\u8FD9\u91CC\u4F1A\u81EA\u52A8\u51FA\u73B0\u5E73\u53F0\u5C31\u7EEA\u5EA6\u548C\u80FD\u529B\u6458\u8981\u3002",
              ),
        )}</div>
      </section>`;
    }
    const data = summary.data;
    const crawlerAccess = data.crawler_access || {};
    const allowedCrawlerCount = Object.values(crawlerAccess).filter((item) =>
      /ALLOW/i.test(String(item?.status || "")),
    ).length;
    const homepageCitability = data.content_findings?.homepage_citability?.average_citability_score;
    const llmsValidation = data.raw?.llms_validation || {};
    const brandPlatforms = data.brand_findings?.platforms || {};
    const confirmedEntitySignals = [
      brandPlatforms.wikipedia?.has_wikipedia_page,
      brandPlatforms.wikipedia?.has_wikidata_entry,
      brandPlatforms.linkedin?.has_company_page,
      brandPlatforms.youtube?.has_channel,
    ].filter(Boolean).length;
    const platformRows = Object.entries(data.platforms || {})
      .map(
        ([platform, score]) => `<tr>
          <td>${escapeHtml(platform)}</td>
          <td>${escapeHtml(`${score}/100`)}</td>
        </tr>`,
      )
      .join("");
    return `<section class="card geo-secondary-card" data-geo-results-capabilities>
      <div class="overview-command-head">
        <div>
          <h3>${escapeHtml(pickUiText(input.language, "Platforms and capabilities", "\u5E73\u53F0\u4E0E\u80FD\u529B"))}</h3>
          <div class="meta">${escapeHtml(
            pickUiText(
              input.language,
              "A condensed readout of platform readiness and the major GEO capability surfaces from the latest full-suite run.",
              "\u8FD9\u91CC\u6D53\u7F29\u663E\u793A\u6700\u65B0\u5B8C\u6574 GEO \u5957\u4EF6\u8FD0\u884C\u7684\u5E73\u53F0\u5C31\u7EEA\u5EA6\u548C\u4E3B\u8981\u80FD\u529B\u9762\u7ED3\u679C\u3002",
            ),
          )}</div>
        </div>
      </div>
      ${renderGeoFactGrid([
        {
          label: pickUiText(input.language, "Homepage citability", "\u9996\u9875\u53EF\u5F15\u8FF0\u6027"),
          value:
            typeof homepageCitability === "number"
              ? `${homepageCitability}/100`
              : pickUiText(input.language, "Not available", "\u6682\u65E0"),
        },
        {
          label: pickUiText(input.language, "AI crawler access", "AI \u722C\u866B\u8BBF\u95EE"),
          value: `${allowedCrawlerCount}/${Object.keys(crawlerAccess).length || 0}`,
        },
        {
          label: "llms.txt",
          value: llmsValidation.exists
            ? pickUiText(input.language, "Live", "\u5DF2\u4E0A\u7EBF")
            : pickUiText(input.language, "Draft only", "\u4EC5\u8349\u7A3F"),
        },
        {
          label: pickUiText(input.language, "Entity signals", "\u5B9E\u4F53\u4FE1\u53F7"),
          value: String(confirmedEntitySignals),
        },
        {
          label: pickUiText(input.language, "Schema types", "Schema \u7C7B\u578B"),
          value: String(Number(data.schema_findings?.count || 0)),
        },
        {
          label: pickUiText(input.language, "Pages analyzed", "\u5DF2\u5206\u6790\u9875\u9762"),
          value: String(Number(data.content_findings?.pages_analyzed || 0)),
        },
      ])}
      <section class="geo-suite-subcard">
        <h4>${escapeHtml(pickUiText(input.language, "Platform readiness", "\u5E73\u53F0\u5C31\u7EEA\u5EA6"))}</h4>
        ${
          platformRows
            ? `<div class="geo-suite-table-shell"><table class="geo-suite-table"><thead><tr><th>${escapeHtml(
                pickUiText(input.language, "Platform", "\u5E73\u53F0"),
              )}</th><th>${escapeHtml(pickUiText(input.language, "Score", "\u5206\u6570"))}</th></tr></thead><tbody>${platformRows}</tbody></table></div>`
            : `<div class="empty-state">${escapeHtml(
                pickUiText(input.language, "No platform readiness scores are available yet.", "\u6682\u65E0\u5E73\u53F0\u5C31\u7EEA\u5EA6\u5206\u6570\u3002"),
              )}</div>`
        }
      </section>
    </section>`;
  }

  function renderGeoWarningsDisclosure(state, language) {
    const warnings = Array.isArray(state.warnings) ? state.warnings : [];
    const summaryText =
      warnings.length > 0
        ? pickUiText(language, `${warnings.length} warnings`, `${warnings.length} \u6761\u544A\u8B66`)
        : pickUiText(language, "No warnings", "\u65E0\u544A\u8B66");
    const leadText =
      warnings.length > 0
        ? pickUiText(
            language,
            "Warnings were detected during the latest full-suite run. Expand only when you need details.",
            "\u6700\u65B0\u4E00\u6B21\u5B8C\u6574 GEO \u5957\u4EF6\u8FD0\u884C\u68C0\u6D4B\u5230\u544A\u8B66\u3002\u53EA\u5728\u9700\u8981\u65F6\u518D\u5C55\u5F00\u67E5\u770B\u8BE6\u60C5\u3002",
          )
        : pickUiText(
            language,
            "No runtime warnings were recorded for the latest run.",
            "\u6700\u65B0\u4E00\u6B21\u8FD0\u884C\u6682\u65E0\u8BB0\u5F55\u5230\u544A\u8B66\u3002",
          );
    return `<details class="card compact-details geo-secondary-card" data-geo-warnings-details${
      warnings.length === 0 ? " hidden" : ""
    }>
      <summary><span data-geo-warnings-summary>${escapeHtml(summaryText)}</span></summary>
      <div class="meta" data-geo-warnings-lead>${escapeHtml(leadText)}</div>
      <ul class="story-list" data-geo-warnings>${warnings
        .map((warning) => `<li>${escapeHtml(warning)}</li>`)
        .join("")}</ul>
    </details>`;
  }

  function renderGeoAdvancedToolsDrawer(input) {
    return `<details class="card compact-details geo-secondary-card geo-suite-root" data-geo-advanced-tools>
      <summary>${escapeHtml(pickUiText(input.language, "Advanced tools", "\u9AD8\u7EA7\u5DE5\u5177"))}</summary>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "Direct module runners live here. They stay folded away by default so the main GEO flow remains one click.",
          "\u5355\u6A21\u5757 GEO \u5DE5\u5177\u90FD\u6536\u5728\u8FD9\u91CC\u3002\u9ED8\u8BA4\u6298\u53E0\uFF0C\u8BA9\u4E3B GEO \u6D41\u7A0B\u4FDD\u6301\u4E00\u952E\u5373\u53EF\u8FD0\u884C\u3002",
        ),
      )}</div>
      <div class="geo-suite-toolbar" data-geo-suite-toolbar>${GEO_DIRECT_MODULES.map((module, index) => {
        const title = pickUiText(input.language, module.titleEn, module.titleZh);
        return `<button class="geo-suite-chip${index === 0 ? " is-active" : ""}" type="button" data-geo-suite-toggle="${escapeHtml(
          module.key,
        )}" aria-pressed="${index === 0 ? "true" : "false"}">${escapeHtml(title)}</button>`;
      }).join("")}</div>
      <section class="geo-suite-actions" data-geo-suite-actions>
        <div class="empty-state">${escapeHtml(
          pickUiText(
            input.language,
            "Choose an advanced GEO tool above to run or preview its controlled outputs.",
            "\u5728\u4E0A\u65B9\u9009\u62E9\u4E00\u4E2A\u9AD8\u7EA7 GEO \u5DE5\u5177\uFF0C\u8FD9\u91CC\u5C31\u4F1A\u663E\u793A\u5BF9\u5E94\u7684\u64CD\u4F5C\u548C\u53D7\u63A7\u8F93\u51FA\u3002",
          ),
        )}</div>
      </section>
    </details>`;
  }

  function renderGeoHubCard(input) {
    const latestState = input.geoState;
    const latestRunLabel =
      latestState.status === "idle"
        ? pickUiText(input.language, "No GEO suite run has been started yet.", "\u8FD8\u6CA1\u6709\u542F\u52A8 GEO \u5957\u4EF6\u3002")
        : pickUiText(
            input.language,
            `Latest run: ${geoRunStatusLabel(latestState.status, input.language)}`,
            `\u6700\u8FD1\u4E00\u6B21\uFF1A${geoRunStatusLabel(latestState.status, input.language)}`,
          );
    return `<article class="feature-card">
      <div class="feature-card-head">
        <div>
          <div class="feature-card-kicker">GEO</div>
          <h3>${escapeHtml(pickUiText(input.language, "GEO Suite", "GEO \u5957\u4EF6"))}</h3>
        </div>
        <span class="badge ${escapeHtml(geoRunTone(latestState.status))}">${escapeHtml(
          geoRunStatusLabel(latestState.status, input.language),
        )}</span>
      </div>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "Run the full GEO suite with one click, then open advanced tools only when you need extra control.",
          "\u4E00\u952E\u8FD0\u884C\u5B8C\u6574 GEO \u5957\u4EF6\uFF0C\u53EA\u5728\u9700\u8981\u989D\u5916\u63A7\u5236\u65F6\u624D\u5C55\u5F00\u9AD8\u7EA7\u5DE5\u5177\u3002",
        ),
      )}</div>
      <div class="meta">${escapeHtml(latestRunLabel)}</div>
      <div class="feature-card-actions">
        <a class="btn" href="${escapeHtml(buildFeaturesHref(input, "geo"))}">${escapeHtml(
          pickUiText(input.language, "Open GEO", "\u6253\u5F00 GEO"),
        )}</a>
      </div>
    </article>`;
  }

  function renderEducationHubCard(input) {
    const state = getAiEducationState(input);
    const healthStatus = state.health?.status || "unknown";
    const badgeLabel = educationEmbedStatusLabel(state, input.language);
    const badgeTone = educationEmbedTone(state);
    const subLabel = state.ready
      ? pickUiText(
          input.language,
          `Connection: ${educationHealthStatusLabel(healthStatus, input.language)}`,
          `\u8FDE\u63A5\u72B6\u6001\uFF1A${educationHealthStatusLabel(healthStatus, input.language)}`,
        )
      : state.embedBlockedReason ||
        pickUiText(
          input.language,
          `Connection: ${educationHealthStatusLabel(healthStatus, input.language)}`,
          `\u8FDE\u63A5\u72B6\u6001\uFF1A${educationHealthStatusLabel(healthStatus, input.language)}`,
        );
    const modeLabel = educationModeLabel(state.config?.mode, input.language);
    const accessCopy = state.ready
      ? pickUiText(
          input.language,
          `Mode: ${modeLabel}. Open the embedded OpenMAIC workspace inside the AI employee shell.`,
          `\u5F53\u524D\u6A21\u5F0F\uFF1A${modeLabel}\u3002\u53EF\u4EE5\u5728 AI \u5458\u5DE5\u7CFB\u7EDF\u58F3\u5185\u76F4\u63A5\u6253\u5F00 OpenMAIC \u5DE5\u4F5C\u533A\u3002`,
        )
      : pickUiText(
          input.language,
          `Mode: ${modeLabel}. Finish the connection or access-code setup before the embedded workspace can launch.`,
          `\u5F53\u524D\u6A21\u5F0F\uFF1A${modeLabel}\u3002\u9700\u5148\u5B8C\u6210\u8FDE\u63A5\u6216 access code \u914D\u7F6E\uFF0C\u518D\u80FD\u6253\u5F00\u5185\u5D4C\u5DE5\u4F5C\u533A\u3002`,
        );
    return `<article class="feature-card">
      <div class="feature-card-head">
        <div>
          <div class="feature-card-kicker">AI\u6559\u80B2</div>
          <h3>${escapeHtml(pickUiText(input.language, "AI Education", "AI\u6559\u80B2"))}</h3>
        </div>
        <span class="badge ${escapeHtml(badgeTone)}">${escapeHtml(badgeLabel)}</span>
      </div>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "Embed OpenMAIC as a child app inside the AI employee shell instead of reducing it to an API form workbench.",
          "\u628A OpenMAIC \u4F5C\u4E3A AI \u5458\u5DE5\u58F3\u5185\u7684\u5B50\u5E94\u7528\u5D4C\u5165\uFF0C\u800C\u4E0D\u662F\u628A\u5B83\u964D\u7EA7\u6210 API \u8868\u5355\u5DE5\u4F5C\u53F0\u3002",
        ),
      )}</div>
      <div class="meta">${escapeHtml(subLabel)}</div>
      <div class="meta">${escapeHtml(accessCopy)}</div>
      <div class="feature-card-actions">
        <a class="btn" href="${escapeHtml(buildFeaturesHref(input, "education"))}">${escapeHtml(
          pickUiText(input.language, "Open AI Education", "\u6253\u5F00 AI\u6559\u80B2"),
        )}</a>
      </div>
    </article>`;
  }

  function renderFeaturesHub(input) {
    return `
    <section class="card" data-features-root data-language="${escapeHtml(input.language)}">
      <div class="overview-command-head">
        <div>
          <h2>${escapeHtml(pickUiText(input.language, "Function hub", "\u529F\u80FD\u4E2D\u5FC3"))}</h2>
          <div class="meta">${escapeHtml(
            pickUiText(
              input.language,
              "Open focused capability pages here. GEO keeps the controlled external-runner pattern, and AI Education now opens OpenMAIC as an embedded child app inside the same shell.",
              "\u5728\u8FD9\u91CC\u6253\u5F00\u805A\u7126\u80FD\u529B\u9875\u3002GEO \u7EE7\u7EED\u4FDD\u6301\u53D7\u63A7\u5916\u90E8 runner \u6A21\u5F0F\uFF0CAI\u6559\u80B2\u5219\u5728\u540C\u4E00\u4E2A\u58F3\u91CC\u5185\u5D4C OpenMAIC \u5B50\u5E94\u7528\u3002",
            ),
          )}</div>
        </div>
      </div>
      <div class="feature-card-grid">
        ${renderGeoHubCard(input)}
        ${renderEducationHubCard(input)}
      </div>
    </section>
  `;
  }

  function renderGeoWorkbench(input) {
    const state = input.geoState;
    const aiTakeoverEnabled = input.featureControl?.geo?.aiTakeoverEnabled === true;
    const backHref = buildFeaturesHref(input);
    const urlValue = state.params?.url || "";
    const brandNameValue = state.params?.brandName || "";
    const maxPagesValue = typeof state.params?.maxPages === "number" ? String(state.params.maxPages) : "5";
    const outputDirValue = state.params?.outputDir || "";
    const statusLabel = geoRunStatusLabel(state.status, input.language);
    const statusTone = geoRunTone(state.status);
    const stateMessage =
      state.message ||
      pickUiText(
        input.language,
        "Ready to run the full GEO suite.",
        "\u53EF\u4EE5\u76F4\u63A5\u8FD0\u884C\u5B8C\u6574 GEO \u5957\u4EF6\u3002",
      );
    return `
    <div data-features-root data-language="${escapeHtml(input.language)}" data-geo-workbench-root>
    <section class="card geo-primary-card">
      <div class="overview-command-head">
        <div>
          <div class="meta"><a href="${escapeHtml(backHref)}">${escapeHtml(
            pickUiText(input.language, "Back to function hub", "\u8FD4\u56DE\u529F\u80FD\u4E2D\u5FC3"),
          )}</a></div>
          <h2>${escapeHtml(pickUiText(input.language, "GEO Suite", "GEO \u5957\u4EF6"))}</h2>
          <div class="meta">${escapeHtml(
            pickUiText(
              input.language,
              "GEO-first, SEO-supported. Run the complete GEO suite with one click, then expand advanced settings or tools only when needed. Collaboration and repository boundaries remain controlled.",
              "\u4EE5 GEO \u4E3A\u4E3B\u3001SEO \u4F5C\u4E3A\u652F\u6491\u3002\u9ED8\u8BA4\u4E00\u952E\u8FD0\u884C\u5B8C\u6574 GEO \u5957\u4EF6\uFF0C\u53EA\u6709\u5728\u9700\u8981\u65F6\u624D\u5C55\u5F00\u9AD8\u7EA7\u8BBE\u7F6E\u6216\u5DE5\u5177\u3002\u534F\u4F5C\u548C\u4ED3\u5E93\u8FB9\u754C\u4ECD\u7136\u4FDD\u6301\u53D7\u63A7\u3002",
            ),
          )}</div>
        </div>
        <div>${`<span class="badge ${escapeHtml(statusTone)}" data-geo-status-badge>${escapeHtml(statusLabel)}</span>`}</div>
      </div>
      <div class="geo-status-strip">
        <div class="status-chip">
          <span>${escapeHtml(pickUiText(input.language, "Status", "\u72B6\u6001"))}</span>
          <strong data-geo-state-status>${escapeHtml(statusLabel)}</strong>
        </div>
        <div class="status-chip">
          <span>${escapeHtml(pickUiText(input.language, "Started", "\u5F00\u59CB"))}</span>
          <strong data-geo-state-started-at>${escapeHtml(state.startedAt || "-")}</strong>
        </div>
        <div class="status-chip">
          <span>${escapeHtml(pickUiText(input.language, "Finished", "\u7ED3\u675F"))}</span>
          <strong data-geo-state-finished-at>${escapeHtml(state.finishedAt || "-")}</strong>
        </div>
        <div class="status-chip">
          <span>${escapeHtml(pickUiText(input.language, "Exit code", "\u9000\u51FA\u7801"))}</span>
          <strong data-geo-state-exit-code>${escapeHtml(formatGeoExitCode(state.exitCode, input.language))}</strong>
        </div>
      </div>
      <form class="geo-run-form" data-geo-run-form>
        <label class="geo-field geo-field-wide">
          <span>${escapeHtml(pickUiText(input.language, "URL", "URL"))}</span>
          <input type="url" name="url" value="${escapeHtml(urlValue)}" placeholder="https://example.com" required />
        </label>
        <div class="geo-form-actions">
          <button class="btn" type="submit" data-geo-run-button>${escapeHtml(
            pickUiText(input.language, "Run GEO suite", "\u8FD0\u884C GEO \u5957\u4EF6"),
          )}</button>
          <div class="meta geo-run-status" data-geo-run-status>${escapeHtml(stateMessage)}</div>
        </div>
        <details class="card compact-details geo-secondary-card geo-collapsible" data-geo-advanced-settings>
          <summary>${escapeHtml(pickUiText(input.language, "Advanced settings", "\u9AD8\u7EA7\u8BBE\u7F6E"))}</summary>
          <div class="meta">${escapeHtml(
            pickUiText(
              input.language,
              "Optional controls for brand override, page limits, SSL fallback, output directory, and AI takeover permission.",
              "\u8FD9\u91CC\u53EA\u653E\u53EF\u9009\u7684\u54C1\u724C\u8986\u76D6\u3001\u9875\u6570\u9650\u5236\u3001SSL \u964D\u7EA7\u3001\u8F93\u51FA\u76EE\u5F55\u548C AI \u63A5\u7BA1\u6743\u9650\u3002",
            ),
          )}</div>
          <div class="geo-form-grid">
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Brand name", "\u54C1\u724C\u540D"))}</span>
              <input type="text" name="brandName" value="${escapeHtml(brandNameValue)}" placeholder="${escapeHtml(
                pickUiText(input.language, "Optional override", "\u53EF\u9009\u8986\u76D6"),
              )}" />
            </label>
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Max pages", "\u6700\u591A\u9875\u6570"))}</span>
              <input type="number" name="maxPages" min="1" max="50" value="${escapeHtml(maxPagesValue)}" required />
            </label>
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Output dir", "\u8F93\u51FA\u76EE\u5F55"))}</span>
              <input type="text" name="outputDir" value="${escapeHtml(outputDirValue)}" placeholder="${escapeHtml(
                pickUiText(
                  input.language,
                  "Optional; relative paths stay under runtime/geo-audits/outputs",
                  "\u53EF\u9009\uFF1B\u76F8\u5BF9\u8DEF\u5F84\u4F1A\u88AB\u9650\u5B9A\u5728 runtime/geo-audits/outputs \u4E0B",
                ),
              )}" />
            </label>
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Project root", "\u9879\u76EE\u6839\u76EE\u5F55"))}</span>
              <input type="text" value="${escapeHtml(input.geoProjectRoot)}" readonly />
            </label>
          </div>
          <label class="geo-checkbox">
            <input type="checkbox" name="insecure"${state.params?.insecure ? " checked" : ""} />
            <span>${escapeHtml(
              pickUiText(
                input.language,
                "Allow insecure SSL for broken local trust chains",
                "\u5141\u8BB8\u5728\u672C\u5730 CA \u94FE\u5F02\u5E38\u65F6\u4F7F\u7528 insecure SSL",
              ),
            )}</span>
          </label>
          ${renderFeatureTakeoverControl("geo", aiTakeoverEnabled, input.language)}
        </details>
      </form>
    </section>
    <section class="geo-layout geo-results-grid">
      ${renderGeoResultsOverview(input)}
      ${renderGeoPlatformCapabilitySummary(input)}
    </section>
    <section class="card geo-secondary-card" data-geo-deliverables>
      <h3>${escapeHtml(pickUiText(input.language, "Deliverables", "\u4EA7\u7269"))}</h3>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "Only the latest registered deliverables are shown here. No arbitrary repository files are scanned.",
          "\u8FD9\u91CC\u53EA\u663E\u793A\u6700\u65B0\u4E00\u6B21\u5DF2\u767B\u8BB0\u7684\u4EA7\u7269\uFF0C\u4E0D\u4F1A\u626B\u63CF\u4EFB\u610F\u4ED3\u5E93\u6587\u4EF6\u3002",
        ),
      )}</div>
      ${renderGeoArtifacts(state, input.language)}
    </section>
    ${renderGeoWarningsDisclosure(state, input.language)}
    ${renderGeoAdvancedToolsDrawer(input)}
    <details class="card compact-details geo-secondary-card" data-geo-debug-details>
      <summary>${escapeHtml(pickUiText(input.language, "Debug info", "\u8C03\u8BD5\u4FE1\u606F"))}</summary>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "Inline preview and raw stdout/stderr stay folded away by default so the main GEO flow remains focused.",
          "\u4EA7\u7269\u9884\u89C8\u548C\u539F\u59CB stdout/stderr \u9ED8\u8BA4\u90FD\u6298\u53E0\uFF0C\u8BA9 GEO \u4E3B\u6D41\u7A0B\u4FDD\u6301\u7B80\u6D01\u3002",
        ),
      )}</div>
      <section class="geo-suite-subcard geo-preview-card" data-geo-preview-root>
        <h4>${escapeHtml(pickUiText(input.language, "Artifact preview", "\u4EA7\u7269\u9884\u89C8"))}</h4>
        <div class="meta" data-geo-preview-meta>${escapeHtml(
          pickUiText(
            input.language,
            "Choose a previewable deliverable to inspect it inline here.",
            "\u5728\u4EA7\u7269\u5217\u8868\u91CC\u9009\u62E9\u4E00\u4E2A\u53EF\u9884\u89C8\u7684\u6587\u4EF6\uFF0C\u8FD9\u91CC\u4F1A\u5185\u8054\u663E\u793A\u5B83\u7684\u5185\u5BB9\u3002",
          ),
        )}</div>
        <pre class="geo-preview-content" data-geo-preview-content>${escapeHtml(
          pickUiText(
            input.language,
            "Choose a previewable artifact from the deliverables section to inspect it here.",
            "\u5728\u4EA7\u7269\u533A\u9009\u62E9\u4E00\u4E2A\u53EF\u9884\u89C8\u7684\u6587\u4EF6\u540E\uFF0C\u5185\u5BB9\u4F1A\u5728\u8FD9\u91CC\u663E\u793A\u3002",
          ),
        )}</pre>
      </section>
      <div class="geo-module-output-grid">
        <section class="geo-suite-subcard">
          <h4>${escapeHtml(pickUiText(input.language, "Standard output tail", "\u6807\u51C6\u8F93\u51FA\u5C3E\u90E8"))}</h4>
          <pre class="geo-log-output" data-geo-stdout>${escapeHtml(
            state.stdoutTail ||
              pickUiText(input.language, "No stdout has been captured yet.", "\u6682\u65E0 stdout \u8F93\u51FA\u3002"),
          )}</pre>
        </section>
        <section class="geo-suite-subcard">
          <h4>${escapeHtml(pickUiText(input.language, "Standard error tail", "\u6807\u51C6\u9519\u8BEF\u5C3E\u90E8"))}</h4>
          <pre class="geo-log-output" data-geo-stderr>${escapeHtml(
            state.stderrTail ||
              pickUiText(input.language, "No stderr has been captured yet.", "\u6682\u65E0 stderr \u8F93\u51FA\u3002"),
          )}</pre>
        </section>
      </div>
    </details>
    </div>
  `;
  }

  function buildEducationViewModel(input) {
    const state = getAiEducationState(input);
    const config = state.config || {};
    const health = state.health || {};
    const latestJob = state.latestJob || {};
    const openmaicConfigSync = state.openmaicConfigSync || {};
    const observedServerProviders = state.observedServerProviders || {};
    const mode = config.mode || "self_hosted";
    const endpointValue = state.launchUrl || config.baseUrl || "";
    const latestJobStatusLabel = educationJobStatusLabel(latestJob.status, input.language);
    return {
      input,
      state,
      config,
      health,
      latestJob,
      openmaicConfigSync,
      observedServerProviders,
      aiTakeoverEnabled: input.featureControl?.education?.aiTakeoverEnabled === true,
      backHref: buildFeaturesHref(input),
      mode,
      endpointValue,
      externalOpenUrl: educationExternalOpenUrl(state),
      externalOpenLabel: educationExternalOpenLabel(state, input.language),
      canUseHostedRecovery: educationNeedsHostedRecovery(state),
      repoDirValue: config.repoDir || "",
      healthStatusLabel: educationHealthStatusLabel(health.status, input.language),
      embedStatusLabel: educationEmbedStatusLabel(state, input.language),
      embedTone: educationEmbedTone(state),
      configStatusMessage:
        openmaicConfigSync.message ||
        state.embedBlockedReason ||
        health.message ||
        pickUiText(
          input.language,
          "OpenMAIC stays in its own project folder. This page only manages bounded connection, provider sync, and in-shell launch.",
          "\u4FDD\u6301 OpenMAIC \u5728\u72EC\u7ACB\u9879\u76EE\u76EE\u5F55\u5185\u8FD0\u884C\u3002\u8FD9\u4E2A\u9875\u9762\u53EA\u7BA1\u7406\u6709\u8FB9\u754C\u7684\u8FDE\u63A5\u3001provider \u540C\u6B65\u548C\u58F3\u5185\u6253\u5F00\u3002",
        ),
      workspaceMessage:
        state.ready === true
          ? pickUiText(
              input.language,
              "OpenMAIC is launched directly inside this workspace. If embedding stops working, the panel falls back to diagnostics instead of going blank.",
              "OpenMAIC \u4F1A\u76F4\u63A5\u5728\u8FD9\u4E2A\u5DE5\u4F5C\u533A\u5185\u542F\u52A8\u3002\u5982\u679C\u5D4C\u5165\u5931\u6548\uFF0C\u8FD9\u4E2A\u9762\u677F\u4F1A\u81EA\u52A8\u56DE\u9000\u5230\u8BCA\u65AD\u5361\uFF0C\u800C\u4E0D\u662F\u767D\u5C4F\u3002",
            )
          : state.embedBlockedReason ||
            pickUiText(
              input.language,
              "Fix the connection status shown here, then reload the embedded workspace.",
              "\u5148\u5904\u7406\u8FD9\u91CC\u663E\u793A\u7684\u8FDE\u63A5\u72B6\u6001\uFF0C\u518D\u91CD\u65B0\u52A0\u8F7D\u5185\u5D4C\u5DE5\u4F5C\u533A\u3002",
            ),
      fallbackTitle: pickUiText(
        input.language,
        "Embedded workspace unavailable",
        "\u5185\u5D4C\u5DE5\u4F5C\u533A\u6682\u4E0D\u53EF\u7528",
      ),
      fallbackReason:
        state.embedBlockedReason ||
        pickUiText(
          input.language,
          "OpenMAIC did not finish loading in embedded mode. It may be offline or refusing iframe embedding.",
          "OpenMAIC \u6CA1\u6709\u5728\u5185\u5D4C\u6A21\u5F0F\u4E0B\u5B8C\u6210\u52A0\u8F7D\uFF0C\u53EF\u80FD\u79BB\u7EBF\u6216\u62D2\u7EDD iframe \u5D4C\u5165\u3002",
        ),
      latestJobStatusLabel,
      latestJobSummary: latestJob.jobId
        ? pickUiText(
            input.language,
            `Latest diagnostic job: ${latestJobStatusLabel}${latestJob.step ? ` · ${latestJob.step}` : ""}`,
            `\u6700\u8FD1\u8BCA\u65AD job\uFF1A${latestJobStatusLabel}${latestJob.step ? ` \u00B7 ${latestJob.step}` : ""}`,
          )
        : pickUiText(
            input.language,
            "No diagnostic classroom job has been recorded yet. The job APIs stay available for fallback use, but they are no longer the main path here.",
            "\u8FD8\u6CA1\u6709\u8BB0\u5F55\u4EFB\u4F55\u8BCA\u65AD classroom job\u3002job \u63A5\u53E3\u4ECD\u7136\u4F5C\u4E3A\u56DE\u9000\u80FD\u529B\u4FDD\u7559\uFF0C\u4F46\u4E0D\u518D\u662F\u8FD9\u4E2A\u9875\u9762\u7684\u4E3B\u8DEF\u5F84\u3002",
          ),
      syncStatusLabel: educationSyncStatusLabel(openmaicConfigSync.status, input.language),
      syncTone: educationSyncTone(openmaicConfigSync.status),
      pdfVerificationLabel: educationPdfVerificationLabel(health.pdfProviderVerification, input.language),
      latestJobLinks: [
        latestJob.classroomUrl
          ? `<a class="btn" href="${escapeHtml(latestJob.classroomUrl)}" target="_blank" rel="noreferrer">${escapeHtml(
              pickUiText(input.language, "Open latest classroom", "\u6253\u5F00\u6700\u8FD1\u8BFE\u5802"),
            )}</a>`
          : "",
        latestJob.pollUrl
          ? `<a class="btn" href="${escapeHtml(latestJob.pollUrl)}" target="_blank" rel="noreferrer">${escapeHtml(
              pickUiText(input.language, "Open latest job", "\u6253\u5F00\u6700\u8FD1 job"),
            )}</a>`
          : "",
      ]
        .filter(Boolean)
        .join(""),
    };
  }

  function renderEducationSettingsCard(view) {
    const { input, aiTakeoverEnabled, mode, endpointValue, repoDirValue, config, canUseHostedRecovery } = view;
    return `<section class="card geo-secondary-card" id="ai-education-model-config">
      <details class="geo-collapsible" open>
        <summary>${escapeHtml(pickUiText(input.language, "Connection", "\u8FDE\u63A5"))}</summary>
        <div class="meta">${escapeHtml(
          pickUiText(
            input.language,
            "Hosted fallback and self-hosted OpenMAIC connection stay here. Access code is only for hosted API fallback, not for iframe launch.",
            "\u6258\u7BA1 fallback \u548C\u81EA\u6258\u7BA1 OpenMAIC \u8FDE\u63A5\u90FD\u6536\u5728\u8FD9\u91CC\u3002access code \u53EA\u7528\u4E8E hosted API fallback\uFF0C\u4E0D\u662F iframe \u542F\u52A8\u5FC5\u586B\u9879\u3002",
          ),
        )}</div>
        <form class="geo-run-form geo-collapsible" data-ai-education-config-form>
          <div class="geo-form-grid">
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Mode", "\u6A21\u5F0F"))}</span>
              <select name="mode">
                <option value="hosted"${mode === "hosted" ? " selected" : ""}>${escapeHtml(
                  pickUiText(input.language, "Hosted OpenMAIC", "\u6258\u7BA1 OpenMAIC"),
                )}</option>
                <option value="self_hosted"${mode === "self_hosted" ? " selected" : ""}>${escapeHtml(
                  pickUiText(input.language, "Self-hosted OpenMAIC", "\u81EA\u6258\u7BA1 OpenMAIC"),
                )}</option>
              </select>
            </label>
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Service URL", "\u670D\u52A1 URL"))}</span>
              <input type="url" name="baseUrl" value="${escapeHtml(endpointValue)}"${mode === "hosted" ? " readonly" : ""} />
            </label>
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Project directory", "\u9879\u76EE\u76EE\u5F55"))}</span>
              <input type="text" name="repoDir" value="${escapeHtml(repoDirValue)}" placeholder="${escapeHtml(
                pickUiText(input.language, "Optional local checkout path", "\u53EF\u9009\u7684\u672C\u5730\u9879\u76EE\u8DEF\u5F84"),
              )}" />
            </label>
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Access code", "Access code"))}</span>
              <input type="password" name="accessCode" value="" placeholder="${escapeHtml(
                config.accessCodeConfigured
                  ? pickUiText(
                      input.language,
                      `Saved as ${config.accessCodeHint || "***"}. Leave blank to keep it.`,
                      `\u5F53\u524D\u5DF2\u4FDD\u5B58 ${config.accessCodeHint || "***"}\uFF0C\u7559\u7A7A\u53EF\u4EE5\u76F4\u63A5\u4FDD\u7559`,
                    )
                  : pickUiText(
                      input.language,
                      "Paste only when you want to replace the saved code",
                      "\u53EA\u5728\u4F60\u60F3\u66FF\u6362\u5DF2\u4FDD\u5B58\u4EE4\u724C\u65F6\u624D\u9700\u8981\u586B\u5199",
                    ),
              )}" />
            </label>
          </div>
          <div class="feature-card-actions">
            <button class="btn" type="submit" data-ai-education-save>${escapeHtml(
              pickUiText(input.language, "Save config", "\u4FDD\u5B58\u914D\u7F6E"),
            )}</button>
            ${
              canUseHostedRecovery
                ? `<button class="btn" type="button" data-ai-education-use-hosted>${escapeHtml(
                    pickUiText(input.language, "Use hosted now", "\u7ACB\u5373\u5207\u6362 hosted"),
                  )}</button>`
                : ""
            }
          </div>
        </form>
      </details>
      ${renderFeatureTakeoverControl("education", aiTakeoverEnabled, input.language)}
    </section>`;
  }

  function renderEducationLlmCard(view) {
    const { input, config } = view;
    const needsCustomBaseUrl = config.llmProviderPreset === "custom_openai_compatible";
    return `<section class="card geo-secondary-card">
      <h3>${escapeHtml(pickUiText(input.language, "LLM API", "LLM API"))}</h3>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "This shell only writes bounded provider settings into OpenMAIC's server-providers.yml. It does not mirror OpenMAIC's own settings UI.",
          "\u8FD9\u4E2A\u58F3\u5C42\u53EA\u4F1A\u628A\u53D7\u63A7 provider \u8BBE\u7F6E\u5199\u5165 OpenMAIC \u7684 server-providers.yml\uFF0C\u4E0D\u4F1A\u955C\u50CF OpenMAIC \u81EA\u5DF1\u7684 settings UI\u3002",
        ),
      )}</div>
      <form class="geo-run-form" data-ai-education-llm-form>
        <div class="geo-form-grid">
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Provider", "Provider"))}</span>
            <select name="llmProviderPreset" data-ai-education-llm-provider>
              ${renderEducationProviderOptions(config.llmProviderPreset)}
            </select>
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Model", "Model"))}</span>
            <input type="text" name="llmModel" value="${escapeHtml(config.llmModel || "")}" placeholder="${escapeHtml(
              pickUiText(input.language, "gpt-4.1-mini / claude-3-7-sonnet / gemini-2.5-pro", "gpt-4.1-mini / claude-3-7-sonnet / gemini-2.5-pro"),
            )}" />
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "API key", "API key"))}</span>
            <input type="password" name="llmApiKey" value="" placeholder="${escapeHtml(
              config.llmApiKeyConfigured
                ? pickUiText(input.language, "Saved already. Fill only to replace it.", "\u5DF2\u4FDD\u5B58\u3002\u53EA\u5728\u66FF\u6362\u65F6\u518D\u586B\u5199\u3002")
                : pickUiText(input.language, "Paste provider API key", "\u586B\u5165 provider API key"),
            )}" />
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Base URL", "Base URL"))}</span>
            <input type="url" name="llmBaseUrl" value="${escapeHtml(config.llmBaseUrl || "")}" placeholder="${escapeHtml(
              needsCustomBaseUrl
                ? pickUiText(input.language, "Required for OpenAI-compatible gateways", "OpenAI-compatible gateway \u5FC5\u586B")
                : pickUiText(input.language, "Optional compatible-provider override", "\u53EF\u9009\u7684 compatible provider override"),
            )}" />
          </label>
        </div>
        <div class="feature-card-actions">
          <button class="btn" type="button" data-ai-education-save>${escapeHtml(
            pickUiText(input.language, "Save local config", "\u4FDD\u5B58\u672C\u5730\u914D\u7F6E"),
          )}</button>
          <button class="btn" type="button" data-ai-education-apply-openmaic-config>${escapeHtml(
            pickUiText(input.language, "Write model config into OpenMAIC", "\u5199\u5165 OpenMAIC \u6A21\u578B\u914D\u7F6E"),
          )}</button>
        </div>
      </form>
    </section>`;
  }

  function renderEducationTtsCard(view) {
    const { input, config } = view;
    return `<section class="card geo-secondary-card">
      <h3>${escapeHtml(pickUiText(input.language, "TTS", "TTS"))}</h3>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "Write a bounded server-side TTS provider into OpenMAIC so classroom narration can use your relay or custom model.",
          "\u628A\u6709\u8FB9\u754C\u7684 TTS provider \u5199\u5165 OpenMAIC\uff0c\u8BA9\u8BFE\u5802\u89E3\u8BF4\u53EF\u4EE5\u4F7F\u7528\u4F60\u7684\u4E2D\u8F6C\u6216\u81EA\u5B9A\u4E49\u6A21\u578B\u3002",
        ),
      )}</div>
      <form class="geo-run-form" data-ai-education-tts-form>
        <div class="geo-form-grid">
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Provider", "Provider"))}</span>
            <select name="ttsProviderPreset">
              ${renderEducationTtsProviderOptions(config.ttsProviderPreset)}
            </select>
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Model", "Model"))}</span>
            <input type="text" name="ttsModel" value="${escapeHtml(config.ttsModel || "")}" placeholder="${escapeHtml(
              pickUiText(input.language, "tts-1-1106 / custom-voice-model", "tts-1-1106 / custom-voice-model"),
            )}" />
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "API key", "API key"))}</span>
            <input type="password" name="ttsApiKey" value="" placeholder="${escapeHtml(
              config.ttsApiKeyConfigured
                ? pickUiText(input.language, "Saved already. Fill only to replace it.", "\u5DF2\u4FDD\u5B58\u3002\u53EA\u5728\u66FF\u6362\u65F6\u518D\u586B\u5199\u3002")
                : pickUiText(input.language, "Paste provider API key", "\u586B\u5165 provider API key"),
            )}" />
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Base URL", "Base URL"))}</span>
            <input type="url" name="ttsBaseUrl" value="${escapeHtml(config.ttsBaseUrl || "")}" placeholder="${escapeHtml(
              pickUiText(input.language, "Optional compatible-provider override", "\u53EF\u9009\u7684 compatible provider override"),
            )}" />
          </label>
        </div>
        <div class="feature-card-actions">
          <button class="btn" type="button" data-ai-education-save>${escapeHtml(
            pickUiText(input.language, "Save local config", "\u4FDD\u5B58\u672C\u5730\u914D\u7F6E"),
          )}</button>
          <button class="btn" type="button" data-ai-education-apply-openmaic-config>${escapeHtml(
            pickUiText(input.language, "Write provider config into OpenMAIC", "\u5199\u5165 OpenMAIC provider \u914D\u7F6E"),
          )}</button>
        </div>
      </form>
    </section>`;
  }

  function renderEducationImageCard(view) {
    const { input, config } = view;
    return `<section class="card geo-secondary-card">
      <h3>${escapeHtml(pickUiText(input.language, "Image generation", "\u56FE\u50CF\u751F\u6210"))}</h3>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "Keep image generation inside OpenMAIC's native media workflow, but let this shell write the provider/model relay settings.",
          "\u56FE\u50CF\u751F\u6210\u4ECD\u7136\u8D70 OpenMAIC \u539F\u751F\u5A92\u4F53\u6D41\u7A0B\uff0c\u4F46\u7531\u8FD9\u4E2A\u58F3\u5C42\u5199\u5165 provider / model \u4E2D\u8F6C\u8BBE\u7F6E\u3002",
        ),
      )}</div>
      <form class="geo-run-form" data-ai-education-image-form>
        <div class="geo-form-grid">
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Provider", "Provider"))}</span>
            <select name="imageProviderPreset">
              ${renderEducationImageProviderOptions(config.imageProviderPreset)}
            </select>
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Model", "Model"))}</span>
            <input type="text" name="imageModel" value="${escapeHtml(config.imageModel || "")}" placeholder="${escapeHtml(
              pickUiText(input.language, "gemini-2.5-flash-image / qwen-image-max", "gemini-2.5-flash-image / qwen-image-max"),
            )}" />
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "API key", "API key"))}</span>
            <input type="password" name="imageApiKey" value="" placeholder="${escapeHtml(
              config.imageApiKeyConfigured
                ? pickUiText(input.language, "Saved already. Fill only to replace it.", "\u5DF2\u4FDD\u5B58\u3002\u53EA\u5728\u66FF\u6362\u65F6\u518D\u586B\u5199\u3002")
                : pickUiText(input.language, "Paste provider API key", "\u586B\u5165 provider API key"),
            )}" />
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Base URL", "Base URL"))}</span>
            <input type="url" name="imageBaseUrl" value="${escapeHtml(config.imageBaseUrl || "")}" placeholder="${escapeHtml(
              pickUiText(input.language, "Optional compatible-provider override", "\u53EF\u9009\u7684 compatible provider override"),
            )}" />
          </label>
        </div>
        <div class="feature-card-actions">
          <button class="btn" type="button" data-ai-education-save>${escapeHtml(
            pickUiText(input.language, "Save local config", "\u4FDD\u5B58\u672C\u5730\u914D\u7F6E"),
          )}</button>
          <button class="btn" type="button" data-ai-education-apply-openmaic-config>${escapeHtml(
            pickUiText(input.language, "Write provider config into OpenMAIC", "\u5199\u5165 OpenMAIC provider \u914D\u7F6E"),
          )}</button>
        </div>
      </form>
    </section>`;
  }

  function renderEducationVideoCard(view) {
    const { input, config } = view;
    return `<section class="card geo-secondary-card">
      <h3>${escapeHtml(pickUiText(input.language, "Video generation", "\u89C6\u9891\u751F\u6210"))}</h3>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "Video generation also stays native to OpenMAIC. This card only manages the bounded relay/provider config we write on disk.",
          "\u89C6\u9891\u751F\u6210\u4E5F\u4FDD\u6301\u5728 OpenMAIC \u539F\u751F\u6D41\u7A0B\u91CC\uff0c\u8FD9\u5F20\u5361\u53EA\u7BA1\u7406\u6211\u4EEC\u843D\u76D8\u7684\u6709\u8FB9\u754C provider \u914D\u7F6E\u3002",
        ),
      )}</div>
      <form class="geo-run-form" data-ai-education-video-form>
        <div class="geo-form-grid">
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Provider", "Provider"))}</span>
            <select name="videoProviderPreset">
              ${renderEducationVideoProviderOptions(config.videoProviderPreset)}
            </select>
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Model", "Model"))}</span>
            <input type="text" name="videoModel" value="${escapeHtml(config.videoModel || "")}" placeholder="${escapeHtml(
              pickUiText(input.language, "veo3.1-fast / kling-v2-6", "veo3.1-fast / kling-v2-6"),
            )}" />
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "API key", "API key"))}</span>
            <input type="password" name="videoApiKey" value="" placeholder="${escapeHtml(
              config.videoApiKeyConfigured
                ? pickUiText(input.language, "Saved already. Fill only to replace it.", "\u5DF2\u4FDD\u5B58\u3002\u53EA\u5728\u66FF\u6362\u65F6\u518D\u586B\u5199\u3002")
                : pickUiText(input.language, "Paste provider API key", "\u586B\u5165 provider API key"),
            )}" />
          </label>
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Base URL", "Base URL"))}</span>
            <input type="url" name="videoBaseUrl" value="${escapeHtml(config.videoBaseUrl || "")}" placeholder="${escapeHtml(
              pickUiText(input.language, "Optional compatible-provider override", "\u53EF\u9009\u7684 compatible provider override"),
            )}" />
          </label>
        </div>
        <div class="feature-card-actions">
          <button class="btn" type="button" data-ai-education-save>${escapeHtml(
            pickUiText(input.language, "Save local config", "\u4FDD\u5B58\u672C\u5730\u914D\u7F6E"),
          )}</button>
          <button class="btn" type="button" data-ai-education-apply-openmaic-config>${escapeHtml(
            pickUiText(input.language, "Write provider config into OpenMAIC", "\u5199\u5165 OpenMAIC provider \u914D\u7F6E"),
          )}</button>
        </div>
      </form>
    </section>`;
  }

  function renderEducationPdfCard(view) {
    const { input, config, pdfVerificationLabel } = view;
    const parserDescription =
      config.pdfProvider === "opendataloader"
        ? pickUiText(
            input.language,
            "OpenDataLoader runs locally inside OpenMAIC and can optionally use a hybrid backend URL for OCR, formulas, and richer tables. It is not embedded as a separate child app UI.",
            "OpenDataLoader \u9ED8\u8BA4\u5728 OpenMAIC \u5185\u672C\u5730\u8FD0\u884C\uff0c\u4E5F\u53EF\u9009\u914D\u7F6E hybrid backend URL \u6765\u589E\u5F3A OCR\u3001\u516C\u5F0F\u548C\u8868\u683C\u89E3\u6790\u3002\u5B83\u4E0D\u4F1A\u88AB\u5185\u5D4C\u6210\u72EC\u7ACB\u5B50\u5E94\u7528 UI\u3002",
          )
        : pickUiText(
            input.language,
            "MinerU is treated as an optional local parsing backend for OpenMAIC. It is not embedded as a separate child app UI.",
            "MinerU \u5728\u8FD9\u91CC\u53EA\u88AB\u5F53\u6210 OpenMAIC \u7684\u53EF\u9009\u672C\u5730\u89E3\u6790\u540E\u7AEF\uff0c\u4E0D\u4F1A\u88AB\u5185\u5D4C\u6210\u72EC\u7ACB\u5B50\u5E94\u7528 UI\u3002",
          );
    const baseUrlLabel =
      config.pdfProvider === "opendataloader"
        ? pickUiText(input.language, "Hybrid Base URL", "Hybrid Base URL")
        : pickUiText(input.language, "MinerU Base URL", "MinerU Base URL");
    const apiKeyLabel =
      config.pdfProvider === "opendataloader"
        ? pickUiText(input.language, "Hybrid API key", "Hybrid API key")
        : pickUiText(input.language, "MinerU API key", "MinerU API key");
    const baseUrlPlaceholder =
      config.pdfProvider === "opendataloader"
        ? pickUiText(input.language, "Optional, e.g. http://127.0.0.1:5002", "\u53EF\u9009\uff0c\u4F8B\u5982 http://127.0.0.1:5002")
        : pickUiText(input.language, "http://127.0.0.1:8888", "http://127.0.0.1:8888");
    const apiKeyPlaceholder =
      config.pdfApiKeyConfigured
        ? pickUiText(input.language, "Saved already. Fill only to replace it.", "\u5DF2\u4FDD\u5B58\u3002\u53EA\u5728\u66FF\u6362\u65F6\u518D\u586B\u5199\u3002")
        : config.pdfProvider === "opendataloader"
          ? pickUiText(input.language, "Optional for local mode and many hybrid setups", "\u672C\u5730\u6A21\u5F0F\u548C\u5F88\u591A hybrid \u90E8\u7F72\u90FD\u53EF\u4EE5\u4E0D\u586B")
          : pickUiText(input.language, "Optional for local MinerU", "\u672C\u5730 MinerU \u53EF\u4EE5\u4E0D\u586B");
    const verifyLabel =
      config.pdfProvider === "opendataloader"
        ? pickUiText(input.language, "Verify OpenDataLoader", "\u9A8C\u8BC1 OpenDataLoader")
        : pickUiText(input.language, "Verify MinerU", "\u9A8C\u8BC1 MinerU");
    return `<section class="card geo-secondary-card">
      <h3>${escapeHtml(pickUiText(input.language, "Document parsing", "\u6587\u6863\u89E3\u6790"))}</h3>
      <div class="meta">${escapeHtml(parserDescription)}</div>
      <form class="geo-run-form" data-ai-education-pdf-form>
        <div class="geo-form-grid">
          <label class="geo-field">
            <span>${escapeHtml(pickUiText(input.language, "Parser", "\u89E3\u6790\u5668"))}</span>
            <select name="pdfProvider">
              <option value="unpdf"${config.pdfProvider === "unpdf" ? " selected" : ""}>unpdf</option>
              <option value="mineru"${config.pdfProvider === "mineru" ? " selected" : ""}>MinerU</option>
              <option value="opendataloader"${config.pdfProvider === "opendataloader" ? " selected" : ""}>OpenDataLoader PDF</option>
            </select>
          </label>
          <label class="geo-field">
            <span>${escapeHtml(baseUrlLabel)}</span>
            <input type="url" name="pdfBaseUrl" value="${escapeHtml(config.pdfBaseUrl || "")}" placeholder="${escapeHtml(baseUrlPlaceholder)}" />
          </label>
          <label class="geo-field">
            <span>${escapeHtml(apiKeyLabel)}</span>
            <input type="password" name="pdfApiKey" value="" placeholder="${escapeHtml(apiKeyPlaceholder)}" />
          </label>
          <div class="status-chip">
            <span>${escapeHtml(pickUiText(input.language, "Verification", "\u9A8C\u8BC1"))}</span>
            <strong data-ai-education-pdf-verification>${escapeHtml(pdfVerificationLabel)}</strong>
          </div>
        </div>
        <div class="feature-card-actions">
          <button class="btn" type="button" data-ai-education-save>${escapeHtml(
            pickUiText(input.language, "Save local config", "\u4FDD\u5B58\u672C\u5730\u914D\u7F6E"),
          )}</button>
          <button class="btn" type="button" data-ai-education-health>${escapeHtml(
            verifyLabel,
          )}</button>
        </div>
      </form>
    </section>`;
  }

  function renderEducationRuntimeCard(view) {
    const {
      input,
      health,
      healthStatusLabel,
      latestJobStatusLabel,
      latestJobSummary,
      latestJobLinks,
      openmaicConfigSync,
      observedServerProviders,
      syncStatusLabel,
      syncTone,
    } = view;
    return `<section class="card geo-secondary-card">
      <h3>${escapeHtml(pickUiText(input.language, "Runtime / sync status", "\u8FD0\u884C / \u540C\u6B65\u72B6\u6001"))}</h3>
      <div class="meta" data-ai-education-health-summary>${escapeHtml(
        health.message ||
          pickUiText(
            input.language,
            "No health check has been recorded yet.",
            "\u8FD8\u6CA1\u6709\u8BB0\u5F55\u4EFB\u4F55 health check \u7ED3\u679C\u3002",
          ),
      )}</div>
      <div class="geo-status-strip">
        <div class="status-chip">
          <span>${escapeHtml(pickUiText(input.language, "Connection", "\u8FDE\u63A5"))}</span>
          <strong data-ai-education-health-chip>${escapeHtml(healthStatusLabel)}</strong>
        </div>
        <div class="status-chip">
          <span>${escapeHtml(pickUiText(input.language, "Checked", "\u68C0\u67E5\u65F6\u95F4"))}</span>
          <strong data-ai-education-health-checked>${escapeHtml(health.checkedAt || "-")}</strong>
        </div>
        <div class="status-chip">
          <span>${escapeHtml(pickUiText(input.language, "Version", "\u7248\u672C"))}</span>
          <strong data-ai-education-health-version>${escapeHtml(health.version || "-")}</strong>
        </div>
        <div class="status-chip">
          <span>${escapeHtml(pickUiText(input.language, "Config sync", "\u914D\u7F6E\u540C\u6B65"))}</span>
          <strong data-ai-education-sync-status class="${escapeHtml(syncTone)}">${escapeHtml(syncStatusLabel)}</strong>
        </div>
      </div>
      <div data-ai-education-capabilities>
        ${renderEducationCapabilityBadges(health.capabilities || {}, input.language)}
      </div>
      <div class="meta" data-ai-education-fallback-summary>${escapeHtml(
        view.fallbackReason ||
          pickUiText(
            input.language,
            "Embed diagnostics will appear here if the OpenMAIC workspace cannot be rendered inside the shell.",
            "\u5982\u679C OpenMAIC \u5DE5\u4F5C\u533A\u65E0\u6CD5\u5728\u58F3\u5C42\u5185\u6E32\u67D3\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u5D4C\u5165\u8BCA\u65AD\u4FE1\u606F\u3002",
          ),
      )}</div>
      <div class="meta" data-ai-education-sync-message>${escapeHtml(
        openmaicConfigSync.message ||
          pickUiText(input.language, "OpenMAIC config has not been written yet.", "\u8FD8\u6CA1\u6709\u5199\u5165 OpenMAIC \u914D\u7F6E\u3002"),
      )}</div>
      <div class="meta">${escapeHtml(
        pickUiText(input.language, "Observed /api/server-providers", "\u89C2\u5BDF\u5230\u7684 /api/server-providers"),
      )}</div>
      <div data-ai-education-observed-providers>${renderEducationObservedProviderSummary(
        observedServerProviders,
        input.language,
      )}</div>
      <div class="meta" data-ai-education-job-summary>${escapeHtml(latestJobSummary)}</div>
      <div class="geo-status-strip">
        <div class="status-chip">
          <span>${escapeHtml(pickUiText(input.language, "Latest job", "\u6700\u8FD1 job"))}</span>
          <strong data-ai-education-job-status>${escapeHtml(latestJobStatusLabel)}</strong>
        </div>
        <div class="status-chip">
          <span>${escapeHtml(pickUiText(input.language, "PDF verify", "PDF verify"))}</span>
          <strong>${escapeHtml(educationPdfVerificationLabel(health.pdfProviderVerification, input.language))}</strong>
        </div>
      </div>
      <div class="feature-card-actions" data-ai-education-job-links>${latestJobLinks}</div>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "The bottom-right collaboration chat still belongs to the current room timeline. No full-history, full-room, or full-repository scan is unlocked here.",
          "\u53F3\u4E0B\u89D2\u534F\u4F5C\u7FA4\u804A\u4ECD\u7136\u5C5E\u4E8E\u5F53\u524D room \u7684\u5171\u4EAB\u65F6\u95F4\u7EBF\u3002\u8FD9\u91CC\u4E0D\u4F1A\u653E\u5F00\u5168\u5386\u53F2\u3001\u5168 room \u6216\u5168\u4ED3\u5E93\u626B\u63CF\u3002",
        ),
      )}</div>
    </section>`;
  }

  function renderEducationBoundaryCard(view) {
    const { input } = view;
    return `<section class="card geo-secondary-card">
      <h3>${escapeHtml(pickUiText(input.language, "Controlled boundary", "\u53D7\u63A7\u8FB9\u754C"))}</h3>
      <div class="meta">${escapeHtml(
        pickUiText(
          input.language,
          "The bottom-right collaboration chat is still the current room's shared timeline. AI Education stays inside the same shell, but it does not unlock any global room, history, or repository scanning.",
          "\u53F3\u4E0B\u89D2\u534F\u4F5C\u7FA4\u804A\u4ECD\u7136\u662F\u5F53\u524D room \u7684\u5171\u4EAB\u65F6\u95F4\u7EBF\u3002AI\u6559\u80B2\u5373\u4F7F\u8FDB\u5165\u540C\u4E00\u4E2A\u58F3\uFF0C\u4E5F\u4E0D\u4F1A\u653E\u5F00\u5168 room\u3001\u5168\u5386\u53F2\u6216\u5168\u4ED3\u5E93\u626B\u63CF\u80FD\u529B\u3002",
        ),
      )}</div>
      <ul class="story-list">
        <li>${escapeHtml(
          pickUiText(
            input.language,
            "New conversation still means a new collaboration room.",
            "\u65B0\u5EFA\u5BF9\u8BDD\u4ECD\u7136\u7B49\u4E8E\u65B0\u5EFA\u534F\u4F5C room\u3002",
          ),
        )}</li>
        <li>${escapeHtml(
          pickUiText(
            input.language,
            "The shared group chat stays in the current room instead of becoming a private Jarvis mirror.",
            "\u5171\u4EAB\u7FA4\u804A\u4ECD\u7136\u7559\u5728\u5F53\u524D room \u91CC\uFF0C\u4E0D\u4F1A\u9000\u5316\u6210 Jarvis \u79C1\u804A\u955C\u50CF\u3002",
          ),
        )}</li>
        <li>${escapeHtml(
          pickUiText(
            input.language,
            "Employee context still must come from controlled injection only.",
            "\u5458\u5DE5\u4E0A\u4E0B\u6587\u4ECD\u7136\u53EA\u80FD\u901A\u8FC7\u53D7\u63A7\u6CE8\u5165\u83B7\u53D6\u3002",
          ),
        )}</li>
      </ul>
    </section>`;
  }

  function renderEducationEmbeddedShell(input) {
    const view = buildEducationViewModel(input);
    return `
    <div data-features-root data-language="${escapeHtml(input.language)}" data-ai-education-root>
      <section class="ai-education-workspace-row">
        <section class="card geo-secondary-card ai-education-embed-card" data-ai-education-fullscreen-target>
          <div class="overview-command-head">
            <div>
              <div class="meta"><a href="${escapeHtml(view.backHref)}">${escapeHtml(
                pickUiText(input.language, "Back to function hub", "\u8FD4\u56DE\u529F\u80FD\u4E2D\u5FC3"),
              )}</a></div>
              <h2>${escapeHtml(pickUiText(input.language, "AI Education", "AI\u6559\u80B2"))}</h2>
              <div class="meta" data-ai-education-embed-message>${escapeHtml(view.workspaceMessage)}</div>
            </div>
            <div class="ai-education-workspace-actions">
              <span class="meta ai-education-fullscreen-state" data-ai-education-fullscreen-state>${escapeHtml(
                pickUiText(input.language, "Windowed", "\u7A97\u53E3\u6A21\u5F0F"),
              )}</span>
              <button class="btn" type="button" data-ai-education-fullscreen>${escapeHtml(
                pickUiText(input.language, "Fullscreen workspace", "\u5DE5\u4F5C\u533A\u5168\u5C4F"),
              )}</button>
              <span class="badge ${escapeHtml(view.embedTone)}">${escapeHtml(view.embedStatusLabel)}</span>
            </div>
          </div>
          <div class="ai-education-iframe-shell" data-ai-education-iframe-shell data-ai-education-ready="${view.state.ready ? "true" : "false"}">
            <iframe class="ai-education-iframe${view.state.ready ? "" : " is-hidden"}" data-ai-education-iframe title="${escapeHtml(
              pickUiText(input.language, "AI Education workspace", "AI\u6559\u80B2\u5DE5\u4F5C\u533A"),
            )}" src="${escapeHtml(view.state.ready ? view.state.embedUrl || "about:blank" : "about:blank")}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
            <div class="ai-education-fallback${view.state.ready ? "" : " is-visible"}" data-ai-education-fallback${view.state.ready ? " hidden" : ""}>
              <div class="feature-card-kicker">OpenMAIC</div>
              <h3 data-ai-education-fallback-title>${escapeHtml(view.fallbackTitle)}</h3>
              <div class="meta" data-ai-education-fallback-reason>${escapeHtml(view.fallbackReason)}</div>
              <div class="feature-card-actions">
                <button class="btn" type="button" data-ai-education-health>${escapeHtml(
                  pickUiText(input.language, "Retry health check", "\u91CD\u8BD5 health check"),
                )}</button>
                <button class="btn" type="button" data-ai-education-reload-embed>${escapeHtml(
                  pickUiText(input.language, "Retry embed", "\u91CD\u8BD5\u5D4C\u5165"),
                )}</button>
                ${
                  view.canUseHostedRecovery
                    ? `<button class="btn" type="button" data-ai-education-use-hosted>${escapeHtml(
                        pickUiText(input.language, "Use hosted now", "\u7ACB\u5373\u5207\u6362 hosted"),
                      )}</button>`
                    : ""
                }
                <a class="btn" href="${escapeHtml(view.externalOpenUrl)}" target="_blank" rel="noreferrer" data-ai-education-open-app>${escapeHtml(
                  view.canUseHostedRecovery
                    ? pickUiText(input.language, "Open hosted directly", "\u76F4\u63A5\u6253\u5F00 hosted")
                    : pickUiText(input.language, "Open externally", "\u5916\u90E8\u6253\u5F00"),
                )}</a>
              </div>
            </div>
          </div>
        </section>
      </section>
      <section class="card geo-primary-card ai-education-shell-card">
        <div class="overview-command-head">
          <div>
            <div class="feature-card-kicker">OpenMAIC</div>
            <h3>${escapeHtml(pickUiText(input.language, "Workspace controls", "\u5DE5\u4F5C\u533A\u63A7\u5236"))}</h3>
            <div class="meta">${escapeHtml(
              pickUiText(
                input.language,
                "Keep the OpenMAIC workspace on top, and manage connection, reload, and external open actions from this strip.",
                "\u8BA9 OpenMAIC \u5DE5\u4F5C\u533A\u59CB\u7EC8\u5728\u9876\u90E8\u4F18\u5148\u663E\u793A\uFF0C\u8FD9\u91CC\u53EA\u653E\u8FDE\u63A5\u3001\u91CD\u8F7D\u548C\u5916\u90E8\u6253\u5F00\u7B49\u63A7\u5236\u3002",
              ),
            )}</div>
          </div>
          <div><span class="badge ${escapeHtml(view.embedTone)}" data-ai-education-top-badge>${escapeHtml(
            view.embedStatusLabel,
          )}</span></div>
        </div>
        <div class="geo-status-strip ai-education-status-strip">
          <div class="status-chip">
            <span>${escapeHtml(pickUiText(input.language, "Mode", "\u6A21\u5F0F"))}</span>
            <strong data-ai-education-mode>${escapeHtml(educationModeLabel(view.mode, input.language))}</strong>
          </div>
          <div class="status-chip">
            <span>${escapeHtml(pickUiText(input.language, "Endpoint", "\u670D\u52A1\u5730\u5740"))}</span>
            <strong data-ai-education-endpoint>${escapeHtml(view.endpointValue || "-")}</strong>
          </div>
          <div class="status-chip">
            <span>${escapeHtml(pickUiText(input.language, "Connection", "\u8FDE\u63A5"))}</span>
            <strong data-ai-education-health-status>${escapeHtml(view.healthStatusLabel)}</strong>
          </div>
          <div class="status-chip">
            <span>${escapeHtml(pickUiText(input.language, "Embed state", "\u5D4C\u5165\u72B6\u6001"))}</span>
            <strong data-ai-education-embed-status>${escapeHtml(view.embedStatusLabel)}</strong>
          </div>
        </div>
        <div class="feature-card-actions ai-education-shell-actions">
          <a class="btn" href="#ai-education-model-config">${escapeHtml(
            pickUiText(input.language, "Model config", "\u6A21\u578B\u914D\u7F6E"),
          )}</a>
          <button class="btn" type="button" data-ai-education-health>${escapeHtml(
            pickUiText(input.language, "Check connection", "\u68C0\u67E5\u8FDE\u63A5"),
          )}</button>
          <button class="btn" type="button" data-ai-education-reload-embed>${escapeHtml(
            pickUiText(input.language, "Reload workspace", "\u91CD\u65B0\u52A0\u8F7D\u5DE5\u4F5C\u533A"),
          )}</button>
          ${
            view.canUseHostedRecovery
              ? `<button class="btn" type="button" data-ai-education-use-hosted>${escapeHtml(
                  pickUiText(input.language, "Use hosted now", "\u7ACB\u5373\u5207\u6362 hosted"),
                )}</button>`
              : ""
          }
          <a class="btn" href="${escapeHtml(view.externalOpenUrl)}" target="_blank" rel="noreferrer" data-ai-education-open-app>${escapeHtml(
            view.externalOpenLabel,
          )}</a>
        </div>
        <div class="meta geo-run-status" data-ai-education-config-status>${escapeHtml(view.configStatusMessage)}</div>
      </section>
      <section class="geo-layout ai-education-layout ai-education-controls-grid">
        ${renderEducationSettingsCard(view)}
        ${renderEducationLlmCard(view)}
        ${renderEducationTtsCard(view)}
        ${renderEducationImageCard(view)}
        ${renderEducationVideoCard(view)}
        ${renderEducationPdfCard(view)}
        ${renderEducationRuntimeCard(view)}
      </section>
    </div>
  `;
  }

  function renderEducationWorkbench(input) {
    return renderEducationEmbeddedShell(input);

    const state = getAiEducationState(input);
    const config = state.config || {};
    const health = state.health || {};
    const latestJob = state.latestJob || {};
    const aiTakeoverEnabled = input.featureControl?.education?.aiTakeoverEnabled === true;
    const backHref = buildFeaturesHref(input);
    const mode = config.mode || "self_hosted";
    const endpointValue = config.baseUrl || "";
    const repoDirValue = config.repoDir || "";
    const jobStatusLabel = educationJobStatusLabel(latestJob.status, input.language);
    const healthStatusLabel = educationHealthStatusLabel(health.status, input.language);
    const healthTone = educationHealthTone(health.status);
    const jobTone = educationJobTone(latestJob.status);
    const configStatusMessage =
      mode === "hosted" && config.accessCodeConfigured !== true
        ? pickUiText(
            input.language,
            "Hosted mode requires an access code before health checks or classroom generation can run.",
            "\u6258\u7BA1\u6A21\u5F0F\u9700\u8981 access code \u624D\u80FD\u8FDB\u884C\u8FDE\u63A5\u68C0\u67E5\u6216\u751F\u6210\u8BFE\u5802\u3002",
          )
        : pickUiText(
            input.language,
            "Only bounded OpenMAIC interfaces live here: save config, verify health, submit a job, poll status, then open the resulting classroom.",
            "\u8FD9\u91CC\u53EA\u653E\u6709\u8FB9\u754C\u7684 OpenMAIC \u63A5\u53E3\uFF1A\u4FDD\u5B58\u914D\u7F6E\u3001\u8FDE\u63A5\u68C0\u67E5\u3001\u63D0\u4EA4 job\u3001\u8F6E\u8BE2\u72B6\u6001\u3001\u6700\u540E\u6253\u5F00\u8BFE\u5802\u3002",
          );
    const jobStatusMessage =
      latestJob.message ||
      latestJob.error ||
      pickUiText(
        input.language,
        "No classroom generation job has been submitted yet.",
        "\u8FD8\u6CA1\u6709\u63D0\u4EA4\u8BFE\u5802\u751F\u6210\u4EFB\u52A1\u3002",
      );
    return `
    <div data-features-root data-language="${escapeHtml(input.language)}" data-ai-education-root>
      <section class="card geo-primary-card">
        <div class="overview-command-head">
          <div>
            <div class="meta"><a href="${escapeHtml(backHref)}">${escapeHtml(
              pickUiText(input.language, "Back to function hub", "\u8FD4\u56DE\u529F\u80FD\u4E2D\u5FC3"),
            )}</a></div>
            <h2>${escapeHtml(pickUiText(input.language, "AI Education", "AI\u6559\u80B2"))}</h2>
            <div class="meta">${escapeHtml(
              pickUiText(
                input.language,
                "OpenMAIC stays as a separate education engine. The AI employee system keeps the shell, exposes controlled interfaces, and lets OpenClaw take over only within those boundaries.",
                "\u4FDD\u6301 OpenMAIC \u4F5C\u4E3A\u72EC\u7ACB\u6559\u80B2\u5F15\u64CE\u3002AI \u5458\u5DE5\u7CFB\u7EDF\u7EE7\u7EED\u505A\u58F3\u5C42\u4E0E\u53D7\u63A7\u63A5\u53E3\uFF0COpenClaw \u4E5F\u53EA\u80FD\u5728\u8FD9\u4E9B\u8FB9\u754C\u5185\u63A5\u7BA1\u3002",
              ),
            )}</div>
          </div>
          <div><span class="badge ${escapeHtml(jobTone !== "enabled" ? jobTone : healthTone)}" data-ai-education-top-badge>${escapeHtml(
            latestJob.status && latestJob.status !== "idle" ? jobStatusLabel : healthStatusLabel,
          )}</span></div>
        </div>
        <div class="geo-status-strip">
          <div class="status-chip">
            <span>${escapeHtml(pickUiText(input.language, "Mode", "\u6A21\u5F0F"))}</span>
            <strong data-ai-education-mode>${escapeHtml(educationModeLabel(mode, input.language))}</strong>
          </div>
          <div class="status-chip">
            <span>${escapeHtml(pickUiText(input.language, "Endpoint", "\u670D\u52A1\u5730\u5740"))}</span>
            <strong data-ai-education-endpoint>${escapeHtml(endpointValue || "-")}</strong>
          </div>
          <div class="status-chip">
            <span>${escapeHtml(pickUiText(input.language, "Connection", "\u8FDE\u63A5"))}</span>
            <strong data-ai-education-health-status>${escapeHtml(healthStatusLabel)}</strong>
          </div>
          <div class="status-chip">
            <span>${escapeHtml(pickUiText(input.language, "Latest job", "\u6700\u8FD1\u4EFB\u52A1"))}</span>
            <strong data-ai-education-job-status>${escapeHtml(jobStatusLabel)}</strong>
          </div>
        </div>
      </section>
      <section class="card geo-secondary-card">
        <h3>${escapeHtml(pickUiText(input.language, "Connection workbench", "\u8FDE\u63A5\u5DE5\u4F5C\u53F0"))}</h3>
        <div class="meta">${escapeHtml(
          pickUiText(
            input.language,
            "Save hosted or self-hosted OpenMAIC settings here. This page does not mirror the classroom UI and does not scan unrelated project history.",
            "\u5728\u8FD9\u91CC\u4FDD\u5B58\u6258\u7BA1\u6216\u81EA\u6258\u7BA1 OpenMAIC \u8FDE\u63A5\u8BBE\u7F6E\u3002\u8FD9\u4E2A\u9875\u9762\u4E0D\u4F1A\u955C\u50CF\u8BFE\u5802 UI\uFF0C\u4E5F\u4E0D\u4F1A\u626B\u63CF\u65E0\u5173\u9879\u76EE\u5386\u53F2\u3002",
          ),
        )}</div>
        <form class="geo-run-form" data-ai-education-config-form>
          <div class="geo-form-grid">
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Mode", "\u6A21\u5F0F"))}</span>
              <select name="mode">
                <option value="hosted"${mode === "hosted" ? " selected" : ""}>${escapeHtml(
                  pickUiText(input.language, "Hosted OpenMAIC", "\u6258\u7BA1 OpenMAIC"),
                )}</option>
                <option value="self_hosted"${mode === "self_hosted" ? " selected" : ""}>${escapeHtml(
                  pickUiText(input.language, "Self-hosted OpenMAIC", "\u81EA\u6258\u7BA1 OpenMAIC"),
                )}</option>
              </select>
            </label>
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Service URL", "\u670D\u52A1 URL"))}</span>
              <input type="url" name="baseUrl" value="${escapeHtml(endpointValue)}"${mode === "hosted" ? " readonly" : ""} />
            </label>
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Project directory", "\u9879\u76EE\u76EE\u5F55"))}</span>
              <input type="text" name="repoDir" value="${escapeHtml(repoDirValue)}" placeholder="${escapeHtml(
                pickUiText(input.language, "Optional local checkout path", "\u53EF\u9009\u7684\u672C\u5730\u9879\u76EE\u8DEF\u5F84"),
              )}" />
            </label>
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Access code", "Access code"))}</span>
              <input type="password" name="accessCode" value="" placeholder="${escapeHtml(
                config.accessCodeConfigured
                  ? pickUiText(
                      input.language,
                      `Saved as ${config.accessCodeHint || "***"}. Leave blank to keep it.`,
                      `\u5F53\u524D\u5DF2\u4FDD\u5B58 ${config.accessCodeHint || "***"}\uFF0C\u7559\u7A7A\u53EF\u4EE5\u76F4\u63A5\u4FDD\u7559`,
                    )
                  : pickUiText(input.language, "Paste only when you want to replace the saved code", "\u53EA\u5728\u4F60\u60F3\u66FF\u6362\u5DF2\u4FDD\u5B58\u4EE4\u724C\u65F6\u624D\u9700\u8981\u586B\u5199"),
              )}" />
            </label>
          </div>
          <div class="feature-card-actions">
            <button class="btn" type="submit" data-ai-education-save>${escapeHtml(
              pickUiText(input.language, "Save config", "\u4FDD\u5B58\u914D\u7F6E"),
            )}</button>
            <button class="btn" type="button" data-ai-education-health>${escapeHtml(
              pickUiText(input.language, "Check connection", "\u68C0\u67E5\u8FDE\u63A5"),
            )}</button>
            <a class="btn" href="${escapeHtml(endpointValue || "https://open.maic.chat")}" target="_blank" rel="noreferrer" data-ai-education-open-app>${escapeHtml(
              pickUiText(input.language, "Open OpenMAIC", "\u6253\u5F00 OpenMAIC"),
            )}</a>
          </div>
          <div class="meta geo-run-status" data-ai-education-config-status>${escapeHtml(configStatusMessage)}</div>
        </form>
        ${renderFeatureTakeoverControl("education", aiTakeoverEnabled, input.language)}
      </section>
      <section class="card geo-secondary-card">
        <h3>${escapeHtml(pickUiText(input.language, "Classroom job console", "\u8BFE\u5802\u4EFB\u52A1\u9762\u677F"))}</h3>
        <div class="meta">${escapeHtml(
          pickUiText(
            input.language,
            "Requirement-only generation stays here. The resulting classroom still opens in OpenMAIC itself instead of being mirrored back into the AI employee shell.",
            "\u8981\u6C42\u9A71\u52A8\u7684 classroom generation \u4FDD\u7559\u5728\u8FD9\u91CC\u3002\u6700\u7EC8\u8BFE\u5802\u4F9D\u7136\u4EA4\u7ED9 OpenMAIC \u672C\u4F53\u6253\u5F00\uFF0C\u800C\u4E0D\u662F\u5012\u7075\u56DE AI \u5458\u5DE5\u58F3\u5185\u3002",
          ),
        )}</div>
        <form class="geo-run-form" data-ai-education-job-form>
          <label class="geo-field geo-field-wide">
            <span>${escapeHtml(pickUiText(input.language, "Requirement", "\u8BFE\u5802\u8981\u6C42"))}</span>
            <textarea name="requirement" rows="5" placeholder="${escapeHtml(
              pickUiText(
                input.language,
                "Teach me quantum mechanics from scratch in 30 minutes",
                "\u4EE530 \u5206\u949F\u4ECE\u96F6\u5E26\u6211\u5165\u95E8\u91CF\u5B50\u529B\u5B66",
              ),
            )}">${escapeHtml(latestJob.requirement || "")}</textarea>
          </label>
          <div class="geo-form-grid">
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Language", "\u8BED\u8A00"))}</span>
              <select name="language">
                <option value="zh-CN">${escapeHtml(pickUiText(input.language, "Chinese", "\u4E2D\u6587"))}</option>
                <option value="en-US">${escapeHtml(pickUiText(input.language, "English", "\u82F1\u6587"))}</option>
              </select>
            </label>
            <label class="geo-field">
              <span>${escapeHtml(pickUiText(input.language, "Agent mode", "\u667A\u80FD\u4F53\u6A21\u5F0F"))}</span>
              <select name="agentMode">
                <option value="default">${escapeHtml(
                  pickUiText(input.language, "Default roster", "\u9ED8\u8BA4\u89D2\u8272"),
                )}</option>
                <option value="generate">${escapeHtml(
                  pickUiText(input.language, "Generate custom roster", "\u81EA\u52A8\u751F\u6210\u89D2\u8272"),
                )}</option>
              </select>
            </label>
          </div>
          <div class="geo-form-grid">
            <label class="geo-checkbox">
              <input type="checkbox" name="enableWebSearch" />
              <span>${escapeHtml(pickUiText(input.language, "Web search", "\u8054\u7F51\u641C\u7D22"))}</span>
            </label>
            <label class="geo-checkbox">
              <input type="checkbox" name="enableImageGeneration" />
              <span>${escapeHtml(pickUiText(input.language, "Image generation", "\u56FE\u50CF\u751F\u6210"))}</span>
            </label>
            <label class="geo-checkbox">
              <input type="checkbox" name="enableVideoGeneration" />
              <span>${escapeHtml(pickUiText(input.language, "Video generation", "\u89C6\u9891\u751F\u6210"))}</span>
            </label>
            <label class="geo-checkbox">
              <input type="checkbox" name="enableTTS" />
              <span>${escapeHtml(pickUiText(input.language, "TTS narration", "\u8BED\u97F3\u8BB2\u89E3"))}</span>
            </label>
          </div>
          <div class="feature-card-actions">
            <button class="btn" type="submit" data-ai-education-job-submit>${escapeHtml(
              pickUiText(input.language, "Generate classroom", "\u751F\u6210\u8BFE\u5802"),
            )}</button>
            <button class="btn" type="button" data-ai-education-refresh-job${latestJob.jobId ? "" : " disabled"}>${escapeHtml(
              pickUiText(input.language, "Refresh latest job", "\u5237\u65B0\u6700\u8FD1\u4EFB\u52A1"),
            )}</button>
            ${
              latestJob.classroomUrl
                ? `<a class="btn" href="${escapeHtml(latestJob.classroomUrl)}" target="_blank" rel="noreferrer" data-ai-education-open-classroom>${escapeHtml(
                    pickUiText(input.language, "Open classroom", "\u6253\u5F00\u8BFE\u5802"),
                  )}</a>`
                : ""
            }
          </div>
          <div class="meta geo-run-status" data-ai-education-job-message>${escapeHtml(jobStatusMessage)}</div>
        </form>
      </section>
      <section class="geo-layout geo-results-grid">
        <section class="card geo-secondary-card">
          <h3>${escapeHtml(pickUiText(input.language, "Health snapshot", "\u8FDE\u63A5\u5FEB\u7167"))}</h3>
          <div class="meta" data-ai-education-health-summary>${escapeHtml(
            health.message ||
              pickUiText(
                input.language,
                "No health check has been recorded yet.",
                "\u8FD8\u6CA1\u6709\u8BB0\u5F55\u4EFB\u4F55 health check \u7ED3\u679C\u3002",
              ),
          )}</div>
          <div class="geo-status-strip">
            <div class="status-chip">
              <span>${escapeHtml(pickUiText(input.language, "Status", "\u72B6\u6001"))}</span>
              <strong data-ai-education-health-chip>${escapeHtml(healthStatusLabel)}</strong>
            </div>
            <div class="status-chip">
              <span>${escapeHtml(pickUiText(input.language, "Checked", "\u68C0\u67E5\u65F6\u95F4"))}</span>
              <strong data-ai-education-health-checked>${escapeHtml(health.checkedAt || "-")}</strong>
            </div>
            <div class="status-chip">
              <span>${escapeHtml(pickUiText(input.language, "Version", "\u7248\u672C"))}</span>
              <strong data-ai-education-health-version>${escapeHtml(health.version || "-")}</strong>
            </div>
          </div>
          <div data-ai-education-capabilities>
            ${renderEducationCapabilityBadges(health.capabilities || {}, input.language)}
          </div>
        </section>
        <section class="card geo-secondary-card">
          <h3>${escapeHtml(pickUiText(input.language, "Latest job", "\u6700\u8FD1\u4EFB\u52A1"))}</h3>
          <div class="meta" data-ai-education-job-summary>${escapeHtml(
            latestJob.step
              ? pickUiText(
                  input.language,
                  `Step: ${latestJob.step}`,
                  `\u5F53\u524D\u9636\u6BB5\uFF1A${latestJob.step}`,
                )
              : pickUiText(
                  input.language,
                  "Job progress will appear here after submission.",
                  "\u63D0\u4EA4\u4EFB\u52A1\u540E\uFF0C\u8FD9\u91CC\u4F1A\u51FA\u73B0\u8FDB\u5EA6\u4FE1\u606F\u3002",
                ),
          )}</div>
          <div class="geo-status-strip">
            <div class="status-chip">
              <span>${escapeHtml(pickUiText(input.language, "Status", "\u72B6\u6001"))}</span>
              <strong data-ai-education-job-chip>${escapeHtml(jobStatusLabel)}</strong>
            </div>
            <div class="status-chip">
              <span>${escapeHtml(pickUiText(input.language, "Job ID", "Job ID"))}</span>
              <strong data-ai-education-job-id>${escapeHtml(latestJob.jobId || "-")}</strong>
            </div>
            <div class="status-chip">
              <span>${escapeHtml(pickUiText(input.language, "Progress", "\u8FDB\u5EA6"))}</span>
              <strong data-ai-education-job-progress>${escapeHtml(
                typeof latestJob.progress === "number" ? `${latestJob.progress}%` : "-",
              )}</strong>
            </div>
          </div>
          <div class="meta" data-ai-education-job-error>${escapeHtml(latestJob.error || "")}</div>
          <div class="feature-card-actions" data-ai-education-job-links>
            ${
              latestJob.pollUrl
                ? `<a class="btn" href="${escapeHtml(latestJob.pollUrl)}" target="_blank" rel="noreferrer">${escapeHtml(
                    pickUiText(input.language, "Open poll URL", "\u6253\u5F00 poll URL"),
                  )}</a>`
                : ""
            }
            ${
              latestJob.classroomUrl
                ? `<a class="btn" href="${escapeHtml(latestJob.classroomUrl)}" target="_blank" rel="noreferrer">${escapeHtml(
                    pickUiText(input.language, "Open classroom", "\u6253\u5F00\u8BFE\u5802"),
                  )}</a>`
                : ""
            }
          </div>
        </section>
      </section>
    </div>
  `;
  }

  function renderFeaturesSection(input) {
    if (input.feature === "geo") {
      return renderGeoWorkbench(input);
    }
    if (input.feature === "education") {
      return renderEducationWorkbench(input);
    }
    return renderFeaturesHub(input);
  }

  return {
    buildFeaturesHref,
    normalizeDashboardFeature,
    renderFeaturesSection,
  };
}

module.exports = { createFeatureRenderers };
