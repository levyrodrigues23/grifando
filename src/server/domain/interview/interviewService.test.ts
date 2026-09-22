import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AIProvider } from "@/server/ai/provider";
import { createTestPrismaClient, resetDatabase } from "@/server/db/test-utils";
import { createInterviewService } from "@/server/domain/interview/interviewService";

const prisma = createTestPrismaClient();
const userId = "test-user";

beforeEach(async () => {
  await resetDatabase(prisma);
  await prisma.user.create({
    data: { id: userId, email: "test@example.com", displayName: "Test User" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function fakeAnalysisResult() {
  return {
    correctedText: "I worked on a payments API.",
    naturalText: "I've been building a payments API.",
    overallFeedback: "Clear and professional.",
    scores: { grammar: 85, vocabulary: 80, clarity: 88, naturalness: 82, technicalCommunication: 90 },
    mistakes: [],
  };
}

function fakeProvider(overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    analyzeWriting: vi.fn().mockResolvedValue(fakeAnalysisResult()),
    generateExercises: vi.fn(),
    continueInterview: vi.fn().mockResolvedValue({ question: "What did you work on recently?" }),
    ...overrides,
  };
}

describe("interviewService.startInterview", () => {
  it("creates a session with one opening question", async () => {
    const service = createInterviewService({ prisma, aiProvider: fakeProvider(), modelId: "test-model" });

    const { sessionId, turn } = await service.startInterview(userId);

    expect(turn.order).toBe(0);
    expect(turn.question).toBe("What did you work on recently?");

    const session = await prisma.interviewSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.status).toBe("ACTIVE");
  });
});

describe("interviewService.answerTurn", () => {
  it("scores the answer via the Writing Coach pipeline and asks a follow-up", async () => {
    const provider = fakeProvider();
    const service = createInterviewService({ prisma, aiProvider: provider, modelId: "test-model" });
    const { sessionId, turn } = await service.startInterview(userId);

    const result = await service.answerTurn({
      userId,
      sessionId,
      turnId: turn.id,
      answer: "I worked on a payments API.",
    });

    expect(result.status).toBe("answered");
    expect(provider.analyzeWriting).toHaveBeenCalledOnce();
    expect(provider.continueInterview).toHaveBeenCalledTimes(2); // opening + follow-up

    const session = await prisma.interviewSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { turns: true },
    });
    expect(session.turns).toHaveLength(2);
    expect(session.turns[0].userAnswer).toBe("I worked on a payments API.");
    expect(session.turns[0].writingAnalysisId).not.toBeNull();
  });

  it("ends the session instead of asking another question once the turn cap is reached", async () => {
    const provider = fakeProvider();
    const service = createInterviewService({ prisma, aiProvider: provider, modelId: "test-model" });
    const { sessionId } = await service.startInterview(userId);

    let currentTurnId = (await prisma.interviewTurn.findFirstOrThrow({ where: { interviewSessionId: sessionId } })).id;
    let lastStatus: string | undefined;

    // MAX_TURNS is 6 (0-indexed orders 0-5); answering order 5 should end it.
    for (let i = 0; i < 6; i++) {
      const result = await service.answerTurn({ userId, sessionId, turnId: currentTurnId, answer: `answer ${i}` });
      lastStatus = result.status;

      if (result.status === "answered") {
        const nextTurn = await prisma.interviewTurn.findFirstOrThrow({
          where: { interviewSessionId: sessionId, userAnswer: null },
        });
        currentTurnId = nextTurn.id;
      }
    }

    expect(lastStatus).toBe("ended");

    const session = await prisma.interviewSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.status).toBe("ENDED");
  });

  it("returns a failed result and does not create a follow-up question when analysis fails", async () => {
    const provider = fakeProvider({ analyzeWriting: vi.fn().mockRejectedValue(new Error("boom")) });
    const service = createInterviewService({ prisma, aiProvider: provider, modelId: "test-model" });
    const { sessionId, turn } = await service.startInterview(userId);

    const result = await service.answerTurn({
      userId,
      sessionId,
      turnId: turn.id,
      answer: "some answer",
    });

    expect(result.status).toBe("failed");

    const session = await prisma.interviewSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { turns: true },
    });
    expect(session.turns).toHaveLength(1);
    expect(session.turns[0].userAnswer).toBeNull();
  });
});
