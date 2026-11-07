import { NextResponse } from "next/server";
import { z } from "zod";

import { PromptType, TechnicalCategory } from "@/generated/prisma/enums";
import { aiErrorResponse } from "@/server/ai/aiErrorResponse";
import { createAIProvider } from "@/server/ai/client";
import { resolveAICredentials } from "@/server/ai/credentials";
import { AIKeyRequiredError } from "@/server/ai/errors";
import { prisma } from "@/server/db/client";
import { createWritingCoachService } from "@/server/domain/writing/writingCoachService";
import { createWritingSessionRepository } from "@/server/domain/writing/writingSession.repository";
import { logError } from "@/server/logError";
import { rateLimitResponse } from "@/server/rateLimit";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";

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

  const userId = await getCurrentUserId();
  let credentials;
  try {
    credentials = resolveAICredentials(request.headers);
  } catch (error) {
    return aiErrorResponse(error)!;
  }
  if (!credentials) return aiErrorResponse(new AIKeyRequiredError())!;
  const limited = await rateLimitResponse(prisma, request, userId, "analysis");
  if (limited) return limited;
  await ensureUser(prisma, userId);

  try {
    const { provider, modelId } = createAIProvider(credentials);
    const service = createWritingCoachService({ prisma, aiProvider: provider, modelId });

    const result = await service.submitWriting({
      userId,
      ...parsed.data,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const aiResponse = aiErrorResponse(error);
    if (aiResponse) return aiResponse;
    logError("Failed to submit writing session", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  const userId = await getCurrentUserId();
  try {
    const repository = createWritingSessionRepository(prisma);
    const sessions = await repository.listByUser(userId, { limit: 20 });
    return NextResponse.json(sessions);
  } catch (error) {
    logError("Failed to list writing sessions", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
