// Display formatters. Pure string helpers — no JSX.

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatPoints(value: number, digits = 2): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}pp`;
}

export function formatSignedNumber(value: number, digits = 2): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export function formatRatio(value: number, digits = 2): string {
  return `${value.toFixed(digits)}x`;
}

export function formatFraction(numerator: number, denominator: number): string {
  return `${numerator}/${denominator}`;
}

export function formatCompactNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString();
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(digits);
}

export function formatAvgPosition(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0.0";
  return value.toFixed(1);
}

export function formatLatency(ms?: number): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)}s`;
}

export function formatParserStatus(status?: string): string {
  switch (status) {
    case "structured_json":
      return "structured JSON";
    case "partial_recovery":
      return "partial recovery";
    case "text_fallback":
      return "text fallback";
    case "extraction_conflict":
      return "extraction conflict";
    case "call_error":
      return "call error";
    case "parse_error":
      return "parse error";
    default:
      return status || "unknown";
  }
}
