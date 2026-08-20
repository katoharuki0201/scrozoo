import { and, eq, gt } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../db";
import { galleryPost, mediaAsset, visitPermit, visitQrCode, zoo } from "../db/schema";
import { sha256 } from "../lib/token";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const visits = new Hono<AuthEnv>();

visits.post("/qr/verify", requireAuth, async (c) => {
  const session = c.get("session")!;
  const body = await c.req.json<unknown>().catch(() => null);
  const payload = body && typeof body === "object" && "payload" in body && typeof body.payload === "string" ? body.payload.trim() : "";
  if (!payload) return c.json({ error: { code: "VALIDATION_ERROR", message: "QRコードを確認してください" } }, 422);
  const tokenHash = await sha256(payload);
  const now = new Date();
  const [qr] = await db.select({ id: visitQrCode.id, zooId: zoo.id, zooName: zoo.name, expiresAt: visitQrCode.expiresAt })
    .from(visitQrCode).innerJoin(zoo, eq(visitQrCode.zooId, zoo.id))
    .where(and(eq(visitQrCode.tokenHash, tokenHash), eq(visitQrCode.status, "active"), eq(zoo.status, "active"))).limit(1);
  if (!qr || (qr.expiresAt && qr.expiresAt <= now)) return c.json({ error: { code: "INVALID_QR", message: "QRコードが無効または期限切れです" } }, 422);
  const permit = { id: crypto.randomUUID(), userId: session.user.id, zooId: qr.zooId, qrCodeId: qr.id, expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000) };
  await db.insert(visitPermit).values(permit);
  return c.json({ sessionId: permit.id, zoo: { id: qr.zooId, name: qr.zooName }, expiresAt: permit.expiresAt.toISOString() }, 201);
});

visits.get("/qr/sessions/:sessionId", requireAuth, async (c) => {
  const session = c.get("session")!;
  const [permit] = await db.select({ id: visitPermit.id, expiresAt: visitPermit.expiresAt, zooId: zoo.id, zooName: zoo.name })
    .from(visitPermit).innerJoin(zoo, eq(visitPermit.zooId, zoo.id))
    .where(and(eq(visitPermit.id, c.req.param("sessionId")), eq(visitPermit.userId, session.user.id), gt(visitPermit.expiresAt, new Date()))).limit(1);
  if (!permit) return c.json({ error: { code: "VISIT_EXPIRED", message: "来園認証の有効期限が切れています" } }, 404);
  return c.json({ sessionId: permit.id, zoo: { id: permit.zooId, name: permit.zooName }, expiresAt: permit.expiresAt.toISOString() });
});

visits.post("/gallery/posts", requireAuth, async (c) => {
  const session = c.get("session")!;
  const body = await c.req.json<unknown>().catch(() => null);
  if (!body || typeof body !== "object" || !("sessionId" in body) || !("imageUploadId" in body) || typeof body.sessionId !== "string" || typeof body.imageUploadId !== "string") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "投稿内容を確認してください" } }, 422);
  }
  const [permit] = await db.select({ id: visitPermit.id, zooId: visitPermit.zooId }).from(visitPermit).where(and(
    eq(visitPermit.id, body.sessionId), eq(visitPermit.userId, session.user.id), gt(visitPermit.expiresAt, new Date()),
  )).limit(1);
  const [image] = await db.select().from(mediaAsset).where(and(
    eq(mediaAsset.id, body.imageUploadId), eq(mediaAsset.uploaderUserId, session.user.id), eq(mediaAsset.purpose, "galleryImage"), eq(mediaAsset.status, "ready"),
  )).limit(1);
  if (!permit || !image) return c.json({ error: { code: "GALLERY_FORBIDDEN", message: "来園認証または画像を確認できません" } }, 403);
  const id = crypto.randomUUID();
  const publishedAt = new Date();
  await db.insert(galleryPost).values({ id, userId: session.user.id, zooId: permit.zooId, visitPermitId: permit.id, imageMediaAssetId: image.id, title: "来園写真", publishedAt });
  const [zooRow] = await db.select({ name: zoo.name }).from(zoo).where(eq(zoo.id, permit.zooId)).limit(1);
  return c.json({ id, imageUrl: publicMediaUrl(image.objectKey), createdAt: publishedAt.toISOString(), author: { id: session.user.id, name: session.user.name }, zoo: { id: permit.zooId, name: zooRow?.name ?? "" } }, 201);
});

function publicMediaUrl(objectKey: string) {
  return `${process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? ""}/${objectKey}`;
}

export { visits };
