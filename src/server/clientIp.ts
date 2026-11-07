import { createHash } from "node:crypto";

const DEV_SALT = "dev-only-ip-hash-salt-do-not-use-in-production";

export function getIpHashSalt(): string {
  const salt = process.env.IP_HASH_SALT;
  if (salt) return salt;
  if (process.env.NODE_ENV === "production") {
    throw new Error("IP_HASH_SALT is not set — it is required in production.");
  }
  return DEV_SALT;
}

// The raw IP is never stored or logged: only a salted hash, truncated, is used
// as a rate-limit subject.
export function hashedClientIp(headers: Headers): string {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = first || "unknown";
  return createHash("sha256")
    .update(getIpHashSalt() + ip)
    .digest("hex")
    .slice(0, 32);
}
