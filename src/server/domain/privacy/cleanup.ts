import type { PrismaClient } from "@/generated/prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;
export const IDLE_DAYS = 90;
const WINDOW_RETENTION_DAYS = 2;

type Db = Pick<PrismaClient, "user" | "rateLimitWindow">;

// Deleting the User cascades to every table that holds their data.
export async function deleteUserData(prisma: Db, userId: string): Promise<void> {
  await prisma.user.deleteMany({ where: { id: userId } });
}

export async function cleanupIdleData(
  prisma: Db,
  now: Date,
): Promise<{ users: number; windows: number }> {
  const users = await prisma.user.deleteMany({
    where: { lastActiveAt: { lt: new Date(now.getTime() - IDLE_DAYS * DAY_MS) } },
  });
  const windows = await prisma.rateLimitWindow.deleteMany({
    where: { windowStart: { lt: new Date(now.getTime() - WINDOW_RETENTION_DAYS * DAY_MS) } },
  });
  return { users: users.count, windows: windows.count };
}
