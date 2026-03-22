import assert from "node:assert/strict";
import test from "node:test";
import { createCollaborationThreadHelpers } from "../src/ui/server-collaboration-threads";

function buildHelper() {
  return createCollaborationThreadHelpers({
    buildSessionDetailHref: () => "",
    deriveAgentAnimalIdentity: () => ({ accent: "#4f6ff0" }),
    executionChainCardTitle: (item: { title?: string }) => item.title ?? "",
    executionChainSourceLabel: () => "",
    extractAgentIdFromSessionKey: () => undefined,
    formatTimeAgoFromNow: () => "just now",
    humanizeOperatorLabel: (agentId: string) => agentId,
    looksLikeStructuredExecutionTitle: (input: string) =>
      /(?:isolated execution|隔离执行|linked task|关联任务)/i.test(String(input || "")),
    normalizeInlineText: (value: string) => String(value || "").replace(/\s+/g, " ").trim(),
    normalizeLookupKey: (value: string) => String(value || "").trim().toLowerCase(),
    pickLatestTimestamp: (values: Array<string | undefined>) =>
      values.filter(Boolean).sort().at(-1),
    pickUiText: (language: string, english: string, chinese: string) =>
      language === "zh" ? chinese : english,
    safeTruncate: (value: string, maxLength: number) => String(value || "").slice(0, maxLength),
    summarizeStructuredSessionPayload: () => "结构化摘要",
    summarizeVisibleSessionSnippet: (value: string) => String(value || "").trim(),
    toSortableMs: (value: string | undefined) => (value ? Date.parse(value) || 0 : 0),
  });
}

test("extractCollaborationTaskLabel understands Chinese task markers and brackets", () => {
  const helper = buildHelper();

  assert.equal(
    helper.extractCollaborationTaskLabel("任务：整理成都 4 月 4 日天气 HTML 附件并发给我", "zh"),
    "整理成都 4 月 4 日天气 HTML 附件并发给我",
  );
  assert.equal(
    helper.extractCollaborationTaskLabel("【天气附件】生成一个可直接打开的 html 页面", "zh"),
    "天气附件",
  );
});

test("deriveCollaborationTaskTitle falls back from generic Chinese mapped titles", () => {
  const helper = buildHelper();

  assert.equal(
    helper.deriveCollaborationTaskTitle({
      card: {
        title: "隔离执行",
        latestSnippet: "任务：把成都天气整理成 html 文件并发给我",
        executionChain: { detail: "" },
        taskTitle: "",
      },
      parentSession: { label: "目标：输出成都天气 HTML 附件" },
      childSession: undefined,
      language: "zh",
    }),
    "输出成都天气 HTML 附件",
  );
});
