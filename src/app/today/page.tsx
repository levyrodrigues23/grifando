import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { TodaySession } from "@/components/today/TodaySession";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { prisma } from "@/server/db/client";
import { resolveDailyChallenge } from "@/server/domain/writing/dailyChallenge";

// Today's prompt depends on the date and on live mistake data.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const challenge = await resolveDailyChallenge(prisma, DEFAULT_USER_ID);

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
