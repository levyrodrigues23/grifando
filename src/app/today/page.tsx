import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { TodaySession } from "@/components/today/TodaySession";
import { prisma } from "@/server/db/client";
import { resolveDailyChallenge } from "@/server/domain/writing/dailyChallenge";
import { getCurrentUserId } from "@/server/session/currentUser";

// Today's prompt depends on the date and on live mistake data.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const userId = await getCurrentUserId();
  const challenge = await resolveDailyChallenge(prisma, userId);

  return (
    <PageShell>
      <PageHeader
        title="Today"
        description="One short piece of writing, then a review mixing today’s mistakes with the ones you’re starting to forget."
      />
      <TodaySession challenge={challenge} />
    </PageShell>
  );
}
