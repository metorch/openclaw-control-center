export const DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME = "Jarvis";

export function isPrimaryOperatorAgentId(value: string | undefined): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "main" || normalized === "jarvis";
}

export function humanizeOperatorDisplayName(value: string): string | undefined {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  if (isPrimaryOperatorAgentId(trimmed)) return DEFAULT_PRIMARY_OPERATOR_DISPLAY_NAME;
  const normalized = trimmed.replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
}
