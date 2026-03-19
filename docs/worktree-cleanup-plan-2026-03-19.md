# openclaw-control-center cleanup plan

Updated: 2026-03-19

## What changed today

Two high-risk runtime issues were closed before any cleanup work:

- Added a dispatch-time OpenClaw CLI and gateway health precheck before `agentTurn`.
- Added safer stale-lock handling that reads lock metadata and only clears abandoned session locks under the OpenClaw home.

Relevant files:

- `src/runtime/openclaw-cli.ts`
- `src/clients/openclaw-live-client.ts`
- `test/openclaw-cli.test.ts`
- `test/openclaw-live-client-502.test.ts`

The first `server.ts` cleanup step also landed:

- extracted read-model snapshot and live-session merge logic into `src/ui/server-read-model.ts`
- kept `src/ui/server.ts` as the route-layer entrypoint with thin wrapper functions
- updated smoke coverage so source-level assertions follow the new module boundary

The second and third `server.ts` cleanup steps also landed:

- extracted dashboard refresh / warmup / notification-center orchestration into `src/ui/server-dashboard-runtime.ts`
- extracted staff role inference and workspace evidence lookup into `src/ui/server-staff-overview.ts`
- kept source-visible wrapper functions in `src/ui/server.ts` so route-layer behavior stays stable while the monolith keeps shrinking

The fourth `server.ts` cleanup step also landed:

- extracted team snapshot loading and OpenClaw staff model configuration helpers into `src/ui/server-staff-models.ts`
- kept `loadTeamSnapshot`, `updateOpenClawAgentModel`, and `collectOpenClawModelOptions` visible in `src/ui/server.ts` as thin wrappers for smoke-test stability

Relevant files:

- `src/ui/server.ts`
- `src/ui/server-read-model.ts`
- `src/ui/server-dashboard-runtime.ts`
- `src/ui/server-staff-overview.ts`
- `src/ui/server-staff-models.ts`
- `test/ui-render-smoke.test.ts`

The first helper-script cleanup also landed:

- removed the now-unused `cross-env` dev dependency after the move to `scripts/run-index.js`
- synchronized `package.json`, `package-lock.json`, and `pnpm-lock.yaml`

One low-risk dead-code cleanup also landed:

- removed the unused legacy `loadMemoryEntries` path from `src/ui/server.ts`
- removed its no-longer-used local memory constants and `extractMarkdownHeading` helper
- kept the active editable memory workbench path unchanged

One shared-helper cleanup also landed:

- moved `extractDateFromName` and `toPlainSummary` into `src/ui/server-shared.ts`
- removed the duplicate local implementations from `src/ui/server.ts`

One thin-wrapper cleanup also landed:

- inlined several `editableFileHelpers` wrapper calls inside `src/ui/server.ts`
- removed unused local wrappers for file read/write and budget-policy write/apply paths
- further removed local wrappers for editable file listing, editable agent scope loading, and configured workspace root resolution
- removed unused staff-overview wrappers for workspace resolution, role evidence loading, and core-duty labeling
- removed the remaining pure wrappers for memory/workspace facet option loading and config/workspace scope loader pass-throughs

## Current dirty-worktree shape

Current `git status --short` counts from 2026-03-19:

- `71` untracked files
- `25` modified files
- `96` total dirty entries

Grouped by area:

- `45` files under `src/ui`
- `18` files under `src/runtime`
- `21` files under `test`
- `5` files under `scripts`
- `3` files under `docs`
- `2` files under `src/clients`
- `1` file under `src/contracts`
- `1` root file (`package.json`)

## What is already live

The existing classification and wiring docs already show the most important fact:

- most scary-looking `?? src/ui/*.ts` files are already wired into `src/ui/server.ts`
- most `?? src/runtime/*.ts` files are live dependencies under the collaboration/runtime split
- most files with no inbound code references are tests or smoke helpers, not dead product code
- newer split files like `src/ui/server-read-model.ts`, `src/ui/server-dashboard-runtime.ts`, `src/ui/server-staff-overview.ts`, and `src/ui/server-staff-models.ts` are already direct live dependencies

Reference docs:

- `docs/worktree-classification-2026-03-18.md`
- `docs/worktree-wiring-map-2026-03-18.md`

## Safe cleanup rules

Do not do these yet:

- bulk delete untracked files
- move split source files just to make the tree look cleaner
- run `git clean` or any destructive reset-style cleanup

Why:

- the UI and runtime split is still active work, not abandoned code
- deleting or moving the wrong `src/ui` or `src/runtime` file can break the live collaboration surface
- the bottom-right collaboration chat is a protected feature and must stay intact

## Recommended cleanup order

### Phase 1: freeze live buckets

Treat these as protected buckets, not cleanup candidates:

- `src/ui/server*.ts`
- `src/ui/collaboration-chat-widget*.ts`
- `src/runtime/collaboration-*.ts`
- `src/runtime/openclaw-chat-rooms.ts`
- `src/runtime/openclaw-cli.ts`
- matching tests under `test/`

### Phase 2: close the `server.ts` extraction boundary

Next cleanup pass should focus on reducing ambiguity inside the split, not deleting files:

- confirm which responsibilities still live inside `src/ui/server.ts`
- map each remaining in-file section to an existing extracted module
- identify duplicated logic that still exists both in `server.ts` and a split file

### Phase 3: review helper scripts

Only after the live split is stable, review small helper surfaces:

- `scripts/export-staff-avatars.ts`
- `scripts/ui-smoke.js`
- `scripts/ui-smoke.sh`

These are the lowest-risk later cleanup candidates if they are no longer needed.

### Phase 4: final file cleanup

After phases 1-3 are done:

- re-run the wiring map
- list files with no inbound references and no operator workflow usage
- only then decide what is truly removable

## Suggested commit boundaries

If the goal is to make the repo feel less chaotic, the safest boundaries are:

1. `server.ts` extraction core
2. collaboration chat and room runtime
3. OpenClaw CLI/runtime integration
4. smoke and regression tests
5. helper scripts and docs

## Bottom line

The worktree is dirty, but it is not random.

The correct next move is controlled consolidation around the active split modules, not aggressive file deletion.
