import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/server/ai/aiErrorResponse";
import { createAIProvider } from "@/server/ai/client";
import { resolveAICredentials } from "@/server/ai/credentials";
import { AIKeyRequiredError } from "@/server/ai/errors";
import { prisma } from "@/server/db/client";
import { createInterviewService } from "@/server/domain/interview/interviewService";
import { rateLimitResponse } from "@/server/rateLimit";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  let credentials;
  try {
    credentials = resolveAICredentials(request.headers);
  } catch (error) {
    return aiErrorResponse(error)!;
  }
  if (!credentials) return aiErrorResponse(new AIKeyRequiredError())!;
  await ensureUser(prisma, userId);

  const limited = await rateLimitResponse(prisma, request, userId, "generation");
  if (limited) return limited;

  try {
    const { provider, modelId } = createAIProvider(credentials);
    const service = createInterviewService({ prisma, aiProvider: provider, modelId });

    const { sessionId, turn } = await service.startInterview(userId);

    return NextResponse.json(
      { sessionId, turn: { id: turn.id, question: turn.question, order: turn.order } },
      { status: 201 },
    );
  } catch (error) {
    const aiResponse = aiErrorResponse(error);
    if (aiResponse) return aiResponse;
    console.error("Failed to start interview", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
