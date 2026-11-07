import { NextResponse } from "next/server";
import { z } from "zod";

import { aiErrorResponse } from "@/server/ai/aiErrorResponse";
import { createAIProvider } from "@/server/ai/client";
import { resolveAICredentials } from "@/server/ai/credentials";
import { AIKeyRequiredError } from "@/server/ai/errors";
import type { GeneratedExercise } from "@/server/ai/schemas/exerciseGeneration";
import { prisma } from "@/server/db/client";
import { createExerciseRepository } from "@/server/domain/exercises/exercise.repository";
import { createExerciseGenerationService } from "@/server/domain/exercises/exerciseService";
import { toPublicExercise } from "@/server/domain/exercises/publicView";
import { logError } from "@/server/logError";
import { rateLimitResponse } from "@/server/rateLimit";
import { ensureUser, getCurrentUserId } from "@/server/session/currentUser";

// Optional: generate the daily session's review set after a writing session.
const generateSchema = z
  .object({ afterSessionId: z.string().min(1).max(64).optional() })
  .optional();

function toResponseShape(exercise: { id: string; type: string; promptData: unknown }) {
  return {
    id: exercise.id,
    type: exercise.type,
    prompt: toPublicExercise(exercise.promptData as GeneratedExercise),
  };
}

export async function GET() {
  const userId = await getCurrentUserId();
  try {
    const repository = createExerciseRepository(prisma);
    const pending = await repository.listPending(userId);
    return NextResponse.json({ exercises: pending.map(toResponseShape) });
  } catch (error) {
    logError("Failed to list exercises", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined);
  const parsed = generateSchema.safeParse(body);
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
  const limited = await rateLimitResponse(prisma, request, userId, "generation");
  if (limited) return limited;
  await ensureUser(prisma, userId);

  try {
    const { provider } = createAIProvider(credentials);
    const service = createExerciseGenerationService({ prisma, aiProvider: provider });
    const created = await service.generatePracticeSet(userId, undefined, {
      afterSessionId: parsed.data?.afterSessionId,
    });

    if (created.length === 0) {
      return NextResponse.json(
        { error: "No mistake patterns yet — write something first to get personalized exercises." },
        { status: 422 },
      );
    }

    return NextResponse.json({ exercises: created.map(toResponseShape) }, { status: 201 });
  } catch (error) {
    const aiResponse = aiErrorResponse(error);
    if (aiResponse) return aiResponse;
    logError("Failed to generate exercises", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
