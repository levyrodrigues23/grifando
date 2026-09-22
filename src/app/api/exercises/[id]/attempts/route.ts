import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/client";
import { createExerciseAttemptService } from "@/server/domain/exercises/exerciseService";

const submitAttemptSchema = z.object({
  answer: z.string().trim().min(1).max(1000),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/exercises/[id]/attempts">,
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = submitAttemptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const service = createExerciseAttemptService({ prisma });
    const result = await service.submitAttempt(id, parsed.data.answer);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to submit exercise attempt", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
