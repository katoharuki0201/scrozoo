import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../db";
import {
  galleryPost,
  mediaAsset,
  subscription,
  user,
  userProfile,
  video,
  zoo,
} from "../db/schema";
import {
  requireAuth,
  type AuthEnv,
} from "../middleware/auth";

const profiles = new Hono<AuthEnv>();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    })
    .from(video)
    .innerJoin(mediaAsset, eq(video.fullMediaAssetId, mediaAsset.id))
    .where(and(eq(video.zooId, zooId), eq(video.status, "published")))
    .orderBy(desc(video.publishedAt));

  const [supporterTotal] = await db
    .select({ value: count() })
    .from(subscription)
    .where(
      and(
        eq(subscription.zooId, zooId),
        inArray(subscription.status, ["active", "canceling"]),
      ),
    );

  return {
    id: zooRow.id,
    accountRole: "creator" as const,
    name: zooRow.name,
    avatarUrl: mediaUrl(zooRow.avatarObjectKey),
    bio: zooRow.bio ?? "",
    videoCount: videos.length,
    supporterCount: supporterTotal?.value ?? 0,
    supportPrice: 500,
    supportGoal: null,
    videos: videos.map((item) => ({
      id: item.id,
      videoId: item.id,
      videoUrl: mediaUrl(item.objectKey) ?? "",
      title: item.title,
      viewCount: 0,
      thumbnailTime: 0,
    })),
    galleryPosts: [],
  };
}

profiles.get("/zoos/:zooId/profile", async (c) => {
  const profile = await creatorProfile(c.req.param("zooId"));

  if (!profile) {
    return c.json({ message: "Not found" }, 404);
  }

  return c.json(profile);
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
    !("email" in body) ||
    !("bio" in body) ||
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.bio !== "string"
  ) {
    return c.json({ message: "入力内容を確認してください。" }, 400);
  }

  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const bio = body.bio.trim();

  if (!name || name.length > 30 || !emailPattern.test(email) || bio.length > 200) {
    return c.json({ message: "入力内容を確認してください。" }, 400);
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ name, email, updatedAt: new Date() })
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
      return c.json({ message: "このメールアドレスはすでに使用されています。" }, 409);
    }
    throw error;
  }

  return c.json({ name, email, bio });
});

export { profiles };
