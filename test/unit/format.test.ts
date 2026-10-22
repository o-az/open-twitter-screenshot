import { expect, it } from "vitest";
import { formatDate, formatNumber } from "@/lib/format";

it("formats X-style counts on both sides of compact boundaries", () => {
  expect(
    [0, 999, 1000, 1234, 12345, 1200000].map((n) => formatNumber(n)),
  ).toEqual(["0", "999", "1K", "1.2K", "12.3K", "1.2M"]);
  expect(formatNumber(1234, false)).toBe("1,234");
});
it("uses deterministic UTC dates and explicit relative time", () => {
  expect(formatDate("2024-01-02T23:04:00Z", "datetime", 0)).toBe(
    "11:04 PM · Jan 2, 2024 UTC",
  );
  expect(
    formatDate(
      "2024-01-02T23:04:00Z",
      "relative",
      Date.parse("2024-01-02T23:07:00Z"),
    ),
  ).toBe("3m ago");
  expect(formatDate("invalid", "date", 0)).toBe("");
});
