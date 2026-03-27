import assert from "node:assert/strict";
import test from "node:test";
import { createInsightRenderers } from "../src/ui/server-insight-panels";

function buildRenderers() {
  return createInsightRenderers({
    buildSessionDetailHref: () => "#",
    buildTaskDetailHref: () => "#",
    dataConnectionLabel: () => "",
    hasFreshRuntimeTimestamp: () => true,
    humanizeOperatorLabel: () => "",
    normalizeInlineText: (value: unknown) => String(value ?? ""),
    pickLatestSessionActivityTimestamp: () => undefined,
    pickLatestTimestamp: () => undefined,
    simplifyUsageLabel: () => "",
    TASK_RUNTIME_ACTIVITY_WINDOW_MS: 1_000,
    toSortableMs: () => 0,
  });
}

test("settings environment status card keeps zh copy and employee contract when called from server", () => {
  const { renderSettingsEnvironmentStatusCard } = buildRenderers();

  const html = renderSettingsEnvironmentStatusCard(
    {
      generatedAt: "2026-03-26T15:46:00.000Z",
      status: "ok",
      items: [
        { key: "gateway", status: "ok", detail: "ws://127.0.0.1:18789", value: "Connected" },
        { key: "config", status: "ok", detail: "Local-only by default", value: "Ready" },
        { key: "runtime", status: "ok", detail: "114 sessions visible across 7 agents", value: "114" },
      ],
    },
    {
      connectors: {
        modelContextCatalog: "connected",
        digestHistory: "connected",
        requestCounts: "connected",
        budgetLimit: "connected",
        providerAttribution: "connected",
        subscriptionUsage: "connected",
        todos: [],
      },
    },
    {
      generatedAt: "2026-03-26T15:46:00.000Z",
      status: "ok",
      counts: { critical: 0, warn: 0, info: 0 },
      findings: [],
    },
    {
      generatedAt: "2026-03-26T15:46:00.000Z",
      status: "ok",
      currentVersion: "2026.3.24",
      latestVersion: "2026.3.24",
      channelLabel: "stable (default)",
      updateAvailable: false,
      installKind: "package",
      packageManager: "pnpm",
    },
    {
      status: "ok",
      warnings: [],
      blockingReasons: [],
      readReady: true,
      dispatchReady: true,
      abortReady: true,
      validatedFloor: "2026.3.24",
      currentVersion: "2026.3.24",
      gatewayVersion: "2026.3.24",
      items: [
        {
          key: "version",
          status: "ok",
          value: "2026.3.24",
          detail: "OpenClaw 2026.3.24 is inside the guarded employee-system train (>= 2026.3.23).",
        },
        {
          key: "sessions-json",
          status: "info",
          value: "probe unavailable",
          detail:
            "sessions --json probe is unavailable, so compatibility stays in best-effort mode until the next successful read.",
        },
      ],
    },
    "<li>所有用量连接器均已启用。</li>",
    "<section id=\"settings-budget-limit\">预算</section>",
    "zh",
  );

  assert.match(html, /系统环境状态/);
  assert.match(html, /当前版本/);
  assert.match(html, /2026\.3\.24/);
  assert.match(html, /settings-environment-shell/);
  assert.match(html, /settings-connection-column/);
  assert.match(html, /运行版本与契约/);
  assert.match(html, /安全风险摘要/);
  assert.match(html, /数据接入与预算/);
  assert.match(html, /仍在员工系统受控兼容范围内/);
  assert.match(html, /探测不可用/);
  assert.doesNotMatch(html, /settings-security-stack/);
  assert.doesNotMatch(html, /System environment status/);
  assert.doesNotMatch(html, /inside the guarded employee-system train/);
});
