import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { Hono } from "hono";

import { auth } from "../auth";
import { db } from "../db";
import {
  creatorAccount,
  session as sessionTable,
  subscription,
  subscriptionEvent,
  tip,
  user,
  userProfile,
  zoo,
} from "../db/schema";
import {
  buildMonthlyRevenue,
  growthRate,
  supportedMonths,
} from "../lib/admin-metrics";
import { requireAdmin, type AuthEnv } from "../middleware/auth";

const admin = new Hono<AuthEnv>();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const feeRate = 10;

function errorResponse(code: string, message: string, fields?: Record<string, string[]>) {
  return { error: { code, message, ...(fields ? { fields } : {}) } };
}

function isUniqueError(error: unknown) {
  return error instanceof Error && /unique|already exists|duplicate/i.test(error.message);
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function copyAuthHeaders(source: Headers) {
  const headers = new Headers(source);
  headers.set("Content-Type", "application/json; charset=UTF-8");
  headers.set("Cache-Control", "no-store");
  return headers;
}

admin.post("/admin/auth/login", async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!emailPattern.test(email) || password.length < 8 || password.length > 128) {
    return c.json(errorResponse("UNAUTHORIZED", "メールアドレスまたはパスワードが正しくありません"), 401);
  }

  const [adminUser] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(and(eq(user.email, email), eq(user.role, "admin")))
    .limit(1);

  if (!adminUser) {
    return c.json(errorResponse("UNAUTHORIZED", "メールアドレスまたはパスワードが正しくありません"), 401);
  }

  try {
    const result = await auth.api.signInEmail({
      body: { email, password, rememberMe: true },
      headers: c.req.raw.headers,
      returnHeaders: true,
    });
    return new Response(JSON.stringify({ admin: adminUser }), {
      status: 200,
      headers: copyAuthHeaders(result.headers),
    });
  } catch {
    return c.json(errorResponse("UNAUTHORIZED", "メールアドレスまたはパスワードが正しくありません"), 401);
  }
});

admin.use("/admin/*", requireAdmin);

admin.get("/admin/auth/session", (c) => {
  const current = c.get("session")!.user;
  return c.json({ id: current.id, name: current.name, email: current.email });
});

admin.post("/admin/auth/logout", async (c) => {
  const result = await auth.api.signOut({
    headers: c.req.raw.headers,
    returnHeaders: true,
  });
  return new Response(null, { status: 204, headers: result.headers });
});

async function supporterCounts() {
  const rows = await db
    .select({ zooId: subscription.zooId })
    .from(subscription)
    .where(inArray(subscription.status, ["active", "canceling"]));
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.zooId, (counts.get(row.zooId) ?? 0) + 1);
  return counts;
}

admin.get("/admin/creators", async (c) => {
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: user.id,
        zooId: zoo.id,
        zooName: zoo.name,
        managerName: creatorAccount.managerName,
        email: user.email,
        issuedAt: creatorAccount.issuedAt,
        status: creatorAccount.status,
      })
      .from(creatorAccount)
      .innerJoin(user, eq(creatorAccount.userId, user.id))
      .innerJoin(zoo, eq(zoo.publisherUserId, user.id))
      .orderBy(desc(creatorAccount.issuedAt)),
    supporterCounts(),
  ]);

  return c.json({
    creators: rows.map((row) => ({
      id: row.id,
      zooName: row.zooName,
      managerName: row.managerName,
      email: row.email,
      issuedAt: dateOnly(row.issuedAt),
      status: row.status,
      supporterCount: counts.get(row.zooId) ?? 0,
    })),
  });
});

