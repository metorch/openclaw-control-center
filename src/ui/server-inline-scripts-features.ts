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
    if (moduleSupportsDirectRun(activeSuiteModule) && advancedToolsOpen()) {
      void fetchModuleState(activeSuiteModule, true);
    } else if (modulePollTimer) {
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
  const applyFeatureControl = (state) => {
    featureControlState = state || {};
    const enabled = state?.features?.geo?.aiTakeoverEnabled === true;
    featureButtons('geo').forEach((button) => {
      button.classList.toggle('is-on', enabled);
      button.setAttribute('aria-checked', enabled ? 'true' : 'false');
      button.dataset.nextValue = enabled ? 'false' : 'true';
      button.disabled = takeoverBusy || Boolean(lockMessage());
    });
    featureLabels('geo').forEach((label) => { label.textContent = enabled ? l.takeoverEnabled : l.takeoverDisabled; });
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
      setStatus(toText(state.message, l.ready));
      if (runButton instanceof HTMLButtonElement) runButton.disabled = busy || normalized === 'running' || Boolean(lockMessage());
      renderModuleActionPanel();
      if (pollTimer) window.clearTimeout(pollTimer);
      pollTimer = window.setTimeout(() => { pollTimer = 0; void fetchState(true); }, normalized === 'running' ? 3000 : 15000);
      if (hasPendingSuiteRefresh() && normalized !== 'running') {
        clearPendingSuiteRefresh();
        window.location.reload();
        return state;
      }
      if (normalized !== 'running' && suiteDetailNode instanceof HTMLElement) void fetchSummary(true);
      return state;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : l.loadFailed);
      return null;
    }
  };
  const updateTakeover = async (nextEnabled) => {
    const message = lockMessage();
    if (message) { setStatus(message); return; }
    takeoverBusy = true;
    setStatus(nextEnabled ? l.takeoverEnableBusy : l.takeoverDisableBusy);
    try {
      const response = await fetch('/api/features/control', { method: 'PATCH', headers: mutationHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ feature: 'geo', aiTakeoverEnabled: nextEnabled }) });
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
    if (takeover instanceof HTMLButtonElement) { event.preventDefault(); void updateTakeover(toText(takeover.dataset.nextValue) === 'true'); return; }
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
      if (moduleSupportsDirectRun(activeSuiteModule)) void fetchModuleState(activeSuiteModule, true);
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void fetchFeatureControl(true);
      if (geoRoot instanceof HTMLElement) void fetchState(true);
      if (moduleSupportsDirectRun(activeSuiteModule) && advancedToolsOpen()) void fetchModuleState(activeSuiteModule, true);
    }
  });
  applySummary(parseSummarySeed());
  applySuiteSelection(activeSuiteModule);
  renderModuleActionPanel();
  void fetchFeatureControl(true);
  if (geoRoot instanceof HTMLElement) void fetchState();
})();
</script>`;
}

module.exports = { renderFeaturesScript };
