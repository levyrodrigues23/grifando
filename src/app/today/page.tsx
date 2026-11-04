import { TodaySession } from "@/components/today/TodaySession";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { prisma } from "@/server/db/client";
import { resolveDailyChallenge } from "@/server/domain/writing/dailyChallenge";

// Today's prompt depends on the date and on live mistake data.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const challenge = await resolveDailyChallenge(prisma, DEFAULT_USER_ID);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-medium tracking-normal uppercase">Today</h1>
        <p className="text-sm text-muted-foreground">
          One short piece of writing, then a review mixing today&apos;s mistakes with the ones you&apos;re
          starting to forget.
        </p>
      </div>
      <TodaySession challenge={challenge} />
    </main>
  );
}