admin.post("/admin/creators", async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const zooName = typeof body.zooName === "string" ? body.zooName.trim() : "";
  const managerName = typeof body.managerName === "string" ? body.managerName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fields: Record<string, string[]> = {};
  if (!zooName || zooName.length > 50) fields.zooName = ["動物園名は1〜50文字で入力してください"];
  if (!managerName || managerName.length > 30) fields.managerName = ["担当者名は1〜30文字で入力してください"];
  if (!emailPattern.test(email)) fields.email = ["有効なメールアドレスを入力してください"];
  if (password.length < 8 || password.length > 128) fields.password = ["パスワードは8〜128文字で入力してください"];
  if (Object.keys(fields).length > 0) {
    return c.json(errorResponse("VALIDATION_ERROR", "入力内容を確認してください", fields), 422);
  }

  let createdUserId: string | null = null;
  try {
    const created = await auth.api.signUpEmail({
      body: { name: zooName, email, password, rememberMe: false },
      headers: c.req.raw.headers,
    });
    createdUserId = created.user.id;
    if (created.token) {
      await db.delete(sessionTable).where(eq(sessionTable.token, created.token));
    }

    const issuedAt = new Date();
    const zooId = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.update(user).set({ role: "creator", updatedAt: issuedAt }).where(eq(user.id, createdUserId!));
      await tx.insert(creatorAccount).values({
        userId: createdUserId!,
        managerName,
        status: "active",
        issuedByAdminUserId: c.get("session")!.user.id,
        issuedAt,
      });
      await tx.insert(zoo).values({
        id: zooId,
        publisherUserId: createdUserId!,
        slug: `zoo-${zooId}`,
        name: zooName,
        region: "未設定",
        status: "active",
      });
    });

    return c.json({
      creator: {
        id: createdUserId,
        zooName,
        managerName,
        email,
        issuedAt: dateOnly(issuedAt),
        status: "active" as const,
        supporterCount: 0,
      },
      temporaryPassword: password,
    }, 201);
  } catch (error) {
    if (createdUserId) {
      await db.transaction(async (tx) => {
        await tx.delete(userProfile).where(eq(userProfile.userId, createdUserId!));
        await tx.delete(user).where(eq(user.id, createdUserId!));
      }).catch(() => undefined);
    }
    if (isUniqueError(error)) {
      return c.json(errorResponse("CONFLICT", "このメールアドレスはすでに使用されています"), 409);
    }
    throw error;
  }
});

admin.patch("/admin/creators/:creatorId/status", async (c) => {
  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  if (body.status !== "active" && body.status !== "suspended") {
    return c.json(errorResponse("VALIDATION_ERROR", "状態を確認してください", { status: ["active または suspended を指定してください"] }), 422);
  }
  const status = body.status;

  const creatorId = c.req.param("creatorId");
  const [existing] = await db
    .select({ userId: creatorAccount.userId })
    .from(creatorAccount)
    .where(eq(creatorAccount.userId, creatorId))
    .limit(1);
  if (!existing) return c.json(errorResponse("NOT_FOUND", "投稿者が見つかりません"), 404);

  await db.transaction(async (tx) => {
    await tx.update(creatorAccount).set({ status, updatedAt: new Date() }).where(eq(creatorAccount.userId, creatorId));
    await tx.update(zoo).set({ status: status === "active" ? "active" : "inactive", updatedAt: new Date() }).where(eq(zoo.publisherUserId, creatorId));
    if (status === "suspended") await tx.delete(sessionTable).where(eq(sessionTable.userId, creatorId));
  });

  const counts = await supporterCounts();
  const [row] = await db
    .select({
      id: user.id,
      zooId: zoo.id,
      zooName: zoo.name,
      managerName: creatorAccount.managerName,
      email: user.email,
      issuedAt: creatorAccount.issuedAt,
      status: creatorAccount.status,
    })
    .from(creatorAccount)
    .innerJoin(user, eq(creatorAccount.userId, user.id))
    .innerJoin(zoo, eq(zoo.publisherUserId, user.id))
    .where(eq(user.id, creatorId))
    .limit(1);

  return c.json({ ...row, zooName: row.zooName, issuedAt: dateOnly(row.issuedAt), supporterCount: counts.get(row.zooId) ?? 0 });
});

admin.get("/admin/users", async (c) => {
  const [users, managedCreators, subscriptions] = await Promise.all([
    db.select().from(user).where(ne(user.role, "admin")).orderBy(desc(user.createdAt)),
    db.select().from(creatorAccount),
    db.select({ userId: subscription.userId, status: subscription.status }).from(subscription).where(inArray(subscription.status, ["active", "canceling"])),
  ]);
  const creatorStatus = new Map(managedCreators.map((item) => [item.userId, item.status]));
  const plans = new Map<string, "active" | "cancel_scheduled">();
  for (const item of subscriptions) {
    if (item.status === "active" || !plans.has(item.userId)) plans.set(item.userId, item.status === "canceling" ? "cancel_scheduled" : "active");
  }
  return c.json({ users: users.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email,
    role: item.role === "creator" ? "creator" as const : "viewer" as const,
    planStatus: item.role === "creator" ? "not_applicable" as const : plans.get(item.id) ?? "free" as const,
    status: creatorStatus.get(item.id) ?? "active" as const,
    registeredAt: dateOnly(item.createdAt),
  })) });
});

