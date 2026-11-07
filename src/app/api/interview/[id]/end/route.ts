import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";
import { createInterviewRepository } from "@/server/domain/interview/interview.repository";
import { logError } from "@/server/logError";
import { rateLimitResponse } from "@/server/rateLimit";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";

// Ending a session is a plain status update — no AI involved, so this
// bypasses createInterviewService the same way the GET route does.
export async function POST(request: Request, context: RouteContext<"/api/interview/[id]/end">) {
  const { id } = await context.params;

  const userId = await getCurrentUserId();
  const limited = await rateLimitResponse(prisma, request, userId, "write");
  if (limited) return limited;
  await ensureUser(prisma, userId);

  try {
    const repository = createInterviewRepository(prisma);
    const ended = await repository.endSession(id, userId);
    if (!ended) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ status: "ended" });
  } catch (error) {
    logError("Failed to end interview session", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
