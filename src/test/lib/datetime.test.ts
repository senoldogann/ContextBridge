import { describe, expect, it } from "vitest";
import { parseAppTimestamp } from "@/lib/datetime";

describe("parseAppTimestamp", () => {
  it("treats legacy SQLite timestamps as UTC", () => {
    const parsed = parseAppTimestamp("2026-04-19 22:15:05");

    expect(parsed.toISOString()).toBe("2026-04-19T22:15:05.000Z");
  });

  it("keeps RFC3339 timestamps intact", () => {
    const parsed = parseAppTimestamp("2026-04-20T01:15:05Z");

    expect(parsed.toISOString()).toBe("2026-04-20T01:15:05.000Z");
  });
});
