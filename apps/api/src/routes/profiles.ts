import { and, count, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../db";
import {
  galleryPost,
  mediaAsset,
  session as sessionTable,
  subscription,
  supportGoal,
  user,
  userProfile,
  video,
  zoo,
} from "../db/schema";
import {
  requireAuth,
  type AuthEnv,
} from "../middleware/auth";
import { toSupportGoalResponse } from "../lib/support-goal";

const profiles = new Hono<AuthEnv>();

function mediaUrl(objectKey: string | null) {
  if (!objectKey) return null;
  if (/^(?:https?:\/\/|\/)/.test(objectKey)) return objectKey;

  const baseUrl = process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/${objectKey}` : `/${objectKey}`;
}

function accountRole(role: string) {
  return role === "creator" || role === "publisher" ? "creator" : "viewer";
}

async function galleryForUser(userId: string) {
  const rows = await db
    .select({
      id: galleryPost.id,
      objectKey: mediaAsset.objectKey,
      createdAt: galleryPost.publishedAt,
      authorId: user.id,
      authorName: user.name,
      zooId: zoo.id,
      zooName: zoo.name,
    })
    .from(galleryPost)
    .innerJoin(mediaAsset, eq(galleryPost.imageMediaAssetId, mediaAsset.id))
    .innerJoin(user, eq(galleryPost.userId, user.id))
    .innerJoin(zoo, eq(galleryPost.zooId, zoo.id))
    .where(eq(galleryPost.userId, userId))
    .orderBy(desc(galleryPost.publishedAt));

  return rows.map((row) => ({
    id: row.id,
    imageUrl: mediaUrl(row.objectKey) ?? "",
    createdAt: row.createdAt.toISOString(),
    author: { id: row.authorId, name: row.authorName },
    zoo: { id: row.zooId, name: row.zooName },
  }));
}

async function galleryForZoo(zooId: string) {
  const rows = await db
    .select({ id: galleryPost.id, objectKey: mediaAsset.objectKey, createdAt: galleryPost.publishedAt, authorId: user.id, authorName: user.name, zooName: zoo.name })
    .from(galleryPost)
    .innerJoin(mediaAsset, eq(galleryPost.imageMediaAssetId, mediaAsset.id))
    .innerJoin(user, eq(galleryPost.userId, user.id))
    .innerJoin(zoo, eq(galleryPost.zooId, zoo.id))
    .where(eq(galleryPost.zooId, zooId))
    .orderBy(desc(galleryPost.publishedAt));
  return rows.map((row) => ({ id: row.id, imageUrl: mediaUrl(row.objectKey) ?? "", createdAt: row.createdAt.toISOString(), author: { id: row.authorId, name: row.authorName }, zoo: { id: zooId, name: row.zooName } }));
}

async function creatorProfile(zooId: string) {
  const [zooRow] = await db
    .select({
      id: zoo.id,
      name: zoo.name,
      bio: zoo.description,
      avatarObjectKey: mediaAsset.objectKey,
    })
    .from(zoo)
    .leftJoin(mediaAsset, eq(zoo.profileMediaAssetId, mediaAsset.id))
    .where(and(eq(zoo.id, zooId), eq(zoo.status, "active")))
    .limit(1);

  if (!zooRow) return null;

  const videos = await db
    .select({
      id: video.id,
      objectKey: mediaAsset.objectKey,
      title: video.description,
      viewCount: video.viewCount,
      thumbnailTime: video.thumbnailTime,
    })
    .from(video)
    .innerJoin(mediaAsset, eq(video.previewMediaAssetId, mediaAsset.id))
    .where(and(eq(video.zooId, zooId), eq(video.status, "published")))
    .orderBy(desc(video.publishedAt));

  const [[supporterTotal], [goal]] = await Promise.all([
    db
      .select({ value: count() })
      .from(subscription)
      .where(
        and(
          eq(subscription.zooId, zooId),
          inArray(subscription.status, ["active", "canceling"]),
          or(isNull(subscription.currentPeriodEnd), gt(subscription.currentPeriodEnd, new Date())),
        ),
      ),
    db
      .select()
      .from(supportGoal)
      .where(and(eq(supportGoal.zooId, zooId), isNull(supportGoal.archivedAt)))
      .limit(1),
  ]);

  return {
    id: zooRow.id,
    accountRole: "creator" as const,
    name: zooRow.name,
    avatarUrl: mediaUrl(zooRow.avatarObjectKey),
    bio: zooRow.bio ?? "",
    videoCount: videos.length,
    supporterCount: supporterTotal?.value ?? 0,
    supportPrice: 500,
    supportGoal: goal ? toSupportGoalResponse(goal) : null,
    videos: videos.map((item) => ({
      id: item.id,
      videoId: item.id,
      videoUrl: mediaUrl(item.objectKey) ?? "",
      title: item.title,
      viewCount: item.viewCount,
      thumbnailTime: item.thumbnailTime,
    })),
    galleryPosts: await galleryForZoo(zooId),
  };
}

profiles.get("/zoos/:zooId/profile", async (c) => {
  const profile = await creatorProfile(c.req.param("zooId"));

  if (!profile) {
    return c.json({ error: { code: "NOT_FOUND", message: "動物園が見つかりません" } }, 404);
  }

  return c.json(profile);
});

profiles.get("/users/:userId/profile", async (c) => {
  const userId = c.req.param("userId");
  const [row] = await db.select({ id: user.id, name: user.name, avatarUrl: user.image, bio: userProfile.bio })
    .from(user).leftJoin(userProfile, eq(user.id, userProfile.userId)).where(eq(user.id, userId)).limit(1);
  if (!row) return c.json({ error: { code: "NOT_FOUND", message: "ユーザーが見つかりません" } }, 404);
  return c.json({ id: row.id, accountRole: "viewer", name: row.name, avatarUrl: row.avatarUrl, bio: row.bio ?? "", videoCount: null, supporterCount: null, supportPrice: null, supportGoal: null, videos: [], galleryPosts: await galleryForUser(userId) });
});

profiles.use("/profiles/me/*", requireAuth);
profiles.get("/profiles/me", requireAuth, async (c) => {
  const session = c.get("session")!;

  if (accountRole(session.user.role) === "creator") {
    const [ownedZoo] = await db
      .select({ id: zoo.id })
      .from(zoo)
      .where(eq(zoo.publisherUserId, session.user.id))
      .limit(1);
    const profile = ownedZoo ? await creatorProfile(ownedZoo.id) : null;

    if (profile) return c.json(profile);
  }

  const [profileRow] = await db
    .select({ bio: userProfile.bio })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);

  return c.json({
    id: session.user.id,
    accountRole: "viewer",
    name: session.user.name,
    avatarUrl: session.user.image ?? null,
    bio: profileRow?.bio ?? "",
    videoCount: null,
    supporterCount: null,
    supportPrice: null,
    supportGoal: null,
    videos: [],
    galleryPosts: await galleryForUser(session.user.id),
  });
});

profiles.get("/profiles/me/account", async (c) => {
  const session = c.get("session")!;
  const [profileRow] = await db
    .select({ bio: userProfile.bio })
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1);

  return c.json({
    name: session.user.name,
    email: session.user.email,
    bio: profileRow?.bio ?? "",
  });
});

profiles.patch("/profiles/me/account", async (c) => {
  const session = c.get("session")!;
  const body = await c.req.json<unknown>().catch(() => null);

  if (
    !body ||
    typeof body !== "object" ||
    !("name" in body) ||
    !("bio" in body) ||
    typeof body.name !== "string" ||
    typeof body.bio !== "string"
  ) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "入力内容を確認してください" } }, 422);
  }

  const name = body.name.trim();
  const bio = body.bio.trim();

  if (!name || name.length > 30 || bio.length > 200) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "入力内容を確認してください" } }, 422);
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ name, updatedAt: new Date() })
        .where(eq(user.id, session.user.id));
      await tx
        .insert(userProfile)
        .values({ userId: session.user.id, bio })
        .onConflictDoUpdate({
          target: userProfile.userId,
          set: { bio, updatedAt: new Date() },
        });
    });
  } catch (error) {
    if (error instanceof Error && /unique/i.test(error.message)) {
      return c.json({ error: { code: "CONFLICT", message: "このメールアドレスはすでに使用されています" } }, 409);
    }
    throw error;
  }

  return c.json({ name, email: session.user.email, bio });
});

profiles.delete("/profiles/me", requireAuth, async (c) => {
  const session = c.get("session")!;
  const withdrawnAt = new Date();
  await db.transaction(async (tx) => {
    await tx.update(user).set({ name: "退会済みユーザー", image: null, updatedAt: withdrawnAt }).where(eq(user.id, session.user.id));
    await tx.insert(userProfile).values({ userId: session.user.id, bio: null, withdrawnAt })
      .onConflictDoUpdate({ target: userProfile.userId, set: { bio: null, withdrawnAt, updatedAt: withdrawnAt } });
    await tx.delete(sessionTable).where(eq(sessionTable.userId, session.user.id));
  });
  return c.body(null, 204);
});

export { profiles };
