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

export function proxy(request: NextRequest) {
  const secret = getSessionSecret();
  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, secret)) {
    return NextResponse.next();
  }

  const token = signSessionId(newSessionId(), secret);

  // Forward the fresh cookie on the request so this same render sees it too.
  const headers = new Headers(request.headers);
  const others = request.cookies
    .getAll()
    .filter((cookie) => cookie.name !== SESSION_COOKIE)
    .map((cookie) => `${cookie.name}=${cookie.value}`);
  headers.set("cookie", [...others, `${SESSION_COOKIE}=${token}`].join("; "));

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|opengraph-image|robots.txt|sitemap.xml).*)"],
};
