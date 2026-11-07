import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";
import { createWritingSessionRepository } from "@/server/domain/writing/writingSession.repository";
import { logError } from "@/server/logError";
import { getCurrentUserId } from "@/server/session/currentUser";

export async function GET(_request: Request, context: RouteContext<"/api/writing-sessions/[id]">) {
  const { id } = await context.params;

  const userId = await getCurrentUserId();

  try {
    const repository = createWritingSessionRepository(prisma);
    const session = await repository.findByIdForUser(id, userId);

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    logError("Failed to fetch writing session", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
