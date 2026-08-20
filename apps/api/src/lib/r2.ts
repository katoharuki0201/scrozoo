import { S3Client } from "@aws-sdk/client-s3";

import { getApiEnv } from "../config/env";

let client: S3Client | undefined;

export function getR2Client() {
  if (client) return client;
  const env = getApiEnv();

  client = new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}
