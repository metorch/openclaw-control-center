// @ts-nocheck

const { pickUiText } = require("./server-shared");

function renderCardHelpTooltipsScript(language) {
  const openLabel = pickUiText(language, "Show card note", "\u67e5\u770b\u5361\u7247\u8bf4\u660e");
  return `<script>
(() => {
  const label = ${JSON.stringify(openLabel)};
  const normalizeText = (value) => String(value || "").replace(/\\s+/g, " ").trim();
  const sentenceEndPattern = /[。！？.!?]$/;
  const separatorPattern = /[·/:：|]/;
  const helperLeadPattern = /^(Use|Keep|This|These|Finish|Leave|Showing|One place|Enter|Current|Saved|Stored|Here|This card|这里|这块|用于|用来|保持|展示|留空|填数字|保存后|当前)/;

  const looksLikeHelperText = (meta, isHeaderMeta) => {
    if (!(meta instanceof HTMLElement)) return false;
    if (meta.dataset.cardHelpKeep === "true") return false;
    if (meta.hasAttribute("data-budget-limit-status") || meta.hasAttribute("data-settings-safety-status")) return false;
    if (meta.closest(".fold-body, .group-list, .decision-list, .status-strip, .story-list, table, form, .inspector-summary-foot, .inspector-compact-metrics, .group-item, .timeline-summary-strip, .mission-banner, .empty-state")) return false;
    if (meta.querySelector("button, input, select, textarea, table, ul, ol")) return false;

    const text = normalizeText(meta.textContent);
    if (!text || text.length < 12) return false;

    const numberGroups = text.match(/\\d+(?:\\.\\d+)?/g) || [];
    if (numberGroups.length >= 2 && separatorPattern.test(text)) return false;
    if (meta.querySelector("a") && text.length < 42) return false;

    if (sentenceEndPattern.test(text)) return true;
    if (isHeaderMeta && !/\\d/.test(text) && !separatorPattern.test(text)) return true;
    if (text.length >= 42 && !/\\d{1,4}\\s*(?:%|x)/.test(text)) return true;
    if (helperLeadPattern.test(text)) return true;
    return false;
  };

  const buildHelpButton = (text) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-help-dot";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", text);
    button.dataset.cardHelp = text;
    button.textContent = "?";
    return button;
  };

  const appendHelpText = (host, text) => {
    if (!(host instanceof HTMLElement)) return;
    const normalized = normalizeText(text);
    if (!normalized) return;
    host.classList.add("card-help-anchor");
    let button = host.querySelector(":scope > .card-help-dot");
    if (!(button instanceof HTMLButtonElement)) {
      button = buildHelpButton(normalized);
      host.appendChild(button);
      return;
    }
    const current = String(button.dataset.cardHelp || "")
      .split("\\n\\n")
      .map((item) => normalizeText(item))
      .filter(Boolean);
    if (current.includes(normalized)) return;
    current.push(normalized);
    const merged = current.join("\\n\\n");
    button.dataset.cardHelp = merged;
    button.setAttribute("title", merged);
  };

  const getCardHelpHost = (card) => {
    if (!(card instanceof HTMLElement)) return null;
    const headerHost = card.querySelector(":scope > .overview-command-head > div:first-child, :scope > .inspector-card-head > div:first-child");
    if (headerHost instanceof HTMLElement) return headerHost;

    const heading = card.querySelector(":scope > h2, :scope > h3");
    if (!(heading instanceof HTMLElement)) return null;

    let row = heading.previousElementSibling;
    if (!(row instanceof HTMLElement) || !row.classList.contains("card-help-title-row")) {
      row = document.createElement("div");
      row.className = "card-help-title-row";
      heading.parentNode.insertBefore(row, heading);
      row.appendChild(heading);
    }
    return row;
  };

  const collapseMetaIntoHelp = (meta, host) => {
    if (!(meta instanceof HTMLElement) || !(host instanceof HTMLElement)) return;
    if (meta.dataset.cardHelpCollapsed === "1") return;
    const text = normalizeText(meta.textContent);
    if (!text) return;
    appendHelpText(host, text);
    meta.dataset.cardHelpCollapsed = "1";
    meta.classList.add("card-help-hidden");
  };

  const enhanceCard = (card) => {
    if (!(card instanceof HTMLElement)) return;
    const host = getCardHelpHost(card);
    if (!(host instanceof HTMLElement)) return;

    const headerMetas = host.querySelectorAll(":scope > .meta:not([data-card-help-collapsed])");
    headerMetas.forEach((meta) => {
      if (looksLikeHelperText(meta, true)) collapseMetaIntoHelp(meta, host);
    });

    const directMetas = Array.from(card.children).filter((node) => node instanceof HTMLElement && node.classList.contains("meta"));
    directMetas.forEach((meta) => {
      if (!(meta instanceof HTMLElement)) return;
      if (meta.classList.contains("card-help-hidden")) return;
      if (host.contains(meta)) return;
      if (looksLikeHelperText(meta, false)) collapseMetaIntoHelp(meta, host);
    });
  };

  const run = () => {
    document.querySelectorAll(".card, .settings-status-panel, .inspector-summary-card").forEach((card) => enhanceCard(card));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  const observer = new MutationObserver(() => run());
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  }
})();
</script>`;
}

export { renderCardHelpTooltipsScript };
