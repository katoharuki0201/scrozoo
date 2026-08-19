import { createMiddleware } from "hono/factory";

import { auth } from "../auth";

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

  if (session.user.role !== "publisher") {
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

  await next();
});

