# openclaw-control-center worktree classification

Updated: 2026-03-19

## Why this file exists

This file answers the practical version of "the repo looks dirty":

- what the dirty files actually are
- which ones are live product modules
- which ones are tests or operator helpers
- which ones are realistic later cleanup candidates

The main conclusion is unchanged:

- the repo is still dirty in Git terms
- it is not random chaos
- most untracked source files are active split modules, not garbage

## Current snapshot

Current `git status --short` from 2026-03-19:

- modified files: `25`
- untracked files: `71`
- total dirty entries: `96`

Current buckets by area:

- `45` under `src/ui`
- `18` under `src/runtime`
- `21` under `test`
- `5` under `scripts`
- `3` under `docs`
- `2` under `src/clients`
- `1` under `src/contracts`
- `1` repo root file

## Bucket 1: entrypoints and operator launchers

These are not accidental files. They define how the current local workflow starts and validates the app.

- `package.json`
- `scripts/run-index.js`
- `scripts/start-ui-4310.cmd`
- `scripts/ui-smoke.js`
- `scripts/ui-smoke.sh`

What changed:

- `package.json` now routes `dev:continuous`, `dev:ui`, and several command scripts through `scripts/run-index.js`
- `scripts/start-ui-4310.cmd` is the Windows launcher for the `4310` UI workflow
- `scripts/ui-smoke.js` is the Windows-compatible smoke runner
- `scripts/ui-smoke.sh` is still the shell companion for non-Windows usage

Interpretation:

- keep these as operator-facing entry surfaces
- do not treat them as dead just because some are not imported by application code

## Bucket 2: OpenClaw client and contract boundary

These are part of the external integration edge, not stray files:

- `src/clients/openclaw-live-client.ts`
- `src/clients/tool-client.ts`
- `src/contracts/openclaw-tools.ts`

Interpretation:

- this is the protocol and live-client boundary
- changes here affect tool calls, agent turns, and external integration stability

## Bucket 3: runtime domain split

These files are the server-side runtime layer and are already grouped by responsibility:

- `src/runtime/agent-team-refresh.ts`
- `src/runtime/api-docs.ts`
- `src/runtime/budget-governance.ts`
- `src/runtime/chat-markdown.ts`
- `src/runtime/collaboration-agent-artifacts.ts`
- `src/runtime/collaboration-project-memory.ts`
- `src/runtime/collaboration-room.ts`
- `src/runtime/collaboration-stage-results.ts`
- `src/runtime/current-agent-catalog.ts`
- `src/runtime/office-session-presence.ts`
- `src/runtime/openclaw-chat-rooms.ts`
- `src/runtime/openclaw-cli.ts`
- `src/runtime/openclaw-cli-insights.ts`
- `src/runtime/operator-display.ts`
- `src/runtime/session-conversations.ts`
- `src/runtime/snapshot-store.ts`
- `src/runtime/ui-preferences.ts`
- `src/runtime/usage-cost.ts`

Useful sub-groups:

- collaboration and transcript runtime:
  `chat-markdown.ts`, `collaboration-agent-artifacts.ts`, `collaboration-project-memory.ts`, `collaboration-room.ts`, `collaboration-stage-results.ts`, `openclaw-chat-rooms.ts`, `session-conversations.ts`
- observation and state surfaces:
  `snapshot-store.ts`, `office-session-presence.ts`, `operator-display.ts`
- governance and operator controls:
  `budget-governance.ts`, `usage-cost.ts`, `ui-preferences.ts`, `current-agent-catalog.ts`
- CLI and external insight surfaces:
  `api-docs.ts`, `openclaw-cli.ts`, `openclaw-cli-insights.ts`, `agent-team-refresh.ts`

Interpretation:

- this is an active runtime split
- these files are not good deletion targets

## Bucket 4: UI monolith split

This is still the biggest source of dirty-file anxiety, but it is also the clearest sign of active refactoring.

Core UI entry and split modules:

- `src/ui/server.ts`
- `src/ui/docs-hub.ts`
- `src/ui/server-agent-team.ts`
- `src/ui/server-core-helpers.ts`
- `src/ui/server-dashboard-queries.ts`
- `src/ui/server-dashboard-runtime.ts`
- `src/ui/server-detail-pages.ts`
- `src/ui/server-editable-files.ts`
- `src/ui/server-execution-chains.ts`
- `src/ui/server-global-visibility.ts`
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

Collaboration UI modules:

- `src/ui/collaboration-chat-widget.ts`
- `src/ui/collaboration-chat-widget-helpers.ts`
- `src/ui/collaboration-chat-widget-labels.ts`
- `src/ui/collaboration-chat-widget-script-actions.ts`
- `src/ui/collaboration-chat-widget-script-boot.ts`
- `src/ui/collaboration-chat-widget-script-prelude.ts`
- `src/ui/collaboration-chat-widget-script-rendering.ts`
- `src/ui/collaboration-chat-widget-styles.ts`
- `src/ui/collaboration-chat-widget-types.ts`
- `src/ui/server-collaboration-chat.ts`
- `src/ui/server-collaboration-room.ts`
- `src/ui/server-collaboration-threads.ts`

Inline-script split modules:

- `src/ui/server-inline-scripts.ts`
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

- `server.ts` is still large, but the split is already real
- the newly added modules are already part of that split, not abandoned experiments
- the bottom-right collaboration chat is in this protected area and must not be hidden or removed

## Bucket 5: tests and regression coverage

These dirty files are validation surface, not business-logic clutter:

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

- these files are evidence that the split work is being regression-tested
- they should be grouped with the modules they protect, not treated as random noise

## Bucket 6: docs

Current cleanup and reasoning docs:

- `docs/worktree-classification-2026-03-18.md`
- `docs/worktree-cleanup-plan-2026-03-19.md`
- `docs/worktree-wiring-map-2026-03-18.md`

Interpretation:

- these docs are part of the cleanup itself
- they reduce ambiguity and help avoid destructive cleanup mistakes

## What is actually low-risk to review later

These are review candidates, not immediate deletion targets:

- `scripts/ui-smoke.sh`
  keep if a shell-side smoke flow is still needed outside Windows
- `scripts/export-staff-avatars.ts`
  keep if avatar export remains part of the operator workflow

## What should not be done now

- do not bulk delete `??` files
- do not run `git clean`
- do not move split source files just to make the tree look prettier
- do not touch collaboration chat files as cleanup collateral

## Bottom line

The repo is still dirty, but it is now explainable.

The next useful move is controlled consolidation:

1. keep shrinking `src/ui/server.ts`
2. keep tests aligned with each extracted module
3. only after that, review the few true helper-script candidates
