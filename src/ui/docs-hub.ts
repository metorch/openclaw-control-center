import { createHash } from "node:crypto";
import { extname, basename, join, relative, resolve } from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";
import type { ToolClient } from "../clients/tool-client";
import { buildStructuredDocHubFromSessions, type StructuredChatDocEntry, type StructuredDocHubSnapshot } from "../runtime/doc-hub";
import type { ProjectSummary, ReadModelSnapshot } from "../types";
import type { UiLanguage } from "../runtime/ui-preferences";

const CONTROL_CENTER_ROOT = resolve(process.cwd());
const OPENCLAW_WORKSPACE_ROOT = resolve(process.cwd(), "..", "..", "..");
const DOCS_DIR = join(process.cwd(), "docs");
const DOC_HUB_DIR_CANDIDATES = [
  { dir: DOCS_DIR, category: "项目文档" },
  { dir: join(process.cwd(), "runtime", "digests"), category: "日报文档" },
  { dir: join(process.cwd(), "runtime", "evidence"), category: "证据报告" },
] as const;
const DOC_HUB_CHAT_INDEX_PATH = join(process.cwd(), "runtime", "doc-hub-chat.json");
const DOC_PREVIEW_MAX_CHARS = 12_000;

export interface DocEntry {
  docId: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  sourcePath: string;
  updatedAt: string;
  previewTruncated: boolean;
  sourceType: "file" | "chat";
  sourceSessionKey?: string;
  sourceAgentId?: string;
}

export interface DocEntryViewModel {
  docId: string;
  title: string;
  excerpt: string;
  ownerLabel: string;
  sourceLabel: string;
  projectLabel: string;
  freshnessLabel: string;
  relativeLabel: string;
  updatedAt: string;
  sourceType: "file" | "chat";
  previewTruncated: boolean;
}

export interface ProjectDocGroup {
  projectId: string;
  projectTitle: string;
  ownerLabel: string;
  docs: DocEntryViewModel[];
}

export interface AgentDocCoverage {
  facetKey: string;
  facetLabel: string;
  presentCount: number;
  requiredCount: number;
  presentFiles: string[];
  missingFiles: string[];
  presentDocs: Array<{
    fileName: string;
    sourcePath: string;
    relativePath: string;
  }>;
}

export interface DocsAgentScope {
  facetKey: string;
  facetLabel: string;
  workspaceRoot: string;
}

export interface DocsSectionInput {
  language: UiLanguage;
  workspaceFiles: Array<{ facetKey?: string; sourcePath?: string; relativePath?: string }>;
  workspaceFacetOptions: Array<{ key: string; label: string }>;
  projectSummaries: ProjectSummary[];
  agentScopes: DocsAgentScope[];
  docHubSnapshot: StructuredDocHubSnapshot;
  agentTeamDocsBlockHtml: string;
}

const TEAM_CORE_DOCUMENTS = [
  "AGENTS.md",
  "IDENTITY.md",
  "SOUL.md",
  "USER.md",
  "BOOTSTRAP.md",
  "HEARTBEAT.md",
  "TOOLS.md",
] as const;

function pickUiText(language: UiLanguage, en: string, zh: string): string {
  return language === "zh" ? zh : en;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeTruncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  if (maxLength <= 3) return input.slice(0, Math.max(0, maxLength));
  return `${input.slice(0, maxLength - 3)}...`;
}

function normalizeInlineText(input: string): string {
  return input.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function toPlainSummary(input: string, maxLength: number): string {
  const compact = input
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/[#>*_\-\[\]\(\)!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!compact) return "暂无摘要。";
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1)}…`;
}

function extractMarkdownHeading(input: string): string | undefined {
  const line = input
    .split(/\r?\n/)
    .map((row) => row.trim())
    .find((row) => row.startsWith("#"));
  if (!line) return undefined;
  return line.replace(/^#+\s*/, "").trim() || undefined;
}

async function safeReadTextFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

function normalizeEvidenceText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[`*_#>\[\]\(\)!|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLookupKey(input: string): string {
  return input.trim().toLowerCase();
}

function humanizeOperatorLabel(value: string): string {
  const normalized = value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!normalized) return "Unknown";
  return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
}

