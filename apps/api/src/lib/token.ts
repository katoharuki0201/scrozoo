export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createVisitQrToken(zooId: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`scrozoo:visit-qr:${zooId}`),
  );
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const encoded = base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return `scrozoo:visit:${zooId}:${encoded}`;
}

export function visitQrTokenFromPayload(payload: string) {
  try {
    return new URL(payload).searchParams.get("payload")?.trim() || payload;
  } catch {
    return payload;
  }
}
