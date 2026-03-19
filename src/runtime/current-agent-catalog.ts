import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { humanizeOperatorDisplayName } from "./operator-display";
import { compareAgentHierarchy } from "./team-hierarchy";

export type CurrentAgentCatalogStatus = "connected" | "partial" | "not_connected";

export interface CurrentAgentCatalogEntry {
  agentId: string;
  displayName: string;
  workspace?: string;
}

export interface CurrentAgentCatalog {
  status: CurrentAgentCatalogStatus;
  sourcePath: string;
  detail: string;
  entries: CurrentAgentCatalogEntry[];
  primaryAgentId?: string;
  primaryDisplayName?: string;
}

export async function loadCurrentAgentCatalog(): Promise<CurrentAgentCatalog> {
  const sourcePath = resolveOpenClawConfigPath();

  try {
    const raw = JSON.parse(await readFile(sourcePath, "utf8")) as unknown;
    const root = asObject(raw) ?? {};
    const agents = asObject(root.agents) ?? {};
    const list = asArray(agents.list);
    const merged = new Map<string, CurrentAgentCatalogEntry>();

    for (const item of list) {
      const obj = asObject(item);
      if (!obj) continue;
      const agentId = asString(obj.id)?.trim() ?? asString(obj.name)?.trim();
      if (!agentId) continue;
      const identity = asObject(obj.identity);
      const workspace = asString(obj.workspace)?.trim();
      const key = normalizeKey(agentId);
      if (merged.has(key)) continue;
      merged.set(key, {
        agentId,
        displayName:
          humanizeOperatorDisplayName(
            asString(obj.name)?.trim() ||
              asString(identity?.name)?.trim() ||
              agentId,
          ) || agentId,
        workspace: workspace && workspace.length > 0 ? workspace : undefined,
      });
    }

    const entries = [...merged.values()].sort((a, b) => compareAgentHierarchy(a.agentId, b.agentId));
    const primary = resolvePrimaryAgentEntry(entries);
    if (entries.length === 0) {
      return {
        status: "partial",
        sourcePath,
        detail: "openclaw.json found but agents.list is empty.",
        entries: [],
        primaryAgentId: undefined,
        primaryDisplayName: undefined,
      };
    }

    return {
      status: "connected",
      sourcePath,
      detail: `loaded ${entries.length} current agent(s) from openclaw.json.`,
      entries,
      primaryAgentId: primary?.agentId,
      primaryDisplayName: primary?.displayName,
    };
  } catch (error) {
    if (isFsNotFound(error)) {
      return {
        status: "not_connected",
        sourcePath,
        detail: "openclaw.json not found.",
        entries: [],
        primaryAgentId: undefined,
        primaryDisplayName: undefined,
      };
    }
    return {
      status: "partial",
      sourcePath,
      detail: "openclaw.json exists but could not be parsed.",
      entries: [],
      primaryAgentId: undefined,
      primaryDisplayName: undefined,
    };
  }
}

export function resolveOpenClawHomePath(): string {
  return process.env.OPENCLAW_HOME?.trim() || join(homedir(), ".openclaw");
}

export function resolveOpenClawConfigPath(): string {
  const explicit = process.env.OPENCLAW_CONFIG_PATH?.trim();
  if (explicit) return explicit;
  return join(resolveOpenClawHomePath(), "openclaw.json");
}

function isFsNotFound(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string" &&
      (error as { code: string }).code === "ENOENT",
  );
}

function normalizeKey(input: string): string {
  return input.trim().toLowerCase();
}

function resolvePrimaryAgentEntry(
  entries: CurrentAgentCatalogEntry[],
): CurrentAgentCatalogEntry | undefined {
  if (entries.length === 0) return undefined;
  return (
    entries.find((entry) => {
      const key = normalizeKey(entry.agentId);
      return key === "main" || key === "jarvis";
    }) ??
    entries.find((entry) => normalizeKey(entry.displayName) === "jarvis") ??
    entries[0]
  );
}

function asObject(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined;
}

function asArray(input: unknown): unknown[] {
  return Array.isArray(input) ? input : [];
}

function asString(input: unknown): string | undefined {
  return typeof input === "string" ? input : undefined;
}
