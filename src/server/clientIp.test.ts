import { describe, expect, it } from "vitest";

import { hashedClientIp } from "@/server/clientIp";

const headers = (xff?: string) => new Headers(xff ? { "x-forwarded-for": xff } : {});

describe("hashedClientIp", () => {
  it("never returns the raw IP and is stable for the same input", () => {
    const hash = hashedClientIp(headers("203.0.113.9"));
    expect(hash).not.toContain("203.0.113.9");
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hashedClientIp(headers("203.0.113.9"))).toBe(hash);
  });

  it("uses only the first x-forwarded-for entry", () => {
    expect(hashedClientIp(headers(" 203.0.113.9 , 10.0.0.1"))).toBe(
      hashedClientIp(headers("203.0.113.9")),
    );
  });

  it("differs per IP and falls back to a stable value when missing", () => {
    expect(hashedClientIp(headers("1.1.1.1"))).not.toBe(hashedClientIp(headers("2.2.2.2")));
    expect(hashedClientIp(headers())).toBe(hashedClientIp(headers()));
  });
});
