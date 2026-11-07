import { PageHeader, PageShell } from "@/components/layout/PageHeader";
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
