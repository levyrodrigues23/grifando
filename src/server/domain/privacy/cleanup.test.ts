import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createTestPrismaClient, resetDatabase } from "@/server/db/test-utils";
import { cleanupIdleData, deleteUserData } from "./cleanup";

const prisma = createTestPrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-07T12:00:00Z");

async function seedUser(id: string, idleDays: number) {
  await prisma.user.create({ data: { id, lastActiveAt: new Date(now.getTime() - idleDays * DAY) } });
  await prisma.writingSession.create({
    data: { userId: id, promptType: "FREE", originalText: "hello" },
  });
}

beforeEach(() => resetDatabase(prisma));
afterAll(() => prisma.$disconnect());

describe("cleanupIdleData", () => {
  it("removes users idle 91 days with their data, keeps 89-day ones", async () => {
    await seedUser("old", 91);
    await seedUser("recent", 89);
    const result = await cleanupIdleData(prisma, now);
    expect(result.users).toBe(1);
    expect(await prisma.user.findUnique({ where: { id: "old" } })).toBeNull();
    expect(await prisma.writingSession.count({ where: { userId: "old" } })).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: "recent" } })).not.toBeNull();
    expect(await prisma.writingSession.count({ where: { userId: "recent" } })).toBe(1);
  });

  it("removes rate-limit windows older than 2 days only", async () => {
    await prisma.rateLimitWindow.createMany({
      data: [
        { key: "a", windowStart: new Date(now.getTime() - 3 * DAY), count: 1 },
        { key: "b", windowStart: new Date(now.getTime() - 1 * DAY), count: 1 },
      ],
    });
    const result = await cleanupIdleData(prisma, now);
    expect(result.windows).toBe(1);
    expect((await prisma.rateLimitWindow.findMany()).map((w) => w.key)).toEqual(["b"]);
  });
});

describe("deleteUserData", () => {
  it("deletes the user and their data but not others", async () => {
    await seedUser("me", 0);
    await seedUser("other", 0);
    await deleteUserData(prisma, "me");
    expect(await prisma.user.findUnique({ where: { id: "me" } })).toBeNull();
    expect(await prisma.writingSession.count({ where: { userId: "me" } })).toBe(0);
    expect(await prisma.writingSession.count({ where: { userId: "other" } })).toBe(1);
  });
});
