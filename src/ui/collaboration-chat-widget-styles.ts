function renderCollaborationChatStyles(): string {
  return `
.collab-chat-shell {
  position: fixed;
  right: 0.875rem;
  bottom: calc(0.875rem + env(safe-area-inset-bottom, 0px));
  z-index: 80;
  max-width: calc(100vw - 1.75rem);
  font-family: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", "Helvetica Neue", sans-serif;
  --chat-text: var(--text, #1d1d1f);
  --chat-muted: var(--muted, #6e6e73);
  --chat-border: rgba(15, 23, 42, 0.1);
  --chat-border-soft: rgba(15, 23, 42, 0.08);
  --chat-surface: rgba(255, 255, 255, 0.86);
  --chat-surface-strong: rgba(255, 255, 255, 0.94);
  --chat-surface-soft: rgba(246, 249, 253, 0.88);
  --chat-panel-fill:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 253, 0.93)),
    radial-gradient(circle at top right, rgba(0, 113, 227, 0.1), transparent 34%);
  --chat-shadow-soft: 0 12px 28px rgba(15, 23, 42, 0.1);
  --chat-shadow: 0 24px 58px rgba(15, 23, 42, 0.16);
  --chat-ring: 0 0 0 4px rgba(0, 113, 227, 0.12);
  --chat-accent: #0071e3;
  --chat-accent-strong: #0a84ff;
  --chat-accent-soft: rgba(0, 113, 227, 0.12);
}

.collab-chat-launcher {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 13.5rem;
  max-width: min(100%, 18rem);
  padding: 0.78rem 0.92rem;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(245, 248, 252, 0.9)),
    radial-gradient(circle at top right, rgba(0, 113, 227, 0.1), transparent 42%);
  color: var(--chat-text);
  box-shadow: var(--chat-shadow-soft);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.collab-chat-launcher:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 113, 227, 0.22);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.14);
}

.collab-chat-launcher:focus-visible {
  outline: none;
  box-shadow: var(--chat-ring), 0 16px 34px rgba(15, 23, 42, 0.14);
}

.collab-chat-launcher.is-open {
  border-color: rgba(0, 113, 227, 0.24);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(245, 248, 252, 0.94)),
    radial-gradient(circle at top right, rgba(0, 113, 227, 0.13), transparent 42%);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
}

.collab-chat-launcher-copy {
  display: grid;
  gap: 0.18rem;
  text-align: left;
}

.collab-chat-launcher-copy strong {
  font-size: 0.93rem;
  line-height: 1.15;
}

.collab-chat-launcher-copy small {
  color: var(--chat-muted);
  font-size: 0.7rem;
}

.collab-chat-launcher-unread,
.collab-chat-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.55rem;
  height: 1.55rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff7a59, #ffb347);
  color: #fff;
  font-size: 0.74rem;
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(255, 122, 89, 0.28);
}

.collab-chat-launcher-unread[hidden],
.collab-chat-badge[hidden] {
  display: none;
}

.collab-chat-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.72rem);
  width: min(24rem, calc(100vw - 1.75rem));
  height: min(72vh, 40rem);
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 1.35rem;
  background: var(--chat-panel-fill);
  color: var(--chat-text);
  box-shadow: var(--chat-shadow);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  opacity: 0;
  pointer-events: none;
  transform: translateY(10px) scale(0.98);
  transform-origin: bottom right;
  transition: opacity 160ms ease, transform 160ms ease;
  overflow: hidden;
  overscroll-behavior: contain;
}

.collab-chat-layout {
  display: grid;
  grid-template-columns: 5.9rem minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.collab-chat-sidebar {
  display: grid;
  min-height: 0;
  padding: 1.72rem 0.48rem 0.82rem;
  border-right: 1px solid rgba(15, 23, 42, 0.06);
  background:
    linear-gradient(180deg, rgba(248, 250, 253, 0.84), rgba(242, 246, 250, 0.74)),
    radial-gradient(circle at top center, rgba(0, 113, 227, 0.08), transparent 48%);
}

.collab-chat-roster {
  display: grid;
  align-content: start;
  gap: 0.75rem;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.08rem;
}

.collab-chat-main {
  display: grid;
  grid-template-rows: auto auto auto auto minmax(0, 1fr) auto;
  gap: 0.56rem;
  min-height: 0;
  padding: 0.76rem 0.82rem 0.82rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
}

.collab-chat-panel.is-open {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.collab-chat-panel.is-resizing {
  transition: none;
  user-select: none;
}

.collab-chat-resize-handle {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  width: 1rem;
  height: 1rem;
  border-top: 2px solid rgba(15, 23, 42, 0.22);
  border-left: 2px solid rgba(15, 23, 42, 0.22);
  border-top-left-radius: 0.45rem;
  cursor: nwse-resize;
  opacity: 0.7;
}

.collab-chat-resize-handle::after {
  content: "";
  position: absolute;
  inset: -0.5rem;
}

.collab-chat-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.55rem 0.7rem;
  padding-left: 0;
}

.collab-chat-header-copy {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.12rem 0.55rem;
  min-width: 0;
}

.collab-chat-kicker {
  grid-column: 1;
  grid-row: 1;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--chat-accent);
}

.collab-chat-header-copy h2 {
  grid-column: 1 / -1;
  grid-row: 2;
  margin: 0;
  font-size: clamp(0.98rem, 0.95vw + 0.82rem, 1.26rem);
  line-height: 1.14;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.collab-chat-header-copy p {
  grid-column: 2;
  grid-row: 1;
  margin: 0;
  color: var(--chat-muted);
  font-size: 0.74rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collab-chat-header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-content: flex-start;
  gap: 0.38rem;
  max-width: min(21rem, 100%);
}

.collab-chat-room-outcomes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem;
  align-items: center;
}

.collab-chat-ghost,
.collab-chat-toggle,
.collab-chat-send {
  appearance: none;
  border: 1px solid var(--chat-border);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(244, 247, 251, 0.9));
  color: var(--chat-text);
  cursor: pointer;
  font: inherit;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.collab-chat-ghost,
.collab-chat-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.02rem;
  padding: 0.38rem 0.68rem;
  font-size: 0.75rem;
  text-align: center;
  line-height: 1.18;
  white-space: nowrap;
  overflow-wrap: anywhere;
}

.collab-chat-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  min-width: 4.2rem;
  padding: 0.8rem 0.88rem;
  font-size: 0.88rem;
  font-weight: 700;
  background: linear-gradient(180deg, var(--chat-accent-strong), var(--chat-accent));
  border-color: transparent;
  color: #fff;
  border-radius: 0.78rem;
  box-shadow: 0 12px 24px rgba(0, 113, 227, 0.24);
}

.collab-chat-ghost:hover,
.collab-chat-toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 113, 227, 0.22);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 249, 252, 0.94));
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.1);
}

.collab-chat-room-outcome[data-collab-room-adjudicate-outcome="done"] {
  border-color: rgba(22, 163, 74, 0.18);
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.98), rgba(220, 252, 231, 0.94));
  color: #166534;
}

.collab-chat-room-outcome[data-collab-room-adjudicate-outcome="done"]:hover {
  border-color: rgba(22, 163, 74, 0.28);
  background: linear-gradient(180deg, rgba(236, 253, 245, 1), rgba(209, 250, 229, 0.96));
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.12);
}

.collab-chat-room-outcome[data-collab-room-adjudicate-outcome="follow_up"] {
  border-color: rgba(217, 119, 6, 0.18);
  background: linear-gradient(180deg, rgba(255, 251, 235, 0.98), rgba(254, 243, 199, 0.94));
  color: #b45309;
}

.collab-chat-room-outcome[data-collab-room-adjudicate-outcome="follow_up"]:hover {
  border-color: rgba(217, 119, 6, 0.28);
  background: linear-gradient(180deg, rgba(255, 247, 237, 1), rgba(253, 230, 138, 0.96));
  box-shadow: 0 10px 22px rgba(217, 119, 6, 0.12);
}

.collab-chat-room-outcome[data-collab-room-adjudicate-outcome="error"] {
  border-color: rgba(220, 38, 38, 0.18);
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.98), rgba(254, 226, 226, 0.94));
  color: #b91c1c;
}

.collab-chat-room-outcome[data-collab-room-adjudicate-outcome="error"]:hover {
  border-color: rgba(220, 38, 38, 0.28);
  background: linear-gradient(180deg, rgba(254, 242, 242, 1), rgba(254, 202, 202, 0.96));
  box-shadow: 0 10px 22px rgba(220, 38, 38, 0.12);
}

.collab-chat-room-outcome.is-active {
  font-weight: 700;
}

.collab-chat-room-outcome[data-collab-room-adjudicate-outcome="done"].is-active {
  border-color: rgba(22, 163, 74, 0.3);
  background: linear-gradient(180deg, rgba(220, 252, 231, 1), rgba(187, 247, 208, 0.96));
  color: #166534;
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.16);
}

.collab-chat-room-outcome[data-collab-room-adjudicate-outcome="follow_up"].is-active {
  border-color: rgba(217, 119, 6, 0.3);
  background: linear-gradient(180deg, rgba(254, 243, 199, 1), rgba(253, 230, 138, 0.96));
  color: #92400e;
  box-shadow: 0 10px 22px rgba(217, 119, 6, 0.16);
}

.collab-chat-room-outcome[data-collab-room-adjudicate-outcome="error"].is-active {
  border-color: rgba(220, 38, 38, 0.26);
  background: linear-gradient(180deg, rgba(254, 226, 226, 0.98), rgba(254, 202, 202, 0.94));
  color: #b91c1c;
  box-shadow: 0 10px 22px rgba(220, 38, 38, 0.16);
}

.collab-chat-send:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(0, 113, 227, 0.28);
}

.collab-chat-ghost:focus-visible,
.collab-chat-toggle:focus-visible,
.collab-chat-send:focus-visible,
.collab-chat-room-trigger:focus-visible,
.collab-chat-room-option:focus-visible,
.collab-chat-mention-option:focus-visible {
  outline: none;
  box-shadow: var(--chat-ring);
}

.collab-chat-ghost:disabled,
.collab-chat-toggle:disabled,
.collab-chat-send:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.collab-chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.45rem 0.8rem;
  padding: 0.54rem 0.68rem;
  border-radius: 0.92rem;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--chat-border-soft);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
}

.collab-chat-toolbar-group {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.collab-chat-toolbar-group:last-child {
  margin-left: auto;
}

.collab-chat-toolbar-copy {
  min-width: 0;
  font-size: 0.74rem;
  color: var(--chat-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collab-chat-project-strip {
  display: grid;
  gap: 0.22rem;
  padding: 0.52rem 0.68rem;
  border-radius: 0.92rem;
  border: 1px solid rgba(0, 113, 227, 0.1);
  background:
    linear-gradient(180deg, rgba(245, 249, 255, 0.92), rgba(238, 244, 251, 0.82)),
    radial-gradient(circle at top right, rgba(0, 113, 227, 0.08), transparent 42%);
}

.collab-chat-project-main,
.collab-chat-project-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.collab-chat-project-main strong,
.collab-chat-project-meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collab-chat-project-kicker {
  flex: 0 0 auto;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chat-accent);
}

.collab-chat-project-main strong {
  font-size: 0.8rem;
  line-height: 1.2;
  color: var(--chat-text);
}

.collab-chat-project-meta span {
  font-size: 0.72rem;
  line-height: 1.25;
  color: var(--chat-muted);
}

.collab-chat-status-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 0.18rem rgba(34, 197, 94, 0.16);
  flex: 0 0 auto;
}

.collab-chat-status-dot.is-busy {
  background: #f59e0b;
  box-shadow: 0 0 0 0.18rem rgba(245, 158, 11, 0.18);
}

.collab-chat-status-dot.is-failed {
  background: #ef4444;
  box-shadow: 0 0 0 0.18rem rgba(239, 68, 68, 0.18);
}

.collab-chat-section {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.35rem 0.65rem;
}

.collab-chat-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #475569;
}

.collab-chat-room-select {
  position: relative;
  min-width: 0;
}

.collab-chat-room-trigger {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.58rem;
  padding: 0.56rem 0.72rem;
  border: 1px solid var(--chat-border-soft);
  border-radius: 0.92rem;
  background: rgba(255, 255, 255, 0.82);
  color: var(--chat-text);
  cursor: pointer;
  text-align: left;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.collab-chat-room-trigger:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 113, 227, 0.18);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
}

.collab-chat-room-trigger-copy {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.58rem;
}

.collab-chat-room-trigger-copy strong,
.collab-chat-room-trigger-copy span {
  overflow-wrap: anywhere;
}

.collab-chat-room-trigger-copy strong {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.79rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collab-chat-room-trigger-copy span {
  flex: 0 0 auto;
  color: var(--chat-muted);
  font-size: 0.68rem;
  line-height: 1.2;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.collab-chat-room-trigger-caret {
  width: 0.62rem;
  height: 0.62rem;
  border-right: 2px solid rgba(71, 85, 105, 0.72);
  border-bottom: 2px solid rgba(71, 85, 105, 0.72);
  transform: rotate(45deg);
  transition: transform 160ms ease;
}

.collab-chat-room-trigger[aria-expanded="true"] .collab-chat-room-trigger-caret {
  transform: rotate(225deg);
}

.collab-chat-room-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 0.42rem);
  display: grid;
  gap: 0.34rem;
  max-height: 9rem;
  overflow-y: auto;
  padding: 0.38rem;
  border-radius: 1rem;
  border: 1px solid var(--chat-border-soft);
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  z-index: 3;
}

.collab-chat-room-dropdown[hidden],
.collab-chat-empty[hidden],
.collab-chat-events[hidden],
.collab-chat-mentions[hidden],
.collab-chat-drop-hint[hidden],
.collab-chat-dialog-backdrop[hidden],
.collab-chat-person-card[hidden] {
  display: none;
}

.collab-chat-room-option {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.58rem 0.68rem;
  border-radius: 0.92rem;
  border: 1px solid rgba(15, 23, 42, 0.04);
  background: rgba(248, 250, 252, 0.92);
  color: var(--chat-text);
  cursor: pointer;
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.collab-chat-room-row {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 0.42rem;
}

.collab-chat-room-option:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 113, 227, 0.16);
  background: rgba(249, 251, 254, 0.98);
}

.collab-chat-room-option.is-active {
  border-color: rgba(0, 113, 227, 0.22);
  background: linear-gradient(135deg, rgba(0, 113, 227, 0.1), rgba(125, 211, 252, 0.06));
}

.collab-chat-room-option strong,
.collab-chat-room-option span {
  overflow-wrap: anywhere;
}

.collab-chat-room-option strong {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.81rem;
  line-height: 1.28;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collab-chat-room-option span {
  flex: 0 0 auto;
  color: var(--chat-muted);
  font-size: 0.71rem;
  line-height: 1.2;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.collab-chat-room-delete {
  appearance: none;
  width: 2rem;
  min-width: 2rem;
  height: 2rem;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 0.78rem;
  background: rgba(255, 245, 245, 0.98);
  color: #dc2626;
  cursor: pointer;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.collab-chat-room-delete:hover {
  border-color: rgba(220, 38, 38, 0.28);
  background: rgba(254, 226, 226, 0.98);
  color: #b91c1c;
  box-shadow: 0 8px 18px rgba(220, 38, 38, 0.12);
}

.collab-chat-room-delete:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.14);
}

.collab-chat-room-delete:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: none;
}

.collab-chat-dialog-backdrop {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 6;
}

.collab-chat-dialog {
  width: min(22rem, calc(100% - 1rem));
  display: grid;
  gap: 0.88rem;
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 253, 0.95)),
    radial-gradient(circle at top right, rgba(239, 68, 68, 0.08), transparent 42%);
  box-shadow: 0 24px 52px rgba(15, 23, 42, 0.2);
  color: var(--chat-text);
}

.collab-chat-dialog-copy {
  display: grid;
  gap: 0.44rem;
}

.collab-chat-dialog-copy strong {
  font-size: 0.94rem;
  line-height: 1.28;
}

.collab-chat-dialog-copy p {
  margin: 0;
  color: var(--chat-muted);
  font-size: 0.78rem;
  line-height: 1.48;
}

.collab-chat-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.collab-chat-danger {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.02rem;
  padding: 0.38rem 0.84rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: linear-gradient(180deg, #ef4444, #dc2626);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.18;
  box-shadow: 0 12px 24px rgba(220, 38, 38, 0.22);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease,
    opacity 160ms ease;
}

.collab-chat-danger:hover {
  transform: translateY(-1px);
  background: linear-gradient(180deg, #f87171, #dc2626);
  box-shadow: 0 14px 28px rgba(220, 38, 38, 0.26);
}

.collab-chat-danger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.14), 0 14px 28px rgba(220, 38, 38, 0.26);
}

.collab-chat-danger:disabled {
  cursor: not-allowed;
  opacity: 0.56;
  box-shadow: none;
}

.collab-chat-person {
  appearance: none;
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.4rem;
  width: 100%;
  padding: 0.38rem 0.16rem 0.46rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.44);
  background: rgba(255, 255, 255, 0.52);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.52), 0 8px 18px rgba(15, 23, 42, 0.05);
  min-width: 0;
  text-align: center;
  cursor: pointer;
  color: #0f172a;
  font: inherit;
  position: relative;
}

.collab-chat-person.is-primary {
  border-color: rgba(0, 113, 227, 0.18);
  background: linear-gradient(180deg, rgba(244, 249, 255, 0.94), rgba(255, 255, 255, 0.76));
}

.collab-chat-person:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
}

.collab-chat-person:focus-visible {
  outline: none;
  box-shadow: var(--chat-ring), inset 0 1px 0 rgba(255, 255, 255, 0.52);
}

.collab-chat-avatar-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.collab-chat-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--avatar-accent, #0f766e), rgba(15, 23, 42, 0.72));
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  overflow: hidden;
  flex: 0 0 auto;
}

.collab-chat-avatar.has-photo {
  background: rgba(255, 255, 255, 0.9);
}

.collab-chat-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 34%;
  display: block;
}

.collab-chat-avatar-state {
  position: absolute;
  top: 0.05rem;
  right: 0.05rem;
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.96);
  background: #22c55e;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
}

.collab-chat-avatar-state.working {
  background: #eab308;
}

.collab-chat-avatar-state.issue {
  background: #ef4444;
}

.collab-chat-person-label {
  width: 100%;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.28;
  color: #0f172a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.collab-chat-person-card {
  position: absolute;
  min-width: 0;
  width: min(18rem, calc(100vw - 2rem));
  min-width: 14rem;
  max-width: min(18rem, calc(100vw - 2rem), calc(100% - 1rem));
  padding: 0.8rem 0.85rem;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.18);
  z-index: 5;
  pointer-events: none;
  overflow: hidden;
}

.collab-chat-person-card-head {
  display: grid;
  gap: 0.18rem;
  margin-bottom: 0.62rem;
  min-width: 0;
}

.collab-chat-person-card-head strong {
  font-size: 0.83rem;
  line-height: 1.28;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.collab-chat-person-card-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #475569;
  font-size: 0.72rem;
  line-height: 1.2;
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.collab-chat-person-card-body {
  display: grid;
  gap: 0.52rem;
  max-height: min(16.5rem, calc(100vh - 8rem));
  overflow-y: auto;
  padding-right: 0.12rem;
}

.collab-chat-person-card-meta {
  display: grid;
  gap: 0.28rem;
  margin-bottom: 0.62rem;
}

.collab-chat-person-card-meta span {
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem;
  min-width: 0;
  font-size: 0.72rem;
  line-height: 1.3;
  color: #334155;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.collab-chat-person-card-meta strong {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.collab-chat-person-card-row {
  display: grid;
  gap: 0.18rem;
}

.collab-chat-person-card-row span {
  color: #64748b;
  font-size: 0.69rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.collab-chat-person-card-row p {
  margin: 0;
  color: #0f172a;
  font-size: 0.77rem;
  line-height: 1.45;
  min-width: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.collab-chat-feed {
  min-height: 0;
  border-radius: 1.1rem;
  border: 1px solid var(--chat-border-soft);
  background: rgba(255, 255, 255, 0.74);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.56);
  overflow: hidden;
  display: grid;
}

.collab-chat-empty {
  display: grid;
  place-items: center;
  min-height: 10rem;
  padding: 1rem;
  color: #64748b;
  text-align: center;
}

.collab-chat-events {
  list-style: none;
  margin: 0;
  padding: 0.85rem;
  display: grid;
  gap: 0.75rem;
  min-height: 0;
  overflow-y: auto;
}

.collab-chat-event {
  display: grid;
  gap: 0.4rem;
  padding: 0.78rem 0.86rem;
  border-radius: 1rem;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.05);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
}

.collab-chat-event.is-user {
  background: linear-gradient(135deg, rgba(0, 113, 227, 0.09), rgba(125, 211, 252, 0.07));
}

.collab-chat-event.is-agent {
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.08), rgba(125, 211, 252, 0.06));
}

.collab-chat-event.is-live {
  border-color: rgba(14, 165, 233, 0.18);
  box-shadow: 0 10px 24px rgba(14, 165, 233, 0.1);
}

.collab-chat-event.is-pending {
  border-style: dashed;
  border-color: rgba(14, 165, 233, 0.28);
  background: linear-gradient(135deg, rgba(224, 242, 254, 0.82), rgba(248, 250, 252, 0.96));
}

.collab-chat-event.is-pending.is-stopped {
  border-color: rgba(239, 68, 68, 0.26);
  background: linear-gradient(135deg, rgba(254, 226, 226, 0.82), rgba(255, 247, 237, 0.96));
}

.collab-chat-event-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.collab-chat-event-headline {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.collab-chat-event-copy {
  min-width: 0;
  display: grid;
  gap: 0.08rem;
}

.collab-chat-event-copy strong,
.collab-chat-event-copy span {
  overflow-wrap: anywhere;
}

.collab-chat-event-copy strong {
  font-size: 0.82rem;
  line-height: 1.25;
}

.collab-chat-event-copy span {
  color: #64748b;
  font-size: 0.71rem;
  line-height: 1.3;
}

.collab-chat-event-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 0.42rem;
  padding: 0.08rem 0.42rem;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
  font-size: 0.64rem;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.02em;
  vertical-align: middle;
}

.collab-chat-event.is-pending.is-stopped .collab-chat-event-badge {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.collab-chat-event-time {
  color: #64748b;
  font-size: 0.7rem;
  white-space: nowrap;
}

.collab-chat-event-body,
.collab-chat-event-detail {
  color: #1e293b;
  font-size: 0.84rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.collab-chat-event-detail {
  color: #475569;
  font-size: 0.77rem;
}

.collab-chat-event.is-tool-event {
  gap: 0.28rem;
  padding: 0.66rem 0.78rem;
}

.collab-chat-event-fold {
  display: grid;
  gap: 0.32rem;
}

.collab-chat-event-fold-summary {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  width: fit-content;
  padding: 0;
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.2;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.collab-chat-event-fold-summary::-webkit-details-marker {
  display: none;
}

.collab-chat-event-fold-summary::before {
  content: "▸";
  color: #94a3b8;
  font-size: 0.72rem;
  line-height: 1;
  transition: transform 160ms ease;
}

.collab-chat-event-fold[open] .collab-chat-event-fold-summary::before {
  transform: rotate(90deg);
}

.collab-chat-event-fold-body {
  display: grid;
  gap: 0.4rem;
}

.collab-chat-event-body .chat-md-paragraph,
.collab-chat-event-detail .chat-md-paragraph {
  margin: 0;
}

.collab-chat-event-body .chat-md-paragraph + .chat-md-paragraph,
.collab-chat-event-detail .chat-md-paragraph + .chat-md-paragraph,
.collab-chat-event-body .chat-md-code,
.collab-chat-event-detail .chat-md-code,
.collab-chat-event-body .chat-md-list,
.collab-chat-event-detail .chat-md-list {
  margin-top: 0.5rem;
}

.collab-chat-attachments {
  display: grid;
  gap: 0.5rem;
}

.collab-chat-attachment {
  display: grid;
  gap: 0.55rem;
  padding: 0.35rem 0;
  border-radius: 0.95rem;
}

.collab-chat-attachment-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.82rem 0.9rem;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 247, 251, 0.96));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

.collab-chat-attachment-card:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.2);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
}

.collab-chat-attachment-card:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.34);
  outline-offset: 2px;
}

.collab-chat-attachment-head,
.collab-chat-upload-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.collab-chat-attachment-copy {
  min-width: 0;
  display: grid;
  gap: 0.14rem;
}

.collab-chat-attachment-copy strong,
.collab-chat-attachment-copy span {
  overflow-wrap: anywhere;
}

.collab-chat-attachment-copy strong {
  font-size: 0.79rem;
  line-height: 1.3;
}

.collab-chat-attachment-copy span,
.collab-chat-upload-copy span {
  color: #64748b;
  font-size: 0.7rem;
}

.collab-chat-attachment-icon {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  width: 3.1rem;
  min-width: 3.1rem;
  height: 3.8rem;
  padding: 0.45rem 0.35rem;
  border-radius: 1rem;
  background: linear-gradient(180deg, #6678a2, #4c5875);
  color: #ffffff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
  overflow: hidden;
}

.collab-chat-attachment-icon::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 1.2rem;
  height: 1.2rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(209, 213, 219, 0.72));
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}

.collab-chat-attachment-icon span {
  position: relative;
  z-index: 1;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.collab-chat-attachment-icon[data-file-mode="html"] {
  background: linear-gradient(180deg, #7481a7, #59698e);
}

.collab-chat-attachment-icon[data-file-mode="markdown"] {
  background: linear-gradient(180deg, #4f7cff, #335fdb);
}

.collab-chat-attachment-icon[data-file-mode="code"] {
  background: linear-gradient(180deg, #1f9bb3, #0f6f84);
}

.collab-chat-attachment-icon[data-file-mode="image"] {
  background: linear-gradient(180deg, #8b5cf6, #6d28d9);
}

.collab-chat-attachment-preview {
  display: grid;
  gap: 0.45rem;
}

.collab-chat-attachment-actions,
.collab-chat-upload-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.38rem;
}

.collab-chat-attachment-actions-inner {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.38rem;
}

.collab-chat-attachment-openhint {
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 600;
}

.collab-chat-link {
  color: var(--chat-accent);
  text-decoration: none;
  font-size: 0.74rem;
  font-weight: 600;
}

.collab-chat-image {
  display: block;
  width: 100%;
  max-height: 13rem;
  object-fit: cover;
  border-radius: 0.85rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #e2e8f0;
}

.collab-chat-preview {
  margin: 0;
  padding: 0.65rem 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
  border-radius: 0.85rem;
  background: #101826;
  color: #e7edf5;
  font-size: 0.74rem;
  line-height: 1.55;
  overflow: auto;
}

.collab-chat-rich-preview {
  display: grid;
  gap: 0.48rem;
  padding: 0.72rem 0.76rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.96));
}

.collab-chat-rich-preview-head {
  display: flex;
  align-items: center;
  gap: 0.52rem;
  min-width: 0;
}

.collab-chat-rich-preview-head strong {
  min-width: 0;
  font-size: 0.78rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.collab-chat-preview-badge {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.35rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.collab-chat-rich-preview-summary {
  margin: 0;
  color: #334155;
  font-size: 0.74rem;
  line-height: 1.5;
}

.collab-chat-preview.is-code {
  max-height: 18rem;
  overflow: auto;
  white-space: pre;
  word-break: normal;
  tab-size: 2;
}

.collab-chat-rich-preview.is-html .collab-chat-preview-badge {
  background: rgba(249, 115, 22, 0.12);
  color: #9a3412;
}

.collab-chat-rich-preview.is-markdown .collab-chat-preview-badge {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.collab-chat-rich-preview.is-code .collab-chat-preview-badge {
  background: rgba(14, 116, 144, 0.12);
  color: #155e75;
}

.collab-chat-composer {
  position: relative;
  display: grid;
  gap: 0.5rem;
}

.collab-chat-drop-hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  border-radius: 1rem;
  border: 1px dashed rgba(0, 113, 227, 0.34);
  background: rgba(240, 247, 255, 0.9);
  color: var(--chat-accent);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-align: center;
  pointer-events: none;
  z-index: 2;
}

.collab-chat-upload-list {
  display: grid;
  gap: 0.42rem;
}

.collab-chat-upload-item {
  padding: 0.56rem 0.7rem;
  border-radius: 0.9rem;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--chat-border-soft);
}

.collab-chat-upload-item.is-error {
  border-color: rgba(220, 38, 38, 0.22);
  background: rgba(254, 242, 242, 0.92);
}

.collab-chat-upload-item.is-ready {
  border-color: rgba(14, 116, 144, 0.2);
}

.collab-chat-upload-copy {
  min-width: 0;
  display: grid;
  gap: 0.1rem;
}

.collab-chat-upload-copy strong,
.collab-chat-upload-copy span {
  overflow-wrap: anywhere;
}

.collab-chat-upload-copy strong {
  line-height: 1.3;
}

.collab-chat-upload-error {
  margin: 0.16rem 0 0;
  color: #b91c1c;
  font-size: 0.72rem;
  line-height: 1.42;
}

.collab-chat-attach {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: fit-content;
  padding: 0.44rem 0.68rem;
  border-radius: 999px;
  border: 1px dashed rgba(0, 113, 227, 0.35);
  background: rgba(244, 249, 255, 0.94);
  color: var(--chat-accent);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.collab-chat-attach:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 113, 227, 0.48);
  background: rgba(247, 251, 255, 0.98);
}

.collab-chat-attach input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.collab-chat-input-wrap {
  position: relative;
}

.collab-chat-input-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 0.3rem;
  padding: 0.28rem;
  border-radius: 0.98rem;
  border: 1px solid var(--chat-border);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.64);
}

.collab-chat-input-actions {
  display: grid;
  align-content: stretch;
  gap: 0.3rem;
}

.collab-chat-stop {
  min-width: 4.8rem;
}

.collab-chat-input-shell:focus-within {
  border-color: rgba(0, 113, 227, 0.22);
  box-shadow: var(--chat-ring), inset 0 1px 0 rgba(255, 255, 255, 0.64);
}

.collab-chat-panel.is-file-drop-target {
  border-color: rgba(0, 113, 227, 0.26);
  box-shadow: var(--chat-ring), var(--chat-shadow);
}

.collab-chat-composer.is-file-drop-target .collab-chat-attach {
  border-color: rgba(0, 113, 227, 0.54);
  background: rgba(240, 247, 255, 0.98);
}

.collab-chat-input-shell.is-file-drop-target {
  border-color: rgba(0, 113, 227, 0.3);
  background: rgba(240, 247, 255, 0.98);
  box-shadow: var(--chat-ring), inset 0 1px 0 rgba(255, 255, 255, 0.64);
}

.collab-chat-input-wrap textarea {
  width: 100%;
  min-height: 4.1rem;
  resize: none;
  padding: 0.42rem 0.5rem;
  border-radius: 0.85rem;
  border: 0;
  background: transparent;
  color: var(--chat-text);
  font: inherit;
  line-height: 1.55;
  box-sizing: border-box;
}

.collab-chat-input-wrap textarea:focus {
  outline: none;
}

.collab-chat-mentions {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 0.4rem);
  display: grid;
  gap: 0.22rem;
  padding: 0.38rem;
  border-radius: 0.9rem;
  border: 1px solid var(--chat-border-soft);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.collab-chat-mention-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.48rem 0.56rem;
  border: 0;
  border-radius: 0.7rem;
  background: transparent;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
}

.collab-chat-mention-option.is-active,
.collab-chat-mention-option:hover {
  background: rgba(0, 113, 227, 0.08);
}

.collab-chat-composer-actions {
  display: block;
}

.collab-chat-status {
  min-height: 1.1rem;
  color: var(--chat-muted);
  font-size: 0.74rem;
}

.collab-chat-empty-line {
  color: var(--chat-muted);
  font-size: 0.76rem;
}

@media (max-width: 760px) {
  .collab-chat-shell {
    right: 0.75rem;
    bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
    left: 0.75rem;
    max-width: none;
  }

  .collab-chat-launcher {
    width: 100%;
    justify-content: space-between;
  }

  .collab-chat-panel {
    left: 0;
    right: 0;
    width: auto;
    height: min(68vh, 36rem);
    max-height: calc(100vh - 6.5rem - env(safe-area-inset-bottom, 0px));
    transform-origin: bottom center;
  }

  .collab-chat-layout {
    grid-template-columns: 5.2rem minmax(0, 1fr);
  }

  .collab-chat-sidebar {
    padding: 1.4rem 0.38rem 0.68rem;
  }

  .collab-chat-main {
    gap: 0.62rem;
    padding: 0.68rem;
  }

  .collab-chat-resize-handle,
  .collab-chat-person-card {
    display: none;
  }

  .collab-chat-header-actions {
    justify-content: stretch;
    max-width: none;
  }

  .collab-chat-header-actions > .collab-chat-ghost,
  .collab-chat-header-actions > .collab-chat-toggle {
    flex: 1 1 calc(50% - 0.24rem);
  }

  .collab-chat-room-outcomes > .collab-chat-room-outcome {
    flex: 1 1 calc(33.333% - 0.26rem);
  }

  .collab-chat-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.45rem;
    padding: 0.56rem 0.62rem;
  }

  .collab-chat-toolbar-group:last-child {
    margin-left: 0;
  }

  .collab-chat-toolbar-copy {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .collab-chat-input-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .collab-chat-input-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .collab-chat-shell {
    right: 0.5rem;
    bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
    left: 0.5rem;
  }

  .collab-chat-launcher {
    min-width: 0;
    gap: 0.65rem;
    padding: 0.75rem 0.9rem;
  }

  .collab-chat-launcher-copy small {
    display: none;
  }

  .collab-chat-panel {
    bottom: calc(100% + 0.56rem);
    height: min(64vh, 32rem);
    max-height: calc(100vh - 5.6rem - env(safe-area-inset-bottom, 0px));
    border-radius: 1.1rem;
  }

  .collab-chat-layout {
    grid-template-columns: 4.6rem minmax(0, 1fr);
  }

  .collab-chat-sidebar {
    padding: 1.22rem 0.28rem 0.58rem;
  }

  .collab-chat-main {
    gap: 0.7rem;
    padding: 0.85rem 0.72rem 0.78rem;
  }

  .collab-chat-header {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }

  .collab-chat-header-copy {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.14rem;
  }

  .collab-chat-header-copy p,
  .collab-chat-toolbar-copy {
    font-size: 0.74rem;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .collab-chat-project-strip,
  .collab-chat-toolbar {
    padding-inline: 0.7rem;
  }

  .collab-chat-room-dropdown {
    max-height: 10rem;
  }

  .collab-chat-dialog {
    width: min(100%, 19rem);
    gap: 0.8rem;
    padding: 0.84rem;
  }

  .collab-chat-dialog-actions {
    justify-content: stretch;
  }

  .collab-chat-dialog-actions .collab-chat-ghost,
  .collab-chat-dialog-actions .collab-chat-danger,
  .collab-chat-send {
    width: 100%;
    min-width: 0;
  }

  .collab-chat-events {
    gap: 0.65rem;
    padding: 0.75rem;
  }
}

`;
}


export { renderCollaborationChatStyles };
