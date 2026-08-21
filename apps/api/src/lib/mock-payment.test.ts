import { expect, test } from "bun:test";
import { DEFAULT_MOCK_PAYMENT_URL, resolveMockPaymentUrl } from "./mock-payment";

test("uses the approved Stripe test Payment Link by default", () => {
  expect(resolveMockPaymentUrl("")).toBe(DEFAULT_MOCK_PAYMENT_URL);
});

test("rejects non-HTTPS mock payment URLs", () => {
  expect(() => resolveMockPaymentUrl("http://example.com/pay")).toThrow("must use HTTPS");
});
