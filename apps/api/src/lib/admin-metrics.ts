export type RevenueEvent = {
  amount: number;
  occurredAt: Date;
};

export type MonthlyRevenue = {
  month: string;
  subscription: number;
  tips: number;
  gross: number;
  platformFee: number;
  creatorPayout: number;
};

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyRevenue(
  subscriptions: RevenueEvent[],
  tips: RevenueEvent[],
  now = new Date(),
  monthCount = 12,
  feeRate = 10,
): MonthlyRevenue[] {
  const buckets = new Map<string, { subscription: number; tips: number }>();

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    buckets.set(monthKey(date), { subscription: 0, tips: 0 });
  }

  for (const event of subscriptions) {
    const bucket = buckets.get(monthKey(event.occurredAt));
    if (bucket) bucket.subscription += event.amount;
  }

  for (const event of tips) {
    const bucket = buckets.get(monthKey(event.occurredAt));
    if (bucket) bucket.tips += event.amount;
  }

  return [...buckets].map(([month, values]) => {
    const gross = values.subscription + values.tips;
    const platformFee = Math.round(gross * feeRate / 100);
    return {
      month,
      ...values,
      gross,
      platformFee,
      creatorPayout: gross - platformFee,
    };
  });
}

export function growthRate(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function supportedMonths(startedAt: Date, now = new Date()) {
  const months =
    (now.getUTCFullYear() - startedAt.getUTCFullYear()) * 12 +
    now.getUTCMonth() -
    startedAt.getUTCMonth();
  return Math.max(1, months + 1);
}
