export type SupportGoalStatus = "active" | "achieved" | "expired";

export type SupportGoalRow = {
  id: string;
  zooId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
};

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function deadlineEnd(deadline: string) {
  const match = datePattern.exec(deadline);
  if (!match) return null;

  const [, year, month, day] = match;
  const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendarDate.toISOString().slice(0, 10) !== deadline) {
    return null;
  }

  // Scrozoo currently serves Japanese zoos, so a date-only deadline ends at
  // the end of that calendar day in JST regardless of the server time zone.
  return new Date(`${deadline}T23:59:59.999+09:00`);
}

export function supportGoalStatus(
  goal: Pick<SupportGoalRow, "targetAmount" | "currentAmount" | "deadline">,
  now = new Date(),
): SupportGoalStatus {
  if (goal.currentAmount >= goal.targetAmount) return "achieved";

  const end = deadlineEnd(goal.deadline);
  return end && end.getTime() >= now.getTime() ? "active" : "expired";
}

export function toSupportGoalResponse(goal: SupportGoalRow, now = new Date()) {
  return {
    ...goal,
    status: supportGoalStatus(goal, now),
  };
}

export function parseSupportGoalInput(body: unknown, now = new Date()) {
  if (!body || typeof body !== "object") return null;

  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const targetAmount = input.targetAmount;
  const deadline = input.deadline;
  const end = typeof deadline === "string" ? deadlineEnd(deadline) : null;

  if (
    !title ||
    title.length > 50 ||
    typeof targetAmount !== "number" ||
    !Number.isInteger(targetAmount) ||
    targetAmount < 500 ||
    !end ||
    end.getTime() <= now.getTime()
  ) {
    return null;
  }

  return { title, targetAmount, deadline: deadline as string };
}
