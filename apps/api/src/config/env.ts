const requiredNames = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "FRONTEND_URL",
  "TRUSTED_ORIGINS",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_PUBLIC_BUCKET_NAME",
  "R2_PRIVATE_BUCKET_NAME",
  "MEDIA_PUBLIC_BASE_URL",
] as const;

type RequiredName = (typeof requiredNames)[number];

export type ApiEnv = Record<RequiredName, string>;

let cachedEnv: ApiEnv | undefined;

export function getApiEnv(): ApiEnv {
  if (cachedEnv) return cachedEnv;

  const missing = requiredNames.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  cachedEnv = Object.fromEntries(
    requiredNames.map((name) => [name, process.env[name]!.trim()]),
  ) as ApiEnv;
  return cachedEnv;
}
