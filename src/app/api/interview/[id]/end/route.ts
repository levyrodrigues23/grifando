import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";
import { createInterviewRepository } from "@/server/domain/interview/interview.repository";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";

// Ending a session is a plain status update — no AI involved, so this
// bypasses createInterviewService the same way the GET route does.
export async function POST(_request: Request, context: RouteContext<"/api/interview/[id]/end">) {
  const { id } = await context.params;

  const userId = await getCurrentUserId();
  await ensureUser(prisma, userId);

  try {
    const repository = createInterviewRepository(prisma);
    const ended = await repository.endSession(id, userId);
    if (!ended) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ status: "ended" });
  } catch (error) {
    console.error("Failed to end interview session", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
