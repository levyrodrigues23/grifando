import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";
import { createInterviewRepository } from "@/server/domain/interview/interview.repository";

function toTurnDTO(turn: {
  id: string;
  question: string;
  userAnswer: string | null;
  order: number;
  writingAnalysis: {
    correctedText: string;
    naturalText: string;
    overallFeedback: string;
    grammarScore: number;
    vocabularyScore: number;
    clarityScore: number;
    naturalnessScore: number;
    technicalCommunicationScore: number | null;
  } | null;
}) {
  return {
    id: turn.id,
    question: turn.question,
    userAnswer: turn.userAnswer,
    order: turn.order,
    analysis: turn.writingAnalysis,
  };
}

// Read-only — deliberately bypasses createInterviewService (which needs an
// AIProvider) so fetching a session never depends on ANTHROPIC_API_KEY.
export async function GET(_request: Request, context: RouteContext<"/api/interview/[id]">) {
  const { id } = await context.params;

  try {
    const repository = createInterviewRepository(prisma);
    const session = await repository.findSessionById(id);

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: session.id,
      status: session.status,
      turns: session.turns.map(toTurnDTO),
    });
  } catch (error) {
    console.error("Failed to fetch interview session", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
