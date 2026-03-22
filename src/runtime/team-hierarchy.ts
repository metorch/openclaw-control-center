const TEAM_HIERARCHY_GROUPS = [
  ["main", "jarvis"],
  ["dispatcher", "productdispatcher", "product"],
  ["architect", "architecture"],
  ["backend", "api", "server"],
  ["frontend", "ui", "client"],
  ["automation", "content", "data", "research", "support", "cs"],
  ["qa", "quality", "test"],
  ["ops", "devops", "release", "sre"],
  ["heartratemonitor", "heartmonitor", "heartbeatmonitor", "heartbeat", "watchdog", "monitor"],
] as const;

export function compareAgentHierarchy(left: string, right: string): number {
  const rankDiff = agentHierarchyRank(left) - agentHierarchyRank(right);
  if (rankDiff !== 0) {
    return rankDiff;
  }
  return left.localeCompare(right, "zh-Hans-CN");
}

export function agentHierarchyRank(input: string): number {
  const key = normalizeAgentHierarchyKey(input);
  if (!key) {
    return TEAM_HIERARCHY_GROUPS.length + 100;
  }

  for (let index = 0; index < TEAM_HIERARCHY_GROUPS.length; index += 1) {
    const group = TEAM_HIERARCHY_GROUPS[index];
    if (group.some((token) => key === token || key.includes(token))) {
      return index;
    }
  }

  return TEAM_HIERARCHY_GROUPS.length + 100;
}

function normalizeAgentHierarchyKey(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
