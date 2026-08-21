import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let app: (typeof import("../index"))["default"];
let client: Client;
let testDirectory: string;

beforeAll(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), "scrozoo-admin-"));
  const databaseUrl = `file:${join(testDirectory, "test.db")}`;
  Object.assign(process.env, {
    TURSO_DATABASE_URL: databaseUrl,
    TURSO_AUTH_TOKEN: "test",
    BETTER_AUTH_SECRET: "integration-test-secret-with-at-least-32-characters",
    BETTER_AUTH_URL: "http://localhost:3000",
    FRONTEND_URL: "http://localhost:5173",
    TRUSTED_ORIGINS: "http://localhost:5173",
    R2_ACCOUNT_ID: "test",
    R2_ACCESS_KEY_ID: "test",
    R2_SECRET_ACCESS_KEY: "test",
    R2_ENDPOINT: "https://example.invalid",
    R2_PUBLIC_BUCKET_NAME: "scrozoo-public",
    R2_PRIVATE_BUCKET_NAME: "scrozoo-private",
    MEDIA_PUBLIC_BASE_URL: "https://media.example.com",
  });

  client = createClient({ url: databaseUrl, authToken: "test" });
  const migrationFiles = (await readdir(new URL("../../migrations", import.meta.url)))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrationFiles) {
    const sql = await Bun.file(new URL(`../../migrations/${file}`, import.meta.url)).text();
    for (const statement of sql.split("--> statement-breakpoint").map((item) => item.trim()).filter(Boolean)) {
      await client.execute(statement);
    }
  }
  app = (await import("../index")).default;
});

afterAll(async () => {
  client.close();
  await rm(testDirectory, { recursive: true, force: true });
});

describe("admin API", () => {
  test("uses an HttpOnly session and manages a creator account", async () => {
    const jsonHeaders = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
    const signup = await app.request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ name: "Admin", email: "admin@example.com", password: "admin1234" }),
    });
    expect(signup.status).toBe(200);
    await client.execute({ sql: "update user set role = ? where email = ?", args: ["admin", "admin@example.com"] });

    const login = await app.request("http://localhost:3000/api/admin/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ email: "admin@example.com", password: "admin1234" }),
    });
    expect(login.status).toBe(200);
    const loginBody = await login.json() as Record<string, unknown>;
    expect(loginBody).not.toHaveProperty("token");
    const cookie = login.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly");

    const created = await app.request("http://localhost:3000/api/admin/creators", {
      method: "POST",
      headers: { ...jsonHeaders, Cookie: cookie! },
      body: JSON.stringify({ zooName: "Test Zoo", managerName: "Manager", email: "creator@example.com", password: "creator1234" }),
    });
    expect(created.status).toBe(201);
    const createdBody = await created.json() as { creator: { id: string } };

    const creatorLoginBeforeSuspension = await app.request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ email: "creator@example.com", password: "creator1234" }),
    });
    expect(creatorLoginBeforeSuspension.status).toBe(200);
    const activeCreatorCookie = creatorLoginBeforeSuspension.headers.get("set-cookie")!;

    const suspended = await app.request(`http://localhost:3000/api/admin/creators/${createdBody.creator.id}/status`, {
      method: "PATCH",
      headers: { ...jsonHeaders, Cookie: cookie! },
      body: JSON.stringify({ status: "suspended" }),
    });
    expect(suspended.status).toBe(200);

    const revokedSessionRequest = await app.request("http://localhost:3000/api/publisher/zoo", {
      headers: { Origin: "http://localhost:5173", Cookie: activeCreatorCookie },
    });
    expect(revokedSessionRequest.status).toBe(401);

    const creatorLogin = await app.request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ email: "creator@example.com", password: "creator1234" }),
    });
    expect(creatorLogin.status).toBe(200);
    const creatorCookie = creatorLogin.headers.get("set-cookie")!;
    const publisherRequest = await app.request("http://localhost:3000/api/publisher/zoo", {
      headers: { Origin: "http://localhost:5173", Cookie: creatorCookie },
    });
    expect(publisherRequest.status).toBe(403);

    for (const path of ["auth/session", "dashboard", "users", "subscribers", "revenue", "creators"]) {
      const response = await app.request(`http://localhost:3000/api/admin/${path}`, {
        headers: { Origin: "http://localhost:5173", Cookie: cookie! },
      });
      expect(response.status).toBe(200);
    }
  });
});
