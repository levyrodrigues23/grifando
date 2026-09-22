import { DEFAULT_USER_ID } from "@/lib/constants";
import { prisma } from "@/server/db/client";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import {
  DAILY_PROMPTS,
  extractActiveWeakCategories,
  getTodaysDate,
  selectDailyPrompt,
} from "@/server/domain/writing/dailyPrompt";
import { WritingCoach, type InitialChallenge } from "@/components/writing/WritingCoach";

async function resolveDailyChallenge(): Promise<InitialChallenge> {
  const patterns = createMistakePatternRepository(prisma);
  const userPatterns = await patterns.listByUser(DEFAULT_USER_ID);
  const weakCategories = extractActiveWeakCategories(userPatterns);
  const prompt = selectDailyPrompt(DAILY_PROMPTS, getTodaysDate(), weakCategories);
  return { promptType: "DAILY_CHALLENGE", promptText: prompt.text };
}

export default async function WritePage(props: PageProps<"/write">) {
  const searchParams = await props.searchParams;
  const isDaily = searchParams.mode === "daily";

  const initialChallenge = isDaily ? await resolveDailyChallenge() : undefined;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <WritingCoach initialChallenge={initialChallenge} />
    </main>
  );
}
