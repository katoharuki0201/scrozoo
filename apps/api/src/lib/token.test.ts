import { expect, test } from "bun:test";
import { createVisitQrToken, sha256, visitQrTokenFromPayload } from "./token";

test("sha256 produces a deterministic non-reversible token hash", async () => {
  expect(await sha256("visit-token")).toBe("32e6e7a45605fd766962081f832bba25514c28417c2daab41ff5b43fd4bdb1f2");
});

test("visit QR token is stable and specific to a zoo", async () => {
  const first = await createVisitQrToken("zoo-1", "test-secret");
  const second = await createVisitQrToken("zoo-1", "test-secret");
  const otherZoo = await createVisitQrToken("zoo-2", "test-secret");

  expect(first).toBe(second);
  expect(first).not.toBe(otherZoo);
  expect(first).toStartWith("scrozoo:visit:zoo-1:");
});

test("visit QR token can be extracted from a URL", () => {
  const token = "scrozoo:visit:zoo-1:signature";
  const url = `https://example.com/scan?payload=${encodeURIComponent(token)}`;

  expect(visitQrTokenFromPayload(url)).toBe(token);
  expect(visitQrTokenFromPayload(token)).toBe(token);
});
