import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/server/ai/aiErrorResponse";
import { createAIProvider } from "@/server/ai/client";
import { resolveAICredentials } from "@/server/ai/credentials";
import { AIKeyRequiredError, AIResponseValidationError } from "@/server/ai/errors";
import { prisma } from "@/server/db/client";
import { createAttemptExplanationService } from "@/server/domain/exercises/exerciseService";
import { aiRateLimits, rateLimitResponse } from "@/server/rateLimit";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";

const EXPLANATION_FAILED = "We couldn't explain this answer right now. Your grade is unaffected — try again.";

export async function POST(
  request: Request,
  context: RouteContext<"/api/exercises/[id]/attempts/[attemptId]/explanation">,
) {
  const { id, attemptId } = await context.params;

  const userId = await getCurrentUserId();
  let credentials;
  try {
    credentials = resolveAICredentials(request.headers);
  } catch (error) {
    return aiErrorResponse(error)!;
  }
  if (!credentials) return aiErrorResponse(new AIKeyRequiredError())!;
  await ensureUser(prisma, userId);

  const limited = rateLimitResponse(aiRateLimits.analysis, userId);
  if (limited) return limited;

  try {
    const { provider } = createAIProvider(credentials);
    const service = createAttemptExplanationService({ prisma, aiProvider: provider });
    const explanation = await service.explainAttempt({
      userId,
      exerciseId: id,
      attemptId,
    });

    if (explanation === null) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ explanation });
  } catch (error) {
    const aiResponse = aiErrorResponse(error);
    if (aiResponse) return aiResponse;
    console.error("Failed to explain exercise attempt", error);
    const status = error instanceof AIResponseValidationError ? 502 : 500;
    return NextResponse.json({ error: EXPLANATION_FAILED }, { status });
  }
}
