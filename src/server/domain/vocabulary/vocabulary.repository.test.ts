import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createTestPrismaClient, resetDatabase } from "@/server/db/test-utils";
import { createVocabularyRepository } from "@/server/domain/vocabulary/vocabulary.repository";

const prisma = createTestPrismaClient();
const userId = "test-user";
const otherUserId = "other-user";

beforeEach(async () => {
  await resetDatabase(prisma);
  await prisma.user.createMany({
    data: [
      { id: userId, email: "test@example.com", displayName: "Test User" },
      { id: otherUserId, email: "other@example.com", displayName: "Other User" },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const item = { term: "rely on", meaningPt: "contar com", exampleSentence: "You can rely on the cache." };

describe("vocabularyRepository", () => {
  it("creates, lists newest first, and deletes the user's items", async () => {
    const repository = createVocabularyRepository(prisma);
    const first = await repository.create({ userId, ...item });
    const second = await repository.create({ userId, ...item, term: "figure out" });

    expect((await repository.listByUser(userId)).map((i) => i.id)).toEqual([second.id, first.id]);

    expect(await repository.delete(first.id, userId)).toBe(true);
    expect(await repository.listByUser(userId)).toHaveLength(1);
  });

  it("keeps a source session only when it belongs to the user", async () => {
    const repository = createVocabularyRepository(prisma);
    const own = await prisma.writingSession.create({
      data: { userId, promptType: "FREE", originalText: "text" },
    });
    const foreign = await prisma.writingSession.create({
      data: { userId: otherUserId, promptType: "FREE", originalText: "text" },
    });

    const linked = await repository.create({ userId, ...item, sourceSessionId: own.id });
    const unlinked = await repository.create({ userId, ...item, sourceSessionId: foreign.id });

    expect(linked.sourceSessionId).toBe(own.id);
    expect(unlinked.sourceSessionId).toBeNull();
  });

  it("refuses to delete another user's item", async () => {
    const repository = createVocabularyRepository(prisma);
    const theirs = await repository.create({ userId: otherUserId, ...item });

    expect(await repository.delete(theirs.id, userId)).toBe(false);
    expect(await repository.listByUser(otherUserId)).toHaveLength(1);
  });
});
