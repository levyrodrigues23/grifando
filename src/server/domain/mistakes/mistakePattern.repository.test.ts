import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { MistakeCategory } from "@/generated/prisma/enums";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import { createTestPrismaClient, resetDatabase } from "@/server/db/test-utils";

const prisma = createTestPrismaClient();
const repository = createMistakePatternRepository(prisma);
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

describe("mistakePatternRepository.upsertPattern", () => {
  it("creates a new pattern on the first occurrence", async () => {
    const pattern = await repository.upsertPattern({
      userId,
      category: MistakeCategory.PREPOSITIONS,
      rawPatternKey: "Depend On",
      exampleOriginal: "I depend of this library.",
      exampleCorrection: "I depend on this library.",
    });

    expect(pattern.patternKey).toBe("depend-on");
    expect(pattern.occurrenceCount).toBe(1);
    expect(pattern.masteryLevel).toBe("ACTIVE");
  });

  it("collapses repeated occurrences of the same concept into one growing pattern", async () => {
    await repository.upsertPattern({
      userId,
      category: MistakeCategory.PREPOSITIONS,
      rawPatternKey: "depend-on",
      exampleOriginal: "I depend of this library.",
      exampleCorrection: "I depend on this library.",
    });

    const second = await repository.upsertPattern({
      userId,
      category: MistakeCategory.PREPOSITIONS,
      rawPatternKey: "Depend On!!",
      exampleOriginal: "This depends of the config.",
      exampleCorrection: "This depends on the config.",
    });

    const patterns = await repository.listByUser(userId);

    expect(patterns).toHaveLength(1);
    expect(second.occurrenceCount).toBe(2);
    expect(second.exampleOriginal).toBe("This depends of the config.");
    // Each occurrence in writing is a failed recall for the half-life model.
    expect(second.incorrectCount).toBe(2);
    expect(second.correctCount).toBe(0);
    expect(second.lastPracticedAt.getTime()).toBe(second.lastSeenAt.getTime());
  });

  it("keeps distinct categories as separate patterns even with the same raw key", async () => {
    await repository.upsertPattern({
      userId,
      category: MistakeCategory.PREPOSITIONS,
      rawPatternKey: "shared-key",
      exampleOriginal: "a",
      exampleCorrection: "b",
    });
    await repository.upsertPattern({
      userId,
      category: MistakeCategory.VOCABULARY,
      rawPatternKey: "shared-key",
      exampleOriginal: "c",
      exampleCorrection: "d",
    });

    const patterns = await repository.listByUser(userId);
    expect(patterns).toHaveLength(2);
  });

  it("orders patterns by occurrence count, most frequent first", async () => {
    await repository.upsertPattern({
      userId,
      category: MistakeCategory.ARTICLES,
      rawPatternKey: "rare",
      exampleOriginal: "a",
      exampleCorrection: "b",
    });
    await repository.upsertPattern({
      userId,
      category: MistakeCategory.PREPOSITIONS,
      rawPatternKey: "frequent",
      exampleOriginal: "c",
      exampleCorrection: "d",
    });
    await repository.upsertPattern({
      userId,
      category: MistakeCategory.PREPOSITIONS,
      rawPatternKey: "frequent",
      exampleOriginal: "e",
      exampleCorrection: "f",
    });

    const patterns = await repository.listByUser(userId);
    expect(patterns[0].patternKey).toBe("frequent");
    expect(patterns[0].occurrenceCount).toBe(2);
  });
});
