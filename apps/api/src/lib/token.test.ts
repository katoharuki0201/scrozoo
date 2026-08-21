import { expect, test } from "bun:test";
import { sha256 } from "./token";

test("sha256 produces a deterministic non-reversible token hash", async () => {
  expect(await sha256("visit-token")).toBe("32e6e7a45605fd766962081f832bba25514c28417c2daab41ff5b43fd4bdb1f2");
});
