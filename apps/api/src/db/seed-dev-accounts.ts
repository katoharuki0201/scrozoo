import { eq } from "drizzle-orm";

import { auth } from "../auth";
import { db } from ".";
import { user, userProfile } from "./schema";

const adminAccount = {
  email: process.env.DEV_ADMIN_EMAIL ?? "admin@scrozoo.jp",
  password: process.env.DEV_ADMIN_PASSWORD ?? "admin1234",
  name: "SCROZOO管理者",
  role: "admin",
} as const;

async function ensureAccount(account: typeof adminAccount) {
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

  await ensureAccount(adminAccount);
  console.log(`created/updated: ${adminAccount.email} (${adminAccount.role})`);
}

await main();
