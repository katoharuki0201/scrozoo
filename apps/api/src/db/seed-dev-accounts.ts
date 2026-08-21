import { eq } from "drizzle-orm";

import { auth } from "../auth";
import { db } from ".";
import { user, userProfile, zoo } from "./schema";

const accounts = [
  {
    email: process.env.DEV_ADMIN_EMAIL ?? "admin@scrozoo.jp",
    password: process.env.DEV_ADMIN_PASSWORD ?? "admin1234",
    name: "SCROZOO管理者",
    role: "admin",
  },
  {
    email: process.env.DEV_CREATOR_EMAIL ?? "creator@scrozoo.jp",
    password: process.env.DEV_CREATOR_PASSWORD ?? "creator1234",
    name: "開発用クリエイター",
    role: "creator",
  },
] as const;

async function ensureAccount(account: (typeof accounts)[number]) {
  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, account.email))
    .limit(1);

  let userId = existingUser?.id;

  if (!userId) {
    const result = await auth.api.signUpEmail({
      body: {
        email: account.email,
        password: account.password,
        name: account.name,
      },
    });
    userId = result.user.id;
  }

  await db
    .update(user)
    .set({ name: account.name, role: account.role })
    .where(eq(user.id, userId));

  await db
    .insert(userProfile)
    .values({ userId })
    .onConflictDoNothing({ target: userProfile.userId });

  return userId;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("本番環境では開発用アカウントを作成できません。");
  }

  for (const account of accounts) {
    const userId = await ensureAccount(account);

    if (account.role === "creator") {
      await db
        .insert(zoo)
        .values({
          id: "dev-zoo",
          publisherUserId: userId,
          slug: "dev-zoo",
          name: "開発用動物園",
          description: "開発環境でクリエイター機能を確認するための動物園です。",
          region: "東京都",
          status: "active",
        })
        .onConflictDoNothing({ target: zoo.publisherUserId });
    }

    console.log(`created/updated: ${account.email} (${account.role})`);
  }
}

await main();
