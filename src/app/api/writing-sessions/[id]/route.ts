import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";
import { createWritingSessionRepository } from "@/server/domain/writing/writingSession.repository";

export async function GET(_request: Request, context: RouteContext<"/api/writing-sessions/[id]">) {
  const { id } = await context.params;

  try {
    const repository = createWritingSessionRepository(prisma);
    const session = await repository.findById(id);

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to fetch writing session", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
