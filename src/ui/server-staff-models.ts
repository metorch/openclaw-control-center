// @ts-nocheck

const {
  collectOpenClawModelOptions,
  OpenClawAgentModelConfigError,
  loadOpenClawAgentModelSnapshot,
  updateOpenClawAgentModelRecord,
} = require("../runtime/openclaw-agent-models");

function createStaffModelHelpers(deps) {
  const {
    agentRootDir,
    asArray,
    asObject,
    asString,
    compareAgentHierarchy,
    createRequestValidationError,
    joinPath,
    openclawConfigPath,
    safeReadTextFile,
  } = deps;

  function buildFallbackMembers(officeRoster) {
    return officeRoster.entries.map((entry) => ({
      agentId: entry.agentId,
      displayName: entry.displayName,
      model: "\u672a\u6807\u6ce8",
      fallbackModel: undefined,
      workspace: "\u672a\u6807\u6ce8",
      toolsProfile: "default",
    }));
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
      const snapshot = await loadOpenClawAgentModelSnapshot(sourcePath);
      const members = snapshot.records.map((member) => ({
        agentId: member.agentId,
        displayName: member.displayName,
        model: member.model,
        fallbackModel: member.fallbackModel,
        workspace: member.workspace,
        toolsProfile: member.toolsProfile,
      }));
      return {
        missionStatement,
        members: members.sort((a, b) => compareAgentHierarchy(a.agentId, b.agentId)),
        sourcePath,
        detail: `\u5df2\u4ece\u5458\u5de5\u914d\u7f6e\u6587\u4ef6\u8bfb\u53d6 ${members.length} \u540d\u5458\u5de5\u3002`,
        modelOptions: snapshot.modelOptions.length
          ? snapshot.modelOptions
          : collectOpenClawModelOptions(parsed, members.flatMap((item) =>
              [item.model, item.fallbackModel].filter((value) => Boolean(value)),
            )),
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

  async function updateOpenClawAgentModel(agentId, input, fallbackModel) {
    try {
      const payload =
        input && typeof input === "object"
          ? {
              model: asString(input.model)?.trim() || "",
              fallbackModel: asString(input.fallbackModel)?.trim() || undefined,
            }
          : {
              model: String(input || "").trim(),
              fallbackModel: String(fallbackModel || "").trim() || undefined,
            };
      return await updateOpenClawAgentModelRecord(agentId, payload, openclawConfigPath);
    } catch (error) {
      if (error instanceof OpenClawAgentModelConfigError) {
        const statusCode =
          error.code === "NOT_FOUND" || error.code === "INVALID_AGENT"
            ? 404
            : error.code === "INVALID_MODEL"
              ? 400
              : 500;
        throw createRequestValidationError(error.message, statusCode);
      }
      throw error;
    }
  }

  return {
    collectOpenClawModelOptions,
    loadTeamSnapshot,
    updateOpenClawAgentModel,
  };
}

export { createStaffModelHelpers };
