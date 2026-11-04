import { DEFAULT_USER_ID } from "@/lib/constants";
import { prisma } from "@/server/db/client";
import { resolveDailyChallenge } from "@/server/domain/writing/dailyChallenge";
import { findTechnicalPromptById } from "@/server/domain/writing/technicalPrompts";
import { WritingCoach, type InitialChallenge } from "@/components/writing/WritingCoach";

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
    initialChallenge = await resolveDailyChallenge(prisma, DEFAULT_USER_ID);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <WritingCoach initialChallenge={initialChallenge} />
    </main>
  );
}
