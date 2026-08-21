import { and, count, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { Hono } from "hono";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { db } from "../db";
import {
  comment,
  animal,
  favorite,
  mediaAsset,
  subscription,
  supportGoal,
  tag,
  tip,
  user,
  video,
  videoTag,
  zoo,
} from "../db/schema";
import { requireAuth, type AuthEnv } from "../middleware/auth";
import { getApiEnv } from "../config/env";
import { getR2Client } from "../lib/r2";
import { toSupportGoalResponse } from "../lib/support-goal";

const content = new Hono<AuthEnv>();

function mediaUrl(objectKey: string) {
  if (/^(?:https?:\/\/|\/)/.test(objectKey)) return objectKey;
  const baseUrl = process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/${objectKey}` : `/${objectKey}`;
}

function initials(name: string) {
  return name
    .split(/[\s_]+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

type FeedOptions = { query?: string; limit?: number; cursor?: string };

async function feedRows(currentUserId?: string, options: FeedOptions = {}) {
  const previewAsset = alias(mediaAsset, "preview_asset");
  const fullAsset = alias(mediaAsset, "full_asset");
  const avatarAsset = alias(mediaAsset, "avatar_asset");
  const query = options.query?.trim().toLocaleLowerCase("ja-JP") ?? "";
  const limit = Math.min(50, Math.max(1, options.limit ?? 50));
  const [cursorRow] = options.cursor ? await db.select({ publishedAt: video.publishedAt }).from(video).where(eq(video.id, options.cursor)).limit(1) : [];
  const rows = await db
    .select({
      id: video.id,
      objectKey: previewAsset.objectKey,
      fullObjectKey: fullAsset.objectKey,
      zooId: zoo.id,
      zooName: zoo.name,
      publisherUserId: zoo.publisherUserId,
      avatarObjectKey: avatarAsset.objectKey,
      caption: video.description,
      viewCount: video.viewCount,
      thumbnailTime: video.thumbnailTime,
      publishedAt: video.publishedAt,
    })
    .from(video)
    .innerJoin(previewAsset, eq(video.previewMediaAssetId, previewAsset.id))
    .innerJoin(fullAsset, eq(video.fullMediaAssetId, fullAsset.id))
    .innerJoin(zoo, eq(video.zooId, zoo.id))
    .innerJoin(animal, eq(video.animalId, animal.id))
    .leftJoin(avatarAsset, eq(zoo.profileMediaAssetId, avatarAsset.id))
    .where(and(
      eq(video.status, "published"),
      eq(zoo.status, "active"),
      cursorRow?.publishedAt && options.cursor ? or(
        lt(video.publishedAt, cursorRow.publishedAt),
        and(eq(video.publishedAt, cursorRow.publishedAt), lt(video.id, options.cursor)),
      ) : undefined,
      query ? sql`(
        lower(${video.description}) like ${`%${query}%`} or
        lower(${zoo.name}) like ${`%${query}%`} or
        lower(${animal.name}) like ${`%${query}%`} or
        lower(${animal.species}) like ${`%${query}%`} or
        exists (select 1 from video_tag vt join tag t on t.id = vt.tag_id where vt.video_id = ${video.id} and lower(t.name) like ${`%${query}%`})
      )` : undefined,
    ))
    .orderBy(desc(video.publishedAt), desc(video.id))
    .limit(limit);

  const pageRows = rows;
  const videoIds = pageRows.map((row) => row.id);
  const zooIds = [...new Set(pageRows.map((row) => row.zooId))];
  if (videoIds.length === 0) return [];

  const [allTags, likeTotals, commentTotals, likedRows, supportedRows, supportGoalRows] = await Promise.all([
    db.select({ videoId: videoTag.videoId, name: tag.name }).from(videoTag).innerJoin(tag, eq(videoTag.tagId, tag.id)).where(inArray(videoTag.videoId, videoIds)),
    db.select({ videoId: favorite.videoId, value: count() }).from(favorite).where(inArray(favorite.videoId, videoIds)).groupBy(favorite.videoId),
    db.select({ videoId: comment.videoId, value: count() }).from(comment).where(inArray(comment.videoId, videoIds)).groupBy(comment.videoId),
    currentUserId ? db.select({ videoId: favorite.videoId }).from(favorite).where(and(eq(favorite.userId, currentUserId), inArray(favorite.videoId, videoIds))) : Promise.resolve([]),
    currentUserId && zooIds.length ? db.select({ zooId: subscription.zooId }).from(subscription).where(and(eq(subscription.userId, currentUserId), inArray(subscription.zooId, zooIds), inArray(subscription.status, ["active", "canceling"]), or(isNull(subscription.currentPeriodEnd), gt(subscription.currentPeriodEnd, new Date())))) : Promise.resolve([]),
    zooIds.length ? db.select().from(supportGoal).where(and(inArray(supportGoal.zooId, zooIds), isNull(supportGoal.archivedAt))) : Promise.resolve([]),
  ]);
  const tagsByVideo = new Map<string, string[]>();
  for (const item of allTags) tagsByVideo.set(item.videoId, [...(tagsByVideo.get(item.videoId) ?? []), item.name]);
  const likesByVideo = new Map(likeTotals.map((item) => [item.videoId, item.value]));
  const commentsByVideo = new Map(commentTotals.map((item) => [item.videoId, item.value]));
  const likedIds = new Set(likedRows.map((item) => item.videoId));
  const supportedZooIds = new Set(supportedRows.map((item) => item.zooId));
  const supportGoalsByZoo = new Map(supportGoalRows.map((item) => [item.zooId, toSupportGoalResponse(item)]));

  return Promise.all(pageRows.map(async (row) => {
    const supported = supportedZooIds.has(row.zooId);
    const canPlayFull = Boolean(currentUserId) && (
      row.publisherUserId === currentUserId || supported
    );
    let videoUrl = mediaUrl(row.objectKey);
    if (canPlayFull) {
      const env = getApiEnv();
      videoUrl = await getSignedUrl(getR2Client(), new GetObjectCommand({ Bucket: env.R2_PRIVATE_BUCKET_NAME, Key: row.fullObjectKey }), { expiresIn: 10 * 60 });
    }

    return {
      id: row.id,
      videoUrl,
      zoo: { id: row.zooId, name: row.zooName, avatarUrl: row.avatarObjectKey ? mediaUrl(row.avatarObjectKey) : "/icon.jpg" },
      caption: row.caption,
      tags: tagsByVideo.get(row.id) ?? [],
      likeCount: likesByVideo.get(row.id) ?? 0,
      commentCount: commentsByVideo.get(row.id) ?? 0,
      supportPrice: 500,
      hasActiveSupportPlan: supported,
      supportGoal: supportGoalsByZoo.get(row.zooId) ?? null,
      isLiked: likedIds.has(row.id),
      viewCount: row.viewCount,
      thumbnailTime: row.thumbnailTime,
      publishedAt: row.publishedAt?.toISOString() ?? new Date(0).toISOString(),
    };
  }));
}

content.get("/feed", async (c) => {
  return c.json(await feedRows(c.get("session")?.user.id, { limit: Number(c.req.query("limit")) || 50, cursor: c.req.query("cursor") }));
});

content.get("/search/videos", async (c) => {
  const query = (c.req.query("q") ?? "").trim().toLocaleLowerCase("ja-JP");
  const sort = c.req.query("sort") ?? "latest";
  const rows = await feedRows(c.get("session")?.user.id, { query, limit: Number(c.req.query("limit")) || 50, cursor: c.req.query("cursor") });
  rows.sort((first, second) => {
    if (sort === "popular") return second.viewCount - first.viewCount;
    if (sort === "oldest") return first.publishedAt.localeCompare(second.publishedAt);
    return second.publishedAt.localeCompare(first.publishedAt);
  });

  return c.json(rows.map((item) => ({
    id: item.id,
    videoUrl: item.videoUrl,
    title: item.caption,
    viewCount: item.viewCount,
    thumbnailTime: item.thumbnailTime,
    publishedAt: item.publishedAt,
  })));
});

content.get("/favorites", requireAuth, async (c) => {
  const session = c.get("session")!;
  const sort = c.req.query("sort") ?? "latest";
  const rows = (await feedRows(session.user.id)).filter((item) => item.isLiked);
  rows.sort((first, second) => {
    if (sort === "popular") return second.viewCount - first.viewCount;
    if (sort === "oldest") return first.publishedAt.localeCompare(second.publishedAt);
    return second.publishedAt.localeCompare(first.publishedAt);
  });

  return c.json(rows.map((item) => ({
    id: item.id,
    videoUrl: item.videoUrl,
    title: item.caption,
    viewCount: item.viewCount,
    thumbnailTime: item.thumbnailTime,
    publishedAt: item.publishedAt,
  })));
});

content.post("/feed/:videoId/like", requireAuth, async (c) => {
  const session = c.get("session")!;
  const videoId = c.req.param("videoId");
  const [existingVideo] = await db.select({ id: video.id }).from(video).where(eq(video.id, videoId)).limit(1);
  if (!existingVideo) return c.json({ error: { code: "NOT_FOUND", message: "動画が見つかりません" } }, 404);

  const [existing] = await db
    .select({ userId: favorite.userId })
    .from(favorite)
    .where(and(eq(favorite.userId, session.user.id), eq(favorite.videoId, videoId)))
    .limit(1);

  if (existing) {
    await db.delete(favorite).where(and(eq(favorite.userId, session.user.id), eq(favorite.videoId, videoId)));
    return c.json({ isLiked: false });
  }

  await db.insert(favorite).values({ userId: session.user.id, videoId });
  return c.json({ isLiked: true });
});

content.get("/feed/:videoId/comments", async (c) => {
  const rows = await db
    .select({
      id: comment.id,
      authorName: user.name,
      message: comment.body,
      isSupporter: comment.supporterAtPosting,
      tipAmount: tip.amount,
      createdAt: comment.createdAt,
    })
    .from(comment)
    .innerJoin(user, eq(comment.userId, user.id))
    .leftJoin(tip, eq(tip.commentId, comment.id))
    .where(eq(comment.videoId, c.req.param("videoId")))
    .orderBy(desc(comment.createdAt));

  return c.json(rows.map((row) => ({
    id: row.id,
    author: { name: row.authorName, initials: initials(row.authorName) },
    message: row.message,
    isSupporter: row.isSupporter,
    tipAmount: row.tipAmount ?? 0,
    createdAt: row.createdAt.toISOString(),
  })));
});

content.post("/feed/:videoId/comments", requireAuth, async (c) => {
  const session = c.get("session")!;
  const body = await c.req.json<unknown>().catch(() => null);
  if (!body || typeof body !== "object" || !("message" in body) || !("tipAmount" in body) || typeof body.message !== "string" || typeof body.tipAmount !== "number") {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "コメントの内容を確認してください" } }, 422);
  }
  const message = body.message.trim();
  if (!message || message.length > 200 || ![0, 100, 300, 500].includes(body.tipAmount)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "コメントの内容を確認してください" } }, 422);
  }
  if (body.tipAmount > 0) {
    return c.json({ error: { code: "USE_TIP_CHECKOUT", message: "投げ銭は専用の決済導線を使用してください" } }, 409);
  }

  const videoId = c.req.param("videoId");
  const [videoRow] = await db.select({ zooId: video.zooId }).from(video).where(eq(video.id, videoId)).limit(1);
  if (!videoRow) return c.json({ error: { code: "NOT_FOUND", message: "動画が見つかりません" } }, 404);
  const [supported] = await db.select({ id: subscription.id }).from(subscription).where(and(eq(subscription.userId, session.user.id), eq(subscription.zooId, videoRow.zooId), inArray(subscription.status, ["active", "canceling"]), or(isNull(subscription.currentPeriodEnd), gt(subscription.currentPeriodEnd, new Date())))).limit(1);

  const created = {
    id: crypto.randomUUID(),
    videoId,
    userId: session.user.id,
    body: message,
    supporterAtPosting: Boolean(supported),
  };
  await db.insert(comment).values(created);

  return c.json({
    id: created.id,
    author: { name: session.user.name, initials: initials(session.user.name) },
    message,
    isSupporter: created.supporterAtPosting,
    tipAmount: 0,
    createdAt: new Date().toISOString(),
  }, 201);
});

export { content };
