import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";
import { deleteUserData } from "@/server/domain/privacy/cleanup";
import { rateLimitResponse } from "@/server/rateLimit";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";
import { SESSION_COOKIE } from "@/server/session/sessionToken";

// Deletes everything stored for this browser's session and expires the cookie.
// The proxy mints a fresh anonymous session on the next page load.
export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  const limited = await rateLimitResponse(prisma, request, userId, "write");
  if (limited) return limited;
  await ensureUser(prisma, userId);

  await deleteUserData(prisma, userId);

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