admin.get("/admin/subscribers", async (c) => {
  const rows = await db
    .select({
      id: subscription.id,
      userId: user.id,
      userName: user.name,
      email: user.email,
      creatorId: zoo.publisherUserId,
      creatorName: zoo.name,
      joinedAt: subscription.createdAt,
      nextRenewalDate: subscription.currentPeriodEnd,
      status: subscription.status,
    })
    .from(subscription)
    .innerJoin(user, eq(subscription.userId, user.id))
    .innerJoin(zoo, eq(subscription.zooId, zoo.id))
    .where(inArray(subscription.status, ["active", "canceling"]))
    .orderBy(desc(subscription.createdAt));
  return c.json({ subscribers: rows.map((row) => ({
    ...row,
    joinedAt: dateOnly(row.joinedAt),
    nextRenewalDate: dateOnly(row.nextRenewalDate ?? row.joinedAt),
    status: row.status === "canceling" ? "cancel_scheduled" as const : "active" as const,
    supportedMonths: supportedMonths(row.joinedAt),
  })) });
});

async function revenueMonths() {
  const [subscriptionRows, tipRows] = await Promise.all([
    db.select({ amount: subscriptionEvent.amount, occurredAt: subscriptionEvent.occurredAt })
      .from(subscriptionEvent)
      .where(inArray(subscriptionEvent.type, ["started", "renewed"])),
    db.select({ amount: tip.amount, occurredAt: tip.succeededAt })
      .from(tip)
      .where(eq(tip.status, "succeeded")),
  ]);
  return buildMonthlyRevenue(
    subscriptionRows.filter((row): row is { amount: number; occurredAt: Date } => row.amount !== null),
    tipRows.filter((row): row is { amount: number; occurredAt: Date } => row.occurredAt !== null),
  );
}

admin.get("/admin/revenue", async (c) => c.json({ feeRate, months: await revenueMonths() }));

admin.get("/admin/dashboard", async (c) => {
  const now = new Date();
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const [allUsers, creators, activeSubscriptions, months, recentUsers, recentCreators] = await Promise.all([
    db.select({ createdAt: user.createdAt }).from(user).where(ne(user.role, "admin")),
    db.select({ status: creatorAccount.status }).from(creatorAccount),
    db.select({ id: subscription.id }).from(subscription).where(inArray(subscription.status, ["active", "canceling"])),
    revenueMonths(),
    db.select({ id: user.id, name: user.name, createdAt: user.createdAt }).from(user).where(ne(user.role, "admin")).orderBy(desc(user.createdAt)).limit(3),
    db.select({ id: creatorAccount.userId, zooName: zoo.name, issuedAt: creatorAccount.issuedAt }).from(creatorAccount).innerJoin(zoo, eq(zoo.publisherUserId, creatorAccount.userId)).orderBy(desc(creatorAccount.issuedAt)).limit(3),
  ]);
  const latest = months.at(-1)!;
  const previous = months.at(-2)!;
  const currentUsers = allUsers.filter((item) => item.createdAt >= currentMonth).length;
  const previousUsers = allUsers.filter((item) => item.createdAt >= previousMonth && item.createdAt < currentMonth).length;
  const recentActivities = [
    ...recentUsers.map((item) => ({ id: `user-${item.id}`, title: "ユーザー登録", detail: `${item.name}さんが登録しました`, occurredAt: item.createdAt.toISOString(), type: "user" as const, sortAt: item.createdAt })),
    ...recentCreators.map((item) => ({ id: `creator-${item.id}`, title: "Creatorアカウント発行", detail: `${item.zooName}のアカウントを発行しました`, occurredAt: item.issuedAt.toISOString(), type: "creator" as const, sortAt: item.issuedAt })),
  ].sort((a, b) => b.sortAt.getTime() - a.sortAt.getTime()).slice(0, 4).map(({ sortAt: _, ...item }) => item);

  return c.json({
    metrics: {
      totalUsers: allUsers.length,
      creators: creators.filter((item) => item.status === "active").length,
      activeSubscribers: activeSubscriptions.length,
      monthlyGross: latest.gross,
      monthlyFee: latest.platformFee,
      userGrowthRate: growthRate(currentUsers, previousUsers),
      revenueGrowthRate: growthRate(latest.gross, previous.gross),
    },
    monthlyRevenue: months.slice(-8),
    recentActivities,
  });
});

export { admin };
