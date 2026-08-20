import { describe, expect, test } from "bun:test";

import { extensionFor, validateUploadInput } from "./upload-policy";

describe("validateUploadInput", () => {
  test("accepts an allowed gallery image", () => {
    expect(validateUploadInput({
      purpose: "galleryImage",
      contentType: "image/jpeg",
      size: 1024,
      fileName: "panda.jpg",
    })?.purpose).toBe("galleryImage");
  });

  test("rejects a disallowed content type", () => {
    expect(validateUploadInput({
      purpose: "galleryImage",
      contentType: "image/png",
      size: 1024,
      fileName: "panda.png",
    })).toBeNull();
  });

  test("rejects files over the purpose limit", () => {
    expect(validateUploadInput({
      purpose: "avatar",
      contentType: "image/webp",
      size: 5 * 1024 * 1024 + 1,
      fileName: "avatar.webp",
    })).toBeNull();
  });

  test("maps supported content types to safe extensions", () => {
    expect(extensionFor("video/mp4")).toBe("mp4");
  });
});
