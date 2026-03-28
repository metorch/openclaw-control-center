// @ts-nocheck

function renderFeaturesScript(language = "zh") {
  return `<script>
(() => {
  const featuresRoot = document.querySelector('[data-features-root]');
  if (!(featuresRoot instanceof HTMLElement)) return;
  const geoRoot = document.querySelector('[data-geo-workbench-root]');
  const root = geoRoot instanceof HTMLElement ? geoRoot : featuresRoot;
  const lang = (root.dataset.language || '${language}').trim().toLowerCase() === 'en' ? 'en' : 'zh';
  const t = (en, zh) => (lang === 'en' ? en : zh);
  const escapeHtml = (value) =>
    String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const toObj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
  const toArr = (value) => (Array.isArray(value) ? value : []);
  const toText = (value, fallback = '') => {
    const text = String(value == null ? '' : value).trim();
    return text || fallback;
  };
  const modules = [
    ['overview', t('Audit overview', '\\u5BA1\\u8BA1\\u603B\\u89C8')],
    ['platforms', t('Platforms', '\\u5E73\\u53F0\\u4F18\\u5316')],
    ['citability', t('Citability', '\\u53EF\\u5F15\\u8FF0\\u6027')],
    ['crawlers', t('Crawler access', '\\u722C\\u866B\\u8BBF\\u95EE')],
    ['llms', 'llms.txt'],
    ['brand', t('Brand authority', '\\u54C1\\u724C\\u4FE1\\u53F7')],
    ['technical', t('Technical', '\\u6280\\u672F\\u57FA\\u7840')],
    ['schema', t('Schema', '\\u7ED3\\u6784\\u5316\\u6570\\u636E')],
    ['content', t('Content', '\\u5185\\u5BB9\\u5206\\u6790')],
    ['report', t('Report', '\\u62A5\\u544A\\u4EA4\\u4ED8')],
  ];
  const l = {
    idle: t('Not started', '\\u672A\\u542F\\u52A8'),
    running: t('Running', '\\u8FD0\\u884C\\u4E2D'),
    completed: t('Completed', '\\u5DF2\\u5B8C\\u6210'),
    completedWithWarnings: t('Completed with warnings', '\\u5DF2\\u5B8C\\u6210\\uFF0C\\u4F46\\u6709\\u544A\\u8B66'),
    failed: t('Failed', '\\u5931\\u8D25'),
    ready: t('Ready to run the full GEO suite.', '\\u53EF\\u4EE5\\u76F4\\u63A5\\u8FD0\\u884C\\u5B8C\\u6574 GEO \\u5957\\u4EF6\\u3002'),
    loading: t('Loading GEO state...', '\\u6B63\\u5728\\u8BFB\\u53D6 GEO \\u72B6\\u6001...'),
    starting: t('Starting GEO suite...', '\\u6B63\\u5728\\u542F\\u52A8 GEO \\u5957\\u4EF6...'),
    startFailed: t('Failed to start GEO suite', '\\u542F\\u52A8 GEO \\u5957\\u4EF6\\u5931\\u8D25'),
    loadFailed: t('Failed to load GEO state', '\\u52A0\\u8F7D GEO \\u72B6\\u6001\\u5931\\u8D25'),
    suiteLoading: t('Loading GEO suite data...', '\\u6B63\\u5728\\u52A0\\u8F7D GEO \\u5957\\u4EF6\\u6570\\u636E...'),
    suiteMissing: t('No standalone-audit.json is available yet. Start a run first.', '\\u8FD8\\u6CA1\\u6709 standalone-audit.json\\uFF0C\\u8BF7\\u5148\\u542F\\u52A8\\u4E00\\u6B21\\u8FD0\\u884C\\u3002'),
    previewing: t('Loading artifact preview...', '\\u6B63\\u5728\\u52A0\\u8F7D\\u4EA7\\u7269\\u9884\\u89C8...'),
    previewFailed: t('Artifact preview failed', '\\u4EA7\\u7269\\u9884\\u89C8\\u5931\\u8D25'),
    previewHint: t('Choose a previewable artifact from the left to inspect it here.', '\\u5728\\u5DE6\\u4FA7\\u9009\\u62E9\\u4E00\\u4E2A\\u53EF\\u9884\\u89C8\\u7684\\u4EA7\\u7269\\uFF0C\\u5185\\u5BB9\\u4F1A\\u663E\\u793A\\u5728\\u8FD9\\u91CC\\u3002'),
    previewMeta: t('Preview GEO-AUDIT-REPORT.md, llms.txt, llms-full.txt, or standalone-audit.json here.', '\\u53EF\\u4EE5\\u5728\\u8FD9\\u91CC\\u9884\\u89C8 GEO-AUDIT-REPORT.md\\u3001llms.txt\\u3001llms-full.txt \\u6216 standalone-audit.json\\u3002'),
    preview: t('Preview', '\\u9884\\u89C8'),
    open: t('Open', '\\u6253\\u5F00'),
    download: t('Download', '\\u4E0B\\u8F7D'),
    noArtifacts: t('No GEO deliverables are available yet. Start a run to populate this panel.', '\\u6682\\u65E0 GEO \\u4EA7\\u7269\\u3002\\u542F\\u52A8\\u4E00\\u6B21\\u5BA1\\u8BA1\\u540E\\uFF0C\\u8FD9\\u91CC\\u4F1A\\u51FA\\u73B0\\u7ED3\\u679C\\u3002'),
    noStdout: t('No stdout has been captured yet.', '\\u6682\\u65E0 stdout \\u8F93\\u51FA\\u3002'),
    noStderr: t('No stderr has been captured yet.', '\\u6682\\u65E0 stderr \\u8F93\\u51FA\\u3002'),
    notAvailable: t('Not available', '\\u6682\\u65E0'),
    writeLocked: t('Write access is off. Turn on the top toolbar unlock before mutating this feature.', '\\u5199\\u5165\\u89E3\\u9501\\u5DF2\\u5173\\u95ED\\uFF0C\\u8BF7\\u5148\\u6253\\u5F00\\u5199\\u5165\\u89E3\\u9501\\u3002'),
    blocked: t('This machine has not set a safety passcode yet, so feature mutations are blocked.', '\\u8FD9\\u53F0\\u673A\\u5668\\u8FD8\\u6CA1\\u6709\\u8BBE\\u7F6E\\u5B89\\u5168\\u53E3\\u4EE4\\uFF0C\\u6240\\u4EE5\\u6682\\u65F6\\u4E0D\\u80FD\\u53D8\\u66F4\\u6388\\u6743\\u3002'),
    takeoverEnabled: t('AI takeover enabled', '\\u5DF2\\u542F\\u7528 AI \\u63A5\\u7BA1'),
    takeoverDisabled: t('Operator only', '\\u4EC5\\u9650\\u4EBA\\u5DE5'),
    takeoverEnableBusy: t('Enabling AI takeover...', '\\u6B63\\u5728\\u542F\\u7528 AI \\u63A5\\u7BA1...'),
    takeoverDisableBusy: t('Disabling AI takeover...', '\\u6B63\\u5728\\u5173\\u95ED AI \\u63A5\\u7BA1...'),
    takeoverFailed: t('Failed to update AI takeover permission', '\\u66F4\\u65B0 AI \\u63A5\\u7BA1\\u6388\\u6743\\u5931\\u8D25'),
    moduleTitle: t('Module operations', '\\u6A21\\u5757\\u64CD\\u4F5C'),
    moduleAuditOnly: t('This module currently depends on the full standalone audit above.', '\\u8FD9\\u4E2A\\u6A21\\u5757\\u5F53\\u524D\\u4F9D\\u8D56\\u4E0A\\u65B9\\u7684\\u5B8C\\u6574 standalone audit\\u3002'),
    moduleLoading: t('Loading module state...', '\\u6B63\\u5728\\u52A0\\u8F7D\\u6A21\\u5757\\u72B6\\u6001...'),
    moduleLoadFailed: t('Failed to load module state', '\\u52A0\\u8F7D\\u6A21\\u5757\\u72B6\\u6001\\u5931\\u8D25'),
    moduleRunFailed: t('Failed to start module run', '\\u542F\\u52A8\\u6A21\\u5757\\u8FD0\\u884C\\u5931\\u8D25'),
    modulePreviewing: t('Loading module artifact preview...', '\\u6B63\\u5728\\u52A0\\u8F7D\\u6A21\\u5757\\u4EA7\\u7269\\u9884\\u89C8...'),
    modulePreviewFailed: t('Module artifact preview failed', '\\u6A21\\u5757\\u4EA7\\u7269\\u9884\\u89C8\\u5931\\u8D25'),
    modulePreviewHint: t('Run this module and preview its latest controlled output here.', '\\u8FD0\\u884C\\u8FD9\\u4E2A\\u6A21\\u5757\\u540E\\uFF0C\u53EF\u4EE5\u5728\u8FD9\u91CC\u9884\u89C8\u5B83\u7684\u6700\u65B0\u53D7\u63A7\u8F93\u51FA\u3002'),
    moduleNoArtifacts: t('No controlled module artifacts are available yet.', '\\u6682\u65E0\u53EF\u7528\u7684\u53D7\u63A7\u6A21\u5757\u4EA7\u7269\u3002'),
    moduleNoStdout: t('No module stdout has been captured yet.', '\\u6682\u65E0\u6A21\u5757 stdout \u8F93\u51FA\u3002'),
    moduleNoStderr: t('No module stderr has been captured yet.', '\\u6682\u65E0\u6A21\u5757 stderr \u8F93\u51FA\u3002'),
    modulePreview: t('Preview result', '\\u9884\u89C8\u7ED3\u679C'),
    moduleQuickStart: t('Direct GEO runners are available below even when the current tab is summary-only.', '\\u5373\u4F7F\u5F53\u524D\u6807\u7B7E\u53EA\u662F\u603B\u89C8\uFF0C\u4E0B\u65B9\u4ECD\u7136\u53EF\u4EE5\u76F4\u63A5\u542F\u52A8\u5176\u4ED6 GEO \u6A21\u5757 runner\u3002'),
    runCitability: t('Run citability analysis', '\\u8FD0\u884C\u53EF\u5F15\u8FF0\u6027\u5206\u6790'),
    runCrawlerCheck: t('Check crawler access', '\\u68C0\u67E5\u722C\u866B\u8BBF\u95EE'),
    validateLlms: t('Validate llms.txt', '\\u6821\u9A8C llms.txt'),
    generateLlms: t('Generate llms drafts', '\\u751F\u6210 llms \u8349\u7A3F'),
    runBrandScan: t('Run brand scan', '\\u8FD0\u884C\u54C1\u724C\u626B\u63CF'),
    runTechnicalFetch: t('Fetch technical page data', '\\u6293\u53D6\u6280\u672F\u9875\u9762\u6570\u636E'),
    runSchemaExtract: t('Extract structured data', '\\u63D0\u53D6\u7ED3\u6784\u5316\u6570\u636E'),
    runContentExtract: t('Extract content blocks', '\\u63D0\u53D6\u5185\u5BB9\u5757'),
    runPdfReport: t('Generate PDF report', '\\u751F\u6210 PDF \u62A5\u544A'),
  };

  let busy = false;
  let takeoverBusy = false;
  let activePreviewArtifact = '';
  let pollTimer = 0;
  let modulePollTimer = 0;
  let featureControlState = null;
  let geoSummary = null;
  let activeSuiteModule = 'citability';
  let moduleStates = Object.create(null);
  let modulePreviewState = Object.create(null);
  let moduleBusyState = Object.create(null);

  const form = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-run-form]') : null;
  const runButton = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-run-button]') : null;
  const statusNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-run-status]') : null;
  const statusBadge = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-status-badge]') : null;
  const startedAtNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-state-started-at]') : null;
  const finishedAtNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-state-finished-at]') : null;
  const exitCodeNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-state-exit-code]') : null;
  const stateStatusNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-state-status]') : null;
  const stdoutNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-stdout]') : null;
  const stderrNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-stderr]') : null;
  const artifactListNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-artifact-list]') : null;
  const previewMetaNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-preview-meta]') : null;
  const previewContentNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-preview-content]') : null;
  const warningsNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-warnings]') : null;
  const warningsDetailsNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-warnings-details]') : null;
  const warningsSummaryNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-warnings-summary]') : null;
  const warningsLeadNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-warnings-lead]') : null;
  const suiteDetailNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-suite-detail]') : null;
  const suiteActionsNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-suite-actions]') : null;
  const summarySeedNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-summary-seed]') : null;
  const advancedToolsNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-advanced-tools]') : null;
  const debugNode = geoRoot instanceof HTMLElement ? geoRoot.querySelector('[data-geo-debug-details]') : null;
  const mutationState = () => (typeof window.__openclawGetMutationAuthState === 'function' ? window.__openclawGetMutationAuthState() : { gateRequired: false, tokenConfigured: true, canMutate: true });
  const mutationHeaders = (headers = {}) => (typeof window.__openclawGetMutationAuthHeaders === 'function' ? window.__openclawGetMutationAuthHeaders(headers) : headers);
  const lockMessage = () => {
    const state = mutationState();
    if (!state.gateRequired) return '';
    if (!state.tokenConfigured) return l.blocked;
    if (!state.canMutate) return l.writeLocked;
    return '';
  };
  const takeoverNote = (enabled) => enabled
    ? t(
        "OpenClaw AI may use this feature's controlled APIs and take over supported flows, but it still cannot scan unrelated history or repositories.",
        "OpenClaw AI \\u53EF\\u4EE5\\u63A5\\u7BA1\\u8FD9\\u4E2A\\u529F\\u80FD\\u7684\\u53D7\\u63A7 API \\u548C\\u540E\\u7EED\\u652F\\u6301\\u7684\\u6D41\\u7A0B\\uFF0C\\u4F46\\u4ECD\\u4E0D\\u80FD\\u626B\\u63CF\\u65E0\\u5173\\u5386\\u53F2\\u6216\\u4ED3\\u5E93\\u3002",
      )
    : t(
        "The feature remains operator-run only until you explicitly authorize AI takeover here.",
        "\\u5728\\u4F60\\u660E\\u786E\\u5728\\u8FD9\\u91CC\\u6388\\u6743\\u4E4B\\u524D\\uFF0C\\u8FD9\\u4E2A\\u529F\\u80FD\\u4ECD\\u7136\\u53EA\\u80FD\\u7531\\u4EBA\\u5DE5\\u64CD\\u4F5C\\u3002",
      );
  const setStatus = (message) => { if (statusNode instanceof HTMLElement) statusNode.textContent = message; };
  const advancedToolsOpen = () => advancedToolsNode instanceof HTMLDetailsElement && advancedToolsNode.open;
  const markPendingSuiteRefresh = () => {
    try { window.sessionStorage.setItem('openclaw:geo-suite:pending-refresh', '1'); } catch {}
  };
  const clearPendingSuiteRefresh = () => {
    try { window.sessionStorage.removeItem('openclaw:geo-suite:pending-refresh'); } catch {}
  };
  const hasPendingSuiteRefresh = () => {
    try { return window.sessionStorage.getItem('openclaw:geo-suite:pending-refresh') === '1'; } catch { return false; }
  };
  const featureButtons = (key) => Array.from(document.querySelectorAll('[data-feature-toggle="' + key + '"]')).filter((node) => node instanceof HTMLButtonElement);
  const featureLabels = (key) => Array.from(document.querySelectorAll('[data-feature-toggle-label="' + key + '"]')).filter((node) => node instanceof HTMLElement);
  const featureNotes = (key) => Array.from(document.querySelectorAll('[data-feature-toggle-note="' + key + '"]')).filter((node) => node instanceof HTMLElement);
  const suiteButtons = () => Array.from(document.querySelectorAll('[data-geo-suite-toggle]')).filter((node) => node instanceof HTMLButtonElement);
  const suiteCards = () => Array.from(document.querySelectorAll('[data-geo-suite-card]')).filter((node) => node instanceof HTMLButtonElement);
  const badgeHtml = (tone, text) => '<span class="badge ' + escapeHtml(tone) + '">' + escapeHtml(text) + '</span>';
  const emptyHtml = (message) => '<div class="empty-state geo-suite-empty">' + escapeHtml(message) + '</div>';
  const factGrid = (items) => {
    const html = toArr(items).filter((item) => item && item.label).map((item) => '<article class="geo-suite-fact"><span>' + escapeHtml(item.label) + '</span><strong>' + escapeHtml(item.value) + '</strong></article>').join('');
    return html ? '<div class="geo-suite-fact-grid">' + html + '</div>' : '';
  };
  const listHtml = (items) => {
    const html = toArr(items).map((item) => '<li>' + escapeHtml(toText(item, l.notAvailable)) + '</li>').join('');
    return html ? '<ul class="story-list">' + html + '</ul>' : emptyHtml(l.notAvailable);
  };
  const findingsHtml = (items) => {
    const html = toArr(items).map((item) => {
      const finding = toObj(item);
      const severity = toText(finding.severity, 'info').toLowerCase();
      const tone = severity === 'critical' ? 'blocked' : severity === 'high' ? 'warn' : severity === 'medium' ? 'enabled' : 'done';
      return '<li><div class="geo-suite-story-head">' + badgeHtml(tone, severity.toUpperCase()) + '<strong>' + escapeHtml(toText(finding.title, l.notAvailable)) + '</strong></div><div class="meta">' + escapeHtml(toText(finding.description, l.notAvailable)) + '</div></li>';
    }).join('');
    return html ? '<ul class="story-list geo-suite-story-list">' + html + '</ul>' : emptyHtml(l.notAvailable);
  };
  const tableHtml = (headers, rows) => {
    const head = toArr(headers).map((item) => '<th>' + escapeHtml(item) + '</th>').join('');
    const body = toArr(rows).join('');
    return body ? '<div class="geo-suite-table-shell"><table class="geo-suite-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' : emptyHtml(l.notAvailable);
  };
  const panelHtml = (title, intro, body) => '<section class="geo-suite-panel"><div class="overview-command-head"><div><h3>' + escapeHtml(title) + '</h3><div class="meta">' + escapeHtml(intro) + '</div></div>' + (geoSummary?.artifactName ? '<div class="meta">' + escapeHtml(t('Source', '\\u6570\\u636E\\u6E90') + ': ' + geoSummary.artifactName) + '</div>' : '') + '</div>' + body + '</section>';
  const normalizeStatus = (value) => {
    const normalized = String(value || '').trim();
    if (normalized === 'running') return 'running';
    if (normalized === 'completed') return 'completed';
    if (normalized === 'completed_with_warnings') return 'completed_with_warnings';
    if (normalized === 'failed') return 'failed';
    return 'idle';
  };
  const statusLabel = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'running') return l.running;
    if (normalized === 'completed') return l.completed;
    if (normalized === 'completed_with_warnings') return l.completedWithWarnings;
    if (normalized === 'failed') return l.failed;
    return l.idle;
  };
  const statusTone = (value) => {
    const normalized = normalizeStatus(value);
    if (normalized === 'running' || normalized === 'completed_with_warnings') return 'warn';
    if (normalized === 'completed') return 'done';
    if (normalized === 'failed') return 'blocked';
    return 'enabled';
  };
  const formatExitCode = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return l.notAvailable;
    if (value === 0) return t('0 (success)', '0\\uFF08\\u6210\\u529F\\uFF09');
    if (value === 2) return t('2 (warnings)', '2\\uFF08\\u544A\\u8B66\\uFF09');
    return String(value);
  };
  const moduleActionDefinitions = {
    citability: [{ action: 'run', label: l.runCitability }],
    crawlers: [{ action: 'run', label: l.runCrawlerCheck }],
    llms: [
      { action: 'validate', label: l.validateLlms },
      { action: 'generate', label: l.generateLlms },
    ],
    brand: [{ action: 'run', label: l.runBrandScan }],
    technical: [{ action: 'run', label: l.runTechnicalFetch }],
    schema: [{ action: 'run', label: l.runSchemaExtract }],
    content: [{ action: 'run', label: l.runContentExtract }],
    report: [{ action: 'generate_pdf', label: l.runPdfReport }],
  };
  const moduleSupportsDirectRun = (key) => Object.prototype.hasOwnProperty.call(moduleActionDefinitions, key);
  const moduleActionList = (key) => moduleSupportsDirectRun(key) ? moduleActionDefinitions[key] : [];
  const moduleStateFor = (key) => toObj(moduleStates[key]);
  const modulePreviewFor = (key) => toObj(modulePreviewState[key]);
  const moduleBusyFor = (key) => moduleBusyState[key] === true;
  const moduleHref = (key, artifact, download) => '/api/features/geo/module/artifact?module=' + encodeURIComponent(key) + '&artifact=' + encodeURIComponent(artifact) + (download ? '&download=1' : '');
  const moduleTitleFor = (key) => toText(modules.find((item) => item[0] === key)?.[1], key);
  const currentFormPayload = () => {
    const formData = form instanceof HTMLFormElement ? new FormData(form) : null;
    const url = formData ? toText(formData.get('url')) : '';
    const brandName = formData ? toText(formData.get('brandName')) : '';
    const domain = (() => {
      try { return url ? new URL(url).hostname : ''; } catch { return ''; }
    })();
    return { url, brandName, domain };
  };
  const moduleRunPayload = (key, action) => {
    const payload = currentFormPayload();
    return {
      module: key,
      action,
      url: payload.url || undefined,
      brandName: payload.brandName || undefined,
      domain: payload.domain || undefined,
    };
  };
  const renderModuleArtifactsHtml = (key, state) => {
    const available = toArr(state.artifacts).filter((artifact) => artifact && artifact.exists);
    if (available.length === 0) {
      return emptyHtml(l.moduleNoArtifacts);
    }
    return '<div class="geo-module-artifact-list">' + available.map((artifact) => {
      const previewButton = artifact.previewable ? '<button class="btn" type="button" data-geo-module-preview-artifact="' + escapeHtml(artifact.name) + '" data-geo-module-preview-module="' + escapeHtml(key) + '">' + escapeHtml(l.preview) + '</button>' : '';
      return '<article class="geo-suite-subcard"><div><strong>' + escapeHtml(artifact.name) + '</strong><div class="meta">' + escapeHtml(toText(artifact.relativePath || artifact.path, artifact.name)) + '</div></div><div class="feature-card-actions geo-suite-inline-actions">' + previewButton + '<a class="btn" href="' + escapeHtml(moduleHref(key, artifact.name, false)) + '" target="_blank" rel="noreferrer">' + escapeHtml(l.open) + '</a><a class="btn" href="' + escapeHtml(moduleHref(key, artifact.name, true)) + '">' + escapeHtml(l.download) + '</a></div></article>';
    }).join('') + '</div>';
  };
  const renderModuleActionPanel = () => {
    if (!(suiteActionsNode instanceof HTMLElement)) return;
    const moduleKey = activeSuiteModule;
    const title = toText(modules.find((item) => item[0] === moduleKey)?.[1], moduleKey);
    const state = moduleStateFor(moduleKey);
    const preview = modulePreviewFor(moduleKey);
    const hasRunState = Boolean(state.runId);
    const normalized = normalizeStatus(state.status);
    const badge = hasRunState && normalized !== 'idle' ? '<span class="badge ' + escapeHtml(statusTone(normalized)) + '">' + escapeHtml(statusLabel(normalized)) + '</span>' : '';
    const actionButtons = moduleActionList(moduleKey).map((item) => '<button class="btn" type="button" data-geo-module-run="' + escapeHtml(moduleKey) + '" data-geo-module-action="' + escapeHtml(item.action) + '"' + (moduleBusyFor(moduleKey) || Boolean(lockMessage()) ? ' disabled' : '') + '>' + escapeHtml(item.label) + '</button>').join('');
    const quickActionButtons = moduleSupportsDirectRun(moduleKey) ? '' : Object.entries(moduleActionDefinitions).flatMap(([key, actions]) => actions.map((item) => '<button class="btn" type="button" data-geo-module-run="' + escapeHtml(key) + '" data-geo-module-action="' + escapeHtml(item.action) + '"' + (moduleBusyFor(key) || Boolean(lockMessage()) ? ' disabled' : '') + '>' + escapeHtml(moduleTitleFor(key) + ' - ' + item.label) + '</button>')).join('');
    const infoCopy = moduleSupportsDirectRun(moduleKey)
      ? t('This module now has a direct controlled runner. It still stays inside the fixed GEO repo and runtime output boundary.', '\\u8FD9\\u4E2A\\u6A21\\u5757\u73B0\u5728\u5DF2\u6709\u76F4\u63A5\u7684\u53D7\u63A7 runner\u3002\u4F46\u5B83\u4ECD\u7136\u88AB\u9650\u5B9A\u5728\u56FA\u5B9A GEO \u4ED3\u5E93\u548C runtime \u8F93\u51FA\u8FB9\u754C\u5185\u3002')
      : l.moduleAuditOnly;
    const previewMeta = toText(preview.meta, l.modulePreviewHint);
    const previewContent = preview.loading ? l.modulePreviewing : toText(preview.content, l.modulePreviewHint);
    const actionArea = actionButtons
      ? '<div class="feature-card-actions geo-suite-inline-actions">' + actionButtons + '</div>'
      : quickActionButtons
        ? '<div class="meta">' + escapeHtml(l.moduleQuickStart) + '</div><div class="feature-card-actions geo-suite-inline-actions">' + quickActionButtons + '</div>'
        : '<div class="meta">' + escapeHtml(l.moduleAuditOnly) + '</div>';
    suiteActionsNode.innerHTML = '<div class="overview-command-head"><div><h3>' + escapeHtml(l.moduleTitle + ' - ' + title) + '</h3><div class="meta">' + escapeHtml(infoCopy) + '</div></div>' + badge + '</div>' + actionArea + '<div class="geo-module-status-grid">' + [
      { label: t('Status', '\\u72B6\\u6001'), value: hasRunState ? statusLabel(normalized) : l.idle },
      { label: t('Started', '\\u5F00\\u59CB'), value: toText(state.startedAt, '-') },
      { label: t('Finished', '\\u7ED3\\u675F'), value: toText(state.finishedAt, '-') },
      { label: t('Exit code', '\\u9000\\u51FA\\u7801'), value: formatExitCode(state.exitCode) },
    ].map((item) => '<article class="geo-suite-fact"><span>' + escapeHtml(item.label) + '</span><strong>' + escapeHtml(item.value) + '</strong></article>').join('') + '</div>' + '<div class="meta">' + escapeHtml(toText(state.message, moduleSupportsDirectRun(moduleKey) ? l.modulePreviewHint : l.moduleAuditOnly)) + '</div>' + renderModuleArtifactsHtml(moduleKey, state) + '<div class="geo-module-output-grid"><section class="geo-suite-subcard"><h4>' + escapeHtml(l.modulePreview) + '</h4><div class="meta">' + escapeHtml(previewMeta) + '</div><pre class="geo-preview-content" data-geo-module-preview-content>' + escapeHtml(previewContent) + '</pre></section><section class="geo-suite-subcard"><h4>stdout / stderr</h4><pre class="geo-log-output">' + escapeHtml(toText(state.stdoutTail, l.moduleNoStdout)) + '\\n\\n---\\n\\n' + escapeHtml(toText(state.stderrTail, l.moduleNoStderr)) + '</pre></section></div>' + (toArr(state.warnings).length ? '<section class="geo-suite-subcard"><h4>' + escapeHtml(t('Warnings', '\\u544A\\u8B66')) + '</h4>' + listHtml(state.warnings) + '</section>' : '');
  };
  const suiteMetricRenderers = {
    overview: (data) => typeof data.geo_score === 'number' ? 'GEO ' + String(data.geo_score) + '/100' : l.notAvailable,
    platforms: (data) => String(Object.keys(toObj(data.platforms)).length) + t(' scores', ' \\u4E2A\\u5206'),
    citability: (data) => String(data.content_findings?.homepage_citability?.average_citability_score ?? l.notAvailable),
    crawlers: (data) => String(Object.keys(toObj(data.crawler_access)).length) + t(' crawlers', ' \\u4E2A\\u722C\\u866B'),
    llms: (data) => toObj(data.raw?.llms_validation).exists ? 'llms.txt live' : t('drafts ready', '\\u8349\\u7A3F\\u5DF2\\u5C31\\u7EEA'),
    brand: (data) => String(toArr(data.brand_findings?.overall_recommendations).length) + t(' recs', ' \\u6761\\u5EFA\\u8BAE'),
    technical: (data) => 'HTTP ' + String(data.technical_findings?.homepage?.status_code || '-'),
    schema: (data) => String(data.schema_findings?.count || 0) + t(' types', ' \\u79CD'),
    content: (data) => String(data.content_findings?.pages_analyzed || 0) + t(' pages', ' \\u9875'),
    report: (data) => String(toArr(data.findings).length) + t(' findings', ' \\u6761 findings'),
  };
  const suiteMetric = (key) => {
    const data = geoSummary?.available ? toObj(geoSummary.data) : null;
    if (!data) return t('Run audit first', '\\u5148\\u8DD1\\u5BA1\\u8BA1');
    const renderMetric = suiteMetricRenderers[key] || suiteMetricRenderers.report;
    return renderMetric(data);
  };
  const updateSuiteCards = () => {
    suiteCards().forEach((card) => {
      const key = toText(card.dataset.geoSuiteCard);
      const metric = card.querySelector('.geo-suite-card-metric');
      if (metric instanceof HTMLElement) metric.textContent = suiteMetric(key);
    });
  };
  const suiteDetailRenderers = {
    overview: (data) => panelHtml(modules.find((item) => item[0] === 'overview')[1], t('Top-line GEO score, executive summary, and priority findings.', '\\u67E5 GEO \\u603B\\u5206\\u3001\\u6267\\u884C\\u6458\\u8981\u548C\u4F18\u5148\u53D1\u73B0\u3002'), factGrid([{ label: t('Brand', '\\u54C1\\u724C'), value: toText(data.brand_name, l.notAvailable) }, { label: 'URL', value: toText(data.url, l.notAvailable) }, { label: 'GEO', value: typeof data.geo_score === 'number' ? String(data.geo_score) + '/100' : l.notAvailable }, { label: t('Date', '\\u65E5\\u671F'), value: toText(data.date, l.notAvailable) }]) + '<div class="meta geo-suite-summary">' + escapeHtml(toText(data.executive_summary, l.notAvailable)) + '</div><div class="geo-suite-subgrid"><section class="geo-suite-subcard"><h4>' + escapeHtml(t('关键发现 / Findings', '\\u5173\\u952E\\u53D1\\u73B0 / Findings')) + '</h4>' + findingsHtml(data.findings) + '</section><section class="geo-suite-subcard"><h4>' + escapeHtml(t('快速改进 / Quick wins', '\\u5FEB\\u901F\\u6539\\u8FDB / Quick wins')) + '</h4>' + listHtml(data.quick_wins) + '</section></div>'),
    platforms: (data) => {
      const rows = Object.entries(toObj(data.platforms)).map(([name, score]) => '<tr><td>' + escapeHtml(name) + '</td><td>' + escapeHtml(String(score)) + '/100</td></tr>');
      return panelHtml(modules.find((item) => item[0] === 'platforms')[1], t('Platform-specific readiness from the latest audit.', '\\u67E5\\u770B\\u6700\\u65B0 audit \\u7684\\u5E73\\u53F0\\u7EA7\\u5C31\\u7EEA\\u5EA6\\u3002'), tableHtml([t('Platform', '\\u5E73\\u53F0'), t('Score', '\\u5206\\u6570')], rows));
    },
    citability: (data) => {
      const homepage = toObj(data.content_findings?.homepage_citability);
      const topRows = toArr(homepage.top_5_citable).map((item) => { const block = toObj(item); return '<tr><td>' + escapeHtml(toText(block.heading, l.notAvailable)) + '</td><td>' + escapeHtml(toText(block.total_score, l.notAvailable)) + '</td><td>' + escapeHtml(toText(block.grade, l.notAvailable)) + '</td></tr>'; });
      return panelHtml(modules.find((item) => item[0] === 'citability')[1], t('Homepage block-level citation readiness from the latest audit.', '\\u67E5\\u770B\\u9996\\u9875 block-level citability\\u3002'), factGrid([{ label: t('Average', '\\u5E73\\u5747'), value: toText(homepage.average_citability_score, l.notAvailable) }, { label: t('Blocks', '\\u5757'), value: toText(homepage.total_blocks_analyzed, l.notAvailable) }, { label: t('Optimal passages', '\\u6700\\u4F18\\u6BB5\\u843D'), value: toText(homepage.optimal_length_passages, l.notAvailable) }]) + tableHtml([t('Heading', '\\u6807\\u9898'), t('Score', '\\u5206\\u6570'), t('Grade', '\\u7B49\\u7EA7')], topRows));
    },
    crawlers: (data) => {
      const rows = Object.entries(toObj(data.crawler_access)).map(([crawler, info]) => { const item = toObj(info); return '<tr><td>' + escapeHtml(crawler) + '</td><td>' + escapeHtml(toText(item.platform, l.notAvailable)) + '</td><td>' + escapeHtml(toText(item.status, l.notAvailable)) + '</td><td>' + escapeHtml(toText(item.recommendation, l.notAvailable)) + '</td></tr>'; });
      return panelHtml(modules.find((item) => item[0] === 'crawlers')[1], t('Tier-1 AI crawler access and unblock recommendations.', '\\u67E5 Tier-1 AI \\u722C\\u866B\\u8BBF\\u95EE\\u72B6\\u6001\\u548C\\u89E3\\u9501\\u5EFA\\u8BAE\\u3002'), tableHtml([t('Crawler', '\\u722C\\u866B'), t('Platform', '\\u5E73\\u53F0'), t('Status', '\\u72B6\\u6001'), t('Recommendation', '\\u5EFA\\u8BAE')], rows));
    },
    llms: (data) => {
      const validation = toObj(data.raw?.llms_validation);
      return panelHtml(modules.find((item) => item[0] === 'llms')[1], t('Validation and generation state for llms deliverables.', '\\u67E5 llms deliverables \\u7684\\u6821\\u9A8C\\u548C\\u751F\\u6210\\u72B6\\u6001\\u3002'), factGrid([{ label: 'llms.txt', value: validation.exists ? t('Yes', '\\u662F') : t('No', '\\u5426') }, { label: t('Format valid', '\\u683C\\u5F0F\\u6709\\u6548'), value: validation.format_valid ? t('Yes', '\\u662F') : t('No', '\\u5426') }, { label: 'llms-full.txt', value: validation.full_version?.exists ? t('Yes', '\\u662F') : t('No', '\\u5426') }]) + '<div class="feature-card-actions geo-suite-inline-actions"><button class="btn" type="button" data-geo-preview-artifact="llms.txt">' + escapeHtml(l.preview + ' llms.txt') + '</button><button class="btn" type="button" data-geo-preview-artifact="llms-full.txt">' + escapeHtml(l.preview + ' llms-full.txt') + '</button></div><div class="geo-suite-subgrid"><section class="geo-suite-subcard"><h4>' + escapeHtml(t('问题 / Issues', '\\u95EE\\u9898 / Issues')) + '</h4>' + listHtml(validation.issues) + '</section><section class="geo-suite-subcard"><h4>' + escapeHtml(t('建议 / Suggestions', '\\u5EFA\\u8BAE / Suggestions')) + '</h4>' + listHtml(validation.suggestions) + '</section></div>');
    },
    brand: (data) => {
      const platforms = toObj(data.brand_findings?.platforms);
      const rows = [['Wikipedia', platforms.wikipedia?.has_wikipedia_page ? t('Yes', '\\u662F') : t('No', '\\u5426')], ['Wikidata', platforms.wikipedia?.has_wikidata_entry ? t('Yes', '\\u662F') : t('No', '\\u5426')], ['LinkedIn', platforms.linkedin?.has_company_page ? t('Yes', '\\u662F') : t('No', '\\u5426')], ['YouTube', platforms.youtube?.has_channel ? t('Yes', '\\u662F') : t('No', '\\u5426')]].map((row) => '<tr><td>' + escapeHtml(row[0]) + '</td><td>' + escapeHtml(row[1]) + '</td></tr>');
      return panelHtml(modules.find((item) => item[0] === 'brand')[1], t('Cross-platform entity and authority signals.', '\\u67E5\\u54C1\\u724C\\u5B9E\\u4F53\\u548C\\u6743\\u5A01\\u4FE1\\u53F7\\u3002'), tableHtml([t('Platform', '\\u5E73\\u53F0'), t('Presence', '\\u5B58\\u5728')], rows) + '<section class="geo-suite-subcard"><h4>' + escapeHtml(t('建议 / Recommendations', '\\u5EFA\\u8BAE / Recommendations')) + '</h4>' + listHtml(data.brand_findings?.overall_recommendations) + '</section>');
    },
    technical: (data) => {
      const homepage = toObj(data.technical_findings?.homepage);
      return panelHtml(modules.find((item) => item[0] === 'technical')[1], t('HTTP, SSR, canonical, security headers, and fetch warnings.', '\\u67E5 HTTP\\u3001SSR\\u3001canonical\\u3001security headers \\u548C\\u62C9\\u53D6\\u544A\\u8B66\\u3002'), factGrid([{ label: 'HTTP', value: toText(homepage.status_code, l.notAvailable) }, { label: 'SSR', value: homepage.has_ssr_content === false ? t('Needs work', '\\u5F85\\u6539\\u5584') : t('Ready', '\\u5C31\\u7EEA') }, { label: 'Canonical', value: homepage.canonical ? t('Yes', '\\u662F') : t('No', '\\u5426') }, { label: 'Sitemap', value: toText(data.technical_findings?.sitemap_page_count, l.notAvailable) }]) + '<section class="geo-suite-subcard"><h4>' + escapeHtml(t('Warnings', '\\u544A\\u8B66')) + '</h4>' + listHtml(homepage.errors) + '</section>');
    },
    schema: (data) => panelHtml(modules.find((item) => item[0] === 'schema')[1], t('Detected JSON-LD types from the audit artifact.', '\\u67E5 audit artifact \\u91CC\\u68C0\\u6D4B\\u5230\\u7684 JSON-LD \\u7C7B\\u578B\\u3002'), factGrid([{ label: t('Detected types', '\\u68C0\\u6D4B\\u5230\\u7684\\u7C7B\\u578B'), value: toText(data.schema_findings?.count, l.notAvailable) }]) + listHtml(data.schema_findings?.types)),
    content: (data) => {
      const rows = toArr(data.content_findings?.pages).map((item) => { const page = toObj(item); return '<tr><td>' + escapeHtml(toText(page.title, page.url || l.notAvailable)) + '</td><td>' + escapeHtml(toText(page.citability_score, l.notAvailable)) + '</td><td>' + escapeHtml(toText(page.word_count, l.notAvailable)) + '</td></tr>'; });
      return panelHtml(modules.find((item) => item[0] === 'content')[1], t('Priority pages and page-level citability from the latest audit.', '\\u67E5\\u9AD8\\u4EF7\\u503C\\u9875\\u9762\\u548C\\u9875\\u7EA7 citability\\u3002'), factGrid([{ label: t('Pages requested', '\\u8BF7\\u6C42\\u9875\\u9762'), value: toText(data.content_findings?.pages_requested, l.notAvailable) }, { label: t('Pages analyzed', '\\u5DF2\\u5206\\u6790\\u9875\\u9762'), value: toText(data.content_findings?.pages_analyzed, l.notAvailable) }]) + tableHtml([t('Page', '\\u9875\\u9762'), t('Citability', 'Citability'), t('Words', '\\u5B57\\u6570')], rows));
    },
    report: (data) => panelHtml(modules.find((item) => item[0] === 'report')[1], t('Final report outputs and action lists from the latest run.', '\\u67E5\\u6700\\u7EC8\\u62A5\\u544A\\u548C\\u52A8\\u4F5C\\u6E05\\u5355\\u3002'), '<div class="feature-card-actions geo-suite-inline-actions"><button class="btn" type="button" data-geo-preview-artifact="GEO-AUDIT-REPORT.md">' + escapeHtml(l.preview + ' GEO-AUDIT-REPORT.md') + '</button><a class="btn" href="/api/features/geo/artifact?artifact=GEO-REPORT.pdf" target="_blank" rel="noreferrer">' + escapeHtml(l.open + ' GEO-REPORT.pdf') + '</a></div><div class="geo-suite-subgrid"><section class="geo-suite-subcard"><h4>' + escapeHtml(t('关键发现 / Findings', '\\u5173\\u952E\\u53D1\\u73B0 / Findings')) + '</h4>' + findingsHtml(data.findings) + '</section><section class="geo-suite-subcard"><h4>' + escapeHtml(t('快速改进 / Quick wins', '\\u5FEB\\u901F\\u6539\\u8FDB / Quick wins')) + '</h4>' + listHtml(data.quick_wins) + '</section><section class="geo-suite-subcard"><h4>' + escapeHtml(t('中期改进 / Medium-term', '\\u4E2D\\u671F\\u6539\\u8FDB / Medium-term')) + '</h4>' + listHtml(data.medium_term) + '</section><section class="geo-suite-subcard"><h4>' + escapeHtml(t('战略动作 / Strategic', '\\u6218\\u7565\\u52A8\\u4F5C / Strategic')) + '</h4>' + listHtml(data.strategic) + '</section></div>'),
  };
  const renderSuiteDetail = () => {
    if (!(suiteDetailNode instanceof HTMLElement)) return;
    if (!geoSummary || geoSummary.available !== true || !geoSummary.data) {
      suiteDetailNode.innerHTML = emptyHtml(geoSummary?.error || l.suiteMissing);
      return;
    }
    const data = toObj(geoSummary.data);
    const renderDetail = suiteDetailRenderers[activeSuiteModule] || suiteDetailRenderers.overview;
    suiteDetailNode.innerHTML = renderDetail(data);
  };
  const applySuiteSelection = (key) => {
    activeSuiteModule = modules.some((item) => item[0] === key) ? key : 'citability';
    suiteButtons().forEach((button) => {
      const active = toText(button.dataset.geoSuiteToggle) === activeSuiteModule;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    suiteCards().forEach((card) => {
      const active = toText(card.dataset.geoSuiteCard) === activeSuiteModule;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    renderSuiteDetail();
    renderModuleActionPanel();
    if (!advancedToolsOpen() && modulePollTimer) {
      window.clearTimeout(modulePollTimer);
      modulePollTimer = 0;
    }
  };
  const applySummary = (summary) => {
    geoSummary = summary && typeof summary === 'object' ? summary : null;
    updateSuiteCards();
    renderSuiteDetail();
    renderModuleActionPanel();
  };
  const parseSummarySeed = () => {
    if (!(summarySeedNode instanceof HTMLElement)) return null;
    const raw = toText(summarySeedNode.textContent);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };
  const updateArtifactList = (artifacts) => {
    if (!(artifactListNode instanceof HTMLElement)) return;
    artifactListNode.innerHTML = '';
    const available = toArr(artifacts).filter((artifact) => artifact && artifact.exists);
    if (available.length === 0) {
      artifactListNode.innerHTML = emptyHtml(l.noArtifacts);
      return;
    }
    available.forEach((artifact) => {
      const row = document.createElement('article');
      row.className = 'geo-artifact-row';
      row.innerHTML = '<div class="geo-artifact-copy"><strong>' + escapeHtml(artifact.name) + '</strong><div class="meta">' + escapeHtml(artifact.relativePath || artifact.path || artifact.name) + '</div><div class="meta">' + escapeHtml((artifact.updatedAt ? t('Updated', '\\u66F4\\u65B0') + ' ' + artifact.updatedAt + ' \\xB7 ' : '') + String(artifact.sizeBytes || 0) + ' bytes') + '</div></div><div class="geo-artifact-actions">' + (artifact.previewable ? '<button class="btn" type="button" data-geo-preview-artifact="' + escapeHtml(artifact.name) + '">' + escapeHtml(l.preview) + '</button>' : '') + '<a class="btn" href="/api/features/geo/artifact?artifact=' + encodeURIComponent(artifact.name) + '" target="_blank" rel="noreferrer">' + escapeHtml(l.open) + '</a><a class="btn" href="/api/features/geo/artifact?artifact=' + encodeURIComponent(artifact.name) + '&download=1">' + escapeHtml(l.download) + '</a></div>';
      artifactListNode.appendChild(row);
    });
  };
  const renderWarnings = (warnings) => {
    if (!(warningsNode instanceof HTMLElement)) return;
    const items = toArr(warnings);
    if (warningsSummaryNode instanceof HTMLElement) {
      warningsSummaryNode.textContent = items.length > 0 ? String(items.length) + ' ' + t('warnings', '\\u6761\\u544A\\u8B66') : t('No warnings', '\\u65E0\\u544A\\u8B66');
    }
    if (warningsLeadNode instanceof HTMLElement) {
      warningsLeadNode.textContent = items.length > 0
        ? t('Warnings were detected during the latest full-suite run. Expand only when you need details.', '\\u6700\\u65B0\\u4E00\\u6B21\\u5B8C\\u6574 GEO \\u5957\\u4EF6\\u8FD0\\u884C\\u68C0\\u6D4B\\u5230\\u544A\\u8B66\\u3002\\u53EA\\u5728\\u9700\\u8981\\u65F6\\u518D\\u5C55\\u5F00\\u67E5\\u770B\\u8BE6\\u60C5\\u3002')
        : t('No runtime warnings were recorded for the latest run.', '\\u6700\\u65B0\\u4E00\\u6B21\\u8FD0\\u884C\\u6682\\u65E0\\u8BB0\\u5F55\\u5230\\u544A\\u8B66\\u3002');
    }
    if (items.length === 0) {
      warningsNode.innerHTML = '';
      if (warningsDetailsNode instanceof HTMLElement) warningsDetailsNode.hidden = true;
      return;
    }
    if (warningsDetailsNode instanceof HTMLElement) warningsDetailsNode.hidden = false;
    warningsNode.innerHTML = items.map((item) => '<li>' + escapeHtml(toText(item, l.notAvailable)) + '</li>').join('');
  };
  const previewArtifact = async (name) => {
    const artifactName = toText(name);
    if (!artifactName || !(geoRoot instanceof HTMLElement)) return;
    activePreviewArtifact = artifactName;
    if (debugNode instanceof HTMLDetailsElement) debugNode.open = true;
    if (previewMetaNode instanceof HTMLElement) previewMetaNode.textContent = artifactName;
    if (previewContentNode instanceof HTMLElement) previewContentNode.textContent = l.previewing;
    try {
      const response = await fetch('/api/features/geo/artifact?artifact=' + encodeURIComponent(artifactName));
      if (!response.ok) throw new Error(l.previewFailed);
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      const raw = await response.text();
      if (previewMetaNode instanceof HTMLElement) previewMetaNode.textContent = artifactName + (contentType ? ' \\xB7 ' + contentType : '');
      if (previewContentNode instanceof HTMLElement) {
        if (contentType.includes('application/json')) {
          try { previewContentNode.textContent = JSON.stringify(JSON.parse(raw), null, 2); }
          catch { previewContentNode.textContent = raw; }
        } else {
          previewContentNode.textContent = raw;
        }
      }
    } catch (error) {
      if (previewContentNode instanceof HTMLElement) previewContentNode.textContent = error instanceof Error ? error.message : l.previewFailed;
    }
  };
  const scheduleModulePoll = (delay) => {
    if (!advancedToolsOpen()) {
      if (modulePollTimer) window.clearTimeout(modulePollTimer);
      modulePollTimer = 0;
      return;
    }
    if (modulePollTimer) window.clearTimeout(modulePollTimer);
    modulePollTimer = window.setTimeout(() => {
      modulePollTimer = 0;
      if (moduleSupportsDirectRun(activeSuiteModule) && advancedToolsOpen()) {
        void fetchModuleState(activeSuiteModule, true);
      }
    }, delay);
  };
  const fetchModuleState = async (moduleKey, quiet = false) => {
    if (!(geoRoot instanceof HTMLElement) || !moduleSupportsDirectRun(moduleKey) || !advancedToolsOpen()) return null;
    if (!quiet) {
      modulePreviewState[moduleKey] = { meta: l.moduleLoading, content: l.moduleLoading, loading: true };
      renderModuleActionPanel();
    }
    try {
      const response = await fetch('/api/features/geo/module/state?module=' + encodeURIComponent(moduleKey));
      const payload = await response.json();
      if (!response.ok || !payload || payload.ok !== true) throw new Error(payload?.error?.message || l.moduleLoadFailed);
      moduleStates[moduleKey] = payload.state || {};
      const normalized = normalizeStatus(moduleStates[moduleKey]?.status);
      renderModuleActionPanel();
      scheduleModulePoll(normalized === 'running' ? 3000 : 15000);
      return payload.state || {};
    } catch (error) {
      moduleStates[moduleKey] = {
        module: moduleKey,
        status: 'failed',
        message: error instanceof Error ? error.message : l.moduleLoadFailed,
        warnings: [],
        artifacts: [],
        stdoutTail: '',
        stderrTail: '',
      };
      renderModuleActionPanel();
      return null;
    }
  };
  const startModuleRun = async (moduleKey, action) => {
    const message = lockMessage();
    if (message) { setStatus(message); return; }
    if (advancedToolsNode instanceof HTMLDetailsElement) advancedToolsNode.open = true;
    moduleBusyState[moduleKey] = true;
    renderModuleActionPanel();
    try {
      const response = await fetch('/api/features/geo/module/run', {
        method: 'POST',
        headers: mutationHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify(moduleRunPayload(moduleKey, action)),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.ok !== true) throw new Error(payload?.error?.message || l.moduleRunFailed);
      moduleStates[moduleKey] = payload.state || {};
      modulePreviewState[moduleKey] = { meta: l.modulePreviewHint, content: l.modulePreviewHint };
      renderModuleActionPanel();
      void fetchModuleState(moduleKey, true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : l.moduleRunFailed);
      moduleStates[moduleKey] = {
        module: moduleKey,
        status: 'failed',
        message: error instanceof Error ? error.message : l.moduleRunFailed,
        warnings: [],
        artifacts: [],
        stdoutTail: '',
        stderrTail: '',
      };
      renderModuleActionPanel();
    } finally {
      moduleBusyState[moduleKey] = false;
      renderModuleActionPanel();
    }
  };
  const previewModuleArtifact = async (moduleKey, artifactName) => {
    if (!moduleKey || !artifactName) return;
    if (advancedToolsNode instanceof HTMLDetailsElement) advancedToolsNode.open = true;
    modulePreviewState[moduleKey] = { meta: artifactName, content: l.modulePreviewing, loading: true };
    renderModuleActionPanel();
    try {
      const response = await fetch('/api/features/geo/module/artifact?module=' + encodeURIComponent(moduleKey) + '&artifact=' + encodeURIComponent(artifactName));
      if (!response.ok) throw new Error(l.modulePreviewFailed);
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      const raw = await response.text();
      let content = raw;
      if (contentType.includes('application/json')) {
        try { content = JSON.stringify(JSON.parse(raw), null, 2); } catch {}
      }
      modulePreviewState[moduleKey] = {
        meta: artifactName + (contentType ? ' \\xB7 ' + contentType : ''),
        content,
        loading: false,
      };
      renderModuleActionPanel();
    } catch (error) {
      modulePreviewState[moduleKey] = {
        meta: artifactName,
        content: error instanceof Error ? error.message : l.modulePreviewFailed,
        loading: false,
      };
      renderModuleActionPanel();
    }
  };
  const applySingleFeatureControl = (featureKey, enabled) => {
    featureButtons(featureKey).forEach((button) => {
      button.classList.toggle('is-on', enabled);
      button.setAttribute('aria-checked', enabled ? 'true' : 'false');
      button.dataset.nextValue = enabled ? 'false' : 'true';
      button.disabled = takeoverBusy || Boolean(lockMessage());
    });
    featureLabels(featureKey).forEach((label) => { label.textContent = enabled ? l.takeoverEnabled : l.takeoverDisabled; });
    featureNotes(featureKey).forEach((note) => { note.textContent = takeoverNote(enabled); });
  };
  const applyFeatureControl = (state) => {
    featureControlState = state || {};
    const features = toObj(state?.features);
    const keys = new Set(['geo', 'education', ...Object.keys(features)]);
    keys.forEach((featureKey) => {
      const enabled = features?.[featureKey]?.aiTakeoverEnabled === true;
      applySingleFeatureControl(featureKey, enabled);
    });
  };
  const fetchFeatureControl = async (quiet = false) => {
    try {
      const response = await fetch('/api/features/control');
      const payload = await response.json();
      if (!response.ok || !payload || payload.ok !== true) throw new Error(payload?.error?.message || l.takeoverFailed);
      applyFeatureControl(payload.state || {});
      return payload.state || {};
    } catch (error) {
      if (!quiet) setStatus(error instanceof Error ? error.message : l.takeoverFailed);
      return null;
    }
  };
  const fetchSummary = async (quiet = false) => {
    if (!(geoRoot instanceof HTMLElement)) return null;
    if (!quiet && suiteDetailNode instanceof HTMLElement) suiteDetailNode.innerHTML = emptyHtml(l.suiteLoading);
    try {
      const response = await fetch('/api/features/geo/summary');
      const payload = await response.json();
      if (!response.ok || !payload || payload.ok !== true) throw new Error(payload?.error?.message || l.loadFailed);
      applySummary(payload.summary || null);
      return payload.summary || null;
    } catch (error) {
      applySummary({ available: false, artifactName: 'standalone-audit.json', loadedAt: new Date().toISOString(), error: error instanceof Error ? error.message : l.loadFailed });
      return null;
    }
  };
  const fetchState = async (quiet = false) => {
    if (!(geoRoot instanceof HTMLElement)) return null;
    if (!quiet) setStatus(l.loading);
    try {
      const response = await fetch('/api/features/geo/state');
      const payload = await response.json();
      if (!response.ok || !payload || payload.ok !== true) throw new Error(payload?.error?.message || l.loadFailed);
      const state = payload.state || {};
      const modulesSnapshot = toObj(payload.modules);
      const normalized = normalizeStatus(state.status);
      if (statusBadge instanceof HTMLElement) { statusBadge.className = 'badge ' + statusTone(normalized); statusBadge.textContent = statusLabel(normalized); }
      if (stateStatusNode instanceof HTMLElement) stateStatusNode.textContent = statusLabel(normalized);
      if (startedAtNode instanceof HTMLElement) startedAtNode.textContent = toText(state.startedAt, '-');
      if (finishedAtNode instanceof HTMLElement) finishedAtNode.textContent = toText(state.finishedAt, '-');
      if (exitCodeNode instanceof HTMLElement) exitCodeNode.textContent = formatExitCode(state.exitCode);
      if (stdoutNode instanceof HTMLElement) stdoutNode.textContent = state.stdoutTail || l.noStdout;
      if (stderrNode instanceof HTMLElement) stderrNode.textContent = state.stderrTail || l.noStderr;
      updateArtifactList(state.artifacts);
      renderWarnings(state.warnings);
      applySummary(payload.summary || null);
      Object.keys(modulesSnapshot).forEach((moduleKey) => {
        moduleStates[moduleKey] = toObj(modulesSnapshot[moduleKey]);
      });
      setStatus(toText(state.message, l.ready));
      if (runButton instanceof HTMLButtonElement) runButton.disabled = busy || normalized === 'running' || Boolean(lockMessage());
      renderModuleActionPanel();
      if (pollTimer) window.clearTimeout(pollTimer);
      pollTimer = window.setTimeout(() => { pollTimer = 0; void fetchState(true); }, normalized === 'running' ? 3000 : 15000);
      if (hasPendingSuiteRefresh() && normalized !== 'running') {
        clearPendingSuiteRefresh();
      }
      return state;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : l.loadFailed);
      return null;
    }
  };
  const updateTakeover = async (featureKey, nextEnabled) => {
    if (!featureKey) return;
    const message = lockMessage();
    if (message) { setStatus(message); return; }
    takeoverBusy = true;
    setStatus(nextEnabled ? l.takeoverEnableBusy : l.takeoverDisableBusy);
    try {
      const response = await fetch('/api/features/control', { method: 'PATCH', headers: mutationHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ feature: featureKey, aiTakeoverEnabled: nextEnabled }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.ok !== true) throw new Error(payload?.error?.message || l.takeoverFailed);
      applyFeatureControl(payload.state || {});
    } catch (error) {
      if (featureControlState) applyFeatureControl(featureControlState);
      setStatus(error instanceof Error ? error.message : l.takeoverFailed);
    } finally {
      takeoverBusy = false;
      if (featureControlState) applyFeatureControl(featureControlState);
    }
  };
  if (form instanceof HTMLFormElement) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;
      const message = lockMessage();
      if (message) { setStatus(message); return; }
      const formData = new FormData(form);
      const url = toText(formData.get('url'));
      if (!url) { setStatus(t('URL is required.', 'URL \\u662F\\u5FC5\\u586B\\u9879\\u3002')); return; }
      busy = true;
      if (runButton instanceof HTMLButtonElement) runButton.disabled = true;
      setStatus(l.starting);
      try {
        const response = await fetch('/api/features/geo/run', { method: 'POST', headers: mutationHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ url, brandName: toText(formData.get('brandName')) || undefined, maxPages: Number.parseInt(toText(formData.get('maxPages'), '5'), 10), insecure: formData.get('insecure') === 'on', outputDir: toText(formData.get('outputDir')) || undefined }) });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.ok !== true) throw new Error(payload?.error?.message || l.startFailed);
        markPendingSuiteRefresh();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : l.startFailed);
      } finally {
        busy = false;
        void fetchState(true);
      }
    });
  }
  root.addEventListener('click', (event) => {
    const takeover = event.target instanceof HTMLElement ? event.target.closest('[data-feature-toggle]') : null;
    if (takeover instanceof HTMLButtonElement) { event.preventDefault(); void updateTakeover(toText(takeover.getAttribute('data-feature-toggle')), toText(takeover.dataset.nextValue) === 'true'); return; }
    const suite = event.target instanceof HTMLElement ? event.target.closest('[data-geo-suite-toggle]') : null;
    if (suite instanceof HTMLButtonElement) { event.preventDefault(); applySuiteSelection(toText(suite.dataset.geoSuiteToggle)); return; }
    const moduleRun = event.target instanceof HTMLElement ? event.target.closest('[data-geo-module-run]') : null;
    if (moduleRun instanceof HTMLButtonElement) {
      event.preventDefault();
      const moduleKey = toText(moduleRun.dataset.geoModuleRun);
      const action = toText(moduleRun.dataset.geoModuleAction, 'run');
      if (moduleKey && moduleKey !== activeSuiteModule) {
        applySuiteSelection(moduleKey);
      }
      void startModuleRun(moduleKey, action);
      return;
    }
    const modulePreview = event.target instanceof HTMLElement ? event.target.closest('[data-geo-module-preview-artifact]') : null;
    if (modulePreview instanceof HTMLElement) {
      const moduleKey = toText(modulePreview.getAttribute('data-geo-module-preview-module'));
      const artifact = toText(modulePreview.getAttribute('data-geo-module-preview-artifact'));
      if (moduleKey && artifact) {
        event.preventDefault();
        void previewModuleArtifact(moduleKey, artifact);
        return;
      }
    }
    const preview = event.target instanceof HTMLElement ? event.target.closest('[data-geo-preview-artifact]') : null;
    if (preview instanceof HTMLElement) { const artifact = preview.getAttribute('data-geo-preview-artifact') || ''; if (artifact) { event.preventDefault(); void previewArtifact(artifact); } }
  });
  if (advancedToolsNode instanceof HTMLDetailsElement) {
    advancedToolsNode.addEventListener('toggle', () => {
      if (!advancedToolsNode.open) {
        if (modulePollTimer) window.clearTimeout(modulePollTimer);
        modulePollTimer = 0;
        return;
      }
      renderModuleActionPanel();
    });
  }
  applySummary(parseSummarySeed());
  applySuiteSelection(activeSuiteModule);
  renderModuleActionPanel();
  void fetchFeatureControl(true);
  if (geoRoot instanceof HTMLElement) void fetchState();
})();
(() => {
  const educationRoot = document.querySelector('[data-ai-education-root]');
  if (!(educationRoot instanceof HTMLElement)) return;
  const lang = (educationRoot.dataset.language || '${language}').trim().toLowerCase() === 'en' ? 'en' : 'zh';
  const t = (en, zh) => (lang === 'en' ? en : zh);
  const escapeHtml = (value) =>
    String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const toObj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
  const toText = (value, fallback = '') => {
    const text = String(value == null ? '' : value).trim();
    return text || fallback;
  };
  const hostedBaseUrl = 'https://open.maic.chat';
  const l = {
    saving: t('Saving AI Education config...', '\\u6B63\\u5728\\u4FDD\\u5B58 AI\\u6559\\u80B2\\u914D\\u7F6E...'),
    saved: t('AI Education config saved.', 'AI\\u6559\\u80B2\\u914D\\u7F6E\\u5DF2\\u4FDD\\u5B58\\u3002'),
    saveFailed: t('Failed to save AI Education config', '\\u4FDD\\u5B58 AI\\u6559\\u80B2\\u914D\\u7F6E\\u5931\\u8D25'),
    checking: t('Checking OpenMAIC health...', '\\u6B63\\u5728\\u68C0\\u67E5 OpenMAIC health...'),
    healthReady: t('OpenMAIC health check completed.', 'OpenMAIC health check \\u5DF2\\u5B8C\\u6210\\u3002'),
    healthFailed: t('OpenMAIC health check failed', 'OpenMAIC health check \\u5931\\u8D25'),
    loading: t('Loading AI Education state...', '\\u6B63\\u5728\\u52A0\\u8F7D AI\\u6559\\u80B2\\u72B6\\u6001...'),
    loadFailed: t('Failed to load AI Education state', '\\u52A0\\u8F7D AI\\u6559\\u80B2\\u72B6\\u6001\\u5931\\u8D25'),
    embedReady: t('Embedded workspace ready', '\\u5185\\u5D4C\\u5DE5\\u4F5C\\u533A\\u5DF2\\u5C31\\u7EEA'),
    embedAttention: t('Attention required', '\\u9700\\u8981\\u5904\\u7406'),
    reloadEmbed: t('Reloading embedded workspace...', '\\u6B63\\u5728\\u91CD\\u65B0\\u52A0\\u8F7D\\u5185\\u5D4C\\u5DE5\\u4F5C\\u533A...'),
    embedTimeout: t('OpenMAIC did not finish loading in embedded mode. It may be offline or refusing iframe embedding.', 'OpenMAIC \\u6CA1\\u6709\\u5728\\u5185\\u5D4C\\u6A21\\u5F0F\\u4E0B\\u5B8C\\u6210\\u52A0\\u8F7D\\uFF0C\\u53EF\\u80FD\\u79BB\\u7EBF\\u6216\\u62D2\\u7EDD iframe \\u5D4C\\u5165\\u3002'),
    embedBlocked: t('Embedded workspace unavailable', '\\u5185\\u5D4C\\u5DE5\\u4F5C\\u533A\\u6682\\u4E0D\\u53EF\\u7528'),
    useHostedNow: t('Use hosted now', '\\u7ACB\\u5373\\u5207\\u6362 hosted'),
    switchingHosted: t('Switching to hosted OpenMAIC...', '\\u6B63\\u5728\\u5207\\u6362\\u5230 hosted OpenMAIC...'),
    hostedReady: t('Hosted OpenMAIC is ready. Reloading workspace...', 'Hosted OpenMAIC \\u5DF2\\u5C31\\u7EEA\\uFF0C\\u6B63\\u5728\\u91CD\\u65B0\\u52A0\\u8F7D\\u5DE5\\u4F5C\\u533A...'),
    openHostedDirectly: t('Open hosted directly', '\\u76F4\\u63A5\\u6253\\u5F00 hosted'),
    embedBlank: t('The embedded page did not navigate away from about:blank. It may be blocked by iframe policy.', '\\u5185\\u5D4C\\u9875\\u9762\\u6CA1\\u6709\\u79BB\\u5F00 about:blank\\uFF0C\\u53EF\\u80FD\u88AB iframe \\u7B56\\u7565\u963B\\u6B62\\u3002'),
    fullscreenWorkspace: t('Fullscreen workspace', '\\u5DE5\\u4F5C\\u533A\\u5168\\u5C4F'),
    exitFullscreen: t('Exit fullscreen', '\\u9000\\u51FA\\u5168\\u5C4F'),
    windowed: t('Windowed', '\\u7A97\\u53E3\\u6A21\\u5F0F'),
    fullscreenActive: t('Fullscreen active', '\\u5168\\u5C4F\\u4E2D'),
    fullscreenUnavailable: t('Fullscreen unavailable here.', '\\u5F53\\u524D\\u73AF\\u5883\\u4E0D\\u652F\\u6301\\u5168\\u5C4F\\u3002'),
    fullscreenFailed: t('Failed to enter fullscreen workspace.', '\\u65E0\\u6CD5\\u8FDB\\u5165\\u5DE5\\u4F5C\\u533A\\u5168\\u5C4F\\u3002'),
    submitting: t('Submitting classroom generation job...', '\\u6B63\\u5728\\u63D0\\u4EA4\\u8BFE\\u5802\\u751F\\u6210\\u4EFB\\u52A1...'),
    submitFailed: t('Failed to submit classroom generation job', '\\u63D0\\u4EA4\\u8BFE\\u5802\\u751F\\u6210\\u4EFB\\u52A1\\u5931\\u8D25'),
    refreshing: t('Refreshing latest classroom job...', '\\u6B63\\u5728\\u5237\\u65B0\\u6700\\u8FD1\\u8BFE\\u5802\\u4EFB\\u52A1...'),
    refreshFailed: t('Failed to refresh latest classroom job', '\\u5237\\u65B0\\u6700\\u8FD1\\u8BFE\\u5802\\u4EFB\\u52A1\\u5931\\u8D25'),
    requirementMissing: t('Requirement is required.', '\\u8BFE\\u5802\\u8981\\u6C42\\u662F\\u5FC5\\u586B\\u9879\\u3002'),
    unknownHealth: t('No health check has been recorded yet.', '\\u8FD8\\u6CA1\\u6709\\u8BB0\\u5F55\u4EFB\\u4F55 health check \\u7ED3\\u679C\\u3002'),
    unknownJob: t('No classroom generation job has been submitted yet.', '\\u8FD8\\u6CA1\\u6709\\u63D0\\u4EA4\\u8BFE\\u5802\\u751F\\u6210\\u4EFB\\u52A1\\u3002'),
    locked: t('Write access is off. Turn on the top toolbar unlock before mutating this feature.', '\\u5199\\u5165\\u89E3\\u9501\\u5DF2\\u5173\\u95ED\\uFF0C\\u8BF7\\u5148\\u6253\\u5F00\\u5199\\u5165\\u89E3\\u9501\\u3002'),
    blocked: t('This machine has not set a safety passcode yet, so feature mutations are blocked.', '\\u8FD9\\u53F0\\u673A\\u5668\\u8FD8\\u6CA1\\u6709\\u8BBE\\u7F6E\\u5B89\\u5168\\u53E3\\u4EE4\\uFF0C\\u6240\\u4EE5\\u6682\\u65F6\\u4E0D\\u80FD\\u53D8\\u66F4\\u6388\\u6743\\u3002'),
    connected: t('Connected', '\\u5DF2\\u8FDE\\u63A5'),
    connectionFailed: t('Connection failed', '\\u8FDE\\u63A5\\u5931\\u8D25'),
    notChecked: t('Not checked', '\\u5C1A\\u672A\\u68C0\\u67E5'),
    noJob: t('No job yet', '\\u6682\\u65E0\\u4EFB\\u52A1'),
    queued: t('Queued', '\\u6392\\u961F\\u4E2D'),
    running: t('Running', '\\u8FD0\\u884C\\u4E2D'),
    ready: t('Ready', '\\u5DF2\\u5C31\\u7EEA'),
    failed: t('Failed', '\\u5931\\u8D25'),
    applyOpenmaicConfig: t('Writing provider config into OpenMAIC...', '\\u6B63\\u5728\\u5199\\u5165 OpenMAIC provider \\u914D\\u7F6E...'),
    applyOpenmaicConfigFailed: t('Failed to write provider config into OpenMAIC', '\\u5199\\u5165 OpenMAIC provider \\u914D\\u7F6E\\u5931\\u8D25'),
    openInNewTab: t('Open in new tab', '\\u65B0\\u6807\\u7B7E\\u6253\\u5F00'),
    syncIdle: t('Not applied', '\\u672A\\u5199\\u5165'),
    syncPendingRestart: t('Pending restart', '\\u5F85\\u91CD\\u542F'),
    syncSynced: t('Synced', '\\u5DF2\\u540C\\u6B65'),
    syncError: t('Sync error', '\\u540C\\u6B65\\u5931\\u8D25'),
    pdfVerified: t('Verified', '\\u5DF2\\u9A8C\\u8BC1'),
    pdfVerificationFailed: t('Verification failed', '\\u9A8C\\u8BC1\\u5931\\u8D25'),
    pdfSkipped: t('Skipped', '\\u5DF2\\u8DF3\\u8FC7'),
    pdfNotChecked: t('Not checked', '\\u5C1A\\u672A\\u68C0\\u67E5'),
    noObservedProviders: t('No server-configured providers observed yet.', '\\u8FD8\\u6CA1\\u6709\\u89C2\\u5BDF\\u5230 server-configured providers\\u3002'),
    latestDiagnosticEmpty: t('No diagnostic classroom job has been recorded yet. The job APIs stay available for fallback use, but they are no longer the main path here.', '\\u8FD8\\u6CA1\\u6709\\u8BB0\\u5F55\u4EFB\\u4F55\\u8BCA\\u65AD classroom job\\u3002job \\u63A5\\u53E3\\u4ECD\\u7136\\u4F5C\\u4E3A\\u56DE\\u9000\\u80FD\\u529B\\u4FDD\\u7559\\uFF0C\\u4F46\\u4E0D\\u518D\\u662F\\u8FD9\\u4E2A\\u9875\\u9762\\u7684\\u4E3B\\u8DEF\\u5F84\\u3002'),
    workspaceReadyMessage: t('OpenMAIC is launched directly inside this workspace. If embedding stops working, the panel falls back to diagnostics instead of going blank.', 'OpenMAIC \\u4F1A\\u76F4\\u63A5\\u5728\\u8FD9\\u4E2A\\u5DE5\\u4F5C\\u533A\\u5185\\u542F\\u52A8\\u3002\\u5982\\u679C\\u5D4C\\u5165\\u5931\\u6548\\uFF0C\\u8FD9\\u4E2A\\u9762\\u677F\\u4F1A\\u81EA\\u52A8\\u56DE\\u9000\\u5230\\u8BCA\\u65AD\\u5361\\uFF0C\\u800C\\u4E0D\\u662F\\u767D\\u5C4F\\u3002'),
    customGatewayPlaceholder: t('Required for OpenAI-compatible gateways', 'OpenAI-compatible gateway \\u5FC5\\u586B'),
    optionalGatewayPlaceholder: t('Optional compatible-provider override', '\\u53EF\\u9009\\u7684 compatible provider override'),
    mineruPlaceholder: t('http://127.0.0.1:8888', 'http://127.0.0.1:8888'),
    mineruDisabledPlaceholder: t('Built-in unpdf is active.', '\\u5F53\\u524D\\u4F7F\\u7528 built-in unpdf\\u3002'),
    openLatestClassroom: t('Open latest classroom', '\\u6253\\u5F00\\u6700\\u8FD1\\u8BFE\\u5802'),
    openLatestJob: t('Open latest job', '\\u6253\\u5F00\\u6700\\u8FD1 job'),
    openPoll: t('Open poll URL', '\\u6253\\u5F00 poll URL'),
    openClassroom: t('Open classroom', '\\u6253\\u5F00\\u8BFE\\u5802'),
  };

  const initEmbeddedEducation = () => {
    let educationState = null;
    let saveBusy = false;
    let healthBusy = false;
    let applyBusy = false;
    let statePollTimer = 0;
    let iframeGuardTimer = 0;
    let iframeGuardToken = 0;
    let iframeRequestedUrl = '';
    let iframeLoadedUrl = '';

    const configForm = educationRoot.querySelector('[data-ai-education-config-form]');
    const llmForm = educationRoot.querySelector('[data-ai-education-llm-form]');
    const pdfForm = educationRoot.querySelector('[data-ai-education-pdf-form]');
    const configStatusNode = educationRoot.querySelector('[data-ai-education-config-status]');
    const modeNode = educationRoot.querySelector('[data-ai-education-mode]');
    const endpointNode = educationRoot.querySelector('[data-ai-education-endpoint]');
    const healthStatusNode = educationRoot.querySelector('[data-ai-education-health-status]');
    const embedStatusNode = educationRoot.querySelector('[data-ai-education-embed-status]');
    const topBadge = educationRoot.querySelector('[data-ai-education-top-badge]');
    const iframeShell = educationRoot.querySelector('[data-ai-education-iframe-shell]');
    const iframeNode = educationRoot.querySelector('[data-ai-education-iframe]');
    const fullscreenTarget = educationRoot.querySelector('[data-ai-education-fullscreen-target]');
    const fullscreenButton = educationRoot.querySelector('[data-ai-education-fullscreen]');
    const fullscreenStateNode = educationRoot.querySelector('[data-ai-education-fullscreen-state]');
    const fallbackNode = educationRoot.querySelector('[data-ai-education-fallback]');
    const fallbackTitleNode = educationRoot.querySelector('[data-ai-education-fallback-title]');
    const fallbackReasonNode = educationRoot.querySelector('[data-ai-education-fallback-reason]');
    const fallbackSummaryNode = educationRoot.querySelector('[data-ai-education-fallback-summary]');
    const embedMessageNode = educationRoot.querySelector('[data-ai-education-embed-message]');
    const healthSummaryNode = educationRoot.querySelector('[data-ai-education-health-summary]');
    const healthChip = educationRoot.querySelector('[data-ai-education-health-chip]');
    const healthCheckedNode = educationRoot.querySelector('[data-ai-education-health-checked]');
    const healthVersionNode = educationRoot.querySelector('[data-ai-education-health-version]');
    const capabilitiesNode = educationRoot.querySelector('[data-ai-education-capabilities]');
    const jobStatusNode = educationRoot.querySelector('[data-ai-education-job-status]');
    const jobSummaryNode = educationRoot.querySelector('[data-ai-education-job-summary]');
    const jobLinksNode = educationRoot.querySelector('[data-ai-education-job-links]');
    const syncStatusNode = educationRoot.querySelector('[data-ai-education-sync-status]');
    const syncMessageNode = educationRoot.querySelector('[data-ai-education-sync-message]');
    const observedProvidersNode = educationRoot.querySelector('[data-ai-education-observed-providers]');
    const pdfVerificationNode = educationRoot.querySelector('[data-ai-education-pdf-verification]');
    const modeInput = configForm instanceof HTMLFormElement ? configForm.querySelector('[name="mode"]') : null;
    const baseUrlInput = configForm instanceof HTMLFormElement ? configForm.querySelector('[name="baseUrl"]') : null;
    const repoDirInput = configForm instanceof HTMLFormElement ? configForm.querySelector('[name="repoDir"]') : null;
    const accessCodeInput = configForm instanceof HTMLFormElement ? configForm.querySelector('[name="accessCode"]') : null;
    const llmProviderInput = llmForm instanceof HTMLFormElement ? llmForm.querySelector('[name="llmProviderPreset"]') : null;
    const llmModelInput = llmForm instanceof HTMLFormElement ? llmForm.querySelector('[name="llmModel"]') : null;
    const llmApiKeyInput = llmForm instanceof HTMLFormElement ? llmForm.querySelector('[name="llmApiKey"]') : null;
    const llmBaseUrlInput = llmForm instanceof HTMLFormElement ? llmForm.querySelector('[name="llmBaseUrl"]') : null;
    const pdfProviderInput = pdfForm instanceof HTMLFormElement ? pdfForm.querySelector('[name="pdfProvider"]') : null;
    const pdfBaseUrlInput = pdfForm instanceof HTMLFormElement ? pdfForm.querySelector('[name="pdfBaseUrl"]') : null;
    const pdfApiKeyInput = pdfForm instanceof HTMLFormElement ? pdfForm.querySelector('[name="pdfApiKey"]') : null;
    const openLinks = () => Array.from(educationRoot.querySelectorAll('[data-ai-education-open-app]')).filter((node) => node instanceof HTMLAnchorElement);
    const healthButtons = () => Array.from(educationRoot.querySelectorAll('[data-ai-education-health]')).filter((node) => node instanceof HTMLButtonElement);
    const reloadButtons = () => Array.from(educationRoot.querySelectorAll('[data-ai-education-reload-embed]')).filter((node) => node instanceof HTMLButtonElement);
    const hostedButtons = () => Array.from(educationRoot.querySelectorAll('[data-ai-education-use-hosted]')).filter((node) => node instanceof HTMLButtonElement);
    const saveButtons = () => Array.from(educationRoot.querySelectorAll('[data-ai-education-save]')).filter((node) => node instanceof HTMLButtonElement && (node.getAttribute('type') || '').toLowerCase() === 'button');
    const applyButtons = () => Array.from(educationRoot.querySelectorAll('[data-ai-education-apply-openmaic-config]')).filter((node) => node instanceof HTMLButtonElement);
    const mutationState = () => (typeof window.__openclawGetMutationAuthState === 'function' ? window.__openclawGetMutationAuthState() : { gateRequired: false, tokenConfigured: true, canMutate: true });
    const mutationHeaders = (headers = {}) => (typeof window.__openclawGetMutationAuthHeaders === 'function' ? window.__openclawGetMutationAuthHeaders(headers) : headers);
    const canFullscreen = () => fullscreenTarget instanceof HTMLElement && typeof fullscreenTarget.requestFullscreen === 'function';
    const normalizeEmbedUrl = (value) => {
      const text = toText(value).trim();
      if (!text) return '';
      try {
        return new URL(text, window.location.href).toString();
      } catch {
        return text;
      }
    };
    const lockMessage = () => {
      const state = mutationState();
      if (!state.gateRequired) return '';
      if (!state.tokenConfigured) return l.blocked;
      if (!state.canMutate) return l.locked;
      return '';
    };
    const setConfigStatus = (message) => { if (configStatusNode instanceof HTMLElement) configStatusNode.textContent = message; };
    const setText = (node, value) => { if (node instanceof HTMLElement) node.textContent = value; };
    const modeLabel = (value) => value === 'hosted' ? t('Hosted', '\\u6258\\u7BA1\\u6A21\\u5F0F') : t('Self-hosted', '\\u81EA\\u6258\\u7BA1');
    const healthLabel = (value) => value === 'ok' ? l.connected : value === 'error' ? l.connectionFailed : l.notChecked;
    const jobLabel = (value) => value === 'queued' ? l.queued : value === 'running' ? l.running : value === 'succeeded' ? l.ready : value === 'failed' ? l.failed : l.noJob;
    const embedLabel = (state) => state?.ready === true ? l.embedReady : l.embedAttention;
    const embedTone = (state) => state?.ready === true && state?.health?.status === 'ok' ? 'done' : state?.ready === true ? 'enabled' : 'blocked';
    const syncLabel = (value) => value === 'synced' ? l.syncSynced : value === 'pending_restart' ? l.syncPendingRestart : value === 'error' ? l.syncError : l.syncIdle;
    const pdfVerificationLabel = (state) => state?.status === 'ok' ? l.pdfVerified : state?.status === 'error' ? l.pdfVerificationFailed : state?.status === 'skipped' ? l.pdfSkipped : l.pdfNotChecked;
    const prefersHostedRecovery = (state) =>
      toText(state?.config?.mode, 'self_hosted') === 'self_hosted' &&
      toText(state?.config?.baseUrl, 'http://127.0.0.1:3000') === 'http://127.0.0.1:3000' &&
      toText(state?.health?.status) === 'error';
    const externalOpenHref = (state) =>
      prefersHostedRecovery(state)
        ? hostedBaseUrl
        : toText(state?.launchUrl || state?.config?.baseUrl, hostedBaseUrl);
    const updateOpenLinks = (state) => {
      const href = externalOpenHref(state);
      const label = prefersHostedRecovery(state) ? l.openHostedDirectly : l.openInNewTab;
      openLinks().forEach((link) => {
        link.href = href;
        link.textContent = label;
      });
    };
    const capabilityHtml = (capabilities) => {
      const items = [
        ['webSearch', t('Web search', '\\u8054\\u7F51\\u641C\\u7D22')],
        ['imageGeneration', t('Image', '\\u56FE\\u50CF')],
        ['videoGeneration', t('Video', '\\u89C6\\u9891')],
        ['tts', 'TTS'],
      ];
      return '<div class="feature-card-actions">' + items.map(([key, label]) => {
        const enabled = capabilities && capabilities[key] === true;
        return '<span class="badge ' + (enabled ? 'done' : 'enabled') + '">' + escapeHtml(label + (enabled ? '' : ' ' + t('off', '\\u5173'))) + '</span>';
      }).join('') + '</div>';
    };
    const renderObservedProviders = (observed) => {
      const sections = [
        ['providers', 'LLM'],
        ['pdf', 'PDF'],
        ['tts', 'TTS'],
        ['asr', 'ASR'],
        ['image', t('Image', '\\u56FE\\u50CF')],
        ['video', t('Video', '\\u89C6\\u9891')],
        ['webSearch', t('Search', '\\u641C\\u7D22')],
      ];
      const rows = sections.map(([key, label]) => {
        const bucket = toObj(observed?.[key]);
        const names = Object.keys(bucket);
        if (names.length === 0) return '';
        return '<article class="status-chip"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(names.join(', ')) + '</strong></article>';
      }).filter(Boolean).join('');
      return rows ? '<div class="geo-status-strip">' + rows + '</div>' : '<div class="empty-state">' + escapeHtml(l.noObservedProviders) + '</div>';
    };
    const syncModePresentation = (mode, state) => {
      if (baseUrlInput instanceof HTMLInputElement) {
        baseUrlInput.readOnly = mode === 'hosted';
        if (mode === 'hosted') {
          baseUrlInput.value = hostedBaseUrl;
        } else if (!baseUrlInput.value.trim()) {
          baseUrlInput.value = toText(state?.config?.baseUrl, 'http://127.0.0.1:3000');
        }
      }
      if (accessCodeInput instanceof HTMLInputElement) {
        const accessHint = toText(state?.config?.accessCodeHint);
        accessCodeInput.placeholder = accessHint
          ? t('Saved as ', '\\u5F53\\u524D\\u5DF2\\u4FDD\\u5B58 ') + accessHint + t('. Leave blank to keep it.', '\\uFF0C\\u7559\\u7A7A\\u53EF\\u4EE5\\u76F4\\u63A5\\u4FDD\\u7559')
          : t('Paste only when you want to replace the saved code', '\\u53EA\\u5728\\u4F60\\u60F3\\u66FF\\u6362\\u5DF2\\u4FDD\\u5B58\\u4EE4\\u724C\\u65F6\\u624D\\u9700\\u8981\\u586B\\u5199');
      }
      updateOpenLinks(state || { config: { mode, baseUrl: mode === 'hosted' ? hostedBaseUrl : toText(state?.config?.baseUrl, 'http://127.0.0.1:3000') } });
    };
    const syncProviderPresentation = () => {
      const provider = llmProviderInput instanceof HTMLSelectElement ? llmProviderInput.value : 'openai';
      if (llmBaseUrlInput instanceof HTMLInputElement) {
        llmBaseUrlInput.placeholder = provider === 'custom_openai_compatible' ? l.customGatewayPlaceholder : l.optionalGatewayPlaceholder;
      }
    };
    const syncPdfPresentation = () => {
      const provider = pdfProviderInput instanceof HTMLSelectElement ? pdfProviderInput.value : 'unpdf';
      const usingMineru = provider === 'mineru';
      if (pdfBaseUrlInput instanceof HTMLInputElement) {
        pdfBaseUrlInput.disabled = !usingMineru;
        pdfBaseUrlInput.placeholder = usingMineru ? l.mineruPlaceholder : l.mineruDisabledPlaceholder;
      }
      if (pdfApiKeyInput instanceof HTMLInputElement) {
        pdfApiKeyInput.disabled = !usingMineru;
      }
    };
    const clearIframeGuard = () => {
      if (iframeGuardTimer) {
        window.clearTimeout(iframeGuardTimer);
        iframeGuardTimer = 0;
      }
    };
    const clearStatePoll = () => {
      if (statePollTimer) {
        window.clearTimeout(statePollTimer);
        statePollTimer = 0;
      }
    };
    const scheduleStatePoll = (state) => {
      clearStatePoll();
      const latestJob = toObj(state?.latestJob);
      const status = toText(latestJob.status);
      const nextDelay = status === 'queued' || status === 'running' ? 5000 : 15000;
      statePollTimer = window.setTimeout(() => {
        statePollTimer = 0;
        void fetchState(true);
      }, nextDelay);
    };
    const showFallback = (reason, title = l.embedBlocked) => {
      iframeRequestedUrl = '';
      iframeLoadedUrl = '';
      if (iframeShell instanceof HTMLElement) iframeShell.dataset.aiEducationReady = 'false';
      if (iframeNode instanceof HTMLIFrameElement) {
        iframeNode.hidden = true;
        iframeNode.classList.add('is-hidden');
      }
      if (fallbackNode instanceof HTMLElement) {
        fallbackNode.hidden = false;
        fallbackNode.classList.add('is-visible');
      }
      if (fallbackTitleNode instanceof HTMLElement) fallbackTitleNode.textContent = title;
      if (fallbackReasonNode instanceof HTMLElement) fallbackReasonNode.textContent = reason;
      if (fallbackSummaryNode instanceof HTMLElement) fallbackSummaryNode.textContent = reason;
      if (embedMessageNode instanceof HTMLElement) embedMessageNode.textContent = reason;
      updateOpenLinks(educationState);
    };
    const armIframeGuard = () => {
      clearIframeGuard();
      if (!(iframeNode instanceof HTMLIFrameElement)) return;
      const nextToken = ++iframeGuardToken;
      iframeGuardTimer = window.setTimeout(() => {
        iframeGuardTimer = 0;
        if (nextToken !== iframeGuardToken) return;
        showFallback(l.embedTimeout);
      }, 12000);
    };
    const syncIframeNavigation = (embedUrl, forceReload = false) => {
      if (!(iframeNode instanceof HTMLIFrameElement)) return;
      const normalizedTargetUrl = normalizeEmbedUrl(embedUrl);
      if (!normalizedTargetUrl || normalizedTargetUrl === 'about:blank') {
        iframeRequestedUrl = '';
        iframeLoadedUrl = '';
        clearIframeGuard();
        return;
      }
      const normalizedCurrentUrl = normalizeEmbedUrl(iframeNode.getAttribute('src') || iframeNode.src);
      const shouldNavigate = forceReload || normalizedCurrentUrl !== normalizedTargetUrl;
      iframeRequestedUrl = normalizedTargetUrl;
      if (shouldNavigate) {
        iframeLoadedUrl = '';
        iframeNode.src = normalizedTargetUrl;
      }
      if (!iframeLoadedUrl) {
        armIframeGuard();
      } else {
        clearIframeGuard();
      }
    };
    const updateFullscreenUi = () => {
      const active = fullscreenTarget instanceof Element && document.fullscreenElement === fullscreenTarget;
      if (fullscreenButton instanceof HTMLButtonElement) {
        fullscreenButton.hidden = !canFullscreen();
        fullscreenButton.disabled = !canFullscreen();
        fullscreenButton.textContent = active ? l.exitFullscreen : l.fullscreenWorkspace;
      }
      if (fullscreenStateNode instanceof HTMLElement) {
        fullscreenStateNode.textContent = canFullscreen()
          ? active
            ? l.fullscreenActive
            : l.windowed
          : l.fullscreenUnavailable;
      }
    };
    const renderJobLinks = (job) => {
      if (!(jobLinksNode instanceof HTMLElement)) return;
      const links = [];
      if (job && job.classroomUrl) {
        links.push('<a class="btn" href="' + escapeHtml(job.classroomUrl) + '" target="_blank" rel="noreferrer">' + escapeHtml(l.openLatestClassroom) + '</a>');
      }
      if (job && job.pollUrl) {
        links.push('<a class="btn" href="' + escapeHtml(job.pollUrl) + '" target="_blank" rel="noreferrer">' + escapeHtml(l.openLatestJob) + '</a>');
      }
      jobLinksNode.innerHTML = links.join('');
    };
    const applyState = (state, statusMessage, forceReloadIframe = false) => {
      educationState = toObj(state);
      const config = toObj(educationState.config);
      const health = toObj(educationState.health);
      const latestJob = toObj(educationState.latestJob);
      const syncState = toObj(educationState.openmaicConfigSync);
      const observedProviders = toObj(educationState.observedServerProviders);
      const mode = toText(config.mode, 'self_hosted');
      const launchUrl = toText(educationState.launchUrl || config.baseUrl, mode === 'hosted' ? hostedBaseUrl : 'http://127.0.0.1:3000');
      const ready = educationState.ready === true;
      const blockedReason = toText(educationState.embedBlockedReason, l.embedTimeout);
      if (modeInput instanceof HTMLSelectElement && document.activeElement !== modeInput) modeInput.value = mode;
      if (baseUrlInput instanceof HTMLInputElement && document.activeElement !== baseUrlInput) baseUrlInput.value = launchUrl;
      if (repoDirInput instanceof HTMLInputElement && document.activeElement !== repoDirInput) repoDirInput.value = toText(config.repoDir);
      if (accessCodeInput instanceof HTMLInputElement) accessCodeInput.value = '';
      if (llmProviderInput instanceof HTMLSelectElement && document.activeElement !== llmProviderInput) llmProviderInput.value = toText(config.llmProviderPreset, 'openai');
      if (llmModelInput instanceof HTMLInputElement && document.activeElement !== llmModelInput) llmModelInput.value = toText(config.llmModel);
      if (llmBaseUrlInput instanceof HTMLInputElement && document.activeElement !== llmBaseUrlInput) llmBaseUrlInput.value = toText(config.llmBaseUrl);
      if (llmApiKeyInput instanceof HTMLInputElement) llmApiKeyInput.value = '';
      if (pdfProviderInput instanceof HTMLSelectElement && document.activeElement !== pdfProviderInput) pdfProviderInput.value = toText(config.pdfProvider, 'unpdf');
      if (pdfBaseUrlInput instanceof HTMLInputElement && document.activeElement !== pdfBaseUrlInput) pdfBaseUrlInput.value = toText(config.pdfBaseUrl);
      if (pdfApiKeyInput instanceof HTMLInputElement) pdfApiKeyInput.value = '';
      syncModePresentation(mode, educationState);
      syncProviderPresentation();
      syncPdfPresentation();
      if (modeNode instanceof HTMLElement) modeNode.textContent = modeLabel(mode);
      if (endpointNode instanceof HTMLElement) endpointNode.textContent = launchUrl || '-';
      const nextHealthLabel = healthLabel(toText(health.status));
      const nextEmbedLabel = embedLabel(educationState);
      if (healthStatusNode instanceof HTMLElement) healthStatusNode.textContent = nextHealthLabel;
      if (embedStatusNode instanceof HTMLElement) embedStatusNode.textContent = nextEmbedLabel;
      if (healthChip instanceof HTMLElement) healthChip.textContent = nextHealthLabel;
      if (healthCheckedNode instanceof HTMLElement) healthCheckedNode.textContent = toText(health.checkedAt, '-');
      if (healthVersionNode instanceof HTMLElement) healthVersionNode.textContent = toText(health.version, '-');
      if (healthSummaryNode instanceof HTMLElement) healthSummaryNode.textContent = toText(health.message, l.unknownHealth);
      if (capabilitiesNode instanceof HTMLElement) capabilitiesNode.innerHTML = capabilityHtml(toObj(health.capabilities));
      if (syncStatusNode instanceof HTMLElement) syncStatusNode.textContent = syncLabel(toText(syncState.status));
      if (syncMessageNode instanceof HTMLElement) syncMessageNode.textContent = toText(syncState.message, '');
      if (observedProvidersNode instanceof HTMLElement) observedProvidersNode.innerHTML = renderObservedProviders(observedProviders);
      if (pdfVerificationNode instanceof HTMLElement) pdfVerificationNode.textContent = pdfVerificationLabel(toObj(health.pdfProviderVerification));
      hostedButtons().forEach((button) => { button.hidden = !prefersHostedRecovery(educationState); });
      if (jobStatusNode instanceof HTMLElement) jobStatusNode.textContent = jobLabel(toText(latestJob.status));
      if (jobSummaryNode instanceof HTMLElement) {
        jobSummaryNode.textContent = latestJob.jobId
          ? t('Latest diagnostic job: ', '\\u6700\\u8FD1\\u8BCA\\u65AD job\\uFF1A') + jobLabel(toText(latestJob.status)) + (latestJob.step ? ' · ' + latestJob.step : '')
          : t('No diagnostic classroom job has been recorded yet. The job APIs stay available for fallback use, but they are no longer the main path here.', '\\u8FD8\\u6CA1\\u6709\\u8BB0\\u5F55\u4EFB\u4F55\u8BCA\\u65AD classroom job\\u3002job \\u63A5\\u53E3\\u4ECD\\u7136\\u4F5C\\u4E3A\\u56DE\\u9000\\u80FD\\u529B\\u4FDD\\u7559\\uFF0C\\u4F46\\u4E0D\\u518D\\u662F\\u8FD9\\u4E2A\\u9875\\u9762\\u7684\\u4E3B\\u8DEF\\u5F84\\u3002');
      }
      renderJobLinks(latestJob);
      if (topBadge instanceof HTMLElement) {
        topBadge.className = 'badge ' + embedTone(educationState);
        topBadge.textContent = nextEmbedLabel;
      }
      if (statusMessage) setConfigStatus(statusMessage);
      scheduleStatePoll(educationState);
      if (ready && iframeNode instanceof HTMLIFrameElement) {
        if (iframeShell instanceof HTMLElement) iframeShell.dataset.aiEducationReady = 'true';
        iframeNode.hidden = false;
        iframeNode.classList.remove('is-hidden');
        if (fallbackNode instanceof HTMLElement) {
          fallbackNode.hidden = true;
          fallbackNode.classList.remove('is-visible');
        }
        if (embedMessageNode instanceof HTMLElement) embedMessageNode.textContent = toText(
          educationState.embedBlockedReason,
          l.workspaceReadyMessage
        );
        const embedUrl = toText(educationState.embedUrl, launchUrl);
        syncIframeNavigation(embedUrl, forceReloadIframe);
      } else {
        clearIframeGuard();
        showFallback(blockedReason);
      }
    };
    const requestJson = async (url, options) => {
      const response = await fetch(url, options);
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.ok !== true) {
        throw new Error(payload?.error?.message || payload?.error || options?.fallbackError || 'Request failed');
      }
      return payload;
    };
    const collectConfigBody = () => {
      const body = {
        mode: modeInput instanceof HTMLSelectElement ? toText(modeInput.value, 'self_hosted') : 'self_hosted',
        baseUrl: baseUrlInput instanceof HTMLInputElement ? toText(baseUrlInput.value) : '',
        repoDir: repoDirInput instanceof HTMLInputElement ? toText(repoDirInput.value) : '',
        llmProviderPreset: llmProviderInput instanceof HTMLSelectElement ? toText(llmProviderInput.value, 'openai') : 'openai',
        llmModel: llmModelInput instanceof HTMLInputElement ? toText(llmModelInput.value) : '',
        llmBaseUrl: llmBaseUrlInput instanceof HTMLInputElement ? toText(llmBaseUrlInput.value) : '',
        pdfProvider: pdfProviderInput instanceof HTMLSelectElement ? toText(pdfProviderInput.value, 'unpdf') : 'unpdf',
        pdfBaseUrl: pdfBaseUrlInput instanceof HTMLInputElement ? toText(pdfBaseUrlInput.value) : '',
      };
      const accessCode = accessCodeInput instanceof HTMLInputElement ? toText(accessCodeInput.value) : '';
      const llmApiKey = llmApiKeyInput instanceof HTMLInputElement ? toText(llmApiKeyInput.value) : '';
      const pdfApiKey = pdfApiKeyInput instanceof HTMLInputElement ? toText(pdfApiKeyInput.value) : '';
      if (accessCode) body.accessCode = accessCode;
      if (llmApiKey) body.llmApiKey = llmApiKey;
      if (pdfApiKey) body.pdfApiKey = pdfApiKey;
      return body;
    };
    const persistConfig = async (quiet = false) => {
      const message = lockMessage();
      if (message) {
        setConfigStatus(message);
        return null;
      }
      saveBusy = true;
      if (!quiet) setConfigStatus(l.saving);
      try {
        const payload = await requestJson('/api/features/education/config', {
          method: 'PATCH',
          headers: mutationHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify(collectConfigBody()),
          fallbackError: l.saveFailed,
        });
        applyState(payload.state || {}, quiet ? '' : l.saved);
        return payload.state || {};
      } catch (error) {
        setConfigStatus(error instanceof Error ? error.message : l.saveFailed);
        return null;
      } finally {
        saveBusy = false;
      }
    };
    const fetchState = async (quiet = false) => {
      if (!quiet) setConfigStatus(l.loading);
      try {
        const payload = await requestJson('/api/features/education/state', {
          method: 'GET',
          fallbackError: l.loadFailed,
        });
        applyState(payload.state || {}, quiet ? '' : toText(payload.state?.openmaicConfigSync?.message || payload.state?.health?.message || payload.state?.embedBlockedReason, l.healthReady));
        return payload.state || {};
      } catch (error) {
        const message = error instanceof Error ? error.message : l.loadFailed;
        setConfigStatus(message);
        showFallback(message);
        scheduleStatePoll(educationState);
        return null;
      }
    };
    const checkHealth = async ({ persist = true, quiet = false } = {}) => {
      const saved = persist ? await persistConfig(true) : educationState;
      if (!saved) return;
      healthBusy = true;
      if (!quiet) setConfigStatus(l.checking);
      try {
        const payload = await requestJson('/api/features/education/health', {
          method: 'POST',
          fallbackError: l.healthFailed,
        });
        applyState(
          payload.state || {},
          toText(payload.state?.openmaicConfigSync?.message || payload.state?.health?.message, l.healthReady)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : l.healthFailed;
        if (!quiet) setConfigStatus(message);
        showFallback(message);
      } finally {
        healthBusy = false;
      }
    };
    const applyOpenMaicConfig = async () => {
      if (saveBusy || healthBusy || applyBusy) return;
      const saved = await persistConfig(true);
      if (!saved) return;
      applyBusy = true;
      setConfigStatus(l.applyOpenmaicConfig);
      try {
        const payload = await requestJson('/api/features/education/apply-openmaic-config', {
          method: 'POST',
          headers: mutationHeaders({}),
          fallbackError: l.applyOpenmaicConfigFailed,
        });
        applyState(payload.state || {}, toText(payload.state?.openmaicConfigSync?.message, l.applyOpenmaicConfig));
      } catch (error) {
        setConfigStatus(error instanceof Error ? error.message : l.applyOpenmaicConfigFailed);
      } finally {
        applyBusy = false;
      }
    };
    const reloadEmbed = async () => {
      if (saveBusy || healthBusy || applyBusy) return;
      setConfigStatus(l.reloadEmbed);
      const saved = await persistConfig(true);
      if (!saved) return;
      applyState(saved, toText(saved.embedBlockedReason || saved.health?.message, l.reloadEmbed), true);
    };
    const useHostedRecovery = async () => {
      if (saveBusy || healthBusy || applyBusy) return;
      const message = lockMessage();
      if (message) {
        setConfigStatus(message);
        return;
      }
      saveBusy = true;
      setConfigStatus(l.switchingHosted);
      try {
        const payload = await requestJson('/api/features/education/config', {
          method: 'PATCH',
          headers: mutationHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({ mode: 'hosted', baseUrl: hostedBaseUrl }),
          fallbackError: l.saveFailed,
        });
        applyState(payload.state || {}, l.hostedReady);
      } catch (error) {
        setConfigStatus(error instanceof Error ? error.message : l.saveFailed);
      } finally {
        saveBusy = false;
      }
    };
    const toggleFullscreenWorkspace = async () => {
      if (!(fullscreenTarget instanceof HTMLElement) || !(fullscreenButton instanceof HTMLButtonElement)) return;
      if (!canFullscreen()) {
        setConfigStatus(l.fullscreenUnavailable);
        updateFullscreenUi();
        return;
      }
      try {
        if (document.fullscreenElement === fullscreenTarget) {
          await document.exitFullscreen();
        } else {
          await fullscreenTarget.requestFullscreen();
        }
      } catch (error) {
        setConfigStatus(error instanceof Error && error.message ? error.message : l.fullscreenFailed);
      } finally {
        updateFullscreenUi();
      }
    };

    if (configForm instanceof HTMLFormElement) {
      configForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void persistConfig(false);
      });
    }
    if (llmForm instanceof HTMLFormElement) {
      llmForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void persistConfig(false);
      });
    }
    if (pdfForm instanceof HTMLFormElement) {
      pdfForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void persistConfig(false);
      });
    }
    if (modeInput instanceof HTMLSelectElement) {
      modeInput.addEventListener('change', () => {
        syncModePresentation(modeInput.value, educationState);
      });
    }
    if (llmProviderInput instanceof HTMLSelectElement) {
      llmProviderInput.addEventListener('change', syncProviderPresentation);
    }
    if (pdfProviderInput instanceof HTMLSelectElement) {
      pdfProviderInput.addEventListener('change', syncPdfPresentation);
    }
    saveButtons().forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        void persistConfig(false);
      });
    });
    applyButtons().forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        void applyOpenMaicConfig();
      });
    });
    healthButtons().forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        void checkHealth();
      });
    });
    reloadButtons().forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        void reloadEmbed();
      });
    });
    hostedButtons().forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        void useHostedRecovery();
      });
    });
    if (fullscreenButton instanceof HTMLButtonElement) {
      fullscreenButton.addEventListener('click', (event) => {
        event.preventDefault();
        void toggleFullscreenWorkspace();
      });
    }
    if (iframeNode instanceof HTMLIFrameElement) {
      iframeRequestedUrl = normalizeEmbedUrl(iframeNode.getAttribute('src') || iframeNode.src);
      iframeNode.addEventListener('load', () => {
        clearIframeGuard();
        try {
          if (iframeNode.contentWindow?.location?.href === 'about:blank') {
            showFallback(l.embedBlank);
            return;
          }
        } catch {}
        iframeLoadedUrl = iframeRequestedUrl || normalizeEmbedUrl(iframeNode.getAttribute('src') || iframeNode.src);
        if (fallbackNode instanceof HTMLElement) {
          fallbackNode.hidden = true;
          fallbackNode.classList.remove('is-visible');
        }
        iframeNode.hidden = false;
        iframeNode.classList.remove('is-hidden');
      });
    }
    document.addEventListener('fullscreenchange', updateFullscreenUi);
    syncProviderPresentation();
    syncPdfPresentation();
    updateFullscreenUi();
    void fetchState();
  };

  initEmbeddedEducation();
  return;

  let educationState = null;
  let saveBusy = false;
  let healthBusy = false;
  let jobBusy = false;
  let jobPollTimer = 0;

  const configForm = educationRoot.querySelector('[data-ai-education-config-form]');
  const configStatusNode = educationRoot.querySelector('[data-ai-education-config-status]');
  const modeNode = educationRoot.querySelector('[data-ai-education-mode]');
  const endpointNode = educationRoot.querySelector('[data-ai-education-endpoint]');
  const healthStatusNode = educationRoot.querySelector('[data-ai-education-health-status]');
  const jobStatusNode = educationRoot.querySelector('[data-ai-education-job-status]');
  const topBadge = educationRoot.querySelector('[data-ai-education-top-badge]');
  const modeInput = configForm instanceof HTMLFormElement ? configForm.querySelector('[name="mode"]') : null;
  const baseUrlInput = configForm instanceof HTMLFormElement ? configForm.querySelector('[name="baseUrl"]') : null;
  const repoDirInput = configForm instanceof HTMLFormElement ? configForm.querySelector('[name="repoDir"]') : null;
  const accessCodeInput = configForm instanceof HTMLFormElement ? configForm.querySelector('[name="accessCode"]') : null;
  const healthButton = educationRoot.querySelector('[data-ai-education-health]');
  const openAppLink = educationRoot.querySelector('[data-ai-education-open-app]');
  const healthSummaryNode = educationRoot.querySelector('[data-ai-education-health-summary]');
  const healthChip = educationRoot.querySelector('[data-ai-education-health-chip]');
  const healthCheckedNode = educationRoot.querySelector('[data-ai-education-health-checked]');
  const healthVersionNode = educationRoot.querySelector('[data-ai-education-health-version]');
  const capabilitiesNode = educationRoot.querySelector('[data-ai-education-capabilities]');
  const jobForm = educationRoot.querySelector('[data-ai-education-job-form]');
  const jobMessageNode = educationRoot.querySelector('[data-ai-education-job-message]');
  const refreshJobButton = educationRoot.querySelector('[data-ai-education-refresh-job]');
  const jobSummaryNode = educationRoot.querySelector('[data-ai-education-job-summary]');
  const jobChip = educationRoot.querySelector('[data-ai-education-job-chip]');
  const jobIdNode = educationRoot.querySelector('[data-ai-education-job-id]');
  const jobProgressNode = educationRoot.querySelector('[data-ai-education-job-progress]');
  const jobErrorNode = educationRoot.querySelector('[data-ai-education-job-error]');
  const jobLinksNode = educationRoot.querySelector('[data-ai-education-job-links]');
  const requirementInput = jobForm instanceof HTMLFormElement ? jobForm.querySelector('[name="requirement"]') : null;
  const languageInput = jobForm instanceof HTMLFormElement ? jobForm.querySelector('[name="language"]') : null;
  const agentModeInput = jobForm instanceof HTMLFormElement ? jobForm.querySelector('[name="agentMode"]') : null;
  const mutationState = () => (typeof window.__openclawGetMutationAuthState === 'function' ? window.__openclawGetMutationAuthState() : { gateRequired: false, tokenConfigured: true, canMutate: true });
  const mutationHeaders = (headers = {}) => (typeof window.__openclawGetMutationAuthHeaders === 'function' ? window.__openclawGetMutationAuthHeaders(headers) : headers);
  const lockMessage = () => {
    const state = mutationState();
    if (!state.gateRequired) return '';
    if (!state.tokenConfigured) return l.blocked;
    if (!state.canMutate) return l.locked;
    return '';
  };
  const setConfigStatus = (message) => { if (configStatusNode instanceof HTMLElement) configStatusNode.textContent = message; };
  const setJobMessage = (message) => { if (jobMessageNode instanceof HTMLElement) jobMessageNode.textContent = message; };
  const modeLabel = (value) => value === 'hosted' ? t('Hosted', '\\u6258\\u7BA1\\u6A21\\u5F0F') : t('Self-hosted', '\\u81EA\\u6258\\u7BA1');
  const healthLabel = (value) => value === 'ok' ? l.connected : value === 'error' ? l.connectionFailed : l.notChecked;
  const jobLabel = (value) => value === 'queued' ? l.queued : value === 'running' ? l.running : value === 'succeeded' ? l.ready : value === 'failed' ? l.failed : l.noJob;
  const healthTone = (value) => value === 'ok' ? 'done' : value === 'error' ? 'blocked' : 'enabled';
  const jobTone = (value) => value === 'queued' || value === 'running' ? 'warn' : value === 'succeeded' ? 'done' : value === 'failed' ? 'blocked' : 'enabled';
  const capabilityHtml = (capabilities) => {
    const items = [
      ['webSearch', t('Web search', '\\u8054\\u7F51\\u641C\\u7D22')],
      ['imageGeneration', t('Image', '\\u56FE\\u50CF')],
      ['videoGeneration', t('Video', '\\u89C6\\u9891')],
      ['tts', 'TTS'],
    ];
    return '<div class="feature-card-actions">' + items.map(([key, label]) => {
      const enabled = capabilities && capabilities[key] === true;
      return '<span class="badge ' + (enabled ? 'done' : 'enabled') + '">' + escapeHtml(label + (enabled ? '' : ' ' + t('off', '\\u5173'))) + '</span>';
    }).join('') + '</div>';
  };
  const renderJobLinks = (job) => {
    if (!(jobLinksNode instanceof HTMLElement)) return;
    const links = [];
    if (job && job.pollUrl) {
      links.push('<a class="btn" href="' + escapeHtml(job.pollUrl) + '" target="_blank" rel="noreferrer">' + escapeHtml(l.openPoll) + '</a>');
    }
    if (job && job.classroomUrl) {
      links.push('<a class="btn" href="' + escapeHtml(job.classroomUrl) + '" target="_blank" rel="noreferrer">' + escapeHtml(l.openClassroom) + '</a>');
    }
    jobLinksNode.innerHTML = links.join('');
  };
  const syncModePresentation = (mode, state) => {
    if (baseUrlInput instanceof HTMLInputElement) {
      baseUrlInput.readOnly = mode === 'hosted';
      if (mode === 'hosted') {
        baseUrlInput.value = hostedBaseUrl;
      } else if (!baseUrlInput.value.trim()) {
        baseUrlInput.value = toText(state?.config?.baseUrl, 'http://127.0.0.1:3000');
      }
    }
    if (accessCodeInput instanceof HTMLInputElement) {
      const accessHint = toText(state?.config?.accessCodeHint);
      accessCodeInput.placeholder = accessHint
        ? t('Saved as ', '\\u5F53\\u524D\\u5DF2\\u4FDD\\u5B58 ') + accessHint + t('. Leave blank to keep it.', '\\uFF0C\\u7559\\u7A7A\\u53EF\\u4EE5\\u76F4\\u63A5\\u4FDD\\u7559')
        : t('Paste only when you want to replace the saved code', '\\u53EA\\u5728\\u4F60\\u60F3\\u66FF\\u6362\\u5DF2\\u4FDD\\u5B58\\u4EE4\\u724C\\u65F6\\u624D\\u9700\\u8981\\u586B\\u5199');
    }
    if (openAppLink instanceof HTMLAnchorElement) {
      openAppLink.href = mode === 'hosted' ? hostedBaseUrl : toText(state?.config?.baseUrl, 'http://127.0.0.1:3000');
    }
  };
  const clearJobPoll = () => {
    if (jobPollTimer) {
      window.clearTimeout(jobPollTimer);
      jobPollTimer = 0;
    }
  };
  const scheduleJobPoll = (job) => {
    clearJobPoll();
    const status = toText(job?.status);
    const jobId = toText(job?.jobId);
    if ((status === 'queued' || status === 'running') && jobId) {
      jobPollTimer = window.setTimeout(() => {
        jobPollTimer = 0;
        void refreshJob(jobId, true);
      }, 8000);
    }
  };
  const applyState = (state) => {
    educationState = toObj(state);
    const config = toObj(educationState.config);
    const health = toObj(educationState.health);
    const latestJob = toObj(educationState.latestJob);
    const mode = toText(config.mode, 'self_hosted');
    if (modeInput instanceof HTMLSelectElement && document.activeElement !== modeInput) {
      modeInput.value = mode;
    }
    if (baseUrlInput instanceof HTMLInputElement && document.activeElement !== baseUrlInput) {
      baseUrlInput.value = toText(config.baseUrl, mode === 'hosted' ? hostedBaseUrl : 'http://127.0.0.1:3000');
    }
    if (repoDirInput instanceof HTMLInputElement && document.activeElement !== repoDirInput) {
      repoDirInput.value = toText(config.repoDir);
    }
    if (accessCodeInput instanceof HTMLInputElement) {
      accessCodeInput.value = '';
    }
    syncModePresentation(mode, educationState);
    if (modeNode instanceof HTMLElement) modeNode.textContent = modeLabel(mode);
    if (endpointNode instanceof HTMLElement) endpointNode.textContent = toText(config.baseUrl, '-');
    const nextHealthLabel = healthLabel(toText(health.status));
    const nextJobLabel = jobLabel(toText(latestJob.status));
    if (healthStatusNode instanceof HTMLElement) healthStatusNode.textContent = nextHealthLabel;
    if (jobStatusNode instanceof HTMLElement) jobStatusNode.textContent = nextJobLabel;
    if (healthChip instanceof HTMLElement) healthChip.textContent = nextHealthLabel;
    if (healthCheckedNode instanceof HTMLElement) healthCheckedNode.textContent = toText(health.checkedAt, '-');
    if (healthVersionNode instanceof HTMLElement) healthVersionNode.textContent = toText(health.version, '-');
    if (healthSummaryNode instanceof HTMLElement) healthSummaryNode.textContent = toText(health.message, l.unknownHealth);
    if (capabilitiesNode instanceof HTMLElement) capabilitiesNode.innerHTML = capabilityHtml(toObj(health.capabilities));
    if (jobSummaryNode instanceof HTMLElement) {
      jobSummaryNode.textContent = latestJob.step
        ? t('Step: ', '\\u5F53\\u524D\\u9636\\u6BB5\\uFF1A') + latestJob.step
        : t('Job progress will appear here after submission.', '\\u63D0\\u4EA4\\u4EFB\\u52A1\\u540E\\uFF0C\\u8FD9\\u91CC\\u4F1A\\u51FA\\u73B0\\u8FDB\\u5EA6\\u4FE1\\u606F\\u3002');
    }
    if (jobChip instanceof HTMLElement) jobChip.textContent = nextJobLabel;
    if (jobIdNode instanceof HTMLElement) jobIdNode.textContent = toText(latestJob.jobId, '-');
    if (jobProgressNode instanceof HTMLElement) jobProgressNode.textContent = typeof latestJob.progress === 'number' ? String(latestJob.progress) + '%' : '-';
    if (jobErrorNode instanceof HTMLElement) jobErrorNode.textContent = toText(latestJob.error);
    renderJobLinks(latestJob);
    if (topBadge instanceof HTMLElement) {
      const usingJob = toText(latestJob.status) && toText(latestJob.status) !== 'idle';
      const tone = usingJob ? jobTone(toText(latestJob.status)) : healthTone(toText(health.status));
      topBadge.className = 'badge ' + tone;
      topBadge.textContent = usingJob ? nextJobLabel : nextHealthLabel;
    }
    if (refreshJobButton instanceof HTMLButtonElement) {
      refreshJobButton.disabled = jobBusy || !toText(latestJob.jobId);
    }
    if (jobMessageNode instanceof HTMLElement && !jobBusy) {
      jobMessageNode.textContent = toText(latestJob.message || latestJob.error, l.unknownJob);
    }
    scheduleJobPoll(latestJob);
  };
  const requestJson = async (url, options) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) {
      throw new Error(payload?.error?.message || payload?.error || options?.fallbackError || 'Request failed');
    }
    return payload;
  };
  const persistConfig = async (quiet = false) => {
    if (!(configForm instanceof HTMLFormElement)) return educationState;
    const message = lockMessage();
    if (message) {
      setConfigStatus(message);
      return null;
    }
    saveBusy = true;
    if (!quiet) setConfigStatus(l.saving);
    try {
      const formData = new FormData(configForm);
      const mode = toText(formData.get('mode'), 'self_hosted');
      const body = {
        mode,
        baseUrl: toText(formData.get('baseUrl')),
        repoDir: toText(formData.get('repoDir')),
      };
      const accessCode = toText(formData.get('accessCode'));
      if (accessCode) body.accessCode = accessCode;
      const payload = await requestJson('/api/features/education/config', {
        method: 'PATCH',
        headers: mutationHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify(body),
        fallbackError: l.saveFailed,
      });
      applyState(payload.state || {});
      if (!quiet) setConfigStatus(l.saved);
      return payload.state || {};
    } catch (error) {
      setConfigStatus(error instanceof Error ? error.message : l.saveFailed);
      return null;
    } finally {
      saveBusy = false;
    }
  };
  const fetchState = async (quiet = false) => {
    try {
      const payload = await requestJson('/api/features/education/state', {
        method: 'GET',
        fallbackError: l.refreshFailed,
      });
      applyState(payload.state || {});
      if (!quiet) {
        const latestJob = toObj(payload.state?.latestJob);
        setConfigStatus(toText(payload.state?.health?.message, l.unknownHealth));
        setJobMessage(toText(latestJob.message || latestJob.error, l.unknownJob));
      }
      return payload.state || {};
    } catch (error) {
      if (!quiet) setConfigStatus(error instanceof Error ? error.message : l.refreshFailed);
      return null;
    }
  };
  const checkHealth = async () => {
    const saved = await persistConfig(true);
    if (!saved) return;
    healthBusy = true;
    setConfigStatus(l.checking);
    try {
      const payload = await requestJson('/api/features/education/health', {
        method: 'POST',
        fallbackError: l.healthFailed,
      });
      applyState(payload.state || {});
      setConfigStatus(toText(payload.state?.health?.message, l.healthReady));
    } catch (error) {
      setConfigStatus(error instanceof Error ? error.message : l.healthFailed);
    } finally {
      healthBusy = false;
    }
  };
  const submitJob = async () => {
    if (!(jobForm instanceof HTMLFormElement)) return;
    const message = lockMessage();
    if (message) {
      setJobMessage(message);
      return;
    }
    const requirement = requirementInput instanceof HTMLTextAreaElement ? toText(requirementInput.value) : '';
    if (!requirement) {
      setJobMessage(l.requirementMissing);
      return;
    }
    const saved = await persistConfig(true);
    if (!saved) return;
    jobBusy = true;
    setJobMessage(l.submitting);
    try {
      const formData = new FormData(jobForm);
      const payload = await requestJson('/api/features/education/job', {
        method: 'POST',
        headers: mutationHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          requirement,
          language: toText(formData.get('language'), 'zh-CN'),
          agentMode: toText(formData.get('agentMode'), 'default'),
          enableWebSearch: formData.get('enableWebSearch') === 'on',
          enableImageGeneration: formData.get('enableImageGeneration') === 'on',
          enableVideoGeneration: formData.get('enableVideoGeneration') === 'on',
          enableTTS: formData.get('enableTTS') === 'on',
        }),
        fallbackError: l.submitFailed,
      });
      applyState(payload.state || {});
      const latestJob = toObj(payload.state?.latestJob);
      setJobMessage(toText(latestJob.message || latestJob.error, l.refreshing));
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : l.submitFailed);
    } finally {
      jobBusy = false;
      if (refreshJobButton instanceof HTMLButtonElement) {
        refreshJobButton.disabled = !toText(educationState?.latestJob?.jobId);
      }
    }
  };
  const refreshJob = async (jobId, quiet = false) => {
    const nextJobId = toText(jobId) || toText(educationState?.latestJob?.jobId);
    if (!nextJobId) return;
    jobBusy = true;
    if (!quiet) setJobMessage(l.refreshing);
    try {
      const payload = await requestJson('/api/features/education/job?jobId=' + encodeURIComponent(nextJobId), {
        method: 'GET',
        fallbackError: l.refreshFailed,
      });
      applyState(payload.state || {});
      const latestJob = toObj(payload.state?.latestJob);
      if (!quiet) setJobMessage(toText(latestJob.message || latestJob.error, l.unknownJob));
    } catch (error) {
      if (!quiet) setJobMessage(error instanceof Error ? error.message : l.refreshFailed);
    } finally {
      jobBusy = false;
      if (refreshJobButton instanceof HTMLButtonElement) {
        refreshJobButton.disabled = !toText(educationState?.latestJob?.jobId);
      }
    }
  };

  if (configForm instanceof HTMLFormElement) {
    configForm.addEventListener('submit', (event) => {
      event.preventDefault();
      void persistConfig(false);
    });
  }
  if (modeInput instanceof HTMLSelectElement) {
    modeInput.addEventListener('change', () => {
      syncModePresentation(modeInput.value, educationState);
    });
  }
  if (healthButton instanceof HTMLButtonElement) {
    healthButton.addEventListener('click', (event) => {
      event.preventDefault();
      void checkHealth();
    });
  }
  if (jobForm instanceof HTMLFormElement) {
    jobForm.addEventListener('submit', (event) => {
      event.preventDefault();
      void submitJob();
    });
  }
  if (refreshJobButton instanceof HTMLButtonElement) {
    refreshJobButton.addEventListener('click', (event) => {
      event.preventDefault();
      void refreshJob(toText(educationState?.latestJob?.jobId), false);
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void fetchState(true);
    }
  });
  window.addEventListener('focus', () => {
    void fetchState(true);
  });
  void fetchState();
})();
</script>`;
}

module.exports = { renderFeaturesScript };
