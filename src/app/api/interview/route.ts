import { NextResponse } from "next/server";

import { getAIModelId, getAIProvider } from "@/server/ai/client";
import { prisma } from "@/server/db/client";
import { createInterviewService } from "@/server/domain/interview/interviewService";
import { aiRateLimits, rateLimitResponse } from "@/server/rateLimit";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";

export async function POST() {
  const userId = await getCurrentUserId();
  await ensureUser(prisma, userId);

  const limited = rateLimitResponse(aiRateLimits.generation, userId);
  if (limited) return limited;

  try {
    const service = createInterviewService({
      prisma,
      aiProvider: getAIProvider(),
      modelId: getAIModelId(),
    });

    const { sessionId, turn } = await service.startInterview(userId);

    return NextResponse.json(
      { sessionId, turn: { id: turn.id, question: turn.question, order: turn.order } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to start interview", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
