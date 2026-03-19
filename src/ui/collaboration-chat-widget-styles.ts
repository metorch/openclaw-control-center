function renderCollaborationChatStyles(): string {
  return `
.collab-chat-shell {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 80;
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
  gap: 0.875rem;
  min-width: 15rem;
  padding: 0.85rem 1rem;
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
  font-size: 0.98rem;
  line-height: 1.15;
}

.collab-chat-launcher-copy small {
  color: var(--chat-muted);
  font-size: 0.72rem;
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
  bottom: calc(100% + 0.85rem);
  width: min(27rem, calc(100vw - 1.5rem));
  height: min(78vh, 46rem);
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 1.5rem;
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
}

.collab-chat-layout {
  display: grid;
  grid-template-columns: 6.45rem minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.collab-chat-sidebar {
  display: grid;
  min-height: 0;
  padding: 1.95rem 0.55rem 0.9rem;
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
  gap: 0.62rem;
  min-height: 0;
  padding: 0.82rem 0.9rem 0.9rem;
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
  max-width: min(24rem, 100%);
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
.collab-chat-person-card[hidden] {
  display: none;
}

.collab-chat-room-option {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.58rem 0.68rem;
  border-radius: 0.92rem;
  border: 1px solid rgba(15, 23, 42, 0.04);
  background: rgba(248, 250, 252, 0.92);
  color: var(--chat-text);
  cursor: pointer;
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
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
  gap: 0.45rem;
  padding: 0.7rem;
  border-radius: 0.95rem;
  border: 1px solid var(--chat-border-soft);
  background: rgba(255, 255, 255, 0.9);
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

.collab-chat-attachment-actions,
.collab-chat-upload-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.38rem;
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

.collab-chat-composer {
  display: grid;
  gap: 0.5rem;
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

.collab-chat-input-shell:focus-within {
  border-color: rgba(0, 113, 227, 0.22);
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

/* Reverted custom chat skins
.collab-chat-shell {
  font-family: "Outfit", "PingFang SC", "Noto Sans SC", sans-serif;
}

.collab-chat-launcher {
  border: 0;
  border-radius: 0.625rem;
  background: #3b82f6;
  color: #ffffff;
  box-shadow: none;
  transition: transform 180ms ease, background 180ms ease;
}

.collab-chat-launcher:hover,
.collab-chat-launcher.is-open {
  background: #2563eb;
  opacity: 1;
  transform: scale(1.02);
}

.collab-chat-launcher-copy small {
  color: rgba(255, 255, 255, 0.82);
}

.collab-chat-launcher-unread,
.collab-chat-badge {
  background: #f59e0b;
  color: #111827;
}

.collab-chat-panel {
  border: 2px solid #111827;
  border-radius: 0.9rem;
  background: #ffffff;
  box-shadow: none;
}

.collab-chat-sidebar {
  border-right: 2px solid #e5e7eb;
  background: #f3f4f6;
}

.collab-chat-main {
  padding: 0.95rem;
  gap: 0.7rem;
}

.collab-chat-resize-handle {
  border-top-color: #111827;
  border-left-color: #111827;
  opacity: 1;
  z-index: 7;
}

.collab-chat-kicker,
.collab-chat-project-kicker {
  color: #2563eb;
}

.collab-chat-ghost,
.collab-chat-toggle {
  border: 2px solid #e5e7eb;
  border-radius: 0.625rem;
  background: #f3f4f6;
  box-shadow: none;
  transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
}

.collab-chat-ghost:hover,
.collab-chat-toggle:hover {
  border-color: #3b82f6;
  background: #dbeafe;
  transform: scale(1.03);
}

.collab-chat-send {
  border-radius: 0.625rem;
  background: #111827;
  box-shadow: none;
  min-width: 4rem;
  transition: transform 180ms ease, background 180ms ease;
}

.collab-chat-send:hover {
  background: #1f2937;
  transform: scale(1.03);
}

.collab-chat-toolbar,
.collab-chat-project-strip,
.collab-chat-room-trigger,
.collab-chat-room-dropdown,
.collab-chat-feed,
.collab-chat-input-shell,
.collab-chat-upload-item,
.collab-chat-attachment,
.collab-chat-person-card,
.collab-chat-mentions {
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #ffffff;
  box-shadow: none;
}

.collab-chat-toolbar {
  background: #f3f4f6;
}

.collab-chat-project-strip {
  background: #eff6ff;
}

.collab-chat-room-trigger {
  border-color: #e5e7eb;
  background: #ffffff;
}

.collab-chat-room-option {
  border: 2px solid transparent;
  border-radius: 0.625rem;
  background: #ffffff;
}

.collab-chat-room-option.is-active,
.collab-chat-room-option:hover {
  border-color: #3b82f6;
  background: #dbeafe;
}

.collab-chat-person {
  border: 2px solid transparent;
  border-radius: 0.75rem;
  background: transparent;
  box-shadow: none;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
}

.collab-chat-person.is-primary,
.collab-chat-person:hover,
.collab-chat-person:focus-visible {
  border-color: #3b82f6;
  background: #ffffff;
  transform: scale(1.02);
  outline: none;
}

.collab-chat-avatar {
  background: #111827;
}

.collab-chat-avatar-state,
.collab-chat-status-dot {
  box-shadow: none;
}

.collab-chat-feed {
  background: #f9fafb;
}

.collab-chat-event {
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #ffffff;
}

.collab-chat-event.is-user {
  background: #dbeafe;
  border-color: #93c5fd;
}

.collab-chat-event.is-agent {
  background: #ecfdf5;
  border-color: #6ee7b7;
}

.collab-chat-event.is-tool-event {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.collab-chat-event-fold-summary::before {
  content: "▸";
}

.collab-chat-attach {
  border: 2px dashed #3b82f6;
  border-radius: 0.625rem;
  background: #eff6ff;
}

.collab-chat-input-wrap textarea {
  border-radius: 0.5rem;
  background: #f3f4f6;
  padding: 0.65rem 0.75rem;
}

.collab-chat-input-shell:focus-within {
  border-color: #3b82f6;
  background: #ffffff;
}

.collab-chat-mention-option {
  border: 2px solid transparent;
  border-radius: 0.625rem;
}

.collab-chat-mention-option.is-active,
.collab-chat-mention-option:hover {
  border-color: #3b82f6;
  background: #dbeafe;
}

.collab-chat-shell {
  --neu-bg: #e7edf5;
  --neu-surface: #edf2f8;
  --neu-surface-strong: #dde6f1;
  --neu-text: #566274;
  --neu-muted: #7d8898;
  --neu-accent: #7d9cf7;
  --neu-accent-strong: #6f8ff4;
  --neu-success: #84d7be;
  --neu-shadow: 10px 10px 22px rgba(163, 177, 198, 0.42), -10px -10px 22px rgba(255, 255, 255, 0.92);
  --neu-shadow-strong: 16px 16px 34px rgba(163, 177, 198, 0.46), -16px -16px 34px rgba(255, 255, 255, 0.95);
  --neu-press: inset 7px 7px 14px rgba(163, 177, 198, 0.42), inset -7px -7px 14px rgba(255, 255, 255, 0.94);
}

.collab-chat-launcher {
  min-height: 3.45rem;
  border: 0;
  border-radius: 1.2rem;
  background: linear-gradient(145deg, #eef3fa, #dce5f1);
  color: var(--neu-text);
  box-shadow: var(--neu-shadow);
}

.collab-chat-launcher:hover,
.collab-chat-launcher.is-open {
  background: linear-gradient(145deg, #e3eaf4, #f0f5fb);
  color: var(--neu-text);
  transform: translateY(1px);
  box-shadow: var(--neu-press);
}

.collab-chat-launcher-copy small {
  color: var(--neu-muted);
}

.collab-chat-launcher-unread,
.collab-chat-badge {
  background: linear-gradient(145deg, #f7d4c4, #efb18d);
  color: #6b564b;
  box-shadow: 6px 6px 12px rgba(181, 158, 145, 0.3), -6px -6px 12px rgba(255, 255, 255, 0.64);
}

.collab-chat-panel {
  border: 0;
  border-radius: 1.6rem;
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-strong);
}

.collab-chat-sidebar {
  border-right: 0;
  background: linear-gradient(180deg, #e2eaf3, #e7edf5);
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.54);
}

.collab-chat-header {
  position: relative;
  overflow: hidden;
  padding: 0.95rem 1rem;
  border: 0;
  border-radius: 1.25rem;
  background: linear-gradient(145deg, #eef3fa, #dbe5f2);
  box-shadow: var(--neu-shadow);
}

.collab-chat-header::before {
  content: "";
  position: absolute;
  left: -1.9rem;
  bottom: -2.4rem;
  width: 6.6rem;
  height: 6.6rem;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(125, 156, 247, 0.2), transparent 68%);
  pointer-events: none;
}

.collab-chat-header::after {
  content: "";
  position: absolute;
  top: -1.3rem;
  right: -0.8rem;
  width: 5.2rem;
  height: 5.2rem;
  border-radius: 1.4rem;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.5), rgba(125, 156, 247, 0.14));
  pointer-events: none;
}

.collab-chat-header-copy h2,
.collab-chat-header-copy p,
.collab-chat-kicker {
  position: relative;
  z-index: 1;
}

.collab-chat-kicker {
  color: var(--neu-accent);
}

.collab-chat-header-copy h2 {
  color: var(--neu-text);
}

.collab-chat-header-copy p {
  color: var(--neu-muted);
}

.collab-chat-header-actions {
  position: relative;
  z-index: 1;
}

.collab-chat-ghost,
.collab-chat-toggle {
  border: 0;
  border-radius: 1rem;
  background: var(--neu-bg);
  color: var(--neu-text);
  box-shadow: var(--neu-shadow);
}

.collab-chat-ghost:hover,
.collab-chat-toggle:hover {
  background: var(--neu-bg);
  color: #4f5d6f;
  transform: translateY(1px);
  box-shadow: var(--neu-press);
}

.collab-chat-send {
  min-width: 4.6rem;
  border: 0;
  border-radius: 1rem;
  background: linear-gradient(145deg, #8ea9ff, #6f8ff4);
  color: #ffffff;
  box-shadow: 9px 9px 18px rgba(124, 145, 205, 0.34), -7px -7px 16px rgba(255, 255, 255, 0.26);
}

.collab-chat-send:hover {
  background: linear-gradient(145deg, #8ea9ff, #6f8ff4);
  transform: translateY(1px);
  box-shadow: inset 6px 6px 12px rgba(99, 126, 210, 0.34), inset -6px -6px 12px rgba(255, 255, 255, 0.14), 4px 4px 12px rgba(163, 177, 198, 0.28);
}

.collab-chat-toolbar,
.collab-chat-project-strip,
.collab-chat-room-trigger,
.collab-chat-room-dropdown,
.collab-chat-feed,
.collab-chat-input-shell,
.collab-chat-upload-item,
.collab-chat-attachment,
.collab-chat-person-card,
.collab-chat-mentions {
  border: 0;
  border-radius: 1.1rem;
  background: var(--neu-surface);
  box-shadow: var(--neu-shadow);
}

.collab-chat-toolbar {
  background: linear-gradient(145deg, #eef3fa, #dce5f1);
}

.collab-chat-project-strip {
  background: linear-gradient(145deg, #e7f4f0, #d9eee7);
}

.collab-chat-room-option {
  border: 0;
  background: var(--neu-surface);
  box-shadow: 7px 7px 14px rgba(163, 177, 198, 0.32), -7px -7px 14px rgba(255, 255, 255, 0.9);
}

.collab-chat-room-option.is-active,
.collab-chat-room-option:hover {
  border-color: transparent;
  background: var(--neu-surface);
  box-shadow: var(--neu-press);
}

.collab-chat-person {
  border: 0;
  border-radius: 1.1rem;
  background: var(--neu-bg);
  box-shadow: 7px 7px 14px rgba(163, 177, 198, 0.34), -7px -7px 14px rgba(255, 255, 255, 0.9);
}

.collab-chat-person.is-primary,
.collab-chat-person:hover,
.collab-chat-person:focus-visible {
  border-color: transparent;
  background: linear-gradient(145deg, #e9eef7, #dce5f2);
  box-shadow: var(--neu-press);
  transform: translateY(1px);
}

.collab-chat-avatar {
  border: 0;
  background: linear-gradient(145deg, #8aa6ff, #6f8ff4);
  box-shadow: 6px 6px 12px rgba(124, 145, 205, 0.28), -5px -5px 12px rgba(255, 255, 255, 0.32);
}

.collab-chat-feed {
  background: linear-gradient(145deg, #eaf0f6, #dde6f1);
  box-shadow: var(--neu-press);
}

.collab-chat-event {
  border: 0;
  border-radius: 1rem;
  background: var(--neu-surface);
  box-shadow: var(--neu-shadow);
}

.collab-chat-event.is-user {
  border-color: transparent;
  background: linear-gradient(145deg, #e8eef8, #dbe5f2);
}

.collab-chat-event.is-agent {
  border-color: transparent;
  background: linear-gradient(145deg, #e7f4f0, #d9eee7);
}

.collab-chat-event.is-tool-event {
  border-color: transparent;
  background: linear-gradient(145deg, #edf2f8, #dde6f1);
}

.collab-chat-event-fold-summary {
  padding: 0.22rem 0.52rem;
  border: 0;
  border-radius: 0.75rem;
  background: var(--neu-bg);
  color: var(--neu-text);
  font-weight: 700;
  box-shadow: var(--neu-shadow);
}

.collab-chat-event-fold-summary::before {
  color: var(--neu-accent);
}

.collab-chat-attach {
  border: 0;
  border-radius: 0.95rem;
  background: var(--neu-bg);
  color: var(--neu-accent);
  box-shadow: var(--neu-shadow);
}

.collab-chat-attach:hover {
  background: var(--neu-bg);
  color: var(--neu-accent-strong);
  transform: translateY(1px);
  box-shadow: var(--neu-press);
}

.collab-chat-input-shell {
  border: 0;
  background: var(--neu-bg);
  box-shadow: var(--neu-press);
}

.collab-chat-input-wrap textarea {
  border: 0;
  background: transparent;
  color: var(--neu-text);
  padding: 0.78rem 0.86rem;
}

.collab-chat-input-wrap textarea:focus {
  border-color: transparent;
  background: transparent;
}

.collab-chat-input-shell:focus-within {
  border-color: transparent;
  background: var(--neu-bg);
  box-shadow: var(--neu-press), 0 0 0 3px rgba(125, 156, 247, 0.18);
}

.collab-chat-mention-option {
  border-radius: 0.8rem;
}

.collab-chat-mention-option.is-active,
.collab-chat-mention-option:hover {
  border-color: transparent;
  background: var(--neu-bg);
  box-shadow: var(--neu-press);
}

.collab-chat-resize-handle {
  top: 0.45rem;
  left: 0.45rem;
  width: 1.15rem;
  height: 1.15rem;
  border-top-color: #c2ccd9;
  border-left-color: rgba(255, 255, 255, 0.92);
}

@media (max-width: 760px) {
  .collab-chat-shell {
    right: 0.75rem;
    bottom: 0.75rem;
    left: 0.75rem;
  }

  .collab-chat-launcher {
    width: 100%;
    justify-content: space-between;
  }

  .collab-chat-panel {
    position: fixed;
    inset: 0.75rem;
    width: auto;
    height: auto;
    transform-origin: bottom center;
  }

  .collab-chat-layout {
    grid-template-columns: 5.55rem minmax(0, 1fr);
  }

  .collab-chat-sidebar {
    padding: 1.55rem 0.45rem 0.75rem;
  }

  .collab-chat-main {
    gap: 0.68rem;
    padding: 0.74rem;
  }

  .collab-chat-resize-handle {
    display: none;
  }

  .collab-chat-composer-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .collab-chat-header-actions {
    justify-content: stretch;
    max-width: none;
  }

  .collab-chat-header-actions > .collab-chat-ghost,
  .collab-chat-header-actions > .collab-chat-toggle {
    flex: 1 1 calc(50% - 0.24rem);
  }

  .collab-chat-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.45rem;
    padding: 0.56rem 0.62rem;
  }

  .collab-chat-project-main,
  .collab-chat-project-meta {
    flex-wrap: wrap;
  }

  .collab-chat-toolbar-group:last-child {
    margin-left: 0;
  }

  .collab-chat-toolbar-copy {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .collab-chat-section {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.38rem;
  }

  .collab-chat-avatar {
    width: 2.7rem;
    height: 2.7rem;
  }

  .collab-chat-room-trigger-copy {
    gap: 0.42rem;
  }

  .collab-chat-person-card {
    display: none;
  }
}

@media (max-width: 480px) {
  .collab-chat-shell {
    right: 0.5rem;
    bottom: 0.5rem;
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
    inset: 0.5rem;
    border-radius: 1.1rem;
  }

  .collab-chat-layout {
    grid-template-columns: 4.95rem minmax(0, 1fr);
  }

  .collab-chat-sidebar {
    padding: 1.4rem 0.36rem 0.65rem;
  }

  .collab-chat-roster {
    gap: 0.58rem;
  }

  .collab-chat-main {
    gap: 0.7rem;
    padding: 0.85rem 0.72rem 0.78rem;
  }

  .collab-chat-header {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
    padding-left: 0.2rem;
  }

  .collab-chat-header-copy {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.14rem;
  }

  .collab-chat-kicker,
  .collab-chat-header-copy h2,
  .collab-chat-header-copy p {
    grid-column: 1;
    grid-row: auto;
  }

  .collab-chat-header-copy h2 {
    font-size: 1.04rem;
    -webkit-line-clamp: 2;
  }

  .collab-chat-header-copy p,
  .collab-chat-toolbar-copy {
    font-size: 0.74rem;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .collab-chat-toolbar {
    gap: 0.6rem;
    padding: 0.65rem 0.7rem;
  }

  .collab-chat-project-strip {
    gap: 0.36rem;
    padding: 0.58rem 0.7rem;
  }

  .collab-chat-toolbar-group {
    align-items: flex-start;
  }

  .collab-chat-room-dropdown {
    max-height: 10rem;
  }

  .collab-chat-room-trigger-copy {
    gap: 0.36rem;
  }

  .collab-chat-room-trigger-copy span,
  .collab-chat-room-option span {
    font-size: 0.66rem;
  }

  .collab-chat-person {
    gap: 0.32rem;
    padding: 0.28rem 0.12rem 0.35rem;
    border-radius: 0.85rem;
  }

  .collab-chat-avatar {
    width: 2.35rem;
    height: 2.35rem;
  }

  .collab-chat-person-label {
    font-size: 0.66rem;
  }

  .collab-chat-events {
    gap: 0.65rem;
    padding: 0.75rem;
  }

  .collab-chat-event {
    padding: 0.7rem 0.75rem;
  }

  .collab-chat-composer {
    gap: 0.7rem;
  }

  .collab-chat-input-shell {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.42rem;
  }

  .collab-chat-input-wrap textarea {
    min-height: 3.8rem;
    padding: 0.3rem 0.32rem;
  }

  .collab-chat-send {
    width: 100%;
    min-width: 0;
  }
}
*/
`;
}


export { renderCollaborationChatStyles };
