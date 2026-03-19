# openclaw-control-center wiring map

Updated: 2026-03-19

## Why this file exists

The classification document groups dirty files by area.

This file answers a different question:

- which split files are already wired into the live app
- which files are second-level dependencies under those modules
- which files are operator helpers rather than imported code
- which files are realistic review candidates later

## Current conclusion

The codebase is still in a dirty worktree state, but most dirty source files are already wired into active entrypaths.

The most important outcome from the current pass:

- there are no obvious untracked `src/ui` or `src/runtime` files that look like dead garbage
- the newer split files are already live dependencies of `src/ui/server.ts`
- the remaining cleanup problem is consolidation, not random file deletion

## Directly wired into `src/ui/server.ts`

These files are in the live UI server path and should be treated as protected.

Runtime files directly required by `src/ui/server.ts`:

- `src/runtime/agent-team-refresh.ts`
- `src/runtime/api-docs.ts`
- `src/runtime/budget-governance.ts`
- `src/runtime/chat-markdown.ts`
- `src/runtime/collaboration-agent-artifacts.ts`
- `src/runtime/collaboration-room.ts`
- `src/runtime/current-agent-catalog.ts`
- `src/runtime/office-session-presence.ts`
- `src/runtime/openclaw-chat-rooms.ts`
- `src/runtime/openclaw-cli-insights.ts`
- `src/runtime/operator-display.ts`
- `src/runtime/session-conversations.ts`
- `src/runtime/ui-preferences.ts`
- `src/runtime/usage-cost.ts`

UI files directly required by `src/ui/server.ts`:

- `src/ui/collaboration-chat-widget.ts`
- `src/ui/docs-hub.ts`
- `src/ui/server-agent-team.ts`
- `src/ui/server-collaboration-chat.ts`
- `src/ui/server-collaboration-room.ts`
- `src/ui/server-collaboration-threads.ts`
- `src/ui/server-core-helpers.ts`
- `src/ui/server-dashboard-queries.ts`
- `src/ui/server-dashboard-runtime.ts`
- `src/ui/server-detail-pages.ts`
- `src/ui/server-editable-files.ts`
- `src/ui/server-execution-chains.ts`
- `src/ui/server-global-visibility.ts`
- `src/ui/server-inline-scripts.ts`
- `src/ui/server-insight-panels.ts`
- `src/ui/server-office-runtime.ts`
- `src/ui/server-read-model.ts`
- `src/ui/server-runtime-caches.ts`
- `src/ui/server-runtime-labels.ts`
- `src/ui/server-session-conversations.ts`
- `src/ui/server-shared.ts`
- `src/ui/server-staff-models.ts`
- `src/ui/server-staff-overview.ts`
- `src/ui/server-task-pages.ts`
- `src/ui/server-task-spotlight.ts`
- `src/ui/server-team-panels.ts`
- `src/ui/server-usage-rendering.ts`

Interpretation:

- the large `server.ts` split is already operational
- the recently added `server-read-model.ts`, `server-dashboard-runtime.ts`, `server-staff-overview.ts`, and `server-staff-models.ts` are live dependencies, not staging junk

## Indirect code dependencies

These files are also live, but sit one layer below a direct module.

Runtime leaf modules:

- `src/runtime/collaboration-project-memory.ts`
- `src/runtime/collaboration-stage-results.ts`
- `src/runtime/openclaw-cli.ts`
- `src/runtime/snapshot-store.ts`

Collaboration UI leaves:

- `src/ui/collaboration-chat-widget-helpers.ts`
- `src/ui/collaboration-chat-widget-labels.ts`
- `src/ui/collaboration-chat-widget-script-actions.ts`
- `src/ui/collaboration-chat-widget-script-boot.ts`
- `src/ui/collaboration-chat-widget-script-prelude.ts`
- `src/ui/collaboration-chat-widget-script-rendering.ts`
- `src/ui/collaboration-chat-widget-styles.ts`
- `src/ui/collaboration-chat-widget-types.ts`

Inline script leaves:

- `src/ui/server-inline-scripts-agent-visual.ts`
- `src/ui/server-inline-scripts-collaboration-filter.ts`
- `src/ui/server-inline-scripts-dashboard-refresh.ts`
- `src/ui/server-inline-scripts-file-workbench.ts`
- `src/ui/server-inline-scripts-native-motion.ts`
- `src/ui/server-inline-scripts-quota-reset.ts`
- `src/ui/server-inline-scripts-settings-budget.ts`
- `src/ui/server-inline-scripts-staff-model.ts`
- `src/ui/server-inline-scripts-task-board.ts`

Interpretation:

- these are also live source files
- they are not good cleanup-delete targets

## Repo entrypoints and operator helpers

These matter even if they are not imported by application code.

Primary repo entry:

- `src/index.ts`

Operator entry scripts:

- `scripts/run-index.js`
- `scripts/start-ui-4310.cmd`

Operator smoke helpers:

- `scripts/ui-smoke.js`
- `scripts/ui-smoke.sh`

Important note:

- `package.json` now routes `dev:continuous`, `dev:ui`, and several command scripts through `scripts/run-index.js`
- `scripts/start-ui-4310.cmd` is the Windows wrapper for the same launcher

Interpretation:

- these files belong to the operational surface
- they should be documented, not deleted by default

## Tests and validation-only files

These mostly have no inbound code references because they are validation surfaces, not because they are dead.

- `test/agent-team-refresh.test.ts`
- `test/budget-governance.test.ts`
- `test/chat-markdown.test.ts`
- `test/collaboration-agent-artifacts.test.ts`
- `test/collaboration-background-session.test.ts`
- `test/collaboration-project-memory.test.ts`
- `test/collaboration-room.test.ts`
- `test/collaboration-stage-results.test.ts`
- `test/office-session-presence.test.ts`
- `test/openclaw-chat-rooms.test.ts`
- `test/openclaw-cli-insights.test.ts`
- `test/openclaw-cli.test.ts`
- `test/openclaw-live-client-502.test.ts`
- `test/openclaw-live-client-agent-turn.test.ts`
- `test/openclaw-live-client-history.test.ts`
- `test/openclaw-live-client-sessions.test.ts`
- `test/server-collaboration-chat.test.ts`
- `test/session-conversations-cache.test.ts`
- `test/ui-language-preferences.test.ts`
- `test/ui-render-smoke.test.ts`
- `test/usage-cost.test.ts`

Interpretation:

- no inbound app reference is expected for most of this bucket
- this bucket is still useful and should follow module boundaries during cleanup

## Realistic later review candidates

The current list of actual later review candidates is short:

- `scripts/ui-smoke.sh`
  keep if non-Windows shell validation is still needed
- `scripts/export-staff-avatars.ts`
  keep if the avatar export workflow still matters operationally

## Practical next move

If the goal is to make the repo easier to reason about, the next step is not file deletion.

The safer path is:

1. continue shrinking `src/ui/server.ts`
2. keep each extracted module paired with smoke or regression coverage
3. review the few helper-script candidates only after the live split is stable

## Bottom line

Most dirty source files are already wired into the app.

That means the correct cleanup move remains controlled consolidation, not aggressive deletion.
