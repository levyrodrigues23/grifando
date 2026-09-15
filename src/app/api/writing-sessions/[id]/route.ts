import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";
import { createWritingSessionRepository } from "@/server/domain/writing/writingSession.repository";

export async function GET(_request: Request, context: RouteContext<"/api/writing-sessions/[id]">) {
  const { id } = await context.params;
  const repository = createWritingSessionRepository(prisma);
  const session = await repository.findById(id);

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
