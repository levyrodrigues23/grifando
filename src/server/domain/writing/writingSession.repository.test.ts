import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { PromptType } from "@/generated/prisma/enums";
import { createTestPrismaClient, resetDatabase } from "@/server/db/test-utils";
import { createWritingAnalysisRepository } from "@/server/domain/writing/writingAnalysis.repository";
import { createWritingSessionRepository } from "@/server/domain/writing/writingSession.repository";

const prisma = createTestPrismaClient();
const sessions = createWritingSessionRepository(prisma);
const analyses = createWritingAnalysisRepository(prisma);
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

describe("writingSessionRepository", () => {
  it("creates a session in PENDING status", async () => {
    const session = await sessions.create({
      userId,
      promptType: PromptType.FREE,
      originalText: "I have difficulty to understand concurrency.",
    });

    expect(session.status).toBe("PENDING");
  });

  it("marks a session as FAILED without touching its original text", async () => {
    const session = await sessions.create({
      userId,
      promptType: PromptType.FREE,
      originalText: "some text",
    });

    const failed = await sessions.markFailed(session.id);

    expect(failed.status).toBe("FAILED");
    expect(failed.originalText).toBe("some text");
  });

  it("lists sessions for a user, most recent first", async () => {
    const first = await sessions.create({ userId, promptType: PromptType.FREE, originalText: "first" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await sessions.create({ userId, promptType: PromptType.FREE, originalText: "second" });

    const list = await sessions.listByUser(userId);

    expect(list.map((s) => s.id)).toEqual([second.id, first.id]);
    expect(first).toBeTruthy();
  });
});

describe("writingAnalysisRepository.createForSession", () => {
  it("moves the session to ANALYZED when an analysis is attached", async () => {
    const session = await sessions.create({
      userId,
      promptType: PromptType.FREE,
      originalText: "I have difficulty to understand concurrency.",
    });

    await analyses.createForSession({
      sessionId: session.id,
      correctedText: "I have difficulty understanding concurrency.",
      naturalText: "Concurrency is something I struggle with.",
      overallFeedback: "Good attempt overall.",
      grammarScore: 80,
      vocabularyScore: 85,
      clarityScore: 90,
      naturalnessScore: 70,
      modelId: "test-model",
    });

    const updated = await sessions.findById(session.id);

    expect(updated?.status).toBe("ANALYZED");
    expect(updated?.analysis?.correctedText).toBe(
      "I have difficulty understanding concurrency.",
    );
  });
});

describe("writingSessionRepository.findByIdForUser", () => {
  it("returns the owner's session and null for another user", async () => {
    const session = await sessions.create({ userId, promptType: PromptType.FREE, originalText: "hello" });
    await prisma.user.create({ data: { id: "intruder" } });

    expect((await sessions.findByIdForUser(session.id, userId))?.id).toBe(session.id);
    expect(await sessions.findByIdForUser(session.id, "intruder")).toBeNull();
  });
});
