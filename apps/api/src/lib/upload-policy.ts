import type { MediaPurpose } from "../db/schema";

export const UPLOAD_URL_TTL_SECONDS = 10 * 60;
export const PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

type UploadPolicy = {
  contentTypes: readonly string[];
  maxBytes: number;
  creatorOnly: boolean;
};

export const uploadPolicies: Record<MediaPurpose, UploadPolicy> = {
  avatar: {
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 5 * 1024 * 1024,
    creatorOnly: false,
  },
  zooProfile: {
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 10 * 1024 * 1024,
    creatorOnly: true,
  },
  animalProfile: {
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 10 * 1024 * 1024,
    creatorOnly: true,
  },
  galleryImage: {
    contentTypes: ["image/jpeg", "image/webp"],
    maxBytes: 15 * 1024 * 1024,
    creatorOnly: false,
  },
  videoPreview: {
    contentTypes: ["video/mp4", "video/webm"],
    maxBytes: 25 * 1024 * 1024,
    creatorOnly: true,
  },
  video: {
    contentTypes: ["video/mp4", "video/webm", "video/quicktime"],
    maxBytes: 250 * 1024 * 1024,
    creatorOnly: true,
  },
};

export function isMediaPurpose(value: unknown): value is MediaPurpose {
  return typeof value === "string" && value in uploadPolicies;
}

export function validateUploadInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (
    !isMediaPurpose(input.purpose) ||
    typeof input.contentType !== "string" ||
    typeof input.size !== "number" ||
    !Number.isSafeInteger(input.size) ||
    typeof input.fileName !== "string"
  ) return null;

  const contentType = input.contentType.toLowerCase().trim();
  const fileName = input.fileName.trim();
  const policy = uploadPolicies[input.purpose];
  if (
    !policy.contentTypes.includes(contentType) ||
    input.size <= 0 ||
    input.size > policy.maxBytes ||
    fileName.length === 0 ||
    fileName.length > 255 ||
    /[\u0000-\u001f\u007f]/.test(fileName)
  ) return null;

  return {
    purpose: input.purpose,
    contentType,
    size: input.size,
    fileName,
    policy,
  };
}

export function extensionFor(contentType: string) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  }[contentType];
}

export function bucketVisibilityForPurpose(purpose: MediaPurpose) {
  return purpose === "video" ? "private" : "public";
}
