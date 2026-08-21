import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../db";
import { supportGoal, zoo } from "../db/schema";
import { parseSupportGoalInput, toSupportGoalResponse } from "../lib/support-goal";
import { requirePublisher, type AuthEnv } from "../middleware/auth";

const supportGoals = new Hono<AuthEnv>();

supportGoals.use("/profiles/me/support-goal", requirePublisher);

async function ownedZooId(userId: string) {
  const [row] = await db
    .select({ id: zoo.id })
    .from(zoo)
    .where(eq(zoo.publisherUserId, userId))
    .limit(1);
  return row?.id;
}

supportGoals.get("/profiles/me/support-goal", async (c) => {
  const zooId = await ownedZooId(c.get("session")!.user.id);
  if (!zooId) {
    return c.json({ error: { code: "NOT_FOUND", message: "動物園が見つかりません" } }, 404);
  }

  const [goal] = await db
    .select()
    .from(supportGoal)
    .where(and(eq(supportGoal.zooId, zooId), isNull(supportGoal.archivedAt)))
    .limit(1);

  return c.json(goal ? toSupportGoalResponse(goal) : null);
});

supportGoals.put("/profiles/me/support-goal", async (c) => {
  const zooId = await ownedZooId(c.get("session")!.user.id);
  if (!zooId) {
    return c.json({ error: { code: "NOT_FOUND", message: "動物園が見つかりません" } }, 404);
  }

  const input = parseSupportGoalInput(await c.req.json<unknown>().catch(() => null));
  if (!input) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "応援目標の内容を確認してください" } }, 422);
  }

  const now = new Date();
  const [goal] = await db
    .insert(supportGoal)
    .values({
      id: crypto.randomUUID(),
      zooId,
      ...input,
      currentAmount: 0,
    })
    .onConflictDoUpdate({
      target: supportGoal.zooId,
      targetWhere: isNull(supportGoal.archivedAt),
      set: { ...input, updatedAt: now },
    })
    .returning();

  if (!goal) throw new Error("Support goal upsert returned no row");

  return c.json(toSupportGoalResponse(goal));
});

supportGoals.delete("/profiles/me/support-goal", async (c) => {
  const zooId = await ownedZooId(c.get("session")!.user.id);
  if (!zooId) {
    return c.json({ error: { code: "NOT_FOUND", message: "動物園が見つかりません" } }, 404);
  }

  const now = new Date();
  await db
    .update(supportGoal)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(supportGoal.zooId, zooId), isNull(supportGoal.archivedAt)));

  return c.body(null, 204);
});

export { supportGoals };
