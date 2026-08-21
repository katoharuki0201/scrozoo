import { and, eq } from "drizzle-orm";

import { auth } from "../auth";
import { db } from "../db";
import { session, user } from "../db/schema";

const name = process.env.ADMIN_NAME?.trim() ?? "";
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const password = process.env.ADMIN_PASSWORD ?? "";

if (!name || !email || password.length < 8 || password.length > 128) {
  throw new Error("ADMIN_NAME, ADMIN_EMAIL and an 8-128 character ADMIN_PASSWORD are required");
}

const [existing] = await db
  .select({ id: user.id, role: user.role })
  .from(user)
  .where(eq(user.email, email))
  .limit(1);

if (existing) {
  if (existing.role === "admin") {
    console.info(`Admin already exists: ${email}`);
    process.exit(0);
  }
  throw new Error("The email address already belongs to a non-admin account");
}

const created = await auth.api.signUpEmail({
  body: { name, email, password, rememberMe: false },
  headers: new Headers({ Origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }),
});

await db.transaction(async (tx) => {
  await tx
    .update(user)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(user.id, created.user.id));
  if (created.token) {
    await tx
      .delete(session)
      .where(and(eq(session.userId, created.user.id), eq(session.token, created.token)));
  }
});

console.info(`Admin created: ${email}`);
