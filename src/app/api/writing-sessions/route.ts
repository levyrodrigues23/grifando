import { NextResponse } from "next/server";
import { z } from "zod";

import { PromptType, TechnicalCategory } from "@/generated/prisma/enums";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { getAIModelId, getAIProvider } from "@/server/ai/client";
import { prisma } from "@/server/db/client";
import { createWritingCoachService } from "@/server/domain/writing/writingCoachService";
import { createWritingSessionRepository } from "@/server/domain/writing/writingSession.repository";

const MAX_TEXT_LENGTH = 5000;
const MAX_PROMPT_TEXT_LENGTH = 1000;
const MAX_CODE_SNIPPET_LENGTH = 2000;

const createWritingSessionSchema = z.object({
  promptType: z.nativeEnum(PromptType),
  originalText: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  promptText: z.string().min(1).max(MAX_PROMPT_TEXT_LENGTH).optional(),
  technicalCategory: z.nativeEnum(TechnicalCategory).optional(),
  codeSnippet: z.string().trim().min(1).max(MAX_CODE_SNIPPET_LENGTH).optional(),
  retrySessionId: z.string().min(1).max(64).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createWritingSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const service = createWritingCoachService({
      prisma,
      aiProvider: getAIProvider(),
      modelId: getAIModelId(),
    });

    const result = await service.submitWriting({
      userId: DEFAULT_USER_ID,
      ...parsed.data,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to submit writing session", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const repository = createWritingSessionRepository(prisma);
    const sessions = await repository.listByUser(DEFAULT_USER_ID, { limit: 20 });
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to list writing sessions", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
