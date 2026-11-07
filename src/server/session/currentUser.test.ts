import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestPrismaClient, resetDatabase } from "@/server/db/test-utils";
import { createVocabularyRepository } from "@/server/domain/vocabulary/vocabulary.repository";
import { ensureUser } from "./currentUser";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const prisma = createTestPrismaClient();

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("ensureUser", () => {
  it("creates the user on first write and isolates two sessions", async () => {
    await ensureUser(prisma, "s1");
    await ensureUser(prisma, "s2");
    await prisma.vocabularyItem.create({
      data: { userId: "s1", term: "t", meaningPt: "m", exampleSentence: "e" },
    });
    expect(await createVocabularyRepository(prisma).listByUser("s2")).toEqual([]);
    expect(await createVocabularyRepository(prisma).listByUser("s1")).toHaveLength(1);
  });

  it("recreates a deleted user on the next write", async () => {
    await ensureUser(prisma, "s1");
    await prisma.user.delete({ where: { id: "s1" } });
    await ensureUser(prisma, "s1");
    expect(await prisma.user.count({ where: { id: "s1" } })).toBe(1);
  });

  it("bumps lastActiveAt at most once per hour", async () => {
    await ensureUser(prisma, "s1");

    const recent = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.user.update({ where: { id: "s1" }, data: { lastActiveAt: recent } });
    await ensureUser(prisma, "s1");
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: "s1" } });
    expect(unchanged.lastActiveAt.getTime()).toBe(recent.getTime());

    const stale = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: "s1" }, data: { lastActiveAt: stale } });
    await ensureUser(prisma, "s1");
    const bumped = await prisma.user.findUniqueOrThrow({ where: { id: "s1" } });
    expect(bumped.lastActiveAt.getTime()).toBeGreaterThan(stale.getTime());
  });
});
