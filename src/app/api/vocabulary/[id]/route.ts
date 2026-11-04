import { NextResponse } from "next/server";

import { DEFAULT_USER_ID } from "@/lib/constants";
import { prisma } from "@/server/db/client";
import { createVocabularyRepository } from "@/server/domain/vocabulary/vocabulary.repository";

export async function DELETE(_request: Request, context: RouteContext<"/api/vocabulary/[id]">) {
  const { id } = await context.params;

  try {
    const repository = createVocabularyRepository(prisma);
    const deleted = await repository.delete(id, DEFAULT_USER_ID);
    return deleted ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("Failed to delete vocabulary item", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
