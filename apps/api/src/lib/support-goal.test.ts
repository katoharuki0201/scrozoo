import { describe, expect, test } from "bun:test";

import {
  parseSupportGoalInput,
  supportGoalStatus,
  toSupportGoalResponse,
} from "./support-goal";

const now = new Date("2026-08-21T00:00:00.000Z");

describe("supportGoalStatus", () => {
  test("returns achieved before considering the deadline", () => {
    expect(supportGoalStatus({ targetAmount: 1_000, currentAmount: 1_000, deadline: "2026-08-20" }, now)).toBe("achieved");
  });

  test("returns expired after the deadline", () => {
    expect(supportGoalStatus({ targetAmount: 1_000, currentAmount: 500, deadline: "2026-08-20" }, now)).toBe("expired");
  });

  test("returns active for an unfinished future goal", () => {
    expect(supportGoalStatus({ targetAmount: 1_000, currentAmount: 500, deadline: "2026-08-22" }, now)).toBe("active");
  });
});

describe("parseSupportGoalInput", () => {
  test("accepts the frontend contract and excludes currentAmount", () => {
    expect(parseSupportGoalInput({ title: " 新しい遊具 ", targetAmount: 10_000, deadline: "2026-09-01", currentAmount: 9_999 }, now)).toEqual({
      title: "新しい遊具",
      targetAmount: 10_000,
      deadline: "2026-09-01",
    });
  });

  test("rejects invalid and elapsed dates", () => {
    expect(parseSupportGoalInput({ title: "目標", targetAmount: 500, deadline: "2026-02-30" }, now)).toBeNull();
    expect(parseSupportGoalInput({ title: "目標", targetAmount: 500, deadline: "2026-08-20" }, now)).toBeNull();
  });
});

test("toSupportGoalResponse adds the derived status", () => {
  expect(toSupportGoalResponse({ id: "goal-1", zooId: "zoo-1", title: "目標", targetAmount: 1_000, currentAmount: 250, deadline: "2026-09-01" }, now)).toMatchObject({ status: "active" });
});
