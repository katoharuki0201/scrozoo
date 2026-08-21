import { describe, expect, test } from "bun:test";

import { buildMonthlyRevenue, growthRate, supportedMonths } from "./admin-metrics";

describe("admin metrics", () => {
  test("groups successful revenue and calculates a ten percent fee", () => {
    const months = buildMonthlyRevenue(
      [{ amount: 500, occurredAt: new Date("2026-08-01T00:00:00Z") }],
      [{ amount: 300, occurredAt: new Date("2026-08-20T00:00:00Z") }],
      new Date("2026-08-21T00:00:00Z"),
      2,
    );

    expect(months).toEqual([
      { month: "2026-07", subscription: 0, tips: 0, gross: 0, platformFee: 0, creatorPayout: 0 },
      { month: "2026-08", subscription: 500, tips: 300, gross: 800, platformFee: 80, creatorPayout: 720 },
    ]);
  });

  test("calculates stable growth and supported month values", () => {
    expect(growthRate(110, 100)).toBe(10);
    expect(growthRate(1, 0)).toBe(100);
    expect(growthRate(0, 0)).toBe(0);
    expect(supportedMonths(new Date("2026-06-10T00:00:00Z"), new Date("2026-08-21T00:00:00Z"))).toBe(3);
  });
});
