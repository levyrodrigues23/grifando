import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { contentSecurityPolicy, proxy } from "./proxy";
import { SESSION_COOKIE, getSessionSecret, signSessionId, verifySessionToken } from "@/server/session/sessionToken";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

function request(cookie?: string) {
  return new NextRequest("http://127.0.0.1:3000/", {
    headers: cookie ? { cookie } : {},
  });
}

// NextResponse.next({ request: { headers } }) exposes forwarded request headers
// as x-middleware-request-* headers on the response.
function forwardedCookie(response: Response) {
  return response.headers.get("x-middleware-request-cookie");
}

describe("proxy", () => {
  it("mints a cookie when none is present and forwards it to the same render", () => {
    const response = proxy(request());
    const set = response.headers.get("set-cookie") ?? "";
    expect(set).toMatch(new RegExp(`^${SESSION_COOKIE}=`));
    expect(set.toLowerCase()).toContain("httponly");
    expect(set.toLowerCase()).toContain("samesite=lax");
    const token = decodeURIComponent(/ig_session=([^;]+)/.exec(set)![1]);
    expect(verifySessionToken(token, getSessionSecret())).not.toBeNull();
    expect(forwardedCookie(response)).toContain(`${SESSION_COOKIE}=${token}`);
  });

  it("leaves a valid cookie untouched", () => {
    const token = signSessionId("user-1", getSessionSecret());
    const response = proxy(request(`${SESSION_COOKIE}=${token}`));
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sets a nonce CSP on the response and forwards it to the render", () => {
    for (const response of [proxy(request()), proxy(request(`${SESSION_COOKIE}=${signSessionId("u", getSessionSecret())}`))]) {
      const csp = response.headers.get("content-security-policy") ?? "";
      const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
      expect(nonce).toBeTruthy();
      expect(csp).toContain("script-src 'self' 'nonce-");
      expect(csp).toContain("'strict-dynamic'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
      expect(response.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    }
    const first = proxy(request()).headers.get("content-security-policy");
    expect(proxy(request()).headers.get("content-security-policy")).not.toBe(first);
  });

  it("builds the exact production policy, adding 'unsafe-eval' only in dev", () => {
    expect(contentSecurityPolicy("abc", false)).toBe(
      "default-src 'self'; script-src 'self' 'nonce-abc' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ytimg.com; font-src 'self'; connect-src 'self'; frame-src https://open.spotify.com https://www.youtube-nocookie.com https://www.youtube.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests",
    );
    expect(contentSecurityPolicy("abc", true)).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic' 'unsafe-eval';");
  });

  it("replaces tampered and wrong-secret cookies, keeping other cookies", () => {
    for (const bad of [
      signSessionId("user-1", getSessionSecret()).replace("user-1", "user-2"),
      signSessionId("user-1", "some-other-secret-xxxxxxxxxxxxxxxx"),
    ]) {
      const response = proxy(request(`theme=x; ${SESSION_COOKIE}=${bad}`));
      const set = response.headers.get("set-cookie") ?? "";
      expect(set).toMatch(new RegExp(`^${SESSION_COOKIE}=`));
      expect(set).not.toContain(bad);
      const forwarded = forwardedCookie(response) ?? "";
      expect(forwarded).toContain("theme=x");
      expect(forwarded).not.toContain(bad);
    }
  });
});
