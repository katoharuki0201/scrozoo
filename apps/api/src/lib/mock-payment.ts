export const DEFAULT_MOCK_PAYMENT_URL = "https://buy.stripe.com/test_7sYcN5b1wgAafpA8JwaMU00";

export function resolveMockPaymentUrl(value = process.env.MOCK_PAYMENT_URL) {
  const url = new URL(value?.trim() || DEFAULT_MOCK_PAYMENT_URL);
  if (url.protocol !== "https:") throw new Error("MOCK_PAYMENT_URL must use HTTPS");
  return url.toString();
}
