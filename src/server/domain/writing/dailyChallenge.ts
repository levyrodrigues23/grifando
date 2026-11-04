import type { PrismaClient } from "@/generated/prisma/client";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import {
  DAILY_PROMPTS,
  extractActiveWeakCategories,
  getTodaysDate,
  selectDailyPrompt,
} from "@/server/domain/writing/dailyPrompt";

// Today's writing challenge, biased toward the user's current weak categories.
// Shared by /write?mode=daily and the /today session so both show the same prompt.
export async function resolveDailyChallenge(prisma: PrismaClient, userId: string) {
  const patterns = createMistakePatternRepository(prisma);
  const weakCategories = extractActiveWeakCategories(await patterns.listByUser(userId));
  const prompt = selectDailyPrompt(DAILY_PROMPTS, getTodaysDate(), weakCategories);
  return { promptType: "DAILY_CHALLENGE" as const, promptText: prompt.text };
}
