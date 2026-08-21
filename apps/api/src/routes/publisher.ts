import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { Hono } from "hono";

import { getApiEnv } from "../config/env";
import { db } from "../db";
import { animal, subscription, user, video, visitQrCode, zoo } from "../db/schema";
import { createVisitQrToken, sha256 } from "../lib/token";
import { requirePublisher, type AuthEnv } from "../middleware/auth";

const publisher = new Hono<AuthEnv>();
publisher.use("/publisher/*", requirePublisher);
publisher.use("/creator/*", requirePublisher);

async function ownedZoo(userId: string) {
  const [row] = await db.select().from(zoo).where(eq(zoo.publisherUserId, userId)).limit(1);
  return row;
}

publisher.get("/publisher/zoo", async (c) => {
  const row = await ownedZoo(c.get("session")!.user.id);
  return row ? c.json(row) : c.json({ error: { code: "NOT_FOUND", message: "動物園が見つかりません" } }, 404);
});

publisher.patch("/publisher/zoo", async (c) => {
  const owner = await ownedZoo(c.get("session")!.user.id);
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  if (!owner) return c.json({ error: { code: "NOT_FOUND", message: "動物園が見つかりません" } }, 404);
  const name = typeof body.name === "string" ? body.name.trim() : owner.name;
  const description = typeof body.description === "string" ? body.description.trim() : owner.description;
  const region = typeof body.region === "string" ? body.region.trim() : owner.region;
  const address = typeof body.address === "string" ? body.address.trim() : owner.address;
  if (!name || name.length > 100 || !region || region.length > 100 || (description?.length ?? 0) > 1000 || (address?.length ?? 0) > 255) return c.json({ error: { code: "VALIDATION_ERROR", message: "動物園情報を確認してください" } }, 422);
  await db.update(zoo).set({ name, description, region, address, updatedAt: new Date() }).where(eq(zoo.id, owner.id));
  return c.json({ ...owner, name, description, region, address });
});

publisher.get("/publisher/animals", async (c) => {
  const owner = await ownedZoo(c.get("session")!.user.id);
  if (!owner) return c.json([], 200);
  return c.json(await db.select().from(animal).where(eq(animal.zooId, owner.id)).orderBy(desc(animal.createdAt)));
});

publisher.post("/publisher/animals", async (c) => {
  const owner = await ownedZoo(c.get("session")!.user.id);
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const species = typeof body.species === "string" ? body.species.trim() : "";
  if (!owner || !name || !species || name.length > 100 || species.length > 100) return c.json({ error: { code: "VALIDATION_ERROR", message: "動物情報を確認してください" } }, 422);
  const created = { id: crypto.randomUUID(), zooId: owner.id, name, species, description: typeof body.description === "string" ? body.description.trim() : null };
  await db.insert(animal).values(created);
  return c.json(created, 201);
});

publisher.patch("/publisher/animals/:animalId", async (c) => {
  const owner = await ownedZoo(c.get("session")!.user.id);
  const [existing] = owner ? await db.select().from(animal).where(and(eq(animal.id, c.req.param("animalId")), eq(animal.zooId, owner.id))).limit(1) : [];
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "動物が見つかりません" } }, 404);
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : existing.name;
  const species = typeof body.species === "string" ? body.species.trim() : existing.species;
  const description = typeof body.description === "string" ? body.description.trim() : existing.description;
  const status = body.status === "active" || body.status === "archived" ? body.status : existing.status;
  if (!name || !species || name.length > 100 || species.length > 100 || (description?.length ?? 0) > 1000) return c.json({ error: { code: "VALIDATION_ERROR", message: "動物情報を確認してください" } }, 422);
  await db.update(animal).set({ name, species, description, status, updatedAt: new Date() }).where(eq(animal.id, existing.id));
  return c.json({ ...existing, name, species, description, status });
});

