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
    return value === "geo" ? "geo" : void 0;
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

  function renderFeaturesHub(input) {
    return `
    <section class="card" data-features-root data-language="${escapeHtml(input.language)}">
      <div class="overview-command-head">
        <div>
          <h2>${escapeHtml(pickUiText(input.language, "Function hub", "\u529F\u80FD\u4E2D\u5FC3"))}</h2>
          <div class="meta">${escapeHtml(
            pickUiText(
              input.language,
              "Open focused capability pages here. GEO is the first suite card and now defaults to a one-click full-suite flow.",
              "\u5728\u8FD9\u91CC\u6253\u5F00\u805A\u7126\u80FD\u529B\u9875\u3002GEO \u662F\u7B2C\u4E00\u5F20\u5957\u4EF6\u5361\u7247\uFF0C\u9ED8\u8BA4\u8D70\u4E00\u952E\u5B8C\u6574\u5957\u4EF6\u6D41\u7A0B\u3002",
            ),
          )}</div>
        </div>
      </div>
      <div class="feature-card-grid">
        ${renderGeoHubCard(input)}
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

  function renderFeaturesSection(input) {
    if (input.feature === "geo") {
      return renderGeoWorkbench(input);
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
