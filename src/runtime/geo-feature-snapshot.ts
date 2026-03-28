import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getGeoAuditState, getGeoAuditSummary, type GeoAuditRunState, type GeoAuditSummaryData } from "./geo-audit";
import {
  GEO_SUITE_MODULE_KEYS,
  getGeoSuiteModuleState,
  type GeoSuiteModuleKey,
  type GeoSuiteModuleRunState,
} from "./geo-suite";
import { startSerialIntervalLoop, type SerialIntervalLoopHandle } from "./serial-interval-loop";

const GEO_FEATURE_SNAPSHOT_INTERVAL_MS = 15_000;

export interface GeoFeatureSnapshot {
  updatedAt: string;
  state: GeoAuditRunState;
  summary: GeoAuditSummaryData;
  modules: Partial<Record<GeoSuiteModuleKey, GeoSuiteModuleRunState>>;
}

let persistGeoFeatureSnapshotQueue: Promise<void> = Promise.resolve();
let geoFeatureSnapshotLoop: SerialIntervalLoopHandle | undefined;

export function ensureGeoFeatureSnapshotLoop(): void {
  if (geoFeatureSnapshotLoop) {
    return;
  }
  geoFeatureSnapshotLoop = startSerialIntervalLoop({
    intervalMs: GEO_FEATURE_SNAPSHOT_INTERVAL_MS,
    runOnce: async () => {
      await refreshGeoFeatureSnapshot();
    },
  });
}

export async function loadGeoFeatureSnapshot(): Promise<GeoFeatureSnapshot> {
  const path = getGeoFeatureSnapshotPath();
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<GeoFeatureSnapshot>;
    if (parsed && typeof parsed === "object" && parsed.state && parsed.summary && parsed.modules) {
      return parsed as GeoFeatureSnapshot;
    }
  } catch {}
  return await refreshGeoFeatureSnapshot();
}

export async function refreshGeoFeatureSnapshot(): Promise<GeoFeatureSnapshot> {
  const [state, summary, moduleEntries] = await Promise.all([
    getGeoAuditState(),
    getGeoAuditSummary(),
    Promise.all(
      GEO_SUITE_MODULE_KEYS.map(async (moduleKey) => {
        const moduleState = await getGeoSuiteModuleState(moduleKey);
        return [moduleKey, moduleState] as const;
      }),
    ),
  ]);

  const snapshot: GeoFeatureSnapshot = {
    updatedAt: new Date().toISOString(),
    state,
    summary,
    modules: Object.fromEntries(moduleEntries) as Partial<Record<GeoSuiteModuleKey, GeoSuiteModuleRunState>>,
  };
  await writeGeoFeatureSnapshot(snapshot);
  return snapshot;
}

function getGeoFeatureSnapshotPath(): string {
  return join(process.cwd(), "runtime", "geo-feature-snapshot.json");
}

async function writeGeoFeatureSnapshot(snapshot: GeoFeatureSnapshot): Promise<void> {
  const path = getGeoFeatureSnapshotPath();
  const nextWrite = persistGeoFeatureSnapshotQueue.catch(() => undefined).then(async () => {
    await mkdir(dirname(path), { recursive: true });
    const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    await rename(tempPath, path);
  });
  persistGeoFeatureSnapshotQueue = nextWrite.catch(() => undefined);
  await nextWrite;
}
