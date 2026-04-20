const LEGACY_SQLITE_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function parseAppTimestamp(value: string): Date {
  const normalized = LEGACY_SQLITE_TIMESTAMP_PATTERN.test(value)
    ? value.replace(" ", "T") + "Z"
    : value;

  return new Date(normalized);
}

export function formatAppDateTime(value: string): string {
  const parsed = parseAppTimestamp(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
