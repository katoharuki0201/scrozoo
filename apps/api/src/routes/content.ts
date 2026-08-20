import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { db } from "../db";
import {
  comment,
  favorite,
  mediaAsset,
  subscription,
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

async function feedRows(currentUserId?: string) {
  const rows = await db
    .select({
      id: video.id,
      objectKey: mediaAsset.objectKey,
      zooId: zoo.id,
      zooName: zoo.name,
      publisherUserId: zoo.publisherUserId,
      fullMediaAssetId: video.fullMediaAssetId,
      caption: video.description,
      publishedAt: video.publishedAt,
    })
    .from(video)
    .innerJoin(mediaAsset, eq(video.previewMediaAssetId, mediaAsset.id))
    .innerJoin(zoo, eq(video.zooId, zoo.id))
    .where(and(eq(video.status, "published"), eq(zoo.status, "active")))
    .orderBy(desc(video.publishedAt));

  return Promise.all(rows.map(async (row) => {
    const [tags, likeTotal, commentTotal, liked, supported] = await Promise.all([
      db
        .select({ name: tag.name })
        .from(videoTag)
        .innerJoin(tag, eq(videoTag.tagId, tag.id))
        .where(eq(videoTag.videoId, row.id)),
      db.select({ value: count() }).from(favorite).where(eq(favorite.videoId, row.id)),
      db.select({ value: count() }).from(comment).where(eq(comment.videoId, row.id)),
      currentUserId
        ? db.select({ userId: favorite.userId }).from(favorite).where(and(eq(favorite.userId, currentUserId), eq(favorite.videoId, row.id))).limit(1)
        : Promise.resolve([]),
      currentUserId
        ? db.select({ id: subscription.id }).from(subscription).where(and(eq(subscription.userId, currentUserId), eq(subscription.zooId, row.zooId), inArray(subscription.status, ["active", "canceling"]))).limit(1)
        : Promise.resolve([]),
    ]);

    const canPlayFull = Boolean(currentUserId) && (
      row.publisherUserId === currentUserId || supported.length > 0
    );
    let videoUrl = mediaUrl(row.objectKey);
    if (canPlayFull) {
      const [fullAsset] = await db.select({ objectKey: mediaAsset.objectKey }).from(mediaAsset)
        .where(and(eq(mediaAsset.id, row.fullMediaAssetId), eq(mediaAsset.status, "ready"))).limit(1);
      if (fullAsset) {
        const env = getApiEnv();
        videoUrl = await getSignedUrl(getR2Client(), new GetObjectCommand({
          Bucket: env.R2_PRIVATE_BUCKET_NAME,
          Key: fullAsset.objectKey,
        }), { expiresIn: 10 * 60 });
      }
    }

    return {
      id: row.id,
      videoUrl,
      zoo: { id: row.zooId, name: row.zooName, avatarUrl: "/icon.jpg" },
      caption: row.caption,
      tags: tags.map((item) => item.name),
      likeCount: likeTotal[0]?.value ?? 0,
      commentCount: commentTotal[0]?.value ?? 0,
      supportPrice: 500,
      hasActiveSupportPlan: supported.length > 0,
      supportGoal: null,
      isLiked: liked.length > 0,
      viewCount: 0,
      thumbnailTime: 0,
      publishedAt: row.publishedAt?.toISOString() ?? new Date(0).toISOString(),
    };
  }));
}

content.get("/feed", async (c) => {
  return c.json(await feedRows(c.get("session")?.user.id));
});

content.get("/search/videos", async (c) => {
  const query = (c.req.query("q") ?? "").trim().toLocaleLowerCase("ja-JP");
  const sort = c.req.query("sort") ?? "latest";
  const rows = (await feedRows(c.get("session")?.user.id)).filter((item) =>
    !query || [item.caption, item.zoo.name, ...item.tags].join(" ").toLocaleLowerCase("ja-JP").includes(query),
  );
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
  if (!existingVideo) return c.json({ message: "Not found" }, 404);

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
    return c.json({ message: "コメントの内容を確認してください。" }, 400);
  }
  const message = body.message.trim();
  if (!message || message.length > 200 || ![0, 100, 300, 500].includes(body.tipAmount)) {
    return c.json({ message: "コメントの内容を確認してください。" }, 400);
  }
  if (body.tipAmount > 0) {
    return c.json({ message: "投げ銭決済APIはまだ接続されていません。" }, 501);
  }

  const videoId = c.req.param("videoId");
  const [videoRow] = await db.select({ zooId: video.zooId }).from(video).where(eq(video.id, videoId)).limit(1);
  if (!videoRow) return c.json({ message: "Not found" }, 404);
  const [supported] = await db.select({ id: subscription.id }).from(subscription).where(and(eq(subscription.userId, session.user.id), eq(subscription.zooId, videoRow.zooId), inArray(subscription.status, ["active", "canceling"]))).limit(1);

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
