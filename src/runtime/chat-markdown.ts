const ORDERED_LIST_ITEM_PATTERN = /^\d+\.\s+/;
const UNORDERED_LIST_ITEM_PATTERN = /^[-*]\s+/;
const FENCE_PATTERN = /^```([^`]*)$/;

export function renderChatMarkdownToHtml(input: string): string {
  const markdown = input.replace(/\r/g, "");
  const lines = markdown.split("\n");
  const out: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const fence = rawLine.match(FENCE_PATTERN);
    if (fence) {
      const language = fence[1]?.trim() ?? "";
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !FENCE_PATTERN.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      out.push(
        `<pre class="chat-md-code"><code${language ? ` data-language="${escapeHtml(language)}"` : ""}>${escapeHtml(
          codeLines.join("\n"),
        )}</code></pre>`,
      );
      continue;
    }

    if (UNORDERED_LIST_ITEM_PATTERN.test(trimmed) || ORDERED_LIST_ITEM_PATTERN.test(trimmed)) {
      const ordered = ORDERED_LIST_ITEM_PATTERN.test(trimmed);
      const tag = ordered ? "ol" : "ul";
      const items: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index].trim();
        if (!candidate) break;
        if (ordered && !ORDERED_LIST_ITEM_PATTERN.test(candidate)) break;
        if (!ordered && !UNORDERED_LIST_ITEM_PATTERN.test(candidate)) break;
        const body = candidate.replace(ordered ? ORDERED_LIST_ITEM_PATTERN : UNORDERED_LIST_ITEM_PATTERN, "");
        items.push(`<li>${renderInlineMarkdown(body)}</li>`);
        index += 1;
      }
      out.push(`<${tag} class="chat-md-list">${items.join("")}</${tag}>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index];
      const candidateTrimmed = candidate.trim();
      if (!candidateTrimmed) break;
      if (FENCE_PATTERN.test(candidateTrimmed)) break;
      if (UNORDERED_LIST_ITEM_PATTERN.test(candidateTrimmed) || ORDERED_LIST_ITEM_PATTERN.test(candidateTrimmed)) break;
      paragraphLines.push(candidateTrimmed);
      index += 1;
    }
    out.push(
      `<p class="chat-md-paragraph">${paragraphLines.map((line) => renderInlineMarkdown(line)).join("<br />")}</p>`,
    );
  }

  return out.join("");
}

function renderInlineMarkdown(input: string): string {
  const codeTokens: string[] = [];
  const codeTokenized = input.replace(/`([^`]+)`/g, (_match, group: string) => {
    const token = `CHATCODETOKEN${codeTokens.length}PLACEHOLDER`;
    codeTokens.push(`<code>${escapeHtml(group)}</code>`);
    return token;
  });
  const escaped = escapeHtml(codeTokenized);
  const linked = escaped.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
    const safeHref = sanitizeHref(href);
    if (!safeHref) return `${escapeHtml(label)} (${escapeHtml(href)})`;
    return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer">${renderInlineMarkdown(label)}</a>`;
  });
  const emphasized = linked
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[\s(>])\*([^*]+)\*(?=$|[\s).,!?:;])/g, "$1<em>$2</em>")
    .replace(/(^|[\s(>])_([^_]+)_(?=$|[\s).,!?:;])/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return emphasized.replace(/CHATCODETOKEN(\d+)PLACEHOLDER/g, (_match, index: string) => codeTokens[Number(index)] ?? "");
}

function sanitizeHref(input: string): string | undefined {
  const href = input.trim();
  if (!href) return undefined;
  if (/^(https?:|mailto:)/i.test(href)) return href;
  if (href.startsWith("/") || href.startsWith("./") || href.startsWith("../")) return href;
  return undefined;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
