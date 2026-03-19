// @ts-nocheck

const { promises: fs } = require("node:fs");

function createStaffModelHelpers(deps) {
  const {
    agentRootDir,
    asArray,
    asObject,
    asString,
    compareAgentHierarchy,
    createRequestValidationError,
    humanizeOperatorDisplayName,
    joinPath,
    normalizeLookupKey,
    openclawConfigPath,
    safeReadTextFile,
  } = deps;

  function buildFallbackMembers(officeRoster) {
    return officeRoster.entries.map((entry) => ({
      agentId: entry.agentId,
      displayName: entry.displayName,
      model: "\u672a\u6807\u6ce8",
      workspace: "\u672a\u6807\u6ce8",
      toolsProfile: "default",
    }));
  }

  function collectOpenClawModelOptions(configRoot, currentModels = []) {
    const merged = new Map();
    const register = (value, label) => {
      const normalized = value?.trim();
      if (!normalized || merged.has(normalized)) {
        return;
      }
      merged.set(normalized, {
        value: normalized,
        label: label?.trim() ? label.trim() : normalized,
      });
    };

    const agentsRoot = asObject(configRoot.agents);
    const defaults = asObject(agentsRoot?.defaults);
    const defaultModel = asString(asObject(defaults?.model)?.primary);
    register(defaultModel, defaultModel);

    const configuredModels = asObject(defaults?.models);
    for (const [key, rawValue] of Object.entries(configuredModels ?? {})) {
      const modelConfig = asObject(rawValue);
      const alias = asString(modelConfig?.alias);
      register(key, alias ? `${alias} \xb7 ${key}` : key);
    }

    const providers = asObject(asObject(configRoot.models)?.providers);
    for (const [providerKey, rawProvider] of Object.entries(providers ?? {})) {
      const provider = asObject(rawProvider);
      for (const rawModel of asArray(provider?.models)) {
        const model = asObject(rawModel);
        const modelId = asString(model?.id)?.trim();
        if (!modelId) {
          continue;
        }
        const name = asString(model?.name)?.trim();
        const value = `${providerKey}/${modelId}`;
        register(value, name ? `${name} \xb7 ${value}` : value);
      }
    }

    for (const currentModel of currentModels) {
      register(currentModel, currentModel);
    }

    return [...merged.values()].sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"));
  }

  async function loadTeamSnapshot(officeRoster) {
    const sourcePath = openclawConfigPath;
    const fallbackMission =
      "\u6784\u5efa\u53ef\u6301\u7eed\u81ea\u6cbb\u7684 AI \u5458\u5de5\u4f53\u7cfb\uff0c\u6301\u7eed\u5b8c\u6210\u9ad8\u4ef7\u503c\u4efb\u52a1\u3002";
    const missionFromAgentDoc = await safeReadTextFile(joinPath(agentRootDir, "AGENTS.md"));
    const missionLine = missionFromAgentDoc
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("- ") && line.toLowerCase().includes("objective"))
      ?.replace(/^-+\s*/, "")
      .trim();
    const missionStatement = missionLine && missionLine.length > 8 ? missionLine : fallbackMission;
    const raw = await safeReadTextFile(sourcePath);
    if (!raw) {
      return {
        missionStatement,
        members: buildFallbackMembers(officeRoster),
        sourcePath,
        detail: "\u5458\u5de5\u914d\u7f6e\u6587\u4ef6\u672a\u627e\u5230\uff0c\u5df2\u56de\u9000\u4e3a\u8fd0\u884c\u65f6\u5458\u5de5\u540d\u5f55\u3002",
        modelOptions: [],
        modelEditable: false,
      };
    }

    try {
      const parsed = JSON.parse(raw);
      const agentsRoot = parsed.agents;
      const defaults = agentsRoot?.defaults ?? {};
      const defaultModel = defaults.model?.primary;
      const list = Array.isArray(agentsRoot?.list) ? agentsRoot.list : [];
      const members = [];
      for (const item of list) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const obj = item;
        const identity = obj.identity ?? {};
        const id = typeof obj.id === "string" ? obj.id.trim() : "";
        if (!id) {
          continue;
        }
        const tools = obj.tools ?? {};
        members.push({
          agentId: id,
          displayName:
            (typeof obj.name === "string" && obj.name.trim()) ||
            (typeof identity.name === "string" && identity.name.trim()) ||
            id,
          model:
            (typeof obj.model === "string" && obj.model.trim()) ||
            (typeof defaultModel === "string" ? defaultModel : "\u672a\u6807\u6ce8"),
          workspace: (typeof obj.workspace === "string" && obj.workspace.trim()) || "\u672a\u6807\u6ce8",
          toolsProfile: (typeof tools.profile === "string" && tools.profile.trim()) || "default",
        });
      }
      return {
        missionStatement,
        members: members.sort((a, b) => compareAgentHierarchy(a.agentId, b.agentId)),
        sourcePath,
        detail: `\u5df2\u4ece\u5458\u5de5\u914d\u7f6e\u6587\u4ef6\u8bfb\u53d6 ${members.length} \u540d\u5458\u5de5\u3002`,
        modelOptions: collectOpenClawModelOptions(
          parsed,
          members.map((item) => item.model),
        ),
        modelEditable: true,
      };
    } catch {
      return {
        missionStatement,
        members: buildFallbackMembers(officeRoster),
        sourcePath,
        detail: "\u5458\u5de5\u914d\u7f6e\u6587\u4ef6\u89e3\u6790\u5931\u8d25\uff0c\u5df2\u56de\u9000\u4e3a\u8fd0\u884c\u65f6\u5458\u5de5\u540d\u5f55\u3002",
        modelOptions: [],
        modelEditable: false,
      };
    }
  }

  async function updateOpenClawAgentModel(agentId, model) {
    let raw;
    try {
      raw = await fs.readFile(openclawConfigPath, "utf8");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        throw createRequestValidationError("openclaw.json not found.", 404);
      }
      throw error;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw createRequestValidationError("openclaw.json could not be parsed.", 500);
    }

    const agentsRoot = asObject(parsed.agents);
    const list = asArray(agentsRoot?.list);
    const normalizedAgentId = normalizeLookupKey(agentId);
    const normalizedModel = model.trim();
    const currentModels = list
      .map((item) => asString(asObject(item)?.model)?.trim() ?? "")
      .filter(Boolean);
    const modelOptions = collectOpenClawModelOptions(parsed, currentModels.concat(normalizedModel));
    const allowedModels = new Set(modelOptions.map((item) => item.value));
    if (!allowedModels.has(normalizedModel)) {
      throw createRequestValidationError("model must be one of the configured OpenClaw models.", 400);
    }

    for (const item of list) {
      const row = asObject(item);
      if (!row) {
        continue;
      }
      const rawId = asString(row.id)?.trim() ?? asString(row.name)?.trim() ?? "";
      if (normalizeLookupKey(rawId) !== normalizedAgentId) {
        continue;
      }
      row.model = normalizedModel;
      const identity = asObject(row.identity);
      const tools = asObject(row.tools);
      await fs.writeFile(openclawConfigPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
      return {
        agentId: rawId,
        displayName:
          humanizeOperatorDisplayName(asString(row.name)?.trim() || asString(identity?.name)?.trim() || rawId) || rawId,
        model: normalizedModel,
        workspace: asString(row.workspace)?.trim() || "\u672a\u6807\u6ce8",
        toolsProfile: asString(tools?.profile)?.trim() || "default",
        configPath: openclawConfigPath,
        modelOptions,
      };
    }

    return void 0;
  }

  return {
    collectOpenClawModelOptions,
    loadTeamSnapshot,
    updateOpenClawAgentModel,
  };
}

export { createStaffModelHelpers };
