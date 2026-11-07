import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

// Pure (no Next imports) so the proxy and unit tests can both use it.
export const SESSION_COOKIE = "ig_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const DEV_SECRET = "dev-only-session-secret-do-not-use-in-production";

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not set — it is required in production.");
  }
  console.warn("SESSION_SECRET is not set — using an insecure development secret.");
  return DEV_SECRET;
}

function sign(id: string, secret: string): string {
  return createHmac("sha256", secret).update(id).digest("base64url");
}

export function signSessionId(id: string, secret: string): string {
  return `${id}.${sign(id, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [id, signature] = parts;
  if (!id || !signature) return null;

  const expected = Buffer.from(sign(id, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return id;
}

export function newSessionId(): string {
  return randomUUID();
}
