import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  getSessionSecret,
  newSessionId,
  signSessionId,
  verifySessionToken,
} from "@/server/session/sessionToken";

// Scripts are nonce-only; style-src keeps 'unsafe-inline' for React style={} attributes.
// Dev adds 'unsafe-eval' because React uses eval for its debugging aids there.
export function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://i.ytimg.com",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src https://open.spotify.com https://www.youtube-nocookie.com https://www.youtube.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  // Next.js reads the nonce from the forwarded CSP request header and stamps it
  // on its own scripts during rendering.
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);

  const secret = getSessionSecret();
  const hasValidSession = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, secret);
  const isApi = request.nextUrl.pathname.startsWith("/api/");

  // API calls never mint a session: that would create unbounded anonymous users.
  // Cron routes use bearer auth and need no session.
  if (isApi && !hasValidSession && !request.nextUrl.pathname.startsWith("/api/cron/")) {
    const denied = NextResponse.json(
      { error: "Session expired. Reload the page.", code: "SESSION_REQUIRED" },
      { status: 401 },
    );
    denied.headers.set("Content-Security-Policy", csp);
    return denied;
  }

  const token = hasValidSession || isApi ? null : signSessionId(newSessionId(), secret);

  if (token) {
    // Forward the fresh cookie on the request so this same render sees it too.
    const others = request.cookies
      .getAll()
      .filter((cookie) => cookie.name !== SESSION_COOKIE)
      .map((cookie) => `${cookie.name}=${cookie.value}`);
    headers.set("cookie", [...others, `${SESSION_COOKIE}=${token}`].join("; "));
  }

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  if (token) {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|opengraph-image|robots.txt|sitemap.xml).*)"],
};
