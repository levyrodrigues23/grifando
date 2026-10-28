import { NextResponse } from "next/server";

import { DEFAULT_USER_ID } from "@/lib/constants";
import { getAIProvider } from "@/server/ai/client";
import type { GeneratedExercise } from "@/server/ai/schemas/exerciseGeneration";
import { prisma } from "@/server/db/client";
import { createExerciseRepository } from "@/server/domain/exercises/exercise.repository";
import { createExerciseGenerationService } from "@/server/domain/exercises/exerciseService";
import { toPublicExercise } from "@/server/domain/exercises/publicView";
import { aiRateLimits, rateLimitResponse } from "@/server/rateLimit";

function toResponseShape(exercise: { id: string; type: string; promptData: unknown }) {
  return {
    id: exercise.id,
    type: exercise.type,
    prompt: toPublicExercise(exercise.promptData as GeneratedExercise),
  };
}

export async function GET() {
  try {
    const repository = createExerciseRepository(prisma);
    const pending = await repository.listPending(DEFAULT_USER_ID);
    return NextResponse.json({ exercises: pending.map(toResponseShape) });
  } catch (error) {
    console.error("Failed to list exercises", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function POST() {
  const limited = rateLimitResponse(aiRateLimits.generation, DEFAULT_USER_ID);
  if (limited) return limited;

  try {
    const service = createExerciseGenerationService({ prisma, aiProvider: getAIProvider() });
    const created = await service.generatePracticeSet(DEFAULT_USER_ID);

    if (created.length === 0) {
      return NextResponse.json(
        { error: "No mistake patterns yet — write something first to get personalized exercises." },
        { status: 422 },
      );
    }

    return NextResponse.json({ exercises: created.map(toResponseShape) }, { status: 201 });
  } catch (error) {
    console.error("Failed to generate exercises", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
