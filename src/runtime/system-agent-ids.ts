const INTERNAL_MONITOR_AGENT_KEYS = new Set([
  "heartratemonitor",
  "heartbeatmonitor",
  "heartmonitor",
  "watchdog",
]);

export function normalizeSystemAgentKey(input: string | undefined): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function isInternalMonitorAgentId(input: string | undefined): boolean {
  const normalized = normalizeSystemAgentKey(input);
  return normalized !== "" && INTERNAL_MONITOR_AGENT_KEYS.has(normalized);
}