function toSortableMs(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTimeAgoFromNow(value: string | undefined, language: UiLanguage = "zh"): string {
  const parsed = toSortableMs(value);
  if (!parsed) return pickUiText(language, "time unavailable", "时间未知");
  const diffSeconds = Math.max(0, Math.round((Date.now() - parsed) / 1000));
  if (diffSeconds < 60) return pickUiText(language, "just now", "刚刚");
  if (diffSeconds < 3600) {
    const minutes = Math.max(1, Math.round(diffSeconds / 60));
    return pickUiText(language, `${minutes}m ago`, `${minutes} 分钟前`);
  }
  if (diffSeconds < 86400) {
    const hours = Math.max(1, Math.round(diffSeconds / 3600));
    return pickUiText(language, `${hours}h ago`, `${hours} 小时前`);
  }
  const days = Math.max(1, Math.round(diffSeconds / 86400));
  return pickUiText(language, `${days}d ago`, `${days} 天前`);
}

async function listFileEntries(dir: string): Promise<Array<{ name: string; path: string; updatedAt: string; size: number }>> {
  try {
    const rows = await readdir(dir, { withFileTypes: true });
    const files = rows.filter((row) => row.isFile());
    const result: Array<{ name: string; path: string; updatedAt: string; size: number }> = [];
    for (const file of files) {
      const fullPath = join(dir, file.name);
      try {
        const meta = await stat(fullPath);
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

export async function loadStructuredDocHubSnapshot(
  snapshot: ReadModelSnapshot,
  client: ToolClient,
): Promise<StructuredDocHubSnapshot> {
  return buildStructuredDocHubFromSessions({
    snapshot,
    client,
    indexPath: DOC_HUB_CHAT_INDEX_PATH,
    refreshFromSessions: true,
    maxSessions: 16,
    historyLimit: 120,
    maxDocsPerSession: 2,
    maxStoredDocs: 120,
  });
}

function buildDocPreviewId(sourceType: DocEntry["sourceType"], key: string): string {
  return `${sourceType}-${createHash("sha1").update(`${sourceType}|${key}`).digest("hex").slice(0, 18)}`;
}

function buildDocPreviewContent(raw: string): { content: string; previewTruncated: boolean } {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { content: "", previewTruncated: false };
  }
  const previewTruncated = normalized.length > DOC_PREVIEW_MAX_CHARS;
  return {
    content: previewTruncated ? safeTruncate(normalized, DOC_PREVIEW_MAX_CHARS) : normalized,
    previewTruncated,
  };
}

export async function loadDocHubEntries(chatEntries: StructuredChatDocEntry[] = []): Promise<DocEntry[]> {
  const output: DocEntry[] = [];
  for (const candidate of DOC_HUB_DIR_CANDIDATES) {
    const files = await listFileEntries(candidate.dir);
    for (const file of files.slice(0, 40)) {
      const ext = extname(file.name).toLowerCase();
      if (![".md", ".markdown", ".txt", ".json"].includes(ext)) continue;
      if (file.size > 600 * 1024) continue;
      const raw = await safeReadTextFile(file.path);
      if (!raw) continue;
      const preview = buildDocPreviewContent(raw);
      const title = extractMarkdownHeading(raw) || basename(file.name, ext) || file.name;
      output.push({
        docId: buildDocPreviewId("file", resolve(file.path)),
        title,
        excerpt: toPlainSummary(raw, 180),
        content: preview.content,
        category: candidate.category,
        sourcePath: file.path,
        updatedAt: file.updatedAt,
        previewTruncated: preview.previewTruncated,
        sourceType: "file",
      });
    }
  }
  for (const entry of chatEntries) {
    const preview = buildDocPreviewContent(entry.content);
    output.push({
      docId: buildDocPreviewId("chat", entry.id),
      title: entry.title,
      excerpt: entry.excerpt,
      content: preview.content,
      category: `聊天输出 · ${entry.category}`,
      sourcePath: `/sessions/${encodeURIComponent(entry.sourceSessionKey)}`,
      updatedAt: entry.updatedAt,
      previewTruncated: preview.previewTruncated,
      sourceType: "chat",
      sourceSessionKey: entry.sourceSessionKey,
      sourceAgentId: entry.sourceAgentId,
    });
  }
  return sortDocsNewestFirst(output).slice(0, 120);
}

function sortDocsNewestFirst<T extends { updatedAt: string; title: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title, "zh-Hans-CN"));
}

export function sortDocsNewestFirstForSmoke<T extends { updatedAt: string; title: string }>(entries: T[]): T[] {
  return sortDocsNewestFirst(entries);
}

export async function loadDocPreviewEntry(
  snapshot: ReadModelSnapshot,
  client: ToolClient,
  docId: string,
): Promise<
  | {
      docId: string;
      title: string;
      content: string;
      truncated: boolean;
      sourceType: "file" | "chat";
      updatedAt: string;
    }
  | undefined
> {
  const docHubSnapshot = await loadStructuredDocHubSnapshot(snapshot, client);
  const docEntries = await loadDocHubEntries(docHubSnapshot.items);
  const entry = docEntries.find((item) => item.docId === docId);
  if (!entry) return undefined;
  return {
    docId: entry.docId,
    title: entry.title,
    content: entry.content,
    truncated: entry.previewTruncated,
    sourceType: entry.sourceType,
    updatedAt: entry.updatedAt,
  };
}

function deriveDocRelativeLabel(entry: DocEntry, language: UiLanguage): string {
  if (entry.sourceType === "chat") {
    return pickUiText(language, `Session ${entry.sourceSessionKey ?? "-"}`, `会话 ${entry.sourceSessionKey ?? "-"}`);
  }
  const normalizedPath = resolve(entry.sourcePath);
  if (normalizedPath.startsWith(CONTROL_CENTER_ROOT)) {
    return relative(CONTROL_CENTER_ROOT, normalizedPath) || basename(normalizedPath);
  }
  if (normalizedPath.startsWith(OPENCLAW_WORKSPACE_ROOT)) {
    return relative(OPENCLAW_WORKSPACE_ROOT, normalizedPath) || basename(normalizedPath);
  }
  return basename(normalizedPath);
}

function deriveDocSourceLabel(entry: DocEntry, language: UiLanguage): string {
  if (entry.sourceType === "chat") return pickUiText(language, "Chat-derived note", "聊天沉淀");
  const normalizedPath = resolve(entry.sourcePath);
  if (normalizedPath.startsWith(DOCS_DIR)) return pickUiText(language, "Project doc", "项目文档");
  if (normalizedPath.startsWith(join(process.cwd(), "runtime", "digests"))) {
    return pickUiText(language, "Daily digest", "日报文档");
  }
  if (normalizedPath.startsWith(join(process.cwd(), "runtime", "evidence"))) {
    return pickUiText(language, "Evidence report", "证据报告");
  }
  return pickUiText(language, "Core doc", "核心文档");
}

function deriveDocOwnerLabel(
  entry: DocEntry,
  agentScopes: DocsAgentScope[],
  language: UiLanguage,
): string {
  if (entry.sourceType === "chat" && entry.sourceAgentId?.trim()) {
    const key = normalizeLookupKey(entry.sourceAgentId);
    const scope = agentScopes.find((item) => item.facetKey === key);
    return scope?.facetLabel ?? humanizeOperatorLabel(entry.sourceAgentId);
  }
  const normalizedPath = resolve(entry.sourcePath);
  const matchingScope = agentScopes.find((scope) => normalizedPath.startsWith(resolve(scope.workspaceRoot)));
  if (matchingScope) return matchingScope.facetLabel;
  return pickUiText(language, "Shared", "共享");
}

function matchDocToProject(entry: DocEntry, projects: ProjectSummary[]): { projectId: string; projectTitle: string } | undefined {
  const normalized = normalizeEvidenceText([entry.title, entry.excerpt, entry.category, entry.sourcePath].join(" "));
  let best: { projectId: string; projectTitle: string; score: number } | undefined;
  for (const project of projects) {
    let score = 0;
    const projectIdKey = normalizeEvidenceText(project.projectId);
    const projectTitleKey = normalizeEvidenceText(project.title);
    if (projectIdKey && normalized.includes(projectIdKey)) score += 4;
    if (projectTitleKey && normalized.includes(projectTitleKey)) score += 5;
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { projectId: project.projectId, projectTitle: project.title, score };
    }
  }
  return best ? { projectId: best.projectId, projectTitle: best.projectTitle } : undefined;
}

export function matchDocToProjectForSmoke(entry: DocEntry, projects: ProjectSummary[]): { projectId: string; projectTitle: string } | undefined {
  return matchDocToProject(entry, projects);
}

export function deriveDocSourceLabelForSmoke(entry: DocEntry, language: UiLanguage): string {
  return deriveDocSourceLabel(entry, language);
}

export function deriveDocOwnerLabelForSmoke(entry: DocEntry, agentScopes: DocsAgentScope[], language: UiLanguage): string {
  return deriveDocOwnerLabel(entry, agentScopes, language);
}

export function buildDocEntryViewModels(
  entries: DocEntry[],
  agentScopes: DocsAgentScope[],
  projects: ProjectSummary[],
  language: UiLanguage,
): DocEntryViewModel[] {
  return entries.map((entry) => {
    const projectMatch = matchDocToProject(entry, projects);
    return {
      docId: entry.docId,
      title: entry.title,
      excerpt: entry.excerpt,
      ownerLabel: deriveDocOwnerLabel(entry, agentScopes, language),
      sourceLabel: deriveDocSourceLabel(entry, language),
      projectLabel: projectMatch?.projectTitle ?? pickUiText(language, "General", "通用"),
      freshnessLabel: formatTimeAgoFromNow(entry.updatedAt, language),
      relativeLabel: deriveDocRelativeLabel(entry, language),
      updatedAt: entry.updatedAt,
      sourceType: entry.sourceType,
      previewTruncated: entry.previewTruncated,
    };
  });
}

export function buildProjectDocGroups(
  entries: DocEntry[],
  projects: ProjectSummary[],
  agentScopes: DocsAgentScope[],
  language: UiLanguage,
): ProjectDocGroup[] {
  const buckets = new Map<string, ProjectDocGroup>();
  for (const entry of entries) {
    const match = matchDocToProject(entry, projects);
    if (!match) continue;
    const project = projects.find((item) => item.projectId === match.projectId);
    if (!project) continue;
    const current = buckets.get(project.projectId) ?? {
      projectId: project.projectId,
      projectTitle: project.title,
      ownerLabel: humanizeOperatorLabel(project.owner),
      docs: [],
    };
    current.docs.push(...buildDocEntryViewModels([entry], agentScopes, projects, language));
    buckets.set(project.projectId, current);
  }
  return [...buckets.values()]
    .map((group) => ({
      ...group,
      docs: group.docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
    }))
    .sort((a, b) => b.docs.length - a.docs.length || a.projectTitle.localeCompare(b.projectTitle, "zh-Hans-CN"));
}

function buildAgentDocCoverage(
  agentScopes: DocsAgentScope[],
  workspaceFiles: DocsSectionInput["workspaceFiles"],
): AgentDocCoverage[] {
  const filesByFacet = new Map<string, Map<string, { sourcePath: string; relativePath: string }>>();
  for (const entry of workspaceFiles) {
    const facetKey = normalizeLookupKey(entry.facetKey || "main");
    const fileName = basename(entry.relativePath || entry.sourcePath || "").trim().toLowerCase();
    const sourcePath = (entry.sourcePath || "").trim();
    const relativePath = (entry.relativePath || entry.sourcePath || "").trim();
    if (!facetKey || !fileName || !sourcePath) continue;
    const bucket = filesByFacet.get(facetKey) ?? new Map<string, { sourcePath: string; relativePath: string }>();
    if (!bucket.has(fileName)) {
      bucket.set(fileName, { sourcePath, relativePath });
    }
    filesByFacet.set(facetKey, bucket);
  }

  return agentScopes.map((scope) => {
    const bucket = filesByFacet.get(scope.facetKey) ?? new Map<string, { sourcePath: string; relativePath: string }>();
    const presentFiles: string[] = [];
    const missingFiles: string[] = [];
    const presentDocs: Array<{ fileName: string; sourcePath: string; relativePath: string }> = [];

    for (const fileName of TEAM_CORE_DOCUMENTS) {
      const doc = bucket.get(fileName.toLowerCase());
      if (doc) {
        presentFiles.push(fileName);
        presentDocs.push({
          fileName,
          sourcePath: doc.sourcePath,
          relativePath: doc.relativePath,
        });
      } else {
        missingFiles.push(fileName);
      }
    }

    return {
      facetKey: scope.facetKey,
      facetLabel: scope.facetLabel,
      presentCount: presentFiles.length,
      requiredCount: TEAM_CORE_DOCUMENTS.length,
      presentFiles,
      missingFiles,
      presentDocs,
    };
  });
}

export function buildAgentDocCoverageForSmoke(
  agentScopes: DocsAgentScope[],
  workspaceFiles: DocsSectionInput["workspaceFiles"],
): AgentDocCoverage[] {
  return buildAgentDocCoverage(agentScopes, workspaceFiles);
}

export function renderDocPreviewModal(language: UiLanguage): string {
  const closeLabel = pickUiText(language, "Close", "关闭");
  const editLabel = pickUiText(language, "Modify", "修改");
  const cancelEditLabel = pickUiText(language, "Cancel edit", "取消修改");
  const saveLabel = pickUiText(language, "Save changes", "保存改动");
  const tokenPlaceholder = pickUiText(language, "Safety passcode", "安全口令");
  const title = pickUiText(language, "Document preview", "文档预览");
  const hint = pickUiText(language, "Click any doc card to load the full text here.", "点击任意文档卡片后，会在这里加载正文。");
  const status = pickUiText(language, "Choose a document to preview.", "选择一份文档即可预览。");
  return `<dialog class="doc-preview-dialog" data-doc-preview-dialog>
    <div class="doc-preview-shell">
      <div class="doc-preview-head">
        <div class="doc-preview-head-copy">
          <strong data-doc-preview-title>${escapeHtml(title)}</strong>
          <div class="meta" data-doc-preview-meta>${escapeHtml(hint)}</div>
        </div>
        <button class="doc-preview-close" type="button" data-doc-preview-close aria-label="${escapeHtml(closeLabel)}">${escapeHtml(closeLabel)}</button>
      </div>
      <div class="doc-preview-toolbar" data-doc-preview-toolbar hidden>
        <input class="doc-preview-token" type="password" data-doc-preview-token placeholder="${escapeHtml(tokenPlaceholder)}" hidden />
        <button class="btn" type="button" data-doc-preview-edit>${escapeHtml(editLabel)}</button>
        <button class="btn" type="button" data-doc-preview-cancel-edit hidden>${escapeHtml(cancelEditLabel)}</button>
        <button class="btn" type="button" data-doc-preview-save hidden>${escapeHtml(saveLabel)}</button>
      </div>
      <div class="doc-preview-status meta" data-doc-preview-status>${escapeHtml(status)}</div>
      <div class="doc-preview-content">
        <pre class="doc-preview-body" data-doc-preview-content>${escapeHtml(status)}</pre>
        <textarea class="doc-preview-editor" data-doc-preview-editor spellcheck="false" hidden>${escapeHtml(status)}</textarea>
      </div>
    </div>
  </dialog>`;
}

function renderDocPreviewTrigger(entry: DocEntryViewModel, className: string, body: string): string {
  return `<button class="${escapeHtml(className)} doc-preview-trigger" type="button" data-doc-preview-trigger data-doc-id="${escapeHtml(entry.docId)}" data-doc-title="${escapeHtml(entry.title)}" data-doc-source-label="${escapeHtml(entry.sourceLabel)}" data-doc-relative-label="${escapeHtml(entry.relativeLabel)}" data-doc-freshness-label="${escapeHtml(entry.freshnessLabel)}" data-doc-source-type="${escapeHtml(entry.sourceType)}">
    ${body}
  </button>`;
}

function renderStructuredChatDocSummary(entries: StructuredChatDocEntry[]): string {
  if (entries.length === 0) {
    return '<div class="empty-state">尚无聊天输出结构化入库记录。</div>';
  }
  return `<ul class="story-list">${entries
    .slice(0, 16)
    .map(
      (entry) => `<li><strong>${escapeHtml(entry.title)}</strong><div class="meta">${escapeHtml(entry.excerpt)}</div><div class="meta">会话 ${escapeHtml(entry.sourceSessionKey)} · 更新 ${escapeHtml(entry.updatedAt)}</div></li>`,
    )
    .join("")}</ul>`;
}

function renderDocSummaryCards(entries: DocEntryViewModel[], language: UiLanguage): string {
  if (entries.length === 0) {
    return `<div class="empty-state">${escapeHtml(pickUiText(language, "No recent docs were found yet.", "当前还没有可展示的最近文档。"))}</div>`;
  }
  return `<div class="doc-summary-grid">${entries
    .map(
      (entry) => renderDocPreviewTrigger(entry, "doc-summary-card", `<div class="doc-summary-head">
          <strong>${escapeHtml(entry.title)}</strong>
          <span class="meta">${escapeHtml(entry.freshnessLabel)}</span>
        </div>
        <div class="meta">${escapeHtml(entry.projectLabel)} · ${escapeHtml(entry.ownerLabel)} · ${escapeHtml(entry.sourceLabel)}</div>
        <div class="doc-summary-body">${escapeHtml(entry.excerpt)}</div>
        <div class="meta"><code>${escapeHtml(entry.relativeLabel)}</code></div>`),
    )
    .join("")}</div>`;
}

function renderProjectDocGroups(groups: ProjectDocGroup[], language: UiLanguage): string {
  if (groups.length === 0) {
    return `<div class="empty-state">${escapeHtml(pickUiText(language, "No docs can be matched to projects yet.", "当前还没有能自动归到项目名下的文档。"))}</div>`;
  }
  return `<div class="doc-project-grid">${groups
    .map(
      (group) => `<details class="group-section doc-project-card" open>
        <summary>${escapeHtml(group.projectTitle)} (${group.docs.length})</summary>
        <div class="fold-body">
          <div class="meta">${escapeHtml(pickUiText(language, "Owner", "负责人"))} ${escapeHtml(group.ownerLabel)} · <code>${escapeHtml(group.projectId)}</code></div>
          <ul class="group-items doc-project-items">${group.docs
            .map(
              (entry) => `<li class="group-item">
                ${renderDocPreviewTrigger(entry, "doc-project-trigger", `<div class="group-item-head"><strong>${escapeHtml(entry.title)}</strong></div>
                <div class="meta">${escapeHtml(entry.sourceLabel)} · ${escapeHtml(entry.ownerLabel)} · ${escapeHtml(entry.freshnessLabel)}</div>
                <div class="meta">${escapeHtml(entry.excerpt)}</div>
                <div class="meta"><code>${escapeHtml(entry.relativeLabel)}</code></div>`)}
              </li>`,
            )
            .join("")}</ul>
        </div>
      </details>`,
    )
    .join("")}</div>`;
}

function renderAgentDocCoverageGrid(coverageRows: AgentDocCoverage[], language: UiLanguage): string {
  if (coverageRows.length === 0) {
    return `<div class="empty-state">${escapeHtml(
      pickUiText(language, "No active staff folders were found yet.", "当前还没有发现可用的员工文档目录。"),
    )}</div>`;
  }

  const fileSourceLabel = pickUiText(language, "Core doc", "核心文档");
  return `<div class="doc-coverage-grid">${coverageRows
    .map((row) => {
      const missingLine =
        row.missingFiles.length === 0
          ? pickUiText(language, "All baseline docs are ready.", "基线文档已齐备。")
          : `${pickUiText(language, "Missing", "缺失")}${pickUiText(language, ": ", "：")}${row.missingFiles
              .map((fileName) => fileName.replace(/\.md$/i, ""))
              .join(", ")}`;
      const statusLine =
        row.missingFiles.length === 0
          ? pickUiText(language, "Ready for stable handoff", "已具备稳定交接所需文档")
          : pickUiText(language, "Still missing part of the baseline", "仍缺少部分基线文档");

      return `<article class="doc-coverage-card">
        <div class="doc-coverage-head">
          <div>
            <strong>${escapeHtml(row.facetLabel)}</strong>
            <div class="meta">${escapeHtml(statusLine)}</div>
          </div>
          <div class="doc-coverage-count">${escapeHtml(`${row.presentCount}/${row.requiredCount}`)}</div>
        </div>
        <div class="doc-coverage-pill-row">${TEAM_CORE_DOCUMENTS.map((fileName) => {
          const doc = row.presentDocs.find((item) => item.fileName === fileName);
          if (!doc) {
            return `<span class="doc-coverage-pill missing">${escapeHtml(fileName.replace(/\.md$/i, ""))}</span>`;
          }
          const docTitle = `${row.facetLabel} · ${fileName}`;
          return `<button class="doc-coverage-pill ready doc-preview-trigger" type="button" data-doc-preview-trigger data-doc-title="${escapeHtml(docTitle)}" data-doc-source-label="${escapeHtml(fileSourceLabel)}" data-doc-relative-label="${escapeHtml(doc.relativePath)}" data-doc-source-type="file" data-doc-file-scope="workspace" data-doc-file-path="${escapeHtml(doc.sourcePath)}">
            ${escapeHtml(fileName.replace(/\.md$/i, ""))}
          </button>`;
        }).join("")}</div>
        <div class="meta">${escapeHtml(missingLine)}</div>
      </article>`;
    })
    .join("")}</div>`;
}

export async function renderDocsSection(input: DocsSectionInput): Promise<string> {
  const t = (en: string, zh: string): string => pickUiText(input.language, en, zh);
  const mainDocumentFacetLabel = input.workspaceFacetOptions.find((item) => item.key === "main")?.label ?? "Main";
  const mainDocumentCount = input.workspaceFiles.filter((entry) => entry.facetKey === "main").length;
  const documentViewsLabel = input.workspaceFacetOptions.map((item) => item.label).join(", ");
  const docEntries = await loadDocHubEntries(input.docHubSnapshot.items);
  const docViewModels = buildDocEntryViewModels(docEntries, input.agentScopes, input.projectSummaries, input.language);
  const recentDocCards = docViewModels.slice(0, 6);
  const recentDocs24hCount = docEntries.filter((entry) => Date.now() - toSortableMs(entry.updatedAt) <= 24 * 60 * 60 * 1000).length;
  const chatDocCount = docEntries.filter((entry) => entry.sourceType === "chat").length;
  const projectDocGroups = buildProjectDocGroups(docEntries, input.projectSummaries, input.agentScopes, input.language);
  const projectDocCount = projectDocGroups.reduce((sum, group) => sum + group.docs.length, 0);
  const agentDocCoverage = buildAgentDocCoverage(input.agentScopes, input.workspaceFiles);
  const fullyReadyAgentCount = agentDocCoverage.filter((row) => row.missingFiles.length === 0).length;
  const missingDocSlotCount = agentDocCoverage.reduce((sum, row) => sum + row.missingFiles.length, 0);
  const docsOverviewCards = [
    {
      label: t("Recent docs", "最近文档"),
      value: `${docEntries.length}`,
      detail: t("Docs now visible in this page", "当前这一页能直接看到的文档数"),
    },
    {
      label: t("Updated in 24h", "24 小时内更新"),
      value: `${recentDocs24hCount}`,
      detail: t("Worth checking first", "优先值得先看"),
    },
    {
      label: t("Project-linked docs", "已归到项目"),
      value: `${projectDocCount}`,
      detail: t("Can already be seen by project", "已经能按项目查看"),
    },
    {
      label: t("Chat notes", "聊天沉淀"),
      value: `${chatDocCount}`,
      detail: t("Structured notes from conversations", "会话里沉淀出的结构化笔记"),
    },
  ];

  return `
    <section class="card">
      <h2>${escapeHtml(t("Document overview", "文档概览"))}</h2>
      <div class="meta">${escapeHtml(mainDocumentFacetLabel)} ${escapeHtml(t("documents", "文档"))} ${mainDocumentCount} ${escapeHtml(t("files", "份"))} · ${escapeHtml(t("Agents found", "已发现智能体"))} ${Math.max(0, input.workspaceFacetOptions.filter((item) => item.key !== "main").length)} ${escapeHtml(t("items", "个"))}</div>
      <div class="meta">${escapeHtml(t("Available views", "可切换查看"))}${escapeHtml(input.language === "en" ? ": " : "：")}${escapeHtml(documentViewsLabel)}</div>
      <div class="meta">${escapeHtml(t(`This keeps only ${mainDocumentFacetLabel} documents plus the small set of Markdown files that matter most for each active agent.`, `这里只保留 ${mainDocumentFacetLabel} 文档，以及当前启用智能体最常用、最值得调整的那几份 Markdown。`))}</div>
      <div class="meta">${escapeHtml(t(`Documents are no longer shown by chat history. They are archived by ${mainDocumentFacetLabel} or by active agent.`, `不再按会话历史展示文档，统一按 ${mainDocumentFacetLabel} / 当前启用智能体归档。`))}</div>
      <div class="meta">${escapeHtml(t("Top refresh controls now rebuild the chat-derived docs index, the embedded team snapshot, and related info panels in one pass.", "顶部刷新控件现在会一并重建聊天沉淀文档索引、嵌入团队快照以及相关信息面板。"))}</div>
      <div class="meta">${escapeHtml(t("Latest docs sync", "最近一次文档同步"))}${escapeHtml(input.language === "en" ? ": " : "：")}${escapeHtml(input.docHubSnapshot.generatedAt)}</div>
    </section>
    <section class="card">
      <h2>${escapeHtml(t("What changed recently", "最近该看什么"))}</h2>
      <div class="meta">${escapeHtml(t("Use this first screen to decide which docs are actually worth opening now.", "先用这一屏判断：哪些文档现在真的值得点开。"))}</div>
      <section class="executive-grid">${docsOverviewCards
        .map(
          (item) =>
            `<article class="exec-card"><div class="exec-title">${escapeHtml(item.label)}</div><div class="exec-metric">${escapeHtml(item.value)}</div><div class="meta">${escapeHtml(item.detail)}</div></article>`,
        )
        .join("")}</section>
      ${renderDocSummaryCards(recentDocCards, input.language)}
    </section>
    <section class="card">
      <h2>${escapeHtml(t("Staff docs", "员工文档"))}</h2>
      <div class="meta">${escapeHtml(
        t(
          "See at a glance which staff folders already have the baseline docs needed for stable handoff.",
          "一眼看清每位员工的核心文档是否齐备，谁缺什么会直接标出来。",
        ),
      )}</div>
      <div class="meta">${escapeHtml(
        t(
          `${fullyReadyAgentCount}/${agentDocCoverage.length} staff folders are already complete. Missing doc slots: ${missingDocSlotCount}.`,
          `${agentDocCoverage.length} 个员工目录里，已有 ${fullyReadyAgentCount} 个核心文档齐备，当前仍缺 ${missingDocSlotCount} 份。`,
        ),
      )}</div>
      <div class="meta"><code>${escapeHtml(TEAM_CORE_DOCUMENTS.join(", "))}</code></div>
      ${renderAgentDocCoverageGrid(agentDocCoverage, input.language)}
    </section>
    <section class="card">
      <h2>${escapeHtml(t("Project document view", "按项目查看文档"))}</h2>
      <div class="meta">${escapeHtml(t("This groups docs by the project they most likely belong to, so you do not have to remember which employee folder to open first.", "这里会先按最可能所属的项目分组，你不用先去猜应该打开哪个员工目录。"))}</div>
      ${renderProjectDocGroups(projectDocGroups, input.language)}
    </section>
    ${renderDocPreviewModal(input.language)}
    <details class="card compact-details">
      <summary>${escapeHtml(t("Chat-derived notes", "聊天沉淀文档"))}</summary>
      <div class="fold-body">
        <div class="meta">${escapeHtml(input.docHubSnapshot.detail)}</div>
        ${renderStructuredChatDocSummary(input.docHubSnapshot.items)}
      </div>
    </details>
    ${input.agentTeamDocsBlockHtml}
  `;
}
