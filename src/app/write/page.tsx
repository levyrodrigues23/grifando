import { DEFAULT_USER_ID } from "@/lib/constants";
import { prisma } from "@/server/db/client";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import {
  DAILY_PROMPTS,
  extractActiveWeakCategories,
  getTodaysDate,
  selectDailyPrompt,
} from "@/server/domain/writing/dailyPrompt";
import { findTechnicalPromptById } from "@/server/domain/writing/technicalPrompts";
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
  const promptId = typeof searchParams.promptId === "string" ? searchParams.promptId : undefined;
  const technicalPrompt = promptId ? findTechnicalPromptById(promptId) : undefined;

  let initialChallenge: InitialChallenge | undefined;

  if (technicalPrompt) {
    initialChallenge = {
      promptType: "TECHNICAL",
      promptText: technicalPrompt.text,
      technicalCategory: technicalPrompt.category,
    };
  } else if (searchParams.mode === "daily") {
    initialChallenge = await resolveDailyChallenge();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <WritingCoach initialChallenge={initialChallenge} />
    </main>
  );
}
