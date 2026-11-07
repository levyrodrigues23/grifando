import type { Metadata } from "next";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { prisma } from "@/server/db/client";
import { resolveDailyChallenge } from "@/server/domain/writing/dailyChallenge";
import { findTechnicalPromptById } from "@/server/domain/writing/technicalPrompts";
import { WritingCoach, type InitialChallenge } from "@/components/writing/WritingCoach";
import { getCurrentUserId } from "@/server/session/currentUser";

export const metadata: Metadata = {
  title: "Write",
  description: "Write in English and get feedback that turns your mistakes into practice.",
};

export default async function WritePage(props: PageProps<"/write">) {
  const userId = await getCurrentUserId();
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
    initialChallenge = await resolveDailyChallenge(prisma, userId);
  }

  const heading =
    initialChallenge?.promptType === "DAILY_CHALLENGE"
      ? { title: "Today’s challenge", description: "Answer the prompt in your own words. Mistakes you make here feed your review." }
      : initialChallenge?.promptType === "TECHNICAL"
        ? { title: "Technical English", description: "Explain it the way you would to a teammate — clear beats fancy." }
        : { title: "Write", description: "Anything in English: free writing, a GitHub issue, a PR description. Write first; feedback comes after." };

  return (
    <PageShell>
      <PageHeader title={heading.title} description={heading.description} />
      <WritingCoach initialChallenge={initialChallenge} />
    </PageShell>
  );
}
