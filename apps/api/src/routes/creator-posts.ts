import { and, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";

import { getApiEnv } from "../config/env";
import { db } from "../db";
import { animal, mediaAsset, tag, video, videoTag, zoo } from "../db/schema";
import { requirePublisher, type AuthEnv } from "../middleware/auth";

const creatorPosts = new Hono<AuthEnv>();
creatorPosts.post("/creator/posts", requirePublisher, async (c) => {
  const session = c.get("session")!;
  const body = await c.req.json<unknown>().catch(() => null);
  if (!body || typeof body !== "object") return validationError(c);
  const input = body as Record<string, unknown>;
  const caption = typeof input.caption === "string" ? input.caption.trim() : "";
  const tags = Array.isArray(input.tags)
    ? [...new Set(input.tags.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))]
    : [];
  if (
    typeof input.videoUploadId !== "string" ||
    typeof input.previewUploadId !== "string" ||
    typeof input.durationMs !== "number" ||
    !Number.isInteger(input.durationMs) || input.durationMs <= 0 || input.durationMs > 60_000 ||
    caption.length === 0 || caption.length > 120 || tags.length > 5 || tags.some((item) => item.length > 20)
  ) return validationError(c);

  const [ownedZoo] = await db.select({ id: zoo.id, name: zoo.name }).from(zoo).where(and(
    eq(zoo.publisherUserId, session.user.id), eq(zoo.status, "active"),
  )).limit(1);
  if (!ownedZoo) return c.json({ error: { code: "FORBIDDEN", message: "有効な動物園がありません" } }, 403);

  const [selectedAnimal] = await db.select({ id: animal.id }).from(animal).where(and(
    eq(animal.zooId, ownedZoo.id),
    eq(animal.status, "active"),
  )).limit(1);

  const assets = await db.select().from(mediaAsset).where(eq(mediaAsset.uploaderUserId, session.user.id));
  const full = assets.find((item) => item.id === input.videoUploadId && item.purpose === "video" && item.status === "ready");
  const preview = assets.find((item) => item.id === input.previewUploadId && item.purpose === "videoPreview" && item.status === "ready");
  if (!full || !preview) return c.json({ error: { code: "MEDIA_NOT_READY", message: "アップロード済み動画を確認できません" } }, 422);

  const id = crypto.randomUUID();
  const animalId = selectedAnimal?.id ?? crypto.randomUUID();
  const publishedAt = new Date();
  await db.transaction(async (tx) => {
    if (!selectedAnimal) {
      await tx.insert(animal).values({
        id: animalId,
        zooId: ownedZoo.id,
        name: "動物園の仲間たち",
        species: "動物",
        status: "active",
      });
    }
    await tx.insert(video).values({
      id,
      zooId: ownedZoo.id,
      animalId,
      authorUserId: session.user.id,
      fullMediaAssetId: full.id,
      previewMediaAssetId: preview.id,
      description: caption,
      durationMs: input.durationMs as number,
      status: "published",
      publishedAt,
    });
    for (const name of tags) {
      const slug = name.toLocaleLowerCase("ja-JP");
      await tx.insert(tag).values({ id: crypto.randomUUID(), name, slug }).onConflictDoNothing({ target: tag.slug });
      const [stored] = await tx.select({ id: tag.id }).from(tag).where(eq(tag.slug, slug)).limit(1);
      if (stored) await tx.insert(videoTag).values({ videoId: id, tagId: stored.id });
    }
  });

  const mediaBase = getApiEnv().MEDIA_PUBLIC_BASE_URL.replace(/\/+$/, "");
  return c.json({
    id,
    videoUrl: `${mediaBase}/${preview.objectKey}`,
    zoo: { id: ownedZoo.id, name: ownedZoo.name, avatarUrl: "/icon.jpg" },
    caption,
    tags,
    likeCount: 0,
    commentCount: 0,
    supportPrice: 500,
    hasActiveSupportPlan: false,
    supportGoal: null,
    isLiked: false,
    publishedAt: publishedAt.toISOString(),
  }, 201);
});

function validationError(c: Context) {
  return c.json({ error: { code: "VALIDATION_ERROR", message: "投稿内容を確認してください" } }, 422);
}

export { creatorPosts };
