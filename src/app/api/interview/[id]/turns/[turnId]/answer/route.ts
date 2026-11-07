import { NextResponse } from "next/server";
import { z } from "zod";

import { aiErrorResponse } from "@/server/ai/aiErrorResponse";
import { createAIProvider } from "@/server/ai/client";
import { resolveAICredentials } from "@/server/ai/credentials";
import { AIKeyRequiredError } from "@/server/ai/errors";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/server/domain/errors";
import { createInterviewService } from "@/server/domain/interview/interviewService";
import { logError } from "@/server/logError";
import { rateLimitResponse } from "@/server/rateLimit";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";

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
    const service = createInterviewService({ prisma, aiProvider: provider, modelId });

    const result = await service.answerTurn({
      userId,
      sessionId: id,
      turnId,
      answer: parsed.data.answer,
      retrySessionId: parsed.data.retrySessionId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const aiResponse = aiErrorResponse(error);
    if (aiResponse) return aiResponse;
    logError("Failed to answer interview turn", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
