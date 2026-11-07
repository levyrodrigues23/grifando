import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";
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
