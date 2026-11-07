import { cookies } from "next/headers";

import type { PrismaClient } from "@/generated/prisma/client";
import { SESSION_COOKIE, getSessionSecret, verifySessionToken } from "./sessionToken";

export class MissingSessionError extends Error {
  constructor() {
    super("No valid session cookie — the proxy should have minted one.");
    this.name = "MissingSessionError";
  }
}

// Read-only: safe in Server Components. Never creates rows (see ensureUser).
export async function getCurrentUserId(): Promise<string> {
  const store = await cookies();
  const userId = verifySessionToken(store.get(SESSION_COOKIE)?.value, getSessionSecret());
  if (!userId) throw new MissingSessionError();
  return userId;
}

const ACTIVITY_BUMP_MS = 60 * 60 * 1000;

// Call at the top of every write route, before its service.
export async function ensureUser(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.user.upsert({ where: { id: userId }, create: { id: userId }, update: {} });
  await prisma.user.updateMany({
    where: { id: userId, lastActiveAt: { lt: new Date(Date.now() - ACTIVITY_BUMP_MS) } },
    data: { lastActiveAt: new Date() },
  });
}
