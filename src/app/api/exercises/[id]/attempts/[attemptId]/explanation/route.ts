import { NextResponse } from "next/server";

import { DEFAULT_USER_ID } from "@/lib/constants";
import { getAIProvider } from "@/server/ai/client";
import { AIResponseValidationError } from "@/server/ai/errors";
import { prisma } from "@/server/db/client";
import { createAttemptExplanationService } from "@/server/domain/exercises/exerciseService";

const EXPLANATION_FAILED = "We couldn't explain this answer right now. Your grade is unaffected — try again.";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/exercises/[id]/attempts/[attemptId]/explanation">,
) {
  const { id, attemptId } = await context.params;

  try {
    const service = createAttemptExplanationService({ prisma, aiProvider: getAIProvider() });
    const explanation = await service.explainAttempt({
      userId: DEFAULT_USER_ID,
      exerciseId: id,
      attemptId,
    });

    if (explanation === null) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Failed to explain exercise attempt", error);
    const status = error instanceof AIResponseValidationError ? 502 : 500;
    return NextResponse.json({ error: EXPLANATION_FAILED }, { status });
  }
}
