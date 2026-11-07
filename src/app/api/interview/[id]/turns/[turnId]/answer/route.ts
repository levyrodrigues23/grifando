import { NextResponse } from "next/server";
import { z } from "zod";

import { DEFAULT_USER_ID } from "@/lib/constants";
import { getAIModelId, getAIProvider } from "@/server/ai/client";
import { prisma } from "@/server/db/client";
import { createInterviewService } from "@/server/domain/interview/interviewService";
import { aiRateLimits, rateLimitResponse } from "@/server/rateLimit";

const MAX_ANSWER_LENGTH = 5000;

const answerSchema = z.object({
  answer: z.string().trim().min(1).max(MAX_ANSWER_LENGTH),
  retrySessionId: z.string().min(1).max(64).optional(),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/interview/[id]/turns/[turnId]/answer">,
) {
  const { id, turnId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = answerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const limited = rateLimitResponse(aiRateLimits.analysis, DEFAULT_USER_ID);
  if (limited) return limited;

  try {
    const service = createInterviewService({
      prisma,
      aiProvider: getAIProvider(),
      modelId: getAIModelId(),
    });

    const result = await service.answerTurn({
      userId: DEFAULT_USER_ID,
      sessionId: id,
      turnId,
      answer: parsed.data.answer,
      retrySessionId: parsed.data.retrySessionId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to answer interview turn", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
