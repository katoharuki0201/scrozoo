import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { getApiEnv } from "../config/env";
import { db } from "../db";
import { mediaAsset } from "../db/schema";
import { getR2Client } from "../lib/r2";
import {
  extensionFor,
  PENDING_UPLOAD_TTL_MS,
  UPLOAD_URL_TTL_SECONDS,
  validateUploadInput,
} from "../lib/upload-policy";
import { requireAuth, type AuthEnv } from "../middleware/auth";

const uploads = new Hono<AuthEnv>();
uploads.use("/uploads/*", requireAuth);
uploads.post("/uploads", requireAuth, async (c) => {
  const session = c.get("session")!;
  const input = validateUploadInput(await c.req.json<unknown>().catch(() => null));
  if (!input) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "アップロードするファイルを確認してください" } }, 422);
  }
  if (input.policy.creatorOnly && !["creator", "publisher"].includes(session.user.role)) {
    return c.json({ error: { code: "FORBIDDEN", message: "投稿者権限が必要です" } }, 403);
  }

  const env = getApiEnv();
  const id = crypto.randomUUID();
  const extension = extensionFor(input.contentType)!;
  const objectKey = `${input.purpose}/${session.user.id}/${id}.${extension}`;
  const expiresAt = new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000);

  await db.insert(mediaAsset).values({
    id,
    uploaderUserId: session.user.id,
    objectKey,
    purpose: input.purpose,
    contentType: input.contentType,
    byteSize: input.size,
  });

  try {
    const uploadUrl = await getSignedUrl(
      getR2Client(),
      new PutObjectCommand({
        Bucket: env.R2_PUBLIC_BUCKET_NAME,
        Key: objectKey,
        ContentType: input.contentType,
        ContentLength: input.size,
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );
    return c.json({
      uploadId: id,
      uploadUrl,
      objectKey,
      expiresAt: expiresAt.toISOString(),
      headers: { "Content-Type": input.contentType },
    }, 201);
  } catch (error) {
    await db.delete(mediaAsset).where(eq(mediaAsset.id, id));
    throw error;
  }
});

uploads.post("/uploads/:uploadId/complete", requireAuth, async (c) => {
  const session = c.get("session")!;
  const [asset] = await db.select().from(mediaAsset).where(and(
    eq(mediaAsset.id, c.req.param("uploadId")),
    eq(mediaAsset.uploaderUserId, session.user.id),
  )).limit(1);
  if (!asset) return c.json({ error: { code: "NOT_FOUND", message: "アップロードが見つかりません" } }, 404);
  if (asset.status === "ready") {
    return c.json({ uploadId: asset.id, objectKey: asset.objectKey, status: "ready" as const });
  }
  if (asset.status !== "pending" || Date.now() - asset.createdAt.getTime() > PENDING_UPLOAD_TTL_MS) {
    return c.json({ error: { code: "UPLOAD_EXPIRED", message: "アップロードの有効期限が切れています" } }, 409);
  }

  const env = getApiEnv();
  let result;
  try {
    result = await getR2Client().send(new HeadObjectCommand({
      Bucket: env.R2_PUBLIC_BUCKET_NAME,
      Key: asset.objectKey,
    }));
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return c.json({ error: { code: "UPLOAD_INCOMPLETE", message: "R2へのアップロードを確認できません" } }, 409);
    throw error;
  }
  if (result.ContentLength !== asset.byteSize || result.ContentType?.toLowerCase() !== asset.contentType) {
    return c.json({ error: { code: "UPLOAD_MISMATCH", message: "アップロードされたファイルが申告内容と一致しません" } }, 422);
  }

  await db.update(mediaAsset).set({ status: "ready", completedAt: new Date() }).where(and(
    eq(mediaAsset.id, asset.id),
    eq(mediaAsset.status, "pending"),
  ));
  return c.json({ uploadId: asset.id, objectKey: asset.objectKey, status: "ready" as const });
});

export { uploads };