publisher.get("/publisher/videos", async (c) => {
  const owner = await ownedZoo(c.get("session")!.user.id);
  return c.json(owner ? await db.select().from(video).where(eq(video.zooId, owner.id)).orderBy(desc(video.createdAt)) : []);
});

publisher.patch("/publisher/videos/:videoId", async (c) => {
  const owner = await ownedZoo(c.get("session")!.user.id);
  const [existing] = owner ? await db.select().from(video).where(and(eq(video.id, c.req.param("videoId")), eq(video.zooId, owner.id))).limit(1) : [];
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "動画が見つかりません" } }, 404);
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const description = typeof body.description === "string" ? body.description.trim() : existing.description;
  const status = body.status === "draft" || body.status === "published" || body.status === "hidden" ? body.status : existing.status;
  if (!description || description.length > 1000) return c.json({ error: { code: "VALIDATION_ERROR", message: "動画情報を確認してください" } }, 422);
  await db.update(video).set({ description, status, publishedAt: status === "published" ? existing.publishedAt ?? new Date() : existing.publishedAt, updatedAt: new Date() }).where(eq(video.id, existing.id));
  return c.json({ ...existing, description, status });
});

publisher.delete("/publisher/videos/:videoId", async (c) => {
  const owner = await ownedZoo(c.get("session")!.user.id);
  if (!owner) return c.json({ error: { code: "NOT_FOUND", message: "動画が見つかりません" } }, 404);
  await db.update(video).set({ status: "hidden", updatedAt: new Date() }).where(and(eq(video.id, c.req.param("videoId")), eq(video.zooId, owner.id)));
  return c.body(null, 204);
});

publisher.get("/creator/supporters", async (c) => {
  const owner = await ownedZoo(c.get("session")!.user.id);
  if (!owner) return c.json({ totalCount: 0, monthlySupportAmount: 0, supporters: [] });
  const rows = await db.select({ id: user.id, name: user.name, avatarUrl: user.image, joinedAt: subscription.createdAt, nextRenewalDate: subscription.currentPeriodEnd, status: subscription.status })
    .from(subscription).innerJoin(user, eq(subscription.userId, user.id))
    .where(and(eq(subscription.zooId, owner.id), inArray(subscription.status, ["active", "canceling"]), or(isNull(subscription.currentPeriodEnd), gt(subscription.currentPeriodEnd, new Date())))).orderBy(desc(subscription.createdAt));
  const supporters = rows.map((row) => ({ id: row.id, name: row.name, avatarUrl: row.avatarUrl, initials: initials(row.name), joinedAt: row.joinedAt.toISOString().slice(0, 10), nextRenewalDate: (row.nextRenewalDate ?? row.joinedAt).toISOString().slice(0, 10), status: row.status === "canceling" ? "cancel_scheduled" as const : "active" as const }));
  return c.json({ totalCount: supporters.length, monthlySupportAmount: supporters.length * 500, supporters });
});

publisher.get("/publisher/visit-qr", async (c) => {
  const owner = await ownedZoo(c.get("session")!.user.id);
  if (!owner) return c.json({ error: { code: "NOT_FOUND", message: "動物園が見つかりません" } }, 404);
  const env = getApiEnv();
  const token = await createVisitQrToken(owner.id, env.BETTER_AUTH_SECRET);
  const tokenHash = await sha256(token);
  const [existing] = await db.select({ id: visitQrCode.id }).from(visitQrCode).where(eq(visitQrCode.tokenHash, tokenHash)).limit(1);

  if (!existing) {
    await db.insert(visitQrCode)
      .values({ id: crypto.randomUUID(), zooId: owner.id, tokenHash, status: "active", expiresAt: null })
      .onConflictDoNothing({ target: visitQrCode.tokenHash });
  }

  const payload = new URL("/scan", env.FRONTEND_URL);
  payload.searchParams.set("payload", token);
  return c.json({ payload: payload.toString(), expiresAt: null, zoo: { id: owner.id, name: owner.name } });
});

function initials(name: string) { return name.split(/[\s_]+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""); }

export { publisher };
