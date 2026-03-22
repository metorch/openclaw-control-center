import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

import type { CollaborationAttachmentRecord } from "../src/runtime/collaboration-room";

function trimPreviewText(input: string): string | undefined {
  const normalized = String(input || "").replace(/\r/g, "").trim();
  return normalized ? normalized.slice(0, 2400) : undefined;
}

async function loadRealTextAttachment(
  relativePath: string,
  contentType: string,
): Promise<CollaborationAttachmentRecord> {
  const storedPath = resolve(relativePath);
  const content = await readFile(storedPath, "utf8");
  return {
    attachmentId: `att-${basename(storedPath)}`,
    fileName: basename(storedPath),
    contentType,
    sizeBytes: Buffer.byteLength(content),
    storedPath,
    relativeStoredPath: basename(storedPath),
    sourceLocalPath: storedPath,
    kind: "text",
    uploadedAt: "2026-03-19T09:00:00.000Z",
    uploadedBy: "user",
    previewText: trimPreviewText(content),
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBytes(value: unknown): string {
  return `${Number(value || 0)} B`;
}

async function createPreviewRenderer() {
  const { renderCollaborationChatScriptRendering } = await import(
    "../src/ui/collaboration-chat-widget-script-rendering"
  );
  const sandbox: Record<string, unknown> = {
    embeddedLanguage: "en",
    labels: {
      preview: "Preview",
      openFile: "Open file",
      save: "Save",
    },
    escapeHtml,
    formatBytes,
    state: {
      attachmentIndex: new Map(),
    },
  };
  const script = `${renderCollaborationChatScriptRendering({ language: "en" } as never)}
this.__collabPreviewTest = { attachmentPreviewMode, renderAttachmentTextPreview, renderAttachments };`;
  runInNewContext(script, sandbox);
  return sandbox.__collabPreviewTest as {
    attachmentPreviewMode: (attachment: CollaborationAttachmentRecord) => string;
    renderAttachmentTextPreview: (attachment: CollaborationAttachmentRecord) => string;
    renderAttachments: (attachments: Array<CollaborationAttachmentRecord & { contentHref: string }>) => string;
  };
}

function createChatHelperDeps() {
  return {
    pickUiText: (language: string, en: string, zh: string) => (language === "zh" ? zh : en),
    normalizeLookupKey: (value: unknown) => String(value ?? "").trim().toLowerCase(),
    sanitizeCollaborationDisplayText: (value: unknown) =>
      String(value ?? "")
        .replace(/<openclaw_coordination>[\s\S]*?<\/openclaw_coordination>/gi, " ")
        .replace(/^\[\[reply_to_current\]\]\s*/i, "")
        .replace(/<stage_result[\s\S]*?<\/stage_result>/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    safeTruncate: (value: unknown, maxLength: number) => {
      const text = String(value ?? "").trim();
      return text.length <= maxLength ? text : text.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "...";
    },
    formatBytesCompact: (value: unknown) => `${Number(value || 0)}B`,
  };
}

test("real repository attachments render rich previews for html, markdown, and code", async () => {
  const previewRenderer = await createPreviewRenderer();
  const htmlAttachment = await loadRealTextAttachment("runtime/design-ref/flat-design.html", "text/html");
  const markdownAttachment = await loadRealTextAttachment("docs/ARCHITECTURE.md", "text/markdown");
  const codeAttachment = await loadRealTextAttachment("src/clients/tool-client.ts", "text/plain");

  assert.equal(previewRenderer.attachmentPreviewMode(htmlAttachment), "html");
  assert.equal(previewRenderer.attachmentPreviewMode(markdownAttachment), "markdown");
  assert.equal(previewRenderer.attachmentPreviewMode(codeAttachment), "code");

  const htmlMarkup = previewRenderer.renderAttachments([
    { ...htmlAttachment, contentHref: "/attachments/flat-design.html" },
  ]);
  assert.match(htmlMarkup, /collab-chat-rich-preview is-html/);
  assert.match(htmlMarkup, /data-open-attachment/);
  assert.match(htmlMarkup, /Open page/);
  assert.match(htmlMarkup, /View source snippet/);
  assert.match(htmlMarkup, /Design Prompts - AI-Powered Design Style Explorer/);
  assert.doesNotMatch(htmlMarkup, /sourceLocalPath/);
  assert.doesNotMatch(htmlMarkup, new RegExp(htmlAttachment.sourceLocalPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const markdownMarkup = previewRenderer.renderAttachmentTextPreview(markdownAttachment);
  assert.match(markdownMarkup, /collab-chat-rich-preview is-markdown/);
  assert.match(markdownMarkup, /Architecture \(Official-First\)/);
  assert.match(markdownMarkup, /View markdown snippet/);
  assert.match(markdownMarkup, /Core Principle/);

  const codeMarkup = previewRenderer.renderAttachmentTextPreview(codeAttachment);
  assert.match(codeMarkup, /collab-chat-rich-preview is-code/);
  assert.match(codeMarkup, /Code preview/);
  assert.match(codeMarkup, /interface ToolClient/);
  assert.match(codeMarkup, /ReadonlyToolClient/);
});

test("real repository attachments are inlined into collaboration prompts as content excerpts", async () => {
  const { createCollaborationChatHelpers } = await import("../src/ui/server-collaboration-chat");
  const helpers = createCollaborationChatHelpers(createChatHelperDeps());
  const htmlAttachment = await loadRealTextAttachment("runtime/design-ref/flat-design.html", "text/html");
  const markdownAttachment = await loadRealTextAttachment("docs/ARCHITECTURE.md", "text/markdown");
  const codeAttachment = await loadRealTextAttachment("src/clients/tool-client.ts", "text/plain");

  const prompt = await helpers.buildCollaborationAgentPromptV2({
    roomId: "room-preview-regression",
    sourceEvent: {
      eventId: "evt-preview-regression",
      sequence: 2,
      message: "Analyze these attachments directly instead of replying with file paths only.",
    },
    targetAgentId: "jarvis",
    targetAgentIds: ["jarvis"],
    attachmentRecords: [htmlAttachment, markdownAttachment, codeAttachment],
    language: "en",
    agentWorkspaceRoot: resolve("."),
    project: {
      projectId: "proj-preview-regression",
      title: "Attachment regression",
    },
    projectMemory: {
      summaryText: "Validate attachment previews and prompt excerpts.",
      files: {
        projectSummaryPath: "runtime/projects.json",
        openTasksPath: "runtime/tasks.json",
        decisionsPath: "runtime/acks.json",
        stageLogPath: "runtime/timeline.log",
      },
    },
    dispatchRecord: {
      taskId: "task-preview-regression",
      stage: "delivery",
      requiredContextRefs: [],
      definitionOfDone: ["Use the attachment content directly."],
      expectedArtifacts: [],
    },
    roomStateOverride: {
      version: 3,
      roomId: "room-preview-regression",
      title: "Attachment regression",
      titleMode: "manual",
      projectId: "proj-preview-regression",
      createdAt: "2026-03-19T09:00:00.000Z",
      lastSequence: 2,
      events: [
        {
          sequence: 1,
          eventId: "evt-preview-earlier",
          type: "user_message",
          createdAt: "2026-03-19T09:00:00.000Z",
          authorRole: "user",
          message: "Use the file contents directly when you review these attachments.",
        },
        {
          sequence: 2,
          eventId: "evt-preview-regression",
          type: "user_message",
          createdAt: "2026-03-19T09:01:00.000Z",
          authorRole: "user",
          message: "Analyze these attachments directly instead of replying with file paths only.",
        },
      ],
      attachments: [],
      sessionBindings: [],
      dispatchRecords: [],
      taskReceipts: [],
      updatedAt: "2026-03-19T09:01:00.000Z",
    },
  });

  assert.match(prompt, /recentCollaborationSummary:/);
  assert.match(prompt, /Use the file contents directly when you review these attachments\./);
  assert.match(prompt, /attachments:/);
  assert.match(prompt, /flat-design\.html \| kind=html/);
  assert.match(prompt, /html_title=Design Prompts - AI-Powered Design Style Explorer/);
  assert.match(prompt, /visible_text=Design Prompts - AI-Powered Design Style Explorer/);
  assert.match(prompt, /source_excerpt:/);
  assert.match(prompt, /ARCHITECTURE\.md \| kind=markdown/);
  assert.match(prompt, /heading=Architecture \(Official-First\)/);
  assert.match(prompt, /markdown_excerpt:/);
  assert.match(prompt, /tool-client\.ts \| kind=code/);
  assert.match(prompt, /code_excerpt:/);
  assert.match(prompt, /interface ToolClient/);
  assert.match(prompt, /treat the inline excerpt above as file-content context before you fall back to opening the local path\./i);
  assert.match(prompt, /operate on the attachment content instead of replying with only the file path\./);
});
