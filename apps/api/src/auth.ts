import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import { db } from "./db";
import * as schema from "./db/schema";

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  appName: "Scrozoo",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.EMAIL_FROM;
      if (!apiKey || !from) throw new Error("Password reset email is not configured");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [user.email],
          subject: "Scrozoo パスワード再設定",
          text: `以下のURLからパスワードを再設定してください。\n${url}`,
        }),
      });
      if (!response.ok) throw new Error(`Password reset email failed: ${response.status}`);
    },
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined,
  trustedOrigins,
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "viewer",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await db.insert(schema.userProfile).values({ userId: createdUser.id }).onConflictDoNothing();
        },
      },
    },
  },
  advanced: {
    useSecureCookies: isProduction,
    defaultCookieAttributes: isProduction
      ? { httpOnly: true, sameSite: "none", secure: true }
      : undefined,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
});
