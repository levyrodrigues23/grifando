import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/client";
import { createVocabularyRepository } from "@/server/domain/vocabulary/vocabulary.repository";
import { logError } from "@/server/logError";
import { rateLimitResponse } from "@/server/rateLimit";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";

const createVocabularyItemSchema = z.object({
  term: z.string().trim().min(1).max(120),
  meaningPt: z.string().trim().min(1).max(300),
  exampleSentence: z.string().trim().min(1).max(500),
  sourceSessionId: z.string().min(1).max(64).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createVocabularyItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const userId = await getCurrentUserId();
  await ensureUser(prisma, userId);

  const limited = await rateLimitResponse(prisma, request, userId, "write");
  if (limited) return limited;

  try {
    const repository = createVocabularyRepository(prisma);
    const item = await repository.create({ userId, ...parsed.data });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    logError("Failed to save vocabulary item", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
