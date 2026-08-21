import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../db";
import { comment, mediaAsset, subscription, subscriptionEvent, supportGoal, tip, video, zoo } from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";
import { resolveMockPaymentUrl } from "../lib/mock-payment";

const mockPayments = new Hono<AuthEnv>();

function publicMediaUrl(objectKey: string | null) {
  if (!objectKey) return "/icon.jpg";
  return `${process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? ""}/${objectKey}`;
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

mockPayments.get("/profiles/me/support-plans", requireAuth, async (c) => {
  const session = c.get("session")!;
  const rows = await db.select({
    id: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    createdAt: subscription.createdAt,
    zooId: zoo.id,
    zooName: zoo.name,
    avatarObjectKey: mediaAsset.objectKey,
  }).from(subscription)
    .innerJoin(zoo, eq(subscription.zooId, zoo.id))
    .leftJoin(mediaAsset, eq(zoo.profileMediaAssetId, mediaAsset.id))
    .where(and(eq(subscription.userId, session.user.id), inArray(subscription.status, ["active", "canceling"]), or(isNull(subscription.currentPeriodEnd), gt(subscription.currentPeriodEnd, new Date()))))
    .orderBy(desc(subscription.createdAt));

  return c.json(rows.map((row) => ({
    id: row.id,
    zoo: { id: row.zooId, name: row.zooName, avatarUrl: publicMediaUrl(row.avatarObjectKey) },
    nextRenewalDate: (row.currentPeriodEnd ?? new Date(row.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
    status: row.status === "canceling" ? "cancel_scheduled" as const : "active" as const,
  })));
});

mockPayments.post("/support-plans", requireAuth, async (c) => {
  const session = c.get("session")!;
  if (session.user.role !== "viewer") return c.json({ error: { code: "FORBIDDEN", message: "一般ユーザーのみ加入できます" } }, 403);
  const body = await c.req.json<unknown>().catch(() => null);
  const zooId = body && typeof body === "object" && "zooId" in body && typeof body.zooId === "string" ? body.zooId : "";
  const [target] = await db.select({ id: zoo.id, name: zoo.name, avatarObjectKey: mediaAsset.objectKey }).from(zoo).leftJoin(mediaAsset, eq(zoo.profileMediaAssetId, mediaAsset.id)).where(and(eq(zoo.id, zooId), eq(zoo.status, "active"))).limit(1);
  if (!target) return c.json({ error: { code: "NOT_FOUND", message: "動物園が見つかりません" } }, 404);
  const [existing] = await db.select().from(subscription).where(and(eq(subscription.userId, session.user.id), eq(subscription.zooId, zooId), inArray(subscription.status, ["active", "canceling"]))).limit(1);
  const now = new Date();
  const periodEnd = existing?.currentPeriodEnd ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const subscriptionId = existing?.id ?? crypto.randomUUID();
  if (!existing) {
    await db.transaction(async (tx) => {
      await tx.insert(subscription).values({ id: subscriptionId, userId: session.user.id, zooId, amount: 500, status: "active", idempotencyKey: `mock-${crypto.randomUUID()}`, currentPeriodStart: now, currentPeriodEnd: periodEnd });
      await tx.insert(subscriptionEvent).values({ id: crypto.randomUUID(), subscriptionId, type: "started", amount: 500, periodStart: now, periodEnd, occurredAt: now });
      await tx.update(supportGoal).set({ currentAmount: sql`${supportGoal.currentAmount} + 500`, updatedAt: now }).where(and(eq(supportGoal.zooId, zooId), isNull(supportGoal.archivedAt)));
    });
  }
  return c.json({
    checkoutUrl: resolveMockPaymentUrl(),
    mode: "mock" as const,
    plan: { id: subscriptionId, zoo: { id: target.id, name: target.name, avatarUrl: publicMediaUrl(target.avatarObjectKey) }, nextRenewalDate: periodEnd.toISOString().slice(0, 10), status: existing?.status === "canceling" ? "cancel_scheduled" as const : "active" as const },
  });
});

mockPayments.post("/support-plans/:planId/cancel", requireAuth, async (c) => {
  const session = c.get("session")!;
  const [plan] = await db.select().from(subscription).where(and(eq(subscription.id, c.req.param("planId")), eq(subscription.userId, session.user.id), inArray(subscription.status, ["active", "canceling"]))).limit(1);
  if (!plan) return c.json({ error: { code: "NOT_FOUND", message: "応援プランが見つかりません" } }, 404);
  await db.update(subscription).set({ status: "canceling", cancelAtPeriodEnd: true, canceledAt: plan.canceledAt ?? new Date(), updatedAt: new Date() }).where(eq(subscription.id, plan.id));
  const [targetZoo] = await db.select({ id: zoo.id, name: zoo.name, objectKey: mediaAsset.objectKey }).from(zoo).leftJoin(mediaAsset, eq(zoo.profileMediaAssetId, mediaAsset.id)).where(eq(zoo.id, plan.zooId)).limit(1);
  return c.json({ id: plan.id, zoo: { id: plan.zooId, name: targetZoo?.name ?? "", avatarUrl: publicMediaUrl(targetZoo?.objectKey ?? null) }, nextRenewalDate: (plan.currentPeriodEnd ?? new Date(plan.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10), status: "cancel_scheduled" as const });
});

mockPayments.post("/videos/:videoId/tip-checkout", requireAuth, async (c) => {
  const session = c.get("session")!;
  if (session.user.role === "creator") return c.json({ error: { code: "FORBIDDEN", message: "投稿者は投げ銭できません" } }, 403);
  const body = await c.req.json<unknown>().catch(() => null);
  if (!body || typeof body !== "object" || !("amount" in body) || !("comment" in body) || typeof body.amount !== "number" || typeof body.comment !== "string") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "投げ銭内容を確認してください" } }, 422);
  }
  const commentText = body.comment.trim();
  if (!Number.isInteger(body.amount) || body.amount < 100 || body.amount > 3000 || !commentText || commentText.length > 200) return c.json({ error: { code: "VALIDATION_ERROR", message: "投げ銭内容を確認してください" } }, 422);
  const amount = body.amount;
  const [target] = await db.select({ id: video.id, zooId: video.zooId, animalId: video.animalId }).from(video).where(and(eq(video.id, c.req.param("videoId")), eq(video.status, "published"))).limit(1);
  if (!target) return c.json({ error: { code: "NOT_FOUND", message: "動画が見つかりません" } }, 404);
  const now = new Date();
  const commentId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(comment).values({ id: commentId, videoId: target.id, userId: session.user.id, body: commentText, supporterAtPosting: true });
    await tx.insert(tip).values({ id: crypto.randomUUID(), userId: session.user.id, zooId: target.zooId, animalId: target.animalId, videoId: target.id, commentId, commentBody: commentText, amount, status: "succeeded", idempotencyKey: `mock-${crypto.randomUUID()}`, succeededAt: now });
    await tx.update(supportGoal).set({ currentAmount: sql`${supportGoal.currentAmount} + ${amount}`, updatedAt: now }).where(and(eq(supportGoal.zooId, target.zooId), isNull(supportGoal.archivedAt)));
  });
  return c.json({
    checkoutUrl: resolveMockPaymentUrl(),
    mode: "mock" as const,
    comment: { id: commentId, author: { name: session.user.name, initials: initials(session.user.name) }, message: commentText, isSupporter: true, tipAmount: amount, createdAt: now.toISOString() },
  });
});

export { mockPayments };
