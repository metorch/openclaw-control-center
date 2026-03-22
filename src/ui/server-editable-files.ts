// @ts-nocheck

const { promises: fs } = require("node:fs");
const { basename, dirname, extname, join, relative, resolve } = require("node:path");

function createEditableFileHelpers(deps) {
  const {
    agentDocumentFileCandidates,
    asArray,
    asObject,
    asString,
    budgetPolicyPath,
    defaultPrimaryOperatorDisplayName,
    editableFileScopes,
    editableTextFileMaxBytes,
    escapeHtml,
    formatInt,
    humanizeOperatorDisplayName,
    humanizeOperatorLabel,
    isPrimaryOperatorAgentId,
    localApiToken,
    localTokenAuthRequired,
    memoryEditableExtensions,
    normalizeLookupKey,
    openclawConfigDir,
    openclawConfigPath,
    openclawWorkspaceRoot,
    pickUiText,
    safeReadTextFile,
    sharedDocumentFileCandidates,
    toPlainSummary,
    workspaceEditableExtensions,
    workspaceEditableSkipDirs,
  } = deps;

  async function listFileEntries(dir) {
    try {
      const rows = await fs.readdir(dir, { withFileTypes: true });
      const files = rows.filter((row) => row.isFile());
      const result = [];
      for (const file of files) {
        const fullPath = join(dir, file.name);
        try {
          const meta = await fs.stat(fullPath);
          result.push({
            name: file.name,
            path: fullPath,
            updatedAt: meta.mtime.toISOString(),
            size: meta.size,
          });
        } catch {
          continue;
        }
      }
      return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      return [];
    }
  }

  function normalizeEditableFileScope(value) {
    if (value && editableFileScopes.includes(value)) {
      return value;
    }
    return void 0;
  }

  function buildRuntimeBudgetPolicyStarterContent() {
    return `${JSON.stringify(
      { defaults: { warnRatio: 0.8 }, agent: {}, project: {}, task: {} },
      null,
      2,
    )}\n`;
  }

  function readPrimaryBudgetLimit(policy) {
    const direct = [policy.agent.main?.cost, policy.agent.jarvis?.cost].find(
      (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
    );
    if (direct !== void 0) {
      return direct;
    }
    for (const [agentId, thresholds] of Object.entries(policy.agent)) {
      if (!isPrimaryOperatorAgentId(agentId)) {
        continue;
      }
      const value = thresholds?.cost;
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return value;
      }
    }
    return void 0;
  }

  function buildSettingsBudgetLimitModel(input) {
    return {
      path: input.path,
      relativePath: relative(process.cwd(), input.path) || join("runtime", "budgets.json"),
      loadedFromFile: input.loadedFromFile,
      currentLimit: readPrimaryBudgetLimit(input.policy),
      warnRatio:
        typeof input.policy.defaults.warnRatio === "number" && Number.isFinite(input.policy.defaults.warnRatio)
          ? input.policy.defaults.warnRatio
          : void 0,
      issues: [...input.issues],
    };
  }

  function applyPrimaryBudgetLimit(policy, limit) {
    const next = {
      defaults: { ...policy.defaults },
      agent: { ...policy.agent },
      project: { ...policy.project },
      task: { ...policy.task },
    };
    delete next.agent.jarvis;
    const current = { ...(next.agent.main ?? {}) };
    if (limit === void 0) {
      delete current.cost;
    } else {
      current.cost = limit;
    }
    if (Object.keys(current).length === 0) {
      delete next.agent.main;
    } else {
      next.agent.main = current;
    }
    return next;
  }

  async function writeBudgetPolicyConfig(policy) {
    await fs.mkdir(dirname(budgetPolicyPath), { recursive: true });
    await fs.writeFile(budgetPolicyPath, `${JSON.stringify(policy, null, 2)}\n`, "utf8");
  }

  async function buildEditableFileEntry(input) {
    try {
      const meta = await fs.stat(input.sourcePath);
      if (!meta.isFile() || meta.size > editableTextFileMaxBytes) {
        return void 0;
      }
      const raw = await safeReadTextFile(input.sourcePath);
      if (raw === void 0) {
        return void 0;
      }
      const relativePath = input.relativeBase
        ? relative(input.relativeBase, input.sourcePath) || basename(input.sourcePath)
        : basename(input.sourcePath);
      return {
        scope: input.scope,
        title: basename(input.sourcePath) || relativePath,
        excerpt: toPlainSummary(raw, 160),
        category: input.category,
        sourcePath: input.sourcePath,
        relativePath,
        updatedAt: meta.mtime.toISOString(),
        size: meta.size,
        facetKey: input.facetKey,
        facetLabel: input.facetLabel,
      };
    } catch {
      return void 0;
    }
  }

  async function listEditableMemoryFiles() {
    const output = [];
    const seen = new Set();
    const mainFacetKey = "main";
    const agentScopes = await loadEditableAgentScopes();
    const mainFacetLabel =
      agentScopes.find((scope) => scope.facetKey === mainFacetKey)?.facetLabel ?? defaultPrimaryOperatorDisplayName;
    const append = async (entry) => {
      if (!entry) return;
      const key = `${entry.facetKey ?? ""}::${resolve(entry.sourcePath)}`;
      if (seen.has(key)) return;
      seen.add(key);
      output.push(entry);
    };

    const mainRootFiles = [join(openclawWorkspaceRoot, "MEMORY.md")];
    for (const candidateFile of mainRootFiles) {
      await append(
        await buildEditableFileEntry({
          scope: "memory",
          category: `${mainFacetLabel} 长期记忆`,
          sourcePath: candidateFile,
          relativeBase: openclawWorkspaceRoot,
          facetKey: mainFacetKey,
          facetLabel: mainFacetLabel,
        }),
      );
    }

    const mainMemoryFiles = await listFileEntries(join(openclawWorkspaceRoot, "memory"));
    for (const file of mainMemoryFiles) {
      const ext = extname(file.name).toLowerCase();
      if (!memoryEditableExtensions.has(ext)) {
        continue;
      }
      await append(
        await buildEditableFileEntry({
          scope: "memory",
          category: `${mainFacetLabel} 记忆记录`,
          sourcePath: file.path,
          relativeBase: openclawWorkspaceRoot,
          facetKey: mainFacetKey,
          facetLabel: mainFacetLabel,
        }),
      );
    }

    for (const scope of agentScopes) {
      if (scope.facetKey === "main") {
        continue;
      }
      for (const fileName of ["MEMORY.md"]) {
        await append(
          await buildEditableFileEntry({
            scope: "memory",
            category: `${scope.facetLabel} 长期记忆`,
            sourcePath: join(scope.workspaceRoot, fileName),
            relativeBase: openclawWorkspaceRoot,
            facetKey: scope.facetKey,
            facetLabel: scope.facetLabel,
          }),
        );
      }
      const agentMemoryFiles = await listFileEntries(join(scope.workspaceRoot, "memory"));
      for (const file of agentMemoryFiles) {
        const ext = extname(file.name).toLowerCase();
        if (!memoryEditableExtensions.has(ext)) {
          continue;
        }
        await append(
          await buildEditableFileEntry({
            scope: "memory",
            category: `${scope.facetLabel} 记忆记录`,
            sourcePath: file.path,
            relativeBase: openclawWorkspaceRoot,
            facetKey: scope.facetKey,
            facetLabel: scope.facetLabel,
          }),
        );
      }
    }

    return output.sort(
      (a, b) =>
        (a.facetKey === "main" ? -1 : b.facetKey === "main" ? 1 : (a.facetLabel ?? "").localeCompare(b.facetLabel ?? "", "zh-Hans-CN")) ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.relativePath.localeCompare(b.relativePath, "zh-Hans-CN"),
    );
  }

  async function listMemoryFacetOptions() {
    const scopes = await loadEditableAgentScopes();
    return scopes.map((scope) => ({ key: scope.facetKey, label: scope.facetLabel }));
  }

  async function listWorkspaceFacetOptions() {
    const scopes = await loadEditableAgentScopes();
    return scopes.map((scope) => ({ key: scope.facetKey, label: scope.facetLabel }));
  }

  function documentFilePriority(relativePath) {
    const fileName = basename(relativePath).toLowerCase();
    const order = [
      "agents.md",
      "identity.md",
      "soul.md",
      "user.md",
      "tasks.md",
      "bootstrap.md",
      "heartbeat.md",
      "tools.md",
      "readme.md",
      "notebook.md",
      "focus.md",
      "inbox.md",
      "routines.md",
      "learnings.md",
    ];
    const index = order.indexOf(fileName);
    return index === -1 ? order.length + 1 : index;
  }

  async function listEditableWorkspaceFiles() {
    const output = [];
    const seen = new Set();
    const agentScopes = await loadEditableAgentScopes();
    const mainFacetLabel =
      agentScopes.find((scope) => scope.facetKey === "main")?.facetLabel ?? defaultPrimaryOperatorDisplayName;
    const append = async (entry) => {
      if (!entry) return;
      const key = `${entry.facetKey ?? ""}::${resolve(entry.sourcePath)}`;
      if (seen.has(key)) return;
      seen.add(key);
      output.push(entry);
    };

    for (const relativePath of sharedDocumentFileCandidates) {
      await append(
        await buildEditableFileEntry({
          scope: "workspace",
          category: `${mainFacetLabel} 核心文档`,
          sourcePath: join(openclawWorkspaceRoot, relativePath),
          relativeBase: openclawWorkspaceRoot,
          facetKey: "main",
          facetLabel: mainFacetLabel,
        }),
      );
    }

    for (const scope of agentScopes) {
      if (scope.facetKey === "main") {
        continue;
      }
      for (const fileName of agentDocumentFileCandidates) {
        await append(
          await buildEditableFileEntry({
            scope: "workspace",
            category: `${scope.facetLabel} 核心文档`,
            sourcePath: join(scope.workspaceRoot, fileName),
            relativeBase: openclawWorkspaceRoot,
            facetKey: scope.facetKey,
            facetLabel: scope.facetLabel,
          }),
        );
      }
    }

    return output.sort((a, b) => {
      const facetA = a.facetLabel ?? "";
      const facetB = b.facetLabel ?? "";
      if (facetA !== facetB) {
        if (facetA === defaultPrimaryOperatorDisplayName) return -1;
        if (facetB === defaultPrimaryOperatorDisplayName) return 1;
        return facetA.localeCompare(facetB, "zh-Hans-CN");
      }
      const priority = documentFilePriority(a.relativePath) - documentFilePriority(b.relativePath);
      if (priority !== 0) return priority;
      return a.relativePath.localeCompare(b.relativePath, "zh-Hans-CN");
    });
  }

  async function listEditableRuntimeFiles() {
    const entry = await buildEditableFileEntry({
      scope: "runtime",
      category: "Runtime budget policy",
      sourcePath: budgetPolicyPath,
      relativeBase: process.cwd(),
    });
    if (entry) {
      return [entry];
    }
    const initialContent = buildRuntimeBudgetPolicyStarterContent();
    const relativePath = relative(process.cwd(), budgetPolicyPath) || join("runtime", "budgets.json");
    return [
      {
        scope: "runtime",
        title: basename(budgetPolicyPath) || "budgets.json",
        excerpt: toPlainSummary(initialContent, 160),
        category: "Runtime budget policy",
        sourcePath: budgetPolicyPath,
        relativePath,
        updatedAt: "-",
        size: Buffer.byteLength(initialContent, "utf8"),
        initialContent,
      },
    ];
  }

  async function listEditableFiles(scope) {
    if (scope === "memory") return listEditableMemoryFiles();
    if (scope === "workspace") return listEditableWorkspaceFiles();
    return listEditableRuntimeFiles();
  }

  function buildMainEditableAgentScope(facetLabel = defaultPrimaryOperatorDisplayName) {
    return { agentId: "main", facetKey: "main", facetLabel, workspaceRoot: openclawWorkspaceRoot };
  }

  function compareEditableAgentScopes(a, b) {
    if (a.facetKey === "main") return -1;
    if (b.facetKey === "main") return 1;
    return a.facetLabel.localeCompare(b.facetLabel, "zh-Hans-CN");
  }

  function ensureMainEditableAgentScope(scopes) {
    if (scopes.some((scope) => scope.facetKey === "main")) {
      return scopes;
    }
    return [buildMainEditableAgentScope(), ...scopes];
  }

  function resolveConfiguredAgentDisplayName(row, rawId) {
    const identity = asObject(row.identity);
    const configuredName = asString(row.name)?.trim() || asString(identity?.name)?.trim();
    return humanizeOperatorDisplayName(configuredName || rawId) ?? humanizeOperatorLabel(rawId);
  }

  function resolveConfiguredWorkspaceRoot(rawWorkspace, agentId) {
    const workspace = rawWorkspace?.trim();
    if (workspace) {
      return resolve(openclawConfigDir, workspace);
    }
    return join(openclawWorkspaceRoot, "agents", agentId);
  }

  function resolveEditableAgentScopesFromConfig(input) {
    const root = asObject(input);
    const agents = asObject(root?.agents);
    const list = asArray(agents?.list);
    const output = [];
    const seen = new Set();
    for (const item of list) {
      const row = asObject(item);
      if (!row) continue;
      const rawId = asString(row.id)?.trim() ?? asString(row.name)?.trim() ?? "";
      const facetKey = normalizeLookupKey(rawId);
      if (!rawId || !facetKey || seen.has(facetKey)) {
        continue;
      }
      seen.add(facetKey);
      const workspaceRoot =
        facetKey === "main" ? openclawWorkspaceRoot : resolveConfiguredWorkspaceRoot(asString(row.workspace)?.trim(), rawId);
      output.push({
        agentId: rawId,
        facetKey,
        facetLabel: resolveConfiguredAgentDisplayName(row, rawId),
        workspaceRoot,
      });
    }
    return ensureMainEditableAgentScope(output).sort(compareEditableAgentScopes);
  }

  function resolveEditableAgentScopesFromConfigText(raw) {
    if (!raw?.trim()) {
      return { status: "config_missing", scopes: [] };
    }
    try {
      const scopes = resolveEditableAgentScopesFromConfig(JSON.parse(raw));
      return {
        status: scopes.length > 0 ? "configured" : "config_invalid",
        scopes: scopes.length > 0 ? scopes : [buildMainEditableAgentScope()],
      };
    } catch {
      return { status: "config_invalid", scopes: [buildMainEditableAgentScope()] };
    }
  }

  function resolveEditableAgentScopesFromWorkspaceAgentIds(agentIds) {
    const seen = new Set(["main"]);
    const scopes = [buildMainEditableAgentScope()];
    for (const rawId of agentIds) {
      const agentId = rawId.trim();
      const facetKey = normalizeLookupKey(agentId);
      if (!agentId || !facetKey || seen.has(facetKey)) {
        continue;
      }
      seen.add(facetKey);
      scopes.push({
        agentId,
        facetKey,
        facetLabel: humanizeOperatorLabel(agentId),
        workspaceRoot: join(openclawWorkspaceRoot, "agents", agentId),
      });
    }
    return scopes.sort(compareEditableAgentScopes);
  }

  async function loadEditableAgentScopesFromConfig() {
    const raw = await safeReadTextFile(openclawConfigPath);
    if (!raw?.trim()) {
      return { status: "config_missing", scopes: [] };
    }
    try {
      const scopes = resolveEditableAgentScopesFromConfig(JSON.parse(raw));
      return {
        status: scopes.length > 0 ? "configured" : "config_invalid",
        scopes: scopes.length > 0 ? scopes : [buildMainEditableAgentScope()],
      };
    } catch {
      return { status: "config_invalid", scopes: [buildMainEditableAgentScope()] };
    }
  }

  async function loadEditableAgentScopesFromWorkspaceDirs() {
    const output = [buildMainEditableAgentScope()];
    const seen = new Set(["main"]);
    const agentsRoot = join(openclawWorkspaceRoot, "agents");
    try {
      const agentDirs = await fs.readdir(agentsRoot, { withFileTypes: true });
      for (const row of agentDirs) {
        if (!row.isDirectory()) continue;
        const agentId = row.name.trim();
        const facetKey = normalizeLookupKey(agentId);
        if (!agentId || !facetKey || seen.has(facetKey)) continue;
        seen.add(facetKey);
        output.push({
          agentId,
          facetKey,
          facetLabel: humanizeOperatorLabel(agentId),
          workspaceRoot: join(agentsRoot, agentId),
        });
      }
    } catch {}
    return output.sort(compareEditableAgentScopes);
  }

  async function loadEditableAgentScopes() {
    const configured = await loadEditableAgentScopesFromConfig();
    if (configured.status === "configured" && configured.scopes.length > 0) {
      return configured.scopes;
    }
    if (configured.status === "config_invalid") {
      return [buildMainEditableAgentScope()];
    }
    return loadEditableAgentScopesFromWorkspaceDirs();
  }

  function resolveEditableAgentScopesWithFallbackForSmoke(input) {
    const configured = resolveEditableAgentScopesFromConfigText(input.configText);
    if (configured.status === "configured" && configured.scopes.length > 0) {
      return configured.scopes;
    }
    if (configured.status === "config_invalid") {
      return [buildMainEditableAgentScope()];
    }
    return resolveEditableAgentScopesFromWorkspaceAgentIds(input.workspaceAgentIds ?? []);
  }

  async function resolveEditableFileEntry(scope, sourcePath) {
    const target = resolve(sourcePath);
    const entries = await listEditableFiles(scope);
    return entries.find((entry) => resolve(entry.sourcePath) === target);
  }

  async function readEditableFile(scope, sourcePath) {
    const entry = await resolveEditableFileEntry(scope, sourcePath);
    if (!entry) {
      return void 0;
    }
    const content = await safeReadTextFile(entry.sourcePath);
    if (content !== void 0) {
      return { entry, content };
    }
    if (entry.initialContent !== void 0) {
      return { entry, content: entry.initialContent };
    }
    return void 0;
  }

  async function writeEditableFileContent(scope, sourcePath, content) {
    const entry = await resolveEditableFileEntry(scope, sourcePath);
    if (!entry) {
      return void 0;
    }
    await fs.mkdir(dirname(entry.sourcePath), { recursive: true });
    await fs.writeFile(entry.sourcePath, content, "utf8");
    const saved = await readEditableFile(scope, entry.sourcePath);
    if (saved) {
      return saved;
    }
    return {
      entry: {
        ...entry,
        excerpt: toPlainSummary(content, 160),
        updatedAt: new Date().toISOString(),
        size: Buffer.byteLength(content, "utf8"),
        initialContent: void 0,
      },
      content,
    };
  }

  async function renderEditableFileWorkbench(input) {
    const t = (en, zh) => pickUiText(input.language, en, zh);
    const localizeFacetLabel = (label) => {
      const value = label?.trim() ?? "";
      if (!value) return "";
      if (value === "\u5171\u4eab") return t("Shared", "\u5171\u4eab");
      return value;
    };
    const localizeCategoryLabel = (value) => {
      const trimmed = value.trim();
      if (!trimmed) return value;
      if (trimmed === "\u5171\u4eab\u6587\u6863") return t("Shared docs", "\u5171\u4eab\u6587\u6863");
      if (
        trimmed === `Main \u957f\u671f\u8bb0\u5fc6` ||
        trimmed === `${defaultPrimaryOperatorDisplayName} \u957f\u671f\u8bb0\u5fc6`
      ) {
        return t(
          `${defaultPrimaryOperatorDisplayName} long-term memory`,
          `${defaultPrimaryOperatorDisplayName} \u957f\u671f\u8bb0\u5fc6`,
        );
      }
      if (
        trimmed === `Main \u8bb0\u5fc6\u8bb0\u5f55` ||
        trimmed === `${defaultPrimaryOperatorDisplayName} \u8bb0\u5fc6\u8bb0\u5f55`
      ) {
        return t(
          `${defaultPrimaryOperatorDisplayName} memory log`,
          `${defaultPrimaryOperatorDisplayName} \u8bb0\u5fc6\u8bb0\u5f55`,
        );
      }
      if (trimmed.endsWith(" \u957f\u671f\u8bb0\u5fc6")) {
        return `${trimmed.slice(0, -5)} ${t("long-term memory", "\u957f\u671f\u8bb0\u5fc6")}`;
      }
      if (trimmed.endsWith(" \u8bb0\u5fc6\u8bb0\u5f55")) {
        return `${trimmed.slice(0, -5)} ${t("memory log", "\u8bb0\u5fc6\u8bb0\u5f55")}`;
      }
      if (trimmed.endsWith(" \u6838\u5fc3\u6587\u6863")) {
        return `${trimmed.slice(0, -5)} ${t("core docs", "\u6838\u5fc3\u6587\u6863")}`;
      }
      return trimmed;
    };
    if (input.entries.length === 0) {
      return `<section class="card">
      <h2>${escapeHtml(input.title)}</h2>
      <div class="meta">${escapeHtml(input.description)}</div>
      <div class="empty-state">${escapeHtml(input.emptyMessage)}</div>
    </section>`;
    }
    const normalizeFacetKey = (value) => (value ?? "all").trim().toLowerCase();
    const discoveredFacetOptions = input.entries
      .filter((entry) => entry.facetKey && entry.facetLabel)
      .reduce((acc, entry) => {
        if (!entry.facetKey || !entry.facetLabel) return acc;
        const key = normalizeFacetKey(entry.facetKey);
        if (!key) return acc;
        if (acc.some((item) => item.key === key)) return acc;
        acc.push({ key, label: entry.facetLabel });
        return acc;
      }, []);
    const facetOptions = [...(input.facetOptions ?? []), ...discoveredFacetOptions]
      .reduce((acc, item) => {
        const key = normalizeFacetKey(item.key);
        const label = item.label?.trim();
        if (!key || !label) return acc;
        if (acc.some((entry) => entry.key === key)) return acc;
        acc.push({ key, label });
        return acc;
      }, [])
      .sort((a, b) => {
        if (a.key === "main") return -1;
        if (b.key === "main") return 1;
        if (a.key === "shared") return -1;
        if (b.key === "shared") return 1;
        return a.label.localeCompare(b.label, "zh-Hans-CN");
      });
    const requestedDefaultFacet = normalizeFacetKey(input.defaultFacetKey);
    const defaultFacetKey =
      requestedDefaultFacet && facetOptions.some((item) => item.key === requestedDefaultFacet)
        ? requestedDefaultFacet
        : input.includeAllFacet === false
          ? (facetOptions[0]?.key ?? "all")
          : "all";
    const firstEntry =
      input.entries.find((entry) => normalizeFacetKey(entry.facetKey) === defaultFacetKey) ?? input.entries[0];
    const initialContent = (await safeReadTextFile(firstEntry.sourcePath)) ?? firstEntry.initialContent ?? "";
    const facetSwitcherHtml =
      facetOptions.length <= 1
        ? ""
        : `<div class="segment-switch file-facet-switch" data-file-facet-switch>
          ${
            input.includeAllFacet === false
              ? ""
              : `<button class="segment-item${defaultFacetKey === "all" ? " active" : ""}" type="button" data-file-facet="all">${escapeHtml(t("All", "\u5168\u90e8"))}</button>`
          }
          ${facetOptions
            .map(
              (item) =>
                `<button class="segment-item${defaultFacetKey === item.key ? " active" : ""}" type="button" data-file-facet="${escapeHtml(item.key)}">${escapeHtml(localizeFacetLabel(item.label))}</button>`,
            )
            .join("")}
        </div>`;
    const writesEnabled = !localTokenAuthRequired || (localApiToken !== "" && input.localMutationUnlock);
    const tokenHint = !localTokenAuthRequired
      ? t("This environment allows direct save.", "\u5f53\u524d\u73af\u5883\u5141\u8bb8\u76f4\u63a5\u4fdd\u5b58\u3002")
      : localApiToken === ""
        ? t(
            "This machine has not set a safety passcode yet, so saving is blocked for now.",
            "\u8fd9\u53f0\u673a\u5668\u8fd8\u6ca1\u8bbe\u7f6e\u5b89\u5168\u53e3\u4ee4\uff0c\u6240\u4ee5\u8fd9\u91cc\u6682\u65f6\u4e0d\u80fd\u4fdd\u5b58\u3002",
          )
        : input.localMutationUnlock
          ? t(
              "Write access is on. Changes save straight back to the source file.",
              "\u5199\u5165\u89e3\u9501\u5df2\u5f00\u542f\uff0c\u6539\u52a8\u4f1a\u76f4\u63a5\u5199\u56de\u6e90\u6587\u4ef6\u3002",
            )
          : t(
              "Write access is off. Use the top toolbar unlock before editing or saving.",
              "\u5199\u5165\u89e3\u9501\u5df2\u5173\u95ed\uff0c\u8bf7\u5148\u5728\u9876\u90e8\u5de5\u5177\u680f\u5f00\u542f\u540e\u518d\u7f16\u8f91\u6216\u4fdd\u5b58\u3002",
            );
    return `<section class="card">
    <h2>${escapeHtml(input.title)}</h2>
    <div class="meta">${escapeHtml(input.description)}</div>
    <div class="meta">${escapeHtml(t("Files", "\u6587\u4ef6\u6570"))}${escapeHtml(input.language === "en" ? ": " : "\uff1a")}${input.entries.length} \xB7 ${escapeHtml(t("Saving writes directly back to the source file.", "\u4fdd\u5b58\u540e\u76f4\u63a5\u5199\u56de\u6e90\u6587\u4ef6\u3002"))}</div>
    <div class="file-workbench" data-file-editor-root data-scope="${escapeHtml(input.scope)}" data-language="${escapeHtml(input.language)}" data-default-facet="${escapeHtml(defaultFacetKey)}">
      <aside class="file-sidebar">
        <div class="file-sidebar-tools">
          ${facetSwitcherHtml}
          <input class="file-filter-input" type="search" data-file-filter placeholder="${escapeHtml(t("Filter by file name or path...", "\u7b5b\u9009\u6587\u4ef6\u540d\u6216\u8def\u5f84..."))}" />
          <div class="meta" data-file-filter-state></div>
        </div>
        <div class="file-nav" data-file-nav>
          ${input.entries
            .map(
              (entry) =>
                `<button class="file-nav-item${entry.sourcePath === firstEntry.sourcePath ? " active" : ""}" type="button" data-file-item data-source-path="${escapeHtml(entry.sourcePath)}" data-file-facet-key="${escapeHtml(normalizeFacetKey(entry.facetKey))}" data-file-search="${escapeHtml(`${entry.title} ${entry.relativePath} ${entry.category} ${entry.facetLabel ?? ""}`.toLowerCase())}">
                <span class="file-nav-title">${escapeHtml(entry.title)}</span>
                <span class="file-nav-meta">${escapeHtml(entry.facetLabel ? `${localizeFacetLabel(entry.facetLabel)} \xB7 ` : "")}${escapeHtml(localizeCategoryLabel(entry.category))} \xB7 ${escapeHtml(entry.relativePath)}</span>
              </button>`,
            )
            .join("")}
        </div>
      </aside>
      <div class="file-editor-panel">
        <div class="file-editor-head">
          <div>
            <div class="file-editor-title" data-file-title>${escapeHtml(firstEntry.title)}</div>
            <div class="meta" data-file-path>${escapeHtml(firstEntry.sourcePath)}</div>
            <div class="meta" data-file-meta>${escapeHtml(t("Updated", "\u66f4\u65b0\u4e8e"))} ${escapeHtml(firstEntry.updatedAt)} \xB7 ${formatInt(firstEntry.size)} bytes</div>
          </div>
          <div class="toolbar">
            <button class="btn" type="button" data-file-reload>${escapeHtml(t("Reload", "\u91cd\u65b0\u8bfb\u53d6"))}</button>
            <button class="btn" type="button" data-file-save ${writesEnabled ? "" : "disabled"}>${escapeHtml(t("Save changes", "\u4fdd\u5b58\u6539\u52a8"))}</button>
          </div>
        </div>
        <textarea class="file-editor-textarea" data-file-text spellcheck="false" ${writesEnabled ? "" : "readonly"}>${escapeHtml(initialContent)}</textarea>
        <div class="meta" data-file-status>${escapeHtml(tokenHint)}</div>
      </div>
    </div>
  </section>`;
  }

  return {
    applyPrimaryBudgetLimit,
    buildRuntimeBudgetPolicyStarterContent,
    buildSettingsBudgetLimitModel,
    listEditableFiles,
    listFileEntries,
    listMemoryFacetOptions,
    listWorkspaceFacetOptions,
    loadEditableAgentScopes,
    loadEditableAgentScopesFromConfig,
    loadEditableAgentScopesFromWorkspaceDirs,
    normalizeEditableFileScope,
    readEditableFile,
    renderEditableFileWorkbench,
    resolveConfiguredWorkspaceRoot,
    resolveEditableAgentScopesFromConfig,
    resolveEditableAgentScopesWithFallbackForSmoke,
    writeBudgetPolicyConfig,
    writeEditableFileContent,
  };
}

export { createEditableFileHelpers };
