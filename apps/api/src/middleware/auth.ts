import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";

import { auth } from "../auth";
import { db } from "../db";
import { creatorAccount } from "../db/schema";

export type AuthEnv = {
  Variables: {
    session: typeof auth.$Infer.Session | null;
  };
};

export const sessionMiddleware = createMiddleware<AuthEnv>(
  async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    c.set("session", session);
    await next();
  },
);

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  if (!c.get("session")) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "ログインが必要です",
        },
      },
      401,
    );
  }

  await next();
});

export const requirePublisher = createMiddleware<AuthEnv>(async (c, next) => {
  const session = c.get("session");

  if (!session) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "ログインが必要です",
        },
      },
      401,
    );
  }

  if (session.user.role !== "creator") {
    return c.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "投稿者権限が必要です",
        },
      },
      403,
    );
  }

  const [managedAccount] = await db
    .select({ status: creatorAccount.status })
    .from(creatorAccount)
    .where(eq(creatorAccount.userId, session.user.id))
    .limit(1);

  if (managedAccount?.status === "suspended") {
    return c.json(
      {
        error: {
          code: "ACCOUNT_SUSPENDED",
          message: "投稿者アカウントは停止されています",
        },
      },
      403,
    );
  }

  await next();
});

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const session = c.get("session");

  if (!session) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "ログインが必要です" } },
      401,
    );
  }

  if (session.user.role !== "admin") {
    return c.json(
      { error: { code: "FORBIDDEN", message: "管理者権限が必要です" } },
      403,
    );
  }

  await next();
});
