import { NextResponse } from "next/server";

import { DEFAULT_USER_ID } from "@/lib/constants";
import { getAIModelId, getAIProvider } from "@/server/ai/client";
import { prisma } from "@/server/db/client";
import { createInterviewService } from "@/server/domain/interview/interviewService";
import { aiRateLimits, rateLimitResponse } from "@/server/rateLimit";

export async function POST() {
  const limited = rateLimitResponse(aiRateLimits.generation, DEFAULT_USER_ID);
  if (limited) return limited;

  try {
    const service = createInterviewService({
      prisma,
      aiProvider: getAIProvider(),
      modelId: getAIModelId(),
    });

    const { sessionId, turn } = await service.startInterview(DEFAULT_USER_ID);

    return NextResponse.json(
      { sessionId, turn: { id: turn.id, question: turn.question, order: turn.order } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to start interview", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
